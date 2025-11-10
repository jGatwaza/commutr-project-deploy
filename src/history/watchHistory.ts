import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * WatchedEntry represents a single watched video record.
 * Tracks user video completion with metadata for history display.
 */
export type WatchedEntry = {
  id: string;                 // unique, stable enough for UI keys
  userId: string;
  videoId: string;
  title: string;
  durationSec: number;
  topicTags?: string[];
  startedAt?: string;         // ISO
  completedAt?: string;       // ISO; used for recency sorting
  progressPct?: number;       // 0..100
  source?: string;            // e.g., "youtube"
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
};

export type WatchedEntryInput = Omit<WatchedEntry, 'id' | 'createdAt' | 'updatedAt'>;

type WatchedStore = {
  entries: WatchedEntry[];
};

// Storage path
const DATA_DIR = join(__dirname, '../../data');
const WATCHED_FILE = join(DATA_DIR, 'watched.json');

// Helper: Generate CUID-like ID
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `w${timestamp}${random}`;
}

/**
 * Load watched entries from file.
 * If file is malformed or missing, returns empty structure.
 * This ensures resilience against corrupted JSON.
 */
function loadWatched(): WatchedStore {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!existsSync(WATCHED_FILE)) {
    return { entries: [] };
  }
  
  try {
    const data = readFileSync(WATCHED_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    // Malformed JSON: reset to empty structure with a warning
    console.error('Error loading watched.json (resetting to empty):', error);
    return { entries: [] };
  }
}

/**
 * Save watched entries to file.
 */
function saveWatched(store: WatchedStore): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  try {
    writeFileSync(WATCHED_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving watched.json:', error);
    throw new Error('Failed to save watched entries');
  }
}

/**
 * Helper: Clear all watched entries (for testing).
 */
export function clearWatched(): void {
  saveWatched({ entries: [] });
}

/**
 * Upsert a watched entry.
 * 
 * Deduplication rule:
 * - Two entries are "the same" if (userId, videoId) match.
 * - When a duplicate is found:
 *   1. Prefer whichever has the newer completedAt timestamp.
 *   2. If completedAt is missing on either side, tiebreak by newer updatedAt/createdAt.
 *   3. Never replace a newer completion with an older one.
 * 
 * This ensures that if a user re-watches a video, we keep the most recent completion.
 */
export function upsertWatched(input: WatchedEntryInput): WatchedEntry {
  const store = loadWatched();
  const now = new Date().toISOString();
  
  // Find existing entry with same (userId, videoId)
  const existingIndex = store.entries.findIndex(
    e => e.userId === input.userId && e.videoId === input.videoId
  );
  
  if (existingIndex === -1) {
    // No existing entry: create new
    const newEntry: WatchedEntry = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now
    };
    store.entries.push(newEntry);
    saveWatched(store);
    return newEntry;
  }
  
  // Existing entry found: apply dedup/recency rule
  const existing = store.entries[existingIndex]!;
  
  // Determine which entry is "newer" based on completedAt
  const existingCompleted = existing.completedAt ? new Date(existing.completedAt).getTime() : 0;
  const inputCompleted = input.completedAt ? new Date(input.completedAt).getTime() : 0;
  
  let shouldUpdate = false;
  
  if (inputCompleted > 0 && existingCompleted > 0) {
    // Both have completedAt: prefer newer
    shouldUpdate = inputCompleted >= existingCompleted;
  } else if (inputCompleted > 0 && existingCompleted === 0) {
    // Input has completedAt, existing doesn't: prefer input
    shouldUpdate = true;
  } else if (inputCompleted === 0 && existingCompleted > 0) {
    // Existing has completedAt, input doesn't: keep existing
    shouldUpdate = false;
  } else {
    // Neither has completedAt: tiebreak by updatedAt/createdAt
    const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
    const inputTime = Date.now(); // Current time for new input
    shouldUpdate = inputTime >= existingTime;
  }
  
  if (shouldUpdate) {
    // Update existing entry with new data
    const updatedEntry: WatchedEntry = {
      ...existing,
      ...input,
      id: existing.id,           // Keep original ID
      createdAt: existing.createdAt, // Keep original createdAt
      updatedAt: now
    };
    store.entries[existingIndex] = updatedEntry;
    saveWatched(store);
    return updatedEntry;
  } else {
    // Keep existing entry (newer completion already exists)
    return existing;
  }
}

/**
 * List watched entries with pagination and filtering.
 * 
 * Sorting order (stable for pagination):
 * 1. completedAt desc (if present)
 * 2. updatedAt desc
 * 3. createdAt desc
 * 
 * Pagination:
 * - Uses opaque cursor (base64-encoded offset) to continue paging.
 * - Guarantees no duplicates across pages for a static dataset.
 * - Cursor is stable as long as the filter set doesn't change.
 * 
 * Filters:
 * - userId: required, filters to specific user
 * - q: optional, case-insensitive substring match on title
 * - limit: 1-100, default 20
 * - cursor: opaque token to continue from previous page
 */
export function listWatched(options: {
  userId: string;
  limit?: number;
  cursor?: string;
  q?: string;
}): { items: WatchedEntry[]; nextCursor?: string } {
  const { userId, limit = 20, cursor, q } = options;
  const store = loadWatched();
  
  // Validate limit
  const validLimit = Math.max(1, Math.min(100, limit));
  
  // Filter by userId
  let filtered = store.entries.filter(e => e.userId === userId);
  
  // Filter by title search (case-insensitive)
  if (q && q.trim()) {
    const lowerQ = q.toLowerCase();
    filtered = filtered.filter(e => e.title.toLowerCase().includes(lowerQ));
  }
  
  // Sort by: completedAt desc, updatedAt desc, createdAt desc
  // This ensures stable ordering for pagination
  filtered.sort((a, b) => {
    // 1. completedAt desc (treat missing as epoch 0)
    const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    if (bCompleted !== aCompleted) return bCompleted - aCompleted;
    
    // 2. updatedAt desc
    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    
    // 3. createdAt desc
    const aCreated = new Date(a.createdAt).getTime();
    const bCreated = new Date(b.createdAt).getTime();
    return bCreated - aCreated;
  });
  
  // Decode cursor to get offset
  let offset = 0;
  if (cursor) {
    try {
      offset = parseInt(Buffer.from(cursor, 'base64').toString('utf-8'), 10);
      if (isNaN(offset) || offset < 0) offset = 0;
    } catch {
      offset = 0;
    }
  }
  
  // Paginate
  const items = filtered.slice(offset, offset + validLimit);
  
  // Generate next cursor if there are more items
  let nextCursor: string | undefined;
  if (offset + validLimit < filtered.length) {
    const nextOffset = offset + validLimit;
    nextCursor = Buffer.from(nextOffset.toString()).toString('base64');
  }
  
  return { items, nextCursor };
}