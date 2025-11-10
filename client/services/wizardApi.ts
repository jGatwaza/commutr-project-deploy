// Environment variables with type assertions
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5173';
const AUTH_TOKEN = (import.meta as any).env?.VITE_API_AUTH_TOKEN || 'Bearer TEST';

// Define valid vibe keys as a const array
const VIBE_KEYS = ['chill', 'focused', 'energetic'] as const;
type VibeKey = typeof VIBE_KEYS[number];

// Define Vibe type with required properties
type Vibe = {
  key: VibeKey;
  name: string;
  description: string;
  suggestedTopics: string[];
  icon: string;
  color: string;
};

// Default vibe presets with all required properties
const VIBE_PRESETS: Record<VibeKey, Vibe> = {
  chill: {
    key: 'chill',
    name: 'Chill',
    description: 'Relaxed and easy-going content',
    suggestedTopics: ['meditation', 'mindfulness', 'yoga'],
    icon: '🌿',
    color: '#4CAF50'
  },
  focused: {
    key: 'focused',
    name: 'Focused',
    description: 'Deep work and concentration',
    suggestedTopics: ['programming', 'coding', 'productivity'],
    icon: '🎯',
    color: '#2196F3'
  },
  energetic: {
    key: 'energetic',
    name: 'Energetic',
    description: 'High-energy and engaging content',
    suggestedTopics: ['workout', 'fitness', 'motivation'],
    icon: '⚡',
    color: '#FFC107'
  }
};

// Default vibe is now handled by VIBE_PRESETS

// Define the Video interface
export interface Video {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  durationSec: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  publishedAt?: string;
  channelId?: string;
}

// Define interfaces for API requests and responses
interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSec: number;
  videos: Video[];
}

interface Recommendation {
  topic: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  channelTitle: string;
  videoId: string;
  durationSec?: number;
  channelId?: string;
  publishedAt?: string;
}

interface BuildPlaylistRequest {
  topic: string;
  commuteDurationSec: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  vibe?: string;
  userId?: string;
}

interface GetRecommendationsRequest {
  commuteDurationSec: number;
  vibe: string;
  topicsLearned?: string[];
  userId?: string;
}

interface RecommendationResponse {
  status: string;
  payload?: {
    recommendations: Recommendation[];
    suggestedDifficulty: string;
    historySummary?: {
      totalSessions: number;
      totalVideosWatched: number;
      uniqueTopics: number;
    };
  };
  message?: string;
}

interface PlaylistResponse {
  status: string;
  payload?: {
    playlist: Playlist;
    playlistContext: {
      topic: string;
      vibe: string;
      difficulty: string;
      masteryScore: number;
    };
  };
  message?: string;
}

// Default values for fallback content
const DEFAULT_THUMBNAIL = 'https://via.placeholder.com/320x180';
const DEFAULT_CHANNEL = 'Learning Channel';
const DEFAULT_VIDEO_ID = 'dQw4w9WgXcQ'; // Fallback video ID

