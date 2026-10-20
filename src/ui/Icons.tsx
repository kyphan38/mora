const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
    <polygon points="7,4 19,12 7,20" fill="currentColor" />
  </svg>
);

export const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
    <line x1="9" y1="5" x2="9" y2="19" strokeWidth="2.2" />
    <line x1="15" y1="5" x2="15" y2="19" strokeWidth="2.2" />
  </svg>
);

export const UpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base}>
    <polyline points="6 15 12 9 18 15" />
  </svg>
);

export const DownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <polyline points="12 7.5 12 12 15 14" />
  </svg>
);

// Same gear as fina and logi.
export const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SoundIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <polygon points="5 9.5 9 9.5 13 6 13 18 9 14.5 5 14.5" />
    <path d="M16.5 9a4 4 0 0 1 0 6" />
  </svg>
);

export const NoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <path d="M5 19h4L19 9a2.1 2.1 0 0 0-3-3L6 16z" />
  </svg>
);

export const ZenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <polyline points="4 9 4 4 9 4" />
    <polyline points="20 9 20 4 15 4" />
    <polyline points="4 15 4 20 9 20" />
    <polyline points="20 15 20 20 15 20" />
  </svg>
);
