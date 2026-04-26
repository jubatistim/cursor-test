import { describe, it, expect } from 'vitest';
import { isPlacementCorrect, calculatePoints } from './scoringUtils';

describe('isPlacementCorrect', () => {
  it('returns true for a single-song timeline (always correct)', () => {
    expect(isPlacementCorrect([{ year: 1990 }], 0)).toBe(true);
  });

  it('returns true when placed at the beginning and is the oldest', () => {
    const timeline = [{ year: 1980 }, { year: 1990 }, { year: 2000 }];
    expect(isPlacementCorrect(timeline, 0)).toBe(true);
  });

  it('returns true when placed at the end and is the newest', () => {
    const timeline = [{ year: 1980 }, { year: 1990 }, { year: 2005 }];
    expect(isPlacementCorrect(timeline, 2)).toBe(true);
  });

  it('returns true when placed in the middle with correct ordering', () => {
    const timeline = [{ year: 1980 }, { year: 1995 }, { year: 2005 }];
    expect(isPlacementCorrect(timeline, 1)).toBe(true);
  });

  it('returns false when placed at beginning but is not the oldest', () => {
    const timeline = [{ year: 2000 }, { year: 1990 }, { year: 2005 }];
    expect(isPlacementCorrect(timeline, 0)).toBe(false);
  });

  it('returns false when placed at end but is not the newest', () => {
    const timeline = [{ year: 1980 }, { year: 1990 }, { year: 1985 }];
    expect(isPlacementCorrect(timeline, 2)).toBe(false);
  });

  it('returns false when placed in middle with wrong ordering', () => {
    const timeline = [{ year: 1980 }, { year: 1970 }, { year: 2005 }];
    expect(isPlacementCorrect(timeline, 1)).toBe(false);
  });

  it('returns true when placed song has same year as neighbor (ties allowed)', () => {
    const timeline = [{ year: 1990 }, { year: 1990 }, { year: 2000 }];
    expect(isPlacementCorrect(timeline, 1)).toBe(true);
  });

  it('returns false for empty timeline', () => {
    expect(isPlacementCorrect([], 0)).toBe(false);
  });

  it('returns false for null timeline', () => {
    expect(isPlacementCorrect(null, 0)).toBe(false);
  });

  it('returns false for out-of-bounds index', () => {
    expect(isPlacementCorrect([{ year: 1990 }], 5)).toBe(false);
  });

  it('returns false for negative index', () => {
    expect(isPlacementCorrect([{ year: 1990 }], -1)).toBe(false);
  });

  it('returns false when song is missing year', () => {
    expect(isPlacementCorrect([{ year: 1990 }, { title: 'no year' }], 1)).toBe(false);
  });
});

describe('calculatePoints', () => {
  it('returns 1 for a correct placement', () => {
    const timeline = [{ year: 1980 }, { year: 1995 }, { year: 2005 }];
    expect(calculatePoints(timeline, 1)).toBe(1);
  });

  it('returns 0 for an incorrect placement', () => {
    const timeline = [{ year: 2000 }, { year: 1990 }, { year: 2005 }];
    expect(calculatePoints(timeline, 0)).toBe(0);
  });

  it('returns 1 for placement at the very beginning (oldest song)', () => {
    const timeline = [{ year: 1975 }, { year: 1990 }, { year: 2000 }];
    expect(calculatePoints(timeline, 0)).toBe(1);
  });

  it('returns 1 for placement at the very end (newest song)', () => {
    const timeline = [{ year: 1975 }, { year: 1990 }, { year: 2010 }];
    expect(calculatePoints(timeline, 2)).toBe(1);
  });

  it('returns 0 for invalid input', () => {
    expect(calculatePoints(null, 0)).toBe(0);
    expect(calculatePoints([], 0)).toBe(0);
  });
});
