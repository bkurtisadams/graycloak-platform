/**
 * OD&D — Chainmail engine · monster attack profiles
 * odd-chainmail · module/rules/monster-attacks.mjs
 * system 0.1.204 · slice: monster-attack-profile · stamp 0.1.204-monster-attack-profile.1
 *
 * Pure helpers shared by the monster data model, actor document, migration,
 * and the coming Book II compendium. A monster attack profile is not a literal
 * weapon: OD&D supplies one man-to-man roll per Hit Die, while this system uses
 * the Pole Arm row as the armor-sensitive proxy for claws, bites, giant-sized
 * weapons, undead touches, and other creature attacks.
 */

/** How the monster makes an ordinary melee attack. */
export const MonsterAttackMethod = Object.freeze({
  PROFILE: "profile",
  WEAPON: "weapon",
  NONE: "none"
});

/** Hidden man-to-man armor curve for Monster Attack Profile attacks. */
export const MONSTER_ATTACK_WEAPON_ID = "polearm";

/** Chainmail mass-combat classes used by the Fantasy Supplement profiles. */
export const CHAINMAIL_COMBAT_CLASSES = Object.freeze(["", "LF", "HF", "AF", "LH", "MH", "HH"]);

const METHODS = new Set(Object.values(MonsterAttackMethod));
const CLASSES = new Set(CHAINMAIL_COMBAT_CLASSES);

const int = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
const nonNegative = (value, fallback = 0) => Math.max(0, int(value, fallback));

/**
 * Convert the pre-0.1.204 monster attack fields into the new structured shape.
 * Used by the one-time world migration and by imports of old actor JSON.
 */
export function legacyMonsterAttackProfile(system = {}) {
  const natural = system.naturalAttacker !== false;
  const damage = system.naturalDamage ?? {};
  return {
    method: natural ? MonsterAttackMethod.PROFILE : MonsterAttackMethod.WEAPON,
    description: "",
    weaponClass: Math.min(12, Math.max(1, int(system.naturalWeaponClass, 4))),
    damage: {
      dice: nonNegative(damage.dice, 1),
      bonus: int(damage.bonus, 0)
    },
    diceOverride: nonNegative(system.attacks, 0),
    chainmail: {
      attacksAs: "",
      attackFigures: 0,
      extraDice: 0,
      defendsAs: "",
      defenseFigures: 0
    }
  };
}

/**
 * Return a safe normalized view. The legacy fallback keeps old imported actors
 * functional until they are migrated, without making the combat engine know
 * about two independent data layouts.
 */
export function monsterAttackProfile(system = {}) {
  const legacy = legacyMonsterAttackProfile(system);
  const attack = system.attack ?? {};
  const damage = attack.damage ?? legacy.damage;
  const chainmail = attack.chainmail ?? legacy.chainmail;
  const method = METHODS.has(attack.method) ? attack.method : legacy.method;

  return {
    method,
    description: String(attack.description ?? legacy.description).trim(),
    weaponClass: Math.min(12, Math.max(1, int(attack.weaponClass, legacy.weaponClass))),
    damage: {
      dice: nonNegative(damage.dice, legacy.damage.dice),
      bonus: int(damage.bonus, legacy.damage.bonus)
    },
    diceOverride: nonNegative(attack.diceOverride, legacy.diceOverride),
    chainmail: {
      attacksAs: CLASSES.has(chainmail.attacksAs) ? chainmail.attacksAs : "",
      attackFigures: nonNegative(chainmail.attackFigures, 0),
      extraDice: nonNegative(chainmail.extraDice, 0),
      defendsAs: CLASSES.has(chainmail.defendsAs) ? chainmail.defendsAs : "",
      defenseFigures: nonNegative(chainmail.defenseFigures, 0)
    }
  };
}

/** One normal-combat roll per HD unless a specific creature overrides it. */
export function monsterAttackDice(system = {}) {
  const profile = monsterAttackProfile(system);
  if (profile.method === MonsterAttackMethod.NONE) return 0;
  return profile.diceOverride || nonNegative(system.hd?.count, 0);
}

/** Monster-profile attacks do not parry; weapon-profile attacks do. */
export function monsterAttackIsArmed(system = {}) {
  return monsterAttackProfile(system).method === MonsterAttackMethod.WEAPON;
}

/** Whether the header's generic melee attack action is available. */
export function monsterCanAttack(system = {}) {
  return monsterAttackProfile(system).method !== MonsterAttackMethod.NONE;
}

/** Self-tests, Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (condition, label) => {
    if (!condition) throw new Error(`monster-attacks.mjs FAIL: ${label}`);
    pass++;
  };

  const oldNatural = { hd: { count: 6 }, naturalAttacker: true, naturalWeaponClass: 4, naturalDamage: { dice: 1, bonus: 3 }, attacks: 0 };
  const migratedNatural = legacyMonsterAttackProfile(oldNatural);
  ok(migratedNatural.method === "profile", "legacy natural attacker becomes profile");
  ok(migratedNatural.damage.dice === 1 && migratedNatural.damage.bonus === 3, "legacy natural damage preserved");
  ok(monsterAttackDice(oldNatural) === 6, "legacy profile derives one die per HD");
  ok(monsterAttackIsArmed(oldNatural) === false, "monster profile is not armed for parry");

  const oldArmed = { hd: { count: 1 }, naturalAttacker: false, naturalWeaponClass: 8, attacks: 2 };
  const migratedArmed = legacyMonsterAttackProfile(oldArmed);
  ok(migratedArmed.method === "weapon" && migratedArmed.weaponClass === 8, "legacy armed monster preserves class");
  ok(monsterAttackDice(oldArmed) === 2, "legacy attacks override preserved");
  ok(monsterAttackIsArmed(oldArmed) === true, "weapon profile can parry");

  const modern = {
    hd: { count: 9 },
    attack: {
      method: "profile",
      description: " Giant-sized weapon ",
      weaponClass: 3,
      damage: { dice: 2, bonus: 1 },
      diceOverride: 12,
      chainmail: { attacksAs: "HF", attackFigures: 12, extraDice: 1, defendsAs: "AF", defenseFigures: 12 }
    }
  };
  const profile = monsterAttackProfile(modern);
  ok(profile.description === "Giant-sized weapon", "description trimmed");
  ok(monsterAttackDice(modern) === 12, "modern override wins");
  ok(profile.chainmail.attacksAs === "HF" && profile.chainmail.defendsAs === "AF", "mass profile preserved");

  const none = { hd: { count: 8 }, attack: { method: "none", diceOverride: 8 } };
  ok(monsterAttackDice(none) === 0 && !monsterCanAttack(none), "no normal attack has zero attack pool");

  console.log(`monster-attacks.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}
