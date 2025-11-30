import { ObjectId } from 'mongodb';

/**
 * Users Collection
 * NOTE: Authentication is handled by Firebase (Google OAuth only)
 * This collection only stores user preferences and metadata
 */
export interface User {
  _id: ObjectId;
  firebaseUid: string;          // PRIMARY IDENTIFIER from Firebase Auth
  email: string;                 // Copied from Firebase
  displayName?: string;          // Copied from Firebase
  photoURL?: string;             // Copied from Firebase
  preferences: {
    defaultCommuteDuration?: number;  // in seconds
    preferredTopics?: string[];
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced' | null;
    autoplayEnabled?: boolean;
    notificationsEnabled?: boolean;
    theme?: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

/**
 * Playlists Collection
 */
export interface Playlist {
  _id: ObjectId;
  playlistId: string;           // Legacy cuid-format ID
  userId: ObjectId;             // Reference to users._id
  firebaseUid: string;          // Firebase UID for fast lookup
  
  // Playlist metadata
  topic: string;
  topics?: string[];
  durationSec: number;
  mood?: string;
  difficultyLevel?: string;
  
  // Videos in playlist
  videos: PlaylistVideo[];
  totalVideos: number;
  totalDurationSec: number;
  
  // Sharing
  shareToken?: string;          // 22-char random token
  isPublic: boolean;
  shareCount: number;
  playCount: number;
  completionRate?: number;
  
  // Query metadata
  queryText?: string;
  intentJSON?: any;
  source?: 'wizard' | 'agent' | 'share';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastPlayedAt?: Date;
}

export interface PlaylistVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSec: number;
  difficulty?: string;
  topicTags?: string[];
  order: number;
}

/**
 * Watch History Collection
 */
export interface WatchHistory {
  _id: ObjectId;
  watchId: string;              // Legacy w-prefixed ID
  userId: ObjectId;             // Reference to users._id
  firebaseUid: string;          // Firebase UID for fast lookup
  
  // Video information
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
  durationSec: number;
  topicTags?: string[];
  difficulty?: string;
  
  // Watch progress
  progressPct: number;          // 0-100
  startedAt?: Date;
  completedAt?: Date;
  
  // Context
  playlistId?: ObjectId;        // Reference to playlists._id
  commuteSessionId?: ObjectId;  // Reference to commute_sessions._id
  source?: string;              // 'youtube' | 'playlist' | 'recommendation'
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Commute Sessions Collection
 */
export interface CommuteSession {
  _id: ObjectId;
  sessionId: string;            // commute-timestamp format
  userId: ObjectId;             // Reference to users._id
  firebaseUid: string;          // Firebase UID for fast lookup
  
  // Session information
  topics: string[];
  durationSec: number;          // Planned duration
  actualDurationSec?: number;   // Actual duration
  
  // Playlist reference
  playlistId?: ObjectId;        // Reference to playlists._id
  
  // Videos watched during session
  videosWatched: SessionVideo[];
  totalVideosWatched: number;
  totalTimeWatchedSec: number;
  
  // Metrics
  completionRate?: number;      // 0-100
  satisfactionRating?: number;  // 1-5 (optional)
  
  // Timestamps
  timestamp: Date;              // Session start
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionVideo {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
  durationSec: number;
  watchedAt?: Date;
  completedPct?: number;
}

/**
 * Mastery Collection
 * Tracks user learning progress per topic
 */
export interface Mastery {
  _id: ObjectId;
  userId: ObjectId;             // Reference to users._id
  firebaseUid: string;          // Firebase UID for fast lookup
  topic: string;
  
  // Mastery level
  level: 'beginner' | 'intermediate' | 'advanced';
  experiencePoints: number;
  
  // Progress tracking
  videosWatched: number;
  totalTimeSec: number;
  completionRate: number;       // 0-100
  
  // Streak information
  currentStreak: number;
  longestStreak: number;
  lastWatchedAt?: Date;
  
  // Difficulty progression
  beginnerVideosWatched: number;
  intermediateVideosWatched: number;
  advancedVideosWatched: number;
  
  // Recommendations
  recommendedDifficulty?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Achievements Collection
 * Badge system and progress tracking
 */
export interface Achievement {
  _id: ObjectId;
  userId: ObjectId;             // Reference to users._id
  firebaseUid: string;          // Firebase UID for fast lookup
  
  // Achievement information
  badgeId: string;              // e.g., 'video-10', 'streak-7'
  type: 'minutes' | 'streak' | 'commute' | 'videos';
  
  // Badge metadata
  title: string;
  description: string;
  icon: string;                 // emoji or icon code
  
  // Progress
  earned: boolean;
  earnedAt?: Date;
  progressCurrent: number;
  progressTarget: number;
  progressPct: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sessions Collection (Legacy Support)
 * Optional collection for backward compatibility
 */
export interface Session {
  _id: ObjectId;
  sessionId: string;            // cuid format
  userId: ObjectId;             // Reference to users._id
  
  // Session data
  queryText: string;
  intentJSON: any;
  playlistJSON: any;
  durationMs: number;
  shareToken?: string;
  
  // Timestamps
  createdAt: Date;
}
