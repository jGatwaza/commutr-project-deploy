import { Router } from 'express';
import { z } from 'zod';
import { getOrCreateUser } from '../db/services/userService.js';
import { createPlaylist, getUserPlaylists, getPlaylistById, getPlaylistByShareToken } from '../db/services/playlistService.js';
import {
  saveCommuteSession as saveCommuteSessionDB,
  getUserCommuteHistory,
  getCommuteSession as getCommuteSessionDB
} from '../db/services/commuteSessionService.js';

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
router.post('/history', requireAuth, async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return res.status(400).json({ error: firstError?.message || 'Invalid input' });
  }
  
  const { queryText, intent, playlist, durationMs } = parsed.data;
  
  try {
    // For now, use a demo user - in production, get from Firebase auth
    const firebaseUid = req.headers['x-user-id'] as string || 'demo-user';
    
    // Ensure user exists
    await getOrCreateUser({
      firebaseUid,
      email: 'demo@commutr.app',
      displayName: 'Demo User'
    });
    
    // Extract videos from playlist
    const playlistData = playlist as any;
    const videos = playlistData?.items || [];
    const topic = playlistData?.topic || queryText;
    
    // Create playlist in MongoDB
    const savedPlaylist = await createPlaylist({
      firebaseUid,
      topic,
      videos: videos.map((v: any, index: number) => ({
        videoId: v.videoId,
        title: v.title || '',
        channelTitle: v.channelTitle || '',
        thumbnail: v.thumbnail || '',
        durationSec: v.durationSec || 0,
        order: index
      })),
      durationSec: Math.floor(durationMs / 1000),
      queryText,
      intentJSON: intent,
      source: 'wizard'
    });
    
    // Emit telemetry
    console.log('history_saved', { id: savedPlaylist.playlistId, queryText });
    
    return res.status(200).json({
      id: savedPlaylist.playlistId,
      shareToken: savedPlaylist.shareToken
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
router.get('/history', requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }
  
  const { limit, since, q } = parsed.data;
  
  try {
    const firebaseUid = req.headers['x-user-id'] as string || 'demo-user';
    
    const playlists = await getUserPlaylists(firebaseUid, { limit, skip: 0 });
    
    // Transform to match old format
    const sessions = playlists.map(p => ({
      id: p.playlistId,
      createdAt: p.createdAt.toISOString(),
      queryText: p.queryText || p.topic,
      shareToken: p.shareToken
    }));
    
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
router.get('/history/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const playlist = await getPlaylistById(id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Emit telemetry
    console.log('history_viewed', { id: playlist.playlistId, queryText: playlist.queryText });
    
    // Transform to match old format
    return res.status(200).json({
      id: playlist.playlistId,
      createdAt: playlist.createdAt.toISOString(),
      queryText: playlist.queryText || playlist.topic,
      intent: playlist.intentJSON,
      playlist: {
        topic: playlist.topic,
        items: playlist.videos
      },
      shareToken: playlist.shareToken
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
router.get('/share/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const playlist = await getPlaylistByShareToken(token);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Share not found' });
    }
    
    return res.status(200).json({
      queryText: playlist.queryText || playlist.topic,
      playlist: {
        topic: playlist.topic,
        items: playlist.videos
      }
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
router.post('/commute-history', requireAuth, async (req, res) => {
  const parsed = commuteSessionSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid commute session data' });
  }
  
  const { userId, session } = parsed.data;
  
  try {
    const savedSession = await saveCommuteSessionDB({
      firebaseUid: userId,
      topics: session.topics,
      durationSec: session.durationSec,
      videosWatched: session.videosWatched.map(v => ({
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channelTitle,
        thumbnail: v.thumbnail,
        durationSec: v.durationSec
      }))
    });
    
    console.log('commute_saved', { userId, commuteId: savedSession.sessionId });
    
    return res.status(200).json({ success: true, id: savedSession.sessionId });
  } catch (error) {
    console.error('Error saving commute:', error);
    return res.status(500).json({ error: 'Failed to save commute' });
  }
});

/**
 * GET /api/commute-history/:userId
 * Get commute history for a user
 */
router.get('/commute-history/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const history = await getUserCommuteHistory(userId, { limit: 50 });
    
    // Transform to match old format
    const formattedHistory = history.map(s => ({
      id: s.sessionId,
      timestamp: s.timestamp.toISOString(),
      topics: s.topics,
      durationSec: s.durationSec,
      videosWatched: s.videosWatched
    }));
    
    return res.status(200).json({ history: formattedHistory });
  } catch (error) {
    console.error('Error getting commute history:', error);
    return res.status(500).json({ error: 'Failed to get commute history' });
  }
});

/**
 * GET /api/commute-history/:userId/:commuteId
 * Get a specific commute session
 */
router.get('/commute-history/:userId/:commuteId', requireAuth, async (req, res) => {
  const { userId, commuteId } = req.params;
  
  try {
    const session = await getCommuteSessionDB(commuteId);
    
    if (!session || session.firebaseUid !== userId) {
      return res.status(404).json({ error: 'Commute not found' });
    }
    
    // Transform to match old format
    return res.status(200).json({
      id: session.sessionId,
      timestamp: session.timestamp.toISOString(),
      topics: session.topics,
      durationSec: session.durationSec,
      videosWatched: session.videosWatched
    });
  } catch (error) {
    console.error('Error getting commute:', error);
    return res.status(500).json({ error: 'Failed to get commute' });
  }
});

export default router;
