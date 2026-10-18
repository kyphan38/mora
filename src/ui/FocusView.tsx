import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatTime, remainingSec } from '../core/timer';
import { sessionTimer } from '../core/sessionTimer';
import { DURATIONS } from '../data/durations';
import { getAudioEngine } from '../platform/audio';
import { useIdle } from '../hooks/useIdle';
import { Ring } from './Ring';
import { Sheet } from './Sheet';
import { TaskList } from './TaskList';
import { ReviewSheet } from './ReviewSheet';
import { SoundSheet } from './SoundSheet';
import { Words } from './Words';
import { PlayIcon, PauseIcon, HistoryIcon, SettingsIcon, SoundIcon } from './Icons';

const WORD = 'text-[13px] text-faint transition-[color,opacity] duration-300 hover:text-ink';
const ICON = 'p-2 text-faint transition-colors hover:text-ink';

/** The clock is the screen; everything else opens as a sheet over it. */
export function FocusView() {
  const phase = useStore((s) => s.phase);
  const lastFocusSec = useStore((s) => s.lastFocusSec);
  const setup = useStore((s) => s.setup);
  const elapsedSec = useStore((s) => s.elapsedSec);
  const isRunning = useStore((s) => s.isRunning);
  const sessionActive = useStore((s) => s.sessionActive);
  const tasks = useStore((s) => s.tasks);
  const setScreen = useStore((s) => s.setScreen);
  const setDuration = useStore((s) => s.setDuration);
  const setIsRunning = useStore((s) => s.setIsRunning);
  const startFocus = useStore((s) => s.startFocus);
  const stopFocus = useStore((s) => s.stopFocus);
  const enterReview = useStore((s) => s.enterReview);
  const finishBreak = useStore((s) => s.finishBreak);

  const [sheet, setSheet] = useState<'tasks' | 'sound' | null>(null);

  const active = tasks.find((t) => !t.done);
  const left = tasks.filter((t) => !t.done).length;
  const timer = sessionTimer({ phase, lastFocusSec, setup, elapsedSec, isRunning });
  const isBreak = phase === 'break';
  const idle = phase === 'focus' && !isRunning && elapsedSec === 0;
  const started = sessionActive && phase === 'focus' && (isRunning || elapsedSec > 0);
  // Count up has no end, so the ring shows the current hour.
  const progress = timer.mode === 'countdown' ? timer.elapsedSec / timer.totalSec : (timer.elapsedSec % 3600) / 3600;
  // Chrome steps back while a focus block runs and the user is away.
  const away = useIdle(4000, isRunning && phase === 'focus' && sheet === null);

  const playPause = () => {
    // The first Play starts a session; play() runs inside the click for autoplay rules.
    if (!useStore.getState().sessionActive) startFocus();
    const engine = getAudioEngine();
    if (isRunning) engine.pause();
    else engine.play();
    setIsRunning(!isRunning);
  };

  const stop = () => {
    getAudioEngine().pause();
    stopFocus();
  };

  const closeSheet = () => {
    if (sheet === 'sound' && !useStore.getState().isRunning) getAudioEngine().pause();
    setSheet(null);
  };

  const chrome = `transition-opacity duration-700 ${away ? 'opacity-10' : 'opacity-100'}`;

  return (
    <div className="flex min-h-dvh flex-col items-center px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <section className="flex w-full flex-1 flex-col items-center justify-center gap-8" data-testid="room-timer-card">
        <Ring progress={isBreak || !idle ? progress : 0}>
          {/* Phase or task changes cross-fade the middle of the ring. */}
          <div key={`${phase}-${active?.id ?? 'none'}`} className="rise flex max-w-full flex-col items-center">
          {active || isBreak ? (
            <p className="flex max-w-full items-center gap-2 text-[14px] text-muted">
              {isRunning && <span className="breathe h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />}
              <span className="truncate">{isBreak ? 'break' : active!.name}</span>
            </p>
          ) : (
            <button type="button" className="text-[14px] text-faint hover:text-ink" onClick={() => setSheet('tasks')}>
              Add a task to begin
            </button>
          )}
          <div className="digits mt-2 text-[clamp(52px,15vw,84px)] leading-none font-extralight">
            {formatTime(remainingSec(timer))}
          </div>
          <p className="mt-3 text-[12px] text-faint">
            {isBreak ? 'Break time left' : timer.mode === 'countdown' ? 'Time left' : 'Elapsed'}
          </p>
          </div>
        </Ring>

        <div className="flex min-h-8 items-center">
          {idle && (
            <div className="fade-in">
            <Words
              label="Duration"
              options={DURATIONS.map((d) => ({ value: d.label, label: d.label === 'Count Up' ? 'count up' : d.label }))}
              value={setup.durationLabel}
              onChange={setDuration}
            />
            </div>
          )}
        </div>

        <div className="flex min-h-14 items-center justify-center gap-8">
          {isBreak ? (
            <button type="button" className={WORD} onClick={finishBreak} aria-label="Skip break">
              skip break
            </button>
          ) : (
            active &&
            phase === 'focus' && (
              <>
                <button type="button" className={`${WORD} w-10 ${started ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={enterReview} aria-label="Complete now">
                  done
                </button>
                <button
                  type="button"
                  onClick={playPause}
                  aria-label={isRunning ? 'Pause' : 'Play'}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-bg transition-transform active:scale-95"
                >
                  <span key={isRunning ? 'pause' : 'play'} className="pop flex">
                    {isRunning ? <PauseIcon /> : <PlayIcon />}
                  </span>
                </button>
                <button type="button" className={`${WORD} w-10 ${started ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={stop} aria-label="Stop">
                  stop
                </button>
              </>
            )
          )}
        </div>
      </section>

      <nav className={`flex w-full max-w-xl items-center justify-between ${chrome}`} aria-label="Places">
        <button type="button" className={ICON} onClick={() => setScreen('history')} aria-label="History">
          <HistoryIcon />
        </button>
        <button type="button" className="px-3 py-2 text-[13px] text-faint hover:text-ink" onClick={() => setSheet('tasks')} data-testid="tasks-toggle-btn">
          {left === 0 ? 'tasks' : `${left} ${left === 1 ? 'task' : 'tasks'}`} ▴
        </button>
        <div className="flex items-center">
          <button type="button" className={ICON} onClick={() => setSheet('sound')} aria-label="Sound and scene" data-testid="room-settings-toggle">
            <SoundIcon />
          </button>
          <button type="button" className={ICON} onClick={() => setScreen('settings')} aria-label="Settings">
            <SettingsIcon />
          </button>
        </div>
      </nav>

      <Sheet open={sheet === 'tasks'} label="Tasks" onClose={closeSheet} testId="tasks-sheet">
        <TaskList />
      </Sheet>
      <SoundSheet open={sheet === 'sound'} onClose={closeSheet} />
      <ReviewSheet open={phase === 'review'} />
    </div>
  );
}
