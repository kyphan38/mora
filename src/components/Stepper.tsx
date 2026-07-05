const STEPS = ['Focus corner', 'Sound', 'Session'] as const;

interface StepperProps {
  step: 1 | 2 | 3;
}

export function Stepper({ step }: StepperProps) {
  return (
    <div style={containerStyle}>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isDone = num < step;
        const isActive = num === step;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div
                style={{
                  width: 32,
                  height: 2,
                  background: isDone || isActive ? 'var(--accent)' : 'var(--line-2)',
                  margin: '0 8px',
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                data-testid={`step-badge-${num}`}
                data-step-state={isDone ? 'done' : isActive ? 'active' : 'upcoming'}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  ...(isDone
                    ? { background: 'var(--accent-soft)', color: 'var(--accent-txt)' }
                    : isActive
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'transparent', border: '1.5px solid var(--ink-3)', color: 'var(--ink-3)' }),
                }}
              >
                {isDone ? '✓' : num}
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: isDone || isActive ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 0',
};
