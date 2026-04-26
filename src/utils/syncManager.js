import { supabase } from '../lib/supabase';
import { eventBus, EventType, getServerTimeOffset } from '../lib/realtime';

/**
 * Playback Synchronization Manager
 * Manages synchronized playback across multiple clients
 * Handles countdown, latency compensation, and sync status tracking
 */

// Sync states
const SyncStates = {
  IDLE: 'idle',           // No active round
  WAITING_FOR_SYNC: 'waiting_for_sync', // Waiting for sync signal
  COUNTDOWN: 'countdown', // Countdown in progress
  PLAYING: 'playing',     // Playback active
  ENDED: 'ended',         // Playback ended
  ERROR: 'error'          // Error state (sync failed, etc.)
};

// Default countdown duration (3 seconds)
const DEFAULT_COUNTDOWN_MS = 3000;

// Tolerance thresholds (milliseconds)
const SYNC_TOLERANCE_MS = 500;  // Acceptable sync variance
const LATE_JOIN_THRESHOLD_MS = 2000; // Max latency for late join

/**
 * Player round state tracking
 */
class PlayerRoundState {
  constructor(roundId, playerId) {
    this.roundId = roundId;
    this.playerId = playerId;
    this.status = 'waiting'; // waiting, listening, completed, failed
    this.playbackStartedAt = null;
    this.playbackEndedAt = null;
    this.syncOffsetMs = 0; // Offset from server time
    this.lateJoin = false;
  }

  markListening(startTime) {
    this.status = 'listening';
    this.playbackStartedAt = startTime;
  }

  markCompleted() {
    this.status = 'completed';
    this.playbackEndedAt = new Date().toISOString();
  }

  markFailed() {
    this.status = 'failed';
  }

  toJSON() {
    return {
      round_id: this.roundId,
      player_id: this.playerId,
      status: this.status,
      playback_started_at: this.playbackStartedAt,
      playback_ended_at: this.playbackEndedAt,
      sync_offset_ms: this.syncOffsetMs
    };
  }
}

/**
 * Main SyncManager class
 * Coordinates synchronized playback for all players in a match
 */
export class SyncManager {
  constructor() {
    this.state = SyncStates.IDLE;
    this.roundId = null;
    this.matchId = null;
    this.playerId = null;
    this.songId = null;
    this.countdownEndTime = null;
    this.playbackStartTime = null;
    this.snippetStartTime = null;
    this.snippetDuration = 20000; // 20 seconds default
    this.serverTimestamp = null;
    this.serverOffsetMs = 0; // Calculated offset from server
    this.syncCheckInterval = null;
    this.countdownInterval = null;
    this.countdownValue = 0;
    
    // Player states tracking
    this.playerStates = new Map();
    
    // Callbacks
    this.callbacks = {
      onCountdown: null,
      onPlay: null,
      onSyncStatusChange: null,
      onLateJoin: null,
      onError: null
    };
    
    // Subscriptions
    this.subscriptions = [];
  }

  /**
   * Initialize the sync manager with match/player info
   * @param {string} matchId - Current match UUID
   * @param {string} playerId - Current player UUID
   */
  init(matchId, playerId) {
    this.matchId = matchId;
    this.playerId = playerId;
    this.state = SyncStates.IDLE;
  }

  /**
   * Calculate server time offset
   * @returns {Promise<number>} Offset in milliseconds (positive means server is ahead)
   */
  async calculateServerOffset() {
    this.serverOffsetMs = await getServerTimeOffset();
    return this.serverOffsetMs;
  }

  /**
   * Get server-adjusted current time
   * @returns {number} Current time in milliseconds (adjusted for server offset)
   */
  getAdjustedTime() {
    return Date.now() + this.serverOffsetMs;
  }

