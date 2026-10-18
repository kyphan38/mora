// Display options stored per device. The theme must be known before the first
// paint, so the inline script in index.html reads the same key.

export type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'mora.theme';
const BG_LIGHT = '#fafafa';
const BG_DARK = '#111111';

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function saveTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const dark =
    theme === 'dark' ||
    (theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', dark ? BG_DARK : BG_LIGHT));
}
