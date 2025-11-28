// HW9 CTR-C4: Badges & Accomplishments Service
// This module computes achievement stats and badges from both watch history and commute history data.

import { getUserHistory, type CommuteSession } from '../history/commuteHistory.js';
import { listWatched, type WatchedEntry } from '../history/watchHistory.js';

const __filename = import.meta.url;
const __dirname = new URL('.', import.meta.url).pathname;

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
  type: 'minutes' | 'streak' | 'commute' | 'videos';
}

const BADGE_CATALOG: BadgeDefinition[] = [
  // Video watch badges (from watch history)
  {
    id: 'video-1',
    title: 'First Video',
    description: 'Watch your first video',
    icon: '🎬',
    threshold: 1,
    type: 'videos'
  },
  {
    id: 'video-5',
    title: '5 Videos',
    description: 'Watch 5 videos',
    icon: '🎥',
    threshold: 5,
    type: 'videos'
  },
  {
    id: 'video-10',
    title: '10 Videos',
    description: 'Watch 10 videos',
    icon: '📹',
    threshold: 10,
    type: 'videos'
  },
  {
    id: 'video-25',
    title: '25 Videos',
    description: 'Watch 25 videos',
    icon: '🌟',
    threshold: 25,
    type: 'videos'
  },
  // Commute completion badges
  {
    id: 'commute-1',
    title: 'First Commute',
    description: 'Complete your first commute',
    icon: '🚗',
    threshold: 1,
    type: 'commute'
  },
  {
    id: 'commute-5',
    title: '5 Commutes',
    description: 'Complete 5 commutes',
    icon: '🎵',
    threshold: 5,
    type: 'commute'
  },
  {
    id: 'commute-10',
    title: '10 Commutes',
    description: 'Complete 10 commutes',
    icon: '🔟',
    threshold: 10,
    type: 'commute'
  },
  {
    id: 'commute-25',
    title: '25 Commutes',
    description: 'Complete 25 commutes',
    icon: '⭐',
    threshold: 25,
    type: 'commute'
  },
  // Watch time badges (combined from both sources)
  {
    id: 'minutes-30',
    title: '30 Minutes Watched',
    description: 'Watch 30 minutes of content',
    icon: '⏱️',
    threshold: 30,
    type: 'minutes'
  },
  {
    id: 'minutes-100',
    title: '100 Minutes Watched',
    description: 'Watch 100 minutes of content',
    icon: '🎧',
    threshold: 100,
    type: 'minutes'
  },
  {
    id: 'minutes-300',
    title: '5 Hours Watched',
    description: 'Watch 300 minutes of content',
    icon: '📚',
    threshold: 300,
    type: 'minutes'
  },
  // Streak badges (from commute history)
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Commute for 3 consecutive days',
    icon: '🔥',
    threshold: 3,
    type: 'streak'
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    description: 'Commute for 7 consecutive days',
    icon: '⚡',
    threshold: 7,
    type: 'streak'
  }
];

