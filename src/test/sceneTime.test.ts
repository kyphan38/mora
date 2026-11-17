import { describe, expect, it } from 'vitest';
import { dayPartOf, fits, pickForPart, SCENE_PARTS } from '../core/sceneTime';
import { CORNERS } from '../data/corners';
import { useStore } from '../store/useStore';

describe('scene by time (M10)', () => {
  it('splits the day', () => {
    expect([4, 5, 10, 11, 16, 17, 20, 21, 0].map(dayPartOf)).toEqual([
      'night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night',
    ]);
  });
  it('tags every default scene, and every part has scenes', () => {
    for (const c of CORNERS) expect(SCENE_PARTS[c.id], c.id).toBeDefined();
    for (const part of ['morning', 'afternoon', 'evening', 'night'] as const) {
      expect(CORNERS.filter((c) => fits(c.id, part)).length).toBeGreaterThanOrEqual(5);
    }
  });
  it('lets own uploads fit any part', () => {
    expect(fits('u_abc', 'night')).toBe(true);
  });
  it('picks a fitting scene other than the current one', () => {
    const list = [{ id: 'scene_61ddfb' }, { id: 'scene_e7db50' }, { id: 'scene_17dc86' }];
    expect(pickForPart(list, 'night', 'scene_61ddfb', () => 0)?.id).toBe('scene_e7db50');
    expect(pickForPart([{ id: 'scene_61ddfb' }], 'night', 'scene_61ddfb')?.id).toBe('scene_61ddfb');
    expect(pickForPart([{ id: 'scene_17dc86' }], 'night', null)).toBeNull();
  });
});


describe('sceneForTime in the store', () => {
  it('switches only in scene mode with the setting on', () => {
    useStore.setState(useStore.getInitialState());
    const night = new Date(2026, 10, 17, 22).getTime();
    useStore.setState({ roomBackground: 'color', corner: null });
    useStore.getState().sceneForTime(night);
    expect(useStore.getState().corner).toBeNull();

    useStore.setState({ roomBackground: 'scene' });
    useStore.getState().sceneForTime(night);
    expect(fits(useStore.getState().corner!.id, 'night')).toBe(true);

    useStore.setState({ sceneByTime: false, corner: null });
    useStore.getState().sceneForTime(night);
    expect(useStore.getState().corner).toBeNull();
  });
});
