import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Corner from '../screens/Corner';
import { sceneUrl } from '../data/sceneManifest';

describe('scene manifest and rendering', () => {
  it('sceneUrl maps names correctly', () => {
    expect(sceneUrl('Alpine Morning Desk')).toBe('/scenes/alpine-morning-desk.jpg');
    expect(sceneUrl('Autumn Lakeside Cafe')).toBe('/scenes/autumn-lakeside-cafe.jpg');
    expect(sceneUrl('Summer Mountain Cabin')).toBe('/scenes/summer-mountain-cabin.jpg');
  });

  it('Corner thumbnails render with two-layer background', () => {
    const { getAllByTestId } = render(<Corner />);
    const thumbs = getAllByTestId('corner-thumb');
    expect(thumbs.length).toBeGreaterThan(0);

    const firstThumb = thumbs[0];
    const bg = firstThumb.style.backgroundImage;
    expect(bg).toContain('scenes/winter-nyc-sunset.jpg');
    expect(bg).toContain('linear-gradient');
  });
});
