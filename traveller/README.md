# Graycloak Traveller

## v0.48.0 brawls that tire, and a history you can read

**Endurance, blows and swings.** Book 1 p.36 limits combat blows to endurance as it stands when the encounter opens; once that allowance is spent every further blow is weakened and takes the weapon's negative DM. The package had carried a `fatigueDM` on every melee weapon and a `blows` counter since the beginning and read neither, so a bar fight ran for ever with nobody tiring.

Now `classifyBlow()` sorts each attack into the book's four classes. Combat blows spend the allowance. Weakened blows take the DM and cost nothing, and may be chosen deliberately to conserve it. Surprise blows in the surprise round and special blows against a helpless opponent are free. Gun combat is unaffected — a rifleman with endurance 2 shoots as well as one with 12. Half an hour's rest restores the allowance, which for the client is the end of the fight. A character who arrives already wounded brings a smaller allowance, because the wound reduced endurance first; wounds taken during the fight do not shrink it.

The tracker shows `BLOWS 5/7` for anyone with a melee weapon in hand, and nothing for anyone shooting.

**Long guns can parry.** p.36 lets a rifle or carbine parry as a cudgel — not a pistol. The package allowed parry only for weapons flagged `parry`, so a rifleman in a melee had no defence at all. `parryExpertise()` now returns club expertise for a long gun, the weapon's own for a blade or brawling weapon, and nothing for a pistol.

**The encounter record is structured.** It was the last ASCII `box()` record in the combat scene, and it sat in a 250px window that showed about four lines of a long fight. It is now `ENCOUNTER HISTORY`: newest round first, each line tagged with its kind, as tall as it needs to be inside a rail that already scrolls.

**Also recorded in the audit as still missing:** Book 1 p.36 weight and encumbrance, and the p.36 morale DMs, which `resolvePersonalMorale` accepts but nothing computes.

Rules package v0.21.0. Encounter schema 10 adds the allowance to each combatant; v9 documents migrate with their current endurance.

## v0.47.0 the rail is the list

A twenty-body fight needs twenty rows, so everything in the rail that was not a row had to justify itself. Three blocks could not.

**The target list is gone.** Which enemies exist and where they are is what the map is for; the red ring says which one is targeted.

**The DM panel is gone.** `HOSTILE → HAWKEYE / MEDIUM / 11+ / 3D` restated the arrow already drawn on the map, and the throw it quoted is quoted again — per target, before you commit — inside the right-click `ATTACK ▸` cascade. That is where the decision is made, so that is where the number belongs.

**The global verb row is gone.** Its buttons acted on "the selected combatant", which is the same thing as "this row"; they now sit inside the row that owns them, alongside that combatant's characteristics and sheet lines. The map's cascade does the same job at the token.

What remains is the tracker, its heading, and the resolve controls. Rows are 22px collapsed, so nine combatants occupy 374px of a 662px rail and twenty still fit without scrolling.

Encounter schema unchanged at 9. No rules-package changes.

## v0.46.0 one combatant, one row

The rail said everything twice: a permanent panel at the top described the selected combatant, and the tracker below listed the same combatant again. Now each combatant is a single row that opens.

Collapsed, a row is name, faction marker and status — or its declared orders while the fight is on. Opening it shows that combatant's characteristics and Book 1 sheet lines beneath, and selects them at the same time, so inspecting and choosing are one gesture rather than two. Rows remember whether they were open across re-renders, and several can be open at once, which was the original point of wanting multiple sheets on screen.

**The preferred pistol and blade lines only appear for the weapon actually in hand.** A combatant here carries one weapon, so listing a preferred pistol *and* blade advertised guns nobody had — an unarmed thug read `PISTOL BODY PISTOL-0 / BLADE DAGGER-0`, which is the first entry of each table at skill zero rather than anything he owns. The line is now labelled `PISTOL`, `BLADE` or `WEAPON` according to what the combatant is holding.

**START COMBAT appeared twice** — once in the action row and once beside the tracker. It now lives only with the tracker, in both of the states where it makes sense: before a fight exists, and after one has ended.

Encounter schema unchanged at 9. No rules-package changes.

## v0.45.0 selection you can see, status you can change

**The party token looked permanently selected** because `.encounter-token-pc.selected` restyled the token with a heavy cream stroke, and with one PC that class was always on. The token restyling is gone on both sides; the yellow ring added in v0.43.0 is now the only selection mark, in a stronger gold so it reads against the token.

**A downed enemy could not be brought back.** Referee conditions are annotations — the log line even says so — and never touch Book 1 wound status, so there was no way to move a combatant out of `unconscious`. `setCombatantStatus()` is that override, offered as `STATUS ▸` on the token menu. Restoring someone to active also lifts any zeroed characteristic to 1, because status is recomputed from those values and the change would otherwise be undone by the next wound.

**Starting and ending a fight are explicit.** `END COMBAT` sits beside `RESOLVE ROUND` and resolves the encounter as victory, defeat, or — with both sides still standing — avoided; once it is over, the same slot offers `START COMBAT`.

**The selected panel reads like the Book 1 character sheet:** primary skill, secondary skill, the carried weapon with its skill level and any cover or folding stock, preferred pistol and preferred blade. The tracker rows always state faction and status, with declared orders replacing the status only while a combatant is still active.

Encounter schema unchanged at 9. No rules-package changes.

## v0.44.0 surprise DMs, totalled per side

Book 1 p.31 gives eight surprise DMs. Three were being applied — leader skill, tactical skill and military service — and then only as the best single combatant's value, when the book gives the DM to the *party*. `surpriseConditionsForSide()` now derives five of the eight from the encounter itself: leader skill, tactical skill, military experience, the −1 for eight or more adventurers, and the −1 for ten or more animals. The other three describe circumstances a document cannot know, so the setup dialog asks: in a vehicle −1 per side, battle dress +2 per side, and pouncer animals +1 for the opposition.

`resolvePersonalSurprise` takes an explicit side DM when the caller has totalled one and falls back to the old best-individual reading otherwise, so nothing that called it before changes behaviour.

The round tracker shows the throw rather than only its outcome: `SURPRISE PARTY 4−1=3 / OPPOSITION 2+2=4 // NEITHER`.

**Two things recorded in the audit rather than guessed at.** The book gives +1 for "military experience" without defining it; Graycloak reads that as service in the Navy, Army, Marines or Scouts, noting that the Book 3 reaction DM names the same branches but adds a five-term requirement the surprise table does not state. And battle dress is not in the Book 1 armour list at all, so it stays a referee flag rather than becoming an eighth armour type.

Rules package v0.20.0. Encounter schema 9 records each side's conditions and flags military service on each combatant; v8 documents migrate with no conditions set.

## v0.43.0 selection and targeting on the map

**Each condition moved to where it belongs.** Lighting describes the scene, so its selector sits on the map toolbar above the map it describes. Cover belongs to a token, so it is set from that token's right-click menu; so is the folding stock. The rail's condition controls are gone — the selected panel now *reports* what a combatant carries (`LASER RIFLE / SKILL-1 / JACK / COVER −4 / ACTIVE`) rather than offering switches for it.

**Rings, not inference.** The combatant taking orders wears a yellow ring; a targeted combatant wears a pulsing red one. Both are drawn beneath the token art so the glyph stays legible.

**`T` targets the token under the pointer.** `Shift+T` adds or removes a token from the marked set instead of replacing it, so several enemies can carry the red ring at once. Marks clear when the round resolves.

**The token menu is shorter:** ATTACK ▸ with each target priced, COVER ▸, folding stock, the movement and posture verbs, condition, roster actor, remove. MOVE ▸ and SELECT are gone — the movement verbs act on the token the menu opened on, and left-click already selects.

**Fixed:** tokens carried two hover texts, a native SVG `<title>` and the styled overlay, which surfaced as a doubled tooltip. The native one is gone.

No rules, schema or rules-package changes.

## v0.42.0 a denser combat panel, and conditions that belong to something

Three problems with the rail, one of which was not a layout problem at all.

**The action verbs are chips.** Six full-width buttons took four rows; they now take two.

**The DM breakdown collapses.** The headline — `HAWKEYE → HOSTILE 1 / MEDIUM / 13+ / 5D` — is the only line that has to be visible, and it turns yellow when no 2D throw can make it. The weapon, target number and every contributing DM sit behind it, remembered open or closed across renders.

**Conditions now belong to the thing they describe.** Ticking cover, darkness and a folding stock per attack was wrong in kind, not just in size: cover protects whoever is being shot at no matter who shoots, darkness covers the whole fight, and a folding stock belongs to the firer's weapon. Encounter schema 8 puts lighting on the encounter and `cover` and `foldingStock` on each combatant; `encounterSituationDMs()` derives the DM for a given attacker–target pair, and the resolver applies it to every throw automatically. The rail shows one lighting selector for the scene, a cover selector labelled with the target's own name, and a folding-stock box for the selected combatant.

The effect is visible in the target list, which prices each candidate separately: with the scene dark and one hostile behind cover, `HOSTILE 1 / MEDIUM / 13+` sits next to `HOSTILE 2 / MEDIUM / 9+`. Under the old ticked scheme both would have read the same, because the modifier belonged to the attack rather than to the target.

Measured at 1680×990: the combat panel fits the rail without scrolling, collapsed or expanded.

