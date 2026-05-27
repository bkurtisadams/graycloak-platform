# DESIGN — AMMOG → dungeon-encounter Harvest & Extraction Plan

**Source:** `C:\ammog_2` (AMMOG, Node/SQLite/WebSocket 1e MUD, ~Feb–Mar 2026)
**Target:** `dungeon-encounter` (single-file browser 1e tactical combat tool, GCC)
**Audit date:** 2026-05-27 · sim at v0.8.0

---

## Status — v0.8.5 (2026-05-27)

**HTML weapons cleanup + ammo refactor shipped.** Two threads land at once: the sim's
`WEAPONS` literal is now PHB-clean in the source (no longer relying on the catalog wire
to fix values at runtime), and the sling-bullet/sling-stone split from v0.8.4 is
collapsed back into a proper ammo model that bows and crossbows also use — opening the
door to magic arrows/bolts without further refactor.

**Sim WEAPONS literal cleanup.** Every melee entry got the `space` field per PHB and any
prior wrong fields were corrected directly in `dungeon-encounter.html`:

- `dagger.length` 1→1.25, `space:1`
- `hand_axe.length` 2→1.5, `space:1`
- `long_sword.length` 4→3.5, `space:3`
- `short_sword space:1`, `battle_axe space:4`, `halberd space:5`
- `mace.length` 4→2.5, `space:4`, vs_ac to PHB (AC2/+1, AC10/-1 etc., not the inverted sim values)
- `pike` renamed "Awl Pike", length 6→18, vs_ac to PHB awl-pike
- `spear` speed 6→7, length 4→9, vs_ac to PHB
- `halberd.vs_ac` corrected (was inverted: peaked at high AC, PHB peaks at AC5-7)
- `club space:2`, `ogre_club space:4` (sim extension)
- `sling` restored as a single weapon entry (`ranged:true, speed:7, no damage/range/vs_ac`,
  `compatible_ammo: ['bullet','stone']`)

The four remaining "discrepancies" against my PHB ground-truth (club space and spear
length/speed midpoints) are accepted as Kurt's-choice / encoding differences.

**Ammo model.** New `CDATA.ammo_types` top-level key holds the mechanical profile of each
ammo category:

- `bullet`: 1d4+1/1d6+1, range 5/10/20, PHB short-range vs_ac
- `stone`:  1d4/1d4,    range 4/8/16,  PHB short-range vs_ac
- `arrow`:  1d6/1d6    (bows define their own range/vs_ac, ammo just sets damage)
- `quarrel_light`:  1d4/1d4    (light crossbow defines range)
- `quarrel_heavy`:  1d4+1/1d6+1 (heavy crossbow defines range)

`CDATA.ammo` (inventory bundles): renamed `bolt` → `bolt_heavy` (ammoType `quarrel_heavy`),
added `bolt_light` (ammoType `quarrel_light`) and `sling_stone` (ammoType `stone`). The
`sling_bullet` bundle's `ammoType` changed from the (now-defunct) `"sling_bullet"` to `"bullet"`.

`CDATA.weapons` revert: `sling_bullet`/`sling_stone` removed; `sling` restored as a single
entry with `compatible_ammo: ["bullet","stone"]` and `default_ammo: "bullet"`. Ranged
weapons gained `compatible_ammo` arrays: bows → `["arrow"]`, light crossbow →
`["quarrel_light"]`, heavy crossbow → `["quarrel_heavy"]`.

**Per-weapon ammo slots.** Combatant model gained `ammo_loaded: { weapon_id: item_id }` —
keyed by weapon so a character with sling + bow keeps bullets loaded for the sling and
arrows for the bow without cross-contamination, and magic-ammo workflows (regular + +1
arrows for the same bow) map cleanly. When the slot is unset, the runtime falls back to
the first compatible ammo bundle in inventory.

**Runtime helpers (added just above `attackProjection`):**

- `getAmmoBundleItem(c, itemId)` — tidy inventory→record lookup with qty/ammoType.
- `getLoadedAmmoId(c, weapon)` — honors explicit slot, falls back to compatible inventory.
- `resolveEffectiveRangedWeapon(c, weapon)` — merges weapon + loaded ammo; ammo's
  damage/range/vs_ac override the weapon's; magic ammo `attack_bonus`/`damage_bonus` ride
  along on `ammo_attack_bonus`/`ammo_damage_bonus`. Flags `_missing_ammo:true` when no
  compatible ammo is present.
- `consumeAmmo(c, weapon)` — decrements loaded ammo qty by 1; called after every shot.

