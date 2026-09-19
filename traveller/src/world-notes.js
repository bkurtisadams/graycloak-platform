// world-notes.js — the fuller Book 3 detail behind a world's profile.
//
// v0.228.0. The caption shows one line per characteristic; this is what the
// book says beyond that line. Three kinds of thing, kept apart because they
// are read at different moments:
//
//   detail   reference, shown on hover — the figure behind the digit, the
//            precis behind the government, what local industry can make.
//   visible  facts that change what the party does at this port: what the
//            starport can actually do for the ship, and what a character must
//            wear to step outside.
//   lawCheck the weapons the party is carrying against what this world
//            prohibits, which no tooltip should hide.
//
// The text is Book 3 pp.5-11. Nothing here throws dice or changes a document.

// p.6: what each starport can do, beyond its quality.
const STARPORT_FACILITIES = Object.freeze({
  A: { fuel: 'refined fuel', overhaul: true, shipyard: 'starships and non-starships' },
  B: { fuel: 'refined fuel', overhaul: true, shipyard: 'non-starships' },
  C: { fuel: 'unrefined fuel', overhaul: false, shipyard: null, repair: 'reasonable repair facilities' },
  D: { fuel: 'unrefined fuel', overhaul: false, shipyard: null },
  E: { fuel: null, overhaul: false, shipyard: null },
  X: { fuel: null, overhaul: false, shipyard: null }
});

// p.6 atmosphere notes: what a character must wear to go outside.
const ATMOSPHERE_GEAR = Object.freeze({
  0: 'Vacc suit at all times',
  1: 'Vacc suit at all times',
  2: 'Respirator and filter mask',
  3: 'Respirator',
  4: 'Filter mask',
  5: null,
  6: null,
  7: 'Filter mask',
  8: null,
  9: 'Filter mask',
  10: 'Oxygen tanks; no protective suit needed',
  11: 'Protective suit, as for vacuum',
  12: 'Protective suit; it will be defeated in 2-12 hours'
});

// p.8, cumulative: each level includes every prohibition below it. The keys
// are the weapon keys the rules package uses.
const LAW_PROHIBITS = Object.freeze({
  1: ['body-pistol'],
  2: ['laser-rifle', 'laser-carbine'],
  3: ['automatic-rifle'],
  4: ['submachine-gun'],
  5: ['automatic-pistol', 'revolver', 'body-pistol'],
  6: ['rifle', 'carbine'],
  7: ['shotgun'],
  8: ['blade', 'foil', 'cutlass', 'sword', 'broadsword', 'bayonet', 'spear', 'halberd', 'pike'],
  9: ['hands', 'club', 'cudgel', 'dagger']
});

export function prohibitedWeaponKeys(lawLevel) {
  const level = Number(lawLevel);
  if (!Number.isFinite(level) || level < 1) return [];
  const keys = new Set();
  for (let step = 1; step <= Math.min(level, 9); step += 1) {
    for (const key of LAW_PROHIBITS[step] ?? []) keys.add(key);
  }
  // p.8 note 9 is possession outside the home, not a weapon type; a level of
  // 9 or more prohibits carrying anything rather than listing more weapons.
  if (level >= 9) keys.add('*');
  return [...keys];
}

export function starportFacilities(code) {
  return STARPORT_FACILITIES[String(code).toUpperCase()] ?? STARPORT_FACILITIES.X;
}

export function atmosphereGear(digit) {
  return ATMOSPHERE_GEAR[Number(digit)] ?? null;
}

// One short line per starport, for the caption to show rather than hide.
export function starportLine(code) {
  const facilities = starportFacilities(code);
  const parts = [facilities.fuel, facilities.overhaul ? 'annual overhaul' : null, facilities.repair ?? null,
    facilities.shipyard ? `shipyard: ${facilities.shipyard}` : null].filter(Boolean);
  return parts.length ? parts.join(', ') : 'no fuel, facilities or bases';
}

// The reference behind each digit, for a title attribute.
export function worldDetail(profile) {
  const population = Number(profile.population);
  return {
    starport: `Book 3 p.6. ${starportLine(profile.starport)}.`,
    size: Number(profile.size) === 0
      ? 'Book 3 p.6. An asteroid or planetoid complex rather than a sphere.'
      : `Book 3 p.6. ${profile.size} thousand miles across. Book 1 reads gravity from this digit; 7 is standard, and a lighter world lets a character carry more.`,
    atmosphere: `Book 3 p.6. ${atmosphereGear(profile.atmosphere) ?? 'Breathable without assistance'}.`,
    hydrographics: 'Book 3 p.6. The percentage of the surface under sea or ocean, in tenths. On a corrosive or exotic world the liquid may not be water.',
    population: population > 0
      ? `Book 3 p.9. The digit is an exponent of ten: about ${Number(10 ** population).toLocaleString('en-US')} inhabitants, read as a range between the levels either side of it.`
      : 'Book 3 p.9. No inhabitants.',
    government: Number(profile.government) === 7
      ? 'Book 3 p.7. No central authority; rival governments compete for control, and the law level is that of the government nearest the starport.'
      : 'Book 3 p.7. Take the type as a guide rather than a strict statistic.',
    lawLevel: 'Book 3 p.8. Each level carries every prohibition below it. Law level does not apply at a starport, and the digit is also the throw to avoid arrest when an enforcement agent stops you.',
    techLevel: `Book 3 p.11. Local industry can make goods to this level; police or military may carry weapons several levels above it. Commonly 4 to 10, and higher is more capable.`
  };
}

// What the party is carrying against what this world forbids. Returns null
// where nothing is prohibited, so the caller can show nothing.
export function lawCheck(profile, carriers = []) {
  const level = Number(profile.lawLevel);
  const prohibited = new Set(prohibitedWeaponKeys(level));
  if (!prohibited.size) return null;
  const everything = prohibited.has('*');
  const caught = carriers
    .filter((entry) => entry.weaponKey && entry.weaponKey !== 'hands')
    .filter((entry) => everything || prohibited.has(entry.weaponKey));
  return {
    level,
    everything,
    caught,
    // p.8: the law does not reach into the starport itself.
    text: caught.length
      ? `${caught.map((entry) => `${entry.name}\u2019s ${entry.weaponName}`).join(', ')} ${caught.length === 1 ? 'is' : 'are'} prohibited outside the starport. Throw ${level}+ to avoid arrest if stopped.`
      : null
  };
}
