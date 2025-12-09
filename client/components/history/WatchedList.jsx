import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCommute } from '../../context/CommuteContext';
import { buildApiUrl, getAuthHeaders } from '../../config/api';
import '../../styles/WatchedList.css';
import VideoModal from '../VideoModal';
import { recordWatchAgain } from '../../utils/watchHistoryActions';

const API_BASE = buildApiUrl();

function WatchedList() {
  const { user } = useAuth();
  const { startCommute } = useCommute();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicFilter = searchParams.get('topic');
  
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalVideo, setModalVideo] = useState(null);

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
      
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?${params}`, {
        headers: authHeaders
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
  let filteredItems = topicFilter 
    ? items.filter(item => item.topicTags?.includes(topicFilter))
    : items;
  
  // Apply additional filters
  if (filterTopic) {
    filteredItems = filteredItems.filter(item => item.topicTags?.includes(filterTopic));
  }
  if (filterSource) {
    filteredItems = filteredItems.filter(item => item.source === filterSource);
  }
  
  // Get unique topics and sources for filter dropdowns
  const uniqueTopics = [...new Set(items.flatMap(item => item.topicTags || []))].sort();
  const uniqueSources = [...new Set(items.map(item => item.source).filter(Boolean))].sort();

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
  
  const handleWatchAgain = async (item) => {
    if (!user) {
      return;
    }

    try {
      await recordWatchAgain(user, item);
    } catch (error) {
      console.error('Failed to record rewatch:', error);
    }

    setModalVideo({
      videoId: item.videoId,
      title: item.title
    });
  };

  if (loading && items.length === 0) {
    return <div className="watched-loading">Loading...</div>;
  }

  return (
    <div className="watched-list">
      <div className="watched-header">
        <h2>Watched Videos {topicFilter && `- ${topicFilter}`}</h2>
        <div className="watched-header-controls">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchWatched()}
              className="watched-search"
            />
            <button 
              onClick={() => fetchWatched()}
              className="search-btn"
              title="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="filter-toggle-link"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Filters {(filterTopic || filterSource) ? `(${[filterTopic, filterSource].filter(Boolean).length})` : ''}
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="watched-filters">
          <div className="filter-group">
            <label>Topic:</label>
            <select 
              value={filterTopic} 
              onChange={(e) => setFilterTopic(e.target.value)}
              className="filter-select"
            >
              <option value="">All Topics</option>
              {uniqueTopics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Source:</label>
            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value)}
              className="filter-select"
            >
              <option value="">All Sources</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          {(filterTopic || filterSource) && (
            <button 
              onClick={() => { setFilterTopic(''); setFilterSource(''); }}
              className="clear-all-filters-btn"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
      
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
            <img 
              src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
              alt={item.title}
              className="watched-thumbnail"
            />
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

      {modalVideo && (
        <VideoModal
          videoId={modalVideo.videoId}
          title={modalVideo.title}
          onClose={() => setModalVideo(null)}
        />
      )}

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
