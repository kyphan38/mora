import { describe, it, expect } from 'vitest';
import conf from '../../src-tauri/tauri.conf.json';
import pkg from '../../package.json';

describe('tauri and package configs', () => {
  it('conf.productName is mora', () => {
    expect(conf.productName).toBe('mora');
  });

  it('conf.identifier is space.mora and valid format', () => {
    expect(conf.identifier).toBe('space.mora');
    expect(/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(conf.identifier)).toBe(true);
  });

  it('conf.version matches package.json version', () => {
    expect(conf.version).toBe('0.1.0');
    expect(conf.version).toBe(pkg.version);
  });

  it('windows config includes label main', () => {
    const windows = conf.app.windows;
    expect(windows).toBeDefined();
    const labels = windows.map((w: any) => w.label);
    expect(labels).toContain('main');
    expect(labels).not.toContain('widget');
  });

  it('bundle config is active and valid', () => {
    expect(conf.bundle.active).toBe(true);
    expect(conf.bundle.targets).toBeDefined();
    if (typeof conf.bundle.targets === 'string') {
      expect(conf.bundle.targets).toBe('all');
    } else {
      expect(Array.isArray(conf.bundle.targets)).toBe(true);
      expect((conf.bundle.targets as any[]).length).toBeGreaterThan(0);
    }
  });

  it('bundle.icon contains .icns and .ico', () => {
    const icons = conf.bundle.icon;
    expect(Array.isArray(icons)).toBe(true);
    const hasIcns = icons.some((i: string) => i.endsWith('.icns'));
    const hasIco = icons.some((i: string) => i.endsWith('.ico'));
    expect(hasIcns).toBe(true);
    expect(hasIco).toBe(true);
  });
});
