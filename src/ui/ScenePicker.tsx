import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../platform/auth';
import { isTauri } from '../platform/persistence';
import { CORNERS } from '../data/corners';
import { cornerFromUserScene, sceneImage } from '../data/sceneManifest';
import type { Corner, UserScene } from '../types';
import { Label } from './Words';

// Row tools wait for the pointer; on touch screens they stay visible but faint.
const TILE_TOOL =
  'text-[11px] text-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

type Upload = { name: string; progress: number; cancel: () => void } | null;

/** Default scenes (hide only) plus the owner's uploads (delete), and "add a scene". */
export function ScenePicker() {
  const corner = useStore((s) => s.corner);
  const roomBackground = useStore((s) => s.roomBackground);
  const userScenes = useStore((s) => s.userScenes);
  const hidden = useStore((s) => s.hiddenScenes);
  const setCorner = useStore((s) => s.setCorner);
  const setRoomBackground = useStore((s) => s.setRoomBackground);
  const toggleHiddenScene = useStore((s) => s.toggleHiddenScene);
  const showAllScenes = useStore((s) => s.showAllScenes);
  const uid = useAuth((s) => s.user?.uid ?? null);
  const canUpload = !!uid && !isTauri();

  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [upload, setUpload] = useState<Upload>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const pick = (c: Corner) => {
    setCorner(c);
    setRoomBackground('scene');
  };

  const start = async () => {
    if (!picked || !uid) return;
    const { uploadScene } = await import('../platform/sceneUpload');
    const h = uploadScene(uid, picked, name, (p) => setUpload((u) => (u ? { ...u, progress: p } : u)));
    setUpload({ name, progress: 0, cancel: h.cancel });
    setPicked(null);
    try {
      const scene = await h.done;
      pick(cornerFromUserScene(scene));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'storage/canceled') setError('Upload failed. Try again.');
    } finally {
      setUpload(null);
    }
  };

  const remove = async (s: UserScene) => {
    if (!uid) return;
    const { deleteScene } = await import('../platform/sceneUpload');
    await deleteScene(uid, s).catch(() => setError('Could not delete. Try again.'));
    setConfirmDelete(null);
  };

  const tile = (c: Corner, tool: React.ReactNode) => {
    const current = roomBackground === 'scene' && corner?.id === c.id;
    return (
      <div key={c.id} className="group rise min-w-0">
        <button
          type="button"
          onClick={() => pick(c)}
          aria-pressed={current}
          aria-label={c.name}
          className={`block w-full text-left transition-opacity ${current ? '' : 'opacity-60 hover:opacity-100'}`}
        >
          <div
            className={`aspect-video w-full rounded-[6px] bg-cover bg-center ${current ? 'ring-1 ring-ink' : ''}`}
            style={{ backgroundImage: `url("${sceneImage(c)}"), ${c.gradient}` }}
          />
        </button>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{c.name}</span>
          {tool}
        </div>
      </div>
    );
  };

  const visibleDefaults = CORNERS.filter((c) => !hidden.includes(c.id));
  const own = canUpload ? userScenes : [];

  return (
    <section>
      <Label>scene</Label>
      <div className="grid grid-cols-3 gap-2" data-testid="scene-grid">
        {own.map((s) => {
          const c = cornerFromUserScene(s);
          return tile(
            c,
            confirmDelete === s.id ? (
              <button type="button" className="text-[11px] text-ink" onClick={() => void remove(s)}>
                delete?
              </button>
            ) : (
              <button type="button" className={TILE_TOOL} onClick={() => setConfirmDelete(s.id)} aria-label={`Delete ${s.name}`}>
                delete
              </button>
            ),
          );
        })}
        {visibleDefaults.map((c) =>
          tile(
            c,
            <button type="button" className={TILE_TOOL} onClick={() => toggleHiddenScene(c.id)} aria-label={`Hide ${c.name}`}>
              hide
            </button>,
          ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-[12px] text-faint">
        {canUpload && !upload && !picked && (
          <button type="button" className="hover:text-ink" onClick={() => fileRef.current?.click()}>
            add a scene
          </button>
        )}
        {hidden.length > 0 && (
          <button type="button" className="hover:text-ink" onClick={showAllScenes}>
            {hidden.length} hidden · show
          </button>
        )}
        {error && <span className="text-ink">{error}</span>}
      </div>

      {picked && (
        <form
          className="fade-in mt-3 flex items-baseline gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Scene name"
            className="min-w-0 flex-1 border-b border-line-strong bg-transparent py-1 text-[14px]"
          />
          <button type="submit" className="text-[12px] text-ink">
            upload
          </button>
          <button type="button" className="text-[12px] text-faint hover:text-ink" onClick={() => setPicked(null)}>
            cancel
          </button>
        </form>
      )}

      {upload && (
        <div className="fade-in mt-3 flex items-baseline gap-3 font-mono text-[12px] text-faint" data-testid="scene-upload">
          <span className="min-w-0 flex-1 truncate">
            {upload.name || 'scene'} · {Math.round(upload.progress * 100)}%
          </span>
          <button type="button" className="hover:text-ink" onClick={upload.cancel}>
            cancel
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4"
        className="hidden"
        data-testid="scene-file-input"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const { checkSceneFile } = await import('../platform/sceneUpload');
          const problem = checkSceneFile(file);
          setError(problem);
          if (problem) return;
          setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80));
          setPicked(file);
        }}
      />
    </section>
  );
}
