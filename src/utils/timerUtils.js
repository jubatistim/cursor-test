/**
 * Timer utilities for synchronized timeout handling
 * Provides consistent timing across clients and handles timeout forfeits
 * Uses performance.now() for monotonic timing to avoid system clock issues
 */

// Use performance.now() for monotonic timing
// Falls back to Date.now() if performance API not available
const getTime = () => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
};

/**
 * Server time offset tracking for synchronization
 * This tracks the difference between server time and local performance time
 */
let serverTimeOffset = 0;

/**
 * Set the server time offset (called when receiving server timestamp)
 * @param {number} serverTime - Server timestamp in milliseconds
 * @param {number} localTime - Local time when server timestamp was received (defaults to now)
 */
export function setServerTimeOffset(serverTime, localTime = getTime()) {
  // Calculate offset: serverTime - localTime
  // This means: serverTime = localTime + offset
  serverTimeOffset = serverTime - localTime;
}

/**
 * Get synchronized server time
 * @returns {number} - Estimated current server time in milliseconds
 */
export function getServerTime() {
  return getTime() + serverTimeOffset;
}

/**
 * Calculate the synchronized start time for a turn timer
 * Now uses server-authoritative timing
 * @param {number} serverTurnStartTime - The timestamp when the turn should start (in ms, from server)
 * @returns {number} - The synchronized start time
 */
export function calculateTurnStartTime(serverTurnStartTime) {
  // Validate input
  if (typeof serverTurnStartTime !== 'number' || !Number.isFinite(serverTurnStartTime)) {
    throw new Error('serverTurnStartTime must be a valid number');
  }
  
  if (serverTurnStartTime <= 0) {
    throw new Error('serverTurnStartTime must be a positive number');
  }
  
  // Return the server-provided start time directly
  // This ensures all clients use the same reference
  return serverTurnStartTime;
}

/**
 * Calculate the remaining time for a turn timer
 * @param {number} turnStartTime - The timestamp when the turn timer started (in ms)
 * @param {number} currentTime - The current timestamp (in ms, defaults to current server time)
 * @param {number} duration - The total duration of the turn timer in seconds (defaults to 60)
 * @returns {number} - The remaining time in seconds (0 if expired or not started)
 */
export function calculateRemainingTime(turnStartTime, currentTime = getServerTime(), duration = 60) {
  // Validate inputs
  if (typeof turnStartTime !== 'number' || !Number.isFinite(turnStartTime) || turnStartTime <= 0) {
    return 0;
  }
  
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    duration = 60;
  }
  
  if (typeof currentTime !== 'number' || !Number.isFinite(currentTime) || currentTime <= 0) {
    currentTime = getServerTime();
  }
  
  // If timer hasn't started yet, return 0 (not full duration - timer not active)
  if (currentTime < turnStartTime) {
    return 0;
  }
  
  const elapsedMs = currentTime - turnStartTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  return Math.max(0, duration - elapsedSeconds);
}

/**
 * Check if a turn timer has expired
 * @param {number} turnStartTime - The timestamp when the turn timer started (in ms)
 * @param {number} currentTime - The current timestamp (in ms, defaults to current server time)
 * @param {number} duration - The total duration of the turn timer in seconds (defaults to 60)
 * @returns {boolean} - True if the timer has expired
 */
export function isTimerExpired(turnStartTime, currentTime = getServerTime(), duration = 60) {
  return calculateRemainingTime(turnStartTime, currentTime, duration) === 0;
}

/**
 * Create a forfeit payload for a player who timed out
 * @param {string} playerId - The ID of the player who timed out
 * @param {string} roundId - The ID of the current round
 * @param {Object} songData - The song data for the current round
 * @returns {Object} - The forfeit payload
 */
export function createForfeitPayload(playerId, roundId, songData) {
  if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
    throw new Error('playerId is required and must be a non-empty string');
  }
  
  if (!roundId || typeof roundId !== 'string' || roundId.trim() === '') {
    throw new Error('roundId is required and must be a non-empty string');
  }
  
  if (!songData || typeof songData !== 'object') {
    throw new Error('songData is required and must be an object');
  }
  
  return {
    player_id: playerId,
    round_id: roundId,
    song_id: songData.id || '',
    placement_status: 'waiting_for_opponent',
    timeline: [],
    score: 0,
    is_forfeit: true,
    forfeit_reason: 'timeout'
  };
}

/**
 * Validate if a player can still make a placement
 * @param {number} turnStartTime - The timestamp when the turn timer started (in ms)
 * @param {number} currentTime - The current timestamp (in ms, defaults to current server time)
 * @param {number} duration - The total duration of the turn timer in seconds (defaults to 60)
 * @returns {boolean} - True if the player can still place
 */
export function canPlayerPlace(turnStartTime, currentTime = getServerTime(), duration = 60) {
  return !isTimerExpired(turnStartTime, currentTime, duration);
}

