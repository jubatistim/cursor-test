import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  throttle,
  getDropTargetIndex,
  isValidDropTarget,
  getInsertionPosition,
  handleTouchDrag,
  createDragImage,
  supportsTouch,
  getDragEventHandlers,
  getActualItemHeight
} from '../utils/dragUtils';

describe('Drag Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('throttle', () => {
    it('calls function immediately on first call', () => {
      const mockFn = vi.fn();
      const throttled = throttle(mockFn, 100);

      throttled();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('prevents multiple calls within throttle limit', () => {
      const mockFn = vi.fn();
      const throttled = throttle(mockFn, 100);

      throttled();
      throttled();
      throttled();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('allows call after throttle limit', () => {
      const mockFn = vi.fn();
      const throttled = throttle(mockFn, 50);

      throttled();
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for throttle to reset
      vi.advanceTimersByTime(60);

      throttled();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDropTargetIndex', () => {
    it('calculates correct index based on Y position', () => {
      const mockElement = {
        getBoundingClientRect: () => ({ top: 100, height: 240 }),
      };
      const mockEvent = { clientY: 180 }; // 80px from top
      const songs = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const result = getDropTargetIndex(mockEvent, mockElement, songs);
      expect(result).toBe(1); // Should be between items
    });

    it('clamps to valid range', () => {
      const mockElement = {
        getBoundingClientRect: () => ({ top: 100, height: 240 }),
      };
      const mockEvent = { clientY: 50 }; // Above timeline
      const songs = [{ id: '1' }, { id: '2' }];

      const result = getDropTargetIndex(mockEvent, mockElement, songs);
      expect(result).toBe(0);
    });
  });

  describe('isValidDropTarget', () => {
    it('returns true for element with drop-zone class', () => {
      const mockElement = { classList: { contains: vi.fn(() => true) } };
      const result = isValidDropTarget({}, mockElement);
      expect(result).toBe(true);
    });

    it('returns false for element without drop-zone class', () => {
      const mockElement = { classList: { contains: vi.fn(() => false) } };
      const result = isValidDropTarget({}, mockElement);
      expect(result).toBe(false);
    });
  });

  describe('getInsertionPosition', () => {
    it('calculates position correctly', () => {
      const mockElement = {
        getBoundingClientRect: () => ({ top: 100, height: 200 }),
      };
      const mockEvent = { clientY: 150 };

      const result = getInsertionPosition(mockEvent, mockElement);

      expect(result.relativeY).toBe(50);
      expect(result.timelineHeight).toBe(200);
      expect(result.percentage).toBe(25);
    });
  });

  describe('handleTouchDrag', () => {
    it('calls callback with synthetic event', () => {
      const mockCallback = vi.fn();
      const mockEvent = {
        preventDefault: vi.fn(),
        touches: [{ clientX: 100, clientY: 200 }],
        dataTransfer: null,
      };

      handleTouchDrag(mockEvent, mockCallback);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          clientX: 100,
          clientY: 200,
          dataTransfer: expect.any(Object),
        })
      );
    });
  });

  describe('supportsTouch', () => {
    it('returns a boolean value', () => {
      const result = supportsTouch();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getDragEventHandlers', () => {
    it('returns an object with event handler mappings', () => {
      const handlers = getDragEventHandlers();

      expect(handlers).toHaveProperty('dragStart');
      expect(handlers).toHaveProperty('dragMove');
      expect(handlers).toHaveProperty('dragEnd');
      expect(handlers).toHaveProperty('drop');

      // All values should be strings
      expect(typeof handlers.dragStart).toBe('string');
      expect(typeof handlers.dragMove).toBe('string');
      expect(typeof handlers.dragEnd).toBe('string');
      expect(typeof handlers.drop).toBe('string');
    });
  });

  describe('getDropTargetIndex with custom itemHeight', () => {
    it('uses custom itemHeight when provided', () => {
      const mockElement = {
        getBoundingClientRect: () => ({ top: 100 }),
      };
      const mockEvent = { clientY: 180 }; // 80px from top
      const songs = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const customItemHeight = 40;

      const result = getDropTargetIndex(mockEvent, mockElement, songs, customItemHeight);
      // With itemHeight of 40, 80px / 40 = 2
      expect(result).toBe(2);
    });

    it('uses dynamic calculation when no songs', () => {
      const mockElement = {
        getBoundingClientRect: () => ({ top: 100, height: 240 }),
      };
      const mockEvent = { clientY: 180 }; // 80px from top
      const songs = [];

      const result = getDropTargetIndex(mockEvent, mockElement, songs);
      // With no songs, the only valid index is 0
      expect(result).toBe(0);
    });
  });

  describe('getActualItemHeight', () => {
    it('returns default 80 when no container', () => {
      const result = getActualItemHeight(null);
      expect(result).toBe(80);
    });

    it('returns default 80 when no items found', () => {
      const mockContainer = document.createElement('div');
      const result = getActualItemHeight(mockContainer);
      expect(result).toBe(80);
    });

    it('calculates average height from items', () => {
      // Create mock container with items
      const container = document.createElement('div');
      const item1 = document.createElement('div');
      item1.className = 'song-item';
      item1.getBoundingClientRect = vi.fn(() => ({ height: 80 }));
      const item2 = document.createElement('div');
      item2.className = 'timeline-item';
      item2.getBoundingClientRect = vi.fn(() => ({ height: 100 }));
      
      container.appendChild(item1);
      container.appendChild(item2);
      
      // Mock querySelectorAll
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = vi.fn(() => [item1, item2]);

      const result = getActualItemHeight(container);
      expect(result).toBe(90); // Average of 80 and 100

      document.querySelectorAll = originalQuerySelectorAll;
    });
  });
});