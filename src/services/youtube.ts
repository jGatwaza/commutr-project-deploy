import type { Candidate } from '../stubs/metadata';

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
    // Step 1: Search for educational videos on the topic (YouTube handles typos automatically)
    const searchQueries = [
      `${topic} tutorial`,
      `${topic} explained`, 
      `${topic} basics`,
      `learn ${topic}`,
      `${topic} for beginners`,
      `${topic} course`,
      `how to ${topic}`
    ];
    
    let allCandidates: Candidate[] = [];
    
    // Simple single search - just get videos that work
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic + ' tutorial')}&type=video&maxResults=20&key=${API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json() as any;
    
    console.log('📊 YouTube search found:', searchData.items?.length || 0, 'videos');
    
    if (searchData.items && searchData.items.length > 0) {
      // Get video details including duration
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json() as any;
      
      if (detailsData.items) {
        // Convert to Candidate format with real durations
        const candidates: Candidate[] = detailsData.items.map((video: any) => {
          const duration = parseDuration(video.contentDetails.duration);
          
          return {
            videoId: video.id,
            channelId: video.snippet.channelId,
            durationSec: duration,
            topic: topic.toLowerCase(),
            level: determineDifficulty(video.snippet.title, video.snippet.description),
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt
          };
        }).filter((candidate: Candidate) => {
          // Very basic filtering - just exclude very short or very long videos
          return candidate.durationSec >= 60 && candidate.durationSec <= 7200; // 1 minute to 2 hours
        });
        
        allCandidates.push(...candidates);
      }
    }
    
    // Remove duplicates and sort by duration (shorter first for better pack building)
    const uniqueCandidates = allCandidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.videoId === candidate.videoId)
    ).sort((a, b) => a.durationSec - b.durationSec);
    
    console.log(`✅ Found ${uniqueCandidates.length} videos for "${topic}"`);
    return uniqueCandidates.slice(0, maxResults);
    
  } catch (error) {
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
