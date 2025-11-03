/**
 * Top-Up Controller Tests
 * These tests are the source of truth - do not modify them, fix implementation instead
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { startTopUpController } from '../topUpController.js';
import { useTimeStore } from '../timeStore.js';
import { emitPlayerEvent } from '../eventBus.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('topUpController', () => {
  let mockGetQueueIds: jest.MockedFunction<() => string[]>;
  let mockGetTopic: jest.MockedFunction<() => string>;
  let mockAppendToQueue: jest.MockedFunction<(items: any[]) => void>;

  beforeEach(() => {
    // Reset time store
    const store = useTimeStore.getState();
    store.setInitial(0);

    // Reset mocks
    mockGetQueueIds = jest.fn(() => []);
    mockGetTopic = jest.fn(() => 'javascript');
    mockAppendToQueue = jest.fn();

    // Reset fetch mock
    (global.fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('COMPLETE event handling', () => {
    it('emitting COMPLETE adds consumed time and decreases remaining()', () => {
      const { setInitial, remaining } = useTimeStore.getState();
      setInitial(1800);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      expect(remaining()).toBe(1800);

      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid1',
        durationSec: 300,
      });

      expect(remaining()).toBe(1500);

      stop();
    });

    it('emitting COMPLETE triggers exactly one POST to /api/recommend', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      mockGetQueueIds.mockReturnValue(['vid1', 'vid2']);
      mockGetTopic.mockReturnValue('react');

      // Mock successful API response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'vid3', durationSec: 400 },
            { id: 'vid4', durationSec: 500 },
          ],
          totalSec: 900,
          strategy: 'longest-first',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid1',
        durationSec: 300,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/recommend',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            remainingSeconds: 1500, // 1800 - 300
            excludeIds: ['vid1', 'vid2'],
            topic: 'react',
          }),
        })
      );

      stop();
    });

    it('calls appendToQueue with returned items after COMPLETE', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      const mockItems = [
        { id: 'vid3', url: 'https://example.com/vid3', title: 'Video 3', durationSec: 400 },
        { id: 'vid4', url: 'https://example.com/vid4', title: 'Video 4', durationSec: 500 },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockItems,
          totalSec: 900,
          strategy: 'longest-first',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid1',
        durationSec: 300,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockAppendToQueue).toHaveBeenCalledTimes(1);
      expect(mockAppendToQueue).toHaveBeenCalledWith(mockItems);

      stop();
    });
  });

  describe('SKIP event handling', () => {
    it('emitting SKIP triggers exactly one recommend call but does not change consumed time', async () => {
      const { setInitial, remaining } = useTimeStore.getState();
      setInitial(1800);

      mockGetQueueIds.mockReturnValue(['vid1']);
      mockGetTopic.mockReturnValue('javascript');

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          totalSec: 0,
          strategy: 'empty',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      const remainingBefore = remaining();
      expect(remainingBefore).toBe(1800);

      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid1',
        atSec: 45,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Remaining should not change
      expect(remaining()).toBe(1800);

      // But fetch should have been called
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/recommend',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            remainingSeconds: 1800,
            excludeIds: ['vid1'],
            topic: 'javascript',
          }),
        })
      );

      stop();
    });
  });

  describe('Tiny remainder guard', () => {
    it('no call is made if remaining() ≤ 30 seconds', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(30);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid1',
        atSec: 10,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).not.toHaveBeenCalled();

      stop();
    });

    it('no call is made if remaining() is exactly 30 seconds', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(30);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid1',
        durationSec: 0,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).not.toHaveBeenCalled();

      stop();
    });

    it('call is made if remaining() is 31 seconds', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(31);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          totalSec: 0,
          strategy: 'empty',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid1',
        atSec: 10,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).toHaveBeenCalledTimes(1);

      stop();
    });

    it('no call after consumption brings remaining below 30', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(100);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      // First COMPLETE brings remaining to 25 (100 - 75)
      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid1',
        durationSec: 75,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have called fetch because remaining is now 25
      expect(global.fetch).not.toHaveBeenCalled();

      stop();
    });
  });

  describe('Controller lifecycle', () => {
    it('stop() unsubscribes from events', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [],
          totalSec: 0,
          strategy: 'empty',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      // Emit event - should trigger fetch
      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid1',
        atSec: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Stop controller
      stop();

      // Emit another event - should NOT trigger fetch
      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid2',
        atSec: 20,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      // Should not throw
      expect(() => {
        emitPlayerEvent({
          type: 'SKIP',
          videoId: 'vid1',
          atSec: 10,
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // appendToQueue should not have been called
      expect(mockAppendToQueue).not.toHaveBeenCalled();

      stop();
    });

    it('handles non-ok response gracefully', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid1',
        atSec: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // appendToQueue should not have been called
      expect(mockAppendToQueue).not.toHaveBeenCalled();

      stop();
    });

    it('handles empty items array in response', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          totalSec: 0,
          strategy: 'no-matches',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid1',
        atSec: 10,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // appendToQueue should still be called with empty array
      expect(mockAppendToQueue).toHaveBeenCalledWith([]);

      stop();
    });
  });

  describe('Integration scenarios', () => {
    it('handles multiple COMPLETE events in sequence', async () => {
      const { setInitial, remaining } = useTimeStore.getState();
      setInitial(2000);

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ id: 'newVid', durationSec: 300 }],
          totalSec: 300,
          strategy: 'longest-first',
        }),
      } as Response);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      // First COMPLETE
      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid1',
        durationSec: 400,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(remaining()).toBe(1600);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second COMPLETE
      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid2',
        durationSec: 300,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(remaining()).toBe(1300);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      stop();
    });

    it('ignores other event types (PLAY, PAUSE, ERROR)', async () => {
      const { setInitial } = useTimeStore.getState();
      setInitial(1800);

      const stop = startTopUpController({
        getQueueIds: mockGetQueueIds,
        getTopic: mockGetTopic,
        appendToQueue: mockAppendToQueue,
      });

      emitPlayerEvent({
        type: 'PLAY',
        videoId: 'vid1',
        atSec: 0,
      });

      emitPlayerEvent({
        type: 'PAUSE',
        videoId: 'vid1',
        atSec: 30,
      });

      emitPlayerEvent({
        type: 'ERROR',
        videoId: 'vid1',
        message: 'Some error',
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockAppendToQueue).not.toHaveBeenCalled();

      stop();
    });
  });
});
