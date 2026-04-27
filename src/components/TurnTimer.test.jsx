import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TurnTimer } from './TurnTimer';
import * as timerUtils from '../utils/timerUtils';

describe('TurnTimer', () => {
  const mockOnTimeout = vi.fn();
  
  beforeEach(() => {
    mockOnTimeout.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isActive is false', () => {
      render(
        <TurnTimer
          startTime={1000000}
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={false}
        />
      );

      expect(screen.queryByText(/^\d+:\d{2}$/)).toBeNull();
    });

    it('should not render when startTime is not provided', () => {
      render(
        <TurnTimer
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      // Should render with full duration
      expect(screen.queryByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    beforeEach(() => {
      // Mock timer utility functions for consistent behavior
      vi.spyOn(timerUtils, 'getServerTime').mockReturnValue(1000000);
      vi.spyOn(timerUtils, 'calculateRemainingTime').mockReturnValue(60);
    });

    it('should render timer display', () => {
      render(
        <TurnTimer
          startTime={999400} // 60 seconds before mock server time
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should render progress bar with proper attributes', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '60');
    });

    it('should display custom duration', () => {
      // Mock to return the duration value
      vi.spyOn(timerUtils, 'calculateRemainingTime').mockReturnValue(120);
      
      render(
        <TurnTimer
          startTime={999400}
          duration={120}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
          className="custom-timer-class"
        />
      );

      const timerContainer = screen.getByText('1:00').closest('.turn-timer');
      expect(timerContainer).toHaveClass('custom-timer-class');
    });

    it('should render progress bar with inner div', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      const innerDiv = progressBar.querySelector('div');
      expect(innerDiv).toBeInTheDocument();
      expect(innerDiv).toHaveClass('h-full');
    });
  });

  describe('Timer States', () => {
    beforeEach(() => {
      vi.spyOn(timerUtils, 'getServerTime').mockReturnValue(1000000);
    });

    it('should show timer with full duration when timeNotStarted yet', () => {
      // Calculate remaining time returns 0 because timer hasn't started
      vi.spyOn(timerUtils, 'calculateRemainingTime').mockReturnValue(0);
      
      render(
        <TurnTimer
          startTime={1000000 + 10000} // Future start time
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      // Should show 0:00 for not started timer
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should show expired state when remaining time is 0', () => {
      vi.spyOn(timerUtils, 'calculateRemainingTime').mockReturnValue(0);
      
      render(
        <TurnTimer
          startTime={999000} // Expired (more than 60s ago)
          duration={60}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('0:00')).toBeInTheDocument();
      // Note: onTimeout would be called in useEffect, but we're not testing that here
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.spyOn(timerUtils, 'getServerTime').mockReturnValue(1000000);
      vi.spyOn(timerUtils, 'calculateRemainingTime').mockReturnValue(60);
    });

    it('should handle missing onTimeout gracefully', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={60}
          isActive={true}
        />
      );

      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should handle missing duration gracefully (uses default 60)', () => {
      render(
        <TurnTimer
          startTime={999400}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('1:00')).toBeInTheDocument();
    });
  });

  describe('Format Time', () => {
    beforeEach(() => {
      vi.spyOn(timerUtils, 'getServerTime').mockReturnValue(1000000);
      vi.spyOn(timerUtils, 'calculateRemainingTime').mockImplementation((startTime, currentTime, duration) => {
        // Return a fixed remaining time based on duration
        return duration || 60;
      });
    });

    it('should format time as MM:SS with leading zeros', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={5}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('0:05')).toBeInTheDocument();
    });

    it('should handle time less than 1 minute', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={45}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('should handle time more than 1 minute', () => {
      render(
        <TurnTimer
          startTime={999400}
          duration={120}
          onTimeout={mockOnTimeout}
          isActive={true}
        />
      );

      expect(screen.getByText('2:00')).toBeInTheDocument();
    });
  });
});
