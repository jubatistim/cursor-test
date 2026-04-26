import PropTypes from 'prop-types';

/**
 * ConfirmButton - Locks in the player's song placement.
 * Disabled when no song has been placed or when already confirmed.
 */
export function ConfirmButton({ onConfirm, disabled = false, isConfirming = false }) {
  return (
    <button
      className={`confirm-button${disabled ? ' confirm-button--disabled' : ''}${isConfirming ? ' confirm-button--loading' : ''}`}
      onClick={onConfirm}
      disabled={disabled || isConfirming}
      aria-label="Confirm song placement"
      aria-busy={isConfirming}
    >
      {isConfirming ? 'Confirming…' : 'Confirm Placement'}
    </button>
  );
}

ConfirmButton.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isConfirming: PropTypes.bool
};

export default ConfirmButton;
