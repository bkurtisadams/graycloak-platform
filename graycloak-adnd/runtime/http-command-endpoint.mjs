// http-command-endpoint.mjs v1.3.0 — 2026-08-30
// Thin authenticated HTTP transport for Graycloak authoritative commands.
//
// This file is deployment-neutral. It does not import firebase-admin,
// firebase-functions, Express, or any browser code. A trusted host injects:
//   - verifyIdToken(token, context)
//   - commandService.handleBeginTravel(intent, requestContext)
//
// The handler uses the ordinary Node/Express/Cloud Functions (req, res) shape.

export const HTTP_COMMAND_ENDPOINT_VERSION = 1;
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export const HTTP_ERROR = Object.freeze({
  INVALID_CONFIGURATION: 'invalid-endpoint-configuration',
  METHOD_NOT_ALLOWED: 'method-not-allowed',
  UNSUPPORTED_MEDIA_TYPE: 'unsupported-media-type',
  PAYLOAD_TOO_LARGE: 'payload-too-large',
  INVALID_JSON: 'invalid-json',
  INVALID_BODY: 'invalid-body',
  UNAUTHENTICATED: 'unauthenticated',
  INTERNAL_ERROR: 'internal-error',
});

const BAD_REQUEST_CODES = new Set([
  'invalid-command',
  'invalid-command-id',
  'invalid-command-type',
  'invalid-campaign-id',
  'invalid-activity-id',
  'invalid-expected-world-tick',
  'invalid-actor-ids',
  'duplicate-actor',
  'invalid-route',
  'campaign-mismatch',
  'invalid-route-scale',
]);

const NOT_FOUND_CODES = new Set([
  'campaign-not-found',
  'actor-not-found',
  'region-not-found',
]);

const CONFLICT_CODES = new Set([
  'stale-world-tick',
  'actor-not-at-origin',
  'travel-rejected',
  'missing-authoritative-movement',
  'invalid-authoritative-movement',
  'actor-precondition-failed',
  'activity-already-exists',
  'idempotency-conflict',
]);

const SERVER_ERROR_CODES = new Set([
  'dependency-unavailable',
  'invalid-firestore',
  'invalid-command-runtime',
  'invalid-map-geometry',
  'invalid-collections',
  'movement-resolution-failed',
  'read-failed',
  'service-failed',
  'invalid-bundle',
  'transaction-failed',
]);

function isPlainObject(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function headerValue(req, name) {
  if (!req) return null;
  if (typeof req.get === 'function') {
    const value = req.get(name);
    if (value != null) return String(value);
  }
  const headers = req.headers;
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    return value == null ? null : String(value);
  }
  const target = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() !== target || value == null) continue;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }
  return null;
}

function parseBearerToken(value) {
  if (typeof value !== 'string') return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value.trim());
  return match ? match[1] : null;
}

function jsonContentType(req) {
  const raw = headerValue(req, 'content-type');
  if (!raw) return false;
  const mime = raw.split(';', 1)[0].trim().toLowerCase();
  return mime === 'application/json' || mime.endsWith('+json');
}

function safeContentLength(req) {
  const raw = headerValue(req, 'content-length');
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function byteLength(value) {
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return value.byteLength;
  return null;
}

async function readStreamBody(req, maxBytes) {
  if (!req || typeof req[Symbol.asyncIterator] !== 'function') return null;
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxBytes) {
      const error = new Error(HTTP_ERROR.PAYLOAD_TOO_LARGE);
      error.endpointCode = HTTP_ERROR.PAYLOAD_TOO_LARGE;
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function parseJsonBody(req, maxBytes) {
  const declaredLength = safeContentLength(req);
  if (declaredLength != null && declaredLength > maxBytes) {
    return { ok: false, code: HTTP_ERROR.PAYLOAD_TOO_LARGE };
  }

  let body = req && req.body;
  if (isPlainObject(body)) {
    let serialized;
    try {
      serialized = JSON.stringify(body);
    } catch {
      return { ok: false, code: HTTP_ERROR.INVALID_BODY };
    }
    if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
      return { ok: false, code: HTTP_ERROR.PAYLOAD_TOO_LARGE };
    }
    return { ok: true, value: body };
  }

  if (body == null) {
    try {
      body = await readStreamBody(req, maxBytes);
    } catch (error) {
      if (error && error.endpointCode === HTTP_ERROR.PAYLOAD_TOO_LARGE) {
        return { ok: false, code: HTTP_ERROR.PAYLOAD_TOO_LARGE };
      }
      throw error;
    }
  }

  if (body == null || body === '') return { ok: false, code: HTTP_ERROR.INVALID_BODY };
  const size = byteLength(body);
  if (size != null && size > maxBytes) return { ok: false, code: HTTP_ERROR.PAYLOAD_TOO_LARGE };

  let text;
  if (typeof body === 'string') text = body;
  else if (Buffer.isBuffer(body) || body instanceof Uint8Array) text = Buffer.from(body).toString('utf8');
  else return { ok: false, code: HTTP_ERROR.INVALID_BODY };

  try {
    const value = JSON.parse(text);
    if (!isPlainObject(value)) return { ok: false, code: HTTP_ERROR.INVALID_BODY };
    return { ok: true, value };
  } catch {
    return { ok: false, code: HTTP_ERROR.INVALID_JSON };
  }
}

function commandFromEnvelope(body) {
  if (!isPlainObject(body)) return null;
  if (isPlainObject(body.command)) return body.command;
  if (isPlainObject(body.intent)) return body.intent;
  return body;
}

function principalFromDecodedToken(decoded) {
  if (!decoded || typeof decoded !== 'object') return null;
  const uid = decoded.uid == null ? null : String(decoded.uid).trim();
  if (!uid) return null;
  return Object.freeze({ uid, claims: decoded });
}

export function statusForCommandResult(result) {
  if (result && result.ok) return 200;
  const code = result && result.code ? String(result.code) : HTTP_ERROR.INTERNAL_ERROR;
  if (code === 'unauthenticated') return 401;
  if (code === 'actor-forbidden') return 403;
  if (BAD_REQUEST_CODES.has(code)) return 400;
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (SERVER_ERROR_CODES.has(code)) return 500;
  return 500;
}

function publicCommandResult(result, status) {
  if (result && result.ok) {
    const out = { ok: true };
    for (const key of [
      'status', 'idempotentReplay', 'commandId', 'activityId', 'actorIds',
      'availableAtTick', 'durationTicks', 'eventId',
    ]) {
      if (result[key] !== undefined) out[key] = result[key];
    }
    return out;
  }

  const out = {
    ok: false,
    code: result && result.code ? String(result.code) : HTTP_ERROR.INTERNAL_ERROR,
  };
  if (result && result.stage != null) out.stage = String(result.stage);

  // 4xx identifiers are useful to the caller. Never echo server exception text
  // or arbitrary result fields on a 5xx response.
  if (status < 500 && result) {
    for (const key of ['actorId', 'campaignId', 'regionId', 'commandId', 'activityId']) {
      if (result[key] != null) out[key] = String(result[key]);
    }
  }
  return out;
}

function setHeader(res, name, value) {
  if (res && typeof res.setHeader === 'function') res.setHeader(name, value);
  else if (res && typeof res.set === 'function') res.set(name, value);
}

function sendJson(res, status, payload) {
  setHeader(res, 'Content-Type', 'application/json; charset=utf-8');
  setHeader(res, 'Cache-Control', 'no-store');
  setHeader(res, 'X-Content-Type-Options', 'nosniff');
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(payload);
    return;
  }
  if (res) res.statusCode = status;
  const text = JSON.stringify(payload);
  if (res && typeof res.end === 'function') res.end(text);
}

