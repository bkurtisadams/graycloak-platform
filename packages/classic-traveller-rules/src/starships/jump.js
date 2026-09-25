// jump.js — leaving port, the jump itself, and what goes wrong in between.
//
// v0.68.0. Build-order step 2. Two sources, by ruling (Graycloak, Sep 2026):
//
//   Book 2 (1977) pp.3-4, 12, 16, 33 for the departure requirements — crew,
//   programs, flight plans — and for hijacking and the anti-hijack program.
//
//   The Traveller Book (1982), "Starship Malfunctions", adopted wholesale in
//   place of Book 2 p.4's drive failure and misjump, as with medical care and
//   animal encounters before it. Its drive failure is weekly and per drive;
//   its misjump adds weeks in jump space and destroys a ship on 16+ — kept
//   RAW, so jumping inside 10 planetary diameters is very nearly suicide.
//
// Two further rulings:
//
//   "Equipped to use unrefined fuel" means scout and military hulls: Book 2
//   p.4 exempts "military and scout ships" from the unrefined-fuel DM, and
//   p.19 calls the Type C cruiser quasi-military.
//
//   "Engineers missing" counts against Book 2 p.16: one engineer per 35 tons
//   of drives and power plant installed, on hulls over 100 tons.
//
// Pure: ship documents in, ship documents out, rolls through the dice given.

import { createDice, requireDice } from '../dice.js';
import { assertValidShipDocument, MALFUNCTION_DRIVES, shipCrewMemberRoles } from './ship-document.js';
import { POWER_PLANTS, MANEUVER_DRIVES, JUMP_DRIVES } from './components.js';
import { canShipMakeJump, consumeJumpFuel, shipMaintenanceStatus, shipGunnerRequirement, HIGH_PASSENGERS_PER_STEWARD, debitShipAccount } from './operations.js';
import { assertGameDate, addDays, daysBetween } from '../time/dates.js';
import { SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, formatSubsectorHex, parseSubsectorHex } from '../worlds/subsector.js';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

// ------------------------------------------------------------------- crew

export const UNREFINED_FUEL_EQUIPPED_DESIGNS = Object.freeze(['type-s-scout-courier', 'type-c-cruiser']);
export const ENGINEER_TONS_PER_ENGINEER = 35;
export const NAVIGATOR_REQUIRED_OVER_TONS = 200;
export const MEDIC_REQUIRED_OVER_TONS = 100;
export const ENGINEER_REQUIRED_OVER_TONS = 100;

export function shipEquippedForUnrefinedFuel(ship) {
  return UNREFINED_FUEL_EQUIPPED_DESIGNS.includes(ship.design.key);
}

export function installedDriveTons(ship) {
  const drives = ship.specifications.drives;
  return POWER_PLANTS[drives.powerPlant.letter].tons
    + MANEUVER_DRIVES[drives.maneuver.letter].tons
    + JUMP_DRIVES[drives.jump.letter].tons;
}

function assignedCount(ship, role) {
  return ship.crew.assignments.filter((entry) => entry.role === role).length;
}

/**
 * Book 2 p.16 crew requirements against who is aboard. Engineers are a risk
 * (the 1982 drive-failure DM), gunners advisory ("in many cases... the gunner
 * position will be omitted"); the rest must be filled to leave.
 */
export function shipCrewRequirements(ship) {
  assertValidShipDocument(ship);
  const tons = ship.specifications.hull.tons;
  const highPassengers = ship.state.passengerManifest.filter((entry) => entry.class === 'high').length;
  const engineersRequired = tons > ENGINEER_REQUIRED_OVER_TONS ? Math.ceil(installedDriveTons(ship) / ENGINEER_TONS_PER_ENGINEER) : 0;
  const gunners = shipGunnerRequirement(ship);
  const rows = [
    { role: 'pilot', required: 1, blocking: true, source: 'Book 2 p.16: every starship requires at least one pilot' },
    { role: 'navigator', required: tons > NAVIGATOR_REQUIRED_OVER_TONS ? 1 : 0, blocking: true, source: 'Book 2 p.16: over 200 tons' },
    { role: 'engineer', required: engineersRequired, blocking: false, source: 'Book 2 p.16: one per 35 tons of drives, over 100 tons; 1982: +1 drive-failure DM per engineer missing' },
    { role: 'medic', required: tons > MEDIC_REQUIRED_OVER_TONS ? 1 : 0, blocking: true, source: 'Book 2 p.16: over 100 tons' },
    { role: 'steward', required: Math.ceil(highPassengers / HIGH_PASSENGERS_PER_STEWARD), blocking: true, source: 'Book 2 p.16: one per 8 high passengers' },
    { role: 'gunner', required: gunners.armedTurrets, blocking: false, source: 'Book 2 p.16: one per turret, often omitted' }
  ].map((row) => {
    const assigned = assignedCount(ship, row.role);
    return Object.freeze({ ...row, assigned, missing: Math.max(0, row.required - assigned) });
  });
  return Object.freeze(rows);
}

