import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmButton } from './ConfirmButton';

describe('ConfirmButton', () => {
  it('renders with default label', () => {
    render(<ConfirmButton onConfirm={vi.fn()} />);
    expect(screen.getByText('Confirm Placement')).toBeTruthy();
  });

  it('calls onConfirm when clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<ConfirmButton onConfirm={vi.fn()} disabled />);
    expect(screen.getByRole('button').disabled).toBe(true);
  });

  it('does not call onConfirm when disabled', () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows confirming state', () => {
    render(<ConfirmButton onConfirm={vi.fn()} isConfirming />);
    expect(screen.getByText('Confirming…')).toBeTruthy();
    expect(screen.getByRole('button').disabled).toBe(true);
  });

  it('has correct aria-label', () => {
    render(<ConfirmButton onConfirm={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Confirm song placement');
  });

  describe('Desktop Controls', () => {
    it('supports keyboard activation with Space key', () => {
      const onConfirm = vi.fn();
      render(<ConfirmButton onConfirm={onConfirm} />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard activation with Enter key', () => {
      const onConfirm = vi.fn();
      render(<ConfirmButton onConfirm={onConfirm} />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('prevents keyboard activation when disabled', () => {
      const onConfirm = vi.fn();
      render(<ConfirmButton onConfirm={onConfirm} disabled />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('prevents keyboard activation when confirming', () => {
      const onConfirm = vi.fn();
      render(<ConfirmButton onConfirm={onConfirm} isConfirming />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('has proper accessibility attributes', () => {
      render(<ConfirmButton onConfirm={vi.fn()} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('tabIndex')).toBe('0');
      expect(button.getAttribute('aria-disabled')).toBe('false');
      expect(button.getAttribute('aria-busy')).toBe('false');
    });

    it('has correct accessibility attributes when disabled', () => {
      render(<ConfirmButton onConfirm={vi.fn()} disabled />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('tabIndex')).toBe('-1');
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('has correct accessibility attributes when confirming', () => {
      render(<ConfirmButton onConfirm={vi.fn()} isConfirming />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });
  });
});
