# Gamma World 1e — v0.4.0 ancient technology lab

## Install and run

Extract the ZIP at the Graycloak repository root, replacing the previous Gamma World files. Only `gamma-world/` and `packages/gamma-world-rules/` are included. No other applications, root manifests, Firebase configuration or deployment workflows have been changed. No npm installation is required.

From the repository root (Windows Command Prompt):

```cmd
cd packages\gamma-world-rules
npm test
cd ..\..
py -m http.server 8080
```

Open `http://localhost:8080/gamma-world/` and hard-refresh (Ctrl+F5) if an earlier version was cached. The tactical page is also accessible directly at `http://localhost:8080/gamma-world/tactical.html`; it uses the transferred workshop character, then a saved workshop character, then a randomly generated PSH test character. Expected: **60 passing Node tests** (53 previous, 7 new), including two tests of the actual UI modules using a minimal DOM contract harness. JS syntax checks passed. Chromium HTTP navigation was blocked by the environment (`ERR_BLOCKED_BY_ADMINISTRATOR`), so visual/layout, pointer behavior and actual browser storage/export workflows still need local verification.

## Character workshop: fixed selected mutations

The previous UI derived *nothing* until all physical, mental and required defect slots were selected. The new `mutationSlots` function is shared by UI and validation. `previewCharacter` validates each filled slot and immediately recalculates from immutable base stats; `deriveCharacter` still requires every slot. The workshop explicitly shows Base HP, Mutation HP bonus, current/max HP, Natural AC and worn AC. Selecting Heightened Constitution adds twice CN to HP; Total Carapace sets natural AC to 4, reduces damage by half and movement to 75%. Neither benefit stacks from repeated rendering or save/load. Incomplete choices can be saved/exported and restored; tactical launch remains disabled. Completed choices may still be mechanically partial, as explicitly flagged. v0.2 workshop records keep version 2 for compatibility; construction records are not live game state. Phase 1 draft import path retained.

## New experimental character types

- **Intelligent Plant**: printed pp.15–17 list 42 plant/vegetable mutations for NPCs and recommend against player plants. This is an opt-in campaign extension, not RAW player creation. The six attributes and CN-based HP use ordinary character generation; baseline PC is assumed sapient, mobile, has human-equivalent senses and manipulation. Roll 1d4 plant mutation slots; use the printed percentile distribution (98–99 adds an extra mutation roll, 100 choose any) or select beneficial mutations. Selected method adds one plant defect when the initial count is 3–4 (extension). Plants use the plant table, not the humanoid/animal physical and mental tables. No additional mental mutation rolls for plant PCs yet. Duplicate features are flagged and do not grant extra baseline manipulation/movement. Carnivorous Jaws (one jaw), Electrical Generation (stored 4d6 charge, recharge 1d6 per round), Heat Generation, Sonic Attack, and Temperature Sensitivity have partial combat mechanics; baseline Mobility, Manipulation Vines and New Senses are recognized. Other plant entries are catalog-only, including daylight stasis, reproduction, advanced physiology and plant ecology. Current sandbox is a daylight clearing; no lighting simulation.
- **Robot**: experimental self-directed humanoid service chassis, uses the six ordinary attribute rolls and CN-based structural HP; no PSH +3 CH bonus, no biological mutation slots, no automatic Ancient human authorization. Normal weapon use and human-scale base movement, no biological poison/ordinary mental attacks, no natural healing, no fatigue; can move at trot/charge and fire (robots may move and fire in RAW p.19). Radiation damage to machines requires a referee ruling. Robot power sources, repair, chassis customization, security/control directives and parts economy remain pending. The book's actual robotic units are NPC equipment/creature designs (pp.38–41); the player chassis is a house rule, not a printed player character type. The generic MS/CH/CN fields remain in the prototype record to preserve the common schema; MS is not a usable psychic statistic for robots.

## Tactical sandbox

1. Generate/load a character, finish all required mutation slots and choose a weapon and armor. Click **Enter tactical sandbox**.
2. Select Badder, Ark or Arn and 1–3 opponents; New encounter resets the local test. The initial opponent setup and positions are test fixtures, not RAW encounter frequency or group sizes. Arn is treated as provoked. Initial surprise/first strike is determined on d6s, ties rerolled; after first round, side initiative uses d6 and +1 for DX 17–18. Tied initiative permits simultaneous counterattacks.
3. Click an opponent to target. Click highlighted terrain to preview a movement path, or choose stay in place. Change pace to normal, trot or charge. Select an action (weapon, supported mutation, rest, bind wounds, move-only, withdraw), then Execute round. Opponents choose targets and movement/attacks automatically. Each resolved round is ten seconds. Plan validation checks occupied squares, range, fatigue, cooldown and pace; invalid plans do not advance time. Clear move cancels a plan. Right-drag to pan; zoom buttons/ctrl-wheel; Fit resets view; Escape clears selection, T cycles enemies, R resolves a legal selected action. Keyboard commands ignore text-entry controls. The action bar persists throughout.
4. The Information panel keeps action guidance above Events/Chat. Events records dice, damage, initiative, movement, fatigue, morale, and combat results. Chat is local only. No Firebase or cross-client messaging. Draft flags remain visible under character coverage.
5. Victory/defeat/withdrawal ends the test; defeated opponents award their maximum HP as local XP. New encounter restores the original construction record. Damage, XP and MS growth are *not* written back to the workshop; local encounter state does not persist on refresh.

## Rules and coverage

Reference: supplied TSR 3002, 3rd printing (1981), printed pp.6–21, 22–23, 28–29, 37–42, 47. Printed p.21 fatigue matrix visually verified. Existing 98 physical/mental entries and earlier helper tests retained; 42 plant entries added. Individual mutation coverage is tracked, not blanket completion. This is a single-player rules sandbox; it does not implement every mutation, creature behavior or persistent game rule.

