import { supabase } from '../lib/supabase';
import { checkWinCondition, checkWinConditionByPlacements } from './winDetectionUtils';

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
  },

  /**
   * Mark a match as finished in the matches table.
   * Allows clients listening to Supabase to transition out of game loop.
   * Note: Status is now tracked only in matches table for consistency.
   * @param {string} matchId
   * @param {string} winner - 'player_1', 'player_2', or 'draw'
   * @returns {Promise<Array>} Updated match data
   */
  async markMatchFinished(matchId, winner) {
    if (!matchId) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    if (!winner || !['player_1', 'player_2', 'draw'].includes(winner)) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    // Check if match is already finished to prevent redundant operations
    const { data: existingMatch, error: fetchError } = await supabase
      .from('matches')
      .select('status')
      .eq('id', matchId)
      .single();

    if (fetchError) {
      console.error('markMatchFinished fetch error:', fetchError);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    if (existingMatch && existingMatch.status === 'finished') {
      // Match is already finished, no need to update
      return existingMatch;
    }

    // Update only the matches table - single source of truth for match status
    const { data, error } = await supabase
      .from('matches')
      .update({
        status: 'finished',
        winner_id: winner,
        finished_at: new Date().toISOString()
      })
      .eq('id', matchId)
      .select();

    if (error) {
      console.error('markMatchFinished error:', error);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    return data;
  },

  /**
   * Start a new match for a rematch in the same room.
   * Creates a new match with reset game states for all players.
   * This triggers RoomLobby's INSERT subscription for automatic navigation.
   * @param {string} matchId - The previous match ID to get room context from
   * @returns {Promise<Object>} New match data and game states
   */
  async resetGame(matchId) {
    if (!matchId) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    if (!matchId.trim()) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    // Get existing match to retrieve room_id and verify it exists
    const { data: oldMatch, error: matchFetchError } = await supabase
      .from('matches')
      .select('id, room_id, status')
      .eq('id', matchId)
      .single();

    if (matchFetchError) {
      console.error('resetGame match fetch error:', matchFetchError);
      throw new Error(SANITIZED_ERRORS.NOT_FOUND);
    }

    if (!oldMatch) {
      throw new Error(SANITIZED_ERRORS.NOT_FOUND);
    }

    const roomId = oldMatch.room_id;
    if (!roomId) {
      throw new Error(SANITIZED_ERRORS.NOT_FOUND);
    }

    // Get all players in the room for the old match
    const { data: oldGameStates, error: gsError } = await supabase
      .from('game_states')
      .select('player_id')
      .eq('match_id', matchId);

    if (gsError) {
      console.error('resetGame game_states fetch error:', gsError);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    const playerIds = oldGameStates.map(gs => gs.player_id);

    // Create new match with atomic transaction approach
    // First create the new match
    const { data: newMatch, error: newMatchError } = await supabase
      .from('matches')
      .insert([
        {
          room_id: roomId,
          status: 'active',
          current_round: 1,
          max_score: 10,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (newMatchError) {
      console.error('resetGame new match creation error:', newMatchError);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    const newMatchId = newMatch.id;

    // Create new game states for all players with reset values
    const newGameStates = playerIds.map(playerId => ({
      match_id: newMatchId,
      player_id: playerId,
      score: 0,
      correct_placements: 0,
      timeline: [],
      placement_status: 'playing_snippet',
      updated_at: new Date().toISOString()
    }));

    const { data: createdGameStates, error: gsCreateError } = await supabase
      .from('game_states')
      .insert(newGameStates)
      .select();

    if (gsCreateError) {
      console.error('resetGame game_states create error:', gsCreateError);
      // Cleanup: delete the new match if game states creation failed
      await supabase.from('matches').delete().eq('id', newMatchId);
      throw new Error(SANITIZED_ERRORS.SAVE_FAILED);
    }

    // TODO: AC Requirement - "Ensure new tracks are loaded from the Spotify catalog and don't reuse tracks from the previous match immediately"
    // This requires a songService.getRandomUnusedSongs() or similar to be implemented.
    // When song service is available, add: await songService.loadNewTracks(roomId);

    // Mark old match as finished - use transaction-like approach
    const { error: finishError } = await supabase
      .from('matches')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);

    if (finishError) {
      console.error('resetGame finish old match error:', finishError);
      // Non-fatal: new match is created and will work, but old match cleanup failed
    }

    return {
      match: newMatch,
      gameStates: createdGameStates
    };
  },

  /**
   * Check win condition after correct placements update and automatically transition match to finished if won.
   * This is called after each placement is confirmed to immediately detect and mark wins.
   * Note: Uses correct placements count per AC requirement (10 correct placements to win).
   * @param {string} matchId
   * @param {number} playerNumber - 1 or 2
   * @param {number} player1Placements - Current player 1 correct placements count
   * @param {number} player2Placements - Current player 2 correct placements count
   * @returns {Promise<Object>} { winState: {isWinState, winner}, matchFinished: boolean }
   */
  async checkAndApplyWinCondition(matchId, playerNumber, player1Placements, player2Placements) {
    if (!matchId) {
      throw new Error(SANITIZED_ERRORS.INVALID_PARAMS);
    }

    const winState = checkWinConditionByPlacements(player1Placements, player2Placements);
    let matchFinished = false;

    if (winState.isWinState) {
      // Update match status to finished
      await this.markMatchFinished(matchId, winState.winner);
      matchFinished = true;
    }

    return {
      winState,
      matchFinished
    };
  }
};
