import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateRoomCode } from '../utils/roomCode';

export function Home() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    
    try {
      const roomCode = generateRoomCode();
      const hostId = `host_${crypto.randomUUID()}`;
      
      const { data, error: dbError } = await supabase
        .from('rooms')
        .insert([
          { 
            code: roomCode, 
            host_id: hostId,
            status: 'waiting',
            max_players: 2
          }
        ])
        .select();
        
      if (dbError) throw dbError;
      
      sessionStorage.setItem('playerId', hostId);
      sessionStorage.setItem('isHost', 'true');
      
      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="home-container">
      <h1>Hitster Web</h1>
      <div className="home-actions">
        <button 
          onClick={handleCreateRoom} 
          disabled={isCreating}
          className="create-room-button"
        >
          {isCreating ? 'Creating Room...' : 'Create Room'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}