function requestMetadata(req) {
  return Object.freeze({
    method: String((req && req.method) || '').toUpperCase(),
    path: String((req && (req.originalUrl || req.url)) || ''),
    userAgent: headerValue(req, 'user-agent'),
    ip: req && (req.ip || (req.socket && req.socket.remoteAddress)) || null,
  });
}

function configurationValid(options) {
  return !!(
    options &&
    options.commandService && typeof options.commandService.handleBeginTravel === 'function' &&
    typeof options.verifyIdToken === 'function' &&
    Number.isSafeInteger(options.maxBodyBytes) && options.maxBodyBytes > 0
  );
}

export function createBeginTravelHttpHandler(options = {}) {
  const config = {
    commandService: options.commandService,
    verifyIdToken: options.verifyIdToken,
    maxBodyBytes: options.maxBodyBytes == null ? DEFAULT_MAX_BODY_BYTES : options.maxBodyBytes,
    logger: options.logger && typeof options.logger.error === 'function' ? options.logger : null,
  };
  const valid = configurationValid(config);

  return async function beginTravelHttpHandler(req, res) {
    if (!valid) {
      sendJson(res, 500, { ok: false, code: HTTP_ERROR.INVALID_CONFIGURATION });
      return;
    }

    const method = String((req && req.method) || '').toUpperCase();
    if (method !== 'POST') {
      setHeader(res, 'Allow', 'POST');
      sendJson(res, 405, { ok: false, code: HTTP_ERROR.METHOD_NOT_ALLOWED });
      return;
    }

    if (!jsonContentType(req)) {
      sendJson(res, 415, { ok: false, code: HTTP_ERROR.UNSUPPORTED_MEDIA_TYPE });
      return;
    }

    const token = parseBearerToken(headerValue(req, 'authorization'));
    if (!token) {
      sendJson(res, 401, { ok: false, code: HTTP_ERROR.UNAUTHENTICATED });
      return;
    }

    let decoded;
    try {
      decoded = await config.verifyIdToken(token, { request: requestMetadata(req) });
    } catch {
      sendJson(res, 401, { ok: false, code: HTTP_ERROR.UNAUTHENTICATED });
      return;
    }
    const principal = principalFromDecodedToken(decoded);
    if (!principal) {
      sendJson(res, 401, { ok: false, code: HTTP_ERROR.UNAUTHENTICATED });
      return;
    }

    let parsed;
    try {
      parsed = await parseJsonBody(req, config.maxBodyBytes);
    } catch (error) {
      if (config.logger) config.logger.error('Graycloak endpoint body read failed', { error });
      sendJson(res, 500, { ok: false, code: HTTP_ERROR.INTERNAL_ERROR });
      return;
    }
    if (!parsed.ok) {
      const status = parsed.code === HTTP_ERROR.PAYLOAD_TOO_LARGE ? 413 : 400;
      sendJson(res, status, { ok: false, code: parsed.code });
      return;
    }

    const intent = commandFromEnvelope(parsed.value);
    if (!intent) {
      sendJson(res, 400, { ok: false, code: HTTP_ERROR.INVALID_BODY });
      return;
    }

    let result;
    try {
      result = await config.commandService.handleBeginTravel(intent, {
        principal,
        transport: requestMetadata(req),
      });
    } catch (error) {
      if (config.logger) config.logger.error('Graycloak Begin Travel service failed', { error });
      sendJson(res, 500, { ok: false, code: HTTP_ERROR.INTERNAL_ERROR });
      return;
    }

    const status = statusForCommandResult(result);
    sendJson(res, status, publicCommandResult(result, status));
  };
}
