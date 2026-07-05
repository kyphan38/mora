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
      'Alpine Escapes House', 'Alpine Morning Desk', 'Autumn Cafe Italy',
      'Autumn Lakeside Cafe', 'Calm Water Cabin', 'Clear Water Firelight',
      'Coastal Beach Lofi', 'Countryside Morning River'
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

    // Indicator should say Page 1 of 3
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('clicking Next and Prev navigates correctly', () => {
    render(<App />);

    // Click Next button
    const nextBtn = screen.getByTestId('next-page-btn');
    fireEvent.click(nextBtn);

    // Indicator should update to Page 2 of 3
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

    // Lakeside Cabin Retreat (L) should now be visible on Page 2
    const lakesideText = screen.getByText('Lakeside Cabin Retreat');
    const lakesideBtn = lakesideText.closest('button');
    expect(lakesideBtn).not.toHaveStyle('display: none');

    // Page 1 items should be hidden
    const autumnText = screen.getByText('Autumn Lakeside Cafe');
    const autumnBtn = autumnText.closest('button');
    expect(autumnBtn).toHaveStyle('display: none');

    // Click Prev button
    const prevBtn = screen.getByTestId('prev-page-btn');
    fireEvent.click(prevBtn);

    // Indicator should update back to Page 1 of 3
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(autumnBtn).not.toHaveStyle('display: none');
    expect(lakesideBtn).toHaveStyle('display: none');
  });
});