- Side-based first strike and initiative, including surprise immunities from implemented effects; movement and attacks resolved by half-rounds, with simultaneous turns when tied. Close dying stroke permitted only if overkill is strictly less than half previous HP and the actor has not acted. Zero HP means death after eligible dying stroke; no automatic resurrection. Simultaneous initiative permits both declared attacks even if a combatant dies first. First-strike DX handling uses the printed later-round +1 rule only after round 1; additional referee discretion on individual DX ordering is pending.
- Physical weapon Matrix I and natural Matrix II; damage by opponent size, modifiers, AC, target HP, mutation damage reductions; mental blast uses mental matrix, and separate tallies award +1 MS per five damaging attacks or successful defenses, capped at 18 for matrix compatibility. Mental attacks and physical attacks cannot be combined in one round. Increased Speed permits two ordinary weapon/natural/jaw attacks against the selected target, not two independently targeted actions. Physical heat/radiation mutation attacks use natural Matrix II as an explicit sandbox interpretation; contact electricity uses adjacency as a proxy for contact, sonic area affects nearby other actors. Radiation outcomes M/defect are logged as pending seven-day rulings, not permanently applied. Unsupported powers are not executable actions. Bleeding applies between rounds, binding and Total Healing are available if applicable.
- Fatigue follows printed p.21 onset values by weapon and worn armor, subtracts factor from weapon class, PS >15/rest offset; weapon class zero prevents attack. Does not invent an additional damage modifier where the matrix does not specify one. Combat rounds spent advancing/attacking count toward fatigue, rest provides recovery without banking arbitrary credit. Non-intelligent opponents below half HP roll d10 morale each round; fleeing removes them from this test. Intelligent morale circumstances are still GM-dependent. Withdrawal removes player immediately (sandbox policy; no pursuit yet).
- 3 m cells (rulebook p.5 suggests 3m building mapping), four-neighbor pathfinding, Euclidean target distances; normal human baseline 12m, trot 16m, charge 24m; movement before attacks in each side's half-round is a referee policy, not a universal tabletop rule. Ground movement only; scenery colors are decorative, not terrain blockers. No elevation, LOS, ammo, mounts, weapon ownership, shield encumbrance, area geometry beyond radius, or full pursuit/retreat simulation. Fatigue natural armor is excluded; worn armor table applies. AI plans from start-of-round positions and can lose a move/attack due to changed occupancy/range. Small opponent catalog has printed AC/HD/movement/attack data, unspecified attributes are sandbox defaults or rolls, and special abilities of Badder/Ark/Arn are not fully simulated.
- Previous rulings retained: better of natural/worn AC, provisional 3m melee reach, rounding down fractional damage reductions, multiple damage multipliers combine, 70kg default body mass, Total Healing rolling seven-day limit, ordinary weapon damage tuple choices for ambiguous ranges. Plant and robot PC rules are explicitly extensions; no MP rules dependency.

## Manual browser checklist

- Humanoid, player-selected mutations. Choose Heightened Constitution before other slots; bonus HP appears immediately. Choose Total Carapace in another physical slot; Natural AC becomes 4. Finish all required slots; save/load and export/import without duplicated bonuses. Try a partially completed draft: tactical launch remains disabled.
- Generate an Intelligent Plant, select plant mutations and finish any defect; choose Heat Generation or Carnivorous Jaws and enter tactical sandbox. Generate a Robot; mutation selection is disabled and no biological mutation slots appear. Robot can fight with an ordinary weapon.
- Launch an encounter as PSH or completed draft; verify map, target range, movement highlight, pan/zoom/fit, movement-only, melee and missile attacks. Check round time increases by 10 seconds, opponent AI, HP damage, end-of-encounter result, invalid range/charge and fatigue warnings, and chat/events tab switching. Test local chat and keyboard shortcuts while typing.

Next: finish mutation effects/creature behavior, then artifact identification charts, Ancient equipment, robots and security. Multiplayer and persistence remain separate milestones; GitHub Pages assembly remains unchanged. No public distribution licensing verified.

## v0.4.0
Save and Export are visible at the top of the character record and enabled for incomplete generated drafts. Local storage retains one slot, shared with v0.3; saving overwrites it. Load uses preview validation, not final derivation. Combat still requires all slots. Targeting selects the equipped weapon if the previous action was move-only or rest; the round is not executed automatically. Instructions and contextual action text explain that opponents act when Execute round is clicked.

Open `technology.html` from the workshop. Printed pp.30–31 chart A/B/C transitions are transcribed from the original page image; unnamed nodes have internal labels, and chart C's unlabelled start loop is inferred as 8–10. Adjusted rolls are clamped to 1–10 (explicit ruling). Five rolls per hour plus one per assisting character; Brain Talent divides time by three. Hazard resets the chart; harmful consequences require a referee decision. Identification can succeed with a broken artifact. Condition is hidden until attempted operation. The lab offers three sample devices, a laser pistol attack test with per-target armor deflections, four cell types as reference, four robot profiles, a credential check and repair demo. The latter uses a house rule of one HP per part. Credential recognition is simplified; no special electronic commands, reprogramming, wild behavior, broadcast power simulation, persistent artifact inventory, advanced weapon integration, actual charger operation or robot combat. A failed test operation consumes a charge as a local policy. No multiplayer. The workshop and technology lab are independent; lab outcomes do not change saved characters. Tests check chart topology and sample routes but are not an independent exhaustive verification of every printed arrow. Browser interaction has not been tested in a real browser in this release.

## v0.5.0 — Local campaign prototype

Install over v0.4.0. `npm test` in `packages/gamma-world-rules` runs all regression tests. Serve the repository root (e.g. `py -m http.server 8080`). Workshop: `/gamma-world/`; world: `/gamma-world/play.html`; standalone practice: `/gamma-world/tactical.html`; laboratory: `/gamma-world/technology.html`.