Encounter schema 8 migrates v7 documents with normal lighting, no cover and no folding stock. No rules-package changes.

## v0.41.0 a combat tracker, and orders given at the token

The flow split one decision across three places: pick an actor in the rail, pick a target in the rail or on the map, then press a verb in the rail — while the map, where you are actually looking, showed only a range line. Both halves of this version put the decision where the attention is.

**The rail is now a tracker.** Top to bottom: the selected combatant with its token glyph, side and current characteristics; its action buttons; every legal target *priced* — band and the throw needed, or `NO REACH` with the reason, since `previewPersonalAttack` is dice-free and costs nothing to run against each candidate; the DM breakdown; and then the tracker itself, party first and other sides below, each row carrying a side marker and the orders that combatant is holding. The separate party and enemy rosters are gone.

**It is not a turn order.** Traveller rounds are simultaneous (Book 1 p.30), so there is nothing to sort by and no turn to advance. What the list does is show who still owes a declaration, which makes it a checklist that empties — and `[ RESOLVE ROUND ]` commits it. Declaring no longer resolves the round by itself: `declareEncounterAction` and `resolveDeclaredRound` are separate calls, so the referee can set orders for as many combatants as matter, look at the board, and then commit. Anyone left undeclared still attacks their nearest enemy, and the button says how many that is.

**Orders are given at the token.** Right-clicking opens a cascade — `ATTACK ▸` listing each legal target with its band and needed throw, `MOVE ▸` with close and open per target, then evade, escape and stand — and each leaf is one complete declaration for that token. Left-click still selects. Declared orders are drawn on the map as dashed arrows from each combatant to its target, coloured by side, so concentrated fire and a three-way fight read at a glance.

Fixed on the way: clicking a cascade closed the whole menu, because the map's pointer handler treated any press as a dismissal.

No rules, schema or rules-package changes.

## v0.40.0 a clock, named situation DMs, and a round tracker

**The campaign clock runs.** `secondsOfDay` has been on the campaign document since the beginning, validated 0–86399 and advanced by nothing: `advanceCampaignDays` takes whole days only, so a combat round was fifteen seconds of no time at all. `advanceCampaignSeconds` rolls seconds into days and days into years, each resolved round advances the clock by the Book 1 p.30 round of 15 seconds, and the masthead shows `HH:MM:SS` beside the date — with seconds, because an HH:MM clock sits still through an entire firefight. This is also what the p.34 recovery intervals need: ten minutes to recover consciousness, three hours for a serious wound, neither of which can be modelled without a sub-day clock.

**Situation DMs are ticked, not typed.** Book 1 p.31 errata gives cover −4, concealment −1, darkness −9, darkness with a light intensifier −6, and folding stock −1. They appear in the combat rail as labelled checkboxes with their page in the tooltip; the total feeds the preview and the actual throw, so `NEEDS 2D` moves from `2+` to `4+` the moment cover is ticked. The referee's MODIFIER field remains for anything the book does not name. Conditions describe one attack and clear when it resolves.

Also new in the rules package and not yet wired to the client: the p.31 terrain DM table and encounter range table (`rollEncounterRange`), and the p.31 surprise DM table (`surpriseDMTotal`). The setup dialog still asks for a starting band rather than throwing for it.

**The round tracker** replaces the bare actor/target strip above the map: round number, which side is surprised, and either who still owes a declaration or that all are in — `ROUND 1 // AWAITING HAWKEYE // ACTOR HAWKEYE // TARGET HOSTILE // RANGE MEDIUM / 8 SQ`.

Rules package v0.19.0. No schema changes.

## v0.39.0 any side may be given orders

**The referee can now direct the opposition, and a third faction is a legitimate encounter.** Declarations carry a `side`, and the resolver reads them from every side rather than the party alone. Targeting is side-relative throughout: a combatant may engage anyone not on their own side, and same-side targeting is refused. Anyone active and not given an order still attacks their nearest enemy, which is the old behaviour as a fallback rather than the only behaviour.

Encounter validation no longer restricts a side to `party` or `opposition` — any nonblank label is a side — so a militia, a rival crew, or a mutinous half of the party can be placed and will fight on its own account. A test drops a third faction between the party and the raiders and checks that it closes on the *raiders*, its nearest enemy, rather than defaulting to the party.

In the UI, shift-clicking a roster card takes the actor slot for that combatant, and the token menu offers `DECLARE FOR THIS ACTOR`. The action buttons and the DM panel follow the selected actor whichever side it is on, the card shows `ORDERED ATTACK` once declared, and the round still waits on the party before resolving. The roster covers every non-party side and names them when there is more than one.

**Two rules bugs found in Book 1 pp.31–34 and fixed:**

*Escape was thrown at 7+.* p.32 sets it at **9+** with the range DM (−1 close/short, +1 medium, +2 long, +3 very long). The DMs were right and the target was two points too generous, so escapes had been succeeding far more often than the book allows.

*An evading defender still parried.* p.33 says an evading combatant may not attack and may not use the weapon to parry or block. The package applied the evasion DM and the parry DM independently, so an evading blade fighter received both.

**Recorded as a ruling:** a RAW range band is 25 m, close and short share band 0, medium is 1–2 bands, long 3–10, very long 11–20, and beyond 20 bands is out of range. The square workspace's own square-to-band mapping does not correspond to those widths; the book permits expanding the line grid to a square grid, so the grid is RAW and the mapping is ours. The audit now says so.

Rules package v0.18.0. Encounter schema 7 migrates v6 declarations by stamping them `party`.

## v0.38.0 the character strip tells the truth about the fight

**The character stays whole during combat.** v0.37.0 collapsed the characteristics row and quick skills along with SHIP STATUS; that was the wrong half to hide, since status and wounds are exactly what a referee reads mid-fight. Only SHIP STATUS collapses now.

**Two bugs behind that, both worse than the layout.**

Combat wounds live on the encounter combatant until the fight resolves, but the header, the chips and the ad hoc characteristic roll all read the character document. Mid-fight the strip reported the state the character was in *before* the encounter — the header said READY while the party roster said UNCONSCIOUS with DEX 5/11. `encounterSelfCombatant()` and `characterCurrentValue()` now feed the health label, the chips and the roll dialog, so a wounded character cannot be offered a throw at a characteristic they no longer have.

And the wounds never left the encounter at all. `src/combatant-document-sync.js` — written, exported and tested — was imported by nothing but its own test. Every fight since it was added left the character document untouched: survive an encounter at STR 2 and the sheet still read STR 10, and a saved campaign carried the pre-combat character. `applyEncounterDocumentSync()` now runs after each resolved round, writing physical characteristics, alive and consciousness back to the party characters and the roster actors, and logging what each character carried off the field.

No rules, schema or rules-package changes; `synchronizeEncounterDocuments` is used as it was already written.

## v0.37.1 combat takes the whole rail

The combat panel is now the first section in the rail scroller, and while it is up the other rail panels — WORLD, TRADE, JOBS, NPCS and the situation record — are hidden outright rather than merely deselected. The takeover bar already said they were suspended; now they behave that way, so selecting a suspended tab cannot render Port Services above the throw the referee is reading.

The character strip and SHIP STATUS are unaffected by this: they sit above the scroller and keep the one-line form from v0.37.0, with the identity line still carrying wound status and posture. Current characteristics during a fight are on the party roster cards inside the combat panel, which covers the whole party rather than just the active character.

No rules, schema or rules-package changes.

## v0.37.0 combat takes the rail

While the COMBAT scene holds the context rail, the character strip and SHIP STATUS collapse to one line each. The identity line keeps the name, UPP, wound status, posture and credits — what you actually consult mid-firefight — and SHIP STATUS keeps its heading and the ship's name. Characteristics, quick skills and the fuel/cargo/jobs body wait until the fight is over. Measured at 1680×990: the rail's scrolling area goes from 461px to 775px, enough that a one-enemy encounter needs no scrolling at all. Both panels restore the moment you leave the COMBAT tab.

It is one class, `combat-focus`, set only when the combat rail is actually visible, so nothing changes during ordinary play.

No rules, schema or rules-package changes.

## v0.36.0 the COMBAT scene

The map is the centre scene and nothing else: a fixed toolbar with the selection strip and zoom, the workspace filling the middle, a fixed legend — the same three-part shape as the subsector scene, so COMBAT and SYSTEM feel like the same room. The tactical wrapper and the side panel that used to squeeze the rosters beside the map are gone.

**The rail carries the throw.** `COMBAT` in the context rail shows, in order: the DM panel for the selected actor and target, the action buttons, the party's round declarations, and the enemy roster. The DM panel lists the range and squares, weapon versus armour, the target number, every non-zero DM, the total, and what the 2D throw itself must show — `NEEDS 2D 7+` — plus the damage dice. When the weapon has no column for that band it says so and cites Book 1 p.46 rather than offering a throw that cannot be made.

Those numbers come from `previewPersonalAttack()` in the rules package, which computes the same throw and DMs as `rollPersonalAttack()` without dice. A test asserts the two agree field for field, so the panel cannot drift from what the resolver actually rolls.

**The band shown is the band used.** Since v0.35.0 each attack is thrown at the band between that pair, so the old `[ APPLY MAP RANGE ]` control and the "MAP SUGGESTS" wording are gone — there is no longer a referee-set band for the map to disagree with.

