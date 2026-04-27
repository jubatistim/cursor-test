import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { supportsTouch, isTouchPrimaryDevice, getDragEventHandlers, handleKeyboardNavigation, getDropTargetIndex, createDragImage, cleanupDragImage, isDesktopDevice as checkIsDesktopDevice } from '../utils/dragUtils';

import { DragPreview } from './DragPreview';

/**
 * Timeline component - Vertical timeline for song placement
 * Displays placed songs chronologically with drag-and-drop support
 * Supports both mouse and touch events
 */
export function Timeline({ songs = [], onSongDrop, className = '', showYearMarkers = false, revealed = false, currentSongId = null, playerResult = {} }) {
  const [draggedSong, setDraggedSong] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDragIndex, setTouchDragIndex] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [touchStartPos, setTouchStartPos] = useState(null);
  
  const timelineRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const dragImageRef = useRef(null);

  const isTouchDevice = supportsTouch();
  const isDesktopDevice = checkIsDesktopDevice();
  const isTouchPrimary = isTouchPrimaryDevice();

  // Constants for touch handling
  const TOUCH_DRAG_THRESHOLD = 10; // pixels

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragImageRef.current) {
        cleanupDragImage(dragImageRef.current);
        dragImageRef.current = null;
      }
      // Clean up touch dragging body class
      document.body.classList.remove('touch-dragging', 'no-scroll');
    };
  }, []);

  // Manage body class for touch dragging (prevent scrolling)
  useEffect(() => {
    if (isTouchDragging) {
      document.body.classList.add('touch-dragging', 'no-scroll');
    } else {
      document.body.classList.remove('touch-dragging', 'no-scroll');
    }
    return () => {
      document.body.classList.remove('touch-dragging', 'no-scroll');
    };
  }, [isTouchDragging]);

  // Handle drag start for mouse
  const handleDragStart = (e, song, index) => {
    if (revealed) return;
    setDraggedSong({ ...song, originalIndex: index });
    e.dataTransfer.effectAllowed = 'move';
    // Use sanitized, minimal data to prevent XSS
    e.dataTransfer.setData('text/plain', JSON.stringify({
      songId: song.id,
      songTitle: song.title,
      songArtist: song.artist,
      index: index
    }));
  };

  // Handle touch start for mobile
  const handleTouchStart = (e, song, index) => {
    if (revealed) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Handle both native touch events and synthetic events
    let touchX, touchY;
    if (e.touches && e.touches.length > 0) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    } else if (e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
      touchX = e.nativeEvent.touches[0].clientX;
      touchY = e.nativeEvent.touches[0].clientY;
    } else {
      touchX = e.clientX || 0;
      touchY = e.clientY || 0;
    }
    
    touchStartY.current = touchY;
    touchStartTime.current = Date.now();
    
    // Store start position for threshold check
    setTouchStartPos({ x: touchX, y: touchY });
    
    // Don't start drag yet - wait for move threshold
    // Just store the song info for potential drag
    setDraggedSong({ ...song, originalIndex: index });
  };

  // Handle touch move for mobile
  const handleTouchMove = (e) => {
    if (!timelineRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Handle both native touch events and synthetic events
    let touchX, touchY;
    if (e.touches && e.touches.length > 0) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    } else if (e.nativeEvent && e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
      touchX = e.nativeEvent.touches[0].clientX;
      touchY = e.nativeEvent.touches[0].clientY;
    } else {
      touchX = e.clientX || 0;
      touchY = e.clientY || 0;
    }
    
    const startPos = touchStartPos;
    
    // Check if we've passed the drag threshold
    if (startPos && !isTouchDragging) {
      const dy = Math.abs(touchY - startPos.y);
      const dx = Math.abs(touchX - startPos.x);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > TOUCH_DRAG_THRESHOLD) {
        setIsTouchDragging(true);
        setTouchDragIndex(draggedSong?.originalIndex || 0);
      }
    }
    
    if (isTouchDragging) {
      const targetIndex = getDropTargetIndex({ clientY: touchY }, timelineRef.current, songs);
      setDropTargetIndex(targetIndex);
      setMousePosition({ x: touchX, y: touchY });
    }
  };

  // Handle touch end for mobile
  const handleTouchEnd = (e) => {
    if (!isTouchDragging && !draggedSong) return;

    e.preventDefault();
    e.stopPropagation();

    // Handle both native touch events and synthetic events
    let touchX, touchY;
    if (e.changedTouches && e.changedTouches.length > 0) {
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    } else if (e.nativeEvent && e.nativeEvent.changedTouches && e.nativeEvent.changedTouches.length > 0) {
      touchX = e.nativeEvent.changedTouches[0].clientX;
      touchY = e.nativeEvent.changedTouches[0].clientY;
    } else if (e.touches && e.touches.length > 0) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    } else {
      touchX = e.clientX || 0;
      touchY = e.clientY || 0;
    }

    const targetIndex = timelineRef.current
      ? getDropTargetIndex({ clientY: touchY }, timelineRef.current, songs)
      : 0;

    if (draggedSong && onSongDrop) {
      onSongDrop(draggedSong, draggedSong.originalIndex, targetIndex);
    }

    // Reset state
    setIsTouchDragging(false);
    setDraggedSong(null);
    setDropTargetIndex(null);
    setTouchDragIndex(null);
    setTouchStartPos(null);
    touchStartY.current = null;
    touchStartTime.current = null;
  };

  // Handle touch cancel
  const handleTouchCancel = (e) => {
    if (!isTouchDragging && !draggedSong) return;
    
    e.preventDefault();
    
    // Reset state
    setIsTouchDragging(false);
    setDraggedSong(null);
    setDropTargetIndex(null);
    setTouchDragIndex(null);
    setTouchStartPos(null);
    touchStartY.current = null;
    touchStartTime.current = null;
  };

  // Handle drag over for mouse
  const handleDragOver = (e, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(targetIndex);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Handle drag leave
  const handleDragLeave = () => {
    // Only clear if we're not moving to another drop zone
    setTimeout(() => {
      if (!isTouchDragging) {
        setDropTargetIndex(null);
      }
    }, 50);
  };

  // Handle drop for mouse
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    setDropTargetIndex(null);

    if (!draggedSong) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (onSongDrop) {
        // Handle sanitized data format (songId, songTitle, songArtist) or legacy format
        // Always use draggedSong from state for full song data
        const songToDrop = draggedSong;
        const fromIndex = data.index !== undefined ? data.index : draggedSong.originalIndex;
        onSongDrop(songToDrop, fromIndex, targetIndex);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }

    // Clean up drag image
    if (dragImageRef.current) {
      cleanupDragImage(dragImageRef.current);
      dragImageRef.current = null;
    }

    setDraggedSong(null);
    setMousePosition({ x: 0, y: 0 });
  };

  // Handle drag end for mouse
  const handleDragEnd = () => {
    // Clean up drag image
    if (dragImageRef.current) {
      cleanupDragImage(dragImageRef.current);
      dragImageRef.current = null;
    }
    setDraggedSong(null);
    setDropTargetIndex(null);
    setMousePosition({ x: 0, y: 0 });
  };

  // Calculate position for drag preview
  const getPreviewPosition = () => {
    if (!timelineRef.current) return null;
    const rect = timelineRef.current.getBoundingClientRect();
    return {
      x: mousePosition.x - rect.left,
      y: mousePosition.y - rect.top
    };
  };

  // Check if position is valid for preview
  const previewPosition = getPreviewPosition();
  const showPreview = (isTouchDragging || dropTargetIndex !== null) && 
                      previewPosition && 
                      draggedSong;

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((event) => {
    if (handleKeyboardNavigation(event, {
      container: timelineRef.current,
      onSelect: (element, index) => {
        // Focus the song item
        const songItem = element.closest('.song-item, [draggable]');
        if (songItem) {
          songItem.focus();
        }
      }
    })) {
      return;
    }
  }, []);

  // Handle keyboard drop (Enter/Space on drop zone)
  const handleDropZoneKeyDown = (event, targetIndex) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (draggedSong && onSongDrop) {
        onSongDrop(draggedSong, draggedSong.originalIndex, targetIndex);
        setDraggedSong(null);
        setDropTargetIndex(null);
      }
    }
  };

  return (
    <div 
      ref={timelineRef}
      className={`timeline ${className} ${isTouchPrimary ? 'touch-primary' : ''}`}
      role="list"
      aria-label="Song timeline"
      onTouchMove={isTouchDevice ? handleTouchMove : undefined}
      onTouchCancel={isTouchDevice ? handleTouchCancel : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Drag Preview - only show when dragging */}
      {showPreview && (
        <DragPreview
          isVisible={true}
          position={dropTargetIndex !== null ? dropTargetIndex : touchDragIndex !== null ? touchDragIndex : 0}
          song={draggedSong}
          className="timeline-drag-preview"
        />
      )}

      <div className="timeline-container">
        {songs.length === 0 ? (
          <div
            className={`drop-zone empty-drop-zone ${dropTargetIndex === 0 ? 'active' : ''} ${isDesktopDevice ? 'desktop-drop-zone' : ''}`}
            data-testid="drop-zone"
            onDragOver={(e) => handleDragOver(e, 0)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 0)}
            onTouchEnd={(e) => {
              if (isTouchDragging) {
                handleTouchEnd(e);
              }
            }}
            onTouchCancel={isTouchDevice ? handleTouchCancel : undefined}
            onKeyDown={(e) => handleDropZoneKeyDown(e, 0)}
            role="button"
            aria-label="Drop zone for empty timeline. Press Space or Enter to insert here."
            tabIndex={0}
          >
            {dropTargetIndex === 0 && (
              <div className="drop-indicator" role="status" aria-live="polite">
                <div className="drop-line" aria-hidden="true"></div>
                <span>Drop here</span>
              </div>
            )}
            <div 
              className="timeline-empty" 
              role="status"
              aria-label="Timeline is empty"
            >
              <p>Timeline is empty</p>
              <p>Drag songs here to start building your playlist</p>
            </div>
          </div>
        ) : (
          songs.map((song, index) => (
            <div 
              key={song.id || index} 
              className="timeline-item"
              role="listitem"
              aria-label={`Song ${index + 1}: ${song.title} by ${song.artist}`}
            >
              {/* Drop zone before this item */}
              <div
                className={`drop-zone ${dropTargetIndex === index ? 'active' : ''} ${isDesktopDevice ? 'desktop-drop-zone' : ''}`}
                data-testid="drop-zone"
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onTouchEnd={(e) => {
                  if (isTouchDragging) {
                    handleTouchEnd(e);
                  }
                }}
                onTouchCancel={isTouchDevice ? handleTouchCancel : undefined}
                onKeyDown={(e) => handleDropZoneKeyDown(e, index)}
                role="button"
                aria-label={`Drop zone before ${song.title}. Press Space or Enter to insert here.`}
                tabIndex={0}
              >
                {dropTargetIndex === index && (
                  <div className="drop-indicator" role="status" aria-live="polite">
                    <div className="drop-line" aria-hidden="true"></div>
                    <span>Drop here</span>
                  </div>
                )}
              </div>

              {/* Song item - draggable */}
              <div
                className={`song-item ${draggedSong?.id === song.id ? 'dragging' : ''} ${dropTargetIndex !== null && index >= dropTargetIndex ? 'shift-down' : ''} ${revealed && song.id === currentSongId ? (playerResult.isCorrect ? 'correct' : 'incorrect') : ''} ${song.is_locked ? 'locked' : ''} ${isDesktopDevice && !revealed && !song.is_locked ? 'desktop-song-item' : ''}`}
                draggable={!revealed && !song.is_locked}
                onDragStart={revealed || song.is_locked ? undefined : (e) => handleDragStart(e, song, index)}
                onDragEnd={revealed || song.is_locked ? undefined : handleDragEnd}
                onTouchStart={revealed || song.is_locked ? undefined : (e) => handleTouchStart(e, song, index)}
                onTouchCancel={revealed || song.is_locked ? undefined : isTouchDevice ? handleTouchCancel : undefined}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    // Start drag with keyboard
                    if (!revealed && !song.is_locked) {
                      handleDragStart(
                        { 
                          ...e, 
                          dataTransfer: {
                            effectAllowed: 'move',
                            setData: () => {},
                            getData: () => JSON.stringify({ song, index })
                          }
                        },
                        song,
                        index
                      );
                    }
                  }
                }}
                role="button"
                aria-label={
                  revealed 
                    ? `${song.title} by ${song.artist} - ${song.id === currentSongId ? (playerResult.isCorrect ? 'Correct' : 'Incorrect') : ''}`
                    : song.is_locked
                      ? `${song.title} by ${song.artist} - Locked card, cannot be moved`
                      : `Drag ${song.title} by ${song.artist}. Press Space or Enter to grab.`
                }
                tabIndex={0}
                aria-grabbed={draggedSong?.id === song.id ? 'true' : 'false'}
              >
                <div className="song-info">
                  <h4 className="song-title">{song.title}</h4>
                  <p className="song-artist">by {song.artist}</p>
                  <span className="song-year">{song.release_year}</span>
                  {song.is_locked && !revealed && (
                    <span className="lock-indicator" title="Locked card - cannot be moved">
                      🔒
                    </span>
                  )}
                  {revealed && song.id === currentSongId && (
                    <span className={`correctness-indicator ${playerResult.isCorrect ? 'correct' : 'incorrect'}`}>
                      {playerResult.isCorrect ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <div className="song-position" aria-label={`Position ${index + 1}`}>
                  #{index + 1}
                </div>
              </div>
            </div>
          ))
        )}

        {songs.length > 0 && (
          <div
            className={`drop-zone end-zone ${dropTargetIndex === songs.length ? 'active' : ''} ${isDesktopDevice ? 'desktop-drop-zone' : ''}`}
            data-testid="drop-zone"
            onDragOver={(e) => handleDragOver(e, songs.length)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, songs.length)}
            onTouchEnd={(e) => {
              if (isTouchDragging) {
                handleTouchEnd(e);
              }
            }}
            onTouchCancel={isTouchDevice ? handleTouchCancel : undefined}
            onKeyDown={(e) => handleDropZoneKeyDown(e, songs.length)}
            role="button"
            aria-label="Drop zone at end. Press Space or Enter to insert here."
            tabIndex={0}
          >
            {dropTargetIndex === songs.length && (
              <div className="drop-indicator" role="status" aria-live="polite">
                <div className="drop-line" aria-hidden="true"></div>
                <span>Drop here</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Timeline.propTypes = {
  songs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      song_id: PropTypes.string,
      title: PropTypes.string.isRequired,
      artist: PropTypes.string.isRequired,
      release_year: PropTypes.number,
      is_locked: PropTypes.bool,
      position: PropTypes.number
    })
  ),
  onSongDrop: PropTypes.func,
  className: PropTypes.string,
  revealed: PropTypes.bool,
  currentSongId: PropTypes.string,
  playerResult: PropTypes.shape({
    isCorrect: PropTypes.bool,
    placedIndex: PropTypes.number
  })
};

export default Timeline;