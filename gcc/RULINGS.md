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

- **[7.7] Measure tool — ABSTRACTION.** Distance is measured card-to-card / point-to-point by the tool, not with a physical tape; recorded v0.59.1 as a deliberate simplification.
- **[7.8] Contact is base-to-base — RULING 2026-08-30 (retires the 2026-08-18 house rule).** The 1″ melee-reach house rule is RETIRED: melee needs bases touching. `CONTACT_EPS` (0.1″) is a *tolerance* for 45° geometry and float drift, `STANDOFF` (0.05″) is the rendered seam every contact snap, charge slam and pursuit settles onto. A Setup drop within 0.4″ of an enemy glues to the seam (v0.61.5.1). The commander's own counter keeps a ½″ placement allowance for Table 10 (`INDIVIDUAL_CONTACT_EPS`) and 1:1 adjacency keeps its ½″. Scenarios saved before v0.61.5 need each engaged unit re-dropped. v0.61.5.
- **[7.8] Whole-card contact stop — ABSTRACTION** (recorded v0.59.1, softened by the figure model): a move that would overlap an enemy stops the whole card at the seam; displaced figures (wings, skirmish figures) have their own positions.
- **[7.9] Partial facing** — Right/Left/About Face on selected figures turns only those figures, at the normal cost (the rulebook's "or only some figures"). Turned defending figures in reach of an attacker decide the arc by majority; a refused flank is FRONTAL to the flanker. Turned attacking figures that face an enemy count as figures in contact. v0.61.0.
- **[7.11] Wrap-Around wings are real figures.** The added frontage figures leave the *rear rank* (highest slots first) and stand beside the enemy's flanks turned inward; the card keeps the line's frontage. Cost is unchanged (expansion + end-wheels); no wing figure may travel more than its MV; a unit without enough rear-rank figures is refused. v0.61.3, v0.61.3.5.
- **[7.11] One wrap per enemy flank depth — RULING 2026-08-29.** A single Wrap-Around wheels each wing along the enemy's flank only, so a wing is capped at the enemy's depth in bases (base depth alone — a wrapped unit's bases need not be ½″ apart). Figures that would pass the enemy's rear corners wait for a *second* Wrap-Around on a later round; a full surround [7.15] takes two. Closing the rear on the second wrap is **not yet implemented**. `wrapWingDepthCap`, v0.61.3.6, v0.61.4.4.
- **[7.11] A further wrap only adds.** Against the same enemy, existing wings stay where they stand and only *more* rear-rank figures move into flank room that is still open; with both flanks held the wrap is refused with the reason. v0.61.4.4.
- **[7.11] Wings follow the flank — RULING.** Wing figures carry an anchor (enemy, side, rank) and re-seat against that enemy's *current* flank edge whenever its card re-shapes (break to Open, casualty re-flow, frontage change); the anchor drops when the wrapper itself moves or the envelopment ends. v0.61.4.1.
- **[7.11] Surplus wings step back into the line — RULING 2026-08-29.** When the enemy loses a rank and its flank becomes shallower than a wing, the figures past its rear corner return to the line (logged) instead of stacking. v0.61.4.3.
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

## §12 Conditions

- Conditions are applied per [12.x] and summarised at Begin battle; visibility limits gate charges and fire.

## §13–§14 Monsters and Magic

- **AoE / range scaling.** Range maps 1:1 PHB inches to board inches; area of effect converts at 1″ = 10 ft and then divides by 3 for board scale.
- **[14.8] Invisibility** — a Setup/test invisibility broken in "round 0" does not linger into Round 1.
- **[14.12+] Not yet implemented** — defences, movement spells, illusions, healing, dispel, clerics vs undead, remaining items, bard.
- **Innate summons (Gate etc.)** — the activation chance is rolled first; a successful unresolved summon goes to the referee (DUE) rather than inventing a counter.

## Board lifecycle (not rules)

- **Reset** clears the board. **↩ Setup** returns a live battle to deployment keeping positions, losses, ammunition and spent magic (one Undo). **↺ Restart** (v0.61.6) restores the deployment as it stood at Begin battle (one Undo); a battle begun before the snapshot existed is restored to full strength in place.

## Open items

- Closing the rear on a second Wrap-Around (full surround) — not implemented.
- Per-figure skirmish moves are GM-side only (no NET path); body drags ignore per-figure spend.
- RAW audit: §1–§12 done; §13–§16 and the printed CRT / Tables 12–14 not yet supplied.
- Hero sheet UX still unsatisfying.
