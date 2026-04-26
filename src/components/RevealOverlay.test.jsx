import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RevealOverlay from './RevealOverlay';

// Mock timers
vi.useFakeTimers();

describe('RevealOverlay', () => {
  const mockPlayers = [
    { id: 'player1', player_number: 1 },
    { id: 'player2', player_number: 2 }
  ];

  const mockPlayerResults = {
    player1: { isCorrect: true, placedIndex: 2 },
    player2: { isCorrect: false, placedIndex: 1 }
  };

  const mockProps = {
    isVisible: true,
    releaseYear: 1995,
    songTitle: 'Test Song',
    songArtist: 'Test Artist',
    playerResults: mockPlayerResults,
    players: mockPlayers,
    currentPlayerId: 'player1',
    onComplete: vi.fn()
  };

  it('renders correctly when visible', () => {
    render(<RevealOverlay {...mockProps} />);

    expect(screen.getByText('Round Results')).toBeInTheDocument();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('by Test Artist')).toBeInTheDocument();
    expect(screen.getByText(/Correct Release Year:/)).toBeInTheDocument();
    expect(screen.getByText('1995')).toBeInTheDocument();
    expect(screen.getByText('Placement Results:')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const props = { ...mockProps, isVisible: false };
    const { container } = render(<RevealOverlay {...props} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('displays player names correctly', () => {
    render(<RevealOverlay {...mockProps} />);

    expect(screen.getByText('You (Player 1)')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
  });

  it('displays correctness for each player', () => {
    render(<RevealOverlay {...mockProps} />);

    expect(screen.getByText('✓ Correct')).toBeInTheDocument();
    expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
  });

  it('shows correct count summary', () => {
    render(<RevealOverlay {...mockProps} />);

    expect(screen.getByText('1 out of 2 players got it correct')).toBeInTheDocument();
  });

  it('calls onComplete after timeout', () => {
    render(<RevealOverlay {...mockProps} />);

    // Fast-forward through the reveal display time and closing animation
    vi.advanceTimersByTime(5000); // Display time
    vi.advanceTimersByTime(1000); // Closing animation

    expect(mockProps.onComplete).toHaveBeenCalled();
  });

  it('applies correct class to correct player results', () => {
    render(<RevealOverlay {...mockProps} />);

    const correctResult = screen.getByText('✓ Correct').closest('.player-result');
    expect(correctResult).toHaveClass('correct');
  });

  it('applies incorrect class to incorrect player results', () => {
    render(<RevealOverlay {...mockProps} />);

    const incorrectResult = screen.getByText('✗ Incorrect').closest('.player-result');
    expect(incorrectResult).toHaveClass('incorrect');
  });

  it('has proper accessibility attributes', () => {
    render(<RevealOverlay {...mockProps} />);

    const overlay = screen.getByRole('alert');
    expect(overlay).toHaveAttribute('aria-live', 'assertive');
  });
});