  /**
   * Start a synchronized round
   * Called by the host to begin a round with countdown
   * @param {string} roundId - Round UUID
   * @param {string} songId - Song UUID to play
   * @param {number} snippetStartMs - Snippet start time in milliseconds
   * @param {number} snippetDurationMs - Snippet duration in milliseconds
   */
  async startRound(roundId, songId, snippetStartMs = 0, snippetDurationMs = 20000) {
    if (this.state !== SyncStates.IDLE) {
      console.warn('Cannot start round: manager not in idle state');
      return false;
    }

    this.roundId = roundId;
    this.songId = songId;
    this.snippetStartTime = snippetStartMs;
    this.snippetDuration = snippetDurationMs;
    
    // Clear previous state
    this.cleanup();

    // Calculate countdown end time
    const now = this.getAdjustedTime();
    const countdownEnd = now + DEFAULT_COUNTDOWN_MS;
    this.countdownEndTime = countdownEnd;
    
    this.state = SyncStates.COUNTDOWN;
    this.countdownValue = Math.ceil(DEFAULT_COUNTDOWN_MS / 1000); // Start at 3

    // Create player state
    this.playerStates.set(this.playerId, new PlayerRoundState(roundId, this.playerId));

    // Start countdown timer
    this.startCountdownTimer();

    // Save round start to database with server timestamp
    await this.saveRoundStartToDatabase(countdownEnd);

    // Notify callbacks
    if (this.callbacks.onCountdown) {
      this.callbacks.onCountdown(this.countdownValue);
    }

    return true;
  }

  /**
   * Save round start information to database
   * This creates the player_round_states record and triggers real-time events
   * @param {number} countdownEndTime - When countdown ends in ms timestamp
   */
  async saveRoundStartToDatabase(countdownEndTime) {
    if (!this.roundId || !this.playerId) {
      console.error('Cannot save round start: missing roundId or playerId');
      return;
    }

    try {
      const { error } = await supabase
        .from('player_round_states')
        .insert({
          round_id: this.roundId,
          player_id: this.playerId,
          status: 'listening',
          playback_started_at: new Date(countdownEndTime).toISOString(),
          sync_offset_ms: this.serverOffsetMs
        });

      if (error) {
        console.error('Error saving player round state:', error);
        // Continue anyway - sync will still work via real-time
      }
    } catch (error) {
      console.error('Error in saveRoundStartToDatabase:', error);
    }
  }

  /**
   * Start the countdown timer
   */
  startCountdownTimer() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    const countdownEnd = this.countdownEndTime;
    const startTime = this.getAdjustedTime();
    const remaining = countdownEnd - startTime;

    // Update countdown value immediately
    this.updateCountdownValue(remaining);

