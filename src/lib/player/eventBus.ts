/**
 * Player Event Bus
 * 
 * Typed pub/sub system for player telemetry events
 */

/**
 * Player event types
 */
export type PlayerEvent =
  | {
      type: 'PLAY';
      videoId: string;
      atSec: number;
    }
  | {
      type: 'PAUSE';
      videoId: string;
      atSec: number;
    }
  | {
      type: 'SKIP';
      videoId: string;
      atSec: number;
    }
  | {
      type: 'COMPLETE';
      videoId: string;
      durationSec: number;
    }
  | {
      type: 'ERROR';
      videoId: string;
      message: string;
    };

/**
 * Event handler function type
 */
export type PlayerEventHandler = (event: PlayerEvent) => void;

/**
 * Unsubscribe function type
 */
export type UnsubscribeFn = () => void;

/**
 * Internal list of event handlers
 */
const handlers: Set<PlayerEventHandler> = new Set();

/**
 * Subscribe to player events
 * 
 * @param handler - Function to call when events are emitted
 * @returns Unsubscribe function
 */
export function onPlayerEvent(handler: PlayerEventHandler): UnsubscribeFn {
  handlers.add(handler);
  
  // Return unsubscribe function
  return () => {
    handlers.delete(handler);
  };
}

/**
 * Emit a player event to all subscribers
 * 
 * @param event - Event to emit
 */
export function emitPlayerEvent(event: PlayerEvent): void {
  // Call each handler with the event
  handlers.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      // Prevent one handler's error from affecting others
      console.error('Error in player event handler:', error);
    }
  });
}