- Permanent Practice combat navigation works without finishing a draft; the practice page uses a previously transferred/saved valid character or a generated test survivor. The workshop's character-specific practice button remains disabled until required selections are complete. Save & enter world requires a completed living character. Save drafts at any time after generation. The roster stores separate named characters in `graycloak.gw.campaign.v1`; legacy single-slot Load remains supported. Select a saved name then Load saved. No delete/rename UI yet; same-name characters may be separate slots. The workshop updates the same roster ID until generating/importing a new character.
- World mode uses a small illustrative Eden Valley map, not the authored campaign map. E = Eden Valley, F = forest, A = Ancient outpost. Click to walk along a four-neighbor path; position is saved every step; green obstacle cells block movement. Stop cancels travel. Walking uses a fixed 180 ms per step for responsiveness, not a canonical game clock. Interact at a marked site; collect one supply bundle in town; investigate forest to enter combat; recover one unidentified laser pistol and one charged hydrogen cell at the outpost. Identify with the original Chart A state machine; install the finite cell; the laser then appears as a combat action. Artifact condition and remaining charges persist. Harmful identification results require referee adjudication. Inventory is basic, not a weight/trade/equip economy. No actual charger, additional cells, repair economy, or day/night simulation.
- Campaign combat resumes after reload or leaving the page. Each successful round records HP damage, XP, MS, mental resistance, bleeding, healing history, artifact charges and the unfinished encounter. Completed encounters clear the saved combat state. Practice combat remains isolated. Return to world using the header link. Editing a character with an active encounter is blocked. Local revision comparison rejects a stale round in another tab, but this is not a transactional multiplayer database. A completed forest encounter may be repeated; no encounter cooldown yet. A dead survivor cannot enter a new campaign encounter. Construction edits after combat retain existing damage/XP; full equipment ownership constraints and advancement policy are pending. The JSON workshop export is a construction record, not a portable backup of all campaign progress.
- Campaign combat includes a few obstacle cells that block paths and sampled center-line visibility. This is a simple ground LOS model; not a full visibility/cover/elevation simulation. Standalone practice retains the open map. Approach target chooses the nearest reachable destination, retains a legal attack when possible or selects move-only. Commit button changes label with the action; invalid plans explain the blocker. Opponents still act in the original round scheduler. Laser uses the v0.4.0 laboratory attack mechanics, including condition checks, charges and AC 1/2 deflections; other Ancient weapons are pending. No full mutation/creature coverage, party multiplayer, global time, or server authority.
- Use a local browser to verify workshop links, create two characters, save and load each, enter world, walk around blockers, collect supplies, investigate forest, approach a foe, resolve a round, reload and resume, return to world, verify HP/XP, recover and identify the device, install its cell and test laser shots in another encounter. Test that a practice fight does not change campaign progress. No other Graycloak applications or deployment workflows modified.

## v0.5.1 — Direct tactical controls and round scheduler

This section supersedes the old v0.3–v0.5 combat instructions above. Install over v0.5.0. No other applications or deployment configuration are changed. Run `npm test` in `packages/gamma-world-rules`. Serve the repository root and open `/gamma-world/tactical.html` for practice or enter combat from `/gamma-world/play.html`. Existing local character and inventory records remain compatible.

- Click a reachable tile to move the actual player token; each click consumes the shared per-round movement budget. There is no Approach Target, Clear Move or separate movement confirmation. Click an enemy to target, then Attack with the equipped weapon, or an available mental/mutation action. Throw is shown for weapons with a missile range; powers and binding controls appear only when relevant. End Turn advances the round; if no action was used it waits/rests, or counts movement-only when movement occurred. No generic defensive stance/parry modifier has been invented; AC, mental defense and existing mutation effects are automatic. Shift-click to trot, Ctrl-click to charge; the fastest pace used applies for the entire round. Normal movement highlights reflect current pace; modified clicks may reach farther. Biological missile/energy attacks (and the prior sandbox policy for certain ranged mutation attacks) cannot follow fast movement. A attacks; T cycles targets; R ends the turn; Escape clears target; text entry and repeated keydown events do not trigger these shortcuts. Right-drag pans; Ctrl-wheel zooms.
- New `beginInteractive`, `interactivePath`, `interactivePlan`, `interactiveCommand` API uses direct command revisions, persists movements and attacks as well as round transitions, and rejects already-spent actions. Enemy-first half-round runs before player input, including when an enemy-first round follows End Turn. Player-first attacks resolve on click; enemies respond on End Turn. Simultaneous attacks are declared on click and resolved on End Turn (NPC movement may change range); eligible killed combatants retain their declared counterattack. Dying strokes can be selected when an enemy-first hit kills the player but qualifies for one. The UI suppresses ordinary double-click End Turn events and repeated keyboard shortcuts. Existing v0.5.0 saved encounters without a turn record are opened at their stored round boundary; new mid-round records resume without rerolling already resolved actions. Practice is isolated. Local storage revisions are not a substitute for transactional multiplayer authority.
- Parley is a limited opening-encounter prototype: printed p.18 permits negotiation when combat is not automatic; printed p.7 provides a 2d6 reaction table with Charisma and cross-species modifiers. The automated-referee policy offers Parley only before movement/attack, in round 1 when the player has first strike, for biological characters meeting Badders (limited trade speech). A modified 9+ permits peaceful departure, 6–8 hesitation without agreement, 2–5 rejection; an unsuccessful attempt spends the player's action. No repeated rerolls, no XP for peaceful passage. Other creatures, surrender and full dialogue are not implemented. This is an explicit provisional encounter ruling, not a universal RAW parley check.
- Movement-before-attack ordering, 3m melee reach and other existing prototype rulings remain. The player may not move after their attack. Retreat remains immediate withdrawal from the sandbox, not pursuit. Simultaneous movement and area effects remain simplified. Unsupported mutations, expanded creatures, multiplayer, authored world maps, and comprehensive terrain/cover remain pending.
- Manual browser checks: enter practice combat; move by two clicks and verify remaining movement; click a target and attack only once; end the turn, observe enemy-first and simultaneous rounds; try blocked movement/attack, throwing, fast movement and a mental power. Try Parley only when offered; test save/reload after a move or attack before End Turn in campaign combat. Verify no repeated enemy-first action on resume, no XP/HP changes from practice, and Events/Chat remain accessible. Automated DOM contract tests and rule tests are included; real Chromium navigation is blocked by the execution environment, so visual/pointer behavior is not verified here.

## v0.6.0 — Unified local campaign and development lobby

Install by extracting the release at the Graycloak repository root, overwriting the previous Gamma World files only. Existing `graycloak.gw.campaign.v1` records and workshop saves are retained. Export important character records before upgrading. Start the static server at the repository root (`py -m http.server 8080`); open `http://localhost:8080/gamma-world/`, create or load a completed survivor, and select **Save & Enter World**. Alternatively open `/gamma-world/play.html` and select a saved survivor. No npm install is needed for the local game.

### Unified game flow

