import { Router } from 'express';
import { z } from 'zod';
import {
  saveSession,
  listSessions,
  getSession,
  getShared,
  issueShareToken
} from '../history/store.js';

const router = Router();

// Auth middleware - requires Authorization: Bearer TEST
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer TEST') {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Validation schema for POST /api/history
const sessionSchema = z.object({
  queryText: z.string().min(1, 'queryText must be non-empty'),
  intent: z.unknown(),
  playlist: z.unknown(),
  durationMs: z.number().int().positive('durationMs must be a positive integer')
});

// Validation schema for GET /api/history query params
const listQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  since: z.string().optional(),
  q: z.string().optional()
});

/**
 * POST /api/history
 * Save a new session
 */
router.post('/history', requireAuth, (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return res.status(400).json({ error: firstError?.message || 'Invalid input' });
  }
  
  const { queryText, intent, playlist, durationMs } = parsed.data;
  
  try {
    const session = saveSession({
      queryText,
      intentJSON: intent,
      playlistJSON: playlist,
      durationMs
    });
    
    // Emit telemetry
    console.log('history_saved', { id: session.id, queryText: session.queryText });
    
    return res.status(200).json({
      id: session.id,
      shareToken: session.shareToken
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return res.status(500).json({ error: 'Failed to save session' });
  }
});

/**
 * GET /api/history
 * List sessions with optional filters
 */
router.get('/history', requireAuth, (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }
  
  const { limit, since, q } = parsed.data;
  
  try {
    const options: { limit?: number; sinceISO?: string; q?: string } = { limit };
    if (since) options.sinceISO = since;
    if (q) options.q = q;
    
    const sessions = listSessions(options);
    
    return res.status(200).json(sessions);
  } catch (error) {
    console.error('Error listing sessions:', error);
    return res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * GET /api/history/:id
 * Get full session details
 */
router.get('/history/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  try {
    const session = getSession(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Emit telemetry
    console.log('history_viewed', { id: session.id, queryText: session.queryText });
    
    return res.status(200).json({
      id: session.id,
      createdAt: session.createdAt,
      queryText: session.queryText,
      intent: session.intentJSON,
      playlist: session.playlistJSON,
      shareToken: session.shareToken
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * GET /api/share/:token
 * Get public session data by share token (no auth required)
 */
router.get('/share/:token', (req, res) => {
  const { token } = req.params;
  
  try {
    const shared = getShared(token);
    
    if (!shared) {
      return res.status(404).json({ error: 'Share not found' });
    }
    
    return res.status(200).json({
      queryText: shared.queryText,
      playlist: shared.playlistJSON
    });
  } catch (error) {
    console.error('Error getting shared session:', error);
    return res.status(500).json({ error: 'Failed to get shared session' });
  }
});

export default router;
