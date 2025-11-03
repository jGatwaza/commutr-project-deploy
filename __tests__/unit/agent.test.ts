import { jest } from '@jest/globals';

// Load the manual mock for 'groq-sdk' (moduleNameMapper in jest.config.js)
const groqMockModule: any = await import('groq-sdk');
const __mockGroqCreate = groqMockModule.__mockGroqCreate as jest.Mock;
const mockGroqCreate = __mockGroqCreate;

// Now import the module under test
const { processMessage } = await import('../../src/services/agent.js');

// Local type to avoid type import ordering issues
type ConversationMessage = { role: 'user' | 'assistant'; content: string };

describe('Agent Service - Message Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Simple Request Extraction', () => {
    test('should extract topic and duration from single message', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Great! I'll create a Python playlist for your 15-minute commute!",
              playlistRequest: {
                topic: 'python',
                durationMinutes: 15
              }
            })
          }
        }]
      });

      const result = await processMessage('I want to learn Python for 15 minutes');

      expect(result.message).toContain('Python');
      expect(result.playlistRequest).toBeDefined();
      expect(result.playlistRequest?.topic).toBe('python');
      expect(result.playlistRequest?.durationMinutes).toBe(15);
    });

    test('should handle topic-only request', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Great! How long is your commute?"
            })
          }
        }]
      });

      const result = await processMessage('I want to learn JavaScript');

      expect(result.playlistRequest).toBeUndefined();
      expect(result.message).toBeTruthy();
    });

    test('should handle duration-only request', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Perfect! What would you like to learn?"
            })
          }
        }]
      });

      const result = await processMessage('I have a 20 minute commute');

      expect(result.playlistRequest).toBeUndefined();
      expect(result.message).toBeTruthy();
    });
  });

  describe('Conversation Context', () => {
    test('should use conversation history - topic then duration', async () => {
      const history: ConversationMessage[] = [
        { role: 'user', content: 'I want to learn Python' },
        { role: 'assistant', content: 'How long is your commute?' }
      ];

      mockGroqCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Perfect! Creating a Python playlist for 15 minutes!",
              playlistRequest: {
                topic: 'python',
                durationMinutes: 15
              }
            })
          }
        }]
      });

      const result = await processMessage('15 minutes', history);

      expect(result.playlistRequest).toBeDefined();
      expect(result.playlistRequest?.topic).toBe('python');
      expect(result.playlistRequest?.durationMinutes).toBe(15);
    });

    test('should use conversation history - duration then topic', async () => {
      const history: ConversationMessage[] = [
        { role: 'user', content: 'I have a 10 minute commute' },
        { role: 'assistant', content: 'What would you like to learn?' }
      ];

      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Awesome! Creating a cooking playlist for 10 minutes!",
              playlistRequest: {
                topic: 'cooking',
                durationMinutes: 10
              }
            })
          }
        }]
      });

      const result = await processMessage('Cooking', history);

      expect(result.playlistRequest).toBeDefined();
      expect(result.playlistRequest?.topic).toBe('cooking');
      expect(result.playlistRequest?.durationMinutes).toBe(10);
    });

    test('should send full history to Groq API', async () => {
      const history: ConversationMessage[] = [
        { role: 'user', content: 'Create a playlist' },
        { role: 'assistant', content: 'What topic?' },
        { role: 'user', content: 'Python' },
        { role: 'assistant', content: 'How long?' }
      ];

      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Creating Python playlist for 20 minutes!",
              playlistRequest: { topic: 'python', durationMinutes: 20 }
            })
          }
        }]
      });

      await processMessage('20 minutes', history);

      expect(__mockGroqCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            { role: 'user', content: 'Create a playlist' },
            { role: 'assistant', content: 'What topic?' },
            { role: 'user', content: 'Python' },
            { role: 'assistant', content: 'How long?' },
            { role: 'user', content: '20 minutes' }
          ])
        })
      );
    });
  });

  describe('Conversational Responses', () => {
    test('should handle greeting', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Hello! I can help you create learning playlists for your commute!"
            })
          }
        }]
      });

      const result = await processMessage('Hello');

      expect(result.message).toBeTruthy();
      expect(result.playlistRequest).toBeUndefined();
    });

    test('should handle help request', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "I can help you create personalized learning playlists!"
            })
          }
        }]
      });

      const result = await processMessage('What can you do?');

      expect(result.message).toBeTruthy();
      expect(result.playlistRequest).toBeUndefined();
    });

    test('should handle thank you', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "You're welcome! Let me know if you need anything else!"
            })
          }
        }]
      });

      const result = await processMessage('Thank you');

      expect(result.message).toBeTruthy();
      expect(result.playlistRequest).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very short duration', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Creating a Python playlist for 2 minutes!",
              playlistRequest: { topic: 'python', durationMinutes: 2 }
            })
          }
        }]
      });

      const result = await processMessage('Python for 2 minutes');

      expect(result.playlistRequest?.durationMinutes).toBe(2);
    });

    test('should handle very long duration', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              message: "Creating a History playlist for 2 hours!",
              playlistRequest: { topic: 'history', durationMinutes: 120 }
            })
          }
        }]
      });

      const result = await processMessage('History for 2 hours');

      expect(result.playlistRequest?.durationMinutes).toBe(120);
    });

    test('should handle invalid JSON response gracefully', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: 'Not valid JSON'
          }
        }]
      });

      const result = await processMessage('Test message');

      expect(result.message).toBeTruthy();
      expect(result.playlistRequest).toBeUndefined();
    });

    test('should handle empty response', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: ''
          }
        }]
      });

      const result = await processMessage('Test message');

      expect(result.message).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should throw error when Groq API fails', async () => {
      (__mockGroqCreate as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(processMessage('Test')).rejects.toThrow('Failed to process message');
    });

    test('should throw error with API key message', async () => {
      (__mockGroqCreate as jest.Mock).mockRejectedValue(new Error('Invalid API key'));

      await expect(processMessage('Test')).rejects.toThrow();
    });
  });

  describe('Model Configuration', () => {
    test('should use correct model', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ message: 'test' }) } }]
      });

      await processMessage('Test');

      expect(__mockGroqCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile'
        })
      );
    });

    test('should use appropriate temperature', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ message: 'test' }) } }]
      });

      await processMessage('Test');

      expect(__mockGroqCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7
        })
      );
    });

    test('should set max tokens', async () => {
      (__mockGroqCreate as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ message: 'test' }) } }]
      });

      await processMessage('Test');

      expect(__mockGroqCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500
        })
      );
    });
  });
});
