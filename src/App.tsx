import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import type { Corner } from './types';
import { useGlobalAudio } from './hooks/useGlobalAudio';
import { useSessionRuntime } from './hooks/useSessionRuntime';
import { useCloudSync } from './hooks/useCloudSync';
import { FocusView } from './ui/FocusView';
import { HistoryView } from './ui/HistoryView';
import { SettingsView } from './ui/SettingsView';
import { SceneLayer } from './ui/SceneLayer';
import { Sheet } from './ui/Sheet';
import { SignInView } from './ui/SignInView';
import { useAuth, startAuth } from './platform/auth';
import { withTransition } from './ui/viewTransition';

/** mora needs a signed-in account: everything syncs across devices. */
export default function App() {
  const status = useAuth((s) => s.status);
  useEffect(() => {
    startAuth();
  }, []);
  if (status !== 'signed-in') return <SignInView />;
  return <MoraApp />;
}

function MoraApp() {
  useGlobalAudio();
  useSessionRuntime();
  useCloudSync();
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
  const back = () => withTransition('screen', () => setScreen('focus'));

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
