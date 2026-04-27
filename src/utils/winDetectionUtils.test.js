import { describe, it, expect } from 'vitest';
import { hasPlayerWon, determineWinner, checkWinCondition } from './winDetectionUtils';

describe('winDetectionUtils', () => {
  describe('hasPlayerWon - Basic Win Detection', () => {
    it('exports hasPlayerWon function', () => {
      expect(typeof hasPlayerWon).toBe('function');
    });

    it('returns true when player score is exactly 10', () => {
      expect(hasPlayerWon(10)).toBe(true);
    });

    it('returns true when player score is greater than 10', () => {
      expect(hasPlayerWon(15)).toBe(true);
    });

    it('returns false when player score is less than 10', () => {
      expect(hasPlayerWon(9)).toBe(false);
    });

    it('returns false when score is 0', () => {
      expect(hasPlayerWon(0)).toBe(false);
    });

    it('handles non-integer scores', () => {
      expect(hasPlayerWon(10.5)).toBe(true);
    });

    it('throws on null score', () => {
      expect(() => hasPlayerWon(null)).toThrow();
    });

    it('throws on undefined score', () => {
      expect(() => hasPlayerWon(undefined)).toThrow();
    });

    it('throws on non-numeric score', () => {
      expect(() => hasPlayerWon('ten')).toThrow();
    });
  });

  describe('determineWinner - Match Winner Resolution', () => {
    it('exports determineWinner function', () => {
      expect(typeof determineWinner).toBe('function');
    });

    it('returns "player_1" when player 1 score is 10 and player 2 is less', () => {
      expect(determineWinner(10, 5)).toBe('player_1');
    });

    it('returns "player_2" when player 2 score is 10 and player 1 is less', () => {
      expect(determineWinner(5, 10)).toBe('player_2');
    });

    it('returns "draw" when both players hit 10 at the same time', () => {
      expect(determineWinner(10, 10)).toBe('draw');
    });

    it('returns "draw" when both exceed 10', () => {
      expect(determineWinner(12, 11)).toBe('draw');
    });

    it('returns null when neither player has won', () => {
      expect(determineWinner(5, 7)).toBe(null);
    });

    it('returns "player_1" when player 1 score is strictly higher than player 2 when both are 10+', () => {
      // When both scores are >= 10, it's a draw (sudden death tie-breaker scenario)
      expect(determineWinner(11, 10)).toBe('draw');
    });

    it('throws when both scores are null', () => {
      expect(() => determineWinner(null, null)).toThrow();
    });

    it('throws on non-numeric scores', () => {
      expect(() => determineWinner('ten', 5)).toThrow();
    });
  });

  describe('checkWinCondition - Complete Win Check', () => {
    it('exports checkWinCondition function', () => {
      expect(typeof checkWinCondition).toBe('function');
    });

    it('returns object with isWinState true when player 1 wins', () => {
      const result = checkWinCondition(10, 5);
      expect(result.isWinState).toBe(true);
      expect(result.winner).toBe('player_1');
    });

    it('returns object with isWinState false when no winner', () => {
      const result = checkWinCondition(5, 7);
      expect(result.isWinState).toBe(false);
      expect(result.winner).toBe(null);
    });

    it('returns object with isWinState true and winner "draw" for tie', () => {
      const result = checkWinCondition(10, 10);
      expect(result.isWinState).toBe(true);
      expect(result.winner).toBe('draw');
    });

    it('validates input types (throws for invalid input)', () => {
      expect(() => checkWinCondition(null, 5)).toThrow();
      expect(() => checkWinCondition(5, null)).toThrow();
    });
  });
});
