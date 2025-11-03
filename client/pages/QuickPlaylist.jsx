import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/QuickPlaylist.css';

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer TEST';

function QuickPlaylist() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('python');
  const [duration, setDuration] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const durationSec = duration * 60;
      const response = await fetch(
        `${API_BASE}/v1/playlist?topic=${encodeURIComponent(topic)}&durationSec=${durationSec}`,
        {
          headers: {
            'Authorization': AUTH_TOKEN
          }
        }
      );

      if (response.status === 204) {
        setError(`No videos found for "${topic}". Try: python, cooking, javascript, fitness, spanish`);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const playlist = await response.json();

      // Navigate to playlist view
      navigate('/playlist', {
        state: {
          playlist,
          context: {
            topic,
            duration: durationSec
          }
        }
      });

    } catch (err) {
      console.error('Error:', err);
      setError('Failed to create playlist. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="quick-playlist-page">
      <div className="container">
        <div className="header">
          <button onClick={() => navigate('/home')} className="back-btn">
            ← Back
          </button>
          <h1>Create Your Playlist</h1>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="topic">What do you want to learn?</label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., python, cooking, fitness"
                required
                disabled={isLoading}
              />
              <p className="hint">Try: python, javascript, cooking, fitness, spanish, photography</p>
            </div>

            <div className="form-group">
              <label htmlFor="duration">How long is your commute?</label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button type="submit" className="btn-create" disabled={isLoading}>
              {isLoading ? 'Creating Playlist...' : '🎬 Create Playlist'}
            </button>
          </form>
        </div>

        <div className="info-card">
          <h3>✨ What happens next?</h3>
          <ul>
            <li>📋 View your personalized playlist</li>
            <li>🎥 Watch videos in immersive full-screen mode</li>
            <li>⏱️ Track your remaining commute time</li>
            <li>⏭️ Skip videos you don't like</li>
            <li>🔄 Change topics mid-commute</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default QuickPlaylist;
