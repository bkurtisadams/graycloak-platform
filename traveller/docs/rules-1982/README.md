# The Traveller Book (GDW, 1982) — excerpts supplied by Kurt

Consolidated revision of Books 1–3 by Marc Miller. Excerpts are kept here for
rules citations as Kurt supplies them; the full text is his.

## Personal combat: wounding, recovery, characteristics, expertise (pp.35–37)

- Wounds: each die is one group, applied to a single physical characteristic;
  the wounded player places them. The first wound goes on one characteristic
  chosen at random, overflow randomly to the others.
- One characteristic at zero: unconscious; wakes after ten minutes (40 rounds)
  with all three physical characteristics half way between full and wounded
  ("minor wounds"), fractions against the character. Full strength needs
  medical attention (a medical kit and Medical-1) or three days' rest.
- Two at zero: seriously wounded; wakes after three hours at the wounded level
  (or 1). Recovery only by medical attention: a medical facility and
  Medical-3.
- Three at zero: dead.
- Wounds do not change the characteristics used for DMs; endurance at the
  start of the encounter sets the blow allowance.
- Parrying: expertise in a brawling or blade weapon as a negative DM against
  blows, not shots; a long gun (not a pistol) parries as a cudgel.
- Untrained weapon usage: -5 attacking, +3 defending. Player characters have
  expertise-0 in every weapon in the book: no penalty, no DM.
  Graycloak ruling (Kurt, Sep 2026): the +3 applies only in brawling or blade
  combat against a defender holding a brawling or blade weapon — someone
  untrained with a sword is no easier to shoot with a rifle.

## Medical skill (Characters)

- Medical-1: ship's medic. Medical-2+: +1 reviving low passengers (5+).
  Medical-3: doctor; a surgeon also needs DEX 8+.
- Xeno-medicine: medical expertise applies to non-humans at -2 (a Medical-3
  doctor treats an alien as Medical-1). In the game (v0.298.0): the attendant
  counts two levels lower for a non-human patient, ticked from an NPC's
  species and the referee's to change.

## Starship malfunctions (adopted wholesale in place of Book 2 p.4)

- Starships need continuing maintenance and an annual overhaul. Ships that
  are undercrewed — without enough dedicated or full-time skilled engineers
  — or that avoid or delay the overhaul risk malfunction.
- Drive failure: each week, 13+ on 2D. DMs: +1 using unrefined fuel when not
  equipped for it; +1 per engineer missing from the crew list; +1 per week
  past the annual overhaul date.
- On a malfunction, 7+ for each drive in use (jump, maneuver, power plant)
  decides which fail. A failed drive stops completely: no thrust, no jump,
  no power. Batteries give life support and basic lighting for 10 days.
- Temporary repair: 10+ per day spent on repairs, DM + engineering skill of
  the attending engineers. More complete repairs must be made at a starport
  by qualified personnel.
