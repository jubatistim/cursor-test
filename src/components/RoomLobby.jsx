import { useState, useEffect, useRef } from 'react';

export function RoomLobby({ roomCode }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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

  return (
    <div className="lobby-container">
      <h2>Room Lobby</h2>
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
          <span>Player 1 (Host) - Joined</span><br/>
          <span className="waiting-player">Player 2 - Waiting...</span>
        </div>
      </div>

      <button 
        disabled={true}
        className="start-match-button"
      >
        Start Match
      </button>
    </div>
  );
}
