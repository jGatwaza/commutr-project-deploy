import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/History.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommute, setSelectedCommute] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/commute-history/demoUser`, {
        headers: {
          'Authorization': AUTH_TOKEN
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const handleCommuteClick = (commute) => {
    setSelectedCommute(commute);
  };

  const closeModal = () => {
    setSelectedCommute(null);
  };

  if (loading) {
    return (
      <div className="history-page">
        <div className="container">
          <h1>Loading history...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <button onClick={() => navigate('/home')} className="back-btn">
          ← Back to Home
        </button>
        <h1>Your Commute History</h1>
        <p className="history-subtitle">Review your past learning sessions</p>
      </div>

      <div className="history-container">
        <div className="empty-state">
          <div className="empty-icon">🚧</div>
          <h2>History Feature Coming Soon</h2>
          <p>We're working on bringing you a complete history of your learning sessions. Stay tuned!</p>
          <button onClick={() => navigate('/create')} className="btn-primary">
            Start Learning
          </button>
        </div>
        {false && history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>No History Yet</h2>
            <p>Complete your first commute to see it here!</p>
            <button onClick={() => navigate('/create')} className="btn-primary">
              Start Learning
            </button>
          </div>
        ) : (
          <div className="history-list">
            {history.map((commute) => (
              <div
                key={commute.id}
                className="history-card"
                onClick={() => handleCommuteClick(commute)}
              >
                <div className="history-card-header">
                  <div className="history-date">
                    <span className="date">{formatDate(commute.timestamp)}</span>
                    <span className="time">{formatTime(commute.timestamp)}</span>
                  </div>
                  <div className="history-duration">
                    {formatDuration(commute.durationSec)}
                  </div>
                </div>

                <div className="history-card-body">
                  <div className="history-stats">
                    <div className="stat-item">
                      <span className="stat-value">{commute.videosWatched.length}</span>
                      <span className="stat-label">Videos</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{commute.topics.length}</span>
                      <span className="stat-label">Topics</span>
                    </div>
                  </div>

                  <div className="history-topics">
                    {commute.topics.map((topic, index) => (
                      <span key={index} className="topic-tag">{topic}</span>
                    ))}
                  </div>
                </div>

                <div className="history-card-footer">
                  <span className="view-details">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commute Detail Modal */}
      {selectedCommute && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            
            <div className="modal-header">
              <h2>Commute Summary</h2>
              <p className="modal-date">
                {formatDate(selectedCommute.timestamp)} at {formatTime(selectedCommute.timestamp)}
              </p>
            </div>

            <div className="modal-stats">
              <div className="modal-stat">
                <span className="modal-stat-value">{selectedCommute.videosWatched.length}</span>
                <span className="modal-stat-label">Videos Watched</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-value">{Math.floor(selectedCommute.durationSec / 60)}</span>
                <span className="modal-stat-label">Minutes Learned</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-value">{selectedCommute.topics.length}</span>
                <span className="modal-stat-label">Topics Explored</span>
              </div>
            </div>

            {selectedCommute.topics.length > 0 && (
              <div className="modal-section">
                <h3>Topics You Learned:</h3>
                <div className="modal-topics">
                  {selectedCommute.topics.map((topic, index) => (
                    <span key={index} className="modal-topic-chip">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedCommute.videosWatched.length > 0 && (
              <div className="modal-section">
                <h3>Videos You Watched:</h3>
                <div className="modal-video-grid">
                  {selectedCommute.videosWatched.map((video) => (
                    <div
                      key={video.videoId}
                      className="modal-video-card"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="modal-video-thumbnail"
                      />
                      <div className="modal-video-info">
                        <h4>{video.title}</h4>
                        <p>{video.channelTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default History;
