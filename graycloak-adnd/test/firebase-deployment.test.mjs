import assert from 'node:assert/strict';
import test from 'node:test';

import { createFirebaseBeginTravelHandler } from '../runtime/firebase-deployment.mjs';

function makeResponse() {
  return {
    statusCode: 0,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; },
    end(text) { this.payload = JSON.parse(text); },
  };
}

test('Firebase deployment adapter verifies tokens with revocation checking', async () => {
  const calls = [];
  const auth = {
    async verifyIdToken(token, checkRevoked) {
      calls.push({ token, checkRevoked });
      return { uid: 'user-1' };
    },
  };
  const commandService = {
    async handleBeginTravel(intent, request) {
      assert.equal(request.principal.uid, 'user-1');
      assert.equal(intent.type, 'beginTravel');
      return {
        ok: true,
        status: 'committed',
        commandId: intent.commandId,
        activityId: intent.activityId,
        actorIds: intent.actorIds,
      };
    },
  };

  const handler = createFirebaseBeginTravelHandler({ auth, commandService });
  const req = {
    method: 'POST',
    url: '/api/commands/begin-travel',
    headers: {
      authorization: 'Bearer firebase-token',
      'content-type': 'application/json',
    },
    body: {
      type: 'beginTravel',
      commandId: 'command-1',
      campaignId: 'campaign-1',
      activityId: 'activity-1',
      expectedWorldTick: 100,
      actorIds: ['actor-1'],
      routeCells: [{ Q: 0, R: 0 }, { Q: 1, R: 0 }],
    },
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.deepEqual(calls, [{ token: 'firebase-token', checkRevoked: true }]);
});

test('Firebase deployment adapter rejects missing Auth configuration immediately', () => {
  assert.throws(
    () => createFirebaseBeginTravelHandler({ commandService: { handleBeginTravel() {} } }),
    /verifyIdToken/,
  );
});
