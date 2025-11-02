function WelcomeState() {
  return (
    <div className="welcome-state">
      <div className="welcome-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C10.9 2 10 2.9 10 4V10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10V4C14 2.9 13.1 2 12 2Z" fill="#468189"/>
          <path d="M18 10C18 13.31 15.31 16 12 16C8.69 16 6 13.31 6 10H4C4 13.93 6.94 17.21 10.88 17.88V22H13.13V17.88C17.06 17.21 20 13.93 20 10H18Z" fill="#468189"/>
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
