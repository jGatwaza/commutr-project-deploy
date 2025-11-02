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
          <button onClick={() => navigate('/agent')} className="action-btn primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.9 2 10 2.9 10 4V10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10V4C14 2.9 13.1 2 12 2Z" fill="white"/>
              <path d="M18 10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10H4C4 13.93 6.94 17.21 10.88 17.88V22H13.13V17.88C17.06 17.21 20 13.93 20 10H18Z" fill="white"/>
            </svg>
            Agent Mode
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
