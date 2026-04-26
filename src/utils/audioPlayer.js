/**
 * Audio Player utilities
 * Manages audio playback for song snippets
 * Handles replay limiting and countdown timing
 */

import { spotifyService } from '../lib/spotify';

// Maximum number of replays per snippet
const MAX_REPLAYS = 3;

/**
 * Audio player state for a match
 * This would typically be managed by a React component or state management
 */
class AudioPlayerState {
  constructor() {
    this.audioElement = null;
    this.currentSong = null;
    this.isPlaying = false;
    this.replayCount = 0;
    this.startTime = null;
    this.snippetDuration = 20;
    this.onFinishCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Initialize the audio player with a song
   * @param {Object} song - Song data
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   */
  init(song, startTime = 0, duration = 20) {
    if (!song || !song.preview_url) {
      throw new Error('Song with preview URL is required');
    }

    this.currentSong = song;
    this.startTime = startTime;
    this.snippetDuration = Math.max(15, Math.min(30, duration));
    this.replayCount = 0;
    this.isPlaying = false;

    // Clean up previous audio element
    if (this.audioElement) {
      this.cleanup();
    }

    // Create new audio element
    this.audioElement = spotifyService.createAudioElement(song.preview_url);
    
    // Set volume (default to 0.7 for good listening level)
    spotifyService.setVolume(this.audioElement, 0.7);
  }

  /**
   * Play the snippet
   * @returns {Promise<void>}
   */
  async play() {
    if (!this.audioElement || !this.currentSong) {
      throw new Error('Audio player not initialized');
    }

    this.isPlaying = true;

    try {
      await spotifyService.playSnippet(
        this.audioElement,
        this.startTime,
        this.snippetDuration
      );
      
      this.isPlaying = false;
      
      // Call finish callback
      if (this.onFinishCallback) {
        this.onFinishCallback();
      }
    } catch (error) {
      this.isPlaying = false;
      console.error('Playback error:', error);
      
      // Call error callback
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      throw error;
    }
  }

  /**
   * Replay the snippet
   * @returns {Promise<void>}
   */
  async replay() {
    if (!this.audioElement || !this.currentSong) {
      throw new Error('Audio player not initialized');
    }

    // Check replay limit
    if (this.replayCount >= MAX_REPLAYS) {
      throw new Error(`Replay limit reached (${MAX_REPLAYS} replays)`);
    }

    this.replayCount++;
    this.isPlaying = true;

    try {
      await spotifyService.playSnippet(
        this.audioElement,
        this.startTime,
        this.snippetDuration
      );
      
      this.isPlaying = false;
      
      // Call finish callback
      if (this.onFinishCallback) {
        this.onFinishCallback();
      }
    } catch (error) {
      this.isPlaying = false;
      console.error('Replay error:', error);
      
      // Call error callback
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      throw error;
    }
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.audioElement) {
      spotifyService.stop(this.audioElement);
      this.isPlaying = false;
    }
  }

  /**
   * Toggle playback
   * @returns {Promise<void>}
   */
  async toggle() {
    if (this.isPlaying) {
      this.stop();
      return Promise.resolve();
    } else {
      return this.play();
    }
  }

  /**
   * Get remaining replays
   * @returns {number}
   */
  getRemainingReplays() {
    return Math.max(0, MAX_REPLAYS - this.replayCount);
  }

  /**
   * Check if replay is available
   * @returns {boolean}
   */
  canReplay() {
    return this.replayCount < MAX_REPLAYS;
  }

  /**
   * Reset replay count (e.g., when a new round starts)
   */
  resetReplays() {
    this.replayCount = 0;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.audioElement) {
      spotifyService.stop(this.audioElement);
      this.audioElement = null;
    }
    this.currentSong = null;
    this.isPlaying = false;
    this.replayCount = 0;
  }

  /**
   * Set finish callback
   * @param {Function} callback - Callback to call when snippet finishes
   */
  onFinish(callback) {
    this.onFinishCallback = callback;
  }

  /**
   * Set error callback
   * @param {Function} callback - Callback to call on error
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }
}

// Singleton audio player instance
let audioPlayerInstance = null;

/**
 * Get the audio player instance
 * @returns {AudioPlayerState}
 */
export function getAudioPlayer() {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new AudioPlayerState();
  }
  return audioPlayerInstance;
}

/**
 * Reset the audio player instance (for testing or new match)
 */
export function resetAudioPlayer() {
  if (audioPlayerInstance) {
    audioPlayerInstance.cleanup();
    audioPlayerInstance = null;
  }
}

/**
 * Create a new audio player instance (for component-level management)
 * @returns {AudioPlayerState}
 */
export function createAudioPlayer() {
  return new AudioPlayerState();
}

/**
 * Format time remaining as MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get countdown timer value for a snippet
 * @param {number} startTime - Unix timestamp when snippet started
 * @param {number} duration - Duration in seconds
 * @returns {number} Seconds remaining
 */
export function getCountdownValue(startTime, duration) {
  const now = Date.now() / 1000; // Convert to seconds
  const elapsed = now - startTime;
  return Math.max(0, Math.floor(duration - elapsed));
}

/**
 * Check if audio is currently playing
 * @param {HTMLAudioElement} audioElement - Audio element to check
 * @returns {boolean}
 */
export function isPlaying(audioElement) {
  return spotifyService.isPlaying(audioElement);
}

export { MAX_REPLAYS };

export default {
  getAudioPlayer,
  resetAudioPlayer,
  createAudioPlayer,
  formatTime,
  getCountdownValue,
  isPlaying,
  MAX_REPLAYS
};
