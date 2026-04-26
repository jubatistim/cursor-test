import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBoard } from './ScoreBoard';

describe('ScoreBoard', () => {
  const mockPlayers = [
    { id: 'player1', player_number: 1 },
    { id: 'player2', player_number: 2 }
  ];

  const mockGameStates = [
    { player_id: 'player1', score: 3, correct_placements: 2 },
    { player_id: 'player2', score: 5, correct_placements: 3 }
  ];

  it('renders score board header', () => {
    render(<ScoreBoard players={mockPlayers} gameStates={mockGameStates} currentPlayerId="player1" />);
    expect(screen.getByText('Score')).toBeTruthy();
  });

  it('displays correct scores for all players', () => {
    render(<ScoreBoard players={mockPlayers} gameStates={mockGameStates} currentPlayerId="player1" />);
    
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows current player indication', () => {
    render(<ScoreBoard players={mockPlayers} gameStates={mockGameStates} currentPlayerId="player1" />);
    
    const currentPlayerEntry = screen.getByText('You (P1)').closest('.score-entry');
    expect(currentPlayerEntry).toHaveClass('score-entry--current');
  });

  it('sorts players by score (highest first)', () => {
    render(<ScoreBoard players={mockPlayers} gameStates={mockGameStates} currentPlayerId="player1" />);
    
    const scoreEntries = screen.getAllByRole('generic').filter(el => el.classList.contains('score-entry'));
    expect(scoreEntries[0]).toHaveTextContent('Player 2');
    expect(scoreEntries[0]).toHaveTextContent('5');
    expect(scoreEntries[1]).toHaveTextContent('You (P1)');
    expect(scoreEntries[1]).toHaveTextContent('3');
  });

  it('handles missing game state gracefully', () => {
    const playersWithMissingState = [
      { id: 'player1', player_number: 1 },
      { id: 'player3', player_number: 3 }
    ];
    
    render(<ScoreBoard players={playersWithMissingState} gameStates={mockGameStates} currentPlayerId="player1" />);
    
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.getByText('Player 3')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy(); // player1 score
    expect(screen.getByText('0')).toBeTruthy(); // player3 default score
  });

  it('renders null when no players provided', () => {
    const { container } = render(<ScoreBoard players={[]} gameStates={[]} currentPlayerId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles undefined players gracefully', () => {
    const { container } = render(<ScoreBoard players={undefined} gameStates={[]} currentPlayerId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays player names correctly when not current player', () => {
    render(<ScoreBoard players={mockPlayers} gameStates={mockGameStates} currentPlayerId="player3" />);
    
    expect(screen.getByText('Player 1')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.queryByText('You (P1)')).toBeNull();
    expect(screen.queryByText('You (P2)')).toBeNull();
  });

  it('sorts by player number when scores are equal', () => {
    const tiedGameStates = [
      { player_id: 'player1', score: 3, correct_placements: 2 },
      { player_id: 'player2', score: 3, correct_placements: 3 }
    ];
    
    render(<ScoreBoard players={mockPlayers} gameStates={tiedGameStates} currentPlayerId="player1" />);
    
    const scoreEntries = screen.getAllByRole('generic').filter(el => el.classList.contains('score-entry'));
    expect(scoreEntries[0]).toHaveTextContent('Player 1'); // Lower player number first
    expect(scoreEntries[1]).toHaveTextContent('Player 2');
  });
});
