import { useEffect, useState } from 'react';
import { sceneUrl, sceneVideoUrl } from '../data/sceneManifest';
import { useCachedMedia } from '../hooks/useCachedMedia';
import type { Corner } from '../types';

const CROSSFADE_MS = 900;

/**
 * Full-bleed photo + muted looping video behind the clock, with a scrim for text.
 * A new scene fades in over the old one; the video fades in once it plays,
 * so the photo covers loading and there is never a black frame.
 */
export function SceneLayer({ corner, visible }: { corner: Corner; visible: boolean }) {
  const [layers, setLayers] = useState<Corner[]>([corner]);

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
      {layers.map((c, i) => (
        <SceneSlide key={c.id} corner={c} top={i === layers.length - 1 && layers.length > 1} playVideo={visible} />
      ))}
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}

function SceneSlide({ corner, top, playVideo }: { corner: Corner; top: boolean; playVideo: boolean }) {
  const [videoOn, setVideoOn] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // Device copy when saved; first play streams and saves in the background.
  const videoSrc = useCachedMedia(playVideo ? sceneVideoUrl(corner.id) : null);

  return (
    <div className={`absolute inset-0 ${top ? 'scene-in' : ''}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${sceneUrl(corner.id)}"), ${corner.gradient}` }}
      />
      {playVideo && !videoError && videoSrc && (
        <video
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
