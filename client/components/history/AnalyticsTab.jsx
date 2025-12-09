import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import VideoModal from '../VideoModal';
import '../../styles/AnalyticsTab.css';
import { buildApiUrl, getAuthHeaders } from '../../config/api';
import { recordWatchAgain } from '../../utils/watchHistoryActions';

const API_BASE = buildApiUrl();

function AnalyticsTab({ onSwitchToWatched }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drillDownView, setDrillDownView] = useState(null); // { type, title, filter }
  const [drillDownVideos, setDrillDownVideos] = useState([]);
  const [modalVideo, setModalVideo] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [user, timeframe]);

  const loadAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        userId: user.uid,
        timeframe
      });
      
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/analytics?${params}`, {
        headers: authHeaders
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch analytics');
      }
      
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchVideosForTopic = async (topic) => {
    if (!user) return;
    try {
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?userId=${user.uid}&limit=50`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      // Filter by topic
      const filtered = data.items.filter(item => item.topicTags?.includes(topic));
      setDrillDownVideos(filtered);
      setDrillDownView({ type: 'topic', title: `${topic} Videos`, filter: topic });
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const fetchVideosForCommuteLength = async (length) => {
    if (!user) return;
    try {
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?userId=${user.uid}&limit=50`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      // Filter by commute length (approximate based on video duration)
      const lengthMinutes = parseInt(length);
      const filtered = data.items.filter(item => {
        const videoMins = Math.ceil(item.durationSec / 60);
        return videoMins >= lengthMinutes - 2 && videoMins <= lengthMinutes + 2;
      });
      setDrillDownVideos(filtered);
      setDrillDownView({ type: 'commuteLength', title: `${length} Commute Videos`, filter: length });
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const fetchVideosForTimeOfDay = async (period) => {
    if (!user) return;
    try {
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?userId=${user.uid}&limit=50`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      // Filter by time of day based on completedAt timestamp
      const filtered = data.items.filter(item => {
        const date = new Date(item.completedAt);
        const hour = date.getHours();
        
        if (period === 'morning') return hour >= 5 && hour < 12;
        if (period === 'afternoon') return hour >= 12 && hour < 18;
        if (period === 'evening') return hour >= 18 || hour < 5;
        return false;
      });
      setDrillDownVideos(filtered);
      setDrillDownView({ type: 'timeOfDay', title: `${period.charAt(0).toUpperCase() + period.slice(1)} Videos`, filter: period });
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const [recentVideos, setRecentVideos] = useState([]);

  useEffect(() => {
    if (user && analytics) {
      fetchRecentVideosInline();
    }
  }, [user, analytics]);

  const fetchRecentVideosInline = async () => {
    if (!user) return;
    try {
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?userId=${user.uid}&limit=5`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      setRecentVideos(data.items);
    } catch (err) {
      console.error('Error fetching recent videos:', err);
    }
  };

  const fetchRecentVideos = async () => {
    if (!user) return;
    try {
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?userId=${user.uid}&limit=5`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      setDrillDownVideos(data.items);
      setDrillDownView({ type: 'recent', title: 'Recently Watched', filter: null });
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}min ago`;
    if (diffHours < 24) return `${diffHours}hr ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const fetchAllVideos = async () => {
    if (!user) return;
    try {
      const authHeaders = await getAuthHeaders(user);
      const res = await fetch(`${API_BASE}/api/history/watch?userId=${user.uid}&limit=50`, {
        headers: authHeaders
      });
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      setDrillDownVideos(data.items);
      setDrillDownView({ type: 'all', title: 'All Watched Videos', filter: null });
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const handleWatchAgain = async (item) => {
    if (user) {
      try {
        await recordWatchAgain(user, item);
      } catch (error) {
        console.error('Failed to record rewatch:', error);
      }
    }

    setModalVideo({
      videoId: item.videoId,
      title: item.title
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-error">Error: {error}</div>;
  }

  if (!analytics) {
    return <div className="analytics-empty">No analytics data available</div>;
  }

  // Drill-down view
  if (drillDownView) {
    return (
      <div className="analytics-container">
        <div className="drill-down-header">
          <button className="back-btn-analytics" onClick={() => setDrillDownView(null)}>
            ← Back to Analytics
          </button>
          <h2>{drillDownView.title}</h2>
        </div>
        
        <div className="drill-down-videos">
          {drillDownVideos.length === 0 ? (
            <div className="drill-down-empty">No videos found</div>
          ) : (
            drillDownVideos.map((item, idx) => (
              <div key={idx} className="drill-down-video-item">
                <img 
                  src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                  alt={item.title}
                  className="drill-down-thumbnail"
                />
                <div className="drill-down-video-main">
                  <h3>{item.title}</h3>
                  <div className="drill-down-video-meta">
                    <span className="drill-down-date">{formatDate(item.completedAt)}</span>
                    <span className="drill-down-duration">{formatDuration(item.durationSec)}</span>
                    {item.source && <span className="drill-down-source">{item.source}</span>}
                  </div>
                  {item.topicTags && item.topicTags.length > 0 && (
                    <div className="drill-down-tags">
                      {item.topicTags.map((tag, i) => (
                        <span key={i} className="drill-down-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleWatchAgain(item)}
                  className="drill-down-watch-btn"
                  title="Watch this video again"
                >
                  ▶ Watch Again
                </button>
              </div>
            ))
          )}
        </div>
        
        {modalVideo && (
          <VideoModal
            videoId={modalVideo.videoId}
            title={modalVideo.title}
            onClose={() => setModalVideo(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Timeframe Filter */}
      <div className="analytics-header">
        <h2>Your Learning Analytics</h2>
        <div className="timeframe-selector">
          <button
            className={`timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button
            className={`timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
          <button
            className={`timeframe-btn ${timeframe === 'all' ? 'active' : ''}`}
            onClick={() => setTimeframe('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card streak">
          <div className="card-icon">🔥</div>
          <div className="card-content">
            <div className="card-value">{analytics.streak}</div>
            <div className="card-label">Day Streak</div>
          </div>
        </div>

        <div className="summary-card videos-watched">
          <div className="card-icon">🎬</div>
          <div className="card-content">
            <div className="card-value">{analytics.completionRate.totalVideos}</div>
            <div className="card-label">Videos Watched</div>
          </div>
        </div>
      </div>

      {/* By Topic */}
      {analytics.byTopic.length > 0 && (
        <div className="analytics-section">
          <h3 className="section-title">📚 Top Topics</h3>
          <div className="topic-list">
            {analytics.byTopic.slice(0, 5).map((item, idx) => {
              const percentage = item.avgCompletion; // Use actual completion percentage
              return (
                <div 
                  key={idx} 
                  className="topic-item clickable"
                  onClick={() => fetchVideosForTopic(item.topic)}
                  title={`Click to view ${item.topic} videos`}
                >
                  <div className="topic-info">
                    <div className="topic-name">{item.topic}</div>
                    <div className="topic-meta">
                      {item.videoCount} videos · {formatDuration(item.totalDuration)}
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  <div className="topic-completion">
                    {item.avgCompletion.toFixed(0)}% avg
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Commute Length */}
      <div className="analytics-section">
        <h3 className="section-title">
          ⏱️ By Commute Length
          <button 
            className="view-all-btn"
            onClick={fetchAllVideos}
            title="View all watched videos"
          >
            View All Videos →
          </button>
        </h3>
        <div className="commute-list">
          {['5min', '10min', '15min'].map((length) => {
            const item = analytics.byCommuteLength?.find(c => c.commuteLength === length) || { 
              commuteLength: length, 
              videoCount: 0, 
              totalDuration: 0 
            };
            const totalVideos = analytics.byCommuteLength?.reduce((sum, c) => sum + c.videoCount, 0) || 1;
            const percentage = totalVideos > 0 ? (item.videoCount / totalVideos) * 100 : 0;
            return (
              <div 
                key={length} 
                className={`commute-item ${item.videoCount > 0 ? 'clickable' : ''}`}
                onClick={() => item.videoCount > 0 && fetchVideosForCommuteLength(length)}
                title={item.videoCount > 0 ? `Click to view ${length} videos` : 'No videos for this length'}
              >
                <div className="commute-length">{item.commuteLength}</div>
                <div className="commute-stats-full">
                  <div className="commute-count">{item.videoCount} videos ({percentage.toFixed(0)}%)</div>
                  {item.totalDuration > 0 && (
                    <div className="commute-duration">{formatDuration(item.totalDuration)}</div>
                  )}
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.videoCount > 0 ? '#4CAF50' : '#E0E0E0'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Time of Day */}
      <div className="analytics-section">
        <h3 className="section-title">🌅 Watch Patterns</h3>
        <div className="timeofday-list">
          {['morning', 'afternoon', 'evening']
            .map((period) => {
              const item = analytics.byTimeOfDay?.find(t => t.timePeriod === period) || {
                timePeriod: period,
                videoCount: 0,
                totalDuration: 0
              };
              return { period, item };
            })
            .sort((a, b) => b.item.videoCount - a.item.videoCount)
            .map(({ period, item }) => {
              const totalVideos = analytics.byTimeOfDay?.reduce((sum, t) => sum + t.videoCount, 0) || 1;
              const percentage = totalVideos > 0 ? (item.videoCount / totalVideos) * 100 : 0;
              
              // Get emoji for time period
              const emoji = period === 'morning' ? '🌅' : period === 'afternoon' ? '☀️' : '🌙';
              
              return (
                <div 
                  key={period} 
                  className={`timeofday-item-enhanced ${item.videoCount > 0 ? 'clickable' : ''}`}
                  onClick={() => item.videoCount > 0 && fetchVideosForTimeOfDay(period)}
                  title={item.videoCount > 0 ? `Click to view ${period} videos` : 'No videos for this period'}
                >
                  <div className="timeofday-header">
                    <span className="timeofday-emoji">{emoji}</span>
                    <span className="timeofday-name">
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </span>
                  </div>
                  <div className="timeofday-stats-enhanced">
                    <div className="timeofday-count">
                      {item.videoCount} videos ({percentage.toFixed(0)}%)
                    </div>
                    {item.totalDuration > 0 && (
                      <div className="timeofday-duration">{formatDuration(item.totalDuration)}</div>
                    )}
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: item.videoCount > 0 ? '#4CAF50' : '#E0E0E0'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        
        {/* Learning Time Insight */}
        {(() => {
          const totalVideos = analytics.byTimeOfDay?.reduce((sum, t) => sum + t.videoCount, 0) || 0;
          if (totalVideos === 0) {
            return <p className="learning-insight">Start watching to discover your best learning time</p>;
          }
          
          const sortedPeriods = [...(analytics.byTimeOfDay || [])].sort((a, b) => b.videoCount - a.videoCount);
          const topPeriod = sortedPeriods[0];
          const secondPeriod = sortedPeriods[1];
          
          // Check if balanced (difference less than 20%)
          if (sortedPeriods.length >= 2 && topPeriod.videoCount > 0 && secondPeriod.videoCount > 0) {
            const diff = ((topPeriod.videoCount - secondPeriod.videoCount) / topPeriod.videoCount) * 100;
            if (diff < 20) {
              return <p className="learning-insight">✨ You learn throughout the day - nice balance!</p>;
            }
          }
          
          return (
            <p className="learning-insight">
              🎯 Your best learning time: <strong>{topPeriod.timePeriod.charAt(0).toUpperCase() + topPeriod.timePeriod.slice(1)}</strong>
            </p>
          );
        })()}
      </div>

      {/* Recently Watched */}
      <div className="analytics-section">
        <h3 className="section-title">🕐 Recently Watched</h3>
        {recentVideos.length > 0 ? (
          <div className="recent-videos-list">
            {recentVideos.map((video, idx) => (
              <div key={idx} className="recent-video-item" onClick={() => handleWatchAgain(video)}>
                <div className="recent-video-number">{idx + 1}</div>
                <div className="recent-video-info">
                  <div className="recent-video-title">{video.title}</div>
                  <div className="recent-video-meta">
                    <span className="recent-time-ago">{formatTimeAgo(video.completedAt)}</span>
                    <span className="recent-duration">{formatDuration(video.durationSec)}</span>
                    {video.topicTags && video.topicTags.length > 0 && (
                      <span className="recent-topic">{video.topicTags[0]}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-description">No recent videos found</p>
        )}
      </div>

      {/* Empty State */}
      {analytics.byTopic.length === 0 && analytics.completionRate.totalVideos === 0 && (
        <div className="analytics-empty">
          <p>No analytics data for this timeframe.</p>
          <p className="analytics-empty-hint">Watch some videos to see your learning insights!</p>
        </div>
      )}
    </div>
  );
}

export default AnalyticsTab;
