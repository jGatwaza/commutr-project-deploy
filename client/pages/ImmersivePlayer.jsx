import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCommute } from '../context/CommuteContext';
import { useAuth } from '../context/AuthContext';
import CommuteTimer from '../components/CommuteTimer';
import PlayerControls from '../components/PlayerControls';
import '../styles/ImmersivePlayer.css';
import { buildApiUrl, getAuthHeaders, AUTH_TOKEN } from '../config/api';

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
  const [completionRemainingSec, setCompletionRemainingSec] = useState(null);
  // Track all watched videos with full metadata (persists across topic changes)
  const [allWatchedVideos, setAllWatchedVideos] = useState([]);

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
  const [videoStartTime, setVideoStartTime] = useState(Date.now());
  const initialPosition = useMemo(
    () => getVideoPosition(currentVideo?.videoId) || 0,
    [currentVideo?.videoId]
  );
  const videoEndedRef = useRef(false);

  const goToNextVideo = () => {
    const totalItems = playlist?.items?.length || 0;

    if (totalItems === 0) {
      return false;
    }

    const maxIndex = totalItems - 1;

    if (currentIndex >= maxIndex) {
      return false;
    }

    setCurrentIndex(currentIndex + 1);
    return true;
  };

  // Save commute to history function (memoized with useCallback)
  const saveCommuteToHistory = useCallback(async () => {
    console.log('=== SAVING COMMUTE TO HISTORY ===');
    console.log('Watched videos:', contextWatchedIds);
    console.log('Topics learned:', topicsLearned);
    console.log('User object:', user);
    
    // Check if user is authenticated
    if (!user) {
      console.error('❌ COMMUTE NOT SAVED: No user authenticated');
      alert('Please log in to save your commute history');
      return;
    }
    
    if (!user.uid) {
      console.error('❌ COMMUTE NOT SAVED: user.uid is missing', user);
      alert('Authentication error: user ID is missing');
      return;
    }
    
    const elapsedSeconds = commuteStartTime
      ? Math.min(
          totalDuration,
          Math.max(0, Math.floor((Date.now() - commuteStartTime) / 1000))
        )
      : totalDuration;
    console.log('Elapsed seconds:', elapsedSeconds);
    console.log('User ID:', user.uid);

    try {
      // Use allWatchedVideos which persists across topic changes
      const watchedVideos = allWatchedVideos;

      console.log('Filtered watched videos:', watchedVideos);

      const commuteSession = {
        id: `commute-${Date.now()}`,
        timestamp: new Date().toISOString(),
        topics: topicsLearned,
        durationSec: elapsedSeconds,
        videosWatched: watchedVideos
      };

      console.log('Commute session to save:', commuteSession);

      const authHeaders = await getAuthHeaders(user);
      const response = await fetch(`${API_BASE}/api/commute-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          userId: user.uid, // Use real Firebase user ID
          session: commuteSession
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log('✅ COMMUTE SAVED SUCCESSFULLY:', result);
      console.log('✅ Achievements should now update with this commute');
    } catch (error) {
      console.error('❌ FAILED TO SAVE COMMUTE:', error);
      console.error('❌ Error details:', { message: error.message, stack: error.stack });
      alert(`Failed to save commute: ${error.message}`);
    }
  }, [user, contextWatchedIds, topicsLearned, commuteStartTime, totalDuration, allWatchedVideos]);

  const handleEndCommuteEarly = async () => {
    if (showCompletion) return;
    markVideoWatched(currentVideo.videoId);
    await saveCommuteToHistory();
    // Show the completion summary first so it can read the latest
    // watchedVideoIds/topics from CommuteContext. We only clear the
    // commute state when the user leaves this screen.
    setCompletionRemainingSec(prev => prev ?? getRemainingTime());
    setShowCompletion(true);
  };

  // Update remaining time every second - stop when completion screen shows
  useEffect(() => {
    // Don't run the timer if we're already showing completion
    if (showCompletion) return;

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setRemainingTimeSec(remaining);

      if (remaining === 0) {
        // Commute reached its planned duration. Save history and
        // transition to the completion summary, but defer clearing
        // commute context until the user leaves that screen so the
        // stats tiles can reflect the latest session.
        saveCommuteToHistory();
        setCompletionRemainingSec(0);
        setShowCompletion(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getRemainingTime, showCompletion, saveCommuteToHistory]);

  // Save video position periodically and check if video ended
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const elapsedSinceStart = Math.floor((Date.now() - videoStartTime) / 1000);
      const estimatedPosition = initialPosition + elapsedSinceStart;
      const clampedPosition = Math.max(
        0,
        Math.min(estimatedPosition, currentVideo.durationSec)
      );

      saveVideoPosition(currentVideo.videoId, clampedPosition);

      if (!videoEndedRef.current && clampedPosition >= currentVideo.durationSec) {
        handleVideoEnd();
      }
    }, 1000); // Check every second for responsive autoplay

    return () => clearInterval(saveInterval);
  }, [currentVideo.videoId, currentVideo.durationSec, videoStartTime, initialPosition, saveVideoPosition]);

  useEffect(() => {
    setVideoStartTime(Date.now());
    videoEndedRef.current = false;
  }, [currentVideo?.videoId]);

  // Track watched video
  const markVideoWatched = async (videoId) => {
    if (!contextWatchedIds.includes(videoId)) {
      addWatchedVideo(videoId);
      
      // Add to allWatchedVideos with full metadata (persists across topic changes)
      const videoData = {
        videoId: currentVideo.videoId,
        title: currentVideo.title,
        thumbnail: currentVideo.thumbnail || `https://img.youtube.com/vi/${currentVideo.videoId}/mqdefault.jpg`,
        channelTitle: currentVideo.channelTitle,
        durationSec: currentVideo.durationSec,
        topic: context.topic
      };
      setAllWatchedVideos(prev => {
        // Avoid duplicates
        if (prev.some(v => v.videoId === videoId)) return prev;
        return [...prev, videoData];
      });
      
      // Save to watch history
      if (user) {
        const authHeaders = await getAuthHeaders(user);
        const startedAtIso = new Date(videoStartTime || Date.now()).toISOString();
        fetch(`${API_BASE}/api/history/watch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            userId: user.uid,
            videoId: currentVideo.videoId,
            title: currentVideo.title,
            durationSec: currentVideo.durationSec,
            topicTags: [context.topic],
            startedAt: startedAtIso,
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

    const advanced = goToNextVideo();

    if (!advanced) {
      await fetchMoreVideos('skip');
    }
  };

  const handleChangeTopic = async (newTopic) => {
    // Mark current video as watched before switching topics
    // This ensures it's saved to allWatchedVideos before playlist changes
    markVideoWatched(currentVideo.videoId);
    
    setIsLoading(true);
    
    try {
      const authHeaders = await getAuthHeaders(user);
      const response = await fetch(`${API_BASE}/v1/agent/adjust-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
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
      const authHeaders = await getAuthHeaders(user);
      const response = await fetch(`${API_BASE}/v1/agent/adjust-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
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
    if (videoEndedRef.current) {
      return;
    }
    videoEndedRef.current = true;
    markVideoWatched(currentVideo.videoId);

    const advanced = goToNextVideo();

    if (!advanced) {
      if (remainingTimeSec > 120) { // More than 2 minutes left
        fetchMoreVideos('continue');
      } else {
        setCompletionRemainingSec(prev => prev ?? getRemainingTime());
        setShowCompletion(true);
      }
    }
  };

  if (showCompletion) {
    console.log('🎉 Rendering completion screen');
    console.log('Completion screen data:', { contextWatchedIds, topicsLearned, user: user?.uid });
    
    const elapsedSeconds = commuteStartTime
      ? Math.min(
          totalDuration,
          Math.max(0, Math.floor((Date.now() - commuteStartTime) / 1000))
        )
      : totalDuration;

    // Use allWatchedVideos which persists across topic changes
    const watchedVideos = allWatchedVideos;
    
    console.log('Completion stats:', { 
      videosWatched: watchedVideos.length, 
      topicsCount: topicsLearned.length,
      elapsedSeconds 
    });

    // Use the captured remaining time at the moment the commute ended
    // completionRemainingSec is set when showCompletion becomes true
    const remainingAtEnd = completionRemainingSec ?? 0;
    const actualTimeSpentSec = Math.max(0, totalDuration - remainingAtEnd);
    const minutesLearned = Math.max(0, Math.round(actualTimeSpentSec / 60));

    return (
      <div className="immersive-player-page completion-mode">
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

            {allWatchedVideos.length > 0 && (
              <div className="videos-watched-list">
                <h3>Videos You Watched:</h3>
                <div className="video-grid">
                  {allWatchedVideos.map((video) => (
                      <div 
                        key={video.videoId} 
                        className="video-card"
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                      >
                        <img 
                          src={video.thumbnail}
                          alt={video.title}
                          className="video-thumbnail"
                        />
                        <div className="video-info">
                          <h4 className="video-card-title">{video.title}</h4>
                          <p className="video-card-channel">{video.channelTitle}</p>
                          {video.topic && <span className="video-topic-tag">{video.topic}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="completion-actions">
              <div className="completion-actions-inner">
                <button 
                  onClick={() => {
                    console.log('🏠 Go Home button clicked');
                    endCommute();
                    navigate('/home');
                  }} 
                  className="btn-done"
                >
                  Go Home
                </button>
                <button 
                  onClick={() => {
                    console.log('➕ Create New Playlist button clicked');
                    endCommute();
                    navigate('/create');
                  }} 
                  className="btn-done"
                >
                  Create New Playlist
                </button>
              </div>
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
            src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&rel=0&enablejsapi=1${initialPosition > 0 ? `&start=${Math.floor(initialPosition)}` : ''}`}
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
