# Graycloak Traveller — design

The contract for the next client and the runner beneath it. Written Sep 2026
from the design sessions that set the build order; extend it when a ruling
changes it. Rules authority is the 1977 Books 1–3 (`docs/rules-1977/`), with
the 1982 Traveller Book adopted wholesale where noted.

## 1. Layers

| layer | lives in | status |
|---|---|---|
| **Rules** — pure functions: tables, throws, documents, costing, combat | `packages\classic-traveller-rules` (source of truth; `traveller\vendor\` is a git-ignored copy made by `scripts\sync-vendor.mjs`) | extended in place, never rewritten |
| **Runner** — situation state machine, policy, clock walking, parties, montage, rendezvous | `traveller\src\runner\` | new |
| **Client** — two shells over one Firestore state | `traveller\client-v3\` (name open) | new |
| **Storage** — Firestore, one project, one login | existing rules file + emulator tests | extended (`private/` subtree) |

`play.html` and the old referee client keep serving until the new client
passes them feature for feature. Read them for layout and engine calls; do
not refactor them. Logic that leaked into `play.js` (hail/submit/toll,
hold-fit, date handling) moves into rules or runner.

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

Existing `classic-traveller-ship` document, schema v7:

- `specifications` — the fit (hull, drives, computer, staterooms, hardpoints,
  vehicles). Changed only at a shipyard or by referee fiat.
- `state` — play: fuel and quality, cargo and passenger manifests,
  `finances` (balance, ledger, `mortgage` null | {cashPriceCr,
  monthlyPaymentCr, termMonths, startedOn}), `damage`, `computer.programs`
  (carried), `malfunction` (null | {failed[], since, patched}),
  `maintenance.lastOverhaulDate`, armament.

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
| pass-time | any:party | clock advance; rest is a party act (3 days, once); medical attention takes the medic's day; stops at the first event |
| depart | each:party | every player seat ready (referee can force); runs `departureChecklist` |

Depart posts life support (Cr2000 × staterooms + Cr100 × low berths in use)
and seeds the low-passage lottery (Cr10 per low).

### TRANSIT-OUT

| phase | waitingOn | notes |
|---|---|---|
| lift | nobody | ~10 hours; encounter 2D + starport DM (A+6 B+4 C+2 D+1 E−2 X−4) |
| contact | referee | NPC ship: S on 6−, C on 8+, armed Y on 7; hostility; stored private |
| respond | seat:pilot | Hail (traders: reaction, 8+ gives a broker tip here), Submit (patrol: hostile fights, friendly waves through, middling demands a toll ≈ a day's berthing; refusal fights), Run (SHIP-FIGHT with escape shots), Fight |
| jump-point | nobody | `beginJump`: burns fuel, rolls misjump and hijack, result private until arrival |

### IN-JUMP

| phase | waitingOn | notes |
|---|---|---|
| week-N | nobody | `resolveJumpWeek` (1982 weekly drive failure, per-drive 7+) |
| drive-repair | seat:engineer | 10+ + Engineering, daily; patched drives still need an A–C port |
| hijack | referee → each:party | on the rolled day; anti-hijack holds the bridge on 6+; pushes PERSONAL-FIGHT |
| emerge | nobody | clean: announced destination after 1 week. Misjump: 1D weeks, landing hex revealed (may be empty or off-map → a stranded situation: fuel, ten battery days if the power plant is down, low berths, fast drug, detection ranges; rescue is a referee call — no SOS rule exists). 16+ destroyed. |

Salaries and mortgage are clock events and fire mid-jump if due.

### ARRIVAL

| phase | waitingOn | notes |
|---|---|---|
| approach | nobody | encounter roll as in transit |
| contact / respond | as transit | |
| revival | seat:medic | 5+ per low passenger; +1 Medic-2+, −1 End ≤ 6; lottery paid |
| repossession | nobody | only if mortgage arrears: 12+ to avoid, +1 per 5 hexes from home (max +9), −2 if called twice in two months; failure → referee picks form (policy: boarding → PERSONAL-FIGHT) |
| land | seat:pilot | streamlined and a starport → land; else orbit, shuttle at 1% of freight/passage rates |
| deliver | nobody | freight, passages, mail contract; private messages delivered (introduction noted). Speculative cargo is sold in PORT-CALL, not here. |

### SHIP-FIGHT (abbreviated default; vector optional)

Book 2 turn, faithfully: intruder move, laser fire, native return fire,
ordnance, reprogramming; then native; interphase for damage control (9+ +
skill, one per turn, destroyed drives excluded) and escape-shot count. The
intruder is whoever initiated (referee-overridable). Pilot chooses CPU
contents per phase from `state.computer.programs`; gunners target per
turret. Ends when a side can't fire, a fleeing ship's shots run out, or a
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
encounter (referee/policy; attack pushes PERSONAL-FIGHT) → pursue-job
(referee-authored; deliberately thin under the policy) → return → end.

### SHIPYARD (leaf)

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
| 3 | arrival: revival + lottery, orbit/land + shuttle, repossession, message delivery; hail/submit/toll out of `play.js` | next |
| 4 | runner: situation machine + policy + headless trip script (fixture Free Trader, 3-world authored subsector, ten trips, ledger balances) | |
| 5 | shipyard: turret at empty hardpoint, repair bridge, computer trade-in | |
| 6 | person encounters + law harassment | |
| 7 | dice injection for the quick-NPC stack | |
| 8 | world generation: star mapping, UWP, tech, lanes, private reveal | |
| 9 | self-improvement programs, passenger bumping, working-passage counter | |
| 10 | construction ordering, psionics, drugs | |

Then: Firestore `private/` rules and tests; player shell in loop order;
referee shell; rendezvous.

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
- 1982 starship malfunctions adopted wholesale; 16+ misjump destruction RAW.
- A misjump may land in an empty or off-map hex.
- Unrepaired drive failure: the jump still completes; the ship arrives with
  whatever runs.
- Equipped for unrefined fuel: scout and military hulls (Type S, Type C).
- Engineers missing: one per 35 tons of drives, hulls over 100 tons.
- Crew gates: pilot, navigator (>200t), medic (>100t), steward (per 8 high)
  block departure; engineers are a DM; gunners advisory.
- Earlier client-era rulings (combat, medical, rest, animals, reaction DM,
  membership) are recorded with their slices and stand.
