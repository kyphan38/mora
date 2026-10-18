import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';
import type { UserTrack } from '../types';

const uploadTrack = vi.fn();
const deleteTrack = vi.fn();
vi.mock('../platform/trackUpload', () => ({ uploadTrack: (...a: unknown[]) => uploadTrack(...a), deleteTrack: (...a: unknown[]) => deleteTrack(...a) }));

const st = () => useStore.getState();
const track = (id: string, name: string): UserTrack => ({ id, name, url: `https://x/${id}.mp3`, path: `users/u/audio/${id}.mp3`, mimeType: 'audio/mpeg', size: 10, createdAt: 1 });

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  uploadTrack.mockReset();
  deleteTrack.mockReset().mockResolvedValue(undefined);
});

describe('cloud music (web, signed in)', () => {
  it('lists every cloud track and selects one', () => {
    useStore.setState({ userTracks: [track('a', 'Rain Piano'), track('b', 'Night Drive')] });
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.click(screen.getByRole('radio', { name: 'Night Drive' }));
    expect(st().sound.customTrackId).toBe('b');
  });

  it('upload goes to the cloud with progress, then is selected', async () => {
    let progress: (p: number) => void = () => {};
    let finish: (t: UserTrack) => void = () => {};
    uploadTrack.mockImplementation((_uid: string, _file: File, onProgress: (p: number) => void) => {
      progress = onProgress;
      return { done: new Promise<UserTrack>((r) => (finish = r)), cancel: vi.fn() };
    });
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.change(screen.getByTestId('custom-track-input'), { target: { files: [new File(['a'], 'calm.mp3', { type: 'audio/mpeg' })] } });
    await waitFor(() => expect(uploadTrack).toHaveBeenCalled());
    act(() => progress(0.5));
    expect(screen.getByTestId('track-upload').textContent).toContain('50%');
    await act(async () => finish(track('new', 'calm')));
    expect(st().sound.customTrackId).toBe('new');
    expect(st().customTracks).toEqual([]);
  });

  it('remove deletes the selected cloud track and goes back to the style', async () => {
    useStore.setState({ userTracks: [track('a', 'Rain Piano')], sound: { ...useStore.getInitialState().sound, customTrackId: 'a' } });
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.click(screen.getByLabelText('Remove Rain Piano'));
    await waitFor(() => expect(deleteTrack).toHaveBeenCalled());
    expect(st().sound.customTrackId).toBeNull();
  });

  it('a track deleted on another device is unselected here', () => {
    useStore.setState({ userTracks: [track('a', 'Rain Piano')], sound: { ...useStore.getInitialState().sound, customTrackId: 'a' } });
    st().applyRemote({ userTracks: [] });
    expect(st().sound.customTrackId).toBeNull();
  });
});
