import type { ReactNode } from "react";
import { useStore } from "../store/useStore";
import type { Screen } from "../types";

interface AppShellProps {
  children: ReactNode;
}

const tabs: { label: string; screen: Screen }[] = [
  { label: "Focus", screen: "room" },
  { label: "History", screen: "history" },
];

export function AppShell({ children }: AppShellProps) {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);

  return (
    <>
      <nav style={navStyle} className="nav-bar">
        <button onClick={() => setScreen("room")} style={logoStyle} className="nav-logo" aria-label="mora home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
            <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--accent)" />
            <circle cx="15" cy="10" r="5" fill="var(--bg)" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 18 }}>
            mora<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </button>

        <div style={tabGroupStyle} className="nav-tabs">
          {tabs.map(({ label, screen: target }) => (
            <button
              key={label}
              onClick={() => setScreen(target)}
              className={`nav-tab-btn ${screen === target ? "active" : ""}`}
              style={{
                ...tabStyle,
                background: screen === target ? "var(--accent-soft)" : "transparent",
                color: screen === target ? "var(--accent-txt)" : "var(--ink-2)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative", zIndex: 1 }}>{children}</main>
    </>
  );
}

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  position: "relative",
  flexShrink: 0,
  background: "var(--bg)",
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
