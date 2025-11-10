import { Router } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import type { Level } from '../stubs/mastery.js';
import { searchYouTubeVideos, YouTubeQuotaExceededError } from '../services/youtube.js';
import { fetchGroqSuggestions } from '../services/groqSuggestions.js';
import { VIBE_PRESETS, resolveVibe } from '../lib/recommender/vibes.js';
import { getCandidates } from '../stubs/metadata.js';
import { buildPlaylist } from '../lib/playlist/builder.js';

// Define the candidate type with all required fields
type Candidate = {
  videoId: string;
  channelId: string;
  durationSec: number;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
};

// Helper to calculate video duration in seconds
const calculateVideoDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
  const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
  const seconds = match[3] ? parseInt(match[3].replace('S', '')) : 0;
  
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper to determine difficulty level
const determineDifficulty = (title: string, description: string = ''): 'beginner' | 'intermediate' | 'advanced' => {
  const text = `${title} ${description}`.toLowerCase();
  
  const beginnerTerms = ['beginner', 'basics', 'introduction', 'getting started', '101', 'fundamentals'];
  const advancedTerms = ['advanced', 'expert', 'masterclass', 'deep dive', 'in-depth'];
  
  if (beginnerTerms.some(term => text.includes(term))) return 'beginner';
  if (advancedTerms.some(term => text.includes(term))) return 'advanced';
  
  // Default to intermediate if we can't determine
  return 'intermediate';
};

const router = Router();

// Request validation schemas
const recommendationsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  commuteDurationSec: z.number().int().positive('Commute duration must be positive'),
  vibe: z.string().min(1, 'Vibe is required'),
  topic: z.string().trim().min(1).optional(),
  topicsLearned: z.array(z.string()).default([]),
  refreshNonce: z.string().optional(),
});

const previewVideoSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1).optional(),
  channelTitle: z.string().min(1).optional(),
  thumbnail: z.string().url().optional(),
  durationSec: z.number().int().positive().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

const playlistSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  topic: z.string().min(1, 'Topic is required'),
  commuteDurationSec: z.number().int().positive('Commute duration must be positive'),
  vibe: z.string().min(1, 'Vibe is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  previewVideos: z.array(previewVideoSchema).optional(),
});

// Helper to get random items from array
const getRandomItems = <T>(arr: T[], count: number, random: () => number = Math.random): T[] => {
  const shuffled = shuffleArray(arr, random);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const shuffleArray = <T>(items: T[], random: () => number = Math.random): T[] => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    if (j === i) {
      continue;
    }

    const swap = array[j];
    const current = array[i];
    if (swap === undefined || current === undefined) {
      continue;
    }

    array[j] = current;
    array[i] = swap;
  }
  return array;
};

const createSeededRandom = (seed: string): (() => number) => {
  let buffer = createHash('sha256').update(seed).digest();
  let offset = 0;

  return () => {
    if (offset >= buffer.length - 4) {
      buffer = createHash('sha256').update(buffer).digest();
      offset = 0;
    }

    const value = buffer.readUInt32BE(offset);
    offset += 4;

    return value / 0xffffffff;
  };
};


type TopicDescriptor = {
  topic: string;
  queryTopic: string;
  reason: string;
  vibeMatched?: boolean;
  difficultyHint?: 'beginner' | 'intermediate' | 'advanced';
};

const toTitleCase = (value: string) =>
  value.replace(/\w\S*/g, (str) => str.charAt(0).toUpperCase() + str.slice(1));

