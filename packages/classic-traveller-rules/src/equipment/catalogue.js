// catalogue.js — the things a traveller can buy, for the Compendium.
//
// v0.264.0. Book 1 (1977) p.41's weapons, ammunition and accessories table and
// its body armour list; Book 3 (1977) pp.13-15's personal equipment. Names,
// tech levels, prices and weights are the books' figures; the notes are short
// paraphrases, not the books' text.
//
// Book 1 gives weapons and armour no tech level, so none is invented here.
// Book 3 gives every equipment item one: "the technological level indicates
// local technology required for manufacture", and the items are "generally
// available for purchase without difficulty on worlds with a sufficient
// technology index (on other worlds, they may be available as imports at
// higher prices)". Weapons are bought freely; what a world's law level bans
// is carrying them outside the starport (Book 3 p.8).

import { PERSONAL_WEAPONS } from '../combat/personal-combat.js';

const item = (entry) => Object.freeze({ techLevel: null, weightGrams: 0, note: '', military: false, ...entry });

// Book 1 p.41: base price, and the price of a clip (or a power pack's
// recharge). A gun is sold loaded: the weight the rules package already uses
// for it includes one clip, so its price does too.
const WEAPON_PRICES = Object.freeze({
  dagger: [10, 0], blade: [50, 0], foil: [100, 0], cutlass: [100, 0], sword: [150, 0], broadsword: [300, 0],
  bayonet: [10, 0], spear: [10, 0], halberd: [75, 0], pike: [40, 0], cudgel: [10, 0],
  'body-pistol': [500, 20], 'automatic-pistol': [200, 10], revolver: [150, 5], carbine: [200, 10], rifle: [200, 20],
  'automatic-rifle': [1000, 20], shotgun: [150, 10], 'submachine-gun': [500, 20],
  // Laser weapons come with their power pack, which Book 1 prices separately.
  'laser-carbine': [2500, 1000], 'laser-rifle': [3500, 1500]
});

const WEAPON_GROUP = (key) => ['laser-carbine', 'laser-rifle'].includes(key) ? 'Lasers'
  : PERSONAL_WEAPONS[key]?.melee ? 'Blades and polearms' : 'Guns';

export const CATALOGUE_WEAPONS = Object.freeze(Object.entries(WEAPON_PRICES).map(([key, [price, clip]]) => item({
  key: `weapon:${key}`, pack: 'Weapons', group: WEAPON_GROUP(key), weaponKey: key,
  name: PERSONAL_WEAPONS[key]?.name ?? key,
  priceCr: price + clip,
  priceNote: clip ? `Cr ${price.toLocaleString('en-US')} + Cr ${clip.toLocaleString('en-US')} for ${key.startsWith('laser') ? 'the power pack' : 'a loaded clip'}` : null,
  note: key.startsWith('laser') ? 'Sold with its power pack. Too delicate to use as a club (Book 1).' : '',
  page: 41
})));

