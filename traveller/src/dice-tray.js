// dice-tray.js — the free dice under the chat box.
//
// v0.75.0. A roll from the tray is a chat message: who rolled, the formula,
// the dice, the total, seen by the table. These are the dice the referee
// adjudicates with on the spot; the rules engine keeps rolling its own seeded
// dice for combat, checks and chargen, so a tray roll never decides a rules
// outcome. The tray is the same on every Graycloak game's chat, which is why
// d4 through d100 are on it though Traveller uses two of them.

export const TRAY_DICE = Object.freeze([
  { label: '2D', formula: '2d6', traveller: true },
  { label: 'D6', formula: '1d6' },
  { label: 'D4', formula: '1d4' },
  { label: 'D8', formula: '1d8' },
  { label: 'D10', formula: '1d10' },
  { label: 'D12', formula: '1d12' },
  { label: 'D20', formula: '1d20' },
  { label: 'D100', formula: '1d100' },
  { label: 'DX', formula: null }
]);
export const MAX_DICE = 100;
export const MAX_SIDES = 1000;

// "2d6+1", "d20", "3D6-2", "/roll 2d6 + 1". Returns null when it is not a roll.
export function parseRollFormula(input) {
  const text = String(input ?? '').trim().replace(/^\/(roll|r)\s+/i, '').replace(/\s+/g, '').toLowerCase();
  const match = /^(\d*)d(\d+)([+-]\d+)?$/.exec(text);
  if (!match) return null;
  const count = match[1] === '' ? 1 : Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;
  if (!Number.isInteger(count) || count < 1 || count > MAX_DICE) return null;
  if (!Number.isInteger(sides) || sides < 2 || sides > MAX_SIDES) return null;
  return { count, sides, modifier, formula: `${count}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : String(modifier)) : ''}` };
}

export function rollFormula(input, { random = Math.random } = {}) {
  const parsed = typeof input === 'string' ? parseRollFormula(input) : input;
  if (!parsed) throw new RangeError(`not a dice formula: ${input}`);
  const dice = Array.from({ length: parsed.count }, () => 1 + Math.floor(random() * parsed.sides));
  const total = dice.reduce((sum, die) => sum + die, 0) + parsed.modifier;
  return { formula: parsed.formula, count: parsed.count, sides: parsed.sides, modifier: parsed.modifier, dice, total };
}

export function formatRoll(roll) {
  const mod = roll.modifier ? ` ${roll.modifier > 0 ? '+' : '−'} ${Math.abs(roll.modifier)}` : '';
  return `${roll.formula.toUpperCase()} → [${roll.dice.join(' ')}]${mod} = ${roll.total}`;
}

// A chat message. `kind` is say or roll; a roll carries the roll. The
// referee's own private rolls are not chat — they go to the referee-only log.
export function createChatMessage({ uid, name, text = '', kind = 'say', roll = null, createdAt = Date.now() } = {}) {
  if (typeof uid !== 'string' || !uid.trim()) throw new TypeError('uid is required');
  if (kind !== 'say' && kind !== 'roll') throw new RangeError('kind must be say or roll');
  const body = String(text ?? '').trim().slice(0, 500);
  if (kind === 'say' && !body) throw new RangeError('a message needs text');
  if (kind === 'roll' && !roll) throw new RangeError('a roll message needs a roll');
  return { uid: uid.trim(), name: name ? String(name).slice(0, 80) : null, kind, text: body, roll: roll ? { ...roll, dice: [...roll.dice] } : null, createdAt };
}

// What typing into the box means: a formula becomes a roll, anything else is said.
export function interpretChatInput(input, { uid, name, random } = {}) {
  const parsed = parseRollFormula(input);
  if (parsed) return createChatMessage({ uid, name, kind: 'roll', roll: rollFormula(parsed, { random }) });
  return createChatMessage({ uid, name, kind: 'say', text: input });
}
