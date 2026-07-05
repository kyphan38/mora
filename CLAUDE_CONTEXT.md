# CLAUDE_CONTEXT.md — mora (handoff for Claude Code)

> **Read this first, then read the repo's `context.md`** (the living, detailed source of truth updated after every change). This file is the high-level orientation + current-status handoff; `context.md` has the exact file/test inventory. If the two ever disagree, trust `context.md` and the actual code, and reconcile.

---

## 1. Product overview
**mora** is a **local-first, single-user desktop focus app** (Pomodoro-style). Offline, English-only, no accounts/auth. You pick a *focus corner* (scene), a *sound* (ambient + music + volumes), and a *duration*, add tasks, and run timed focus sessions. **Model: 1 task = 1 session**; finished sessions are logged to a local **History**. There is a global **Color / Scene** appearance mode (Scene = immersive photo/video background).

Design intent: minimal, calm, "quiet-luxury" aesthetic. Reference feel: innook.space (immersive scene + floating minimal timer), but mora is its own brand and simplified (no sign-in, no language switcher).

---

## 2. Tech stack & key decisions
- **Tauri v2** (Rust shell) — chosen for lightweight cross-platform (macOS + Linux), reusing the web frontend, and OS-level features (global hotkey, menu-bar/tray timer).
- **React 18 + TypeScript 5**, **Vite 5**.
- **Zustand 4** — single typed store (`src/store/useStore.ts`) is the state hub.
- **Vitest 2 + @testing-library/react + jsdom** — every feature ships tests.
- **Font: Hanken Grotesk** bundled offline via `@fontsource` (no CDN).
- **Tauri plugins**: `@tauri-apps/plugin-store` (persistence file `mora.json`), `@tauri-apps/plugin-global-shortcut` (hotkey), `@tauri-apps/plugin-notification` (session-complete notification).
- **Theme**: "Paper" (light cool-neutral), accent **sage `#748158`**, break accent **amber `#b5843e`**. Tokens in `src/styles/tokens.css`.
- **No runtime network**; everything offline. Persistence is local (Tauri store on desktop, localStorage in web-dev, in-memory in tests).

### Cross-environment safety (critical architectural rule)
All side-effectful/native APIs are behind **interfaces with graceful no-op fallbacks** and use **dynamic imports** — never a top-level `@tauri-apps/*` import. This keeps `npm run dev` (web) and `npm test` (jsdom) fully working without Tauri/Rust/browser-audio.
- `src/lib/os.ts` → `OsBridge` (tray title, global shortcut, events); no-op off-Tauri.
- `src/lib/audio.ts` → `AudioEngine` (shared singleton); no-op when `Audio`/`AudioContext` unavailable (jsdom).
- `src/lib/notify.ts` → `NotifyBridge`; no-op off-Tauri/without permission.
- `src/lib/persistence.ts` → `StorageAdapter` (memory / localStorage / tauri via dynamic import). Persistence **never auto-runs on import or in tests** — only via `initPersistence()` called from `App`/`main`.

---

## 3. Architecture map
**Store** (`src/store/useStore.ts`) — one Zustand store holding:
- Navigation: `screen` ('landing'|'corner'|'sound'|'session'|'room'|'history').
- Setup: `corner`, `sound` {ambient, musicStyle, ambientVolume, musicVolume}, `setup` {durationLabel, durationSec}, `tasks[]`.
- Session runtime (persisted): `elapsedSec`, `isRunning`, `sessionActive`, `activeTaskId`, `audioActive`.
- Appearance: `roomBackground: 'color' | 'scene'` (global) — Scene shows immersive background app-wide.
- Pomodoro (newest, see status): `phase: 'focus'|'break'|'review'`, `lastFocusSec`, `autoContinue`.
- History: `sessions[]`.
- Key actions: `setScreen`, `setCorner` (pairs default ambient), `setAmbient/setMusicStyle/setAmbientVolume/setMusicVolume`, `setDuration`, `addTask/removeTask/toggleTask/reorderTasks`, `startFocus`, `setIsRunning`, `tickSession`, `completeCurrent`, `stopFocus`, `activeTask()`, `completeActive(sec)`, `stopActive(sec)`, `addSession`, `hydrate`, `clearSessions`, `setRoomBackground`, `randomScene`, `setAudioActive`, `shouldPlayAudio()`. Pomodoro: `setAutoContinue`, `enterReview`, `reviewMarkDone`, `startBreak`, `finishBreak`, `focusAgain`, `stopAllSessions` (verify final names in code).

