import { describe, it, expect, vi, beforeEach } from 'vitest';
import { songService } from './songService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Song Service', () => {
  describe('getSongById', () => {
    it('should return null when songId is not provided', async () => {
      const result = await songService.getSongById(null);
      expect(result).toBeNull();
    });

    it('should return null when song is not found', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
          })
        })
      });

      const result = await songService.getSongById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return song data when song exists', async () => {
      const mockSong = { id: '123', title: 'Test Song', artist: 'Test Artist', release_year: 2023 };
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSong, error: null })
          })
        })
      });

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
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
        })
      });

      const result = await songService.getSongsByIds(['123', '456']);
      expect(result).toEqual([]);
    });

    it('should return array of songs when found', async () => {
      const mockSongs = [
        { id: '123', title: 'Song 1' },
        { id: '456', title: 'Song 2' }
      ];
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockSongs, error: null })
        })
      });

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

    it('should return a random unused song', async () => {
      const mockSongs = [
        { id: '1', title: 'Unused Song' },
        { id: '2', title: 'Another Unused' }
      ];
      
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: mockSongs, error: null })
        })
      });

      const result = await songService.getRandomUnusedSong('match-123');
      expect(mockSongs).toContainEqual(result);
    });

    it('should fallback to all songs when all used', async () => {
      const mockSongs = [
        { id: '1', title: 'Song 1' },
        { id: '2', title: 'Song 2' }
      ];
      
      supabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockSongs, error: null })
          })
        });

      const result = await songService.getRandomUnusedSong('match-123');
      expect(mockSongs).toContainEqual(result);
    });

    it('should throw error when no songs available', async () => {
      supabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        });

      await expect(songService.getRandomUnusedSong('match-123'))
        .rejects
        .toThrow('Failed to select song.');
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
        snippet_duration: 10
      }))
        .rejects
        .toThrow('Snippet duration must be between 15 and 30 seconds');
    });

    it('should use default snippet duration when not specified', async () => {
      const mockSong = { id: '123', snippet_duration: 20 };
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [mockSong], error: null })
        })
      });

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
      
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [mockSong], error: null })
        })
      });

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
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockSongs, error: null })
        })
      });

      const result = await songService.searchSongs('', 20);
      expect(result).toEqual(mockSongs);
    });

    it('should filter songs by query', async () => {
      const mockSongs = [{ id: '1', title: 'Test Song', artist: 'Test Artist' }];
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockSongs, error: null })
          })
        })
      });

      const result = await songService.searchSongs('Test', 20);
      expect(result).toEqual(mockSongs);
    });

    it('should return empty array on error', async () => {
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
          })
        })
      });

      const result = await songService.searchSongs('Test', 20);
      expect(result).toEqual([]);
    });
  });
});
