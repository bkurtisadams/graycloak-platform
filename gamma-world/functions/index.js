import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { validateLobbyRequest } from './lobby.mjs';
initializeApp();
export const gwLobby = onCall({ region: 'us-central1' }, async (request) => {
    // This release is deliberately emulator-only; no production write path.
    if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.FUNCTIONS_EMULATOR !== 'true')
        throw new HttpsError('failed-precondition', 'Gamma World lobby is emulator-only in v0.6.0');
    let cmd;
    try {
        cmd = validateLobbyRequest(request.auth, request.data);
    }
    catch (e) {
        throw new HttpsError(e.code || 'invalid-argument', e.message);
    }
    const db = getFirestore(), messages = db.collection('gwDevLobbyMessages');
    if (cmd.op === 'list') {
        const snap = await messages.orderBy('createdAt', 'desc').limit(50).get();
        return { messages: snap.docs.reverse().map(d => ({ id: d.id, name: d.data().name, message: d.data().message })) };
    }
    const uid = request.auth.uid, id = createHash('sha256').update(`${uid}:${cmd.commandId}`).digest('hex'), ref = messages.doc(id), rate = db.collection('gwDevLobbyRate').doc(uid);
    await db.runTransaction(async (tx) => { const [old, last] = await Promise.all([tx.get(ref), tx.get(rate)]); if (old.exists)
        return; const now = Date.now(); if (last.exists && now - (last.data().at ?? 0) < 1000)
        throw new HttpsError('resource-exhausted', 'Wait a second before sending another message'); tx.set(ref, { name: cmd.name, message: cmd.message, createdAt: FieldValue.serverTimestamp() }); tx.set(rate, { at: now }); });
    return { ok: true };
});