export function missingEngineers(ship) {
  return shipCrewRequirements(ship).find((row) => row.role === 'engineer').missing;
}

// --------------------------------------------------------------------- DMs

function usingUnrefined(ship) {
  return ship.state.fuelQuality === 'unrefined' || ship.state.fuelQuality === 'mixed';
}

/** 1982: +1 unrefined (not equipped), +5 inside 100 diameters, +15 inside 10. */
export function misjumpDMParts(ship, { diametersFromWorld = null } = {}) {
  assertValidShipDocument(ship);
  const parts = [];
  if (usingUnrefined(ship) && !shipEquippedForUnrefinedFuel(ship)) parts.push({ dm: 1, why: 'unrefined fuel, not equipped for it' });
  if (diametersFromWorld !== null) {
    if (!Number.isFinite(diametersFromWorld) || diametersFromWorld < 0) throw new RangeError('diametersFromWorld must be a non-negative number or null');
    if (diametersFromWorld < 10) parts.push({ dm: 15, why: 'within 10 planetary diameters' });
    else if (diametersFromWorld < 100) parts.push({ dm: 5, why: 'within 100 planetary diameters' });
  }
  return Object.freeze(parts);
}

/** 1982: +1 unrefined (not equipped), +1 per engineer missing, +1 per week past the overhaul. */
export function driveFailureDMParts(ship, { dateLabel, sinceLabel = null } = {}) {
  assertValidShipDocument(ship);
  const parts = [];
  if (usingUnrefined(ship) && !shipEquippedForUnrefinedFuel(ship)) parts.push({ dm: 1, why: 'unrefined fuel, not equipped for it' });
  const missing = missingEngineers(ship);
  if (missing > 0) parts.push({ dm: missing, why: `${missing} engineer${missing === 1 ? '' : 's'} missing` });
  const maintenance = shipMaintenanceStatus(ship, { dateLabel, sinceLabel });
  const weeks = Math.floor((maintenance.daysOverdue ?? 0) / 7);
  if (weeks > 0) parts.push({ dm: weeks, why: `${weeks} week${weeks === 1 ? '' : 's'} past annual overhaul` });
  return Object.freeze(parts);
}

const sumDM = (parts) => parts.reduce((sum, part) => sum + part.dm, 0);

// --------------------------------------------------------------- checklist

/**
 * Every gate between a berthed ship and a jump, as rows. `ok` is false when
 * any blocking row fails. `laneExists` is the caller's word that the starport
 * sells a flight-plan cassette for this destination (Book 2 p.32, Book 3).
 */
