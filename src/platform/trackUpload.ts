// Owner-uploaded music: the file in Cloud Storage users/{uid}/audio/, the
// listing in Firestore users/{uid}/tracks/{id}, so every device has it.

import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getDb } from './firestore';
import { getStorageClient } from './storage';
import { uid as newId } from '../core/uid';
import type { UserTrack } from '../types';

export const MAX_TRACK_BYTES = 50 * 1024 * 1024;
const ACCEPTED = /\.(mp3|wav|m4a|ogg|aac)$/i;

export function checkTrackFile(file: File): string | null {
  if (!file.type.startsWith('audio/') && !ACCEPTED.test(file.name)) return 'Choose an MP3, WAV, M4A or OGG file.';
  if (file.size > MAX_TRACK_BYTES) return 'File too large (max 50MB).';
  return null;
}

/** Storage only accepts audio/* here; some browsers leave the type empty. */
function audioType(file: File): string {
  if (file.type.startsWith('audio/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'm4a' ? 'audio/mp4' : ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
}

export interface TrackUpload {
  done: Promise<UserTrack>;
  cancel: () => void;
}

export function uploadTrack(uid: string, file: Blob & { name: string }, onProgress: (p: number) => void): TrackUpload {
  const id = newId().replace(/[^A-Za-z0-9-]/g, '');
  const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  const path = `users/${uid}/audio/${id}.${ext}`;
  const mimeType = audioType(file as File);
  const task = uploadBytesResumable(ref(getStorageClient(), path), file, {
    contentType: mimeType,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  const uploaded = new Promise<void>((ok, fail) =>
    task.on('state_changed', (s) => onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), fail, () => ok()),
  );
  const done = (async () => {
    await uploaded;
    const track: UserTrack = {
      id,
      name: file.name.replace(/\.[^./]+$/, '').slice(0, 120) || 'My track',
      url: await getDownloadURL(task.snapshot.ref),
      path,
      mimeType,
      size: file.size,
      createdAt: Date.now(),
    };
    const { id: _id, ...data } = track;
    await setDoc(doc(getDb(), 'users', uid, 'tracks', id), data);
    return track;
  })();
  return { done, cancel: () => task.cancel() };
}

export async function deleteTrack(uid: string, track: UserTrack): Promise<void> {
  await deleteObject(ref(getStorageClient(), track.path)).catch((e: { code?: string }) => {
    if (e.code !== 'storage/object-not-found') throw e;
  });
  await deleteDoc(doc(getDb(), 'users', uid, 'tracks', track.id));
}

/**
 * Moves a track saved on this device (before cloud tracks existed) to the
 * cloud, keeps it selected if it was, then removes the device copy.
 */
export async function migrateLocalTrack(uid: string): Promise<void> {
  const { useStore } = await import('../store/useStore');
  const { getCustomTrack, deleteCustomTrack } = await import('./customTrackDb');
  const local = useStore.getState().customTracks[0];
  if (!local) return;
  const rec = await getCustomTrack(local.id).catch(() => undefined);
  if (!rec) {
    useStore.getState().removeCustomTrack(local.id);
    return;
  }
  const file = Object.assign(rec.blob, { name: rec.name });
  const track = await uploadTrack(uid, file, () => {}).done;
  const wasSelected = useStore.getState().sound.customTrackId === local.id;
  useStore.getState().removeCustomTrack(local.id);
  if (wasSelected) useStore.getState().selectCustomTrack(track.id);
  await deleteCustomTrack(local.id).catch(() => {});
}
