import { useStore } from "./store/useStore";
import { AppShell } from "./components/AppShell";
import Landing from "./screens/Landing";
import Corner from "./screens/Corner";
import Sound from "./screens/Sound";
import Session from "./screens/Session";
import Room from "./screens/Room";
import History from "./screens/History";

import { useGlobalAudio } from "./hooks/useGlobalAudio";
import { SceneBackground } from "./components/SceneBackground";

function App() {
  useGlobalAudio();
  const screen = useStore((s) => s.screen);
  const roomBackground = useStore((s) => s.roomBackground);
  const corner = useStore((s) => s.corner);

  const screens = {
    landing: <Landing />,
    corner: <Corner />,
    sound: <Sound />,
    session: <Session />,
    room: <Room />,
    history: <History />,
  } as const;

  const content = screens[screen];
  const isRoom = screen === 'room';
  const isGlobalScene = roomBackground === 'scene';

  return (
    <div className="app" data-scene={isGlobalScene ? "true" : undefined} style={{ position: 'relative' }}>
      {isGlobalScene && !isRoom && (
        <SceneBackground testid="app-scene-bg" corner={corner} />
      )}
      <AppShell>
        {isRoom ? (
          content
        ) : (
          <div style={nonRoomWrapperStyle}>
            <div style={nonRoomInnerStyle} className="screen-content">
              {content}
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
};

const nonRoomInnerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 1160,
  margin: '0 auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
};

export default App;
