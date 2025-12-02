import { Router } from 'express';
import { z } from 'zod';
import { buildPack } from '../pack/builder.js';
import { getUserMastery } from '../stubs/mastery.js';
import { getCandidates } from '../stubs/metadata.js';
import { suggestTopic } from '../stubs/reco.js';

const router = Router();
const schema = z.object({
  topic: z.string().min(1, "Topic is required"),
  durationSec: z.coerce.number().int().min(300).max(3600)
});

router.get('/v1/playlist', async (req, res) => {
  if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid params' });

  const { topic, durationSec } = parsed.data;
  
  const candidates = await getCandidates(topic);

  // Check if we have any valid candidates
  if (!candidates || candidates.length === 0) {
    console.log(`🚫 No candidates found for topic: "${topic}"`);
    res.set('X-Reason', 'no_candidates'); // Use header for reason
    return res.status(204).send();
  }

  const mastery = await getUserMastery('demoUser', topic);

  // Use 5 minutes tolerance for tight filling
  const minBuffer = 300; // 5 minutes
  const pct = minBuffer / durationSec;
  const out = buildPack({
    topic: topic,
    minDurationSec: Math.round(durationSec*(1-pct)),
    maxDurationSec: Math.round(durationSec*(1+pct)),
    userMasteryLevel: mastery.level,
    candidates
  });

  // Check if pack builder couldn't find any suitable videos
  if (!out.items || out.items.length === 0) {
    console.log(`🚫 Pack builder found no suitable videos for topic: "${topic}"`);
    res.set('X-Reason', 'no_candidates'); // Use header for reason
    return res.status(204).send();
  }

  return res.json({
    items: out.items.map(item => {
      const candidate = candidates.find(c => c.videoId === item.videoId);
      return {
        videoId: item.videoId,
        durationSec: item.durationSec,
        title: candidate?.title || `${topic} Tutorial`,
        channelTitle: candidate?.channelTitle || 'YouTube',
        level: candidate?.level || 'intermediate',
        thumbnail: candidate?.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
      };
    }),
    totalDurationSec: out.totalDurationSec,
    underFilled: out.underFilled
  });
});

export default router;
