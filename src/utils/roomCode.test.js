import { describe, it, expect } from 'vitest';
import { generateRoomCode, validateRoomCode, formatRoomCode } from './roomCode';

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

describe('Room Code Validation', () => {
  it('should accept valid 6-character alphanumeric codes', () => {
    expect(validateRoomCode('ABC123')).toBe(true);
    expect(validateRoomCode('XYZ789')).toBe(true);
    expect(validateRoomCode('A1B2C3')).toBe(true);
  });

  it('should reject codes that are too short', () => {
    expect(validateRoomCode('ABC12')).toBe(false);
    expect(validateRoomCode('A')).toBe(false);
    expect(validateRoomCode('')).toBe(false);
  });

  it('should reject codes that are too long', () => {
    expect(validateRoomCode('ABC1234')).toBe(false);
    expect(validateRoomCode('ABC123456')).toBe(false);
  });

  it('should reject codes with lowercase letters', () => {
    expect(validateRoomCode('abc123')).toBe(false);
    expect(validateRoomCode('AbC123')).toBe(false);
  });

  it('should reject codes with special characters', () => {
    expect(validateRoomCode('ABC!23')).toBe(false);
    expect(validateRoomCode('ABC 23')).toBe(false);
    expect(validateRoomCode('ABC-23')).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(validateRoomCode(null)).toBe(false);
    expect(validateRoomCode(undefined)).toBe(false);
  });
});

describe('Room Code Formatting', () => {
  it('should convert lowercase to uppercase', () => {
    expect(formatRoomCode('abc123')).toBe('ABC123');
    expect(formatRoomCode('AbC123')).toBe('ABC123');
  });

  it('should remove special characters', () => {
    expect(formatRoomCode('ABC!@#')).toBe('ABC');
    expect(formatRoomCode('A B C')).toBe('ABC');
    expect(formatRoomCode('A-B-C')).toBe('ABC');
  });

  it('should limit to 6 characters', () => {
    expect(formatRoomCode('ABCDEFGHIJK')).toBe('ABCDEF');
    expect(formatRoomCode('ABC123456')).toBe('ABC123');
  });

  it('should handle mixed input', () => {
    expect(formatRoomCode('abc!@#123xyz')).toBe('ABC123');
  });
});
