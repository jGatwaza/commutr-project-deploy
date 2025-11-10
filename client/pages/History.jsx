import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WatchedList from '../components/history/WatchedList';
import '../styles/History.css';

function History() {
  const [activeTab, setActiveTab] = useState('watched');
  const navigate = useNavigate();

  return (
    <div className="history-page">
      <div className="history-container">
        <div className="history-header">
          <h1>History</h1>
          <button onClick={() => navigate('/home')} className="back-btn">← Back</button>
        </div>

        <div className="history-tabs">
          <button
            className={`history-tab ${activeTab === 'watched' ? 'active' : ''}`}
            onClick={() => setActiveTab('watched')}
          >
            Watched
          </button>
          {/* Future tabs can be added here, e.g., Sessions, Playlists */}
        </div>

        <div className="history-content">
          {activeTab === 'watched' && <WatchedList />}
        </div>
      </div>
    </div>
  );
}

export default History;