import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'commute-history.json');
const MAX_COMMUTES_PER_USER = 5;

export interface VideoWatched {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  durationSec: number;
}

export interface CommuteSession {
  id: string;
  timestamp: string;
  topics: string[];
  durationSec: number;
  videosWatched: VideoWatched[];
}

export interface UserHistory {
  userId: string;
  commutes: CommuteSession[];
}

interface HistoryData {
  [userId: string]: CommuteSession[];
}

/**
 * Ensure data directory and history file exist
 */
function ensureHistoryFile(): void {
  const dataDir = path.dirname(HISTORY_FILE);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({}), 'utf-8');
  }
}

/**
 * Read history data from file
 */
function readHistory(): HistoryData {
  ensureHistoryFile();
  
  try {
    const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading history file:', error);
    return {};
  }
}

/**
 * Write history data to file
 */
function writeHistory(data: HistoryData): void {
  ensureHistoryFile();
  
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing history file:', error);
  }
}

/**
 * Save a commute session for a user
 * Keeps only the last 5 commutes, deleting the oldest
 */
export function saveCommuteSession(userId: string, session: CommuteSession): void {
  const history = readHistory();
  
  if (!history[userId]) {
    history[userId] = [];
  }
  
  // Add new session at the beginning
  history[userId].unshift(session);
  
  // Keep only last 5 commutes
  if (history[userId].length > MAX_COMMUTES_PER_USER) {
    history[userId] = history[userId].slice(0, MAX_COMMUTES_PER_USER);
  }
  
  writeHistory(history);
}

/**
 * Get commute history for a user
 */
export function getUserHistory(userId: string): CommuteSession[] {
  const history = readHistory();
  return history[userId] || [];
}

/**
 * Get a specific commute session by ID
 */
export function getCommuteSession(userId: string, commuteId: string): CommuteSession | null {
  const history = readHistory();
  const userCommutes = history[userId] || [];
  
  return userCommutes.find(c => c.id === commuteId) || null;
}

/**
 * Delete a commute session
 */
export function deleteCommuteSession(userId: string, commuteId: string): boolean {
  const history = readHistory();
  
  if (!history[userId]) {
    return false;
  }
  
  const initialLength = history[userId].length;
  history[userId] = history[userId].filter(c => c.id !== commuteId);
  
  if (history[userId].length < initialLength) {
    writeHistory(history);
    return true;
  }
  
  return false;
}
