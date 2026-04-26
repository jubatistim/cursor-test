import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Suppress console.error, console.log, and console.warn during tests
// This prevents test output pollution from expected error logging in source code
// Use beforeEach/afterEach so each test starts with clean mocks
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
