import { jest } from '@jest/globals';

// ESM-safe mocking: define mocks BEFORE importing modules under test
await jest.unstable_mockModule('../../src/services/agent.js', () => ({ __esModule: true, processMessage: jest.fn() }));
await jest.unstable_mockModule('../../src/stubs/metadata.js', () => ({ __esModule: true, getCandidates: jest.fn() }));
await jest.unstable_mockModule('../../src/stubs/mastery.js', () => ({ __esModule: true, getUserMastery: jest.fn() }));
await jest.unstable_mockModule('../../src/pack/builder.js', () => ({ __esModule: true, buildPack: jest.fn() }));

import request from 'supertest';
import express from 'express';
const agentRouter = (await import('../../src/web/agent.js')).default;
const { processMessage } = await import('../../src/services/agent.js');
const { getCandidates } = await import('../../src/stubs/metadata.js');
const { getUserMastery } = await import('../../src/stubs/mastery.js');
const { buildPack } = await import('../../src/pack/builder.js');

const mockProcessMessage = processMessage as jest.Mock;
const mockGetCandidates = getCandidates as jest.Mock;
const mockGetUserMastery = getUserMastery as jest.Mock;
const mockBuildPack = buildPack as jest.Mock;

describe('Agent API - /v1/agent/chat Endpoint', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(agentRouter);

    jest.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    test('should return 401 without authorization header', async () => {
      const response = await request(app)
        .post('/v1/agent/chat')
        .send({ message: 'Hello' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should accept request with authorization header', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Hi there!',
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Hello' });

      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation Tests', () => {
    test('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for missing message field', async () => {
      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({});

      expect(response.status).toBe(400);
    });

    test('should accept valid message', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Response',
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Valid message' });

      expect(response.status).toBe(200);
    });

    test('should accept conversation history', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Response',
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Test',
          conversationHistory: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi!' }
          ]
        });

      expect(response.status).toBe(200);
    });

    test('should reject invalid conversation history format', async () => {
      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Test',
          conversationHistory: [
            { invalid: 'format' }
          ]
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Response Format Tests', () => {
    test('should return required fields', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Test response',
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Test' });

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('playlist');
      expect(response.body).toHaveProperty('playlistContext');
    });

    test('should return null playlist for non-playlist response', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Just chatting',
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Hello' });

      expect(response.body.playlist).toBeNull();
      expect(response.body.playlistContext).toBeNull();
    });
  });

  describe('Playlist Generation Tests', () => {
    test('should generate playlist when request detected', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Creating playlist!',
        playlistRequest: {
          topic: 'python',
          durationMinutes: 15
        }
      });

      mockGetCandidates.mockResolvedValue([
        {
          videoId: 'abc123',
          channelId: 'chan-1',
          durationSec: 600,
          topic: 'python',
          level: 'beginner',
          title: 'Python Tutorial',
          channelTitle: 'Learn Code',
        },
        {
          videoId: 'def456',
          channelId: 'chan-2',
          durationSec: 300,
          topic: 'python',
          level: 'beginner',
          title: 'Python Basics',
          channelTitle: 'Code Academy',
        }
      ]);

      mockGetUserMastery.mockResolvedValue({ level: 'beginner', streak: 0 });

      mockBuildPack.mockReturnValue({
        items: [
          { videoId: 'abc123', durationSec: 600, channelId: 'chan-1' },
          { videoId: 'def456', durationSec: 300, channelId: 'chan-2' }
        ],
        totalDurationSec: 900,
        underFilled: false
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 15 minutes' });

      expect(response.status).toBe(200);
      expect(response.body.playlist).toBeDefined();
      expect(response.body.playlist.items).toHaveLength(2);
      expect(response.body.playlist.totalDurationSec).toBe(900);
    });

    test('should include video metadata in playlist', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Creating playlist!',
        playlistRequest: { topic: 'python', durationMinutes: 15 }
      });

      mockGetCandidates.mockResolvedValue([
        {
          videoId: 'abc123',
          channelId: 'chan-1',
          durationSec: 900,
          topic: 'python',
          level: 'beginner',
          title: 'Python Tutorial',
          channelTitle: 'Learn Code',
        }
      ]);

      mockGetUserMastery.mockResolvedValue({ level: 'beginner', streak: 0 });

      mockBuildPack.mockReturnValue({
        items: [{ videoId: 'abc123', durationSec: 900, channelId: 'chan-1' }],
        totalDurationSec: 900,
        underFilled: false
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 15 minutes' });

      const video = response.body.playlist.items[0];
      expect(video).toHaveProperty('videoId');
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('channelTitle');
      expect(video).toHaveProperty('durationSec');
      expect(video).toHaveProperty('level');
    });

    test('should set underFilled flag correctly', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Creating playlist!',
        playlistRequest: { topic: 'python', durationMinutes: 30 }
      });

      mockGetCandidates.mockResolvedValue([
        { videoId: 'abc123', channelId: 'chan-1', durationSec: 600, title: 'Test', channelTitle: 'Test', level: 'beginner', topic: 'python' }
      ]);

      mockGetUserMastery.mockResolvedValue({ level: 'beginner', streak: 0 });

      mockBuildPack.mockReturnValue({
        items: [{ videoId: 'abc123', durationSec: 600, channelId: 'chan-1' }],
        totalDurationSec: 600,
        underFilled: true
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 30 minutes' });

      expect(response.body.playlist.underFilled).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle no videos found', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Creating playlist!',
        playlistRequest: { topic: 'obscure-topic', durationMinutes: 15 }
      });

      mockGetCandidates.mockResolvedValue([]);

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Obscure topic for 15 minutes' });

      expect(response.status).toBe(200);
      expect(response.body.playlist).toBeNull();
      expect(response.body.message).toContain('couldn\'t find');
    });

    test('should handle empty playlist from builder', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Creating playlist!',
        playlistRequest: { topic: 'python', durationMinutes: 15 }
      });

      mockGetCandidates.mockResolvedValue([
        { videoId: 'abc', channelId: 'chan-1', durationSec: 100, title: 'Test', channelTitle: 'Test', level: 'beginner', topic: 'python' }
      ]);

      mockGetUserMastery.mockResolvedValue({ level: 'beginner', streak: 0 });

      mockBuildPack.mockReturnValue({
        items: [],
        totalDurationSec: 0,
        underFilled: true
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 15 minutes' });

      expect(response.status).toBe(200);
      expect(response.body.playlist).toBeNull();
      expect(response.body.message).toContain('couldn\'t create');
    });

    test('should handle agent service error', async () => {
      mockProcessMessage.mockRejectedValue(new Error('Agent error'));

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle Groq API key error specifically', async () => {
      mockProcessMessage.mockRejectedValue(new Error('Invalid API key'));

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('AI agent not configured');
      expect(response.body.message).toContain('GROQ_API_KEY');
    });
  });

  describe('Conversation History Integration', () => {
    test('should pass conversation history to agent service', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Response',
      });

      const history = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi!' }
      ];

      await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Test',
          conversationHistory: history
        });

      expect(mockProcessMessage).toHaveBeenCalledWith('Test', history);
    });

    test('should handle empty conversation history', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Response',
      });

      await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Test',
          conversationHistory: []
        });

      expect(mockProcessMessage).toHaveBeenCalledWith('Test', []);
    });

    test('should default to empty array if history not provided', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Response',
      });

      await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Test' });

      expect(mockProcessMessage).toHaveBeenCalledWith('Test', []);
    });
  });
});