**Declarations are tallied, not judged.** A target with attacks declared against it carries `×2` on its token and `DECLARED ×2` on its roster card. That is the party's own information. There is deliberately no warning that a target is already down: under p.30 the round has not established that yet, and coordinating fire is table talk, not a prompt.

**COMBAT is selectable without a live encounter**, so `START COMBAT` is reachable from the scene; a live encounter still pulls the scene to COMBAT, but leaving it is now the referee's own choice. Opening an encounter frames the combatants instead of the whole 32×20 workspace, which at 100% left the tokens as specks.

Rules package v0.17.0. No schema changes.

## v0.35.0 wounds at the end of the round; range per pair

**Book 1 p.30, step 2C: "If attack succeeds, determine wounds inflicted at end of the round."** The round resolver honoured that on the opposition side — foes attacked from a pre-round snapshot, so a foe cut down still shot back — but not on the party side, where attacks resolved against live state. Two characters declaring against the same enemy would fail with `defender is not active` if the first shot dropped him, which under 2C is information the characters do not have yet.

The resolver is now one shape for both sides. Step 2A movement and posture resolve first; every attack in step 2B is thrown against the snapshot taken after movement; wounds apply in step 2C, after the last attack, in declaration order so that first blood falls on the first wound a combatant takes. Surprise is unchanged and orthogonal: it decides *who may act*, not when damage lands.

`rollPersonalAttack` in the rules package now does the throw and the damage dice without touching the defender; `resolvePersonalAttack` is a thin wrapper over it plus `applyPersonalDamage`, so single exchanges outside a round structure behave exactly as before.

**Each attack is thrown at the band between that attacker and that target**, computed from post-movement map positions rather than one encounter-wide band. `close` and `open` move the token and the band follows from the new position. `encounter.range` remains on the document as the scene band for placement and display, and now reports the closest opposing pair. Schema 6 migrates v5 documents and marks the map `graycloak-band-guide-v2`, so a stored encounter records which range policy resolved it.

`declaredTargetCounts()` reports how many party attacks are aimed at each target this round. Declarations are the party's own information, so showing this reveals nothing the characters would not know — unlike a warning that a target is already down, which the round has not yet established.

**Fixed on the way past:** `quickSlotStore` was declared with `let` some 245 lines after the block that assigns it, so the assignment ran while the binding was still in the temporal dead zone and threw `Cannot access 'quickSlotStore' before initialization` on every load. The surrounding `try/catch` swallowed it, leaving the store null — quick slots fell back to defaults and never persisted. The declaration now sits with `registry` and `playerSessionStore`, and a test asserts the ordering.

Rules package v0.16.0. Encounter schema 6. No other document schemas change.

## v0.34.0 the rail border stops cutting into the tab bodies

The WORLD, TRADE and JOBS panels looked clipped on the right: every value ran hard against a vertical line, and the BERTHING attention box lost its right border into it. Nothing was clipped. The v0.25.0 rule `.context-panel { border-right: 1px solid var(--rule) }` was written for the rail, but `.context-panel` is also the class on the five tab sections inside `.context-scroll`, so each of them drew its own right border at the content edge, ten pixels inside the real rail border. Found at 4× zoom; invisible at 1×, exactly the kind of thing a stylesheet grep does not show.

The rule is retargeted to `#context-panel`, and `.context-scroll > .context-panel { border-right: 0 }` guards the tab bodies. A test asserts no bare `.context-panel` border rule remains.

No Classic Traveller rules and no persistent document schemas change.

## v0.33.0 chargen gets its columns back; the LOG header is one row

**Character generation was drawing the empty context rail over the Book 1 tables and the sheet under the command rail.** Both latent since v0.31.0. `.chargen-mode .context { display: none }` had been losing to `#context-panel { display: flex }` on specificity, so the (empty) context rail — `position: sticky`, hence painted above — covered `BOOK 1 TABLES`. And the v0.30.0 `.chargen-mode .stage > .scene { grid-column: 2 / 4 }` span, present twice, ran the sheet into the rail's column. The context rail now hides by id in chargen, the sheet keeps to column 2, and the spans are deleted.

**The LOG header is `LOG · SHOW · ORDER · [ NOTE ] [ CLEAR ]` on a single row.** The campaign-name line beneath it is gone (the masthead already names the campaign) and the SHOW/ORDER text labels are gone with it; the selects carry `aria-label`s and the order options read `NEWEST` / `OLDEST`. Three rows of header become one, giving the feed the height back.

No Classic Traveller rules and no persistent document schemas change.

## v0.32.0 the legend is on screen, and WHAT NOW? scrolls

The centre column clipping that survived v0.25.0 through v0.31.0 was never a height problem. Measured in the running app, `.canvas` was 708px tall and `#subsector-section` was 708px tall — but the section began 12px below the top of the canvas. A global `section { margin-top: 16px }` from the original stacked-page layout, and a `.campaign-play #subsector-section { margin-top: 12px }` rule from the same era, sat on top of a `height: 100%` box. Every version made the box the right size; the margin then pushed its last 12px — the legend — out through the bottom of an `overflow: hidden` parent, where the page's own `overflow: hidden` made it unreachable.

`.stage > .scene > .canvas > section { margin-top: 0 }` removes the margin for every section the scene hosts, and the stacked-era `.campaign-play` margin rule is deleted rather than overridden. The CHARACTER view gets its last 12px back too (its sheet scroller was short by the same amount), and the COMBAT view its last 16px.

**WHAT NOW? finally scrolls.** Every `.command-rail > .procedure-section` rule from v0.25.0 to v0.31.0 — six of them — matched nothing: the element is `<section id="procedure-section" class="panel whatnow">` and has never had a `.procedure-section` class. So the panel never received `overflow-y: auto`; with a long procedure list its cards ran underneath the LOG and the rail's `overflow: hidden` clipped them, which reads as the log having no bound. The log itself was always bounded (3fr track, feed scrolling). The v0.31.0 rule now targets `#procedure-section`; the five dead predecessors are deleted, and a test asserts no rule addresses the phantom class.

Verified headlessly at 1400×640, 1366×768, 1600×900 and 1920×1080: the legend's bottom edge sits 1px inside the canvas at every size, and the character sheet scrolls internally to its true end. With 300 log entries and 20 extra WHAT NOW? cards injected, the rail stays at viewport height, both rail panels scroll, and the centre column does not move.

No Classic Traveller rules and no persistent document schemas change.

## v0.31.0 the terminal is the viewport

Every version since v0.25.0 derived the available height from `100vh` and then depended on each intermediate box cooperating — terminal padding, masthead borders, grid gaps, flex floors. Any one of them being off by a few pixels put the bottom of the stage below the fold, and because the page is `overflow: hidden` the clipped content was unreachable rather than merely scrolled past.

`.terminal` is now `position: fixed; inset: 0`, so it *is* the viewport box by definition. No arithmetic to drift, and no descendant can make the page taller than the screen. The width comes from horizontal padding rather than a centred `max-width`.

**WHAT NOW? and the log split the rail 2fr / 3fr**, each with its own scroller. The previous flex arrangement let the log's content basis dominate; explicit grid tracks cannot. WHAT NOW? now scrolls internally when the procedure list is long instead of squeezing the log or overflowing.

**The context rail has exactly one scrolling region.** Character, SHIP STATUS and the tab strip are `flex: 0 0 auto` heads; the tab body is the only thing that scrolls, so WORLD's content is no longer clipped by a parent that had run out of room. SHIP STATUS keeps a `30vh` cap with its own scroller for long manifests.

**The campaign date moved to the masthead**, labelled `DATE`, showing the day, the campaign week, and the days remaining to the nearest active contract deadline. It is no longer duplicated in the CURRENT PORT meta line, which returns to describing the world.

No Classic Traveller rules and no persistent document schemas change.

## v0.30.0 character joins the rail; the stage is one row

The character strip moves into the context rail, above SHIP STATUS: identity on one line, characteristics on the next, quick skills below. The `CHARACTER` label is dropped — it is obvious whose sheet you are looking at. The rail widens from 390px to 440px so the characteristics fit on a single line and the skills take two, with the width coming from the map, which has been over-served since v0.18.

**This removes a class of bug rather than another instance of one.** The stage was two rows solely to carry a full-width character strip, which forced the command rail to span `grid-row: 1 / 3` to sit level with the masthead. A spanning item contributes its min-content height to an `auto` row, so the rail's procedure cards and log kept sizing row 1 and pushing the grid past `100vh`. That is what cut off the bottom of the UI in v0.25.0 through v0.29.0, and what collapsed WHAT NOW? in v0.28.0. With character in the rail there is one row, no spanning item, and nothing whose content can size a track.

The grouping is also more honest: character and ship are what you brought, and the WORLD/TRADE/JOBS/NPCS tabs beneath them are where you are.

**Dead layout rules are gone.** The superseded `.stage` placements — two `grid-row: 1 / 3` rules, the `grid-column: 1 / 3` strip placements and the `order` declarations — are deleted, along with all nine `.center-stack` rules for a wrapper removed in v0.27.0. Among them were `.center-stack .context-scroll { max-height: min(42vh, 480px) }` and the `context-focused` canvas clamp, both of which could still have won a specificity contest against current rules. A test now asserts `grid-row: 1 / 3` appears nowhere in the stylesheet.

