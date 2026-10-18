export type Screen = 'focus' | 'history' | 'settings';

export interface Corner {
  id: string;
  name: string;
  description: string;
  ambient: string;      // default ambient sound paired with this corner
  gradient: string;     // CSS gradient string for the thumbnail
  /** Owner-uploaded scenes carry their own media URLs; defaults use Storage paths by id. */
  video?: string;
  image?: string;
  /** Has a 9:16 phone version (<id>.portrait.mp4/.jpg). */
  portrait?: boolean;
  /** A photo, no video: shown with a slow drift. */
  still?: boolean;
}

/** Music the owner uploaded (Storage users/{uid}/audio, Firestore users/{uid}/tracks/{id}). */
export interface UserTrack {
  id: string;
  name: string;
  url: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

/** A scene the owner uploaded (Firestore users/{uid}/scenes/{id}). */
export interface UserScene {
  id: string;
  name: string;
  videoUrl: string;
  imageUrl: string;
  videoPath: string;
  imagePath: string;
  createdAt: number;
}

export type FocusKind = 'learn' | 'work';

export interface Task {
  id: string;
  name: string;
  done: boolean;
  createdAt: number;    // epoch ms
  kind?: FocusKind;     // missing = learn
  est?: number;         // estimated focus blocks
  blocks?: number;      // finished focus blocks
}

/** A thought parked during focus, to deal with later. */
export interface Note {
  id: string;
  text: string;
  createdAt: number;
}

export interface Session {
  id: string;
  taskName: string;
  minutes: number;      // focused minutes actually logged
  startedAt: number;    // epoch ms
  endedAt: number;      // epoch ms
  corner: string;       // corner name
  ambient: string;      // ambient name
  kind?: FocusKind;
  note?: string;        // one line written when the block ended
}

export interface SoundConfig {
  ambient: string;
  musicStyle: string;
  ambientVolume: number; // 0..100
  musicVolume: number;   // 0..100
  customTrackId: string | null; // id of the selected custom uploaded track, takes precedence over musicStyle when set
}

export interface CustomTrack {
  id: string;
  name: string;      // display name (original filename)
  mimeType: string;
  size: number;       // bytes
  createdAt: number;  // epoch ms
}

export interface SessionSetup {
  durationLabel: string; // 'Count Up' | '25 min' | '50 min' | '1.5h' | '2h'
  durationSec: number;   // 0 for Count Up
}
