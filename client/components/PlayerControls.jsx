import { useState } from 'react';
import '../styles/PlayerControls.css';

function PlayerControls({ onSkip, onChangeTopic, onBackToPlaylist, onBackToHome, currentTopic, isLoading, nextVideo }) {
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [newTopic, setNewTopic] = useState('');

  const handleChangeTopicClick = () => {
    setShowTopicInput(true);
  };

  const handleTopicSubmit = (e) => {
    e.preventDefault();
    if (newTopic.trim()) {
      onChangeTopic(newTopic.trim());
      setNewTopic('');
      setShowTopicInput(false);
    }
  };

  const handleCancel = () => {
    setShowTopicInput(false);
    setNewTopic('');
  };

  return (
    <div className="player-controls">
      {showTopicInput ? (
        <form className="topic-change-form" onSubmit={handleTopicSubmit}>
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Enter new topic (e.g., cooking, fitness)"
            className="topic-input"
            autoFocus
            disabled={isLoading}
          />
          <div className="topic-buttons">
            <button type="submit" className="btn-submit" disabled={isLoading || !newTopic.trim()}>
              {isLoading ? 'Loading...' : 'Change'}
            </button>
            <button type="button" onClick={handleCancel} className="btn-cancel" disabled={isLoading}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <button 
            onClick={onSkip} 
            className="btn-control btn-skip"
            disabled={isLoading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
            Skip Video
          </button>

          <button 
            onClick={handleChangeTopicClick} 
            className="btn-control btn-change-topic"
            disabled={isLoading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
            Change Topic
          </button>

          <button 
            onClick={onBackToPlaylist} 
            className="btn-control btn-back"
            disabled={isLoading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            Back to Playlist
          </button>

          <button 
            onClick={onBackToHome} 
            className="btn-control btn-back"
            disabled={isLoading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Home
          </button>
        </>
      )}

      {nextVideo && !showTopicInput && (
        <div className="next-video-preview">
          <span className="next-label">Up Next:</span>
          <span className="next-title">{nextVideo.title}</span>
        </div>
      )}
    </div>
  );
}

export default PlayerControls;
