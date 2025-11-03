import { jest } from '@jest/globals';

// ESM-safe mocking BEFORE imports
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

describe('Conversation Flow - Multi-Turn Interactions', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(agentRouter);

    // Default mocks
    mockGetCandidates.mockResolvedValue([
      { videoId: 'abc', channelId: 'chan-1', durationSec: 600, title: 'Test', channelTitle: 'Test', level: 'beginner', topic: 'python' },
      { videoId: 'def', channelId: 'chan-2', durationSec: 300, title: 'Test 2', channelTitle: 'Test', level: 'beginner', topic: 'python' }
    ]);
    mockGetUserMastery.mockResolvedValue({ level: 'beginner', streak: 0 });
    mockBuildPack.mockReturnValue({
      items: [
        { videoId: 'abc', durationSec: 600, channelId: 'chan-1' },
        { videoId: 'def', durationSec: 300, channelId: 'chan-2' }
      ],
      totalDurationSec: 900,
      underFilled: false
    });

    jest.clearAllMocks();
  });

  describe('Simple Flow - Complete in One Message', () => {
    test('should handle complete request in single message', async () => {
      mockProcessMessage.mockResolvedValue({
        message: 'Creating Python playlist for 15 minutes!',
        playlistRequest: {
          topic: 'python',
          durationMinutes: 15
        }
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 15 minutes' });

      expect(response.status).toBe(200);
      expect(response.body.playlist).toBeDefined();
      expect(response.body.playlist.items).toHaveLength(2);
      expect(mockProcessMessage).toHaveBeenCalledWith('Python for 15 minutes', []);
    });
  });

  describe('Split Information Flow - Topic Then Duration', () => {
    test('should handle topic first, duration second', async () => {
      // First message: topic only
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Great! How long is your commute?'
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'I want to learn Python' });

      expect(response1.body.playlist).toBeNull();
      expect(response1.body.message).toContain('long');

      // Build conversation history
      const history = [
        { role: 'user', content: 'I want to learn Python' },
        { role: 'assistant', content: 'Great! How long is your commute?' }
      ];

      // Second message: duration with history
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Perfect! Creating a Python playlist for 15 minutes!',
        playlistRequest: {
          topic: 'python',
          durationMinutes: 15
        }
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: '15 minutes',
          conversationHistory: history
        });

      expect(response2.status).toBe(200);
      expect(response2.body.playlist).toBeDefined();
      expect(mockProcessMessage).toHaveBeenLastCalledWith('15 minutes', history);
    });
  });

  describe('Split Information Flow - Duration Then Topic', () => {
    test('should handle duration first, topic second', async () => {
      // First message: duration only
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Perfect! What would you like to learn?'
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'I have a 20 minute commute' });

      expect(response1.body.playlist).toBeNull();

      // Build conversation history
      const history = [
        { role: 'user', content: 'I have a 20 minute commute' },
        { role: 'assistant', content: 'Perfect! What would you like to learn?' }
      ];

      // Second message: topic with history
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Awesome! Creating a cooking playlist for 20 minutes!',
        playlistRequest: {
          topic: 'cooking',
          durationMinutes: 20
        }
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Cooking',
          conversationHistory: history
        });

      expect(response2.status).toBe(200);
      expect(response2.body.playlist).toBeDefined();
      expect(mockProcessMessage).toHaveBeenLastCalledWith('Cooking', history);
    });
  });

  describe('Multi-Turn Conversation - Multiple Clarifications', () => {
    test('should handle multiple clarification exchanges', async () => {
      // Message 1: Vague request
      mockProcessMessage.mockResolvedValueOnce({
        message: 'What topic would you like to learn?'
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Create a playlist' });

      expect(response1.body.playlist).toBeNull();

      // Message 2: Provide topic
      const history1 = [
        { role: 'user', content: 'Create a playlist' },
        { role: 'assistant', content: 'What topic would you like to learn?' }
      ];

      mockProcessMessage.mockResolvedValueOnce({
        message: 'Great! How long is your commute?'
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Python',
          conversationHistory: history1
        });

      expect(response2.body.playlist).toBeNull();

      // Message 3: Provide duration
      const history2 = [
        ...history1,
        { role: 'user', content: 'Python' },
        { role: 'assistant', content: 'Great! How long is your commute?' }
      ];

      mockProcessMessage.mockResolvedValueOnce({
        message: 'Perfect! Creating a Python playlist for 15 minutes!',
        playlistRequest: {
          topic: 'python',
          durationMinutes: 15
        }
      });

      const response3 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: '15 minutes',
          conversationHistory: history2
        });

      expect(response3.status).toBe(200);
      expect(response3.body.playlist).toBeDefined();
    });
  });

  describe('Refinement Flow - Changing Request', () => {
    test('should handle duration change', async () => {
      // First request
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Creating Python playlist for 10 minutes!',
        playlistRequest: { topic: 'python', durationMinutes: 10 }
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 10 minutes' });

      expect(response1.body.playlist).toBeDefined();

      // Change duration
      const history = [
        { role: 'user', content: 'Python for 10 minutes' },
        { role: 'assistant', content: 'Creating Python playlist for 10 minutes!' }
      ];

      mockProcessMessage.mockResolvedValueOnce({
        message: 'Updated to 20 minutes! Creating new Python playlist!',
        playlistRequest: { topic: 'python', durationMinutes: 20 }
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Actually, make it 20 minutes',
          conversationHistory: history
        });

      expect(response2.body.playlist).toBeDefined();
      expect(mockProcessMessage).toHaveBeenLastCalledWith('Actually, make it 20 minutes', history);
    });

    test('should handle topic change', async () => {
      // First request
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Creating Python playlist!',
        playlistRequest: { topic: 'python', durationMinutes: 15 }
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Python for 15 minutes' });

      expect(response1.body.playlist).toBeDefined();

      // Change topic
      const history = [
        { role: 'user', content: 'Python for 15 minutes' },
        { role: 'assistant', content: 'Creating Python playlist!' }
      ];

      mockProcessMessage.mockResolvedValueOnce({
        message: 'Changed to JavaScript! Creating new playlist for 15 minutes!',
        playlistRequest: { topic: 'javascript', durationMinutes: 15 }
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Change it to JavaScript',
          conversationHistory: history
        });

      expect(response2.body.playlist).toBeDefined();
    });
  });

  describe('Conversational Flow', () => {
    test('should handle greeting-to-request flow', async () => {
      // Greeting
      mockProcessMessage.mockResolvedValueOnce({
        message: 'Hello! I can help you create learning playlists!'
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'Hello' });

      expect(response1.body.playlist).toBeNull();

      // Make request after greeting
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello! I can help you create learning playlists!' }
      ];

      mockProcessMessage.mockResolvedValueOnce({
        message: 'Creating Python playlist for 15 minutes!',
        playlistRequest: { topic: 'python', durationMinutes: 15 }
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Python for 15 minutes',
          conversationHistory: history
        });

      expect(response2.body.playlist).toBeDefined();
    });

    test('should handle help-to-request flow', async () => {
      // Help request
      mockProcessMessage.mockResolvedValueOnce({
        message: 'I can create personalized learning playlists for your commute!'
      });

      const response1 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({ message: 'What can you do?' });

      expect(response1.body.playlist).toBeNull();

      // Make request after help
      const history = [
        { role: 'user', content: 'What can you do?' },
        { role: 'assistant', content: 'I can create personalized learning playlists!' }
      ];

      mockProcessMessage.mockResolvedValueOnce({
        message: 'Creating cooking playlist for 20 minutes!',
        playlistRequest: { topic: 'cooking', durationMinutes: 20 }
      });

      const response2 = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Cooking for 20 minutes',
          conversationHistory: history
        });

      expect(response2.body.playlist).toBeDefined();
    });
  });

  describe('History Length Tests', () => {
    test('should handle long conversation history', async () => {
      // Build a long history (10 exchanges)
      const longHistory = [];
      for (let i = 0; i < 10; i++) {
        longHistory.push(
          { role: 'user' as const, content: `User message ${i}` },
          { role: 'assistant' as const, content: `Assistant response ${i}` }
        );
      }

      mockProcessMessage.mockResolvedValue({
        message: 'Creating playlist!',
        playlistRequest: { topic: 'python', durationMinutes: 15 }
      });

      const response = await request(app)
        .post('/v1/agent/chat')
        .set('Authorization', 'Bearer TEST')
        .send({
          message: 'Python for 15 minutes',
          conversationHistory: longHistory
        });

      expect(response.status).toBe(200);
      expect(mockProcessMessage).toHaveBeenCalledWith('Python for 15 minutes', longHistory);
    });
  });
});
