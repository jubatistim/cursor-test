import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaitingOverlay } from './WaitingOverlay';

describe('WaitingOverlay', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<WaitingOverlay isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders waiting message when visible', () => {
    render(<WaitingOverlay isVisible />);
    expect(screen.getByText('Waiting for other player…')).toBeTruthy();
  });

  it('has correct role and aria attributes', () => {
    render(<WaitingOverlay isVisible />);
    const overlay = screen.getByRole('status');
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('aria-live')).toBe('polite');
    expect(overlay.getAttribute('aria-label')).toBe('Waiting for other player');
  });
});
