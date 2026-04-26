import { supabase } from '../lib/supabase';

/**
 * Song service functions for managing songs and song selection
 */

// Sanitized error messages - never expose DB details to client
const SANITIZED_ERRORS = {
  SONG_NOT_FOUND: 'Song not found.',
  NO_SONGS_AVAILABLE: 'No songs available.',
  SONG_SELECTION_FAILED: 'Failed to select song.',
  DATABASE_ERROR: 'A database error occurred.',
  INVALID_SONG: 'Invalid song data.'
};

export const songService = {
  /**
   * Get a random song from the catalog that hasn't been used in a match
   * @param {string} matchId - The match ID
   * @returns {Promise<Object>} Song data
   */
  async getRandomUnusedSong(matchId) {
    if (!matchId) {
      console.error('getRandomUnusedSong called without matchId');
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    try {
      // Get all songs
      const { data: allSongs, error: songsError } = await supabase
        .from('songs')
        .select('*');

      if (songsError || !allSongs || allSongs.length === 0) {
        console.error('Error fetching songs:', songsError);
        throw new Error(SANITIZED_ERRORS.NO_SONGS_AVAILABLE);
      }

      // Get songs already used in this match
      const { data: usedSongs, error: usedError } = await supabase
        .from('match_used_songs')
        .select('song_id')
        .eq('match_id', matchId);

      if (usedError) {
        console.error('Error fetching used songs:', usedError);
        // Continue without filtering - we'll still have songs to choose from
      }

      // Filter out used songs
      const usedSongIds = usedSongs ? usedSongs.map(us => us.song_id) : [];
      const availableSongs = allSongs.filter(song => !usedSongIds.includes(song.id));

      // If all songs have been used, start reusing (for long matches)
      const songsToChooseFrom = availableSongs.length > 0 ? availableSongs : allSongs;

      if (songsToChooseFrom.length === 0) {
        throw new Error(SANITIZED_ERRORS.NO_SONGS_AVAILABLE);
      }

      // Select a random song
      const randomIndex = Math.floor(Math.random() * songsToChooseFrom.length);
      return songsToChooseFrom[randomIndex];
    } catch (error) {
      console.error('Error in getRandomUnusedSong:', error);
      throw new Error(SANITIZED_ERRORS.SONG_SELECTION_FAILED);
    }
  },

  /**
   * Get song by ID
   * @param {string} songId - The song ID
   * @returns {Promise<Object|null>} Song data or null
   */
  async getSongById(songId) {
    if (!songId) {
      console.error('getSongById called without songId');
      return null;
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error) {
      console.error('Song lookup error:', error);
      return null;
    }

    return data;
  },

  /**
   * Get multiple songs by IDs
   * @param {string[]} songIds - Array of song IDs
   * @returns {Promise<Array>} Array of song data
   */
  async getSongsByIds(songIds) {
    if (!songIds || songIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .in('id', songIds);

    if (error) {
      console.error('Songs lookup error:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all songs with optional filtering
   * @param {Object} filters - Filter options (genre, year range, etc.)
   * @param {number} limit - Maximum number of songs to return
   * @returns {Promise<Array>} Array of song data
   */
  async getAllSongs(filters = {}, limit = 100) {
    let query = supabase
      .from('songs')
      .select('*')
      .limit(limit);

    // Apply filters
    if (filters.genre) {
      query = query.eq('genre', filters.genre);
    }

    if (filters.yearRange) {
      const { minYear, maxYear } = filters.yearRange;
      if (minYear !== undefined) {
        query = query.gte('release_year', minYear);
      }
      if (maxYear !== undefined) {
        query = query.lte('release_year', maxYear);
      }
    }

    if (filters.artist) {
      query = query.ilike('artist', `%${filters.artist}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all songs:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Add a new song to the catalog
   * @param {Object} songData - Song data to add
   * @returns {Promise<Object>} Added song data
   */
  async addSong(songData) {
    if (!songData || !songData.title || !songData.artist || !songData.release_year) {
      console.error('Invalid song data:', songData);
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    // Validate snippet duration
    const snippetDuration = songData.snippet_duration || 20;
    if (snippetDuration < 15 || snippetDuration > 30) {
      throw new Error('Snippet duration must be between 15 and 30 seconds');
    }

    const { data, error } = await supabase
      .from('songs')
      .insert([{
        title: songData.title,
        artist: songData.artist,
        release_year: songData.release_year,
        spotify_id: songData.spotify_id,
        snippet_start: songData.snippet_start || 0,
        snippet_duration: snippetDuration,
        genre: songData.genre,
        preview_url: songData.preview_url
      }])
      .select();

    if (error) {
      console.error('Error adding song:', error);
      throw new Error(SANITIZED_ERRORS.DATABASE_ERROR);
    }

    return data[0];
  },

  /**
   * Get song count by genre
   * @returns {Promise<Array>} Array of {genre, count} objects
   */
  async getSongCountByGenre() {
    const { data, error } = await supabase
      .from('songs')
      .select('genre, count(*)');

    if (error) {
      console.error('Error counting songs by genre:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get song count by decade
   * @returns {Promise<Array>} Array of {decade, count} objects
   */
  async getSongCountByDecade() {
    const { data, error } = await supabase.rpc('get_song_count_by_decade');

    if (error) {
      console.error('Error counting songs by decade:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Search for songs
   * @param {string} query - Search query (matches title and artist)
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of matching songs
   */
  async searchSongs(query, limit = 20) {
    if (!query || query.trim() === '') {
      return this.getAllSongs({}, limit);
    }

    const searchTerm = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`)
      .limit(limit);

    if (error) {
      console.error('Error searching songs:', error);
      return [];
    }

    return data || [];
  }
};

export default songService;