// Helper: Calculate streak from commute sessions
function calculateStreakFromCommutes(commutes: CommuteSession[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (commutes.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Group commutes by calendar day (YYYY-MM-DD)
  const daysWithCommutes = new Set<string>();
  for (const commute of commutes) {
    const date = new Date(commute.timestamp);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    if (dayKey) {
      daysWithCommutes.add(dayKey);
    }
  }

  // Calculate current streak (consecutive days backwards from today)
  let currentStreak = 0;
  let offset = 0;

  while (true) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - offset);
    const checkDayKey = checkDate.toISOString().split('T')[0];

    if (checkDayKey && daysWithCommutes.has(checkDayKey)) {
      currentStreak++;
      offset++;
    } else {
      // Allow one skip for current streak (if today has no commute, start checking from yesterday)
      if (offset === 0) {
        offset++;
        continue;
      }
      break;
    }

    // Safety: max 365 days
    if (offset > 365) break;
  }

  // Calculate longest streak by checking all possible consecutive sequences
  const sortedDays = Array.from(daysWithCommutes).sort();
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = sortedDays[i - 1];
    const currDay = sortedDays[i];
    if (!prevDay || !currDay) continue;
    
    const prevDate = new Date(prevDay);
    const currDate = new Date(currDay);
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
 * Compute achievements from both watch history and commute history data
 * @param history - Array of CommuteSession objects
 * @param watchedVideos - Array of WatchedEntry objects
 * @returns AchievementsPayload with summary stats and badges
 */
export function computeAchievementsFromHistory(
  history: CommuteSession[],
  watchedVideos: WatchedEntry[] = []
): AchievementsPayload {
  // Compute summary stats from both sources
  const commuteMinutes = Math.floor(
    history.reduce((sum, c) => sum + (c.durationSec || 0), 0) / 60
  );
  const watchMinutes = Math.floor(
    watchedVideos.reduce((sum, v) => sum + (v.durationSec || 0), 0) / 60
  );
  const totalMinutes = commuteMinutes + watchMinutes;
  const totalSessions = history.length;
  const totalVideos = watchedVideos.length;

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreakFromCommutes(history);

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
      case 'commute':
        progressCurrent = totalSessions;
        earned = totalSessions >= def.threshold;
        break;
      case 'videos':
        progressCurrent = totalVideos;
        earned = totalVideos >= def.threshold;
        break;
      case 'streak':
        progressCurrent = longestStreak; // Show best streak for progress
        earned = longestStreak >= def.threshold;
        break;
    }

    // Find earnedAt by finding when threshold was crossed
    if (earned) {
      if (def.type === 'minutes') {
        // Combine both sources, sorted by time
        const allTimedEvents: Array<{ timestamp: string; minutes: number }> = [
          ...history.map(c => ({
            timestamp: c.timestamp,
            minutes: Math.floor(c.durationSec / 60),
          })),
          ...watchedVideos.map(v => ({
            timestamp: v.completedAt || v.createdAt,
            minutes: Math.floor(v.durationSec / 60),
          })),
        ].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let accumulatedMinutes = 0;
        for (const event of allTimedEvents) {
          accumulatedMinutes += event.minutes;
          if (accumulatedMinutes >= def.threshold) {
            earnedAt = event.timestamp;
            break;
          }
        }
      } else if (def.type === 'commute' && history.length > 0) {
        const sortedHistory = [...history].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        if (sortedHistory.length >= def.threshold) {
          earnedAt = sortedHistory[def.threshold - 1].timestamp;
        }
      } else if (def.type === 'videos' && watchedVideos.length > 0) {
        const sortedVideos = [...watchedVideos].sort(
          (a, b) =>
            new Date(a.completedAt || a.createdAt).getTime() -
            new Date(b.completedAt || b.createdAt).getTime()
        );
        if (sortedVideos.length >= def.threshold) {
          const v = sortedVideos[def.threshold - 1];
          earnedAt = v.completedAt || v.createdAt;
        }
      } else if (def.type === 'streak' && history.length > 0) {
        const sortedHistory = [...history].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        earnedAt = sortedHistory[sortedHistory.length - 1]?.timestamp;
      }
    }


    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      earned,
      ...(earnedAt ? { earnedAt } : {}),
      progressCurrent,
      progressTarget
    };
  });

  return {
    summary,
    badges
  };
}

/**
 * HW9 CTR-C4: Compute achievements summary and badges from user's watch history and commute history
 * @param userId - User ID to fetch history for
 * @returns AchievementsPayload with summary stats and badges
 */
export async function computeAchievements(userId: string = 'demoUser'): Promise<AchievementsPayload> {
  console.log('🏆 Computing achievements for userId:', userId);
  
  // Load commute history for the user
  const history = getUserHistory(userId);
  console.log('📊 Commute history loaded:', history.length, 'commutes');
  
  // Load watch history for the user (all entries, no pagination)
  const watchedData = listWatched({ userId, limit: 1000 });
  const watchedVideos = watchedData.items;
  console.log('📺 Watch history loaded:', watchedVideos.length, 'videos');
  
  // Compute achievements from both sources
  const result = computeAchievementsFromHistory(history, watchedVideos);
  console.log('✅ Achievements computed:', {
    totalMinutes: result.summary.totalMinutes,
    totalSessions: result.summary.totalSessions,
    earnedBadges: result.badges.filter(b => b.earned).length
  });
  
  return result;
}
