import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('AppShell', () => {
  it('opens on the Room', () => {
    render(<App />);
    expect(useStore.getState().screen).toBe('room');
    expect(screen.getByTestId('room-main')).toBeInTheDocument();
  });

  it('tabs are exactly Focus, History', () => {
    const { container } = render(<App />);
    const tabs = [...container.querySelectorAll('.nav-tab-btn')].map((b) => b.textContent);
    expect(tabs).toEqual(['Focus', 'History']);
  });

  it('tabs switch screens; logo returns to the Room', () => {
    render(<App />);
    fireEvent.click(screen.getByText('History'));
    expect(useStore.getState().screen).toBe('history');
    fireEvent.click(screen.getByLabelText('mora home'));
    expect(useStore.getState().screen).toBe('room');
  });

  it('NO Sign in / EN', () => {
    render(<App />);
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    expect(screen.queryByText('EN')).not.toBeInTheDocument();
  });
});
