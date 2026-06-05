// adnd-companions-test.js - headless validation of adnd-class-data.js + adnd-equipment.js
const C = require('./adnd-class-data.js');
const E = require('./adnd-equipment.js');

let pass = 0, fail = 0;
function ok(name, cond) { cond ? (pass++) : (fail++, console.log('  FAIL: ' + name)); }
const isNum = v => typeof v === 'number' && !Number.isNaN(v);

// ===== class-data =====
ok('attacks fighter L1 = 1/1', C.getAttacksPerRound('fighter', 1) === '1/1');
ok('attacks fighter L7 = 3/2', C.getAttacksPerRound('fighter', 7) === '3/2');
ok('attacks fighter L13 = 2/1', C.getAttacksPerRound('fighter', 13) === '2/1');

const fSaves = C.getSavingThrows('fighter', 1);
ok('fighter saves = 5-element numeric array', Array.isArray(fSaves) && fSaves.length === 5 && fSaves.every(isNum));
const pSaves = C.getSavingThrows('paladin', 1);
ok('paladin saves are +2 better (each 2 lower)', pSaves.every((s, i) => s === fSaves[i] - 2));

ok('fighter L1 title = Veteran', C.getLevelTitle('fighter', 1) === 'Veteran');
ok('title returns a non-empty string', typeof C.getLevelTitle('cleric', 1) === 'string' && C.getLevelTitle('cleric', 1).length > 0);

const cSlots = C.getSpellSlots('cleric', 1, 13);
ok('cleric L1 spell slots object', cSlots && cSlots.type === 'Cleric' && Array.isArray(cSlots.levels));
ok('fighter has no spell slots', C.getSpellSlots('fighter', 1, 10) === null);
const muSlots = C.getSpellSlots('magic-user', 1, 10);
ok('magic-user L1 has 1 first-level slot', muSlots && Array.isArray(muSlots.levels) && muSlots.levels[0] >= 1);

ok('turn level for cleric is numeric/string', C.getTurnLevel('cleric', 1) != null);
const langs = C.getLanguages('dwarf', 'fighter', 10);
ok('languages returns {known, available}', langs && Array.isArray(langs.known) && Array.isArray(langs.available));

const info = C.getClassInfo({ class: 'fighter', level: 1, str: 16, dex: 14, con: 15, wis: 10, int: 10, cha: 10, race: 'human' });
ok('getClassInfo returns an object', info && typeof info === 'object');

// ===== equipment =====
ok('dexAcBonus 10 = 0', E.dexAcBonus(10) === 0);
ok('dexAcBonus 18 = 4', E.dexAcBonus(18) === 4);
ok('dexAcBonus 3 = -4', E.dexAcBonus(3) === -4);
ok('dexAcBonus 16 = 2', E.dexAcBonus(16) === 2);

ok('unarmored dex10 AC = 10', E.calculateAC({ dex: 10 }) === 10);
const plate = E.ARMOR.plate_mail.ac;
ok('plate_mail dex10 AC = armor ac', E.calculateAC({ equippedArmor: 'plate_mail', dex: 10 }) === plate);
const lsh = E.SHIELDS.large_shield.acBonus;
ok('plate + large shield + dex16 stacks correctly',
   E.calculateAC({ equippedArmor: 'plate_mail', equippedOffhand: 'large_shield', dex: 16 }) === plate - lsh - 2);

ok('calculateWeight returns a number', isNum(E.calculateWeight({ inventory: [], equippedArmor: 'leather' })));
const wi = E.getWeaponInfo({ equippedWeapon: 'dagger', str: 12, classes: ['fighter'], class: 'fighter' });
ok('getWeaponInfo for dagger is truthy', wi && typeof wi === 'object');

ok('getItemDef dagger truthy', !!E.getItemDef('dagger'));
ok('getItemDef bogus is falsy', !E.getItemDef('zzz_not_a_real_item'));
ok('canUseItem returns boolean', typeof E.canUseItem('fighter', E.WEAPONS.dagger) === 'boolean');
ok('getAllWeapons returns non-empty array', Array.isArray(E.getAllWeapons()) && E.getAllWeapons().length > 0);
ok('isWeaponTwoHanded returns boolean', typeof E.isWeaponTwoHanded('dagger') === 'boolean');

const shopType = Object.keys(E.SHOP_TYPES)[0];
const listing = E.getShopListing(shopType, 'fighter');
ok('getShopListing returns {shopName, items[]}', listing && typeof listing.shopName === 'string' && Array.isArray(listing.items) && listing.items.length > 0);

console.log(`\n${pass}/${pass + fail} passed` + (fail ? ` (${fail} FAILED)` : ' — all green'));
process.exit(fail ? 1 : 0);
