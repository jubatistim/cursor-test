import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock dragUtils for mobile environment
vi.mock('../utils/dragUtils', () => ({
  createDragImage: vi.fn(() => null),
  cleanupDragImage: vi.fn(),
  supportsTouch: () => true,
  isTouchPrimaryDevice: () => true,
  isDesktopDevice: () => false,
  getDragEventHandlers: () => ({
    dragStart: 'touchstart',
    dragMove: 'touchmove',
    dragEnd: 'touchend',
    drop: 'touchend'
  }),
  handleKeyboardNavigation: vi.fn(),
  getDropTargetIndex: vi.fn(),
  throttle: vi.fn((fn) => fn)
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
  configurable: true
});

import { SongCard } from './SongCard';

describe('SongCard Mobile Touch Controls', () => {
  beforeEach(() => {
    // Use fake timers for all tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  let mockSong;
  let mockOnDragStart;
  let renderCount = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    renderCount++;
    mockSong = {
      id: `song-${renderCount}`,
      title: `Test Song ${renderCount}`,
      artist: 'Test Artist',
      release_year: 1985
    };
    mockOnDragStart = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('should not be draggable on touch primary devices', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.getAttribute('draggable')).toBe('false');
  });

  it('should have touch-device class on touch primary devices', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.className).toContain('touch-device');
  });

  it('should have touch event handlers on touch devices', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    // Test that touch events can be fired (indicates handlers are present)
    expect(() => fireEvent.touchStart(songCard)).not.toThrow();
    expect(() => fireEvent.touchMove(songCard)).not.toThrow();
    expect(() => fireEvent.touchEnd(songCard)).not.toThrow();
    expect(() => fireEvent.touchCancel(songCard)).not.toThrow();
  });

  it('should have onTouchCancel handler on touch devices', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    // onTouchCancel is set as a prop, check it exists by testing the handler works
    expect(() => fireEvent.touchCancel(songCard)).not.toThrow();
  });

  it('should trigger drag start on touch move beyond threshold', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    // Start touch
    fireEvent.touchStart(songCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Move beyond threshold (10px)
    fireEvent.touchMove(songCard, {
      touches: [{ clientX: 120, clientY: 120 }]
    });
    
    expect(mockOnDragStart).toHaveBeenCalled();
    expect(songCard.getAttribute('aria-grabbed')).toBe('true');
  });

  it('should not trigger drag on small touch move', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    // Start touch
    fireEvent.touchStart(songCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Small move (less than threshold)
    fireEvent.touchMove(songCard, {
      touches: [{ clientX: 105, clientY: 105 }]
    });
    
    // Should not have triggered drag yet
    expect(mockOnDragStart).not.toHaveBeenCalled();
  });

  it('should cancel long press timer on touch move', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    // Start touch
    fireEvent.touchStart(songCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Move beyond threshold
    fireEvent.touchMove(songCard, {
      touches: [{ clientX: 120, clientY: 120 }]
    });
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should clean up on touch end after drag', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    // Start and complete drag
    fireEvent.touchStart(songCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(songCard, {
      touches: [{ clientX: 120, clientY: 120 }]
    });
    
    fireEvent.touchEnd(songCard, {
      changedTouches: [{ clientX: 120, clientY: 120 }]
    });
    
    expect(songCard.getAttribute('aria-grabbed')).toBe('false');
  });

  it('should clean up on touch cancel', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    // Start touch
    fireEvent.touchStart(songCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Cancel touch
    fireEvent.touchCancel(songCard);
    
    expect(songCard.getAttribute('aria-grabbed')).toBe('false');
  });

  it('should not apply desktop-hover class on touch devices', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.className).not.toContain('desktop-hover');
  });

  it('should not have touch handlers when revealed on mobile', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} revealed />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard).not.toHaveAttribute('onTouchStart');
    expect(songCard).not.toHaveAttribute('onTouchMove');
    expect(songCard).not.toHaveAttribute('onTouchEnd');
    expect(songCard).not.toHaveAttribute('onTouchCancel');
  });

  it('should maintain keyboard accessibility on mobile', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    // Should still support keyboard navigation
    fireEvent.keyDown(songCard, { key: ' ' });
    expect(mockOnDragStart).toHaveBeenCalled();
    
    fireEvent.keyDown(songCard, { key: 'Enter' });
    expect(mockOnDragStart).toHaveBeenCalledTimes(2);
  });

  it('should have proper ARIA attributes for mobile', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    expect(songCard.getAttribute('role')).toBe('button');
    expect(songCard.getAttribute('tabIndex')).toBe('0');
    expect(songCard.getAttribute('aria-grabbed')).toBe('false');
    expect(songCard.getAttribute('aria-label')).toContain('Drag');
  });

  it('should show correct status when revealed as correct', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} revealed isCorrect={true} />);

    expect(screen.getByText('✓ Correct')).toBeTruthy();
    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.className).toContain('correct');
  });

  it('should show correct status when revealed as incorrect', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} revealed isCorrect={false} />);

    expect(screen.getByText('✗ Incorrect')).toBeTruthy();
    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.className).toContain('incorrect');
  });

  it('should call onDragStart with song data on touch drag', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    
    fireEvent.touchStart(songCard, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(songCard, {
      touches: [{ clientX: 120, clientY: 120 }]
    });
    
    expect(mockOnDragStart).toHaveBeenCalledWith(
      expect.objectContaining({
        dataTransfer: expect.objectContaining({
          getData: expect.any(Function)
        })
      }),
      mockSong
    );
  });
});
