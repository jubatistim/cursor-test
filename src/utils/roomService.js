import { supabase } from '../lib/supabase';

/**
 * Room service functions for creating, joining, and managing rooms
 */

export const roomService = {
  /**
   * Create a new room
   * @param {string} hostId - The host's unique identifier
   * @returns {Promise<{roomCode: string, roomId: string}>}
   */
  async createRoom(hostId) {
    const roomCode = this.generateRoomCode();

    const { data, error } = await supabase
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

    if (error) throw error;

    return {
      roomCode,
      roomId: data[0].id
    };
  },

  /**
   * Join an existing room
   * @param {string} roomCode - The room code to join
   * @returns {Promise<{roomId: string, playerId: string}>}
   */
  async joinRoom(roomCode) {
    // First, check if room exists and is available
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, player_count, max_players')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already started');
    }

    if (room.player_count >= room.max_players) {
      throw new Error('Room is full');
    }

    // Room is available, create player record
    const playerId = `player_${crypto.randomUUID()}`;

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([
        {
          room_id: room.id,
          player_number: 2, // Joiner is always player 2
          joined_at: new Date().toISOString()
        }
      ])
      .select();

    if (playerError) throw playerError;

    // Update room player count
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ player_count: room.player_count + 1 })
      .eq('id', room.id);

    if (updateError) throw updateError;

    return {
      roomId: room.id,
      playerId: playerId
    };
  },

  /**
   * Get room details by code
   * @param {string} roomCode - The room code
   * @returns {Promise<Object>} Room data
   */
  async getRoomByCode(roomCode) {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get players in a room
   * @param {string} roomId - The room ID
   * @returns {Promise<Array>} Array of player data
   */
  async getRoomPlayers(roomId) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_number');

    if (error) throw error;
    return data;
  },

  /**
   * Generate a random 6-character room code
   * @returns {string} Room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};