**Combat resolver wiring.** `attackProjection` builds the effective weapon for ranged
attacks and passes it to `computeToHit` (so sling+stone uses stone's vs_ac) and
`rangeBand` (so sling+stone uses 4/8/16 range). Magic ammo's `attack_bonus` reduces
`needed`; `damage_bonus` adds to `dmgBonus`. When `_missing_ammo` is set, projection
returns `needed:99, dmgDice:'0'` (signals "impossible") so the hover preview stays sane.

`executeAttackDecl` ranged branch now: (1) resolves the effective weapon up front; (2)
blocks with "has no ammunition for X" chat message if `_missing_ammo`; (3) range-checks
against the *effective* range (sling+stone reaches further with bullets than stones); (4)
calls `consumeAmmo` after `resolveAttack` returns. Thrown weapons (dagger, dart,
javelin) skip the ammo path — they have no `compatible_ammo`.

**Catalog wire update.** `cdataWeaponToSim` no longer fabricates `damage` /
`range_squares` for weapons that don't declare them — sling's "no inherent stats" survive
the wire. `compatible_ammo` / `default_ammo` pass through.

**Seed loadouts.** Arlanni and Aldric switched from `'sling_bullet'` to `'sling'` in
their loadouts; inventory adds the ammo bundles (`i_sling_bullets` qty 30 for both;
Arlanni also carries `i_sling_stones` qty 20 as a backup); `ammo_loaded: { sling:
'i_sling_bullets' }` set by default. `i_sling.weapon_id` updated `'sling_bullet'` →
`'sling'`. Five new ammo bundle items added to `ITEMS`: `i_sling_bullets`,
`i_sling_stones`, `i_arrows`, `i_bolts_light`, `i_bolts_heavy`.

**Verification — 56 assertions pass:** HTML literal is PHB-clean *without the wire
running* (proved by loading the WEAPONS literal in isolation); catalog wire correctly
adds compatible_ammo and doesn't fabricate damage for sling; helper unit tests cover
explicit-slot, switching, and inventory-fallback paths; effective-weapon merge produces
correct damage/range/vs_ac for sling+bullet, sling+stone, and bow+arrow; magic +1
bullets give -1 to `needed` and +1 to `dmgBonus`; ammo consumption decrements; no-ammo
flags fall through to a 99/`'0'` projection; melee path unchanged.

**Next:** v0.8.6 will fill PHB short-range vs_ac on every ranged weapon (currently most
ranged CDATA weapons have empty vs_ac) and add a settings toggle for the medium (-2) /
long (-5) range modifier. v0.8.7 will be space-too-small with three game modes
(warn / warn+penalty / prevent).

---



**PHB weapon-data audit + catalog wiring shipped (pure data slice).** Two things landed at the
data tier: the CDATA catalog now flows into the sim's runtime `WEAPONS` table at boot, and
the catalog itself is brought into PHB conformance.

The audit found the sim was using only **11 of 58** PHB weapons — `WEAPONS` carried 14
entries (3 sim-specific extras: `ogre_club`, `spider_bite`, a non-PHB `pike`), while CDATA
had 45 of the 58 PHB rows. A three-way diff (sim WEAPONS vs CDATA vs hand-encoded PHB
ground truth) surfaced 21 weapons with at least one field discrepancy and three structural
gaps. Fixes that landed:

- **Tier A (CDATA data bugs, fixed in `combat-data.js`):** battle_axe damage vs L `1d8`→`1d4`
  (axe is *meant* to be bad vs large creatures), battle_axe vs_ac AC3 `-2`→`-1` and AC4 `-1`→`+1`,
  heavy_crossbow rof `1`→`½`, short_sword weight `5lb`→`3.5lb`, halberd weight `17lb`→`17.5lb`,
  and lb-rounding for bardiche/bo_stick/broad_sword/glaive/horsemans_flail/military_fork/
  morning_star/quarterstaff/voulge.
- **Tier B (sim WEAPONS data was wrong; CDATA correct):** sim halberd had its vs_ac
  essentially inverted from PHB (peaked at AC10/+2; PHB peaks at AC5–7/+2), sim mace had
  wrong length and vs_ac, sim pike was length 6 (PHB awl pike is 18), sim dagger/hand_axe/
  long_sword rounded fractional lengths. All auto-fixed when `wireCatalogFromCDATA()` runs
  at boot — `cdataWeaponToSim` overwrites data fields with CDATA-correct values while
  preserving sim's bespoke iconography and any vs_ac the sim had but CDATA lacks.
- **Tier C (9 PHB weapons absent from CDATA, added):** `composite_long_bow`,
  `composite_short_bow`, `dart`, `javelin`, `lance_light`/`lance_medium`/`lance_heavy`
  (with `mounted_only: true` for the eventual charge bonus), `sling_bullet` and
  `sling_stone` as separate ranged weapons — the old CDATA `sling` carried bullet damage
  with stone range, which was wrong on either reading.
- **Tier D-space (structural gap closed for melee):** every melee weapon now has the
  PHB-stated `space` field on its WEAPONS entry, populated by the catalog wire from CDATA's
  `space` column. Club takes the midpoint 2 ft (PHB "1′–3′"). Foundation for the
  space-too-small adjacency warning in v0.8.5. `WEAPON_SPACE` also populated identically.

The sim's stale `sling` WEAPONS entry was removed; Arlanni's and Aldric's seed loadouts and
the `i_sling` item now reference `sling_bullet`. PHB short-range vs_ac was baked directly
into CDATA's `sling_bullet` and `sling_stone` (the only ranged entries that had carried
vs_ac in the old sim) so the split doesn't regress to all-zero values.

