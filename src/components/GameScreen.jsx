import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { matchService } from '../utils/matchService';
import { roomService } from '../utils/roomService';
import { roundService } from '../utils/roundService';
import { songService } from '../utils/songService';
import { supabase } from '../lib/supabase';
import { syncManager } from '../utils/syncManager';
import { eventBus, EventType, subscribeRoundStart } from '../lib/realtime';
import { SongPlayer } from './SongPlayer';
import { RoundInfo } from './RoundInfo';
import { ReplayButton } from './ReplayButton';
import { SyncIndicator } from './SyncIndicator';
import { CountdownOverlay } from './CountdownOverlay';
import { PlaybackProgress } from './PlaybackProgress';

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
  // Persist replay count across page refreshes using localStorage
  const [replayCount, setReplayCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem('replayCount') || '0');
    } catch {
      return 0;
    }
  });
  const [snippetStartTime, setSnippetStartTime] = useState(null);

  // Sync replayCount to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('replayCount', replayCount.toString());
    } catch (error) {
      console.warn('Could not save replay count to localStorage:', error);
    }
  }, [replayCount]);
  const [hasStartedRound, setHasStartedRound] = useState(false);
  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [isSyncInProgress, setIsSyncInProgress] = useState(false);
  
  const [audioElementRef, setAudioElementRef] = useState(null);
  const replayAudioRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Track component mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const matchChannelRef = useRef(null);
  const gameStateChannelRef = useRef(null);
  const roundChannelRef = useRef(null);
  const realtimeSubscriptionsRef = useRef([]);

  // Track if syncManager has been initialized
  const syncInitializedRef = useRef(false);

  // Get session data
  useEffect(() => {
    try {
      const sessionPlayerId = sessionStorage.getItem('playerId');
      const sessionIsHost = sessionStorage.getItem('isHost') === 'true';
      const sessionPlayerNumber = sessionStorage.getItem('playerNumber');
      const sessionRoomId = sessionStorage.getItem('roomId');
      
      setPlayerId(sessionPlayerId);
      setIsHost(sessionIsHost);
      setPlayerNumber(sessionPlayerNumber ? parseInt(sessionPlayerNumber) : null);

      // Initialize sync manager with match/player info - only once
      if (sessionRoomId && sessionPlayerId && !syncInitializedRef.current) {
        syncManager.init(sessionRoomId, sessionPlayerId);
        syncInitializedRef.current = true;
      } else if (!sessionPlayerId) {
        console.warn('No playerId in sessionStorage - sync features will be limited');
      }
    } catch (error) {
      console.error('Failed to read from sessionStorage:', error);
      // SessionStorage might be disabled - this will cause sync features to fail
    }
  }, []);

  // Clean up sync manager on unmount
  useEffect(() => {
    // Notify server when player leaves during round
    const handleBeforeUnload = () => {
      if (currentRoundId && playerId) {
        // Mark player as failed when leaving
        supabase
          .from('player_round_states')
          .update({ status: 'failed' })
          .eq('round_id', currentRoundId)
          .eq('player_id', playerId)
          .catch(() => {}); // Silently fail - we're unloading anyway
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      syncManager.cleanup();
      realtimeSubscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      realtimeSubscriptionsRef.current = [];
    };
  }, [currentRoundId, playerId]);

  // Subscribe to Supabase real-time round events
  useEffect(() => {
    if (match?.id) {
      syncManager.subscribeToRoundEvents(match.id);
    }
  }, [match?.id]);

  // Listen to sync manager events
  useEffect(() => {
    const handleCountdown = (value) => {
      if (!mountedRef.current) return;
      if (value > 0) {
        setShowCountdownOverlay(true);
      } else {
        setShowCountdownOverlay(false);
      }
    };

    const handleSyncStatusChange = (stats) => {
      if (!mountedRef.current) return;
      setSyncStats(stats);
    };

    syncManager.setCallbacks({
      onCountdown: handleCountdown,
      onSyncStatusChange: handleSyncStatusChange
    });

    return () => {
      syncManager.setCallbacks({
        onCountdown: null,
        onSyncStatusChange: null
      });
    };
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

  // Start a new round with a random song and synchronized countdown
  const startNewRound = useCallback(async () => {
    if (!match || !match.id || !isHost || !playerId) {
      setError('Only the host can start a new round');
      return;
    }
    
    // Prevent double click during sync
    if (isSyncInProgress) {
      console.warn('Round start already in progress');
      return;
    }

    try {
      setError('');
      setIsSyncInProgress(true);
      
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
      let songData = null;
      if (newRound.song_id) {
        songData = await songService.getSongById(newRound.song_id);
        setCurrentSong(songData);
        
        // Update match in database to increment round counter
        // Note: This is done via trigger in the database
      }
      
      // Initialize sync manager with round info and start synchronized countdown
      if (songData && newRound.id) {
        const snippetStartMs = (songData.snippet_start || 0) * 1000;
        const snippetDurationMs = (songData.snippet_duration || 20) * 1000;
        
        // Update round with started_at timestamp for sync tracking
        const { error: updateError } = await supabase
          .from('rounds')
          .update({
            started_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', newRound.id);

        if (updateError) {
          console.error('Error updating round start time:', updateError);
          throw new Error('Failed to update round start time');
        }
        
        // Start sync manager countdown - atomic with round creation
        // This will broadcast to all players via Supabase real-time
        const syncStarted = await syncManager.startRound(
          newRound.id,
          newRound.song_id,
          snippetStartMs,
          snippetDurationMs
        );

        if (!syncStarted) {
          // Rollback: mark round as failed if sync didn't start
          await supabase
            .from('rounds')
            .update({ status: 'failed' })
            .eq('id', newRound.id)
            .catch(rollbackError => {
              console.error('Failed to rollback round status:', rollbackError);
            });
          throw new Error('Sync manager failed to start round');
        }

        setShowCountdownOverlay(true);
        setHasStartedRound(true);
      } else {
        setHasStartedRound(false);
      }
      
    } catch (err) {
      console.error('Error starting new round:', err);
      setError(err.message || 'Failed to start round');
    } finally {
      setIsSyncInProgress(false);
    }
  }, [match, isHost, currentRound, playerId]);

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
    
    if (replayCount >= 3) {
      setError('Replay limit reached (3 replays total)');
      return;
    }
    
    // Increment replay count and start playback
    setReplayCount(prev => prev + 1);
    setIsPlaying(true);
    setSnippetStartTime(Date.now() / 1000);
    
    // Clean up previous audio element
    if (replayAudioRef.current) {
      replayAudioRef.current.pause();
      replayAudioRef.current.currentTime = 0;
      replayAudioRef.current.src = '';
    }
    
    // Create new audio element for replay
    const audio = new Audio(currentSong.preview_url);
    audio.volume = Math.max(0, Math.min(1, 0.7));
    audio.currentTime = Math.max(0, currentSong.snippet_start || 0);
    
    // Store reference for cleanup
    replayAudioRef.current = audio;
    
    audio.play().catch(err => {
      console.error('Replay failed:', err);
      if (mountedRef.current) {
        setIsPlaying(false);
      }
    });
    
    // Auto-stop after snippet duration
    const duration = Math.max(15, Math.min(30, currentSong.snippet_duration || 20));
    const stopTimer = setTimeout(() => {
      if (mountedRef.current) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        replayAudioRef.current = null;
      }
    }, duration * 1000);
    
    return () => {
      clearTimeout(stopTimer);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
    };
  }, [currentSong, replayCount]);

  // Handle playback error
  const handlePlaybackError = useCallback((err) => {
    console.error('Playback error:', err);
    setError('Failed to play song snippet');
    setIsPlaying(false);
  }, []);

  // Start playback when song is loaded and sync is active
  useEffect(() => {
    let cancelled = false;
    
    if (currentSong && hasStartedRound && !isPlaying) {
      // If sync manager is active and countdown has finished, playback will be
      // handled by the sync manager via the SongPlayer component with syncEnabled=true
      // So we only do manual playback if not in sync mode
      const managerState = syncManager.getState();
      if (managerState === 'idle' || managerState === 'ended') {
        const audio = new Audio(currentSong.preview_url);
        audio.volume = 0.7;
        setAudioElementRef(audio);
        
        // Start playback
        audio.currentTime = Math.max(0, currentSong.snippet_start || 0);
        if (!cancelled) {
          setIsPlaying(true);
          setSnippetStartTime(Date.now() / 1000);
        }
        
        audio.play().catch(err => {
          console.error('Playback failed:', err);
          if (!cancelled) {
            setIsPlaying(false);
            handlePlaybackError(err);
          }
        });
        
        // Auto-stop after snippet duration
        const duration = Math.max(15, Math.min(30, currentSong.snippet_duration || 20));
        const stopTimer = setTimeout(() => {
          if (!cancelled) {
            audio.pause();
            audio.currentTime = 0;
            setIsPlaying(false);
            handleSnippetFinish();
          }
        }, duration * 1000);
        
        return () => {
          cancelled = true;
          clearTimeout(stopTimer);
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
        };
      }
    }
    
    return () => { cancelled = true; };
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
        {/* Countdown Overlay - shown when sync countdown is active */}
        {showCountdownOverlay && currentSong && (
          <CountdownOverlay
            isVisible={showCountdownOverlay}
            onComplete={() => setShowCountdownOverlay(false)}
            countdownFrom={3}
          />
        )}

        {/* Song Player Area */}
        <div className="song-player-area">
          <div className="sync-components">
            <SyncIndicator
              totalPlayers={players.length}
              inSync={syncStats ? syncStats.inSync : false}
              size="medium"
            />
            {syncStats && (
              <div className="sync-info">
                <span>Players: {syncStats.totalPlayers} | In Sync: {syncStats.listening}</span>
              </div>
            )}
          </div>
          
          {currentSong ? (
            <>
              <SongPlayer
                song={currentSong}
                startTime={currentSong.snippet_start || 0}
                duration={snippetDuration}
                onFinish={handleSnippetFinish}
                onError={handlePlaybackError}
                onPlay={() => setIsPlaying(true)}
                autoPlay={false}
                showControls={true}
                syncEnabled={hasStartedRound}
                syncManager={syncManager}
              />
              
              <PlaybackProgress
                duration={snippetDuration}
                showTime={true}
                showSyncIndicator={true}
                height={6}
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
