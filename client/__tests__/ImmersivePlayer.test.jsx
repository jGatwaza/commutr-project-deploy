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
const mockUser = { uid: 'test-user-123' };
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
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

describe('ImmersivePlayer commute completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('completing a commute saves session with real user ID', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, id: 'commute-123' })
    });

    const mockNavigate = jest.fn();
    require('react-router-dom').useNavigate = () => mockNavigate;

    render(<ImmersivePlayer />);

    // Click "End Commute" button
    const endButton = screen.getByText('End Commute');
    await act(async () => {
      fireEvent.click(endButton);
    });

    // Verify commute history API was called with correct user ID
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/commute-history'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('test-user-123')
      })
    );
  });

  test('completion screen shows with Go Home button', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ImmersivePlayer />);

    // Click "End Commute" button
    const endButton = screen.getByText('End Commute');
    await act(async () => {
      fireEvent.click(endButton);
    });

    // Verify completion screen appears
    expect(screen.getByText('Commute Complete!')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
    expect(screen.getByText('Create New Playlist')).toBeInTheDocument();
  });

  test('Go Home button navigates to home page', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const mockNavigate = jest.fn();
    require('react-router-dom').useNavigate = () => mockNavigate;

    render(<ImmersivePlayer />);

    // End commute
    const endButton = screen.getByText('End Commute');
    await act(async () => {
      fireEvent.click(endButton);
    });

    // Click Go Home
    const goHomeButton = screen.getByText('Go Home');
    fireEvent.click(goHomeButton);

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/home');
    expect(mockEndCommute).toHaveBeenCalled();
  });

  test('does not save commute if user is not authenticated', async () => {
    // Temporarily mock no user
    jest.resetModules();
    jest.mock('../context/AuthContext', () => ({
      useAuth: () => ({ user: null })
    }));

    global.fetch = jest.fn();

    const ImmersivePlayerNoAuth = require('../pages/ImmersivePlayer.jsx').default;
    render(<ImmersivePlayerNoAuth />);

    const endButton = screen.queryByText('End Commute');
    if (endButton) {
      await act(async () => {
        fireEvent.click(endButton);
      });
    }

    // Should not call commute history API without user
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/commute-history'),
      expect.anything()
    );
  });
});
