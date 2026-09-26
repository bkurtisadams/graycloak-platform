// ---------------------------------------------------------------------------
// 0.81.0: rumours a game can write by itself (solo play).
//
// NOT Classic Traveller rules text. The Traveller Book (1982) p.100 gives the
// rumour matrix (a letter and a kind: background, minor fact, veiled clue,
// completely false information...) and leaves the words to the referee. These
// are original Graycloak tables that turn the letter into a sentence built
// from facts the game really holds: the worlds within reach, their profiles,
// bases, gas giants and zones, and the Book 2 p.43 trade table.
//
// A rumour's truth follows its letter. Most are true. D (partial) is true
// but leaves out the thing that matters; F (information leading to trap)
// points somewhere dangerous or useless; J, T, V and Z are false — the fact
// is made wrong on purpose, and plausibly. The truth is kept on the record
// for the referee (and the tests), never shown to a solo player.
// ---------------------------------------------------------------------------

import { requireDice } from '../dice.js';
import {
  parseUniversalWorldProfile, describeGovernment, describeLawLevel, describePopulation, describeStarport
} from '../worlds/world-profile.js';
import { deriveTradeClassifications } from '../worlds/trade-classifications.js';
import { TRADE_GOODS } from '../trade/commerce.js';

// What each letter asks for, and whether it is true.
export const RUMOR_CONTENT = Object.freeze({
  A: { kind: 'background', truth: 'true' },
  B: { kind: 'minor', truth: 'true' },
  C: { kind: 'major', truth: 'true' },
  D: { kind: 'partial', truth: 'partial' },
  E: { kind: 'veiled', truth: 'true' },
  F: { kind: 'trap', truth: 'trap' },
  G: { kind: 'location', truth: 'true' },
  H: { kind: 'major', truth: 'true' },
  I: { kind: 'obvious', truth: 'true' },
  J: { kind: 'false', truth: 'false' },
  K: { kind: 'terminology', truth: 'true' },
  L: { kind: 'library', truth: 'true' },
  M: { kind: 'helpful', truth: 'true' },
  N: { kind: 'location', truth: 'true' },
  O: { kind: 'recommendation', truth: 'true' },
  P: { kind: 'major', truth: 'true' },
  Q: { kind: 'background', truth: 'true' },
  R: { kind: 'minor', truth: 'true' },
  S: { kind: 'veiled', truth: 'true' },
  T: { kind: 'misleading-clue', truth: 'false' },
  U: { kind: 'broad', truth: 'true' },
  V: { kind: 'misleading-background', truth: 'false' },
  W: { kind: 'library', truth: 'true' },
  X: { kind: 'general-location', truth: 'true' },
  Y: { kind: 'specific-background', truth: 'true' },
  Z: { kind: 'misleading-background', truth: 'false' }
});

const TRADE_CODE = Object.freeze({ agricultural: 'A', nonAgricultural: 'NA', industrial: 'I', nonIndustrial: 'NI', rich: 'R', poor: 'P' });
const TRADE_WORDS = Object.freeze({
  A: 'agricultural (it feeds itself and sells food)', NA: 'non-agricultural (it has to buy its food)',
  I: 'industrial (big factories, big demand for raw materials)', NI: 'non-industrial (it buys what it cannot make)',
  R: 'rich (money to spend on luxuries)', P: 'poor (little to spend)'
});
const OPENERS = Object.freeze(['They say', 'Word in the port bar is that', 'A spacer swears', 'The dock crews say', 'You hear that', 'Someone mentions that']);
const STARPORT_CLASSES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'X']);

// One of a list, off 2D as a d36 (as missions.js picks a destination).
function pick(dice, list) {
  if (!list.length) return null;
  return list[(dice.rollD6() * 6 + dice.rollD6() - 7) % list.length];
}
const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1);

