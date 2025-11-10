import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCommute } from '../context/CommuteContext';
import '../styles/PlaylistView.css';

function PlaylistView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { playlist, context } = location.state || {};
  const { startCommute, isActive } = useCommute();

  // Start commute timer when playlist is loaded
  useEffect(() => {
    if (context) {
      // Only reset if coming from home/create (not from player)
      const fromPlayer = location.state?.fromPlayer;
      startCommute(context.duration, context.topic, !fromPlayer);
    }
  }, [context, startCommute, location.state]);

  if (!playlist || !context) {
    return (
      <div className="playlist-view-page">
        <div className="container">
          <div className="error-state">
            <h2>No Playlist Found</h2>
            <p>Please create a playlist first.</p>
            <button onClick={() => navigate('/agent-mode')} className="btn-primary">
              Go to Agent Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalMinutes = Math.floor(playlist.totalDurationSec / 60);
  const commuteDuration = Math.floor(context.duration / 60);

  const startPlaylist = (startIndex = 0) => {
    navigate('/player', {
      state: {
        playlist,
        context,
        startIndex
      }
    });
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'beginner': return '#77ACA2';
      case 'intermediate': return '#468189';
      case 'advanced': return '#031926';
      default: return '#9DBEBB';
    }
  };

  return (
    <div className="playlist-view-page">
      <div className="container">
        <div className="header">
          <button onClick={() => navigate('/create')} className="back-btn">
            ← Back
          </button>
          <h1>Your {context.topic} Playlist</h1>
        </div>

        <div className="playlist-summary">
          <div className="summary-card">
            <div className="summary-item">
              <span className="summary-label">Videos</span>
              <span className="summary-value">{playlist.items.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Duration</span>
              <span className="summary-value">{totalMinutes} min</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Your Commute</span>
              <span className="summary-value">{commuteDuration} min</span>
            </div>
          </div>
          
          {playlist.underFilled && (
            <div className="warning-banner">
              ⚠️ Playlist is shorter than your commute. We'll find more videos during playback!
            </div>
          )}

          <button onClick={() => startPlaylist(0)} className="btn-start-playlist">
            ▶ Start Playlist
          </button>
        </div>

        <div className="video-list">
          {playlist.items.map((video, index) => (
            <div key={video.videoId} className="video-card" onClick={() => startPlaylist(index)}>
              <div className="video-thumbnail">
                <img 
                  src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} 
                  alt={video.title}
                  onError={(e) => {
                    e.target.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
                  }}
                />
                <div className="video-duration">{formatDuration(video.durationSec)}</div>
                <div className="play-overlay">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              
              <div className="video-info">
                <div className="video-number">#{index + 1}</div>
                <h3 className="video-title">{video.title}</h3>
                <p className="video-channel">{video.channelTitle}</p>
                <div className="video-meta">
                  <span 
                    className="difficulty-badge" 
                    style={{ backgroundColor: getDifficultyColor(video.level) }}
                  >
                    {video.level}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlaylistView;
