import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
export type SessionRec = {
  id: string;              // cuid
  createdAt: string;       // ISO
  queryText: string;
  intentJSON: unknown;
  playlistJSON: unknown;
  durationMs: number;
  shareToken?: string;     // random 22-char
};

type SessionRecInput = Omit<SessionRec, 'id' | 'createdAt'>;

// Storage path
const DATA_DIR = join(__dirname, '../../data');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

// Helper: Generate CUID-like ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${random}`;
}

// Helper: Generate share token (22 chars)
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper: Load sessions from file
function loadSessions(): SessionRec[] {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!existsSync(SESSIONS_FILE)) {
    return [];
  }
  
  try {
    const data = readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

// Helper: Save sessions to file
function saveSessions(sessions: SessionRec[]): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  try {
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving sessions:', error);
    throw new Error('Failed to save sessions');
  }
}

// Helper: Clear all sessions (for testing)
export function clearSessions(): void {
  saveSessions([]);
}

/**
 * Save a new session
 */
export function saveSession(recInput: SessionRecInput): SessionRec {
  const sessions = loadSessions();
  
  const newSession: SessionRec = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...recInput,
    shareToken: generateShareToken()
  };
  
  sessions.push(newSession);
  saveSessions(sessions);
  
  return newSession;
}

/**
 * List sessions with optional filters
 */
export function listSessions(options: {
  limit?: number;
  sinceISO?: string;
  q?: string;
} = {}): Pick<SessionRec, 'id' | 'createdAt' | 'queryText'>[] {
  const { limit = 50, sinceISO, q } = options;
  let sessions = loadSessions();
  
  // Filter by sinceISO
  if (sinceISO) {
    const sinceDate = new Date(sinceISO);
    sessions = sessions.filter(s => new Date(s.createdAt) >= sinceDate);
  }
  
  // Filter by query text
  if (q) {
    const lowerQ = q.toLowerCase();
    sessions = sessions.filter(s => s.queryText.toLowerCase().includes(lowerQ));
  }
  
  // Sort by newest first
  sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Apply limit
  sessions = sessions.slice(0, limit);
  
  // Return only required fields
  return sessions.map(s => ({
    id: s.id,
    createdAt: s.createdAt,
    queryText: s.queryText
  }));
}

/**
 * Get a session by ID
 */
export function getSession(id: string): SessionRec | null {
  const sessions = loadSessions();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Get a session by share token (public)
 */
export function getShared(token: string): Pick<SessionRec, 'queryText' | 'playlistJSON'> | null {
  const sessions = loadSessions();
  const session = sessions.find(s => s.shareToken === token);
  
  if (!session) {
    return null;
  }
  
  return {
    queryText: session.queryText,
    playlistJSON: session.playlistJSON
  };
}

/**
 * Issue or retrieve a share token for a session
 */
export function issueShareToken(id: string): string | null {
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === id);
  
  if (!session) {
    return null;
  }
  
  // If no token exists, create one
  if (!session.shareToken) {
    session.shareToken = generateShareToken();
    saveSessions(sessions);
  }
  
  return session.shareToken;
}
