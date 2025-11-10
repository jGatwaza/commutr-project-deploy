import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/AnalyticsTab.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function AnalyticsTab() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      const res = await fetch(`${API_BASE}/api/history/analytics?${params}`, {
        headers: { Authorization: AUTH_TOKEN }
      });
      
      if (!res.ok) throw new Error('Failed to fetch analytics');
      
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
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

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-error">Error: {error}</div>;
  }

  if (!analytics) {
    return <div className="analytics-empty">No analytics data available</div>;
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

        <div className="summary-card completion">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-value">{analytics.completionRate.completionRate.toFixed(1)}%</div>
            <div className="card-label">Completion Rate</div>
            <div className="card-subtitle">{analytics.completionRate.totalVideos} videos</div>
          </div>
        </div>
      </div>

      {/* By Topic */}
      {analytics.byTopic.length > 0 && (
        <div className="analytics-section">
          <h3 className="section-title">📚 Top Topics</h3>
          <div className="topic-list">
            {analytics.byTopic.slice(0, 5).map((item, idx) => (
              <div key={idx} className="topic-item">
                <div className="topic-info">
                  <div className="topic-name">{item.topic}</div>
                  <div className="topic-meta">
                    {item.videoCount} videos · {formatDuration(item.totalDuration)}
                  </div>
                </div>
                <div className="topic-completion">
                  {item.avgCompletion.toFixed(0)}% avg
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Commute Length */}
      {analytics.byCommuteLength.length > 0 && (
        <div className="analytics-section">
          <h3 className="section-title">⏱️ By Commute Length</h3>
          <div className="commute-list">
            {analytics.byCommuteLength.map((item, idx) => (
              <div key={idx} className="commute-item">
                <div className="commute-length">{item.commuteLength}</div>
                <div className="commute-stats">
                  <div>{item.videoCount} videos</div>
                  <div>{formatDuration(item.totalDuration)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Time of Day */}
      {analytics.byTimeOfDay.length > 0 && (
        <div className="analytics-section">
          <h3 className="section-title">🌅 Watch Patterns</h3>
          <div className="timeofday-list">
            {analytics.byTimeOfDay.map((item, idx) => (
              <div key={idx} className="timeofday-item">
                <div className="timeofday-period">
                  {item.timePeriod.charAt(0).toUpperCase() + item.timePeriod.slice(1)}
                </div>
                <div className="timeofday-stats">
                  <div>{item.videoCount} videos</div>
                  <div>{formatDuration(item.totalDuration)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      {analytics.weeklyTrend.length > 0 && (
        <div className="analytics-section">
          <h3 className="section-title">📈 Recent Activity</h3>
          <div className="weekly-list">
            {analytics.weeklyTrend.slice(0, 8).map((item, idx) => (
              <div key={idx} className="weekly-item">
                <div className="weekly-week">{formatWeek(item.week)}</div>
                <div className="weekly-stats">
                  <div>{item.videoCount} videos</div>
                  <div>{formatDuration(item.totalDuration)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