No Classic Traveller rules and no persistent document schemas change.

## v0.29.0 an explicit height chain

v0.28.0 fixed the wrong half of the problem. Capping `.procedure-section` by flex made WHAT NOW? collapse to a sliver, because flex shrink is weighted by content basis and the log's basis is enormous — the two sections could not share the rail fairly on `flex: 1 1 auto` alone. And the bottom of the UI still fell off, because the chain from `100vh` down to the map depended on rules accumulated across five layout eras, each of which had to cooperate.

**The terminal now owns the viewport height directly.** It is a three-row grid — masthead, chargen utility nav, stage — with `minmax(0, 1fr)` on the stage row, `box-sizing: border-box`, and `overflow: hidden`. Every child is placed by an explicit `grid-row`, so nothing auto-places into an implicit fourth row and grows the page.

**Every level below it states its own constraint.** `.stage > *` gets `min-height: 0`; the three columns get `height: 100%; max-height: 100%; overflow: hidden`; the canvas, the subsector section and the map each get an explicit floor of zero. None of this relies on an earlier rule still applying.

**WHAT NOW? gets a definite share.** It is capped at `44vh` — a viewport unit, not a percentage of a parent whose height derives from its own content, which is the circularity that broke v0.28.0 — with `flex: 0 1 auto`. The log takes `flex: 1 1 0%` with a 120px floor, so it absorbs the remainder without crowding out the procedure cards. SHIP STATUS is capped the same way at `34vh`.

Below 1300px the terminal reverts to a flex column and every cap is released, so the page scrolls normally on narrow screens.

No Classic Traveller rules and no persistent document schemas change.

## v0.28.0 the bottom of the UI, and a reworked character strip

**The stage no longer overflows the viewport.** `.command-rail` spans `grid-row: 1 / 3` while row 1 is `auto`, so the rail's min-content height — every WHAT NOW? card plus the log — grew row 1 past the character strip and pushed the grid beyond `100vh`, cutting off the bottom at any window size. `.procedure-section` made it unrecoverable: its `max-height: 58%` was a percentage of a parent whose height derived from that same content, so it never resolved to a cap. WHAT NOW? and the log now share the rail by `flex: 1 1 auto` with `min-height: 0`, and the rail is explicitly `min-height: 0; overflow: hidden`.

**The character strip is down to what changes.** `SCOUTS` and `AGE 38` are gone from the row and now live in the UPP's title text, together with a note that the UPP is the profile as originally generated — it does not track wounds, and players who never learn to read it lose nothing. The `ROLL` and `SKILLS` labels are gone; the chips are self-evident. The UPP is larger and bold, since it is the string most often consulted.

**Wounds are visible in three places at once.** STR, DEX and END chips already carried current values; a wounded chip now reads `END 3/5` with the amber attention fill, so the loss is legible without arithmetic. The status word takes the same amber for `WOUNDED` and the failure red for `UNCONSCIOUS` and `DEAD`, and stays plain for `READY` so the colour keeps its meaning.

**Posture is a second, read-only field.** Health and posture are separate axes — a character can be wounded and evading at once — so posture gets its own slot, shown only while an encounter is active at the current system. It surfaces `EVADING`, which `personal-combat.js` has always tracked and applied (Book 1 p.32: −1 at close or short range, −2 beyond), and the melee `BLOWS` count, which is capped against endurance. Neither was previously visible anywhere in the UI. It displays state and does not declare it; declaring evasion stays in the combat actions.

**The campaign date is back.** It was lost when v0.24.0 deleted the CURRENT LOCATION header cell, leaving the day visible only on log entries after the fact. It now leads the CURRENT PORT meta line, followed by the days remaining to the nearest active contract deadline when there is one — the figure you would otherwise compute by hand before deciding to skim a gas giant or take a job.

No Classic Traveller rules and no persistent document schemas change.

## v0.27.0 correct rail placement, no .center-stack, SHIP STATUS on top

v0.26.0's layout failed for one reason: `.context-panel` is the class on the five panels *inside* the rail — PORT SERVICES, COMMERCE, CONTRACT BOARD, SITUATION, ROSTER — while the rail itself is `<aside id="context-panel" class="context">`. The v0.25.0 rule `.context-panel, .command-rail, .scene { height: 100%; overflow: hidden }` therefore gave every inner panel full height inside a column that had none, and gave the column nothing. The panels self-clipped, SHIP STATUS became unreachable, and the rail — never placed by `.stage > .context-panel`, which matched nothing — auto-flowed into row 1 on top of the character strip.

Placement is by id from here on: `.stage > #context-panel`, `.stage > .scene`, `.stage > .command-rail`, `.stage > .campaign-header-strip`. A companion rule resets `.context-panel` to `height: auto; overflow: visible`, so the inner panels size to their content and the rail is the only scroller.

**`.center-stack` is gone.** The wrapper was a pre-v0.20 leftover that forced `display: contents` and carried two rules that were quietly capping the rail: `.center-stack .context-scroll { max-height: min(42vh, 480px) }` and a `context-focused` clamp on the canvas. Scene, context rail, and chargen tables are now direct grid children of `.stage`, so placement no longer has to survive a `display: contents` hop.

**SHIP STATUS moved to the top of the rail**, above the WORLD/TRADE/JOBS/NPCS tabs, where it is persistent rather than scrolling away beneath whichever tab is open. It carries more than the scene strip did — `JUMP NEED` against the selected destination with any shortage, the cargo and passenger manifests line by line, and active jobs with their routes, each row clicking through to the relevant tab. It is capped at 40% of the rail with its own scroller so a long manifest cannot crowd out the tabs.

The scene strip's SHIP cell is reduced to the ship name and type as the link into the register, since its summary numbers were a thinner copy of what SHIP STATUS now shows permanently. The selected context tab gets the `--tab-selected` fill, scoped under `#context-panel` so it outranks the older rule at equal specificity, and the ship link drops its link colour to match the port name beside it.

No Classic Traveller rules and no persistent document schemas change.

## v0.26.0 one-row character strip, masthead-level dock, and a bounded log

**The character is one row.** The three-row identity strip is replaced by a single flex row: `CHARACTER`, the name, the UPP/career/age/status/credits line, the six characteristics, the quick skill slots, and `[ ALL SKILLS ]`. Nothing is removed — the previous layout stacked three rows that each used well under half the available width, so at full width it all fits on one line and wraps only when the window narrows. Two rows recovered.

**WHAT NOW? starts level with the masthead.** The character strip moved inside the stage and spans the left and centre columns only; the command rail spans both grid rows in column three. So the dock begins where the masthead ends, beside `[ NEW CHARACTER ]` and `[ HIDE LOG ]`, instead of below the character block.

**Selected tabs carry a colour.** `--tab-selected` gives the active scene tab and context tab a green-grey fill and a matching underline, rather than distinguishing them from the rest by lightness alone. The COMBAT tab keeps its amber attention fill, which now overrides the selected colour when an encounter is live.

**The current port is highlighted.** The port name in the status strip gets the same fill and a border, so the world you are standing in reads before the destination you have not chosen yet.

**The log is bounded again.** v0.25.0's viewport-height stage was defeated by an earlier rule — `.command-rail .activity-panel` carried a fixed `height: min(520px, calc(100vh - 260px))` with `min-height: 300px`, which outranked the flex sizing and let the rail exceed the viewport, so the page grew and the bottom of the UI became unreachable. The panel is now `height: auto; max-height: none` and flexes, `html, body` are pinned to `100%` with overflow hidden, and `.activity-feed` is the single scroller inside the log. WHAT NOW? is capped at 58% of the rail so the log always keeps a share.

Below 1300px all of this reverts to a single stacked column that scrolls normally. No Classic Traveller rules and no persistent document schemas change.

## v0.25.0 tabbed centre scene and a viewport-height stage

The centre column is no longer a permanent map. It is a scene with three tabs — CHARACTER, SYSTEM, COMBAT — and the map is one scene among them rather than the default that everything else opens over.

CHARACTER holds the character sheet, which had been a `sheet-view` absolutely positioned inside `.canvas` and therefore confined to the map's box. It now gets the full centre column, so the v0.20.1 compaction that was fighting a 560px container is no longer load-bearing. COMBAT holds the encounter record and is disabled unless an encounter is active at the current system; starting or ending one switches to and from it automatically, replacing the `encounter-workspace-active` class that used to hide the map in place.

SYSTEM holds the map, and the `SCENE / SUBSECTOR NAVIGATION` label row is gone — the map identifies itself. Zoom, subsector name, and jump rating moved onto a thin tool row above the map; the legend moved beneath it. In their place is a three-cell status strip: CURRENT PORT, SELECTED DESTINATION (with the jump actions and `[ DETAILS ]`), and SHIP. The ship name opens the register, as it did before v0.24.0 removed the header cell.

The stage is now `100vh` with three full-height columns. The WORLD/TRADE/JOBS/NPCS rail and the WHAT NOW?/LOG dock reach the bottom of the viewport and scroll internally, so the map no longer dictates page height and WHAT NOW? sits directly under the header. Below 1300px the stage falls back to a single stacked column that scrolls normally.

Ship, campaign, and threads remain documents that open over the scene. The ship register gains a `[ SHIP REGISTER ]` entry in the Campaign menu alongside the existing campaign and threads entries, so all three are reachable without a header cell.

