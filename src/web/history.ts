import { Router } from 'express';
import { z } from 'zod';
import {
  saveSession,
  listSessions,
  getSession,
  getShared,
  issueShareToken
} from '../history/store.js';
import {
  saveCommuteSession,
  getUserHistory,
  getCommuteSession,
  type CommuteSession,
  type VideoWatched
} from '../history/commuteHistory.js';

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

// Validation schema for commute session
const commuteSessionSchema = z.object({
  userId: z.string().min(1),
  session: z.object({
    id: z.string(),
    timestamp: z.string(),
    topics: z.array(z.string()),
    durationSec: z.number(),
    videosWatched: z.array(z.object({
      videoId: z.string(),
      title: z.string(),
      thumbnail: z.string(),
      channelTitle: z.string(),
      durationSec: z.number()
    }))
  })
});

/**
 * POST /api/commute-history
 * Save a commute session
 */
router.post('/commute-history', requireAuth, (req, res) => {
  const parsed = commuteSessionSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid commute session data' });
  }
  
  const { userId, session } = parsed.data;
  
  try {
    saveCommuteSession(userId, session);
    
    console.log('commute_saved', { userId, commuteId: session.id });
    
    return res.status(200).json({ success: true, id: session.id });
  } catch (error) {
    console.error('Error saving commute:', error);
    return res.status(500).json({ error: 'Failed to save commute' });
  }
});

/**
 * GET /api/commute-history/:userId
 * Get commute history for a user
 */
router.get('/commute-history/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  
  try {
    const history = getUserHistory(userId);
    
    return res.status(200).json({ history });
  } catch (error) {
    console.error('Error getting commute history:', error);
    return res.status(500).json({ error: 'Failed to get commute history' });
  }
});

/**
 * GET /api/commute-history/:userId/:commuteId
 * Get a specific commute session
 */
router.get('/commute-history/:userId/:commuteId', requireAuth, (req, res) => {
  const { userId, commuteId } = req.params;
  
  try {
    const session = getCommuteSession(userId, commuteId);
    
    if (!session) {
      return res.status(404).json({ error: 'Commute not found' });
    }
    
    return res.status(200).json(session);
  } catch (error) {
    console.error('Error getting commute:', error);
    return res.status(500).json({ error: 'Failed to get commute' });
  }
});

export default router;
