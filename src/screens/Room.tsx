import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  formatTime,
  remainingSec,
  type TimerState,
} from '../lib/timer';
import { breakForSeconds, NEXT_DURATIONS } from '../lib/pomodoro';
import { useOsSync } from '../hooks/useOsSync';
import { sceneUrl, sceneVideoUrl } from '../data/sceneManifest';
import { getAudioEngine } from '../lib/audio';
import { CORNERS } from '../data/corners';
import { AMBIENTS, MUSIC_STYLES } from '../data/sound';
import { DURATIONS } from '../data/durations';

function extractTintColor(gradient: string | undefined): string {
  if (!gradient) return 'rgba(128,128,128,0.05)';
  const match = gradient.match(/#([0-9a-fA-F]{6})/);
  if (!match) return 'rgba(128,128,128,0.05)';
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.08)`;
}

export default function Room() {
  const corner = useStore((s) => s.corner);
  const sound = useStore((s) => s.sound);
  const setup = useStore((s) => s.setup);
  const tasks = useStore((s) => s.tasks);
  const activeTask = useStore((s) => s.activeTask);
  const addTask = useStore((s) => s.addTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const roomBackground = useStore((s) => s.roomBackground);
  const setRoomBackground = useStore((s) => s.setRoomBackground);

  const elapsedSec = useStore((s) => s.elapsedSec);
  const isRunning = useStore((s) => s.isRunning);
  const activeTaskId = useStore((s) => s.activeTaskId);

  const setIsRunning = useStore((s) => s.setIsRunning);
  const tickSession = useStore((s) => s.tickSession);
  const stopFocus = useStore((s) => s.stopFocus);

  // Pomodoro phase
  const phase = useStore((s) => s.phase);
  const lastFocusSec = useStore((s) => s.lastFocusSec);
  const enterReview = useStore((s) => s.enterReview);
  const reviewMarkDone = useStore((s) => s.reviewMarkDone);
  const startBreak = useStore((s) => s.startBreak);
  const finishBreak = useStore((s) => s.finishBreak);
  const focusAgain = useStore((s) => s.focusAgain);
  const stopAllSessions = useStore((s) => s.stopAllSessions);

  const setAmbient = useStore((s) => s.setAmbient);
  const setMusicStyle = useStore((s) => s.setMusicStyle);
  const setAmbientVolume = useStore((s) => s.setAmbientVolume);
  const setMusicVolume = useStore((s) => s.setMusicVolume);
  const setCorner = useStore((s) => s.setCorner);
  const setAudioActive = useStore((s) => s.setAudioActive);
  const setDuration = useStore((s) => s.setDuration);

  const [taskInput, setTaskInput] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [corner?.id]);

  const active = tasks.find((t) => t.id === activeTaskId) || activeTask();
  const activeTaskName = active ? active.name : '';

  const [hasStarted, setHasStarted] = useState(() => elapsedSec > 0);
  const activeIdRef = useRef(active?.id);
  useEffect(() => {
    if (active?.id !== activeIdRef.current) {
      activeIdRef.current = active?.id;
      setHasStarted(false);
    }
  }, [active?.id]);

  const handlePlayPause = useCallback(() => {
    const nextRunning = !isRunning;
    const engine = getAudioEngine();
    if (nextRunning) {
      engine.play();
      setHasStarted(true);
    } else {
      engine.pause();
    }
    setIsRunning(nextRunning);
  }, [isRunning, setIsRunning]);

  const handleStop = useCallback(() => {
    getAudioEngine().pause();
    stopFocus();
    setHasStarted(false);
  }, [stopFocus]);

  const { pushTick } = useOsSync({
    onToggle: handlePlayPause,
    onStop: handleStop,
  });

  // Timer state: for break phase, use breakForSeconds as the total
  const breakDur = breakForSeconds(lastFocusSec);
  const timer = useMemo((): TimerState => {
    if (phase === 'break') {
      return {
        mode: 'countdown',
        totalSec: breakDur,
        elapsedSec,
        running: isRunning,
      };
    }
    return {
      mode: setup.durationSec > 0 ? 'countdown' : 'countup',
      totalSec: setup.durationSec,
      elapsedSec,
      running: isRunning,
    };
  }, [phase, breakDur, setup.durationSec, elapsedSec, isRunning]);

  useEffect(() => {
    if (!active) {
      pushTick(null, '');
    } else {
      pushTick(timer, activeTaskName);
    }
  }, [timer, active, activeTaskName, pushTick]);

  useEffect(() => {
    return () => {
      pushTick(null, '');
    };
  }, [pushTick]);

  // Interval for ticking
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      tickSession();
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, tickSession]);

  const handleCompleteNow = useCallback(() => {
    enterReview();
  }, [enterReview]);

  // Review sheet: "Focus again" expanded
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  // Reset when leaving review
  useEffect(() => {
    if (phase !== 'review') setShowDurationPicker(false);
  }, [phase]);

  const handleAddTask = () => {
    addTask(taskInput);
    setTaskInput('');
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  // State pill
  let pillText = 'Ready';
  if (phase === 'break') pillText = 'Break';
  else if (phase === 'review') pillText = 'Review';
  else if (!active) pillText = 'Done';
  else if (isRunning) pillText = 'Focusing';
  else if (hasStarted || elapsedSec > 0) pillText = 'Paused';

  const tintColor = extractTintColor(corner?.gradient);
  const doneCount = tasks.filter((t) => t.done).length;
  const leftCount = tasks.length - doneCount;

  const isSceneMode = roomBackground === 'scene' && !!corner;

  const immersiveToggleStyle: React.CSSProperties = {
    ...toggleStyle,
    position: 'static',
    top: undefined,
    right: undefined,
  };

  const mainStyleOverride: React.CSSProperties = {
    ...mainStyle,
    background: isSceneMode ? undefined : tintColor,
    backgroundImage: isSceneMode ? `url("${sceneUrl(corner.name)}"), ${corner.gradient}` : undefined,
    backgroundSize: isSceneMode ? 'cover, cover' : undefined,
    backgroundPosition: isSceneMode ? 'center, center' : undefined,
    backgroundRepeat: isSceneMode ? 'no-repeat, no-repeat' : undefined,
  };

  return (
    <div style={layoutStyle}>
      {/* Timer card / main panel */}
      <div style={mainStyleOverride} data-testid="room-main">
        {isSceneMode && (
          /* Full-bleed background layer */
          <div style={bgLayerStyle} data-testid="room-scene-bg">
            <div
              style={{
                ...baseImgStyle,
                backgroundImage: `url("${sceneUrl(corner.name)}"), ${corner.gradient}`
              }}
            />
            {!videoError && (
              <video
                key={corner.id}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setVideoError(true)}
                style={videoStyle}
                data-testid="scene-video"
              >
                <source src={sceneVideoUrl(corner.name)} type="video/mp4" />
              </video>
            )}
            <div style={scrimStyle} />
          </div>
        )}

        {/* Top-right toggle buttons */}
        <div style={immersiveTogglesStyle}>
          {isSceneMode && (
            <button
              onClick={() => setShowTasks(!showTasks)}
              style={tasksToggleBtnStyle}
              data-testid="tasks-toggle-btn"
            >
              {showTasks ? 'Hide Tasks' : 'Tasks'}
            </button>
          )}
          <div style={immersiveToggleStyle} data-testid="room-bg-toggle">
            <button
              onClick={() => setRoomBackground('color')}
              style={toggleBtnStyle(roomBackground === 'color')}
            >
              Color
            </button>
            <button
              onClick={() => setRoomBackground('scene')}
              style={toggleBtnStyle(roomBackground === 'scene')}
            >
              Scene
            </button>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={settingsBtnStyle(isSceneMode)}
            aria-label="Settings"
            data-testid="room-settings-toggle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {isSceneMode ? (
          /* Scene Mode Timer Block (anchored bottom-left) */
          <div style={timerAnchorStyle} data-testid="room-timer-card" className="glass">
            <div style={labelRowStyle}>
              <span style={{...dotStyle, background: phase === 'break' ? '#f59e0b' : undefined}} />
              <span style={immersiveLabelTextStyle}>
                {phase === 'break' ? 'break' : 'current task'}
              </span>
            </div>

            <h2 style={immersiveTaskNameStyle}>
              {phase === 'break' ? 'Rest a little' : (active ? active.name : 'All done')}
            </h2>

            <div style={immersiveTimeStyle}>{formatTime(remainingSec(timer))}</div>
            <div style={immersiveSubLineStyle}>
              {phase === 'break' ? 'Break time left' : (timer.mode === 'countdown' ? 'Time left' : 'Elapsed')}
            </div>

            {phase === 'break' ? (
              <div style={controlsStyle}>
                <button onClick={finishBreak} style={immersiveCtrlBtnStyle} aria-label="Skip break">
                  Skip break
                </button>
              </div>
            ) : active && phase === 'focus' && (
              <div style={controlsStyle}>
                <button onClick={handlePlayPause} style={playBtnStyle} aria-label={timer.running ? 'Pause' : 'Play'}>
                  {timer.running ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>
                <button onClick={handleCompleteNow} style={immersiveCtrlBtnStyle} aria-label="Complete now">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button onClick={handleStop} style={immersiveCtrlBtnStyle} aria-label="Stop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              </div>
            )}

            <div style={immersiveSceneLineStyle}>
              Scene · {corner.name} · {sound.ambient}
            </div>
          </div>
        ) : (
          /* Color Mode Timer Card */
          <div style={cardStyle} data-testid="room-timer-card">
            <div style={topRowStyle}>
              <div style={labelRowStyle}>
                <span style={{...dotStyle, background: phase === 'break' ? '#f59e0b' : undefined}} />
                <span style={labelTextStyle}>
                  {phase === 'break' ? 'break' : 'current task'}
                </span>
              </div>
              <span style={{
                ...pillStyle,
                background: pillText === 'Focusing' ? 'var(--accent-soft)'
                  : pillText === 'Break' ? 'rgba(245,158,11,0.15)'
                  : 'var(--surface-2)',
                color: pillText === 'Focusing' ? 'var(--accent-txt)'
                  : pillText === 'Break' ? '#b45309'
                  : 'var(--ink-3)',
              }}>
                {pillText}
              </span>
            </div>

            <h2 style={taskNameStyle}>
              {phase === 'break' ? 'Rest a little' : (active ? active.name : 'All done')}
            </h2>

            <div style={timeStyle}>{formatTime(remainingSec(timer))}</div>
            <div style={subLineStyle}>
              {phase === 'break' ? 'Break time left' : (timer.mode === 'countdown' ? 'Time left' : 'Elapsed')}
            </div>

            {phase === 'break' ? (
              <div style={controlsStyle}>
                <button onClick={finishBreak} style={ctrlBtnStyle} aria-label="Skip break">
                  Skip break
                </button>
              </div>
            ) : active && phase === 'focus' && (
              <div style={controlsStyle}>
                <button onClick={handlePlayPause} style={playBtnStyle} aria-label={timer.running ? 'Pause' : 'Play'}>
                  {timer.running ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>
                <button onClick={handleCompleteNow} style={ctrlBtnStyle} aria-label="Complete now">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button onClick={handleStop} style={ctrlBtnStyle} aria-label="Stop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              </div>
            )}

            <div style={sceneLineStyle}>
              Scene · {corner?.name ?? '-'} · {sound.ambient}
            </div>
          </div>
        )}
      </div>

      {/* Review sheet overlay */}
      {phase === 'review' && (
        <div style={reviewBackdropStyle}>
          <div
            style={isSceneMode ? reviewSheetSceneStyle : reviewSheetStyle}
            data-testid="review-sheet"
          >
            <h3 style={reviewTitleStyle}>
              Session complete
            </h3>
            <p style={reviewTaskLine}>
              {active ? active.name : 'Task completed'}
            </p>

            {/* Row A: mark done */}
            <div style={reviewRowStyle}>
              <span style={reviewRowLabel}>Finished this task?</span>
              <div style={reviewBtnGroup}>
                <button
                  onClick={() => reviewMarkDone(true)}
                  style={reviewBtnPrimary}
                  data-testid="review-mark-done"
                >
                  Mark done
                </button>
                <button
                  onClick={() => reviewMarkDone(false)}
                  style={reviewBtnGhost}
                  data-testid="review-keep-working"
                >
                  Keep working
                </button>
              </div>
            </div>

            {/* Row B: what's next */}
            <div style={reviewRowStyle}>
              <span style={reviewRowLabel}>What’s next?</span>
              <div style={reviewBtnGroup}>
                <button
                  onClick={startBreak}
                  style={reviewBtnBreak}
                  data-testid="review-take-break"
                >
                  Take a break · {Math.round(breakDur / 60)}m
                </button>
                <button
                  onClick={() => setShowDurationPicker(!showDurationPicker)}
                  style={reviewBtnGhost}
                  data-testid="review-focus-again"
                >
                  Focus again
                </button>
                <button
                  onClick={stopAllSessions}
                  style={reviewBtnGhost}
                  data-testid="review-stop"
                >
                  Stop
                </button>
              </div>
            </div>

            {/* Duration picker (expanded from Focus again) */}
            {showDurationPicker && (
              <div style={reviewDurationRow}>
                {NEXT_DURATIONS.map((d) => (
                  <button
                    key={d.seconds}
                    onClick={() => focusAgain(d.seconds)}
                    style={{
                      ...reviewDurationChip,
                      background: setup.durationSec === d.seconds ? 'var(--accent-soft)' : 'transparent',
                      color: setup.durationSec === d.seconds ? 'var(--accent-txt)' : 'var(--ink-2)',
                      borderColor: setup.durationSec === d.seconds ? 'var(--accent-line)' : 'var(--line-2)',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks panel */}
      {(!isSceneMode || showTasks) && (
        <div style={isSceneMode ? glassSideStyle : sideStyle}>
          <h3 style={isSceneMode ? immersiveSideHeaderStyle : sideHeaderStyle}>Tasks · sessions</h3>

          <div style={addRowStyle}>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={handleTaskKeyDown}
              placeholder="Add a task…"
              style={isSceneMode ? immersiveInputStyle : inputStyle}
            />
            <button onClick={handleAddTask} style={isSceneMode ? immersiveAddBtnStyle : addBtnStyle}>Add</button>
          </div>

          {tasks.length === 0 ? (
            <p style={isSceneMode ? immersiveEmptyStyle : emptyStyle}>No tasks. Add one to begin.</p>
          ) : (
             <div style={taskListStyle}>
              {tasks.map((t, idx) => {
                const isActive = active?.id === t.id;
                return (
                  <div
                    key={t.id}
                    style={{
                      ...taskRowStyle,
                      background: isSceneMode
                        ? (isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)')
                        : (isActive ? 'var(--accent-soft)' : 'var(--surface)'),
                      borderColor: isSceneMode
                        ? (isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)')
                        : 'var(--line)',
                      opacity: t.done ? 0.55 : 1,
                    }}
                    className="task-row"
                  >
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      aria-label={`Toggle ${t.name}`}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{
                      flex: 1,
                      fontSize: 14,
                      textDecoration: t.done ? 'line-through' : 'none',
                      color: isSceneMode ? '#fff' : (t.done ? 'var(--ink-3)' : 'var(--ink)'),
                    }}>
                      {t.name}
                    </span>
                    {isActive && (
                      <span style={isSceneMode ? immersiveNowTagStyle : nowTagStyle}>
                        now
                      </span>
                    )}
                    <div style={reorderBtnGroupStyle}>
                      <button
                        type="button"
                        onClick={() => reorderTasks(idx, idx - 1)}
                        disabled={idx === 0}
                        style={{
                          ...reorderBtnStyle(isSceneMode),
                          visibility: idx === 0 ? 'hidden' : 'visible',
                        }}
                        aria-label={`Move ${t.name} up`}
                        data-testid={`room-task-move-up-${idx}`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderTasks(idx, idx + 1)}
                        disabled={idx === tasks.length - 1}
                        style={{
                          ...reorderBtnStyle(isSceneMode),
                          visibility: idx === tasks.length - 1 ? 'hidden' : 'visible',
                        }}
                        aria-label={`Move ${t.name} down`}
                        data-testid={`room-task-move-down-${idx}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={isSceneMode ? immersiveFooterStyle : footerStyle}>
            <span>{leftCount} left</span>
            <span>{doneCount} done</span>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={backdropStyle} onClick={() => setShowSettings(false)}>
          <div
            style={settingsPanelStyle(isSceneMode)}
            onClick={(e) => e.stopPropagation()}
            data-testid="room-settings-panel"
          >
            {/* Header */}
            <div style={panelHeaderStyle}>
              <h3 style={panelTitleStyle}>Sound & Scene</h3>
              <button
                onClick={() => setShowSettings(false)}
                style={closeBtnStyle(isSceneMode)}
                aria-label="Close settings"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Duration Selection */}
            <div style={panelSectionStyle}>
              <label style={panelLabelStyle(isSceneMode)}>duration</label>
              <div style={panelChipsStyle}>
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setDuration(d.label)}
                    style={{
                      ...panelChipStyle(isSceneMode),
                      background: setup.durationLabel === d.label ? 'var(--accent-soft)' : 'transparent',
                      color: setup.durationLabel === d.label ? 'var(--accent-txt)' : (isSceneMode ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)'),
                      borderColor: setup.durationLabel === d.label ? 'var(--accent-line)' : (isSceneMode ? 'rgba(255,255,255,0.15)' : 'var(--line-2)'),
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ambient Sound Selection */}
            <div style={panelSectionStyle}>
              <label style={panelLabelStyle(isSceneMode)}>ambient sound</label>
              <div style={panelChipsStyle}>
                {AMBIENTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      setAmbient(a);
                      setAudioActive(true);
                      getAudioEngine().play();
                    }}
                    style={{
                      ...panelChipStyle(isSceneMode),
                      background: sound.ambient === a ? 'var(--accent-soft)' : 'transparent',
                      color: sound.ambient === a ? 'var(--accent-txt)' : (isSceneMode ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)'),
                      borderColor: sound.ambient === a ? 'var(--accent-line)' : (isSceneMode ? 'rgba(255,255,255,0.15)' : 'var(--line-2)'),
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Music Style Selection */}
            <div style={panelSectionStyle}>
              <label style={panelLabelStyle(isSceneMode)}>music style</label>
              <div style={panelGridStyle}>
                {MUSIC_STYLES.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMusicStyle(m);
                      setAudioActive(true);
                      getAudioEngine().play();
                    }}
                    style={{
                      ...panelMusicCardStyle(isSceneMode),
                      background: sound.musicStyle === m
                        ? 'var(--accent-soft)'
                        : (isSceneMode ? 'rgba(255,255,255,0.06)' : 'var(--surface-2)'),
                      borderColor: sound.musicStyle === m
                        ? 'var(--accent-line)'
                        : (isSceneMode ? 'rgba(255,255,255,0.15)' : 'var(--line)'),
                      color: sound.musicStyle === m
                        ? 'var(--accent-txt)'
                        : (isSceneMode ? '#fff' : 'var(--ink)'),
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Volumes */}
            <div style={panelSectionStyle}>
              <div style={panelSliderRowStyle}>
                <span style={panelSliderLabelStyle(isSceneMode)}>Ambient Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sound.ambientVolume}
                  onChange={(e) => {
                    setAmbientVolume(Number(e.target.value));
                    setAudioActive(true);
                    getAudioEngine().play();
                  }}
                  aria-label="Ambient volume"
                  className="volume-slider"
                  style={{ flex: 1 }}
                />
                <span style={panelSliderValueStyle(isSceneMode)}>{sound.ambientVolume}%</span>
              </div>
              <div style={panelSliderRowStyle}>
                <span style={panelSliderLabelStyle(isSceneMode)}>Music Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sound.musicVolume}
                  onChange={(e) => {
                    setMusicVolume(Number(e.target.value));
                    setAudioActive(true);
                    getAudioEngine().play();
                  }}
                  aria-label="Music volume"
                  className="volume-slider"
                  style={{ flex: 1 }}
                />
                <span style={panelSliderValueStyle(isSceneMode)}>{sound.musicVolume}%</span>
              </div>
            </div>

            {/* Scene Selector */}
            <div style={panelSectionStyle}>
              <label style={panelLabelStyle(isSceneMode)}>scene</label>
              <div style={panelSceneGridStyle}>
                {CORNERS.map((c) => {
                  const isCurrent = corner?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCorner(c);
                        setAudioActive(true);
                        getAudioEngine().play();
                      }}
                      style={{
                        ...panelSceneItemStyle(isSceneMode),
                        background: isCurrent
                          ? 'var(--accent-soft)'
                          : (isSceneMode ? 'rgba(255,255,255,0.06)' : 'var(--surface-2)'),
                        borderColor: isCurrent
                          ? 'var(--accent-line)'
                          : (isSceneMode ? 'rgba(255,255,255,0.15)' : 'var(--line)'),
                        color: isCurrent
                          ? 'var(--accent-txt)'
                          : (isSceneMode ? '#fff' : 'var(--ink)'),
                      }}
                    >
                      <div
                        style={{
                          height: 48,
                          width: '100%',
                          backgroundImage: `url("${sceneUrl(c.name)}"), ${c.gradient}`,
                          backgroundSize: 'cover, cover',
                          backgroundPosition: 'center, center',
                          backgroundRepeat: 'no-repeat, no-repeat',
                        }}
                      />
                      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          width: '100%',
                        }}>
                          {c.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Styles ---- */

const layoutStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  gap: 0,
  overflow: 'hidden',
  minHeight: 0,
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  height: '100%',
  position: 'relative',
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
  background: 'var(--surface)',
  borderRadius: 'var(--r-lg)',
  padding: '32px 40px',
  boxShadow: 'var(--shadow)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  minWidth: 340,
  maxWidth: 420,
  width: '100%',
};

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
};

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const dotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--accent)',
  animation: 'breathe 4s ease-in-out infinite',
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--ink-3)',
};

const pillStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: '3px 12px',
  borderRadius: 'var(--r-pill)',
};

const taskNameStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--ink)',
  textAlign: 'center',
  margin: '8px 0 4px',
};

const timeStyle: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 300,
  color: 'var(--ink)',
  letterSpacing: '-0.02em',
  lineHeight: 1,
};

const subLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink-3)',
  marginBottom: 8,
};

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 8,
};

const playBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ctrlBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'var(--surface-2)',
  color: 'var(--ink-2)',
  border: '1px solid var(--line)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const sceneLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink-3)',
  marginTop: 12,
};

const sideStyle: React.CSSProperties = {
  width: 340,
  flexShrink: 0,
  borderLeft: '1px solid var(--line)',
  background: 'var(--surface)',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 20px',
  overflow: 'auto',
  height: '100%',
};

const sideHeaderStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 16,
  color: 'var(--ink)',
};

const addRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
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
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
};

const emptyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--ink-3)',
  padding: '20px 0',
};

const taskListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: 1,
};

const taskRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 'var(--r-sm)',
  border: '1px solid',
  WebkitUserSelect: 'none',
  userSelect: 'none',
};

const reorderBtnGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const reorderBtnStyle = (isSceneMode: boolean): React.CSSProperties => ({
  background: 'transparent',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
  color: isSceneMode ? 'rgba(255,255,255,0.6)' : 'var(--ink-3)',
  cursor: 'pointer',
  padding: '4px 8px',
  lineHeight: 1,
  fontSize: 10,
  fontFamily: 'var(--font)',
});

const nowTagStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--accent-txt)',
  background: 'var(--accent-soft)',
  border: '1px solid var(--accent-line)',
  borderRadius: 'var(--r-pill)',
  padding: '2px 8px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  color: 'var(--ink-3)',
  borderTop: '1px solid var(--line)',
  paddingTop: 12,
  marginTop: 12,
};

const bgLayerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1,
};

const baseImgStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

const videoStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const scrimStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%), linear-gradient(0deg, rgba(0,0,0,0.45), rgba(0,0,0,0) 42%)',
};

const immersiveTogglesStyle: React.CSSProperties = {
  position: 'absolute',
  top: 24,
  right: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  zIndex: 20,
};

const tasksToggleBtnStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 'var(--r-pill)',
  padding: '4px 16px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
  fontFamily: 'var(--font)',
  transition: 'background var(--dur) var(--ease)',
};

const timerAnchorStyle: React.CSSProperties = {
  position: 'absolute',
  left: 40,
  bottom: 40,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 12,
  maxWidth: 420,
  color: '#f3f1ea',
};

const immersiveLabelTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'rgba(243,241,234,0.7)',
};

const immersiveTaskNameStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  textAlign: 'left',
  margin: '8px 0 4px',
  color: '#f3f1ea',
};

const immersiveTimeStyle: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 300,
  letterSpacing: '-0.02em',
  lineHeight: 1,
  color: '#f3f1ea',
};

const immersiveSubLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 8,
};

const immersiveSceneLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.4)',
  marginTop: 12,
};

const immersiveCtrlBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.25)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const glassSideStyle: React.CSSProperties = {
  position: 'absolute',
  top: 80,
  bottom: 40,
  right: 40,
  width: 340,
  zIndex: 2,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(20,20,20,.35)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  borderRadius: 'var(--r-lg)',
  boxShadow: 'var(--shadow)',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 20px',
  overflow: 'auto',
};

const immersiveSideHeaderStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  marginBottom: 16,
  color: '#fff',
};

const immersiveInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: 14,
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 'var(--r-sm)',
  fontFamily: 'var(--font)',
  outline: 'none',
};

const immersiveAddBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
};

const immersiveEmptyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.5)',
  padding: '20px 0',
};

const immersiveNowTagStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  background: 'rgba(255,255,255,0.2)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: 'var(--r-pill)',
  padding: '2px 8px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const immersiveFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  color: 'rgba(255,255,255,0.5)',
  borderTop: '1px solid rgba(255,255,255,0.15)',
  paddingTop: 12,
  marginTop: 12,
};

const toggleStyle: React.CSSProperties = {
  position: 'absolute',
  top: 24,
  right: 24,
  display: 'flex',
  background: 'var(--surface-2)',
  borderRadius: 'var(--r-pill)',
  padding: 3,
  border: '1px solid var(--line)',
  zIndex: 10,
};

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  border: 'none',
  borderRadius: 'var(--r-pill)',
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  background: active ? 'var(--accent-soft)' : 'transparent',
  color: active ? 'var(--accent-txt)' : 'var(--ink-2)',
  fontFamily: 'var(--font)',
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
});

