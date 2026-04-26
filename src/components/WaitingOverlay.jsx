import PropTypes from 'prop-types';

/**
 * WaitingOverlay - Shown after a player confirms placement.
 * Indicates the player is waiting for the opponent to also confirm.
 */
export function WaitingOverlay({ isVisible = false }) {
  if (!isVisible) return null;

  return (
    <div
      className="waiting-overlay"
      role="status"
      aria-live="polite"
      aria-label="Waiting for other player"
    >
      <div className="waiting-overlay__content">
        <div className="waiting-overlay__spinner" aria-hidden="true" />
        <p className="waiting-overlay__message">Waiting for other player…</p>
      </div>
    </div>
  );
}

WaitingOverlay.propTypes = {
  isVisible: PropTypes.bool
};

export default WaitingOverlay;
