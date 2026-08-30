import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import {
  DEFAULT_MAX_BODY_BYTES,
  HTTP_ERROR,
  createBeginTravelHttpHandler,
  statusForCommandResult,
} from '../runtime/http-command-endpoint.mjs';

function responseHarness() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value); },
    end(text = '') { this.body = String(text); },
  };
}

function jsonResponse(res) {
  return res.body ? JSON.parse(res.body) : null;
}

function request(options = {}) {
  return {
    method: options.method || 'POST',
    url: options.url || '/api/commands/begin-travel',
    headers: Object.assign({
      'content-type': 'application/json',
      authorization: 'Bearer valid-token',
    }, options.headers || {}),
    body: options.body === undefined ? { type: 'beginTravel', commandId: 'c1' } : options.body,
    ip: '127.0.0.1',
  };
}

function makeHandler(overrides = {}) {
  const seen = {};
  const commandService = overrides.commandService || {
    async handleBeginTravel(intent, context) {
      seen.intent = intent;
      seen.context = context;
      return {
        ok: true,
        status: 'committed',
        commandId: 'c1',
        activityId: 'a1',
        actorIds: ['actor-1'],
        availableAtTick: 220,
        durationTicks: 100,
        eventId: 'c1',
      };
    },
  };
  const verifyIdToken = overrides.verifyIdToken || (async (token, context) => {
    seen.token = token;
    seen.verifyContext = context;
    return { uid: 'user-1', email: 'player@example.test' };
  });
  const handler = createBeginTravelHttpHandler({
    commandService,
    verifyIdToken,
    maxBodyBytes: overrides.maxBodyBytes || DEFAULT_MAX_BODY_BYTES,
  });
  return { handler, seen };
}

