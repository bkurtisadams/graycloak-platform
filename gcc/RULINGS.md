# BATTLESYSTEM board — rulings and abstractions

House rules and referee rulings applied by `battlesystem-board.html`, consolidated from the file header (v0.32–v0.61) and the 2026-08-29/30 sessions. Each entry names the rule it interprets, what the board does, and where in the code it lives. **Kurt (Graycloak) holds final authority on every call here; entries marked *open to veto* have not been played through yet.**

Not listed: things the board does exactly as written. In particular the [6.1] rally gate (no rally while in base-to-base contact with any enemy figure) is RAW — rulebook text supplied 2026-08-30 — not a ruling.

Status key: **RULING** — a choice between readings, or a rule the book does not make · **ABSTRACTION** — a deliberate simplification of the physical game · **RETIRED** — no longer applied.

---

## §1 Sequence

- **[1.4] Elect order** — the initiative winner chooses who moves first by clicking a Movement pill on the phase rail; no separate button. UI, not a rule change.

## §2 Units

- **[2.9]/[7.4] Skirmish contact — RULING 2026-08-29.** A skirmish unit *never* initiates base-to-base contact with anything; an ordinary move halts short of an enemy base. It attacks enemy skirmishers and individuals by missile only. A skirmisher contacted by a regular unit or mob is not a melee engagement in Enforced mode: it must Flee, the pursuer takes the [8.8] free attack, and Flee is offered in the Melee Phase itself as the first opportunity [2.9]. `skirmishContactAllowed`, v0.60.1.
- **[2.9] Skirmish figures act independently.** The friendly-rout check measures each skirmish *figure's* own position and the failures detach as their own routed skirmish body. `detachSkirmishSlots`, v0.61.3.
- **[2.10] Mob support** requires a regular *infantry* unit behind the mob (v0.59.1).
- **[2.11] Special unit types** — Elite +2 ML; Berserker +3 ML, DL 0, never Closed. Selectable on the unit editor (v0.59.1).

## §4 Morale, Discipline, Command

- **[4.6] Table 7 from contact — RULING 2026-08-29.** A unit already in base contact with the hated enemy that fails Table 7 breaks to Open / out of command but declares *no* charge — none is possible from contact [7.8] — so it takes no failed-charge penalty. v0.61.4.2.
- **[4.6] Table 7 for skirmishers — RULING 2026-08-29.** A SKIRMISH unit that fails Table 7 must close on the hated enemy and shoot: it moves straight toward the hated unit at full rate, halting short [7.4], and fires when able. No charge is declared and no failed-charge penalty follows (skirmishers cannot charge [7.14]). `u.hatedTargetId`, v0.61.4.7.
- **[4.7]/[7.6] Out of command in Closed Formation** — a regular unit found OOC at its movement start breaks to Open automatically and free (v0.59.1).
- **[4.8] Monster commanders** — a humanoid/monster commander with no character class has a CR of ⅔ its movement rate (v0.61.2).
- **[4.10] Command hierarchy audit** is advisory: Begin battle logs violations (two Army Commanders, bad links, brigade sizes) but does not block.

## §6 Rally

- **[6.1] Rally gate is RAW** ("any enemy figure") — recorded here only so nobody re-litigates it. A wing figure standing on a unit's flank blocks its rally even where the cards do not touch. `figuresInBaseContact`, v0.61.4.7.

## §7 Movement