function profileOf(world) {
  try { return parseUniversalWorldProfile(world.uwp); } catch { return null; }
}
function tradeCodes(profile) {
  if (!profile) return [];
  try { return deriveTradeClassifications(profile).map((key) => TRADE_CODE[key]); } catch { return []; }
}
function sumDMs(dms, codes) {
  return codes.reduce((total, code) => total + (dms[code] ?? 0), 0);
}
// "is run as a ..." for a government code; code 0 has none to be run by.
function governmentPhrase(code) {
  if (Number(code) === 0) return 'has no government to speak of';
  const words = lower(describeGovernment(code));
  return `is run as ${/^[aeiou]/.test(words) ? 'an' : 'a'} ${words}`;
}

// Law above 9 is off the printed table (Book 3 p.8 stops at 9).
function lawPhrase(level) {
  return level >= 10 ? `almost everything is restricted (law level ${level})` : `${lower(describeLawLevel(level))} (law level ${level})`;
}
// People to have a government, a law, a market.
const peopled = (world) => (profileOf(world)?.population ?? 0) > 0;

const zoneOf = (world) => (world.zone === 'amber' || world.zone === 'red' ? world.zone : 'none');
const hazardous = (world) => zoneOf(world) !== 'none' || (peopled(world) && (profileOf(world)?.lawLevel ?? 0) >= 9);

// ---- the true sentences ----------------------------------------------------

function backgroundFact(dice, worlds, opener) {
  const world = pick(dice, worlds.filter(peopled));
  if (!world) return minorFact(dice, worlds, opener);
  const profile = profileOf(world);
  const which = dice.rollD6();
  const text = which <= 2
    ? `${opener} ${world.name} ${governmentPhrase(profile.government)}.`
    : which <= 4
      ? `${opener} on ${world.name} the law is: ${lawPhrase(profile.lawLevel)}.`
      : `${opener} ${world.name}'s population runs to ${lower(describePopulation(profile.population))}.`;
  return { world, fact: which <= 2 ? 'government' : which <= 4 ? 'law' : 'population', text };
}

function minorFact(dice, worlds, opener) {
  const world = pick(dice, worlds);
  if (!world) return null;
  if (dice.rollD6() <= 3) {
    const port = world.uwp[0];
    return { world, fact: 'starport', text: `${opener} the starport at ${world.name} is class ${port}: ${lower(describeStarport(port))}.` };
  }
  return { world, fact: 'gas-giant', text: world.gasGiant
    ? `${opener} there is a gas giant in the ${world.name} system, if you need to skim fuel.`
    : `${opener} there is no gas giant at ${world.name}: no skimming fuel there.` };
}

// Goods a ship can carry today: by the ton, and the vehicles with a p.16
// tonnage (Air/Raft, ATV); the other "each" lots wait on a referee ruling.
const LOADABLE = (good) => good.unit !== 'each' || [52, 54].includes(good.code);

// The best resale on the p.43 table at a world, by its trade classifications.
function bestResale(world) {
  const codes = tradeCodes(profileOf(world));
  let best = null;
  for (const good of Object.values(TRADE_GOODS).filter(LOADABLE)) {
    const dm = sumDMs(good.resaleDMs, codes);
    if (!best || dm > best.dm) best = { good, dm };
  }
  return best && best.dm > 0 ? best : null;
}

function majorFact(dice, worlds, opener) {
  const markets = worlds.filter((world) => peopled(world) && world.uwp[0] !== 'X').map((world) => ({ world, best: bestResale(world) })).filter((entry) => entry.best);
  const market = pick(dice, markets);
  if (market && dice.rollD6() <= 4) {
    return { world: market.world, fact: 'market', good: market.best.good.code,
      resaleDM: market.best.dm, text: `${opener} ${market.best.good.name.toLowerCase()} fetches a good price on ${market.world.name}.` };
  }
  const based = pick(dice, worlds.filter((world) => world.naval));
  if (based) return { world: based, fact: 'naval-base', text: `${opener} the navy keeps a base at ${based.name}; the lanes near it are patrolled.` };
  return minorFact(dice, worlds, opener);
}

