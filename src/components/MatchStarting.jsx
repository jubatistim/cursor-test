import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * MatchStarting component - Transition overlay shown when match is starting
 * Displays brief animation before redirecting to game screen
 */
export function MatchStarting({ roomCode, players }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [showDots, setShowDots] = useState('');

  // Animate progress bar and dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setShowDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(dotsInterval);
          clearInterval(progressInterval);
          navigate(`/game/${roomCode}`);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(progressInterval);
    };
  }, [roomCode, navigate, players]);

  const getPlayerName = (player, index) => {
    const playerNumber = player.player_number || (index + 1);
    return `Player ${playerNumber}`;
  };

  return (
    <div className="match-starting-overlay">
      <div className="match-starting-content">
        <h2>Starting Match</h2>
        <p className="starting-message">{showDots}</p>

        <div className="players-preview">
          <h3>Players Ready:</h3>
          <ul>
            {players.map((player, index) => (
              <li key={player.id || index}>
                {getPlayerName(player, index)}
              </li>
            ))}
          </ul>
        </div>

        <div className="room-code-display">
          <span>Room Code:</span>
          <strong>{roomCode}</strong>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
          <span className="progress-text">{progress}%</span>
        </div>

        <p className="loading-text">Initializing game state{showDots}</p>
      </div>
    </div>
  );
}
