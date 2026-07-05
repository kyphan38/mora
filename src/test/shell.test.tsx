import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe('AppShell', () => {
  it('renders Landing by default', () => {
    render(<App />);
    expect(screen.getByText('Open your focus corner')).toBeInTheDocument();
    expect(screen.getByText('Start a focus session')).toBeInTheDocument();
  });

  it('tabs hidden on landing', () => {
    render(<App />);
    expect(screen.queryByText('Start')).not.toBeInTheDocument();
    expect(screen.queryByText('Focus')).not.toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
  });

  it('CTA navigates to corner', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Start a focus session'));
    expect(screen.getByText('Choose a focus corner')).toBeInTheDocument();
    // tabs should now be visible
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('tabs are exactly Start, Focus, History', () => {
    // Navigate away from landing first
    useStore.getState().setScreen('corner');
    render(<App />);
    const tabButtons = screen.getAllByRole('button').filter((btn) => {
      const text = btn.textContent?.trim();
      return text === 'Start' || text === 'Focus' || text === 'History';
    });
    expect(tabButtons).toHaveLength(3);
    expect(tabButtons[0].textContent?.trim()).toBe('Start');
    expect(tabButtons[1].textContent?.trim()).toBe('Focus');
    expect(tabButtons[2].textContent?.trim()).toBe('History');
  });

  it('NO Sign in / EN', () => {
    render(<App />);
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    expect(screen.queryByText('EN')).not.toBeInTheDocument();
    // Also check after navigating
    fireEvent.click(screen.getByText('Start a focus session'));
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    expect(screen.queryByText('EN')).not.toBeInTheDocument();
  });

  it('logo returns to landing', () => {
    render(<App />);
    // Navigate to corner
    fireEvent.click(screen.getByText('Start a focus session'));
    expect(screen.getByText('Choose a focus corner')).toBeInTheDocument();
    // Click logo
    fireEvent.click(screen.getByLabelText('mora home'));
    expect(screen.getByText('Open your focus corner')).toBeInTheDocument();
    // Tabs should be hidden again
    expect(screen.queryByText('Start')).not.toBeInTheDocument();
    expect(screen.queryByText('Focus')).not.toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
  });
});