COMBAT currently shows the existing encounter record. The combat scene proper — range bands, per-pair range, the DM panel, and wounds applied at round end — is deliberately left to its own milestone. No Classic Traveller rules and no persistent document schemas change.

## v0.24.0 one scroller, a character-only header, and trade actions in their cards

Three changes prompted by the v0.23.0 screenshot.

**One scroller per column.** `.operations-panel-record` was `flex: 1 1 auto; overflow-y: auto` inside a fixed-height section, giving the context column a scroller inside a scroller. The box records needed it because they were unboundedly tall; the structured panels are not, so the record now sizes to its content and the column scrolls once. SHIP STATUS is reachable again without scrolling past PORT SERVICES.

**The header keeps only the character.** With the WORLD panel structured, Orison's name, hex, UWP, and bases appeared in the header cell, the scene footer, and the WORLD panel; fuel, hold, and the account appeared in both the header cell and WORLD. The CURRENT LOCATION and SHIP cells are removed. The scene footer keeps CURRENT PORT because it is paired with SELECTED DESTINATION and the jump action, and the WORLD panel keeps the fuller record because it sits with the actions that change it. The identity strip is now a single full-width cell: name, UPP/career/age/status/credits, the six characteristics, and the quick skill slots.

The header task button is removed with them. It had grown to a full sentence — a thread title, its objective, and a job count — and was duplicating the WHAT NOW? dock. The active thread objective is now a `THREAD` card in OPPORTUNITIES that opens the thread record, so nothing is lost and the copy sits where procedure copy belongs.

**TRADE actions move into their cards.** Freight lots carry `[ ACCEPT ]`, the weekly speculative lot carries a single `[ BUY nt / Cr… ]` sized to whichever is smaller, the free hold or the operating account, with the binding constraint named beneath it. Resale lots carry `[ SELL ]` and `[ DECLINE ]`. Passenger booking keeps the action bar because high/middle/low are route actions rather than per-card ones, and the broker DM control stays there with them.

`[ DECLINE ]` closes the gap the September facsimile audit recorded: `payDeclinedBrokerFee()` existed in the rules package but the client never called it. Declining a quote after engaging a broker now charges the commission to the ship ledger as Book 2 p.48 requires, and declining with no broker engaged charges nothing.

No Classic Traveller rules and no persistent document schemas change; the broker fee was already implemented and tested in the rules package.

## v0.23.0 structured WORLD, TRADE, and JOBS panels

v0.23.0 retires the fixed-width `box()` records from the context column. At 390px those 96- and 106-character boxes were wrapped by `overflow-wrap: anywhere`, breaking the rules and gutters across lines and mangling the panels a player reads most during a port call.

`ui-model.js` gains `panelRow()`, `panelCard()`, `buildPortServicesPanel()`, and `buildContractBoardPanel()`, which return plain view models rather than text; `app.js` renders them through one `renderPanelModel()`. Values right-align on a `minmax(7ch, 11ch)` label column so figures scan vertically, and attention state is a badge on the value rather than a highlighted whole line. TRADE builds its model where its data already lives, in `renderCommerce()`.

JOBS offers are now cards carrying their own `[ ACCEPT ]`. A blocked offer stays visible as `[ BLOCKED ]` with its reason in place — an active exclusive charter, a manifest that must be empty (Book 2 p.9), or insufficient free hold — instead of a disabled entry in an action bar detached from the offer it belongs to. The map-selection disclaimer survives as a group note.

`box()` is unchanged and still used for the chargen sheet, system record, situation record, encounter record, and jump plan, where the width is available and the boxed form reads correctly. The Book 2 fuel, berthing, cargo-before-passengers, and broker rules are untouched; no rules and no persistent document schemas change.

Tests: `test/client-model.test.mjs` ports the port-services and job-board assertions onto the panel models, and `test/static-client.test.mjs` pins the renderer, the retained `box()` callers, and the terminal styling constraint.

## v0.22.0 two-row campaign header and quick skill slots

v0.22.0 recovers two vertical rows above the stage without removing information. The masthead is now a single row: the campaign name sits immediately after `[ CAMPAIGN v ]`, followed by the autosave indicator and the transient status line, with `[ NEW CHARACTER ]` and `[ HIDE LOG ]` pushed right. The separate campaign-identity/status sub-row is gone, and so is the full-width roll bar beneath the identity strip.

Current Location and Ship remain their own cells. Each keeps its kicker, name, and metadata, and each gives up horizontal width to the Character cell in exchange for a second metadata line: Location now carries hex, UWP, date, and bases; Ship carries jump, fuel, and hold on one line and `STATEROOMS occupied/total`, passengers, and the operating account on the next. The v0.19.0 stateroom wording is unchanged.

The Character cell absorbs the old roll bar. Its headline row holds the name and UPP/career/age/status/credits; below it sit the six clickable characteristics and then the quick skills, `[ ALL SKILLS ]`, and the current task.

Quick skills are now chosen rather than inferred. `QUICK_SKILL_PRIORITY` is replaced by `client/quick-slots.js`, which resolves up to six slots per character. Slots are stored in the browser keyed by Character Document id, so they are a local view preference in the sense established by v0.21.0's player sessions; no Character Document, Campaign Document, or bundle schema changes. A character with no stored slots falls back to the previous priority order, so existing characters look exactly as they did. `[ ALL SKILLS ]` or an empty `+ SLOT` chip opens a picker; skills the character no longer has drop out of stored slots on read. When the active situation calls for a skill that is not slotted, that skill still appears as a temporary dotted chip so a check never becomes unreachable.

Tests in `test/quick-slots.test.mjs` cover default order, normalization, per-character isolation, skill removal, and storage failure. `test/static-client.test.mjs` pins the two-row masthead, the absence of the sub-row and roll bar, the cell contents, and the picker dialog. This is a UI-only milestone: no Classic Traveller rules and no persistent document schemas change.

## v0.21.0 multiplayer-readiness foundation

v0.21.0 introduces the architectural boundary needed before live simultaneous play. Player sessions now distinguish solo, player, referee, and spectator roles; record controlled characters; and keep each client's viewed character outside shared Campaign Document state. The Campaign record selector is therefore labeled Viewed Character and no longer rewrites the campaign when a local player changes sheets.

Activity Log Document v2 adds public, addressed-player, and referee-only visibility with automatic migration of v1 entries to public. A revisioned campaign-state store and transport-agnostic command service add stale-write rejection, command idempotency, actor authorization hooks, normalized player choices, and subscriptions. Two-client tests exercise simultaneous reads, a rejected stale mutation, a successful retry, private-log projections, and role/ownership restrictions. This is a tested multiplayer foundation, not yet a live Firestore connection; see `docs/multiplayer-foundation.md` for the boundary and remaining work.

## v0.20.1 compact personnel sheet

v0.20.1 reduces the vertical footprint of the shared character-generation and playable personnel form without shrinking its type or removing rules information. Banner, identity, section, characteristic, skill, and status spacing are tightened; benefits and finances now render as a two-column labeled grid; Psionics is a single compact row; and Notes starts at two lines but expands on focus. Service history and equipment remain side by side, while the full generation history stays collapsed until requested.

## v0.20.0 campaign entry workflow and command-centered play shell

v0.20.0 closes the gap between character generation and campaign play. A completed character now receives prominent `[ START NEW CAMPAIGN ]` and, when browser storage contains one, `[ ADD TO ... ]` actions alongside export. Starting a new character from an active campaign saves and remembers that campaign, then offers `[ ADD TO ... AND RETURN ]` when generation finishes. The Campaign menu adds `[ ADD CHARACTER ]`, which imports a completed Character Document into the loaded party without unloading the campaign or silently replacing the controlled character.

Campaign Document v9 adds `activeCharacterId`, validated as a member of the party and migrated deterministically from the first party member in v1-v8 documents. The Campaign record has an explicit Active Character selector. Imported party members remain inactive until selected; characters generated from the active campaign become active when they return.

The desktop shell is reorganized around the play loop: a wider 390px left rail contains WORLD, TRADE, JOBS, and NPCS (or Book 1 tables during chargen); the center remains the map, combat scene, or character sheet; and a 340px right rail stacks WHAT NOW? directly above the persistent Log. Current Port and Selected Destination now form a route strip above the subsector map. The former context-focus control is removed because the operations panel no longer competes vertically with the map. Responsive layouts retain two-column and single-column fallbacks.

## v0.19.1 mustering-result highlights and noble titles

v0.19.1 highlights the resolved die/result cells in the Book 1 Benefits or Cash table after every mustering-out roll, including modified totals. It also displays the character's civilian hereditary noble-title entitlement separately from military rank on the in-progress sheet, playable sheet, and text records. The title options are derived from Social Standing through the rules package's source-backed Book 1 p.6 table, so no duplicate title state can become stale if SOC changes. SOC above F remains noble-eligible but is explicitly left to referee determination because Book 1 names no title above Duke/Duchess.

## v0.19.0 three-column play shell and persistent journal controls

