import { createContext, useContext, useState, useEffect } from 'react';

const CommuteContext = createContext({});

export const useCommute = () => {
  const context = useContext(CommuteContext);
  if (!context) {
    throw new Error('useCommute must be used within a CommuteProvider');
  }
  return context;
};

export function CommuteProvider({ children }) {
  const [commuteStartTime, setCommuteStartTime] = useState(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentTopic, setCurrentTopic] = useState('');
  const [watchedVideoIds, setWatchedVideoIds] = useState([]);
  const [videoPositions, setVideoPositions] = useState({}); // { videoId: seconds }
  const [topicsLearned, setTopicsLearned] = useState([]); // Array of unique topics

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedStartTime = sessionStorage.getItem('commuteStartTime');
    const savedDuration = sessionStorage.getItem('commuteDuration');
    const savedTopic = sessionStorage.getItem('commuteTopic');
    const savedWatched = sessionStorage.getItem('watchedVideoIds');

    if (savedStartTime) setCommuteStartTime(parseInt(savedStartTime));
    if (savedDuration) setTotalDuration(parseInt(savedDuration));
    if (savedTopic) setCurrentTopic(savedTopic);
    if (savedWatched) setWatchedVideoIds(JSON.parse(savedWatched));

    const savedPositions = sessionStorage.getItem('videoPositions');
    if (savedPositions) setVideoPositions(JSON.parse(savedPositions));

    const savedTopics = sessionStorage.getItem('topicsLearned');
    if (savedTopics) setTopicsLearned(JSON.parse(savedTopics));
  }, []);

  const startCommute = (duration, topic, forceReset = false) => {
    // If already active and same topic, don't reset unless forced
    if (commuteStartTime && currentTopic === topic && !forceReset) {
      return; // Keep existing timer
    }

    const startTime = Date.now();
    setCommuteStartTime(startTime);
    setTotalDuration(duration);
    setCurrentTopic(topic);
    
    // If resetting, clear everything
    if (forceReset) {
      setWatchedVideoIds([]);
      setTopicsLearned([topic]);
    } else {
      // Add topic if not already in list
      if (!topicsLearned.includes(topic)) {
        const updated = [...topicsLearned, topic];
        setTopicsLearned(updated);
        sessionStorage.setItem('topicsLearned', JSON.stringify(updated));
      }
    }

    // Save to sessionStorage
    sessionStorage.setItem('commuteStartTime', startTime.toString());
    sessionStorage.setItem('commuteDuration', duration.toString());
    sessionStorage.setItem('commuteTopic', topic);
    sessionStorage.setItem('watchedVideoIds', JSON.stringify(forceReset ? [] : watchedVideoIds));
    sessionStorage.setItem('topicsLearned', JSON.stringify(forceReset ? [topic] : topicsLearned));
  };

  const addWatchedVideo = (videoId) => {
    const updated = [...watchedVideoIds, videoId];
    setWatchedVideoIds(updated);
    sessionStorage.setItem('watchedVideoIds', JSON.stringify(updated));
  };

  const getRemainingTime = () => {
    if (!commuteStartTime) return 0;
    const elapsed = Math.floor((Date.now() - commuteStartTime) / 1000);
    return Math.max(0, totalDuration - elapsed);
  };

  const saveVideoPosition = (videoId, position) => {
    const updated = { ...videoPositions, [videoId]: position };
    setVideoPositions(updated);
    sessionStorage.setItem('videoPositions', JSON.stringify(updated));
  };

  const getVideoPosition = (videoId) => {
    return videoPositions[videoId] || 0;
  };

  const endCommute = () => {
    setCommuteStartTime(null);
    setTotalDuration(0);
    setCurrentTopic('');
    setWatchedVideoIds([]);
    setVideoPositions({});
    setTopicsLearned([]);

    // Clear sessionStorage
    sessionStorage.removeItem('commuteStartTime');
    sessionStorage.removeItem('commuteDuration');
    sessionStorage.removeItem('commuteTopic');
    sessionStorage.removeItem('watchedVideoIds');
    sessionStorage.removeItem('videoPositions');
    sessionStorage.removeItem('topicsLearned');
  };

  const value = {
    commuteStartTime,
    totalDuration,
    currentTopic,
    watchedVideoIds,
    topicsLearned,
    startCommute,
    addWatchedVideo,
    getRemainingTime,
    saveVideoPosition,
    getVideoPosition,
    endCommute,
    isActive: commuteStartTime !== null
  };

  return (
    <CommuteContext.Provider value={value}>
      {children}
    </CommuteContext.Provider>
  );
}
