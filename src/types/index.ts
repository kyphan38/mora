export type Screen = 'landing' | 'corner' | 'sound' | 'session' | 'room' | 'history';

export interface Corner {
  id: string;
  name: string;
  description: string;
  ambient: string;      // default ambient sound paired with this corner
  gradient: string;     // CSS gradient string for the thumbnail
}

export interface Task {
  id: string;
  name: string;
  done: boolean;
  createdAt: number;    // epoch ms
}

export interface Session {
  id: string;
  taskName: string;
  minutes: number;      // focused minutes actually logged
  startedAt: number;    // epoch ms
  endedAt: number;      // epoch ms
  corner: string;       // corner name
  ambient: string;      // ambient name
}

export interface SoundConfig {
  ambient: string;
  musicStyle: string;
  ambientVolume: number; // 0..100
  musicVolume: number;   // 0..100
}

export interface SessionSetup {
  durationLabel: string; // 'Count Up' | '25 min' | '50 min' | '1.5h' | '2h'
  durationSec: number;   // 0 for Count Up
}