export function departureChecklist(ship, {
  distance,
  dateLabel,
  sinceLabel = null,
  laneExists = false,
  diametersFromWorld = null
} = {}) {
  assertValidShipDocument(ship);
  assertGameDate(dateLabel, 'dateLabel');
  if (!Number.isInteger(distance) || distance < 1) throw new TypeError('distance must be a positive integer');
  const rows = [];
  const row = (key, ok, blocking, detail) => rows.push(Object.freeze({ key, ok, blocking, detail }));
  const rating = ship.specifications.drives.jump.rating;
  const programs = ship.state.computer.programs;

  row('jump-drive', distance <= rating, true, `Jump-${distance} against a Jump-${rating} drive`);
  row('computer', distance <= ship.specifications.computer.maximumSupportedJump, true,
    `Model/${ship.specifications.computer.model} supports jump-${ship.specifications.computer.maximumSupportedJump}`);

  if (distance <= rating) {
    const fuel = canShipMakeJump(ship, distance);
    row('fuel', fuel.allowed, true, fuel.allowed
      ? `${fuel.requirement.totalTons} tons needed, ${fuel.availableTons} aboard (Book 2 p.6)`
      : fuel.reason);
  }

  row('jump-program', programs.includes(`jump-${distance}`), true, `Jump-${distance} program (Book 2 p.32)`);
  row('navigation-program', programs.includes('navigation'), true, 'Navigation program (Book 2 p.33)');
  row('flight-plan', laneExists || programs.includes('generate'), true,
    laneExists ? 'flight-plan cassette from the starport' : (programs.includes('generate') ? 'Generate program' : 'no lane cassette and no Generate program'));

  const failed = ship.state.malfunction?.failed ?? [];
  row('drives', !failed.includes('jumpDrive') && !failed.includes('powerPlant'), true,
    failed.length ? `failed: ${failed.join(', ')}` : 'jump drive and power plant running');

  for (const requirement of shipCrewRequirements(ship)) {
    if (requirement.required === 0) continue;
    row(`crew-${requirement.role}`, requirement.missing === 0, requirement.blocking,
      `${requirement.assigned} of ${requirement.required} ${requirement.role}${requirement.required === 1 ? '' : 's'}`);
  }

  const misjump = misjumpDMParts(ship, { diametersFromWorld });
  const driveFailure = driveFailureDMParts(ship, { dateLabel, sinceLabel });
  const misjumpDM = sumDM(misjump);
  row('misjump-risk', misjumpDM === 0, false, misjumpDM === 0
    ? 'no misjump risk (13+ on 2D)'
    : `misjump 13+ at DM +${misjumpDM}${misjumpDM >= 14 ? ' — the ship is destroyed on 16+' : ''}: ${misjump.map((part) => part.why).join('; ')}`);

  return Object.freeze({
    ok: rows.every((entry) => entry.ok || !entry.blocking),
    rows: Object.freeze(rows),
    misjumpDM,
    misjumpDMParts: misjump,
    driveFailureDM: sumDM(driveFailure),
    driveFailureDMParts: driveFailure
  });
}

// ----------------------------------------------------------------- misjump

export const MISJUMP_THROW = 13;
export const MISJUMP_DESTROYED_THROW = 16;
export const JUMP_WEEK_DAYS = 7;

// Cube directions on Book 3's grid, numbered clockwise from straight up the
// map: 1 up, 2 upper right, 3 lower right, 4 down, 5 lower left, 6 upper left.
const HEX_DIRECTIONS = Object.freeze({
  1: { x: 0, z: -1 }, 2: { x: 1, z: -1 }, 3: { x: 1, z: 0 },
  4: { x: 0, z: 1 }, 5: { x: -1, z: 1 }, 6: { x: -1, z: 0 }
});

/**
 * The hex `distance` steps from `fromHex` in `direction`, which may lie off
 * the subsector (column and row are then outside 1-8 and 1-10) and may hold
 * no world at all. Deep space is allowed (ruling, Sep 2026).
 */
// v0.79.1: on any map — a subsector (8x10) by default, or a sector (32x40)
// given as bounds; "inSubsector" means inside those bounds.
export function hexInDirection(fromHex, direction, distance, bounds = null) {
  const columns = bounds?.columns ?? SUBSECTOR_COLUMNS;
  const rows = bounds?.rows ?? SUBSECTOR_ROWS;
  const { column, row } = parseSubsectorHex(fromHex, { columns, rows });
  const step = HEX_DIRECTIONS[direction];
  if (!step) throw new RangeError('direction must be 1 to 6');
  if (!Number.isInteger(distance) || distance < 0) throw new RangeError('distance must be a non-negative integer');
  const x = column - 1 + step.x * distance;
  const z = (row - 1) - Math.floor((column - 1) / 2) + step.z * distance;
  const toColumn = x + 1;
  const toRow = z + Math.floor(x / 2) + 1;
  const inSubsector = toColumn >= 1 && toColumn <= columns && toRow >= 1 && toRow <= rows;
  return Object.freeze({ column: toColumn, row: toRow, inSubsector, hex: inSubsector ? formatSubsectorHex(toColumn, toRow, { columns, rows }) : null });
}

