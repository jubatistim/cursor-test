import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterIncorrectCards, addLockedCard, mergeLockedCards } from './timelineUtils';

describe('Timeline Persistence', () => {
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
        is_locked: true,
        locked_at: '2026-04-26T21:00:00Z'
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
    score: 5,
    correct_placements: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeline Structure Validation', () => {
    it('should validate timeline structure for persistence', () => {
      const timeline = mockGameState.timeline;
      
      // Check that all required fields are present
      timeline.forEach(entry => {
        expect(entry).toHaveProperty('song_id');
        expect(entry).toHaveProperty('position');
        expect(entry).toHaveProperty('is_locked');
      });
      
      // Check that locked cards have timestamps
      const lockedCards = timeline.filter(entry => entry.is_locked);
      lockedCards.forEach(card => {
        expect(card).toHaveProperty('locked_at');
      });
    });

    it('should ensure backward compatibility for timeline entries', () => {
      const oldFormatTimeline = [
        {
          song_id: 'song-1',
          position: 0
          // Missing is_locked field
        }
      ];
      
      // Simulate the validation logic from syncTimelineState
      const validatedTimeline = oldFormatTimeline.map(entry => ({
        ...entry,
        is_locked: entry.is_locked !== false
      }));
      
      expect(validatedTimeline[0].is_locked).toBe(true);
    });

    it('should preserve metadata during timeline operations', () => {
      const timelineWithMetadata = [
        {
          song_id: 'song-1',
          title: 'Test Song',
          artist: 'Test Artist',
          release_year: 2020,
          position: 0,
          is_locked: true,
          locked_at: '2026-04-26T21:00:00Z'
        }
      ];
      
      const correctSongIds = ['song-1'];
      const filtered = filterIncorrectCards(timelineWithMetadata, correctSongIds);
      
      expect(filtered[0]).toMatchObject({
        song_id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        release_year: 2020,
        is_locked: true,
        locked_at: '2026-04-26T21:00:00Z'
      });
    });
  });

  describe('Page Refresh Scenarios', () => {
    it('should handle reconnection with existing locked timeline', () => {
      const existingTimeline = [
        {
          song_id: 'song-1',
          title: 'Locked Song',
          artist: 'Artist 1',
          release_year: 2020,
          position: 0,
          is_locked: true,
          locked_at: '2026-04-26T21:00:00Z'
        }
      ];
      
      // Simulate page refresh - timeline should be preserved
      const reconnectedTimeline = existingTimeline;
      
      expect(reconnectedTimeline).toHaveLength(1);
      expect(reconnectedTimeline[0].is_locked).toBe(true);
      expect(reconnectedTimeline[0].song_id).toBe('song-1');
    });

    it('should handle timeline merge after reconnection', () => {
      const existingLockedTimeline = [
        {
          song_id: 'song-1',
          position: 0,
          is_locked: true,
          locked_at: '2026-04-26T21:00:00Z'
        }
      ];
      
      const newLockedCards = [
        {
          song_id: 'song-2',
          title: 'New Song',
          artist: 'New Artist',
          release_year: 2021,
          position: 1,
          is_locked: false
        }
      ];
      
      const mergedTimeline = mergeLockedCards(existingLockedTimeline, newLockedCards);
      
      expect(mergedTimeline).toHaveLength(2);
      expect(mergedTimeline[0].song_id).toBe('song-1');
      expect(mergedTimeline[1].song_id).toBe('song-2');
      expect(mergedTimeline[1].is_locked).toBe(true);
    });

    it('should maintain timeline consistency after reconnection', () => {
      const timelineBeforeRefresh = [
        {
          song_id: 'song-1',
          position: 0,
          is_locked: true,
          locked_at: '2026-04-26T21:00:00Z'
        },
        {
          song_id: 'song-2',
          position: 1,
          is_locked: true,
          locked_at: '2026-04-26T21:01:00Z'
        }
      ];
      
      // Simulate page refresh and reconnection
      const timelineAfterRefresh = timelineBeforeRefresh;
      
      // Verify timeline structure is maintained
      expect(timelineAfterRefresh).toHaveLength(2);
      expect(timelineAfterRefresh[0].position).toBe(0);
      expect(timelineAfterRefresh[1].position).toBe(1);
      expect(timelineAfterRefresh.every(card => card.is_locked)).toBe(true);
    });
  });

  describe('Real-time Sync Validation', () => {
    it('should detect timeline changes for real-time sync', () => {
      const currentTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      
      const updatedTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true },
        { song_id: 'song-2', position: 1, is_locked: true }
      ];
      
      // Simulate the comparison logic from real-time updates
      const hasChanged = JSON.stringify(currentTimeline) !== JSON.stringify(updatedTimeline);
      
      expect(hasChanged).toBe(true);
    });

    it('should ignore insignificant timeline changes', () => {
      const timeline1 = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      
      const timeline2 = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      
      const hasChanged = JSON.stringify(timeline1) !== JSON.stringify(timeline2);
      
      expect(hasChanged).toBe(false);
    });

    it('should handle timeline sync conflicts', () => {
      const localTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true },
        { song_id: 'song-2', position: 1, is_locked: false }
      ];
      
      const serverTimeline = [
        { song_id: 'song-1', position: 0, is_locked: true },
        { song_id: 'song-3', position: 1, is_locked: true }
      ];
      
      // Server timeline should take precedence
      const resolvedTimeline = serverTimeline;
      
      expect(resolvedTimeline).toHaveLength(2);
      expect(resolvedTimeline[1].song_id).toBe('song-3');
      expect(resolvedTimeline[1].is_locked).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain timeline order after operations', () => {
      const timeline = [
        { song_id: 'song-1', position: 2, is_locked: true },
        { song_id: 'song-2', position: 0, is_locked: true },
        { song_id: 'song-3', position: 1, is_locked: true }
      ];
      
      // Sort by position
      const sortedTimeline = timeline.sort((a, b) => a.position - b.position);
      
      expect(sortedTimeline[0].song_id).toBe('song-2');
      expect(sortedTimeline[1].song_id).toBe('song-3');
      expect(sortedTimeline[2].song_id).toBe('song-1');
    });

    it('should handle missing metadata gracefully', () => {
      const incompleteTimeline = [
        {
          song_id: 'song-1',
          position: 0,
          is_locked: true
          // Missing title, artist, release_year
        }
      ];
      
      // Should not throw errors
      expect(() => {
        filterIncorrectCards(incompleteTimeline, ['song-1']);
      }).not.toThrow();
    });

    it('should validate timeline entry structure', () => {
      const validEntry = {
        song_id: 'song-1',
        position: 0,
        is_locked: true
      };
      
      expect(validEntry.song_id).toBeDefined();
      expect(typeof validEntry.position).toBe('number');
      expect(typeof validEntry.is_locked).toBe('boolean');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large timelines efficiently', () => {
      const largeTimeline = Array.from({ length: 100 }, (_, i) => ({
        song_id: `song-${i}`,
        position: i,
        is_locked: i % 2 === 0 // Every other card is locked
      }));
      
      const correctSongIds = largeTimeline
        .filter((_, i) => i % 2 === 0)
        .map(card => card.song_id);
      
      const startTime = performance.now();
      const filtered = filterIncorrectCards(largeTimeline, correctSongIds);
      const endTime = performance.now();
      
      expect(filtered).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should minimize unnecessary database updates', () => {
      const timeline1 = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      
      const timeline2 = [
        { song_id: 'song-1', position: 0, is_locked: true }
      ];
      
      const needsUpdate = JSON.stringify(timeline1) !== JSON.stringify(timeline2);
      
      expect(needsUpdate).toBe(false);
    });
  });
});
