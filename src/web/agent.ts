import { Router } from 'express';
import { z } from 'zod';
import { processMessage } from '../services/agent.js';
import { getCandidates } from '../stubs/metadata.js';
import { getUserMastery } from '../stubs/mastery.js';
import { buildPack } from '../pack/builder.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, "Message is required")
});

/**
 * POST /v1/agent/chat
 * Chat with AI agent to create playlists
 */
router.post('/v1/agent/chat', async (req, res) => {
  // Check authorization
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate request body
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { message } = parsed.data;

  try {
    // Process message with AI agent
    const agentResponse = await processMessage(message);

    // If agent extracted a playlist request, generate the playlist
    if (agentResponse.playlistRequest) {
      const { topic, durationMinutes } = agentResponse.playlistRequest;
      const durationSec = durationMinutes * 60;

      // Get candidates for the topic
      const candidates = await getCandidates(topic);

      // Check if we have any valid candidates
      if (!candidates || candidates.length === 0) {
        return res.json({
          message: `I couldn't find any educational videos for "${topic}". Could you try a different topic? Some popular topics include: cooking, python, javascript, fitness, spanish, photography, music, or history.`,
          playlist: null,
          playlistContext: null
        });
      }

      // Get user mastery
      const mastery = await getUserMastery('demoUser', topic);

      // Build playlist
      const pct = 0.07;
      const playlist = buildPack({
        topic: topic,
        minDurationSec: Math.round(durationSec * (1 - pct)),
        maxDurationSec: Math.round(durationSec * (1 + pct)),
        userMasteryLevel: mastery.level,
        candidates
      });

      // Check if pack builder couldn't find any suitable videos
      if (!playlist.items || playlist.items.length === 0) {
        return res.json({
          message: `I found videos about "${topic}", but couldn't create a playlist that fits your ${durationMinutes}-minute commute. Try adjusting your duration or choosing a different topic!`,
          playlist: null,
          playlistContext: null
        });
      }

      // Format playlist for frontend
      const formattedPlaylist = {
        items: playlist.items.map(item => {
          const candidate = candidates.find(c => c.videoId === item.videoId);
          return {
            videoId: item.videoId,
            durationSec: item.durationSec,
            title: candidate?.title || `${topic} Tutorial`,
            channelTitle: candidate?.channelTitle || 'YouTube',
            level: candidate?.level || 'intermediate'
          };
        }),
        totalDurationSec: playlist.totalDurationSec,
        underFilled: playlist.underFilled
      };

      return res.json({
        message: agentResponse.message,
        playlist: formattedPlaylist,
        playlistContext: {
          topic,
          duration: durationSec
        }
      });
    }

    // No playlist request, just return agent's message
    return res.json({
      message: agentResponse.message,
      playlist: null,
      playlistContext: null
    });

  } catch (error) {
    console.error('Agent chat error:', error);
    
    // Check if it's a Groq API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return res.status(500).json({
        error: 'AI agent not configured',
        message: 'The AI agent requires a Groq API key. Please add your GROQ_API_KEY to the .env file. Get a free API key at console.groq.com'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process your message. Please try again.'
    });
  }
});

export default router;
