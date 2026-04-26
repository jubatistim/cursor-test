import { supabase } from '../lib/supabase';

/**
 * Match service functions for starting, managing, and ending matches
 */

// Sanitized error messages - never expose DB details to client
const SANITIZED_ERRORS = {
  MATCH_START_FAILED: 'Failed to start match. Please try again.',
  MATCH_NOT_FOUND: 'Match not found.',
  MATCH_ALREADY_STARTED: 'Match already started.',
  ROOM_NOT_FOUND: 'Room not found.',
  NOT_HOST: 'Only the host can start the match.',
  NOT_ENOUGH_PLAYERS: 'Not enough players. Need 2 players to start.',
  INVALID_PLAYER: 'Invalid player data.',
  GENERIC: 'An error occurred. Please try again.'
};

export const matchService = {
  /**
   * Start a new match for a room
   * @param {string} roomId - The room ID
   * @param {string} hostPlayerId - The host player ID
   * @returns {Promise<{matchId: string, match: Object}>}
   */
  async startMatch(roomId, hostPlayerId) {
    if (!roomId) {
      console.error('startMatch called without roomId');
      throw new Error(SANITIZED_ERRORS.ROOM_NOT_FOUND);
    }

    try {
      // Verify room exists and has enough players
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, status, player_count, max_players, current_match_id')
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        console.error('Room lookup error:', roomError);
        throw new Error(SANITIZED_ERRORS.ROOM_NOT_FOUND);
      }

      // Check if match already started
      if (room.status === 'playing') {
        console.error('Match already started for room:', roomId);
        throw new Error(SANITIZED_ERRORS.MATCH_ALREADY_STARTED);
      }

      // Check if room is full
      if (room.player_count < room.max_players) {
        console.error('Not enough players in room:', roomId);
        throw new Error(SANITIZED_ERRORS.NOT_ENOUGH_PLAYERS);
      }

      // Get all players in the room
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, player_number')
        .eq('room_id', roomId)
        .order('player_number');

      if (playersError || !players || players.length === 0) {
        console.error('Players lookup error:', playersError);
        throw new Error(SANITIZED_ERRORS.NOT_ENOUGH_PLAYERS);
      }

      // Verify host is calling this
      const hostPlayer = players.find(p => p.id === hostPlayerId);
      if (!hostPlayer || hostPlayer.player_number !== 1) {
        console.error('Unauthorized startMatch attempt. Host player_number should be 1.');
        throw new Error(SANITIZED_ERRORS.NOT_HOST);
      }

      // Create match record with transaction
      // First create match, then create game states for all players
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert([
          {
            room_id: roomId,
            status: 'active',
            current_round: 1,
            max_score: 10
          }
        ])
        .select();

      if (matchError) {
        console.error('Match creation error:', matchError);
        throw new Error(SANITIZED_ERRORS.MATCH_START_FAILED);
      }

      const matchId = match[0].id;

      // Create game states for all players
      const gameStates = players.map(player => ({
        match_id: matchId,
        player_id: player.id,
        score: 0,
        correct_placements: 0,
        timeline: []
      }));

      const { error: gameStatesError } = await supabase
        .from('game_states')
        .insert(gameStates);

      if (gameStatesError) {
        console.error('Game states creation error:', gameStatesError);
        // Cleanup: delete the match if game states creation failed
        await supabase.from('matches').delete().eq('id', matchId);
        throw new Error(SANITIZED_ERRORS.MATCH_START_FAILED);
      }

      console.log('Match started successfully:', matchId);

      return {
        matchId,
        match: match[0]
      };
    } catch (error) {
      console.error('Error in startMatch:', error);
      throw error;
    }
  },

  /**
   * Get match by room ID
   * @param {string} roomId - The room ID
   * @returns {Promise<Object|null>} Match data or null
   */
  async getMatchByRoomId(roomId) {
    if (!roomId) {
      console.error('getMatchByRoomId called without roomId');
      return null;
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) {
      console.error('Match lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get match by ID
   * @param {string} matchId - The match ID
   * @returns {Promise<Object|null>} Match data or null
   */
  async getMatchById(matchId) {
    if (!matchId) {
      console.error('getMatchById called without matchId');
      return null;
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('Match lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get game state for a player in a match
   * @param {string} matchId - The match ID
   * @param {string} playerId - The player ID
   * @returns {Promise<Object|null>} Game state data or null
   */
  async getGameState(matchId, playerId) {
    if (!matchId || !playerId) {
      console.error('getGameState called with invalid parameters');
      return null;
    }

    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .single();

    if (error) {
      console.error('Game state lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all game states for a match
   * @param {string} matchId - The match ID
   * @returns {Promise<Array>} Array of game state data
   */
  async getAllGameStates(matchId) {
    if (!matchId) {
      console.error('getAllGameStates called without matchId');
      return [];
    }

    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('match_id', matchId)
      .order('player_id');

    if (error) {
      console.error('Game states lookup error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update game state for a player
   * @param {string} matchId - The match ID
   * @param {string} playerId - The player ID
   * @param {Object} updates - Object with fields to update
   * @returns {Promise<Object>} Updated game state
   */
  async updateGameState(matchId, playerId, updates) {
    if (!matchId || !playerId) {
      console.error('updateGameState called with invalid parameters');
      throw new Error(SANITIZED_ERRORS.INVALID_PLAYER);
    }

    const { data, error } = await supabase
      .from('game_states')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .select();

    if (error) {
      console.error('Game state update error:', error);
      throw new Error(SANITIZED_ERRORS.GENERIC);
    }

    return data[0];
  },

  /**
   * Increment player score
   * @param {string} matchId - The match ID
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} Updated game state
   */
  async incrementScore(matchId, playerId) {
    const gameState = await this.getGameState(matchId, playerId);
    if (!gameState) {
      throw new Error(SANITIZED_ERRORS.INVALID_PLAYER);
    }

    return this.updateGameState(matchId, playerId, {
      score: gameState.score + 1
    });
  },

  /**
   * Increment correct placements
   * @param {string} matchId - The match ID
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} Updated game state
   */
  async incrementCorrectPlacements(matchId, playerId) {
    const gameState = await this.getGameState(matchId, playerId);
    if (!gameState) {
      throw new Error(SANITIZED_ERRORS.INVALID_PLAYER);
    }

    return this.updateGameState(matchId, playerId, {
      correct_placements: gameState.correct_placements + 1
    });
  },

  /**
   * Add placement to timeline
   * @param {string} matchId - The match ID
   * @param {string} playerId - The player ID
   * @param {Object} placement - Placement data to add to timeline
   * @returns {Promise<Object>} Updated game state
   */
  async addPlacementToTimeline(matchId, playerId, placement) {
    const gameState = await this.getGameState(matchId, playerId);
    if (!gameState) {
      throw new Error(SANITIZED_ERRORS.INVALID_PLAYER);
    }

    const timeline = gameState.timeline || [];
    timeline.push(placement);

    return this.updateGameState(matchId, playerId, {
      timeline
    });
  },

  /**
   * End the match
   * @param {string} matchId - The match ID
   * @param {string} winnerId - The winning player ID
   * @returns {Promise<Object>} Updated match data
   */
  async endMatch(matchId, winnerId) {
    if (!matchId) {
      console.error('endMatch called without matchId');
      throw new Error(SANITIZED_ERRORS.MATCH_NOT_FOUND);
    }

    const { data, error } = await supabase
      .from('matches')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        winner_id: winnerId
      })
      .eq('id', matchId)
      .select();

    if (error) {
      console.error('Match end error:', error);
      throw new Error(SANITIZED_ERRORS.GENERIC);
    }

    return data[0];
  },

  /**
   * Advance to next round
   * @param {string} matchId - The match ID
   * @returns {Promise<Object>} Updated match data
   */
  async nextRound(matchId) {
    if (!matchId) {
      console.error('nextRound called without matchId');
      throw new Error(SANITIZED_ERRORS.MATCH_NOT_FOUND);
    }

    // Get current match to determine next round number
    const currentMatch = await this.getMatchById(matchId);
    if (!currentMatch) {
      throw new Error(SANITIZED_ERRORS.MATCH_NOT_FOUND);
    }

    const { data, error } = await supabase
      .from('matches')
      .update({
        current_round: currentMatch.current_round + 1
      })
      .eq('id', matchId)
      .select();

    if (error) {
      console.error('Next round error:', error);
      throw new Error(SANITIZED_ERRORS.GENERIC);
    }

    return data[0];
  }
};
