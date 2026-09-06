/**
 * npc-templates.js
 * Opposition templates for rapid encounter generation.
 * Each template defines a stat block archetype with random variation.
 * Use with generateOppositionGroup() in npc-generator.js.
 */

export const OPPOSITION_TEMPLATES = {
  'pirate-crew': {
    key: 'pirate-crew',
    label: 'Pirate Crew',
    count: { min: 2, max: 5 },
    uppMods: { str: 1, dex: 1, end: 0, int: 0, edu: -1, soc: -2 },
    skillPool: ['Gun Combat','Blade Combat','Pilot','Engineering','Streetwise','Zero-G','Vac Suit'],
    skillCount: { min: 1, max: 2 },
    weaponPool: ['auto-pistol','revolver','carbine','blade','SMG','shotgun'],
    armorPool: ['jack','mesh','cloth'],
    credits: [100, 800],
    bodyType: 'biological',
    description: 'Rough spacers looking for easy prey.',
    nameStyle: 'nickname'
  },
  'security-guard': {
    key: 'security-guard',
    label: 'Security Guard',
    count: { min: 1, max: 4 },
    uppMods: { str: 0, dex: 0, end: 1, int: 0, edu: 0, soc: -1 },
    skillPool: ['Gun Combat','Blade Combat','Recon','Admin','Computer'],
    skillCount: { min: 1, max: 2 },
    weaponPool: ['auto-pistol','revolver','shotgun','SMG'],
    armorPool: ['jack','mesh','cloth'],
    credits: [200, 600],
    bodyType: 'biological',
    description: 'Corporate or port security, following protocols.',
    nameStyle: 'full'
  },
  'thug': {
    key: 'thug',
    label: 'Thug',
    count: { min: 2, max: 6 },
    uppMods: { str: 1, dex: 0, end: 1, int: -1, edu: -2, soc: -2 },
    skillPool: ['Brawling','Blade Combat','Streetwise','Gambling','Carousing'],
    skillCount: { min: 0, max: 2 },
    weaponPool: ['dagger','blade','body-pistol','auto-pistol','club'],
    armorPool: ['none','jack'],
    credits: [10, 200],
    bodyType: 'biological',
    description: 'Local muscle, easily hired and easily discarded.',
    nameStyle: 'short'
  },
  'marine-detail': {
    key: 'marine-detail',
    label: 'Marine Detail',
    count: { min: 2, max: 4 },
    uppMods: { str: 1, dex: 1, end: 1, int: 0, edu: 0, soc: 0 },
    skillPool: ['Gun Combat','Blade Combat','Tactics','Heavy Weapons','Vac Suit','Recon'],
    skillCount: { min: 2, max: 3 },
    weaponPool: ['auto-rifle','SMG','shotgun','blade','auto-pistol'],
    armorPool: ['mesh','combat','cloth'],
    credits: [300, 1000],
    bodyType: 'biological',
    description: 'Disciplined military unit, dangerous in coordinated fire.',
    nameStyle: 'full'
  },
  'patron-contact': {
    key: 'patron-contact',
    label: 'Patron',
    count: { min: 1, max: 1 },
    uppMods: { str: -1, dex: -1, end: -1, int: 1, edu: 1, soc: 2 },
    skillPool: ['Admin','Liaison','Computer','Broker','Leader','Streetwise'],
    skillCount: { min: 2, max: 4 },
    weaponPool: ['body-pistol','dagger','auto-pistol'],
    armorPool: ['none','jack'],
    credits: [2000, 20000],
    bodyType: 'biological',
    description: 'Well-connected individual with a proposition.',
    nameStyle: 'full'
  },
  'noble-dilettante': {
    key: 'noble-dilettante',
    label: 'Noble',
    count: { min: 1, max: 2 },
    uppMods: { str: -1, dex: 0, end: -1, int: 0, edu: 1, soc: 3 },
    skillPool: ['Admin','Liaison','Carousing','Gambling','Computer','Leader'],
    skillCount: { min: 1, max: 3 },
    weaponPool: ['body-pistol','dagger','blade'],
    armorPool: ['none'],
    credits: [5000, 50000],
    bodyType: 'biological',
    description: 'Wealthy socialite, possibly useful or troublesome.',
    nameStyle: 'full'
  },
  'crew-hand': {
    key: 'crew-hand',
    label: 'Crew Hand',
    count: { min: 1, max: 3 },
    uppMods: { str: 0, dex: 1, end: 0, int: 0, edu: -1, soc: -1 },
    skillPool: ['Engineering','Steward','Gun Combat','Vac Suit','Zero-G','Streetwise'],
    skillCount: { min: 1, max: 2 },
    weaponPool: ['body-pistol','blade','dagger','auto-pistol'],
    armorPool: ['none','jack'],
    credits: [100, 800],
    bodyType: 'biological',
    description: 'Working spacer between jobs.',
    nameStyle: 'full'
  },
  'bounty-hunter': {
    key: 'bounty-hunter',
    label: 'Bounty Hunter',
    count: { min: 1, max: 2 },
    uppMods: { str: 0, dex: 1, end: 1, int: 0, edu: 0, soc: -1 },
    skillPool: ['Gun Combat','Recon','Streetwise','Pilot','Computer','Blade Combat'],
    skillCount: { min: 2, max: 4 },
    weaponPool: ['auto-pistol','carbine','rifle','blade','SMG'],
    armorPool: ['jack','mesh','cloth'],
    credits: [1000, 8000],
    bodyType: 'biological',
    description: 'Professional tracker, patient and methodical.',
    nameStyle: 'nickname'
  },
  'robot-security': {
    key: 'robot-security',
    label: 'Security Robot',
    count: { min: 1, max: 3 },
    uppMods: { str: 2, dex: 0, end: 2, int: -2, edu: 0, soc: 0 },
    skillPool: ['Gun Combat','Recon','Computer','Engineering'],
    skillCount: { min: 1, max: 2 },
    weaponPool: ['auto-pistol','SMG','laser-carbine'],
    armorPool: ['combat'],
    credits: [0, 0],
    bodyType: 'robot',
    description: 'Autonomous security unit, relentless but predictable.',
    nameStyle: 'designation'
  },
  'beast-carnivore': {
    key: 'beast-carnivore',
    label: 'Carnivore',
    count: { min: 1, max: 3 },
    uppMods: { str: 2, dex: 2, end: 1, int: -3, edu: -5, soc: -5 },
    skillPool: ['Brawling','Recon'],
    skillCount: { min: 0, max: 1 },
    weaponPool: ['teeth-claws'],
    armorPool: ['hide'],
    credits: [0, 0],
    bodyType: 'creature',
    description: 'Dangerous local fauna, hunting for food.',
    nameStyle: 'creature'
  },
  'beast-herbivore': {
    key: 'beast-herbivore',
    label: 'Herbivore',
    count: { min: 2, max: 8 },
    uppMods: { str: 1, dex: 1, end: 2, int: -3, edu: -5, soc: -5 },
    skillPool: ['Recon'],
    skillCount: { min: 0, max: 0 },
    weaponPool: ['hooves-horns'],
    armorPool: ['hide'],
    credits: [0, 0],
    bodyType: 'creature',
    description: 'Herd animal, usually harmless unless panicked.',
    nameStyle: 'creature'
  }
};

export const TEMPLATE_KEYS = Object.keys(OPPOSITION_TEMPLATES);
