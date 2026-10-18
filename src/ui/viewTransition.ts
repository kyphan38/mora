import { flushSync } from 'react-dom';
import { reducedMotion } from '../hooks/usePresence';

type Doc = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
};

/**
 * Runs `update` inside a View Transition when the browser has them, else
 * plainly. `kind` picks the root animation in globals.css: 'screen' slides
 * and fades the page; 'task' only lets a named element fly.
 */
export function withTransition(kind: 'screen' | 'task', update: () => void) {
  const doc = document as Doc;
  if (!doc.startViewTransition || reducedMotion()) return update();
  const root = document.documentElement;
  root.dataset.vt = kind;
  const done = () => {
    delete root.dataset.vt;
  };
  const t = doc.startViewTransition(() => flushSync(update));
  t.finished.then(done, done);
}
