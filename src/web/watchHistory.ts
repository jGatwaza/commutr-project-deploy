import { Router } from 'express';
import { z } from 'zod';
import { upsertWatchHistory, getWatchHistory, getWatchAnalytics } from '../db/services/watchHistoryService.js';
import { requireAuth } from '../auth/middleware.js';

const router = Router();

/**
 * Validation schema for POST /api/history/watch
 * Records a watched video event.
 */
const watchedEntrySchema = z.object({
  userId: z.string().min(1, 'userId must be non-empty'),
  videoId: z.string().min(1, 'videoId must be non-empty'),
  title: z.string().min(1, 'title must be non-empty'),
  durationSec: z.number().int().positive('durationSec must be a positive integer'),
  topicTags: z.array(z.string()).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  progressPct: z.number().min(0).max(100).optional(),
  source: z.string().optional()
});

/**
 * Validation schema for GET /api/history/watch query params
 */
const listWatchedSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  cursor: z.string().optional(),
  q: z.string().optional()
});

/**
 * POST /api/history/watch
 * Create or update a watched video record.
 * 
 * TODO(auth): Later enforce that userId matches the authenticated user's ID.
 * For now, we accept any userId from the request body.
 */
router.post('/history/watch', requireAuth, async (req, res) => {
  const parsed = watchedEntrySchema.safeParse(req.body);
  
  if (!parsed.success) {
    // Return validation errors with field details
    const issues = parsed.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return res.status(400).json({ error: 'Invalid input', issues });
  }
  
  try {
    const data = parsed.data;
    
    const entry = await upsertWatchHistory({
      firebaseUid: data.userId,
      videoId: data.videoId,
      title: data.title,
      durationSec: data.durationSec,
      ...(data.topicTags && { topicTags: data.topicTags }),
      ...(data.startedAt && { startedAt: new Date(data.startedAt) }),
      ...(data.completedAt && { completedAt: new Date(data.completedAt) }),
      progressPct: data.progressPct || 0,
      ...(data.source && { source: data.source })
    });
    
    // Transform to match expected format
    return res.status(201).json({
      id: entry.watchId,
      userId: entry.firebaseUid,
      videoId: entry.videoId,
      title: entry.title,
      durationSec: entry.durationSec,
      topicTags: entry.topicTags,
      startedAt: entry.startedAt?.toISOString(),
      completedAt: entry.completedAt?.toISOString(),
      progressPct: entry.progressPct,
      source: entry.source,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error upserting watched entry:', error);
    return res.status(500).json({ error: 'Failed to save watched entry' });
  }
});

/**
 * GET /api/history/watch
 * List watched videos for a user with pagination and search.
 * 
 * Query params:
 * - userId: required, filter to specific user
 * - limit: optional, 1-100 (default 20)
 * - cursor: optional, opaque token for pagination
 * - q: optional, case-insensitive title search
 */
router.get('/history/watch', requireAuth, async (req, res) => {
  const parsed = listWatchedSchema.safeParse(req.query);
  
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return res.status(400).json({ error: 'Invalid query parameters', issues });
  }
  
  const { userId, limit, cursor, q } = parsed.data;
  
  // Validate limit range
  if (limit < 1 || limit > 100) {
    return res.status(400).json({ 
      error: 'Invalid query parameters',
      issues: [{ field: 'limit', message: 'limit must be between 1 and 100' }]
    });
  }
  
  try {
    const entries = await getWatchHistory(userId, { limit, completedOnly: false });
    
    // Transform to match expected format
    const items = entries.map(e => ({
      id: e.watchId,
      userId: e.firebaseUid,
      videoId: e.videoId,
      title: e.title,
      durationSec: e.durationSec,
      topicTags: e.topicTags,
      startedAt: e.startedAt?.toISOString(),
      completedAt: e.completedAt?.toISOString(),
      progressPct: e.progressPct,
      source: e.source,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    }));
    
    return res.status(200).json({ items });
  } catch (error) {
    console.error('Error listing watched entries:', error);
    return res.status(500).json({ error: 'Failed to list watched entries' });
  }
});

/**
 * Validation schema for GET /api/history/analytics query params
 */
const analyticsSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  timeframe: z.enum(['week', 'month', 'all']).optional().default('month')
});

/**
 * GET /api/history/analytics
 * Get aggregated analytics for a user's watch history.
 * 
 * Query params:
 * - userId: required, filter to specific user
 * - timeframe: optional, 'week' | 'month' | 'all' (default 'month')
 */
router.get('/history/analytics', requireAuth, async (req, res) => {
  const parsed = analyticsSchema.safeParse(req.query);
  
  if (!parsed.success) {
    const issues = parsed.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return res.status(400).json({ error: 'Invalid query parameters', issues });
  }
  
  const { userId, timeframe } = parsed.data;
  
  try {
    const analytics = await getWatchAnalytics(userId, timeframe);
    return res.status(200).json(analytics);
  } catch (error: any) {
    console.error('Error getting analytics:', error);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;