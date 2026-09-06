# Classic Traveller rules audit — Facsimile Edition vs `@graycloak/classic-traveller-rules`

Source: Classic Traveller Facsimile Edition PDF (1981 Books 1–3 reprint, 161 pp; scanned pages OCR'd, table pages checked against the page image). The facsimile has the checkmarked errata already inserted into the text; all comparisons below are against the corrected tables. Page references are book pages within each book.

Package audited: `@graycloak/classic-traveller-rules` v0.13.1. Corrections shipped as v0.14.0; client re-pinned as Graycloak Traveller v0.17.1.

Status key: **FIXED** shipped in v0.14.0 · **RULED** Graycloak ruling applied · **OPEN** needs a ruling · **MISSING** not implemented (not in the README's own list) · **CLEAN** verified.

---

## 1. Verified clean

| Area | Book | Result |
|---|---|---|
| Prior Service table (enlist/survive/commission/promote/reenlist, DMs, draft, ranks) | B1 p.14 | CLEAN |
| Acquired Skills tables ×4, all six services; rank/service automatic skills | B1 p.15 | CLEAN |
| Mustering Out benefits and cash tables; roll allowance; rank 5–6 DM; ≤3 cash rolls | B1 pp.11, 14 | CLEAN |
| Aging table (34–49 / 50–65 / 66+ bands); aging start at 34 | B1 p.12 | CLEAN |
| Skill eligibility (2 first term, 1 after, +1 commission, +1 promotion, Scouts 2/term); draftee first-term commission bar; reenlist 12 mandatory; 7-term cap; retire after 5; survival-as-injury option | B1 pp.10–11 | CLEAN |
| Retirement pay 4000/6000/8000/10000 +2000 | B1 p.12 | CLEAN |
| Passenger and Cargo tables incl. destination DMs and zone rules | B2 p.11 | CLEAN |
| Fares, Cr1000/ton freight, life support Cr2000/stateroom (crew included) and Cr100/low berth | B2 pp.4, 7–9 | CLEAN |
| Fuel Cr500/Cr100; starport fuel availability A/B refined, C/D unrefined, E/X none; Scout-base free fuel | B2 p.6, B3 p.7 | CLEAN |
| Berthing Cr100 for six days then Cr100/day | B2 p.8 | CLEAN |
| Trade and Speculation table: 36 goods, purchase/resale DMs, quantities | B2 p.47 | CLEAN |
| Actual Value table; pop 9+/5− first-digit DM; one lot per week; 1% partial fee; broker ≤ +4 at 5%/DM; skill DM from Bribery or Admin, one person | B2 pp.46, 48 | CLEAN |
| Trade classifications (Ag, Na, In, Ni, Ri, Po) | B3 p.16 | CLEAN |
| Type S Scout/Courier specification and MCr29.43 | B2 p.19 + errata | CLEAN |
| Surprise (1D each, 3+ margin); morale (25% casualties, 7+ stand) | B1 pp.30, 36 | CLEAN |
| Combat round sequence: movement, then all attacks, wounds inflicted at end of round, then morale | B1 p.30 step 2 | CLEAN (deferred wounds shipped v0.35.0; the round resolver previously applied party wounds mid-round) |
| Untrained −5 attack / +3 defence (errata); wound status (1 zero unconscious, 3 zero dead); end-of-combat recovery halfway rule (errata) | B1 pp.34, 36 + errata | CLEAN |
| Referee skill-check helper vs Electronics errata paragraph | B1 p.18 errata | CLEAN |
| Weapons Table required/advantageous levels and DMs (all 18 weapons) | B1 p.45 | CLEAN (except Hands characteristic and Cutlass weakened DM, below) |

## 2. Bugs

### 2.1 Patron availability inverted — **FIXED**
B3 p.25: "a result of 5 or 6 on one die indicates a likely patron has been found." The package returned *no* patron on 5–6. Test at `patrons-skill-checks.test.js:22` and the client string in `world/situation-events.js` encoded the inversion. Fixed in `patrons.js` (`PATRON_AVAILABILITY_FOUND_ROLLS`), tests, and client text.

### 2.2 Reaction table natural 2/12 rule — **FIXED**
B3 p.27: throws of exactly 2 and 12 are not subject to DMs; modified results below 3 become 3. Package applied DMs to everything and clamped to 2. Fixed via `modifiedReactionTotal()`; standard DMs (+1 for 5+ terms in army/navy/marines/scouts, −1 for pop 9+) exposed as `REACTION_DMS` — the host still has to decide when they apply.

### 2.3 Personal weapon target rows — **FIXED**
Recomputed every `targets[armor][range]` cell as 8 − armorDM − rangeDM from the corrected B1 pp.46–47 matrices. Divergences found in v0.13.1:

| Weapon | Cell(s) | Package | Book |
|---|---|---|---|
| Laser Carbine, Laser Rifle | vs Reflec, all ranges | armor DM +2/+3 (treated as Nothing) | **−8** |
| Body Pistol | vs Reflec | 0 | **−4** |
| Body Pistol | wound | 3D | **2D** (errata) |
| Hands | vs Jack / Mesh / Reflec | +1/+1/+1 | **−1 / −4 / 0** |
| Hands | characteristic | DEX | **STR** (melee table) |
| Dagger | Short range | +2 | **−1** |
| Carbine | vs Ablat | +1 (uncorrected) | **−1** (errata) |
| Rifle | vs Cloth / vs Combat | −2 / −4 (uncorrected) | **−3 / −5** (errata) |
| Rifle | vs Reflec, Medium–Very Long | inconsistent with own row | +2 |
| Submachinegun | Long range | −6 (uncorrected) | **−3** (errata) |
| Automatic Pistol | Mesh/Cloth/Reflec/Ablat/Combat at Medium & Long | inconsistent with own row | per matrix |
| Revolver | vs Reflec at Long | inconsistent with own row | per matrix |
| Cutlass | weakened blow DM | −2 | **−4** |

Fix: the module now stores `WEAPONS_MATRIX` and `RANGE_MATRIX` verbatim and derives targets, so future checks are against the printed matrix, not a derived row. A test asserts every cell.

### 2.6 Escape thrown at 7+ instead of 9+ — **FIXED (v0.39.0)**
B1 p.32: a party without surprise escapes on **9+**, with a DM for the range escaped from (−1 close/short, +1 medium, +2 long, +3 very long). The encounter resolver used 7+ with the correct DMs, so escapes succeeded far more often than the book allows. Now `ESCAPE_TARGET` and `ESCAPE_RANGE_DMS`.

### 2.7 Evading defender still parried — **FIXED (v0.39.0)**
B1 p.33: an evading combatant "may not use his weapon to parry or block". The package applied the evasion DM and the parry DM independently, so an evading defender with blade skill received both. Parry is now suppressed while `evading`.

### 2.4 Evasion DM flat −1 — **FIXED**
B1 p.32: −1 at close/short, −2 at medium, −4 at long/very long. Now `evasionDefenseDM(range)`.

### 2.5 Wound dice applied to zeroed characteristics — **FIXED**
B1 p.33: once a characteristic is at zero, further points must go to non-zero characteristics. Package clamped and discarded. Now redirects the die to the next non-zero characteristic.

## 3. Rulings

| Item | Book | Ruling | Status |
|---|---|---|---|
| Gambling DM on cash table (text says +1 if Gambling-1+; sidebar says "+ level") | B1 p.11 | Flat +1 | RULED — already implemented |
| Trade good 66 Vacc Suits (table: tons; p.48 text: individual) | B2 pp.47–48 | 11–46 and 61–66 in tons; 51–56 individual | RULED — already implemented |
| Power-plant fuel consumption | B2 p.15 | 10×Pn covers four weeks of routine operation and maneuver; each jump consumes the two-week share (jump week + system week) | RULED — FIXED (`STANDARD_TRIP_DAYS = 14`; Type S Jump-1 = 20t, Jump-2 = 30t). Note the client advances 7 days per jump; the in-system week's burn is charged at jump time. |
| Broker fee owed if seller declines to sell | B2 p.48 | RAW | RULED — FIXED (`payDeclinedBrokerFee`); **client does not yet call it** when a quote is declined |
| Steward requirement | B2 p.16 | RAW: one steward (Steward-0+) per eight high passengers | RULED — FIXED (`HIGH_PASSENGERS_PER_STEWARD`) |
| Definition of "military experience" for the surprise DM | B1 p.31 | The table gives +1 for military experience without defining it. Graycloak reads it as service in the Navy, Army, Marines or Scouts, matching the branches the Book 3 reaction DM names (that DM additionally requires five terms; the surprise table states no term count, so none is imposed) | RULED — Graycloak policy |
| Combat round duration and the campaign clock | B1 p.30 | A combat round is 15 seconds. `secondsOfDay` existed on the campaign document and was validated but never advanced by anything, so sub-day time was unmodelled. `advanceCampaignSeconds` now rolls seconds into days and years, and each resolved round advances the clock | RULED — RAW, FIXED in v0.40.0 |
| Range band scale and the square workspace | B1 p.32 | RAW: a range band is 25 m; close and short share band 0; medium 1–2 bands, long 3–10, very long 11–20; beyond 20 bands is out of range. The 32×20 square workspace maps squares to bands on its own scale (close 0–1, short 2–4, medium 5–8, long 9–14, very long 15+), which does not correspond to the RAW band widths. The book sanctions expanding the line grid to a square or hexagonal grid, so the grid itself is RAW-permitted; the square-to-band mapping is a Graycloak policy call | RULED — Graycloak policy, documented |
| Actual Value results outside printed 2–15 | B2 p.46 | Package clamps to nearest endpoint (book silent) | OPEN — existing engine policy, flagged only |
| Allocation of subsequent wound dice to characteristics | B1 p.33 | Book says each die goes to one characteristic but not who chooses; package round-robins STR/DEX/END | OPEN |
| Middle passage is standby (sold only when high is unfilled; bumpable) | B2 p.4 | Package books any class freely | OPEN |
| NPC weapon expertise 0 avoids the −5 untrained penalty | B1 p.36 | Package treats a missing skill key as untrained; host must supply `{Weapon: 0}` for NPCs | OPEN (host concern) |
| Can the Type S sole crewman double as steward? | B2 p.16 ("some ships will have more than one person performing the same function") | Package requires a `steward` crew assignment | OPEN |

### 2.8 Endurance, blows and swings not modelled — **FIXED (v0.48.0)**
B1 p.36: blows and swings are surprise, combat, weakened or special. Combat blows are limited to endurance as it stands at the start of the encounter (prior wounds reduce it, wounds taken during the fight do not); once spent, further blows are weakened and take the weapon's negative DM; a character may elect a weakened blow to conserve the allowance; surprise and special blows cost nothing; gun combat is unaffected; half an hour's rest restores the allowance. The package carried a `fatigueDM` on every melee weapon and a `blows` counter and read neither, so a bar fight never tired anyone. Now `classifyBlow()`, `blowsRemaining()`, and `blowAllowance` / `blowsUsed` on each combatant.

### 2.9 Long guns could not parry — **FIXED (v0.48.0)**
B1 p.36: a long gun — rifle or carbine, not a pistol — may parry, treated as a cudgel. The package allowed parry only for weapons flagged `parry`, so a rifleman in a melee had no defence. `parryExpertise()` now returns club expertise for a long gun, blade or brawling expertise for those weapons, and zero for a pistol.

## 4. Missing rules (not in the README's "not implemented" list)

**Book 2**
- Cargo-before-passengers ordering (p.8): passengers present themselves only after cargo is accepted for an announced destination; passage sold by destination, not jump distance.
- Low passage revival throw 5+ (medic-2+ +1; END 6− −1); low lottery (p.5).
- Hijacking 18+ on 3D; anti-hijack program 5− (p.5).
- Skipping / repossession 12+ with distance DM (p.6).
- Drive failure 13+ weekly and misjump 13+ per jump with DMs (p.6, errata "+1 per month"); misjump displacement procedure.
- Starship purchase and mortgage: 20% down, 1/240 monthly for 480 months (p.7); subsidized merchants.
- Working passage (three-jump limit), crew salary schedule (p.11), chief officer +10%.
- Shuttle costs Cr10/ton, Cr20–120/passenger (p.9); private mail 9+ is implemented, Cr20–120 honorarium is.
- Middle passage standby/bump mechanic (p.4).
- Charter of non-starships Cr1/ton/hour (p.9).

**Book 3**
- Encounter range table and terrain DMs (B1 p.31) — **the tables ship in v0.19.0** (`TERRAIN_DMS`, `ENCOUNTER_RANGE_TABLE`, `rollEncounterRange`); the client does not yet throw for the initial range, so the setup dialog still asks the referee for a starting band.
- Surprise DMs (B1 p.31) — implemented in v0.44.0. `surpriseConditionsForSide()` derives leader skill, tactical skill, military experience, eight-or-more adventurers and ten-or-more animals from the combatants; the setup dialog asks for in-a-vehicle, battle dress and pouncer animals. The total is a side DM, not the best individual one. **Battle dress is not in the Book 1 armour list**, so it stays a referee flag rather than an armour type.
- Running as two bands and as a combat blow, prohibiting attack that round (B1 pp.32–33); the 20-band escape threshold.
- Seriously wounded as a state distinct from unconscious (B1 p.34): two characteristics at zero recovers after three hours at the wounded level and needs a facility with medical-3; one at zero recovers after ten minutes at half, needing a kit and medical-1. The package collapses both into `unconscious`.
- NPC parties with surprise that are outnumbered avoid on 7+, no DMs (B1 p.31).
- Water / Desert / Vacuum / Asteroid / Ice-capped classifications (p.16).
- Random person encounters (p.26), legal encounters, animal encounters (pp.28–35).
- Reaction DMs applied automatically for military terms and population (data now exposed).

**Book 1**
- Weight and encumbrance (p.36): normal load equal to strength in kg; double load at STR/DEX/END −1; triple load for military units at −2; the world-size gravity adjustment. Nothing is implemented, and no equipment carries weight yet.
- Morale DMs (p.36): +1 military unit, +1 leader present, +1 leader has tactical skill, −2 leader killed for at least two rounds, −2 casualties above 50%. `resolvePersonalMorale` accepts a DM but nothing computes these.

**Book 1 errata**
- Maximum skills ≤ INT + EDU (level-0 excluded).
- Cover/concealment (−4 / −1), darkness (−9 / −6) and folding stock −1 — implemented and, from encounter schema 8, held as state rather than per-attack ticks: lighting on the encounter, cover on each combatant (it protects them against every attacker), the folding stock on the firer. `encounterSituationDMs()` derives the DM for each attacker–target pair and the resolver applies it to every throw. Zero-G control throw, reloading rounds and the polearm short-range rule remain unimplemented.
- Separate wound tracking per combat; first-blood applies per combat.

## 5. The Book 2 port call as written (pp.4–11)

1. Arrive at jump point; transit to world (≈5 h at 1G from 100 diameters).
2. Berth (Cr100, six days).
3. Deliver: unload freight, disembark passengers; collect Cr1000/ton and fares.
4. Refuel per starport class (refined / unrefined / none; gas giant skim if streamlined).
5. Cargo: for each reachable destination, roll major/minor/incidental; accept lots. This *announces the destination*.
6. Passengers: roll high/middle/low for the announced destination; middle is standby.
7. Speculative trade: one lot roll for the week; buy if hold and capital allow.
8. Patron search if the band spends the week on it (5–6 finds one; reaction 7+ suitable).
9. Life support Cr2000 per occupied stateroom per two-week trip, Cr100 per low berth.
10. Weekly drive-failure throw; depart; misjump throw; one week in jump.

The client currently exposes steps 2–8 as peer tabs with no sequence. Step 5 → 6 ordering and step 9 are the two places where the current UI most lets a player resolve things the book forbids.

## 6. Not audited

World generation and UWP decoding (B3 pp.6–13) against `world-profile.js`; subsector hex-distance math; ship document migrations; Free Trader and other standard designs (only Type S exists in the package); Book 2 starship combat, computers, experience, drugs; Book 3 equipment, animal encounters, psionics (none implemented).
