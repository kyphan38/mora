import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Corner from '../screens/Corner';
import { sceneUrl } from '../data/sceneManifest';

describe('scene manifest and rendering', () => {
  it('sceneUrl maps IDs correctly', () => {
    expect(sceneUrl('alpine-morning-desk')).toBe('/scenes/alpine-morning-desk.jpg');
    expect(sceneUrl('autumn-lakeside-cafe')).toBe('/scenes/autumn-lakeside-cafe.jpg');
    expect(sceneUrl('scene_d5aa07')).toBe('/scenes/scene_d5aa07.jpg');
  });

  it('Corner thumbnails render with two-layer background', () => {
    const { getAllByTestId } = render(<Corner />);
    const thumbs = getAllByTestId('corner-thumb');
    expect(thumbs.length).toBeGreaterThan(0);

    const firstThumb = thumbs[0];
    const bg = firstThumb.style.backgroundImage;
    expect(bg).toContain('.jpg');
    expect(bg).toContain('linear-gradient');
  });
});