function locationFact(dice, worlds, opener) {
  const scouts = worlds.filter((world) => world.scout);
  const giants = worlds.filter((world) => world.gasGiant);
  const away = (world) => `${world.distance} parsec${world.distance === 1 ? '' : 's'} from here`;
  const scoutFirst = dice.rollD6() <= 3;
  const scout = scoutFirst || !giants.length ? pick(dice, scouts) : null;
  if (scout) return { world: scout, fact: 'scout-base', text: `${opener} there is a scout base at ${scout.name}, ${away(scout)}.` };
  const giant = pick(dice, giants);
  if (giant) return { world: giant, fact: 'gas-giant', text: `${opener} ${giant.name}, ${away(giant)}, has a gas giant for skimming.` };
  return minorFact(dice, worlds, opener);
}

function generalLocation(dice, worlds, opener) {
  const scouts = worlds.filter((world) => world.scout);
  const navals = worlds.filter((world) => world.naval);
  const naval = dice.rollD6() <= 3 && navals.length;
  const list = naval ? navals : scouts;
  if (!list.length) return minorFact(dice, worlds, opener);
  const nearest = Math.min(...list.map((world) => world.distance));
  const world = list.find((entry) => entry.distance === nearest);
  return { world, fact: naval ? 'naval-base' : 'scout-base', text: `${opener} there is a ${naval ? 'naval' : 'scout'} base within ${Math.max(1, nearest)} parsec${nearest > 1 ? 's' : ''} of here.` };
}

function veiledClue(dice, worlds, opener) {
  const world = pick(dice, worlds.filter(hazardous));
  if (!world) return backgroundFact(dice, worlds, opener);
  const zone = zoneOf(world);
  const text = zone === 'red' ? `${opener} ships that go to ${world.name} don't come back the same — nobody will say more.`
    : zone === 'amber' ? `Spacers go quiet when ${world.name} comes up. Something about the place.`
      : `${opener} on ${world.name} you keep anything sharp or loud well out of sight.`;
  return { world, fact: zone === 'none' ? 'law' : 'zone', text };
}

function obviousClue(dice, worlds, opener) {
  const world = pick(dice, worlds.filter(hazardous));
  if (!world) return backgroundFact(dice, worlds, opener);
  const zone = zoneOf(world);
  const text = zone !== 'none'
    ? `${opener} ${world.name} is posted ${zone} by the authorities: ${zone === 'red' ? 'interdicted, keep away' : 'travel there with care'}.`
    : `${opener} on ${world.name} the law is: ${lawPhrase(profileOf(world).lawLevel)}.`;
  return { world, fact: zone === 'none' ? 'law' : 'zone', text };
}

function terminology(dice, worlds, here) {
  const choices = [here, ...worlds].filter(Boolean).flatMap((world) => tradeCodes(profileOf(world)).map((code) => ({ world, code })));
  const choice = pick(dice, choices);
  if (!choice) return null;
  return { world: choice.world, fact: 'trade-code', text: `Traders call ${choice.world.name} "${choice.code}": ${TRADE_WORDS[choice.code]}.` };
}

function library(dice, worlds, opener) {
  const inner = majorFact(dice, worlds, 'It says');
  if (!inner) return null;
  return { ...inner, text: `${opener} the ship's library has an entry on ${inner.world.name} worth reading. ${inner.text}` };
}

function helpful(dice, worlds, opener) {
  const refined = worlds.filter((world) => ['A', 'B'].includes(world.uwp[0])).sort((a, b) => a.distance - b.distance);
  if (refined.length && dice.rollD6() <= 3) {
    const world = refined[0];
    return { world, fact: 'refined-fuel', text: `${opener} the nearest refined fuel is at ${world.name} (class ${world.uwp[0]}, ${world.distance} parsec${world.distance === 1 ? '' : 's'}).` };
  }
  const giant = worlds.filter((world) => world.gasGiant).sort((a, b) => a.distance - b.distance)[0];
  if (giant) return { world: giant, fact: 'gas-giant', text: `${opener} if you're short of fuel, ${giant.name} has a gas giant to skim.` };
  return minorFact(dice, worlds, opener);
}

