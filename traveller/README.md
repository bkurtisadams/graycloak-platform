# Graycloak Traveller

Standalone browser client for the original-universe Classic Traveller project.

The Classic Traveller rules engine lives in `../packages/classic-traveller-rules/`. Pure rules and document legality stay there; the browser renders state and legal actions. Original Sea of Suns content stays under `traveller/world/`.

## v0.11.2 contracts and courier work

v0.11.2 adds a persistent Contract Document and port Contract Board. Accepted contracts are referenced by Campaign Document v2, stored in the local document registry, and included in Campaign Bundle v2 exports. Campaign Document v1 and Campaign Bundle v1 imports migrate forward with an empty contract list, preserving older saves.

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
- persistent per-campaign Activity Log

## Next gameplay layer

The commerce foundation now supports passengers, freight, and speculative cargo. Mail, crew salary calendars, annual maintenance scheduling, extended berthing days, low-berth revival for ships that actually carry low berths, encounters, patrons, and starship combat remain later milestones.
