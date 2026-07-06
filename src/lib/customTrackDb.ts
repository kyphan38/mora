export interface CustomTrackRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  blob: Blob;
}

const DB_NAME = 'mora-media';
const DB_VERSION = 1;
const STORE_NAME = 'customTracks';

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function putCustomTrack(rec: CustomTrackRecord): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to store custom track:', err);
    throw err;
  }
}

export async function getCustomTrack(id: string): Promise<CustomTrackRecord | null> {
  try {
    const db = await openDb();
    return await new Promise<CustomTrackRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve((req.result as CustomTrackRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to read custom track:', err);
    return null;
  }
}

export async function deleteCustomTrack(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete custom track:', err);
  }
}

export async function listCustomTracks(): Promise<CustomTrackRecord[]> {
  try {
    const db = await openDb();
    return await new Promise<CustomTrackRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as CustomTrackRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to list custom tracks:', err);
    return [];
  }
}

export function resetCustomTrackDbForTest(): void {
  dbPromise = null;
}