/**
 * 1982: throw 13+ for a misjump; 16+ destroys the ship. A misjump is 1D
 * dice of hexes in one of six directions, and 1D weeks in jump space. A
 * clean jump is one week.
 */
export function rollMisjump(dice, { dm = 0 } = {}) {
  requireDice(dice);
  const rolled = dice.roll2D6();
  const total = rolled.total + dm;
  if (total >= MISJUMP_DESTROYED_THROW) {
    return Object.freeze({ dice: rolled.dice, dm, total, misjump: true, destroyed: true, weeksInJump: null, distanceHexes: null, direction: null });
  }
  if (total < MISJUMP_THROW) {
    return Object.freeze({ dice: rolled.dice, dm, total, misjump: false, destroyed: false, weeksInJump: 1, distanceHexes: null, direction: null });
  }
  const diceCount = dice.rollD6();
  let distanceHexes = 0;
  const distanceDice = [];
  for (let index = 0; index < diceCount; index += 1) {
    const die = dice.rollD6();
    distanceDice.push(die);
    distanceHexes += die;
  }
  const direction = dice.rollD6();
  const weeksInJump = dice.rollD6();
  return Object.freeze({ dice: rolled.dice, dm, total, misjump: true, destroyed: false, diceCount, distanceDice, distanceHexes, direction, weeksInJump });
}

// ----------------------------------------------------------- drive failure

export const DRIVE_FAILURE_THROW = 13;
export const DRIVE_SECTION_FAILURE_THROW = 7;
export const DRIVE_REPAIR_THROW = 10;
export const BATTERY_DAYS = 10;

/**
 * 1982: each week, 13+ for a malfunction; then 7+ for each drive in use to
 * see which actually fail. Only the roll — applyDriveFailure records it.
 */
export function rollDriveFailure(dice, { dm = 0, drivesInUse = MALFUNCTION_DRIVES } = {}) {
  requireDice(dice);
  const rolled = dice.roll2D6();
  const total = rolled.total + dm;
  const malfunction = total >= DRIVE_FAILURE_THROW;
  const sections = [];
  if (malfunction) {
    for (const drive of drivesInUse) {
      if (!MALFUNCTION_DRIVES.includes(drive)) throw new RangeError(`unknown drive section: ${drive}`);
      const section = dice.roll2D6();
      sections.push(Object.freeze({ drive, dice: section.dice, roll: section.total, failed: section.total >= DRIVE_SECTION_FAILURE_THROW }));
    }
  }
  return Object.freeze({
    dice: rolled.dice, dm, total, malfunction,
    sections: Object.freeze(sections),
    failed: Object.freeze(sections.filter((section) => section.failed).map((section) => section.drive))
  });
}

/** Record failed drives. A malfunction already running gains the new ones. */
export function applyDriveFailure(ship, { failed, dateLabel } = {}) {
  assertValidShipDocument(ship);
  assertGameDate(dateLabel, 'dateLabel');
  if (!Array.isArray(failed) || failed.some((drive) => !MALFUNCTION_DRIVES.includes(drive))) throw new RangeError('failed must list drive sections');
  if (failed.length === 0) return cloneJson(ship);
  const next = cloneJson(ship);
  const current = next.state.malfunction;
  next.state.malfunction = current && current.failed.length
    ? { failed: [...new Set([...current.failed, ...failed])], since: current.since, patched: current.patched }
    : { failed: [...failed], since: dateLabel, patched: current?.patched ?? false };
  assertValidShipDocument(next);
  return next;
}

/**
 * 1982: 10+ per day spent on repairs, DM + engineering skill of the attending
 * engineer, fixes them temporarily. One throw patches every failed drive;
 * the ship still needs a starport ("more complete repairs").
 */
