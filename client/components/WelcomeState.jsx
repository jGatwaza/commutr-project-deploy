function WelcomeState() {
  return (
    <div className="welcome-state">
      <div className="welcome-icon">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="60" fill="#D9EEEE"/>
          <path d="M60 35C57.8 35 56 36.8 56 39V55C56 57.2 57.8 59 60 59C62.2 59 64 57.2 64 55V39C64 36.8 62.2 35 60 35Z" fill="#5F8A8B"/>
          <path d="M72 55C72 61.63 66.63 67 60 67C53.37 67 48 61.63 48 55H44C44 63.28 50.06 70.14 58 71.72V85H62V71.72C69.94 70.14 76 63.28 76 55H72Z" fill="#5F8A8B"/>
        </svg>
      </div>
      <h2 className="welcome-title">Hi, how can I help?</h2>
      <p className="welcome-subtitle">
        Tell me what you'd like to learn and how long your commute is, and I'll create a personalized playlist for you.
      </p>
    </div>
  );
}

export default WelcomeState;
