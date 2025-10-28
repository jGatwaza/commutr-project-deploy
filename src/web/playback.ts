import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

/**
 * Playback Proxy Router
 * Provides deep link generation and completion tracking for video packs
 */

// ============================================================================
// Types
// ============================================================================

type PackData = {
  items: Array<{ videoId: string; durationSec: number }>;
};

type User = {
  userId: string;
};

// Extend Express Request to include user
interface AuthRequest extends Request {
  user?: User;
}

// ============================================================================
// In-Memory Stores (for testing)
// ============================================================================

let packsRepo = new Map<string, PackData>();
let isServiceDown = false;
let completionSet = new Set<string>(); // Key: packId:videoId:occurredAt

// Rate limiting: Map<userId, {count: number, resetAt: number}>
const deeplinkRateLimits = new Map<string, { count: number; resetAt: number }>();
const completeRateLimits = new Map<string, { count: number; resetAt: number }>();

// ============================================================================
// Test Helpers (exported for test injection)
// ============================================================================

export function __setPacksRepo(map: Map<string, PackData>): void {
  packsRepo = map;
}

export function __simulateDown(down: boolean): void {
  isServiceDown = down;
}

export function __resetRate(): void {
  deeplinkRateLimits.clear();
  completeRateLimits.clear();
}

export function __resetDone(): void {
  completionSet.clear();
}

// ============================================================================
// Validation Schemas
// ============================================================================

const deeplinkQuerySchema = z.object({
  packId: z.string().min(1),
  videoId: z.string().min(1),
  startSec: z.coerce.number().int().min(0).default(0),
  format: z.enum(['json', 'redirect']).optional(),
});

const completeBodySchema = z.object({
  packId: z.string().min(1),
  videoId: z.string().min(1),
  watchedSec: z.number().int().min(0),
  durationSec: z.number().int().min(1),
  occurredAt: z.string().datetime(),
}).strict();

// ============================================================================
// Error Response Helper
// ============================================================================

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {}
): void {
  res.status(status).json({
    error: { code, message, details },
  });
}

// ============================================================================
// Middleware: Auth Check
// ============================================================================

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }
  next();
}

// ============================================================================
// Middleware: Service Health Check
// ============================================================================

function checkServiceHealth(req: Request, res: Response, next: NextFunction): void {
  if (isServiceDown) {
    sendError(res, 503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable');
    return;
  }
  next();
}

// ============================================================================
// Rate Limiting Helper
// ============================================================================

function checkRateLimit(
  userId: string,
  limits: Map<string, { count: number; resetAt: number }>,
  maxRequests: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = limits.get(userId);

  if (!userLimit || now >= userLimit.resetAt) {
    // Reset or initialize
    limits.set(userId, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return { allowed: true };
  }

  if (userLimit.count >= maxRequests) {
    const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
}

// ============================================================================
// GET /v1/playback/deeplink
// ============================================================================

const router = express.Router();

router.get(
  '/v1/playback/deeplink',
  requireAuth,
  checkServiceHealth,
  (req: AuthRequest, res: Response) => {
    // Rate limit: 20/min per user
    const userId = req.user!.userId;
    const rateLimitResult = checkRateLimit(userId, deeplinkRateLimits, 20);
    
    if (!rateLimitResult.allowed) {
      res.set('Retry-After', String(rateLimitResult.retryAfter));
      sendError(
        res,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        { retryAfter: rateLimitResult.retryAfter }
      );
      return;
    }

    // Validate query params
    const parsed = deeplinkQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(
        res,
        400,
        'INVALID_PARAMS',
        'Invalid query parameters',
        { errors: parsed.error.flatten() }
      );
      return;
    }

    const { packId, videoId, startSec, format } = parsed.data;

    // Check if pack exists
    const pack = packsRepo.get(packId);
    if (!pack) {
      sendError(res, 404, 'PACK_NOT_FOUND', 'Pack not found', { packId });
      return;
    }

    // Verify videoId is in pack
    const videoInPack = pack.items.some((item) => item.videoId === videoId);
    if (!videoInPack) {
      sendError(
        res,
        409,
        'VIDEO_NOT_IN_PACK',
        'Video not found in pack',
        { packId, videoId }
      );
      return;
    }

    // Compose YouTube URL
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${startSec}s`;

    // Determine response format
    // Only return JSON if explicitly requested via format param or Accept header
    const acceptHeader = req.get('Accept') || '';
    const explicitlyAcceptsJson = acceptHeader.includes('application/json');
    const shouldReturnJson = format === 'json' || explicitlyAcceptsJson;

    if (shouldReturnJson) {
      res.status(200).json({ url, version: 'v1' });
    } else {
      res.redirect(302, url);
    }
  }
);

// ============================================================================
// POST /v1/playback/complete
// ============================================================================

router.post(
  '/v1/playback/complete',
  requireAuth,
  checkServiceHealth,
  express.json(),
  (req: AuthRequest, res: Response) => {
    // Rate limit: 60/min per user
    const userId = req.user!.userId;
    const rateLimitResult = checkRateLimit(userId, completeRateLimits, 60);
    
    if (!rateLimitResult.allowed) {
      res.set('Retry-After', '60');
      sendError(
        res,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        { retryAfter: rateLimitResult.retryAfter }
      );
      return;
    }

    // Validate body
    const parsed = completeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        'INVALID_BODY',
        'Invalid request body',
        { errors: parsed.error.flatten() }
      );
      return;
    }

    const { packId, videoId, occurredAt } = parsed.data;

    // Check idempotency: (packId, videoId, occurredAt)
    const idempotencyKey = `${packId}:${videoId}:${occurredAt}`;
    if (completionSet.has(idempotencyKey)) {
      sendError(
        res,
        409,
        'DUPLICATE_COMPLETION',
        'Completion already recorded',
        { packId, videoId, occurredAt }
      );
      return;
    }

    // Record completion
    completionSet.add(idempotencyKey);

    // Respond with 202 Accepted
    res.status(202).json({ accepted: true, version: 'v1' });
  }
);

// ============================================================================
// Export Router
// ============================================================================

export default router;
