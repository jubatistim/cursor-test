import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBoard } from './ScoreBoard';

// Mock CSS imports to prevent import errors
vi.mock('./ScoreBoard.css', () => ({}));

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
    
    // Player 2 should be mentioned first (higher score)
    const player2Element = screen.getByText('Player 2');
    const player1Element = screen.getByText('You (P1)');
    
    // Verify scores are displayed
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    
    // Get the container to check order
    const container = player2Element.closest('.score-entries');
    const allEntries = container.querySelectorAll('.score-entry');
    
    // First entry should be Player 2 (higher score)
    expect(allEntries[0]).toHaveTextContent('Player 2');
    expect(allEntries[0]).toHaveTextContent('5');
    // Second entry should be Player 1
    expect(allEntries[1]).toHaveTextContent('You (P1)');
    expect(allEntries[1]).toHaveTextContent('3');
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
    
    // Get the container to check order
    const container = screen.getByText('Score').closest('.score-board');
    const allEntries = container.querySelectorAll('.score-entry');
    
    // When scores are equal, lower player number should be first
    // currentPlayerId="player1" so player1 displays as "You (P1)"
    expect(allEntries[0]).toHaveTextContent('You (P1)');
    expect(allEntries[0]).toHaveTextContent('3');
    expect(allEntries[1]).toHaveTextContent('Player 2');
    expect(allEntries[1]).toHaveTextContent('3');
  });
});
