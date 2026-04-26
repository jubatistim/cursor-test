import { supabase } from './supabase';

/**
 * Real-time event handling for Supabase
 * Manages subscriptions for round start/stop events and player sync status
 */

// Event types
const EventTypes = {
  ROUND_STARTED: 'round_started',
  ROUND_ENDED: 'round_ended',
  PLAYBACK_SYNC: 'playback_sync',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left'
};

// Channel prefixes
const ChannelPrefixes = {
  ROUND: 'round_',
  ROOM: 'room_',
  MATCH: 'match_'
};

// Sync constants
const DEFAULT_COUNTDOWN_MS = 3000;

/**
 * Real-time event callback registry
 * Allows multiple components to listen to the same events
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to a specific event type
   * @param {string} eventType - The event type to subscribe to
   * @param {Function} callback - Callback function when event is received
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventType - The event type to emit
   * @param {Object} payload - Event payload/data
   */
  emit(eventType, payload) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event callback for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
  }
}

// Global event bus instance
export const eventBus = new EventBus();

/**
 * Channel manager for Supabase subscriptions
 * Manages lifecycle of channel subscriptions
 */
class ChannelManager {
  constructor() {
    this.channels = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to round start events for a specific match
   * @param {string} matchId - Match UUID
   * @param {Function} callback - Callback when round starts
   * @returns {Promise<{unsubscribe: Function}>}
   */
  async subscribeToRoundStart(matchId, callback) {
    const channelName = `${ChannelPrefixes.ROUND}round_start_${matchId}`;

    // Return existing subscription if exists
    const existingKey = `${channelName}:round_start`;
    if (this.subscriptions.has(existingKey)) {
      return { unsubscribe: () => this.unsubscribe(existingKey) };
    }

    const channel = supabase.channel(channelName);
    this.channels.set(channelName, channel);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rounds',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          // Only trigger for round_started status or when started_at is set
          if (payload.new && (payload.new.status === 'active' || payload.new.started_at)) {
            eventBus.emit(EventTypes.ROUND_STARTED, {
              event: 'round_started',
              round_id: payload.new.id,
              song_id: payload.new.song_id,
              server_timestamp: payload.commit_timestamp || new Date().toISOString(),
              countdown_duration_ms: DEFAULT_COUNTDOWN_MS,
              snippet_start_ms: payload.new.snippet_start_ms || 0,
              snippet_duration_ms: payload.new.snippet_duration_ms || 20000
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (err || status !== 'SUBSCRIBED') {
          console.error('Supabase channel subscription failed:', err || `Status: ${status}`);
          // Attempt reconnection after delay
          setTimeout(() => {
            console.log('Attempting to reconnect Supabase channel...');
            channel.subscribe();
          }, 2000);
        }
      });

    this.subscriptions.set(existingKey, { channel, subscription });

    // Also set up local event bus listener
    const localUnsubscribe = eventBus.on(EventTypes.ROUND_STARTED, callback);

    return {
      unsubscribe: () => {
        localUnsubscribe();
        this.unsubscribe(existingKey);
      }
    };
  }

  /**
   * Subscribe to round updates (for sync adjustments)
   * @param {string} matchId - Match UUID
   * @param {Function} callback - Callback when round is updated
   * @returns {Promise<{unsubscribe: Function}>}
   */
  async subscribeToRoundUpdates(matchId, callback) {
    const channelName = `${ChannelPrefixes.ROUND}round_updates_${matchId}`;
    const existingKey = `${channelName}:updates`;

    if (this.subscriptions.has(existingKey)) {
      return { unsubscribe: () => this.unsubscribe(existingKey) };
    }

    const channel = supabase.channel(channelName);
    this.channels.set(channelName, channel);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rounds',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          eventBus.emit(EventTypes.PLAYBACK_SYNC, {
            round: payload.new,
            eventType: payload.eventType,
            serverTimestamp: payload.commit_timestamp || new Date().toISOString()
          });
        }
      )
      .subscribe();

    this.subscriptions.set(existingKey, { channel, subscription });

    const localUnsubscribe = eventBus.on(EventTypes.PLAYBACK_SYNC, callback);

    return {
      unsubscribe: () => {
        localUnsubscribe();
        this.unsubscribe(existingKey);
      }
    };
  }

  /**
   * Subscribe to player round states for sync status
   * @param {string} roundId - Round UUID
   * @param {Function} callback - Callback when player states change
   * @returns {Promise<{unsubscribe: Function}>}
   */
  async subscribeToPlayerStates(roundId, callback) {
    const channelName = `${ChannelPrefixes.ROUND}player_states_${roundId}`;
    const existingKey = `${channelName}:states`;

    if (this.subscriptions.has(existingKey)) {
      return { unsubscribe: () => this.unsubscribe(existingKey) };
    }

    const channel = supabase.channel(channelName);
    this.channels.set(channelName, channel);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_round_states',
          filter: `round_id=eq.${roundId}`
        },
        (payload) => {
          eventBus.emit(EventTypes.PLAYBACK_SYNC, {
            playerRoundState: payload.new,
            old: payload.old,
            eventType: payload.eventType,
            serverTimestamp: payload.commit_timestamp || new Date().toISOString()
          });
        }
      )
      .subscribe();

    this.subscriptions.set(existingKey, { channel, subscription });

    const localUnsubscribe = eventBus.on(EventTypes.PLAYBACK_SYNC, (event) => {
      if (event.playerRoundState) callback(event);
    });

    return {
      unsubscribe: () => {
        localUnsubscribe();
        this.unsubscribe(existingKey);
      }
    };
  }

  /**
   * Broadcast a round start event to all players
   * Note: This is typically done server-side via Supabase, but provides API for consistency
   * @param {Object} eventData - Event data to broadcast
   */
  broadcastRoundStart(eventData) {
    // In production, this would be done via Supabase triggers or server functions
    // For client-side consistency, emit to local event bus
    eventBus.emit(EventTypes.ROUND_STARTED, {
      ...eventData,
      serverTimestamp: new Date().toISOString()
    });
  }

  /**
   * Unsubscribe from a specific subscription
   * @param {string} key - Subscription key
   */
  unsubscribe(key) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      if (subscription.subscription) {
        supabase.removeChannel(subscription.channel);
      }
      this.subscriptions.delete(key);
      this.channels.delete(key);
    }
  }

  /**
   * Unsubscribe all channels for a match
   * @param {string} matchId - Match UUID
   */
  unsubscribeMatch(matchId) {
    const keysToRemove = [];
    for (const key of this.subscriptions.keys()) {
      if (key.includes(matchId)) {
        this.unsubscribe(key);
      }
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    for (const key of this.subscriptions.keys()) {
      this.unsubscribe(key);
    }
    this.channels.clear();
    this.subscriptions.clear();
  }
}

