import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateTurnStartTime,
  calculateRemainingTime,
  isTimerExpired,
  createForfeitPayload,
  canPlayerPlace,
  getTimerState,
  handleReconnectionTimer,
  setServerTimeOffset,
  getServerTime,
  withRetry,
  setupTimerSync
} from './timerUtils';

describe('timerUtils', () => {
  beforeEach(() => {
    // Reset server time offset before each test
    setServerTimeOffset(0);
  });

  describe('calculateTurnStartTime', () => {
    it('should accept and return valid server turn start time', () => {
      const serverTurnStartTime = 1000000;
      const result = calculateTurnStartTime(serverTurnStartTime);
      expect(result).toBe(serverTurnStartTime);
    });

    it('should throw error for invalid turnStartTime (NaN)', () => {
      expect(() => calculateTurnStartTime(NaN)).toThrow('serverTurnStartTime must be a valid number');
    });

    it('should throw error for invalid turnStartTime (null)', () => {
      expect(() => calculateTurnStartTime(null)).toThrow('serverTurnStartTime must be a valid number');
    });

    it('should throw error for zero turnStartTime', () => {
      expect(() => calculateTurnStartTime(0)).toThrow('serverTurnStartTime must be a positive number');
    });

    it('should throw error for negative turnStartTime', () => {
      expect(() => calculateTurnStartTime(-1000)).toThrow('serverTurnStartTime must be a positive number');
    });
  });

  describe('calculateRemainingTime', () => {
    it('should calculate remaining time correctly', () => {
      const turnStartTime = Date.now() - 30000; // Started 30 seconds ago
      const currentTime = Date.now();
      const duration = 60;
      
      const result = calculateRemainingTime(turnStartTime, currentTime, duration);
      
      // Should be approximately 30 seconds remaining
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(30);
    });

    it('should return 0 when timer has expired', () => {
      const turnStartTime = Date.now() - 70000; // Started 70 seconds ago
      const currentTime = Date.now();
      const duration = 60;
      
      const result = calculateRemainingTime(turnStartTime, currentTime, duration);
      
      expect(result).toBe(0);
    });

    it('should return 0 when timer has not started yet (currentTime < turnStartTime)', () => {
      const turnStartTime = Date.now() + 10000; // Starts in 10 seconds
      const currentTime = Date.now();
      const duration = 60;
      
      // Timer hasn't started yet, should return 0, not full duration
      const result = calculateRemainingTime(turnStartTime, currentTime, duration);
      
      expect(result).toBe(0);
    });

    it('should use default duration of 60 seconds', () => {
      const turnStartTime = Date.now() - 30000;
      const currentTime = Date.now();
      
      const result = calculateRemainingTime(turnStartTime, currentTime);
      
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(30);
    });

    it('should return 0 for invalid turnStartTime', () => {
      const result = calculateRemainingTime(null, Date.now(), 60);
      expect(result).toBe(0);
    });

    it('should use default duration for negative duration', () => {
      const turnStartTime = Date.now() - 30000;
      const currentTime = Date.now();
      const result = calculateRemainingTime(turnStartTime, currentTime, -10);
      // Should use default duration of 60, so ~30 seconds remaining
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(30);
    });
  });

  describe('isTimerExpired', () => {
    it('should return false when timer is active', () => {
      const turnStartTime = Date.now() - 30000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = isTimerExpired(turnStartTime, currentTime, duration);
      
      expect(result).toBe(false);
    });

    it('should return true when timer has expired', () => {
      const turnStartTime = Date.now() - 70000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = isTimerExpired(turnStartTime, currentTime, duration);
      
      expect(result).toBe(true);
    });

    it('should return true when timer has not started (not started = expired)', () => {
      const turnStartTime = Date.now() + 10000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = isTimerExpired(turnStartTime, currentTime, duration);
      
      // When timer hasn't started yet, calculateRemainingTime returns 0, which means expired
      expect(result).toBe(true);
    });
  });

  describe('createForfeitPayload', () => {
    it('should create correct forfeit payload', () => {
      const playerId = 'player123';
      const roundId = 'round456';
      const songData = {
        id: 'song789',
        title: 'Test Song',
        artist: 'Test Artist'
      };
      
      const result = createForfeitPayload(playerId, roundId, songData);
      
      expect(result).toEqual({
        player_id: playerId,
        round_id: roundId,
        song_id: 'song789',
        placement_status: 'waiting_for_opponent',
        timeline: [],
        score: 0,
        is_forfeit: true,
        forfeit_reason: 'timeout'
      });
    });

    it('should handle minimal song data', () => {
      const playerId = 'player123';
      const roundId = 'round456';
      const songData = { id: 'song789' };
      
      const result = createForfeitPayload(playerId, roundId, songData);
      
      expect(result.song_id).toBe('song789');
      expect(result.is_forfeit).toBe(true);
    });

    it('should throw error for missing playerId', () => {
      const roundId = 'round456';
      const songData = { id: 'song789' };
      
      expect(() => createForfeitPayload(null, roundId, songData)).toThrow('playerId is required');
    });

    it('should throw error for empty playerId', () => {
      const roundId = 'round456';
      const songData = { id: 'song789' };
      
      expect(() => createForfeitPayload('', roundId, songData)).toThrow('playerId is required');
    });

    it('should throw error for missing roundId', () => {
      const playerId = 'player123';
      const songData = { id: 'song789' };
      
      expect(() => createForfeitPayload(playerId, null, songData)).toThrow('roundId is required');
    });

    it('should throw error for missing songData', () => {
      const playerId = 'player123';
      const roundId = 'round456';
      
      expect(() => createForfeitPayload(playerId, roundId, null)).toThrow('songData is required');
    });
  });

  describe('canPlayerPlace', () => {
    it('should return true when timer is active', () => {
      const turnStartTime = Date.now() - 30000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = canPlayerPlace(turnStartTime, currentTime, duration);
      
      expect(result).toBe(true);
    });

    it('should return false when timer has expired', () => {
      const turnStartTime = Date.now() - 70000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = canPlayerPlace(turnStartTime, currentTime, duration);
      
      expect(result).toBe(false);
    });
  });

  describe('getTimerState', () => {
    it('should return correct timer state', () => {
      const turnStartTime = Date.now() - 30000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = getTimerState(turnStartTime, currentTime, duration);
      
      expect(result.timeRemaining).toBeGreaterThanOrEqual(29);
      expect(result.timeRemaining).toBeLessThanOrEqual(30);
      expect(result.progressPercent).toBeGreaterThanOrEqual(48);
      expect(result.progressPercent).toBeLessThanOrEqual(52);
      expect(result.isExpired).toBe(false);
      expect(result.isWarning).toBe(false);
      expect(result.isCritical).toBe(false);
    });

    it('should indicate warning when time is low', () => {
      const turnStartTime = Date.now() - 45000; // 15 seconds remaining
      const currentTime = Date.now();
      const duration = 60;
      
      const result = getTimerState(turnStartTime, currentTime, duration);
      
      expect(result.isWarning).toBe(true);
      expect(result.isCritical).toBe(false);
    });

    it('should indicate critical when time is very low', () => {
      const turnStartTime = Date.now() - 55000; // 5 seconds remaining
      const currentTime = Date.now();
      const duration = 60;
      
      const result = getTimerState(turnStartTime, currentTime, duration);
      
      expect(result.isWarning).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('should handle expired timer', () => {
      const turnStartTime = Date.now() - 70000;
      const currentTime = Date.now();
      const duration = 60;
      
      const result = getTimerState(turnStartTime, currentTime, duration);
      
      expect(result.timeRemaining).toBe(0);
      expect(result.progressPercent).toBe(100);
      expect(result.isExpired).toBe(true);
      expect(result.isWarning).toBe(true);
      expect(result.isCritical).toBe(true);
    });

    it('should clamp progress percent to 0-100', () => {
      const turnStartTime = Date.now() - 70000; // Expired
      const currentTime = Date.now();
      const duration = 60;
      
      const result = getTimerState(turnStartTime, currentTime, duration);
      
      expect(result.progressPercent).toBe(100);
    });
  });

  describe('handleReconnectionTimer', () => {
    it('should return null when round data is missing', () => {
      const result = handleReconnectionTimer(null, 1000000, Date.now(), 60);
      
      expect(result).toBeNull();
    });

    it('should return null when serverTurnStartTime is invalid', () => {
      const roundData = { started_at: new Date().toISOString() };
      
      const result = handleReconnectionTimer(roundData, null, Date.now(), 60);
      
      expect(result).toBeNull();
    });

    it('should return null when timer has not started yet', () => {
      const roundData = { started_at: new Date().toISOString() };
      const futureStartTime = Date.now() + 10000;
      const currentTime = Date.now();
      
      const result = handleReconnectionTimer(roundData, futureStartTime, currentTime, 60);
      
      expect(result).toBeNull();
    });

    it('should return timer state when timer is active', () => {
      const roundStartTime = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
      const roundData = { started_at: roundStartTime };
      const serverTurnStartTime = Date.now() - 30000; // Timer started 30 seconds ago
      const currentTime = Date.now();
      
      const result = handleReconnectionTimer(roundData, serverTurnStartTime, currentTime, 60);
      
      expect(result).not.toBeNull();
      expect(result.timeRemaining).toBeGreaterThan(0);
      expect(result.timeRemaining).toBeLessThanOrEqual(60);
    });

    it('should return expired timer state when timer has expired', () => {
      const roundData = { started_at: new Date().toISOString() };
      const serverTurnStartTime = Date.now() - 100000; // Timer started 100 seconds ago
      const currentTime = Date.now();
      
      const result = handleReconnectionTimer(roundData, serverTurnStartTime, currentTime, 60);
      
      expect(result).not.toBeNull();
      expect(result.isExpired).toBe(true);
      expect(result.timeRemaining).toBe(0);
    });
  });

  describe('setServerTimeOffset and getServerTime', () => {
    it('should set and get server time offset', () => {
      const serverTime = 1000000;
      const localTime = 999000;
      
      setServerTimeOffset(serverTime, localTime);
      
      // Mock Date.now() to return localTime
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => localTime);
      
      // Also mock performance.now if available
      const originalPerformanceNow = globalThis.performance?.now;
      if (globalThis.performance) {
        globalThis.performance.now = vi.fn(() => localTime);
      }
      
      const result = getServerTime();
      
      expect(result).toBe(serverTime);
      
      // Restore
      Date.now = originalDateNow;
      if (originalPerformanceNow) {
        globalThis.performance.now = originalPerformanceNow;
      }
    });

    it('should return current time plus offset', () => {
      setServerTimeOffset(0);
      
      const result = getServerTime();
      
      // Should be a positive number (time in milliseconds)
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should resolve on first try when operation succeeds', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const result = await withRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockRejectedValueOnce(new Error('second failure'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockOperation, 3, 10);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw after all retries exhausted', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('failure'));
      
      await expect(withRetry(mockOperation, 2, 10)).rejects.toThrow('failure');
      expect(mockOperation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should retry with delays', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await withRetry(mockOperation, 3, 10);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('setupTimerSync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call onTimeout when timer expires', async () => {
      const mockOnTimeout = vi.fn();
      const serverTurnStartTime = Date.now() - 55000; // 55 seconds ago
      
      setupTimerSync({}, 'round1', serverTurnStartTime, mockOnTimeout, 60);
      
      // Advance timers so the setTimeout triggers
      vi.advanceTimersByTime(5000);
      
      expect(mockOnTimeout).toHaveBeenCalled();
    });

    it('should return cleanup function', () => {
      const mockOnTimeout = vi.fn();
      const serverTurnStartTime = Date.now() + 10000; // In future
      
      const cleanup = setupTimerSync({}, 'round1', serverTurnStartTime, mockOnTimeout, 60);
      
      expect(typeof cleanup).toBe('function');
      
      // Verify cleanup works
      cleanup();
      // Should not throw
    });

    it('should call onTimeout immediately if already expired', () => {
      const mockOnTimeout = vi.fn();
      const serverTurnStartTime = Date.now() - 100000; // 100 seconds ago
      
      setupTimerSync({}, 'round1', serverTurnStartTime, mockOnTimeout, 60);
      
      expect(mockOnTimeout).toHaveBeenCalled();
    });

    it('should return no-op cleanup for invalid serverTurnStartTime', () => {
      const cleanup = setupTimerSync({}, 'round1', -1000, vi.fn(), 60);
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });

    it('should return no-op cleanup for invalid onTimeout', () => {
      const cleanup = setupTimerSync({}, 'round1', Date.now(), 'not a function', 60);
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });
  });
});