    // Set up timer to update every second
    this.countdownInterval = setInterval(() => {
      const currentTime = this.getAdjustedTime();
      const remaining = countdownEnd - currentTime;
      this.updateCountdownValue(remaining);

      if (remaining <= 0) {
        this.clearCountdownInterval();
        this.startPlayback();
      }
    }, 100);
  }

  /**
   * Update the countdown value and notify callbacks
   * @param {number} remainingMs - Remaining time in milliseconds
   */
  updateCountdownValue(remainingMs) {
    this.countdownValue = Math.ceil(remainingMs / 1000);
    
    if (this.callbacks.onCountdown) {
      this.callbacks.onCountdown(Math.max(0, this.countdownValue));
    }
  }

  /**
   * Clear the countdown interval
   */
  clearCountdownInterval() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Start playback for all clients (called when countdown reaches 0)
   */
  startPlayback() {
    if (this.state !== SyncStates.COUNTDOWN) {
      console.warn('Cannot start playback: not in countdown state');
      return;
    }

    this.state = SyncStates.PLAYING;
    this.playbackStartTime = this.getAdjustedTime();

    // Mark player as listening
    const playerState = this.playerStates.get(this.playerId);
    if (playerState) {
      playerState.markListening(new Date(this.playbackStartTime).toISOString());
    }

    // Save playback start time to database
    this.savePlaybackStartTime();

    // Notify play callback
    if (this.callbacks.onPlay) {
      this.callbacks.onPlay({
        startTime: this.playbackStartTime,
        snippetStartTime: this.snippetStartTime,
        snippetDuration: this.snippetDuration
      });
    }

    // Start playback end timer
    this.startPlaybackEndTimer();
  }

  /**
   * Save actual playback start time to database
   */
  savePlaybackStartTime() {
    if (!this.playerId || !this.roundId) return;

    try {
      supabase
        .from('player_round_states')
        .update({
          playback_started_at: new Date(this.playbackStartTime).toISOString(),
          status: 'listening'
        })
        .eq('round_id', this.roundId)
        .eq('player_id', this.playerId);
    } catch (error) {
      console.error('Error saving playback start time:', error);
    }
  }

  /**
   * Start timer to detect when playback ends
   */
  startPlaybackEndTimer() {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
    }

    this.syncCheckInterval = setInterval(() => {
      const currentTime = this.getAdjustedTime();
      const elapsed = currentTime - this.playbackStartTime;
      
      if (elapsed >= this.snippetDuration) {
        this.endPlayback();
      }
    }, 100);
  }

  /**
   * End playback
   */
  endPlayback() {
    if (this.state !== SyncStates.PLAYING) {
      return;
    }

    this.state = SyncStates.ENDED;
    this.clearAllIntervals();

    // Mark player as completed
    const playerState = this.playerStates.get(this.playerId);
    if (playerState) {
      playerState.markCompleted();
    }

    // Save completion to database
    this.savePlaybackCompletion();
  }

  /**
   * Save playback completion to database
   */
  savePlaybackCompletion() {
    if (!this.playerId || !this.roundId) return;

    try {
      supabase
        .from('player_round_states')
        .update({
          playback_ended_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('round_id', this.roundId)
        .eq('player_id', this.playerId);
    } catch (error) {
      console.error('Error saving playback completion:', error);
    }
  }

  /**
   * Handle receiving a round start event from another client
   * @param {Object} event - Round start event data
   */
  handleRoundStartEvent(event) {
    if (!event.round || !event.serverTimestamp) {
      console.warn('Invalid round start event');
      return false;
    }

    const round = event.round;
    const serverTimestamp = new Date(event.serverTimestamp).getTime();
    const now = this.getAdjustedTime();
    
    // Calculate when this event happened relative to now
    const eventAge = now - serverTimestamp;
    
    // If event is too old (> 5 seconds), ignore it
    if (eventAge > 5000) {
      console.warn('Ignoring old round start event');
      return false;
    }

    // If we're already in a round, verify it's the same one
    if (this.state !== SyncStates.IDLE && this.roundId !== round.id) {
      console.warn('Received round start for different round');
      return false;
    }

    // Set up the round info
    this.roundId = round.id;
    this.songId = round.song_id;
    this.serverTimestamp = serverTimestamp;
    
    // Calculate countdown end based on event time
    // Countdown should end at serverTimestamp + DEFAULT_COUNTDOWN_MS
    this.countdownEndTime = serverTimestamp + DEFAULT_COUNTDOWN_MS;
    this.state = SyncStates.COUNTDOWN;
    
    // Calculate current countdown value
    const remaining = this.countdownEndTime - now;
    this.updateCountdownValue(remaining);

    // If countdown has already ended, start playback immediately
    if (remaining <= 0) {
      this.clearCountdownInterval();
      this.startPlayback();
    } else {
      // Start countdown timer
      this.startCountdownTimer();
    }

    return true;
  }

  /**
   * Handle sync status change
   * @param {string} playerId - Player UUID
   * @param {string} status - New status
   */
  handlePlayerStatusChange(playerId, status) {
    const playerState = this.playerStates.get(playerId);
    if (playerState) {
      switch (status) {
        case 'listening':
          playerState.status = 'listening';
          break;
        case 'completed':
          playerState.markCompleted();
          break;
        case 'failed':
          playerState.markFailed();
          break;
        default:
          playerState.status = status;
      }
    } else {
      // Create new player state if it doesn't exist
      this.playerStates.set(playerId, new PlayerRoundState(this.roundId, playerId));
    }

    // Notify sync status change callback
    if (this.callbacks.onSyncStatusChange) {
      this.callbacks.onSyncStatusChange(this.getSyncStats());
    }
  }

  /**
   * Get sync statistics
   * @returns {Object} Sync status information
   */
  getSyncStats() {
    const totalPlayers = this.playerStates.size;
    const listening = Array.from(this.playerStates.values()).filter(p => p.status === 'listening').length;
    const completed = Array.from(this.playerStates.values()).filter(p => p.status === 'completed').length;
    const failed = Array.from(this.playerStates.values()).filter(p => p.status === 'failed').length;

    return {
      totalPlayers,
      listening,
      completed,
      failed,
      inSync: listening + completed >= totalPlayers * 0.8 // 80% threshold
    };
  }

  /**
   * Check if this player is out of sync
   * @returns {boolean}
   */
  isOutOfSync() {
    if (this.state !== SyncStates.PLAYING) {
      return false;
    }

    const now = this.getAdjustedTime();
    const elapsed = now - this.playbackStartTime;
    const expectedEnd = this.playbackStartTime + this.snippetDuration;

    // If we're more than 2 seconds behind or ahead, we're out of sync
    const variance = Math.abs(elapsed - (expectedEnd - now));
    return variance > SYNC_TOLERANCE_MS;
  }

  /**
   * Handle late join scenario
   * @returns {Object} Late join info with catch-up instructions
   */
  handleLateJoin() {
    if (this.state !== SyncStates.COUNTDOWN && this.state !== SyncStates.PLAYING) {
      return { late: false };
    }

    const now = this.getAdjustedTime();
    
    if (this.state === SyncStates.COUNTDOWN) {
      const remaining = this.countdownEndTime - now;
      if (remaining <= LATE_JOIN_THRESHOLD_MS) {
        // Can catch up
        return {
          late: true,
          catchup: true,
          message: `Starting in ${Math.ceil(remaining / 1000)}...`
        };
      }
    }

    if (this.state === SyncStates.PLAYING) {
      const elapsed = now - this.playbackStartTime;
      
      if (elapsed >= LATE_JOIN_THRESHOLD_MS) {
        // Too far behind, wait for next round
        if (this.callbacks.onLateJoin) {
          this.callbacks.onLateJoin({
            message: 'Too late to join this round. Wait for next round.'
          });
        }
        return {
          late: true,
          catchup: false,
          message: 'Too late to join this round'
        };
      } else {
        // Can catch up - calculate where to seek
        return {
          late: true,
          catchup: true,
          seekPosition: elapsed + this.snippetStartTime,
          message: 'Catch up in progress...'
        };
      }
    }

    return { late: false };
  }

  /**
   * Get current countdown value (0-3)
   * @returns {number}
   */
  getCountdown() {
    return Math.max(0, this.countdownValue);
  }

  /**
   * Get current playback state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Get current playback progress (0-1)
   * @returns {number}
   */
  getPlaybackProgress() {
    if (this.state !== SyncStates.PLAYING || !this.playbackStartTime) {
      return 0;
    }

    const now = this.getAdjustedTime();
    const elapsed = now - this.playbackStartTime;
    return Math.min(1, Math.max(0, elapsed / this.snippetDuration));
  }

  /**
   * Get remaining playback time in seconds
   * @returns {number}
   */
  getRemainingTime() {
    if (this.state !== SyncStates.PLAYING || !this.playbackStartTime) {
      return 0;
    }

    const now = this.getAdjustedTime();
    const elapsed = now - this.playbackStartTime;
    const remaining = this.snippetDuration - elapsed;
    return Math.max(0, remaining / 1000);
  }

  /**
   * Register callbacks
   * @param {Object} callbacks - Callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks
    };
  }

  /**
   * Clear all intervals and subscriptions
   */
  clearAllIntervals() {
    this.clearCountdownInterval();
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.clearAllIntervals();
    this.playerStates.clear();
    this.roundId = null;
    this.songId = null;
    this.countdownEndTime = null;
    this.playbackStartTime = null;
    this.state = SyncStates.IDLE;
    
    // Unsubscribe from all events
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
  }

  /**
   * Subscribe to round start events via Supabase real-time
   * @param {string} matchId - Match UUID
   */
  subscribeToRoundEvents(matchId) {
    const subscription = eventBus.on(EventType.ROUND_STARTED, (event) => {
      this.handleRoundStartEvent(event);
    });
    this.subscriptions.push({ unsubscribe: subscription });
  }
}

// Singleton instance
export const syncManager = new SyncManager();

/**
 * Get sync state constants
 */
export const SyncState = SyncStates;

/**
 * Get latency constants
 */
export const SyncConstants = {
  DEFAULT_COUNTDOWN_MS,
  SYNC_TOLERANCE_MS,
  LATE_JOIN_THRESHOLD_MS
};

export default syncManager;
