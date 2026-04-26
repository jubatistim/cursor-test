import { describe, it, expect } from 'vitest';
import { generateRoomCode } from './roomCode';

describe('Room Code Generation', () => {
  it('should generate a 6-character code', () => {
    const code = generateRoomCode();
    expect(code.length).toBe(6);
  });

  it('should contain only uppercase letters and digits', () => {
    const code = generateRoomCode();
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
  });

  it('should generate unique codes across multiple calls', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateRoomCode());
    }
    expect(codes.size).toBe(1000);
  });
});