// Spare clips and power packs, and the accessories on the same table.
export const CATALOGUE_WEAPON_EXTRAS = Object.freeze([
  item({ key: 'ammo:body-pistol', group: 'Ammunition', name: 'Body Pistol clip (6 rounds)', priceCr: 20, weightGrams: 50 }),
  item({ key: 'ammo:automatic-pistol', group: 'Ammunition', name: 'Automatic Pistol clip (15 rounds)', priceCr: 10, weightGrams: 250 }),
  item({ key: 'ammo:revolver', group: 'Ammunition', name: 'Revolver reload (6 rounds)', priceCr: 5, weightGrams: 100 }),
  item({ key: 'ammo:carbine', group: 'Ammunition', name: 'Carbine clip (10 rounds)', priceCr: 10, weightGrams: 125 }),
  item({ key: 'ammo:rifle', group: 'Ammunition', name: 'Rifle clip (20 rounds)', priceCr: 20, weightGrams: 500 }),
  item({ key: 'ammo:automatic-rifle', group: 'Ammunition', name: 'Automatic Rifle clip (20 rounds)', priceCr: 20, weightGrams: 500 }),
  item({ key: 'ammo:automatic-rifle-belt', group: 'Ammunition', name: 'Automatic Rifle belt (100 rounds)', priceCr: 120, weightGrams: 2500, note: 'Some automatic rifles take only belts.' }),
  item({ key: 'ammo:shotgun', group: 'Ammunition', name: 'Shotgun clip (10 rounds)', priceCr: 10, weightGrams: 750 }),
  item({ key: 'ammo:submachine-gun', group: 'Ammunition', name: 'Submachine Gun clip (30 rounds)', priceCr: 20, weightGrams: 500 }),
  item({ key: 'ammo:lc-power-pack', group: 'Ammunition', name: 'Laser Carbine power pack (50 shots)', priceCr: 1000, weightGrams: 3000, note: 'Recharging costs Cr 200 and takes about 8 hours at a suitable power source.' }),
  item({ key: 'ammo:lr-power-pack', group: 'Ammunition', name: 'Laser Rifle power pack (100 shots)', priceCr: 1500, weightGrams: 4000, note: 'Recharging costs Cr 300 and takes about 8 hours at a suitable power source.' }),
  item({ key: 'acc:telescopic-sights', group: 'Accessories', name: 'Telescopic Sights', priceCr: 200, weightGrams: 800 }),
  item({ key: 'acc:electronic-sights', group: 'Accessories', name: 'Electronic Sights', priceCr: 2000, weightGrams: 1500 }),
  item({ key: 'acc:silencer', group: 'Accessories', name: 'Silencer', priceCr: 200, weightGrams: 600, note: 'Adds 200 mm to the weapon.' }),
  item({ key: 'acc:shoulder-stock', group: 'Accessories', name: 'Shoulder Stock', priceCr: 75, weightGrams: 1000, note: 'Adds 350 mm.' }),
  item({ key: 'acc:folding-stock', group: 'Accessories', name: 'Folding Stock', priceCr: 100, weightGrams: 500, note: 'Adds 300 mm unfolded.' })
].map((entry) => item({ ...entry, pack: 'Weapons', page: 41 })));

// Book 1 p.41. Worn armour is not counted in the load (Book 1 p.33), so it
// carries no weight here. The rules package's key for Battle Dress is
// 'combat', its column in the weapons matrix.
export const CATALOGUE_ARMOUR = Object.freeze([
  item({ key: 'armour:jack', armourKey: 'jack', name: 'Jack', priceCr: 50, note: 'Leather jacket or body suit. Some use against blades; none against guns.' }),
  item({ key: 'armour:mesh', armourKey: 'mesh', name: 'Mesh', priceCr: 150, note: 'Leather lined with metal mesh. Good against blades, some use against guns, none against lasers.' }),
  item({ key: 'armour:cloth', armourKey: 'cloth', name: 'Cloth', priceCr: 250, note: 'Ballistic cloth jacket. Close to the best and most versatile armour there is.' }),
  item({ key: 'armour:reflec', armourKey: 'reflec', name: 'Reflec', priceCr: 1500, note: 'Reflective suit worn under clothing, useful only against lasers. Often hard to obtain.' }),
  item({ key: 'armour:ablat', armourKey: 'ablat', name: 'Ablat', priceCr: 75, note: 'The cheap alternative to reflec: vaporizes under laser fire. Common.' }),
  item({ key: 'armour:combat', armourKey: 'combat', name: 'Battle Dress', priceCr: 200000, military: true, note: 'Powered military armour. Not sold to civilians in most circumstances; needs Vacc Suit-1. Powered, it doubles strength.' })
].map((entry) => item({ ...entry, pack: 'Armour', group: 'Body armour', page: 41 })));

