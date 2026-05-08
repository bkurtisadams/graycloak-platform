# Movement Rules Reference

Travel rules for the Greyhawk Wars campaign and Earth-676 (where applicable). Mostly drawn from **World of Greyhawk Glossography (WoG)** as the campaign's authoritative source, with **AD&D 1e Dungeon Master's Guide (DMG)** as cross-reference.

This doc is the source of truth. When code and rules disagree, code is wrong.

---

## Map Scale

WoG: each major-map hex is **10 leagues = 30 miles** across (face-to-face). Travel rates given in mi/day.

DMG: rates given in mi/day, scale-agnostic. DMG suggests world maps at 20-40 mi/hex with subdivision to 5-across smaller hexes.

GCC uses 30 mi parent hexes (Darlene/WoG) subdivided into 3-mile subhexes (10 across face-to-face). One subhex face = 1 mile.

---

## Land Movement (Afoot, Mounted, Vehicular)

### WoG terrain table (PRIMARY for Greyhawk)

WoG treats road and track as terrain types alongside grasslands/forest/etc. Look up the cell, get miles/day. There is no separate "road bonus" — the road *is* the rate.

| Terrain | Afoot unenc. | Afoot enc. | Horsed | Cart/Wagon | Camel |
|---|---|---|---|---|---|
| road | 30 | 15 | 60 | 30 | 45 |
| track | 30 | 15 | 45 | 15 | 30 |
| grasslands | 30 | 15 | 45 | 15 | 45 |
| hills | 20 | 10 | 45 | — | 30 |
| forest† | 20 | 10 | 30 | — | 30 |
| barrens | 15 | 5 | 20 | — | 20 |
| mountains | 15 | 5 | 20 | — | 20 |
| desert | 20 | 10 | 45 | — | 45 |
| dust | 10 | 5 | 5 | — | 30 |
| marsh/swamp | 10 | 5 | 5 | — | — |
| jungle | 10 | 5 | — | — | — |

*Asterisk in original table.* **Roads through hills, barrens, mountain, desert, or marsh/swamp terrain are considered as tracks.** This is the "road downgrade" rule — a mountain road moves you at *track* speed, not *road* speed.

†WoG: **Heavy forest is treated as jungle for movement.**

Horsed assumes light/medium animals with light loads. **Heavily burdened animals, draft horses, and heavy war horses move at afoot-unencumbered rate** unless the horsed rate is less, in which case use horsed.

### DMG outdoor movement (cross-reference)

DMG aggregates terrain into three categories. No road column.

**Afoot, miles/day:**

| Burden | Normal | Rugged | Very Rugged |
|---|---|---|---|
| light | 30 | 20 | 10 |
| average | 20 | 10 | 5 |
| heavy | 10 | 5 | 2 |

**Mounted, miles/day:**

| Mount | Normal | Rugged | Very Rugged |
|---|---|---|---|
| light | 60 | 25 | 5 |
| medium | 40 | 20 | 5 |
| heavy | 30 | 15 | 5 |
| draft | 30 | 15 | 5 |
| cart* | 25 | 15 | — |
| wagon* | 25 | 10 | — |

*Cart/wagon: road, track, or open terrain only.*

DMG terrain definitions:

- **Normal**: open ground, scrub, typical desert, light forest, low hills, small watercourses. Vehicular: roadways through such terrain or smooth fields (steppes, plains).
- **Rugged**: rough ground, snow, forests, steep hills, large watercourses. Vehicular: roadways through such terrain or tracks/paths through normal terrain.
- **Very rugged**: broken ground, deep snow and ice, heavy forests, marshy ground, bogs, bluffs, mountains, broad watercourses.

DMG also instructs the DM to mark high mountains and large swamps as impassable to mounted/normal travel.

### Reconciling WoG and DMG for GCC

WoG numbers map almost cleanly onto DMG categories:

