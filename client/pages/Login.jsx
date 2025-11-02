import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

function Login() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    // If already logged in, redirect to home
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setStatus('Opening Google sign-in...');
    setStatusType('');
    
    try {
      await signInWithGoogle();
      setStatus('Signed in! Redirecting...');
      setStatusType('success');
      setTimeout(() => {
        navigate('/home');
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      setStatus(error.message || 'Sign-in failed. Please try again.');
      setStatusType('error');
    }
  };

  return (
    <div className="login-page">
      {/* Animated commute background */}
      <div className="commute-bg">
        {/* Horizontal lines */}
        <div className="commute-line horizontal" style={{ top: '15%' }}></div>
        <div className="commute-line horizontal" style={{ top: '35%', animationDelay: '-2s' }}></div>
        <div className="commute-line horizontal" style={{ top: '55%', animationDelay: '-4s' }}></div>
        <div className="commute-line horizontal" style={{ top: '75%', animationDelay: '-6s' }}></div>
        
        {/* Vertical lines */}
        <div className="commute-line vertical" style={{ left: '20%', animationDelay: '-1s' }}></div>
        <div className="commute-line vertical" style={{ left: '40%', animationDelay: '-3s' }}></div>
        <div className="commute-line vertical" style={{ left: '60%', animationDelay: '-5s' }}></div>
        <div className="commute-line vertical" style={{ left: '80%', animationDelay: '-7s' }}></div>

        {/* Intersection nodes */}
        <div className="node" style={{ top: '15%', left: '20%' }}></div>
        <div className="node" style={{ top: '35%', left: '40%' }}></div>
        <div className="node" style={{ top: '55%', left: '60%' }}></div>
        <div className="node" style={{ top: '75%', left: '80%' }}></div>
        <div className="node" style={{ top: '15%', left: '60%' }}></div>
        <div className="node" style={{ top: '55%', left: '20%' }}></div>
        <div className="node" style={{ top: '35%', left: '80%' }}></div>
        <div className="node" style={{ top: '75%', left: '40%' }}></div>
      </div>

      <main>
        <div className="login-container">
          <div className="logo-area">
            <div className="logo">🎧</div>
            <h1>Welcome to Commutr</h1>
            <p className="subtitle">
              Transform your commute into a learning journey. Sign in to discover curated content that fits your schedule.
            </p>
          </div>

          <button onClick={handleGoogleLogin} className="google-btn">
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className={`status-message ${statusType}`}>
            {status}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
