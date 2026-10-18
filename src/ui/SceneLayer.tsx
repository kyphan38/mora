import { useEffect, useState } from 'react';
import { sceneUrl, sceneVideoUrl } from '../data/sceneManifest';
import type { Corner } from '../types';

/** Full-bleed photo + muted looping video behind the page, with a dark scrim for text. */
export function SceneLayer({ corner }: { corner: Corner }) {
  const [videoError, setVideoError] = useState(false);
  useEffect(() => setVideoError(false), [corner.id]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" data-testid="room-scene-bg" aria-hidden="true">
      <div
        key={`img-${corner.id}`}
        className="fade-in absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${sceneUrl(corner.id)}"), ${corner.gradient}` }}
      />
      {!videoError && (
        <video
          key={corner.id}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          className="fade-in absolute inset-0 h-full w-full object-cover"
          data-testid="scene-video"
        >
          <source src={sceneVideoUrl(corner.id)} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}