- Graycloak rulings (Kurt, Sep 2026): a crewman doubling as engineer fills
  the post (no missing-engineer DM) but throws repairs without his
  expertise (Book 2 p.17); only engineers attempt repairs; the starport
  repair is class A–C (Book 3's starport table) and priced by Book 2 p.18
  Repair Parts, 2D × 10% of each failed drive's cost. No flushing step:
  the unrefined DM applies while unrefined fuel is in use.

## Introduction: refereeing (pp.9–16)

- "The rules provide for solitaire and unsupervised play" — same sentence as
  1977 Book 1 p.2; no solo procedure is given in either edition.
- The referee "deals with situations that the rules may not cover." In the
  game, that seat is the policy when the campaign's referee is the game.
- Players should "constantly scramble for eating money for the first few
  months" (p.12): subsistence (1977 Book 3 p.15) is meant to bite.
- Information is of four kinds (p.13): known by virtue of who you are;
  found at little cost (library, asking around); found at great cost
  (theft, bribery); unknowable. Guides what the game reveals free, for a
  price, or never.
- A patron may skip out without paying; a job may earn friends or enemies
  who act later (p.16). Both are mission outcomes the generator may use.
- Thugs, brigands and assailants (p.157): weapon skill-1 in whatever they
  carry, Cr10–900 on the person — the concrete form of 1977 Book 3 p.20's
  looting of the vanquished.

## Encounters (pp.99–102) — beyond the pp.99–101 rules already adopted

- Hirelings: 1D applicants a week; the interview is the UPP and skills; the
  adventurers "cannot be too choosy." Closes the open item in step 6.
- Random-encounter equipping (pp.99, 101): unless the list's remarks say
  otherwise, a group is unarmored, armed with blades only, on foot, at the
  local tech level, with survival gear regardless of TL. Codes: L a leader
  (best gear for the TL, a gun); G guns; A armor; V a vehicle (riding
  animals count); ±N tech level relative to local. Only military troops
  and leaders wear combat armor or battle dress. The rule
  generateOppositionGroup should follow; the 1977 p.21 table's own
  weaponry column stands where it is explicit.
- Referee's responsibility (p.102): encountered NPCs are equipped
  consistently with local TL and law level unless there is a definite
  reason (permission, smuggled or imported gear, military issue).
- Reactions (p.102): "attacks… may be verbal or psychological, depending on
  local law level" — a hostile reaction on a high-law world is harassment,
  not a fight. Admin or bribery is the DM on business responses; reactions
  govern hireling reliability and are re-rolled after bad treatment.
- Legal encounters (p.99): a positive enforcer reaction is "a potential
  source of rumors, assistance, or patrons"; an adverse one, greater
  harassment. Basis for a reaction-outcome policy in solo play.
- Patrons (p.99): the agreement may instead be shares of the venture's
  total profit with current salaries deducted.

## Random encounter list (p.101) — rows confirmed by Kurt, Sep 2026

Qty, type, remarks: 11 1D Peasants -3; 12 2D Peasants -2; 13 2D Workers -1;
14 3D Rowdies L; 15 2D Thugs L; 16 4D Riotous Mob -1; 21 2D Soldiers +1 LGA;
22 2D Soldiers LGAV; 23 1D Police Patrol +1 GA; 24 2D Marines LGA; 25 3D
Security Troops +1 GA; 26 2D Soldiers on Patrol LGA; 31 1D Adventurers +2
GAV; 32 2D Noble with Retinue LGAV; 33 2D Hunters and Guides +1 LGV; 34 2D
Tourists +2; 35 1D Researchers +3 V; 36 1D Police Patrol VG; 41 1D
Fugitives -2; 42 2D Fugitives V; 43 3D Fugitives G; 44 2D Vigilantes G; 45
3D Bandits L; 46 3D Ambushing Brigands LGA; 51 1D Merchants +1 LA; 52 2D
Traders GV; 53 2D Religious Group (none); 54 1D Beggars L; 55 5D Pilgrims
A; 56 3D Guards A; 61-66 blank. Built in rules 0.85.0 (persons-1982.js).

## Rumors (p.99; matrix and list p.101) — supplied in full, Sep 2026

- "In many Traveller situations, a rumor is simply information leading to
  a patron, a job, or a potential treasure"; in adventures they "educate
  and direct" the players toward the adventure's basis.
- Rumours are faceless and untraceable: acting on one makes the character
  responsible, with no one to blame if it is false — "in effect, absent
  patrons".
- Weekly 7+ on 2D; the matrix gives the letter; also consulted when the
  patron list gives Rumor (list one 23, 36, 66). The referee may invent the
  rumour once the list dictates its type, or write a rumours list for a
  specific adventure.
- Dole them out slowly, so each is dealt with and understood.
- Rumor matrix DMs (p.101): the referee may set DMs for character types
  predisposed to certain rumours. None set yet.
- Legal encounters (p.99): a positive enforcer reaction is "a potential
  source of rumors, assistance, or patrons" — not yet built.
- Built on these: rules 0.84.0 / v0.341.0 rumour leads (patron, find,
  tip; see design.md).

## Referee's Guide to Adventuring (pp.123–125) — supplied in full, Sep 2026

- p.123: adventures classed by setting (ship, location, world,
  choreographed novel), patron, type (chase/pursuit, assault/rescue,
  discovery/exploration, enrichment, enigma/mystery, novelty) and catalyst
  (danger, opportunity, puzzles). Typical patron missions: "steal an
  object, protect an object, find an object, or kill someone"; players may
  become their own patrons, rumours helping.
- p.124: scenario sizes — patron encounter, casual encounter, amber zone,
  short adventure, adventure, campaign. The patron encounter: a players'
  paragraph (location, patron, task, pay, details to form opinions); the
  patron "may provide limited funds for the task"; perhaps six outcomes
  made up (lying, crazy, honest, swindled, devious, dishonest), "the true
  outcome picked by the referee", influencing the encounter and the
  ensuing job. No die is named: the 1D is Kurt's ruling for game-refereed
  jobs. Rumours may add to what is known of the patron; a rumour may be an
  absent patron.
- pp.124-125: campaigns — the basics (map, government, tech), the
  gimmick, the pull, the push, and the optional enigma.
- Quest spec built on these: design.md §9.

### Earlier notes



- Patron missions reduce to four verbs (p.123): steal, protect, find, kill.
  Adventure types: chase/pursuit, assault/rescue, discovery/exploration,
  enrichment, enigma/mystery, novelty. Catalysts: danger, opportunity,
  puzzle. A generator grid for game-refereed jobs.
- Patron encounter method (p.124): a players' paragraph (location, patron,
  task, pay) plus about six referee outcomes, one picked by a 1D throw —
  e.g. the patron is lying / crazy / honest / swindled / devious /
  dishonest. The four sample patrons (pp.126–127) each follow it.
  Graycloak direction (Kurt, Sep 2026): the shape for every game-refereed
  mission — the 1D thrown at acceptance, kept off-screen. Built in rules
  0.83.0; since 0.88.0 the book's six on 1D (missions.js PATRON_OUTCOMES:
  1 honest, 2 crazy (a second 1D, CRAZY_OUTCOMES), 3 swindled, 4 lying,
  5 devious, 6 dishonest) — design.md 9.4.
