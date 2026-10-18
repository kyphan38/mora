import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import App from '../App';
import { useStore } from '../store/useStore';
import { CORNERS } from '../data/corners';
import { sceneVideoUrl, mediaUrl } from '../data/sceneManifest';
import { resetCustomTrackDbForTest } from '../platform/customTrackDb';

const st = () => useStore.getState();

function seed() {
  st().addTask('Task A');
  st().addTask('Task B');
}

// jsdom here has no usable localStorage; a Map is enough for prefs.
function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
  vi.stubGlobal('localStorage', memoryStorage());
  document.documentElement.removeAttribute('data-theme');
});

describe('Places', () => {
  it('opens on the clock; history and settings open as sheets over it', () => {
    render(<App />);
    expect(st().screen).toBe('focus');
    fireEvent.click(screen.getByLabelText('History'));
    expect(screen.getByTestId('history-sheet')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(st().screen).toBe('focus');
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByTestId('settings-sheet')).toBeInTheDocument();
  });

  it('no sign in, no language switch', () => {
    render(<App />);
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    expect(screen.queryByText('EN')).not.toBeInTheDocument();
  });
});

const openTasks = () => fireEvent.click(screen.getByTestId('tasks-toggle-btn'));

describe('Focus screen', () => {
  it('asks for a task when there is none, and shows no Play', () => {
    render(<App />);
    expect(screen.getByText('Add a task to begin')).toBeInTheDocument();
    expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
  });

  it('adding a task shows it with Play', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Add a task to begin'));
    fireEvent.change(screen.getByLabelText('Add a task'), { target: { value: 'Write' } });
    fireEvent.submit(screen.getByLabelText('Add a task').closest('form')!);
    expect(st().tasks.map((t) => t.name)).toEqual(['Write']);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('first Play starts a session; Pause stops the clock', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Play'));
    expect(st().sessionActive).toBe(true);
    expect(st().isRunning).toBe(true);
    fireEvent.click(screen.getByLabelText('Pause'));
    expect(st().isRunning).toBe(false);
  });

  it('duration words show before the block starts and hide after', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: '25 min' }));
    expect(st().setup.durationSec).toBe(1500);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Play'));
    expect(screen.queryByRole('radiogroup', { name: 'Duration' })).not.toBeInTheDocument();
  });

  it('done opens the review sheet; mark done moves to the next task', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByLabelText('Play'));
    fireEvent.click(screen.getByLabelText('Complete now'));
    expect(screen.getByTestId('review-sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('review-mark-done'));
    expect(screen.getByText('Next: Task B')).toBeInTheDocument();
    expect(screen.queryByTestId('review-mark-done')).not.toBeInTheDocument();
  });

  it('break shows skip; skipping returns to focus', () => {
    seed();
    render(<App />);
    act(() => {
      st().startFocus();
      st().enterReview();
      st().startBreak();
    });
    expect(screen.getByText('break')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Skip break'));
    expect(st().phase).toBe('focus');
  });

  it('task rows: toggle, move, remove, clear done', () => {
    seed();
    render(<App />);
    openTasks();
    fireEvent.click(screen.getByTestId('room-task-move-up-1'));
    expect(st().tasks.map((t) => t.name)).toEqual(['Task B', 'Task A']);
    fireEvent.click(screen.getByLabelText('Toggle Task B'));
    expect(st().tasks[0].done).toBe(true);
    fireEvent.click(screen.getByTestId('clear-completed-btn'));
    expect(st().tasks.map((t) => t.name)).toEqual(['Task A']);
    fireEvent.click(screen.getByLabelText('Remove Task A'));
    expect(st().tasks).toEqual([]);
  });

  it('tasks live in a sheet, closed by default; the bar counts what is left', () => {
    seed();
    render(<App />);
    expect(screen.queryByLabelText('Add a task')).not.toBeInTheDocument();
    expect(screen.getByTestId('tasks-toggle-btn').textContent).toContain('2 tasks');
    openTasks();
    expect(screen.getByLabelText('Add a task')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByLabelText('Add a task')).not.toBeInTheDocument();
  });

  it('the ring follows the countdown', () => {
    seed();
    act(() => {
      st().setDuration('25 min');
      st().startFocus();
      useStore.setState({ elapsedSec: 750 });
    });
    render(<App />);
    const ring = screen.getByTestId('ring-progress');
    const total = Number(ring.getAttribute('stroke-dasharray'));
    expect(Number(ring.getAttribute('stroke-dashoffset'))).toBeCloseTo(total / 2, 3);
  });

  it('scene mode draws the scene behind the clock', async () => {
    seed();
    useStore.setState({ roomBackground: 'scene', corner: CORNERS[0] });
    const { container } = render(<App />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('data-scene')).toBe('true');
    expect(screen.getByTestId('room-scene-bg')).toBeInTheDocument();
    const src = (await screen.findByTestId('scene-video')).querySelector('source')!;
    expect(src.getAttribute('src')).toBe(sceneVideoUrl(CORNERS[0].id));
  });
});

