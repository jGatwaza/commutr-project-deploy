import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCommute } from '../context/CommuteContext';
import { useAuth } from '../context/AuthContext';
import CommuteTimer from '../components/CommuteTimer';
import PlayerControls from '../components/PlayerControls';
import '../styles/ImmersivePlayer.css';
import { buildApiUrl, AUTH_TOKEN } from '../config/api';

const API_BASE = buildApiUrl();

function ImmersivePlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { playlist: initialPlaylist, context, startIndex = 0 } = location.state || {};
  const { commuteStartTime, totalDuration, watchedVideoIds: contextWatchedIds, topicsLearned, startCommute, addWatchedVideo, getRemainingTime, saveVideoPosition, getVideoPosition, endCommute } = useCommute();

  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [remainingTimeSec, setRemainingTimeSec] = useState(getRemainingTime());
  const [isLoading, setIsLoading] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const playerRef = useRef(null);

  if (!playlist || !context) {
    return (
      <div className="immersive-player-page">
        <div className="error-container">
          <h2>No Playlist Found</h2>
          <button onClick={() => navigate('/agent-mode')} className="btn-back">
            Go to Agent Mode
          </button>
        </div>
      </div>
    );
  }

  const currentVideo = playlist.items[currentIndex];
  const [videoStartTime] = useState(Date.now());
  const [initialPosition] = useState(() => getVideoPosition(currentVideo?.videoId));

  // Save commute to history function
  const saveCommuteToHistory = async () => {
    console.log('=== SAVING COMMUTE TO HISTORY ===');
    console.log('Watched videos:', contextWatchedIds);
    console.log('Topics learned:', topicsLearned);
    const elapsedSeconds = commuteStartTime
      ? Math.min(
          totalDuration,
          Math.max(0, Math.floor((Date.now() - commuteStartTime) / 1000))
        )
      : totalDuration;
    console.log('Elapsed seconds:', elapsedSeconds);

    try {
      const watchedVideos = playlist.items
        .filter(video => contextWatchedIds.includes(video.videoId))
        .map(video => ({
          videoId: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
          channelTitle: video.channelTitle,
          durationSec: video.durationSec
        }));

      console.log('Filtered watched videos:', watchedVideos);

      const commuteSession = {
        id: `commute-${Date.now()}`,
        timestamp: new Date().toISOString(),
        topics: topicsLearned,
        durationSec: elapsedSeconds,
        videosWatched: watchedVideos
      };

      console.log('Commute session to save:', commuteSession);

      const response = await fetch(`${API_BASE}/api/commute-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN
        },
        body: JSON.stringify({
          userId: 'demoUser',
          session: commuteSession
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log('✅ Commute saved successfully:', result);
    } catch (error) {
      console.error('❌ Failed to save commute to history:', error);
      alert(`Failed to save history: ${error.message}`);
    }
  };

  const handleEndCommuteEarly = async () => {
    if (showCompletion) return;
    markVideoWatched(currentVideo.videoId);
    await saveCommuteToHistory();
    // Show the completion summary first so it can read the latest
    // watchedVideoIds/topics from CommuteContext. We only clear the
    // commute state when the user leaves this screen.
    setShowCompletion(true);
  };

  // Update remaining time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setRemainingTimeSec(remaining);

      if (remaining === 0 && !showCompletion) {
        // Commute reached its planned duration. Save history and
        // transition to the completion summary, but defer clearing
        // commute context until the user leaves that screen so the
        // stats tiles can reflect the latest session.
        saveCommuteToHistory();
        setShowCompletion(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getRemainingTime, showCompletion, endCommute]);

  // Save video position periodically and check if video ended
  useEffect(() => {
    if (showCompletion) {
      return;
    }

    const saveInterval = setInterval(() => {
      const elapsedSinceStart = Math.floor((Date.now() - videoStartTime) / 1000);
      const estimatedPosition = initialPosition + elapsedSinceStart;
      saveVideoPosition(currentVideo.videoId, estimatedPosition);

      // Check if video has ended (only when actually complete, no early skip)
      if (estimatedPosition >= currentVideo.durationSec) {
        handleVideoEnd();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(saveInterval);
  }, [currentVideo.videoId, currentVideo.durationSec, videoStartTime, initialPosition, saveVideoPosition, showCompletion]);

  // Track watched video
  const markVideoWatched = (videoId) => {
    if (!contextWatchedIds.includes(videoId)) {
      addWatchedVideo(videoId);
      
      // Save to watch history
      if (user) {
        fetch(`${API_BASE}/api/history/watch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_TOKEN
          },
          body: JSON.stringify({
            userId: user.uid,
            videoId: currentVideo.videoId,
            title: currentVideo.title,
            durationSec: currentVideo.durationSec,
            topicTags: [context.topic],
            completedAt: new Date().toISOString(),
            progressPct: 100,
            source: 'youtube'
          })
        }).then(res => {
          if (res.ok) {
            console.log('✅ Saved to watch history:', currentVideo.title);
          }
        }).catch(err => console.error('Failed to save watch history:', err));
      }
      
      // Send to backend to track in history
      fetch(`${API_BASE}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN
        },
        body: JSON.stringify({
          topic: context.topic,
          minutes: Math.floor(currentVideo.durationSec / 60)
        })
      }).catch(err => console.error('Failed to track session:', err));
    }
  };

  const handleSkip = async () => {
    // Mark current video as watched
    markVideoWatched(currentVideo.videoId);

    // Check if we're at the last video
    if (currentIndex >= playlist.items.length - 1) {
      // Fetch more videos
      await fetchMoreVideos('skip');
    } else {
      // Move to next video
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleChangeTopic = async (newTopic) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/v1/agent/adjust-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN
        },
        body: JSON.stringify({
          remainingTimeSec,
          currentTopic: context.topic,
          newTopic,
          watchedVideoIds: contextWatchedIds,
          action: 'change_topic'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Change topic response:', data);

      if (data.success && data.playlist) {
        setPlaylist(data.playlist);
        setCurrentIndex(0);
        context.topic = newTopic;
        // Add new topic to the learned topics list
        startCommute(remainingTimeSec, newTopic, false);
      } else {
        alert(data.message || 'Failed to change topic');
      }
    } catch (error) {
      console.error('Error changing topic:', error);
      alert(`Failed to change topic: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoreVideos = async (action = 'continue') => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/v1/agent/adjust-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_TOKEN
        },
        body: JSON.stringify({
          remainingTimeSec,
          currentTopic: context.topic,
          watchedVideoIds: contextWatchedIds,
          action
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetch more videos response:', data);

      if (data.success && data.playlist) {
        setPlaylist(data.playlist);
        setCurrentIndex(0);
      } else {
        alert(data.message || 'No more videos available');
      }
    } catch (error) {
      console.error('Error fetching more videos:', error);
      alert(`Failed to fetch more videos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoEnd = () => {
    markVideoWatched(currentVideo.videoId);
    
    // Auto-advance to next video
    if (currentIndex < playlist.items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Fetch more videos if time remaining
      if (remainingTimeSec > 120) { // More than 2 minutes left
        fetchMoreVideos('continue');
      } else {
        setShowCompletion(true);
      }
    }
  };

  if (showCompletion) {
    const elapsedSeconds = commuteStartTime
      ? Math.min(
          totalDuration,
          Math.max(0, Math.floor((Date.now() - commuteStartTime) / 1000))
        )
      : totalDuration;

    const watchedVideos = playlist.items
      .filter(video => contextWatchedIds.includes(video.videoId));

    // Approximate total learning time as the sum of how long you actually
    // watched each video in this commute. We primarily rely on
    // CommuteContext's saved video positions (seconds watched), and
    // fall back to the full video duration if no position is recorded.
    const watchedSecondsFromPositions = watchedVideos.reduce((sum, video) => {
      const position = getVideoPosition(video.videoId);
      if (position && Number.isFinite(position)) {
        const capped = video.durationSec ? Math.min(position, video.durationSec) : position;
        return sum + capped;
      }

      return sum + (video.durationSec || 0);
    }, 0);

    const minutesLearned = watchedSecondsFromPositions > 0
      ? Math.round(watchedSecondsFromPositions / 60)
      : Math.floor(elapsedSeconds / 60);

    return (
      <div className="immersive-player-page">
        <div className="completion-screen">
          <div className="completion-content">
            <div className="completion-icon">🎉</div>
            <h1>Commute Complete!</h1>
            <p>Great job learning today!</p>
            
            <div className="completion-stats">
              <div className="stat">
                <span className="stat-value">{watchedVideos.length}</span>
                <span className="stat-label">Videos Watched</span>
              </div>
              <div className="stat">
                <span className="stat-value">{minutesLearned}</span>
                <span className="stat-label">Minutes Learned</span>
              </div>
              <div className="stat">
                <span className="stat-value">{topicsLearned.length}</span>
                <span className="stat-label">Topics Explored</span>
              </div>
            </div>

            {topicsLearned.length > 0 && (
              <div className="topics-list">
                <h3>Topics You Learned:</h3>
                <div className="topic-chips">
                  {topicsLearned.map((topic, index) => (
                    <span key={index} className="topic-chip">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {contextWatchedIds.length > 0 && (
              <div className="videos-watched-list">
                <h3>Videos You Watched:</h3>
                <div className="video-grid">
                  {playlist.items
                    .filter(video => contextWatchedIds.includes(video.videoId))
                    .map((video) => (
                      <div 
                        key={video.videoId} 
                        className="video-card"
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                      >
                        <img 
                          src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                          alt={video.title}
                          className="video-thumbnail"
                        />
                        <div className="video-info">
                          <h4 className="video-card-title">{video.title}</h4>
                          <p className="video-card-channel">{video.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => {
                endCommute();
                navigate('/home');
              }} className="btn-done">
                Go Home
              </button>
              <button onClick={() => {
                endCommute();
                navigate('/create');
              }} className="btn-done">
                Create New Playlist
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="immersive-player-page">
      <CommuteTimer remainingTimeSec={remainingTimeSec} />

      <div className="player-container">
        <div className="video-wrapper">
          <iframe
            ref={playerRef}
            src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&rel=0${initialPosition > 0 ? `&start=${Math.floor(initialPosition)}` : ''}`}
            title={currentVideo.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          {initialPosition > 0 && (
            <div className="resume-notice">
              Resuming from {Math.floor(initialPosition / 60)}:{(Math.floor(initialPosition) % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        <PlayerControls
          onSkip={handleSkip}
          onChangeTopic={handleChangeTopic}
          onBackToPlaylist={() => navigate('/playlist', { state: { playlist, context, fromPlayer: true } })}
          onBackToHome={() => {
            endCommute(); // Clear timer when going home
            navigate('/home');
          }}
          onEndCommuteEarly={handleEndCommuteEarly}
          currentTopic={context.topic}
          isLoading={isLoading}
          nextVideo={playlist.items[currentIndex + 1]}
        />

        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Finding more videos...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImmersivePlayer;
