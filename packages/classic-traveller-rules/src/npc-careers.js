/**
 * npc-careers.js
 * Career bundles for Quick NPC generation.
 * Each bundle defines skill pools, typical gear, and credit ranges.
 * These are simplified shortcuts — not full Book 1 service tables.
 */

export const QUICK_CAREERS = {
  navy: {
    key: 'navy',
    label: 'Navy',
    skillPool: ['Pilot','Engineering','Gun Combat','Navigation','Admin','Computer','Vac Suit','Leadership'],
    skillCount: { min: 2, max: 4 },
    ranks: ['Starman','Ensign','Sublieutenant','Lieutenant','Lt Commander','Commander','Captain','Admiral'],
    weaponPool: ['body-pistol','auto-pistol','blade','revolver'],
    armorPool: ['none','jack'],
    credits: () => 1000 + (Math.floor(Math.random() * 6) + 1) * 500,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 4) + 1) * 2, // 18-26
    description: 'Naval spacer with discipline and shipboard skills.'
  },
  marines: {
    key: 'marines',
    label: 'Marines',
    skillPool: ['Gun Combat','Blade Combat','Vac Suit','Leadership','Recon','ATV','Tactics','Heavy Weapons'],
    skillCount: { min: 2, max: 4 },
    ranks: ['Marine','Lance Corporal','Corporal','Lance Sergeant','Sergeant','Gunnery Sergeant','Leading Sergeant','Sergeant Major'],
    weaponPool: ['auto-pistol','auto-rifle','blade','SMG','shotgun'],
    armorPool: ['jack','mesh','combat'],
    credits: () => 500 + (Math.floor(Math.random() * 6) + 1) * 300,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 4) + 1) * 2,
    description: 'Ground combat specialist, aggressive and fit.'
  },
  army: {
    key: 'army',
    label: 'Army',
    skillPool: ['Gun Combat','Blade Combat','ATV','Recon','Tactics','Forward Observer','Heavy Weapons','Admin'],
    skillCount: { min: 2, max: 4 },
    ranks: ['Private','Lance Corporal','Corporal','Lance Sergeant','Sergeant','Staff Sergeant','Leading Sergeant','Sergeant Major'],
    weaponPool: ['auto-pistol','carbine','rifle','blade','SMG'],
    armorPool: ['jack','mesh','cloth'],
    credits: () => 400 + (Math.floor(Math.random() * 6) + 1) * 250,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 4) + 1) * 2,
    description: 'Planetary soldier, used to rough conditions.'
  },
  scouts: {
    key: 'scouts',
    label: 'Scouts',
    skillPool: ['Pilot','Navigation','Engineering','Computer','Gun Combat','Survival','Medic','Jack-o-T'],
    skillCount: { min: 2, max: 5 },
    ranks: ['Scout','—','—','—','—','—','—','—'],
    weaponPool: ['body-pistol','auto-pistol','carbine','blade','revolver'],
    armorPool: ['none','jack'],
    credits: () => 200 + (Math.floor(Math.random() * 6) + 1) * 200,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 6) + 1) * 2, // scouts range wider
    description: 'Independent explorer, comfortable alone on the frontier.'
  },
  merchants: {
    key: 'merchants',
    label: 'Merchants',
    skillPool: ['Pilot','Navigation','Engineering','Steward','Admin','Computer','Streetwise','Broker'],
    skillCount: { min: 2, max: 4 },
    ranks: ['Crewman','—','4th Officer','3rd Officer','2nd Officer','1st Officer','Captain','—'],
    weaponPool: ['body-pistol','auto-pistol','blade','revolver'],
    armorPool: ['none','jack'],
    credits: () => 800 + (Math.floor(Math.random() * 6) + 1) * 400,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 5) + 1) * 2,
    description: 'Spacer trader, knows ports and prices.'
  },
  other: {
    key: 'other',
    label: 'Other',
    skillPool: ['Streetwise','Gambling','Brawling','Carousing','Jack-o-T','Forgery','Disguise','Computer'],
    skillCount: { min: 1, max: 3 },
    ranks: ['Civilian','—','—','—','—','—','—','—'],
    weaponPool: ['body-pistol','auto-pistol','blade','dagger','revolver'],
    armorPool: ['none','jack'],
    credits: () => (Math.floor(Math.random() * 6) + 1) * 100,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 6) + 1) * 2,
    description: 'Civilian with a mixed background.'
  },
  pirate: {
    key: 'pirate',
    label: 'Pirate',
    skillPool: ['Pilot','Gun Combat','Blade Combat','Engineering','Streetwise','Navigation','Vac Suit','Zero-G'],
    skillCount: { min: 1, max: 3 },
    ranks: ['Rookie','—','Crew','—','Mate','—','Captain','—'],
    weaponPool: ['auto-pistol','carbine','blade','SMG','shotgun'],
    armorPool: ['jack','mesh','cloth'],
    credits: () => (Math.floor(Math.random() * 6) + 1) * 200,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 5) + 1) * 2,
    description: 'Predatory spacer, living outside the law.'
  },
  agent: {
    key: 'agent',
    label: 'Agent',
    skillPool: ['Computer','Streetwise','Gun Combat','Forgery','Disguise','Recon','Admin','Liaison'],
    skillCount: { min: 2, max: 4 },
    ranks: ['Agent','—','—','—','—','—','—','—'],
    weaponPool: ['body-pistol','auto-pistol','blade','dagger'],
    armorPool: ['none','jack','mesh'],
    credits: () => 600 + (Math.floor(Math.random() * 6) + 1) * 300,
    ageBase: 22,
    ageVar: () => (Math.floor(Math.random() * 4) + 1) * 2,
    description: 'Operative or investigator, trained to observe and manipulate.'
  },
  scholar: {
    key: 'scholar',
    label: 'Scholar',
    skillPool: ['Computer','Admin','Medic','Liaison','Engineering','Navigation','Jack-o-T','Leader'],
    skillCount: { min: 2, max: 4 },
    ranks: ['Student','—','—','—','—','—','—','—'],
    weaponPool: ['body-pistol','dagger'],
    armorPool: ['none'],
    credits: () => 300 + (Math.floor(Math.random() * 6) + 1) * 200,
    ageBase: 22,
    ageVar: () => (Math.floor(Math.random() * 5) + 1) * 2,
    description: 'Academic or researcher, more comfortable with data than danger.'
  },
  drifter: {
    key: 'drifter',
    label: 'Drifter',
    skillPool: ['Streetwise','Brawling','Carousing','Gambling','Survival','Jack-o-T','Forgery','Steward'],
    skillCount: { min: 1, max: 3 },
    ranks: ['—','—','—','—','—','—','—','—'],
    weaponPool: ['dagger','blade','body-pistol','revolver'],
    armorPool: ['none','jack'],
    credits: () => (Math.floor(Math.random() * 6) + 1) * 50,
    ageBase: 18,
    ageVar: () => (Math.floor(Math.random() * 8) + 1) * 2,
    description: 'Itinerant worker, down on luck or running from something.'
  }
};

export const CAREER_KEYS = Object.keys(QUICK_CAREERS);
