import { useStore } from '../store/useStore';
import { AMBIENTS } from '../data/sound';
import { getAudioEngine } from '../platform/audio';
import { Sheet } from './Sheet';
import { Words, Label } from './Words';
import { ScenePicker } from './ScenePicker';
import { MusicPicker } from './MusicPicker';


/** Sound and scene, picked while focusing. Picks preview right away. */
export function SoundSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sound = useStore((s) => s.sound);
  const setAmbient = useStore((s) => s.setAmbient);
  const setAmbientVolume = useStore((s) => s.setAmbientVolume);
  const setMusicVolume = useStore((s) => s.setMusicVolume);
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);

  const preview = () => getAudioEngine().play();

  return (
    <Sheet open={open} label="Sound and scene" onClose={onClose} testId="room-settings-panel">
      <div className="space-y-6">
        <section>
          <Label>sound</Label>
          <Words
            label="Sound"
            options={[
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
            value={muted ? 'off' : 'on'}
            onChange={(v) => setMuted(v === 'off')}
          />
        </section>

        <section className={`transition-opacity ${muted ? 'opacity-40' : ''}`}>
          <Label>ambient</Label>
          <Words
            label="Ambient"
            options={AMBIENTS.map((a) => ({ value: a, label: a }))}
            value={sound.ambient}
            onChange={(a) => {
              setAmbient(a);
              preview();
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={sound.ambientVolume}
            onChange={(e) => {
              setAmbientVolume(Number(e.target.value));
              preview();
            }}
            aria-label="Ambient volume"
            className="mt-3 w-full"
          />
        </section>

        <section className={`transition-opacity ${muted ? 'opacity-40' : ''}`}>
          <Label>music</Label>
          <MusicPicker />
          <input
            type="range"
            min={0}
            max={100}
            value={sound.musicVolume}
            onChange={(e) => {
              setMusicVolume(Number(e.target.value));
              preview();
            }}
            aria-label="Music volume"
            className="mt-3 w-full"
          />
        </section>

        <ScenePicker />
      </div>
    </Sheet>
  );
}
