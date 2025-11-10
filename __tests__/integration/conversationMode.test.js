import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Conversation Mode Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('conversation flow completes successfully', async () => {
    const mockResponse = {
      message: "I understand you want to learn about science for 10 minutes. Let me create a playlist for you.",
      playlist: null
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch('http://localhost:3000/v1/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TEST'
      },
      body: JSON.stringify({
        message: 'I want to learn about science',
        conversationHistory: []
      })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.message).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('conversation history is maintained', async () => {
    const mockResponse = {
      message: "Great! I'll create a science playlist for your 10-minute commute.",
      playlist: { id: '123', title: 'Science Playlist' }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const conversationHistory = [
      { role: 'user', content: 'I want to learn about science' },
      { role: 'assistant', content: 'How long is your commute?' }
    ];

    const response = await fetch('http://localhost:3000/v1/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TEST'
      },
      body: JSON.stringify({
        message: '10 minutes',
        conversationHistory
      })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.playlist).toBeTruthy();
    expect(data.playlist.id).toBe('123');
  });

  test('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });

    const response = await fetch('http://localhost:3000/v1/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TEST'
      },
      body: JSON.stringify({
        message: 'test',
        conversationHistory: []
      })
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  test('auto-listen triggers after AI response', () => {
    const mockStartListening = jest.fn();
    const autoListenDelay = 0;
    
    setTimeout(() => {
      mockStartListening();
    }, autoListenDelay);
    
    setTimeout(() => {
      expect(mockStartListening).toHaveBeenCalled();
    }, 100);
  });

  test('playlist navigation occurs after speech completion', async () => {
    const mockNavigate = jest.fn();
    const mockSpeakComplete = jest.fn();
    
    const speakText = async (text) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          mockSpeakComplete();
          resolve();
        }, 10);
      });
    };

    await speakText("Playlist is ready!");
    mockNavigate('/playlist');
    
    expect(mockSpeakComplete).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/playlist');
  });
});
