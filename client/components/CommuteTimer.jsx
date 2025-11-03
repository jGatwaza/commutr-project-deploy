import '../styles/CommuteTimer.css';

function CommuteTimer({ remainingTimeSec }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (remainingTimeSec > 600) return '#77ACA2'; // Green: > 10 min
    if (remainingTimeSec > 300) return '#FFC107'; // Yellow: 5-10 min
    return '#FF5252'; // Red: < 5 min
  };

  const getTimerStatus = () => {
    if (remainingTimeSec > 600) return 'plenty of time';
    if (remainingTimeSec > 300) return 'wrapping up soon';
    if (remainingTimeSec > 0) return 'almost there!';
    return 'time\'s up!';
  };

  return (
    <div className="commute-timer" style={{ borderColor: getTimerColor() }}>
      <div className="timer-icon">⏱️</div>
      <div className="timer-content">
        <div className="timer-value" style={{ color: getTimerColor() }}>
          {formatTime(remainingTimeSec)}
        </div>
        <div className="timer-label">{getTimerStatus()}</div>
      </div>
    </div>
  );
}

export default CommuteTimer;
