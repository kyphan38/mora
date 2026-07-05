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
      'Alpine Escapes House', 'Alpine Morning Desk', 'Ambient Concentration',
      'Ambient Soundscapes', 'Autumn Cafe Italy', 'Autumn Lakeside Cafe',
      'Binaural Study', 'Calm Water Cabin'
    ];

    visiblePage1Names.forEach((name) => {
      const textNode = screen.getByText(name);
      const button = textNode.closest('button');
      expect(button).not.toHaveStyle('display: none');
    });

    // Lakeside Cabin Retreat (L) should be hidden on Page 1 (index 8 -> Page 2)
    const lakesideText = screen.getByText('Lakeside Cabin Retreat');
    const lakesideBtn = lakesideText.closest('button');
    expect(lakesideBtn).toHaveStyle('display: none');
  });

  it('clicking Next and Prev navigates correctly', () => {
    render(<App />);

    // Click Next button twice to go to Page 3
    const nextBtn = screen.getByTestId('next-page-btn');
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    // Lakeside Cabin Retreat (L) should now be visible on Page 3
    const lakesideText = screen.getByText('Lakeside Cabin Retreat');
    const lakesideBtn = lakesideText.closest('button');
    expect(lakesideBtn).not.toHaveStyle('display: none');

    // Page 1 items should be hidden
    const autumnText = screen.getByText('Autumn Lakeside Cafe');
    const autumnBtn = autumnText.closest('button');
    expect(autumnBtn).toHaveStyle('display: none');

    // Click Prev button once to go back to Page 2
    const prevBtn = screen.getByTestId('prev-page-btn');
    fireEvent.click(prevBtn);

    expect(autumnBtn).toHaveStyle('display: none');
    expect(lakesideBtn).toHaveStyle('display: none');
  });
});
