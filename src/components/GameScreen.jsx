import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { matchService } from '../utils/matchService';
import { roomService } from '../utils/roomService';
import { roundService } from '../utils/roundService';
import { songService } from '../utils/songService';
import { supabase } from '../lib/supabase';
import { SongPlayer } from './SongPlayer';
import { RoundInfo } from './RoundInfo';
import { ReplayButton } from './ReplayButton';

/**
 * GameScreen component - Main game interface
 * Displays match information, player scores, and game state
 * Handles song playback for each round
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
  
  // Round and song playback state
  const [currentRoundData, setCurrentRoundData] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [snippetStartTime, setSnippetStartTime] = useState(null);
  const [hasStartedRound, setHasStartedRound] = useState(false);
  
  const [audioElementRef, setAudioElementRef] = useState(null);
  
  const matchChannelRef = useRef(null);
  const gameStateChannelRef = useRef(null);
  const roundChannelRef = useRef(null);

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

      // Load current round data
      await loadCurrentRoundData(matchData.id);

    } catch (err) {
      console.error('Error loading match data:', err);
      setError(err.message || 'Failed to load match data');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  const loadCurrentRoundData = useCallback(async (matchId) => {
    try {
      const roundData = await roundService.getCurrentRound(matchId);
      setCurrentRoundData(roundData);
      
      if (roundData && roundData.song_id) {
        const songData = await songService.getSongById(roundData.song_id);
        setCurrentSong(songData);
        
        // If round has started_at, set the snippet start time
        if (roundData.started_at) {
          const startedDate = new Date(roundData.started_at);
          setSnippetStartTime(startedDate.getTime() / 1000);
          setHasStartedRound(true);
        }
      } else {
        setCurrentSong(null);
        setHasStartedRound(false);
      }
    } catch (err) {
      console.error('Error loading round data:', err);
    }
  }, []);

  // Start a new round with a random song
  const startNewRound = useCallback(async () => {
    if (!match || !match.id || !isHost) {
      setError('Only the host can start a new round');
      return;
    }

    try {
      setError('');
      
      // Get current round number from match
      const currentRoundNum = match.current_round || 1;
      
      // Create new round - this will automatically select a random unused song
      const newRound = await roundService.createRound(match.id, currentRoundNum);
      
      if (!newRound) {
        throw new Error('Failed to create round');
      }
      
      setCurrentRoundData(newRound);
      setCurrentRound(currentRoundNum);
      
      // Get song data
      if (newRound.song_id) {
        const songData = await songService.getSongById(newRound.song_id);
        setCurrentSong(songData);
        
        // Update match in database to increment round counter
        // Note: This is done via trigger in the database
      }
      
      // Mark that we need to start playback
      setHasStartedRound(false);
      
    } catch (err) {
      console.error('Error starting new round:', err);
      setError(err.message || 'Failed to start round');
    }
  }, [match, isHost, currentRound]);

  // Handle song snippet finish
  const handleSnippetFinish = useCallback(async () => {
    setIsPlaying(false);
    
    // Mark round as completed
    if (currentRoundData && currentRoundData.id) {
      try {
        await roundService.completeRound(currentRoundData.id);
      } catch (err) {
        console.error('Error completing round:', err);
      }
    }
  }, [currentRoundData]);

  // Handle replay request
  const handleReplayRequest = useCallback(() => {
    if (!currentSong || !currentSong.preview_url) {
      setError('No song available to replay');
      return;
    }
    
    if (replayCount >= 2) {
      setError('Replay limit reached (3 replays total)');
      return;
    }
    
    // Increment replay count and start playback
    setReplayCount(prev => prev + 1);
    setIsPlaying(true);
    setSnippetStartTime(Date.now() / 1000);
    
    // Create new audio element for replay
    const audio = new Audio(currentSong.preview_url);
    audio.volume = 0.7;
    audio.currentTime = currentSong.snippet_start || 0;
    
    audio.play().catch(err => {
      console.error('Replay failed:', err);
      setIsPlaying(false);
    });
    
    // Auto-stop after snippet duration
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }, (currentSong.snippet_duration || 20) * 1000);
  }, [currentSong, replayCount]);

  // Handle playback error
  const handlePlaybackError = useCallback((err) => {
    console.error('Playback error:', err);
    setError('Failed to play song snippet');
    setIsPlaying(false);
  }, []);

  // Start playback when song is loaded
  useEffect(() => {
    if (currentSong && hasStartedRound && !isPlaying) {
      const audio = new Audio(currentSong.preview_url);
      audio.volume = 0.7;
      setAudioElementRef(audio);
      
      // Start playback
      audio.currentTime = currentSong.snippet_start || 0;
      setIsPlaying(true);
      setSnippetStartTime(Date.now() / 1000);
      
      audio.play().catch(err => {
        console.error('Playback failed:', err);
        setIsPlaying(false);
        handlePlaybackError(err);
      });
      
      // Auto-stop after snippet duration
      const duration = currentSong.snippet_duration || 20;
      const stopTimer = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        handleSnippetFinish();
      }, duration * 1000);
      
      return () => {
        clearTimeout(stopTimer);
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [currentSong, hasStartedRound, isPlaying, handlePlaybackError, handleSnippetFinish]);

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

    // Subscribe to round changes
    const roundChannel = supabase
      .channel('round_updates_' + roomId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rounds',
          filter: `match_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Round update detected:', payload);
          loadMatchData();
        }
      )
      .subscribe();

    roundChannelRef.current = roundChannel;

    return () => {
      if (matchChannelRef.current) {
        supabase.removeChannel(matchChannelRef.current);
      }
      if (gameStateChannelRef.current) {
        supabase.removeChannel(gameStateChannelRef.current);
      }
      if (roundChannelRef.current) {
        supabase.removeChannel(roundChannelRef.current);
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

  const handleStartRound = () => {
    startNewRound();
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

  // Calculate snippet duration for display
  const snippetDuration = currentSong ? (currentSong.snippet_duration || 20) : 20;

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>Hitster</h1>
        <div className="game-info">
          <span className="room-code">Room: {roomCode}</span>
          <RoundInfo
            roundNumber={currentRound}
            isPlaying={isPlaying}
            snippetStartTime={snippetStartTime}
            snippetDuration={snippetDuration}
            showSongInfo={true}
            songTitle={currentSong ? currentSong.title : ''}
            songArtist={currentSong ? currentSong.artist : ''}
          />
        </div>
      </header>

      <main className="game-main">
        {/* Song Player Area */}
        <div className="song-player-area">
          {currentSong ? (
            <>
              <SongPlayer
                song={currentSong}
                startTime={currentSong.snippet_start || 0}
                duration={snippetDuration}
                onFinish={handleSnippetFinish}
                onError={handlePlaybackError}
                autoPlay={true}
                showControls={false}
              />
              
              {/* Replay Button */}
              <div className="replay-section">
                <ReplayButton
                  onReplay={handleReplayRequest}
                  replayCount={replayCount}
                  size="medium"
                />
                <span className="replay-hint">Click to replay ({Math.max(0, 2 - replayCount)} replays left)</span>
              </div>
            </>
          ) : (
            <div className="no-song">
              {isHost && !hasStartedRound && match && match.status === 'active' && (
                <>
                  <p>Ready to start Round {currentRound}?</p>
                  <button 
                    className="start-round-button"
                    onClick={handleStartRound}
                  >
                    Start Round {currentRound}
                  </button>
                </>
              )}
              {!hasStartedRound && (!isHost || !match || match.status !== 'active') && (
                <p>Waiting for host to start round {currentRound}...</p>
              )}
            </div>
          )}
        </div>

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

          {/* Current Round Info for Sidebar */}
          <div className="current-round-panel">
            <h4>Current Round</h4>
            <p>Round: {currentRound}</p>
            {currentSong && (
              <div className="current-song-info">
                <p><strong>Now Playing:</strong></p>
                <p>{currentSong.title}</p>
                <p className="artist">by {currentSong.artist}</p>
                <p className="year">Released: {currentSong.release_year}</p>
              </div>
            )}
            {!currentSong && !hasStartedRound && isHost && (
              <p className="host-action">
                <em>Click "Start Round" above to begin</em>
              </p>
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

export default GameScreen;
