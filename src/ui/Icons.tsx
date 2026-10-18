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

export const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="9" cy="7" r="2" fill="var(--bg)" />
    <circle cx="15" cy="17" r="2" fill="var(--bg)" />
  </svg>
);

export const SoundIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <polygon points="5 9.5 9 9.5 13 6 13 18 9 14.5 5 14.5" />
    <path d="M16.5 9a4 4 0 0 1 0 6" />
  </svg>
);
