# Graycloak Traveller

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
