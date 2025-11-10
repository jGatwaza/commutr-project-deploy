// HW9 CTR-C4: Badges & Accomplishments Service
// This module computes achievement stats and badges by reusing existing data
// from the history store and streak service.

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { SessionRec } from '../history/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions for HW9 CTR-C4
export type AchievementSummary = {
  totalMinutes: number;
  totalSessions: number;
  longestStreak: number;
  currentStreak: number;
};

export type Badge = {
  id: string;               // e.g. "minutes-100"
  title: string;            // e.g. "100 Minutes Listened"
  description: string;
  icon: string;             // emoji or short code, e.g. "⏱️"
  earned: boolean;
  earnedAt?: string;        // ISO date when first earned
  progressCurrent?: number; // optional current progress
  progressTarget?: number;  // optional target threshold
};

export type AchievementsPayload = {
  summary: AchievementSummary;
  badges: Badge[];
};

// Badge catalog - defines all possible badges and their thresholds
interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  type: 'minutes' | 'streak' | 'session' | 'share';
}

const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'minutes-30',
    title: '30 Minutes Listened',
    description: 'Complete 30 minutes of learning',
    icon: '⏱️',
    threshold: 30,
    type: 'minutes'
  },
  {
    id: 'minutes-100',
    title: '100 Minutes Listened',
    description: 'Complete 100 minutes of learning',
    icon: '🎧',
    threshold: 100,
    type: 'minutes'
  },
  {
    id: 'minutes-300',
    title: '5 Hours Learned',
    description: 'Complete 300 minutes of learning',
    icon: '📚',
    threshold: 300,
    type: 'minutes'
  },
  {
    id: 'session-1',
    title: 'First Playlist',
    description: 'Create your first learning playlist',
    icon: '🎵',
    threshold: 1,
    type: 'session'
  },
  {
    id: 'session-10',
    title: '10 Sessions',
    description: 'Complete 10 learning sessions',
    icon: '🔟',
    threshold: 10,
    type: 'session'
  },
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Learn for 3 consecutive days',
    icon: '🔥',
    threshold: 3,
    type: 'streak'
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    description: 'Learn for 7 consecutive days',
    icon: '⚡',
    threshold: 7,
    type: 'streak'
  },
  {
    id: 'share-1',
    title: 'First Share',
    description: 'Share your first playlist',
    icon: '🤝',
    threshold: 1,
    type: 'share'
  }
];

// Helper: Load sessions from history store
function loadHistorySessions(): SessionRec[] {
  const dataDir = join(__dirname, '../../data');
  const sessionsFile = join(dataDir, 'sessions.json');
  
  if (!existsSync(sessionsFile)) {
    return [];
  }
  
  try {
    const data = readFileSync(sessionsFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading history sessions:', error);
    return [];
  }
}

// Helper: Calculate streak from sessions (reusing logic from streak service)
function calculateStreakFromSessions(sessions: SessionRec[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Group sessions by calendar day (YYYY-MM-DD)
  const daysWithSessions = new Set<string>();
  for (const session of sessions) {
    const date = new Date(session.createdAt);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    if (dayKey) {
      daysWithSessions.add(dayKey);
    }
  }

  // Calculate current streak (consecutive days backwards from today)
  let currentStreak = 0;
  let offset = 0;

  while (true) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - offset);
    const checkDayKey = checkDate.toISOString().split('T')[0];

    if (checkDayKey && daysWithSessions.has(checkDayKey)) {
      currentStreak++;
      offset++;
    } else {
      break;
    }

    // Safety: max 365 days
    if (offset > 365) break;
  }

  // Calculate longest streak by checking all possible consecutive sequences
  const sortedDays = Array.from(daysWithSessions).sort();
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1]);
    const currDate = new Date(sortedDays[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

/**
 * HW9 CTR-C4: Compute achievements summary and badges
 * @param userId - Optional user ID (for future multi-user support)
 * @returns AchievementsPayload with summary stats and badges
 */
export async function computeAchievements(userId?: string): Promise<AchievementsPayload> {
  // Load sessions from history store
  const sessions = loadHistorySessions();

  // Compute summary stats
  const totalMinutes = Math.floor(
    sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0) / 60_000
  );
  const totalSessions = sessions.length;

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreakFromSessions(sessions);

  // Count sessions with share tokens
  const totalShares = sessions.filter(s => s.shareToken).length;

  // Build summary
  const summary: AchievementSummary = {
    totalMinutes,
    totalSessions,
    longestStreak,
    currentStreak
  };

  // Compute badges
  const badges: Badge[] = BADGE_CATALOG.map(def => {
    let earned = false;
    let progressCurrent = 0;
    let progressTarget = def.threshold;
    let earnedAt: string | undefined;

    switch (def.type) {
      case 'minutes':
        progressCurrent = totalMinutes;
        earned = totalMinutes >= def.threshold;
        break;
      case 'session':
        progressCurrent = totalSessions;
        earned = totalSessions >= def.threshold;
        break;
      case 'streak':
        progressCurrent = longestStreak; // Show best streak for progress
        earned = longestStreak >= def.threshold;
        break;
      case 'share':
        progressCurrent = totalShares;
        earned = totalShares >= def.threshold;
        break;
    }

    // Find earnedAt by finding the first session where threshold was crossed
    if (earned && sessions.length > 0) {
      // For simplicity, use the timestamp of the session that crossed the threshold
      if (def.type === 'minutes') {
        let accumulatedMinutes = 0;
        for (const session of sessions) {
          accumulatedMinutes += Math.floor((session.durationMs || 0) / 60_000);
          if (accumulatedMinutes >= def.threshold) {
            earnedAt = session.createdAt;
            break;
          }
        }
      } else if (def.type === 'session') {
        // Earned when we reached that many sessions
        if (sessions.length >= def.threshold) {
          earnedAt = sessions[def.threshold - 1].createdAt;
        }
      } else if (def.type === 'share') {
        const sharedSessions = sessions.filter(s => s.shareToken);
        if (sharedSessions.length >= def.threshold) {
          earnedAt = sharedSessions[def.threshold - 1].createdAt;
        }
      } else if (def.type === 'streak') {
        // For streaks, use the most recent session timestamp
        earnedAt = sessions[sessions.length - 1]?.createdAt;
      }
    }

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      earned,
      earnedAt,
      progressCurrent,
      progressTarget
    };
  });

  return {
    summary,
    badges
  };
}
