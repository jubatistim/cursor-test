import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

/**
 * RevealOverlay component - Displays round results after all players have placed their songs
 * Shows the correct release year and whether each player's placement was correct
 */
export function RevealOverlay({
  isVisible,
  releaseYear,
  songTitle,
  songArtist,
  playerResults,
  players,
  currentPlayerId,
  onComplete
}) {
  const [isClosing, setIsClosing] = useState(false);

  // Auto-close after a delay
  useEffect(() => {
    if (isVisible && !isClosing) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onComplete();
        }, 1000); // Animation duration
      }, 5000); // Show for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, isClosing, onComplete]);

  if (!isVisible) return null;

  // Get player names
  const getPlayerName = (player) => {
    if (player.id === currentPlayerId) {
      return `You (Player ${player.player_number})`;
    }
    return `Player ${player.player_number}`;
  };

  // Build results for display
  const results = players.map(player => {
    const result = playerResults[player.id];
    return {
      playerId: player.id,
      playerNumber: player.player_number,
      playerName: getPlayerName(player),
      isCorrect: result?.isCorrect || false,
      placedIndex: result?.placedIndex
    };
  });

  // Calculate how many got it correct
  const correctCount = results.filter(r => r.isCorrect).length;

  return (
    <div className={`reveal-overlay ${isClosing ? 'closing' : ''}`} role="alert" aria-live="assertive">
      <div className="reveal-content">
        <h2 className="reveal-title">Round Results</h2>
        
        <div className="song-info-section">
          <p className="song-title">{songTitle}</p>
          <p className="song-artist">by {songArtist}</p>
          <p className="correct-year">Correct Release Year: <strong>{releaseYear}</strong></p>
        </div>

        <div className="results-section">
          <h3>Placement Results:</h3>
          <div className="player-results">
            {results.map(result => (
              <div 
                key={result.playerId}
                className={`player-result ${result.isCorrect ? 'correct' : 'incorrect'}`}
              >
                <span className="player-name">{result.playerName}</span>
                <span className="result-status">
                  {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="summary">
          {correctCount} out of {results.length} players got it correct
        </div>
      </div>
    </div>
  );
}

RevealOverlay.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  releaseYear: PropTypes.number.isRequired,
  songTitle: PropTypes.string.isRequired,
  songArtist: PropTypes.string.isRequired,
  playerResults: PropTypes.object.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      player_number: PropTypes.number.isRequired
    })
  ).isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired
};

export default RevealOverlay;
