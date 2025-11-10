import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/WatchedList.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function WatchedList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch watched videos
  const fetchWatched = async (cursor = null, append = false) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        userId: user.uid,
        limit: '20'
      });
      
      if (cursor) params.append('cursor', cursor);
      if (searchDebounce) params.append('q', searchDebounce);
      
      const res = await fetch(`${API_BASE}/api/history/watch?${params}`, {
        headers: { Authorization: AUTH_TOKEN }
      });
      
      if (!res.ok) throw new Error('Failed to fetch watched history');
      
      const data = await res.json();
      
      setItems(append ? [...items, ...data.items] : data.items);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refetch on search change
  useEffect(() => {
    fetchWatched();
  }, [user, searchDebounce]);

  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      fetchWatched(nextCursor, true);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (iso) => {
    if (!iso) return 'N/A';
    const date = new Date(iso);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading && items.length === 0) {
    return <div className="watched-loading">Loading...</div>;
  }

  return (
    <div className="watched-list">
      <div className="watched-header">
        <h2>Watched Videos</h2>
        <input
          type="text"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="watched-search"
        />
      </div>

      {error && <div className="watched-error">Error: {error}</div>}

      {items.length === 0 && !loading && (
        <div className="watched-empty">
          <p>No watched videos yet.</p>
          <p className="watched-empty-hint">Complete a video to see it here!</p>
        </div>
      )}

      <div className="watched-items">
        {items.map((item) => (
          <div key={item.id} className="watched-item">
            <div className="watched-item-main">
              <h3>{item.title}</h3>
              <div className="watched-item-meta">
                <span className="watched-date" title={item.completedAt}>
                  {formatDate(item.completedAt)}
                </span>
                <span className="watched-duration">{formatDuration(item.durationSec)}</span>
                {item.source && <span className="watched-source">{item.source}</span>}
                {item.progressPct && <span className="watched-progress">{item.progressPct}%</span>}
              </div>
              {item.topicTags && item.topicTags.length > 0 && (
                <div className="watched-tags">
                  {item.topicTags.map((tag, i) => (
                    <span key={i} className="watched-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {nextCursor && (
        <button
          onClick={handleLoadMore}
          disabled={loading}
          className="watched-load-more"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

export default WatchedList;