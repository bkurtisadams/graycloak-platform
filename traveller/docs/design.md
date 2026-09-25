# Graycloak Traveller — design

The contract for the next client and the runner beneath it. Written Sep 2026
from the design sessions that set the build order; extend it when a ruling
changes it. Rules authority is the 1977 Books 1–3 (`docs/rules-1977/`), with
the 1982 Traveller Book adopted wholesale where noted.

## 1. Layers

| layer | lives in | status |
|---|---|---|
| **Rules** — pure functions: tables, throws, documents, costing, combat | `packages\classic-traveller-rules` (source of truth; `traveller\vendor\` is a git-ignored copy made by `scripts\sync-vendor.mjs`) | extended in place, never rewritten |
| **Runner** — situation state machine, policy, clock walking, parties, montage, rendezvous | `traveller\src\runner\` (inside the client tree: one consumer, no second vendor copy; moves out if another game needs it) | trip machine, default policy and `scripts\run-trip.mjs` built (v0.312.0); `play.html` runs on it (v0.315.0); parties, montage, rendezvous not yet |
| **Client** — two shells over one Firestore state | `traveller\client-v3\` (name open) | new |
| **Storage** — Firestore, one project, one login | existing rules file + emulator tests | extended (`private/` subtree) |

`play.html` and the old referee client keep serving until the new client
passes them feature for feature. Read them for layout and engine calls; do
not refactor them. Logic that leaked into the old client moves into rules or
runner. Hail/submit/toll lives in `starships/arrival.js` (v0.311.0). Since
v0.315.0 the port and arrival sequence exists once, in `runner/trip.js`:
`play-session.js` carries its actions as `trip:<action>` commands and keeps
only what the runner does not do (speculation, battle-damage repair, fights).

### Principles

1. **The engine is pure.** State in, new state plus a description of what
   happened (rolls, named DMs, results) out. It never touches Firestore and
   never knows which shell called it. Every roll goes through an injected
   dice object, so a run is replayable. (Open: `src/npc-primitives.js` calls
   `Math.random()` directly — route it through dice or keep that stack
   client-only.)
2. **Visibility is where data lives, not which page renders it.** A player
   opening the referee page sees exactly what the player page shows them.
3. **One current situation per party.** The player shell renders it; the
   referee shell renders it plus everything around it.
4. **The clock is a document.** Everything that bills or ages derives its
   next date from the documents; nothing is stored twice.
5. **Derived things are never stored**: data card, TAS Form 2, trade
   classes, starport services, maintenance overdue, mortgage arrears.

## 2. State model

```
accounts/{uid}                          owner-only
characters/{charId}                     owner + referee of the seated campaign
campaigns/{campaignId}                  members
  ├─ members/{uid}
  ├─ parties/{partyId}
  ├─ clock                              single doc per party (see §5)
  ├─ ships/{shipId}
  ├─ actors/{actorId}                   named NPCs: one sheet, one set of wounds
  ├─ statblocks/{statblockId}           mooks: each placed token copies the stats
  ├─ worlds/{hex}                       revealed worlds only
  ├─ situations/{situationId}
  ├─ scenes/{sceneId}
  ├─ jobs/{jobId}
  ├─ journal/{entryId}                  referee-only until shown
  ├─ chat/{messageId}
  └─ private/                           referee-only subtree
       ├─ subsector                     the whole grid, unrevealed hexes, lanes
       ├─ encounterTables/{hex}         per terrain, 1982 animal columns
       ├─ hidden/{situationId}          pending rolls, NPC intent, enemy sheets
       └─ notes
compendium/…                            static, read-only
```

### Character (owned by the player, lent to a campaign)

Existing `classic-traveller-character` document, schema v6. Seated in at
most one campaign (`seatedIn`); leaving takes everything that happened to it
along. `chronology.asOfDate` anchors its ages to the game date. The referee
may read it, correct it by fiat, and write engine outputs to it; the referee
may not keep it after the player leaves. A PC token references the real
character, so wounds land on the real sheet.

### Campaign, member, party

```
campaign  refereeUid | "auto"      solo = a campaign refereed by the policy
          ruleset: ct1977 + rulings on (1982 medical, animals, malfunctions…)
          settings: combatVerbosity, mookNumbering (default on),
                    autoTargeting (default off), rollModes
member    role referee|player, characterId|null, seat {shipId, role}
party     members[], shipIds[], hex, clock, status active|frozen|forming,
          formingFrom[] (rendezvous), situationStack[]
```

### Ship

Existing `classic-traveller-ship` document, schema v10:

- `specifications` — the fit (hull, drives, computer, staterooms, hardpoints,
  vehicles). Changed only at a shipyard or by referee fiat.
- `state` — play: fuel and quality, cargo and passenger manifests,
  `finances` (balance, ledger, `mortgage` null | {cashPriceCr,
  monthlyPaymentCr, termMonths, startedOn}), `damage`, `computer.programs`
  (carried), `malfunction` (null | {failed[], since, patched}),
  `maintenance.lastOverhaulDate`, armament.
- v8 (arrival): `portCall.berth` surface | orbit (by hull, Book 2 p.15),
  `portCall.brokerTipDM` (a hail's tip, spent by one resale), passenger
  `endurance` (low passengers, for revival), `portCallHistory` (last 24
  calls, for the repossession DM), `privateMessages` (carried, with carrier
  and recipient), `impound` (null | {systemId, since, form, arrearsCr}),
  `mortgage.homeSystemId`. Creation and import fill these on a document
  built by hand in the v7 shape; validation stays strict.
- v9: a Type S in service gains the Generate program (see §8).
- v10: `mortgage.subsidized` (Book 2 p.5): the government pays the bank
  and takes half the gross freight and passage receipts; 600-ton hulls up.
- v11 (rules 0.72.0): top-level `refit` {turrets: [{id, mount, fittedOn}]}.
  `specifications` must equal the canonical design with the refit laid over
  it (`applyRefit`): each refit turret is added at an empty hardpoint and
  takes its 1 ton of fire control out of `cargo.capacityTons`. Anything else
  that differs is still rejected.

The ledger is the state for money: salaries paid, mortgage payments made,
arrears, the last overhaul, all read from dated ledger lines by kind.

### Situation

```
situation  partyId, shipId?, kind, phase, waitingOn, hex
           public: log so far, options offered, whose turn
           declarations: {characterId: {movement, target, weapon…}}  carry over
           resolvedThrough: phase marker (a reload never re-rolls)
private/hidden/{id}: pending rolls, NPC intent, enemy sheets, the 3D=18
```

As built (v0.312.0) the runner's trip is one plain state, not yet a
Firestore document: `situation` port | in-jump | encounter | stranded |
destroyed | halted, the campaign, ship, party characters and contracts, the
chosen course, the standing encounter (with any toll), the jump in progress,
and a `halt` {reason, detail} for what only a person or the combat engine
can settle. `listActions(state)` / `applyAction(state, action)` →
`{state, events}`; every throw is seeded, so a trip replays exactly.

As persisted (v0.315.0): the trip's own fields (`tripRecord` — situation,
course, encounter, departure, jump, landing, broker tip, halt, arrivals, seed,
lane rule) sit on the campaign at `roster.trip`; `tripFromDocuments` rebuilds
the rest from the live documents on every step, so a fight's damage or a
referee's fiat is never overwritten by a stale copy. A live ship fight sits
beside it at `roster.shipFight`, written on every change, and a reload picks
it up where it was. A halt offers `resume` actions (continue / return,
repelled / pay, …); a refused departure is an error, not a halt. Mapping this
onto `situation` + `private/hidden` (and the stack) is still to come.

### Scene

A board, not a situation: `bands` (personal combat range bands), `space`
(vector canvas), `tactical` (grid with walls/doors/furniture as vector line
art). A fight situation references a scene; a scene can exist with none.
Tokens: `{ref: character|actor|statblock-copy|ship, position, ownerUid,
visibleToPlayers, state (mook copies)}`. Thumbnail generated from token
colours (Firestore's 1 MiB cap rules out background images).

### Chat, journal, ledger

```
chat     speaker, mode public|gm|blind|whisper, kind text|roll-card,
         card {round, actor, action, formula [{term, dm, why}], result, targets}
journal  documents of text and images (Storage refs); "show to players" later
ledger   (on the ship) date, kind, amountCr, description citing the page
```

### Who writes what

| | player shell | referee shell | policy (solo) |
|---|---|---|---|
| character | own only | any seated | any seated |
| ship.state | via engine, own seat | via engine or fiat | via engine |
| ship.specifications | no | shipyard or fiat | shipyard |
| situation.public | via engine; own declarations | anything | anything |
| private/* | never reads | reads/writes | reads/writes |
| clock | requests only | advances/corrects | advances |
| chat | public, whisper | all modes | public |
| scene tokens | move own token | everything | everything |

"Via engine" means the client calls an engine function and writes its
output. Firestore rule for a player: own character, own declarations, own
token, chat. Everything else flows through a resolution the referee or
policy commits.

### Invariants (test them)

- A character has at most one `seatedIn`; a member has at most one
  `characterId`; the two agree.
- A party has exactly one situation not at `end`, plus interrupted ones
  beneath it.
- Nothing in a situation resolution writes `specifications`.
- `private/` is unreadable to non-referees in the rules file. The only
  per-field visibility outside it: `scene.tokens[].visibleToPlayers`,
  `chat.mode`.
- The client never sets a clock date directly; every advance is one engine
  call returning the events it fired.

## 3. Situation machine

A phase is `{kind, phase, waitingOn, deadline?}`. `waitingOn`:

| value | meaning |
|---|---|
| `nobody` | engine resolves now |
| `referee` | a human referee, or the policy in an auto campaign |
| `seat:pilot` … | whoever holds that crew seat (policy if an NPC) |
| `each:party` | every member submits (declarations, ready) |
| `any:party` | first member to act |
| `player:X` | one character |

Every resolution produces: new state, a public log line, a private log line
(with the roll), chat cards, ledger lines; `resolvedThrough` advances.

### Main loop

```
PORT-CALL --depart--> TRANSIT-OUT --100 diam--> IN-JUMP --week(s) end--> ARRIVAL --land--> PORT-CALL
                          | encounter                                      | encounter
                          v                                                v
                     [SHIP-FIGHT]                                     [SHIP-FIGHT]
```

Side doors from PORT-CALL: SHIPYARD, SURFACE, PERSONAL-FIGHT, IDLE.

### PORT-CALL — the machine waits on the party

| phase | waitingOn | notes |
|---|---|---|
| dock | nobody | berth fee (Cr100 / 6 days). Cargo board, passenger pool, speculation lot, patron availability rolled once and cached (speculation and patron re-roll weekly). |
| open | any:party | the hub; each service below is an action. Overstay Cr100/day past 6. |
| refuel | seat:engineer | refined / unrefined / skim (streamlined; 7 days, encounters may interrupt) |
| cargo | seat:pilot | lots in 5-ton multiples, unsplittable; hold minus fire-control reserve. Announcing a destination unlocks passengers. |
| passengers | seat:steward, seat:medic | steward per 8 high; bumping of middles by a late high |
| speculate | any:party | one search per week; broker (5% per +1, max +4); Admin/Bribery from one character; partial lot +1%; a hail's broker tip consumed here |
| patron | any:party | once per week, 5–6 on 1D; reaction 7+ accepts; creates a `job` |
| hire | seat:pilot | applicants; salary +10% per level above 1; working passage max 3 jumps then salaried |
| shop | player:X | compendium purchase; legality against law level off-port |
| maintenance | seat:pilot | A/B only: fee 0.1% of cash price, 14 days (`performMaintenance`; free at a scout base with the privilege) |
| software | seat:pilot | `purchaseComputerProgram` at p.12 prices |
| pass-time | any:party | clock advance; rest is a party act (3 days, once); medical attention takes the medic's day; stops at the first event. As built (v0.315.6): whole days go through the ship's clock (salaries, mortgage, aging, an aging crisis stops it); refused away from port, where time is the trip's |
| carry-message | the approached crew member | Book 2 p.8: 9+ per destination per port call, a random crew carrier, honorarium to him on acceptance; delivered on arrival |
| impound | referee / nobody | a held ship (see ARRIVAL) pays its arrears here; papers and injunction lift on payment, a boarding party repelled lifts without it |
| drive repair | seat:engineer | 1982 "more complete repairs": class A–C (Book 3 starport table), priced by the 1977 Book 2 p.18 Repair Parts rule — 2D × 10% of each failed drive's cost, −2 when the crew installs (an engineer aboard), capped at 100% ("complete replacement… sometimes cheaper"), 0% free; quoted once per port call. 1982's "minor malfunctions" DM is not used: a drive failure stops the drive completely. A failed Free Trader jump drive is Cr2–10M by shipyard: a ship with no engineer to patch in flight can be stranded by it |
| depart | each:party | every player seat ready (referee can force); runs `departureChecklist` |

Depart settles berthing past six days (Cr100 a day, p.7) and, at the jump
point, posts life support (Cr2000 × staterooms + Cr100 × every low berth,
used or not — p.6); the lottery (Cr10 per low) is thrown at revival, and
only with a steward aboard to administer it (p.2).

Salaries are the p.6 table +10% per level above 1 in the post's own skill;
a doubled-up crewman takes 75% of each (p.17), paid on the better of his
two skills.

Flight plans (Book 2 p.32, Book 3 p.2): a cassette is sold for each lane
charted from this world, any starport class; anywhere else needs Generate.
Lanes are subsector data (`subsector.routes`), rolled once from the Book 3
p.3 table (`worlds/routes.js`, rules 0.70.0) and editable by the referee.

The policy's port time is Book 2 p.1's six days (`portDays`).

### TRANSIT-OUT

| phase | waitingOn | notes |
|---|---|---|
| lift | nobody | ~10 hours; encounter 2D + starport DM (A+6 B+4 C+2 D+1 E−2 X−4) |
| contact | referee | NPC ship: S on 6−, C on 8+, armed Y on 7; hostility; stored private |
| respond | seat:pilot | Hail (traders: reaction, 8+ gives a broker tip here), Submit (patrol: hostile fights, friendly waves through, middling demands a toll ≈ a day's berthing; refusal fights), Run (SHIP-FIGHT with escape shots), Fight |

As built (runner, v0.314.0): lift and the outbound encounter (Book 2 p.3:
"entering or leaving a system"), then a day to 100 diameters (p.1: about 20
hours), then the jump — a trip is the book's 14 days with six in port.

Reactions (Book 3 p.23): **one throw per encounter**, with its DMs (+1 a
5-term army/navy/marines/scouts veteran in the party, −1 population 9+),
kept on the encounter; hail and submit read it. 7+ is favourable (Book 3
p.21's "generally 7+"): a hail's broker tip, a patrol waving the ship
through. 2–5 are hostile, but attack only on the table's own throw (2 at
once, 3 on 2D 5+, 4 on 8+, 5 "may attack" — 11+ as a ruling); a hostile
patrol that holds fire, or an unreceptive one (6), demands the toll. The
hail is offered inbound only.

As built (v0.315.7): a **pirate** whose reaction is hostile throws the
table's attack (2 at once, 3 on 5+, 4 on 8+, 5 on 11+ as the ruling) when it
is met. If it attacks, it cannot be let pass: the choices are **Run** — the
fight starts with the party's ship already breaking off, the pirate taking
p.37's escape shots — or **Fight**. One that holds off may be let pass. The
default policy runs, which halts a headless run for a person. (Kurt, Sep
2026: letting every pirate pass made fighting pure cost.)
| jump-point | nobody | `beginJump`: burns fuel, rolls misjump and hijack, result private until arrival |

### IN-JUMP

| phase | waitingOn | notes |
|---|---|---|
| week-N | nobody | `resolveJumpWeek` (1982 weekly drive failure, per-drive 7+) |
| drive-repair | seat:engineer | 10+ + Engineering, daily. Engineers only (1982: "attending engineers"); a doubled-up engineer throws without his expertise (p.17). With no engineer the drive stays down to port |
| hijack | referee → each:party | on the rolled day; anti-hijack holds the bridge on 6+; pushes PERSONAL-FIGHT. As built the runner halts at departure with `halt.reason` hijack |
| emerge | nobody | clean: announced destination after 1 week. Misjump: 1D weeks, landing hex revealed (may be empty or off-map → a stranded situation: fuel, ten battery days if the power plant is down, low berths, fast drug, detection ranges; rescue is a referee call — no SOS rule exists). 16+ destroyed. |

Salaries and mortgage are clock events and fire mid-jump if due.

### ARRIVAL

| phase | waitingOn | notes |
|---|---|---|
| approach | nobody | encounter roll as in transit |
| contact / respond | as transit | |
| revival | seat:medic | 5+ per low passenger; +1 Medic-2+ (none for a medic doubling in a second post, p.17), −1 End ≤ 6 (NPC endurance 2D, rolled at booking); dead fares kept (no refunds). Lottery, with a steward only: each low passenger guesses 0–N; exact guesses split the pot; a dead winner's share, or no winner, stays with the ship |
| repossession | nobody | only if mortgage arrears (one missed payment is a skip — ruling): 12+ to avoid, +1 per 5 hexes from home (max +9), −2 if called here within 60 days; orbit counts as a landing. As built the form is 1D (1–3 papers, 4–5 injunction, 6 boarding; non-RAW) in the rules package; papers and injunction hold the ship until arrears are paid, boarding halts for PERSONAL-FIGHT |
| land | seat:pilot | streamlined → land; else orbit (automatic by hull). Freight and passengers boarded in orbit are delivered in orbit (p.8) and pay their own shuttle; the ship pays Cr10/t each way only for its own speculative goods — free with its own boat/pinnace/cutter/shuttle, impossible at E/X without one |
| deliver | nobody | freight, passages, mail contract; private messages delivered. Speculative cargo is sold in PORT-CALL, not here. **Open:** the introduction isn't recorded yet — a contact document for the recipient would do it |

Order (settled by Book 2 p.3 "entering", p.2 revival "after the ship has
landed", p.3 repossession "on each world landing"): approach encounter
first, then land. The runner does this (v0.314.0), and so does `play.html`
since v0.315.0.

### SHIP-FIGHT (abbreviated default; vector optional)

Book 2 turn, faithfully: intruder move, laser fire, native return fire,
ordnance, reprogramming; then native; interphase for damage control (9+ +
skill, one per turn, destroyed drives excluded) and escape-shot count. The
intruder is whoever initiated (referee-overridable). Pilot chooses CPU
contents per phase from `state.computer.programs`; gunners target per
turret. As built (v0.315.0): each ship carries exactly its own
`state.computer.programs`, loaded fire control first (Target, Return Fire,
Maneuver, Predict, Gunner Interact, Evade…) as the computer holds them; no
Target in the computer, no laser fire (Book 2 p.33), and the screen says so.
An encountered ship armed by the referee also carries Target (ruling). Ends when a side can't fire, a fleeing ship's shots run out, or a
jump completes. Boarding pushes PERSONAL-FIGHT. Hulk: referee decides
(policy: pirates loot cargo and leave). NPC intent follows the Book 3
attack/flee shape (non-RAW, flagged).

### PERSONAL-FIGHT (leaf)

setup (referee: scene, tokens, bands, surprise — a Roll Surprise button or
simply called; armour set by referee) → declare (each:party + NPCs;
declarations carry over; weapon may change) → resolve (Book 1 matrices;
wounds at round end; one chat card per attack) → check-end → end (wounds
written back; loot; captives become actors). Only characters with the
party or already on the board take part.

### SURFACE

leave-port (who, vehicle, terrain; law level now applies) → day (animal
checks twice a day from the world's private table, person check once) →
[As built v0.318.0: the person check rides the existing surface clock —
once a day, 5-6 on 1D, independent of the animals; the clock stops at the
first encounter of either kind; a blank 6x row is no encounter.]
encounter (referee/policy; attack pushes PERSONAL-FIGHT) → pursue-job
(referee-authored; deliberately thin under the policy) → return → end.

### SHIPYARD (leaf)

As built (v0.316.0), as a Shipyard panel under the port column rather than
its own situation: at a **class A or B** starport (ruling: fitting is not
building, so B's non-starship yard does it), a turret into an empty
hardpoint (`fitShipTurret`, p.15 prices, a ton of hold for fire control),
a weapon into a turret (`armShipTurret`, p.16), a program (`purchaseComputerProgram`,
p.12); all instant, charged to the ship's account. Battle-damage repair was
already in the port column (p.18, crew anywhere or shipyard at A/C). v0.317.0
adds the computer retrofit (Book 2 p.15, 25% trade-in). Not yet: turret swap
and resale, ordnance, new construction.


repair (2D × 10% of component cost, −2 crew-installed) · arm (fit a turret
at an empty hardpoint — not yet built — weapons, turret swap at 25% resale)
· refit (computer trade-in 25%, vehicles) · order-new (checklist → architect
1% → 20% down → build time → mortgage). The only place `specifications`
changes.

### IDLE

Passing time with no port around it; aging and upkeep fire as clock events.

### The stack

```
push(kind): current phase frozen; new situation on top
pop():      top at end; its log merges down; beneath resumes where it froze

PORT-CALL      -> SURFACE, SHIPYARD, PERSONAL-FIGHT, IDLE
TRANSIT-OUT    -> SHIP-FIGHT
IN-JUMP        -> PERSONAL-FIGHT (hijack)
ARRIVAL        -> SHIP-FIGHT, PERSONAL-FIGHT (repossession boarding)
SHIP-FIGHT     -> PERSONAL-FIGHT (boarding)
SURFACE        -> PERSONAL-FIGHT
IDLE           -> PERSONAL-FIGHT, SURFACE
PERSONAL-FIGHT, SHIPYARD: leaves
```

A leaf never pushes; a push happens between phases, never mid-resolution.

## 4. The policy

The automated referee: solo campaigns, and any NPC or decision a referee
sets to auto. Same code paths, different decider.

**May:** roll every hidden table and apply the RAW result; decide NPC ship
intent and combatant declarations; accept a patron on reaction 7+ with a
template job; set escape shots to 2; pick the hijack day and the
repossession form; loot a hulk; advance the clock to the next event.

**May not:** change `specifications`; edit a character by fiat; reveal a
hex the party hasn't reached; write a Journal entry; override a roll.

**The default policy as built** (`runner/policy.js`, the "dull captain"):
settle debts, repair drives, six days in port, overhaul when due within 60
days at A/B, fill or skim, nearest fresh course, biggest freight first,
passengers, messages, depart. It lets all traffic pass — hail, submit and
fighting pirates are opt-in settings — because each can turn into a fight a
headless run can't settle. A halt (hijack, ship fight, boarding, spent
batteries, aging crisis) stops the run for a person.

## 5. Clock, parties, rendezvous

Rules package 0.67.0: dates are `DDD-YYYY` labels on a 365-day year
(`src/time/dates.js`). `advanceClock` derives salaries, mortgage,
maintenance-due and aging from the documents and walks to a date, stopping
at a caller's pending entry (rendezvous, encounter check, end of rest) or an
aging crisis. Idempotent on re-run.

**Every party has its own clock.** Characters share a scene only on the
same date. Time only moves forward for a character.

**Rendezvous** (referee tool: parties + hex + hook):
`merge date = max(party date + travel time to the hex)` — never earlier
than anyone's date; the referee may push it later. For each party: deliver
the hook in fiction (a private message, a patron with a fixed reaction, a
TAS notice); set a blocking `rendezvous` pending entry at the merge date;
mark the story party `forming`. Refusal is allowed.

**Catching up:** play the gap, or **montage** — the policy drives the real
situation machine (ledger, fuel, revival rolls all happen) and produces a
summary instead of a log. A montage never fights: a hostile encounter stops
it and opens for real. A shipless character pays subsistence (Book 3 living
costs) and buys passage.

**Merge:** parties collapse into one party, one situation (the referee's),
one clock. Sheets, ships, mortgages untouched. Old parties frozen.

**Fork:** released characters become parties of one at the current hex and
date, refereed by policy. Frozen parties are discarded.

Edge rules: a non-responding party doesn't block others; optional campaign
setting caps how far a solo party may run ahead (default off, non-RAW); two
solo parties meeting by chance are offered a merge without a referee.

## 6. Player pages

The player shell is a switch on `situation.kind`. The money is the plot:
the next payment and projected margin stay visible almost everywhere.

**Campaign home** — ship strip (fuel, hold, rooms, low berths, maintenance
due, drives); ledger (cash, next mortgage and whether it's covered,
projected trip); crew strip with commit status (group); this port's
opportunities; Map · Starport · Manifest · Crew · Depart.

**Subsector map** — Book 3 grid with UWPs; hexes within Jn shaded; lanes vs
off-lane (needs Generate); unrevealed hexes blank until reached.

**World page** — UWP decoded into consequences (fuel, shipyard, law level
in plain words, tech in terms of what's buyable), services, opportunities.

**Cargo board / manifest** — lots as blocks packed into the hold bar;
passengers appear only after a destination is announced; life support shown
as charged whether rooms are full.

**Speculation** — the lot, the DM sum as a computed line, where it sells.

**Departure** — `departureChecklist` rows as a checklist: gates and risks,
misjump DM spelled out, the 10/100-diameter warnings loud.

**In jump** — a narrated week: day lines, pausing for the seat a result
addresses (engineer repair, hijack scene).

**Arrival** — encounter, revival, deliveries, net for the trip.

**Ship fight** — the computer as the tactical game: CPU slots filled from
carried programs, per-turret targeting, flee/jump options with their cost in
phases.

**Character sheet** — designed for play (TAS Form 2 as print/export);
aging date and self-improvement programs driven by the clock. Skill click
rolls to chat; a small button or Shift+click posts its description.

**Surface** — terrain, party, vehicle, law notes; encounters inline; patron
threads.

**Shipyard / design** — the Book 2 checklist as a builder with tonnage and
credit gauges; drive potential dashes greyed.

**Ledger** — every line cites the page that caused it.

Referee shell: Foundry-style directories (Journal, Actors, Players,
Vehicles, Scenes), floating sheets, right-click menus, chat sidebar with
roll cards and roll modes, the band board and space canvas — with the same
situation renderer embedded.

## 7. Build order

| # | step | status |
|---|---|---|
| 1 | date type + campaign clock walker | done, rules 0.67.0 |
| 2 | departure gates, misjump, drive failure, hijack | done, rules 0.68.0 |
| 3 | arrival: revival + lottery, orbit/land + shuttle, repossession, message delivery; hail/submit/toll out of `play.js` | done, rules 0.69.0, client v0.311.2; RAW fixes from the Book 2/3 review in rules 0.71.0, client v0.314.0 |
| 4 | runner: situation machine + policy + headless trip script (fixture Free Trader, 3-world authored subsector, ten trips, ledger balances) | done, client v0.312.0 — on the 14-system Far Meridian map rather than a 3-world one; `--runs N` totals |
| 5 | shipyard: turret at empty hardpoint, repair bridge, computer trade-in | done: turrets, weapons, software (rules 0.72.0, client v0.316.0), computer retrofit with trade-in (rules 0.73.0, client v0.317.0) |
| 6 | person encounters + law harassment | first slice (rules 0.75.0, client v0.318.0): Book 3 pp.19-21 person encounters once a day on the surface, the p.7 arrest throw for police meeting a party carrying what the law forbids; groups go on the board as statblocks. An arrest for a weapons violation is 1D days in jail (The Traveller Book, 1982; client v0.318.1): the party leaves the surface and the days pass on both clocks; the forbidden weapons are confiscated (Kurt, Sep 2026; v0.318.2). Open: terms for other offences, customs at the starport edge, patrons |
| 7 | dice injection for the quick-NPC stack | |
| 8 | world generation: star mapping, UWP, tech, lanes, private reveal | lanes done early (rules 0.70.0, client v0.313.0): Book 3 p.3 table, Far Meridian thrown once |
| 9 | self-improvement programs, passenger bumping, working-passage counter | |
| 10 | construction ordering, psionics, drugs | |

Then: Firestore `private/` rules and tests; player shell in loop order;
referee shell; rendezvous.

Done (v0.315.0): the client moved onto the runner ahead of steps 5–10 —
`play-session.js`'s port and arrival copy is deleted, the trip and a live
ship fight persist on the campaign, `play.html` has encounter, jump-space,
halted, stranded and lost screens and the departure checklist, and the map
draws the charted lanes with off-lane worlds marked as needing Generate. The
v0.314.0 sequence fixes (encounter order, outbound encounter, transit day,
berthing past six days, salaries) reach `play.html` with it.

## 8. Rulings index (made in the design sessions)

- Maintenance is an act at an A/B port, never auto-charged; overdue is
  derived from the last overhaul.
- Upkeep pays salaries, then mortgage. Arrears on the mortgage = skipped.
  Due dates every 30 days from signing regardless of late payments.
- A mustered-out Type S has no mortgage; a benefit Free Trader is
  part-paid (fewer months left).
- Basic software package (proposed, built on, **awaiting confirmation**):
  flight set (Maneuver, Jump-1…Jn, Navigation, Library, Anti-Hijack), then
  Target, then the dearest defensive program within CR 2M.
- The Type S is the exception: delivered with Maneuver, Jump-1, Jump-2,
  Navigation, Generate (MCr 1.7), in place of Library and Anti-Hijack — a
  scout's work is off the lanes. Scouts in service gain Generate (ship v9).
- Space lanes are Book 3 p.2–3 routes thrown once per subsector and kept as
  map data; a cassette is sold for each lane at any starport class. Class E
  ports hold jump-1 lanes only (the table), so an isolated E world needs
  Generate. Far Meridian: 13 lanes; Cinder, Sable, Tamarind, Lacuna none.
- Low passage: NPC endurance 2D; a doubled medic gives no DM; lottery as
  in ARRIVAL. Shuttle fares fall on freight and passengers boarded in orbit,
  the ship paying only for its own goods; berthing is charged in orbit too.
- Repossession: an orbital berth counts as a landing; "called twice in two
  months" = an earlier call here within 60 days; the form is 1D (non-RAW).
- Private messages: 9+, a random crew member, honorarium paid to him on
  acceptance; recipient the TAS or a tavern keeper (p.8's examples).
  Honorarium 2D×10 (ruling; p.8 gives only "Cr20 to 120"), shared with the
  old job board's `privateMessageHonorarium`.
- Patrol toll: a day's berthing (no size is given). A hail's broker tip is
  +1 on one resale at that port, kept on the port call.
- Skipping: one missed mortgage payment puts the ship under Book 2 p.3's
  repossession throw at every landing; paying the arrears ends it.
- A crewman doubling as engineer counts as a dedicated engineer: the post is
  filled (no missing-engineer DM), he is paid 75% and loses his expertise.
- Financing (Book 2 p.5): refused for the Yacht, Type C and Type S unless
  the buyer has guaranteed income; subsidy is an option for 600-ton hulls,
  not a condition of the loan. **Open:** whether the government's half
  also takes speculative sales (built: freight and passage only).
- 1982 starship malfunctions adopted wholesale; 16+ misjump destruction RAW.
- 1982 jump fuel adopted (rules 0.74.0): a jump burns 0.1M times the parsecs
  actually jumped, not the drive's whole jump number (1977 p.6). Power plant
  fuel stays 1977's 10Pn per trip.
- 1982 computer jump limit adopted as a floor (rules 0.74.0): a Model/N
  supports jump-N (a bis model one more), never below the design's own
  figure — the 1977 Type S stays a Model/1 making jump-2. A refit supports
  the higher of the two; the drive still sets the range.
- A misjump may land in an empty or off-map hex.
- Unrepaired drive failure: the jump still completes; the ship arrives with
  whatever runs.
- Equipped for unrefined fuel: scout and military hulls (Type S, Type C).
- Engineers missing: one per 35 tons of drives, hulls over 100 tons.
- Crew gates: pilot, navigator (>200t), medic (>100t), steward (per 8 high)
  block departure; engineers are a DM; gunners advisory.
- An encountered ship the referee arms (two beam lasers, p.36 hulls) also
  carries Target: whoever armed it bought the program that fires them. A
  Type S is otherwise delivered without it (Sep 2026).
- A live ship fight picks up where it left off after a reload (Sep 2026).
- Turrets, weapons and software are fitted at class A or B starports, at
  once; a refit turret's fire control takes a ton of the hold (Sep 2026).
- Goods sold "each" on the Book 2 p.43 table take the p.16 ship-vehicle
  tonnage where it has one: an Air/Raft 4 t, an ATV 10 t (rules 0.72.1). The
  others (Aircraft, Computers, Armored Vehicles, Farm Machinery) need a
  referee ruling before they can be loaded (Sep 2026).
- The Shipyard does not sell a program the ship can never run: a jump past
  the drive or the computer's limit, or a program too large for the CPU
  (fire control counted beside Target). The referee may take a program off
  the card; software has no resale, so any refund is by fiat (Sep 2026).
- A computer may be retrofitted at a class A or B starport (Book 2 p.15),
  the old one traded in at 25% of its price, the tonnage difference taken
  from (or given back to) the hold (rules 0.73.0, ship refit.computer). Its
  jump limit follows the 1982 floor below (rules 0.74.0).
- A hostile pirate attacks on the reaction table's own throw and cannot then
  be let pass; the party may run (p.37 escape shots) or fight (Sep 2026).
- Earlier client-era rulings (combat, medical, rest, animals, reaction DM,
  membership) are recorded with their slices and stand.
