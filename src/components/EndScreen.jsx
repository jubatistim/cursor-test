import { Confetti } from './Confetti';
import './EndScreen.css';

import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * EndScreen component - displays final game results when match is finished
 * @param {Object[]} players - Array of player objects
 * @param {Object[]} gameStates - Array of game state objects
 * @param {string} winnerId - ID of the winning player
 * @param {string} currentPlayerId - ID of the current player
 * @param {string} roomCode - Room code for navigation
 */
export function EndScreen({ players, gameStates, winnerId, currentPlayerId, roomCode }) {
  const navigate = useNavigate();

  // Null safety: validate required props
  if (!players || !Array.isArray(players)) {
    console.error('EndScreen: players prop is missing or invalid');
    return (
      <div className="end-screen">
        <div className="error-message">Game data not available</div>
      </div>
    );
  }

  if (!gameStates || !Array.isArray(gameStates)) {
    console.error('EndScreen: gameStates prop is missing or invalid');
    // Continue with empty gameStates - will show 0 scores
  }

  const getPlayerGameState = (playerId) => {
    if (!playerId) return null;
    return gameStates.find(gs => gs && gs.player_id === playerId);
  };

  const getPlayerScore = (playerId) => {
    if (!playerId) return 0;
    const gameState = getPlayerGameState(playerId);
    return gameState ? gameState.score : 0;
  };

  const getPlayerCorrectPlacements = (playerId) => {
    if (!playerId) return 0;
    const gameState = getPlayerGameState(playerId);
    return gameState ? gameState.correct_placements : 0;
  };

  const getPlayerName = (player) => {
    if (!player) return 'Unknown';
    if (player.id === currentPlayerId) {
      return `You (Player ${player.player_number})`;
    }
    return `Player ${player.player_number}`;
  };

  const isWinner = currentPlayerId && winnerId && currentPlayerId === winnerId;
  const winner = players.find(p => p && p.id === winnerId);
  const currentScore = getPlayerScore(currentPlayerId);

  const handlePlayAgain = () => {
    navigate(`/room/${roomCode || 'unknown'}`);
  };

  const handleReturnToLobby = () => {
    navigate('/');
  };

  return (
    <div className="end-screen" role="dialog" aria-modal="true" aria-labelledby="end-screen-title">
      {isWinner && <Confetti />}
      
      <div className="end-screen-content" role="document">
        <header className="end-screen-header">
          <h1 id="end-screen-title" className="end-screen-title">
            {isWinner ? <span aria-label="Congratulations">🎉 Congratulations!</span> : 'Good Game!'}
          </h1>
          <p className="end-screen-subtitle" aria-live="polite">
            {isWinner ? 'You Won!' : `${getPlayerName(winner)} Won!`}
          </p>
        </header>

        <main className="end-screen-main" id="end-screen-main">
          <section className="final-score-section" aria-labelledby="final-scores-heading">
            <h2 id="final-scores-heading">Final Scores</h2>
            <div className="final-scores" role="list">
              {players.map((player) => {
                const score = getPlayerScore(player.id);
                const correct = getPlayerCorrectPlacements(player.id);
                const isPlayerWinner = player.id === winnerId;
                
                return (
                  <div 
                    key={player.id} 
                    className={`score-entry ${isPlayerWinner ? 'winner' : ''}`}
                    role="listitem"
                    aria-label={`Player ${player.player_number}: ${score} points, ${correct} correct placements${isPlayerWinner ? ', winner' : ''}`}
                  >
                    <span className="player-name">{getPlayerName(player)}</span>
                    <span className="player-score" aria-label="Score">{score} pts</span>
                    <span className="correct-count" aria-label="Correct placements">✓ {correct}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="player-result-section" aria-labelledby="result-heading">
            <h2 id="result-heading" className="visually-hidden">Your Result</h2>
            <div 
              className={`result-card ${isWinner ? 'winner' : 'loser'}`}
              role="status"
              aria-live="polite"
              aria-label={isWinner ? 'Victory!' : 'Game finished'}
            >
              <h3>{isWinner ? <span aria-label="Victory">🏆 Victory!</span> : <span aria-label="Well played">👏 Well Played!</span>}</h3>
              <p className="result-score" aria-label="Your final score">Your Final Score: {currentScore}</p>
              <p className="result-placements" aria-label="Correct placements count">
                Correct Placements: {getPlayerCorrectPlacements(currentPlayerId)}
              </p>
            </div>
          </section>
        </main>

        <footer className="end-screen-footer">
          <nav className="end-screen-actions" aria-label="End screen actions">
            <button 
              className="primary-button" 
              onClick={handlePlayAgain}
              aria-label="Start a new game in the same room"
            >
              Play Again
            </button>
            <button 
              className="secondary-button" 
              onClick={handleReturnToLobby}
              aria-label="Return to the main lobby"
            >
              Return to Lobby
            </button>
          </nav>
        </footer>
      </div>
  );
}

EndScreen.propTypes = {
  /** Array of player objects with id, player_number, name */
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      player_number: PropTypes.number.isRequired,
      name: PropTypes.string
    })
  ).isRequired,
  /** Array of game state objects with player_id, score, correct_placements */
  gameStates: PropTypes.arrayOf(
    PropTypes.shape({
      player_id: PropTypes.string.isRequired,
      score: PropTypes.number,
      correct_placements: PropTypes.number
    })
  ),
  /** ID of the winning player */
  winnerId: PropTypes.string,
  /** ID of the current player */
  currentPlayerId: PropTypes.string,
  /** Room code for Play Again navigation */
  roomCode: PropTypes.string
};
