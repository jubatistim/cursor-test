import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DragPreview } from './DragPreview';

describe('DragPreview Component', () => {
  const mockSong = {
    id: '1',
    title: 'Test Song',
    artist: 'Test Artist',
    release_year: 1985
  };

  it('renders nothing when not visible', () => {
    const { container } = render(
      <DragPreview isVisible={false} position={0} song={mockSong} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when song is null', () => {
    const { container } = render(
      <DragPreview isVisible={true} position={0} song={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders preview with song information when visible', () => {
    render(
      <DragPreview isVisible={true} position={2} song={mockSong} />
    );
    
    expect(screen.getByText('Test Song')).toBeTruthy();
    expect(screen.getByText('Test Artist')).toBeTruthy();
  });

  it('displays correct position', () => {
    render(
      <DragPreview isVisible={true} position={3} song={mockSong} />
    );
    
    expect(screen.getByText('Position: 4')).toBeTruthy();
  });

  it('displays insertion indicator', () => {
    render(
      <DragPreview isVisible={true} position={0} song={mockSong} />
    );
    
    expect(screen.getByText('Will be placed here')).toBeTruthy();
  });

  it('applies custom className', () => {
    render(
      <DragPreview 
        isVisible={true} 
        position={0} 
        song={mockSong} 
        className="custom-drag-preview"
      />
    );
    
    const preview = screen.getByText('Test Song').closest('.drag-preview');
    expect(preview.className).toContain('custom-drag-preview');
  });

  it('displays position 1 correctly (0-indexed)', () => {
    render(
      <DragPreview isVisible={true} position={0} song={mockSong} />
    );
    
    expect(screen.getByText('Position: 1')).toBeTruthy();
  });

  it('renders insertion line visual element', () => {
    render(
      <DragPreview isVisible={true} position={1} song={mockSong} />
    );
    
    // Check for the insertion line div
    const insertionLine = screen.getByTestId('insertion-line') || 
                          document.querySelector('.insertion-line');
    expect(insertionLine).toBeTruthy();
  });
});
