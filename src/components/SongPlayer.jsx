import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createAudioPlayer, formatTime } from '../utils/audioPlayer';

/**
 * SongPlayer component - Handles audio playback for song snippets
 * 
 * Features:
 * - Plays song snippets with configurable duration
 * - Handles autoplay with user interaction fallback
 * - Shows visual feedback (loading, playing, error states)
 * - Respects browser autoplay policies
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
  volume = 0.7 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [canReplay, setCanReplay] = useState(false);
  
  const audioPlayerRef = useRef(null);
  const audioElementRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const playbackStartTimeRef = useRef(null);

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

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  const cleanup = useCallback(() => {
    const player = audioPlayerRef.current;
    const audioElement = audioElementRef.current;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
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
  }, []);

  const startCountdown = useCallback(() => {
    stopCountdown();
    
    playbackStartTimeRef.current = Date.now() / 1000;
    setTimeRemaining(duration);

    countdownTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() / 1000) - playbackStartTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        stopCountdown();
      }
    }, 100);
  }, [duration]);

  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

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
  }, [isPlaying, startTime, startCountdown, stopCountdown, onPlay, onError]);

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

      {/* Controls */}
      {showControls && (
        <div className="player-controls">
          <button 
            className={`control-button play-button ${isPlaying ? 'pause' : 'play'}`}
            onClick={handlePlay}
            disabled={isLoading || !song.preview_url}
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
  volume: PropTypes.number
};

export default SongPlayer;
