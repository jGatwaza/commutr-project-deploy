# Player Infrastructure Integration Guide

This guide explains how to integrate the player infrastructure modules (event bus, time store, and top-up controller) into the Dynamic Player.

## Overview

The player infrastructure provides:

1. **Event Bus** (`eventBus.ts`) - Typed pub/sub for player telemetry
2. **Time Store** (`timeStore.ts`) - Remaining commute time tracking
3. **Top-Up Controller** (`topUpController.ts`) - Automatic playlist recommendations

## Quick Start

### 1. Initialize Time Store

Set the initial commute time when the player loads:

```typescript
import { useTimeStore } from '@/lib/player/timeStore';

// On player page load
const { setInitial } = useTimeStore.getState();
setInitial(totalCommuteSeconds); // e.g., 1800 for 30 minutes
```

### 2. Start Top-Up Controller

Instantiate the controller inside your player component:

```typescript
import { startTopUpController } from '@/lib/player/topUpController';
import { useEffect } from 'react';

function PlayerPage() {
  useEffect(() => {
    // Start controller
    const stop = startTopUpController({
      getQueueIds: () => {
        // Return array of canonical video IDs currently in queue
        // This is used for de-duplication in recommendations
        return currentQueue.map(video => video.id);
      },
      getTopic: () => {
        // Return current topic/category
        return currentTopic; // e.g., 'javascript', 'react', etc.
      },
      appendToQueue: (items) => {
        // Add recommended videos to the queue
        setQueue(prev => [...prev, ...items]);
      },
    });

    // Cleanup on unmount
    return () => stop();
  }, []);

  // ... rest of component
}
```

### 3. Emit Player Events

Emit events as the player state changes:

```typescript
import { emitPlayerEvent } from '@/lib/player/eventBus';

// When video starts playing
emitPlayerEvent({
  type: 'PLAY',
  videoId: 'vid123',
  atSec: 0,
});

// When video is paused
emitPlayerEvent({
  type: 'PAUSE',
  videoId: 'vid123',
  atSec: 45,
});

// When user skips to next video
emitPlayerEvent({
  type: 'SKIP',
  videoId: 'vid123',
  atSec: 30,
});

// When video completes
emitPlayerEvent({
  type: 'COMPLETE',
  videoId: 'vid123',
  durationSec: 300,
});

// On playback error
emitPlayerEvent({
  type: 'ERROR',
  videoId: 'vid123',
  message: 'Failed to load video',
});
```

## Detailed Integration

### Event Bus

The event bus is a typed pub/sub system for player telemetry.

#### Supported Events

```typescript
type PlayerEvent =
  | { type: 'PLAY'; videoId: string; atSec: number }
  | { type: 'PAUSE'; videoId: string; atSec: number }
  | { type: 'SKIP'; videoId: string; atSec: number }
  | { type: 'COMPLETE'; videoId: string; durationSec: number }
  | { type: 'ERROR'; videoId: string; message: string };
```

#### Subscribe to Events

```typescript
import { onPlayerEvent } from '@/lib/player/eventBus';

const unsubscribe = onPlayerEvent((event) => {
  console.log('Player event:', event);
  
  if (event.type === 'COMPLETE') {
    console.log(`Video ${event.videoId} completed (${event.durationSec}s)`);
  }
});

// Later, unsubscribe
unsubscribe();
```

### Time Store

Manages remaining commute time with consumed time tracking.

#### API

```typescript
import { useTimeStore } from '@/lib/player/timeStore';

const { setInitial, addConsumed, remaining } = useTimeStore.getState();

// Set initial commute time (resets consumed to 0)
setInitial(1800); // 30 minutes

// Add consumed time
addConsumed(300); // 5 minutes watched

// Get remaining time (never negative)
const remainingSec = remaining(); // 1500 seconds
```

#### State Properties

```typescript
const state = useTimeStore.getState();
console.log(state.initialCommuteSec); // Initial time set
console.log(state.consumedSec);       // Total consumed time
console.log(state.remaining());        // Computed remaining (never < 0)
```

### Top-Up Controller

Automatically triggers playlist recommendations based on player events.

#### Configuration

```typescript
interface TopUpConfig {
  /** Get current queue video IDs for de-duplication */
  getQueueIds: () => string[];
  
  /** Get current topic for filtering recommendations */
  getTopic: () => string;
  
  /** Append new videos to the queue */
  appendToQueue: (items: Video[]) => void;
}
```

#### Behavior

The controller:

1. **On COMPLETE event:**
   - Adds `durationSec` to consumed time
   - Checks if remaining time > 30 seconds
   - If yes, calls POST `/api/recommend` with current state
   - Appends returned videos to queue

2. **On SKIP event:**
   - Does NOT add consumed time
   - Checks if remaining time > 30 seconds
   - If yes, calls POST `/api/recommend` with current state
   - Appends returned videos to queue

