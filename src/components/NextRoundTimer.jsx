import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * NextRoundTimer component - Displays a 3-second countdown before the next round starts
 * Shows a visual indicator (shrinking bar or numeric countdown)
 */
export function NextRoundTimer({
  isVisible = false,
  onComplete = () => {},
  nextRoundNumber = 1
}) {
  const [timeRemaining, setTimeRemaining] = useState(3);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const startTimerRef = useRef(null);

  const startTimer = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setTimeRemaining(3);
    setProgress(100);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        const newProgress = Math.max(0, Math.min(100, (newTime / 3) * 100));
        setProgress(newProgress);
        
        if (newTime <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (onComplete) {
            try {
              setTimeout(onComplete, 0);
            } catch (error) {
              console.error('Error in onComplete callback:', error);
            }
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onComplete]);

  useEffect(() => {
    if (isVisible) {
      const cleanup = startTimer();
      return cleanup;
    }
  }, [isVisible]);
  
  // Update startTimer ref when it changes
  useEffect(() => {
    startTimerRef.current = startTimer;
  }, [startTimer]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!isVisible) return null;

  // Calculate the width of the progress bar based on remaining time
  const barWidth = useMemo(() => `${progress}%`, [progress]);
  
  // Validate and sanitize round number
  const displayRound = Math.max(1, nextRoundNumber);

  return (
    <div className="next-round-timer" role="timer" aria-live="polite">
      <div className="timer-container">
        <h3 className="timer-title">Next Round Starting...</h3>
        <p className="round-info">Round {displayRound}</p>
        
        <div className="countdown-bar-container">
          <div 
            className="countdown-bar"
            style={{ width: barWidth }}
            aria-label={`Countdown progress: ${Math.round(progress)}% complete`}
          />
        </div>
        
        <div className="numeric-countdown" aria-label={`Time remaining: ${timeRemaining} seconds`}>
          {timeRemaining}
        </div>
      </div>
    </div>
  );
}

NextRoundTimer.propTypes = {
  isVisible: PropTypes.bool,
  onComplete: PropTypes.func,
  nextRoundNumber: PropTypes.number
};

export default NextRoundTimer;
