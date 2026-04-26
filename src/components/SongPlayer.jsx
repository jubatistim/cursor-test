import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createAudioPlayer, formatTime } from '../utils/audioPlayer';
import { syncManager } from '../utils/syncManager';

/**
 * SongPlayer component - Handles audio playback for song snippets
 * 
 * Features:
 * - Plays song snippets with configurable duration
 * - Handles autoplay with user interaction fallback
 * - Shows visual feedback (loading, playing, error states)
 * - Respects browser autoplay policies
 * - Supports synchronized playback across multiple clients
 */
export function SongPlayer({ 
  song, 
  startTime = 0, 
  duration = 20, 
  onFinish,
  onError,
  onPlay,
  autoPlay = false,
  showControls = true,
  volume = 0.7,
  syncEnabled = false,
  syncManager: externalSyncManager = null 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [canReplay, setCanReplay] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(0);
  
  const audioPlayerRef = useRef(null);
  const audioElementRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const playbackStartTimeRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  // Initialize audio player when song changes
  useEffect(() => {
    if (!song || !song.preview_url) {
      cleanup();
      return;
    }

    // Clean up previous player
    cleanup();

    // Create new audio player
    const player = createAudioPlayer();
    audioPlayerRef.current = player;

    // Create audio element
    const audioElement = new Audio(song.preview_url);
    audioElement.preload = 'auto';
    audioElement.volume = Math.max(0, Math.min(1, volume));
    audioElementRef.current = audioElement;

    // Set up event listeners
    const handleCanPlay = () => {
      setIsLoading(false);
      
      // If autoplay is requested, try to play
      if (autoPlay && !hasTriedAutoPlay.current) {
        hasTriedAutoPlay.current = true;
        handlePlay();
      }
    };

    const handleError = (error) => {
      console.error('Audio error:', error);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      if (onError) onError(error);
    };

    const handleEnded = () => {
      stopCountdown();
      setIsPlaying(false);
      setCanReplay(true);
      if (onFinish) onFinish();
    };

    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('error', handleError);
    audioElement.addEventListener('ended', handleEnded);

    // Set loading state
    if (audioElement.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      setIsLoading(true);
    }

    // Track if we've tried autoplay
    const hasTriedAutoPlay = { current: !autoPlay };

    return cleanup;
  }, [song, autoPlay, duration, volume, onError, onFinish]);

  // Get the sync manager instance
  const manager = externalSyncManager || syncManager;

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Listen to sync manager events
  useEffect(() => {
    if (!syncEnabled || !manager) return;

    const handleCountdown = (value) => {
      setSyncCountdown(value);
    };

    const handlePlay = (event) => {
      if (song && song.preview_url) {
        startSyncPlayback(event);
      }
    };

    manager.setCallbacks({
      onCountdown: handleCountdown,
      onPlay: handlePlay
    });

    return () => {
      manager.setCallbacks({
        onCountdown: null,
        onPlay: null
      });
    };
  }, [syncEnabled, manager, song]);

  const cleanup = useCallback(() => {
    const player = audioPlayerRef.current;
    const audioElement = audioElementRef.current;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('ended', handleEnded);
    }

    if (player) {
      player.cleanup();
    }

    audioPlayerRef.current = null;
    audioElementRef.current = null;
    playbackStartTimeRef.current = null;
    setIsPlaying(false);
    setIsLoading(false);
    setHasError(false);
    setSyncCountdown(0);
    setIsSynced(false);
  }, []);

  /**
   * Start synchronized playback when sync manager triggers play
   * @param {Object} event - Sync play event with startTime, snippetStartTime, snippetDuration
   */
  const startSyncPlayback = useCallback((event) => {
    const audioElement = audioElementRef.current;
    if (!audioElement || !song || !song.preview_url) {
      return;
    }

    const { startTime, snippetStartTime = 0, snippetDuration = duration * 1000 } = event;
    
    // Calculate how much time has passed since sync start
    const now = Date.now();
    const elapsed = now - startTime;
    const snippetDurationSec = snippetDuration / 1000;
    
    // If we're too far behind, don't start
    if (elapsed >= snippetDuration) {
      setHasError(true);
      if (onError) onError(new Error('Sync window missed'));
      return;
    }

    setIsLoading(false);
    setIsPlaying(true);
    setCanReplay(false);
    setIsSynced(true);
    
    // Seek to appropriate position for late join
    const seekPosition = (snippetStartTime / 1000) + (elapsed / 1000);
    audioElement.currentTime = seekPosition;

    startCountdown();

    // Try to play
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (onPlay) onPlay();
        })
        .catch((error) => {
          console.error('Sync playback failed:', error);
          setIsPlaying(false);
          setHasError(true);
          stopCountdown();
          if (onError) onError(error);
        });
    }

    // Auto-stop after snippet duration minus elapsed time
    const remainingTime = Math.max(0, snippetDuration - elapsed);
    const stopTimer = setTimeout(() => {
      audioElement.pause();
      audioElement.currentTime = 0;
      stopCountdown();
      setIsPlaying(false);
      setCanReplay(true);
      if (onFinish) onFinish();
    }, remainingTime);

    // Store reference for cleanup
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = stopTimer;
  }, [song, duration, onPlay, onError, onFinish]);

  const startCountdown = useCallback(() => {
    stopCountdown();
    
    playbackStartTimeRef.current = Date.now() / 1000;
    
    // Use sync countdown if in sync mode and countdown is active
    if (syncEnabled && syncCountdown > 0) {
      setTimeRemaining(syncCountdown * 1000); // Convert seconds to milliseconds
    } else {
      setTimeRemaining(duration);
    }

    countdownTimerRef.current = setInterval(() => {
      // If in sync mode, use the sync manager's countdown
      if (syncEnabled && manager) {
        const currentCountdown = manager.getCountdown();
        if (currentCountdown > 0) {
          setTimeRemaining(currentCountdown * 1000);
        } else {
          // Countdown finished, check if playing
          if (manager.getState() === 'playing') {
            const elapsed = (Date.now() / 1000) - playbackStartTimeRef.current;
            const remaining = Math.max(0, duration - elapsed);
            setTimeRemaining(remaining);
          } else {
            setTimeRemaining(0);
          }
        }
      } else {
        const elapsed = (Date.now() / 1000) - playbackStartTimeRef.current;
        const remaining = Math.max(0, duration - elapsed);
        setTimeRemaining(remaining);
      }

      if (timeRemaining <= 0) {
        stopCountdown();
      }
    }, 100);
  }, [duration, syncEnabled, syncCountdown, manager]);

  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    // If in sync mode, let sync manager handle playback
    if (syncEnabled && manager && manager.getState() !== 'idle') {
      console.log('In sync mode, ignoring manual play');
      return;
    }

    // Stop any existing playback
    if (isPlaying) {
      audioElement.pause();
      audioElement.currentTime = startTime;
      stopCountdown();
      setIsPlaying(false);
      setCanReplay(true);
      return;
    }

    setIsLoading(false);
    setIsPlaying(true);
    setCanReplay(false);
    setIsSynced(false);

    // Seek to start time
    audioElement.currentTime = startTime;

    // Start countdown
    startCountdown();

    // Try to play
    const playPromise = audioElement.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (onPlay) onPlay();
        })
        .catch((error) => {
          console.error('Playback failed:', error);
          setIsPlaying(false);
          setHasError(true);
          stopCountdown();
          if (onError) onError(error);
        });
    }
  }, [isPlaying, startTime, startCountdown, stopCountdown, onPlay, onError, syncEnabled, manager]);

  const handleReplay = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    // Reset to start
    audioElement.currentTime = startTime;

    setIsPlaying(true);
    startCountdown();

    const playPromise = audioElement.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        setIsPlaying(false);
        setHasError(true);
        stopCountdown();
        if (onError) onError(error);
      });
    }
  }, [startTime, startCountdown, stopCountdown, onError]);

  const handleStop = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = startTime;
    }
    stopCountdown();
    setIsPlaying(false);
    setCanReplay(true);
  }, [startTime, stopCountdown]);

  if (!song) {
    return (
      <div className="song-player song-player-empty">
        <p>No song selected</p>
      </div>
    );
  }

  return (
    <div className="song-player">
      {/* Audio visual indicator */}
      <div className={`audio-visualizer ${isPlaying ? 'playing' : ''} ${hasError ? 'error' : ''}`}>
        {isPlaying ? (
          <div className="visualizer-bars">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        ) : (
          <div className="audio-icon">🎵</div>
        )}
      </div>

      {/* Song info */}
      <div className="song-info">
        <h3 className="song-title">{song.title}</h3>
        <p className="song-artist">{song.artist}</p>
        {syncEnabled && isSynced && (
          <div className="sync-badge">
            <span>🔗 Synced</span>
          </div>
        )}
        {syncEnabled && syncCountdown > 0 && !isPlaying && (
          <div className="sync-countdown">
            <span>Sync: {syncCountdown}s</span>
          </div>
        )}
      </div>

      {/* Countdown timer */}
      {isPlaying && (
        <div className="countdown-timer">
          {formatTime(timeRemaining)}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <span>Loading...</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="error-message">
          <span>⚠️ Audio unavailable</span>
        </div>
      )}

      {/* Sync indicator (visible when in sync mode) */}
      {syncEnabled && syncCountdown > 0 && !isPlaying && (
        <div className="sync-waiting">
          <span>Waiting for sync... ({syncCountdown}s)</span>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="player-controls">
          <button 
            className={`control-button play-button ${isPlaying ? 'pause' : 'play'}`}
            onClick={handlePlay}
            disabled={isLoading || !song.preview_url || (syncEnabled && syncCountdown > 0)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {canReplay && (
            <button 
              className="control-button replay-button"
              onClick={handleReplay}
              title="Replay snippet"
            >
              ⭮
            </button>
          )}

          <button 
            className="control-button stop-button"
            onClick={handleStop}
            title="Stop"
          >
            ⏹️
          </button>
        </div>
      )}
    </div>
  );
}

SongPlayer.propTypes = {
  song: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    artist: PropTypes.string.isRequired,
    preview_url: PropTypes.string.isRequired,
    snippet_start: PropTypes.number,
    snippet_duration: PropTypes.number
  }),
  startTime: PropTypes.number,
  duration: PropTypes.number,
  onFinish: PropTypes.func,
  onError: PropTypes.func,
  onPlay: PropTypes.func,
  autoPlay: PropTypes.bool,
  showControls: PropTypes.bool,
  volume: PropTypes.number,
  syncEnabled: PropTypes.bool,
  syncManager: PropTypes.object
};

SongPlayer.defaultProps = {
  syncEnabled: false,
  syncManager: null
};

export default SongPlayer;