export function attemptDriveRepair(ship, dice, { engineeringSkill = 0, dateLabel } = {}) {
  assertValidShipDocument(ship);
  requireDice(dice);
  assertGameDate(dateLabel, 'dateLabel');
  const failed = ship.state.malfunction?.failed ?? [];
  if (!failed.length) throw new RangeError('no drive has failed');
  const rolled = dice.roll2D6();
  const total = rolled.total + engineeringSkill;
  const success = total >= DRIVE_REPAIR_THROW;
  const next = cloneJson(ship);
  if (success) next.state.malfunction = { failed: [], since: ship.state.malfunction.since, patched: true };
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, dice: rolled.dice, dm: engineeringSkill, total, success, repaired: success ? [...failed] : [] });
}

/**
 * The Engineering DM for repairs in jump space: the best among the ship's
 * engineers, where one doubling in a second post counts as 0 (Book 2 p.17:
 * no expertise DMs in either position). Null with no engineer — 1982 has
 * "attending engineers" throw, so nobody else tries.
 */
export function attendingEngineerExpertise(ship, engineeringById = {}) {
  assertValidShipDocument(ship);
  const engineers = ship.crew.assignments.filter((entry) => String(entry.role).toLowerCase() === 'engineer');
  if (!engineers.length) return null;
  return Math.max(...engineers.map((entry) => (shipCrewMemberRoles(ship, entry.characterId).appliesExpertise ? Number(engineeringById[entry.characterId] ?? 0) || 0 : 0)));
}

// RULING (Sep 2026): the 1982 "more complete repairs" are priced by Book 2
// p.18 Repair Parts — 2D x 10% of each failed drive's own price. p.18's own
// two discounts apply: DM -2 when the ship's crew installs the parts (it
// "should have appropriate expertise levels": an engineer aboard), and since
// "complete replacement of the item is sometimes cheaper", no repair costs
// more than a new drive (capped at 100%). 0% or less is free.
export const REPAIR_PARTS_CREW_INSTALL_DM = -2;
export const REPAIR_PARTS_MAX_PERCENT = 100;
const DRIVE_PRICE_TABLES = Object.freeze({
  powerPlant: { table: POWER_PLANTS, spec: 'powerPlant', label: 'power plant' },
  maneuverDrive: { table: MANEUVER_DRIVES, spec: 'maneuver', label: 'maneuver drive' },
  jumpDrive: { table: JUMP_DRIVES, spec: 'jump', label: 'jump drive' }
});

export function quoteStarportDriveRepair(ship, dice, { crewInstalls = null } = {}) {
  assertValidShipDocument(ship);
  requireDice(dice);
  const byCrew = crewInstalls ?? ship.crew.assignments.some((entry) => String(entry.role).toLowerCase() === 'engineer');
  const dm = byCrew ? REPAIR_PARTS_CREW_INSTALL_DM : 0;
  const failed = ship.state.malfunction?.failed ?? [];
  const parts = failed.map((drive) => {
    const entry = DRIVE_PRICE_TABLES[drive];
    const letter = ship.specifications.drives[entry.spec].letter;
    const assemblyCr = Math.round(entry.table[letter].priceMCr * 1_000_000);
    const rolled = dice.roll2D6();
    const thrown = Math.max(0, rolled.total + dm) * 10;
    const percent = Math.min(REPAIR_PARTS_MAX_PERCENT, thrown);
    return Object.freeze({ drive, label: entry.label, assemblyCr, dice: rolled.dice, dm, percent, replaced: thrown > REPAIR_PARTS_MAX_PERCENT, costCr: Math.round(assemblyCr * percent / 100) });
  });
  return Object.freeze({ crewInstalls: byCrew, parts: Object.freeze(parts), costCr: parts.reduce((sum, part) => sum + part.costCr, 0) });
}

/** Complete repairs "made at a starport by qualified personnel": class A-C. */
export const DRIVE_REPAIR_STARPORTS = Object.freeze(['A', 'B', 'C']);

export function completeDriveRepair(ship, { starport } = {}) {
  assertValidShipDocument(ship);
  const port = String(starport ?? '').toUpperCase();
  if (!DRIVE_REPAIR_STARPORTS.includes(port)) throw new RangeError(`drive repairs need repair facilities: a class A, B or C starport, not ${port || '?'}`);
  const next = cloneJson(ship);
  next.state.malfunction = null;
  assertValidShipDocument(next);
  return next;
}