- WoG `road`/`track`/`grasslands` afoot = DMG `Normal` afoot (30/20/10 by burden = 30/15/10 in WoG → close)
- WoG `hills`/`forest`/`desert`/`barrens` ≈ DMG `Rugged`
- WoG `mountains`/`jungle`/`marsh`/`dust` ≈ DMG `Very Rugged`

GCC uses the **WoG terrain table directly**, since (a) the campaign is Greyhawk-canonical, (b) WoG explicitly distinguishes road vs. track vs. terrain, which matches GCC's road-feature data model, and (c) WoG accounts for camel and cart/wagon as separate cases.

### Party-size rate reduction (DMG)

> Movement rates assume a party of 1-100 creatures. **If more than 100 are in the party, reduce movement rate by 1 mile per day for each additional 100 or fraction thereof, but in no event should such adjustment slow the rate of movement of the party to below 50% of normal speed.**

**GCC implementation:** not yet implemented. Punt until a campaign actually moves a 100+ unit force (Greyhawk Wars endgame may trigger this).

---

## Forced March (DMG p.49)

Parties may push up to **double normal daily rate**, in 10% increments. Each increment of forced march incurs a rest debt:

| Total forced % | Rest debt per 10% |
|---|---|
| 10-30% | 1 hour |
| 40-60% | 2 hours |
| 70-100% | 3 hours |

Rest debt is paid by deducting that fraction from a future day's movement. Total ≥ 100% triggers mandatory full-stop rest; debt accumulates additively.

**Skipping rest after ≥100% forced march:**

- **Beasts of burden**: cumulative 10% chance per 10% increment of dropping dead.
- **Other creatures (including PCs)**: lose 1 level of ability or 1 HD per 10% increment; reaches 0 = exhausted to death.
- **Restoration**: 8 hours of additional rest per HD/level lost. (Example from DMG: a 12th-level fighter who skips 90% of rest must sleep 72 consecutive hours to recover full level; until then he functions as 3rd level.)

**GCC implementation:** not yet wired. Lives in the Lost/Forced-March module after fog of war is in place.

---

## Becoming Lost (DMG p.49)

Roll once at the start of each day's movement. Per-terrain chance, with deviation if lost.

| Terrain | Chance Lost (in 10) | Direction |
|---|---|---|
| Plain | 1 | 60° L/R |
| Scrub | 3 | 60° L/R |
| Forest | 7 | any |
| Rough | 3 | 60° L/R |
| Desert | 4 | 60° L/R |
| Hills | 2 | 60° L/R |
| Mountains | 5 | 120° L/R |
| Marsh | 6 | any |

**Side roll**: d6, 1-3 = left, 4-6 = right.

**120° magnitude roll** (mountains): d6, 1-3 = 60° magnitude, 4-6 = 120° magnitude.

**Any-direction (forest/marsh)**: d6 read clockwise from intended direction:

| d6 | Direction (relative to intended 12 o'clock) |
|---|---|
| 1 | right ahead (60° R) |
| 2 | right behind (120° R) |
| 3-4 | directly behind (180°) |
| 5 | left behind (120° L) |
| 6 | left ahead (60° L) |

(Notice: there is no result that produces correct heading. By design, "lost" means you're not going where you intended.)

### Gates that prevent the roll

The lost roll only applies if **all** of the following are true:

1. Party is **not guided** by a creature knowledgeable of the country
2. Party is **not following a well-defined course** (river, road, or the like)
3. Party is **not using a well-drawn and correct map**
4. Party is in **unmapped territory** (rule explicitly: "Procedures are only for exploration of unmapped terrain")

If any one is false, **no roll**. This is gate-not-modifier — a guide doesn't reduce the chance, it eliminates it.

### Procedure when lost

1. Determine deviation direction.
2. If the deviated path leads onto previously-mapped territory, the party recognizes the error this day. Tell them where they actually went.
3. If the deviated path is into unmapped territory, **roll again for tomorrow**. Until they are no longer lost, describe terrain *as if* they had moved in their intended direction (creating an erroneous map).
4. When they're no longer lost, they realize the error — but **they don't know where it started**. They must backtrack to the last correctly-mapped hex.

### Houserule layer (PHB ranger/druid)

Not in DMG p.49 itself, but commonly applied:

- **Druid**: never lost in their own terrain (PHB)
- **Ranger**: tracking ability per PHB (out of scope for this rule)

GCC may surface these as optional party-profile flags; not required for v1.

### GCC implementation notes

- Gates 1-3 are party-profile flags (`hasGuide`, `hasMap`, plus a route-derived `followingCourse` from `GCCPaths`/`GCCSubhexPaths`).
- Gate 4 is **subhex-grain "explored" tracking** that doesn't yet exist. This is the bridge to fog-of-war: once a subhex has been traversed and revealed, it counts as mapped. v1 may approximate this with the existing parent-hex `.explored` class until subhex traversal tracking lands.
- **Two-vector position model** (real vs. perceived) is what the rule actually says, but is a large UX change. v1 single-vector is acceptable; flag two-vector as future enhancement.

---

## River Travel

### WoG (PRIMARY for narrative speeds)

Direct quote from rules_ref:

> Rivers can be swam if afoot or horsed. If carrying goods or armor, it will be necessary to build floats to cross, and this will take approximately half a day. **Fords allow crossing at no penalty, as do bridges and barges.**
>
> Movement up or down river in barges, boats, ships, or on rafts must be determined by the DM. As a guideline use:
>
> - Fast speed afoot on a road for **oared movement upstream** (= 30 mi/day)
> - Half that for **poled movement (raft or barge)** upstream (= 15 mi/day)
> - Halve again if the **current is very strong** (= 15 oared / 7-8 poled upstream)
> - **Double rates for downstream** movement (= 60 oared, 30 poled)
> - **Treble for sailed/oared downstream** movement (= 90 mi/day)

Note the "Watch out for rapids, cataracts and falls when moving downstream!" caveat.

### DMG (PRIMARY for vessel-by-vessel rates)

DMG gives an explicit per-vessel-type table.

**Movement Afloat, Oared or Sculled (mi/day):**

| Vessel | Lake | Marsh | River* | Sea | Stream |
|---|---|---|---|---|---|
| raft | 15 | 5 | 15 | — | 10 |
| boat, small | 30 | 15 | 35 | — | 25 |
| barge | 20 | 5 | 20 | — | — |
| galley, small | 40 | 5 | 40 | 30 | — |
| galley, large | 30 | — | 30 | 30 | — |
| merchant, small | 10 | — | 15 | 20 | — |
| merchant, large | 10 | — | 10 | 15 | — |
| warship | 10 | — | 10 | 20 | — |

**Movement Afloat, Sailed (mi/day):**

| Vessel | Lake | Marsh | River* | Sea | Stream |
|---|---|---|---|---|---|
| raft | 30 | 10 | 30 | — | 15 |
| boat, small | 80 | 20 | 60 | — | 40 |
| barge | 50 | 10 | 40 | — | — |
| galley, small | 70-80 | — | 60 | 50 | — |
| galley, large | 50-60 | — | 50 | 50 | — |
| merchant, small | 50-60 | — | 50 | 50 | — |
| merchant, large | 25-35 | — | 35 | 35 | — |
| warship | 40-50 | — | 40 | 50 | — |

*Asterisk: see current effect below.*

### DMG current formula

The single most useful piece of cross-reference. Quoted verbatim:

> For current effect, **subtract its speed times eight (C × 8) from movement when moving upriver, adding this same factor to movement for downriver traffic** unless navigational hazards disallow — in which case adjust to a multiplier of two or four times current accordingly.

So if a river has current `C` (in mph): up-river rate = base − 8C, down-river rate = base + 8C. Hazards (rapids etc.) bump this to ×2C or ×4C.

### Reconciling WoG and DMG

The two sources mostly agree on direction:

- WoG: oared upstream 30, downstream 60 (= +30 by doubling)
- DMG small boat oared: river 35 base, with C=1 (typical current) → upstream 35-8=27, downstream 35+8=43 (= +16). Less swing than WoG.
- WoG: sailed downstream 90 (= triple base)
- DMG small boat sailed: river 60 base, C=1 → downstream 68 (= +13%). Much less swing than WoG.

**WoG produces more dramatic up/down differentials. DMG produces gentler ones with more vessel-type granularity.**

### GCC reconciliation

Use **DMG vessel-type tables** as the base rate (per-vessel granularity is what the voyage planner already wants), and **DMG current formula** for direction effect. Defer to WoG only where DMG is silent or conflicting.

`current` lives on the river chain record (`overrideRivers[name].current`, integer 1/2/3 = gentle/normal/strong).

**GCC's working interpretation**: treat the `current` value (1, 2, or 3) as the per-day modifier directly, multiplied by 8:

- `current = 1` (gentle): ±8 mi/day
- `current = 2` (normal river): ±16 mi/day
- `current = 3` (strong/great river / snowmelt): ±24 mi/day

This matches what the planner has been showing since the river-direction code was first introduced. It's a houserule layer on DMG's literal `C×8` mph-times-eight formula — closer to WoG's narrative speeds (which approach +30 to +60 mi/day on big rivers) without going all the way there. Current=3 with hazards (rapids, falls) may multiply further per DMG (×2C or ×4C); not yet implemented.

The existing `edgeRiverCurrentMph` helper returns the value to multiply by 8 (the conversion `current → mph-equivalent` is identity, retained for future flexibility). Voyage planner formula:

    dailyMiles = baseMpd + (mph × 8)

where `mph` is signed: positive downstream, negative upstream, zero crossing.

### Crossing rivers (existing GCC code, unchanged)

Already implemented in `GCCPaths.edgeRiverCost`:

- Bridge / ford / ferry on the edge: free (DMG/WoG agree)
- Subhex road crossing the river: free (GCC houserule, well-justified)
- Otherwise: cost in days = TIER_COST[tier][burden]
  - stream: 0/0
  - river: 0 light / 0.5 encumbered
  - great_river: 0.5 light / 1.0 encumbered

These are GCC-authored numbers, not DMG. Leave as-is unless playtesting proves them wrong.

### Following rivers (NEW WORK — voyage only)

**Land travel along a river: no bonus, no penalty.** A walking/mounted party uses the underlying terrain rate regardless of whether their path runs alongside a river. Roads alongside rivers (towpaths, river roads) confer their road bonus normally — that's a road consumer, not a river consumer. River-follow logic is **voyage-only**.

Logic to implement:

- New helper `GCCPaths.edgeRiverDirection(colA, rowA, colB, rowB) → null | { tier, current, direction: 'with' | 'against' | 'cross' }`
  - Returns null on edges that don't lie along a river segment
  - For along-river edges, examines the segment's `entryEdge`/`exitEdge` against the connecting edge to determine direction relative to current
- Voyage planner consumer in `gcc-voyage.js`: when a vessel leg crosses a river edge in 'with' direction → base + C×8; in 'against' → base − C×8; 'cross' or null → base unchanged.
- Crossing penalty (`edgeRiverCost`) remains the only river effect on land parties. Unchanged.

### Lake travel

WoG gives lake guidelines:

> Use road movement as a base rate for **barges (afoot, unencumbered)** and **rafts (afoot, encumbered)**. Merchant craft with sails move at road speed for carts/wagons. Sailing warships move at road speed for horses. Galleys move at the same speed, but they can move at 10% [more?] for one hour.

So WoG lake speeds are:

- Barge: 30 mi/day
- Raft: 15 mi/day
- Merchant w/ sail: 30 mi/day (= cart/wagon road speed)
- Sailing warship: 60 mi/day (= horsed road speed)
- Galleys: same, with sprint capability

DMG gives the per-vessel lake column directly. Use **DMG numbers** for consistency with river travel.

### Sea/ocean travel

WoG: "Ships only are allowed normal movement, using lake rates."

DMG sea column gives explicit numbers. Use **DMG sea column**.

DMG mentions current and prevailing winds as ±10-30% modifiers; these are out of scope for the planner unless the encounter table or weather system surfaces them.

---

## Movement Aerial (Reference Only)

> For long-distance aerial travel, **every 3" of speed equals one mile per hour**. A broom of flying with speed 30" flies at 10 mph, ~100 mi/day (assuming 10 hours of semi-continuous travel during daylight).

GCC voyage code currently has no aerial mode. Out of scope.

---

## Encounter Distance and Time-of-Day Checks

DMG p.47-48. Captured here for reference; consumer is `gcc-encounters.js` (which already implements most of this).

**Time slots per terrain:**

| Terrain | Morn | Noon | Eve | Night | Mid | Pre-Dawn |
|---|---|---|---|---|---|---|
| Plain | × | – | × | – | × | – |
| Scrub | × | – | × | × | – | × |
| Forest | × | × | × | × | × | × |
| Desert | × | – | – | × | – | × |
| Hills | – | × | – | × | – | × |
| Mountains | × | – | – | × | – | – |
| Marsh | × | × | × | × | × | × |

× = always check; – = check only if party > 100 creatures.

**Encounter distance**: 6d4 (range 6"-24"). Modified by surprise (subtract surprise factor) and by terrain:

- Scrub: −1 per die on each 3 or 4
- Forest: −1 per die on every result (00 possible)
- Marsh: −1 per die on each 2, 3, or 4

Plain/desert/hills/mountains do not modify distance unless one of the three modifiers applies in addition.

If final encounter distance ≤ 1", confrontation occurs.

---

## Sources

- **rules_ref** (uploaded 2026-05-02): WoG Glossography movement section + DMG Section "The Adventure" (Land/Aerial/Waterborne) + Outdoor Movement tables + River Travel tables
- AD&D 1e DMG (Gygax, 1979) — referenced sections noted inline
- WoG Glossography (Gygax, 1980) — referenced sections noted inline

---

## Implementation Status

| Rule | Status | Module |
|---|---|---|
| WoG terrain table (afoot/mounted/cart) | partial — multiplier-based, not table-driven | `greyhawk-map.html` `travelMilesPerDay` + `gcc-paths.js` `edgeRoadBonus` |
| Road/track downgrade in hard terrain | yes | `gcc-paths.js` `edgeRoadBonus` |
| Heavy forest = jungle | not implemented | (terrain layer) |
| Camel mount | not implemented | — |
| Party size > 100 reduction | not implemented | — |
| Forced march | not implemented | — |
| Becoming lost | not implemented | (lost engine TBD) |
| River crossing cost (tier × burden) | yes | `gcc-paths.js` `edgeRiverCost` |
| River crossing free at bridge/ford/ferry | yes | `gcc-paths.js` `edgeRiverCost` + `edgeCrossingInfo` |
| River crossing free at subhex road | yes (houserule) | `gcc-paths.js` `edgeRiverCost` |
| **River following — direction-aware (voyage only)** | **NOT implemented** | (new `edgeRiverDirection`, consumed by `gcc-voyage.js`) |
| Vessel-type lake/sea/river base rates | partial — only base/wind | `gcc-voyage.js` |
| **Current effect on river travel (C×8)** | **NOT implemented** | `gcc-voyage.js` |
| Wind direction/force for sails | partial — speed only, no direction | `gcc-voyage.js` `calculateSailingSpeed` |
| Encounter distance | yes | `gcc-encounters.js` |
| Time-of-day encounter checks | yes | `gcc-encounters.js` |
