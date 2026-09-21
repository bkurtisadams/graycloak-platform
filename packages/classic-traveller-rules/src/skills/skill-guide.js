// skill-guide.js — what each Book 1 (1977) skill is for, and the dice Book 1
// attaches to it (pp.12-20), for the character sheet and the chat.
//
// v0.263.0. Kurt: the sheet repeated "Electronics-1 / +1", which said nothing
// the label had not. Worse, the "+1" was simply the level, which is wrong for
// the skills Book 1 scales differently: Administration is +2 a level,
// Forward Observer and Vacc Suit +4, Forgery counts against the inspector.
//
// The descriptions are short paraphrases, not Book 1's text; `page` points at
// the full rule. `dmPerLevel` and `untrainedDM` are the figures Book 1 prints;
// where it prints none it says the referee generates the throw, and +1 a
// level is used as its usual default (it is the figure for most skills that
// do give one). `throws` are Book 1's own targets, for reference beside the
// roll; most skills have none, since the referee sets them.

const guide = (entry) => Object.freeze({ dmPerLevel: 1, untrainedDM: null, throws: [], stated: true, ...entry, throws: Object.freeze(entry.throws ?? []) });

export const SKILL_GUIDE = Object.freeze({
  'Administration': guide({
    tagline: 'Officials, licences, paperwork',
    summary: 'Knows how bureaucracies work and what their officials want. Settles routine dealings with authority: police, permits, applications, inspections.',
    page: 14, dmPerLevel: 2, untrainedDM: -3,
    throws: [{ label: 'Routine dealing with officials', target: 7 }]
  }),
  'Air/Raft': guide({
    tagline: 'Flying the floater',
    summary: 'Trained to drive the air/raft, the common grav vehicle of most worlds. Matters in chases, bad weather and high-speed flying.',
    page: 16,
    throws: [{ label: 'Avoid a mishap (bad weather, chase, high speed)', target: 5, note: '\u22121 for very bad weather, an old craft, or gunfire' }]
  }),
  'ATV': guide({
    tagline: 'All-terrain and armoured vehicles',
    summary: 'Drives all-terrain ground vehicles, armoured fighting vehicles included. Helps avoid getting bogged down, trapped or stranded off-road.',
    page: 17,
    throws: [{ label: 'Breakdown each day (no DM)', target: 11 }]
  }),
  'Bribery': guide({
    tagline: 'Paying officials to look away',
    summary: 'Experienced at bribing officials to overlook rules or poor papers. Does not guarantee success, but softens the fallout when an offer is refused. Check the official\u2019s reaction first.',
    page: 14, untrainedDM: -5,
    throws: [{ label: 'Official takes the bribe', target: 8, note: '+2 if the official reacts as a strong friend; if refused, 3\u2212 means the offer is reported' }]
  }),
  'Computer': guide({
    tagline: 'Programming and operating computers',
    summary: 'Programs and runs computers, ground or shipboard, and can write the space combat programs of Book 2 \u2014 a week\u2019s work per throw, with a hidden chance of a flaw.',
    page: 17
  }),
  'Electronics': guide({
    tagline: 'Using and repairing electronics',
    summary: 'Handy with electronic devices: understanding, operating, assembling and repairing them, energy weapons included. Complex work may also call for education, intelligence or dexterity.',
    page: 18, stated: false
  }),
  'Engineering': guide({
    tagline: 'Starship drives and power plant',
    summary: 'Runs and maintains a starship\u2019s jump and maneuver drives and its power plant. Required to serve as an engineer; higher levels qualify for chief engineer.',
    page: 20, stated: false
  }),
  'Forgery': guide({
    tagline: 'Faking documents',
    summary: 'Makes false papers good enough to pass a general inspection. The skill counts against the inspector: each level makes the forgery harder to spot.',
    page: 14, dmPerLevel: -2, against: true,
    throws: [{ label: 'Inspector discovers the forgery (DM \u22122 per level of the forger)', target: 6 }]
  }),
  'Forward Observer': guide({
    tagline: 'Calling in artillery and orbital fire',
    summary: 'Trained to call in and adjust fire from distant batteries or ships in orbit. The first shots always miss; each later turn of fire needs a throw to hit.',
    page: 16, dmPerLevel: 4, untrainedDM: -4,
    throws: [{ label: 'Adjusted fire hits (from the second turn)', target: 11, note: '+1 for each two-minute turn of adjustment' }]
  }),
  'Gambling': guide({
    tagline: 'Games of chance',
    summary: 'Knows games of chance and plays them well \u2014 not the same as taking risks. The house always wins on a 2. At level 3 can often spot a crooked game; at 4 and up may be suspected of cheating.',
    page: 13,
    throws: [{ label: 'Win a private game (Cr 50\u2013500)', target: 8 }, { label: 'Win a casino game (to Cr 5,000)', target: 9 }]
  }),
  'Gunnery': guide({
    tagline: 'Ship-mounted weapons',
    summary: 'Operates the weapons mounted on starships and qualifies as a ship\u2019s gunner. Gives DMs in space combat (Book 2).',
    page: 19
  }),
  'Jack-of-All-Trades': guide({
    tagline: 'Stands in where untrained',
    summary: 'A resourceful all-rounder who finds a way through unfamiliar situations. The referee may let it serve in nearly any endeavour.',
    page: 20, stated: false
  }),
  'Leader': guide({
    tagline: 'Commanding hirelings and soldiers',
    summary: 'Has led people in battle or on adventures. Needed to command more than six hirelings or soldiers, and adds to the reaction throw when leader and group first meet. At 3, orders are obeyed without hesitation.',
    page: 15
  }),
  'Mechanical': guide({
    tagline: 'Using and repairing machinery',
    summary: 'Handy with mechanical devices: operating and repairing them quickly and well, including non-energy weapons but not starship engineering. Big jobs may call for strength, fine ones for dexterity.',
    page: 18, stated: false
  }),
  'Medical': guide({
    tagline: 'Treating the sick and wounded',
    summary: 'Trained in medicine. Level 1 qualifies as a ship\u2019s medic; 2 helps revive low passengers; 3 is a licensed doctor, and a surgeon with DEX 8+. A DM for curing disease and healing wounds.',
    page: 20,
    throws: [{ label: 'Medical attention (house ruling, with \u22125 untrained)', target: 8 }, { label: 'Revive a low passenger (+1 at Medical-2)', target: 5 }]
  }),
  'Navigation': guide({
    tagline: 'Plotting courses; finding position',
    summary: 'Plots interplanetary and interstellar courses and qualifies as a ship\u2019s navigator. Helps find where the ship or party is when lost, in space or under a visible night sky.',
    page: 19
  }),
  'Pilot': guide({
    tagline: 'Flying starships',
    summary: 'Flies starships: lift-offs, landings and routine flight. Qualifies as a ship\u2019s pilot; higher levels count in emergencies. Separate from Ship\u2019s Boat.',
    page: 19, stated: false
  }),
  'Ship\u2019s Boat': guide({
    tagline: 'Shuttles, pinnaces, lifeboats',
    summary: 'Flies ship\u2019s boats and other interplanetary small craft; only those with the skill can fly them. Covers escaping attack, bad-weather landings and crash landings.',
    page: 17,
    throws: [{ label: 'Escape contact and avoid attack', target: 10 }, { label: 'Avoid being hit if escape fails', target: 8 }]
  }),
  'Steward': guide({
    tagline: 'Passenger service',
    summary: 'Experienced at looking after starship passengers. Anyone may be steward, but those with the skill are preferred.',
    page: 19
  }),
  'Streetwise': guide({
    tagline: 'Dealing with the underworld',
    summary: 'At home in local subcultures and the underworld, and can deal with them without being rejected: finding information, hiring people, buying contraband. The referee sets the throw for what is sought.',
    page: 15, untrainedDM: -5,
    throws: [{ label: 'An official who issues licences without fuss', target: 5 }, { label: 'Good guns at a low price', target: 9 }]
  }),
  'Tactics': guide({
    tagline: 'Small units and single ships',
    summary: 'Trained in small-unit tactics (up to a thousand troops) and single-ship actions \u2014 not strategy. The referee applies it in battle as information or as a DM at crucial moments.',
    page: 15, stated: false
  }),
  'Vacc Suit': guide({
    tagline: 'Vacuum suits and battle dress',
    summary: 'Trained in vacuum suits and suits for hostile atmospheres. Any unusual action in a suit risks a dangerous mishap; battle dress needs Vacc Suit-1.',
    page: 16, dmPerLevel: 4,
    throws: [{ label: 'Avoid a dangerous mishap (running, jumping, hiding)', target: 10 }, { label: 'Remedy a mishap (+2 per level; \u22124 untrained)', target: 7 }]
  }),
  'Brawling': guide({
    tagline: 'Fists, clubs, bottles',
    summary: 'Hand-to-hand fighting with hands, clubs, bottles and the like; the first level gives expertise 1 in every brawling weapon.',
    page: 12, weapon: true
  })
});