test('authenticated POST forwards only the command body and verified principal', async () => {
  const { handler, seen } = makeHandler();
  const res = responseHarness();
  await handler(request({ body: { command: { type: 'beginTravel', commandId: 'c1' } } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(seen.token, 'valid-token');
  assert.deepEqual(seen.intent, { type: 'beginTravel', commandId: 'c1' });
  assert.equal(seen.context.principal.uid, 'user-1');
  assert.equal(seen.context.transport.method, 'POST');
  assert.equal(jsonResponse(res).status, 'committed');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('direct intent bodies remain accepted for a thin endpoint', async () => {
  const { handler, seen } = makeHandler();
  const res = responseHarness();
  await handler(request({ body: { type: 'beginTravel', commandId: 'direct-1' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(seen.intent.commandId, 'direct-1');
});

test('missing or malformed bearer credentials are rejected before the service', async () => {
  let calls = 0;
  const { handler } = makeHandler({ commandService: { async handleBeginTravel() { calls++; return { ok: true }; } } });
  for (const authorization of [null, 'Basic abc', 'Bearer', 'Bearer a b']) {
    const headers = { 'content-type': 'application/json', authorization };
    const res = responseHarness();
    await handler(request({ headers }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(jsonResponse(res).code, HTTP_ERROR.UNAUTHENTICATED);
  }
  assert.equal(calls, 0);
});

test('invalid or uid-less verified tokens are rejected', async () => {
  for (const verifyIdToken of [
    async () => { throw new Error('expired'); },
    async () => ({ email: 'nobody@example.test' }),
  ]) {
    const { handler } = makeHandler({ verifyIdToken });
    const res = responseHarness();
    await handler(request(), res);
    assert.equal(res.statusCode, 401);
    assert.equal(jsonResponse(res).code, HTTP_ERROR.UNAUTHENTICATED);
  }
});

test('non-POST requests return 405 and advertise POST', async () => {
  const { handler } = makeHandler();
  const res = responseHarness();
  await handler(request({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
  assert.equal(jsonResponse(res).code, HTTP_ERROR.METHOD_NOT_ALLOWED);
});

test('endpoint requires JSON media type', async () => {
  const { handler } = makeHandler();
  const res = responseHarness();
  await handler(request({ headers: { 'content-type': 'text/plain', authorization: 'Bearer valid-token' } }), res);
  assert.equal(res.statusCode, 415);
  assert.equal(jsonResponse(res).code, HTTP_ERROR.UNSUPPORTED_MEDIA_TYPE);
});

test('string and stream bodies are parsed with payload limits', async () => {
  const { handler, seen } = makeHandler({ maxBodyBytes: 128 });
  const res1 = responseHarness();
  await handler(request({ body: JSON.stringify({ type: 'beginTravel', commandId: 'string-1' }) }), res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(seen.intent.commandId, 'string-1');

  const stream = Readable.from([JSON.stringify({ type: 'beginTravel', commandId: 'stream-1' })]);
  stream.method = 'POST';
  stream.url = '/api/commands/begin-travel';
  stream.headers = { 'content-type': 'application/json', authorization: 'Bearer valid-token' };
  const res2 = responseHarness();
  await handler(stream, res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(seen.intent.commandId, 'stream-1');

  const res3 = responseHarness();
  await handler(request({
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer valid-token',
      'content-length': '999',
    },
  }), res3);
  assert.equal(res3.statusCode, 413);
  assert.equal(jsonResponse(res3).code, HTTP_ERROR.PAYLOAD_TOO_LARGE);
});

test('pre-parsed object bodies are still subject to the payload limit', async () => {
  const { handler } = makeHandler({ maxBodyBytes: 80 });
  const res = responseHarness();
  await handler(request({ body: { type: 'beginTravel', commandId: 'c1', padding: 'x'.repeat(200) } }), res);
  assert.equal(res.statusCode, 413);
  assert.equal(jsonResponse(res).code, HTTP_ERROR.PAYLOAD_TOO_LARGE);
});

test('malformed JSON and non-object JSON are rejected', async () => {
  const { handler } = makeHandler();
  const malformed = responseHarness();
  await handler(request({ body: '{bad json' }), malformed);
  assert.equal(malformed.statusCode, 400);
  assert.equal(jsonResponse(malformed).code, HTTP_ERROR.INVALID_JSON);

  const arrayBody = responseHarness();
  await handler(request({ body: '[1,2,3]' }), arrayBody);
  assert.equal(arrayBody.statusCode, 400);
  assert.equal(jsonResponse(arrayBody).code, HTTP_ERROR.INVALID_BODY);
});

test('known service failures map to stable HTTP status classes', async () => {
  assert.equal(statusForCommandResult({ ok: false, code: 'invalid-route' }), 400);
  assert.equal(statusForCommandResult({ ok: false, code: 'unauthenticated' }), 401);
  assert.equal(statusForCommandResult({ ok: false, code: 'actor-forbidden' }), 403);
  assert.equal(statusForCommandResult({ ok: false, code: 'actor-not-found' }), 404);
  assert.equal(statusForCommandResult({ ok: false, code: 'stale-world-tick' }), 409);
  assert.equal(statusForCommandResult({ ok: false, code: 'transaction-failed' }), 500);
});

test('4xx service errors expose only safe identifiers', async () => {
  const { handler } = makeHandler({
    commandService: {
      async handleBeginTravel() {
        return { ok: false, code: 'actor-forbidden', actorId: 'actor-2', message: 'secret detail' };
      },
    },
  });
  const res = responseHarness();
  await handler(request(), res);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(jsonResponse(res), { ok: false, code: 'actor-forbidden', actorId: 'actor-2' });
});

test('5xx service errors do not echo internal messages', async () => {
  const { handler } = makeHandler({
    commandService: {
      async handleBeginTravel() {
        return { ok: false, code: 'read-failed', stage: 'service', message: 'database internals' };
      },
    },
  });
  const res = responseHarness();
  await handler(request(), res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(jsonResponse(res), { ok: false, code: 'read-failed', stage: 'service' });
});

test('unexpected service exceptions become generic 500 responses', async () => {
  const { handler } = makeHandler({
    commandService: { async handleBeginTravel() { throw new Error('do not leak me'); } },
  });
  const res = responseHarness();
  await handler(request(), res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(jsonResponse(res), { ok: false, code: HTTP_ERROR.INTERNAL_ERROR });
});

test('idempotent service replay remains an ordinary successful HTTP response', async () => {
  const { handler } = makeHandler({
    commandService: {
      async handleBeginTravel() {
        return {
          ok: true,
          status: 'already-committed',
          idempotentReplay: true,
          commandId: 'c1',
          activityId: 'a1',
          actorIds: ['actor-1'],
          secretInternalValue: 'hidden',
        };
      },
    },
  });
  const res = responseHarness();
  await handler(request(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(jsonResponse(res), {
    ok: true,
    status: 'already-committed',
    idempotentReplay: true,
    commandId: 'c1',
    activityId: 'a1',
    actorIds: ['actor-1'],
  });
});
