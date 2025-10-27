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
  // Group sessions by calendar day (YYYY-MM-DD in local time)
  const daysWithSessions = new Set<string>();
  for (const session of sessions) {
    const date = new Date(session.ts);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    if (dayKey) {
      daysWithSessions.add(dayKey);
    }
  }

  // Sort days descending (most recent first)
  const sortedDays = Array.from(daysWithSessions).sort().reverse();

  // Count streak from today backwards
  const today = new Date().toISOString().split('T')[0];
  let currentStreakDays = 0;

  for (let i = 0; i < sortedDays.length; i++) {
    const expectedDay = new Date();
    expectedDay.setDate(expectedDay.getDate() - i);
    const expectedDayKey = expectedDay.toISOString().split('T')[0];
    const currentDay = sortedDays[i];

    if (currentDay && currentDay === expectedDayKey) {
      currentStreakDays++;
    } else {
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
