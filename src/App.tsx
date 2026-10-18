import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import type { Corner } from './types';
import { useGlobalAudio } from './hooks/useGlobalAudio';
import { useSessionRuntime } from './hooks/useSessionRuntime';
import { useLogiSync } from './hooks/useLogiSync';
import { FocusView } from './ui/FocusView';
import { HistoryView } from './ui/HistoryView';
import { SettingsView } from './ui/SettingsView';
import { SceneLayer } from './ui/SceneLayer';
import { Sheet } from './ui/Sheet';

export default function App() {
  useGlobalAudio();
  useSessionRuntime();
  useLogiSync();
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const corner = useStore((s) => s.corner);
  const roomBackground = useStore((s) => s.roomBackground);

  const scene = roomBackground === 'scene' && corner ? corner : null;
  // Stay mounted once a scene was shown, so switching to plain can fade out.
  const [shown, setShown] = useState<Corner | null>(scene);
  useEffect(() => {
    if (scene) setShown(scene);
  }, [scene]);
  const back = () => setScreen('focus');

  return (
    <div className="relative min-h-dvh" data-scene={scene ? 'true' : undefined}>
      {shown && <SceneLayer corner={scene ?? shown} visible={!!scene} />}
      <main className="relative z-10" data-testid="room-main">
        <FocusView />
      </main>
      {/* History and Settings open over the clock; it stays the home. */}
      <Sheet open={screen === 'history'} label="History" onClose={back} testId="history-sheet">
        <HistoryView />
      </Sheet>
      <Sheet open={screen === 'settings'} label="Settings" onClose={back} testId="settings-sheet">
        <SettingsView />
      </Sheet>
    </div>
  );
}
