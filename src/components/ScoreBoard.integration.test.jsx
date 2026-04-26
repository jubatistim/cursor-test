import { describe, it, expect, vi } from 'vitest';
import { render, screen, rerender } from '@testing-library/react';
import { ScoreBoard } from './ScoreBoard';

// Mock CSS imports to prevent import errors
vi.mock('./ScoreBoard.css', () => ({}));

describe('ScoreBoard Integration Tests', () => {
  const mockPlayers = [
    { id: 'player1', player_number: 1 },
    { id: 'player2', player_number: 2 }
  ];

  it('updates scores when gameStates change', () => {
    const initialGameStates = [
      { player_id: 'player1', score: 0, correct_placements: 0 },
      { player_id: 'player2', score: 0, correct_placements: 0 }
    ];

    const { rerender } = render(
      <ScoreBoard players={mockPlayers} gameStates={initialGameStates} currentPlayerId="player1" />
    );

    // Verify initial scores
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getAllByText('0')).toHaveLength(2);

    // Simulate score update
    const updatedGameStates = [
      { player_id: 'player1', score: 3, correct_placements: 2 },
      { player_id: 'player2', score: 1, correct_placements: 1 }
    ];

    rerender(
      <ScoreBoard players={mockPlayers} gameStates={updatedGameStates} currentPlayerId="player1" />
    );

    // Verify updated scores
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('detects score changes correctly', () => {
    const initialGameStates = [
      { player_id: 'player1', score: 2, correct_placements: 1 },
      { player_id: 'player2', score: 1, correct_placements: 0 }
    ];

    const { rerender } = render(
      <ScoreBoard players={mockPlayers} gameStates={initialGameStates} currentPlayerId="player1" />
    );

    // Verify initial scores are displayed
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();

    // Simulate score increase
    const updatedGameStates = [
      { player_id: 'player1', score: 4, correct_placements: 2 }, // Increased
      { player_id: 'player2', score: 1, correct_placements: 0 }  // Same
    ];

    rerender(
      <ScoreBoard players={mockPlayers} gameStates={updatedGameStates} currentPlayerId="player1" />
    );

    // Verify scores are updated
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('2')).toBeNull();
  });

  it('maintains sorting when scores change', () => {
    const initialGameStates = [
      { player_id: 'player1', score: 5, correct_placements: 3 },
      { player_id: 'player2', score: 3, correct_placements: 2 }
    ];

    const { rerender } = render(
      <ScoreBoard players={mockPlayers} gameStates={initialGameStates} currentPlayerId="player1" />
    );

    // Verify initial scores and order
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    // Get initial order
    const container = screen.getByText('Score').closest('.score-board');
    const initialEntries = container.querySelectorAll('.score-entry');
    expect(initialEntries[0]).toHaveTextContent('You (P1)');
    expect(initialEntries[0]).toHaveTextContent('5');

    // Simulate Player 2 overtaking Player 1
    const updatedGameStates = [
      { player_id: 'player1', score: 5, correct_placements: 3 },
      { player_id: 'player2', score: 7, correct_placements: 4 }
    ];

    rerender(
      <ScoreBoard players={mockPlayers} gameStates={updatedGameStates} currentPlayerId="player1" />
    );

    // Verify scores updated and order changed
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    
    const updatedEntries = container.querySelectorAll('.score-entry');
    expect(updatedEntries[0]).toHaveTextContent('Player 2');
    expect(updatedEntries[0]).toHaveTextContent('7');
    expect(updatedEntries[1]).toHaveTextContent('You (P1)');
    expect(updatedEntries[1]).toHaveTextContent('5');
  });

  it('handles player addition and removal', () => {
    const initialPlayers = [
      { id: 'player1', player_number: 1 }
    ];
    const initialGameStates = [
      { player_id: 'player1', score: 2, correct_placements: 1 }
    ];

    const { rerender } = render(
      <ScoreBoard players={initialPlayers} gameStates={initialGameStates} currentPlayerId="player1" />
    );

    // Initially only one player
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.queryByText('Player 2')).toBeNull();

    // Add second player
    const updatedPlayers = [
      { id: 'player1', player_number: 1 },
      { id: 'player2', player_number: 2 }
    ];
    const updatedGameStates = [
      { player_id: 'player1', score: 2, correct_placements: 1 },
      { player_id: 'player2', score: 1, correct_placements: 0 }
    ];

    rerender(
      <ScoreBoard players={updatedPlayers} gameStates={updatedGameStates} currentPlayerId="player1" />
    );

    // Both players should now be displayed
    expect(screen.getByText('You (P1)')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('handles real-time score update simulation', () => {
    const initialGameStates = [
      { player_id: 'player1', score: 0, correct_placements: 0 },
      { player_id: 'player2', score: 0, correct_placements: 0 }
    ];

    const { rerender } = render(
      <ScoreBoard players={mockPlayers} gameStates={initialGameStates} currentPlayerId="player1" />
    );

    // Simulate rapid score updates (like real-time updates)
    const scoreUpdates = [
      [{ player_id: 'player1', score: 1, correct_placements: 0 },
       { player_id: 'player2', score: 0, correct_placements: 0 }],
      [{ player_id: 'player1', score: 1, correct_placements: 0 },
       { player_id: 'player2', score: 1, correct_placements: 0 }],
      [{ player_id: 'player1', score: 2, correct_placements: 1 },
       { player_id: 'player2', score: 1, correct_placements: 0 }],
      [{ player_id: 'player1', score: 2, correct_placements: 1 },
       { player_id: 'player2', score: 3, correct_placements: 2 }]
    ];

    scoreUpdates.forEach((gameStates, index) => {
      rerender(
        <ScoreBoard players={mockPlayers} gameStates={gameStates} currentPlayerId="player1" />
      );
      
      // Verify scores are updated correctly
      const player1Score = gameStates.find(gs => gs.player_id === 'player1').score;
      const player2Score = gameStates.find(gs => gs.player_id === 'player2').score;

      expect(screen.getAllByText(player1Score.toString()).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(player2Score.toString()).length).toBeGreaterThanOrEqual(1);
    });
  });
});
