import type { ReactNode } from "react";
import { useStore } from "../store/useStore";
import type { Screen } from "../types";

interface AppShellProps {
  children: ReactNode;
}

const tabMap: { label: string; screen: Screen }[] = [
  { label: "Start", screen: "corner" },
  { label: "Focus", screen: "room" },
  { label: "History", screen: "history" },
];

function getActiveTab(screen: Screen): string {
  if (screen === "corner" || screen === "sound" || screen === "session") return "Start";
  if (screen === "room") return "Focus";
  if (screen === "history") return "History";
  return "";
}

export function AppShell({ children }: AppShellProps) {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const roomBackground = useStore((s) => s.roomBackground);
  const setRoomBackground = useStore((s) => s.setRoomBackground);
  const randomScene = useStore((s) => s.randomScene);
  const tasks = useStore((s) => s.tasks);
  const startFocus = useStore((s) => s.startFocus);

  const activeTab = getActiveTab(screen);
  const showTabs = screen !== "landing";
  const isSceneMode = roomBackground === 'scene';

  return (
    <>
      <nav style={navStyle} className="nav-bar">
        <button onClick={() => setScreen("landing")} style={logoStyle} className="nav-logo" aria-label="mora home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
            <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)" />
            <circle cx="15" cy="10" r="5" fill="var(--bg)" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 18 }}>
            mora<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </button>

        {showTabs && (
          <div style={tabGroupStyle} className="nav-tabs">
            {tabMap.map(({ label, screen: targetScreen }) => (
              <button
                key={label}
                onClick={() => setScreen(targetScreen)}
                className={`nav-tab-btn ${activeTab === label ? "active" : ""}`}
                style={{
                  ...tabStyle,
                  background: activeTab === label ? "var(--accent-soft)" : "transparent",
                  color: activeTab === label ? "var(--accent-txt)" : "var(--ink-2)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Right side: Global Color / Scene toggle + Shuffle button */}
        {screen !== 'room' && (
          <div style={navRightStyle} className="nav-actions">
            {screen === 'corner' && (
              <button onClick={() => setScreen('sound')} style={primaryHeaderBtnStyle(isSceneMode)}>
                Sound →
              </button>
            )}
            {screen === 'sound' && (
              <button onClick={() => setScreen('session')} style={primaryHeaderBtnStyle(isSceneMode)}>
                Session & tasks →
              </button>
            )}
            {screen === 'session' && (
              <button
                onClick={() => startFocus()}
                disabled={tasks.length === 0}
                style={{
                  ...primaryHeaderBtnStyle(isSceneMode),
                  opacity: tasks.length === 0 ? 0.4 : 1,
                  cursor: tasks.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Start focus
              </button>
            )}

            {isSceneMode && (
              <button
                onClick={randomScene}
                style={shuffleBtnStyle(isSceneMode)}
                aria-label="Shuffle scene"
                data-testid="scene-shuffle"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="7" cy="7" r="1.5" />
                  <circle cx="17" cy="17" r="1.5" />
                  <circle cx="7" cy="17" r="1.5" />
                  <circle cx="17" cy="7" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                </svg>
              </button>
            )}

            <div style={appearanceToggleStyle(isSceneMode)} data-testid="appearance-toggle">
              <button
                onClick={() => setRoomBackground('color')}
                style={toggleBtnStyle(roomBackground === 'color', isSceneMode)}
              >
                Color
              </button>
              <button
                onClick={() => setRoomBackground('scene')}
                style={toggleBtnStyle(roomBackground === 'scene', isSceneMode)}
              >
                Scene
              </button>
            </div>
          </div>
        )}
      </nav>
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
    </>
  );
}

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  position: "relative",
};

const logoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  color: "var(--ink)",
};

const tabGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  background: "var(--surface-2)",
  borderRadius: "var(--r-pill)",
  padding: 4,
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
};

const tabStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "var(--r-pill)",
  padding: "6px 18px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)",
  fontFamily: "var(--font)",
};

const navRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  zIndex: 10,
};

const appearanceToggleStyle = (isScene: boolean): React.CSSProperties => ({
  display: "flex",
  background: isScene ? "rgba(0,0,0,0.28)" : "var(--surface-2)",
  borderRadius: "var(--r-pill)",
  padding: 3,
  border: isScene ? "1px solid rgba(255,255,255,0.18)" : "1px solid var(--line)",
  backdropFilter: isScene ? "blur(14px)" : undefined,
  WebkitBackdropFilter: isScene ? "blur(14px)" : undefined,
});

const toggleBtnStyle = (active: boolean, isScene: boolean): React.CSSProperties => ({
  border: "none",
  borderRadius: "var(--r-pill)",
  padding: "4px 12px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  background: active
    ? (isScene ? "rgba(255,255,255,0.9)" : "var(--accent-soft)")
    : "transparent",
  color: active
    ? (isScene ? "var(--accent-txt)" : "var(--accent-txt)")
    : (isScene ? "rgba(243,241,234,0.75)" : "var(--ink-2)"),
  fontFamily: "var(--font)",
  transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)",
});

const shuffleBtnStyle = (isScene: boolean): React.CSSProperties => ({
  border: isScene ? "1px solid rgba(255,255,255,0.18)" : "1px solid var(--line)",
  borderRadius: "var(--r-pill)",
  padding: "5px 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  background: isScene ? "rgba(0,0,0,0.28)" : "var(--surface-2)",
  color: isScene ? "rgba(243,241,234,0.9)" : "var(--ink-2)",
  backdropFilter: isScene ? "blur(14px)" : undefined,
  WebkitBackdropFilter: isScene ? "blur(14px)" : undefined,
  transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)",
});

const primaryHeaderBtnStyle = (_isScene: boolean): React.CSSProperties => ({
  background: 'var(--accent)',
  color: '#ffffff',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--r-pill)',
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'background var(--dur) var(--ease), opacity var(--dur) var(--ease)',
});
