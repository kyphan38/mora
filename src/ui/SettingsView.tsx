import { useState } from 'react';
import { useStore } from '../store/useStore';
import { loadTheme, saveTheme, type Theme } from '../platform/prefs';
import { Words, Label } from './Words';

export function SettingsView() {
  const roomBackground = useStore((s) => s.roomBackground);
  const setRoomBackground = useStore((s) => s.setRoomBackground);
  const autoContinue = useStore((s) => s.autoContinue);
  const setAutoContinue = useStore((s) => s.setAutoContinue);
  const sessionCount = useStore((s) => s.sessions.length);
  const clearSessions = useStore((s) => s.clearSessions);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-7">
      <h2 className="text-[17px] font-medium">Settings</h2>
      <section>
        <Label>theme</Label>
        <Words
          label="Theme"
          options={[
            { value: 'system', label: 'system' },
            { value: 'light', label: 'light' },
            { value: 'dark', label: 'dark' },
          ]}
          value={theme}
          onChange={(t) => {
            setTheme(t);
            saveTheme(t);
          }}
        />
      </section>

      <section>
        <Label>focus background</Label>
        <div data-testid="room-bg-toggle">
          <Words
            label="Focus background"
            options={[
              { value: 'color', label: 'plain' },
              { value: 'scene', label: 'scene' },
            ]}
            value={roomBackground}
            onChange={setRoomBackground}
          />
        </div>
      </section>

      <section>
        <Label>after a session</Label>
        <Words
          label="After a session"
          options={[
            { value: 'ask', label: 'ask' },
            { value: 'auto', label: 'break, then next task' },
          ]}
          value={autoContinue ? 'auto' : 'ask'}
          onChange={(v) => setAutoContinue(v === 'auto')}
        />
      </section>

      <section>
        <Label>history</Label>
        {confirmClear ? (
          <div className="flex items-baseline gap-4 text-[14px]">
            <span className="text-muted">Delete all {sessionCount} sessions?</span>
            <button
              type="button"
              className="text-ink"
              onClick={() => {
                clearSessions();
                setConfirmClear(false);
              }}
            >
              Clear all
            </button>
            <button type="button" className="text-faint hover:text-ink" onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-[14px] text-faint hover:text-ink disabled:opacity-50"
            disabled={sessionCount === 0}
            onClick={() => setConfirmClear(true)}
          >
            Clear history
          </button>
        )}
      </section>

      <p className="font-mono text-[11px] text-faint">⌘⇧M play / pause from anywhere (desktop)</p>
    </div>
  );
}
