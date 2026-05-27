# DESIGN — AMMOG → dungeon-encounter Harvest & Extraction Plan

**Source:** `C:\ammog_2` (AMMOG, Node/SQLite/WebSocket 1e MUD, ~Feb–Mar 2026)
**Target:** `dungeon-encounter` (single-file browser 1e tactical combat tool, GCC)
**Audit date:** 2026-05-27 · sim at v0.8.0

---

## Status — v0.8.2 (2026-05-27)

**The AMMOG glue layer landed (sim-side), fully node-verified — no UI yet.** The "staged but not
wired" data is now reachable by the coming GM Panel through a small adapter tier added to the main
script:

- `computeAC(c)` — 1e AC **suggestion** from worn armour + Dex Defensive Adjustment + shield
  (returns `{shieldless, withShield}`). Written in-sim because **`calculateAC`/`dexAcBonus` were never
  harvested into `combat-data.js`** — only the armour/shield *data* was (see corrected note below).
  Deliberately a suggestion the editor offers, **never auto-applied on load**: seed ACs are
  hand-authored and don't reduce to a clean armour+Dex+shield formula, so overwriting them would be a
  silent regression.
- `lbToGp` / `gpToLb` — weight reconciliation (CDATA is lb; sim ITEMS are gp-weight, 10 gp = 1 lb).
- `cdataWeaponToSim(id)` / `cdataArmorToItem(id)` — reshape a CDATA catalog row into a registered sim
  `WEAPONS` / `ITEMS` entry (gp-weight) so the panel can dole real gear into the existing encumbrance engine.
- `spawnFromTemplate(templateId, side, pos)` — **natural-attack support.** Reshapes a CDATA monster
  (inline `attacks`/`rangedAttacks`, `[n,d]` damage, lb stats) into a sim combatant: synthesises each
  natural attack into a `WEAPONS` entry (`_registerNaturalAttack`), maps HD→`level`, sizes L→2 cells,
  derives a turnable `undead_type`, and stamps the harvested `thac0` as a per-combatant override.
  `thac0Of` now honours `c.thac0` when present (tiny additive change). Pure — returns the combatant,
  does not touch state; the panel handles placement/render.

Verified with a 36-assertion functional suite + a 5-assertion integration check, both run against the
real `combat-data.js` and the real seed combatants (e.g. orc battle-axe → `1d8`, javelin ranged band,
THAC0 19, needs 12+ vs AC7; owlbear claw/claw/beak with beak `2d6`; ogre `size_cells` 2 / THAC0 16;
skeleton turnable via the CDATA matrix; carrion-crawler `[0,0]` special does not crash; Aggro's
plate+Dex15 → AC2 matches the authored seed).

**Next build — GM Panel UI** (now de-risked; build in focused slices on top of this glue):
editor shell + GM Settings strip (gp/lb toggle) → gear doling + spell memorization (`CDATA.getSpellSlots`)
→ monster spawning (`spawnFromTemplate`) + read-only inspect HUD + free setup token-drag.

---

## Status — v0.8.0 (2026-05-27)

**Phase 0 + the data-import half of Phase 1 are done.** `combat-data.js` now exists (global `CDATA`,
loaded via `<script src>` *before* the main inline script), holding the harvested AMMOG tier:
turn-undead matrix, save tables, spell-slot / XP / attacks-per-round helpers, 45 weapons, 7 armor,
2 shields, supplies / ammo / gems / jewelry, 34 monster templates, 15 loot tables. Regenerable from
the AMMOG modules via `harvest.js`.

**Wired live:** real Turn Undead — `CDATA.getTurnResult(level, type)` replaced the old HD-diff
`turnUndeadResult`; skeleton tagged `undead_type`. **Staged but deliberately *not* wired yet:** the
weapon catalog and the bestiary — making them useful needs the editor / spawn UI, so they land with
the **GM Panel** (next build); the AC question is answered by the in-sim `computeAC` (above) — `equipment.calculateAC`/`dexAcBonus` were *not* in the harvest, only the armour/shield data.

