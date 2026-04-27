import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Confetti } from './Confetti';

describe('Confetti', () => {
  it('renders canvas element with correct attributes', () => {
    render(<Confetti />);
    
    const canvas = screen.getByTestId('confetti');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('has correct styling for fixed positioning', () => {
    render(<Confetti />);
    
    const canvas = screen.getByTestId('confetti');
    expect(canvas).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999'
    });
  });

  it('cleans up animation on unmount', () => {
    const { unmount } = render(<Confetti />);
    
    const canvas = screen.getByTestId('confetti');
    expect(canvas).toBeInTheDocument();
    
    // Should not throw error on unmount
    expect(() => unmount()).not.toThrow();
  });
});
