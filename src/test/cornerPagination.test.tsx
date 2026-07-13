import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import App from '../App';

describe('Corner screen pagination & sorting', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    useStore.setState({ screen: 'corner' });
  });

  it('sorts corners alphabetically and splits them into 8-item pages', () => {
    render(<App />);

    // Page 1 should show the first 8 items alphabetically:
    const visiblePage1Names = [
      'Beautiful Courtyard Jazz', 'Calm Guitar Melodies', 'Chill Fireplace Lounge',
      'Coastal Cabin Fireplace', 'Cozy Garden Cafe', 'Cozy Ocean Sunset',
      'Evening Living Room Jazz', 'Quiet Reading Jazz'
    ];

    visiblePage1Names.forEach((name) => {
      const textNode = screen.getByText(name);
      const button = textNode.closest('button');
      expect(button).not.toHaveStyle('display: none');
    });

    // Quiet Window Corner should be hidden on Page 1 (index 8 -> Page 2)
    const hiddenText = screen.getByText('Quiet Window Corner');
    const hiddenBtn = hiddenText.closest('button');
    expect(hiddenBtn).toHaveStyle('display: none');
  });

  it('clicking Next and Prev navigates correctly', () => {
    render(<App />);

    // Click Next button once to go to Page 2
    const nextBtn = screen.getByTestId('next-page-btn');
    fireEvent.click(nextBtn);

    // Quiet Window Corner should now be visible on Page 2
    const hiddenText = screen.getByText('Quiet Window Corner');
    const hiddenBtn = hiddenText.closest('button');
    expect(hiddenBtn).not.toHaveStyle('display: none');

    // Page 1 items should be hidden
    const page1Text = screen.getByText('Beautiful Courtyard Jazz');
    const page1Btn = page1Text.closest('button');
    expect(page1Btn).toHaveStyle('display: none');

    // Click Prev button once to go back to Page 1
    const prevBtn = screen.getByTestId('prev-page-btn');
    fireEvent.click(prevBtn);

    expect(page1Btn).not.toHaveStyle('display: none');
    expect(hiddenBtn).toHaveStyle('display: none');
  });
});
