import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { supportsTouch, getDragEventHandlers, handleKeyboardNavigation } from '../utils/dragUtils';
import { DragPreview } from './DragPreview';

/**
 * Timeline component - Vertical timeline for song placement
 * Displays placed songs chronologically with drag-and-drop support
 * Supports both mouse and touch events
 */
export function Timeline({ songs = [], onSongDrop, className = '', showYearMarkers = false }) {
  const [draggedSong, setDraggedSong] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDragIndex, setTouchDragIndex] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const timelineRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);

  const isTouchDevice = supportsTouch();

  // Handle drag start for mouse
  const handleDragStart = (e, song, index) => {
    setDraggedSong({ ...song, originalIndex: index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ song, index }));
  };

  // Handle touch start for mobile
  const handleTouchStart = (e, song, index) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setDraggedSong({ ...song, originalIndex: index });
    setIsTouchDragging(true);
    setTouchDragIndex(index);
    e.preventDefault();
  };

  // Handle touch move for mobile
  const handleTouchMove = (e) => {
    if (!isTouchDragging || !timelineRef.current) return;
    e.preventDefault();
    
    const touchY = e.touches[0].clientY;
    const rect = timelineRef.current.getBoundingClientRect();
    const yInTimeline = touchY - rect.top;
    
    // Calculate target index based on touch position
    const itemHeight = rect.height / Math.max(1, songs.length + 1);
    const targetIndex = Math.floor(yInTimeline / itemHeight);
    setDropTargetIndex(targetIndex);
    setMousePosition({ x: e.touches[0].clientX, y: touchY });
  };

  // Handle touch end for mobile
  const handleTouchEnd = (e) => {
    if (!isTouchDragging) return;
    
    const touch = e.changedTouches[0];
    const rect = timelineRef.current?.getBoundingClientRect();
    
    if (rect) {
      const yInTimeline = touch.clientY - rect.top;
      const itemHeight = rect.height / Math.max(1, songs.length + 1);
      const targetIndex = Math.floor(yInTimeline / itemHeight);
      
      if (draggedSong && onSongDrop) {
        onSongDrop(draggedSong, draggedSong.originalIndex, targetIndex);
      }
    }
    
    // Reset state
    setIsTouchDragging(false);
    setDraggedSong(null);
    setDropTargetIndex(null);
    setTouchDragIndex(null);
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
        // Correctly handle both current song placement and reordering
        const songToDrop = data.song || draggedSong;
        const fromIndex = data.index !== undefined ? data.index : draggedSong.originalIndex;
        onSongDrop(songToDrop, fromIndex, targetIndex);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }

    setDraggedSong(null);
    setMousePosition({ x: 0, y: 0 });
  };

  // Handle drag end for mouse
  const handleDragEnd = () => {
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
      className={`timeline ${className}`}
      role="list"
      aria-label="Song timeline"
      onTouchMove={isTouchDevice ? handleTouchMove : undefined}
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
            className="timeline-empty" 
            role="status"
            aria-label="Timeline is empty"
          >
            <p>Timeline is empty</p>
            <p>Drag songs here to start building your playlist</p>
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
                className={`drop-zone ${dropTargetIndex === index ? 'active' : ''}`}
                data-testid="drop-zone"
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onTouchEnd={(e) => {
                  if (isTouchDragging) {
                    handleTouchEnd(e);
                  }
                }}
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
                className={`song-item ${draggedSong?.id === song.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, song, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, song, index)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    // Start drag with keyboard
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
                }}
                role="button"
                aria-label={`Drag ${song.title} by ${song.artist}. Press Space or Enter to grab.`}
                tabIndex={0}
                aria-grabbed={draggedSong?.id === song.id ? 'true' : 'false'}
              >
                <div className="song-info">
                  <h4 className="song-title">{song.title}</h4>
                  <p className="song-artist">by {song.artist}</p>
                  <span className="song-year">{song.release_year}</span>
                </div>
                <div className="song-position" aria-label={`Position ${index + 1}`}>
                  #{index + 1}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Drop zone at the end */}
        <div
          className={`drop-zone end-zone ${dropTargetIndex === songs.length ? 'active' : ''}`}
          data-testid="drop-zone"
          onDragOver={(e) => handleDragOver(e, songs.length)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, songs.length)}
          onTouchEnd={(e) => {
            if (isTouchDragging) {
              handleTouchEnd(e);
            }
          }}
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
      </div>
    </div>
  );
}

Timeline.propTypes = {
  songs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string.isRequired,
      artist: PropTypes.string.isRequired,
      release_year: PropTypes.number
    })
  ),
  onSongDrop: PropTypes.func,
  className: PropTypes.string
};

export default Timeline;