function recommendation(dice, worlds, here, opener) {
  const hereCodes = tradeCodes(profileOf(here));
  let best = null;
  for (const world of worlds.filter((entry) => peopled(entry) && entry.uwp[0] !== 'X')) {
    const codes = tradeCodes(profileOf(world));
    for (const good of Object.values(TRADE_GOODS)) {
      if (!LOADABLE(good)) continue;
      const gain = sumDMs(good.resaleDMs, codes) - sumDMs(good.purchaseDMs, hereCodes);
      if (gain > 0 && (!best || gain > best.gain)) best = { world, good, gain };
    }
  }
  if (!best) return majorFact(dice, worlds, opener);
  return { world: best.world, fact: 'trade-run', good: best.good.code,
    text: `${opener} the smart money buys ${best.good.name.toLowerCase()} here on ${here.name} and takes it to ${best.world.name}.` };
}

function broad(dice, worlds, here) {
  const all = [here, ...worlds].filter(Boolean);
  const good = all.filter((world) => ['A', 'B'].includes(world.uwp[0])).length;
  const navals = all.filter((world) => world.naval).length;
  return { world: here, fact: 'region', text: `Around here, ${good} of the ${all.length} worlds within four parsecs have a class A or B starport, and ${navals || 'none'} ${navals === 1 ? 'has' : 'have'} a naval base.` };
}

function specificBackground(dice, worlds, opener) {
  const world = pick(dice, worlds.filter(peopled));
  if (!world) return minorFact(dice, worlds, opener);
  const profile = profileOf(world);
  const codes = tradeCodes(profile);
  return { world, fact: 'tech', text: `${opener} ${world.name} builds to tech level ${profile.techLevel}${codes.length ? ` and trades as ${codes.join(', ')}` : ''}.` };
}

// ---- the untrue ones -------------------------------------------------------

function otherThan(dice, value, choices) {
  const rest = choices.filter((entry) => entry !== value);
  return pick(dice, rest);
}

function falseFact(dice, worlds, opener) {
  const world = pick(dice, worlds);
  if (!world) return null;
  const which = dice.rollD6();
  if (which <= 2) {
    const port = otherThan(dice, world.uwp[0], STARPORT_CLASSES);
    return { world, fact: 'starport', claimed: port, actual: world.uwp[0], text: `${opener} the starport at ${world.name} is class ${port}: ${lower(describeStarport(port))}.` };
  }
  if (which <= 4) {
    return { world, fact: 'gas-giant', claimed: !world.gasGiant, actual: Boolean(world.gasGiant), text: world.gasGiant
      ? `${opener} there's no gas giant at ${world.name}; don't count on skimming there.`
      : `${opener} ${world.name} has a gas giant you can skim.` };
  }
  return world.naval
    ? { world, fact: 'naval-base', claimed: false, actual: true, text: `${opener} the navy pulled out of ${world.name} years ago; nobody patrols there now.` }
    : { world, fact: 'naval-base', claimed: true, actual: false, text: `${opener} the navy keeps a base at ${world.name}.` };
}

