# DESIGN — AMMOG → dungeon-encounter Harvest & Extraction Plan

**Source:** `C:\ammog_2` (AMMOG, Node/SQLite/WebSocket 1e MUD, ~Feb–Mar 2026)
**Target:** `dungeon-encounter` (single-file browser 1e tactical combat tool, GCC)
**Audit date:** 2026-05-27 · sim at v0.7.1

---

## Headline finding

The AMMOG **rules + content tier is fully decoupled from infrastructure.** Across every
rules module audited, no file `require`s `db.js`, `server.js`, or `ws`. The dependency graph
is rules-module → rules-module only:

```
leaf (no deps):  chargen · equipment · class-data · follower · purse · los · thief-skills
monsters      → los
conditions    → monsters
combat        → monsters · equipment · chargen
saving-throws → class-data · chargen · monsters
treasure      → equipment
spells        → monsters · saving-throws · conditions
henchman      → monsters · combat · class-data · chargen · spells · equipment
tactical-combat → (almost all of the above)
```

**Implication:** the whole 1e ruleset can become a client-side library (`adnd-engine.js`,
loaded via `<script src>`), given a thin adapter between AMMOG's entity model and the sim's
combatant model. That is the long-term "north star" (Phase 6); the near-term path is
incremental data-first harvesting (Phase 1).

---

## File classification

| File | Bucket | Key contents | Deps | Action |
|---|---|---|---|---|
| `equipment.js` | **Data** | ARMOR/SHIELDS/WEAPONS/RANGED/AMMO/SUPPLIES/GEMS/JEWELRY; `calculateAC`, `dexAcBonus`, `calculateWeight`, dual-wield, two-handed | none | Lift |
| `class-data.js` | **Data** | XP, save matrices, **real `TURN_UNDEAD`**, `getAttacksPerRound`, `getSpellSlots`, level titles | none | Lift |
| `monsters.js` | **Data** | `TEMPLATES` bestiary + `LOOT_TABLES` (skip `Monster` class / `tickMonster`) | los | Lift (data only) |
| `treasure.js` | **Data** | A–Z treasure types, gems, jewelry | equipment | Lift |
| `thief-skills.js` | **Data** | skill table, racial/dex adj, backstab mult | none | Lift |
| `purse.js` | **Data** | cp/sp/ep/gp/pp coin system | none | Lift |
| `chargen.js` | **Data+logic** | racial tables, `rollPercentileStr`, `getChaReactionAdj`, age, proficiency, multiclass | none | Lift |
| `los.js` | **Logic** | Bresenham `hasLOS`, shadowcast `computeFOV`, `canSee` | none | Lift (optional) |
| `saving-throws.js` | **Logic** | `rollSavingThrow`, racial CON/sleep-charm | class-data, chargen, monsters | Adapt |
| `conditions.js` | **Logic** | `CONDITION_DEFS`, `applyCondition`, `tickConditions`, `canAct`, `isAutoHit`, `ignoresDex`, `resolveSpecialAttack` | monsters | Adapt |
| `combat.js` | **Logic** | `playerAttack`/`Offhand`/`Ranged`, `adjustToHit` (repeating-20), Str tables, proficiency, racial | monsters, equipment, chargen | Adapt |
| `spells.js` | **Data+logic** | **178 spells**: full metadata (lift) + `resolve()` effects (adapt per-spell) | monsters, saving-throws, conditions | Split: lift data, adapt resolve |
| `follower.js` | **Logic** | `FOLLOWER_TYPES`, `moraleCheck`, follower AI, mounts/hirelings | none | Adapt |
| `henchman.js` | **Logic** | `createHenchman`, `henchmanMorale`, spell-prioritizing combat AI, heal-ally logic | rules tier | Adapt |
| `tactical-combat.js` | **Mine, don't adopt** | parallel server-shaped engine; surprise-segment math, monster morale, facing zones, fire-into-melee, Ready-Missiles, bleeding | rules tier | Harvest algorithms only |
| `server.js`, `db.js`, `zone*.js`, `map-loader.js`, `dungeon-store.js`, `generate-*.js`, `*.db` | **Skip** | persistence, networking, MUD world/command loop | — | Ignore |

