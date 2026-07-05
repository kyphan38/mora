import { useStore } from '../store/useStore';

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function isToday(epochMs: number): boolean {
  const now = new Date();
  const d = new Date(epochMs);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isYesterday(epochMs: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(epochMs);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

export function dayLabel(epochMs: number): string {
  if (isToday(epochMs)) return 'Today';
  if (isYesterday(epochMs)) return 'Yesterday';
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function History() {
  const sessions = useStore((s) => s.sessions);
  const clearSessions = useStore((s) => s.clearSessions);

  const todaySessions = sessions.filter((s) => isToday(s.endedAt));
  const sessionsToday = todaySessions.length;
  const focusedToday = todaySessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <h2 style={headingStyle}>History</h2>
        <button onClick={clearSessions} style={clearBtnStyle}>Clear</button>
      </div>

      <div style={statsRowStyle}>
        <div style={statCardStyle}>
          <span style={statValueStyle}>{sessionsToday}</span>
          <span style={statLabelStyle}>Sessions today</span>
        </div>
        <div style={statCardStyle}>
          <span style={statValueStyle}>{formatMinutes(focusedToday)}</span>
          <span style={statLabelStyle}>Focused today</span>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p style={emptyStyle}>No sessions yet.</p>
      ) : (
        <div style={listStyle}>
          {sessions.map((s) => (
            <div key={s.id} style={rowStyle}>
              <span style={dotStyle} />
              <span style={taskNameStyle}>{s.taskName}</span>
              <span style={metaStyle}>
                {dayLabel(s.endedAt)} · {formatClock(s.endedAt)}
              </span>
              <span style={minutesStyle}>{s.minutes}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  padding: '0 32px 32px',
  flex: 1,
  overflow: 'auto',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
  paddingTop: 16,
};

const headingStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
};

const clearBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-pill)',
  padding: '6px 18px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--ink-3)',
  fontFamily: 'var(--font)',
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  marginBottom: 24,
};

const statCardStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  color: 'var(--ink)',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink-3)',
  fontWeight: 500,
};

const emptyStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--ink-3)',
  padding: '40px 0',
  textAlign: 'center',
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)',
  padding: '12px 16px',
};

const dotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--accent)',
  flexShrink: 0,
};

const taskNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--ink)',
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink-3)',
};

const minutesStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--ink-2)',
  minWidth: 48,
  textAlign: 'right',
};
