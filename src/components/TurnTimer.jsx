import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import React from 'react';
import { getServerTime, calculateRemainingTime } from '../utils/timerUtils';

/**
 * TurnTimer component - Displays a 60-second countdown timer for player turns
 * Shows visual progress bar and time remaining
 * Uses server-synchronized timing to prevent desync between clients
 * Uses single timer mechanism (setTimeout with periodic updates) to avoid race conditions
 */
export function TurnTimer({
  startTime,
  duration = 60,
  onTimeout,
  isActive = false,
  className = ''
}) {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    // Initialize with calculated remaining time
    if (startTime && isActive) {
      const remaining = calculateRemainingTime(startTime, getServerTime(), duration);
      return remaining;
    }
    return duration;
  });
  const [isExpired, setIsExpired] = useState(false);
  const timeoutRef = useRef(null);
  
  // Countdown timer using single setTimeout mechanism
  // This avoids race conditions between setInterval and setTimeout
  const updateTimer = useCallback(() => {
    if (!startTime || !isActive) return;
    
    const currentTime = getServerTime();
    const remaining = calculateRemainingTime(startTime, currentTime, duration);
    
    setTimeRemaining(remaining);
    
    if (remaining > 0) {
      // Timer still active - schedule next update
      timeoutRef.current = setTimeout(updateTimer, 100);
    } else {
      // Timer expired
      setIsExpired(true);
      setTimeRemaining(0);
      onTimeout?.();
      timeoutRef.current = null;
    }
  }, [startTime, duration, isActive, onTimeout]);

  // Manage timer lifecycle
  useEffect(() => {
    // Clear any existing timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Only start timer if startTime is provided and active
    if (startTime && isActive) {
      // Validate startTime
      if (typeof startTime !== 'number' || !Number.isFinite(startTime) || startTime <= 0) {
        console.error('TurnTimer: Invalid startTime', startTime);
        setTimeRemaining(duration);
        setIsExpired(false);
        return;
      }
      
      // Calculate initial state
      const currentTime = getServerTime();
      const remaining = calculateRemainingTime(startTime, currentTime, duration);
      
      // Handle case where timer has already expired
      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        onTimeout?.();
        return;
      }
      
      setTimeRemaining(remaining);
      setIsExpired(false);
      
      // Start periodic updates
      timeoutRef.current = setTimeout(updateTimer, 100);
    } else {
      // Timer not active - show full duration if startTime not provided
      setTimeRemaining(duration);
      setIsExpired(false);
    }
    
    // Cleanup function - clears timer on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [startTime, duration, isActive, onTimeout, updateTimer]);

  // Handle isActive prop changes
  useEffect(() => {
    if (!isActive && timeoutRef.current) {
      // Timer deactivated - clear timer but keep current state
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    } else if (isActive && startTime && !timeoutRef.current) {
      // Timer reactivated - restart
      const currentTime = getServerTime();
      const remaining = calculateRemainingTime(startTime, currentTime, duration);
      
      if (remaining > 0) {
        setTimeRemaining(remaining);
        setIsExpired(false);
        timeoutRef.current = setTimeout(updateTimer, 100);
      } else {
        setTimeRemaining(0);
        setIsExpired(true);
        onTimeout?.();
      }
    }
  }, [isActive, startTime, duration, onTimeout, updateTimer]);

  // Calculate progress percentage (0-100) with clamping to avoid floating point issues
  const progressPercent = Math.min(100, Math.max(0, ((duration - timeRemaining) / duration) * 100));
  
  // Determine timer color based on time remaining
  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'bg-red-500';
    if (timeRemaining <= 20) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Format time display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  return (
    <div className={`turn-timer ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        {/* Timer display */}
        <div className="text-2xl font-bold text-gray-800">
          {formatTime(Math.max(0, timeRemaining))}
        </div>
        
        {/* Progress bar */}
        <div 
          className="w-full h-4 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.min(timeRemaining, duration)}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-label={`Time remaining: ${formatTime(Math.max(0, timeRemaining))}`}
        >
          <div 
            className={`h-full transition-all duration-100 ease-linear ${getTimerColor()}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Warning message when time is running out */}
        {timeRemaining <= 10 && timeRemaining > 0 && (
          <div className="text-sm text-red-600 font-medium animate-pulse">
            {timeRemaining <= 5 ? 'Time running out!' : 'Hurry up!'}
          </div>
        )}
        
        {/* Expired message */}
        {isExpired && (
          <div className="text-sm text-red-600 font-bold">
            Time's up!
          </div>
        )}
      </div>
    </div>
  );
}

TurnTimer.propTypes = {
  startTime: PropTypes.number,
  duration: PropTypes.number,
  onTimeout: PropTypes.func,
  isActive: PropTypes.bool,
  className: PropTypes.string
};

// Error boundary component for TurnTimer
class TurnTimerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TurnTimer error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="timer-error text-red-500 text-sm">
          Timer Error
        </div>
      );
    }
    return this.props.children;
  }
}

// Export both the component and the error boundary
export { TurnTimerErrorBoundary };
