import type { Candidate } from '../stubs/metadata.js';
import { buildPack } from '../pack/builder.js';

export class YouTubeQuotaExceededError extends Error {
  reason?: string;

  constructor(message: string, reason?: string) {
    super(message);
    this.name = 'YouTubeQuotaExceededError';
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
}

const QUOTA_ERROR_REASONS = new Set([
  'quotaExceeded',
  'dailyLimitExceeded',
  'userRateLimitExceeded',
  'rateLimitExceeded'
]);

type YouTubeErrorPayload = {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

async function handleYouTubeErrorResponse(response: Response): Promise<never> {
  let payload: YouTubeErrorPayload | null = null;

  try {
    payload = (await response.json()) as YouTubeErrorPayload;
  } catch (parseError) {
    // ignore JSON parsing issues
  }

  const message = payload?.error?.message || `YouTube API request failed with status ${response.status}`;
  const quotaError = payload?.error?.errors?.find((errorDetail) => {
    return Boolean(errorDetail?.reason && QUOTA_ERROR_REASONS.has(errorDetail.reason));
  });

  if (quotaError?.reason) {
    throw new YouTubeQuotaExceededError(message, quotaError.reason);
  }

  throw new Error(message);
}

/**
 * Incremental YouTube fetching strategy:
 * 1. Start with 1 query, 20 videos
 * 2. Try to build playlist
 * 3. If fill rate < 95%, fetch more videos incrementally
 * 4. Stop when fill rate >= 95% or max attempts reached
 */
export async function searchYouTubeVideosIncremental(
  topic: string,
  targetDurationSec: number,
  userMasteryLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Promise<Candidate[]> {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    console.log('❌ No YouTube API key found');
    throw new Error('YouTube API key required');
  }
  
  console.log(`🔍 Incremental fetch for "${topic}" (target: ${Math.round(targetDurationSec/60)} min)`);
  
  const searchQueries = [
    `${topic} tutorial`,
    `${topic} explained`, 
    `learn ${topic}`,
    `${topic} course`
  ];
  
  let allCandidates: Candidate[] = [];
  let queryIndex = 0;
  let videosPerQuery = 20; // Start conservative
  const minBuffer = 300; // 5 minutes
  const pct = minBuffer / targetDurationSec;
  const minDurationSec = Math.round(targetDurationSec * (1 - pct));
  const maxDurationSec = Math.round(targetDurationSec * (1 + pct));
  
  try {
    // Attempt up to 4 fetches
    for (let attempt = 1; attempt <= 4; attempt++) {
      if (queryIndex >= searchQueries.length) {
        console.log(`⚠️  Exhausted all search queries`);
        break;
      }
      
      const query = searchQueries[queryIndex];
      if (!query) {
        console.log(`⚠️  No more queries available`);
        break;
      }
      console.log(`📥 Attempt ${attempt}: "${query}" (${videosPerQuery} videos)`);
      
      // Fetch videos
      const newCandidates = await fetchYouTubeVideos(query, videosPerQuery, topic, API_KEY);
      
      if (newCandidates.length === 0) {
        console.log(`⚠️  No videos found for "${query}"`);
        queryIndex++;
        continue;
      }
      
      // Add to pool and remove duplicates
      allCandidates = [...allCandidates, ...newCandidates];
      allCandidates = allCandidates.filter((candidate, index, self) => 
        index === self.findIndex(c => c.videoId === candidate.videoId)
      );
      
      console.log(`📊 Total candidates: ${allCandidates.length}`);
      
      // Try to build playlist
      const testPlaylist = buildPack({
        topic,
        minDurationSec,
        maxDurationSec,
        userMasteryLevel,
        candidates: allCandidates
      });
      
      if (testPlaylist.items && testPlaylist.items.length > 0) {
        const totalDuration = testPlaylist.items.reduce((sum, item) => sum + item.durationSec, 0);
        const fillRate = (totalDuration / targetDurationSec) * 100;
        
        console.log(`🎯 Fill rate: ${fillRate.toFixed(1)}% (${testPlaylist.items.length} videos, ${Math.round(totalDuration/60)} min)`);
        
        // Success! Fill rate >= 95%
        if (fillRate >= 95) {
          console.log(`✅ Target achieved! Returning ${allCandidates.length} candidates`);
          return allCandidates;
        }
        
        // Not enough yet, continue fetching
        console.log(`⏳ Need more videos (current: ${fillRate.toFixed(1)}%)`);
      } else {
        console.log(`⚠️  Playlist builder returned no items`);
      }
      
      // Prepare for next fetch
      if (attempt < 4) {
        queryIndex++;
        // Increase fetch size for next attempt
        videosPerQuery = Math.min(videosPerQuery + 10, 30);
      }
    }
    
    // Return what we have, even if not perfect
    console.log(`⚠️  Returning ${allCandidates.length} candidates (may not reach 95% fill)`);
    return allCandidates;
    
  } catch (error) {
    if (error instanceof YouTubeQuotaExceededError) {
      console.error('YouTube API quota reached:', error.message);
      throw error;
    }

    console.error('YouTube API error:', error);
    return allCandidates; // Return what we have so far
  }
}

async function fetchYouTubeVideos(
  query: string,
  maxResults: number,
  topic: string,
  apiKey: string
): Promise<Candidate[]> {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
  
  const searchResponse = await fetch(searchUrl);

  if (!searchResponse.ok) {
    await handleYouTubeErrorResponse(searchResponse);
  }

  const searchData = (await searchResponse.json()) as any;
  
  if (!searchData.items || searchData.items.length === 0) {
    return [];
  }
  
  // Get video details including duration
  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${videoIds}&key=${apiKey}`;
  
  const detailsResponse = await fetch(detailsUrl);

  if (!detailsResponse.ok) {
    await handleYouTubeErrorResponse(detailsResponse);
  }

  const detailsData = (await detailsResponse.json()) as any;
  
  if (!detailsData.items) {
    return [];
  }
  
  const candidates: Candidate[] = detailsData.items
    .filter((video: any) => {
      if (!video?.id || !video?.snippet) {
        return false;
      }

      // Skip non-embeddable videos
      if (video.status && video.status.embeddable === false) {
        return false;
      }

      // Skip region-restricted videos
      const regionRestriction = video.contentDetails?.regionRestriction;
      if (regionRestriction) {
        const blocked: string[] = Array.isArray(regionRestriction.blocked) ? regionRestriction.blocked : [];
        if (blocked.includes('US')) {
          return false;
        }

        const allowed: string[] = Array.isArray(regionRestriction.allowed) ? regionRestriction.allowed : [];
        if (allowed.length > 0 && !allowed.includes('US')) {
          return false;
        }
      }

      return true;
    })
    .map((video: any) => {
      const duration = parseDuration(video.contentDetails.duration);

      return {
        videoId: video.id,
        channelId: video.snippet.channelId,
        durationSec: duration,
        topic: topic.toLowerCase(),
        level: determineDifficulty(video.snippet.title, video.snippet.description),
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`
      };
    })
    .filter((candidate: Candidate) => {
      // Exclude shorts (<=60s) and very long videos
      return (
        Boolean(candidate.videoId) &&
        candidate.durationSec > 60 &&
        candidate.durationSec <= 7200
      );
    });

  return candidates;
}

// Parse YouTube duration format (PT4M13S) to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Determine difficulty level based on video title and description
function determineDifficulty(title: string, description: string = ''): 'beginner' | 'intermediate' | 'advanced' {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('beginner') || text.includes('basics') || text.includes('introduction') || 
      text.includes('101') || text.includes('getting started') || text.includes('fundamentals')) {
    return 'beginner';
  }
  
  if (text.includes('advanced') || text.includes('expert') || text.includes('master') || 
      text.includes('deep dive') || text.includes('professional')) {
    return 'advanced';
  }
  
  return 'intermediate';
}
