import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WatchedList from '../components/history/WatchedList';
import { useAuth } from '../context/AuthContext';

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('WatchedList Component', () => {
  const mockUser = { uid: 'test-user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
  });

  test('renders empty state when no items', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], nextCursor: null })
    });

    render(<WatchedList />);

    await waitFor(() => {
      expect(screen.getByText('No watched videos yet.')).toBeInTheDocument();
    });
  });

  test('renders list of watched videos', async () => {
    const mockItems = [
      {
        id: '1',
        title: 'Python Tutorial',
        durationSec: 600,
        completedAt: '2025-11-10T19:00:00.000Z',
        source: 'youtube',
        progressPct: 100
      },
      {
        id: '2',
        title: 'JavaScript Basics',
        durationSec: 300,
        completedAt: '2025-11-09T18:00:00.000Z',
        source: 'youtube',
        progressPct: 100
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems, nextCursor: null })
    });

    render(<WatchedList />);

    await waitFor(() => {
      expect(screen.getByText('Python Tutorial')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    });
  });

  test('search input filters results', async () => {
    // Initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], nextCursor: null })
    });

    render(<WatchedList />);

    const searchInput = await waitFor(() => 
      screen.getByPlaceholderText('Search by title...')
    );

    // Mock filtered results
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: '1',
          title: 'Python Tutorial',
          durationSec: 600,
          completedAt: '2025-11-10T19:00:00.000Z'
        }],
        nextCursor: null
      })
    });

    fireEvent.change(searchInput, { target: { value: 'python' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=python'),
        expect.any(Object)
      );
    }, { timeout: 500 });
  });

  test('load more button appends items', async () => {
    const firstPage = [
      { id: '1', title: 'Video 1', durationSec: 600, completedAt: '2025-11-10T19:00:00.000Z' }
    ];
    const secondPage = [
      { id: '2', title: 'Video 2', durationSec: 300, completedAt: '2025-11-09T18:00:00.000Z' }
    ];

    // First fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: firstPage, nextCursor: 'cursor123' })
    });

    render(<WatchedList />);

    await waitFor(() => {
      expect(screen.getByText('Video 1')).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByText('Load More');
    expect(loadMoreBtn).toBeInTheDocument();

    // Second fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: secondPage, nextCursor: null })
    });

    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Video 2')).toBeInTheDocument();
    });

    // Load more button should disappear
    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  test('disables load more button when loading', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: '1', title: 'Video 1', durationSec: 600, completedAt: '2025-11-10T19:00:00.000Z' }],
        nextCursor: 'cursor123'
      })
    });

    render(<WatchedList />);

    await waitFor(() => {
      expect(screen.getByText('Video 1')).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByText('Load More');
    
    // Mock slow response
    fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  test('displays error message on fetch failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<WatchedList />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});