v0.19.0 completes the agreed desktop information architecture without changing Classic Traveller rules or persistent campaign schemas. The left dock now owns WHAT NOW? and the actual phase-appropriate Book 1 character-generation tables. The center owns the persistent map or character/combat scene with WORLD, TRADE, JOBS, and NPCS immediately beneath it. The campaign Activity Log moves to the right rail, defaults to newest-first, and persists both its order and visible/hidden preference in the browser. At narrower widths the journal drops beneath the center workspace, and the whole stage becomes single-column on small screens.

The center context has a `[ FOCUS ]` control that temporarily reduces the map height so tall trade or roster content can be inspected without trapping it in a short scroller. Situation and personal-combat takeovers return the map to full height automatically. The Campaign commands are consolidated under one menu, while `[ NEW CHARACTER ]` remains a separate mode-changing action. The header now reports truthful browser autosave state rather than presenting five equally prominent file buttons.

The ship identity strip replaces the ambiguous passenger-capacity abbreviation with explicit `STATEROOMS occupied/total`, `PASSENGERS`, and `HOLD used/total` values. Crew occupancy is included in the stateroom count. The in-progress v0.18.1 character-generation sheet work supplied in the local source is preserved: chargen uses the Book 1 form as its scene, highlights newly gained and pending skills, and places each legal skill roll on its governing table.

Tests in `test/static-client.test.mjs` pin the three-column DOM order, Campaign menu, autosave indicator, persistent log-order selector, context focus control, and ship-occupancy wording. All existing rules, persistence, trade, travel, situation, roster, and combat tests remain unchanged.

## v0.18.0 play layout: identity strip, WHAT NOW? dock, persistent scene, context panel

v0.18.0 rebuilds the client shell around the mockups agreed in September 2026. The campaign header becomes a three-cell identity strip (character, current location, ship) over a roll bar of clickable characteristics and quick skills with the TASK line at the right; the character and ship names open their sheets. Below it the page is a three-column stage: a left dock holding WHAT NOW? over the activity log, a center scene that is always the subsector map (or the personal-combat workspace while an encounter is active), and a right context panel with four places, WORLD, TRADE, JOBS, and NPCS. Situations and combat are not tabs; they take the context panel over with a yellow bar that returns to WORLD when clicked. The v0.17 workspace tab strip and the NAV/SITUATION/COMBAT operations tabs are removed. CHARACTER, SHIP, CAMPAIGN, and THREADS open as overlays over the map (Escape or [ CLOSE ] returns). A two-cell footer under the scene shows the current port and the selected destination with the JUMP button and [ DETAILS ].

WHAT NOW? in play is driven by `buildPlayProcedure()` in `ui-model.js`, a pure function over a state snapshot that returns grouped cards tagged REQUIRED / READY / BLOCKED / OPTIONAL / DONE with a one-line reason and the context tab to open. It encodes the Book 2 port-call order: berthing first, fuel for the selected jump, cargo announces the destination, passengers are blocked until cargo is accepted (p.8), one speculative lot per week (p.46), patron search once per port call (Book 3 p.25), life support charged at departure (p.7). The Done group collapses by default. Tests in `test/play-procedure.test.mjs`.

Character generation uses the same frame: WHAT NOW? shows the chargen procedure and its legal actions, the scene is the Book 1 character sheet filling in from the first roll (`renderChargenSheet()` drives the same form the playable sheet uses; the new skill is highlighted and pending rolls are shown as a dashed chip), and the context panel shows the Book 1 tables that apply to the current phase: Prior Service for the chosen service with the current throw highlighted; the four Acquired Skills tables for that service, each with its own [ ROLL 1D HERE ] button so the die is rolled where the result appears, the rolled cell (not the row) highlighted, and EDU 8+ locked when unavailable; Mustering Out benefits and cash; Aging. The separate Service History / Generation Log pane is gone: the activity log already records every chargen event, and Service History lives on the sheet.

Not in this slice: the range-band combat scene (the v0.16 token map remains inside the scene), the Finance-first ship register tabs, and the broker-decline action in TRADE. No rules or persistent document schema changes.

## v0.17.1 rules audit alignment

v0.17.1 carries the client onto `@graycloak/classic-traveller-rules` v0.14.0 after the facsimile audit (`AUDIT-2026-09-facsimile.md`). The patron port-call text now states the Book 3 p.25 rule correctly (a 5 or 6 finds a patron), and the port-operations, encounter, and situation tests were re-pinned to the corrected fuel consumption (20t per Type S Jump-1 including the two-week power-plant share), the range-scaled evasion DM, and the corrected patron availability. No client UI changes.

## v0.17.0 single-select campaign workspace

v0.17.0 replaces the campaign header's detail toggles with one single-select workspace tab strip: `PLAY`, `CHARACTER`, `SHIP`, `CAMPAIGN`, and `THREADS`. The former `[ CHARACTER ]`, `[ SHIP ]`, `[ CAMPAIGN ]`, `[ THREADS ]`, and `[ CHARGEN RECORD ]` links were independent accordion panels that inserted above or below the navigation workspace, so opening a record pushed the subsector map off screen and several records could stack at once. Exactly one workspace is now visible beneath the sticky campaign header; `PLAY` holds the existing Operations Desk and subsector map unchanged, and the Operations Desk tabs become the sub-tabs of that workspace. Clicking the header character name opens the `CHARACTER` sheet, a thread task opens `THREADS`, and situation, combat, and contract tasks return to `PLAY` before selecting their Operations Desk tab. The `SHIP` tab is disabled until a ship is assigned.

`[ CHARGEN RECORD ]` is removed from campaign play because the playable sheet already carries Service and Generation History in its collapsed section; chargen itself still shows Service History and Generation Log beside the Personnel Record. The System Record now expands in place beneath the selected-system summary strip via `[ DETAILS ]` instead of being appended after the map. Operations Desk tabs drop their bracket decoration, `ENCOUNTER` is labelled `COMBAT` and `ROSTER` is labelled `NPCS`, and attention is shown with the existing highlight plus a heavy left rule rather than an appended `!` that truncated in narrow columns. The campaign file row also gains `[ NEW CHARACTER ]`, restoring a route from campaign play back to character generation; since v0.15.2 the chargen commands had been hidden during play with no replacement. It confirms before discarding unsaved campaign state. This is a UI-only milestone: no Classic Traveller rules and no persistent document schemas change.

## v0.16.1 playable character sheet and persistent health foundation

v0.16.1 gives completed campaign characters a dedicated playable sheet inspired by the boxed Personal Data and History form in the Classic Traveller facsimile. The screen preserves the application's light paper, heavy black rule, and compact administrative-record style while reorganizing the printed form for interactive play. Clicking the campaign character name or `[ CHARACTER ]` opens current identity, original and current characteristics, service record, clickable skills, explicit ready weapon and worn armor, benefits, assigned ship, confidential psionics placeholder, collapsed generation history, and persistent notes. Chargen retains its existing Personnel Record and does not reappear at the bottom of campaign play.

Character Document v3 adds separate current STR/DEX/END values, consciousness, and an explicit personal-combat loadout. Existing v1/v2 documents migrate with undamaged current characteristics, a conscious living state, no armor, and the same deterministic preferred-weapon selection previously used by the client. Characteristic checks use current physical values while INT, EDU, SOC, and the original UPP remain unchanged. New encounters use the sheet's selected weapon and armor. This milestone establishes the persistence and interface required for combat aftermath, but combat wounds are not yet synchronized back to Character Documents; that remains the next bounded slice.

## v0.16.0 roster-driven encounters and conditions

v0.16.0 connects the persistent actor roster to the live encounter workspace. Right-click an empty map square to place an unused roster NPC, robot, or creature as opposition or a party ally; surprise is not rerolled and the authoritative Book 1 range is unchanged. Right-click tokens to select, target, inspect, apply or remove a body-aware referee condition, or remove the participant while retaining its roster record. Biological actors use stunned/unconscious/dead vocabulary; robots use disrupted/powered-down/disabled/destroyed vocabulary; hybrid actors can use either set. Conditions persist in both encounters and linked roster actors but remain explicit annotations rather than inventing automatic rules effects.

Enemy tokens now use actor-type shapes and short labels, active actor/target and range-mismatch text are more explicit, token hover text includes actor/body type and conditions, and the collapsible roster shows those conditions. Manual encounter setup may optionally record a referee-defined meters-per-square scale; otherwise the display says scale unset. Movement logs record square distance and optional approximate meters, while `[ APPLY MAP RANGE ]` remains the only way map geometry can change the Book 1 range band. Encounter Documents migrate from schema v4 to v5; Campaign and Bundle schemas are unchanged.

## v0.15.2.1 navigation-return hotfix

v0.15.2.1 restores an explicit route from the focused encounter workspace to the subsector jump controls. The jump action itself was still being generated, but encounter-focus styling deliberately hid the navigation-plan block and the operations tabs did not include a dedicated way back to it. A compact `[ NAV ]` tab now restores the subsector map, jump plan, ship status, and `[ JUMP TO ... ]` action. Navigation is also the default workspace whenever a campaign is created, loaded locally, or imported. Combat retains its full-width focused map until the user selects `[ NAV ]`. No rules or persistence schemas change.

## v0.15.2 Traveller-first campaign interface

v0.15.2 simplifies the campaign-play hierarchy without changing rules or persistent document schemas. The masthead now identifies the application as `TRAVELLER`, displays the current campaign separately, and keeps `[ NEW ]`, `[ SAVE ]`, `[ LOAD ]`, `[ IMPORT ]`, and `[ EXPORT ]` together immediately below the campaign name. Save/Load remain browser-local; Import/Export operate on portable campaign JSON. The long feature/version banner, campaign-terminal label, and developer-facing rules footer have been removed, leaving a small version marker and transient status message.

