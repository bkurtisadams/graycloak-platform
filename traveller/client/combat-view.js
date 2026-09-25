// ---------------------------------------------------------------------------
// v0.178.0: pure view models for personal combat, so app.js only draws them.
//
// Book 1 p.30: the throw to hit is 8+, modified by the weapons matrix (armor),
// the range matrix, expertise, characteristics, movement status and the
// referee's situation DMs. previewPersonalAttack already sums every one of
// them dice-free; this file takes it apart again so a player can read the
// figure they need BEFORE they click, and puts a resolved attack back
// together as a card rather than a 120-character line.
// ---------------------------------------------------------------------------
import {
  previewPersonalAttack,
  getPersonalWeapon,
  WEAPONS_MATRIX,
  RANGE_MATRIX,
  BASIC_HIT_THROW,
  PERSONAL_ARMOR_TYPES,
  PERSONAL_COMBAT_RANGES
} from '../vendor/classic-traveller-rules/index.js?v=v0.316.5';
import { encounterPairRange, encounterSituationDMs } from '../src/encounter-document.js?v=v0.316.5';

// Ways of totalling two dice: index is the total, value is how many of 36.
const TWO_DICE_WAYS = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];

// Chance that 2D shows `needed` or more, as a percentage 0–100.
export function chanceOfTwoDice(needed) {
  if (!Number.isFinite(needed)) return 0;
  if (needed <= 2) return 100;
  if (needed > 12) return 0;
  let ways = 0;
  for (let total = Math.ceil(needed); total <= 12; total += 1) ways += TWO_DICE_WAYS[total];
  return Math.round((ways / 36) * 100);
}

export function signed(value) { return `${value >= 0 ? '+' : ''}${value}`; }

export function rangeLabel(range) { return String(range ?? '').toUpperCase().replace('-', ' '); }

// The Book 1 p.42 weapons-matrix DM for this weapon against this armor, and
// the p.43 range-matrix DM at this range. Animal weapons and every listed
// weapon are in the tables; anything else reads as no modifier.
export function matrixDMs(weaponKey, armor, range) {
  const armorIndex = PERSONAL_ARMOR_TYPES.indexOf(armor);
  const rangeIndex = PERSONAL_COMBAT_RANGES.indexOf(range);
  const armorRow = WEAPONS_MATRIX[weaponKey] ?? null;
  const rangeRow = RANGE_MATRIX[weaponKey] ?? null;
  return {
    armorDM: armorRow && armorIndex >= 0 ? armorRow[armorIndex] ?? null : null,
    rangeDM: rangeRow && rangeIndex >= 0 ? rangeRow[rangeIndex] ?? null : null
  };
}

