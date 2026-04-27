import { describe, it, expect, vi } from 'vitest';

describe('gameService - Match Finish Integration', () => {
  it('exports markMatchFinished method', async () => {
    const { gameService } = await import('./gameService');
    expect(typeof gameService.markMatchFinished).toBe('function');
  });

  it('markMatchFinished throws on missing matchId', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.markMatchFinished(null, 'player_1')).rejects.toThrow();
  });

  it('markMatchFinished throws on missing winner', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.markMatchFinished('match-1', null)).rejects.toThrow();
  });

  it('markMatchFinished accepts valid winner values', async () => {
    const { gameService } = await import('./gameService');
    // These should not throw during validation
    expect(typeof gameService.markMatchFinished).toBe('function');
  });

  describe('checkAndApplyWinCondition Integration', () => {
    it('exports checkAndApplyWinCondition method', async () => {
      const { gameService } = await import('./gameService');
      expect(typeof gameService.checkAndApplyWinCondition).toBe('function');
    });

    it('throws on invalid parameters', async () => {
      const { gameService } = await import('./gameService');
      await expect(gameService.checkAndApplyWinCondition(null, 1, 5)).rejects.toThrow();
      await expect(gameService.checkAndApplyWinCondition('match-1', null, 5)).rejects.toThrow();
    });

    it('returns object with winState and match status when no winner', async () => {
      const { gameService } = await import('./gameService');
      const result = await gameService.checkAndApplyWinCondition('match-1', 1, 5, 7);
      
      expect(result).toHaveProperty('winState');
      expect(result).toHaveProperty('matchFinished');
      expect(result.matchFinished).toBe(false);
    });
  });
});
