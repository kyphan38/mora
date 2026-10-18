import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { AMBIENTS, MUSIC_STYLES } from '../data/sound';
import { CORNERS } from '../data/corners';
import { sceneUrl } from '../data/sceneManifest';
import { getAudioEngine } from '../platform/audio';
import { putCustomTrack, deleteCustomTrack } from '../platform/customTrackDb';
import { uid } from '../core/uid';
import { Sheet } from './Sheet';
import { Words, Label } from './Words';

const MAX_CUSTOM_TRACK_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = /\.(mp3|wav|m4a|ogg)$/i;
const CUSTOM = '__custom__';

/** Sound and scene, picked while focusing. Picks preview right away. */
export function SoundSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sound = useStore((s) => s.sound);
  const corner = useStore((s) => s.corner);
  const customTrack = useStore((s) => s.customTracks[0] ?? null);
  const isRunning = useStore((s) => s.isRunning);
  const setAmbient = useStore((s) => s.setAmbient);
  const setMusicStyle = useStore((s) => s.setMusicStyle);
  const setAmbientVolume = useStore((s) => s.setAmbientVolume);
  const setMusicVolume = useStore((s) => s.setMusicVolume);
  const addCustomTrack = useStore((s) => s.addCustomTrack);
  const selectCustomTrack = useStore((s) => s.selectCustomTrack);
  const removeCustomTrack = useStore((s) => s.removeCustomTrack);
  const setCorner = useStore((s) => s.setCorner);
  const setRoomBackground = useStore((s) => s.setRoomBackground);
  const roomBackground = useStore((s) => s.roomBackground);
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);

  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = () => getAudioEngine().play();

  const isCustom = !!customTrack && sound.customTrackId === customTrack.id;
  const musicOptions = [
    ...MUSIC_STYLES.map((m) => ({ value: m, label: m })),
    ...(customTrack ? [{ value: CUSTOM, label: customTrack.name.replace(/\.[^./]+$/, '') }] : []),
  ];

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/') && !ACCEPTED_EXTENSIONS.test(file.name)) {
      setError('Choose an MP3, WAV, M4A or OGG file.');
      return;
    }
    if (file.size > MAX_CUSTOM_TRACK_BYTES) {
      setError('File too large (max 50MB).');
      return;
    }
    if (isCustom && isRunning && !window.confirm('Replace your track? Playback restarts.')) return;
    setError(null);
    const id = uid();
    const meta = { id, name: file.name, mimeType: file.type, size: file.size, createdAt: Date.now() };
    try {
      await putCustomTrack({ ...meta, blob: file });
    } catch {
      setError('Could not save that file.');
      return;
    }
    if (customTrack) deleteCustomTrack(customTrack.id);
    addCustomTrack(meta);
    selectCustomTrack(id);
    preview();
  };

  return (
    <Sheet open={open} label="Sound and scene" onClose={onClose} testId="room-settings-panel">
      <div className="space-y-6">
        <section>
          <Label>sound</Label>
          <Words
            label="Sound"
            options={[
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
            value={muted ? 'off' : 'on'}
            onChange={(v) => setMuted(v === 'off')}
          />
        </section>

        <section className={`transition-opacity ${muted ? 'opacity-40' : ''}`}>
          <Label>ambient</Label>
          <Words
            label="Ambient"
            options={AMBIENTS.map((a) => ({ value: a, label: a }))}
            value={sound.ambient}
            onChange={(a) => {
              setAmbient(a);
              preview();
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={sound.ambientVolume}
            onChange={(e) => {
              setAmbientVolume(Number(e.target.value));
              preview();
            }}
            aria-label="Ambient volume"
            className="mt-3 w-full"
          />
        </section>

        <section className={`transition-opacity ${muted ? 'opacity-40' : ''}`}>
          <Label>music</Label>
          <Words
            label="Music"
            options={musicOptions}
            value={isCustom ? CUSTOM : sound.musicStyle}
            onChange={(m) => {
              if (m === CUSTOM && customTrack) selectCustomTrack(customTrack.id);
              else setMusicStyle(m);
              preview();
            }}
          />
          <div className="mt-2 flex items-baseline gap-4 text-[12px] text-faint">
            <button type="button" className="hover:text-ink" onClick={() => fileRef.current?.click()}>
              {customTrack ? 'replace your track' : 'add your track'}
            </button>
            {customTrack && (
              <button
                type="button"
                className="hover:text-ink"
                onClick={() => {
                  deleteCustomTrack(customTrack.id);
                  removeCustomTrack(customTrack.id);
                }}
              >
                remove
              </button>
            )}
            {error && <span className="text-ink">{error}</span>}
          </div>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} data-testid="custom-track-input" />
          <input
            type="range"
            min={0}
            max={100}
            value={sound.musicVolume}
            onChange={(e) => {
              setMusicVolume(Number(e.target.value));
              preview();
            }}
            aria-label="Music volume"
            className="mt-3 w-full"
          />
        </section>

        <section>
          <Label>scene</Label>
          <div className="grid grid-cols-3 gap-2">
            {CORNERS.map((c) => {
              const current = roomBackground === 'scene' && corner?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCorner(c);
                    setRoomBackground('scene');
                  }}
                  aria-pressed={current}
                  className={`min-w-0 text-left transition-opacity ${current ? '' : 'opacity-60 hover:opacity-100'}`}
                >
                  <div
                    className={`aspect-video w-full rounded-[6px] bg-cover bg-center ${current ? 'ring-1 ring-ink' : ''}`}
                    style={{ backgroundImage: `url("${sceneUrl(c.id)}"), ${c.gradient}` }}
                  />
                  <span className="mt-1 block truncate text-[11px] text-muted">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Sheet>
  );
}
