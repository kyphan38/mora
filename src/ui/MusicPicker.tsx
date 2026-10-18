import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { MUSIC_STYLES } from '../data/sound';
import { getAudioEngine } from '../platform/audio';
import { useAuth } from '../platform/auth';
import { Words } from './Words';

const TRACK = 'track:';
const ACCEPTED_EXTENSIONS = /\.(mp3|wav|m4a|ogg|aac)$/i;
const MAX_BYTES = 50 * 1024 * 1024;

type Upload = { name: string; progress: number; cancel: () => void } | null;

/** Music styles plus your own tracks, stored in the cloud so every device has them. */
export function MusicPicker() {
  const sound = useStore((s) => s.sound);
  const userTracks = useStore((s) => s.userTracks);
  const setMusicStyle = useStore((s) => s.setMusicStyle);
  const selectCustomTrack = useStore((s) => s.selectCustomTrack);
  const ownerUid = useAuth((s) => s.user?.uid ?? null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<Upload>(null);
  const preview = () => getAudioEngine().play();

  const selected = userTracks.find((t) => t.id === sound.customTrackId);
  const options = [
    ...MUSIC_STYLES.map((m) => ({ value: m, label: m })),
    ...userTracks.map((t) => ({ value: TRACK + t.id, label: t.name })),
  ];

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !ownerUid) return;
    if (!file.type.startsWith('audio/') && !ACCEPTED_EXTENSIONS.test(file.name)) {
      setError('Choose an MP3, WAV, M4A or OGG file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File too large (max 50MB).');
      return;
    }
    setError(null);
    const { uploadTrack } = await import('../platform/trackUpload');
    const h = uploadTrack(ownerUid, file, (p) => setUpload((u) => (u ? { ...u, progress: p } : u)));
    setUpload({ name: file.name.replace(/\.[^./]+$/, ''), progress: 0, cancel: h.cancel });
    try {
      const t = await h.done;
      selectCustomTrack(t.id);
      preview();
    } catch (err) {
      if ((err as { code?: string }).code !== 'storage/canceled') setError('Upload failed. Try again.');
    } finally {
      setUpload(null);
    }
  };

  const removeSelected = async () => {
    if (!selected || !ownerUid) return;
    setMusicStyle(sound.musicStyle);
    const { deleteTrack } = await import('../platform/trackUpload');
    await deleteTrack(ownerUid, selected).catch(() => setError('Could not delete. Try again.'));
  };

  return (
    <>
      <Words
        label="Music"
        options={options}
        value={selected ? TRACK + selected.id : sound.musicStyle}
        onChange={(m) => {
          if (m.startsWith(TRACK)) selectCustomTrack(m.slice(TRACK.length));
          else setMusicStyle(m);
          preview();
        }}
      />
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] text-faint">
        {!upload && (
          <button type="button" className="hover:text-ink" onClick={() => fileRef.current?.click()}>
            add your track
          </button>
        )}
        {selected && !upload && (
          <button type="button" className="hover:text-ink" onClick={() => void removeSelected()} aria-label={`Remove ${selected.name}`}>
            remove
          </button>
        )}
        {upload && (
          <span className="font-mono" data-testid="track-upload">
            {upload.name} · {Math.round(upload.progress * 100)}%{' '}
            <button type="button" className="hover:text-ink" onClick={upload.cancel}>
              cancel
            </button>
          </span>
        )}
        {error && <span className="text-ink">{error}</span>}
      </div>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} data-testid="custom-track-input" />
    </>
  );
}
