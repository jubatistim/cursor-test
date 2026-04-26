import { describe, it, expect } from 'vitest';

/**
 * Match Service Tests - Structure Verification
 * 
 * These tests verify the service structure. Integration tests require Supabase connection.
 */

describe('Match Service - Structure', () => {
  it('should export matchService object', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService).toBeDefined();
    expect(typeof matchService).toBe('object');
  });

  it('should have startMatch method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.startMatch).toBeDefined();
    expect(typeof matchService.startMatch).toBe('function');
  });

  it('should have getMatchByRoomId method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.getMatchByRoomId).toBeDefined();
    expect(typeof matchService.getMatchByRoomId).toBe('function');
  });

  it('should have getMatchById method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.getMatchById).toBeDefined();
    expect(typeof matchService.getMatchById).toBe('function');
  });

  it('should have getGameState method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.getGameState).toBeDefined();
    expect(typeof matchService.getGameState).toBe('function');
  });

  it('should have getAllGameStates method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.getAllGameStates).toBeDefined();
    expect(typeof matchService.getAllGameStates).toBe('function');
  });

  it('should have updateGameState method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.updateGameState).toBeDefined();
    expect(typeof matchService.updateGameState).toBe('function');
  });

  it('should have incrementScore method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.incrementScore).toBeDefined();
    expect(typeof matchService.incrementScore).toBe('function');
  });

  it('should have incrementCorrectPlacements method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.incrementCorrectPlacements).toBeDefined();
    expect(typeof matchService.incrementCorrectPlacements).toBe('function');
  });

  it('should have addPlacementToTimeline method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.addPlacementToTimeline).toBeDefined();
    expect(typeof matchService.addPlacementToTimeline).toBe('function');
  });

  it('should have endMatch method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.endMatch).toBeDefined();
    expect(typeof matchService.endMatch).toBe('function');
  });

  it('should have nextRound method', async () => {
    const { matchService } = await import('./matchService');
    expect(matchService.nextRound).toBeDefined();
    expect(typeof matchService.nextRound).toBe('function');
  });
});

describe('Match Service - Input Validation (No Supabase)', () => {
  it('getMatchByRoomId should return null when called without roomId', async () => {
    const { matchService } = await import('./matchService');
    const result = await matchService.getMatchByRoomId(null);
    expect(result).toBeNull();
  });

  it('getMatchById should return null when called without matchId', async () => {
    const { matchService } = await import('./matchService');
    const result = await matchService.getMatchById(null);
    expect(result).toBeNull();
  });

  it('getGameState should return null when called without matchId', async () => {
    const { matchService } = await import('./matchService');
    const result = await matchService.getGameState(null, 'player-1');
    expect(result).toBeNull();
  });

  it('getGameState should return null when called without playerId', async () => {
    const { matchService } = await import('./matchService');
    const result = await matchService.getGameState('match-1', null);
    expect(result).toBeNull();
  });

  it('getAllGameStates should return empty array when called without matchId', async () => {
    const { matchService } = await import('./matchService');
    const result = await matchService.getAllGameStates(null);
    expect(result).toEqual([]);
  });
});