/**
 * Get the timer state for UI display
 * @param {number} turnStartTime - The timestamp when the turn timer started (in ms)
 * @param {number} currentTime - The current timestamp (in ms, defaults to current server time)
 * @param {number} duration - The total duration of the turn timer in seconds (defaults to 60)
 * @returns {Object} - Timer state object with timeRemaining, progressPercent, isExpired, isWarning, isCritical
 */
export function getTimerState(turnStartTime, currentTime = getServerTime(), duration = 60) {
  const timeRemaining = calculateRemainingTime(turnStartTime, currentTime, duration);
  
  // Clamp progress to 0-100 to avoid floating point issues
  const progressPercent = Math.min(100, Math.max(0, ((duration - timeRemaining) / duration) * 100));
  
  const isExpired = timeRemaining === 0;
  const isWarning = timeRemaining <= 20;
  const isCritical = timeRemaining <= 10;
  
  return {
    timeRemaining,
    progressPercent,
    isExpired,
    isWarning,
    isCritical
  };
}

/**
 * Handle reconnection scenarios - calculate what the timer state should be
 * @param {Object} roundData - The current round data with server-authoritative start time
 * @param {number} serverTurnStartTime - The server-provided turn start time (in ms)
 * @param {number} currentTime - The current timestamp (in ms, defaults to current server time)
 * @param {number} duration - The duration in seconds (defaults to 60)
 * @returns {Object|null} - Timer state or null if timer shouldn't be active yet
 */
export function handleReconnectionTimer(roundData, serverTurnStartTime, currentTime = getServerTime(), duration = 60) {
  // Validate inputs
  if (!roundData || typeof roundData !== 'object') {
    return null;
  }
  
  if (typeof serverTurnStartTime !== 'number' || !Number.isFinite(serverTurnStartTime) || serverTurnStartTime <= 0) {
    return null;
  }
  
  if (typeof currentTime !== 'number' || !Number.isFinite(currentTime) || currentTime <= 0) {
    currentTime = getServerTime();
  }
  
  // Check if timer has started yet
  if (currentTime < serverTurnStartTime) {
    return null; // Timer hasn't started yet
  }
  
  return getTimerState(serverTurnStartTime, currentTime, duration);
}

/**
 * Check server for player timeout status
 * @param {string} playerId - The player ID
 * @param {string} roundId - The round ID
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} - Player timeout status
 */
export async function checkPlayerTimeoutStatus(playerId, roundId, supabase) {
  if (!playerId || !roundId || !supabase) {
    return { has_timed_out: false, placement_status: null };
  }
  
  try {
    const { data, error } = await supabase
      .from('game_states')
      .select('placement_status, updated_at')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .single();
    
    if (error) {
      console.error('Error checking timeout status:', error);
      return { has_timed_out: false, placement_status: null };
    }
    
    return {
      has_timed_out: data?.placement_status === 'waiting_for_opponent',
      placement_status: data?.placement_status || null,
      last_updated: data?.updated_at || null
    };
  } catch (err) {
    console.error('Exception checking timeout status:', err);
    return { has_timed_out: false, placement_status: null };
  }
}

/**
 * Sync timer state across clients using server-authoritative timing
 * @param {Object} supabase - Supabase client instance
 * @param {number} roundId - The current round ID
 * @param {number} serverTurnStartTime - The server-provided turn start time
 * @param {Function} onTimeout - Callback when timer expires
 * @param {number} duration - Timer duration in seconds (defaults to 60)
 * @returns {Function} - Cleanup function
 */
export function setupTimerSync(supabase, roundId, serverTurnStartTime, onTimeout, duration = 60) {
  // Validate inputs
  if (typeof serverTurnStartTime !== 'number' || !Number.isFinite(serverTurnStartTime) || serverTurnStartTime <= 0) {
    console.error('setupTimerSync: invalid serverTurnStartTime');
    return () => {};
  }
  
  if (typeof onTimeout !== 'function') {
    console.error('setupTimerSync: onTimeout must be a function');
    return () => {};
  }
  
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    duration = 60;
  }
  
  // Get current server time
  const currentTime = getServerTime();
  const remainingTime = calculateRemainingTime(serverTurnStartTime, currentTime, duration);
  
  // If already expired, trigger timeout immediately
  if (remainingTime <= 0) {
    onTimeout();
    return () => {};
  }
  
  // Calculate time until expiration
  const timeUntilExpiration = remainingTime * 1000;
  
  // Set a timeout for when the timer should expire
  const timer = setTimeout(() => {
    onTimeout();
  }, timeUntilExpiration);
  
  // Return cleanup function
  return () => {
    clearTimeout(timer);
  };
}

/**
 * Retry wrapper for async operations with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (defaults to 3)
 * @param {number} initialDelay - Initial delay in ms (defaults to 1000)
 * @returns {Promise} - Result of the operation
 */
export async function withRetry(operation, maxRetries = 3, initialDelay = 1000) {
  let lastError = null;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}
