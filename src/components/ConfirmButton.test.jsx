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
});