// Book 3 pp.13-15. Weights in grams; an item with no weight in Book 3 carries
// none here.
const B3 = (group, name, techLevel, priceCr, weightGrams, note = '', extra = {}) => item({ key: `gear:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, pack: 'Equipment', group, name, techLevel, priceCr, weightGrams, note, page: extra.page ?? 13, ...extra });

export const CATALOGUE_EQUIPMENT = Object.freeze([
  B3('Survival', 'Respirator', 5, 100, 0, 'Lets the wearer breathe a type 3 (very thin, tainted) atmosphere.'),
  B3('Survival', 'Filter Mask', 3, 10, 0, 'For type 4, 7 or 9 (tainted) atmospheres.'),
  B3('Survival', 'Combination Mask', 5, 150, 0, 'Filter mask and respirator together, for a type 2 atmosphere.'),
  B3('Survival', 'Oxygen Tanks', 5, 500, 5000, 'Breathing in smoke, dust, gas or a type A atmosphere. Two tanks last 6 hours; refill Cr 20.'),
  B3('Survival', 'Underwater Air Tanks', 5, 800, 5000, 'Oxygen tanks built for use underwater. Two last 6 hours; refill Cr 20.'),
  B3('Survival', 'Artificial Gill', 8, 4000, 4000, 'Unlimited time underwater, on worlds with atmosphere 4 to 9.'),
  B3('Survival', 'Swimming Equipment', 3, 200, 0, 'Fins, wet suit, face mask.'),
  B3('Survival', 'Protective Suit', 5, 700, 5000, 'Protection against a type B (corrosive) atmosphere.'),
  B3('Survival', 'Vacc Suit', 7, 10000, 10000, 'For vacuum, or as a protective suit. Includes oxygen tanks and radio.'),
  B3('Survival', 'Cold Weather Clothing', 1, 200, 0, 'Protection from frigid weather.'),
  B3('Devices', 'Short Range Communicator', 5, 100, 300, 'Radio, 10 km range.'),
  B3('Devices', 'Medium Range Communicator', 5, 200, 500, 'Radio, 30 km range, with access to official channels.'),
  B3('Devices', 'Long Range Communicator', 6, 500, 1500, 'Radio, 500 km range; can reach ships in orbit.'),
  B3('Devices', 'Magnetic Compass', 3, 10, 0, 'Points to magnetic north, where there is one.'),
  B3('Devices', 'Inertial Locator', 9, 1200, 1500, 'Tracks direction and distance from the starting point.', { page: 14 }),
  B3('Devices', 'Metal Detector', 6, 300, 1000, 'Detects metal.', { page: 14 }),
  B3('Devices', 'Geiger Counter', 5, 250, 1000, 'Detects radioactivity and its strength.', { page: 14 }),
  B3('Devices', 'Bull-Horn', 5, 120, 500, 'Carries a voice a very long way. Bulky and awkward.', { page: 14 }),
  B3('Devices', 'Hand Calculator', 6, 250, 100, 'Basic arithmetic.', { page: 14 }),
  B3('Devices', 'Hand Computer', 11, 1500, 500, 'Programmable calculator, and a terminal when linked to a computer.', { page: 14 }),
  B3('Devices', 'Psionic Shield Helmet', 8, 4000, 1000, 'Shields the wearer against psionics.', { page: 14 }),
  B3('Devices', 'Handcuffs', 2, 25, 300, 'Lighter at higher tech levels.', { page: 14 }),
  B3('Devices', 'Wrist Watch', 3, 25, 0, 'Cr 25 to Cr 1,000; the price sets the quality.', { page: 14 }),
  B3('Vision', 'Binoculars', 3, 75, 1000, '', { page: 14 }),
  B3('Vision', 'IR Goggles', 6, 500, 0, 'See heat sources in the dark, with some distortion.', { page: 14 }),
  B3('Vision', 'Light Intensifier Goggles', 9, 500, 0, 'See in anything short of total darkness.', { page: 14 }),
  B3('Vision', 'Torch', 1, 1, 250, 'Burns about 20 minutes.', { page: 14 }),
  B3('Vision', 'Electric Torch', 3, 10, 500, 'About 6 hours of use.', { page: 14 }),
  B3('Vision', 'Gas or Oil Lamp', 2, 10, 500, 'About 6 hours.', { page: 14 }),
  B3('Vision', 'Cold Light Lantern', 6, 20, 250, 'Three days of continuous light.', { page: 14 }),
  B3('Tools', 'Carpentry Tool Set', 2, 300, 25000, 'Cut, shape and build in wood. Boxed.', { page: 14 }),
  B3('Tools', 'Metalwork Tool Set', 4, 1500, 50000, 'Metalworking, welding, shaping. Boxed.', { page: 14 }),
  B3('Tools', 'Chain Saw', 6, 500, 8000, 'Felling and cutting trees.', { page: 14 }),
  B3('Tools', 'Mechanical Tool Set', 5, 1000, 20000, 'Repair and alter mechanical devices. Boxed.', { page: 14 }),
  B3('Tools', 'Electronic Tool Set', 7, 2000, 5000, 'Basic electronic assembly and repair. Boxed.', { page: 14 }),
  B3('Tools', 'Lock Pick Set', 6, 400, 0, 'Picks most ordinary locks on 8+, one throw per 15 seconds.', { page: 14 }),
  B3('Tools', 'Disguise Kit', 7, 1000, 5000, 'Changes the wearer\u2019s appearance for a time.', { page: 14 }),
  B3('Shelters', 'Tarpaulin', 1, 10, 2000, 'Waterproof sheet, 2 by 4 metres, for a temporary shelter.', { page: 15 }),
  B3('Shelters', 'Tent', 2, 200, 3000, 'Shelter for two. Larger tents cost and weigh more.', { page: 15 }),
  B3('Shelters', 'Pressure Tent', 7, 2000, 25000, 'Shelter for two with standard atmosphere inside.', { page: 15 }),
  B3('Shelters', 'Pre-Fabricated Cabin', 6, 10000, 4000000, 'Unpressurized modular quarters for six; fits in a starship\u2019s hold (4 tons).', { page: 15 }),
  B3('Shelters', 'Advanced Base', 8, 50000, 6000000, 'Pressurized modular quarters for six with an air lock; fits in a hold (6 tons).', { page: 15 }),
  B3('Rations', 'Preserved Rations (1 day)', 1, 20, 500, 'Canned or packaged food for one person, one day.', { page: 15 }),
  B3('Rations', 'Dehydrated Rations (1 day)', 1, 25, 200, 'One person, one day; needs water where eaten.', { page: 15 })
]);

export const CATALOGUE = Object.freeze([...CATALOGUE_WEAPONS, ...CATALOGUE_WEAPON_EXTRAS, ...CATALOGUE_ARMOUR, ...CATALOGUE_EQUIPMENT]);
export const CATALOGUE_PACKS = Object.freeze(['Weapons', 'Armour', 'Equipment']);

export function catalogueEntry(key) {
  const entry = CATALOGUE.find((candidate) => candidate.key === key);
  if (!entry) throw new RangeError(`not in the catalogue: ${key}`);
  return entry;
}

/**
 * Whether an entry can be bought on a world, and why not. `profile` is the
 * parsed UWP of the world the party is on, or null in space. Weapons are
 * sold freely (a law level bans carrying them, which is a warning, not a
 * refusal); Battle Dress is military; equipment needs the world's tech level.
 */
export function catalogueAvailability(entry, profile, { prohibitedWeaponKeys = [] } = {}) {
  if (!profile) return { buy: false, reason: 'Buying needs a world: the party is not in port.', warning: null };
  if (entry.military) return { buy: false, reason: 'Strictly military, not sold to civilians in most circumstances (Book 1 p.41). The referee can give it.', warning: null };
  if (entry.techLevel !== null && Number(profile.techLevel) < entry.techLevel) {
    return { buy: false, reason: `Needs tech level ${entry.techLevel}; this world is ${profile.techLevel}. Perhaps as an import at a higher price, at the referee\u2019s word (Book 3 p.13).`, warning: null };
  }
  const banned = entry.weaponKey && (prohibitedWeaponKeys.includes('*') || prohibitedWeaponKeys.includes(entry.weaponKey));
  return { buy: true, reason: null, warning: banned ? `Law level ${profile.lawLevel}: may not be carried outside the starport (Book 3 p.8).` : null };
}
