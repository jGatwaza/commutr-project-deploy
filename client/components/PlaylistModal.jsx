function PlaylistModal({ playlist, context, onClose }) {
  const { topic = 'your topic', duration = 0 } = context || {};

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 
      ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` 
      : `${minutes}:00`;
  };

  const getLevelColor = (level) => {
    switch(level?.toLowerCase()) {
      case 'beginner': return '#22c55e';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal show" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6Z" fill="#468189"/>
              <path d="M20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16Z" fill="#468189"/>
              <path d="M12 5.5V13.5L17 9.5L12 5.5Z" fill="#468189"/>
            </svg>
            Your Playlist
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="playlist-info">
            <h3>Your {topic.charAt(0).toUpperCase() + topic.slice(1)} Playlist</h3>
            <p><strong>Duration:</strong> {formatDuration(playlist.totalDurationSec)}</p>
            <p><strong>Videos:</strong> {playlist.items.length}</p>
            {playlist.underFilled ? (
              <span className="status-badge status-warning">Partially Filled</span>
            ) : (
              <span className="status-badge status-success">Perfect Match</span>
            )}
          </div>

          {playlist.items.map((video, index) => (
            <div key={index} className="video-container">
              <div className="video-header">
                <div className="video-info">
                  <h3>{video.title || `${topic} Tutorial`}</h3>
                  <div className="video-meta">
                    {video.channelTitle || 'YouTube'} • {formatDuration(video.durationSec)} • 
                    <span 
                      className="level-badge" 
                      style={{ background: getLevelColor(video.level), color: 'white' }}
                    >
                      {video.level || 'Intermediate'}
                    </span>
                  </div>
                </div>
                <div className="duration-badge">{formatDuration(video.durationSec)}</div>
              </div>
              <div className="video-player">
                <iframe
                  width="100%"
                  height="400"
                  src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlaylistModal;
