import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncManager, SyncState } from './syncManager';

// Mock the dependencies
vi.mock('../lib/realtime', () => ({
  eventBus: {
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
    clear: vi.fn()
  },
  EventType: {
    ROUND_STARTED: 'round_started',
    PLAYBACK_SYNC: 'playback_sync'
  },
  getServerTimeOffset: vi.fn().mockResolvedValue(0)
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }))
    })),
    rpc: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [{ now: new Date().toISOString() }], error: null }) }))
  }
}));

// Helper to advance timers
const advanceTimers = (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

describe('SyncManager', () => {
  let syncManager;

  beforeEach(() => {
    vi.useFakeTimers();
    syncManager = new SyncManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    syncManager.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with idle state', () => {
      expect(syncManager.getState()).toBe(SyncState.IDLE);
      expect(syncManager.roundId).toBeNull();
      expect(syncManager.songId).toBeNull();
    });

    it('should initialize with match and player info', () => {
      const matchId = 'match-123';
      const playerId = 'player-456';
      
      syncManager.init(matchId, playerId);
      
      expect(syncManager.matchId).toBe(matchId);
      expect(syncManager.playerId).toBe(playerId);
    });
  });

  describe('startRound', () => {
    it('should not start round if not in idle state', async () => {
      syncManager.state = SyncState.COUNTDOWN;
      const result = await syncManager.startRound('round-1', 'song-1');
      
      expect(result).toBe(false);
      expect(syncManager.state).toBe(SyncState.COUNTDOWN);
    });

    it('should start round and begin countdown', async () => {
      const roundId = 'round-1';
      const songId = 'song-1';
      const snippetStartMs = 15000;
      const snippetDurationMs = 20000;
      
      const result = await syncManager.startRound(
        roundId,
        songId,
        snippetStartMs,
        snippetDurationMs
      );
      
      expect(result).toBe(true);
      expect(syncManager.roundId).toBe(roundId);
      expect(syncManager.songId).toBe(songId);
      expect(syncManager.snippetStartTime).toBe(snippetStartMs);
      expect(syncManager.snippetDuration).toBe(snippetDurationMs);
      expect(syncManager.state).toBe(SyncState.COUNTDOWN);
      expect(syncManager.getCountdown()).toBe(3); // 3 seconds countdown
    });

    it('should transition from countdown to playing', async () => {
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      
      // Advance timer past countdown
      vi.advanceTimersByTime(3000);
      
      expect(syncManager.state).toBe(SyncState.PLAYING);
      expect(syncManager.playbackStartTime).not.toBeNull();
    });
  });

  describe('countdown', () => {
    it('should decrement countdown value over time', async () => {
      await syncManager.startRound('round-1', 'song-1');
      
      expect(syncManager.getCountdown()).toBe(3);
      
      vi.advanceTimersByTime(1000);
      expect(syncManager.getCountdown()).toBe(2);
      
      vi.advanceTimersByTime(1000);
      expect(syncManager.getCountdown()).toBe(1);
    });

    it('should notify countdown callback', async () => {
      const callback = vi.fn();
      syncManager.setCallbacks({ onCountdown: callback });
      
      await syncManager.startRound('round-1', 'song-1');
      
      expect(callback).toHaveBeenCalledWith(3);
      
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledWith(2);
    });
  });

  describe('playback', () => {
    it('should calculate playback progress', async () => {
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      
      // Wait for countdown to finish
      vi.advanceTimersByTime(3000);
      
      expect(syncManager.getPlaybackProgress()).toBe(0);
      
      // Advance playback by 5 seconds
      vi.advanceTimersByTime(5000);
      
      // Progress should be ~25% (5s / 20s)
      const progress = syncManager.getPlaybackProgress();
      expect(progress).toBeGreaterThan(0.2);
      expect(progress).toBeLessThan(0.3);
    });

    it('should get remaining playback time', async () => {
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      vi.advanceTimersByTime(3000); // Finish countdown
      
      expect(syncManager.getRemainingTime()).toBeCloseTo(20, -1); // ~20 seconds initially
      
      vi.advanceTimersByTime(5000);
      expect(syncManager.getRemainingTime()).toBeCloseTo(15, -1); // ~15 seconds remaining
    });
  });

  describe('late join handling', () => {
    it('should detect late join during countdown', async () => {
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      
      // Joining during countdown with < 2 seconds remaining
      vi.advanceTimersByTime(1500);
      
      const result = syncManager.handleLateJoin();
      
      expect(result.late).toBe(true);
      expect(result.catchup).toBe(true);
    });

    it('should allow catch up during playback if within threshold', async () => {
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      vi.advanceTimersByTime(3000); // Finish countdown
      vi.advanceTimersByTime(1000); // 1 second into playback
      
      const result = syncManager.handleLateJoin();
      
      expect(result.late).toBe(true);
      expect(result.catchup).toBe(true);
      expect(result.seekPosition).toBeGreaterThan(0);
    });

    it('should not allow catch up if too far behind', async () => {
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      vi.advanceTimersByTime(3000); // Finish countdown
      vi.advanceTimersByTime(2500); // 2.5 seconds into playback (> 2s threshold)
      
      const result = syncManager.handleLateJoin();
      
      expect(result.late).toBe(true);
      expect(result.catchup).toBe(false);
    });
  });

  describe('player state tracking', () => {
    it('should track player states', async () => {
      await syncManager.startRound('round-1', 'song-1');
      
      // Add player states
      syncManager.handlePlayerStatusChange('player-1', 'listening');
      syncManager.handlePlayerStatusChange('player-2', 'listening');
      syncManager.handlePlayerStatusChange('player-3', 'completed');
      
      const stats = syncManager.getSyncStats();
      
      expect(stats.totalPlayers).toBe(3);
      expect(stats.listening).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.inSync).toBe(true); // 100% are in sync
    });

    it('should calculate inSync based on threshold', async () => {
      await syncManager.startRound('round-1', 'song-1');
      
      // Add 5 players, 4 in sync
      syncManager.handlePlayerStatusChange('player-1', 'listening');
      syncManager.handlePlayerStatusChange('player-2', 'listening');
      syncManager.handlePlayerStatusChange('player-3', 'listening');
      syncManager.handlePlayerStatusChange('player-4', 'listening');
      syncManager.handlePlayerStatusChange('player-5', 'failed');
      
      const stats = syncManager.getSyncStats();
      
      expect(stats.totalPlayers).toBe(5);
      expect(stats.listening).toBe(4);
      expect(stats.inSync).toBe(true); // 80% threshold
    });
  });

  describe('event handling', () => {
    it('should handle round start event', async () => {
      const event = {
        round: {
          id: 'round-1',
          song_id: 'song-1',
          match_id: 'match-1'
        },
        serverTimestamp: new Date().toISOString()
      };
      
      const result = syncManager.handleRoundStartEvent(event);
      
      expect(result).toBe(true);
      expect(syncManager.roundId).toBe('round-1');
      expect(syncManager.songId).toBe('song-1');
      expect(syncManager.state).toBe(SyncState.COUNTDOWN);
    });

    it('should ignore old round start events', async () => {
      const oldDate = new Date();
      oldDate.setSeconds(oldDate.getSeconds() - 10); // 10 seconds ago
      
      const event = {
        round: {
          id: 'round-1',
          song_id: 'song-1',
          match_id: 'match-1'
        },
        serverTimestamp: oldDate.toISOString()
      };
      
      const result = syncManager.handleRoundStartEvent(event);
      
      expect(result).toBe(false);
      expect(syncManager.state).toBe(SyncState.IDLE);
    });

    it('should ignore round start for different round', async () => {
      // Start a round first
      await syncManager.startRound('round-1', 'song-1');
      
      const event = {
        round: {
          id: 'round-2',
          song_id: 'song-2'
        },
        serverTimestamp: new Date().toISOString()
      };
      
      const result = syncManager.handleRoundStartEvent(event);
      
      expect(result).toBe(false);
      expect(syncManager.roundId).toBe('round-1'); // Still round 1
    });
  });

  describe('cleanup', () => {
    it('should reset all state on cleanup', async () => {
      await syncManager.startRound('round-1', 'song-1');
      syncManager.handlePlayerStatusChange('player-1', 'listening');
      
      vi.advanceTimersByTime(3000);
      
      syncManager.cleanup();
      
      expect(syncManager.state).toBe(SyncState.IDLE);
      expect(syncManager.roundId).toBeNull();
      expect(syncManager.songId).toBeNull();
      expect(syncManager.playerStates.size).toBe(0);
    });

    it('should clear all intervals on cleanup', async () => {
      await syncManager.startRound('round-1', 'song-1');
      
      syncManager.cleanup();
      
      expect(syncManager.countdownInterval).toBeNull();
      expect(syncManager.syncCheckInterval).toBeNull();
    });
  });
});

describe('SyncState constants', () => {
  it('should have correct state values', () => {
    expect(SyncState.IDLE).toBe('idle');
    expect(SyncState.WAITING_FOR_SYNC).toBe('waiting_for_sync');
    expect(SyncState.COUNTDOWN).toBe('countdown');
    expect(SyncState.PLAYING).toBe('playing');
    expect(SyncState.ENDED).toBe('ended');
    expect(SyncState.ERROR).toBe('error');
  });
});
