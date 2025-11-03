/**
 * Top-Up Controller
 * 
 * Manages automatic playlist top-ups by listening to player events
 * and calling the recommendation API when needed
 */

import { onPlayerEvent, type PlayerEvent } from './eventBus.js';
import { useTimeStore } from './timeStore.js';

/**
 * Configuration for the top-up controller
 */
export interface TopUpConfig {
  /** Function to get current queue video IDs for de-duplication */
  getQueueIds: () => string[];
  /** Function to get current topic */
  getTopic: () => string;
  /** Function to append new videos to the queue */
  appendToQueue: (items: any[]) => void;
}

/**
 * Minimum remaining seconds before stopping top-ups
 */
const TINY_REMAINDER_THRESHOLD = 30;

/**
 * Start the top-up controller
 * 
 * Subscribes to player events and triggers recommendations when:
 * - COMPLETE event: adds consumed time, then checks if top-up needed
 * - SKIP event: checks if top-up needed (no time consumption)
 * 
 * @param config - Controller configuration
 * @returns Stop function to unsubscribe
 */
export function startTopUpController(config: TopUpConfig): () => void {
  const { getQueueIds, getTopic, appendToQueue } = config;
  
  /**
   * Handle player events
   */
  const handleEvent = (event: PlayerEvent): void => {
    // Only handle COMPLETE and SKIP events
    if (event.type !== 'COMPLETE' && event.type !== 'SKIP') {
      return;
    }
    
    const { addConsumed, remaining } = useTimeStore.getState();
    
    // For COMPLETE events, add consumed time
    if (event.type === 'COMPLETE') {
      addConsumed(event.durationSec);
    }
    
    // Check if we need to top up
    const remainingSec = remaining();
    
    // Don't top up if remaining is too small
    if (remainingSec <= TINY_REMAINDER_THRESHOLD) {
      return;
    }
    
    // Trigger top-up
    triggerTopUp(remainingSec, getQueueIds(), getTopic(), appendToQueue);
  };
  
  // Subscribe to events
  const unsubscribe = onPlayerEvent(handleEvent);
  
  // Return stop function
  return unsubscribe;
}

/**
 * Trigger a top-up recommendation call
 */
async function triggerTopUp(
  remainingSeconds: number,
  excludeIds: string[],
  topic: string,
  appendToQueue: (items: any[]) => void
): Promise<void> {
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        remainingSeconds,
        excludeIds,
        topic,
      }),
    });
    
    if (!response.ok) {
      console.error('Top-up recommendation failed:', response.statusText);
      return;
    }
    
    const data = await response.json();
    
    // Append items to queue if present
    if (data.items) {
      appendToQueue(data.items);
    }
  } catch (error) {
    console.error('Top-up recommendation error:', error);
  }
}
