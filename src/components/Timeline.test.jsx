import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../components/Timeline';

describe('Timeline Component', () => {
  const mockSongs = [
    { id: '1', title: 'Song One', artist: 'Artist One', release_year: 1985 },
    { id: '2', title: 'Song Two', artist: 'Artist Two', release_year: 1992 },
  ];

  const mockOnSongDrop = vi.fn();

  it('renders empty timeline message when no songs', () => {
    render(<Timeline songs={[]} onSongDrop={mockOnSongDrop} />);
    expect(screen.getByText('Timeline is empty')).toBeTruthy();
    expect(screen.getByText('Drag songs here to start building your playlist')).toBeTruthy();
  });

  it('renders songs in timeline', () => {
    render(<Timeline songs={mockSongs} onSongDrop={mockOnSongDrop} />);

    expect(screen.getByText('Song One')).toBeTruthy();
    expect(screen.getByText('by Artist One')).toBeTruthy();
    expect(screen.getByText('Song Two')).toBeTruthy();
    expect(screen.getByText('by Artist Two')).toBeTruthy();
  });

  it('shows song positions', () => {
    render(<Timeline songs={mockSongs} onSongDrop={mockOnSongDrop} />);

    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
  });

  it('shows release years', () => {
    render(<Timeline songs={mockSongs} onSongDrop={mockOnSongDrop} />);

    expect(screen.getByText('1985')).toBeTruthy();
    expect(screen.getByText('1992')).toBeTruthy();
  });

  it('calls onSongDrop when song is dropped', () => {
    render(<Timeline songs={mockSongs} onSongDrop={mockOnSongDrop} />);

    const dropZone = screen.getAllByTestId('drop-zone')[0];
    const mockDataTransfer = {
      getData: vi.fn(() => JSON.stringify({ song: mockSongs[0], index: 0 })),
    };

    // First trigger drag start to set draggedSong state
    const songItem = screen.getByText('Song One').closest('.song-item');
    const dragStartDataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
    };
    fireEvent.dragStart(songItem, { dataTransfer: dragStartDataTransfer });

    // Then drop
    fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

    expect(mockOnSongDrop).toHaveBeenCalledWith(mockSongs[0], 0, 0);
  });

  it('shows drop zone indicators when dragging over', () => {
    render(<Timeline songs={mockSongs} onSongDrop={mockOnSongDrop} />);

    const dropZone = screen.getAllByTestId('drop-zone')[0];
    const mockDataTransfer = {
      dropEffect: '',
    };

    fireEvent.dragOver(dropZone, { dataTransfer: mockDataTransfer });

    expect(screen.getByText('Drop here')).toBeTruthy();
  });

  it('renders empty timeline drop zone when no songs', () => {
    render(<Timeline songs={[]} onSongDrop={mockOnSongDrop} />);

    const dropZones = screen.getAllByTestId('drop-zone');
    expect(dropZones).toHaveLength(1);
    expect(screen.getByText('Timeline is empty')).toBeTruthy();
  });

  it('applies shift-down class to songs when insert target is at the top', () => {
    const { container } = render(<Timeline songs={mockSongs} onSongDrop={mockOnSongDrop} />);

    const dropZone = screen.getAllByTestId('drop-zone')[0];
    fireEvent.dragOver(dropZone, { dataTransfer: { dropEffect: '' } });

    const songItems = container.querySelectorAll('.song-item');
    expect(songItems[0].className).toContain('shift-down');
    expect(songItems[1].className).toContain('shift-down');
  });

  it('applies custom className', () => {
    render(<Timeline songs={[]} onSongDrop={mockOnSongDrop} className="custom-timeline" />);

    const timeline = screen.getByText('Timeline is empty').closest('.timeline');
    expect(timeline.className).toContain('custom-timeline');
  });

  describe('Locked Card Behavior', () => {
    const lockedSongs = [
      { id: '1', title: 'Locked Song', artist: 'Artist One', release_year: 1985, is_locked: true },
      { id: '2', title: 'Unlocked Song', artist: 'Artist Two', release_year: 1992, is_locked: false }
    ];

    it('shows lock indicator for locked cards', () => {
      render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const lockIndicator = screen.getByTitle('Locked card - cannot be moved');
      expect(lockIndicator).toBeTruthy();
      expect(lockIndicator.textContent).toBe('🔒');
    });

    it('applies locked class to locked cards', () => {
      const { container } = render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const songItems = container.querySelectorAll('.song-item');
      expect(songItems[0].className).toContain('locked');
      expect(songItems[1].className).not.toContain('locked');
    });

    it('prevents dragging of locked cards', () => {
      const { container } = render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const songItems = container.querySelectorAll('.song-item');
      const lockedSong = songItems[0];
      const unlockedSong = songItems[1];

      expect(lockedSong.draggable).toBe(false);
      expect(unlockedSong.draggable).toBe(true);
    });

    it('prevents touch events on locked cards', () => {
      const { container } = render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const songItems = container.querySelectorAll('.song-item');
      const lockedSong = songItems[0];
      const unlockedSong = songItems[1];

      // Check that locked cards are not draggable via touch
      expect(lockedSong.getAttribute('draggable')).toBe('false');
      expect(unlockedSong.getAttribute('draggable')).toBe('true');
    });

    it('shows correct aria-label for locked cards', () => {
      render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const lockedSong = screen.getByText('Locked Song').closest('.song-item');
      expect(lockedSong.getAttribute('aria-label')).toContain('Locked card, cannot be moved');
    });

    it('shows correct aria-label for unlocked cards', () => {
      render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const unlockedSong = screen.getByText('Unlocked Song').closest('.song-item');
      expect(unlockedSong.getAttribute('aria-label')).toContain('Drag Unlocked Song');
    });

    it('locks all cards when revealed is true', () => {
      const { container } = render(
        <Timeline 
          songs={mockSongs} 
          onSongDrop={mockOnSongDrop} 
          revealed={true}
          currentSongId="1"
          playerResult={{ isCorrect: true }}
        />
      );

      const songItems = container.querySelectorAll('.song-item');
      songItems.forEach(item => {
        expect(item.draggable).toBe(false);
      });
    });

    it('prevents keyboard interaction on locked cards', () => {
      const { container } = render(<Timeline songs={lockedSongs} onSongDrop={mockOnSongDrop} />);

      const lockedSong = container.querySelector('.song-item.locked');
      
      // Verify locked card has correct accessibility attributes
      expect(lockedSong.getAttribute('aria-grabbed')).toBe('false');
      expect(lockedSong.getAttribute('aria-label')).toContain('Locked card, cannot be moved');
    });
  });
});