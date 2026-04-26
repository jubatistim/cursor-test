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
    if (!matchId || typeof matchId !== 'string' || matchId.trim() === '') {
      console.error('getRandomUnusedSong called with invalid matchId');
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    try {
      // Use a single query with left join to find unused songs
      // This avoids N+1 by doing it server-side
      const { data: unusedSongs, error: queryError } = await supabase
        .from('songs')
        .select('*')
        .not('id', 'in', `
          (SELECT song_id FROM match_used_songs WHERE match_id = '${matchId}')
        `);

      if (queryError) {
        console.error('Error fetching unused songs:', queryError);
        throw new Error(SANITIZED_ERRORS.SONG_SELECTION_FAILED);
      }

      // If we have unused songs, pick one randomly
      if (unusedSongs && unusedSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * unusedSongs.length);
        return unusedSongs[randomIndex];
      }

      // If all songs have been used, fallback to random song (allow reuse for long matches)
      const { data: allSongs, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .limit(1000); // Always add limit for safety

      if (songsError || !allSongs || allSongs.length === 0) {
        console.error('Error fetching all songs:', songsError);
        throw new Error(SANITIZED_ERRORS.NO_SONGS_AVAILABLE);
      }

      const randomIndex = Math.floor(Math.random() * allSongs.length);
      return allSongs[randomIndex];
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
    if (!songId || typeof songId !== 'string' || songId.trim() === '') {
      console.error('getSongById called with invalid songId');
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
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      console.error('getSongsByIds called with invalid songIds');
      return [];
    }

    // Validate all IDs are strings
    const validIds = songIds.filter(id => typeof id === 'string' && id.trim() !== '');
    if (validIds.length === 0) {
      console.error('getSongsByIds called with no valid songIds');
      return [];
    }

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .in('id', validIds);

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
    if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
      console.error('getAllSongs called with invalid limit');
      limit = 100;
    }

    // Validate and sanitize filters
    const validatedFilters = {};
    if (filters.genre && typeof filters.genre === 'string' && filters.genre.trim() !== '') {
      validatedFilters.genre = filters.genre.trim();
    }

    if (filters.yearRange && typeof filters.yearRange === 'object') {
      validatedFilters.yearRange = {};
      if (typeof filters.yearRange.minYear === 'number' && Number.isInteger(filters.yearRange.minYear)) {
        validatedFilters.yearRange.minYear = filters.yearRange.minYear;
      }
      if (typeof filters.yearRange.maxYear === 'number' && Number.isInteger(filters.yearRange.maxYear)) {
        validatedFilters.yearRange.maxYear = filters.yearRange.maxYear;
      }
    }

    if (filters.artist && typeof filters.artist === 'string' && filters.artist.trim() !== '') {
      validatedFilters.artist = filters.artist.trim();
    }

    // Clamp limit to reasonable maximum
    limit = Math.min(1000, Math.max(1, limit));

    let query = supabase
      .from('songs')
      .select('*')
      .limit(limit);

    // Apply filters
    if (validatedFilters.genre) {
      query = query.eq('genre', validatedFilters.genre);
    }

    if (validatedFilters.yearRange) {
      const { minYear, maxYear } = validatedFilters.yearRange;
      if (minYear !== undefined) {
        query = query.gte('release_year', minYear);
      }
      if (maxYear !== undefined) {
        query = query.lte('release_year', maxYear);
      }
    }

    if (validatedFilters.artist) {
      query = query.ilike('artist', `%${validatedFilters.artist}%`);
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
    if (!songData || typeof songData !== 'object') {
      console.error('Invalid song data:', songData);
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    if (!songData.title || typeof songData.title !== 'string' || songData.title.trim() === '') {
      console.error('Invalid song title');
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    if (!songData.artist || typeof songData.artist !== 'string' || songData.artist.trim() === '') {
      console.error('Invalid song artist');
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    if (songData.release_year == null || typeof songData.release_year !== 'number' || !Number.isInteger(songData.release_year)) {
      console.error('Invalid song release_year');
      throw new Error(SANITIZED_ERRORS.INVALID_SONG);
    }

    // Validate and sanitize optional fields
    let spotifyId = songData.spotify_id;
    if (spotifyId !== undefined && (typeof spotifyId !== 'string' || spotifyId.trim() === '')) {
      spotifyId = null;
    }

    let genre = songData.genre;
    if (genre !== undefined && (typeof genre !== 'string' || genre.trim() === '')) {
      genre = null;
    }

    let snippetStart = songData.snippet_start || 0;
    if (typeof snippetStart !== 'number' || snippetStart < 0) {
      snippetStart = 0;
    }

    // Validate snippet duration
    let snippetDuration = songData.snippet_duration || 20;
    if (typeof snippetDuration !== 'number' || snippetDuration < 15 || snippetDuration > 30) {
      throw new Error('Snippet duration must be between 15 and 30 seconds');
    }

    let previewUrl = songData.preview_url;
    if (previewUrl !== undefined && (typeof previewUrl !== 'string' || previewUrl.trim() === '')) {
      previewUrl = null;
    }

    const { data, error } = await supabase
      .from('songs')
      .insert([{
        title: songData.title.trim(),
        artist: songData.artist.trim(),
        release_year: songData.release_year,
        spotify_id: spotifyId,
        snippet_start: snippetStart,
        snippet_duration: snippetDuration,
        genre: genre,
        preview_url: previewUrl
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
    if (typeof query !== 'string' || query.trim() === '') {
      console.error('searchSongs called with invalid query');
      return this.getAllSongs({}, limit);
    }

    if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
      console.error('searchSongs called with invalid limit');
      limit = 20;
    }

    // Clamp limit to reasonable maximum
    limit = Math.min(100, Math.max(1, limit));

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
