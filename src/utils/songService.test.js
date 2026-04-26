import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { songService } from './songService';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({})),
      eq: vi.fn(() => ({})),
      in: vi.fn(() => ({})),
      insert: vi.fn(() => ({})),
      single: vi.fn(() => ({})),
      order: vi.fn(() => ({})),
      limit: vi.fn(() => ({})),
      ilike: vi.fn(() => ({})),
      or: vi.fn(() => ({})),
    })),
    rpc: vi.fn(() => ({}))
  }
}));

describe('Song Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSongById', () => {
    it('should return null when songId is not provided', async () => {
      const result = await songService.getSongById(null);
      expect(result).toBeNull();
    });

    it('should return null when song is not found', async () => {
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: new Error('Not found') }))
          }))
        }))
      }));

      const result = await songService.getSongById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return song data when song exists', async () => {
      const mockSong = { id: '123', title: 'Test Song', artist: 'Test Artist', release_year: 2023 };
      
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockSong, error: null }))
          }))
        }))
      }));

      const result = await songService.getSongById('123');
      expect(result).toEqual(mockSong);
    });
  });

  describe('getSongsByIds', () => {
    it('should return empty array when no songIds provided', async () => {
      const result = await songService.getSongsByIds([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when no songs found', async () => {
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({ data: null, error: new Error('Not found') }))
        }))
      }));

      const result = await songService.getSongsByIds(['123', '456']);
      expect(result).toEqual([]);
    });

    it('should return array of songs when found', async () => {
      const mockSongs = [
        { id: '123', title: 'Song 1' },
        { id: '456', title: 'Song 2' }
      ];
      
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({ data: mockSongs, error: null }))
        }))
      }));

      const result = await songService.getSongsByIds(['123', '456']);
      expect(result).toEqual(mockSongs);
    });
  });

  describe('getRandomUnusedSong', () => {
    it('should throw error when matchId is not provided', async () => {
      await expect(songService.getRandomUnusedSong(null))
        .rejects
        .toThrow('Invalid song data');
    });

    it('should throw error when no songs available', async () => {
      supabase.from = vi.fn((table) => {
        if (table === 'songs') {
          return {
            select: vi.fn(() => ({ data: [], error: null }))
          };
        }
        return {
          select: vi.fn(() => ({ data: [], error: null }))
        };
      });

      await expect(songService.getRandomUnusedSong('match-123'))
        .rejects
        .toThrow('Failed to select song.');
    });

    it('should return a random unused song', async () => {
      const mockSongs = [
        { id: '1', title: 'Unused Song' },
        { id: '2', title: 'Another Unused' }
      ];
      
      const mockUsedSongs = [];
      
      supabase.from = vi.fn((table) => {
        if (table === 'songs') {
          return {
            select: vi.fn(() => ({ data: mockSongs, error: null }))
          };
        }
        if (table === 'match_used_songs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ data: mockUsedSongs, error: null }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({}))
        };
      });

      const result = await songService.getRandomUnusedSong('match-123');
      expect(mockSongs).toContainEqual(result);
    });

    it('should filter out used songs', async () => {
      const mockSongs = [
        { id: '1', title: 'Song 1' },
        { id: '2', title: 'Song 2' },
        { id: '3', title: 'Song 3' }
      ];
      
      const mockUsedSongs = [{ song_id: '2' }];
      
      supabase.from = vi.fn((table) => {
        if (table === 'songs') {
          return {
            select: vi.fn(() => ({ data: mockSongs, error: null }))
          };
        }
        if (table === 'match_used_songs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ data: mockUsedSongs, error: null }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({}))
        };
      });

      const result = await songService.getRandomUnusedSong('match-123');
      expect(result.id).not.toBe('2');
    });
  });

  describe('addSong', () => {
    it('should throw error when required fields are missing', async () => {
      await expect(songService.addSong({}))
        .rejects
        .toThrow();
    });

    it('should throw error when snippet duration is out of range', async () => {
      await expect(songService.addSong({
        title: 'Test',
        artist: 'Artist',
        release_year: 2023,
        snippet_duration: 10 // Too short
      }))
        .rejects
        .toThrow('Snippet duration must be between 15 and 30 seconds');
    });

    it('should use default snippet duration when not specified', async () => {
      supabase.from = vi.fn((table) => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [{ id: '123', snippet_duration: 20 }],
            error: null
          }))
        }))
      }));

      const result = await songService.addSong({
        title: 'Test',
        artist: 'Artist',
        release_year: 2023
      });
      
      expect(result.snippet_duration).toBe(20);
    });

    it('should add song successfully', async () => {
      const mockSong = {
        id: '123',
        title: 'Test Song',
        artist: 'Test Artist',
        release_year: 2023,
        snippet_duration: 20
      };
      
      supabase.from = vi.fn((table) => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ data: [mockSong], error: null }))
        }))
      }));

      const result = await songService.addSong({
        title: 'Test Song',
        artist: 'Test Artist',
        release_year: 2023
      });
      
      expect(result).toEqual(mockSong);
    });
  });

  describe('searchSongs', () => {
    it('should return all songs when query is empty', async () => {
      const mockSongs = [{ id: '1', title: 'Song 1' }];
      
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({ data: mockSongs, error: null }))
        }))
      }));

      const result = await songService.searchSongs('', 20);
      expect(result).toEqual(mockSongs);
    });

    it('should filter songs by query', async () => {
      const mockSongs = [{ id: '1', title: 'Test Song', artist: 'Test Artist' }];
      
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            limit: vi.fn(() => ({ data: mockSongs, error: null }))
          }))
        }))
      }));

      const result = await songService.searchSongs('Test', 20);
      expect(result).toEqual(mockSongs);
    });

    it('should return empty array on error', async () => {
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            limit: vi.fn(() => ({ data: null, error: new Error('DB error') }))
          }))
        }))
      }));

      const result = await songService.searchSongs('Test', 20);
      expect(result).toEqual([]);
    });
  });
});
