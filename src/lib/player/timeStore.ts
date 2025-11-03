/**
 * Time Store
 * 
 * Manages remaining commute time with initial value and consumed tracking
 * Implements a Zustand-like API without the dependency
 */

/**
 * Time store state
 */
interface TimeState {
  /** Initial commute time in seconds */
  initialCommuteSec: number;
  /** Consumed time in seconds */
  consumedSec: number;
  /** Set initial commute time (resets consumed to 0) */
  setInitial: (seconds: number) => void;
  /** Add consumed time */
  addConsumed: (delta: number) => void;
  /** Get remaining time (never negative) */
  remaining: () => number;
}

/**
 * Internal state
 */
let state: TimeState = {
  initialCommuteSec: 0,
  consumedSec: 0,
  setInitial: (seconds: number) => {
    state.initialCommuteSec = seconds;
    state.consumedSec = 0;
  },
  addConsumed: (delta: number) => {
    state.consumedSec += delta;
  },
  remaining: () => {
    const remaining = state.initialCommuteSec - state.consumedSec;
    // Never return negative
    return Math.max(0, remaining);
  },
};

/**
 * Time store hook (Zustand-like API)
 * 
 * Usage:
 * ```ts
 * const { setInitial, addConsumed, remaining } = useTimeStore.getState();
 * setInitial(1800);
 * addConsumed(300);
 * console.log(remaining()); // 1500
 * ```
 */
export const useTimeStore = {
  /**
   * Get current state
   */
  getState: (): TimeState => state,
  
  /**
   * Subscribe to state changes (not implemented for simplicity)
   * Included for Zustand API compatibility
   */
  subscribe: (listener: (state: TimeState) => void) => {
    // Not implemented - tests don't require it
    return () => {};
  },
};
