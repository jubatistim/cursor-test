import PropTypes from 'prop-types';

/**
 * DragPreview component - Shows preview of song placement during drag
 * Displays insertion point and visual feedback
 */
export function DragPreview({ isVisible, position, song, className = '' }) {
  if (!isVisible || !song) {
    return null;
  }

  return (
    <div className={`drag-preview ${className}`}>
      <div className="preview-content" role="status" aria-live="polite">
        <div className="preview-song">
          <div className="song-info">
            <h4 className="song-title">{song.title}</h4>
            <p className="song-artist">{song.artist}</p>
          </div>
          <div className="preview-position" aria-label={`Insertion position ${position + 1}`}>
            Position: {position + 1}
          </div>
        </div>
        <div className="preview-indicator" aria-hidden="true">
          <div className="insertion-line" data-testid="insertion-line"></div>
          <span className="insertion-text">Will be placed here</span>
        </div>
      </div>
    </div>
  );
}

DragPreview.propTypes = {
  isVisible: PropTypes.bool,
  position: PropTypes.number,
  song: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    artist: PropTypes.string.isRequired,
    release_year: PropTypes.number
  }),
  className: PropTypes.string
};

export default DragPreview;