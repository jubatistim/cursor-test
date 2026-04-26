import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { matchService } from '../utils/matchService';
import { roomService } from '../utils/roomService';
import { supabase } from '../lib/supabase';

/**
 * GameScreen component - Main game interface
 * Displays match information, player scores, and game state
 */
export function GameScreen() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [gameStates, setGameStates] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [maxScore, setMaxScore] = useState(10);
  const matchChannelRef = useRef(null);
  const gameStateChannelRef = useRef(null);

  // Get session data
  useEffect(() => {
    const sessionPlayerId = sessionStorage.getItem('playerId');
    const sessionIsHost = sessionStorage.getItem('isHost') === 'true';
    const sessionPlayerNumber = sessionStorage.getItem('playerNumber');
    
    setPlayerId(sessionPlayerId);
    setIsHost(sessionIsHost);
    setPlayerNumber(sessionPlayerNumber ? parseInt(sessionPlayerNumber) : null);
  }, []);

  const loadMatchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

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
      setCurrentRound(matchData.current_round);
      setMaxScore(matchData.max_score);

      // Get all players in the room
      const playersData = await roomService.getRoomPlayers(roomData.id);
      setPlayers(playersData);

      // Get all game states for this match
      const gameStatesData = await matchService.getAllGameStates(matchData.id);
      setGameStates(gameStatesData);

    } catch (err) {
      console.error('Error loading match data:', err);
      setError(err.message || 'Failed to load match data');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Setup real-time subscriptions
  useEffect(() => {
    const roomId = sessionStorage.getItem('roomId');
    
    if (!roomId || !roomCode) {
      setError('Invalid room or match data');
      return;
    }

    loadMatchData();

    // Subscribe to match changes
    const matchChannel = supabase
      .channel('match_updates_' + roomId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Match update detected:', payload);
          loadMatchData();
        }
      )
      .subscribe();

    matchChannelRef.current = matchChannel;

    // Subscribe to game state changes
    const gameStateChannel = supabase
      .channel('game_state_updates_' + roomId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_states',
          filter: `match_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Game state update detected:', payload);
          loadMatchData();
        }
      )
      .subscribe();

    gameStateChannelRef.current = gameStateChannel;

    return () => {
      if (matchChannelRef.current) {
        supabase.removeChannel(matchChannelRef.current);
      }
      if (gameStateChannelRef.current) {
        supabase.removeChannel(gameStateChannelRef.current);
      }
    };
  }, [roomCode, loadMatchData]);

  const getPlayerGameState = (playerId) => {
    return gameStates.find(gs => gs.player_id === playerId);
  };

  const getPlayerScore = (playerId) => {
    const gameState = getPlayerGameState(playerId);
    return gameState ? gameState.score : 0;
  };

  const getPlayerCorrectPlacements = (playerId) => {
    const gameState = getPlayerGameState(playerId);
    return gameState ? gameState.correct_placements : 0;
  };

  const getPlayerByNumber = (number) => {
    return players.find(p => p.player_number === number);
  };

  const getPlayerName = (player) => {
    if (!player) return 'Unknown';
    if (playerNumber === player.player_number) {
      return `You (Player ${player.player_number})`;
    }
    return `Player ${player.player_number}`;
  };

  const hasWinner = match && match.winner_id && match.status === 'ended';
  const getWinner = () => {
    if (!hasWinner) return null;
    return players.find(p => p.id === match.winner_id);
  };

  const handleLeaveGame = () => {
    navigate(`/room/${roomCode}`);
  };

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

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>Hitster</h1>
        <div className="game-info">
          <span className="room-code">Room: {roomCode}</span>
          <span className="round-indicator">Round: {currentRound} / ∞</span>
        </div>
      </header>

      <main className="game-main">
        <div className="game-area">
          <h2>Song Placement Area</h2>
          <div className="placement-zone">
            <p className="instructions">
              Drag and drop songs to place them in the correct order
            </p>
          </div>
        </div>

        <aside className="game-sidebar">
          <div className="scores-panel">
            <h3>Scores</h3>
            <div className="scoreboard">
              {players.map((player) => {
                const score = getPlayerScore(player.id);
                const correct = getPlayerCorrectPlacements(player.id);
                const isWinner = hasWinner && match.winner_id === player.id;
                const classes = ['score-entry', isWinner ? 'winner' : ''].join(' ');
                
                return (
                  <div key={player.id} className={classes}>
                    <span className="player-name">{getPlayerName(player)}</span>
                    <span className="player-score">{score} pts</span>
                    <span className="correct-count">✓ {correct}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="game-stats">
            <p>First to: {maxScore} points</p>
            {hasWinner && (
              <div className="winner-announcement">
                <h3>🎉 Game Over!</h3>
                <p>
                  Winner: {getPlayerName(getWinner())}
                  <br />
                  Final Score: {getPlayerScore(match.winner_id)}
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="game-footer">
        <button onClick={handleLeaveGame} className="leave-button">
          Leave Game
        </button>
      </footer>
    </div>
  );
}
