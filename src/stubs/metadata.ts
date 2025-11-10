import type { Level } from './mastery.js';
import { searchYouTubeVideos, YouTubeQuotaExceededError } from '../services/youtube.js';

export type Candidate = {
  videoId: string; 
  channelId: string; 
  durationSec: number;
  topic: string; 
  level: Level; 
  publishedAt?: string;
  title?: string; 
  channelTitle?: string;
  thumbnail?: string;
};

/**
 * Get video candidates for a given topic
 * 100% autonomous - uses ONLY YouTube API
 * NO hardcoded data, NO fallbacks
 * Works for ANY topic once YouTube API quota is available
 */
export async function getCandidates(topic: string): Promise<Candidate[]> {
  console.log(`🔍 Searching YouTube API for: "${topic}"`);
  
  try {
    // Use YouTube API to search for real videos
    const youtubeResults = await searchYouTubeVideos(topic, 50);
    
    if (youtubeResults.length > 0) {
      console.log(`✅ YouTube API returned ${youtubeResults.length} videos for "${topic}"`);
      return youtubeResults;
    }
    console.log(`❌ YouTube API found no videos for "${topic}"`);
  } catch (error) {
    if (error instanceof YouTubeQuotaExceededError) {
      console.error(`⛔ YouTube quota exceeded while fetching "${topic}"`);
      throw error;
    }

    console.error(`❌ YouTube API error for "${topic}":`, error);
  }

  console.log(`⚠️ No candidates available for "${topic}" from YouTube.`);
  return [];
}
