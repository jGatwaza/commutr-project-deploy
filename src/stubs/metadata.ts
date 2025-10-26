import type { Level } from './mastery';

export type Candidate = {
  videoId: string; 
  channelId: string; 
  durationSec: number;
  topic: string; 
  level: Level; 
  publishedAt?: string;
  title?: string; 
  channelTitle?: string;
};

// Minimal stub for pack builder testing
export async function getCandidates(topic: string): Promise<Candidate[]> {
  return [];
}