// Everything the throw card shows for one attacker against one defender.
// Returns null when either is missing. `reach: false` means the weapon has no
// column at this range (Book 1 p.43 "no").
export function throwCardModel(encounter, attacker, defender, { range = null } = {}) {
  if (!encounter || !attacker || !defender) return null;
  const band = range ?? encounterPairRange(attacker, defender, encounter.map?.spatialMode);
  const spec = getPersonalWeapon(attacker.weaponKey);
  const situation = encounterSituationDMs(encounter, attacker, defender);
  const surprise = encounter.round === 1 && encounter.surprise?.surpriseSideId === attacker.side;
  const preview = previewPersonalAttack({ attacker, defender, range: band, situationalDM: situation.total, surprise });
  const { armorDM, rangeDM } = matrixDMs(attacker.weaponKey, defender.armor, band);
  const bands = Number.isFinite(attacker.position?.column) && Number.isFinite(defender.position?.column) && encounter.map?.spatialMode === 'range-line'
    ? Math.abs(attacker.position.column - defender.position.column)
    : null;

  // Each row: label, DM, and where in Book 1 it comes from. Zero rows are
  // kept out of the card except the two matrix rows, which always show.
  const rows = [];
  rows.push({ key: 'armor', label: `${spec.name.toUpperCase()} vs ${defender.armor.toUpperCase()}`, dm: armorDM, source: 'p.42 weapons matrix', always: true });
  rows.push({ key: 'range', label: `${rangeLabel(band)} RANGE`, dm: rangeDM, source: 'p.43 range matrix', always: true });
  if (preview.skillDM) rows.push({ key: 'skill', label: `${spec.name.toUpperCase()} EXPERTISE`, dm: preview.skillDM, source: 'p.32 attacking expertise' });
  if (preview.untrainedDM) rows.push({ key: 'untrained', label: 'UNTRAINED', dm: preview.untrainedDM, source: 'p.32 untrained usage' });
  if (preview.characteristicDM) rows.push({ key: 'characteristic', label: `${spec.characteristic ?? 'CHAR'} ${attacker.characteristics?.[spec.characteristic] ?? ''}`.trim(), dm: preview.characteristicDM, source: 'p.31 strength/dexterity' });
  if (preview.parryDM) rows.push({ key: 'parry', label: `${defender.name.toUpperCase()} PARRIES`, dm: preview.parryDM, source: 'p.32 defending expertise' });
  if (preview.defenderUntrainedDM) rows.push({ key: 'defenderUntrained', label: `${defender.name.toUpperCase()} UNTRAINED`, dm: preview.defenderUntrainedDM, source: 'p.32 untrained defence' });
  if (preview.evasionDM) rows.push({ key: 'evasion', label: `${defender.name.toUpperCase()} EVADING`, dm: preview.evasionDM, source: 'p.28 evade' });
  for (const part of situation.parts) rows.push({ key: part.key, label: part.label, dm: part.dm, source: 'p.31 errata' });
  if (preview.fatigueDM) rows.push({ key: 'weakened', label: `WEAKENED ${preview.blowClass.toUpperCase()}`, dm: preview.fatigueDM, source: 'p.31 endurance' });
  if (surprise) rows.push({ key: 'surprise', label: 'SURPRISE ATTACK', dm: 0, source: 'p.27 unrestricted', note: 'no endurance spent' });

  const total = rows.reduce((sum, row) => sum + (row.dm ?? 0), 0);
  const needed = preview.canAttack ? Math.max(2, BASIC_HIT_THROW - total) : null;
  return {
    attacker: { id: attacker.id, name: attacker.name },
    defender: { id: defender.id, name: defender.name, armor: defender.armor },
    weapon: { key: attacker.weaponKey, name: spec.name, melee: Boolean(spec.melee) },
    range: band, bands,
    reach: preview.canAttack,
    basic: BASIC_HIT_THROW,
    rows,
    totalDM: total,
    needed,
    // The engine's own figure, so a mismatch would be visible in a test.
    engineNeeded: preview.canAttack ? Math.max(2, preview.requiredRoll) : null,
    chance: needed === null ? 0 : chanceOfTwoDice(needed),
    wound: { dice: spec.damageDice, modifier: spec.damageModifier ?? 0, min: preview.woundRange.min, max: preview.woundRange.max },
    blowsRemaining: preview.blowsRemaining,
    blowClass: preview.blowClass
  };
}

export function woundFormula(dice, modifier) {
  return `${dice}D${modifier ? signed(modifier) : ''}`;
}

// --- Two-step declaration (Book 1 p.26 step 4: movement status, then attack
// and target). The strip collects a draft; this turns it into the engine's
// single action word.
export const MOVEMENT_CHOICES = Object.freeze(['stand', 'close', 'open', 'evade', 'escape']);
export const PACE_CHOICES = Object.freeze(['walk', 'run']);

export function deriveDeclaration({ movement = 'stand', pace = 'walk', targetId = null, round = 1 } = {}) {
  if (!MOVEMENT_CHOICES.includes(movement)) throw new RangeError(`unknown movement: ${movement}`);
  if (!PACE_CHOICES.includes(pace)) throw new RangeError(`unknown pace: ${pace}`);
  switch (movement) {
    case 'evade': return { action: 'evade', targetId: null, attacks: false };
    case 'escape':
      if (round !== 1) throw new Error('Book 1 p.28: escape is possible only before combat begins (round 1)');
      return { action: 'escape', targetId: null, attacks: false };
    case 'stand':
      return targetId ? { action: 'attack', targetId, attacks: true } : { action: 'wait', targetId: null, attacks: false };
    case 'close':
    case 'open': {
      if (!targetId) throw new Error(`choose whom to ${movement === 'close' ? 'close on' : 'open from'}`);
      const running = pace === 'run';
      return { action: running ? `${movement}-run` : movement, targetId, attacks: !running };
    }
    default: throw new RangeError(`unknown movement: ${movement}`);
  }
}

