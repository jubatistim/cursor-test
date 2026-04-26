import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ReplayButton component - Button for replaying the song snippet
 * 
 * Features:
 * - Shows remaining replay count
 * - Disabled when replay limit reached
 * - Visual feedback on click
 */

// Maximum number of replays
const MAX_REPLAYS = 3;

export function ReplayButton({ 
  onReplay,
  disabled = false,
  replayCount = 0,
  size = 'medium' 
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);

  // Calculate remaining replays
  const remainingReplays = Math.max(0, MAX_REPLAYS - replayCount);
  const canReplay = remainingReplays > 0 && !disabled;

  const handleClick = useCallback(() => {
    if (!canReplay || disabled) return;

    // Trigger animation
    setIsAnimating(true);
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    // Call onReplay callback
    if (onReplay) {
      onReplay();
    }
  }, [canReplay, disabled, onReplay]);

  // Clean up timeout on unmount
  useRef(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  });

  const buttonClasses = [
    'replay-button',
    `replay-button--${size}`,
    isAnimating ? 'replay-button--animating' : '',
    !canReplay || disabled ? 'replay-button--disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={buttonClasses}
      onClick={handleClick}
      disabled={!canReplay || disabled}
      title={!canReplay ? 'Replay limit reached' : 'Replay snippet'}
      aria-label={`Replay snippet${remainingReplays > 0 ? ` (${remainingReplays} remaining)` : ''}`}
    >
      <span className="replay-icon">⭮</span>
      
      {size !== 'small' && (
        <span className="replay-label">Replay</span>
      )}
      
      {/* Show remaining count for larger buttons */}
      {size === 'large' && remainingReplays > 0 && (
        <span className="replay-count">({remainingReplays})</span>
      )}
      
      {/* Show disabled message */}
      {(!canReplay || disabled) && size !== 'small' && (
        <span className="replay-disabled-message">
          Limit reached
        </span>
      )}
    </button>
  );
}

ReplayButton.propTypes = {
  onReplay: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  replayCount: PropTypes.number,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default ReplayButton;