const buildTopicDescriptors = (
  rawTopic: string | undefined,
  vibePreset: typeof VIBE_PRESETS[keyof typeof VIBE_PRESETS],
  random: () => number
): TopicDescriptor[] => {
  const descriptors: TopicDescriptor[] = [];
  const pushDescriptor = (
    topic: string,
    queryTopic: string,
    reason: string,
    vibeMatched = false,
    difficultyHint?: 'beginner' | 'intermediate' | 'advanced'
  ) => {
    const displayKey = topic.trim().toLowerCase();
    if (!displayKey) {
      return;
    }

    if (descriptors.some((descriptor) => descriptor.topic.trim().toLowerCase() === displayKey)) {
      return;
    }

    const descriptor: TopicDescriptor = {
      topic,
      queryTopic: queryTopic.trim(),
      reason,
      vibeMatched,
    };

    if (difficultyHint) {
      descriptor.difficultyHint = difficultyHint;
    }

    descriptors.push(descriptor);
  };

  const normalizedTopic = rawTopic?.trim();
  if (normalizedTopic) {
    const base = normalizedTopic.replace(/\s+/g, ' ').trim();
    const baseQuery = base.toLowerCase();
    const vibeLabel = vibePreset.title.toLowerCase();

    pushDescriptor(base, baseQuery, `Matches exactly what you typed for “${base}”.`, true);
    pushDescriptor(
      `${base} fundamentals`,
      baseQuery,
      `Dial in the core of ${base} with a ${vibeLabel} commute-friendly mix.`,
      true
    );
    pushDescriptor(
      `${base} in action`,
      baseQuery,
      `Keep your ride engaging with practical ${base} walkthroughs.`,
      vibePreset.energy === 'high'
    );
    pushDescriptor(
      `Advanced ${base} techniques`,
      baseQuery,
      `Level up your ${base} skills when you’re ready for a deeper dive.`,
      false
    );
  }

  const vibeReasonTemplates: Array<(topic: string) => string> = [
    (topic) => `${topic} is trending with ${vibePreset.title.toLowerCase()} learners—keeps the pace ${vibePreset.energy}.`,
    (topic) => `Lean into ${topic} to match that ${vibePreset.title.toLowerCase()} groove without losing momentum.`,
    (topic) => `${topic} keeps a ${vibePreset.energy} energy while you ride in a ${vibePreset.title.toLowerCase()} mood.`,
    (topic) => `Spin up ${topic} for a ${vibePreset.title.toLowerCase()} commute that stays ${vibePreset.energy}.`,
  ];

  const vibeVariants: Array<{ displaySuffix: string; querySuffix: string }> = [
    { displaySuffix: ' Essentials', querySuffix: ' fundamentals playlist' },
    { displaySuffix: ' Mini Sessions', querySuffix: ' quick lessons' },
    { displaySuffix: ' Power Sprints', querySuffix: ' power tips' },
    { displaySuffix: ' Deep Dive', querySuffix: ' advanced breakdown' },
    { displaySuffix: ' Commute Mix', querySuffix: ' commute mix' },
    { displaySuffix: ' Warmups', querySuffix: ' warmup drills' },
  ];

  const vibeReasonBoosts: Array<(topic: string) => string> = [
    (topic) => `Great when you want ${topic.toLowerCase()} in bite-size bursts.`,
    (topic) => `Pairs well with a ${vibePreset.energy} ride when you need a quick win.`,
    (topic) => `Keeps your brain engaged without overloading your commute.`,
    (topic) => `Flip standards on their head with commuter-friendly ${topic.toLowerCase()}.`,
  ];

  const vibeSampleCount = Math.min(6, vibePreset.suggestedTopics.length);
  const sampledTopics = getRandomItems(vibePreset.suggestedTopics, vibeSampleCount, random);
  sampledTopics.forEach((topicName) => {
    const trimmed = topicName.trim();
    if (!trimmed) {
      return;
    }

    let baseQuery = trimmed.toLowerCase();
    let display = toTitleCase(trimmed);

    if (vibeVariants.length > 0 && random() > 0.35) {
      const variantIndex = Math.floor(random() * vibeVariants.length);
      const variant = vibeVariants[variantIndex];
      if (variant) {
        const decorated = `${display}${variant.displaySuffix}`.replace(/\s+/g, ' ').trim();
        display = toTitleCase(decorated);
        baseQuery = `${baseQuery} ${variant.querySuffix}`.replace(/\s+/g, ' ').trim();
      }
    }

    const template = vibeReasonTemplates.length > 0
      ? vibeReasonTemplates[Math.floor(random() * vibeReasonTemplates.length)]
      : null;
    let reason = template ? template(display) : `${display} keeps your ride aligned with a ${vibePreset.title.toLowerCase()} mood.`;

    if (vibeReasonBoosts.length > 0 && random() > 0.6) {
      const boostIndex = Math.floor(random() * vibeReasonBoosts.length);
      const boost = vibeReasonBoosts[boostIndex];
      if (boost) {
        reason = `${reason} ${boost(display)}`;
      }
    }

    pushDescriptor(display, baseQuery, reason, true);
  });

  if (descriptors.length === 0) {
    // As a last resort, populate with vibe topics so UI never looks empty
    getRandomItems(vibePreset.suggestedTopics, 4, random).forEach((topicName) => {
      const trimmed = topicName.trim();
      if (!trimmed) {
        return;
      }
      const display = toTitleCase(trimmed);
      const reason = `${display} is always a solid pick when you’re feeling ${vibePreset.title.toLowerCase()}.`;
      pushDescriptor(display, trimmed.toLowerCase(), reason, true);
    });
  }

  return descriptors;
};