**Deferred to later slices:**
- **v0.8.5 — space-too-small warning** (uses the `space` field that v0.8.4 populated): chat
  warning + configurable −2 to-hit penalty when a wielder is adjacent to a wall or
  similarly cramped.
- **v0.8.5 — ranged vs_ac in computeToHit**: CDATA's ranged weapons (bows, crossbows,
  etc.) still have no `vs_ac` table; PHB gives a short-range adjustment with −2 medium /
  −5 long. Material to-hit impact, so it earns its own focused slice with tests.
- **v0.8.6+ — class proficiency system**: CDATA already carries `classes` arrays per
  weapon; the runtime check (initial proficiency count + non-prof penalty + per-N-level
  growth) is its own slice.

**PHB rows with reconstructed ground truth (paste was visually mangled):** glaive,
lance_light, lance_medium, horsemans_mace vs_ac rows; spear and trident length/speed
(PHB ranges). Flagged `_uncertain` in the audit script — worth a sanity check against
a clean PHB scan before any of these become load-bearing for downstream math.

Verified headless: `node --check` clean on both files; full **40-assertion test suite**
drives the real `App.init` under a stubbed DOM and asserts catalog growth (≥50 weapons),
new weapon presence and PHB-correct damage/range/vs_ac, the 12 specific Tier-A/B value
corrections at boot, preservation of sim icon and sim vs_ac where CDATA lacked them,
`space` field surfaced for halberd/two_h_sword/club, sling split into bullet/stone with
PHB damage/range/vs_ac, seed combatants resolve to `sling_bullet`, and the v0.8.3 GM
panel paths still work (open / select / suggestAC / close).

---



**GM Panel slice 1 shipped: the shell + combatant editor + settings strip.** A slide-in panel
(toggle `⚙ GM` in the topbar; `z-index` 95 so it works *over* the setup overlay — you can edit before
deploying), native to the tool's existing tome styling (no new design system imposed):

- **Combatant editor** — pick any combatant from a side-grouped roster, edit name / side / class /
  level-HD / HP cur·max / AC base·cur / Str / Dex / base move. **Apply** mutates the combatant, then
  `recomputeMove` + `recomputeEngagements` + `renderAll`. HP clamps to max; HP≤0 flags dead; reviving
  clears `_asleep`/`_unconscious`/`_paralyzed_until`.
- **AC suggestion** — a **Suggest** button fills the AC fields from `computeAC` (armour+Dex+shield);
  the GM can still override. Never auto-applied (consistent with the v0.8.2 decision).
- **GM Settings strip** — gp/lb weight toggle (`state.weight_unit`) and a Peek-orders toggle.

Render discipline: the panel rebuilds on open/select/apply only (never from `renderAll`, to avoid
wiping input focus); `renderAll` refreshes the roster list alone while the panel is open.

Verified headless: extract + `node --check` clean; a 23-assertion logic suite drives the **real**
`App.gm*` methods against the **real** state model under a stubbed DOM (the full `renderAll` pipeline
runs without error on apply) — covering field mutation, AC suggestion (Aggro plate+Dex15 → 2/1),
HP clamp/dead/revive, side-regroup, and the weight toggle. Diff vs v0.8.2 is one changed line (the
version) + additive blocks; all 13 `execute*` fns and the 7 v0.8.2 glue fns intact.

**Deferred to the next slices (v0.8.4+):** gear doling from the CDATA catalog (`cdataArmorToItem`/
`cdataWeaponToSim` + live encumbrance), spell memorization (`CDATA.getSpellSlots`), monster spawning
(`spawnFromTemplate`) + read-only inspect HUD, and free token-drag during setup.

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