- Campaign combat mounts the same tactical renderer and half-round scheduler in the local world page rather than navigating away. The world map is detached while fighting and reattached on return. The Information panel and local chat remain mounted. **Pause encounter** returns to the map without permitting further travel; **Resume encounter** restores the same committed state. Completed encounters show **Return to exploration**. Practice combat remains independent.
- Persistent Character, Inventory and Journal controls open modal dialogs. Equipment can be equipped from owned stock outside encounters. Combat keys are disabled while a modal is open. Local chat retains the latest 100 messages across reloads; it is not network chat. The event feed remains in memory during world/combat transitions; prior fight logs can be reconstructed on reload/resume.
- Map movement remains click-to-walk with obstacle-aware routing. World zoom, fit and right-drag pan are available. Combat uses v0.5.1 direct movement, direct attacks and End Turn; Approach Target and the round-planning controls remain removed.
- Eden Valley now has a prototype trader named Mara, two dialogue topics, a shop, and rest/repair services. Standard trade categories are based on printed rulebook p.37 (50 domars for standard cut/thrust weapons or shields, 75 for bows, 100 for crossbows, 300 for armor, 5 for traveling supplies). The starting purse (100 domars), half-price resale, individual stock choices, 5-domar spare parts and one-part-per-HP repairs are **house policies**. Rest is 1 HP per day (p.37); no natural healing for robots. The economic model does not yet include ammo, barter, trade stock limits, food consumption, or player-to-player trade.
- Entering the world initializes a character's purse and owned equipment. Once a character begins adventuring, the workshop cannot rebuild their attributes, mutations, weight or equipment; use Inventory to equip purchased/owned gear. New characters and draft saves still work. Previously saved adventurers migrate on entering the world. Old inventory, injuries, experience and encounter state are retained; no existing storage key is deleted. Local storage is not cheat-resistant or a safe multi-tab transaction store.
- Forest clearing is a one-time victory/peaceful-resolution site; withdrawal does not clear it. Wilderness travel has a provisional 15% chance per eight movement cells to produce a single Badder or Podog encounter (not the original wilderness encounter frequency/table). The pending encounter is saved before mounting combat. This is a small prototype local map, not yet the authored Eden Valley geography. The original repository's `gcc/gw-authored.js` contains terrain, hazard, subhex, territory and annotation stores, but no text match for Eden Valley; its base `gw-terrain-data.js` is derived from the 3e Meriga map. A location/coordinate mapping is still needed; no existing GCC content was copied or changed.
- Podog (printed p.26) and Brutorz (p.23) profiles join Badder, Ark and Arn. Podog has AC 5, HD 4, movement 15, 2d6 natural attack, poison immunity, and an opening first-strike policy based on its cry. Single wild Podog encounters are a prototype choice; pack behavior, training and rare dual brains are not implemented. Brutorz is practice-only (AC 7, HD 14, movement 18, MS 12, 3d6 bite); kicks, precognition and mounts remain pending. Other existing creature and mutation limitations remain.

### Optional Firebase emulator lobby (developer-only)

This is a separate, opt-in development experiment. It does **not** connect to the existing Graycloak Firebase project. It supports Firebase Auth test accounts and callable, authenticated lobby chat with server-generated timestamps, idempotent message commands, message validation and a simple per-user rate limit. The local campaign is not uploaded to the lobby. No multiplayer movement, server-authoritative combat, shared world, cloud character roster, production hosting configuration, or live chat inside the campaign has been deployed. The emulator UI has not been integration-tested in this environment; only the pure lobby validation tests have run.

Prerequisites: Node 22, Firebase CLI and Firestore emulator Java requirements. From the repo root:

```cmd
cd gamma-world\functions
npm install
npm test
cd ..
firebase emulators:start --project demo-graycloak-gw --only auth,firestore,functions
```

Run the normal static server separately from the **repository root**. Then open `http://localhost:8080/gamma-world/lobby.html`, choose Connect, and create disposable test accounts (do not use real passwords). Use separate browser profiles to test simultaneous accounts. Auth emulator port 9199, Functions port 5101, Firestore port 8180, Emulator UI port 4400. The browser loads Firebase SDK modules from Google's CDN when connecting; internet access is required for those imports. Do not run `firebase deploy` with this config, particularly against the real Graycloak project. The included Firestore rules are deny-all for the isolated demo project; the callable uses the Admin SDK in the emulator. The function also rejects requests outside the emulator. Existing production rules, Functions source and deployment pipelines remain untouched.

### Tests

From the repository root:

```cmd
node --test packages/gamma-world-rules/test/*.test.js
node --test gamma-world/functions/test/lobby.test.mjs
```

