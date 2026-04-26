import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../utils/roomService';
import { matchService } from '../utils/matchService';
import { supabase } from '../lib/supabase';

export function RoomLobby({ roomCode }) {
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [matchStarted, setMatchStarted] = useState(false);
  const timeoutRef = useRef(null);
  const channelRef = useRef(null);
  const matchChannelRef = useRef(null);
  const navigate = useNavigate();

  // Get current player and room info from session
  const playerId = sessionStorage.getItem('playerId');
  const roomId = sessionStorage.getItem('roomId');
  const playerNumber = sessionStorage.getItem('playerNumber');

  // Cleanup all subscriptions
  const cleanupAllSubscriptions = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (matchChannelRef.current) {
      supabase.removeChannel(matchChannelRef.current);
      matchChannelRef.current = null;
    }
  }, []);

  useEffect(() => {
    const initializeLobby = async () => {
      try {
        setIsHost(sessionStorage.getItem('isHost') === 'true');
        await loadPlayers();
        setupPlayersRealtimeSubscription();
        setupMatchStartSubscription();
      } catch (error) {
        console.error('Error initializing lobby:', error);
        setError('Failed to load room data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    initializeLobby();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cleanupAllSubscriptions();
    };
  }, [roomCode, cleanupAllSubscriptions]);

  const loadPlayers = useCallback(async () => {
    try {
      const roomData = await roomService.getRoomByCode(roomCode);
      const playersData = await roomService.getRoomPlayers(roomData.id);
      setPlayers(playersData);
      
      // Check if match has already started
      if (roomData.status === 'playing') {
        setMatchStarted(true);
        // Redirect to game if match started
        const match = await matchService.getMatchByRoomId(roomData.id);
        if (match) {
          navigate(`/game/${roomCode}`);
        }
      }
    } catch (error) {
      console.error('Error loading players:', error);
      setError('Failed to load player data.');
    }
  }, [roomCode, navigate]);

  const setupPlayersRealtimeSubscription = useCallback(() => {
    if (!roomId) {
      console.warn('No roomId found in sessionStorage for realtime subscription');
      return;
    }

    cleanupAllSubscriptions();

    // Subscribe to changes in the players table for this room
    const channel = supabase
      .channel('room_players_' + roomId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Player change detected:', payload);
          loadPlayers();
        }
      )
      .subscribe((status) => {
        console.log('Players subscription status:', status);
      });

    channelRef.current = channel;
  }, [roomId, cleanupAllSubscriptions, loadPlayers]);

  const setupMatchStartSubscription = useCallback(() => {
    if (!roomId) {
      console.warn('No roomId for match start subscription');
      return;
    }

    // Subscribe to changes in the matches table for this room
    const matchChannel = supabase
      .channel('room_matches_' + roomId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Match started detected:', payload);
          // Navigate to game screen when match is created
          navigate(`/game/${roomCode}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('Room status changed:', payload);
          if (payload.new.status === 'playing') {
            navigate(`/game/${roomCode}`);
          }
        }
      )
      .subscribe((status) => {
        console.log('Match subscription status:', status);
      });

    matchChannelRef.current = matchChannel;
  }, [roomId, roomCode, navigate]);

  const handleCopyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } else {
        console.warn('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleStartMatch = async () => {
    if (!isHost) {
      setError('Only the host can start the match.');
      return;
    }

    if (players.length < 2) {
      setError('Need 2 players to start the match.');
      return;
    }

    setIsStarting(true);
    setError('');

    try {
      await matchService.startMatch(roomId, playerId);
      // Navigation will happen via real-time subscription
      // But also navigate directly for the host
      setTimeout(() => {
        navigate(`/game/${roomCode}`);
      }, 500);
    } catch (err) {
      console.error('Error starting match:', err);
      setError(err.message || 'Failed to start match. Please try again.');
      setIsStarting(false);
    }
  };

  const getPlayerStatus = (playerNumber) => {
    const player = players.find(p => p.player_number === playerNumber);
    if (player) {
      return isHost && playerNumber === 1 ? 'Joined (You)' : 'Joined';
    }
    return 'Waiting...';
  };

  const getPlayerStatusClass = (playerNumber) => {
    const player = players.find(p => p.player_number === playerNumber);
    return player ? 'joined-player' : 'waiting-player';
  };

  const handleCopyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } else {
        console.warn('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getPlayerStatus = (playerNumber) => {
    const player = players.find(p => p.player_number === playerNumber);
    if (player) {
      return isHost && playerNumber === 1 ? 'Joined (You)' : 'Joined';
    }
    return 'Waiting...';
  };

  const getPlayerStatusClass = (playerNumber) => {
    const player = players.find(p => p.player_number === playerNumber);
    return player ? 'joined-player' : 'waiting-player';
  };

  if (loading) {
    return (
      <div className="lobby-container">
        <h2>Loading room...</h2>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h2>Room Lobby</h2>
      {error && <p className="error-message">{error}</p>}
      <div className="room-code-display">
        <h1>{roomCode}</h1>
        <button
          onClick={handleCopyCode}
          className="copy-button"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      <div className="players-list">
        <p>Waiting for players...</p>
        <div className="players">
          <span className={getPlayerStatusClass(1)}>
            Player 1 (Host) - {getPlayerStatus(1)}
          </span><br/>
          <span className={getPlayerStatusClass(2)}>
            Player 2 - {getPlayerStatus(2)}
          </span>
        </div>
      </div>

      {isHost && players.length >= 2 && (
        <button
          onClick={handleStartMatch}
          disabled={isStarting}
          className="start-match-button"
        >
          {isStarting ? 'Starting...' : 'Start Match'}
        </button>
      )}

      {isHost && players.length < 2 && (
        <p className="waiting-message">Waiting for another player to join...</p>
      )}

      {!isHost && (
        <p className="waiting-message">Waiting for host to start the game...</p>
      )}
    </div>
  );
}