**Screens** (`src/screens/`), routed by a simple switch in `App.tsx` (no router lib):
- `Landing` — CTA "Start a focus session" + "Continue a previous session" (Resume) when `sessionActive`.
- `Corner` — paginated grid (~8/page) of scene cards (image + name + description; ambient pill removed). Forward button top-right "Sound →". Background previews live as you pick.
- `Sound` — "Choose sound": ambient chips, music cards, custom accent volume sliders. Forward "Session & tasks →".
- `Session` — duration pills, task list (drag-reorder + subtle grip handle), Auto-continue toggle. Forward "Start focus" (disabled with 0 tasks).
- `Room` — minimal timer (label + time + "Time left", **no bar/ring/percent**), controls (play/pause, complete, stop), tasks panel. Color mode = solid card centered; Scene mode = timer bottom-left over immersive background, glass tasks panel. Pomodoro phases: focus / break (amber) / review sheet.
- `History` — "Sessions today" + "Focused today" + newest-first list + Clear.

**Pure libs** (`src/lib/`, immutable, unit-tested): `timer.ts` (createTimer/tick/remainingSec/isComplete/formatTime), `soundFormat.ts` (volumeToGain, slug, sessionCompleteNotification), `osFormat.ts` (trayTitle, EV events, buildTick), `pomodoro.ts` (breakForSeconds, NEXT_DURATIONS).

**Wiring hooks/components**: `useGlobalAudio` (App-level, single shared engine synced to `store.sound`, plays per `shouldPlayAudio()`: sound/session→`audioActive`, room→`isRunning`), `useOsSync` (global hotkey **Cmd/Ctrl+Shift+M**, tray title "● mm:ss"/"mm:ss"/"mora"), `SceneBackground` (image+optional muted-loop video+scrim, follows `store.corner` live), `Stepper`.

**Data** (`src/data/`): `corners.ts` (**24 real corners** with matching scene videos/images), `sound.ts` (12 ambients, 6 music styles), `durations.ts` (Count Up/25/50/1.5h/2h), `audioManifest.ts` (`ambientUrl`/`musicUrl` → `/audio/...`), `sceneManifest.ts` (`sceneUrl`/`sceneVideoUrl` → `/scenes/...`).

**Persistence**: `persistence.ts` (adapters + `toPersisted`/`migrate`) + `persist.ts` (`initPersistence`: load→`hydrate`, debounced save, `saveNow`, `onCloseRequested` → force pause + save inside `try/finally { win.destroy() }`).

**Removed**: the floating widget window was removed (only the menu-bar/tray timer remains). Some `os.ts` methods (`showWidget`/`hideWidget`) are kept as intentional no-ops to preserve the `OsBridge` interface.

---

## 4. Design system & Color/Scene rules
- Tokens in `tokens.css`; Paper theme (light) is the base. Accent sage; break amber.
- Radius 12px (pills for nav/chips), soft-fill buttons, icons stroke 1.4, calm motion (~600ms), breathing accent dot.
- **Global appearance** `roomBackground`: `'color'` (flat Paper) or `'scene'` (immersive). When Scene, `App` sets `data-scene="true"` on the root app-wide.
- **Scene mode theming (hard rule): SAME layout as Color mode — only colors differ.** Under `[data-scene="true"]`, color tokens are overridden to **dark-glass surfaces + light text** (innook-style): content floats over the background, no big containing white panel, setup panels are translucent dark glass. Nav stays in normal document flow (colors only) to avoid overlap. Never change geometry (width/padding/grid/positions) between modes.

