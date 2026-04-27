import { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createDragImage, cleanupDragImage, supportsTouch, isTouchPrimaryDevice, getDragEventHandlers, isDesktopDevice as checkIsDesktopDevice } from '../utils/dragUtils';

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
  const [touchStartPos, setTouchStartPos] = useState(null);
  const dragImageRef = useRef(null);
  const cardRef = useRef(null);
  const touchDragDataRef = useRef(null);

  // CONSTANTS for touch drag threshold and timing
  const TOUCH_DRAG_THRESHOLD = 10; // pixels to move before considering it a drag
  const LONG_PRESS_THRESHOLD = 300; // ms for long press to initiate drag

  const isTouchDevice = supportsTouch();
  const isTouchPrimary = isTouchPrimaryDevice();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragImageRef.current) {
        cleanupDragImage(dragImageRef.current);
        dragImageRef.current = null;
      }
    };
  }, []);

  const prepareDragData = useCallback((songData) => {
    // Create sanitized drag data
    return JSON.stringify({
      songId: songData.id,
      songTitle: songData.title,
      songArtist: songData.artist
    });
  }, []);

  const handleDragStart = useCallback((e, isTouch = false) => {
    if (onDragStart) {
      // For touch, create a proper event-like object
      const eventForCallback = isTouch ? { 
        ...e,
        dataTransfer: {
          effectAllowed: 'move',
          setData: (format, data) => {
            touchDragDataRef.current = data;
          },
          getData: () => touchDragDataRef.current || '{}'
        }
      } : e;
      onDragStart(eventForCallback, song);
    }
    setIsDragging(true);
    
    if (e.dataTransfer && !isTouch) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', prepareDragData(song));
      
      // Create custom drag image for better UX
      if (cardRef.current) {
        dragImageRef.current = createDragImage(cardRef.current, e);
      }
    }
    
    // For touch devices, store the drag data
    if (isTouch) {
      touchDragDataRef.current = prepareDragData(song);
    }
  }, [onDragStart, song, prepareDragData]);

  const handleDragEnd = useCallback((e, isTouch = false) => {
    setIsDragging(false);
    setTouchStartPos(null);
    touchDragDataRef.current = null;
    
    // Clean up drag image
    if (dragImageRef.current) {
      cleanupDragImage(dragImageRef.current);
      dragImageRef.current = null;
    }
    
    // Haptic feedback on touch end
    if (isTouch && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (err) {
        // Vibration may not be allowed
        console.debug('Vibration not available:', err);
      }
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (revealed) return; // Don't handle touch on revealed cards
    
    // Handle both native touch events and synthetic events
    let touchX, touchY;
    if (e.touches && e.touches.length > 0) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    } else if (e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
      // Testing library synthetic events
      touchX = e.nativeEvent.touches[0].clientX;
      touchY = e.nativeEvent.touches[0].clientY;
    } else {
      // Fallback: use clientX/clientY directly if available
      touchX = e.clientX || 0;
      touchY = e.clientY || 0;
    }
    
    // Record start position and time
    setTouchStartPos({
      x: touchX,
      y: touchY,
      time: Date.now()
    });
    
    // Start long press timer
    const longPressTimer = setTimeout(() => {
      // If still touching after threshold, start drag
      if (touchStartPos) {
        e.preventDefault();
        handleDragStart(e, true);
      }
    }, LONG_PRESS_THRESHOLD);
    
    // Store timer for cleanup
    cardRef.current._longPressTimer = longPressTimer;
    
    e.preventDefault();
  }, [handleDragStart, touchStartPos, revealed]);

  const handleTouchMove = useCallback((e) => {
    if (revealed) return;
    
    // Handle both native touch events and synthetic events
    let touchX, touchY;
    if (e.touches && e.touches.length > 0) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    } else if (e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
      // Testing library synthetic events
      touchX = e.nativeEvent.touches[0].clientX;
      touchY = e.nativeEvent.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      // For touchend events
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    } else {
      // Fallback: use clientX/clientY directly if available
      touchX = e.clientX || 0;
      touchY = e.clientY || 0;
    }
    
    const startPos = touchStartPos;
    
    if (startPos) {
      const dx = Math.abs(touchX - startPos.x);
      const dy = Math.abs(touchY - startPos.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If moved beyond threshold, start drag
      if (distance > TOUCH_DRAG_THRESHOLD && !isDragging) {
        e.preventDefault();
        handleDragStart(e, true);
        // Clear long press timer
        if (cardRef.current?._longPressTimer) {
          clearTimeout(cardRef.current._longPressTimer);
          cardRef.current._longPressTimer = null;
        }
      }
      
      // Once dragging, prevent default to stop scrolling
      if (isDragging) {
        e.preventDefault();
      }
    }
  }, [isDragging, touchStartPos, handleDragStart, revealed]);

  const handleTouchEnd = useCallback((e) => {
    if (revealed) return;
    
    // Clear long press timer
    if (cardRef.current?._longPressTimer) {
      clearTimeout(cardRef.current._longPressTimer);
      cardRef.current._longPressTimer = null;
    }
    
    // Only consider it a drag if we moved beyond threshold or started via long press
    if (isDragging) {
      e.preventDefault();
      handleDragEnd(e, true);
    }
    
    setTouchStartPos(null);
  }, [isDragging, handleDragEnd, revealed]);

  const handleTouchCancel = useCallback((e) => {
    if (revealed) return;
    
    // Clean up on cancel
    if (cardRef.current?._longPressTimer) {
      clearTimeout(cardRef.current._longPressTimer);
      cardRef.current._longPressTimer = null;
    }
    
    if (isDragging) {
      handleDragEnd(e, true);
    }
    
    setTouchStartPos(null);
    setIsDragging(false);
  }, [isDragging, handleDragEnd, revealed]);

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
  const isDesktop = checkIsDesktopDevice();

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
      className={`song-card ${className} ${isDragging ? 'dragging' : ''} ${revealed ? 'revealed' : ''} ${isCorrect === true ? 'correct' : ''} ${isCorrect === false ? 'incorrect' : ''} ${isDesktop && !revealed ? 'desktop-hover' : ''} ${isTouchPrimary ? 'touch-device' : ''}`}
      draggable={isDesktop && !revealed}
      onDragStart={isDesktop && !revealed ? handleDragStart : undefined}
      onDragEnd={isDesktop && !revealed ? handleDragEnd : undefined}
      onTouchStart={isTouchDevice && !revealed ? handleTouchStart : undefined}
      onTouchMove={isTouchDevice && !revealed ? handleTouchMove : undefined}
      onTouchEnd={isTouchDevice && !revealed ? handleTouchEnd : undefined}
      onTouchCancel={isTouchDevice && !revealed ? handleTouchCancel : undefined}
      onKeyDown={!revealed ? handleKeyDown : undefined}
      role="button"
      aria-label={revealed 
        ? `${song.title} by ${song.artist} - ${isCorrect ? 'Correct' : 'Incorrect'}`
        : `Drag ${song.title} by ${song.artist} to timeline. Press Space or Enter to grab.`
      }
      aria-grabbed={isDragging ? 'true' : 'false'}
      tabIndex={revealed ? -1 : 0}
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