// mora - Cloud Functions: keep logi in step with mora's focus timer.
//
// liveToLogi:  when the shared timer (users/{uid}/live/current) starts or
//              stops a focus run, tell logi (one logi record per run).
// stopFromLogi: logi calls this when the owner stops a mora run in logi;
//              the timer stops on every device and the block is saved.
// Tokens live in Secret Manager. The owner turns the link on in Settings
// (prefs/main logiEnabled); results go to users/{uid}/meta/logi.

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import { onRequest } from 'firebase-functions/https';
import { defineSecret, defineString } from 'firebase-functions/params';

import { liveCalls, stopFromLogi as planStop, type LiveDoc, type LogiCall } from './live.ts';

setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });
initializeApp();

const INGEST_TOKEN = defineSecret('MORA_INGEST_TOKEN');
const CONTROL_TOKEN = defineSecret('LOGI_CONTROL_TOKEN');
const LOGI_URL = defineString('LOGI_URL', { default: 'https://logi.kyphan38.com' });
const ALLOWED_USER_EMAIL = defineString('ALLOWED_USER_EMAIL');

const db = () => getFirestore();

async function recordStatus(uid: string, patch: Record<string, unknown>) {
  await db().doc(`users/${uid}/meta/logi`).set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function callLogi(call: LogiCall): Promise<{ ok: boolean; retry: boolean; reason: string }> {
  try {
    const res = await fetch(`${LOGI_URL.value().replace(/\/+$/, '')}/api/ingest/mora/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INGEST_TOKEN.value()}` },
      body: JSON.stringify(call),
    });
    if (res.ok) return { ok: true, retry: false, reason: '' };
    if (res.status === 401) return { ok: false, retry: false, reason: 'token rejected' };
    if (res.status === 503) return { ok: false, retry: false, reason: 'link is off in logi' };
    return { ok: false, retry: res.status >= 500, reason: `logi ${res.status}` };
  } catch {
    return { ok: false, retry: true, reason: 'network' };
  }
}

export const liveToLogi = onDocumentWritten(
  { document: 'users/{uid}/live/current', secrets: [INGEST_TOKEN], retry: true },
  async (event) => {
    const { uid } = event.params;
    const calls = liveCalls(event.data?.before.data() as LiveDoc | undefined, event.data?.after.data() as LiveDoc | undefined, Date.now());
    if (!calls.length) return;
    const prefs = await db().doc(`users/${uid}/prefs/main`).get();
    if (prefs.get('logiEnabled') !== true) return;
    for (const call of calls) {
      const r = await callLogi(call);
      if (!r.ok) {
        await recordStatus(uid, { lastError: r.reason });
        if (r.retry) throw new Error(`logi: ${r.reason}`);
        logger.warn('logi refused', { reason: r.reason });
        return;
      }
    }
    await recordStatus(uid, { lastError: null, lastSentAt: Date.now() });
  },
);

function tokenOk(header: string | undefined, expected: string): boolean {
  const got = Buffer.from((header ?? '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(expected);
  return got.length === want.length && timingSafeEqual(got, want);
}

let ownerUid: string | null = null;

export const stopFromLogi = onRequest({ secrets: [CONTROL_TOKEN] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  if (!tokenOk(req.headers.authorization, CONTROL_TOKEN.value())) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const { runId, endAt } = (req.body ?? {}) as { runId?: unknown; endAt?: unknown };
  if (typeof runId !== 'string' || typeof endAt !== 'number') {
    res.status(400).json({ error: 'bad-request' });
    return;
  }
  ownerUid ??= (await getAuth().getUserByEmail(ALLOWED_USER_EMAIL.value())).uid;
  const liveRef = db().doc(`users/${ownerUid}/live/current`);
  const result = await db().runTransaction(async (tx) => {
    const plan = planStop((await tx.get(liveRef)).data() as LiveDoc | undefined, runId, endAt);
    if (!plan) return 'ignored';
    tx.set(liveRef, { ...plan.live, updatedAt: FieldValue.serverTimestamp() });
    if (plan.session) tx.set(db().doc(`users/${ownerUid}/sessions/${randomUUID()}`), plan.session);
    return 'stopped';
  });
  res.json({ ok: true, result });
});
