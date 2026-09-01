export const SUBSECTOR_COLUMNS = 8;
export const SUBSECTOR_ROWS = 10;

function integerInRange(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer from ${min} to ${max}`);
  }
  return value;
}

export function formatSubsectorHex(column, row) {
  integerInRange(column, 1, SUBSECTOR_COLUMNS, 'column');
  integerInRange(row, 1, SUBSECTOR_ROWS, 'row');
  return `${String(column).padStart(2, '0')}${String(row).padStart(2, '0')}`;
}

export function parseSubsectorHex(hex) {
  const value = String(hex ?? '').trim();
  if (!/^\d{4}$/.test(value)) throw new TypeError('subsector hex must be a four-digit string such as 0405');
  const column = Number.parseInt(value.slice(0, 2), 10);
  const row = Number.parseInt(value.slice(2), 10);
  integerInRange(column, 1, SUBSECTOR_COLUMNS, 'column');
  integerInRange(row, 1, SUBSECTOR_ROWS, 'row');
  return { column, row };
}

// Traveller subsector maps use vertical columns of pointy-topped hexes. This
// converts the printed 0101-style odd-column offset coordinates to cube space
// so one adjacent map hex always equals one parsec.
function oddColumnOffsetToCube({ column, row }) {
  const x = column - 1;
  const z = (row - 1) - Math.floor(x / 2);
  const y = -x - z;
  return { x, y, z };
}

export function subsectorHexDistance(a, b) {
  const ac = oddColumnOffsetToCube(typeof a === 'string' ? parseSubsectorHex(a) : a);
  const bc = oddColumnOffsetToCube(typeof b === 'string' ? parseSubsectorHex(b) : b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z)
  );
}

export function validateAuthoredSubsector(subsector) {
  const errors = [];
  if (!subsector || typeof subsector !== 'object' || Array.isArray(subsector)) {
    return { valid: false, errors: ['subsector must be an object'] };
  }
  if (typeof subsector.id !== 'string' || !subsector.id.trim()) errors.push('subsector.id must be a nonblank string');
  if (typeof subsector.name !== 'string' || !subsector.name.trim()) errors.push('subsector.name must be a nonblank string');
  if (!Array.isArray(subsector.systems)) errors.push('subsector.systems must be an array');
  if (Array.isArray(subsector.systems)) {
    const ids = new Set();
    const hexes = new Set();
    for (const system of subsector.systems) {
      if (!system || typeof system !== 'object' || Array.isArray(system)) {
        errors.push('each system must be an object');
        continue;
      }
      if (typeof system.id !== 'string' || !system.id.trim()) errors.push('system.id must be a nonblank string');
      else if (ids.has(system.id)) errors.push(`duplicate system id: ${system.id}`);
      else ids.add(system.id);
      try {
        const parsedHex = parseSubsectorHex(system.hex);
        const normalizedHex = formatSubsectorHex(parsedHex.column, parsedHex.row);
        if (hexes.has(normalizedHex)) errors.push(`duplicate system hex: ${normalizedHex}`);
        hexes.add(normalizedHex);
      } catch (error) {
        errors.push(`invalid system hex for ${system.id ?? '(unknown)'}: ${error.message}`);
      }
      if (typeof system.name !== 'string' || !system.name.trim()) errors.push(`system.name must be nonblank for ${system.id ?? '(unknown)'}`);
      if (!system.mainWorld || typeof system.mainWorld !== 'object' || Array.isArray(system.mainWorld)) {
        errors.push(`system.mainWorld must be an object for ${system.id ?? '(unknown)'}`);
      } else {
        if (typeof system.mainWorld.id !== 'string' || !system.mainWorld.id.trim()) errors.push(`mainWorld.id must be nonblank for ${system.id ?? '(unknown)'}`);
        if (typeof system.mainWorld.name !== 'string' || !system.mainWorld.name.trim()) errors.push(`mainWorld.name must be nonblank for ${system.id ?? '(unknown)'}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidAuthoredSubsector(subsector) {
  const result = validateAuthoredSubsector(subsector);
  if (!result.valid) throw new Error(`invalid authored subsector: ${result.errors.join('; ')}`);
  return subsector;
}

export function getSubsectorSystem(subsector, systemId) {
  assertValidAuthoredSubsector(subsector);
  return subsector.systems.find((system) => system.id === systemId) ?? null;
}

export function getJumpDestinations(subsector, currentSystemId, jumpRating) {
  assertValidAuthoredSubsector(subsector);
  if (!Number.isInteger(jumpRating) || jumpRating < 0) throw new RangeError('jumpRating must be a non-negative integer');
  const current = getSubsectorSystem(subsector, currentSystemId);
  if (!current) throw new Error(`current system not found in subsector: ${currentSystemId}`);
  return subsector.systems
    .filter((system) => system.id !== current.id)
    .map((system) => ({ system, distance: subsectorHexDistance(current.hex, system.hex) }))
    .filter((entry) => entry.distance <= jumpRating)
    .sort((a, b) => a.distance - b.distance || a.system.name.localeCompare(b.system.name));
}

export function jumpDistanceBetweenSystems(subsector, fromSystemId, toSystemId) {
  const from = getSubsectorSystem(subsector, fromSystemId);
  const to = getSubsectorSystem(subsector, toSystemId);
  if (!from) throw new Error(`origin system not found in subsector: ${fromSystemId}`);
  if (!to) throw new Error(`destination system not found in subsector: ${toSystemId}`);
  return subsectorHexDistance(from.hex, to.hex);
}
