import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SongCard } from '../components/SongCard';

describe('SongCard Component', () => {
  const mockSong = {
    id: '1',
    title: 'Test Song',
    artist: 'Test Artist',
    release_year: 1985
  };

  const mockOnDragStart = vi.fn();

  it('renders song information correctly', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    expect(screen.getByText('Test Song')).toBeTruthy();
    expect(screen.getByText('by Test Artist')).toBeTruthy();
    expect(screen.getByText('Unplaced')).toBeTruthy();
  });

  it('shows drag hint', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    expect(screen.getByText('⋮⋮')).toBeTruthy();
    expect(screen.getByText('Drag to timeline')).toBeTruthy();
  });

  it('calls onDragStart when drag starts', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText('Test Song').closest('.song-card');
    const mockDataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
    };

    fireEvent.dragStart(songCard, { dataTransfer: mockDataTransfer });

    expect(mockOnDragStart).toHaveBeenCalledWith(
      expect.objectContaining({ dataTransfer: mockDataTransfer }),
      mockSong
    );
  });

  it('sets correct drag data', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText('Test Song').closest('.song-card');
    const mockDataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
    };

    fireEvent.dragStart(songCard, { dataTransfer: mockDataTransfer });

    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', JSON.stringify({ song: mockSong }));
  });

  it('applies custom className', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} className="custom-card" />);

    const songCard = screen.getByText('Test Song').closest('.song-card');
    expect(songCard.className).toContain('custom-card');
  });

  it('renders nothing when song is null', () => {
    const { container } = render(<SongCard song={null} onDragStart={mockOnDragStart} />);
    expect(container.firstChild).toBeNull();
  });

  it('is draggable', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText('Test Song').closest('.song-card');
    expect(songCard.getAttribute('draggable')).toBe('true');
  });
});