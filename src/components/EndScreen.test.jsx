import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EndScreen } from './EndScreen';

describe('EndScreen', () => {
  const mockPlayers = [
    { id: '1', player_number: 1, name: 'Player 1' },
    { id: '2', player_number: 2, name: 'Player 2' }
  ];

  const mockGameStates = [
    { player_id: '1', score: 10, correct_placements: 10 },
    { player_id: '2', score: 7, correct_placements: 7 }
  ];

  const roomCode = 'test-room';

  it('renders winner announcement when winner_id is provided', () => {
    render(
      <EndScreen
        players={mockPlayers}
        gameStates={mockGameStates}
        winnerId="1"
        currentPlayerId="1"
        roomCode={roomCode}
      />
    );

    expect(screen.getByText(/🎉 Congratulations!/)).toBeInTheDocument();
    expect(screen.getByText(/You Won!/)).toBeInTheDocument();
    expect(screen.getByText(/Final Score: 10/)).toBeInTheDocument();
  });

  it('renders loser message when current player did not win', () => {
    render(
      <EndScreen
        players={mockPlayers}
        gameStates={mockGameStates}
        winnerId="1"
        currentPlayerId="2"
        roomCode={roomCode}
      />
    );

    expect(screen.getByText(/Good Game!/)).toBeInTheDocument();
    expect(screen.getByText(/Player 1 Won!/)).toBeInTheDocument();
    expect(screen.getByText(/Your Final Score: 7/)).toBeInTheDocument();
  });

  it('displays both players final scores', () => {
    const { container } = render(
      <EndScreen
        players={mockPlayers}
        gameStates={mockGameStates}
        winnerId="1"
        currentPlayerId="1"
        roomCode={roomCode}
      />
    );

    expect(container.textContent).toContain('You (Player 1)');
    expect(container.textContent).toContain('Player 2');
    expect(container.textContent).toContain('10 pts');
    expect(container.textContent).toContain('7 pts');
  });

  it('shows confetti for winner', () => {
    render(
      <EndScreen
        players={mockPlayers}
        gameStates={mockGameStates}
        winnerId="1"
        currentPlayerId="1"
        roomCode={roomCode}
      />
    );

    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('does not show confetti for loser', () => {
    render(
      <EndScreen
        players={mockPlayers}
        gameStates={mockGameStates}
        winnerId="1"
        currentPlayerId="2"
        roomCode={roomCode}
      />
    );

    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });
});
