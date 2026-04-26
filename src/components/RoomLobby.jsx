import { useState, useEffect, useRef } from 'react';
import { roomService } from '../utils/roomService';
import { supabase } from '../lib/supabase';

export function RoomLobby({ roomCode }) {
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timeoutRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const initializeLobby = async () => {
      try {
        setIsHost(sessionStorage.getItem('isHost') === 'true');
        await loadPlayers();
        setupRealtimeSubscription();
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
      // Clean up realtime subscription
      cleanupRealtimeSubscription();
    };
  }, [roomCode]);

  const cleanupRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const loadPlayers = async () => {
    try {
      const roomData = await roomService.getRoomByCode(roomCode);
      const playersData = await roomService.getRoomPlayers(roomData.id);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error loading players:', error);
      setError('Failed to load player data.');
    }
  };

  const setupRealtimeSubscription = () => {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) {
      console.warn('No roomId found in sessionStorage for realtime subscription');
      return;
    }

    // Clean up any existing subscription
    cleanupRealtimeSubscription();

    // Subscribe to changes in the players table for this room
    // Use parameterized filter for security
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
          loadPlayers(); // Reload players when changes occur
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      cleanupRealtimeSubscription();
    };
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
          className="start-match-button"
        >
          Start Match
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
