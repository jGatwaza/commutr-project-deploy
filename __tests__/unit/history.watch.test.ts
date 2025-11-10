import {
  upsertWatched,
  listWatched,
  clearWatched,
  WatchedEntryInput
} from '../../src/history/watchHistory.js';

// Clear watched entries before each test
beforeEach(() => {
  clearWatched();
});

describe('Watch History Store Unit Tests', () => {
  
  describe('upsertWatched', () => {
    test('creates a new entry with id, createdAt, updatedAt', () => {
      const input: WatchedEntryInput = {
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'How CPUs Work',
        durationSec: 842,
        completedAt: '2025-11-10T19:14:02.000Z',
        progressPct: 100,
        source: 'youtube'
      };
      
      const entry = upsertWatched(input);
      
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('updatedAt');
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.userId).toBe('u_123');
      expect(entry.videoId).toBe('yt_abc');
      expect(entry.title).toBe('How CPUs Work');
    });

    test('stores all provided fields including optional ones', () => {
      const input: WatchedEntryInput = {
        userId: 'u_456',
        videoId: 'yt_def',
        title: 'JavaScript Basics',
        durationSec: 600,
        topicTags: ['javascript', 'programming'],
        startedAt: '2025-11-10T19:00:00.000Z',
        completedAt: '2025-11-10T19:10:00.000Z',
        progressPct: 100,
        source: 'youtube'
      };
      
      const entry = upsertWatched(input);
      
      expect(entry.topicTags).toEqual(['javascript', 'programming']);
      expect(entry.startedAt).toBe('2025-11-10T19:00:00.000Z');
      expect(entry.completedAt).toBe('2025-11-10T19:10:00.000Z');
      expect(entry.progressPct).toBe(100);
      expect(entry.source).toBe('youtube');
    });

    test('does not override newer completion with older one', () => {
      // First watch: completed at 19:00
      const first = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Test Video',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z',
        progressPct: 100
      });
      
      // Second watch attempt: completed at 18:00 (older)
      const second = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Test Video Updated',
        durationSec: 600,
        completedAt: '2025-11-10T18:00:00.000Z', // Older timestamp
        progressPct: 50
      });
      
      // Should keep the newer completion (19:00)
      expect(second.id).toBe(first.id);
      expect(second.completedAt).toBe('2025-11-10T19:00:00.000Z');
      expect(second.progressPct).toBe(100);
    });

    test('updates with newer completion timestamp', () => {
      // First watch: completed at 18:00
      const first = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Test Video',
        durationSec: 600,
        completedAt: '2025-11-10T18:00:00.000Z',
        progressPct: 80
      });
      
      // Second watch: completed at 19:00 (newer)
      const second = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Test Video Rewatched',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z',
        progressPct: 100
      });
      
      // Should update with newer completion
      expect(second.id).toBe(first.id);
      expect(second.completedAt).toBe('2025-11-10T19:00:00.000Z');
      expect(second.progressPct).toBe(100);
      expect(second.title).toBe('Test Video Rewatched');
    });

    test('different users can watch same video independently', () => {
      const user1Entry = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Shared Video',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      const user2Entry = upsertWatched({
        userId: 'u_456',
        videoId: 'yt_abc',
        title: 'Shared Video',
        durationSec: 600,
        completedAt: '2025-11-10T19:05:00.000Z'
      });
      
      // Should create separate entries
      expect(user1Entry.id).not.toBe(user2Entry.id);
      expect(user1Entry.userId).toBe('u_123');
      expect(user2Entry.userId).toBe('u_456');
    });

    test('same user watching different videos creates separate entries', () => {
      const video1 = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Video 1',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      const video2 = upsertWatched({
        userId: 'u_123',
        videoId: 'yt_def',
        title: 'Video 2',
        durationSec: 300,
        completedAt: '2025-11-10T19:10:00.000Z'
      });
      
      expect(video1.id).not.toBe(video2.id);
      expect(video1.videoId).toBe('yt_abc');
      expect(video2.videoId).toBe('yt_def');
    });
  });

  describe('listWatched', () => {
    test('returns empty items when no entries exist', () => {
      const result = listWatched({ userId: 'u_123' });
      
      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    test('returns entries for specific user only', () => {
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'User 123 Video',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      upsertWatched({
        userId: 'u_456',
        videoId: 'yt_def',
        title: 'User 456 Video',
        durationSec: 300,
        completedAt: '2025-11-10T19:05:00.000Z'
      });
      
      const result = listWatched({ userId: 'u_123' });
      
      expect(result.items.length).toBe(1);
      expect(result.items[0]!.userId).toBe('u_123');
      expect(result.items[0]!.title).toBe('User 123 Video');
    });

    test('sorts by completedAt desc (newest first)', () => {
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_1',
        title: 'First',
        durationSec: 600,
        completedAt: '2025-11-10T18:00:00.000Z'
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_2',
        title: 'Second',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_3',
        title: 'Third',
        durationSec: 600,
        completedAt: '2025-11-10T17:00:00.000Z'
      });
      
      const result = listWatched({ userId: 'u_123' });
      
      expect(result.items.length).toBe(3);
      expect(result.items[0]!.title).toBe('Second'); // 19:00 (newest)
      expect(result.items[1]!.title).toBe('First');  // 18:00
      expect(result.items[2]!.title).toBe('Third');  // 17:00 (oldest)
    });

    test('paginates correctly with limit=2', () => {
      // Create 5 entries
      for (let i = 0; i < 5; i++) {
        upsertWatched({
          userId: 'u_123',
          videoId: `yt_${i}`,
          title: `Video ${i}`,
          durationSec: 600,
          completedAt: `2025-11-10T${19 - i}:00:00.000Z`
        });
      }
      
      // First page
      const page1 = listWatched({ userId: 'u_123', limit: 2 });
      
      expect(page1.items.length).toBe(2);
      expect(page1.items[0]!.title).toBe('Video 0');
      expect(page1.items[1]!.title).toBe('Video 1');
      expect(page1.nextCursor).toBeDefined();
      
      // Second page using cursor
      const page2 = listWatched({ 
        userId: 'u_123', 
        limit: 2, 
        ...(page1.nextCursor && { cursor: page1.nextCursor })
      });
      
      expect(page2.items.length).toBe(2);
      expect(page2.items[0]!.title).toBe('Video 2');
      expect(page2.items[1]!.title).toBe('Video 3');
      expect(page2.nextCursor).toBeDefined();
      
      // Third page
      const page3 = listWatched({ 
        userId: 'u_123', 
        limit: 2, 
        ...(page2.nextCursor && { cursor: page2.nextCursor })
      });
      
      expect(page3.items.length).toBe(1);
      expect(page3.items[0]!.title).toBe('Video 4');
      expect(page3.nextCursor).toBeUndefined(); // No more pages
    });

    test('pagination has no duplicates across pages', () => {
      // Create 10 entries
      for (let i = 0; i < 10; i++) {
        upsertWatched({
          userId: 'u_123',
          videoId: `yt_${i}`,
          title: `Video ${i}`,
          durationSec: 600,
          completedAt: `2025-11-10T${19 - i}:00:00.000Z`
        });
      }
      
      const allIds = new Set<string>();
      let cursor: string | undefined;
      
      // Fetch all pages
      while (true) {
        const page = listWatched({ 
          userId: 'u_123', 
          limit: 3, 
          ...(cursor && { cursor })
        });
        
        page.items.forEach(item => {
          // Check for duplicates
          expect(allIds.has(item.id)).toBe(false);
          allIds.add(item.id);
        });
        
        if (!page.nextCursor) break;
        cursor = page.nextCursor;
      }
      
      // Should have fetched all 10 unique entries
      expect(allIds.size).toBe(10);
    });

    test('filters by title with q parameter (case-insensitive)', () => {
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_1',
        title: 'Python Tutorial for Beginners',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_2',
        title: 'JavaScript Basics',
        durationSec: 300,
        completedAt: '2025-11-10T19:05:00.000Z'
      });
      
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_3',
        title: 'Advanced Python Concepts',
        durationSec: 900,
        completedAt: '2025-11-10T19:10:00.000Z'
      });
      
      const result = listWatched({ userId: 'u_123', q: 'python' });
      
      expect(result.items.length).toBe(2);
      expect(result.items.every(item => 
        item.title.toLowerCase().includes('python')
      )).toBe(true);
    });

    test('search is case-insensitive', () => {
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_1',
        title: 'UPPERCASE TITLE',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      const resultLower = listWatched({ userId: 'u_123', q: 'uppercase' });
      const resultUpper = listWatched({ userId: 'u_123', q: 'UPPERCASE' });
      const resultMixed = listWatched({ userId: 'u_123', q: 'UpPeRcAsE' });
      
      expect(resultLower.items.length).toBe(1);
      expect(resultUpper.items.length).toBe(1);
      expect(resultMixed.items.length).toBe(1);
    });

    test('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        upsertWatched({
          userId: 'u_123',
          videoId: `yt_${i}`,
          title: `Video ${i}`,
          durationSec: 600,
          completedAt: `2025-11-10T${19 - i}:00:00.000Z`
        });
      }
      
      const result = listWatched({ userId: 'u_123', limit: 5 });
      
      expect(result.items.length).toBe(5);
    });

    test('clamps limit to valid range (1-100)', () => {
      for (let i = 0; i < 5; i++) {
        upsertWatched({
          userId: 'u_123',
          videoId: `yt_${i}`,
          title: `Video ${i}`,
          durationSec: 600,
          completedAt: `2025-11-10T${19 - i}:00:00.000Z`
        });
      }
      
      // Test lower bound
      const resultLow = listWatched({ userId: 'u_123', limit: 0 });
      expect(resultLow.items.length).toBe(1); // Clamped to 1
      
      // Test upper bound (would be clamped to 100, but we only have 5 items)
      const resultHigh = listWatched({ userId: 'u_123', limit: 200 });
      expect(resultHigh.items.length).toBe(5); // All items
    });
  });

  describe('clearWatched', () => {
    test('removes all watched entries', () => {
      upsertWatched({
        userId: 'u_123',
        videoId: 'yt_abc',
        title: 'Test',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z'
      });
      
      expect(listWatched({ userId: 'u_123' }).items.length).toBe(1);
      
      clearWatched();
      
      expect(listWatched({ userId: 'u_123' }).items.length).toBe(0);
    });
  });
});