- **[7.3] Open-formation spacing is in BOTH dimensions — verified 2026-08-30, not a ruling.** The ½″ gap separates files *and* ranks, per the rulebook's "Changing from Closed to Open Formation" diagram, which shows the two ranks drawing apart as well as the six files. A 12-figure human unit at frontage 6 goes from 4.5″×1.5″ closed to 7″×2″ open; small-based troops spread proportionally more. Skirmish uses 1″ the same way [7.4]. The card rect feeds the frontage bar, contact tests, flank depth and casualty re-flow, so the growth is consistent everywhere.
- **[7.7] Measure tool — ABSTRACTION.** Distance is measured card-to-card / point-to-point by the tool, not with a physical tape; recorded v0.59.1 as a deliberate simplification.
- **[7.8] Contact is base-to-base — RULING 2026-08-30 (retires the 2026-08-18 house rule).** The 1″ melee-reach house rule is RETIRED: melee needs bases touching. `CONTACT_EPS` (0.1″) is a *tolerance* for 45° geometry and float drift, `STANDOFF` (0.05″) is the rendered seam every contact snap, charge slam and pursuit settles onto. A Setup drop within 0.4″ of an enemy glues to the seam (v0.61.5.1). The commander's own counter keeps a ½″ placement allowance for Table 10 (`INDIVIDUAL_CONTACT_EPS`) and 1:1 adjacency keeps its ½″. Scenarios saved before v0.61.5 need each engaged unit re-dropped. v0.61.5.
- **[7.8] Close-enough contact is ½″ — RULING 2026-08-30.** A move or charge that ends within `CONTACT_GLUE` (0.5″) of an enemy settles onto the seam and IS in base contact. The band is the same half inch as the 1:1 adjacency allowance, so the sim has one "close enough to be touching" distance; the earlier 0.4″ was arbitrary (picked in v0.61.5.1 only to re-seat deployments saved under the retired 1″ rule). It applies to charges as well as plain moves — a charge is not failed because the bases finished a fifth of an inch apart. Before this, settling only happened when a drag penetrated an enemy, so a move that stopped just short left a residue below the 0.1″ contact test and the melee simply never happened. v0.61.7.1.
- **[7.8] Whole-card contact stop — ABSTRACTION** (recorded v0.59.1, softened by the figure model): a move that would overlap an enemy stops the whole card at the seam; displaced figures (wings, skirmish figures) have their own positions.
- **[7.9] Partial facing** — Right/Left/About Face on selected figures turns only those figures, at the normal cost (the rulebook's "or only some figures"). Turned defending figures in reach of an attacker decide the arc by majority; a refused flank is FRONTAL to the flanker. Turned attacking figures that face an enemy count as figures in contact. v0.61.0.
- **[7.11] Facing is irrelevant to a wrap — verified 2026-08-30, not a ruling.** The printed rule expands the battle line and wheels its ends inward; it says nothing about the facing of the wings, and its only stated exception is that wing bases need not be ½″ apart. A partial facing change therefore does not prevent a Wrap-Around: the plan is computed in the tactical frame. The board turns wing figures inward as a display and contact convention, which the rule neither requires nor forbids. v0.61.9.
- **[7.11] A wrap leaves the unit open WITHOUT spreading its bases — verified 2026-08-30, not a ruling.** The rule puts a unit that has wrapped into open formation at the end of melee and states that its bases "will not necessarily be ½″ or more apart", an explicit exception to [7.3]. So the unit is open for every rule that cares (the +1 AR, gap-fill, loss of closed-formation benefits) but its card keeps closed spacing (`u.openByWrap`). Applying the ordinary ½″ spread was widening the card after every wrap and breaking the contact the wrap had just won. The flag lapses as soon as the unit takes a formation on its own terms. v0.61.13.
- **[7.11] Wrap-Around wings are real figures.** The added frontage figures leave the *rear rank* (highest slots first) and stand beside the enemy's flanks turned inward; the card keeps the line's frontage. Cost is unchanged (expansion + end-wheels); no wing figure may travel more than its MV; a unit without enough rear-rank figures is refused. v0.61.3, v0.61.3.5.
- **[7.11] Movement is the only limit on a wrap — RULING 2026-08-30 (retires the v0.61.3.6 flank-depth cap).** The printed rule bounds a Wrap-Around by cost alone — expanding the frontage plus wheeling both ends — and by "no individual figure may move more than its full movement rate". It says nothing about the enemy's rear corners, so capping a wing at the enemy's flank depth, and requiring a second wrap for a surround, was an invention. A wing runs as deep as the unit can pay for, bounded only by the per-figure MV check and by how many rear-rank figures are available. v0.61.10.
- **[7.11] A further wrap only adds.** Against the same enemy, existing wings stay where they stand and only *more* rear-rank figures move into flank room that is still open; with both flanks held the wrap is refused with the reason. v0.61.4.4.
- **[7.11] Wings follow the enemy — RULING.** Wing figures carry an anchor (enemy, side, rank) and re-seat against that enemy's *current* flank whenever its card re-shapes **or moves** — an envelopment travels with the enveloped unit. The envelopment ends only when the two units are genuinely no longer together — either destroyed or routed, no longer enemies, or the wrapper's card has left the enemy's side — and the figures then return to their own line rather than being left in open ground. A shuffle by the wrapper (closing to restore contact) does not end it: wing offsets are stored against the card, so the wings travel with it. v0.61.4.1, corrected v0.61.11 and v0.61.12.1.
- **[7.11] Wings never stack.** Wing figures hold their own places as the enemy's card re-flows; they are re-seated against its current flank, never piled onto one another. (The v0.61.4.3 rule that returned figures past the enemy's rear corner to the line lapsed with the flank-depth cap in v0.61.10 — there is no such corner limit.)
- **[7.11] Wings do not change the attacker's arc — RULING 2026-08-29.** The arc of attack is read from the wrapping unit's card front, not from where its wings stand.
- **[7.11] Wings add to contact — RULING 2026-08-29.** Displaced wing figures facing the enemy are *additional* figures in contact (line + wings); in-place turned figures keep the refused-flank rule (they *are* the contact). The old `extraContact` bonus on the wrap record is retired. v0.61.4.5.
- **[7.11] Wings off the line.** Displaced figures never define or join the tactical front edge: presented frontage stays the line's width and missile shooters are the line. v0.61.4.2.
- **[7.11]/[7.2] Casualties come off the line first — RULING 2026-08-29.** Losses never take a displaced figure (wing, moved skirmisher) while a line figure remains, and displaced figures hold their real positions while the card re-flows. The front edge holds under losses: the card re-flows *behind* the line so engaged units stay in contact. v0.61.3.3, v0.61.4.3.
- **[7.14] Charge capability — RULED 2026-08-19** (supersedes the 2026-08-18 minimum-distance reading). "Must be able to move at least ⅔ its normal movement rate before contact" is read as *unspent capability*, not a minimum approach distance — the old gate made every enemy inside ⅔ MV permanently unchargeable. `chargeState`.
- **[7.14] Assisted break-through — ABSTRACTION.** `minimumChargeBreakThrough` estimates the minimum figures a charger must kill to break through rather than replaying the physical rule step by step.
- **[7.15] Break to Open is front-centred.** Every involuntary break to Open (morale, discipline surge, failed charge, charm/withdrawal) re-forms the card around its tactical front centre (`breakToOpen`), never from a corner. v0.61.4.6.
- **[7.15] Rout direction** heads away from the cause and toward its own lines when possible; the surrounded-rout probe treats impassable water as blocked (v0.59.1).
- **[7.4] Per-figure skirmish moves — ABSTRACTION.** Shift+drag moves one skirmish figure at that figure's own cost (`figureOverlay[slot].mv`, cleared each round); a *body* drag still budgets on `movedIn` alone. GM-side only; no multiplayer path.
- **[7.13] Forced March** — PC/NPC individuals can always Force March (v0.59.1); skirmish units may Force March without a command gate (v0.60.0).

