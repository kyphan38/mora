import { Label } from './Words';

// mora - In-app guide. Plain English, one block per feature.
// Keep it in sync when a feature changes.

const BLOCKS: { title: string; lines: string[] }[] = [
  {
    title: 'the clock',
    lines: [
      'Pick a length (25 min, 50 min, 1.5h, 2h, count up or custom), then press Play.',
      'Before you start, drag the ring to pick 5 to 120 minutes.',
      'done ends the block now. stop must be held for a moment, so a quick tap does nothing.',
      'In the last minute the ring gets a little thicker.',
    ],
  },
  {
    title: 'breaks',
    lines: [
      'After a block, mora asks: Mark done, Keep working, Focus again or Stop. You can add a note.',
      'A break follows. Every 4th break is long. skip break ends it.',
      'Settings: after a session, ask each time or go straight to a break and then focus again.',
    ],
  },
  {
    title: 'tasks',
    lines: [
      'A task is optional. A block with no task is saved as Focus.',
      'Tap a task name to pick it for the clock. start picks it, sets its length and plays.',
      'Type "Read 50m" or "Gym 1.5h" to plan a length.',
      'Swipe a row right for done, left to delete (with undo).',
      'The list is for one day. A new day starts at 04:00.',
    ],
  },
  {
    title: 'park a thought',
    lines: ['The note icon saves a thought without leaving the block. It waits in the task list.'],
  },
  {
    title: 'sound and scene',
    lines: [
      'Pick ambient sound and music. Each pick plays at once so you can hear it.',
      'Add your own music. It is stored in the cloud for every device.',
      'Scene shows a calm photo or video behind the clock. Swipe the clock left or right (or [ and ]) to change it.',
      'Hide scenes you do not like, or add your own.',
      'Waiting music plays before a session. Pick it in Settings.',
    ],
  },
  {
    title: 'zen',
    lines: ['Zen hides everything but the clock, full screen. The bottom bar also fades while a block runs.'],
  },
  {
    title: 'history',
    lines: [
      'Today\'s sessions, focus time, your daily goal and days in a row.',
      'A bar chart of the last 7 days, with learn and work time.',
      'Tap a session to change it. Delete has undo.',
      'export gives a csv or json file.',
    ],
  },
  {
    title: 'logi',
    lines: [
      'The logi word on the bottom bar turns the link on or off.',
      'When on, each run of the clock is saved in logi. Stopping it in logi stops it here too.',
      'Today\'s logi routine joins the task list. Ticking an item here ticks it in logi.',
    ],
  },
  {
    title: 'every device',
    lines: [
      'Tasks, sessions, notes and settings sync to all your devices.',
      'A running clock shows on every device.',
    ],
  },
  {
    title: 'keys',
    lines: ['space play or pause · enter done · s skip break · n tasks · q park a thought · z zen · m mute · h history · ? settings'],
  },
];

export function GuideView() {
  return (
    <div className="space-y-7">
      <h2 className="text-[17px] font-medium">Guide</h2>
      {BLOCKS.map((b) => (
        <section key={b.title}>
          <Label>{b.title}</Label>
          <ul className="space-y-2">
            {b.lines.map((line) => (
              <li key={line} className="text-[15px] leading-relaxed text-muted">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
