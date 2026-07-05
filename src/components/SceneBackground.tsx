import { useState, useEffect } from 'react';
import { sceneUrl, sceneVideoUrl } from '../data/sceneManifest';
import type { Corner } from '../types';

interface SceneBackgroundProps {
  corner: Corner | null;
  testid?: string;
}

export function SceneBackground({ corner, testid }: SceneBackgroundProps) {
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [corner?.id]);

  if (!corner) {
    return (
      <div
        data-testid={testid}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #8794a3, #4a5560)',
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <div
      data-testid={testid}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${sceneUrl(corner.name)}"), ${corner.gradient}`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
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
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          data-testid="scene-video"
        >
          <source src={sceneVideoUrl(corner.name)} type="video/mp4" />
        </video>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}
