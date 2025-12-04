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
      <div className="bg-orb teal" aria-hidden="true" />
      <div className="bg-orb blue" aria-hidden="true" />
      <div className="bg-orb sand" aria-hidden="true" />

      <header className="home-nav">
        <div className="nav-left">
          <div className="logo-mark">🎧</div>
          <span className="nav-logo-text">Commutr</span>
        </div>

        <div className="nav-right">
          <div className="nav-user">
            <div className="avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User avatar" />
              ) : (
                <span className="avatar-fallback">{user?.displayName?.charAt(0) || 'C'}</span>
              )}
            </div>
            <div className="nav-user-text">
              <span className="nav-user-name">{user?.displayName || 'Commutr Explorer'}</span>
              <span className="nav-user-email">{user?.email}</span>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-outline-small">
            Sign out
          </button>
        </div>
      </header>

      <main className="hero-grid">
        <section className="hero-copy">
          <p className="pill">AI powered micro learning</p>
          <h1 className="hero-title">Learn something useful on every commute.</h1>
          <p className="hero-subtitle">
            Commutr curates YouTube into focused, commute-length playlists so you can grow your skills in the time you
            already spend moving.
          </p>

          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => navigate('/create')}>
              Create playlist
            </button>
            <button className="btn-ghost" onClick={() => navigate('/agent')}>
              Try agent mode
            </button>
          </div>

          <div className="hero-links">
            <button className="hero-link" onClick={() => navigate('/history')}>
              View history
            </button>
            <button className="hero-link" onClick={() => navigate('/achievements')}>
              View achievements
            </button>
          </div>

          <p className="hero-footnote">Works with your existing YouTube account. No new logins.</p>
        </section>

        <section className="hero-preview">
          <div className="preview-image">
            <img src="/images/commute-hero.jpg" alt="Learning during a commute" />
            <p className="preview-caption">Real commuters turning travel time into learning time.</p>
          </div>
        </section>
      </main>

    </div>
  );
}

export default Home;
