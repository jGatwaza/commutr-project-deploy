import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// In-memory session storage (easy to swap out later)
interface Session {
  ts: string; // ISO timestamp
  topic: string;
  minutes: number;
}

let sessions: Session[] = [];

// Helper function to reset sessions (useful for testing)
export function resetSessions() {
  sessions = [];
}

// Helper function to get sessions (useful for testing)
export function getSessions() {
  return sessions;
}

// Auth middleware - all routes require Authorization: Bearer TEST
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer TEST') {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Validation schema for POST /api/session
const sessionSchema = z.object({
  topic: z.string().min(1, 'topic must be non-empty'),
  minutes: z.number().int().min(1).max(180)
});

// Helper: Calculate streak from sessions array
// Pure function that correctly counts consecutive calendar days up to today
export function calculateStreak(sessions: Session[]): {
  totalSessions: number;
  totalMinutes: number;
  currentStreakDays: number;
  lastSessionISO: string | null;
} {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      currentStreakDays: 0,
      lastSessionISO: null
    };
  }

  // Total stats
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const lastSessionISO = sessions[sessions.length - 1]?.ts || null;

  // Streak calculation: count consecutive days up to today
  // Step 1: Group sessions by calendar day (YYYY-MM-DD)
  const daysWithSessions = new Set<string>();
  for (const session of sessions) {
    const date = new Date(session.ts);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    if (dayKey) {
      daysWithSessions.add(dayKey);
    }
  }

  // Step 2: Count consecutive days backwards from today
  // Start checking from today (offset = 0), then yesterday (offset = 1), etc.
  let currentStreakDays = 0;
  let offset = 0;

  while (true) {
    // Calculate the expected day (today - offset days)
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - offset);
    const checkDayKey = checkDate.toISOString().split('T')[0];

    // Check if this day has at least one session
    if (checkDayKey && daysWithSessions.has(checkDayKey)) {
      currentStreakDays++;
      offset++;
    } else {
      // Gap found - streak ends
      break;
    }

    // Safety: don't loop forever (max reasonable streak is 365 days)
    if (offset > 365) {
      break;
    }
  }

  return {
    totalSessions,
    totalMinutes,
    currentStreakDays,
    lastSessionISO
  };
}

// POST /api/session
router.post('/session', requireAuth, (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return res.status(400).json({ error: firstError?.message || 'Invalid input' });
  }

  const { topic, minutes } = parsed.data;
  
  // Store session
  sessions.push({
    ts: new Date().toISOString(),
    topic,
    minutes
  });

  return res.status(200).json({ ok: true });
});

// GET /api/streak
router.get('/streak', requireAuth, (req, res) => {
  const stats = calculateStreak(sessions);
  return res.status(200).json(stats);
});

export default router;
