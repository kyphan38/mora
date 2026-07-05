import { useState } from 'react';
import { useStore } from '../store/useStore';
import { DURATIONS } from '../data/durations';
import { Stepper } from '../components/Stepper';

export default function Session() {
  const setup = useStore((s) => s.setup);
  const tasks = useStore((s) => s.tasks);
  const setDuration = useStore((s) => s.setDuration);
  const addTask = useStore((s) => s.addTask);
  const removeTask = useStore((s) => s.removeTask);
  const setScreen = useStore((s) => s.setScreen);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const autoContinue = useStore((s) => s.autoContinue);
  const setAutoContinue = useStore((s) => s.setAutoContinue);

  const [taskInput, setTaskInput] = useState('');

  const handleAddTask = () => {
    addTask(taskInput);
    setTaskInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };



  return (
    <div style={wrapperStyle}>
      <Stepper step={3} />
      <h2 style={headingStyle}>Set up your session</h2>

      <div style={sectionStyle}>
        <label style={labelStyle}>duration</label>
        <div style={chipsStyle}>
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => setDuration(d.label)}
              style={{
                ...chipStyle,
                background: setup.durationLabel === d.label ? 'var(--accent-soft)' : 'transparent',
                color: setup.durationLabel === d.label ? 'var(--accent-txt)' : 'var(--ink-2)',
                borderColor: setup.durationLabel === d.label ? 'var(--accent-line)' : 'var(--line-2)',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>tasks</label>
        {tasks.length === 0 ? (
          <p style={emptyStyle}>No tasks yet.</p>
        ) : (
          <ol style={taskListStyle}>
            {tasks.map((t, i) => (
              <li
                key={t.id}
                style={taskRowStyle}
                className="task-row"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', i.toString());
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                  if (!isNaN(fromIndex) && fromIndex !== i) {
                    reorderTasks(fromIndex, i);
                  }
                }}
              >
                <svg
                  width="12"
                  height="18"
                  viewBox="0 0 12 18"
                  fill="none"
                  className="drag-handle"
                  style={dragHandleStyle}
                >
                  <circle cx="4" cy="4" r="1" fill="currentColor"/>
                  <circle cx="4" cy="9" r="1" fill="currentColor"/>
                  <circle cx="4" cy="14" r="1" fill="currentColor"/>
                  <circle cx="8" cy="4" r="1" fill="currentColor"/>
                  <circle cx="8" cy="9" r="1" fill="currentColor"/>
                  <circle cx="8" cy="14" r="1" fill="currentColor"/>
                </svg>
                <span style={taskNumStyle}>{i + 1}</span>
                <span style={taskNameStyle}>{t.name}</span>
                <button
                  onClick={() => removeTask(t.id)}
                  style={removeBtnStyle}
                  aria-label={`Remove ${t.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
        <p style={helperStyle}>Each task runs as its own session.</p>
        <div style={inputRowStyle}>
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task…"
            style={inputStyle}
          />
          <button onClick={handleAddTask} style={addBtnStyle}>Add</button>
        </div>
      </div>

      <div style={autoContSection}>
        <label style={autoContLabel}>
          <input
            type="checkbox"
            checked={autoContinue}
            onChange={(e) => setAutoContinue(e.target.checked)}
            style={autoContCheckbox}
            data-testid="auto-continue-toggle"
          />
          <span>Auto-continue sessions</span>
        </label>
        <p style={autoContHint}>Run focus → break → focus without asking.</p>
      </div>

      <div style={bottomBarStyle}>
        <div style={summaryStyle}>
          <span>Duration: <strong>{setup.durationLabel}</strong></span>
          <span>Tasks: <strong>{tasks.length}</strong></span>
        </div>
        <div style={btnGroupStyle}>
          <button onClick={() => setScreen('sound')} style={ghostBtnStyle}>Back</button>
        </div>
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  padding: '0 32px 32px',
  flex: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const headingStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  marginBottom: 24,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 10,
  display: 'block',
};

const chipsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const chipStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 'var(--r-pill)',
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'background var(--dur) var(--ease)',
};

const emptyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--ink-3)',
  marginBottom: 8,
};

const taskListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  marginBottom: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const taskRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 12px',
};

const taskNumStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-3)',
  width: 20,
};

const taskNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  color: 'var(--ink)',
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 18,
  color: 'var(--ink-3)',
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
  fontFamily: 'var(--font)',
};

const helperStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink-3)',
  marginBottom: 12,
};

const inputRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 14px',
  fontSize: 14,
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-sm)',
  fontFamily: 'var(--font)',
  outline: 'none',
};

const addBtnStyle: React.CSSProperties = {
  background: 'var(--accent-soft)',
  color: 'var(--accent-txt)',
  border: '1px solid var(--accent-line)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 18px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
};

const dragHandleStyle: React.CSSProperties = {
  cursor: 'grab',
  marginRight: 8,
  flexShrink: 0,
};

const bottomBarStyle: React.CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTop: '1px solid var(--line)',
  paddingTop: 16,
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  fontSize: 14,
  color: 'var(--ink-2)',
};

const btnGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-pill)',
  padding: '8px 22px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--ink-2)',
  fontFamily: 'var(--font)',
};

const autoContSection: React.CSSProperties = {
  marginBottom: 16,
  marginTop: 4,
};

const autoContLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  color: 'var(--ink)',
  cursor: 'pointer',
};

const autoContCheckbox: React.CSSProperties = {
  accentColor: 'var(--accent)',
  cursor: 'pointer',
  width: 16,
  height: 16,
};

const autoContHint: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--ink-3)',
  marginTop: 4,
  marginLeft: 24,
};