**Deployment reality (corrected):** graycloak.net (GCC) is **GitHub Pages** — the `gcc/` folder is the
published root, and the push *is* the deploy (`.github/workflows/static.yml` + `gcc/CNAME`). The
separate `graycloak-adnd/` is the **Firebase** project (future MMOG host). The harvested engine
(`combat-data.js` + the layers to come) is the **shared core** for both: single-player on Pages now,
multiplayer on the adnd client later. The MMOG sync fork — serverless (Firebase Hosting + Firestore)
vs server-authoritative (the AMMOG Node/WebSocket model, already built once) — stays open; decision
doc to be written when committed.

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
| GM Panel: equip armor → AC? | in-sim `computeAC` (armour+Dex+shield) — note `calculateAC`/`dexAcBonus` were NOT harvested, only data |
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
- [x] Create `combat-data.js` as the data destination (the `<script src>` split). **Done — v0.8.0.**
- [x] Adapter approach decided — **reshape** for data (`harvest.js` transforms AMMOG shapes → sim shapes); **shim** remains the plan for logic (spells/conditions in later phases).
- [ ] Confirm gp vs lb default for weight — gp for now; lb toggle deferred to the GM Settings strip (GM Panel build).

### Phase 1 — Data tier  *(biggest visible jump; dovetails with GM Panel; fully verifiable)*
**Data harvested into `CDATA` (v0.8.0). The *live wiring* of catalog/bestiary moves into the GM Panel turn — they need the editor/spawn UI to be useful.**
- [~] `equipment.js` → `CDATA.weapons`(45) / `armor`(7) / `shields`(2) reshaped (acAdj→`vs_ac`, dmg arrays→strings, weights/classes kept). **Staged; live `WEAPONS`/`ITEMS` swap + `calculateAC`/`dexAcBonus` adoption with the GM Panel.**
- [x] `class-data.js` — **`TURN_UNDEAD` wired live** (`CDATA.getTurnResult` replaced HD-diff `turnUndeadResult`). Saves / `getAttacksPerRound` / `getSpellSlots` / XP harvested into `CDATA` (staged, not yet wired).
- [~] `monsters.TEMPLATES`(34) + `LOOT_TABLES`(15) reshaped into `CDATA.monsters` / `CDATA.loot` (MUD-only fields dropped: aggroRadius, leashRadius, respawnTicks, sprite, vision). **Natural-attack support DONE (v0.8.2): `spawnFromTemplate` synthesises inline attacks into `WEAPONS`. Spawn function ready; UI doling/spawning lands with the GM Panel.**
- [x] Reconcile weight units (lb ↔ gp-weight) — `lbToGp`/`gpToLb`; `cdataArmorToItem` reshapes to gp-weight at adoption time. **Done — v0.8.2.**
- [ ] **GM Panel** then doles from the real catalog and spawns from the real bestiary.  ← **next build**

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
2. **Adapter** — shim sim-combatant-as-AMMOG-entity (less rewrite) vs rewrite logic against sim objects. *(Data tier resolved: reshape via `harvest.js`. Logic tier — spells/conditions — still TBD; shim is the lean default.)*
3. **Weight unit** — gp-weight vs lb default (GM Settings toggle). *(gp for now; toggle ships with the GM Panel.)*
4. **Chargen scope** — lightweight stat editing in the GM Panel vs a full chargen page (Phase 6).
5. **Keep the sim's value-adds** — bespoke weaponless trio (overbear/grapple/pummel), declaration/peek UI, the v2 HUD. These are NOT in AMMOG and should survive the harvest.

---

## Files inventory

**Shared & audited:** class-data, equipment, follower, monsters, henchman, tactical-combat,
spells, purse, saving-throws, treasure, thief-skills, chargen, combat, conditions, los.

**Not needed (skip):** server.js, db.js, zone.js, zone-manager.js, map-loader.js,
dungeon-store.js, generate-*.js, accounts.db, world.db, maps/*, dungeons/*, node_modules,
public/* (prior browser UIs — worth a glance only if salvaging UI patterns).
