import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User avatar" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" fill="#468189"/>
                <path d="M12 13C8.13 13 5 14.57 5 16.5V18H19V16.5C19 14.57 15.87 13 12 13Z" fill="#468189"/>
              </svg>
            )}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.displayName || 'User'}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <button onClick={handleSignOut} className="logout-btn">
          Sign Out
        </button>
      </div>

      <div className="home-container">
        <h1>🎧 Commutr</h1>
        <p className="tagline">Transform your commute into a learning journey</p>
        
        <div className="actions">
          <button onClick={() => navigate('/create')} className="action-btn primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Create Playlist
          </button>
          
          <button onClick={() => navigate('/agent')} className="action-btn secondary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.9 2 10 2.9 10 4V10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10V4C14 2.9 13.1 2 12 2Z" fill="currentColor"/>
              <path d="M18 10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10H4C4 13.93 6.94 17.21 10.88 17.88V22H13.13V17.88C17.06 17.21 20 13.93 20 10H18Z" fill="currentColor"/>
            </svg>
            Agent Mode (Voice)
          </button>

          <button onClick={() => navigate('/history')} className="action-btn tertiary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L4.96 16.03L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.25 15.52L17.02 14.24L13.5 12.15V8H12Z" fill="currentColor"/>
            </svg>
            View History
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
