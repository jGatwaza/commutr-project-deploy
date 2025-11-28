// HW9 CTR-C4: Achievements Page Component
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/AchievementsPage.css';
import { buildApiUrl, AUTH_TOKEN } from '../config/api';

const API_BASE = buildApiUrl();

function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/achievements?userId=${user.uid}`, {
        headers: {
          'Authorization': AUTH_TOKEN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load achievements');
      }

      const payload = await response.json();
      setData(payload);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError("Couldn't load achievements, please try again");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="achievements-page">
        <div className="achievements-container">
          <h1>Loading your achievements...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="achievements-page">
        <div className="achievements-container">
          <h1>⚠️ Error</h1>
          <p className="error-message">{error}</p>
          <button onClick={fetchAchievements} className="retry-btn">
            Try Again
          </button>
          <button onClick={() => navigate('/home')} className="back-btn">
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const { summary, badges } = data;

  // Check if user has any activity (videos watched or commutes completed)
  const hasActivity = summary.totalMinutes > 0 || badges.some(b => b.earned);

  return (
    <div className="achievements-page">
      <div className="achievements-header">
        <button onClick={() => navigate('/home')} className="back-btn">
          ← Back to Home
        </button>
        <h1>🏆 Badges & Accomplishments</h1>
        <p className="subtitle">Track your commute learning streaks and milestones</p>
      </div>

      <div className="achievements-container">
        {!hasActivity ? (
          // Empty state when no commute history
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h2>No achievements yet!</h2>
            <p className="empty-message">
              Complete your first commute to start unlocking badges and tracking your learning progress.
            </p>
            <button onClick={() => navigate('/create')} className="create-playlist-btn">
              Create Your First Playlist
            </button>
          </div>
        ) : (
        <>
        {/* Stats Summary */}
        <div className="stats-section">
          <h2>Your Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-value">{summary.totalMinutes}</div>
              <div className="stat-label">Total Minutes</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎵</div>
              <div className="stat-value">{summary.totalSessions}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{summary.currentStreak}</div>
              <div className="stat-label">Current Streak</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{summary.longestStreak}</div>
              <div className="stat-label">Best Streak</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="badges-section">
          <h2>Your Badges</h2>
          <div className="badges-grid">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              >
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-title">{badge.title}</div>
                <div className="badge-description">{badge.description}</div>
                {badge.earned ? (
                  <div className="badge-status earned">
                    ✓ Unlocked
                    {badge.earnedAt && (
                      <div className="badge-date">
                        {new Date(badge.earnedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="badge-status locked">
                    <div className="badge-progress">
                      {badge.progressCurrent} / {badge.progressTarget}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default AchievementsPage;