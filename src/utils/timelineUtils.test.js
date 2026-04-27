import { describe, it, expect, beforeEach } from 'vitest';
import { 
  addLockedCard, 
  filterIncorrectCards, 
  mergeLockedCards, 
  isSongLocked, 
  getLockedCards, 
  getTimelineStats 
} from './timelineUtils.js';

describe('timelineUtils', () => {
  const mockSongCard = {
    id: 'song-1',
    title: 'Test Song',
    artist: 'Test Artist',
    release_year: 2020
  };

  const mockSongCard2 = {
    id: 'song-2',
    title: 'Test Song 2',
    artist: 'Test Artist 2',
    release_year: 2021
  };

  describe('addLockedCard', () => {
    it('should add a locked card at the specified position', () => {
      const timeline = [];
      const result = addLockedCard(timeline, mockSongCard, 0);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        song_id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        release_year: 2020,
        position: 0,
        is_locked: true
      });
      expect(result[0].locked_at).toBeDefined();
    });

    it('should insert card at correct position and re-index existing cards', () => {
      const existingTimeline = [
        { song_id: 'existing-1', position: 0, is_locked: true },
        { song_id: 'existing-2', position: 1, is_locked: true }
      ];
      
      const result = addLockedCard(existingTimeline, mockSongCard, 1);
      
      expect(result).toHaveLength(3);
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
      expect(result[2].position).toBe(2);
      expect(result[1].song_id).toBe('song-1');
    });

    it('should not add card if it already exists in timeline', () => {
      const timeline = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      
      const result = addLockedCard(timeline, mockSongCard, 1);
      
      expect(result).toHaveLength(1);
      expect(result).toEqual(timeline);
    });

    it('should throw error for invalid card data', () => {
      expect(() => addLockedCard([], null, 0)).toThrow('Card data must include an id');
      expect(() => addLockedCard([], {}, 0)).toThrow('Card data must include an id');
    });

    it('should throw error for invalid position', () => {
      expect(() => addLockedCard([], mockSongCard, -1)).toThrow('Position must be a non-negative number');
      expect(() => addLockedCard([], mockSongCard, 'invalid')).toThrow('Position must be a non-negative number');
    });
  });

  describe('filterIncorrectCards', () => {
    beforeEach(() => {
      // Reset before each test
    });

    it('should keep only correct cards and mark them as locked', () => {
      const timeline = [
        { song_id: 'song-1', position: 0, is_locked: false },
        { song_id: 'song-2', position: 1, is_locked: false },
        { song_id: 'song-3', position: 2, is_locked: false }
      ];
      const correctSongIds = ['song-1', 'song-3'];
      
      const result = filterIncorrectCards(timeline, correctSongIds);
      
      expect(result).toHaveLength(2);
      expect(result[0].song_id).toBe('song-1');
      expect(result[1].song_id).toBe('song-3');
      expect(result[0].is_locked).toBe(true);
      expect(result[1].is_locked).toBe(true);
    });

    it('should re-index filtered cards', () => {
      const timeline = [
        { song_id: 'song-1', position: 0, is_locked: false },
        { song_id: 'song-2', position: 1, is_locked: false },
        { song_id: 'song-3', position: 2, is_locked: false }
      ];
      const correctSongIds = ['song-3'];
      
      const result = filterIncorrectCards(timeline, correctSongIds);
      
      expect(result).toHaveLength(1);
      expect(result[0].song_id).toBe('song-3');
      expect(result[0].position).toBe(0);
    });

    it('should throw error for invalid correctSongIds', () => {
      expect(() => filterIncorrectCards([], 'invalid')).toThrow('correctSongIds must be an array');
    });
  });

  describe('mergeLockedCards', () => {
    it('should merge new locked cards with existing ones', () => {
      const existingTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      const newLockedCards = [
        { song_id: 'song-2', position: 1, is_locked: false }
      ];
      
      const result = mergeLockedCards(existingTimeline, newLockedCards);
      
      expect(result).toHaveLength(2);
      expect(result[0].song_id).toBe('song-1');
      expect(result[1].song_id).toBe('song-2');
      expect(result[1].is_locked).toBe(true);
    });

    it('should not duplicate existing cards', () => {
      const existingTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      const newLockedCards = [
        { song_id: 'song-1', position: 0, is_locked: false }
      ];
      
      const result = mergeLockedCards(existingTimeline, newLockedCards);
      
      expect(result).toHaveLength(1);
      expect(result[0].song_id).toBe('song-1');
    });

    it('should sort cards by position and re-index', () => {
      const existingTimeline = [
        { song_id: 'song-1', position: 2, is_locked: true }
      ];
      const newLockedCards = [
        { song_id: 'song-2', position: 0, is_locked: false }
      ];
      
      const result = mergeLockedCards(existingTimeline, newLockedCards);
      
      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(0);
      expect(result[1].position).toBe(1);
      expect(result[0].song_id).toBe('song-2');
      expect(result[1].song_id).toBe('song-1');
    });
  });

  describe('isSongLocked', () => {
    it('should return true for locked song', () => {
      const timeline = [
        { song_id: 'song-1', is_locked: true },
        { song_id: 'song-2', is_locked: false }
      ];
      
      expect(isSongLocked(timeline, 'song-1')).toBe(true);
    });

    it('should return false for unlocked song', () => {
      const timeline = [
        { song_id: 'song-1', is_locked: true },
        { song_id: 'song-2', is_locked: false }
      ];
      
      expect(isSongLocked(timeline, 'song-2')).toBe(false);
    });

    it('should return false for non-existent song', () => {
      const timeline = [
        { song_id: 'song-1', is_locked: true }
      ];
      
      expect(isSongLocked(timeline, 'song-999')).toBe(false);
    });
  });

  describe('getLockedCards', () => {
    it('should return only locked cards', () => {
      const timeline = [
        { song_id: 'song-1', is_locked: true },
        { song_id: 'song-2', is_locked: false },
        { song_id: 'song-3', is_locked: true }
      ];
      
      const result = getLockedCards(timeline);
      
      expect(result).toHaveLength(2);
      expect(result[0].song_id).toBe('song-1');
      expect(result[1].song_id).toBe('song-3');
    });

    it('should return empty array for no locked cards', () => {
      const timeline = [
        { song_id: 'song-1', is_locked: false },
        { song_id: 'song-2', is_locked: false }
      ];
      
      const result = getLockedCards(timeline);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getTimelineStats', () => {
    it('should return correct statistics', () => {
      const timeline = [
        { song_id: 'song-1', is_locked: true, position: 0 },
        { song_id: 'song-2', is_locked: false, position: 1 },
        { song_id: 'song-3', is_locked: true, position: 2 }
      ];
      
      const stats = getTimelineStats(timeline);
      
      expect(stats.total_cards).toBe(3);
      expect(stats.locked_cards).toBe(2);
      expect(stats.unlocked_cards).toBe(1);
      expect(stats.positions).toEqual([0, 1, 2]);
    });

    it('should handle empty timeline', () => {
      const stats = getTimelineStats([]);
      
      expect(stats.total_cards).toBe(0);
      expect(stats.locked_cards).toBe(0);
      expect(stats.unlocked_cards).toBe(0);
      expect(stats.positions).toEqual([]);
    });
  });
});
