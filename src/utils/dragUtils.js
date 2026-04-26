/**
 * Drag and drop utilities for timeline song placement
 * Handles mouse and touch events with performance optimizations
 */

/**
 * Throttle function calls to improve performance during drag operations
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Get drop target index based on mouse/touch position
 * @param {Event} event - Drag event
 * @param {HTMLElement} timelineElement - Timeline container element
 * @param {Array} songs - Current songs array
 * @param {number} [itemHeight] - Optional height of song items (defaults to dynamic calculation)
 * @returns {number} Target index for drop
 */
export function getDropTargetIndex(event, timelineElement, songs, itemHeight) {
  const rect = timelineElement.getBoundingClientRect();
  const y = event.clientY - rect.top;

  // Use provided itemHeight or calculate dynamically based on timeline height
  const calculatedItemHeight = itemHeight || 
    (songs.length > 0 ? rect.height / (songs.length + 1) : 80);
  
  // Calculate which position the drop should occur at
  const targetIndex = Math.floor(y / calculatedItemHeight);

  // Clamp to valid range
  return Math.max(0, Math.min(targetIndex, songs.length));
}

/**
 * Get the actual item height from the DOM
 * @param {HTMLElement} containerElement - Container with song items
 * @returns {number} Average height of song items
 */
export function getActualItemHeight(containerElement) {
  if (!containerElement) return 80;
  
  const songItems = containerElement.querySelectorAll('.song-item, .timeline-item');
  if (songItems.length === 0) return 80;
  
  let totalHeight = 0;
  songItems.forEach(item => {
    totalHeight += item.getBoundingClientRect().height;
  });
  
  return totalHeight / songItems.length;
}

/**
 * Check if drag event is over a valid drop zone
 * @param {Event} event - Drag event
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether the element is a valid drop target
 */
export function isValidDropTarget(event, element) {
  return element && element.classList.contains('drop-zone');
}

/**
 * Calculate insertion position for visual feedback
 * @param {Event} event - Drag event
 * @param {HTMLElement} timelineElement - Timeline container
 * @returns {Object} Position information
 */
export function getInsertionPosition(event, timelineElement) {
  const rect = timelineElement.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const timelineHeight = rect.height;

  return {
    relativeY,
    timelineHeight,
    percentage: (relativeY / timelineHeight) * 100
  };
}

/**
 * Handle touch events for mobile drag and drop
 * @param {TouchEvent} event - Touch event
 * @param {Function} callback - Callback function
 */
export function handleTouchDrag(event, callback) {
  event.preventDefault();

  if (event.touches.length > 0) {
    const touch = event.touches[0];
    const syntheticEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      dataTransfer: event.dataTransfer || {
        effectAllowed: 'move',
        dropEffect: 'move',
        setData: () => {},
        getData: () => '{}'
      }
    };

    callback(syntheticEvent);
  }
}

/**
 * Create drag image for better visual feedback
 * @param {HTMLElement} element - Element being dragged
 * @param {Event} event - Drag event
 */
export function createDragImage(element, event) {
  try {
    const dragImage = element.cloneNode(true);
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(-2deg)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';

    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, event.offsetX, event.offsetY);

    // Clean up after drag ends
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  } catch (error) {
    console.warn('Could not create drag image:', error);
  }
}

/**
 * Check if device supports touch events
 * @returns {boolean} Whether touch is supported
 */
export function supportsTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get appropriate event handlers for current device
 * @returns {Object} Event handler mappings
 */
export function getDragEventHandlers() {
  const isTouch = supportsTouch();

  return {
    dragStart: isTouch ? 'touchstart' : 'dragstart',
    dragMove: isTouch ? 'touchmove' : 'dragover',
    dragEnd: isTouch ? 'touchend' : 'dragend',
    drop: isTouch ? 'touchend' : 'drop'
  };
}

/**
 * Handle keyboard navigation for accessibility
 * @param {KeyboardEvent} event - Key event
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element
 * @param {Function} options.onSelect - Callback when item is selected
 * @param {boolean} [options.allowArrowKeys=true] - Enable arrow key navigation
 * @param {boolean} [options.allowSpaceEnter=true] - Enable Space/Enter to select
 */
export function handleKeyboardNavigation(event, options = {}) {
  const {
    container,
    onSelect,
    allowArrowKeys = true,
    allowSpaceEnter = true
  } = options;

  if (!container) return false;

  const focusableItems = container.querySelectorAll(
    '[tabindex]:not([tabindex="-1"]), button, [draggable="true"]'
  );
  
  if (focusableItems.length === 0) return false;

  const currentIndex = Array.from(focusableItems).findIndex(
    item => item === document.activeElement
  );

  switch (event.key) {
    case 'ArrowUp':
      if (allowArrowKeys) {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + focusableItems.length) % focusableItems.length;
        focusableItems[prevIndex].focus();
        return true;
      }
      break;
      
    case 'ArrowDown':
      if (allowArrowKeys) {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % focusableItems.length;
        focusableItems[nextIndex].focus();
        return true;
      }
      break;
      
    case ' ':
    case 'Enter':
      if (allowSpaceEnter && onSelect && currentIndex !== -1) {
        event.preventDefault();
        onSelect(focusableItems[currentIndex], currentIndex);
        return true;
      }
      break;
      
    case 'Escape':
      event.preventDefault();
      // Clear any active drag/selection
      return true;
      
    default:
      break;
  }

  return false;
}

/**
 * Create keyboard-accessible drag and drop handler
 * @param {Object} options - Configuration options
 * @returns {Object} Handlers for drag and drop with keyboard support
 */
export function createAccessibleDragHandlers(options = {}) {
  const {
    onDragStart,
    onDragEnd,
    onDrop,
    container
  } = options;

  return {
    onKeyDown: (event) => {
      handleKeyboardNavigation(event, {
        container,
        onSelect: (element) => {
          // Simulate drag start on Space/Enter
          if (element.getAttribute('draggable') === 'true') {
            element.dispatchEvent(new MouseEvent('dragstart', { bubbles: true }));
          }
        }
      });
    },
    onDragStart: (event, data) => {
      if (onDragStart) onDragStart(event, data);
      // Mark as grabbed for screen readers
      event.target.setAttribute('aria-grabbed', 'true');
    },
    onDragEnd: (event) => {
      if (onDragEnd) onDragEnd(event);
      // Clear grabbed state
      event.target.setAttribute('aria-grabbed', 'false');
    },
    onDrop: (event, targetIndex) => {
      if (onDrop) onDrop(event, targetIndex);
    }
  };
}