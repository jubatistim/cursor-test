import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ConfirmButton - Locks in the player's song placement.
 * Disabled when no song has been placed or when already confirmed.
 */
export function ConfirmButton({ onConfirm, disabled = false, isConfirming = false }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = useCallback((e) => {
    if (disabled || isConfirming || isProcessing) return;
    setIsProcessing(true);
    const promiseOrVoid = onConfirm();
    
    // Handle both promise and non-promise callbacks
    if (promiseOrVoid && typeof promiseOrVoid.then === 'function') {
      promiseOrVoid.finally(() => setIsProcessing(false));
    } else {
      // For non-promise callbacks, reset after a short delay to prevent rapid clicks
      setTimeout(() => setIsProcessing(false), 300);
    }
  }, [onConfirm, disabled, isConfirming, isProcessing]);

  const handleKeyDown = useCallback((e) => {
    // Support both Enter and Space for keyboard activation
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isConfirming && !isProcessing) {
      e.preventDefault();
      handleClick(e);
    }
  }, [disabled, isConfirming, isProcessing, handleClick]);

  return (
    <button
      className={`confirm-button${disabled ? ' confirm-button--disabled' : ''}${isConfirming || isProcessing ? ' confirm-button--loading' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || isConfirming || isProcessing}
      aria-label="Confirm song placement"
      aria-busy={isConfirming || isProcessing}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      {isConfirming || isProcessing ? 'Confirming…' : 'Confirm Placement'}
    </button>
  );
}

ConfirmButton.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isConfirming: PropTypes.bool
};

export default ConfirmButton;
