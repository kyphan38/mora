import { useStore } from "./store/useStore";
import { AppShell } from "./components/AppShell";
import Room from "./screens/Room";
import History from "./screens/History";

import { useGlobalAudio } from "./hooks/useGlobalAudio";
import { useSessionRuntime } from "./hooks/useSessionRuntime";

function App() {
  useGlobalAudio();
  useSessionRuntime();
  const screen = useStore((s) => s.screen);
  const roomBackground = useStore((s) => s.roomBackground);

  const isRoom = screen === 'room';
  // The scene background only lives in the Room; other screens stay plain.
  const isScene = isRoom && roomBackground === 'scene';

  return (
    <div className="app" data-scene={isScene ? "true" : undefined} style={{ position: 'relative' }}>
      <AppShell>
        {isRoom ? (
          <Room />
        ) : (
          <div style={nonRoomWrapperStyle}>
            <div style={nonRoomInnerStyle} className="screen-content">
              <History />
            </div>
          </div>
        )}
      </AppShell>
    </div>
  );
}

const nonRoomWrapperStyle: React.CSSProperties = {
  width: '100%',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const nonRoomInnerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 1160,
  margin: '0 auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

export default App;
