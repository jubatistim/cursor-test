import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterIncorrectCards, addLockedCard, mergeLockedCards } from './timelineUtils';

// Mock supabase for testing
const mockSupabase = {
  from: vi.fn(() => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }))
};

// Mock match service
const mockMatchService = {
  incrementCorrectPlacements: vi.fn()
};

describe('Round Resolution Logic', () => {
  const mockPlayer = {
    id: 'player-1',
    player_number: 1
  };

  const mockSong = {
    id: 'song-1',
    title: 'Test Song',
    artist: 'Test Artist',
    release_year: 2020
  };

  const mockGameState = {
    player_id: 'player-1',
    match_id: 'match-1',
    timeline: [
      {
        song_id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        release_year: 2020,
        position: 0,
        is_locked: false
      },
      {
        song_id: 'song-2',
        title: 'Wrong Song',
        artist: 'Wrong Artist',
        release_year: 2019,
        position: 1,
        is_locked: false
      }
    ],
    score: 0,
    correct_placements: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeline Locking Logic', () => {
    it('should lock correct cards and discard incorrect ones', () => {
      const correctSongIds = ['song-1'];
      const currentTimeline = mockGameState.timeline;
      
      const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
      
      expect(updatedTimeline).toHaveLength(1);
      expect(updatedTimeline[0].song_id).toBe('song-1');
      expect(updatedTimeline[0].is_locked).toBe(true);
      expect(updatedTimeline[0].position).toBe(0);
    });

    it('should keep all cards when all are correct', () => {
      const correctSongIds = ['song-1', 'song-2'];
      const currentTimeline = mockGameState.timeline;
      
      const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
      
      expect(updatedTimeline).toHaveLength(2);
      expect(updatedTimeline[0].is_locked).toBe(true);
      expect(updatedTimeline[1].is_locked).toBe(true);
    });

    it('should discard all cards when none are correct', () => {
      const correctSongIds = ['song-3'];
      const currentTimeline = mockGameState.timeline;
      
      const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
      
      expect(updatedTimeline).toHaveLength(0);
    });

    it('should re-index positions after filtering', () => {
      const currentTimeline = [
        { song_id: 'song-1', position: 0, is_locked: false },
        { song_id: 'song-2', position: 2, is_locked: false },
        { song_id: 'song-3', position: 4, is_locked: false }
      ];
      const correctSongIds = ['song-3'];
      
      const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
      
      expect(updatedTimeline).toHaveLength(1);
      expect(updatedTimeline[0].position).toBe(0);
    });
  });

  describe('Merging Locked Cards', () => {
    it('should merge new locked cards with existing ones', () => {
      const existingTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      const newLockedCards = [
        { song_id: 'song-2', position: 1, is_locked: false }
      ];
      
      const merged = mergeLockedCards(existingTimeline, newLockedCards);
      
      expect(merged).toHaveLength(2);
      expect(merged[0].song_id).toBe('song-1');
      expect(merged[1].song_id).toBe('song-2');
      expect(merged[1].is_locked).toBe(true);
    });

    it('should not duplicate existing locked cards', () => {
      const existingTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      const newLockedCards = [
        { song_id: 'song-1', position: 0, is_locked: false }
      ];
      
      const merged = mergeLockedCards(existingTimeline, newLockedCards);
      
      expect(merged).toHaveLength(1);
      expect(merged[0].song_id).toBe('song-1');
    });

    it('should sort cards by position after merging', () => {
      const existingTimeline = [
        { song_id: 'song-1', position: 2, is_locked: true }
      ];
      const newLockedCards = [
        { song_id: 'song-2', position: 0, is_locked: false }
      ];
      
      const merged = mergeLockedCards(existingTimeline, newLockedCards);
      
      expect(merged).toHaveLength(2);
      expect(merged[0].position).toBe(0);
      expect(merged[1].position).toBe(1);
      expect(merged[0].song_id).toBe('song-2');
      expect(merged[1].song_id).toBe('song-1');
    });
  });

  describe('Round Resolution Integration', () => {
    it('should update game state with locked timeline', async () => {
      const correctSongIds = ['song-1'];
      const currentTimeline = mockGameState.timeline;
      
      const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
      
      // Test that the timeline is properly filtered and locked
      expect(updatedTimeline[0].is_locked).toBe(true);
      expect(updatedTimeline).toHaveLength(1);
      expect(updatedTimeline[0].song_id).toBe('song-1');
    });

    it('should handle multiple players with different correctness', () => {
      const player1GameState = {
        ...mockGameState,
        player_id: 'player-1',
        timeline: [
          { song_id: 'song-1', position: 0, is_locked: false }, // correct
          { song_id: 'song-2', position: 1, is_locked: false }  // incorrect
        ]
      };
      
      const player2GameState = {
        ...mockGameState,
        player_id: 'player-2',
        timeline: [
          { song_id: 'song-1', position: 1, is_locked: false }, // correct
          { song_id: 'song-3', position: 0, is_locked: false }  // incorrect
        ]
      };
      
      const correctSongIds = ['song-1'];
      
      const player1Updated = filterIncorrectCards(player1GameState.timeline, correctSongIds);
      const player2Updated = filterIncorrectCards(player2GameState.timeline, correctSongIds);
      
      expect(player1Updated).toHaveLength(1);
      expect(player1Updated[0].song_id).toBe('song-1');
      expect(player2Updated).toHaveLength(1);
      expect(player2Updated[0].song_id).toBe('song-1');
      
      // Both should have the correct song locked at position 0
      expect(player1Updated[0].position).toBe(0);
      expect(player2Updated[0].position).toBe(0);
    });

    it('should preserve song metadata when locking cards', () => {
      const timelineWithMetadata = [
        {
          song_id: 'song-1',
          title: 'Test Song',
          artist: 'Test Artist',
          release_year: 2020,
          position: 0,
          is_locked: false
        }
      ];
      
      const correctSongIds = ['song-1'];
      const updated = filterIncorrectCards(timelineWithMetadata, correctSongIds);
      
      expect(updated[0]).toMatchObject({
        song_id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        release_year: 2020,
        is_locked: true,
        position: 0
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty timeline gracefully', () => {
      const correctSongIds = ['song-1'];
      const emptyTimeline = [];
      
      const updated = filterIncorrectCards(emptyTimeline, correctSongIds);
      
      expect(updated).toHaveLength(0);
    });

    it('should handle missing song metadata gracefully', () => {
      const timelineWithMissingData = [
        { song_id: 'song-1', position: 0, is_locked: false }
      ];
      
      const correctSongIds = ['song-1'];
      const updated = filterIncorrectCards(timelineWithMissingData, correctSongIds);
      
      expect(updated).toHaveLength(1);
      expect(updated[0].song_id).toBe('song-1');
      expect(updated[0].is_locked).toBe(true);
    });
  });
});