82 local game/rules tests (75 previous + 7 new), 3 pure lobby tests. JavaScript syntax checks run independently. The actual browser navigation smoke test was attempted but Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR`, even with local request interception; the embedded tactical mount was exercised through the simulated DOM test. Live SDK, emulator, browser visual layout and end-to-end mouse interaction still need local testing. No generated browser screenshots are included.

Suggested manual tests:
1. Load a saved survivor, click Visit settlement, speak to Mara, buy a dagger, equip it in Inventory. Verify purse, gear and HP after reload.
2. Walk to the clearing and investigate. Confirm the URL stays on play.html, Information/Chat remains present, and the familiar direct combat controls work.
3. Open Character and Inventory in combat. Verify equipment is locked and keyboard combat shortcuts do not execute while a dialog is open.
4. Pause, resume, refresh, and resume again. Check current round, movement and HP. Win or negotiate, return to exploration and verify cleared site cannot repeat. Withdraw from a fresh encounter and confirm it can still be investigated.
5. Test a robot with damage: buy parts and repair; biological rest is rejected. Check a living non-robot heals one HP per day when resting in the settlement.
6. Walk around the wilderness to exercise an incidental encounter. Recover/identify the outpost artifact and test the existing laser combat flow.
7. Optional: use two emulator test accounts to send/receive lobby messages, sign out, and reject empty or excessively long messages.

Further roadmap: verify the unified browser flow; connect actual authored Eden Valley coordinates/maps; improve movement/terrain/encounter fidelity and mutation coverage; move local command adjudication to authenticated authoritative game services; integrate multiplayer Information-panel chat and persistent world state. Do not deploy the development lobby as a production MMO.

## v0.6.1 — Player action system

- Shared pure `actions.js` registry returns visible/enabled/reason and the combat command. Combat buttons and keyboard shortcuts dispatch through the same policy, with the encounter engine revalidating commands. Existing movement, turn scheduling, campaign saves and v0.6.0 lobby remain unchanged.
- Owned, supported active abilities get numbered buttons instead of the mutation dropdown. Arrange abilities moves a power earlier in the saved local order (browser-wide preference, not a per-character build). Disabled powers retain position and display the reason via tooltip; the Information panel still explains attack availability. Passive and unsupported mutations are not assigned action buttons. Keyboard 1–9 uses the same order. A attacks, R or Space ends turn (Space on a focused button retains native behavior), T targets the hovered opponent or cycles if none is hovered. Existing click movement and target selection remain. No generic Defend action.
- Exploration actions are contextual: settlement, clearing, outpost, supplies, resume and stop appear when relevant. Artifact Examine, Experiment and Install cell are now in Inventory. Character, Inventory, Map and Journal are persistent tools; Map currently lists local sites and coordinates, not a regional travel map. C/I/M/J open tools; Enter focuses chat from non-button controls. Text entry suppresses gameplay shortcuts. Equipment restrictions and original artifact validation remain in place.
- Not implemented in this release: full route/search time progression, sleep/fatigue across travel, recruitment/hirelings, surrender, right-click object menus, general artifact operations, complete mutation activation/defense catalog, online campaign play. Existing Parley policy unchanged. No new original rules or house-rule combat mechanics introduced. Existing saves use the same schema. No other Graycloak apps modified.
- Tests: `node --test packages/gamma-world-rules/test/*.test.js` (86), `node --test gamma-world/functions/test/lobby.test.mjs` (3). Browser mouse/visual testing remains manual. Manual checks: PSH toolbar has no mutation slots; mutant with Mental Blast has a numbered slot that remains disabled after attacking; arrange abilities and reload; type A/T/R/1 in chat without triggering combat; walk to settlement/clearing/outpost and check contextual controls; experiment on recovered device from Inventory; pause and resume combat; verify previous roster and equipment are unchanged.

## v0.6.2 — stabilization

Extract over v0.6.1 at the repository root. Run `npm test` in `packages/gamma-world-rules` (92 tests) and `node --test test/*.mjs` in `gamma-world/functions` (3 lobby tests). Local pages are unchanged. Existing saves remain readable; new workshop generations persist referee-assigned defects and the Genius Capability subtype roll. Legacy generations retain their original choices rather than silently changing an existing character. Newly selected duplicate mutations are rejected conservatively; repeated random mutations and special repeatable mutation rulings remain for a later audit.

- Artifact operation now determines functioning once, including when a hazardous experiment triggers that determination. Persist `functioning`; failed operation consumes no charge. Older artifacts lacking the field get a new determination on first relevant operation. Printed pp.30–31 do not define adjusted rolls outside the chart ranges: referee policy is below 1 follows the lowest branch, above 10 remains at the current node. The raw adjusted result is retained. Chart C's unlabeled start loop remains an inferred 8–10. Review of the printed page confirmed the encoded graph structure; no exhaustive independent transition proof is claimed. Restart research from Inventory, or have Mara lead research in town (IN 12 with the player assisting, a prototype NPC service). Identification does not guarantee functionality; no artifact repair mechanic added. Scientific Genius modifier is applied to new workshop characters whose persisted d6 subtype roll is 3–4; legacy Genius subtype and other Genius effects remain pending.
- Strength/precision bonus dice are d6; morning star against man-sized targets uses 2d4. Contact electrical attacks by ordinary mutants now require a successful natural-matrix contact roll as a referee policy. Plant electrical contact is still the existing separate mechanic. Printed rules do not specify a contact attack procedure. Diagonal tactical steps cost actual distance; cannot cut occupied/blocked corners. Adjacent diagonal melee is allowed as a grid abstraction (up to 3√2 meters); range checked before sight. The hover movement preview displays a legal path/distance or a red unreachable square; a full drag ruler is not implemented. World movement remains the existing local path system.
- HUD/action bars now use normal flow, not overlapping fixed/sticky positioning. Reachable cells and blockers have stronger contrast. Named sites replace letter-only markers. Enemy exact HP and AC are removed from tactical tokens and target HUD; newly generated damage messages omit enemy HP totals, but old saved logs and internal local state may contain them. No GM view or security boundary is implied. Readable initiative log wording; unfinished mutation status labels removed from selection dropdowns, but coverage warnings remain in character records.
- Settlement Rest Until Healed uses ordinary one-HP-per-day rest and persists elapsed days, rather than claiming an implemented route/world calendar. Existing robot repair rules remain. Removed provisional 15%-per-eight-squares wandering rolls; keyed encounters still work. Original route clock, encounter frequency, advancement, followers, party combat, auto-fight, pursuit, intelligent morale and creature abilities remain v0.6.3 or later work.
- JavaScript and CSS working sources reformatted using syntax-aware tools; large data literals and HTML templates may still contain long lines. No production Firebase, deployment or other Graycloak files modified.
- Verification: 92 game tests and 3 lobby tests passed, JS syntax checks passed. Chromium headless navigation timed out after GPU initialization errors in this environment; no visual browser validation or screenshot is claimed. Check desktop 1440×900 and mobile layout locally, including the action bar, hover movement, inventory restart/research, and saved-character compatibility.

## v0.6.3 — player shell and navigation

Start at `gamma-world/index.html` (Survivors). Continue selects the exact roster record and opens Play; pending encounters mount automatically. New survivor launches `create.html`, a five-stage wizard reusing the existing rules controller. PSH and robots skip mutation selection. A rolled draft is locked to its type/attribute generation; start a new survivor to change those choices. Save draft is separate from Begin Adventure. Named draft records can be resumed without rerolling, and finishing updates their original ID. Explicit drafts cannot enter Play. Rename/delete are roster operations; delete requires confirmation. Exports remain version-2 **construction** files, not full campaign backups; import adds a separate record. Old legacy construction is imported once if the roster is empty; a nonempty roster takes precedence to avoid recreating stale copies. No campaign schema migration required.

All pages share Survivors / Play / Rules Lab navigation. `lab.html` links to `workshop.html` (the old workshop including test controls), `practice.html` (explicit character chooser), `technology.html`, and `lobby.html`. Direct `tactical.html` without a transferred record uses a generated test survivor, not the last workshop save. Practice transfer is consumed on entry. Rules Lab is not permission-restricted yet.

`play.html` retains embedded tactical combat, local persistence and existing controls. Character/Inventory/Map/Journal now open a collapsible sidebar utility pane; NPC trading/dialogue still uses a dialog. Events and local chat remain separate visible feeds; Expand map temporarily hides the sidebar, including chat. The action bar is in normal page flow, not fixed over the HUD. Map controls and HUD remain compact rows rather than actual map overlays. The local map utility is still a location list. No draggable sidebar resizing or new campaign mechanics in this release. Autosave is the existing local persistence behavior, not cloud synchronization. The creation page retains hidden controller elements so the existing workshop module can be reused; no testing controls are exposed to players there.

Validation: 98 game tests and 3 lobby tests passed, including legacy migration, roster state/rename/delete, shared navigation, wizard draft/finish and existing embedded combat tests. Chromium headless HTTP attempt timed out (exit 124); no actual browser layout verification. Test the roster, wizard, Continue/Resume, sidebar tools during exploration and combat, chat focus, and 1440x900/mobile layouts locally. The rules, creature catalog and multiplayer foundation are unchanged; followers/party combat are planned for v0.6.4.

## v0.6.4 — play screen fit and polish

Extract over v0.6.3 at the repository root. No save or schema changes; no rule changes beyond one new helper.

- Play screen fits the window on desktop (wider than 900 px, taller than 620 px): the map takes the leftover height, so the HUD and the contextual action row are always in view. Smaller windows keep normal page flow. The world map is centered and fitted on load and on resize.
- World sites show a name tag above the square instead of wrapped text inside it.
- Tactical tokens show only the glyph. An enemy's wound state appears as a caption on the selected or hovered enemy and stays in the target HUD; the survivor's HP stays in the HUD. Reachable squares use a softer tint.
- Side panel: Events and Chat are tabs again, the redundant "Information panel" heading is gone, and the Character/Inventory pane can use more height.
- Inventory disables Experiment and explains why when the survivor can no longer identify a device (new `canIdentify` in `technology.js`, a reachability check over the printed chart with the survivor's modifiers). Restart and Mara-led research are unchanged.
- The creation wizard clears a stale error as soon as a selection changes. Damage log lines no longer have a stray space.
- Verified in headless Chrome at 1440×900 and 390×800: roster, wizard, exploration, embedded combat, inventory. 99 game tests and 3 lobby tests pass.

## v0.6.5 — MMO-style shell

Extract over v0.6.4 (or v0.6.3) at the repository root. No save or schema changes and no rule changes.

- `index.html` is now Character Select: the character list with Create New Character and Import, a large preview of the selected character (attributes, HP, AC, gear, mutations), and one Enter World button. Rename, Export and Delete Character act on the selected character. Drafts show Resume Creation; dead characters cannot enter. Practice combat is reached from the Rules Lab.
- `play.html` is the in-world screen. The viewport fills the window. Floating over it: the character frame and target frame (top left), a World map / Local map / Scene switch (only Local map exists; the other two are disabled), a minimap of the local area (top right), zoom buttons (bottom left) and the action bar (bottom centre). The top row has Character, Inventory, Map, Journal, Hide panel, Rules Lab and Character Select.
- The sidebar has Chat, Events, Party (disabled until followers exist) and Bag tabs. Chat is the default and carries system lines, world events, the player's messages and NPC dialogue. Talking to Mara posts her lines in chat with reply buttons (forest, ruins, Trade, Rest one day, Rest until healed, or Repair for robots). Events holds the full log including combat rolls; the sidebar switches to Events when combat starts and back to Chat afterwards.
- Inventory opens the Bag tab. Character, Map, Journal and Mara's trading post open in a floating window over the viewport. No modal dialogs remain in play.
- Embedded combat uses the same overlays: the tactical HUD becomes the frames, round information sits top right, and the tactical action bar takes the bottom-centre slot. `tactical.html` on its own is unchanged.
- New `mmo.css` styles both screens; `play.html` no longer loads `world.css` or `shell.css`. Shared navigation on the other pages now reads Character Select / Play / Rules Lab.
- Verified in headless Chrome at 1440x900, 1280x720 and 390x800. 99 game tests and 3 lobby tests pass.

## v0.6.6 — repeat attack, drag to move, map scale

Extract over v0.6.5 at the repository root. No save, schema or rule changes.

- Repeat attack: a Repeat toggle in the combat action bar (key Q, remembered in this browser). When on, attack once and the same attack is used on the same target every round, ending the turn for you, about half a second per step. It stops when the target drops, the attack becomes illegal (range, fatigue, no charges), the survivor starts bleeding or falls to a third of maximum HP, or the player clicks the map or presses Escape. It never picks a new target.
- Drag to move: drag the survivor's token in combat. The path lights up and a ruler by the pointer shows distance against the remaining allowance, turning red when the square is too far or blocked. Shift and Ctrl still select trot and charge. Clicking a square still works.
- Map scale: a scale bar (6 m, two squares) sits at the bottom right of the world map and the combat map and resizes with zoom.
- Leaving play: the top-right button now reads Exit to Character Select, and the GAMMA WORLD title in the top row is also a link back.
- Verified in headless Chrome at 1440x900. 99 game tests and 3 lobby tests pass.

## v0.6.7 — fatigue made visible, clear way out of a fight

Extract over v0.6.6 at the repository root. No save, schema or rule changes; the printed fatigue matrix was already enforced.

- Fatigue is now shown. The movement/action frame reads, for example, "Fatigue −2: weapon class 3 → 1". When the factor reaches the weapon class the Attack button reads "Too tired to attack", End Turn reads "Rest (End Turn)", and the guidance line says how many rounds of rest are needed. Before this the button was simply disabled, which looked like an enemy that could not be killed.
- Repeat rests for you: when the repeated weapon attack is blocked only by fatigue, Repeat ends the turn without moving and resumes the attack when it is legal again. Its other stop conditions are unchanged.
- End of fight: a banner in the middle of the map states Victory, Defeat, withdrawal or a peaceful parting, with experience and HP, and one button to return to exploration (New encounter on the practice page). The action-bar Return to exploration button remains.
- The pause button is now labelled "Leave (pause fight)".
- Verified in headless Chrome at 1440x900. 99 game tests and 3 lobby tests pass.

## v0.6.8 — reaction rolls, intelligent morale, experience

Extract over v0.6.7 at the repository root. Existing saves load unchanged; an encounter already in progress keeps its old behaviour until it ends.

### Printed rules now in play
- Reaction table (p.7): 2d6 with the Charisma reaction adjustment and the character-type adjustment; 2 extremely hostile, 3-5 hostile, 6-8 uncertain, 9-11 friendly, 12 enthusiastic. An offer adds 1 (the book's normal limit).
- Morale (p.21): intelligent beings stay on 3 or better on d10 and must keep checking each round once a check has been called for.
- Experience (pp.41-42): hit points of each foe killed (already present); the listed value of an artifact once it is correctly identified (laser pistol 1,000, hydrogen energy cell 150); a d10 roll on the bonus matrix each time the total reaches 3,000, 6,000, 12,000, 25,000, 50,000, 100,000, 200,000, 500,000, 1,000,000 and each further 1,000,000. An attribute already at 18 gains nothing and is not rerolled.

### Automated-referee policies (not printed rules)
- Every creature in the catalog gets the reaction roll except the Ark, which attacks as its entry says. Badders and Brutorz can be spoken with, so the Charisma and character-type adjustments apply and the player may make offers. Podogs and Arns cannot, so their roll is unadjusted and made by the referee at once: 9 or more and they move off, 6-8 and they watch, 5 or less and they attack.
- When: at the start of an encounter. With creatures that can be spoken with, if the player holds the first-strike option nothing happens until the player chooses Talk, Offer a gift and talk (10 domars, +1), Attack or Back away. If the creatures hold it, the referee rolls their reaction at once.
- Results: 9 or more ends the encounter in peace (and settles the forest clearing). 5 or less means they attack ("may attack" in the table is read as does), and as printed no further attempt can be made; if the player was the one talking, that used the player's action for the round. 6-8 is a standoff. The printed bar on further attempts covers only the hostile results, so after an uncertain result the player may roll again, each time with a fresh offer of 10 domars at +1; any of those rolls can turn hostile. Backing away from a meeting is free and does not settle the site.
- No movement during a meeting, so the player cannot walk up to a waiting creature and then strike first.
- Intelligent morale triggers: below half hit points, or half or more of their side down. A creature that flees gives no experience. Legacy callers of `createEncounter` get neither meetings nor intelligent morale unless they pass `meeting: true` and `intelligentMorale: true`; the play and practice pages pass both.
- The hydrogen cell is named when found, so its 150 experience is awarded on recovery. An artifact's experience is awarded on identification whoever led the research.
- Experience bonuses: Mental Strength gains are stored with combat progress; other gains are applied when the character is loaded. Constitution gained this way does not reroll hit points. The to-hit bonus applies to weapon attacks; the damage bonus adds 1 per die rolled with ordinary weapons.
- The Character window lists experience, the next bonus total and bonuses earned.

Verified in headless Chrome at 1440x900. 108 game tests and 3 lobby tests pass.

## v0.6.9 — scenes: Eden Valley map, region map, exits and a clock

Extract over v0.6.8 at the repository root. Older saves load: a survivor saved before scenes is placed at the trading post in Eden Valley the next time it enters the world (one caught mid-encounter moves after the fight).

- `scenes.js` defines scenes. A scene is a background image, a square travel grid over it, the cells that cannot be entered, its sites, and exits to other scenes. Each scene carries its own scale (`cellMeters`) and travel time (`minutesPerCell`).
- Eden Valley (`maps/eden-valley.webp`, the supplied map): 200 m squares, 6 minutes a square. The wall polygon follows the towers marked T; everything outside it is closed. The Valley gate at the south-east tower leads out. The trading post (Mara) sits at map key 2 as a placeholder until the key is supplied. Lakes and the river do not yet block movement.
- Eden Valley region (`maps/eden-region.webp`, cropped from a screenshot of the GCC campaign map at 3 miles a hex): 3-mile squares, 4 hours a square, which is one route-movement turn. The Forest clearing and Ancient outpost now sit on this map as placeholders. The image still carries GCC labels, a party marker and a selection outline; it should be replaced by a clean export. The square travel grid does not follow the hexes, and terrain does not yet change the travel rate.
- Leaving and entering: stand on an exit and the main action reads Leave Eden Valley or Enter Eden Valley. The trail at the top of the viewport (region > valley) shows where you are; clicking the outer name walks you to the way out. The Map window lists the scene's sites with Walk there.
- Clock: day 1 starts at 06:00. Walking adds the scene's minutes for each square, resting adds whole days, and the top row shows day, time and period. Night has no effect yet, the book's requirement to rest two route turns in six is not enforced, and wandering encounter checks are not rolled.
- The minimap and the scale bar read the current scene. The view opens framed on the walkable part of the scene.
- Fights still use the generic forest-clearing board. Battle maps chosen by terrain, and fights inside small scenes, come later.
- Verified in headless Chrome at 1440x900. 114 game tests and 3 lobby tests pass.

## v0.6.10 — Eden Valley key, working first laser

Extract over v0.6.9 at the repository root.

- Eden Valley sites now follow the referee's key: Ape Village, Complex entrance, the two bridges, and the Rats, Bears, Badgers, Reptiles, Cats, Rabbits and Dogs. They are landmarks to walk to; nothing happens there yet. The painted map's numbers run one higher than the key (painted 2 is key 1, Rats) and its "I" is read as the Ape Village. The painted "F" is not in the key and has no site.
- The trading post moved from the Rats' site to a placeholder beside the Valley gate.
- Referee ruling: the laser pistol found at the Ancient outpost always functions. Other artifacts keep the printed condition roll. A pistol already found in an existing save keeps its rolled condition.
- Ancient weapons are not sold; the trading post stock was already limited to primitive arms, armour and supplies.

## v0.6.11 — the country outside the valley comes from the campaign map

Extract over v0.6.10 at the repository root. `gamma-world/maps/eden-region.webp` is no longer used and can be deleted.

- `world.js` loads the GCC Gamma World map's own scripts (`gcc/gw-authored.js`, `gw-terrain-data.js`, `gcc-rng.js`, `gw-subhex-data.js`) and builds the region scene from them: a 31 x 23 window of 3-mile sub-hexes centred on Eden Valley, with authored and seeded terrain, rivers, roads, trails and named places. Nothing is copied; re-baking `gw-authored.js` changes the game's map too. In a browser that has working map edits in localStorage on the same origin, those are used as well.
- Eden Valley is found by a marker named "Eden Valley"; the committed map has it as an unnamed village at world (456, 279), parent hex 15,7, which is the fallback.
- Scenes can now be hex grids (flat-topped, odd columns half a hex lower, as on the campaign map). Movement is hex to hex, 3 miles and 4 hours a hex. Water hexes are closed. Terrain does not yet change the travel rate.
- Shown on the region: cities, towns, villages, fortifications, ruins, robot farms, monasteries and installations. Lairs and vaults are not shown. There is no fog of war yet.
- Placeholders: the Forest clearing is the nearest wooded hex at least three hexes from the valley; the outpost search happens at the nearest named ruin.
- The game needs the `gcc` folder beside `gamma-world`. Without it the valley still plays and the gate reports that the country beyond is unavailable.
- A survivor saved on the earlier square-grid region is put back at the Eden Valley hex.
- 116 game tests and 3 lobby tests pass; the region tests run the campaign map scripts directly.

## v0.6.12 — random encounters at route movement

Extract over v0.6.11 at the repository root.

- Printed procedure (ENCOUNTERS): while travelling on the region map the game rolls one d6 each day and one each night; a six is an encounter. A d12 then sets the hour of that day or night, and when that hour is reached a d20 is rolled on the ENCOUNTERS TABLE for the terrain of the hex the survivor is then in. Every roll is written to Events.
- The tables, numbers appearing and creature statistics are read from the campaign map's data (`gcc/gw-encounter-data.js`, `gcc/gw-creatures.js`); the game keeps no copy. Rules are in `packages/gamma-world-rules/wandering.js`.
- Table choice follows the map data: a ruin, vault or fortification in the hex uses Ruins, a radiation hazard uses Radioactive Zones, otherwise the terrain. Terrain kinds missing from the map's lookup (heavy forest, snow mountains) are read by family.
- Referee policies: day is 06:00-18:00 and night 18:00-06:00; the "appropriate die" for the time is a d12; if travel begins after the rolled hour the encounter happens on the first hex; checks are made only on the region map, not inside the valley; numbers appearing use the map data's defaults and at most 8 take the field.
- Playable now (hit dice, ground movement and a physical attack in dice): Ark, Arn, Badder, Blight, Brutorz, Cal Then, Fen, Herkel, Horl Choo, Obb, Parn, Pineto, Podog, Rakox, Sep, Soul Besh, Yexil. Each meets through the reaction roll as before. Their other powers (lasers, radiation, poison, mutations) are not played yet and are named in the Events line.
- Not playable yet, so reported and avoided with no roll or reward: creatures whose attacks are poison, radiation or technology, rooted plants, Androids, Robotic Units, Tribesmen and Cryptic Alliances.
- The combat engine accepts a creature definition and up to 8 opponents when one is supplied; the built-in creatures keep their limit of 3.
- 118 game tests and 3 lobby tests pass.

## v0.6.13 — poison and radiation attacks

Extract over v0.6.12 at the repository root.

- Creatures now deliver poison and radiation, read from `gcc/gw-creatures.js` and resolved on the game's existing poison and radiation matrices (intensity against the victim's poison or radiation resistance). Each result is written to the combat log with both numbers.
- Poison on a hit: Horl Choo (3d6 and intensity 9), Soul Besh (1d6 and paralytic intensity 18). Poisoned touch with no other damage: Serf claws (intensity 8), and the water creatures Fleshin (15) and Ert (12, D turns the victim to stone). A miss delivers no poison. Podogs and robots stay immune.
- Radiation: the Blaash has no attack roll; when it acts, everyone within 5 m is exposed to intensity 18. It closes to that distance instead of to melee.
- Newly playable from the tables: Blaash, Serf, Ert, Fleshin (20 creatures in all).
- Referee policies, because the game has no antidotes and no companions yet: a D on the poison matrix is death; a D from a paralytic poison paralyses, and a paralysed lone survivor is killed (the Soul Besh's 12 hit points a turn blood drain is named in the log); radiation results of mutation or defect are recorded as due in 7 days but not yet applied.
- To verify against the book: on the game's radiation matrix, intensity 18 is D for every resistance from 3 to 18, so a Blaash at 5 m kills or leaves a defect in any character.
- Still not played: Obb radiation blast and Zarn spit (no usable range or movement in the data), contact poison from touching Herkel or Win Seen, Perth and Barl Nep (rooted or water), radiation from hazard hexes on the map.
- 119 game tests and 3 lobby tests pass.

## v0.6.14 — antidotes, radiation mutations after a week, wider practice combat

Extract over v0.6.13 at the repository root.

- The radiation and poison matrices are now tested against the printed charts in all 256 cells each (`test/matrices.test.js`).
- Antidotes (POISON MATRIX text): on a D the victim has 2 melee rounds. The antidote for that intensity is certain; any other works 50% of the time, plus or minus 10% for each level it differs. If it works the victim takes 2d6. In a fight, a poisoned survivor gets an Antidote button for each intensity carried, showing its chance; using one takes the round's action, and a failed one can be followed by another. A survivor carrying no antidote dies at once, as before. Used antidotes leave the bag.
- Referee policies: the trading post sells antidotes for intensities 8, 9, 12, 14, 15, 16 and 18 at 30 domars each (which exist and the price are placeholders); a paralysed lone survivor still cannot take one.
- Radiation (RADIATION MATRIX text): an M, or a D survived on the 20% roll, is filed when the fight is saved and appears one week of game time later as a mutation or a defect, announced in Events and added to the character with its effects. Referee policies: the chart (physical or mental) is a coin toss; plants use the plant chart; a result already held is rerolled; a defect is drawn evenly from that chart's defects. Pure Strain Humans and robots have no chart in the game, so the result is reported as needing a ruling.
- Practice combat (Rules Lab > Practice combat, or `/gamma-world/tactical.html`): the opponent list now holds every playable creature from the campaign bestiary with its attack, numbers go to 8, "Hostile" skips the reaction roll, and "Antidotes carried" takes poison intensities. Practice changes nothing in the campaign.
- The combat engine takes up to 8 opponents for every creature.
- 124 game tests and 3 lobby tests pass.