---

## 5. Coding conventions
- **Pure logic in `src/lib/*`**, immutable, framework-agnostic, unit-tested. Side effects behind interfaces (`OsBridge`/`AudioEngine`/`NotifyBridge`/`StorageAdapter`) with no-op fallbacks + dynamic imports; **never top-level `@tauri-apps/*` import**.
- **Single Zustand store**; add fields/actions **additively** — do NOT change or remove existing action signatures (tests depend on them).
- **Tests (Vitest)**: every feature ships tests; **anti-regression** — never weaken/delete an existing test to pass; reset store between tests; put new tests in new files where possible. Only edit an existing test when a genuine, intended UI/behavior change makes an assertion wrong — then edit *only that assertion*, not whole files.
- **Persistence safe-field rule**: when adding a persisted field, keep existing persistence tests green; if exact-equality breaks, keep the field non-persisted rather than editing the test.
- **`context.md` is mandatory**: update it after every change (phase roadmap, files, store, tests, decisions).
- Assets are user-supplied via `public/` with slug-based filenames; missing files degrade gracefully (gradient for scenes, silence for audio).
- Offline only; no runtime network.

---

## 6. CURRENT STATUS

### Done (verified, tests were green)
Phases 1–7 complete: foundation/app-shell, setup flow (Corner/Sound/Session + Stepper), Focus Room + pure timer engine, local persistence + History, OS integration (global hotkey + menu-bar timer; floating widget later removed), sound engine + end-of-session chime/notification, packaging (macOS `.dmg`/`.app` + Linux, CI, icons).
Plus patches: global **Color/Scene** appearance (from launch) + random scene + Shuffle; immersive Scene room; scene-mode glass/nav readability; **24 real scene videos/images** (download + rename scripts); **Scene-mode parity fix** (same layout as Color, dark-glass, readable, custom sliders); **session resume** (runtime in store + persisted; quit→resume paused; Landing "Continue a previous session"); **continuous global audio** (one shared engine across Sound→Session→Room); **in-room sound & scene editor**; **Start-flow polish** (Prompt 1): live background-follows-corner, minimized cards (no ambient pill), top-right forward buttons ("Sound →" / "Session & tasks →" / "Start focus"), drag-reorder tasks with subtle handle.

### IN PROGRESS — Pomodoro patch (NOT verified, likely incomplete)
The last patch (break scaling + end-of-session review + loop) was **interrupted mid-build (token limit)**. Applied so far (per the run log, **needs verification**):
- `src/lib/pomodoro.ts` created (`breakForSeconds`, `NEXT_DURATIONS`).
- Store: `phase` / `lastFocusSec` / `autoContinue` + related actions added; TypeScript compiled clean at that point.
- `persistence.ts`: `autoContinue` added to persisted state.
- `Session.tsx`: "Auto-continue sessions" toggle added.
- `Room.tsx`: break/review phase UI edits started (labels/controls/review sheet + styles).

**NOT done / must finish & verify:**
1. **`npm test` was never run** for this patch — run it; fix all failures. **`src/test/pomodoro.test.ts` was not created** — write it (breakForSeconds mapping; enterReview; reviewMarkDone; startBreak/finishBreak; focusAgain; stopAllSessions; autoContinue path; Room review-phase render).
2. **Verify the Room actually calls `enterReview()` on focus completion** (natural countdown to 0 AND "Complete now"), instead of auto-advancing — and that the **review sheet** (Mark done / Keep working · Take a break {Xm} / Focus again {25/50/1.5h/2h} / Stop) and **break phase** (amber timer, skip control, auto `finishBreak` at 0) work in **both Color and Scene modes**.
3. **`autoContinue` behavior**: when on, skip the review sheet (focus→break→focus) until tasks done or Stop.
4. **`context.md` not updated** for this patch — update it.
5. Run `npm run build` to confirm production build is clean.

