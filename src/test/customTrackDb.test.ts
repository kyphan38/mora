import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import {
  putCustomTrack,
  getCustomTrack,
  deleteCustomTrack,
  listCustomTracks,
  isIndexedDbAvailable,
  resetCustomTrackDbForTest,
  type CustomTrackRecord,
} from '../lib/customTrackDb';

// jsdom's Blob polyfill isn't recognized by Node's structuredClone (which fake-indexeddb/
// real IndexedDB implementations use internally), so tests use Node's native Blob to
// faithfully exercise the same clone path a real browser/Tauri webview would use.
const makeRecord = (id: string): CustomTrackRecord => ({
  id,
  name: `${id}.mp3`,
  mimeType: 'audio/mpeg',
  size: 1234,
  createdAt: 1000,
  blob: new NodeBlob(['fake audio bytes'], { type: 'audio/mpeg' }) as unknown as Blob,
});

describe('customTrackDb', () => {
  beforeEach(() => {
    resetCustomTrackDbForTest();
  });

  it('reports IndexedDB as available under the fake-indexeddb polyfill', () => {
    expect(isIndexedDbAvailable()).toBe(true);
  });

  it('put then get round-trips a record', async () => {
    const rec = makeRecord('t1');
    await putCustomTrack(rec);
    const loaded = await getCustomTrack('t1');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('t1');
    expect(loaded!.name).toBe('t1.mp3');
    expect(loaded!.blob).toBeInstanceOf(NodeBlob);
  });

  it('get returns null for a missing id', async () => {
    const loaded = await getCustomTrack('does-not-exist');
    expect(loaded).toBeNull();
  });

  it('put replaces an existing record with the same id', async () => {
    await putCustomTrack(makeRecord('t1'));
    const updated = { ...makeRecord('t1'), name: 'renamed.mp3' };
    await putCustomTrack(updated);
    const loaded = await getCustomTrack('t1');
    expect(loaded!.name).toBe('renamed.mp3');
  });

  it('delete removes a record', async () => {
    await putCustomTrack(makeRecord('t1'));
    await deleteCustomTrack('t1');
    expect(await getCustomTrack('t1')).toBeNull();
  });

  it('delete on a missing id does not throw', async () => {
    await expect(deleteCustomTrack('nope')).resolves.not.toThrow();
  });

  it('listCustomTracks returns all stored records', async () => {
    await putCustomTrack(makeRecord('t1'));
    await putCustomTrack(makeRecord('t2'));
    const all = await listCustomTracks();
    expect(all.map((r) => r.id).sort()).toEqual(['t1', 't2']);
  });
});
