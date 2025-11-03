/**
 * Data utility for fetching candidate videos
 */

import type { Video } from './durationFit.js';

/**
 * Mock video database
 * In production, this would fetch from a real database or API
 */
const mockVideos: Video[] = [
  {
    id: 'vid1',
    url: 'https://youtube.com/watch?v=abc123',
    title: 'Introduction to TypeScript',
    durationSec: 300,
    topicTags: ['typescript', 'programming', 'tutorial'],
    creatorId: 'creator1',
    publishedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'vid2',
    url: 'https://youtube.com/watch?v=def456',
    title: 'Advanced React Patterns',
    durationSec: 600,
    topicTags: ['react', 'javascript', 'programming'],
    creatorId: 'creator2',
    publishedAt: '2024-02-20T14:30:00Z',
  },
  {
    id: 'vid3',
    url: 'https://youtube.com/watch?v=ghi789',
    title: 'Node.js Best Practices',
    durationSec: 450,
    topicTags: ['nodejs', 'javascript', 'backend'],
    creatorId: 'creator1',
    publishedAt: '2024-03-10T09:15:00Z',
  },
  {
    id: 'vid4',
    url: 'https://youtube.com/watch?v=jkl012',
    title: 'CSS Grid Layout',
    durationSec: 200,
    topicTags: ['css', 'frontend', 'design'],
    creatorId: 'creator3',
    publishedAt: '2024-01-05T16:45:00Z',
  },
  {
    id: 'vid5',
    url: 'https://youtube.com/watch?v=mno345',
    title: 'Docker Fundamentals',
    durationSec: 500,
    topicTags: ['docker', 'devops', 'containers'],
    creatorId: 'creator2',
    publishedAt: '2024-02-28T11:20:00Z',
  },
  {
    id: 'vid6',
    url: 'https://youtube.com/watch?v=pqr678',
    title: 'Quick CSS Tips',
    durationSec: 150,
    topicTags: ['css', 'frontend', 'tips'],
    creatorId: 'creator4',
    publishedAt: '2024-03-15T13:00:00Z',
  },
  {
    id: 'vid7',
    url: 'https://youtube.com/watch?v=stu901',
    title: 'React Hooks Deep Dive',
    durationSec: 700,
    topicTags: ['react', 'javascript', 'hooks'],
    creatorId: 'creator5',
    publishedAt: '2024-03-20T10:30:00Z',
  },
  {
    id: 'vid8',
    url: 'https://youtube.com/watch?v=vwx234',
    title: 'TypeScript Generics',
    durationSec: 400,
    topicTags: ['typescript', 'programming', 'advanced'],
    creatorId: 'creator1',
    publishedAt: '2024-03-25T15:00:00Z',
  },
  {
    id: 'vid9',
    url: 'https://youtube.com/watch?v=yza567',
    title: 'Python for Beginners',
    durationSec: 550,
    topicTags: ['python', 'programming', 'tutorial'],
    creatorId: 'creator6',
    publishedAt: '2024-03-01T12:00:00Z',
  },
  {
    id: 'vid10',
    url: 'https://youtube.com/watch?v=bcd890',
    title: 'Database Design Principles',
    durationSec: 480,
    topicTags: ['database', 'backend', 'sql'],
    creatorId: 'creator7',
    publishedAt: '2024-02-15T09:30:00Z',
  },
];

export interface GetCandidateVideosOptions {
  /** Optional topic filter */
  topic?: string;
}

/**
 * Fetches candidate videos for recommendation
 * 
 * @param options - Fetch options
 * @returns Array of candidate videos
 */
export function getCandidateVideos(
  options: GetCandidateVideosOptions = {}
): Video[] {
  // In production, this would query a database or external API
  // For now, return the mock data
  return mockVideos;
}