## §8 Melee

- **[8.0] Phase-level simultaneous losses.** In a live Melee Phase every engagement is computed on pre-phase strength and casualties are queued until the phase's last engagement resolves (or the phase ends), so killed figures fight their final Melee Phase. Setup sandbox, Set Spears, hero-vs-unit and free attacks remain immediate. v0.58.3.
- **[8.1] Multi-opponent designation.** A unit in contact with two or more enemies designates which figures attack which (geometry default, Designate… override); a figure never attacks twice. v0.58.3.
- **[12.5] Daylight +1 is automatic.** The Army Roster's "+1 in daylight" on light-shunning creatures is applied in melee to roster-flagged types (orcs, goblins) whenever Conditions ▸ Night is unticked — the Night checkbox is the declaration, so daylight needs none. It appears in the itemised AR. v0.61.7.4.
- **[3.1]/[8.3] Racial combat modifiers are applied from their own table (1e MM).** Dwarves roll +1 to hit goblins, orcs and hobgoblins (AR −1), and ogres, trolls and giants deduct 4 against dwarves (AR +4); gnomes roll +1 against kobolds and goblins, and gnolls, bugbears, ogres, trolls and giants deduct 4 against gnomes. These are Army Roster AR-modifier lines, kept in `RACIAL_COMBAT` deliberately apart from Table 7 [4.6] hatred, which forces a discipline check and never touches AR — the two name some of the same enemies and must not share a lookup. Each is itemised in the melee line. Not yet applied: the elven +1 with normal bow or sword (a weapon bonus, not racial) and the hobgoblin tribal standard's +1 within 6″. v0.61.7.5.
- **[12.5] Sunlight is per the MM.** Orcs, goblins and kobolds deduct 1 to hit in full daylight; hobgoblins explicitly fight well in daylight and carry no penalty. v0.61.7.5.
- **[8.3] Multiple 20s** — AR conversion ignores repeated 20s on the attack matrix (matrices verified against the DMG by Kurt 2026-08-20).
- **[Table 10] Higher ground — RULED 2026-08-21.** Table 10 prints "Defender occupies higher ground −1", which taken literally rewards attacking uphill. Attacking a unit on higher ground is a **penalty**: sign flipped, magnitude 1; downhill attacks get no bonus. `terrainMeleeDelta`.

