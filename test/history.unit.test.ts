import {
  saveSession,
  listSessions,
  getSession,
  getShared,
  issueShareToken,
  clearSessions
} from '../src/history/store';

// Clear sessions before each test
beforeEach(() => {
  clearSessions();
});

describe('History Store Unit Tests', () => {
  
  describe('saveSession', () => {
    test('saveSession creates a new session with id and createdAt', () => {
      const session = saveSession({
        queryText: 'test query',
        intentJSON: { topic: 'test' },
        playlistJSON: { items: [] },
        durationMs: 1000
      });
      
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('shareToken');
      expect(typeof session.id).toBe('string');
      expect(typeof session.createdAt).toBe('string');
      expect(typeof session.shareToken).toBe('string');
      expect(session.id.length).toBeGreaterThan(0);
      expect(session.shareToken!.length).toBeGreaterThan(0);
    });

    test('saveSession stores all provided fields', () => {
      const input = {
        queryText: 'python tutorial',
        intentJSON: { topic: 'python', duration: 600 },
        playlistJSON: { items: [{ id: 1 }] },
        durationMs: 5000
      };
      
      const session = saveSession(input);
      
      expect(session.queryText).toBe('python tutorial');
      expect(session.intentJSON).toEqual({ topic: 'python', duration: 600 });
      expect(session.playlistJSON).toEqual({ items: [{ id: 1 }] });
      expect(session.durationMs).toBe(5000);
    });

    test('saveSession generates unique IDs for different sessions', () => {
      const session1 = saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const session2 = saveSession({
        queryText: 'second',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      expect(session1.id).not.toBe(session2.id);
    });

    test('saveSession generates unique share tokens', () => {
      const session1 = saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const session2 = saveSession({
        queryText: 'second',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      expect(session1.shareToken).not.toBe(session2.shareToken);
    });

    test('saveSession createdAt is valid ISO timestamp', () => {
      const session = saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const date = new Date(session.createdAt);
      expect(date.toString()).not.toBe('Invalid Date');
      expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('listSessions', () => {
    test('listSessions returns empty array when no sessions', () => {
      const sessions = listSessions();
      expect(sessions).toEqual([]);
    });

    test('listSessions returns saved sessions', () => {
      saveSession({
        queryText: 'test query',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const sessions = listSessions();
      
      expect(sessions.length).toBe(1);
      expect(sessions[0]).toHaveProperty('id');
      expect(sessions[0]).toHaveProperty('createdAt');
      expect(sessions[0]).toHaveProperty('queryText');
      expect(sessions[0]!.queryText).toBe('test query');
    });

    test('listSessions returns only id, createdAt, queryText fields', () => {
      saveSession({
        queryText: 'test',
        intentJSON: { some: 'data' },
        playlistJSON: { items: [] },
        durationMs: 1000
      });
      
      const sessions = listSessions();
      const session = sessions[0]!;
      
      expect(Object.keys(session)).toEqual(['id', 'createdAt', 'queryText']);
      expect(session).not.toHaveProperty('intentJSON');
      expect(session).not.toHaveProperty('playlistJSON');
      expect(session).not.toHaveProperty('durationMs');
    });

    test('listSessions returns sessions in newest-first order', () => {
      const session1 = saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      // Small delay
      const now = Date.now();
      while (Date.now() - now < 5) { /* wait */ }
      
      const session2 = saveSession({
        queryText: 'second',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const sessions = listSessions();
      
      expect(sessions[0]!.id).toBe(session2.id);
      expect(sessions[1]!.id).toBe(session1.id);
    });

    test('listSessions respects limit parameter', () => {
      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        saveSession({
          queryText: `session ${i}`,
          intentJSON: {},
          playlistJSON: {},
          durationMs: 1000
        });
      }
      
      const sessions = listSessions({ limit: 3 });
      expect(sessions.length).toBe(3);
    });

    test('listSessions filters by sinceISO parameter', async () => {
      // Create first session
      saveSession({
        queryText: 'old session',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get timestamp
      const since = new Date().toISOString();
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Create second session
      saveSession({
        queryText: 'new session',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const sessions = listSessions({ sinceISO: since });
      
      expect(sessions.length).toBe(1);
      expect(sessions[0]!.queryText).toBe('new session');
    });

    test('listSessions filters by q parameter (case insensitive)', () => {
      saveSession({
        queryText: 'Python tutorial for beginners',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      saveSession({
        queryText: 'JavaScript basics',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      saveSession({
        queryText: 'Advanced Python concepts',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const sessions = listSessions({ q: 'python' });
      
      expect(sessions.length).toBe(2);
      expect(sessions.every((s: any) => s.queryText.toLowerCase().includes('python'))).toBe(true);
    });

    test('listSessions combines all filters', () => {
      // Create sessions
      saveSession({
        queryText: 'old python tutorial',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const since = new Date().toISOString();
      
      // Small delay
      const now = Date.now();
      while (Date.now() - now < 5) { /* wait */ }
      
      for (let i = 0; i < 3; i++) {
        saveSession({
          queryText: `new python session ${i}`,
          intentJSON: {},
          playlistJSON: {},
          durationMs: 1000
        });
      }
      
      saveSession({
        queryText: 'new javascript session',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const sessions = listSessions({ 
        sinceISO: since, 
        q: 'python',
        limit: 2
      });
      
      expect(sessions.length).toBe(2);
      expect(sessions.every((s: any) => s.queryText.includes('python'))).toBe(true);
    });
  });

  describe('getSession', () => {
    test('getSession returns null for non-existent ID', () => {
      const session = getSession('non-existent-id');
      expect(session).toBeNull();
    });

    test('getSession returns full session data', () => {
      const saved = saveSession({
        queryText: 'test query',
        intentJSON: { topic: 'test', duration: 600 },
        playlistJSON: { items: [{ id: 1 }] },
        durationMs: 5000
      });
      
      const retrieved = getSession(saved.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(saved.id);
      expect(retrieved!.queryText).toBe('test query');
      expect(retrieved!.intentJSON).toEqual({ topic: 'test', duration: 600 });
      expect(retrieved!.playlistJSON).toEqual({ items: [{ id: 1 }] });
      expect(retrieved!.durationMs).toBe(5000);
      expect(retrieved!.createdAt).toBe(saved.createdAt);
      expect(retrieved!.shareToken).toBe(saved.shareToken);
    });

    test('getSession retrieves correct session among multiple', () => {
      const session1 = saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const session2 = saveSession({
        queryText: 'second',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 2000
      });
      
      const session3 = saveSession({
        queryText: 'third',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 3000
      });
      
      const retrieved = getSession(session2.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.queryText).toBe('second');
      expect(retrieved!.durationMs).toBe(2000);
    });
  });

  describe('getShared', () => {
    test('getShared returns null for invalid token', () => {
      const shared = getShared('invalid-token');
      expect(shared).toBeNull();
    });

    test('getShared returns only queryText and playlistJSON', () => {
      const saved = saveSession({
        queryText: 'shared query',
        intentJSON: { topic: 'test' },
        playlistJSON: { items: [{ id: 1 }] },
        durationMs: 5000
      });
      
      const shared = getShared(saved.shareToken!);
      
      expect(shared).not.toBeNull();
      expect(shared!.queryText).toBe('shared query');
      expect(shared!.playlistJSON).toEqual({ items: [{ id: 1 }] });
      expect(Object.keys(shared!)).toEqual(['queryText', 'playlistJSON']);
    });

    test('getShared finds session by share token', () => {
      const session1 = saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: { data: 'first' },
        durationMs: 1000
      });
      
      const session2 = saveSession({
        queryText: 'second',
        intentJSON: {},
        playlistJSON: { data: 'second' },
        durationMs: 2000
      });
      
      const shared = getShared(session2.shareToken!);
      
      expect(shared).not.toBeNull();
      expect(shared!.queryText).toBe('second');
      expect(shared!.playlistJSON).toEqual({ data: 'second' });
    });
  });

  describe('issueShareToken', () => {
    test('issueShareToken returns null for non-existent ID', () => {
      const token = issueShareToken('non-existent-id');
      expect(token).toBeNull();
    });

    test('issueShareToken returns existing token if present', () => {
      const saved = saveSession({
        queryText: 'test',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      const originalToken = saved.shareToken;
      const token = issueShareToken(saved.id);
      
      expect(token).toBe(originalToken);
    });

    test('issueShareToken token can be used with getShared', () => {
      const saved = saveSession({
        queryText: 'test query',
        intentJSON: {},
        playlistJSON: { items: [] },
        durationMs: 1000
      });
      
      const token = issueShareToken(saved.id);
      const shared = getShared(token!);
      
      expect(shared).not.toBeNull();
      expect(shared!.queryText).toBe('test query');
    });
  });

  describe('clearSessions', () => {
    test('clearSessions removes all sessions', () => {
      // Create sessions
      saveSession({
        queryText: 'first',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      saveSession({
        queryText: 'second',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      expect(listSessions().length).toBe(2);
      
      clearSessions();
      
      expect(listSessions().length).toBe(0);
    });
  });

  describe('Persistence', () => {
    test('sessions persist across multiple operations', () => {
      const saved = saveSession({
        queryText: 'persistent query',
        intentJSON: { data: 'test' },
        playlistJSON: { items: [1, 2, 3] },
        durationMs: 7500
      });
      
      // List sessions
      const listed = listSessions();
      expect(listed.length).toBe(1);
      
      // Get full session
      const retrieved = getSession(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.queryText).toBe('persistent query');
      
      // Get via share token
      const shared = getShared(saved.shareToken!);
      expect(shared).not.toBeNull();
      expect(shared!.queryText).toBe('persistent query');
      
      // Add another session
      const saved2 = saveSession({
        queryText: 'second query',
        intentJSON: {},
        playlistJSON: {},
        durationMs: 1000
      });
      
      // Both should exist
      const listed2 = listSessions();
      expect(listed2.length).toBe(2);
      
      // Original session should still be retrievable
      const retrieved2 = getSession(saved.id);
      expect(retrieved2).not.toBeNull();
      expect(retrieved2!.queryText).toBe('persistent query');
    });
  });
});
