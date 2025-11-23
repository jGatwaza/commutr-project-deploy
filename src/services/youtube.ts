import type { Candidate } from '../stubs/metadata.js';

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
    // ignore JSON parsing issues; fall back to status-based messaging below
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

// Real YouTube API service - calls actual YouTube Data API v3
export async function searchYouTubeVideos(topic: string, maxResults: number = 50): Promise<Candidate[]> {
  // Use your actual YouTube API key
  const API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    console.log('❌ No YouTube API key found');
    throw new Error('YouTube API key required');
  }
  
  console.log('✅ Using YouTube API key:', API_KEY ? 'Found' : 'Missing');
  
  console.log(`🔍 Searching YouTube for: "${topic}"`);
  
  try {
    // Step 1: Search for educational videos with multiple enhanced queries
    const searchQueries = [
      `${topic} tutorial`,
      `${topic} explained`, 
      `learn ${topic}`,
      `${topic} course`
    ];
    
    let allCandidates: Candidate[] = [];
    
    // Try multiple search queries to get diverse, educational content
    for (const query of searchQueries.slice(0, 2)) { // Use first 2 queries to save quota
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=15&videoCategoryId=27&key=${API_KEY}`;
      
      const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      await handleYouTubeErrorResponse(searchResponse);
    }

    const searchData = (await searchResponse.json()) as any;
    
    console.log('📊 YouTube search found:', searchData.items?.length || 0, 'videos');
    
    if (searchData.items && searchData.items.length > 0) {
      // Get video details including duration and playback status flags
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${videoIds}&key=${API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);

      if (!detailsResponse.ok) {
        await handleYouTubeErrorResponse(detailsResponse);
      }

      const detailsData = (await detailsResponse.json()) as any;
      
      if (detailsData.items) {
        const candidates: Candidate[] = detailsData.items
          .filter((video: any) => {
            if (!video?.id || !video?.snippet) {
              return false;
            }

            // Skip videos that cannot be embedded in iframes
            if (video.status && video.status.embeddable === false) {
              console.warn(`🚫 Skipping non-embeddable video ${video.id}`);
              return false;
            }

            const regionRestriction = video.contentDetails?.regionRestriction;
            if (regionRestriction) {
              const blocked: string[] = Array.isArray(regionRestriction.blocked) ? regionRestriction.blocked : [];
              if (blocked.includes('US')) {
                console.warn(`🚫 Skipping region-restricted video ${video.id} (blocked in US)`);
                return false;
              }

              const allowed: string[] = Array.isArray(regionRestriction.allowed) ? regionRestriction.allowed : [];
              if (allowed.length > 0 && !allowed.includes('US')) {
                console.warn(`🚫 Skipping region-restricted video ${video.id} (US not allowed)`);
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
            // Exclude very short or very long videos and ensure we have a valid videoId
            return (
              Boolean(candidate.videoId) &&
              candidate.durationSec >= 60 &&
              candidate.durationSec <= 7200
            );
          });

        allCandidates.push(...candidates);
      }
    }
    } // Close for loop
    
    // Remove duplicates and sort by duration (shorter first for better pack building)
    const uniqueCandidates = allCandidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.videoId === candidate.videoId)
    ).sort((a, b) => a.durationSec - b.durationSec);
    
    console.log(`✅ Found ${uniqueCandidates.length} videos for "${topic}"`);
    return uniqueCandidates.slice(0, maxResults);
    
  } catch (error) {
    if (error instanceof YouTubeQuotaExceededError) {
      console.error('YouTube API quota reached:', error.message);
      throw error;
    }

    console.error('YouTube API error:', error);
    return [];
  }
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
