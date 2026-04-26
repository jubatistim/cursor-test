import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { roundService } from './roundService';
import { supabase } from '../lib/supabase';

// Mock Supabase client and songService
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({})),
      eq: vi.fn(() => ({})),
      insert: vi.fn(() => ({})),
      single: vi.fn(() => ({})),
      order: vi.fn(() => ({})),
      update: vi.fn(() => ({})),
    })),
    rpc: vi.fn(() => ({}))
  }
}));

vi.mock('./songService', () => ({
  songService: {
    getRandomUnusedSong: vi.fn(),
    getSongById: vi.fn()
  }
}));

describe('Round Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRound', () => {
    it('should throw error when matchId is not provided', async () => {
      await expect(roundService.createRound(null, 1))
        .rejects
        .toThrow('Invalid match');
    });

    it('should throw error when roundNumber is not provided', async () => {
      await expect(roundService.createRound('match-123', null))
        .rejects
        .toThrow('Invalid match');
    });

    it('should throw error when roundNumber is less than 1', async () => {
      await expect(roundService.createRound('match-123', 0))
        .rejects
        .toThrow('Round number must be at least 1');
    });

    it('should create a round with a provided songId', async () => {
      const mockRound = {
        id: 'round-123',
        match_id: 'match-123',
        round_number: 1,
        song_id: 'song-123',
        status: 'active'
      };

      supabase.from = vi.fn((table) => {
        if (table === 'rounds') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({ data: [mockRound], error: null }))
            }))
          };
        }
        if (table === 'match_used_songs') {
          return {
            insert: vi.fn(() => ({ data: [], error: null }))
          };
        }
        return { select: vi.fn(() => ({})) };
      });

      const result = await roundService.createRound('match-123', 1, { songId: 'song-123' });
      expect(result).toEqual(mockRound);
    });

    it('should create a round and select a random unused song', async () => {
      const { songService } = await import('./songService');
      
      const mockSong = { id: 'song-456', title: 'Random Song' };
      const mockRound = {
        id: 'round-123',
        match_id: 'match-123',
        round_number: 1,
        song_id: 'song-456',
        status: 'active'
      };

      songService.getRandomUnusedSong.mockResolvedValue(mockSong);

      supabase.from = vi.fn((table) => {
        if (table === 'rounds') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({ data: [mockRound], error: null }))
            }))
          };
        }
        if (table === 'match_used_songs') {
          return {
            insert: vi.fn(() => ({ data: [], error: null }))
          };
        }
        return { select: vi.fn(() => ({})) };
      });

      const result = await roundService.createRound('match-123', 1);
      expect(result).toEqual(mockRound);
      expect(songService.getRandomUnusedSong).toHaveBeenCalledWith('match-123');
    });

    it('should throw error when song selection fails', async () => {
      const { songService } = await import('./songService');
      
      songService.getRandomUnusedSong.mockRejectedValue(new Error('No songs available'));

      await expect(roundService.createRound('match-123', 1))
        .rejects
        .toThrow('No songs available');
    });

    it('should throw error when round already exists', async () => {
      const { songService } = await import('./songService');
      
      songService.getRandomUnusedSong.mockResolvedValue({ id: 'song-123' });

      supabase.from = vi.fn((table) => {
        if (table === 'rounds') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                data: null,
                error: { code: '23505', message: 'Unique constraint violation' }
              }))
            }))
          };
        }
        return { select: vi.fn(() => ({})) };
      });

      await expect(roundService.createRound('match-123', 1))
        .rejects
        .toThrow('Round already exists');
    });
  });

  describe('getRoundById', () => {
    it('should return null when roundId is not provided', async () => {
      const result = await roundService.getRoundById(null);
      expect(result).toBeNull();
    });

    it('should return round with song data', async () => {
      const mockRound = { id: 'round-123', match_id: 'match-123' };
      const mockSong = { id: 'song-123', title: 'Test Song' };

      supabase.from = vi.fn((table) => {
        if (table === 'rounds') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({ data: { ...mockRound, songs: mockSong }, error: null }))
              }))
            }))
          };
        }
        return { select: vi.fn(() => ({})) };
      });

      const result = await roundService.getRoundById('round-123');
      expect(result).toEqual({ ...mockRound, songs: mockSong });
    });

    it('should return null when round not found', async () => {
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: new Error('Not found') }))
          }))
        }))
      }));

      const result = await roundService.getRoundById('round-123');
      expect(result).toBeNull();
    });
  });

  describe('getRoundsByMatch', () => {
    it('should return empty array when matchId is not provided', async () => {
      const result = await roundService.getRoundsByMatch(null);
      expect(result).toEqual([]);
    });

    it('should return all rounds for a match', async () => {
      const mockRounds = [
        { id: 'round-1', match_id: 'match-123', round_number: 1 },
        { id: 'round-2', match_id: 'match-123', round_number: 2 }
      ];

      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: mockRounds, error: null }))
          }))
        }))
      }));

      const result = await roundService.getRoundsByMatch('match-123');
      expect(result).toEqual(mockRounds);
    });

    it('should return empty array on error', async () => {
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: null, error: new Error('DB error') }))
          }))
        }))
      }));

      const result = await roundService.getRoundsByMatch('match-123');
      expect(result).toEqual([]);
    });
  });

  describe('getCurrentRound', () => {
    it('should return null when matchId is not provided', async () => {
      const result = await roundService.getCurrentRound(null);
      expect(result).toBeNull();
    });

    it('should return current round based on match current_round', async () => {
      const mockMatch = { id: 'match-123', current_round: 2 };
      const mockRound = { id: 'round-2', match_id: 'match-123', round_number: 2 };

      supabase.from = vi.fn((table) => {
        if (table === 'matches') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({ data: mockMatch, error: null }))
              }))
            }))
          };
        }
        if (table === 'rounds') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((column, value) => {
                if (column === 'match_id' && value === 'match-123') {
                  return {
                    eq: vi.fn(() => ({
                      single: vi.fn(() => ({ data: mockRound, error: null }))
                    }))
                  };
                }
                return { single: vi.fn(() => ({ data: null, error: null })) };
              })
            }))
          };
        }
        return { select: vi.fn(() => ({})) };
      });

      const result = await roundService.getCurrentRound('match-123');
      expect(result).toEqual(mockRound);
    });

    it('should return null when match not found', async () => {
      supabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: new Error('Not found') }))
          }))
        }))
      }));

      const result = await roundService.getCurrentRound('match-123');
      expect(result).toBeNull();
    });
  });

  describe('completeRound', () => {
    it('should throw error when roundId is not provided', async () => {
      await expect(roundService.completeRound(null))
        .rejects
        .toThrow('Round not found');
    });

    it('should mark round as completed', async () => {
      const mockRound = { id: 'round-123', status: 'active' };
      const updatedRound = { ...mockRound, status: 'completed' };

      supabase.from = vi.fn((table) => {
        if (table === 'rounds') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({ data: [updatedRound], error: null }))
              }))
            }))
          };
        }
        return { update: vi.fn(() => ({})) };
      });

      const result = await roundService.completeRound('round-123');
      expect(result).toEqual(updatedRound);
    });

    it('should throw error when round completion fails', async () => {
      supabase.from = vi.fn((table) => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ data: null, error: new Error('Update failed') }))
          }))
        }))
      }));

      await expect(roundService.completeRound('round-123'))
        .rejects
        .toThrow('Failed to update round');
    });
  });

  describe('trackUsedSong', () => {
    it('should return null when parameters are invalid', async () => {
      const result = await roundService.trackUsedSong(null, 1, 'song-123');
      expect(result).toBeNull();
    });

    it('should track used song successfully', async () => {
      const mockUsedSong = { match_id: 'match-123', song_id: 'song-123', round_number: 1 };

      supabase.from = vi.fn((table) => {
        if (table === 'match_used_songs') {
          return {
            insert: vi.fn(() => ({ data: [mockUsedSong], error: null }))
          };
        }
        return { insert: vi.fn(() => ({})) };
      });

      const result = await roundService.trackUsedSong('match-123', 1, 'song-123');
      expect(result).toEqual(mockUsedSong);
    });

    it('should return null when tracking fails', async () => {
      supabase.from = vi.fn((table) => {
        if (table === 'match_used_songs') {
          return {
            insert: vi.fn(() => ({ data: null, error: new Error('DB error') }))
          };
        }
        return { insert: vi.fn(() => ({})) };
      });

      const result = await roundService.trackUsedSong('match-123', 1, 'song-123');
      expect(result).toBeNull();
    });
  });

  describe('getRemainingSnippetTime', () => {
    it('should return 0 when round is null', () => {
      const result = roundService.getRemainingSnippetTime(null, 20);
      expect(result).toBe(0);
    });

    it('should return 0 when round has no started_at', () => {
      const round = { id: 'round-123' };
      const result = roundService.getRemainingSnippetTime(round, 20);
      expect(result).toBe(0);
    });

    it('should calculate remaining time correctly', () => {
      const now = Date.now();
      const startedAt = new Date(now - 5000).toISOString(); // 5 seconds ago
      const round = { id: 'round-123', started_at: startedAt };
      
      // So that's 15 seconds passed in a 20 second snippet
      const result = roundService.getRemainingSnippetTime(round, 20);
      
      // Should be approximately 15 seconds (20 - 5)
      expect(result).toBeGreaterThanOrEqual(14.9);
      expect(result).toBeLessThanOrEqual(15);
    });
  });

  describe('isSnippetPlaying', () => {
    it('should return false when round is null', () => {
      const result = roundService.isSnippetPlaying(null, 20);
      expect(result).toBe(false);
    });

    it('should return false when round status is not active', () => {
      const round = { id: 'round-123', status: 'completed', started_at: new Date().toISOString() };
      const result = roundService.isSnippetPlaying(round, 20);
      expect(result).toBe(false);
    });

    it('should return false when round has no started_at', () => {
      const round = { id: 'round-123', status: 'active' };
      const result = roundService.isSnippetPlaying(round, 20);
      expect(result).toBe(false);
    });

    it('should return true when round is active and snippet still playing', () => {
      const now = Date.now();
      const startedAt = new Date(now - 5000).toISOString(); // 5 seconds ago
      const round = { id: 'round-123', status: 'active', started_at: startedAt };
      
      const result = roundService.isSnippetPlaying(round, 20);
      expect(result).toBe(true);
    });

    it('should return false when snippet duration has passed', () => {
      const now = Date.now();
      const startedAt = new Date(now - 25000).toISOString(); // 25 seconds ago
      const round = { id: 'round-123', status: 'active', started_at: startedAt };
      
      const result = roundService.isSnippetPlaying(round, 20);
      expect(result).toBe(false);
    });
  });
});
