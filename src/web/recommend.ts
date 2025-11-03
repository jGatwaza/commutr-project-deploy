/**
 * POST /api/recommend endpoint
 * Returns video recommendations based on duration fit and de-duplication
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { selectVideos } from '../lib/recommender/durationFit.js';
import { getCandidateVideos } from '../lib/recommender/data.js';

const router = Router();

/**
 * Request body schema for POST /api/recommend
 */
const recommendRequestSchema = z.object({
  remainingSeconds: z.number().positive('remainingSeconds must be greater than 0'),
  excludeIds: z.array(z.string()).optional(),
  topic: z.string().optional(),
});

/**
 * POST /api/recommend
 * 
 * Recommends videos that fit within the specified duration
 * 
 * Request body:
 * - remainingSeconds: number (required, > 0) - Target duration in seconds
 * - excludeIds: string[] (optional) - Video IDs to exclude
 * - topic: string (optional) - Topic filter (case-insensitive)
 * 
 * Response (200):
 * - items: Video[] - Selected videos
 * - totalSec: number - Total duration of selected videos
 * - strategy: string - Selection strategy used
 * 
 * Error responses:
 * - 400: Invalid request body
 * - 405: Method not allowed (non-POST)
 */
router.post('/recommend', (req: Request, res: Response) => {
  // Validate request body
  const parsed = recommendRequestSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const { remainingSeconds, excludeIds, topic } = parsed.data;

  // Fetch candidate videos
  const candidates = getCandidateVideos(topic ? { topic } : {});

  // Select videos using duration-fit algorithm
  const result = selectVideos({
    candidates,
    remainingSeconds,
    ...(excludeIds && { excludeIds }),
    ...(topic && { topic }),
  });

  // Return recommendation
  return res.status(200).json({
    items: result.items,
    totalSec: result.totalSec,
    strategy: result.strategy,
  });
});

/**
 * Handle non-POST requests to /api/recommend
 */
router.all('/recommend', (req: Request, res: Response) => {
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only POST requests are supported',
  });
});

export default router;
