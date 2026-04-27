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
import { Timeline } from './Timeline';
import { SongCard } from './SongCard';
import { YearMarkers } from './YearMarkers';
import { ConfirmButton } from './ConfirmButton';
import { WaitingOverlay } from './WaitingOverlay';
import { RevealOverlay } from './RevealOverlay';
import { NextRoundTimer } from './NextRoundTimer';
import { ScoreBoard } from './ScoreBoard';
import { songService } from '../utils/songService';
import { gameService } from '../utils/gameService';
import { isPlacementCorrect } from '../utils/scoringUtils';
import { addLockedCard, filterIncorrectCards, mergeLockedCards } from '../utils/timelineUtils';

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
  
  // Timeline and song placement state
  const [placedSongs, setPlacedSongs] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Placement confirmation state
  // 'placing' | 'confirming' | 'waiting_for_opponent'
  const [placementStatus, setPlacementStatus] = useState('placing');
  const unsubscribeOpponentRef = useRef(null);

  // Reveal state for showing correctness
  const [revealData, setRevealData] = useState(null);
  
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
  const [showNextRoundTimer, setShowNextRoundTimer] = useState(false);
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
      if (unsubscribeOpponentRef.current) {
        unsubscribeOpponentRef.current();
        unsubscribeOpponentRef.current = null;
      }
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

      // Sync timeline state for reconnection scenarios
      await syncTimelineState(gameStatesData);

      // Load current round data
      await loadCurrentRoundData(matchData.id);

    } catch (err) {
      console.error('Error loading match data:', err);
      setError(err.message || 'Failed to load match data');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  /**
   * Sync timeline state for reconnection scenarios
   * Ensures timeline persistence across page refreshes and reconnections
   */
  const syncTimelineState = useCallback(async (gameStatesData) => {
    if (!playerId) return;

    try {
      const playerGameState = gameStatesData.find(gs => gs.player_id === playerId);
      if (playerGameState && playerGameState.timeline) {
        console.log('Syncing timeline state for reconnection:', playerGameState.timeline);
        
        // Validate timeline structure and ensure locked cards are properly marked
        const validatedTimeline = playerGameState.timeline.map(entry => ({
          ...entry,
          is_locked: entry.is_locked !== false // Default to true for backward compatibility
        }));
        
        // Update local state with validated timeline
        setPlacedSongs(validatedTimeline.map(entry => ({
          id: entry.song_id,
          song_id: entry.song_id,
          title: entry.title || 'Unknown Title',
          artist: entry.artist || 'Unknown Artist',
          release_year: entry.release_year || null,
          is_locked: entry.is_locked !== false,
          position: entry.position
        })));
        
        // Update game state if validation changed data
        if (JSON.stringify(playerGameState.timeline) !== JSON.stringify(validatedTimeline)) {
          await supabase
            .from('game_states')
            .update({
              timeline: validatedTimeline,
              updated_at: new Date().toISOString()
            })
            .eq('match_id', playerGameState.match_id)
            .eq('player_id', playerId);
        }
      }
    } catch (err) {
      console.error('Error syncing timeline state:', err);
    }
  }, [playerId]);

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
          loadMatchData();
        }
      )
      .subscribe();

    matchChannelRef.current = matchChannel;

    // Subscribe to game state changes with enhanced timeline sync
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
          loadMatchData();
          
          // Enhanced timeline sync for reconnection scenarios
          if (payload.eventType === 'UPDATE' && payload.new.player_id === playerId) {
            const updatedTimeline = payload.new.timeline || [];
            console.log('Timeline updated via real-time:', updatedTimeline);
            
            // Update local state with new timeline
            const currentGameState = getPlayerGameState(playerId);
            if (currentGameState && JSON.stringify(currentGameState.timeline) !== JSON.stringify(updatedTimeline)) {
              console.log('Syncing timeline from real-time update');
              setPlacedSongs(updatedTimeline.map(entry => ({
                id: entry.song_id,
                song_id: entry.song_id,
                title: entry.title || 'Unknown Title',
                artist: entry.artist || 'Unknown Artist',
                release_year: entry.release_year || null,
                is_locked: entry.is_locked !== false,
                position: entry.position
              })));
            }
          }
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

  /**
   * Check if all players have submitted their placements for the current round.
   * Returns true if all players have placement_status = 'waiting_for_opponent'
   */
  const allPlayersSubmitted = useCallback(() => {
    if (!match?.id || players.length === 0) return false;
    
    const allSubmitted = players.every(player => {
      const gameState = getPlayerGameState(player.id);
      if (!gameState) return false;
      return gameState.placement_status === 'waiting_for_opponent';
    });
    
    return allSubmitted;
  }, [match?.id, players, gameStates]);

  /**
   * Calculate correctness for a player's placement of the current song.
   * Returns { isCorrect: boolean, placedIndex: number | null } for the player
   */
  const calculatePlacementCorrectness = useCallback((playerGameState, currentSongId) => {
    if (!playerGameState?.timeline || !Array.isArray(playerGameState.timeline)) {
      return { isCorrect: false, placedIndex: null };
    }
    
    // Find the current song in the player's timeline
    const timelineEntry = playerGameState.timeline.find(entry => entry.song_id === currentSongId);
    if (!timelineEntry || timelineEntry.position === undefined) {
      return { isCorrect: false, placedIndex: null };
    }
    
    const placedIndex = timelineEntry.position;
    
    // Reconstruct the timeline array in order
    const orderedTimeline = playerGameState.timeline
      .map(entry => ({ song_id: entry.song_id, position: entry.position }))
      .sort((a, b) => a.position - b.position);
    
    // Check if placement is correct using scoringUtils
    // Note: isPlacementCorrect expects array with year properties
    // We need to map timeline entries to actual song objects with release_year
    // For now, we'll use a simplified check
    const isCorrect = isPlacementCorrect(
      placedSongs,
      placedIndex
    );
    
    return { isCorrect, placedIndex };
  }, [placedSongs]);

  /**
   * Trigger reveal phase - calculate correctness for all players
   * and prepare reveal data, then lock correct placements
   */
  const triggerReveal = useCallback(async () => {
    if (!match?.id || !currentSong?.id || !currentRoundData?.id) {
      console.warn('Cannot trigger reveal: missing required data');
      return;
    }
    
    const playerResults = {};
    
    // Process all players in parallel
    const updatePromises = players.map(async (player) => {
      const gameState = getPlayerGameState(player.id);
      if (!gameState) return;
      
      const result = calculatePlacementCorrectness(gameState, currentSong.id);
      playerResults[player.id] = result;
      
      // Track correctness per player - each player only keeps their own correct songs
      const correctForThisPlayer = result.isCorrect ? [currentSong.id] : [];
      
      // Update score for correct placements
      if (result.isCorrect) {
        try {
          await matchService.incrementCorrectPlacements(match.id, player.id);
        } catch (err) {
          console.error('Error updating correct placements:', err);
        }
      }
      
      // Update timeline - lock correct, discard incorrect
      try {
        const currentTimeline = gameState.timeline || [];
        const updatedTimeline = filterIncorrectCards(currentTimeline, correctForThisPlayer);
        
        await supabase
          .from('game_states')
          .update({
            timeline: updatedTimeline,
            updated_at: new Date().toISOString()
          })
          .eq('match_id', match.id)
          .eq('player_id', player.id);
      } catch (err) {
        console.error('Error updating player timeline:', err);
      }
    });
    
    try {
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error in round resolution:', err);
    }
    
    // Set reveal data
    setRevealData({
      roundId: currentRoundData.id,
      songId: currentSong.id,
      songTitle: currentSong.title,
      songArtist: currentSong.artist,
      releaseYear: currentSong.release_year,
      playerResults
    });
    
    // Unsubscribe from opponent placement if still active
    if (unsubscribeOpponentRef.current) {
      unsubscribeOpponentRef.current();
      unsubscribeOpponentRef.current = null;
    }
    
    setPlacementStatus('placing');
  }, [match?.id, currentSong, currentRoundData, players, gameStates, calculatePlacementCorrectness]);

  /**
   * Reset reveal state and prepare for next round
   * Automatically starts a 3-second timer before the next round begins
   */
  const handleRevealComplete = useCallback(async () => {
    // Prevent multiple timer starts
    if (showNextRoundTimer) {
      return;
    }
    
    setRevealData(null);
    setRevealOverlayShown(false);
    setCurrentSong(null);
    setHasStartedRound(false);
    
    // Start the next round timer for all players
    setShowNextRoundTimer(true);
  }, [showNextRoundTimer]);

  const handleLeaveGame = () => {
    navigate(`/room/${roomCode}`);
  };

  const handleStartRound = () => {
    startNewRound();
  };

  /**
   * Handle next round timer completion
   * Fetches next song and transitions to playing_snippet state
   */
  const handleNextRoundTimerComplete = useCallback(async () => {
    setShowNextRoundTimer(false);
    
    if (!match || !match.id || match.status !== 'active') {
      return;
    }
    
    try {
      // Fetch the next song from the catalog
      const nextSong = await songService.getRandomUnusedSong(match.id);
      if (!nextSong) {
        console.error('No songs available for next round');
        return;
      }
      
      // Transition to playing_snippet state
      setCurrentSong(nextSong);
      setHasStartedRound(true);
      
      // Only host creates the new round in database
      if (isHost) {
        const currentRoundNum = (match.current_round || 1) + 1;
        const newRound = await roundService.createRound(match.id, currentRoundNum);
        
        if (newRound) {
          setCurrentRoundData(newRound);
          setCurrentRound(currentRoundNum);
          
          // Start synchronized playback
          const snippetStartMs = (nextSong.snippet_start || 0) * 1000;
          const snippetDurationMs = (nextSong.snippet_duration || 20) * 1000;
          
          await supabase
            .from('rounds')
            .update({ started_at: new Date().toISOString() })
            .eq('id', newRound.id);
          
          syncManager.startCountdown(snippetStartMs, snippetDurationMs);
        }
      }
    } catch (error) {
      console.error('Error starting next round:', error);
      setError('Failed to start next round');
    }
  }, [isHost, match]);

  // Drag and drop handlers for timeline
  const handleSongDragStart = (e, song) => {
    // Block dragging while waiting for opponent
    if (placementStatus === 'waiting_for_opponent') return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ song }));
  };

  const handleSongDrop = (song, fromIndex, toIndex) => {
    // Moving the card resets confirmation so player can re-confirm
    if (placementStatus === 'waiting_for_opponent') return;
    setIsDragging(false);

    // For now, just add the song to the timeline at the specified position
    // In a real implementation, this would handle reordering existing songs
    const newPlacedSongs = [...placedSongs];

    // Remove from current position if it exists
    const existingIndex = newPlacedSongs.findIndex(s => s.id === song.id);
    if (existingIndex !== -1) {
      newPlacedSongs.splice(existingIndex, 1);
    }

    // Insert at new position
    newPlacedSongs.splice(toIndex, 0, song);
    setPlacedSongs(newPlacedSongs);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Confirm placement - persist to Supabase and wait for opponent
  const handleConfirmPlacement = useCallback(async () => {
    if (!match?.id || !playerId || placedSongs.length === 0) return;

    setPlacementStatus('confirming');
    try {
      await gameService.confirmPlacement(match.id, playerId, placedSongs);
      setPlacementStatus('waiting_for_opponent');

      // Subscribe to opponent confirmation
      const unsubscribe = gameService.subscribeToOpponentPlacement(
        match.id,
        playerId,
        async () => {
          // Check if all players have now submitted
          const allSubmitted = allPlayersSubmitted();
          if (allSubmitted) {
            // Trigger reveal phase
            await triggerReveal();
          } else {
            // Still waiting for other players
            setPlacementStatus('placing');
          }
          if (unsubscribeOpponentRef.current) {
            unsubscribeOpponentRef.current();
            unsubscribeOpponentRef.current = null;
          }
        }
      );
      unsubscribeOpponentRef.current = unsubscribe;
    } catch (err) {
      console.error('Error confirming placement:', err);
      setError(err.message || 'Failed to confirm placement');
      setPlacementStatus('placing');
    }
  }, [match?.id, playerId, placedSongs, allPlayersSubmitted, triggerReveal]);

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
        <div className="game-header-top">
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
        </div>
        <ScoreBoard 
          players={players}
          gameStates={gameStates}
          currentPlayerId={playerId}
        />
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

        {/* Reveal Overlay - shown when round is resolved */}
        {revealData && (
          <RevealOverlay
            isVisible={!!revealData}
            releaseYear={revealData.releaseYear}
            songTitle={revealData.songTitle}
            songArtist={revealData.songArtist}
            playerResults={revealData.playerResults}
            players={players}
            currentPlayerId={playerId}
            onComplete={handleRevealComplete}
          />
        )}

        {/* Next Round Timer - shown after reveal before next round starts */}
        {showNextRoundTimer && (
          <NextRoundTimer
            isVisible={showNextRoundTimer}
            onComplete={handleNextRoundTimerComplete}
            nextRoundNumber={currentRound + 1}
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

          {/* Memoized locked songs from game state for performance */}
          {(() => {
            const lockedSongs = useMemo(() => {
              const playerGameState = getPlayerGameState(playerId);
              return (playerGameState?.timeline || []).map(entry => ({
                id: entry.song_id,
                song_id: entry.song_id,
                title: entry.title || 'Unknown Title',
                artist: entry.artist || 'Unknown Artist',
                release_year: entry.release_year ?? null,
                is_locked: entry.is_locked !== false,
                position: entry.position
              }));
            }, [gameStates, playerId]);

            const isCurrentSongLocked = useMemo(() => {
              return lockedSongs.some(song => song.song_id === currentSong?.id);
            }, [lockedSongs, currentSong?.id]);

            return (
              <>
                {/* Current Song Card - only show if we have a song and it hasn't been placed yet */}
                {currentSong && !isCurrentSongLocked && !placedSongs.some(s => s.song_id === currentSong.id) && (
                  <div className="current-song-section">
                    <h3>Current Song</h3>
                    <SongCard
                      song={currentSong}
                      onDragStart={handleSongDragStart}
                      className="current-song-card"
                    />
                  </div>
                )}

                {/* Timeline */}
                <div className="timeline-section">
                  <h3>Your Timeline</h3>
                  <YearMarkers songs={lockedSongs} className="timeline-year-markers" />
                  <Timeline
                    songs={lockedSongs}
                    onSongDrop={handleSongDrop}
                    className="game-timeline"
                    revealed={!!revealData}
                    currentSongId={currentSong?.id}
                    playerResult={revealData?.playerResults?.[playerId]}
                  />
                  <ConfirmButton
                    onConfirm={handleConfirmPlacement}
                    disabled={placedSongs.length === 0 || placementStatus === 'waiting_for_opponent'}
                    isConfirming={placementStatus === 'confirming'}
                  />
                  <WaitingOverlay isVisible={placementStatus === 'waiting_for_opponent'} />
                </div>
              </>
            );
          })()}
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