---

## Gaps in the sim that AMMOG fills

| Sim gap (current) | AMMOG source |
|---|---|
| Turn Undead = HD-diff approximation | `class-data.TURN_UNDEAD` (real by-type matrix) + `getTurnLevel` |
| Single attack/round only | `class-data.getAttacksPerRound` + `combat` |
| No two-weapon fighting | `equipment.dualWieldPenalties` + `combat.playerOffhandAttack` |
| Missile ROF fires once | `combat.playerRangedAttack` (`rofMultiplier`, `maxShots`) |
| No exceptional-Str percentile | `chargen.rollPercentileStr` + `combat.strHitBonus/strDmgBonus(strPct)` |
| Encumbrance uses a Str-bonus *approximation* | `combat.strWeightAllowance` (real PHB table) |
| Status flags ad-hoc (`_asleep`, `_paralyzed_until`) | `conditions.js` full system + monster `resolveSpecialAttack` |
| 3 monsters | `monsters.TEMPLATES` (full bestiary) |
| 6 spells | `spells.js` (178) |
| GM Panel: equip armor → AC? | `equipment.calculateAC` / `dexAcBonus` (yes, function exists) |
| GM Panel: caster memorization | `class-data.getSpellSlots` |
| Parley / reaction / morale (deferred) | `chargen.getChaReactionAdj` + `follower.moraleCheck` |
| No backstab | `thief-skills.backstabMultiplier` |
| No real missile/vision LOS | `los.js` |
| No post-combat treasure | `treasure.js` |

---

## Entity-model adaptation layer (the one translation that matters)

Data ports with reformatting only. **Logic** modules speak AMMOG's shapes and must be
bridged to the sim's:

