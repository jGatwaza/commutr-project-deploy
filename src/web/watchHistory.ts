import { Router } from 'express';
import { z } from 'zod';
import { upsertWatched, listWatched } from '../history/watchHistory.js';

const router = Router();

// Auth middleware - requires Authorization: Bearer TEST
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer TEST') {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

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
router.post('/history/watch', requireAuth, (req, res) => {
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
    const entry = upsertWatched(parsed.data);
    return res.status(201).json(entry);
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
router.get('/history/watch', requireAuth, (req, res) => {
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
    const result = listWatched({ userId, limit, cursor, q });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error listing watched entries:', error);
    return res.status(500).json({ error: 'Failed to list watched entries' });
  }
});

export default router;