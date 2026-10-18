// mora - Cloud Functions: send finished focus sessions to logi.
//
// The logi token lives in Secret Manager (MORA_INGEST_TOKEN), so no device
// keeps it. The owner turns the link on or off in Settings (prefs/main
// logiEnabled). Results are written to users/{uid}/meta/logi for Settings.

import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';

import { AUTO_SEND_MS, BACKFILL_MS, BATCH, blockFromSession, isAllowed, postBlocks, type LogiBlock } from './logi.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

const TOKEN = defineSecret('MORA_INGEST_TOKEN');
const LOGI_URL = defineString('LOGI_URL', { default: 'https://logi.kyphan38.com' });
const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');

const db = () => getFirestore();

async function linkEnabled(uid: string): Promise<boolean> {
  const prefs = await db().doc(`users/${uid}/prefs/main`).get();
  return prefs.get('logiEnabled') === true;
}

async function recordStatus(uid: string, patch: Record<string, unknown>) {
  await db().doc(`users/${uid}/meta/logi`).set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

/** Sends blocks in batches; returns how many logi took. Throws on a retryable failure. */
async function send(uid: string, blocks: LogiBlock[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < blocks.length; i += BATCH) {
    const out = await postBlocks(LOGI_URL.value(), TOKEN.value(), blocks.slice(i, i + BATCH));
    if (out.kind === 'retry') {
      await recordStatus(uid, { lastError: out.reason });
      throw new Error(`logi: ${out.reason}`);
    }
    if (out.kind === 'stop') {
      await recordStatus(uid, { lastError: out.reason });
      logger.warn('logi refused', { reason: out.reason });
      return sent;
    }
    // write-failed is the only reason logi asks to retry.
    if (out.rejected.some((r) => r.reason === 'write-failed')) throw new Error('logi: write failed');
    sent += out.accepted.length;
  }
  await recordStatus(uid, { lastError: null, lastSentAt: Date.now(), ...(sent ? { sent: FieldValue.increment(sent) } : {}) });
  return sent;
}

/** A new session (from any device) goes to logi, if the link is on. Retried on network errors. */
export const sessionToLogi = onDocumentCreated(
  { document: 'users/{uid}/sessions/{sessionId}', secrets: [TOKEN], retry: true },
  async (event) => {
    const { uid, sessionId } = event.params;
    const block = blockFromSession(sessionId, event.data?.data() ?? {});
    // Old history arriving with a first sync is not sent on its own.
    if (!block || Date.now() - block.endAt > AUTO_SEND_MS) return;
    if (!(await linkEnabled(uid))) return;
    await send(uid, [block]);
  },
);

/** "Also send the last 7 days" in Settings. */
export const sendRecentToLogi = onCall({ secrets: [TOKEN] }, async (req) => {
  if (!req.auth || !isAllowed(req.auth.token, ALLOWED_USER_EMAIL.value())) {
    throw new HttpsError('permission-denied', 'Not allowed');
  }
  const uid = req.auth.uid;
  const since = Date.now() - BACKFILL_MS;
  const snap = await db().collection(`users/${uid}/sessions`).where('endedAt', '>=', since).get();
  const blocks = snap.docs.map((d) => blockFromSession(d.id, d.data())).filter((b): b is LogiBlock => b !== null);
  const sent = await send(uid, blocks).catch(() => {
    throw new HttpsError('unavailable', 'logi did not answer. Try again later.');
  });
  return { queued: blocks.length, sent };
});