// Other names the same skill is recorded under.
const ALIASES = Object.freeze({
  'Admin': 'Administration', 'Electronic': 'Electronics', 'Engineer': 'Engineering',
  'Jack-o-T': 'Jack-of-All-Trades', 'Jack of all Trades': 'Jack-of-All-Trades', 'Jack of All Trades': 'Jack-of-All-Trades',
  "Ship's Boat": 'Ship\u2019s Boat', 'Vacc': 'Vacc Suit'
});

const VEHICLES = new Set(['Helicopter', 'Propeller-driven Fixed Wing', 'Jet-driven Fixed Wing', 'Grav Vehicle', 'Tracked Vehicle', 'Wheeled Vehicle', 'Small Watercraft', 'Large Watercraft', 'Hovercraft', 'Submersible']);

/**
 * The guide entry for a recorded skill name. A named weapon (Laser Rifle,
 * Cutlass) is weapon expertise, used as the attack DM; a named vehicle is
 * handled like Air/Raft. Anything else unknown still gets a plain entry, so
 * the sheet never goes blank.
 */
export function skillGuide(name, { weaponNames = [] } = {}) {
  const key = ALIASES[name] ?? name;
  if (SKILL_GUIDE[key]) return { name: key, ...SKILL_GUIDE[key] };
  if (weaponNames.some((weapon) => weapon.toLowerCase() === String(name).toLowerCase()) || ['Blade Combat', 'Gun Combat'].includes(name)) {
    return {
      name, weapon: true, dmPerLevel: 1, untrainedDM: null, stated: true, page: 12, throws: [],
      tagline: 'Weapon expertise',
      summary: `Expertise with the ${name}: its level is added to the throw to hit, and in brawling or blade combat counts against an attacker. Every player character has \u00bd in all weapons \u2014 enough to avoid the untrained penalty, not enough for a DM.`
    };
  }
  if (VEHICLES.has(name)) {
    return {
      name, dmPerLevel: 1, untrainedDM: null, stated: false, page: 16, throws: [],
      tagline: 'Vehicle operation',
      summary: `Trained to operate a ${name.toLowerCase()}. Book 1 details only the air/raft and ATV; the referee sets throws for this vehicle along the same lines.`
    };
  }
  return { name, dmPerLevel: 1, untrainedDM: null, stated: false, page: null, throws: [], tagline: 'Referee sets the throw', summary: `${name}: the referee sets the throw and its DMs.` };
}

// The DM a skill gives at a level. Forgery's counts against the inspector, so
// a forger's own throw takes nothing from it.
export function skillDM(name, level, options) {
  const entry = skillGuide(name, options);
  if (entry.against) return 0;
  if ((level === null || level === undefined) && entry.untrainedDM !== null) return entry.untrainedDM;
  return Math.floor(Number(level ?? 0)) * entry.dmPerLevel;
}
