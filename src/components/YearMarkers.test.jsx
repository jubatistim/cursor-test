import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YearMarkers } from './YearMarkers';

describe('YearMarkers Component', () => {
  it('renders default decade markers when no songs', () => {
    render(<YearMarkers songs={[]} />);
    
    expect(screen.getByText('1960s')).toBeTruthy();
    expect(screen.getByText('1970s')).toBeTruthy();
    expect(screen.getByText('1980s')).toBeTruthy();
    expect(screen.getByText('1990s')).toBeTruthy();
    expect(screen.getByText('2000s')).toBeTruthy();
    expect(screen.getByText('2010s')).toBeTruthy();
    expect(screen.getByText('2020s')).toBeTruthy();
  });

  it('renders decade markers based on song years', () => {
    const songs = [
      { id: '1', title: 'Song One', artist: 'Artist One', release_year: 1985 },
      { id: '2', title: 'Song Two', artist: 'Artist Two', release_year: 1992 },
      { id: '3', title: 'Song Three', artist: 'Artist Three', release_year: 2005 },
    ];
    
    render(<YearMarkers songs={songs} />);
    
    expect(screen.getByText('1980s')).toBeTruthy();
    expect(screen.getByText('1990s')).toBeTruthy();
    expect(screen.getByText('2000s')).toBeTruthy();
    // 2005 is in 2000s, but range extends to 2010 (ceil)
    expect(screen.getByText('2010s')).toBeTruthy();
    // Should not show decades outside range
    expect(screen.queryByText('1970s')).toBeFalsy();
    expect(screen.queryByText('2020s')).toBeFalsy();
  });

  it('handles songs without release_year', () => {
    const songs = [
      { id: '1', title: 'Song One', artist: 'Artist One' },
    ];
    
    render(<YearMarkers songs={songs} />);
    
    // Should show default markers when no valid years
    expect(screen.getByText('1960s')).toBeTruthy();
  });

  it('applies custom className', () => {
    render(<YearMarkers songs={[]} className="custom-year-markers" />);
    
    const container = screen.getByText('1960s').closest('.year-markers');
    expect(container.className).toContain('custom-year-markers');
  });

  it('renders single decade for songs in same decade', () => {
    const songs = [
      { id: '1', title: 'Song One', artist: 'Artist One', release_year: 1985 },
      { id: '2', title: 'Song Two', artist: 'Artist Two', release_year: 1988 },
    ];
    
    render(<YearMarkers songs={songs} />);
    
    expect(screen.getByText('1980s')).toBeTruthy();
    expect(screen.queryByText('1970s')).toBeFalsy();
    expect(screen.queryByText('1990s')).toBeFalsy();
  });

  it('renders markers in chronological order', () => {
    const songs = [
      { id: '1', title: 'Song One', artist: 'Artist One', release_year: 2005 },
      { id: '2', title: 'Song Two', artist: 'Artist Two', release_year: 1985 },
      { id: '3', title: 'Song Three', artist: 'Artist Three', release_year: 1995 },
    ];
    
    render(<YearMarkers songs={songs} />);
    
    const markers = screen.getAllByText(/\d{4}s/);
    const markerTexts = markers.map(m => m.textContent);
    
    // Check that markers are in chronological order
    // Range: 1980-2010 based on min=1985, max=2005
    expect(markerTexts).toEqual(['1980s', '1990s', '2000s', '2010s']);
  });
});
