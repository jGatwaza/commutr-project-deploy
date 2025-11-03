/**
 * Event Bus Tests
 * These tests are the source of truth - do not modify them, fix implementation instead
 */

import { describe, it, expect, jest } from '@jest/globals';
import { onPlayerEvent, emitPlayerEvent } from '../eventBus.js';

describe('eventBus', () => {
  describe('Basic subscription and emission', () => {
    it('can subscribe a handler, emit PLAY, and receive exactly one call', () => {
      const handler = jest.fn();
      
      onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'PLAY',
        videoId: 'vid1',
        atSec: 0,
      });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        type: 'PLAY',
        videoId: 'vid1',
        atSec: 0,
      });
    });

    it('after unsubscribe, emitting PAUSE does not call the handler again', () => {
      const handler = jest.fn();
      
      const unsubscribe = onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'PLAY',
        videoId: 'vid1',
        atSec: 0,
      });
      
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Emit PAUSE - should not be received
      emitPlayerEvent({
        type: 'PAUSE',
        videoId: 'vid1',
        atSec: 30,
      });
      
      expect(handler).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('Multiple subscribers', () => {
    it('multiple subscribers each receive the event once', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      onPlayerEvent(handler1);
      onPlayerEvent(handler2);
      onPlayerEvent(handler3);
      
      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid2',
        atSec: 45,
      });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      
      expect(handler1).toHaveBeenCalledWith({
        type: 'SKIP',
        videoId: 'vid2',
        atSec: 45,
      });
      expect(handler2).toHaveBeenCalledWith({
        type: 'SKIP',
        videoId: 'vid2',
        atSec: 45,
      });
      expect(handler3).toHaveBeenCalledWith({
        type: 'SKIP',
        videoId: 'vid2',
        atSec: 45,
      });
    });

    it('unsubscribing one handler does not affect others', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      const unsub1 = onPlayerEvent(handler1);
      onPlayerEvent(handler2);
      onPlayerEvent(handler3);
      
      // First event - all receive it
      emitPlayerEvent({
        type: 'PLAY',
        videoId: 'vid1',
        atSec: 0,
      });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      
      // Unsubscribe handler1
      unsub1();
      
      // Second event - only handler2 and handler3 receive it
      emitPlayerEvent({
        type: 'PAUSE',
        videoId: 'vid1',
        atSec: 10,
      });
      
      expect(handler1).toHaveBeenCalledTimes(1); // Still 1
      expect(handler2).toHaveBeenCalledTimes(2); // Now 2
      expect(handler3).toHaveBeenCalledTimes(2); // Now 2
    });
  });

  describe('Event types', () => {
    it('handles PLAY event with videoId and atSec', () => {
      const handler = jest.fn();
      onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'PLAY',
        videoId: 'vid123',
        atSec: 15,
      });
      
      expect(handler).toHaveBeenCalledWith({
        type: 'PLAY',
        videoId: 'vid123',
        atSec: 15,
      });
    });

    it('handles PAUSE event with videoId and atSec', () => {
      const handler = jest.fn();
      onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'PAUSE',
        videoId: 'vid456',
        atSec: 120,
      });
      
      expect(handler).toHaveBeenCalledWith({
        type: 'PAUSE',
        videoId: 'vid456',
        atSec: 120,
      });
    });

    it('handles SKIP event with videoId and atSec', () => {
      const handler = jest.fn();
      onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'SKIP',
        videoId: 'vid789',
        atSec: 60,
      });
      
      expect(handler).toHaveBeenCalledWith({
        type: 'SKIP',
        videoId: 'vid789',
        atSec: 60,
      });
    });

    it('handles COMPLETE event with videoId and durationSec', () => {
      const handler = jest.fn();
      onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'COMPLETE',
        videoId: 'vid999',
        durationSec: 300,
      });
      
      expect(handler).toHaveBeenCalledWith({
        type: 'COMPLETE',
        videoId: 'vid999',
        durationSec: 300,
      });
    });

    it('handles ERROR event with videoId and message', () => {
      const handler = jest.fn();
      onPlayerEvent(handler);
      
      emitPlayerEvent({
        type: 'ERROR',
        videoId: 'vid111',
        message: 'Video failed to load',
      });
      
      expect(handler).toHaveBeenCalledWith({
        type: 'ERROR',
        videoId: 'vid111',
        message: 'Video failed to load',
      });
    });
  });

  describe('Edge cases', () => {
    it('handles emitting event with no subscribers', () => {
      // Should not throw
      expect(() => {
        emitPlayerEvent({
          type: 'PLAY',
          videoId: 'vid1',
          atSec: 0,
        });
      }).not.toThrow();
    });

    it('handles multiple unsubscribe calls safely', () => {
      const handler = jest.fn();
      const unsubscribe = onPlayerEvent(handler);
      
      // First unsubscribe
      unsubscribe();
      
      // Second unsubscribe - should not throw
      expect(() => unsubscribe()).not.toThrow();
      
      // Event should not be received
      emitPlayerEvent({
        type: 'PLAY',
        videoId: 'vid1',
        atSec: 0,
      });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles rapid event emissions', () => {
      const handler = jest.fn();
      onPlayerEvent(handler);
      
      // Emit multiple events rapidly
      for (let i = 0; i < 10; i++) {
        emitPlayerEvent({
          type: 'PLAY',
          videoId: `vid${i}`,
          atSec: i * 10,
        });
      }
      
      expect(handler).toHaveBeenCalledTimes(10);
    });
  });
});