// Singleton channel manager
export const channelManager = new ChannelManager();

/**
 * Subscribe to round start events
 * @param {string} matchId - Match UUID
   * @param {Function} callback - Callback function
   * @returns {Promise<{unsubscribe: Function}>}
 */
export async function subscribeRoundStart(matchId, callback) {
  return channelManager.subscribeToRoundStart(matchId, callback);
}

/**
 * Subscribe to round updates
 * @param {string} matchId - Match UUID
 * @param {Function} callback - Callback function
 * @returns {Promise<{unsubscribe: Function}>}
 */
export async function subscribeRoundUpdates(matchId, callback) {
  return channelManager.subscribeToRoundUpdates(matchId, callback);
}

/**
 * Subscribe to player round state changes
 * @param {string} roundId - Round UUID
 * @param {Function} callback - Callback function
 * @returns {Promise<{unsubscribe: Function}>}
 */
export async function subscribePlayerStates(roundId, callback) {
  return channelManager.subscribeToPlayerStates(roundId, callback);
}

/**
 * Get the event types enumeration
 */
export const EventType = EventTypes;

/**
 * Clean up all realtime subscriptions
 */
export function cleanupRealtime() {
  channelManager.cleanup();
  eventBus.clear();
}

/**
 * Get server time offset (for latency compensation)
 * @returns {Promise<number>} Offset in milliseconds
 */
export async function getServerTimeOffset() {
  try {
    // Get server time from Supabase
    const { data, error } = await supabase
      .rpc('now')
      .select();

    if (error) {
      console.warn('Could not get server time:', error);
      return 0;
    }

    if (!data || !data[0] || !data[0].now) {
      console.warn('Server time RPC returned unexpected format');
      return 0;
    }

    const serverTime = new Date(data[0].now).getTime();
    const clientTime = Date.now();
    const offset = serverTime - clientTime;

    return offset;
  } catch (error) {
    console.warn('Error getting server time:', error);
    return 0;
  }
}

export default {
  channelManager,
  eventBus,
  EventType,
  subscribeRoundStart,
  subscribeRoundUpdates,
  subscribePlayerStates,
  getServerTimeOffset,
  cleanupRealtime,
  // Re-export for convenience
  on: eventBus.on.bind(eventBus),
  emit: eventBus.emit.bind(eventBus)
};