// The draft as a sentence, for the strip's confirm button.
export function declarationSummary(draft, { targetName = null, reach = true } = {}) {
  const movement = draft.movement ?? 'stand';
  const pace = draft.pace ?? 'walk';
  if (movement === 'evade') return 'EVADE';
  if (movement === 'escape') return 'ESCAPE';
  const verb = movement === 'close' ? (pace === 'run' ? 'RUN CLOSER' : 'CLOSE') : movement === 'open' ? (pace === 'run' ? 'RUN AWAY' : 'OPEN') : 'STAND';
  if (!targetName) return movement === 'stand' ? 'STAND / NO ATTACK' : verb;
  if (movement !== 'stand' && pace === 'run') return `${verb} FROM ${targetName}`.replace('CLOSER FROM', 'CLOSER TO');
  return `${verb === 'STAND' ? 'ATTACK' : `${verb} + ATTACK`} ${targetName}${reach ? '' : ' (NO REACH)'}`;
}

// --- A resolved attack (an encounter history entry of kind 'attack' with
// its rollPersonalAttack detail) as a card.
export function attackCardModel(entry, encounter) {
  const result = entry?.detail;
  const names = new Map((encounter?.combatants ?? []).map((combatant) => [combatant.id, combatant.name]));
  const attackerName = names.get(entry?.actorId) ?? entry?.actorId ?? 'attacker';
  const defenderName = names.get(entry?.targetId) ?? entry?.targetId ?? 'target';
  if (!result || !Array.isArray(result.dice)) {
    // "cannot engage" and other attack entries without a throw.
    return { kind: 'note', attackerName, defenderName, text: entry?.text ?? '' };
  }
  const dms = [
    { label: 'TABLE', dm: BASIC_HIT_THROW - result.target, source: 'armor + range' },
    { label: 'SKILL', dm: result.skillDM },
    { label: 'CHAR', dm: result.characteristicDM },
    { label: 'UNTRAINED', dm: result.untrainedDM },
    { label: 'PARRY', dm: result.parryDM },
    { label: 'EVADE', dm: result.evasionDM },
    { label: 'DEF UNTRAINED', dm: result.defenderUntrainedDM },
    { label: 'SITUATION', dm: result.situationalDM },
    { label: 'DEFENDER', dm: result.defenderDM },
    { label: 'WEAKENED', dm: result.fatigueDM }
  ].filter((part) => Number.isFinite(part.dm) && part.dm !== 0);
  const woundTotal = result.woundTotal ?? ((result.damageTotal ?? 0) + (result.damageModifier ?? 0));
  return {
    kind: 'attack',
    attackerName, defenderName,
    weaponName: result.weaponName,
    range: result.range,
    dice: [...result.dice],
    roll: result.roll,
    dms,
    totalDM: result.totalDM ?? dms.reduce((sum, part) => sum + part.dm, 0),
    // What the two dice had to show, after every DM: the same figure the
    // throw card promised.
    needed: Math.max(2, result.target - (result.totalDM ?? 0)),
    total: result.total,
    target: result.target,
    hit: Boolean(result.success),
    wound: result.success ? {
      dice: [...(result.damageDice ?? [])],
      modifier: result.damageModifier ?? 0,
      total: woundTotal,
      noEffect: Boolean(result.noEffect),
      firstBloodRoll: result.firstBloodRoll ?? null,
      allocations: (result.allocations ?? []).map((allocation) => ({ characteristic: allocation.characteristic, amount: allocation.amount, firstBlood: Boolean(allocation.firstBlood) })),
      playerAllocated: Boolean(result.playerAllocated)
    } : null,
    defenderStatus: result.defenderStatus ?? 'active',
    blowClass: result.blowClass ?? 'combat'
  };
}
