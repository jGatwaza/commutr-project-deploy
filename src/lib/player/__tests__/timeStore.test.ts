/**
 * Time Store Tests
 * These tests are the source of truth - do not modify them, fix implementation instead
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useTimeStore } from '../timeStore.js';

describe('timeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useTimeStore.getState();
    store.setInitial(0);
  });

  describe('Basic state management', () => {
    it('setInitial(1200) → remaining() equals 1200', () => {
      const { setInitial, remaining } = useTimeStore.getState();
      
      setInitial(1200);
      
      expect(remaining()).toBe(1200);
    });

    it('addConsumed(300) → remaining() equals 900', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(1200);
      addConsumed(300);
      
      expect(remaining()).toBe(900);
    });

    it('additional addConsumed(1000) bottoms at 0 (never negative)', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(1200);
      addConsumed(300);
      expect(remaining()).toBe(900);
      
      addConsumed(1000);
      expect(remaining()).toBe(0); // Should not go negative
    });
  });

  describe('State properties', () => {
    it('initialCommuteSec is set correctly', () => {
      const { setInitial } = useTimeStore.getState();
      
      setInitial(1800);
      
      const state = useTimeStore.getState();
      expect(state.initialCommuteSec).toBe(1800);
    });

    it('consumedSec starts at 0', () => {
      const { setInitial } = useTimeStore.getState();
      
      setInitial(1200);
      
      const state = useTimeStore.getState();
      expect(state.consumedSec).toBe(0);
    });

    it('consumedSec increases with addConsumed', () => {
      const { setInitial, addConsumed } = useTimeStore.getState();
      
      setInitial(1200);
      addConsumed(100);
      
      let state = useTimeStore.getState();
      expect(state.consumedSec).toBe(100);
      
      addConsumed(200);
      
      state = useTimeStore.getState();
      expect(state.consumedSec).toBe(300);
    });
  });

  describe('Multiple operations', () => {
    it('handles multiple addConsumed calls correctly', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(1000);
      
      addConsumed(100);
      expect(remaining()).toBe(900);
      
      addConsumed(200);
      expect(remaining()).toBe(700);
      
      addConsumed(300);
      expect(remaining()).toBe(400);
      
      addConsumed(400);
      expect(remaining()).toBe(0);
    });

    it('can reset with setInitial after consumption', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(1000);
      addConsumed(500);
      expect(remaining()).toBe(500);
      
      // Reset to new initial value
      setInitial(2000);
      expect(remaining()).toBe(2000);
      
      const state = useTimeStore.getState();
      expect(state.consumedSec).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('handles zero initial time', () => {
      const { setInitial, remaining } = useTimeStore.getState();
      
      setInitial(0);
      
      expect(remaining()).toBe(0);
    });

    it('handles zero consumed time', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(1000);
      addConsumed(0);
      
      expect(remaining()).toBe(1000);
    });

    it('handles consuming exactly the initial amount', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(500);
      addConsumed(500);
      
      expect(remaining()).toBe(0);
    });

    it('handles consuming more than initial in one call', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(100);
      addConsumed(500);
      
      expect(remaining()).toBe(0); // Should not go negative
    });

    it('remaining() never returns negative even with large consumption', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(100);
      addConsumed(1000);
      addConsumed(1000);
      addConsumed(1000);
      
      expect(remaining()).toBe(0);
      expect(remaining()).toBeGreaterThanOrEqual(0);
    });

    it('handles very large time values', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      const largeValue = 86400; // 24 hours in seconds
      setInitial(largeValue);
      addConsumed(3600); // 1 hour
      
      expect(remaining()).toBe(82800); // 23 hours
    });
  });

  describe('Selector behavior', () => {
    it('remaining() is a computed value', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(1000);
      
      const firstRemaining = remaining();
      expect(firstRemaining).toBe(1000);
      
      addConsumed(250);
      
      const secondRemaining = remaining();
      expect(secondRemaining).toBe(750);
      
      // Verify it's computed, not cached
      expect(remaining()).toBe(750);
    });

    it('remaining() reflects state changes immediately', () => {
      const { setInitial, addConsumed, remaining } = useTimeStore.getState();
      
      setInitial(500);
      expect(remaining()).toBe(500);
      
      addConsumed(100);
      expect(remaining()).toBe(400);
      
      addConsumed(100);
      expect(remaining()).toBe(300);
    });
  });
});
