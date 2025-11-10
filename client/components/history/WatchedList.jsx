import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/WatchedList.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function WatchedList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicFilter = searchParams.get('topic');
  
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

  // Initial fetch and refetch on search change or topic filter
  useEffect(() => {
    fetchWatched();
  }, [user, searchDebounce, topicFilter]);
  
  // Filter items by topic if topic filter is active
  const filteredItems = topicFilter 
    ? items.filter(item => item.topicTags?.includes(topicFilter))
    : items;

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
  
  const handleWatchAgain = (item) => {
    // Create a single-video playlist and navigate to player
    const playlist = {
      items: [{
        videoId: item.videoId,
        title: item.title,
        thumbnail: `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
        durationSec: item.durationSec,
        channelTitle: item.channelTitle || 'Unknown'
      }]
    };
    
    const context = {
      topic: item.topicTags?.[0] || 'general',
      duration: item.durationSec
    };
    
    navigate('/player', { state: { playlist, context, startIndex: 0 } });
  };

  if (loading && items.length === 0) {
    return <div className="watched-loading">Loading...</div>;
  }

  return (
    <div className="watched-list">
      <div className="watched-header">
        <h2>Watched Videos {topicFilter && `- ${topicFilter}`}</h2>
        <input
          type="text"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="watched-search"
        />
      </div>
      
      {topicFilter && (
        <div className="watched-filter-badge">
          Filtering by topic: <strong>{topicFilter}</strong>
          <button onClick={() => navigate('/history')} className="clear-filter-btn">✕ Clear</button>
        </div>
      )}

      {error && <div className="watched-error">Error: {error}</div>}

      {filteredItems.length === 0 && !loading && (
        <div className="watched-empty">
          <p>No watched videos yet{topicFilter ? ` for "${topicFilter}"` : ''}.</p>
          <p className="watched-empty-hint">Complete a video to see it here!</p>
        </div>
      )}

      <div className="watched-items">
        {filteredItems.map((item) => (
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
            <button 
              onClick={() => handleWatchAgain(item)}
              className="watch-again-btn"
              title="Watch this video again"
            >
              ▶ Watch Again
            </button>
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