// Get recommendations based on commute and vibe
export async function getRecommendations(
  commuteDurationSec: number, 
  vibeKey: string,
  userId: string = 'demoUser'
): Promise<Recommendation[]> {
  // Ensure we have a valid vibe key
  const vibe = getVibeByKey(vibeKey);
  const request: GetRecommendationsRequest = {
    commuteDurationSec,
    vibe: vibe.key,
    topicsLearned: [], // For now, we're not tracking learned topics
    userId
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/wizard/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_TOKEN
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process the response to ensure all required fields are present
    if (data?.payload?.recommendations) {
      return data.payload.recommendations.map((rec: Partial<Recommendation>) => ({
        topic: rec.topic || 'General Learning',
        title: rec.title || 'Recommended Content',
        description: rec.description || 'Check out this recommended content',
        thumbnail: rec.thumbnail || DEFAULT_THUMBNAIL,
        duration: rec.duration || '5:00',
        durationSec: rec.durationSec || 300,
        level: rec.level || 'beginner',
        channelTitle: rec.channelTitle || DEFAULT_CHANNEL,
        videoId: rec.videoId || DEFAULT_VIDEO_ID,
        channelId: rec.channelId || 'UC' + Math.random().toString(36).substring(2, 10)
      }));
    }
    
    // Return empty array if no recommendations found
    return [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    // Return a fallback recommendation in case of error
    return [{
      topic: 'General Learning',
      title: 'Getting Started',
      description: 'Explore our recommended content',
      thumbnail: DEFAULT_THUMBNAIL,
      duration: '5:00',
      durationSec: 300,
      level: 'beginner',
      channelTitle: DEFAULT_CHANNEL,
      videoId: DEFAULT_VIDEO_ID,
      channelId: 'UC' + Math.random().toString(36).substring(2, 10)
    }];
  }
}

// Build a playlist based on user selections
export async function buildWizardPlaylist(
  params: Omit<BuildPlaylistRequest, 'userId'>,
  userId: string = 'demoUser'
): Promise<PlaylistResponse> {
  const request: BuildPlaylistRequest = {
    ...params,
    userId
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/wizard/playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_TOKEN,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to build playlist: ${response.statusText}`);
    }

    const data: PlaylistResponse = await response.json();
    
    // Ensure the response has all required fields
    if (data?.payload?.playlist) {
      const playlist = data.payload.playlist;
      
      // Ensure all videos in the playlist have required fields
      if (Array.isArray(playlist.videos)) {
        playlist.videos = playlist.videos.map(video => ({
          ...video,
          channelTitle: video.channelTitle || DEFAULT_CHANNEL,
          thumbnail: video.thumbnail || DEFAULT_THUMBNAIL,
          duration: video.duration || formatDuration(video.durationSec || 300),
          durationSec: video.durationSec || 300,
          level: video.level || 'beginner',
          topic: video.topic || params.topic || 'General Learning'
        }));
      }
      
      // Ensure playlist has required fields
      data.payload.playlist = {
        id: playlist.id || `playlist-${Date.now()}`,
        title: playlist.title || `Your ${params.topic || 'Learning'} Playlist`,
        description: playlist.description || `A curated playlist about ${params.topic || 'your selected topic'}`,
        thumbnail: playlist.thumbnail || DEFAULT_THUMBNAIL,
        duration: playlist.duration || formatDuration(playlist.durationSec || 300),
        durationSec: playlist.durationSec || 300,
        videos: playlist.videos || []
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error building playlist:', error);
    // Return a fallback playlist in case of error
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to build playlist',
      payload: {
        playlist: {
          id: `fallback-${Date.now()}`,
          title: `Your ${params.topic || 'Learning'} Playlist`,
          description: `A curated playlist about ${params.topic || 'your selected topic'}`,
          thumbnail: DEFAULT_THUMBNAIL,
          duration: '5:00',
          durationSec: 300,
          videos: [{
            videoId: DEFAULT_VIDEO_ID,
            title: `Introduction to ${params.topic || 'the Topic'}`,
            channelTitle: DEFAULT_CHANNEL,
            thumbnail: DEFAULT_THUMBNAIL,
            duration: '5:00',
            durationSec: 300,
            level: 'beginner',
            topic: params.topic || 'General Learning',
            channelId: 'UC' + Math.random().toString(36).substring(2, 10)
          }]
        },
        playlistContext: {
          topic: params.topic || 'General Learning',
          vibe: params.vibe || 'chill',
          difficulty: params.difficulty || 'beginner',
          masteryScore: 0
        }
      }
    };
  }
}

// Get a vibe by its key, returns the default (chill) if not found
export function getVibeByKey(key: string): Vibe {
  const vibeKey = VIBE_KEYS.includes(key as VibeKey) ? key as VibeKey : 'chill';
  return VIBE_PRESETS[vibeKey];
}

// Get all available vibes
export function getAllVibes(): Vibe[] {
  return Object.values(VIBE_PRESETS);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