The main workspace heading changes from `SUBSECTOR NAVIGATION` to `PERSONAL COMBAT` while the encounter workspace is active. Repeated map instructions have moved into contextual help, and the full text encounter record is collapsed behind `ENCOUNTER DETAILS`; the map, action bar, party cards, and enemy roster remain immediately visible. The Activity Log can be hidden from the masthead, and its new default `PLAY` filter shows campaign activity while suppressing routine `SYSLOG` administration. Saving, loading, importing, and exporting still report success in the status line but no longer add repetitive journal entries. Classic Traveller Book 1 abstract range bands remain authoritative.

## v0.15.1.1 portable activity journal and token-menu fix

v0.15.1.1 promotes the Activity Log from a capped browser-only display into a stable-ID Activity Log Document owned by the campaign. Campaign Document v8 and Campaign Bundle v7 preserve the complete chronological journal through local saves and portable bundle exports. Existing per-campaign browser entries migrate into the document on first load. The feed groups filters for character activity, trade, ship operations, personal combat, space combat, campaign events, and system messages; referees may also add dated campaign notes. Character generation now records its actual history events instead of a generic completion message. Working documents remain the source of truth—the journal records meaningful actions, resolved rolls, and state changes rather than transient selections or hover events.

Token context actions now measure their rendered menu and clamp it inside the encounter viewport beside the pointer or keyboard-selected token. The viewport is the menu's positioning container, and focusing the first action no longer scrolls the page, correcting the dialog that could appear far from its token. Hover summaries, right-click actions, and the position-derived Graycloak range suggestion remain interface aids; the explicit Classic Traveller Book 1 range band is still authoritative.

## v0.15.1 persistent actor roster and map inspection

v0.15.1 establishes the shared actor paradigm for personal encounters without prematurely automating optional robot or alien rules. Campaign Document v7 and Campaign Bundle v6 add stable-ID NPC Actor Documents, portrait Media Asset Documents, and roster folders. An actor record carries the six classic characteristics and UPP, current physical values, career/service details, skills, equipment, inventory, credits, public/referee notes, description, portrait reference, effects, and body-aware state. Biological actors can be alive, unconscious, or dead; robotic actors use activation and integrity states such as powered down, offline, damaged, disabled, and destroyed rather than being forced into biological labels.

The Operations Desk now includes a compact collapsible roster. Referees can create or edit human, alien, creature, hybrid, or robot records, attach a small PNG/JPEG/WebP portrait, and insert a saved actor into manual combat setup. Encounter Document v4 records each combatant's source actor ID. Tokens expose an accessible SVG title plus a richer hover summary; right-click or Shift+F10 opens contextual select/target/attack/open-roster actions. These controls clarify intent without changing resolution: token positions still produce only a Graycloak distance/range suggestion, and the authoritative Classic Traveller Book 1 range band changes only through an explicit combat or referee action.

This slice deliberately does not implement Book 2 ship-to-ship combat, ship damage tracks, or optional robot/alien sourcebook procedures. The stable-ID document and effect/state foundation is intended to support those later additions.

## v0.14.1 fluid combat-map interaction

v0.14.1 replaces the encounter map's scroll-container camera with an SVG viewBox camera adapted from the Graycloak BATTLESYSTEM/Chainmail board interaction pattern. Tokens now follow the pointer continuously while dragged, preserve the initial grab offset, remain inside the battlefield, and snap to their persistent square only when dropped. Empty-map drag pans without rebuilding the battlefield; wheel zoom is smooth, cursor-centred, and coalesced to one view update per animation frame. `[ − ]`, `[ + ]`, and `[ FIT ]` remain available, with a 50%-400% camera range.

The interaction pass changes no combat resolution or persistence schema. A dropped token records one map-position event, while the live preview records nothing. Position-derived range remains a labeled visual suggestion; Classic Traveller Book 1 range bands remain authoritative until the referee deliberately uses `[ APPLY MAP RANGE ]`.

## v0.14.0 personal combat workspace

v0.14.0 expands the compact encounter map into a full-width 32-by-20 personal-combat workspace. The ENCOUNTER tab temporarily replaces the subsector view while selected, exposing a scrollable map with 50%-200% zoom, fit, drag-to-pan, and persistent draggable PC/enemy tokens. The side rail now separates a party actor roster from a collapsible enemy roster. Clicking a party token/card chooses the acting traveller; clicking an enemy chooses the target. Campaigns with multiple party Character Documents place every member in combat, each active PC declares once per round, and opponents choose the nearest active PC from the visual positions. Manual setup supports up to four distinct enemy types and sixteen enemies total.

Encounter Document v3 migrates v1/v2 encounters to the expanded workspace and persists pending party declarations. Square distance produces a clearly labeled Graycloak range suggestion only. Dragging never silently changes the authoritative Classic Traveller Book 1 abstract range band: CLOSE/OPEN remains a combat action, while `[ APPLY MAP RANGE ]` is an explicit referee action with its own audit and activity-log entry. Abstract range changes reposition the acting token to keep the visual guide aligned. The Classic Traveller rules package remains unchanged because the grid and its range guide are host policy, not new Traveller rules.

## v0.13.1 manual combat and encounter map

v0.13.1 makes personal combat directly accessible from the ENCOUNTER tab. `START COMBAT` opens a referee setup for one to six enemies, including name, STR, DEX, END, INT, weapon skill, weapon, armor, and starting range. Encounter Document v2 adds persistent positions on a 12-by-8 square grid and migrates v1 encounters automatically. The map shows the player character as a labeled token and enemies as selectable dots; a linked roster displays every enemy's current physical characteristics and equipment. Clicking a dot or roster entry selects the player's attack target. Multi-enemy rounds allow every active opponent to act, preserve simultaneous wound effects, and make the existing 25-percent casualty morale procedure meaningful. The square grid is explicitly a Graycloak visual aid; Book 1 range bands remain authoritative.

## v0.13.0 personal encounters and combat

v0.13.0 adds a generic Book 1 personal-combat engine and a compact ENCOUNTER tab linked to hostile Situation Documents. Combat resolves surprise and avoidance, abstract range bands, movement, evasion, escape, weapon/armor/range tables, weapon and characteristic DMs, untrained penalties, visible 2D throws, first-wound location, STR/DEX/END damage, simultaneous round effects, unconsciousness, death, morale, retreat, and end-of-combat recovery. Each Encounter Document preserves combatants and a round audit trail; Campaign Document v6 and Campaign Bundle v5 persist those documents while migrating older saves with empty encounter collections. No tactical map is introduced.

## v0.12.1.3 live ship status and clearer local job board

v0.12.1.3 keeps a live ship-status panel beside Navigation Plan so fuel, cargo, passengers, active jobs, and the ship operating account visibly change as the player acts. Fuel is green when the selected jump is ready, yellow when fuel is short but obtainable locally, and red only when the selected jump lacks fuel and the current system has no usable refueling source. Fuel, cargo/passenger, and job rows link directly to PORT, TRADE, and JOBS. The JOBS tab now labels the current port explicitly, states that map selection is navigation-only, prints origin -> destination on both offers and active jobs, and uses a green JOB activity entry when work is accepted. No Traveller rules or persistence schemas change in this milestone.

## v0.12.1.2 partial fuel-purchase fix

v0.12.1.2 fixes a port-operations bug where paid fuel could only be purchased by filling the tank completely. The old UI disabled `REFUEL TO FULL` whenever the ship operating account could not afford every missing ton, even when the account could afford enough fuel for the next jump. Paid starports now expose a fuel-tonnage input and calculate the exact purchase price; Scout-base free fuel retains one-click fill-to-capacity. Contract/job acceptance does not debit the ship operating account and does not reserve fuel. The rules package now exposes `purchaseShipFuel()` for quantity-based purchases while retaining `refuelShipToCapacity()` as a convenience wrapper.

## v0.12.1.1 generic adventure engine

v0.12.1.1 separates authored campaign content from the reusable adventure machinery. `traveller/src/adventure-definition.js` defines a portable JSON-compatible Adventure Definition v1, and `traveller/src/adventure-engine.js` resolves generic thread, clue, objective, contact, follow-up, contract, history, and event actions. The engine contains no Carranza, Aurelia, or Mara Venn knowledge. The Sea of Suns Carranza Route now lives under `traveller/campaigns/sea-of-suns/adventures/` and is consumed through the same data interface intended for future referee-authored adventures. Existing v0.12.1 Carranza threads, contacts, contracts, and resolved situation titles are recognized through generic legacy matching so campaign continuity is not duplicated during upgrade. No new Classic Traveller rules are introduced in this patch.

## v0.12.1 adventure threads and consequences

v0.12.1 adds persistent Adventure Thread and Contact Documents. Resolved situations can now add clues, update a current objective, create follow-up situations, introduce recurring named contacts, and create linked contracts. Campaign Document v5 and Campaign Bundle v4 carry contacts and threads forward while older campaigns migrate with empty continuity collections. The campaign header prefers an active thread objective after any immediate Situation, and `[ THREADS ]` opens the compact thread record with objectives, clues, contacts, and history.