3. **Ignores:**
   - PLAY, PAUSE, ERROR events
   - Any event when remaining ≤ 30 seconds (tiny remainder guard)

#### API Call Format

The controller calls `/api/recommend` with:

```json
{
  "remainingSeconds": 1500,
  "excludeIds": ["vid1", "vid2", "vid3"],
  "topic": "javascript"
}
```

## Important Notes

### Canonical Video IDs

**Critical:** `getQueueIds()` must return **canonical video IDs** that match the `id` field in your video objects. This ensures proper de-duplication.

```typescript
// ✅ Correct
getQueueIds: () => queue.map(v => v.id)

// ❌ Wrong - using different identifier
getQueueIds: () => queue.map(v => v.youtubeId)
```

The recommendation API uses these IDs to exclude videos already in the queue.

### Topic Consistency

Ensure the topic returned by `getTopic()` matches the topic tags in your video database:

```typescript
// Video in database
{
  id: 'vid1',
  topicTags: ['javascript', 'react', 'frontend']
}

// getTopic should return one of these tags
getTopic: () => 'javascript' // ✅ Will match
getTopic: () => 'JavaScript' // ✅ Case-insensitive matching
getTopic: () => 'js'         // ❌ Won't match
```

### Tiny Remainder Guard

The controller stops making recommendations when remaining time ≤ 30 seconds. This prevents:
- Unnecessary API calls near the end of commute
- Adding videos that won't be watched
- Cluttering the queue with unused content

### Error Handling

The controller handles errors gracefully:
- Network failures are logged but don't crash the player
- Failed API calls don't prevent future recommendations
- Empty recommendation responses are handled correctly

## Example: Complete Integration

```typescript
import { useEffect, useState } from 'react';
import { useTimeStore } from '@/lib/player/timeStore';
import { startTopUpController } from '@/lib/player/topUpController';
import { emitPlayerEvent } from '@/lib/player/eventBus';

function DynamicPlayer({ initialCommuteSec, initialTopic }) {
  const [queue, setQueue] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [topic, setTopic] = useState(initialTopic);

  // Initialize time store
  useEffect(() => {
    const { setInitial } = useTimeStore.getState();
    setInitial(initialCommuteSec);
  }, [initialCommuteSec]);

  // Start top-up controller
  useEffect(() => {
    const stop = startTopUpController({
      getQueueIds: () => queue.map(v => v.id),
      getTopic: () => topic,
      appendToQueue: (items) => {
        console.log(`Adding ${items.length} videos to queue`);
        setQueue(prev => [...prev, ...items]);
      },
    });

    return () => stop();
  }, [queue, topic]);

  // Handle video completion
  const handleVideoComplete = (video: Video) => {
    emitPlayerEvent({
      type: 'COMPLETE',
      videoId: video.id,
      durationSec: video.durationSec,
    });

    // Play next video
    if (queue.length > 0) {
      setCurrentVideo(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  };

  // Handle skip
  const handleSkip = () => {
    if (!currentVideo) return;

    emitPlayerEvent({
      type: 'SKIP',
      videoId: currentVideo.id,
      atSec: getCurrentPlaybackTime(),
    });

    // Play next video
    if (queue.length > 0) {
      setCurrentVideo(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  };

  // Display remaining time
  const { remaining } = useTimeStore.getState();
  const remainingMin = Math.floor(remaining() / 60);

  return (
    <div>
      <div>Remaining: {remainingMin} minutes</div>
      <VideoPlayer
        video={currentVideo}
        onComplete={handleVideoComplete}
        onSkip={handleSkip}
      />
      <Queue videos={queue} />
    </div>
  );
}
```

## Testing

All modules have comprehensive test coverage:

- `eventBus.test.ts` - 12 tests covering pub/sub behavior
- `timeStore.test.ts` - 16 tests covering state management
- `topUpController.test.ts` - 14 tests covering integration scenarios

Run tests with:

```bash
npm test -- src/lib/player/__tests__/
```

## Architecture

```
┌─────────────────┐
│  Dynamic Player │
└────────┬────────┘
         │
         ├─── emitPlayerEvent(COMPLETE/SKIP)
         │
         v
    ┌─────────┐
    │EventBus │
    └────┬────┘
         │
         v
┌────────────────────┐
│ TopUpController    │
│ - listens to events│
│ - checks remaining │
│ - calls API        │
└────────┬───────────┘
         │
         ├─── addConsumed() ──> TimeStore
         │
         └─── POST /api/recommend ──> Recommendation API
                     │
                     v
              appendToQueue(items)
```

## Support

For issues or questions:
1. Check test files for expected behavior
2. Review API contract in `docs/CONTRACTS.md`
3. Ensure canonical IDs are used consistently