// Get recommendations based on commute and vibe
router.post('/recommendations', async (req, res) => {
  try {
    const { userId, commuteDurationSec, vibe, topic, topicsLearned, refreshNonce } = recommendationsSchema.parse(req.body);

    // Get the selected vibe or default to the first one
    const vibePreset = resolveVibe(vibe);
    const requestedTopic = topic?.trim();

    const random = refreshNonce ? createSeededRandom(refreshNonce) : Math.random;

    let topicDescriptors = buildTopicDescriptors(requestedTopic, vibePreset, random);

    try {
      const groqRequest: {
        vibePreset: typeof vibePreset;
        limit: number;
        requestedTopic?: string;
      } = {
        vibePreset,
        limit: 6,
      };

      if (requestedTopic) {
        groqRequest.requestedTopic = requestedTopic;
      }

      const groqSuggestions = await fetchGroqSuggestions(groqRequest);

      if (groqSuggestions.length) {
        const existing = new Set(topicDescriptors.map((descriptor) => descriptor.topic.trim().toLowerCase()));
        groqSuggestions.forEach((suggestion) => {
          const normalized = suggestion.topic?.trim().toLowerCase();
          if (!normalized || existing.has(normalized)) {
            return;
          }

          const display = toTitleCase(suggestion.topic.trim());
          const descriptor: TopicDescriptor = {
            topic: display,
            queryTopic: normalized,
            reason: suggestion.reason.trim(),
            vibeMatched: true,
          };

          if (suggestion.difficulty) {
            descriptor.difficultyHint = suggestion.difficulty;
          }

          topicDescriptors = [...topicDescriptors, descriptor];
          existing.add(normalized);
        });
      }
    } catch (groqError) {
      console.error('Failed to fetch Groq suggestions:', groqError);
    }

    const descriptorReasonMap = new Map<string, { reason: string; vibeMatched?: boolean; difficultyHint?: 'beginner' | 'intermediate' | 'advanced' }>();
    const descriptorTopicMap = new Map<string, string>();
    topicDescriptors.forEach((descriptor) => {
      const displayKey = descriptor.topic.toLowerCase();
      const queryKey = descriptor.queryTopic.trim().toLowerCase();
      const value: { reason: string; vibeMatched?: boolean; difficultyHint?: 'beginner' | 'intermediate' | 'advanced' } = { reason: descriptor.reason };
      if (descriptor.vibeMatched !== undefined) {
        value.vibeMatched = descriptor.vibeMatched;
      }
      if (descriptor.difficultyHint) {
        value.difficultyHint = descriptor.difficultyHint;
      }
      descriptorReasonMap.set(displayKey, value);
      if (queryKey && !descriptorTopicMap.has(queryKey)) {
        descriptorTopicMap.set(queryKey, descriptor.topic);
      }
    });

    const queryTopics = Array.from(
      new Set(
        topicDescriptors
          .map((descriptor) => descriptor.queryTopic.trim())
          .filter((value) => Boolean(value))
      )
    );

    const allCandidates: Candidate[] = [];

    for (const queryTopic of queryTopics) {
      try {
        const candidates = await getCandidates(queryTopic);
        
        // Process candidates to ensure all required fields are present
        const processedCandidates = candidates
          .map((candidate) => {
            if (!candidate.videoId || !candidate.channelId || !candidate.durationSec) {
              return null;
            }

            const processed: Candidate = {
              videoId: candidate.videoId,
              channelId: candidate.channelId,
              durationSec: candidate.durationSec,
              topic: descriptorTopicMap.get(queryTopic.toLowerCase()) ?? queryTopic,
              level: candidate.level || 'beginner',
              title: candidate.title || `${queryTopic} Tutorial`,
              channelTitle: candidate.channelTitle || 'Unknown Channel',
              thumbnail: candidate.thumbnail || 'https://via.placeholder.com/320x180',
              publishedAt: (candidate as any).publishedAt || new Date().toISOString()
            };

            return processed;
          })
          .filter((value): value is Candidate => Boolean(value));
        
        if (processedCandidates.length === 0) {
          continue;
        }
        
        allCandidates.push(...processedCandidates);
      } catch (error) {
        if (error instanceof YouTubeQuotaExceededError) {
          console.error('YouTube quota exceeded while preparing recommendations:', error.message);
          return res.status(429).json({
            status: 'error',
            code: 'YOUTUBE_QUOTA_EXCEEDED',
            message: 'We hit our YouTube limit for today. Please try again later or pick from your saved topics.'
          });
        }

        console.error(`Error getting candidates for topic ${queryTopic}:`, error);
      }
    }
    
    // If no candidates found from API, return empty suggestions
    if (allCandidates.length === 0) {
      return res.status(204).json({
        status: 'no_content',
        payload: {
          message: 'No matching topics found from YouTube right now.',
        },
      });
    }
    
    // Filter out already learned topics, but always keep the explicitly requested topic
    const learnedSet = new Set(topicsLearned.map((t: string) => t.toLowerCase()));
    const normalizedRequested = requestedTopic?.toLowerCase();
    const filteredCandidates = allCandidates.filter((candidate) => {
      const topicKey = candidate.topic.toLowerCase();
      if (normalizedRequested && topicKey === normalizedRequested) {
        return true;
      }
      return !learnedSet.has(topicKey);
    });

    // Group by topic and select top candidates
    const topicMap = new Map<string, { originalTopic: string; candidates: Candidate[] }>();
    filteredCandidates.forEach(candidate => {
      const key = candidate.topic.trim().toLowerCase();
      const existing = topicMap.get(key);
      if (existing) {
        existing.candidates.push(candidate);
      } else {
        topicMap.set(key, {
          originalTopic: candidate.topic,
          candidates: [candidate],
        });
      }
    });

    const descriptorOrder = shuffleArray(topicDescriptors, random);
    if (normalizedRequested) {
      const requestedIndex = descriptorOrder.findIndex((descriptor) => descriptor.topic.trim().toLowerCase() === normalizedRequested);
      if (requestedIndex > 0) {
        const spliced = descriptorOrder.splice(requestedIndex, 1);
        const requestedDescriptor = spliced[0];
        if (requestedDescriptor) {
          descriptorOrder.unshift(requestedDescriptor);
        }
      }
    }

    const suggestions = descriptorOrder
      .map((descriptor) => {
        const key = descriptor.topic.trim().toLowerCase();
        const entry = topicMap.get(key);
        if (!entry || entry.candidates.length === 0) {
          return null;
        }

        const descriptorMeta = descriptorReasonMap.get(key);

        return {
          topic: entry.originalTopic || descriptor.topic,
          reason: descriptorMeta?.reason || descriptor.reason,
          vibeMatched: descriptorMeta?.vibeMatched ?? true,
          videoCount: entry.candidates.length,
          difficulty: descriptorMeta?.difficultyHint ?? (entry.candidates[0]?.level ?? 'beginner'),
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .slice(0, 6);

    // If no suggestions matched descriptor order, fall back to any available topics
    const fallbackSuggestions = suggestions.length === 0
      ? Array.from(topicMap.values()).slice(0, 5).map((entry) => ({
          topic: entry.originalTopic,
          reason: 'Popular choice based on current vibe',
          vibeMatched: true,
          videoCount: entry.candidates.length,
          difficulty: entry.candidates[0]?.level || 'beginner',
        }))
      : suggestions;

    const requestedTopicEntry = normalizedRequested ? topicMap.get(normalizedRequested) : undefined;

    // Prepare response
    const response = {
      status: 'success' as const,
      payload: {
        suggestions: fallbackSuggestions,
        suggestedDifficulty: vibePreset.defaultDifficulty,
        previewVideos: requestedTopicEntry?.candidates.slice(0, 4).map((candidate) => ({
          videoId: candidate.videoId,
          title: candidate.title || `${candidate.topic} Tutorial`,
          channelTitle: candidate.channelTitle || 'Unknown Channel',
          durationSec: candidate.durationSec || 300,
          level: candidate.level || 'beginner',
          thumbnail: candidate.thumbnail || 'https://via.placeholder.com/320x180'
        })) ?? [],
        historySummary: {
          totalSessions: Math.floor(Math.random() * 50) + 5,
          totalVideosWatched: Math.floor(Math.random() * 200) + 20,
          uniqueTopics: Math.floor(Math.random() * 30) + 5,
        },
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load recommendations. Please try again shortly.'
    });
  }
});

// Build a playlist based on user selections
router.post('/playlist', async (req, res) => {
  try {
    // Validate request
    const { userId, topic, commuteDurationSec, vibe, difficulty, previewVideos = [] } = playlistSchema.parse(req.body);
    const selectedDifficulty = difficulty || 'beginner';
    
    console.log(`🎵 Building playlist for topic: ${topic}, duration: ${commuteDurationSec}s, difficulty: ${selectedDifficulty}`);
    
    // Define the candidate type with all required fields
    type Candidate = {
      videoId: string;
      channelId: string;
      durationSec: number;
      topic: string;
      level: 'beginner' | 'intermediate' | 'advanced';
      title: string;
      channelTitle: string;
      thumbnail: string;
      publishedAt: string;
    };

    const previewCandidates: Candidate[] = previewVideos.map((video, index) => ({
      videoId: video.videoId || `preview-${index}`,
      channelId: `preview-${index}`,
      durationSec: Math.max(video.durationSec ?? 300, 60),
      topic,
      level: (video.level || selectedDifficulty) as 'beginner' | 'intermediate' | 'advanced',
      title: video.title || `${topic} Preview Session`,
      channelTitle: video.channelTitle || 'Recommended for you',
      thumbnail: video.thumbnail || 'https://via.placeholder.com/320x180',
      publishedAt: new Date().toISOString(),
    }));

    let candidates: Candidate[] = [...previewCandidates];
    
    try {
      const fetchedCandidates = await getCandidates(topic);
      
      // Process candidates to ensure all required fields are present with proper types
      const processedCandidates = fetchedCandidates.map(candidate => {
        // Ensure all required fields have values
        const processed: Candidate = {
          videoId: candidate.videoId || `fallback-${Math.random().toString(36).substring(2, 9)}`,
          channelId: candidate.channelId || 'unknown-channel',
          durationSec: candidate.durationSec || 300,
          topic: candidate.topic || topic,
          level: candidate.level || 'beginner',
          title: candidate.title || `${topic} Tutorial`,
          channelTitle: candidate.channelTitle || 'Unknown Channel',
          thumbnail: candidate.thumbnail || 'https://via.placeholder.com/320x180',
          publishedAt: (candidate as any).publishedAt || new Date().toISOString()
        };
        return processed;
      });

      if (processedCandidates.length > 0) {
        const deduped = new Map<string, Candidate>();
        [...previewCandidates, ...processedCandidates].forEach((candidate) => {
          if (!candidate.videoId) {
            return;
          }
          if (!deduped.has(candidate.videoId)) {
            deduped.set(candidate.videoId, candidate);
          }
        });
        candidates = Array.from(deduped.values());
      }
      
      console.log(`Found ${candidates.length} candidates for topic: ${topic}`);
    } catch (error) {
      if (error instanceof YouTubeQuotaExceededError) {
        console.error('YouTube quota exceeded while building playlist:', error.message);
        return res.status(429).json({
          status: 'error',
          code: 'YOUTUBE_QUOTA_EXCEEDED',
          message: 'We hit our YouTube limit for today, so we can\'t build a fresh playlist right now. Please try again later.'
        });
      }

      console.error('Error getting candidates:', error);
      // Continue with empty candidates, we'll use fallback
    }
    
    // If no candidates gathered so far, return empty response
    if (candidates.length === 0) {
      return res.status(204).json({
        status: 'no_content',
        payload: {
          message: 'No suitable content found for the selected criteria',
        },
      });
    }
    
    // Filter candidates by difficulty if specified
    const filteredCandidates = selectedDifficulty 
      ? candidates.filter((c: { level: string }) => c.level === selectedDifficulty)
      : candidates;
    
    console.log(`Filtered to ${filteredCandidates.length} candidates for difficulty: ${selectedDifficulty}`);
    
    // If no candidates match the difficulty, use any difficulty
    const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;
    
    // Build playlist based on duration and difficulty
    const playlist = await buildPlaylist({
      topic,
      targetDurationSec: commuteDurationSec,
      difficulty: selectedDifficulty,
      candidates: finalCandidates,
    });
    
    // If no playlist could be built, try with any difficulty
    if (!playlist || playlist.videos.length === 0) {
      console.log('No playlist could be built with current filters, trying with any difficulty');
      const anyDifficultyPlaylist = await buildPlaylist({
        topic,
        targetDurationSec: commuteDurationSec,
        difficulty: 'beginner', // Try with beginner difficulty
        candidates: candidates, // Use all candidates regardless of difficulty
      });
      
      if (anyDifficultyPlaylist && anyDifficultyPlaylist.videos.length > 0) {
        console.log('Successfully built playlist with any difficulty');
        return res.json({
          status: 'success',
          payload: {
            playlist: anyDifficultyPlaylist,
            playlistContext: {
              topic,
              vibe,
              difficulty: 'beginner',
              masteryScore: 0,
              adjustedDifficulty: true, // Indicate we adjusted the difficulty
            },
          },
        });
      }
      
      // If still no playlist, return 204
      return res.status(204).json({
        status: 'success',
        payload: null,
        message: 'No suitable content found for the selected criteria',
      });
    }
    
    // Calculate total duration
    const totalDuration = playlist.videos.reduce((sum, video) => sum + video.durationSec, 0);
    const normalizedPlaylist = {
      ...playlist,
      totalDurationSec: totalDuration,
      items: playlist.videos ?? [],
    };
    
    console.log(`✅ Built playlist with ${normalizedPlaylist.items.length} videos (${Math.round(totalDuration / 60)} min)`);
    
    // Return success response
    res.json({
      status: 'success',
      payload: {
        playlist: normalizedPlaylist,
        playlistContext: {
          topic,
          vibe,
          difficulty: selectedDifficulty,
          masteryScore: 0, // Would come from user's history in a real app
          adjustedDifficulty: false,
        },
      },
    });
    
  } catch (error) {
    console.error('Playlist build error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to build playlist. Please try again in a bit.'
    });
  }
});

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'wizard-api',
    version: '1.0.0',
  });
});

export default router;
