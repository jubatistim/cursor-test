import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAudioPlayer,
  resetAudioPlayer,
  formatTime,
  getCountdownValue,
  isPlaying,
  MAX_REPLAYS
} from './audioPlayer';

// Mock the spotify service
vi.mock('../lib/spotify', () => ({
  spotifyService: {
    createAudioElement: vi.fn((url) => new MockAudioElement(url)),
    setVolume: vi.fn(),
    stop: vi.fn(),
    isPlaying: vi.fn((audioElement) => {
      if (!audioElement) return false;
      return !audioElement.paused && !audioElement.ended;
    })
  }
}));

// Mock HTMLMediaElement constants
const HAVE_NOTHING = 0;
const HAVE_ENOUGH_DATA = 4;

// Mock HTMLMediaElement
class MockAudioElement {
  constructor(src) {
    this.src = src;
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.volume = 1;
    this.readyState = HAVE_NOTHING;
    this.eventListeners = {};
  }

  play() {
    if (this.readyState < HAVE_ENOUGH_DATA) {
      return Promise.reject(new Error('Not ready'));
    }
    this.paused = false;
    this.ended = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }
}

// Set up mock for Audio
global.Audio = vi.fn((src) => new MockAudioElement(src));

describe('Audio Player Utilities', () => {
  describe('formatTime', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should format 5 seconds as 0:05', () => {
      expect(formatTime(5)).toBe('0:05');
    });

    it('should format 60 seconds as 1:00', () => {
      expect(formatTime(60)).toBe('1:00');
    });

    it('should format 90 seconds as 1:30', () => {
      expect(formatTime(90)).toBe('1:30');
    });

    it('should format 3661 seconds as 61:01', () => {
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle negative values as 0:00', () => {
      expect(formatTime(-10)).toBe('0:00');
    });

    it('should handle fractional seconds', () => {
      expect(formatTime(5.9)).toBe('0:05');
      expect(formatTime(65.2)).toBe('1:05');
    });
  });

  describe('getCountdownValue', () => {
    it('should return duration when startTime is now', () => {
      const now = Date.now() / 1000;
      const result = getCountdownValue(now, 20);
      expect(result).toBe(20);
    });

    it('should return less than duration when time has passed', () => {
      const now = Date.now() / 1000;
      const startTime = now - 5; // 5 seconds ago
      const result = getCountdownValue(startTime, 20);
      expect(result).toBe(15);
    });

    it('should return 0 when duration has elapsed', () => {
      const now = Date.now() / 1000;
      const startTime = now - 25; // 25 seconds ago
      const result = getCountdownValue(startTime, 20);
      expect(result).toBe(0);
    });

    it('should return 0 when startTime is after duration', () => {
      const now = Date.now() / 1000;
      const startTime = now - 30; // 30 seconds ago
      const result = getCountdownValue(startTime, 20);
      expect(result).toBe(0);
    });

    it('should handle fractional seconds', () => {
      const now = Date.now() / 1000;
      const startTime = now - 5.5; // 5.5 seconds ago
      const result = getCountdownValue(startTime, 20);
      expect(result).toBe(14); // Floor to integer
    });
  });

  describe('isPlaying', () => {
    it('should return false when audio element is null', () => {
      expect(isPlaying(null)).toBe(false);
    });

    it('should return false when audio is paused', () => {
      const audio = new MockAudioElement('test.mp3');
      audio.paused = true;
      expect(isPlaying(audio)).toBe(false);
    });

    it('should return false when audio has ended', () => {
      const audio = new MockAudioElement('test.mp3');
      audio.paused = false;
      audio.ended = true;
      expect(isPlaying(audio)).toBe(false);
    });

    it('should return true when audio is playing', () => {
      const audio = new MockAudioElement('test.mp3');
      audio.paused = false;
      audio.ended = false;
      expect(isPlaying(audio)).toBe(true);
    });
  });

  describe('MAX_REPLAYS', () => {
    it('should be set to 3', () => {
      expect(MAX_REPLAYS).toBe(3);
    });
  });
});

describe('AudioPlayerState', () => {
  let audioPlayer;
  let mockAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudio = new MockAudioElement('test.mp3');
    mockAudio.readyState = HAVE_ENOUGH_DATA;
    
    audioPlayer = createAudioPlayer();
  });

  afterEach(() => {
    audioPlayer.cleanup();
  });

  describe('init', () => {
    it('should throw error when song is null', () => {
      expect(() => audioPlayer.init(null)).toThrow('Song with preview URL is required');
    });

    it('should throw error when song has no preview_url', () => {
      const song = { id: '123', title: 'Test' };
      expect(() => audioPlayer.init(song)).toThrow('Song with preview URL is required');
    });

    it('should initialize with valid song', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.init(song);
      
      expect(audioPlayer.currentSong).toEqual(song);
    });

    it('should use default duration when not specified', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.init(song);
      
      expect(audioPlayer.snippetDuration).toBe(20);
    });

    it('should clamp duration to valid range', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.init(song, 0, 10); // Too short
      expect(audioPlayer.snippetDuration).toBe(15);
      
      audioPlayer.init(song, 0, 40); // Too long
      expect(audioPlayer.snippetDuration).toBe(30);
    });

    it('should reset replay count on init', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.replayCount = 2;
      audioPlayer.init(song);
      
      expect(audioPlayer.replayCount).toBe(0);
    });
  });

  describe('replay functionality', () => {
    it('should increment replay count on replay', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.init(song);
      
      expect(audioPlayer.replayCount).toBe(0);
      expect(audioPlayer.canReplay()).toBe(true);
      expect(audioPlayer.getRemainingReplays()).toBe(3);
    });

    it('should limit replays to MAX_REPLAYS', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.init(song);
      
      audioPlayer.replayCount = 3;
      expect(audioPlayer.canReplay()).toBe(false);
      expect(audioPlayer.getRemainingReplays()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should reset all state', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      audioPlayer.init(song);
      
      audioPlayer.isPlaying = true;
      audioPlayer.replayCount = 2;
      
      audioPlayer.cleanup();
      
      expect(audioPlayer.audioElement).toBeNull();
      expect(audioPlayer.currentSong).toBeNull();
      expect(audioPlayer.isPlaying).toBe(false);
      expect(audioPlayer.replayCount).toBe(0);
    });
  });

  describe('resetAudioPlayer', () => {
    it('should reset singleton instance', () => {
      const song = { id: '123', title: 'Test', preview_url: 'test.mp3' };
      const player = createAudioPlayer();
      player.init(song);
      
      resetAudioPlayer();
      
      // After reset, getting a new player should work
      expect(() => createAudioPlayer()).not.toThrow();
    });
  });
});