## §9 Heroes and Commanders

- **[9.4B] 1:1 adjacency is grid adjacency — RULING 2026-08-30 (Kurt approved).** Individual counters are ½″ bases seated in 1″ grid squares, so an orthogonal neighbour stands 0.5″ away and a diagonal neighbour 0.707″. `INDIVIDUAL_CONTACT_EPS` is 0.75″ so both count as adjacent; at 0.5″ a diagonal opponent could not be fought at all. Flip the constant back to 0.5 for orthogonal-only. v0.61.6.3. Placement itself is the Snap preference's job (¼″ puts a ½″ counter in a square), not something the board forces.
- **[9.4B]/[Table 10] 1:1 counters are never glued.** The base-to-base glue and seam settle are for army cards only. A counter is a figure the GM places: it lands where the pointer and the Snap preference put it (¼″ keeps heroes in grid squares), and contact is judged where it stands by the ½″-plus-diagonal allowance. v0.61.6.5.

- **[9.4A]/[9.4B] Two combat systems.** Hero-vs-unit uses the BATTLESYSTEM CRT (§9.4A); Hero-vs-Hero resolves as AD&D characters with AD&D combat (§9.4B) — attack routines, real damage expressions, cadence — never the CRT.
- **[9.4A] CRT die substitution** — a hero's AD&D damage expression is mapped to the nearest legal CRT die and the substitution is logged (v0.58.0).
- **[9.1] Table 11** rolls the fate of a Unit Commander or Member of Unit when the last figure is removed (v0.61.2).
- **[9.1]/[3.1] Member of Unit** — the character has no separate figure and the unit fights with the creature-weighted average AC / THAC0 / HD rounded to the least favourable (v0.61.2).
- **Saving throws** are always class/level table value + explicit modifiers; level drain shifts the sheet's saves by the table delta so item/Wisdom bonuses survive (design rule 2026-08-29, v0.61.0).

