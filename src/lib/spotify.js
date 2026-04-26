/**
 * Spotify API client for audio playback
 * Uses Spotify Web Playback SDK for audio playback
 * Falls back to HTML5 Audio with preview URLs for MVP
 */

// Spotify preview URL base - 30-second clips available without authentication
const SPOTIFY_PREVIEW_BASE = 'https://p.scdn.co/mp3-preview';

/**
 * Spotify service for audio playback
 * This service provides audio playback capabilities using:
 * 1. Spotify preview URLs (30-second clips, no auth needed for preview)
 * 2. HTML5 Audio Element for playback
 */
export const spotifyService = {
  /**
   * Create an audio element for a Spotify preview URL
   * @param {string} previewUrl - Spotify preview URL
   * @returns {HTMLAudioElement} Audio element
   */
  createAudioElement(previewUrl) {
    if (!previewUrl) {
      throw new Error('Preview URL is required');
    }
    
    const audio = new Audio(previewUrl);
    audio.preload = 'auto';
    
    return audio;
  },

  /**
   * Play a song snippet from a preview URL
   * @param {HTMLAudioElement} audioElement - Audio element to play
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds (15-30)
   * @returns {Promise<void>}
   */
  async playSnippet(audioElement, startTime = 0, duration = 20) {
    if (!audioElement) {
      throw new Error('Audio element is required');
    }
    
    // Clamp duration to 15-30 seconds
    const clampedDuration = Math.max(15, Math.min(30, duration));
    
    return new Promise((resolve, reject) => {
      // Set up event handlers
      const onCanPlay = () => {
        // Seek to start time (may not work on all browsers with preview URLs)
        audioElement.currentTime = startTime;
        
        // Play the audio
        const playPromise = audioElement.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Set timeout to stop after duration
              const stopTimer = setTimeout(() => {
                this.stop(audioElement);
                cleanup();
                resolve();
              }, clampedDuration * 1000);
              
              // Also stop when audio ends naturally
              const onEnded = () => {
                clearTimeout(stopTimer);
                cleanup();
                resolve();
              };
              
              audioElement.addEventListener('ended', onEnded, { once: true });
            })
            .catch((error) => {
              cleanup();
              reject(error);
            });
        } else {
          // Older browsers - play() doesn't return a promise
          audioElement.play();
          
          const stopTimer = setTimeout(() => {
            this.stop(audioElement);
            cleanup();
            resolve();
          }, clampedDuration * 1000);
          
          audioElement.addEventListener('ended', () => {
            clearTimeout(stopTimer);
            cleanup();
            resolve();
          }, { once: true });
        }
      };
      
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      
      const cleanup = () => {
        audioElement.removeEventListener('canplay', onCanPlay);
        audioElement.removeEventListener('error', onError);
      };
      
      // Check if audio is already loaded
      if (audioElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        onCanPlay();
      } else {
        audioElement.addEventListener('canplay', onCanPlay, { once: true });
        audioElement.addEventListener('error', onError, { once: true });
      }
    });
  },

  /**
   * Stop audio playback
   * @param {HTMLAudioElement} audioElement - Audio element to stop
   */
  stop(audioElement) {
    if (!audioElement) return;
    
    audioElement.pause();
    audioElement.currentTime = 0;
  },

  /**
   * Toggle playback
   * @param {HTMLAudioElement} audioElement - Audio element to toggle
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @returns {Promise<void>}
   */
  async togglePlayback(audioElement, startTime = 0, duration = 20) {
    if (!audioElement) {
      throw new Error('Audio element is required');
    }
    
    if (audioElement.paused) {
      return this.playSnippet(audioElement, startTime, duration);
    } else {
      this.stop(audioElement);
      return Promise.resolve();
    }
  },

  /**
   * Get Spotify preview URL from track ID
   * Note: In production, you would need to use the Spotify API
   * For MVP, we store preview URLs directly in the database
   * @param {string} spotifyId - Spotify track ID
   * @returns {string|null} Preview URL or null
   */
  getPreviewUrl(spotifyId) {
    if (!spotifyId) return null;
    
    // For MVP, we use the preview_url stored in the database
    // This is a fallback that would be populated from the API
    return null;
  },

  /**
   * Check if audio can play (browser autoplay policy check)
   * @returns {Promise<boolean>}
   */
  async canPlayAudio() {
    try {
      // Try to create and play a silent audio element
      const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQlZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YU9T,...');
      await audio.play();
      this.stop(audio);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if audio is playing
   * @param {HTMLAudioElement} audioElement - Audio element to check
   * @returns {boolean}
   */
  isPlaying(audioElement) {
    if (!audioElement) return false;
    return !audioElement.paused && !audioElement.ended;
  },

  /**
   * Get current playback time
   * @param {HTMLAudioElement} audioElement - Audio element
   * @returns {number} Current time in seconds
   */
  getCurrentTime(audioElement) {
    if (!audioElement) return 0;
    return audioElement.currentTime;
  },

  /**
   * Set volume
   * @param {HTMLAudioElement} audioElement - Audio element
   * @param {number} volume - Volume (0-1)
   */
  setVolume(audioElement, volume) {
    if (!audioElement) return;
    audioElement.volume = Math.max(0, Math.min(1, volume));
  }
};

export default spotifyService;
