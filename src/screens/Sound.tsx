import { useStore } from '../store/useStore';
import { AMBIENTS, MUSIC_STYLES } from '../data/sound';
import { Stepper } from '../components/Stepper';
import { getAudioEngine } from '../lib/audio';

export default function Sound() {
  const corner = useStore((s) => s.corner);
  const sound = useStore((s) => s.sound);
  const setAmbient = useStore((s) => s.setAmbient);
  const setMusicStyle = useStore((s) => s.setMusicStyle);
  const setAmbientVolume = useStore((s) => s.setAmbientVolume);
  const setMusicVolume = useStore((s) => s.setMusicVolume);
  const setScreen = useStore((s) => s.setScreen);
  const setAudioActive = useStore((s) => s.setAudioActive);

  const cornerName = corner?.name ?? 'Alpine Morning Desk';
  const pairedAmbient = corner?.ambient ?? 'Wind';

  return (
    <div style={wrapperStyle}>
      <Stepper step={2} />
      <h2 style={headingStyle}>Choose sound</h2>

      <div style={hintStyle}>
        {cornerName} pairs with {pairedAmbient}.
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>ambient sound</label>
        <div style={chipsStyle}>
          {AMBIENTS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmbient(a);
                setAudioActive(true);
                getAudioEngine().play();
              }}
              style={{
                ...chipStyle,
                background: sound.ambient === a ? 'var(--accent-soft)' : 'transparent',
                color: sound.ambient === a ? 'var(--accent-txt)' : 'var(--ink-2)',
                borderColor: sound.ambient === a ? 'var(--accent-line)' : 'var(--line-2)',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>music style</label>
        <div style={musicGridStyle}>
          {MUSIC_STYLES.map((m) => (
            <button
              key={m}
              onClick={() => {
                setMusicStyle(m);
                setAudioActive(true);
                getAudioEngine().play();
              }}
              style={{
                ...musicCardStyle,
                background: sound.musicStyle === m ? 'var(--accent-soft)' : 'var(--surface)',
                borderColor: sound.musicStyle === m ? 'var(--accent-line)' : 'var(--line)',
                color: sound.musicStyle === m ? 'var(--accent-txt)' : 'var(--ink)',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={slidersStyle}>
        <div style={sliderRowStyle}>
          <span style={sliderLabelStyle}>Ambient</span>
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
          <span style={sliderValueStyle}>{sound.ambientVolume}%</span>
        </div>
        <div style={sliderRowStyle}>
          <span style={sliderLabelStyle}>Music</span>
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
          <span style={sliderValueStyle}>{sound.musicVolume}%</span>
        </div>
      </div>

      <div style={bottomBarStyle}>
        <div style={summaryStyle}>
          <span>Scene: <strong>{cornerName}</strong></span>
          <span>Ambient: <strong>{sound.ambient}</strong></span>
        </div>
        <div style={btnGroupStyle}>
          <button onClick={() => setScreen('corner')} style={ghostBtnStyle}>Back</button>
          <button onClick={() => setScreen('session')} style={nextBtnStyle}>Session & tasks →</button>
        </div>
      </div>
    </div>
  );
}

const wrapperStyle: React.CSSProperties = {
  padding: '0 32px 32px',
  flex: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const headingStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  marginBottom: 12,
};

const hintStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--ink-2)',
  background: 'var(--surface-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  padding: '10px 16px',
  marginBottom: 24,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 10,
  display: 'block',
};

const chipsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const chipStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 'var(--r-pill)',
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'background var(--dur) var(--ease)',
};

const musicGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 10,
};

const musicCardStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 'var(--r-md)',
  padding: '14px 16px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  textAlign: 'center',
  transition: 'background var(--dur) var(--ease)',
};

const slidersStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginBottom: 24,
};

const sliderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const sliderLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--ink-2)',
  width: 70,
};

const sliderValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--ink)',
  width: 40,
  textAlign: 'right',
};

const bottomBarStyle: React.CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTop: '1px solid var(--line)',
  paddingTop: 16,
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  fontSize: 14,
  color: 'var(--ink-2)',
};

const btnGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
};

const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-pill)',
  padding: '8px 22px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--ink-2)',
  fontFamily: 'var(--font)',
};

const nextBtnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#ffffff',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--r-pill)',
  padding: '8px 22px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
};
