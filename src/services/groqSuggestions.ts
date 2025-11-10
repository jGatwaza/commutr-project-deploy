import Groq from 'groq-sdk/index.mjs';
import type { VibePreset } from '../lib/recommender/vibes.js';

export type GroqSuggestion = {
  topic: string;
  reason: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
};

type SuggestionRequest = {
  vibePreset: VibePreset;
  requestedTopic?: string;
  limit?: number;
};

const apiKey = process.env.GROQ_API_KEY;
const GroqCtor = Groq as unknown as { new(config: { apiKey: string }): any };
const groqClient = apiKey
  ? new GroqCtor({ apiKey })
  : null;

const DEFAULT_MODEL = 'llama-3.3-8b-instant';

function sanitizeJsonPayload(raw: string): string {
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

export async function fetchGroqSuggestions({
  vibePreset,
  requestedTopic,
  limit = 4
}: SuggestionRequest): Promise<GroqSuggestion[]> {
  if (!groqClient) {
    return [];
  }

  const vibeDescriptor = `${vibePreset.title} (energy ${vibePreset.energy}, default difficulty ${vibePreset.defaultDifficulty})`;
  const focusLine = requestedTopic
    ? `Focus at least half of the suggestions on variations of "${requestedTopic}" while keeping the ${vibePreset.title.toLowerCase()} tone.`
    : `Pick topics that embody the ${vibePreset.title.toLowerCase()} vibe.`;

  const prompt = `You are a micro-learning content curator helping commuters discover topics for short learning playlists.
Return a JSON array (no extra commentary) of ${limit} distinct suggestion objects.
Each object MUST have:
  - "topic": concise topic name (2-4 words, lowercase except proper nouns)
  - "reason": 1 concise sentence tailored to the ${vibePreset.title.toLowerCase()} vibe and the topic, highlighting what makes it engaging for a commute
  - "difficulty": "beginner", "intermediate", or "advanced" based on typical entry point
Avoid duplicate topics. Avoid generic reasons like "matches your vibe".
Vibe context: ${vibeDescriptor}.
${focusLine}
Ensure the JSON is valid and parseable.`;

  try {
    const completion = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: 'You produce JSON only. No prose outside JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const message = completion.choices?.[0]?.message?.content?.trim();
    if (!message) {
      return [];
    }

    const sanitized = sanitizeJsonPayload(message);
    const parsed = JSON.parse(sanitized);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item?.topic === 'string' && typeof item?.reason === 'string')
      .slice(0, limit)
      .map((item) => ({
        topic: String(item.topic).trim(),
        reason: String(item.reason).trim(),
        difficulty: ['beginner', 'intermediate', 'advanced'].includes(item.difficulty)
          ? item.difficulty
          : undefined,
      }));
  } catch (error) {
    console.error('Groq suggestion fetch failed:', error);
    return [];
  }
}
