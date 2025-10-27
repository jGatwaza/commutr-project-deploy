export type Level = 'beginner'|'intermediate'|'advanced';
export async function getUserMastery(_userId: string, _topic: string) {
  return { level: 'beginner' as Level, streak: 0 };
}
