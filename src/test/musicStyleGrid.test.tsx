import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MusicStyleGrid } from '../components/MusicStyleGrid';
import { useStore } from '../store/useStore';
import { resetCustomTrackDbForTest } from '../lib/customTrackDb';

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], name, { type });
}

describe('MusicStyleGrid', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
    resetCustomTrackDbForTest();
  });

  it('renders all preset cards plus an empty "+ Custom" upload card', () => {
    render(<MusicStyleGrid variant="default" />);
    ['Lo-fi', 'Piano', 'Deep Focus', 'Synthwave', 'Nature', 'Ambient'].forEach((m) => {
      expect(screen.getByText(m)).toBeInTheDocument();
    });
    expect(screen.getByText('+ Custom')).toBeInTheDocument();
  });

  it('rejects a non-audio file with an inline error and does not create a track', async () => {
    render(<MusicStyleGrid variant="default" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = makeFile('notes.txt', 'text/plain');
    fireEvent.change(input, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Please choose an MP3, WAV, M4A, or OGG file/)).toBeInTheDocument();
    });
    expect(useStore.getState().customTracks).toEqual([]);
  });

  it('rejects an oversized file with an inline error', async () => {
    render(<MusicStyleGrid variant="default" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeFile('big.mp3', 'audio/mpeg', 51 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File too large/)).toBeInTheDocument();
    });
    expect(useStore.getState().customTracks).toEqual([]);
  });

  it('uploading a valid audio file adds it, selects it, and renders its name', async () => {
    render(<MusicStyleGrid variant="default" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('My Focus Loop.mp3', 'audio/mpeg');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(useStore.getState().customTracks.length).toBe(1);
    });
    expect(screen.getByText('My Focus Loop')).toBeInTheDocument();
    const trackId = useStore.getState().customTracks[0].id;
    expect(useStore.getState().sound.customTrackId).toBe(trackId);
  });

  it('uploading a second file replaces the first (single slot)', async () => {
    render(<MusicStyleGrid variant="default" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [makeFile('first.mp3', 'audio/mpeg')] } });
    await waitFor(() => expect(useStore.getState().customTracks.length).toBe(1));

    fireEvent.change(input, { target: { files: [makeFile('second.mp3', 'audio/mpeg')] } });
    await waitFor(() => {
      expect(useStore.getState().customTracks.length).toBe(1);
      expect(useStore.getState().customTracks[0].name).toBe('second.mp3');
    });
  });

  it('clicking the remove icon deletes the custom track and resets selection', async () => {
    render(<MusicStyleGrid variant="default" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('loop.mp3', 'audio/mpeg')] } });
    await waitFor(() => expect(useStore.getState().customTracks.length).toBe(1));

    fireEvent.click(screen.getByLabelText('Remove custom track'));

    expect(useStore.getState().customTracks).toEqual([]);
    expect(useStore.getState().sound.customTrackId).toBeNull();
    expect(screen.getByText('+ Custom')).toBeInTheDocument();
  });

  it('selecting a preset clears the custom track selection without deleting it', async () => {
    render(<MusicStyleGrid variant="default" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('loop.mp3', 'audio/mpeg')] } });
    await waitFor(() => expect(useStore.getState().customTracks.length).toBe(1));

    fireEvent.click(screen.getByText('Piano'));
    expect(useStore.getState().sound.musicStyle).toBe('Piano');
    expect(useStore.getState().sound.customTrackId).toBeNull();
    // Track metadata itself is preserved, just deselected
    expect(useStore.getState().customTracks.length).toBe(1);
  });
});