const settingsBtnStyle = (isScene: boolean): React.CSSProperties => ({
  border: isScene ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--line)',
  borderRadius: 'var(--r-pill)',
  padding: '4px 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  background: isScene ? 'rgba(255,255,255,0.14)' : 'var(--surface-2)',
  color: isScene ? '#fff' : 'var(--ink-2)',
  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
  fontFamily: 'var(--font)',
});

const backdropStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 30,
  WebkitBackdropFilter: 'blur(4px)',
  backdropFilter: 'blur(4px)',
};

const settingsPanelStyle = (isScene: boolean): React.CSSProperties => ({
  width: 480,
  maxHeight: '90%',
  overflowY: 'auto',
  padding: '24px 28px',
  borderRadius: 'var(--r-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
  border: isScene ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--line)',
  background: isScene ? 'rgba(30, 30, 30, 0.85)' : 'var(--surface)',
  backdropFilter: isScene ? 'blur(20px)' : undefined,
  WebkitBackdropFilter: isScene ? 'blur(20px)' : undefined,
  color: isScene ? '#fff' : 'var(--ink)',
  fontFamily: 'var(--font)',
  position: 'relative',
});

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(128,128,128,0.2)',
  paddingBottom: 12,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
};

const closeBtnStyle = (isScene: boolean): React.CSSProperties => ({
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: isScene ? '#fff' : 'var(--ink-2)',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const panelSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const panelLabelStyle = (isScene: boolean): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: isScene ? 'rgba(255,255,255,0.5)' : 'var(--ink-3)',
});

const panelChipsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const panelChipStyle = (_isScene: boolean): React.CSSProperties => ({
  border: '1px solid',
  borderRadius: 'var(--r-pill)',
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'all var(--dur) var(--ease)',
});

const panelGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 8,
};

const panelMusicCardStyle = (_isScene: boolean): React.CSSProperties => ({
  border: '1px solid',
  borderRadius: 'var(--r-md)',
  padding: '10px 8px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'center',
  fontFamily: 'var(--font)',
  transition: 'all var(--dur) var(--ease)',
});

const panelSliderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const panelSliderLabelStyle = (isScene: boolean): React.CSSProperties => ({
  width: 100,
  fontSize: 13,
  color: isScene ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)',
});

const panelSliderValueStyle = (isScene: boolean): React.CSSProperties => ({
  width: 36,
  fontSize: 13,
  textAlign: 'right',
  color: isScene ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)',
});

const panelSceneGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 8,
};

const panelSceneItemStyle = (_isScene: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  border: '1px solid',
  borderRadius: 'var(--r-md)',
  overflow: 'hidden',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  textAlign: 'left',
  transition: 'transform var(--dur) var(--ease), border-color var(--dur) var(--ease)',
});

/* ── Review sheet styles ─────────────────────────── */

const reviewBackdropStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 50,
  background: 'rgba(0,0,0,0.25)',
  padding: 24,
};

