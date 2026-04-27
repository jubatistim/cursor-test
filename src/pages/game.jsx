import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchService } from '../utils/matchService';
import { roomService } from '../utils/roomService';
import { GameScreen } from '../components/GameScreen';
import { EndScreen } from '../components/EndScreen';

export default function GamePage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameStates, setGameStates] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMatchData() {
      try {
        setLoading(true);
        setError(null);

        // Get room data
        const roomData = await roomService.getRoomByCode(roomCode);
        if (!roomData) {
          setError('Room not found');
          setLoading(false);
          return;
        }

        // Get match data
        const matchData = await matchService.getMatchByRoomId(roomData.id);
        if (!matchData) {
          setError('Match not found');
          setLoading(false);
          return;
        }

        setMatch(matchData);

        // Get all players in the room
        const playersData = await roomService.getRoomPlayers(roomData.id);
        setPlayers(playersData);

        // Get all game states for this match
        const gameStatesData = await matchService.getAllGameStates(matchData.id);
        setGameStates(gameStatesData);

        // Get current player ID from session
        const sessionPlayerId = sessionStorage.getItem('playerId');
        setPlayerId(sessionPlayerId);

      } catch (err) {
        console.error('Error loading match data:', err);
        setError(err.message || 'Failed to load match data');
      } finally {
        setLoading(false);
      }
    }

    loadMatchData();

    // Set up polling for match status changes
    const interval = setInterval(loadMatchData, 5000);
    return () => clearInterval(interval);
  }, [roomCode]);

  if (loading) {
    return (
      <div className="game-container">
        <h2>Loading game...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Home
        </button>
      </div>
    );
  }

  // Show EndScreen when match is finished (AC requirement: check at page level)
  if (match && match.status === 'finished') {
    return (
      <EndScreen
        players={players}
        gameStates={gameStates}
        winnerId={match.winner_id}
        currentPlayerId={playerId}
        roomCode={roomCode}
      />
    );
  }

  return <GameScreen roomCode={roomCode} />;
}
