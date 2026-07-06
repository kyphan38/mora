import { useRef, useState } from 'react';
import { useStore, shouldPlayAudio } from '../store/useStore';
import { MUSIC_STYLES } from '../data/sound';
import { getAudioEngine } from '../lib/audio';
import { putCustomTrack, deleteCustomTrack } from '../lib/customTrackDb';
import { uid } from '../lib/uid';

const MAX_CUSTOM_TRACK_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPTED_EXTENSIONS = /\.(mp3|wav|m4a|ogg)$/i;

interface MusicStyleGridProps {
  variant: 'default' | 'panel';
  isSceneMode?: boolean;
}

export function MusicStyleGrid({ variant, isSceneMode = false }: MusicStyleGridProps) {
  const sound = useStore((s) => s.sound);
  const customTracks = useStore((s) => s.customTracks);
  const setMusicStyle = useStore((s) => s.setMusicStyle);
  const setAudioActive = useStore((s) => s.setAudioActive);
  const addCustomTrack = useStore((s) => s.addCustomTrack);
  const selectCustomTrack = useStore((s) => s.selectCustomTrack);
  const removeCustomTrack = useStore((s) => s.removeCustomTrack);
  const audioActive = useStore(shouldPlayAudio);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const customTrack = customTracks[0] ?? null;
  const isCustomSelected = !!sound.customTrackId && sound.customTrackId === customTrack?.id;

  const gridStyle = variant === 'panel' ? panelGridStyle : defaultGridStyle;
  const cardStyleFor = (isActive: boolean): React.CSSProperties =>
    variant === 'panel' ? panelCardStyle(isActive, isSceneMode) : defaultCardStyle(isActive);

  const activatePlayback = () => {
    setAudioActive(true);
    getAudioEngine().play();
  };

  const handlePresetClick = (name: string) => {
    setMusicStyle(name);
    activatePlayback();
  };

  const handleUploadClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleCustomCardClick = () => {
    if (!customTrack) return;
    if (isCustomSelected) {
      // Already the active selection - clicking again opens the picker to replace it.
      handleUploadClick();
      return;
    }
    selectCustomTrack(customTrack.id);
    activatePlayback();
  };

  const handleCustomCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCustomCardClick();
    }
  };

  const handleRemove = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!customTrack) return;
    deleteCustomTrack(customTrack.id);
    removeCustomTrack(customTrack.id);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const looksLikeAudio = file.type.startsWith('audio/') || ACCEPTED_EXTENSIONS.test(file.name);
    if (!looksLikeAudio) {
      setError('Please choose an MP3, WAV, M4A, or OGG file.');
      return;
    }
    if (file.size > MAX_CUSTOM_TRACK_BYTES) {
      setError('File too large (max 50MB).');
      return;
    }

    if (customTrack && isCustomSelected && audioActive) {
      const confirmed = window.confirm('Replace your current custom track? Playback will restart.');
      if (!confirmed) return;
    }

    setError(null);
    const id = uid();
    try {
      await putCustomTrack({
        id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: Date.now(),
        blob: file,
      });
    } catch {
      setError('Could not save that file. Please try again.');
      return;
    }

    if (customTrack) {
      deleteCustomTrack(customTrack.id);
    }

    addCustomTrack({ id, name: file.name, mimeType: file.type, size: file.size, createdAt: Date.now() });
    selectCustomTrack(id);
    activatePlayback();
  };

  const displayName = customTrack ? customTrack.name.replace(/\.[^./]+$/, '') : '';

  return (
    <>
      <div style={gridStyle}>
        {MUSIC_STYLES.map((m) => (
          <button
            key={m}
            onClick={() => handlePresetClick(m)}
            style={cardStyleFor(!sound.customTrackId && sound.musicStyle === m)}
          >
            {m}
          </button>
        ))}
        {customTrack ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleCustomCardClick}
            onKeyDown={handleCustomCardKeyDown}
            className="custom-track-card"
            style={{ ...cardStyleFor(isCustomSelected), position: 'relative' }}
            title={customTrack.name}
            aria-label={`Custom track: ${customTrack.name}`}
          >
            <span style={truncatedLabelStyle}>{displayName}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove custom track"
              onClick={handleRemove}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleRemove(e);
              }}
              className="custom-track-remove"
              style={removeIconStyle(isSceneMode)}
            >
              ×
            </span>
          </div>
        ) : (
          <button onClick={handleUploadClick} style={cardStyleFor(false)}>
            + Custom
          </button>
        )}
      </div>
      {error && <p style={errorTextStyle}>{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </>
  );
}

const defaultGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 10,
};

const defaultCardStyle = (active: boolean): React.CSSProperties => ({
  border: '1px solid',
  borderRadius: 'var(--r-md)',
  padding: '14px 16px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  textAlign: 'center',
  transition: 'background var(--dur) var(--ease)',
  background: active ? 'var(--accent-soft)' : 'var(--surface)',
  borderColor: active ? 'var(--accent-line)' : 'var(--line)',
  color: active ? 'var(--accent-txt)' : 'var(--ink)',
});

const panelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 8,
};

const panelCardStyle = (active: boolean, isSceneMode: boolean): React.CSSProperties => ({
  border: '1px solid',
  borderRadius: 'var(--r-md)',
  padding: '10px 8px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'center',
  fontFamily: 'var(--font)',
  transition: 'all var(--dur) var(--ease)',
  background: active ? 'var(--accent-soft)' : (isSceneMode ? 'rgba(255,255,255,0.06)' : 'var(--surface-2)'),
  borderColor: active ? 'var(--accent-line)' : (isSceneMode ? 'rgba(255,255,255,0.15)' : 'var(--line)'),
  color: active ? 'var(--accent-txt)' : (isSceneMode ? '#fff' : 'var(--ink)'),
});

const truncatedLabelStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
  width: '100%',
};

const removeIconStyle = (isSceneMode: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 2,
  right: 4,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: '2px 4px',
  color: isSceneMode ? 'rgba(255,255,255,0.4)' : 'var(--ink-3)',
});

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#dc2626',
  marginTop: 6,
};