describe('Sound sheet', () => {
  beforeEach(() => resetCustomTrackDbForTest());

  it('opens, changes sound, and closes with Escape', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    expect(screen.getByTestId('room-settings-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Rain' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
    fireEvent.change(screen.getByLabelText('Ambient volume'), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('Music volume'), { target: { value: '15' } });
    expect(st().sound).toMatchObject({ ambient: 'Rain', musicStyle: 'Piano', ambientVolume: 40, musicVolume: 15 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('room-settings-panel')).not.toBeInTheDocument();
  });

  it('picking a scene switches the background to scene', () => {
    seed();
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.click(screen.getByRole('button', { name: CORNERS[1].name }));
    expect(st().corner?.id).toBe(CORNERS[1].id);
    expect(st().roomBackground).toBe('scene');
  });

  it('rejects a non-audio file with an inline error', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByTestId('custom-track-input'), { target: { files: [file] } });
    expect(await screen.findByText('Choose an MP3, WAV, M4A or OGG file.')).toBeInTheDocument();
    expect(st().customTracks).toEqual([]);
  });

  it('uploading a track selects it; a second one replaces it; remove clears it', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    const input = screen.getByTestId('custom-track-input');
    fireEvent.change(input, { target: { files: [new File(['a'], 'first.mp3', { type: 'audio/mpeg' })] } });
    await waitFor(() => expect(st().customTracks.length).toBe(1));
    expect(st().sound.customTrackId).toBe(st().customTracks[0].id);
    expect(screen.getByRole('radio', { name: 'first' })).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [new File(['b'], 'second.mp3', { type: 'audio/mpeg' })] } });
    await waitFor(() => expect(st().customTracks[0]?.name).toBe('second.mp3'));
    expect(st().customTracks.length).toBe(1);

    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
    expect(st().sound.customTrackId).toBeNull();
    expect(st().customTracks.length).toBe(1);

    fireEvent.click(screen.getByText('remove'));
    expect(st().customTracks).toEqual([]);
  });
});

describe('Settings screen', () => {
  it('theme words set data-theme and remember it', () => {
    useStore.setState({ screen: 'settings' });
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('mora.theme')).toBe('dark');
    fireEvent.click(screen.getByRole('radio', { name: 'system' }));
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('mora.theme')).toBeNull();
  });

  it('background and after-session words update the store', () => {
    useStore.setState({ screen: 'settings' });
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'scene' }));
    expect(st().roomBackground).toBe('scene');
    fireEvent.click(screen.getByRole('radio', { name: 'break, then next task' }));
    expect(st().autoContinue).toBe(true);
  });

  it('clear history asks once', () => {
    useStore.setState({
      screen: 'settings',
      sessions: [{ id: 's', taskName: 'T', minutes: 5, startedAt: 0, endedAt: 1, corner: '', ambient: '' }],
    });
    render(<App />);
    fireEvent.click(screen.getByText('Clear history'));
    expect(st().sessions.length).toBe(1);
    fireEvent.click(screen.getByText('Clear all'));
    expect(st().sessions).toEqual([]);
  });
});

describe('scene media urls', () => {
  it('point at Cloud Storage defaults/ with the path encoded', () => {
    const u = mediaUrl('defaults/scenes/x.mp4');
    if (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) {
      expect(u).toContain('/o/defaults%2Fscenes%2Fx.mp4?alt=media');
    } else {
      expect(u).toBe('/scenes/x.mp4');
    }
  });
});

describe('scene picker', () => {
  it('hides a default scene and shows it again', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.click(screen.getByLabelText(`Hide ${CORNERS[0].name}`));
    expect(st().hiddenScenes).toEqual([CORNERS[0].id]);
    expect(screen.queryByRole('button', { name: CORNERS[0].name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('1 hidden · show'));
    expect(st().hiddenScenes).toEqual([]);
  });

  it('defaults have no delete; uploaded scenes do', () => {
    useStore.setState({
      userScenes: [{ id: 'm1', name: 'Train', videoUrl: 'https://x/v.mp4', imageUrl: 'https://x/i.jpg', videoPath: 'users/u/scenes/m1.mp4', imagePath: 'users/u/scenes/m1.jpg', createdAt: 1 }],
    });
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    expect(screen.queryByLabelText(`Delete ${CORNERS[0].name}`)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Delete Train')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Train' }));
    expect(st().corner).toMatchObject({ id: 'u_m1', video: 'https://x/v.mp4' });
    expect(screen.getByText('add a scene')).toBeInTheDocument();
  });

  it('rejects a file that is not an mp4', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('room-settings-toggle'));
    fireEvent.change(screen.getByTestId('scene-file-input'), { target: { files: [new File(['x'], 'clip.mov', { type: 'video/quicktime' })] } });
    expect(await screen.findByText('Choose an MP4 video.')).toBeInTheDocument();
  });
});
