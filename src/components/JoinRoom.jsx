import { useState } from 'react';
import { validateRoomCode, formatRoomCode } from '../utils/roomCode';
import { roomService } from '../utils/roomService';

export function JoinRoom({ onJoinSuccess, onCancel }) {
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCode(formatted);
    setError(''); // Clear error when user starts typing
  };

  const handleJoinRoom = async () => {
    if (!validateRoomCode(roomCode)) {
      setError('Please enter a valid 6-character room code (letters and numbers only)');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const result = await roomService.joinRoom(roomCode);

      // Store player info in session
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('isHost', 'false');
      sessionStorage.setItem('roomId', result.roomId);
      sessionStorage.setItem('playerNumber', String(result.playerNumber));

      onJoinSuccess(roomCode);
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message || 'Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <div className="join-room-container">
      <h2>Join Room</h2>
      <div className="join-room-form">
        <div className="input-group">
          <label htmlFor="roomCode">Room Code</label>
          <input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter 6-character code"
            maxLength={6}
            disabled={isJoining}
            className="room-code-input"
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="join-room-actions">
          <button
            onClick={handleJoinRoom}
            disabled={isJoining || !roomCode}
            className="join-room-button"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
          <button
            onClick={onCancel}
            disabled={isJoining}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}