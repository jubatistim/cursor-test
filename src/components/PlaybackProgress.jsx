import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { syncManager } from '../utils/syncManager';
import { formatTime } from '../utils/audioPlayer';

/**
 * PlaybackProgress component - Shows synchronized playback progress bar
 * 
 * Features:
 * - Progress bar showing current playback position
 * - Time remaining display
 * - Sync status indicator
 */
export function PlaybackProgress({ 
  duration = 20,
  showTime = true,
  showSyncIndicator = true,
  height = 4,
  color = '#4CAF50',
  backgroundColor = 'rgba(255, 255, 255, 0.2)' 
}) {
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isOutOfSync, setIsOutOfSync] = useState(false);

  // Listen to sync manager updates
  useEffect(() => {
    const handlePlay = ({ startTime, snippetStartTime, snippetDuration }) => {
      // Start tracking progress
      const updateProgress = () => {
        if (!startTime) return;
        
        const now = Date.now();
        const elapsed = (now - startTime) / 1000; // Convert to seconds
        const durationSec = snippetDuration / 1000;
        const prog = Math.min(1, Math.max(0, elapsed / durationSec));
        setProgress(prog);
        setTimeRemaining(Math.max(0, Math.floor(durationSec - elapsed)));
        
        // Check if out of sync
        if (syncManager.isOutOfSync()) {
          setIsOutOfSync(true);
        } else {
          setIsOutOfSync(false);
        }
      };

      // Update every 100ms for smooth progress
      const interval = setInterval(updateProgress, 100);
      
      return () => clearInterval(interval);
    };

    // Handle play event
    const playHandler = handlePlay();
    syncManager.setCallbacks({
      onPlay: (event) => {
        if (playHandler && typeof playHandler === 'function') {
          playHandler(event);
        }
        handlePlay()(event);
      }
    });

    return () => {
      syncManager.setCallbacks({
        onPlay: null
      });
    };
  }, [duration]);

  // Update when duration prop changes
  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

  // Get progress percentage
  const progressPercent = progress * 100;

  return (
    <div className="playback-progress-container">
      <div 
        className="playback-progress-bar"
        style={{
          height: `${height}px`,
          backgroundColor: backgroundColor
        }}
      >
        <div 
          className={`playback-progress-fill${isOutOfSync ? ' out-of-sync' : ''}`}
          style={{
            width: `${progressPercent}%`,
            backgroundColor: color
          }}
        />
      </div>
      <div className="playback-progress-labels">
        {showTime && (
          <span className="time-remaining">
            -{formatTime(timeRemaining)}
          </span>
        )}
        {showSyncIndicator && isOutOfSync && (
          <span className="sync-indicator" title="Out of sync">
            ⚠️
          </span>
        )}
      </div>
      <style jsx>{`
        .playback-progress-container {
          width: 100%;
        }
        .playback-progress-bar {
          width: 100%;
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }
        .playback-progress-fill {
          height: 100%;
          transition: width 0.1s linear;
          border-radius: 2px;
        }
        .playback-progress-fill.out-of-sync {
          opacity: 0.7;
          animation: pulse 0.5s infinite;
        }
        .playback-progress-labels {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          font-size: 0.85rem;
          color: #666;
        }
        .time-remaining {
          color: #888;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
        }
        .sync-indicator {
          color: #f44336;
          font-size: 1rem;
          animation: shake 0.3s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

PlaybackProgress.propTypes = {
  duration: PropTypes.number,
  showTime: PropTypes.bool,
  showSyncIndicator: PropTypes.bool,
  height: PropTypes.number,
  color: PropTypes.string,
  backgroundColor: PropTypes.string
};

export default PlaybackProgress;
