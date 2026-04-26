import { describe, it, expect } from 'vitest';

describe('gameService - Structure', () => {
  it('exports gameService object', async () => {
    const { gameService } = await import('./gameService');
    expect(gameService).toBeDefined();
    expect(typeof gameService).toBe('object');
  });

  it('has confirmPlacement method', async () => {
    const { gameService } = await import('./gameService');
    expect(typeof gameService.confirmPlacement).toBe('function');
  });

  it('has subscribeToOpponentPlacement method', async () => {
    const { gameService } = await import('./gameService');
    expect(typeof gameService.subscribeToOpponentPlacement).toBe('function');
  });

  it('has resetPlacement method', async () => {
    const { gameService } = await import('./gameService');
    expect(typeof gameService.resetPlacement).toBe('function');
  });
});

describe('gameService - Input Validation', () => {
  it('confirmPlacement throws on missing matchId', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.confirmPlacement(null, 'player-1', [])).rejects.toThrow();
  });

  it('confirmPlacement throws on missing playerId', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.confirmPlacement('match-1', null, [])).rejects.toThrow();
  });

  it('confirmPlacement throws when placedSongs is not an array', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.confirmPlacement('match-1', 'player-1', null)).rejects.toThrow();
  });

  it('subscribeToOpponentPlacement returns unsubscribe fn when params invalid', async () => {
    const { gameService } = await import('./gameService');
    const unsub = gameService.subscribeToOpponentPlacement(null, null, null);
    expect(typeof unsub).toBe('function');
  });

  it('resetPlacement throws on missing matchId', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.resetPlacement(null, 'player-1')).rejects.toThrow();
  });
});

describe('gameService - saveScore', () => {
  it('has saveScore method', async () => {
    const { gameService } = await import('./gameService');
    expect(typeof gameService.saveScore).toBe('function');
  });

  it('throws on missing matchId', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.saveScore(null, 1, 1)).rejects.toThrow();
  });

  it('throws on invalid playerNumber (not 1 or 2)', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.saveScore('match-1', 3, 1)).rejects.toThrow();
  });

  it('throws on negative score', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.saveScore('match-1', 1, -1)).rejects.toThrow();
  });

  it('throws when score is not a number', async () => {
    const { gameService } = await import('./gameService');
    await expect(gameService.saveScore('match-1', 1, 'five')).rejects.toThrow();
  });
});
