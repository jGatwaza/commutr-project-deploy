// HW9 CTR-C4: Achievements API Router
// Provides endpoints for fetching user achievements and badges

import { Router } from 'express';
import { computeAchievements } from '../db/services/achievementService.js';

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
 * GET /api/achievements?userId=xxx
 * Returns user's achievement summary and badges
 */
router.get('/achievements', requireAuth, async (req, res) => {
  try {
    // Get userId from query params (defaults to 'demoUser' if not provided)
    const userId = (req.query.userId as string) || 'demoUser';
    
    // Call the service to compute achievements for this user
    const result = await computeAchievements(userId);
    
    // Transform badges to match frontend format (badgeId -> id, earnedAt Date -> ISO string)
    const payload = {
      summary: result.summary,
      badges: result.badges.map(badge => ({
        id: badge.badgeId,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        earned: badge.earned,
        ...(badge.earnedAt && { earnedAt: badge.earnedAt.toISOString() }),
        progressCurrent: badge.progressCurrent,
        progressTarget: badge.progressTarget
      }))
    };
    
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * GET /api/achievements/ping
 * Health check endpoint
 */
router.get('/achievements/ping', (req, res) => {
  return res.status(200).json({ ok: true });
});

export default router;
