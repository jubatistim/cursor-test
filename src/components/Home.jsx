import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../utils/roomService';
import { JoinRoom } from './JoinRoom';

export function Home() {
  const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    
    try {
      const hostId = `host_${crypto.randomUUID()}`;
      const result = await roomService.createRoom(hostId);
      
      sessionStorage.setItem('playerId', hostId);
      sessionStorage.setItem('isHost', 'true');
      sessionStorage.setItem('roomId', result.roomId);
      sessionStorage.setItem('playerNumber', String(result.playerNumber));
      
      navigate(`/room/${result.roomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSuccess = (roomCode) => {
    navigate(`/room/${roomCode}`);
  };

  const handleCancelJoin = () => {
    setMode('menu');
    setError('');
  };

  if (mode === 'join') {
    return <JoinRoom onJoinSuccess={handleJoinSuccess} onCancel={handleCancelJoin} />;
  }

  return (
    <div className="home-container">
      <h1>Hitster Web</h1>
      <div className="home-actions">
        <button 
          onClick={() => setMode('create')}
          className="create-room-button"
        >
          Create Room
        </button>
        <button 
          onClick={() => setMode('join')}
          className="join-room-button"
        >
          Join Room
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>

      {mode === 'create' && (
        <div className="create-room-section">
          <p>Create a new room to start a game as the host.</p>
          <div className="create-actions">
            <button 
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="confirm-create-button"
            >
              {isCreating ? 'Creating Room...' : 'Confirm Create Room'}
            </button>
            <button 
              onClick={() => setMode('menu')}
              disabled={isCreating}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
