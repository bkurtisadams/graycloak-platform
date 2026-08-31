function characteristic(characteristic, amount) {
  return Object.freeze({ type: 'characteristic', characteristic, amount });
}

function skill(name) {
  return Object.freeze({ type: 'skill', name });
}

function specialization(name, specializationType) {
  return Object.freeze({ type: 'specialization', name, specializationType });
}

const STR = () => characteristic('STR', 1);
const DEX = () => characteristic('DEX', 1);
const END = () => characteristic('END', 1);
const INT = () => characteristic('INT', 1);
const EDU = () => characteristic('EDU', 1);
const SOC = () => characteristic('SOC', 1);

const SK = (name) => () => skill(name);
const SPEC = (name, specializationType) => () => specialization(name, specializationType);

function freezeColumn(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry())));
}

function freezeTable({ key, name, minimumEducation = null, columns }) {
  return Object.freeze({
    key,
    name,
    minimumEducation,
    columns: Object.freeze(Object.fromEntries(
      Object.entries(columns).map(([service, entries]) => [service, freezeColumn(entries)])
    ))
  });
}

export const SKILL_TABLE_KEYS = Object.freeze([
  'personal-development',
  'service-skills',
  'advanced-education',
  'advanced-education-8'
]);

// Classic Traveller Book 1, Acquired Skills Tables.
// Entries are normalized to the full skill names used by the engine. Weapon
// and general Vehicle results remain unresolved until the player selects the
// specific expertise required by Book 1.
export const SKILL_TABLES = Object.freeze({
  'personal-development': freezeTable({
    key: 'personal-development',
    name: 'Personal Development',
    columns: {
      navy: [STR, DEX, END, INT, EDU, SOC],
      marines: [STR, DEX, END, SK('Gambling'), SK('Brawling'), SPEC('Blade Combat', 'blade-or-polearm')],
      army: [STR, DEX, END, SK('Gambling'), EDU, SK('Brawling')],
      scouts: [STR, DEX, END, INT, EDU, SPEC('Gun Combat', 'gun')],
      merchants: [STR, DEX, END, STR, SPEC('Blade Combat', 'blade-or-polearm'), SK('Bribery')],
      other: [STR, DEX, END, SPEC('Blade Combat', 'blade-or-polearm'), SK('Brawling'), () => characteristic('SOC', -1)]
    }
  }),

  'service-skills': freezeTable({
    key: 'service-skills',
    name: 'Service Skills',
    columns: {
      navy: [SK("Ship's Boat"), SK('Vacc Suit'), SK('Forward Observer'), SK('Gunnery'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun')],
      marines: [SPEC('Vehicle', 'vehicle'), SK('Vacc Suit'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun')],
      army: [SPEC('Vehicle', 'vehicle'), SK('Air/Raft'), SPEC('Gun Combat', 'gun'), SK('Forward Observer'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun')],
      scouts: [SPEC('Vehicle', 'vehicle'), SK('Vacc Suit'), SK('Mechanical'), SK('Navigation'), SK('Electronics'), SK('Jack-of-All-Trades')],
      merchants: [SPEC('Vehicle', 'vehicle'), SK('Vacc Suit'), SK('Jack-of-All-Trades'), SK('Steward'), SK('Electronics'), SPEC('Gun Combat', 'gun')],
      other: [SPEC('Vehicle', 'vehicle'), SK('Gambling'), SK('Brawling'), SK('Bribery'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun')]
    }
  }),

  'advanced-education': freezeTable({
    key: 'advanced-education',
    name: 'Advanced Education',
    columns: {
      navy: [SK('Vacc Suit'), SK('Mechanical'), SK('Electronics'), SK('Engineering'), SK('Gunnery'), SK('Jack-of-All-Trades')],
      marines: [SPEC('Vehicle', 'vehicle'), SK('Mechanical'), SK('Electronics'), SK('Tactics'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun')],
      army: [SPEC('Vehicle', 'vehicle'), SK('Mechanical'), SK('Electronics'), SK('Tactics'), SPEC('Blade Combat', 'blade-or-polearm'), SPEC('Gun Combat', 'gun')],
      scouts: [SPEC('Vehicle', 'vehicle'), SK('Mechanical'), SK('Electronics'), SK('Jack-of-All-Trades'), SK('Gunnery'), SK('Medical')],
      merchants: [SK('Streetwise'), SK('Mechanical'), SK('Electronics'), SK('Navigation'), SK('Gunnery'), SK('Medical')],
      other: [SK('Streetwise'), SK('Mechanical'), SK('Electronics'), SK('Gambling'), SK('Brawling'), SK('Forgery')]
    }
  }),

  'advanced-education-8': freezeTable({
    key: 'advanced-education-8',
    name: 'Advanced Education (EDU 8+)',
    minimumEducation: 8,
    columns: {
      navy: [SK('Medical'), SK('Navigation'), SK('Engineering'), SK('Computer'), SK('Pilot'), SK('Admin')],
      marines: [SK('Medical'), SK('Tactics'), SK('Tactics'), SK('Computer'), SK('Leader'), SK('Admin')],
      army: [SK('Medical'), SK('Tactics'), SK('Tactics'), SK('Computer'), SK('Leader'), SK('Admin')],
      scouts: [SK('Medical'), SK('Navigation'), SK('Engineering'), SK('Computer'), SK('Pilot'), SK('Jack-of-All-Trades')],
      merchants: [SK('Medical'), SK('Navigation'), SK('Engineering'), SK('Computer'), SK('Pilot'), SK('Admin')],
      other: [SK('Medical'), SK('Forgery'), SK('Electronics'), SK('Computer'), SK('Streetwise'), SK('Jack-of-All-Trades')]
    }
  })
});

export const RANK_SERVICE_BENEFITS = Object.freeze([
  Object.freeze({ id: 'navy-captain-social', service: 'navy', minimumRank: 5, outcome: characteristic('SOC', 1), label: 'Navy Captain: +1 Social' }),
  Object.freeze({ id: 'navy-admiral-social', service: 'navy', minimumRank: 6, outcome: characteristic('SOC', 1), label: 'Navy Admiral: +1 Social' }),
  Object.freeze({ id: 'marine-cutlass', service: 'marines', minimumRank: 0, outcome: skill('Cutlass'), label: 'Marine: Cutlass-1' }),
  Object.freeze({ id: 'marine-lieutenant-revolver', service: 'marines', minimumRank: 1, outcome: skill('Revolver'), label: 'Marine Lieutenant: Revolver-1' }),
  Object.freeze({ id: 'army-rifle', service: 'army', minimumRank: 0, outcome: skill('Rifle'), label: 'Army: Rifle-1' }),
  Object.freeze({ id: 'army-lieutenant-smg', service: 'army', minimumRank: 1, outcome: skill('SMG'), label: 'Army Lieutenant: SMG-1' }),
  Object.freeze({ id: 'merchant-first-officer-pilot', service: 'merchants', minimumRank: 4, outcome: skill('Pilot'), label: 'Merchant First Officer: Pilot-1' }),
  Object.freeze({ id: 'scout-pilot', service: 'scouts', minimumRank: 0, outcome: skill('Pilot'), label: 'Scout: Pilot-1' })
]);

export function getSkillTable(tableKey) {
  const table = SKILL_TABLES[tableKey];
  if (!table) {
    throw new RangeError(`unknown Classic Traveller acquired-skill table: ${tableKey}`);
  }
  return table;
}

export function availableSkillTables(character) {
  return SKILL_TABLE_KEYS.filter((key) => {
    const table = SKILL_TABLES[key];
    return table.minimumEducation === null || character.characteristics.EDU >= table.minimumEducation;
  });
}

export function getAcquiredSkillOutcome(serviceKey, tableKey, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError(`acquired-skill roll must be an integer from 1 to 6; received ${roll}`);
  }

  const table = getSkillTable(tableKey);
  const column = table.columns[serviceKey];
  if (!column) {
    throw new RangeError(`unknown Classic Traveller service for acquired-skill table: ${serviceKey}`);
  }
  return column[roll - 1];
}

export function eligibleRankServiceBenefits(character) {
  const received = new Set(character.automaticSkillsReceived ?? []);
  return RANK_SERVICE_BENEFITS.filter((benefit) => (
    benefit.service === character.service
    && character.rank >= benefit.minimumRank
    && !received.has(benefit.id)
  ));
}