## §10 Missile fire

- **[10.1] LOS cone origin — RULED 2026-08-20.** The 45° cone originates at the unit's *front-edge centre*, not its body centre (closer to "45 degrees to either side of the figure"; stricter for close, wide targets). The arc overlay draws from the same point. `frontEdgeCenter`.
- **[10.1] Fire at chosen figures.** With pips designated on a skirmish/dispersed target, range, cones, sight and losses use those figures' real positions; a ranked block ignores the designation and losses come off the rear [7.2]. v0.61.3.
- **[10.4] Mounted crossbows** fire once and move at ½ (Table 12, v0.60.0).
- **[10.7] Skirmishers and Indirect Fire — RULING 2026-08-29.** Skirmish units may use Indirect Fire despite [10.7]'s in-command wording (they are always OOC without penalty).
- **[DMG] Cover bands — RULED 2026-08-21, open to veto.** DMG missile cover adjustments, banded by the *hidden* fraction of the target's figures with thresholds at the midpoints (12.5 / 37.5 / 62.5 / 82.5%). Interposed *units* read as COVER, not concealment (bodies stop arrows). Applied as a target AC bonus per the DMG's wording — including onto artillery's fixed AC (flagged). Indirect fire lobs over the screen and pays no interposition cover. `coverBandAC`.
- **[1.6]/[10.0]** A Hero paused in Individual Combat cannot fire at 2:1 / 5:1 / 10:1 figures (v0.60.0).

## §11 Special formations and terrain

- **[11.4] Set spears vs cavalry — RULING, open to veto.** Set spears/pikes deny the cavalry/chariot −2 AR charge bonus; the lance still strikes at charge damage.
- **[11.7] Set Spears front or ALL-ROUND.** All-round costs ⅓ MV to set plus the ½ MV about-face for the rear rank; **side files turn out with it, free (RULING 2026-08-29)**; the hedge is not movement-locked (Recover to move). The spear rules (double damage, losses first, cavalry bonus denied) apply only to a charger striking a protected arc. v0.61.3.
- **[11.9] Spell line of sight** passes through up to 6″ of woods for elves and other woodland creatures and 1″ for everyone else (v0.60.0); a mob's wild-charge discipline only triggers on an enemy it can see.
- **[PHB] Lances — RULED 2026-08-21.** Light 1d6 / 1d8 L · medium (alias "lance") 1d6+1 / 2d6 L · heavy 2d4+1 / 3d6 L.

## §15 Flying

