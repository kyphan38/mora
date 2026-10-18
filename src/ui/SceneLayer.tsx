import { useEffect, useRef, useState } from 'react';
import { sceneImage, sceneVideo } from '../data/sceneManifest';
import { useCachedMedia } from '../hooks/useCachedMedia';
import { usePortrait } from '../hooks/useOrientation';
import { useIdle } from '../hooks/useIdle';
import { useParallax } from '../hooks/useParallax';
import { useStore } from '../store/useStore';
import type { Corner } from '../types';

const CROSSFADE_MS = 900;

/**
 * Full-bleed photo + muted looping video behind the clock, with a scrim for text.
 * A new scene fades in over the old one; the video fades in once it plays,
 * so the photo covers loading and there is never a black frame.
 */
export function SceneLayer({ corner, visible }: { corner: Corner; visible: boolean }) {
  const [layers, setLayers] = useState<Corner[]>([corner]);
  const shift = useRef<HTMLDivElement>(null);
  // While the clock runs (or in fullscreen) and the mouse rests, the scene settles back.
  const watching = useStore((s) => s.isRunning) || !!document.fullscreenElement;
  const still = useIdle(4000, watching);
  useParallax(shift, visible && !still);

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.id === corner.id ? prev : [...prev.slice(-1), corner]));
    const t = setTimeout(() => setLayers((prev) => prev.slice(-1)), CROSSFADE_MS + 100);
    return () => clearTimeout(t);
  }, [corner]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
      data-testid="room-scene-bg"
      aria-hidden="true"
    >
      {/* The outer layer moves with the mouse; the slides keep their own animations. */}
      <div ref={shift} className="absolute inset-0 will-change-transform" data-testid="scene-shift">
        {layers.map((c, i) => (
          <SceneSlide key={c.id} corner={c} top={i === layers.length - 1 && layers.length > 1} playVideo={visible} />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}

function SceneSlide({ corner, top, playVideo }: { corner: Corner; top: boolean; playVideo: boolean }) {
  const [videoOn, setVideoOn] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // Phones held upright get the 9:16 cut when the scene has one. Device copy
  // when saved; the first play streams and saves in the background.
  const portrait = usePortrait();
  const videoSrc = useCachedMedia(playVideo && !corner.still ? sceneVideo(corner, portrait) : null);
  useEffect(() => setVideoOn(false), [videoSrc]);

  return (
    <div className={`absolute inset-0 ${top ? 'scene-in' : ''}`}>
      <div
        className={`absolute inset-0 bg-cover bg-center ${corner.still ? 'drift' : ''}`}
        style={{ backgroundImage: `url("${sceneImage(corner, portrait)}"), ${corner.gradient}` }}
      />
      {playVideo && !videoError && videoSrc && (
        <video
          key={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          onPlaying={() => setVideoOn(true)}
          onError={() => setVideoError(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{ opacity: videoOn ? 1 : 0 }}
          data-testid="scene-video"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