| Concept | AMMOG | Sim |
|---|---|---|
| HP | `entity.hp` | `combatant.hp_current` / `hp_max` |
| Name | `entity.name` | `combatant.label` |
| Class | `entity.class` | `combatant.matrix_class` |
| Weapon/armor | `equippedWeapon` / `equippedArmor` | `active_weapon` / `loadout`, `ac_base` |
| Position | `x, y` (tiles, 3'4"/tile) | `position.{col,row}` (10-ft squares ÷ SUB) |
| Result | `resolve()`/attack → array of event objects (`{type, text, damage, dead}`) | build one event → `applyHitConsequences` + `log()` |
| Weight unit | pounds (10 coins/lb) | gp-weight (10 gp = 1 lb) — reconcile via GM gp/lb setting |
| Dice | `roll(n,d)` | sim has equivalent |

**Recommendation:** for logic-heavy modules (combat, conditions, spell `resolve`), write a
small **adapter shim** that presents a sim combatant *as* an AMMOG entity (getters mapping
`hp` ↔ `hp_current`, etc.) so the ported functions run nearly unchanged. Data modules need
no shim — just reshape into the sim's `WEAPONS`/`ITEMS`/`SPELLS`/monster-template forms.

---

## Phased extraction plan

### Phase 0 — Prep
- [ ] Create `combat-data.js` as the data destination (the `<script src>` split we already wanted).
- [ ] Decide adapter approach (shim vs rewrite) — default: **shim** for logic, **reshape** for data.
- [ ] Confirm gp vs lb default for weight (GM Settings).

### Phase 1 — Data tier  *(biggest visible jump; dovetails with GM Panel; fully verifiable)*
- [ ] Import `equipment.js` → replace sim `WEAPONS` + `ITEMS`; adopt `calculateAC`, `dexAcBonus`, `calculateWeight`, dual-wield/two-handed flags.
- [ ] Import `class-data.js` → real save matrices, **`TURN_UNDEAD`** (replace HD-diff `turnUndeadResult`), `getAttacksPerRound`, `getSpellSlots`, XP table.
- [ ] Import `monsters.TEMPLATES` + `LOOT_TABLES` → real bestiary (map combat fields; drop MUD-only fields: aggroRadius, leashRadius, respawnTicks, sprite, vision).
- [ ] Reconcile weight units (lb ↔ gp-weight) against the encumbrance engine.
- [ ] **GM Panel** then doles from the real catalog and spawns from the real bestiary.

### Phase 2 — Status backbone
- [ ] Adopt `conditions.js` (CONDITION_DEFS, applyCondition, tickConditions, canAct, isAutoHit, ignoresDex).
- [ ] Replace ad-hoc `_asleep`/`_paralyzed_until`/`_turned_until` flags with conditions.
- [ ] Wire `resolveSpecialAttack` → unlocks monster special attacks (paralysis, level drain, stench).

### Phase 3 — Spells
- [ ] Import all 178 spell **metadata** as selectable (level/class/range/duration/save/area/target/desc).
- [ ] Port `resolve()` in batches via the shim, extending the existing `resolveSpell`:
  - [ ] MU L1 combat: magic_missile, sleep, shield, shocking_grasp, burning_hands, charm_person
  - [ ] Cleric L1: cure_light_wounds, bless, hold_person, protection_from_evil
  - [ ] MU L2/L3: web, stinking_cloud, mirror_image, fireball, lightning_bolt, haste, slow
  - [ ] Remaining utility/non-combat as needed

### Phase 4 — Combat math upgrades
- [ ] `adjustToHit` (repeating-20 / over-AC-10 handling)
- [ ] Exceptional Strength: `rollPercentileStr` + `strHitBonus`/`strDmgBonus(strPct)`
- [ ] Multiple attacks/round: `getAttacksPerRound`
- [ ] Two-weapon: `playerOffhandAttack` + `dualWieldPenalties`
- [ ] Missile ROF + fire-into-melee shots: `rofMultiplier` / `maxShots`
- [ ] Upgrade encumbrance to real `strWeightAllowance`
- [ ] Backstab: `thief-skills.backstabMultiplier`

### Phase 5 — Morale + followers/henchmen  *(target: sim v0.8.0+)*
- [ ] Mine `tactical-combat.checkMonsterMorale` / `applyMonsterMoraleActions`.
- [ ] Adopt `follower.moraleCheck` + `henchman.henchmanMorale` + `chargen.getChaReactionAdj`.
- [ ] Henchmen as controllable NPC allies with `henchmanCombatAI` (spell-prioritizing, heals wounded allies).

### Phase 6 — North-star (optional / later)
- [ ] Bundle the rules tier as client-side `adnd-engine.js`; dungeon-encounter + future GCC pages consume it.
- [ ] `chargen.js` → a real character-generation page (answers the earlier "chargen + buy gear/select spells" question).
- [ ] `los.js` → real missile/vision line-of-sight in the tactical sim.
- [ ] `treasure.js` → post-combat loot rolls.

---

## Open decisions

1. **Bundle vs inline** — `combat-data.js` (data only) now; full `adnd-engine.js` bundle later? (Note `file://` blocks ES-module imports; `<script src>` works on graycloak.net but not double-click-open. Single-file stays the default for the sim.)
2. **Adapter** — shim sim-combatant-as-AMMOG-entity (less rewrite) vs rewrite logic against sim objects.
3. **Weight unit** — gp-weight vs lb default (GM Settings toggle).
4. **Chargen scope** — lightweight stat editing in the GM Panel vs a full chargen page (Phase 6).
5. **Keep the sim's value-adds** — bespoke weaponless trio (overbear/grapple/pummel), declaration/peek UI, the v2 HUD. These are NOT in AMMOG and should survive the harvest.

---

## Files inventory

**Shared & audited:** class-data, equipment, follower, monsters, henchman, tactical-combat,
spells, purse, saving-throws, treasure, thief-skills, chargen, combat, conditions, los.

**Not needed (skip):** server.js, db.js, zone.js, zone-manager.js, map-loader.js,
dungeon-store.js, generate-*.js, accounts.db, world.db, maps/*, dungeons/*, node_modules,
public/* (prior browser UIs — worth a glance only if salvaging UI patterns).
