import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCommute } from '../context/CommuteContext';
import '../styles/PlaylistView.css';

function PlaylistView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [persistentPlaylist, setPersistentPlaylist] = useState(() => {
    try {
      const stored = sessionStorage.getItem('wizardPlaylist');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse stored playlist:', error);
      return null;
    }
  });

  const [persistentContext, setPersistentContext] = useState(() => {
    try {
      const stored = sessionStorage.getItem('wizardPlaylistContext');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse stored playlist context:', error);
      return null;
    }
  });

  const { playlist: statePlaylist, context: stateContext, fromAgent, fromConversation } = location.state || {};
  const playlist = statePlaylist || persistentPlaylist;
  const context = stateContext || persistentContext;
  const { startCommute, isActive } = useCommute();

  // Determine where to go back to
  const handleBack = () => {
    if (fromAgent) {
      navigate('/agent');  // Go back to agent text chat mode
    } else if (fromConversation) {
      navigate('/agent');  // Also go to agent mode, not conversation (to avoid auto-speaking)
    } else {
      navigate(-1);  // Default: go back in history
    }
  };

  useEffect(() => {
    if (statePlaylist) {
      try {
        sessionStorage.setItem('wizardPlaylist', JSON.stringify(statePlaylist));
      } catch (error) {
        console.error('Failed to persist playlist to storage:', error);
      }
    }
    if (stateContext) {
      try {
        sessionStorage.setItem('wizardPlaylistContext', JSON.stringify(stateContext));
      } catch (error) {
        console.error('Failed to persist playlist context to storage:', error);
      }
    }
  }, [statePlaylist, stateContext]);
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
            <button onClick={() => navigate('/agent')} className="btn-primary">
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

  const playlistItems = playlist.items ?? playlist.videos ?? [];
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
      case 'beginner':
        return '#CDECE5';
      case 'intermediate':
        return '#FFE5B4';
      case 'advanced':
        return '#F5C5C5';
      default:
        return '#E5E7EB';
    }
  };

  return (
    <div className="playlist-view-page">
      <div className="container">
        <div className="header">
          <button onClick={handleBack} className="back-btn" aria-label="Back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1>Your Customized Playlist</h1>
        </div>

        <div className="playlist-summary">
          <div className="playlist-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Videos</span>
              <span className="summary-value">{playlistItems.length}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total duration</span>
              <span className="summary-value">{totalMinutes} min</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Your commute</span>
              <span className="summary-value">{commuteDuration} min</span>
            </div>
          </div>
          
          {playlist.underFilled && (
            <div className="warning-banner">
              ⚠️ Playlist is shorter than your commute. We'll find more videos during playback!
            </div>
          )}

          <div className="playlist-cta">
            <p className="cta-subtitle">Ready to roll? We’ll keep you on track the entire ride.</p>
            <button onClick={() => startPlaylist(0)} className="btn-start-playlist">
              ▶ Start playlist
            </button>
          </div>
        </div>

        <div className="video-list">
          {playlistItems.map((video, index) => (
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
