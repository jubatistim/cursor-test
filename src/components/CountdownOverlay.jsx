import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { syncManager } from '../utils/syncManager';

/**
 * CountdownOverlay component - Displays synchronized countdown before playback
 * 
 * Features:
 * - Large, centered countdown display
 * - "Starting in 3, 2, 1..." animation
 * - Sync status indicator
 * - Responsive to sync manager events
 */
export function CountdownOverlay({ 
  isVisible = false,
  onComplete,
  showSyncStatus = true,
  countdownFrom = 3 
}) {
  const [countdown, setCountdown] = useState(countdownFrom);
  const [visible, setVisible] = useState(isVisible);
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  // Listen to sync manager countdown
  useEffect(() => {
    const handleCountdown = (value) => {
      setCountdown(value);
      
      // Update message based on countdown value
      if (value > 0) {
        setMessage(`Starting in ${value}...`);
      } else if (value === 0) {
        setMessage('Starting now!');
      }
    };

    const handlePlay = () => {
      // Countdown complete, start playback
      setVisible(false);
      if (onComplete) {
        onComplete();
      }
    };

    syncManager.setCallbacks({
      onCountdown: handleCountdown,
      onPlay: handlePlay
    });

    // Initial state
    setCountdown(countdownFrom);
    setVisible(isVisible);

    return () => {
      syncManager.setCallbacks({
        onCountdown: null,
        onPlay: null
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onComplete, countdownFrom]);

  // Update visibility when prop changes
  useEffect(() => {
    setVisible(isVisible);
    if (isVisible && countdown === 0) {
      setCountdown(countdownFrom);
    }
  }, [isVisible, countdown, countdownFrom]);

  // Handle countdown locally if not using sync manager
  useEffect(() => {
    if (visible && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            // Trigger completion
            if (onComplete) {
              onComplete();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, countdown, onComplete]);

  if (!visible) {
    return null;
  }

  // Get countdown display
  const getCountdownDisplay = () => {
    if (countdown >= 1) {
      return (
        <div className="countdown-number">
          {countdown}
        </div>
      );
    }
    return (
      <div className="countdown-message">
        {message || 'Go!'}
      </div>
    );
  };

  return (
    <div className="countdown-overlay">
      <div className="countdown-container">
        {getCountdownDisplay()}
        {message && countdown > 0 && (
          <div className="countdown-text">
            {message}
          </div>
        )}
        {showSyncStatus && (
          <div className="countdown-sync-indicator">
            <span className="sync-pulse">🎵</span>
            <span>Syncing...</span>
          </div>
        )}
      </div>
      <style jsx>{`
        .countdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }
        .countdown-container {
          text-align: center;
          color: white;
          animation: fadeIn 0.3s ease-in-out;
        }
        .countdown-number {
          font-size: 8rem;
          font-weight: 900;
          color: #4CAF50;
          text-shadow: 0 0 20px rgba(76, 175, 80, 0.7), 0 0 40px rgba(76, 175, 80, 0.4);
          line-height: 1;
          margin-bottom: 1rem;
        }
        .countdown-message {
          font-size: 4rem;
          font-weight: 700;
          color: #4CAF50;
          text-shadow: 0 0 20px rgba(76, 175, 80, 0.7);
          line-height: 1;
          margin-bottom: 1rem;
        }
        .countdown-text {
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
        }
        .countdown-sync-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
        }
        .sync-pulse {
          animation: pulse 1s infinite;
          font-size: 1.2rem;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes numberBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .countdown-number {
          animation: numberBounce 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

CountdownOverlay.propTypes = {
  isVisible: PropTypes.bool,
  onComplete: PropTypes.func,
  showSyncStatus: PropTypes.bool,
  countdownFrom: PropTypes.number
};

export default CountdownOverlay;
