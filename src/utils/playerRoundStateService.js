import { supabase } from '../lib/supabase';

/**
 * Player Round State Service
 * Manages player_round_states table for tracking sync playback status
 */

// Sanitized error messages - never expose DB details to client
const SANITIZED_ERRORS = {
  STATE_NOT_FOUND: 'Player round state not found.',
  INVALID_ROUND: 'Invalid round.',
  INVALID_PLAYER: 'Invalid player.',
  STATE_CREATION_FAILED: 'Failed to create player round state.',
  STATE_UPDATE_FAILED: 'Failed to update player round state.',
  DATABASE_ERROR: 'A database error occurred.'
};

export const playerRoundStateService = {
  /**
   * Create or update player round state
   * @param {string} roundId - Round UUID
   * @param {string} playerId - Player UUID
   * @param {Object} data - State data
   * @param {string} data.status - Status: 'listening', 'completed', 'failed'
   * @param {number} data.syncOffsetMs - Sync offset in milliseconds
   * @param {string} data.playbackStartedAt - ISO timestamp when playback started
   * @param {string} data.playbackEndedAt - ISO timestamp when playback ended
   * @returns {Promise<Object>} Player round state record
   */
  async upsertState(roundId, playerId, data = {}) {
    if (!roundId || !playerId) {
      console.error('upsertState called with invalid parameters');
      throw new Error(SANITIZED_ERRORS.INVALID_ROUND);
    }

    try {
      // Prepare the data
      const stateData = {
        round_id: roundId,
        player_id: playerId,
        status: data.status || 'waiting',
        sync_offset_ms: data.syncOffsetMs || 0,
        playback_started_at: data.playbackStartedAt ou null,
        playback_ended_at: data.playbackEndedAt || null
      };

      // Try to update existing record first, then insert
      const { data: existing, error: existingError } = await supabase
        .from('player_round_states')
        .select('id')
        .eq('round_id', roundId)
        .eq('player_id', playerId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for upsert
        console.error('Error checking existing state:', existingError);
      }

      let result;
      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('player_round_states')
          .update(stateData)
          .eq('id', existing.id)
          .select();

        if (error) {
          console.error('State update error:', error);
          throw new Error(SANITIZED_ERRORS.STATE_UPDATE_FAILED);
        }
        result = data[0];
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('player_round_states')
          .insert([stateData])
          .select();

        if (error) {
          console.error('State creation error:', error);
          throw new Error(SANITIZED_ERRORS.STATE_CREATION_FAILED);
        }
        result = data[0];
      }

      return result;
    } catch (error) {
      console.error('Error in upsertState:', error);
      throw error;
    }
  },

  /**
   * Get player round state
   * @param {string} roundId - Round UUID
   * @param {string} playerId - Player UUID
   * @returns {Promise<Object|null>} Player round state or null
   */
  async getState(roundId, playerId) {
    if (!roundId || !playerId) {
      console.error('getState called with invalid parameters');
      return null;
    }

    const { data, error } = await supabase
      .from('player_round_states')
      .select('*')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .single();

    if (error) {
      console.error('State lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all player states for a round
   * @param {string} roundId - Round UUID
   * @returns {Promise<Array>} Array of player round states
   */
  async getStatesByRound(roundId) {
    if (!roundId) {
      console.error('getStatesByRound called without roundId');
      return [];
    }

    const { data, error } = await supabase
      .from('player_round_states')
      .select('*, players(id, player_number, name)')
      .eq('round_id', roundId);

    if (error) {
      console.error('States lookup error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all player states for a player
   * @param {string} playerId - Player UUID
   * @returns {Promise<Array>} Array of player round states
   */
  async getStatesByPlayer(playerId) {
    if (!playerId) {
      console.error('getStatesByPlayer called without playerId');
      return [];
    }

    const { data, error } = await supabase
      .from('player_round_states')
      .select('*, rounds(id, round_number, match_id)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('States lookup error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Mark player as listening (playback started)
   * @param {string} roundId - Round UUID
   * @param {string} playerId - Player UUID
   * @param {number} syncOffsetMs - Sync offset in milliseconds
   * @returns {Promise<Object>} Updated state
   */
  async markListening(roundId, playerId, syncOffsetMs = 0) {
    return this.upsertState(roundId, playerId, {
      status: 'listening',
      syncOffsetMs,
      playbackStartedAt: new Date().toISOString()
    });
  },

  /**
   * Mark player as completed
   * @param {string} roundId - Round UUID
   * @param {string} playerId - Player UUID
   * @returns {Promise<Object>} Updated state
   */
  async markCompleted(roundId, playerId) {
    return this.upsertState(roundId, playerId, {
      status: 'completed',
      playbackEndedAt: new Date().toISOString()
    });
  },

  /**
   * Mark player as failed
   * @param {string} roundId - Round UUID
   * @param {string} playerId - Player UUID
   * @returns {Promise<Object>} Updated state
   */
  async markFailed(roundId, playerId) {
    return this.upsertState(roundId, playerId, {
      status: 'failed'
    });
  },

  /**
   * Get sync statistics for a round
   * @param {string} roundId - Round UUID
   * @returns {Promise<Object>} Sync statistics
   */
  async getSyncStats(roundId) {
    if (!roundId) {
      console.error('getSyncStats called without roundId');
      return {
        total: 0,
        listening: 0,
        completed: 0,
        failed: 0,
        inSync: false
      };
    }

    const states = await this.getStatesByRound(roundId);
    
    const total = states.length;
    const listening = states.filter(s => s.status === 'listening').length;
    const completed = states.filter(s => s.status === 'completed').length;
    const failed = states.filter(s => s.status === 'failed').length;

    // Consider in sync if at least 80% are listening or completed
    const inSync = (listening + completed) >= total * 0.8;

    return {
      total,
      listening,
      completed,
      failed,
      inSync
    };
  },

  /**
   * Delete player round state
   * @param {string} id - State record UUID
   * @returns {Promise<boolean>} Success
   */
  async deleteState(id) {
    if (!id) {
      console.error('deleteState called without id');
      return false;
    }

    const { error } = await supabase
      .from('player_round_states')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('State deletion error:', error);
      return false;
    }

    return true;
  }
};

export default playerRoundStateService;