function misleadingBackground(dice, worlds, opener) {
  const world = pick(dice, worlds.filter(peopled));
  if (!world) return falseFact(dice, worlds, opener);
  const profile = profileOf(world);
  if (dice.rollD6() <= 3) {
    const law = otherThan(dice, profile.lawLevel, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    return { world, fact: 'law', claimed: law, actual: profile.lawLevel, text: `${opener} on ${world.name} the law is: ${lawPhrase(law)}.` };
  }
  const government = otherThan(dice, profile.government, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  return { world, fact: 'government', claimed: government, actual: profile.government, text: `${opener} ${world.name} ${governmentPhrase(government)}.` };
}

function misleadingClue(dice, worlds, opener) {
  // A danger denied, or a danger that is not there.
  const risky = pick(dice, worlds.filter(hazardous));
  if (risky) {
    const zone = zoneOf(risky);
    return { world: risky, fact: zone === 'none' ? 'law' : 'zone', claimed: 'safe', actual: zone === 'none' ? `law ${profileOf(risky).lawLevel}` : zone,
      text: zone === 'none' ? `${opener} nobody on ${risky.name} cares what you carry.` : `${opener} the warnings about ${risky.name} are old news; it's safe enough now.` };
  }
  const calm = pick(dice, worlds);
  if (!calm) return null;
  return { world: calm, fact: 'zone', claimed: 'dangerous', actual: 'none', text: `${opener} ships have been disappearing near ${calm.name}; best give it a wide berth.` };
}

function trap(dice, worlds, opener) {
  const risky = pick(dice, worlds.filter((world) => zoneOf(world) !== 'none' || ['E', 'X'].includes(world.uwp[0])));
  if (risky) {
    return { world: risky, fact: 'lure', claimed: 'rich pickings', actual: `${zoneOf(risky)} zone, class ${risky.uwp[0]} port`,
      text: `${opener} there's cheap fuel and a buyer for anything at ${risky.name}, if you get there first.` };
  }
  const poor = pick(dice, worlds.filter((world) => !['A', 'B'].includes(world.uwp[0])));
  if (poor) {
    return { world: poor, fact: 'refined-fuel', claimed: true, actual: false,
      text: `${opener} ${poor.name} sells refined fuel at half price this month.` };
  }
  return falseFact(dice, worlds, opener);
}

function partial(dice, worlds, opener) {
  // True as far as it goes; the hazard is left out.
  const world = pick(dice, worlds.filter(hazardous));
  if (!world) return minorFact(dice, worlds, opener);
  const inner = world.gasGiant
    ? `${opener} there's a gas giant at ${world.name}, easy skimming.`
    : `${opener} ${world.name} has a class ${world.uwp[0]} starport.`;
  return { world, fact: 'partial', omits: zoneOf(world) !== 'none' ? `${zoneOf(world)} zone` : `law level ${profileOf(world).lawLevel}`, text: inner };
}

/**
 * The words for a rumour, from the game's own facts.
 * letter: from rollRumor; here: { id, name, uwp }; worlds: those within reach
 * of here (not here itself), each { id, name, uwp, distance, naval, scout,
 * gasGiant, zone }, optionally visited (unvisited ones are preferred).
 * Returns { letter, kind, truth, text, subjectId, subjectName, fact, ... }.
 */
export function draftRumor(dice, { letter, here, worlds = [] } = {}) {
  requireDice(dice);
  const content = RUMOR_CONTENT[letter];
  if (!content) throw new RangeError(`unknown rumour letter: ${letter}`);
  const valid = worlds.filter((world) => world && typeof world.uwp === 'string' && world.uwp.length >= 9);
  // A rumour is news: worlds the party has not been to come first.
  const fresh = valid.filter((world) => !world.visited);
  const pool = fresh.length >= 2 ? fresh : valid;
  const opener = pick(dice, OPENERS);
  const make = {
    background: () => backgroundFact(dice, pool, opener),
    minor: () => minorFact(dice, pool, opener),
    major: () => majorFact(dice, pool, opener),
    partial: () => partial(dice, valid, opener),
    veiled: () => veiledClue(dice, valid, opener),
    trap: () => trap(dice, valid, opener),
    location: () => locationFact(dice, pool, opener),
    'general-location': () => generalLocation(dice, valid, opener),
    obvious: () => obviousClue(dice, valid, opener),
    false: () => falseFact(dice, pool, opener),
    terminology: () => terminology(dice, pool, here),
    library: () => library(dice, pool, opener),
    helpful: () => helpful(dice, valid, opener),
    recommendation: () => (here ? recommendation(dice, valid, here, opener) : majorFact(dice, pool, opener)),
    'misleading-clue': () => misleadingClue(dice, valid, opener),
    broad: () => (here ? broad(dice, valid, here) : backgroundFact(dice, pool, opener)),
    'specific-background': () => specificBackground(dice, pool, opener),
    'misleading-background': () => misleadingBackground(dice, pool, opener)
  }[content.kind];
  const drafted = make() ?? null;
  if (!drafted) {
    return Object.freeze({ letter, kind: content.kind, truth: content.truth, text: 'Nothing worth repeating: the talk is all about people you do not know.', subjectId: null, subjectName: null, fact: 'none' });
  }
  const { world, ...rest } = drafted;
  return Object.freeze({ letter, kind: content.kind, truth: content.truth, ...rest, subjectId: world?.id ?? null, subjectName: world?.name ?? null });
}
