import { useState, useEffect, useRef } from 'react';
import './ScoreBoard.css';

/**
 * ScoreBoard component - Displays prominent score display at top of screen
 * Shows real-time score updates with subtle animations
 */
export function ScoreBoard({ players, gameStates, currentPlayerId }) {
  const [previousScores, setPreviousScores] = useState({});
  const [animatingPlayers, setAnimatingPlayers] = useState(new Set());
  const animationTimeoutRef = useRef(null);

  // Get player score from game states
  const getPlayerScore = (playerId) => {
    const gameState = gameStates.find(gs => gs.player_id === playerId);
    return gameState ? gameState.score : 0;
  };

  // Get player name with current player indication
  const getPlayerDisplayName = (player) => {
    if (!player) return 'Unknown';
    if (player.id === currentPlayerId) {
      return `You (P${player.player_number})`;
    }
    return `Player ${player.player_number}`;
  };

  // Detect score changes and trigger animations
  useEffect(() => {
    const newScores = {};
    const newAnimatingPlayers = new Set();
    
    players.forEach(player => {
      const currentScore = getPlayerScore(player.id);
      newScores[player.id] = currentScore;
      
      // Check if score increased
      if (previousScores[player.id] !== undefined && 
          currentScore > previousScores[player.id]) {
        newAnimatingPlayers.add(player.id);
      }
    });

    setPreviousScores(newScores);
    
    if (newAnimatingPlayers.size > 0) {
      // Clear existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Set animating players
      setAnimatingPlayers(newAnimatingPlayers);
      
      // Clear animation after duration
      animationTimeoutRef.current = setTimeout(() => {
        setAnimatingPlayers(new Set());
      }, 600);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [players, gameStates, previousScores]);

  // Sort players by score (highest first), then by player number
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = getPlayerScore(a.id);
    const scoreB = getPlayerScore(b.id);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.player_number - b.player_number;
  });

  if (!players || players.length === 0) {
    return null;
  }

  return (
    <div className="score-board">
      <div className="score-board-header">
        <h2>Score</h2>
      </div>
      <div className="score-entries">
        {sortedPlayers.map((player) => {
          const score = getPlayerScore(player.id);
          const isAnimating = animatingPlayers.has(player.id);
          const isCurrentPlayer = player.id === currentPlayerId;
          
          return (
            <div
              key={player.id}
              className={`score-entry ${isAnimating ? 'score-entry--animating' : ''} ${isCurrentPlayer ? 'score-entry--current' : ''}`}
            >
              <span className="score-entry__name">
                {getPlayerDisplayName(player)}
              </span>
              <span className={`score-entry__score ${isAnimating ? 'score-entry__score--bump' : ''}`}>
                {score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
