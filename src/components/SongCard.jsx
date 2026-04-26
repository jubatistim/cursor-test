import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createDragImage, supportsTouch, getDragEventHandlers } from '../utils/dragUtils';

/**
 * SongCard component - Draggable song card for timeline placement
 * Shows current song information and handles drag operations
 * Supports both mouse and touch events with keyboard accessibility
 * In revealed state, shows correctness and actual release year
 */
export function SongCard({ song, onDragStart, className = '', revealed = false, isCorrect = null }) {
  if (!song) {
    return null;
  }

  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef(null);

  const handleDragStart = useCallback((e) => {
    if (onDragStart) {
      onDragStart(e, song);
    }
    setIsDragging(true);
    
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ song }));
      
      // Create custom drag image for better UX
      if (cardRef.current) {
        createDragImage(cardRef.current, e);
      }
    }
  }, [onDragStart, song]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    // Create synthetic event for touch
    const syntheticEvent = {
      ...e,
      dataTransfer: {
        effectAllowed: 'move',
        setData: (format, data) => {
          // Store in custom property for touch drag
          e.target._dragData = data;
        }
      }
    };
    handleDragStart(syntheticEvent);
  }, [handleDragStart]);

  // Keyboard support - Space/Enter to start drag
  const handleKeyDown = useCallback((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      // Create synthetic drag start event for keyboard
      const syntheticEvent = {
        preventDefault: () => {},
        dataTransfer: {
          effectAllowed: 'move',
          setData: (format, data) => {
            // For keyboard, store in ref
            if (cardRef.current) {
              cardRef.current._dragData = data;
            }
          },
          getData: () => JSON.stringify({ song })
        },
        target: cardRef.current
      };
      handleDragStart(syntheticEvent);
    }
  }, [handleDragStart, song]);

  // Get appropriate event handlers based on device
  const dragHandlers = getDragEventHandlers();
  const isTouchDevice = supportsTouch();

  // Determine status badge text
  const getStatusBadge = () => {
    if (revealed) {
      if (isCorrect === true) return <span className="status-badge correct">✓ Correct</span>;
      if (isCorrect === false) return <span className="status-badge incorrect">✗ Incorrect</span>;
    }
    return <span className="status-badge unplaced">Unplaced</span>;
  };

  return (
    <div
      ref={cardRef}
      className={`song-card ${className} ${isDragging ? 'dragging' : ''} ${revealed ? 'revealed' : ''} ${isCorrect === true ? 'correct' : ''} ${isCorrect === false ? 'incorrect' : ''}`}
      draggable={!isTouchDevice && !revealed}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={isTouchDevice ? handleTouchStart : undefined}
      onTouchEnd={isTouchDevice ? handleDragEnd : undefined}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label={revealed 
        ? `${song.title} by ${song.artist} - ${isCorrect ? 'Correct' : 'Incorrect'}`
        : `Drag ${song.title} by ${song.artist} to timeline. Press Space or Enter to grab.`
      }
      aria-grabbed={isDragging ? 'true' : 'false'}
      tabIndex={0}
    >
      <div className="song-card-content">
        <div className="song-info">
          <h3 className="song-title" id={`song-${song.id || 'current'}-title`}>{song.title}</h3>
          <p className="song-artist">by {song.artist}</p>
          {revealed && song.release_year && (
            <p className="song-year">Release Year: {song.release_year}</p>
          )}
        </div>
        <div className="song-status">
          {getStatusBadge()}
        </div>
      </div>
      {!revealed && (
        <div className="drag-handle" aria-hidden="true">
          <span className="drag-icon">⋮⋮</span>
          <span className="drag-hint">Drag to timeline</span>
        </div>
      )}
    </div>
  );
}

SongCard.propTypes = {
  song: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    artist: PropTypes.string.isRequired,
    release_year: PropTypes.number
  }),
  onDragStart: PropTypes.func,
  className: PropTypes.string,
  revealed: PropTypes.bool,
  isCorrect: PropTypes.bool
};

export default SongCard;