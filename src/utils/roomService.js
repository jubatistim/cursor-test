import { supabase } from '../lib/supabase';
import { validateRoomCode, formatRoomCode } from './roomCode';

/**
 * Room service functions for creating, joining, and managing rooms
 */

// Sanitized error messages - never expose DB details to client
const SANITIZED_ERRORS = {
  ROOM_NOT_FOUND: 'Room not found. Please check the code and try again.',
  ROOM_FULL: 'Room is full. Please try another room.',
  GAME_STARTED: 'Game already started. Please create a new room.',
  INVALID_CODE: 'Invalid room code format. Please enter a valid 6-character code.',
  GENERIC: 'An error occurred. Please try again.',
  ROOM_CREATE_FAILED: 'Failed to create room. Please try again.',
  PLAYER_JOIN_FAILED: 'Failed to join room. Please try again.'
};

export const roomService = {
  /**
   * Create a new room with host player record
   * @param {string} hostId - The host's unique identifier
   * @returns {Promise<{roomCode: string, roomId: string, playerNumber: number}>}
   */
  async createRoom(hostId) {
    const roomCode = this.generateRoomCode();

    // Use transaction via RPC or sequential operations
    // First create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert([
        {
          code: roomCode,
          host_id: hostId,
          status: 'waiting',
          max_players: 2,
          player_count: 1
        }
      ])
      .select();

    if (roomError) {
      console.error('Room creation error:', roomError);
      throw new Error(SANITIZED_ERRORS.ROOM_CREATE_FAILED);
    }

    // Create host player record (player_number: 1)
    const { error: playerError } = await supabase
      .from('players')
      .insert([
        {
          room_id: room[0].id,
          player_number: 1,
          joined_at: new Date().toISOString()
        }
      ]);

    if (playerError) {
      console.error('Host player creation error:', playerError);
      // Cleanup: delete the room if player creation failed
      await supabase.from('rooms').delete().eq('id', room[0].id);
      throw new Error(SANITIZED_ERRORS.ROOM_CREATE_FAILED);
    }

    return {
      roomCode,
      roomId: room[0].id,
      playerNumber: 1
    };
  },

  /**
   * Join an existing room
   * @param {string} roomCode - The room code to join
   * @returns {Promise<{roomId: string, playerId: string, playerNumber: number}>}
   */
  async joinRoom(roomCode) {
    // Validate room code format first
    const formattedCode = formatRoomCode(roomCode);
    if (!validateRoomCode(formattedCode)) {
      throw new Error(SANITIZED_ERRORS.INVALID_CODE);
    }

    // Use case-insensitive lookup
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, player_count, max_players')
      .eq('code', formattedCode)
      .single();

    if (roomError) {
      console.error('Room lookup error:', roomError);
      // Generic error to avoid revealing room existence
      throw new Error(SANITIZED_ERRORS.ROOM_NOT_FOUND);
    }

    if (!room) {
      throw new Error(SANITIZED_ERRORS.ROOM_NOT_FOUND);
    }

    if (room.status !== 'waiting') {
      throw new Error(SANITIZED_ERRORS.GAME_STARTED);
    }

    if (room.player_count >= room.max_players) {
      throw new Error(SANITIZED_ERRORS.ROOM_FULL);
    }

    // Determine next available player number
    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('player_number')
      .eq('room_id', room.id)
      .order('player_number');

    if (playersError) {
      console.error('Player lookup error:', playersError);
      throw new Error(SANITIZED_ERRORS.PLAYER_JOIN_FAILED);
    }

    const usedNumbers = existingPlayers.map(p => p.player_number);
    let playerNumber = 2; // Default for 2-player game
    if (!usedNumbers.includes(1)) {
      playerNumber = 1; // This shouldn't happen but handle it
    } else if (!usedNumbers.includes(2)) {
      playerNumber = 2;
    }

    // Room is available, create player record
    const playerId = `player_${crypto.randomUUID()}`;

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([
        {
          room_id: room.id,
          player_number: playerNumber,
          joined_at: new Date().toISOString()
        }
      ])
      .select();

    if (playerError) {
      console.error('Player creation error:', playerError);
      throw new Error(SANITIZED_ERRORS.PLAYER_JOIN_FAILED);
    }

    // Update room player count
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ player_count: room.player_count + 1 })
      .eq('id', room.id);

    if (updateError) {
      console.error('Player count update error:', updateError);
      // Cleanup: delete the player record if count update failed
      await supabase.from('players').delete().eq('id', player[0].id);
      throw new Error(SANITIZED_ERRORS.PLAYER_JOIN_FAILED);
    }

    return {
      roomId: room.id,
      playerId: playerId,
      playerNumber: playerNumber
    };
  },

  /**
   * Get room details by code
   * @param {string} roomCode - The room code
   * @returns {Promise<Object>} Room data
   */
  async getRoomByCode(roomCode) {
    const formattedCode = formatRoomCode(roomCode);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', formattedCode)
      .single();

    if (error) {
      console.error('Room fetch error:', error);
      throw new Error(SANITIZED_ERRORS.ROOM_NOT_FOUND);
    }
    return data;
  },

  /**
   * Get players in a room
   * @param {string} roomId - The room ID
   * @returns {Promise<Array>} Array of player data
   */
  async getRoomPlayers(roomId) {
    if (!roomId) {
      console.error('getRoomPlayers called with null roomId');
      return [];
    }
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_number')
      .limit(10); // Add limit for safety

    if (error) {
      console.error('Players fetch error:', error);
      throw new Error(SANITIZED_ERRORS.GENERIC);
    }
    return data || [];
  },

  /**
   * Get actual player count for a room (from players table)
   * @param {string} roomId - The room ID
   * @returns {Promise<number>} Count of players
   */
  async getActualPlayerCount(roomId) {
    const { count, error } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (error) {
      console.error('Player count error:', error);
      return 0;
    }
    return count || 0;
  },

  /**
   * Generate a random 6-character room code
   * @returns {string} Room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const values = new Uint32Array(6);
    crypto.getRandomValues(values);
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(values[i] % chars.length);
    }
    return result;
  }
};