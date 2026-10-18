import { useStore } from './store/useStore';
import { useGlobalAudio } from './hooks/useGlobalAudio';
import { useSessionRuntime } from './hooks/useSessionRuntime';
import { FocusView } from './ui/FocusView';
import { HistoryView } from './ui/HistoryView';
import { SettingsView } from './ui/SettingsView';
import { SceneLayer } from './ui/SceneLayer';
import { Sheet } from './ui/Sheet';

export default function App() {
  useGlobalAudio();
  useSessionRuntime();
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const corner = useStore((s) => s.corner);
  const roomBackground = useStore((s) => s.roomBackground);

  const scene = roomBackground === 'scene' && corner ? corner : null;
  const back = () => setScreen('focus');

  return (
    <div className="relative min-h-dvh" data-scene={scene ? 'true' : undefined}>
      {scene && <SceneLayer corner={scene} />}
      <main className="relative z-10" data-testid="room-main">
        <FocusView />
      </main>
      {/* History and Settings open over the clock; it stays the home. */}
      {screen === 'history' && (
        <Sheet label="History" onClose={back} testId="history-sheet">
          <HistoryView />
        </Sheet>
      )}
      {screen === 'settings' && (
        <Sheet label="Settings" onClose={back} testId="settings-sheet">
          <SettingsView />
        </Sheet>
      )}
    </div>
  );
}
