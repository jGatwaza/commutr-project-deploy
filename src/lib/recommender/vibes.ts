export type VibeKey = 'focused' | 'energized' | 'curious' | 'unwinding';

export type VibePreset = {
  key: VibeKey;
  title: string;
  energy: 'low' | 'medium' | 'high';
  defaultDifficulty: 'beginner' | 'intermediate' | 'advanced';
  suggestedTopics: string[];
  description: string;
};

export const VIBE_PRESETS: Record<VibeKey, VibePreset> = {
  focused: {
    key: 'focused',
    title: 'Focused',
    energy: 'medium',
    defaultDifficulty: 'intermediate',
    suggestedTopics: ['python', 'react', 'productivity', 'writing'],
    description: 'Dialed-in mindset. Serve structured, skill-building content.'
  },
  energized: {
    key: 'energized',
    title: 'Energized',
    energy: 'high',
    defaultDifficulty: 'intermediate',
    suggestedTopics: ['fitness', 'public speaking', 'leadership', 'design'],
    description: 'High-energy commute. Lean on engaging, dynamic lessons.'
  },
  curious: {
    key: 'curious',
    title: 'Curious',
    energy: 'medium',
    defaultDifficulty: 'beginner',
    suggestedTopics: ['history', 'cooking', 'photography', 'spanish'],
    description: 'Open to new things. Suggest approachable, discovery-friendly topics.'
  },
  unwinding: {
    key: 'unwinding',
    title: 'Unwinding',
    energy: 'low',
    defaultDifficulty: 'beginner',
    suggestedTopics: ['mindfulness', 'yoga', 'storytelling', 'music theory'],
    description: 'Wind-down mode. Offer lighter, reflective learning sessions.'
  }
};

export function resolveVibe(key?: string): VibePreset {
  if (!key) {
    return VIBE_PRESETS.focused;
  }

  const normalized = key.toLowerCase() as VibeKey;
  if (normalized in VIBE_PRESETS) {
    return VIBE_PRESETS[normalized];
  }

  return VIBE_PRESETS.focused;
}

export function bumpDifficulty(
  current: 'beginner' | 'intermediate' | 'advanced',
  masteryScore: number
): 'beginner' | 'intermediate' | 'advanced' {
  if (current === 'advanced') return 'advanced';
  if (current === 'intermediate' && masteryScore >= 8) {
    return 'advanced';
  }
  if (current === 'beginner' && masteryScore >= 5) {
    return 'intermediate';
  }
  return current;
}
