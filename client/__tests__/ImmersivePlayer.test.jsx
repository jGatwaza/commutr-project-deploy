import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ImmersivePlayer from '../pages/ImmersivePlayer.jsx';

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    state: {
      playlist: {
        items: [
          { videoId: 'vid-1', title: 'Video 1', durationSec: 1 },
          { videoId: 'vid-2', title: 'Video 2', durationSec: 1 },
          { videoId: 'vid-3', title: 'Video 3', durationSec: 1 },
        ],
      },
      context: { topic: 'test-topic' },
      startIndex: 0,
    },
  }),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// Mock CommuteContext
const mockGetRemainingTime = jest.fn(() => 600);
const mockSaveVideoPosition = jest.fn();
const mockGetVideoPosition = jest.fn(() => 0);
const mockEndCommute = jest.fn();

jest.mock('../context/CommuteContext', () => ({
  useCommute: () => ({
    commuteStartTime: Date.now(),
    totalDuration: 600,
    watchedVideoIds: [],
    topicsLearned: [],
    startCommute: jest.fn(),
    addWatchedVideo: jest.fn(),
    getRemainingTime: mockGetRemainingTime,
    saveVideoPosition: mockSaveVideoPosition,
    getVideoPosition: mockGetVideoPosition,
    endCommute: mockEndCommute,
  }),
}));

describe('ImmersivePlayer navigation', () => {
  const realDateNow = Date.now;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    // @ts-ignore
    Date.now = realDateNow;
  });

  test('Skip Video advances through playlist and does not go out of bounds', () => {
    const { container } = render(<ImmersivePlayer />);

    const skipButton = screen.getByText('Skip Video');

    const getIframe = () => container.querySelector('iframe');

    // Initial video should be vid-1
    let iframe = getIframe();
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('vid-1');

    // First skip: 0 -> 1
    fireEvent.click(skipButton);
    iframe = getIframe();
    expect(iframe.src).toContain('vid-2');

    // Second skip: 1 -> 2
    fireEvent.click(skipButton);
    iframe = getIframe();
    expect(iframe.src).toContain('vid-3');

    // Third skip: stays on last item (index capped), no out-of-bounds
    fireEvent.click(skipButton);
    iframe = getIframe();
    expect(iframe.src).toContain('vid-3');
  });

  test('video end auto-advances to next video when available', () => {
    jest.useFakeTimers();

    // Control Date.now so the internal elapsed time check can trigger handleVideoEnd
    let now = 0;
    // @ts-ignore
    Date.now = jest.fn(() => now);

    const { container } = render(<ImmersivePlayer />);

    // First video: start at 0, then advance "clock" so estimated position >= durationSec (1s)
    now = 2000;

    act(() => {
      jest.advanceTimersByTime(10000); // trigger the 10s interval effect for first video
    });

    let iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('vid-2');

    // Second video: reset mocked time forward again and advance timers to trigger second auto-advance
    now = 4000;

    act(() => {
      jest.advanceTimersByTime(10000); // trigger the 10s interval effect for second video
    });

    iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('vid-3');
  });
});
