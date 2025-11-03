import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
export type WatchRecord = {
  userId: string;
  videoId: string;
  topic: string;
  watchedAt: string; // ISO timestamp
  durationSec: number;
  completionPercent: number; // 0-100
};

// Storage path
const DATA_DIR = join(__dirname, '../../data');
const WATCH_HISTORY_FILE = join(DATA_DIR, 'watchHistory.json');

// Helper: Load watch history from file
function loadWatchHistory(): WatchRecord[] {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!existsSync(WATCH_HISTORY_FILE)) {
    return [];
  }
  
  try {
    const data = readFileSync(WATCH_HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading watch history:', error);
    return [];
  }
}

// Helper: Save watch history to file
function saveWatchHistory(records: WatchRecord[]): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  try {
    writeFileSync(WATCH_HISTORY_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving watch history:', error);
    throw new Error('Failed to save watch history');
  }
}

/**
 * Add a watched video to history
 */
export function addWatchedVideo(
  userId: string,
  videoId: string,
  topic: string,
  durationSec: number,
  completionPercent: number = 100
): void {
  const records = loadWatchHistory();
  
  const newRecord: WatchRecord = {
    userId,
    videoId,
    topic,
    watchedAt: new Date().toISOString(),
    durationSec,
    completionPercent
  };
  
  records.push(newRecord);
  saveWatchHistory(records);
  
  console.log(`📺 Watched: ${videoId} (${topic}) - ${completionPercent}%`);
}

/**
 * Get all watched video IDs for a user (optionally filtered by topic)
 */
export function getWatchedVideoIds(userId: string, topic?: string): string[] {
  const records = loadWatchHistory();
  
  let filtered = records.filter(r => r.userId === userId);
  
  if (topic) {
    filtered = filtered.filter(r => r.topic.toLowerCase() === topic.toLowerCase());
  }
  
  // Return unique video IDs
  return [...new Set(filtered.map(r => r.videoId))];
}

/**
 * Get watch history for a user (optionally filtered by topic)
 */
export function getWatchHistory(userId: string, topic?: string, limit: number = 50): WatchRecord[] {
  const records = loadWatchHistory();
  
  let filtered = records.filter(r => r.userId === userId);
  
  if (topic) {
    filtered = filtered.filter(r => r.topic.toLowerCase() === topic.toLowerCase());
  }
  
  // Sort by most recent first
  filtered.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
  
  return filtered.slice(0, limit);
}

/**
 * Get watch count for a topic (for proficiency tracking)
 */
export function getTopicWatchCount(userId: string, topic: string): number {
  const records = loadWatchHistory();
  
  return records.filter(
    r => r.userId === userId && r.topic.toLowerCase() === topic.toLowerCase()
  ).length;
}

/**
 * Check if a video has been watched by user
 */
export function hasWatchedVideo(userId: string, videoId: string): boolean {
  const records = loadWatchHistory();
  
  return records.some(r => r.userId === userId && r.videoId === videoId);
}

/**
 * Clear watch history (for testing)
 */
export function clearWatchHistory(): void {
  saveWatchHistory([]);
}
