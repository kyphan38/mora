import { useStore } from "../store/useStore";
import { formatTime } from "../lib/timer";

export default function Landing() {
  const setScreen = useStore((s) => s.setScreen);
  const sessionActive = useStore((s) => s.sessionActive);
  const stopFocus = useStore((s) => s.stopFocus);
  const activeTask = useStore((s) => s.activeTask);
  const setup = useStore((s) => s.setup);
  const elapsedSec = useStore((s) => s.elapsedSec);

  const active = activeTask();
  const remaining = setup.durationSec > 0 ? Math.max(0, setup.durationSec - elapsedSec) : elapsedSec;

  return (
    <div style={containerStyle}>
      <p style={kickerStyle}>FOCUS · LEARN · GROW</p>
      <h1 style={headingStyle}>Open your focus corner</h1>

      {sessionActive && active && (
        <div style={continueBlockStyle}>
          <div style={continueHeaderStyle}>Continue a previous session</div>
          <div style={continueBodyStyle}>
            <strong>{active.name}</strong> · {formatTime(remaining)} left
          </div>
          <div style={continueActionsStyle}>
            <button onClick={() => setScreen("room")} style={resumeBtnStyle}>
              Resume
            </button>
            <button onClick={stopFocus} style={dismissBtnStyle} aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setScreen("corner")} style={ctaStyle}>
        Start a focus session
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
};

const kickerStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.15em",
  color: "var(--ink-3)",
  textTransform: "uppercase",
};

const headingStyle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 600,
  color: "var(--ink)",
  textAlign: "center",
  marginBottom: 12,
};

const ctaStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "var(--accent-soft)",
  color: "var(--accent-txt)",
  border: "1px solid var(--accent-line)",
  borderRadius: "var(--r-pill)",
  padding: "12px 28px",
  fontSize: 16,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font)",
  transition: "background var(--dur) var(--ease)",
};

const continueBlockStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  width: 320,
  textAlign: 'center',
  marginBottom: 8,
};

const continueHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const continueBodyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--ink)',
};

const continueActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
};

const resumeBtnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r-pill)',
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
};

const dismissBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--ink-3)',
  fontSize: 16,
  cursor: 'pointer',
  padding: '4px 8px',
};
