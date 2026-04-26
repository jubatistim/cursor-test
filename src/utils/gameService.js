import { supabase } from '../lib/supabase';

/**
 * Game service - placement confirmation and opponent sync
 */

const SANITIZED_ERRORS = {
  SAVE_FAILED: 'Failed to save placement. Please try again.',
  SCORE_SAVE_FAILED: 'Failed to save score. Please try again.',
  INVALID_PARAMS: 'Invalid parameters provided.',
  NOT_FOUND: 'Game state not found.'
};

const PLAYER_NUMBERS = {
  PLAYER_1: 1,
  PLAYER_2: 2
};

export const gameService = {
  /**
   * Confirm and persist a player's song placement.
   * Transitions local state from 'placing' to 'waiting_for_opponent'.
   * @param {string} matchId
   * @param {string} playerId
   * @param {Array} placedSongs - Ordered array of placed song objects
   * @returns {Promise<Object>} Updated game state
   */
  async confirmPlacement(matchId, playerId, placedSongs) {
    if (!matchId || !playerId) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }
    if (!Array.isArray(placedSongs)) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    const timeline = placedSongs.map((song, index) => ({
      song_id: song.id,
      position: index,
      confirmed_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('game_states')
      .update({
        timeline,
        placement_status: 'waiting_for_opponent',
        updated_at: new Date().toISOString()
      })
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) {
      console.error('confirmPlacement error:', error);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    return data;
  },

  /**
   * Subscribe to real-time opponent placement status.
   * Calls onOpponentConfirmed when the opponent's placement_status becomes 'waiting_for_opponent'.
   * @param {string} matchId
   * @param {string} currentPlayerId - This player's ID (excluded from subscription)
   * @param {Function} onOpponentConfirmed - Callback when opponent confirms
   * @returns {Function} Unsubscribe function
   */
  subscribeToOpponentPlacement(matchId, currentPlayerId, onOpponentConfirmed) {
    if (!matchId || !currentPlayerId || typeof onOpponentConfirmed !== 'function') {
      return () => {};
    }

    const channel = supabase
      .channel(`opponent_placement_${matchId}_${currentPlayerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          const updated = payload.new;
          if (
            updated.player_id !== currentPlayerId &&
            updated.placement_status === 'waiting_for_opponent'
          ) {
            onOpponentConfirmed();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Add points to a player's score for a round to the game_states table.
   * Updates player_1_score or player_2_score depending on playerNumber.
   * @param {string} matchId
   * @param {number} playerNumber - 1 or 2
   * @param {number} points - Points to add (0 or 1)
   * @returns {Promise<Object>} Updated game state row
   */
  async saveScore(matchId, playerNumber, points) {
    if (!matchId) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }
    if (playerNumber !== PLAYER_NUMBERS.PLAYER_1 && playerNumber !== PLAYER_NUMBERS.PLAYER_2) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }
    if (typeof points !== 'number' || points < 0) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    const scoreField = playerNumber === PLAYER_NUMBERS.PLAYER_1 ? 'player_1_score' : 'player_2_score';

    // First get current score to add points atomically
    const { data: currentData, error: fetchError } = await supabase
      .from('game_states')
      .select(scoreField)
      .eq('match_id', matchId)
      .single();

    if (fetchError) {
      console.error('saveScore fetch error:', fetchError);
      throw new Error(SANITIZED_ERRORS.SCORE_SAVE_FAILED);
    }

    const currentScore = currentData[scoreField] || 0;
    const newScore = currentScore + points;

    const { data, error } = await supabase
      .from('game_states')
      .update({
        [scoreField]: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('match_id', matchId)
      .select()
      .single();

    if (error) {
      console.error('saveScore error:', error);
      throw new Error(SANITIZED_ERRORS.SCORE_SAVE_FAILED);
    }

    return data;
  },

  /**
   * Reset placement status back to 'placing' (player changed their mind).
   * @param {string} matchId
   * @param {string} playerId
   * @returns {Promise<Object>} Updated game state
   */
  async resetPlacement(matchId, playerId) {
    if (!matchId || !playerId) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    const { data, error } = await supabase
      .from('game_states')
      .update({
        placement_status: 'placing',
        updated_at: new Date().toISOString()
      })
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) {
      console.error('resetPlacement error:', error);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    return data;
  }
};
