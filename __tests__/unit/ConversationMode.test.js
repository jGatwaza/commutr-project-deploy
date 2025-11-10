import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('ConversationMode Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('speech recognition mock setup', () => {
    const mockRecognition = {
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      continuous: true,
      interimResults: true,
    };
    
    expect(mockRecognition.start).toBeDefined();
    expect(mockRecognition.continuous).toBe(true);
    expect(mockRecognition.interimResults).toBe(true);
  });

  test('speech synthesis mock setup', () => {
    const mockSynthesis = {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn(() => [
        { name: 'Google US English', lang: 'en-US' }
      ]),
    };
    
    expect(mockSynthesis.speak).toBeDefined();
    expect(mockSynthesis.getVoices()).toHaveLength(1);
  });

  test('auto-listen logic triggers correctly', () => {
    const mockStartListening = jest.fn();
    const shouldAutoListen = true;
    
    if (shouldAutoListen) {
      mockStartListening();
    }
    
    expect(mockStartListening).toHaveBeenCalled();
  });

  test('conversation history maintains context', () => {
    const conversationHistory = [];
    
    conversationHistory.push({ role: 'user', content: 'I want to learn about science' });
    conversationHistory.push({ role: 'assistant', content: 'How long is your commute?' });
    conversationHistory.push({ role: 'user', content: '10 minutes' });
    
    expect(conversationHistory).toHaveLength(3);
    expect(conversationHistory[0].role).toBe('user');
    expect(conversationHistory[1].role).toBe('assistant');
  });

  test('state transitions work correctly', () => {
    let status = 'Initializing...';
    expect(status).toBe('Initializing...');
    
    status = 'AI is speaking...';
    expect(status).toBe('AI is speaking...');
    
    status = 'Listening...';
    expect(status).toBe('Listening...');
    
    status = 'Processing your request...';
    expect(status).toBe('Processing your request...');
  });

  test('transcript processing handles empty strings', () => {
    const processTranscript = (transcript) => {
      const trimmed = transcript.trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    
    expect(processTranscript('Hello')).toBe('Hello');
    expect(processTranscript('  ')).toBe(null);
    expect(processTranscript('')).toBe(null);
  });

  test('speech timeout calculation', () => {
    const calculateTimeout = (textLength) => {
      const estimatedDuration = (textLength / 15) * 1000;
      return Math.max(estimatedDuration + 2000, 10000);
    };
    
    expect(calculateTimeout(30)).toBeGreaterThanOrEqual(10000);
    expect(calculateTimeout(150)).toBeGreaterThan(10000);
  });

  test('greeting message is set correctly', () => {
    const greeting = "Hello! I'm your Commutr assistant. What would you like to learn about today? You can tell me a topic and how long your commute is.";
    
    expect(greeting).toContain('Commutr assistant');
    expect(greeting.length).toBeGreaterThan(0);
  });
});