The first authored continuity chain begins with Cinder's obsolete beacon and follows the navigator Carranza through Aster and Heliograph. Failed investigation rolls yield weaker evidence instead of automatically dead-ending the thread. Mara Venn, an Aster Scout archivist, can recur across related situations and may offer a paid Heliograph archival courier job. The thread deliberately treats Aurelia as a marginal clue rather than announcing a main quest. Personal combat remains out of scope.

## v0.12.0.4 chargen-record visibility fix

v0.12.0.4 fixes the completed-campaign detail layout so Service History and Generation Log remain hidden during normal campaign play and appear only when `[ CHARGEN RECORD ]` is selected. The shared `hidden` attribute is now enforced against layout classes such as `.two-column`, preventing display rules from accidentally overriding hidden detail panels. This is a UI-only patch with no Traveller rules or persistent-document changes.



## v0.12.0.3 activity-roll readability

v0.12.0.3 makes Activity Log checks visibly read as dice rolls. CHECK and rolled SITUATION entries render two boxed d6 results with an explicit `ROLL 2D` label, and their outcome is separated into a high-contrast result band: pale green for SUCCESS and pale red for FAILURE. Existing v0.12.0.x activity entries are still readable and legacy `2D a+b = total` roll text is recognized by the renderer. This is a UI-only patch with no Traveller rules or persistent-document changes.

## v0.12.0.2 operations action-strip usability

v0.12.0.2 keeps each Operations Desk tab's available actions directly below its tab header. PORT, TRADE, JOBS, and SITUATION actions no longer sit below a potentially long record; the record itself takes the remaining panel height and scrolls independently. This is a UI-only patch with no Traveller rules or persistent-document changes.

## v0.12.0.1 campaign UI pass

v0.12.0.1 reorganizes completed-character campaign play around a persistent status header and a larger Operations Desk. The header keeps character identity, current characteristics, six quick skills, current world/date, ship resources, and the most urgent active situation or contract visible. Characteristics and quick skills are clickable and use one small modifier dialog, defaulting the referee modifier to 0; rolls are recorded in the Activity Log. Situation skill checks use the same dialog while retaining their authored target and built-in DMs. Full Personnel, Ship, Campaign, System, Service History, and Generation Log records remain available as explicit detail views instead of permanently occupying the play screen. The Subsector workspace now gives 460-500px to navigation/operations because the 8x10 Traveller map is naturally portrait-oriented.

Standalone browser client for the original-universe Classic Traveller project.

The Classic Traveller rules engine lives in `../packages/classic-traveller-rules/`. Pure rules and document legality stay there; the browser renders state and legal actions. Original Sea of Suns adventure content stays under `traveller/campaigns/sea-of-suns/`; world-generation content remains under `traveller/world/`.

## v0.12.0 situations, patrons, and non-combat checks

v0.12.0 adds persistent Situation Documents to Campaign Document v4 and Campaign Bundle v3. Authored and procedural Sea of Suns arrival events can appear at port calls, Book 3 patron contacts use the printed patron and reaction tables, and accepted situations expose explicit choices in the Operations Desk. The browser uses a Graycloak once-per-port-call patron cadence rather than adding a waiting subsystem. Non-combat skill resolution is a clearly labeled Graycloak generalization of the Book 1 Electronics referee-check guidance. Personal and starship combat remain out of scope for this milestone.

## v0.11.2.1 operations-desk and state repair

This hotfix keeps Port Services, Commerce, and Contract Board in a tabbed operations desk beside the subsector map. Campaign Document v3 adds persistent speculative-lot purchase state, same-world speculative resale is rejected, contract deadlines reconcile when campaign time advances or a campaign loads, and time-consuming gas-giant refueling now persists campaign time together with ship state.

## v0.11.2 contracts and courier work

v0.11.2 adds a persistent Contract Document and port Contract Board. Accepted contracts are referenced by Campaign Document v3, stored in the local document registry, and included in Campaign Bundle v2 exports. Campaign Document v1 and Campaign Bundle v1 imports migrate forward with an empty contract list, preserving older saves.

Each port call exposes deterministic offers among reachable systems. Book 2-backed whole-ship charters use the printed two-week charter formula (Cr900 per cargo ton + Cr9,000 per high-passage berth + Cr900 per low berth), while Book 2 private-message work uses the 9+ availability check and an honorarium generated within the stated Cr20-Cr120 range. Priority courier packets, route-verification surveys, and fixed-fee small-lot deliveries are original Sea of Suns contract content.

Accepted small-lot delivery contracts occupy real cargo space. Whole-ship charters are exclusive and require empty commercial manifests; normal passenger/freight/speculative actions are disabled until the charter is completed. Navigation is also constrained to an exclusive charter's destination. Timely arrival completes matching contracts and credits the ship operating ledger; late arrival or missing required contract cargo fails the contract without payment. Contract events appear in the Activity Log.

## v0.11.1 commerce

v0.11.1 turns the existing port, ship-account, and cargo foundations into the first revenue loop. Selecting a reachable destination now exposes Book 2 passenger demand and distinct freight shipments for that route. The Type S has three passenger staterooms available after its one-person crew; high passage still requires a steward, and the standard Type S has no low berths. Accepted freight occupies the existing three-ton hold and pays Cr1,000 per ton on delivery. Passenger fares are settled into the ship account when the passengers reach their announced destination.

The current world also exposes one deterministic weekly speculative-trade lot using the Book 2 Trade and Speculation table, world-type purchase/resale DMs, the facsimile errata for corrected prices/quantities, optional broker DMs on resale, and Admin/Bribery sale skill DMs when present. Ton-based goods can be bought automatically subject to hold capacity and operating funds. Table entries sold as individual items (51-56) are displayed but not auto-loaded because the Book 2 table leaves their tonnage to the players/referee. Partial speculative purchases include the Book 2 1% handling fee. The printed Actual Value table spans modified results 2 through 15; the current engine resolves results outside that printed range to the nearest printed endpoint as an explicit Graycloak implementation policy.

Ship Document v3 adds a persistent passenger manifest and migrates v1/v2 ships forward. Jump departure now charges Book 2 life support for occupied staterooms/low berths, blocks route changes while passengers are booked for another destination, and automatically delivers matching freight and passengers after arrival. Navigation and Port Services retain the selective pale-yellow attention treatment for fuel, unpaid berthing, life-support funding, and other departure blockers. Commerce actions are written to the Activity Log.

## v0.11.0.2 state highlights

v0.11.0.2 adds selective state-dependent emphasis without changing Traveller rules or persistent schemas. The Navigation Plan highlights fuel requirement/availability and status only when fuel blocks a jump, while unpaid berthing and unrecorded fuel receive the same pale-yellow attention treatment in Port Services. Blocking messages beside the jump action are also emphasized. Normal/ready values remain visually quiet.

## v0.11.0.1 navigation UI

v0.11.0.1 is a presentation-only navigation pass. The subsector SVG now shows compact Scout and Naval base markers, the map has zoom-out / zoom-in / fit controls, and the Navigation Plan plus jump action sit in a left rail beside the map on desktop. At narrower widths the navigation rail moves above the map. No jump, fuel, commerce, campaign, or ship rules changed.

## v0.11.0 port operations

v0.11.0 builds on the persistent campaign, SVG Far Meridian subsector, Book 3 system records, and Activity Log with the first operational starport layer.

At the campaign's **current** system, PORT SERVICES now shows:

- starport and derived Book 3 trade classifications
- current ship fuel quantity/quality and local fuel service
- Scout-base free-fuel eligibility
- gas-giant skimming availability
- current berthing charge state
- cargo used/capacity and manifest count
- separate ship operating account
- recent ship ledger entries
- the active character's personal credits for comparison

The player can transfer credits from the character to the ship account, refuel to capacity when fuel is available, pay recorded berthing, and skim a gas giant with a streamlined vessel. These actions are written to the Activity Log where appropriate.

Ship Document v2 adds persistent operational state for fuel, cargo manifest, ship finances/ledger, and the current port call. v1 Ship Documents load through a migration path. Legacy fuel remains **UNRECORDED** rather than being guessed; refueling or skimming establishes the tracked quantity.

Jump actions now require recorded sufficient fuel. For the Type S, a one-week Jump-1 consumes 10 tons of jump fuel plus 5 tons representing one week of its four-week power-plant fuel allowance; Jump-2 consumes 20 + 5 tons. Arrival at a starport records the baseline Cr100 berthing charge, which must be settled before the next departure.

## Run locally

From the monorepo root:

```text
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/traveller/client/
```

## Existing systems retained

- complete Book 1 character generation
- gameplay Character Document v2
- source-backed Scout reserve-assignment rules
- Type S Scout/Courier Ship Document with stable ID
- persistent Campaign Document and portable Campaign Bundle
- true SVG 8-by-10 Far Meridian subsector map
- Jump-N range and seven-day jump travel
- authored UWP system/world records
- portable, filterable per-campaign Activity Log Document with referee notes

## Next gameplay layer

The commerce foundation supports passengers, freight, speculative cargo, contracts, patrons, situations, adventure threads, and personal encounters. Mail, crew salary calendars, annual maintenance scheduling, extended berthing days, low-berth revival for ships that actually carry low berths, and starship combat remain later milestones.
