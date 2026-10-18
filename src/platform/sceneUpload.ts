// Owner-uploaded scenes: video + a thumbnail taken from it, stored under
// users/{uid}/scenes/ in Cloud Storage, listed in Firestore for every device.

import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getDb } from './firestore';
import { getStorageClient } from './storage';
import { uid as newId } from '../core/uid';
import type { UserScene } from '../types';

export const MAX_SCENE_BYTES = 60 * 1024 * 1024;
const CACHE = 'public, max-age=31536000, immutable';

/** Grabs one frame (1s in, or the middle of short clips) as a JPEG, 1280px wide at most. */
export async function thumbnailFromVideo(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((ok, fail) => {
      video.onloadedmetadata = () => ok();
      video.onerror = () => fail(new Error('This video cannot be read.'));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((ok) => (video.onseeked = () => ok()));
    const w = Math.min(1280, video.videoWidth);
    const h = Math.round((video.videoHeight / video.videoWidth) * w);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(video, 0, 0, w, h);
    return await new Promise<Blob>((ok, fail) =>
      canvas.toBlob((b) => (b ? ok(b) : fail(new Error('No thumbnail'))), 'image/jpeg', 0.82),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function checkSceneFile(file: File): string | null {
  if (file.type !== 'video/mp4' && !/\.mp4$/i.test(file.name)) return 'Choose an MP4 video.';
  if (file.size > MAX_SCENE_BYTES) return 'Too large (max 60 MB). Cut it with scripts/find_loop_scene.py.';
  return null;
}

export interface UploadHandle {
  done: Promise<UserScene>;
  cancel: () => void;
}

/** Uploads video and thumbnail, then lists the scene. onProgress gets 0..1. */
export function uploadScene(uid: string, file: File, name: string, onProgress: (p: number) => void): UploadHandle {
  const storage = getStorageClient();
  const id = newId().replace(/[^A-Za-z0-9-]/g, '');
  const videoPath = `users/${uid}/scenes/${id}.mp4`;
  const imagePath = `users/${uid}/scenes/${id}.jpg`;
  const task = uploadBytesResumable(ref(storage, videoPath), file, { contentType: 'video/mp4', cacheControl: CACHE });

  // Listen right away: the thumbnail below takes a moment and progress events would be missed.
  const uploaded = new Promise<void>((ok, fail) =>
    task.on('state_changed', (s) => onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), fail, () => ok()),
  );

  const done = (async () => {
    const thumb = await thumbnailFromVideo(file);
    await uploaded;
    const imageRef = ref(storage, imagePath);
    await uploadBytesResumable(imageRef, thumb, { contentType: 'image/jpeg', cacheControl: CACHE });
    const scene: UserScene = {
      id,
      name: name.trim().slice(0, 80) || 'My scene',
      videoUrl: await getDownloadURL(task.snapshot.ref),
      imageUrl: await getDownloadURL(imageRef),
      videoPath,
      imagePath,
      createdAt: Date.now(),
    };
    const { id: _id, ...data } = scene;
    await setDoc(doc(getDb(), 'users', uid, 'scenes', id), data);
    return scene;
  })();

  return { done, cancel: () => task.cancel() };
}

/** Removes the files and the listing. Missing files are fine (already gone). */
export async function deleteScene(uid: string, scene: UserScene): Promise<void> {
  const storage = getStorageClient();
  await Promise.all(
    [scene.videoPath, scene.imagePath].map((p) =>
      deleteObject(ref(storage, p)).catch((e: { code?: string }) => {
        if (e.code !== 'storage/object-not-found') throw e;
      }),
    ),
  );
  await deleteDoc(doc(getDb(), 'users', uid, 'scenes', scene.id));
}
