import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLobbyRequest } from '../lobby.mjs';
test('lobby requires authenticated caller', () => assert.throws(() => validateLobbyRequest(null, { op: 'list' }), e => e.code === 'unauthenticated'));
test('list and valid send normalize and reject untrusted fields', () => { assert.deepEqual(validateLobbyRequest({ uid: 'u' }, { op: 'list' }), { op: 'list' }); assert.deepEqual(validateLobbyRequest({ uid: 'u' }, { op: 'send', name: ' Thorn ', message: ' hello ', commandId: 'abcde1234567890', uid: 'other' }), { op: 'send', name: 'Thorn', message: 'hello', commandId: 'abcde1234567890' }); });
test('invalid message length, malformed IDs and unknown commands rejected', () => { for (const d of [{ op: 'send', name: 'X', message: 'x'.repeat(501), commandId: '0123456789' }, { op: 'send', name: 'X', message: 'x', commandId: '../bad' }, { op: 'reset' }])
    assert.throws(() => validateLobbyRequest({ uid: 'u' }, d), e => e.code === 'invalid-argument'); });
