import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatTime, remainingSec } from '../core/timer';
import { sessionTimer } from '../core/sessionTimer';
import { getAudioEngine } from '../platform/audio';
import { askNotificationPermissionOnce } from '../platform/pwa';
import { setFullscreen, onFullscreenExit } from '../platform/fullscreen';
import { useIdle } from '../hooks/useIdle';
import { useShortcuts } from '../hooks/useShortcuts';
import { Ring } from './Ring';
import { HoldButton } from './HoldButton';
import { RollingDigits } from './RollingDigits';
import { Sheet } from './Sheet';
import { TaskList } from './TaskList';
import { ReviewSheet } from './ReviewSheet';
import { SoundSheet } from './SoundSheet';
import { NoteSheet } from './NoteSheet';
import { DurationPicker } from './DurationPicker';
import { PlayIcon, PauseIcon, HistoryIcon, SettingsIcon, SoundIcon, NoteIcon, ZenIcon } from './Icons';

const WORD = 'text-[13px] text-faint transition-[color,opacity] duration-300 hover:text-ink';
const ICON = 'p-2 text-faint transition-colors hover:text-ink';

type SheetName = 'tasks' | 'sound' | 'note' | null;

/** The clock is the screen; everything else opens as a sheet over it. */
export function FocusView() {
  const phase = useStore((s) => s.phase);
  const lastFocusSec = useStore((s) => s.lastFocusSec);
  const longBreak = useStore((s) => s.longBreak);
  const setup = useStore((s) => s.setup);
  const elapsedSec = useStore((s) => s.elapsedSec);
  const isRunning = useStore((s) => s.isRunning);
  const sessionActive = useStore((s) => s.sessionActive);
  const tasks = useStore((s) => s.tasks);
  const notes = useStore((s) => s.notes);
  const screen = useStore((s) => s.screen);
  const corner = useStore((s) => s.corner);
  const scene = useStore((s) => s.roomBackground === 'scene');
  const muted = useStore((s) => s.muted);
  const setScreen = useStore((s) => s.setScreen);
  const setIsRunning = useStore((s) => s.setIsRunning);
  const startFocus = useStore((s) => s.startFocus);
  const stopFocus = useStore((s) => s.stopFocus);
  const enterReview = useStore((s) => s.enterReview);
  const finishBreak = useStore((s) => s.finishBreak);
  const setMuted = useStore((s) => s.setMuted);
  const setCustomDuration = useStore((s) => s.setCustomDuration);

  const [sheet, setSheet] = useState<SheetName>(null);
  const [zen, setZen] = useState(false);
  // Counts finished focus blocks (focus -> review) so the ring can settle once.
  const [settleKey, setSettleKey] = useState(0);
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current === 'focus' && phase === 'review') setSettleKey((k) => k + 1);
    prevPhase.current = phase;
  }, [phase]);

  const active = tasks.find((t) => !t.done);
  const left = tasks.filter((t) => !t.done).length;
  const timer = sessionTimer({ phase, lastFocusSec, longBreak, setup, elapsedSec, isRunning });
  const isBreak = phase === 'break';
  const idle = phase === 'focus' && !isRunning && elapsedSec === 0;
  const started = sessionActive && phase === 'focus' && (isRunning || elapsedSec > 0);
  const canPlay = !!active && phase === 'focus';
  // Count up has no end, so the ring shows the current hour.
  const progress = timer.mode === 'countdown' ? timer.elapsedSec / timer.totalSec : (timer.elapsedSec % 3600) / 3600;
  // Chrome steps back while a focus block runs and the user is away.
  const away = useIdle(4000, (isRunning && phase === 'focus' && sheet === null) || zen);

  useEffect(() => onFullscreenExit(() => setZen(false)), []);
  const toggleZen = () => {
    const next = !zen;
    setZen(next);
    setFullscreen(next);
  };

  const playPause = () => {
    if (!canPlay) return;
    // The first Play starts a session; play() runs inside the tap for autoplay rules.
    if (!useStore.getState().sessionActive) {
      startFocus();
      askNotificationPermissionOnce();
    }
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

  useShortcuts(
    {
      Space: playPause,
      Enter: () => started && enterReview(),
      s: () => isBreak && finishBreak(),
      z: toggleZen,
      Escape: () => zen && toggleZen(),
      n: () => setSheet('tasks'),
      q: () => setSheet('note'),
      m: () => setMuted(!muted),
      h: () => setScreen('history'),
      '?': () => setScreen('settings'),
    },
    sheet === null && screen === 'focus' && phase !== 'review',
  );

  const chrome = `transition-opacity duration-700 ${away ? 'opacity-10' : 'opacity-100'}`;
  const breakLabel = longBreak ? 'long break' : 'break';

  return (
    <div className="flex min-h-dvh flex-col items-center px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`flex min-h-6 w-full max-w-xl items-baseline font-mono text-[11px] text-faint ${chrome}`}>
        {scene && corner && !zen && <span className="truncate" data-testid="scene-name">{corner.name}</span>}
      </div>

      <section className="flex w-full flex-1 flex-col items-center justify-center gap-8" data-testid="room-timer-card">
        <Ring
          progress={isBreak || !idle ? progress : 0}
          settleKey={settleKey}
          breath={isBreak}
          adjust={idle && !zen ? { minutes: setup.durationSec / 60, onChange: setCustomDuration } : undefined}
        >
          {/* Phase or task changes cross-fade the middle of the ring. */}
          <div key={`${phase}-${active?.id ?? 'none'}`} className="rise flex max-w-full flex-col items-center">
            {active || isBreak ? (
              <p className="flex max-w-full items-center gap-2 text-[14px] text-muted">
                {isRunning && <span className="breathe h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />}
                <span className="truncate">{isBreak ? breakLabel : active!.name}</span>
              </p>
            ) : (
              <button type="button" className="text-[14px] text-faint hover:text-ink" onClick={() => setSheet('tasks')}>
                Add a task to begin
              </button>
            )}
            <div className="digits mt-2 text-[clamp(52px,15vw,84px)] leading-none font-extralight">
              <RollingDigits text={formatTime(remainingSec(timer))} roll={!idle} />
            </div>
            <p className="mt-3 text-[12px] text-faint">
              {isBreak ? 'Break time left' : timer.mode === 'countdown' ? 'Time left' : 'Elapsed'}
              {!isBreak && active?.est ? ` · ${active.blocks ?? 0}/${active.est}` : ''}
            </p>
          </div>
        </Ring>

        {!zen && (
          <div className="flex min-h-8 items-center">
            {idle && (
              <div className="fade-in">
                <DurationPicker />
              </div>
            )}
            {isBreak && notes.length > 0 && (
              <button type="button" className={WORD} onClick={() => setSheet('tasks')}>
                {notes.length} parked {notes.length === 1 ? 'thought' : 'thoughts'}
              </button>
            )}
          </div>
        )}

        <div className={`flex min-h-14 items-center justify-center gap-8 ${zen ? chrome : ''}`}>
          {isBreak ? (
            <button type="button" className={WORD} onClick={finishBreak} aria-label="Skip break">
              skip break
            </button>
          ) : (
            canPlay && (
              <>
                <button
                  type="button"
                  className={`${WORD} w-10 ${started && !zen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  onClick={enterReview}
                  aria-label="Complete now"
                >
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
                <div className={`transition-opacity duration-300 ${started && !zen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                  <HoldButton label="stop" ariaLabel="Stop" className={WORD} onHold={stop} />
                </div>
              </>
            )
          )}
        </div>
      </section>

      {zen ? (
        <button type="button" className={`py-2 text-[12px] text-faint hover:text-ink ${chrome}`} onClick={toggleZen}>
          exit zen
        </button>
      ) : (
        <nav className={`flex w-full max-w-xl items-center justify-between ${chrome}`} aria-label="Places">
          <div className="flex items-center">
            <button type="button" className={ICON} onClick={() => setScreen('history')} aria-label="History">
              <HistoryIcon />
            </button>
            <button type="button" className={ICON} onClick={() => setSheet('note')} aria-label="Park a thought">
              <NoteIcon />
            </button>
          </div>
          <button
            type="button"
            className="px-3 py-2 text-[13px] text-faint hover:text-ink"
            onClick={() => setSheet('tasks')}
            data-testid="tasks-toggle-btn"
          >
            {left === 0 ? 'tasks' : `${left} ${left === 1 ? 'task' : 'tasks'}`}
            {notes.length > 0 ? ` · ${notes.length} parked` : ''} ▴
          </button>
          <div className="flex items-center">
            <button type="button" className={ICON} onClick={() => setSheet('sound')} aria-label="Sound and scene" data-testid="room-settings-toggle">
              <SoundIcon />
            </button>
            <button type="button" className={ICON} onClick={toggleZen} aria-label="Zen mode">
              <ZenIcon />
            </button>
            <button type="button" className={ICON} onClick={() => setScreen('settings')} aria-label="Settings">
              <SettingsIcon />
            </button>
          </div>
        </nav>
      )}

      <Sheet open={sheet === 'tasks'} label="Tasks" onClose={closeSheet} testId="tasks-sheet">
        <TaskList />
      </Sheet>
      <SoundSheet open={sheet === 'sound'} onClose={closeSheet} />
      <NoteSheet open={sheet === 'note'} onClose={closeSheet} />
      <ReviewSheet open={phase === 'review'} />
    </div>
  );
}
