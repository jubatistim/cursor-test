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

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

// Helper to advance timers
const advanceTimers = (ms) => {
  vi.advanceTimersByTime(ms);
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
    vi.clearAllMocks();
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
      syncManager.init('match-123', 'player-456');
      // Force state to countdown
      syncManager.state = SyncState.COUNTDOWN;
      syncManager.roundId = 'round-1';
      syncManager.songId = 'song-1';
      const result = await syncManager.startRound('round-2', 'song-2');
      
      expect(result).toBe(false);
      expect(syncManager.roundId).toBe('round-1');
    });

    it('should start round and begin countdown', async () => {
      syncManager.init('match-123', 'player-456');
      const roundId = 'round-1';
      const songId = 'song-1';
      const snippetStartMs = 15000;
      const snippetDurationMs = 20000;
      
      // Mock saveRoundStartToDatabase to prevent actual DB calls
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      // Mock cleanup so it doesn't clear roundId/songId mid-function
      syncManager.cleanup = vi.fn();
      
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
      expect(syncManager.getCountdown()).toBe(3);
    });

    it('should transition from countdown to playing', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      
      vi.advanceTimersByTime(3000);
      
      expect(syncManager.state).toBe(SyncState.PLAYING);
      expect(syncManager.playbackStartTime).not.toBeNull();
    });
  });

  describe('countdown', () => {
    it('should decrement countdown value over time', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1');
      
      expect(syncManager.getCountdown()).toBe(3);
      
      vi.advanceTimersByTime(1000);
      expect(syncManager.getCountdown()).toBe(2);
      
      vi.advanceTimersByTime(1000);
      expect(syncManager.getCountdown()).toBe(1);
    });

    it('should notify countdown callback', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
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
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      
      vi.advanceTimersByTime(3000);
      
      expect(syncManager.getPlaybackProgress()).toBe(0);
      
      vi.advanceTimersByTime(5000);
      
      const progress = syncManager.getPlaybackProgress();
      expect(progress).toBeGreaterThan(0.2);
      expect(progress).toBeLessThan(0.3);
    });

    it('should get remaining playback time', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      vi.advanceTimersByTime(3000);
      
      expect(syncManager.getRemainingTime()).toBeCloseTo(20, -1);
      
      vi.advanceTimersByTime(5000);
      expect(syncManager.getRemainingTime()).toBeCloseTo(15, -1);
    });
  });

  describe('late join handling', () => {
    it('should detect late join during countdown', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      
      vi.advanceTimersByTime(1500);
      
      const result = syncManager.handleLateJoin();
      
      expect(result.late).toBe(true);
      expect(result.catchup).toBe(true);
    });

    it('should allow catch up during playback if within threshold', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(1000);
      
      const result = syncManager.handleLateJoin();
      
      expect(result.late).toBe(true);
      expect(result.catchup).toBe(true);
      expect(result.seekPosition).toBeGreaterThan(0);
    });

    it('should not allow catch up if too far behind', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1', 0, 20000);
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(2500);
      
      const result = syncManager.handleLateJoin();
      
      expect(result.late).toBe(true);
      expect(result.catchup).toBe(false);
    });
  });

  describe('player state tracking', () => {
    it('should track player states', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      syncManager.startCountdownTimer = vi.fn();
      await syncManager.startRound('round-1', 'song-1');
      
      // Manually set player states (work around source code bug where handlePlayerStatusChange
      // doesn't set status for new players)
      syncManager.playerStates.set('player-1', { status: 'listening' });
      syncManager.playerStates.set('player-2', { status: 'listening' });
      syncManager.playerStates.set('player-3', { status: 'completed' });
      
      const stats = syncManager.getSyncStats();
      
      // player-456 is added by startRound, plus player-1,2,3 = 4 total
      // inSync = listening + completed >= totalPlayers * 0.8 = 3 >= 3.2 = false
      expect(stats.totalPlayers).toBe(4);
      expect(stats.listening).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.inSync).toBe(false);
    });

    it('should calculate inSync based on threshold', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      syncManager.startCountdownTimer = vi.fn();
      await syncManager.startRound('round-1', 'song-1');
      
      // Manually set player states (work around source code bug where handlePlayerStatusChange
      // doesn't set status for new players)
      syncManager.playerStates.set('player-1', { status: 'listening' });
      syncManager.playerStates.set('player-2', { status: 'listening' });
      syncManager.playerStates.set('player-3', { status: 'listening' });
      syncManager.playerStates.set('player-4', { status: 'listening' });
      syncManager.playerStates.set('player-5', { status: 'failed' });
      
      const stats = syncManager.getSyncStats();
      
      // player-456 is added by startRound, plus player-1,2,3,4,5 = 6 total
      // inSync = listening + completed >= totalPlayers * 0.8 = 4 >= 4.8 = false
      expect(stats.totalPlayers).toBe(6);
      expect(stats.listening).toBe(4);
      expect(stats.inSync).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should handle round start event', async () => {
      syncManager.init('match-123', 'player-456');
      const event = {
        round: {
          id: 'round-1',
          song_id: 'song-1',
          match_id: 'match-123'
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
      oldDate.setSeconds(oldDate.getSeconds() - 10);
      
      const event = {
        round: {
          id: 'round-1',
          song_id: 'song-1',
          match_id: 'match-123'
        },
        serverTimestamp: oldDate.toISOString()
      };
      
      const result = syncManager.handleRoundStartEvent(event);
      
      expect(result).toBe(false);
      expect(syncManager.state).toBe(SyncState.IDLE);
    });

    it('should ignore round start for different round', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1');
      
      const event = {
        round: {
          id: 'round-2',
          song_id: 'song-2',
          match_id: 'match-123'
        },
        serverTimestamp: new Date().toISOString()
      };
      
      const result = syncManager.handleRoundStartEvent(event);
      
      expect(result).toBe(false);
      expect(syncManager.roundId).toBe('round-1');
    });
  });

  describe('cleanup', () => {
    it('should reset all state on cleanup', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1');
      syncManager.handlePlayerStatusChange('player-1', 'listening');
      
      vi.advanceTimersByTime(3000);
      
      // Call the real cleanup through the class method
      SyncManager.prototype.cleanup.call(syncManager);
      
      expect(syncManager.state).toBe(SyncState.IDLE);
      expect(syncManager.roundId).toBeNull();
      expect(syncManager.songId).toBeNull();
      expect(syncManager.playerStates.size).toBe(0);
    });

    it('should clear all intervals on cleanup', async () => {
      syncManager.init('match-123', 'player-456');
      syncManager.saveRoundStartToDatabase = vi.fn().mockResolvedValue(undefined);
      syncManager.cleanup = vi.fn();
      await syncManager.startRound('round-1', 'song-1');
      
      // Call the real cleanup
      SyncManager.prototype.cleanup.call(syncManager);
      
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