- **[15.1] Altitude is a level, not a height.** `u.altitude` is 0 ground, 1 low (30′/1″), 2 medium (120′/4″), 3 high (240′/8″). Rising one level costs ⅓ of the figure's flying rate; descending any number of levels is free; a flyer that climbs past 8″ has left the battlefield and is removed from play, which the rule notes is a legitimate escape. v0.62.0.
- **[15.2]** A unit that takes to the air leaves closed formation automatically; closed is legal only on the ground. v0.62.0.
- **[15.3]** A ground unit attacked from the air suffers a +2 AC penalty, itemised in the melee line. A unit firing while airborne treats short range as medium and medium as long; fly spells and carpets of flying are exempt. A **winged** flyer that takes any hit dice of damage lands at once and may spend ⅓ its rate doing so even after a full move — innate and magical flight are exempt — and a flyer carrying a Wound marker cannot take flight again. v0.62.0.
- **Maneuverability Class (DMG, adopted by [15.1] for the AD&D game).** A–E turn 180/120/90/60/30° per Game Round, enforced against an airborne unit's facing changes with a per-round budget. Half speed or less turns as one class better; a mounted flyer and one carrying bombs [15.4] as one class worse. v0.62.1.
- **Climb, dive and flight rate (DMG).** An airborne unit moves at its flying rate, climbs at half of it and dives at twice; class A is exempt from the geometry. A unit that descends is diving for the round, and a diving physical attack does double damage unless its target is also diving. v0.62.1.
- **[15.3]/DMG** Missile fire from the air at long range always misses — the band shift alone does not capture this. v0.62.1.
- **Using it.** ▲ Take off / ▲ Climb and ▼ Descend / ▼ Land are situational verbs in the Movement column, shown only for a flyer and disabled with the reason in the tooltip; taking off is a climb from the ground. An airborne unit carries an L/M/H chip on its counter, and MV reads the standard ground″ / flying″ notation with the current rate emboldened. Flying, FLY MV and Maneuverability Class are on the unit editor. v0.62.2.
- **Not yet built:** the D&D size-based turn table (the alternative to MC), [15.4] bombing, the DMG 50%/75% wing-damage rules (BS [15.3]'s any-damage landing rule supersedes them for BATTLESYSTEM play), dragon breath vs moving aerial targets (+2 to saves), and any board display of altitude.

## §12 Conditions

- Conditions are applied per [12.x] and summarised at Begin battle; visibility limits gate charges and fire.

## §13–§14 Monsters and Magic

- **AoE / range scaling.** Range maps 1:1 PHB inches to board inches; area of effect converts at 1″ = 10 ft and then divides by 3 for board scale.
- **[14.8] Invisibility** — a Setup/test invisibility broken in "round 0" does not linger into Round 1.
- **[14.12+] Not yet implemented** — defences, movement spells, illusions, healing, dispel, clerics vs undead, remaining items, bard.
- **Innate summons (Gate etc.)** — the activation chance is rolled first; a successful unresolved summon goes to the referee (DUE) rather than inventing a counter.

## Board lifecycle (not rules)

- **Playing area size.** The table is resizable (Table: button beside Grid; presets and a custom WIDTHxDEPTH, 24–600″). The size lives in the scenario, so it is saved, snapshotted, published and restored on load; Reset returns to the 6′×4′ default. Published scenarios drawn at 3″ per map square need it — Battle at the Crossroads is 90″×48″. v0.61.7.

- **Reset** clears the board. **↩ Setup** returns a live battle to deployment keeping positions, losses, ammunition and spent magic (one Undo). **↺ Restart** (v0.61.6) restores the deployment as it stood at Begin battle (one Undo); a battle begun before the snapshot existed is restored to full strength in place.

## Optional rules from AD&D (not in BATTLESYSTEM)

Off by default; switched on per scenario in Conditions ▸ Optional rules and carried in the save.

- **Tribal standards [MM] — v0.61.7.6.** An orc or hobgoblin tribal standard makes units of its OWN race within 6″ fight more fiercely: −1 AR in melee and +1 on morale checks, both itemised. Presence is a scenario decision (the MM rolls for it at encounter time), so the bearer is flagged per unit. Radius ruling (Kurt 2026-08-30): the MM's 6″ is at 1″ = 10 yards, which is BATTLESYSTEM's own ground scale [2.1], so it carries over unconverted. The bearer is flagged on its unit sheet (✎ Edit ▸ Special abilities) and a selected bearer shows its 6″ radius on the same C toggle as the command radius, greyed when the rule is off. The mechanism is race-generic even though the MM cases are orcs and hobgoblins.
- **DMG missile cover bands** (see §10) are the other AD&D layer over RAW — graduated cover where the printed Table 13 has flat rows.

## Open items

- A full surround now needs no second wrap (v0.61.10), but the wings still run down the flanks rather than closing across the enemy's rear; the rear-closing geometry is not implemented.
- Per-figure skirmish moves are GM-side only (no NET path); body drags ignore per-figure spend.
- RAW audit: §1–§12 done; §13–§16 and the printed CRT / Tables 12–14 not yet supplied.
- Hero sheet UX still unsatisfying.