/** Complete repairs at a class A-C starport, charged at the quote given. */
export function repairDrivesAtStarport(ship, { starport, quote, dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  if (!quote || !Array.isArray(quote.parts)) throw new TypeError('a repair quote is required');
  const failed = ship.state.malfunction?.failed ?? [];
  if (!failed.length) throw new RangeError('no drive has failed');
  let next = completeDriveRepair(ship, { starport });
  if (quote.costCr > 0) {
    next = debitShipAccount(next, quote.costCr, {
      kind: 'repair',
      description: `Drive repair at the starport, ${quote.crewInstalls ? 'installed by the crew' : 'by the shipyard'}: ${quote.parts.map((part) => `${part.label} ${part.replaced ? 'replaced (100%)' : `${part.percent}%`}`).join(', ')} (Book 2 p.18)`,
      dateLabel
    });
  }
  return Object.freeze({ ship: next, costCr: quote.costCr });
}

/** 1982: with the power plant down, batteries hold life support for 10 days. */
export function shipBatteryStatus(ship, { dateLabel } = {}) {
  assertValidShipDocument(ship);
  assertGameDate(dateLabel, 'dateLabel');
  const malfunction = ship.state.malfunction;
  if (!malfunction?.failed.includes('powerPlant')) {
    return Object.freeze({ onBatteries: false, exhaustedOn: null, daysRemaining: null, exhausted: false });
  }
  const exhaustedOn = addDays(malfunction.since, BATTERY_DAYS);
  const daysRemaining = Math.max(0, daysBetween(dateLabel, exhaustedOn));
  return Object.freeze({ onBatteries: true, exhaustedOn, daysRemaining, exhausted: daysRemaining === 0 });
}

// ------------------------------------------------------------------ hijack

export const HIJACK_THROW = 18;
export const ANTI_HIJACK_BRIDGE_THROW = 5;

/**
 * Book 2 p.3: 3D, exactly 18, one or more passengers attempts a hijacking.
 * Not rolled when every passenger is a player character — the caller says
 * how many are not. Low passengers are asleep and do not count.
 */
export function rollHijackAttempt(dice, { nonPlayerPassengers = 0 } = {}) {
  requireDice(dice);
  if (!Number.isInteger(nonPlayerPassengers) || nonPlayerPassengers < 0) throw new TypeError('nonPlayerPassengers must be a non-negative integer');
  if (nonPlayerPassengers === 0) return Object.freeze({ rolled: false, attempt: false, dice: [], total: null });
  const faces = [dice.rollD6(), dice.rollD6(), dice.rollD6()];
  const total = faces[0] + faces[1] + faces[2];
  const attempt = total === HIJACK_THROW;
  // "Implement their attempt at some point during the voyage": the day.
  const day = attempt ? dice.rollD6() : null;
  return Object.freeze({ rolled: true, attempt, dice: faces, total, day });
}

/**
 * Book 2 p.3: with the anti-hijack program running, hijackers reach the
 * bridge only on 2D of 5 or less. Without it, the bridge is theirs to take.
 */
export function rollHijackersReachBridge(dice, ship) {
  requireDice(dice);
  assertValidShipDocument(ship);
  if (!ship.state.computer.programs.includes('anti-hijack')) return Object.freeze({ protected: false, dice: [], total: null, reached: true });
  const rolled = dice.roll2D6();
  return Object.freeze({ protected: true, dice: rolled.dice, total: rolled.total, reached: rolled.total <= ANTI_HIJACK_BRIDGE_THROW });
}

// -------------------------------------------------------------------- jump

/**
 * Leave for jump space. Runs the checklist (refusing a blocked departure),
 * burns the fuel, rolls the misjump and the hijack, and says when and where
 * the ship comes out. The ship is not moved: arrival is the runner's.
 *
 * `fromHex` and `toHex` are subsector hexes; a misjump replaces `toHex`
 * with wherever it lands, which may be off the map or empty.
 */
export function beginJump(ship, {
  dice = createDice(),
  distance,
  fromHex,
  toHex,
  dateLabel,
  sinceLabel = null,
  laneExists = false,
  diametersFromWorld = null,
  nonPlayerPassengers = null,
  bounds = null
} = {}) {
  requireDice(dice);
  const checklist = departureChecklist(ship, { distance, dateLabel, sinceLabel, laneExists, diametersFromWorld });
  if (!checklist.ok) {
    const blocked = checklist.rows.filter((row) => row.blocking && !row.ok).map((row) => `${row.key}: ${row.detail}`);
    throw new RangeError(`departure blocked — ${blocked.join('; ')}`);
  }
  const mapBounds = bounds ?? { columns: SUBSECTOR_COLUMNS, rows: SUBSECTOR_ROWS };
  parseSubsectorHex(fromHex, mapBounds);
  parseSubsectorHex(toHex, mapBounds);

  const fuel = consumeJumpFuel(ship, distance);
  const fuelQuality = ship.state.fuelQuality;
  const misjump = rollMisjump(dice, { dm: checklist.misjumpDM });
  const stateroomPassengers = ship.state.passengerManifest.filter((entry) => entry.class !== 'low').length;
  const hijack = rollHijackAttempt(dice, { nonPlayerPassengers: nonPlayerPassengers ?? stateroomPassengers });

  let destination = { hex: toHex, inSubsector: true, planned: true };
  if (misjump.misjump && !misjump.destroyed) {
    const landed = hexInDirection(fromHex, misjump.direction, misjump.distanceHexes, mapBounds);
    destination = { ...landed, planned: false };
  }
  const weeks = misjump.destroyed ? 0 : misjump.weeksInJump;

  return Object.freeze({
    ship: fuel.ship,
    checklist,
    fuelConsumedTons: fuel.consumedTons,
    fuelQuality,
    misjump,
    destroyed: misjump.destroyed,
    hijack,
    startedOn: dateLabel,
    weeksInJump: weeks,
    emergesOn: misjump.destroyed ? null : addDays(dateLabel, weeks * JUMP_WEEK_DAYS),
    destination: Object.freeze(destination),
    driveFailureDM: checklist.driveFailureDM
  });
}

/**
 * One week in jump space: the 1982 weekly drive-failure throw, recorded on
 * the ship. With `engineeringSkill` given, the attending engineer then tries
 * a repair on each remaining day of the week until one takes. A failure is
 * taken to strike on the week's first day. The jump completes regardless —
 * the ship is already in jump space — and arrives with whatever still runs.
 */
export function resolveJumpWeek(ship, {
  dice = createDice(),
  weekStartsOn,
  dm = null,
  sinceLabel = null,
  engineeringSkill = null,
  drivesInUse = MALFUNCTION_DRIVES
} = {}) {
  requireDice(dice);
  assertValidShipDocument(ship);
  assertGameDate(weekStartsOn, 'weekStartsOn');
  const failureDM = dm ?? sumDM(driveFailureDMParts(ship, { dateLabel: weekStartsOn, sinceLabel }));
  const alreadyDown = ship.state.malfunction?.failed ?? [];
  const failure = rollDriveFailure(dice, { dm: failureDM, drivesInUse: drivesInUse.filter((drive) => !alreadyDown.includes(drive)) });
  let next = applyDriveFailure(ship, { failed: [...failure.failed], dateLabel: weekStartsOn });
  const repairs = [];
  if (engineeringSkill !== null) {
    for (let day = 1; day < JUMP_WEEK_DAYS && next.state.malfunction?.failed.length; day += 1) {
      const attempt = attemptDriveRepair(next, dice, { engineeringSkill, dateLabel: addDays(weekStartsOn, day) });
      repairs.push(Object.freeze({ date: addDays(weekStartsOn, day), dice: attempt.dice, total: attempt.total, success: attempt.success }));
      next = attempt.ship;
    }
  }
  return Object.freeze({
    ship: next,
    failure,
    repairs: Object.freeze(repairs),
    stillFailed: Object.freeze([...(next.state.malfunction?.failed ?? [])]),
    batteries: shipBatteryStatus(next, { dateLabel: addDays(weekStartsOn, JUMP_WEEK_DAYS) })
  });
}
