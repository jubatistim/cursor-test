import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock supportsTouch before importing SongCard
vi.mock('../utils/dragUtils', async () => {
  const actual = await vi.importActual('../utils/dragUtils');
  return {
    ...actual,
    supportsTouch: () => false
  };
});

import { SongCard } from '../components/SongCard';

// Global flag to track renders for unique IDs
describe('SongCard Component', () => {
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

  it('renders song information correctly', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    expect(screen.getByText(mockSong.title)).toBeTruthy();
    expect(screen.getByText(`by ${mockSong.artist}`)).toBeTruthy();
    expect(screen.getByText('Unplaced')).toBeTruthy();
  });

  it('shows drag hint', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    expect(screen.getByText('⋮⋮')).toBeTruthy();
    expect(screen.getByText('Drag to timeline')).toBeTruthy();
  });

  it('calls onDragStart when drag starts', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
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

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    const mockDataTransfer = {
      effectAllowed: 'move',
      setData: vi.fn(),
    };

    fireEvent.dragStart(songCard, { dataTransfer: mockDataTransfer });

    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', JSON.stringify({ song: mockSong }));
  });

  it('applies custom className', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} className="custom-card" />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.className).toContain('custom-card');
  });

  it('renders nothing when song is null', () => {
    const { container } = render(<SongCard song={null} onDragStart={mockOnDragStart} />);
    expect(container.firstChild).toBeNull();
  });

  it('is draggable', () => {
    render(<SongCard song={mockSong} onDragStart={mockOnDragStart} />);

    const songCard = screen.getByText(mockSong.title).closest('.song-card');
    expect(songCard.getAttribute('draggable')).toBe('true');
  });
});