- Heya amber zone (p.129): a surface job on weekly throws (locate 12+ with
  equipment DMs, recover 8+, guerrilla attack 6+ per week, surprise 10+),
  local transport for hire (ATV Cr300/week, beasts Cr1/week and 100 kg,
  guides Cr100/day, one per vehicle or ten beasts), fencing weapons at
  10×10% over 20 weeks, −2 per streetwise level, 8+ police discover it.
  A model for retrieval jobs.
- Exit Visa (pp.141–146): a shipless group is given "the captain of a free
  trader who needs a crew" as patron (Shadows p.130 likewise: hired onto a
  free trader or passage on a tramp liner). Persuading an official: the
  NPC's reaction throw is the target (throw it or less); a paid bribe (the
  listed price) lets bribery skill be a DM; admin/streetwise as DMs, one
  character only; entertainment paid per head, the party size the DM; four
  periods a day, one random contact a day plus referrals. Bribery caught:
  Cr100 fine and +1 to later bribery throws. Weapons when questioned: arrest,
  confiscation, up to 1D days' jail (adopted, v0.318.1).

## Library data: commercial routes (pp.150–156)

- Xboat routes "are also common trade and transport routes with regular
  commercial transportation provided by one or more transport
  megacorporations. Service to locations not on these routes is less
  frequent and less dependable" (p.150). Tukera runs jump-3/4 liners on
  them; Oberlindes runs feeders to major starports (p.156). Basis for any
  commercial-departure frequency: on-lane regular, off-lane rare.
- Xboats average jump-2.6 a week along their routes (p.153).

## Not adopted from these pages

- The printed legal-encounter wording ("throw law level or less to avoid")
  — the prose reading is used instead (rules 0.77.0).
- The campaign-seeds essay (basics, gimmick, pull, push, enigma; p.125):
  advice to a human referee, not something the engine acts on.
