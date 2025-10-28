import type { Level } from './mastery.js';
import { searchYouTubeVideos } from '../services/youtube.js';

export type Candidate = {
  videoId: string; 
  channelId: string; 
  durationSec: number;
  topic: string; 
  level: Level; 
  publishedAt?: string;
  title?: string; 
  channelTitle?: string;
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
    } else {
      console.log(`❌ YouTube API found no videos for "${topic}"`);
      // Return empty array - frontend will show "No videos found" message
      return [];
    }
  } catch (error) {
    console.error(`❌ YouTube API error for "${topic}":`, error);
    // Return empty array - frontend will show "No videos found" message
    return [];
  }
}
