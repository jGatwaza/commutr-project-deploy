export type Level = 'beginner' | 'intermediate' | 'advanced';

export async function getUserMastery(userId: string, topic: string): Promise<{ level: Level }> {
  return { level: 'beginner' };
}
