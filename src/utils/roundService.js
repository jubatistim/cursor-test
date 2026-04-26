import { supabase } from '../lib/supabase';
import { songService } from './songService';

/**
 * Round service functions for managing game rounds
 */

// Sanitized error messages - never expose DB details to client
const SANITIZED_ERRORS = {
  ROUND_NOT_FOUND: 'Round not found.',
  INVALID_MATCH: 'Invalid match.',
  ROUND_CREATION_FAILED: 'Failed to create round.',
  ROUND_UPDATE_FAILED: 'Failed to update round.',
  DATABASE_ERROR: 'A database error occurred.',
  ROUND_ALREADY_EXISTS: 'Round already exists for this match and round number.'
};

export const roundService = {
  /**
   * Create a new round for a match
   * Automatically selects a random unused song
   * @param {string} matchId - The match ID
   * @param {number} roundNumber - The round number
   * @param {Object} options - Optional parameters
   * @param {string} options.songId - Specific song ID to use (optional)
   * @returns {Promise<Object>} Round data
   */
  async createRound(matchId, roundNumber, options = {}) {
    if (!matchId || typeof matchId !== 'string' || matchId.trim() === '') {
      console.error('createRound called with invalid matchId');
      throw new Error(SANITIZED_ERRORS.INVALID_MATCH);
    }

    if (roundNumber == null || typeof roundNumber !== 'number' || !Number.isInteger(roundNumber)) {
      console.error('createRound called with invalid roundNumber');
      throw new Error(SANITIZED_ERRORS.INVALID_MATCH);
    }

    if (roundNumber < 1) {
      throw new Error('Round number must be at least 1');
    }

    try {
      // Select a song (use provided songId or get random unused song)
      let songId = options.songId;
      if (!songId) {
        const song = await songService.getRandomUnusedSong(matchId);
        if (!song || !song.id) {
          throw new Error('No songs available for this match');
        }
        songId = song.id;
      } else {
        if (typeof songId !== 'string' || songId.trim() === '') {
          console.error('createRound called with invalid songId');
          throw new Error(SANITIZED_ERRORS.INVALID_MATCH);
        }
      }

      // Use transaction to ensure atomic round + tracking creation
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .insert([{
          match_id: matchId,
          round_number: roundNumber,
          song_id: songId,
          status: 'active'
        }])
        .select();

      if (roundError) {
        console.error('Round creation error:', roundError);
        // Check if it's a unique constraint violation (round already exists)
        if (roundError.code === '23505') {
          throw new Error(SANITIZED_ERRORS.ROUND_ALREADY_EXISTS);
        }
        throw new Error(SANITIZED_ERRORS.ROUND_CREATION_FAILED);
      }

      if (!round || round.length === 0) {
        throw new Error(SANITIZED_ERRORS.ROUND_CREATION_FAILED);
      }

      const roundData = round[0];

      // Track that this song has been used in this match
      await this.trackUsedSong(matchId, roundNumber, songId);

      return roundData;
    } catch (error) {
      console.error('Error in createRound:', error);
      throw error;
    }
  },

  /**
   * Track that a song has been used in a match
   * @param {string} matchId - The match ID
   * @param {number} roundNumber - The round number
   * @param {string} songId - The song ID
   * @returns {Promise<Object>} Match used song record
   */
  async trackUsedSong(matchId, roundNumber, songId) {
    if (!matchId || typeof matchId !== 'string' || matchId.trim() === '') {
      console.error('trackUsedSong called with invalid matchId');
      return null;
    }

    if (roundNumber == null || typeof roundNumber !== 'number' || !Number.isInteger(roundNumber) || roundNumber < 1) {
      console.error('trackUsedSong called with invalid roundNumber');
      return null;
    }

    if (!songId || typeof songId !== 'string' || songId.trim() === '') {
      console.error('trackUsedSong called with invalid songId');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('match_used_songs')
        .insert([{
          match_id: matchId,
          song_id: songId,
          round_number: roundNumber
        }]);

      if (error) {
        console.error('Error tracking used song:', error);
        // Don't throw - this is non-critical, round was already created
        return null;
      }

      return data[0];
    } catch (error) {
      console.error('Error in trackUsedSong:', error);
      return null;
    }
  },

  /**
   * Get round by ID
   * @param {string} roundId - The round ID
   * @returns {Promise<Object|null>} Round data or null
   */
  async getRoundById(roundId) {
    if (!roundId || typeof roundId !== 'string' || roundId.trim() === '') {
      console.error('getRoundById called with invalid roundId');
      return null;
    }

    const { data, error } = await supabase
      .from('rounds')
      .select('*, songs(*)')
      .eq('id', roundId)
      .single();

    if (error) {
      console.error('Round lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get round by match ID and round number
   * @param {string} matchId - The match ID
   * @param {number} roundNumber - The round number
   * @returns {Promise<Object|null>} Round data or null
   */
  async getRoundByMatchAndNumber(matchId, roundNumber) {
    if (!matchId || typeof matchId !== 'string' || matchId.trim() === '') {
      console.error('getRoundByMatchAndNumber called with invalid matchId');
      return null;
    }

    if (roundNumber == null || typeof roundNumber !== 'number' || !Number.isInteger(roundNumber) || roundNumber < 1) {
      console.error('getRoundByMatchAndNumber called with invalid roundNumber');
      return null;
    }

    const { data, error } = await supabase
      .from('rounds')
      .select('*, songs(*)')
      .eq('match_id', matchId)
      .eq('round_number', roundNumber)
      .single();

    if (error) {
      console.error('Round lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all rounds for a match
   * @param {string} matchId - The match ID
   * @returns {Promise<Array>} Array of round data
   */
  async getRoundsByMatch(matchId) {
    if (!matchId || typeof matchId !== 'string' || matchId.trim() === '') {
      console.error('getRoundsByMatch called with invalid matchId');
      return [];
    }

    const { data, error } = await supabase
      .from('rounds')
      .select('*, songs(*)')
      .eq('match_id', matchId)
      .order('round_number', { ascending: true });

    if (error) {
      console.error('Rounds lookup error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get the current round for a match
   * @param {string} matchId - The match ID
   * @returns {Promise<Object|null>} Current round data or null
   */
  async getCurrentRound(matchId) {
    if (!matchId || typeof matchId !== 'string' || matchId.trim() === '') {
      console.error('getCurrentRound called with invalid matchId');
      return null;
    }

    // Get the match to find current round number
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('current_round')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('Match lookup error:', matchError);
      return null;
    }

    return this.getRoundByMatchAndNumber(matchId, match.current_round);
  },

  /**
   * Complete a round (mark as completed)
   * @param {string} roundId - The round ID
   * @returns {Promise<Object>} Updated round data
   */
  async completeRound(roundId) {
    if (!roundId || typeof roundId !== 'string' || roundId.trim() === '') {
      console.error('completeRound called with invalid roundId');
      throw new Error(SANITIZED_ERRORS.ROUND_NOT_FOUND);
    }

    const { data, error } = await supabase
      .from('rounds')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', roundId)
      .select();

    if (error) {
      console.error('Round completion error:', error);
      throw new Error(SANITIZED_ERRORS.ROUND_UPDATE_FAILED);
    }

    return data[0];
  },

  /**
   * Get the song for a round
   * @param {string} roundId - The round ID
   * @returns {Promise<Object|null>} Song data or null
   */
  async getSongForRound(roundId) {
    if (!roundId || typeof roundId !== 'string' || roundId.trim() === '') {
      console.error('getSongForRound called with invalid roundId');
      return null;
    }

    const round = await this.getRoundById(roundId);
    if (!round || !round.song_id) {
      return null;
    }

    return songService.getSongById(round.song_id);
  },

  /**
   * Get remaining time for a round snippet
   * @param {Object} round - Round data
   * @param {number} snippetDuration - Snippet duration in seconds
   * @returns {number} Remaining time in seconds
   */
  getRemainingSnippetTime(round, snippetDuration) {
    if (!round || !round.started_at) {
      return 0;
    }

    if (typeof snippetDuration !== 'number' || snippetDuration <= 0) {
      console.error('getRemainingSnippetTime called with invalid snippetDuration');
      return 0;
    }

    const startedAt = new Date(round.started_at);
    const now = new Date();
    const elapsed = (now - startedAt) / 1000; // Convert to seconds
    
    const remaining = Math.max(0, snippetDuration - elapsed);
    return remaining;
  },

  /**
   * Check if a round is currently playing a snippet
   * @param {Object} round - Round data
   * @param {number} snippetDuration - Snippet duration in seconds
   * @returns {boolean}
   */
  isSnippetPlaying(round, snippetDuration) {
    if (!round || !round.started_at || round.status !== 'active') {
      return false;
    }

    if (typeof snippetDuration !== 'number' || snippetDuration <= 0) {
      return false;
    }

    const remainingTime = this.getRemainingSnippetTime(round, snippetDuration);
    return remainingTime > 0;
  }
};

export default roundService;
