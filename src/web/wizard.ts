import { Router } from 'express';
import { z } from 'zod';
import { resolveVibe, bumpDifficulty } from '../lib/recommender/vibes.js';
import { getUserHistory, getTopicWatchCount } from '../history/commuteHistory.js';
import { getCandidates } from '../stubs/metadata.js';
import { buildPack } from '../pack/builder.js';

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer TEST') {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

const recommendationsSchema = z.object({
  userId: z.string().min(1),
  commuteDurationSec: z.number().int().min(60).max(7200),
  vibe: z.string().optional(),
  topicsLearned: z.array(z.string()).optional()
});

const playlistSchema = z.object({
  userId: z.string().min(1),
  topic: z.string().min(1),
  commuteDurationSec: z.number().int().min(60).max(7200),
  vibe: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

type TopicSuggestion = {
  topic: string;
  reason: string;
  familiarityScore: number;
  vibeMatched: boolean;
};

router.post('/wizard/recommendations', requireAuth, (req, res) => {
  const parsed = recommendationsSchema.safeParse(req.body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }

  const { userId, commuteDurationSec, vibe, topicsLearned = [] } = parsed.data;

  const vibePreset = resolveVibe(vibe);
  const history = getUserHistory(userId);

  const topicCounts = new Map<string, number>();
  let totalVideos = 0;

  history.forEach((session) => {
    totalVideos += session.videosWatched?.length ?? 0;
    session.topics.forEach((topic) => {
      const key = topic.toLowerCase();
      topicCounts.set(key, (topicCounts.get(key) ?? 0) + 1);
    });
  });

  topicsLearned.forEach((topic) => {
    const key = topic.toLowerCase();
    if (!topicCounts.has(key)) {
      topicCounts.set(key, 1);
    }
  });

  const suggestions: TopicSuggestion[] = [];

  const historyTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  historyTopics.forEach(([topic, count]) => {
    suggestions.push({
      topic,
      reason: count > 1
        ? `You explored this in ${count} sessions`
        : 'Recently studied topic',
      familiarityScore: count,
      vibeMatched: vibePreset.suggestedTopics.includes(topic)
    });
  });

  vibePreset.suggestedTopics.forEach((topic) => {
    if (!suggestions.some((entry) => entry.topic === topic)) {
      suggestions.push({
        topic,
        reason: `Matches your ${vibePreset.title.toLowerCase()} vibe`,
        familiarityScore: 0,
        vibeMatched: true
      });
    }
  });

  if (suggestions.length === 0) {
    suggestions.push({
      topic: vibePreset.suggestedTopics[0] ?? 'learning strategies',
      reason: 'Great starter topic for your vibe',
      familiarityScore: 0,
      vibeMatched: true
    });
  }

  const response = {
    vibe: vibePreset,
    commuteDurationSec,
    suggestedDifficulty: vibePreset.defaultDifficulty,
    suggestions: suggestions.slice(0, 8),
    historySummary: {
      totalSessions: history.length,
      totalVideosWatched: totalVideos,
      uniqueTopics: Array.from(new Set(history.flatMap((session) => session.topics))).length
    }
  };

  return res.json(response);
});

router.post('/wizard/playlist', requireAuth, async (req, res) => {
  const parsed = playlistSchema.safeParse(req.body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message || 'Invalid request' });
  }

  const { userId, topic, commuteDurationSec, vibe, difficulty } = parsed.data;

  const vibePreset = resolveVibe(vibe);
  const baseDifficulty = difficulty ?? vibePreset.defaultDifficulty;
  const masteryScore = getTopicWatchCount(userId, topic);
  const finalDifficulty = bumpDifficulty(baseDifficulty, masteryScore);

  try {
    const candidates = await getCandidates(topic);

    if (!candidates || candidates.length === 0) {
      return res.status(204).json({
        message: `No videos found for "${topic}". Try another topic.`,
        reason: 'no_candidates'
      });
    }

    const filtered = candidates.filter((candidate) => {
      if (!candidate.level) return true;
      return candidate.level.toLowerCase() === finalDifficulty;
    });

    const pct = 0.07;
    const minDurationSec = Math.round(commuteDurationSec * (1 - pct));
    const maxDurationSec = Math.round(commuteDurationSec * (1 + pct));

    const playlist = buildPack({
      topic,
      minDurationSec,
      maxDurationSec,
      userMasteryLevel: finalDifficulty,
      candidates: filtered.length > 0 ? filtered : candidates
    });

    if (!playlist.items || playlist.items.length === 0) {
      return res.status(204).json({
        message: `Could not build a playlist for "${topic}" at ${finalDifficulty} level.`,
        reason: 'no_fit'
      });
    }

    const formattedPlaylist = {
      items: playlist.items.map((item) => {
        const candidate = candidates.find((c) => c.videoId === item.videoId);
        return {
          videoId: item.videoId,
          durationSec: item.durationSec,
          title: candidate?.title || `${topic} Tutorial`,
          channelTitle: candidate?.channelTitle || 'YouTube',
          level: candidate?.level || finalDifficulty,
          thumbnail: candidate?.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
        };
      }),
      totalDurationSec: playlist.totalDurationSec,
      underFilled: playlist.underFilled
    };

    return res.json({
      success: true,
      playlist: formattedPlaylist,
      playlistContext: {
        topic,
        duration: commuteDurationSec,
        difficulty: finalDifficulty,
        vibe: vibePreset.key,
        masteryScore
      },
      difficultyAdjusted: finalDifficulty !== baseDifficulty
    });
  } catch (error) {
    console.error('Wizard playlist error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to build playlist. Please try again.'
    });
  }
});

export default router;