const reviewSheetBase: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  borderRadius: 'var(--r-lg, 16px)',
  padding: '28px 28px 24px',
  fontFamily: 'var(--font)',
};

const reviewSheetStyle: React.CSSProperties = {
  ...reviewSheetBase,
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

const reviewSheetSceneStyle: React.CSSProperties = {
  ...reviewSheetBase,
  background: 'rgba(18,20,18,0.72)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(20px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
  color: '#fff',
};

const reviewTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 4,
};

const reviewTaskLine: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.65,
  marginBottom: 20,
};

const reviewRowStyle: React.CSSProperties = {
  marginBottom: 16,
};

const reviewRowLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  opacity: 0.5,
  marginBottom: 8,
};

const reviewBtnGroup: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const reviewBtnBase: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 'var(--r-pill, 100px)',
  padding: '7px 18px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'background 0.15s ease',
};

const reviewBtnPrimary: React.CSSProperties = {
  ...reviewBtnBase,
  background: 'var(--accent-soft)',
  color: 'var(--accent-txt)',
  borderColor: 'var(--accent-line)',
};

const reviewBtnGhost: React.CSSProperties = {
  ...reviewBtnBase,
  background: 'transparent',
  color: 'inherit',
  borderColor: 'var(--line-2, rgba(255,255,255,0.2))',
};

const reviewBtnBreak: React.CSSProperties = {
  ...reviewBtnBase,
  background: 'rgba(245,158,11,0.15)',
  color: '#b45309',
  borderColor: 'rgba(245,158,11,0.3)',
};

const reviewDurationRow: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 8,
  flexWrap: 'wrap',
};

const reviewDurationChip: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 'var(--r-pill, 100px)',
  padding: '5px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
};

