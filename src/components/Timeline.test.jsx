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
});