---

## 7. Known risks / gotchas (read before shipping)
- **Audio has never been confirmed to actually produce sound on the real desktop app.** Highest-priority unknown. When testing: open DevTools → Network, press Play, check for **404s on `/audio/ambient/*.mp3` or `/audio/music/*.mp3`** (a slug/filename mismatch is the likely culprit — there was already a manual `lo-fi`→`lofi` hack). Also confirm `element.volume > 0` and that `.play()` runs inside a user gesture (WKWebView autoplay policy).
- **Scene video autoplay** in WKWebView may need an explicit `videoRef.play()` in an effect even with `autoplay muted playsInline`.
- **`public/` assets only load after a rebuild / `tauri dev` restart** — drop files first, then run.
- **Test churn**: recent sessions edited many test files to track data changes (24 corners, pagination). Watch that tests weren't weakened; prefer additive tests.
- **onCloseRequested** must keep `try { await doSave() } finally { await win.destroy() }` so a save failure can't wedge the app closed.
- Global hotkey is **Cmd/Ctrl+Shift+M** (changed from Shift+F which collided with "Find").

---

## 8. Next steps (prioritized)
1. **Finish & verify the Pomodoro patch** (see §6): complete Room review/break wiring, write `pomodoro.test.ts`, run `npm test` and fix regressions, update `context.md`, run `npm run build`.
2. **Real-device smoke test** (`npm run tauri dev` on macOS): Color↔Scene parity; live background on corner change; drag-reorder tasks; session resume after quit; global hotkey; tray "● mm:ss"; **audio actually plays** (the big one); scene video autoplay; review sheet + break flow; auto-continue.
3. **Fix the audio pipeline end-to-end** if silent: verify `public/audio` filenames match `slug()` output; remove the ad-hoc `lo-fi`→`lofi` hack by naming the file correctly; ensure play under gesture.
4. **Package for personal use**: `npm run build:desktop` → `src-tauri/target/release/bundle/macos/mora.app` (+ `dmg/*_aarch64.dmg`); first-run `xattr -cr /Applications/mora.app` for unsigned Gatekeeper. (Signing/notarization only if distributing to others.)
5. **Cleanup pass**: remove dead code (`widgetVisible`, no-op `showWidget/hideWidget` if truly unused), least-privilege `capabilities/default.json`, confirm sensible defaults (auto-continue off), and reconcile `context.md` test inventory with actual `npm test` count.

---

## 9. Commands
- Web dev (fast UI loop, no Rust): `npm run dev`
- Desktop dev: `npm run tauri dev`  (needs Rust + Xcode CLT)
- Tests: `npm test`  (or `npm test -- --run`)
- Type/build check: `npm run build`
- Desktop bundle: `npm run build:desktop`  → outputs in `src-tauri/target/release/bundle/`

## 10. Asset workflow (scenes & audio)
- **Scenes**: `public/scenes/<slug>.mp4` (muted loop, ~5s, 1080p) and/or `<slug>.jpg`; missing → gradient fallback. Helper scripts at repo root: `download_scene.py` (yt-dlp, cut, mute, random temp name, writes `metadata.json`) and `rename_scenes.py` (dedupe by video id, slug-rename, ffmpeg thumbnail, regenerate `corners.ts`).
- **Audio**: `public/audio/ambient/<slug>.mp3` and `public/audio/music/<slug>.mp3`; missing → silent. Slugs must match `slug()` (kebab-case) of the option names in `src/data/sound.ts`.
- Slug rule: lowercase, spaces/underscores → `-`, strip non `[a-z0-9-]` (e.g. "Rain on Window" → `rain-on-window`, "Lo-fi" → `lo-fi`).

*(Keep `context.md` as the authoritative, continuously-updated record; treat this file as the onboarding snapshot.)*  