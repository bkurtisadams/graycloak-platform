# AD&D 1e Combat — Implementation Reference

Distilled mechanics from the 1e DMG combat chapter (Encounters, Combat & Initiative →
Combat Tables), written as a coding reference for `dungeon-encounter`. Mechanics and
numbers only; not a transcription. "Round" = 1 minute = 10 segments of 6 seconds.

## Design intent (why it's abstract)
Hit points are mostly endurance/luck/skill, not meat, until the last few. A round is a
churn of feints, footwork, and parries with one or a few real openings — the to-hit roll
resolves the whole minute, not a single swing. So no hit location and no called shots.
Parries and feints are abstracted into the to-hit roll, but the PHB *also* gives an explicit
**parry action** (see Melee options). Dexterity, weapon length,
and weapon speed are normally *not* turn-order factors — they only surface in the specific
cases listed below (initiative ties, closing/charging, the spell race).

## Round sequence
1. Determine surprise (both sides).
2. Determine distance, if unknown.
3. If neither (or both equally) surprised, roll initiative.
4. Winner's side carries out declared actions, choosing among: A flee/avoid · B parley ·
   C wait · D missiles / device / spell / turn undead · E close or charge · F set weapon vs
   charge · G strike · H grapple/hold.
5. Loser's side carries out its declared actions (same menu).
6. Repeat until flight, incapacity, or death.

Orders are declared **before** initiative is rolled (blind). Loser eats the winner's
resolved results (damage, web, turning, etc.) *before* acting — so a death or disable can
remove the loser's action entirely.

## Surprise
- Default 2-in-6 per side (d6, 1–2). Some creatures surprise more/less easily.
- Each point of surprise = 1 segment (6s) the surprised side is inert.
- Both surprised → subtract the lesser from the greater for net lost segments (equal = none).
- Dex reaction adjust (PHB Dex Table 1) shifts an *individual's* lost segments only; never
  creates surprise.
- During each surprise segment the surprising side may act **as if it were a full round**
  (a 2-attack fighter attacks twice per segment). Ready missiles fire at **3× normal rate**.
- Prior detection (sight, sound, light, detection magic) negates surprise. Surprise can be
  unilateral.

## Distance
- Encounter distance d6+4 = 5"–10" (1" = 10 ft indoors / 10 yd outdoors), modified by
  line of sight, noise, actual room size, sudden arrival, light radius, infravision.
- If either side is surprised, distance is 1"–3" (or less if room-bounded).

## Initiative
- One d6 per side; high roll acts first that round. Ties → simultaneous; **both sides take
  the inflicted damage** regardless of casualties.
- Multiple-attack routines: a side that attacks twice goes **first and last**; if both do,
  the init winner is first & third, loser second & last; single-routine actors fall in the
  middle. Extrapolate for 3+.
- Dex missile-attack adjustment shifts that individual's initiative (can fire before/after
  the side's roll would allow).

## Missile fire
- **Rate of fire (per round):** short bow 2 · long bow 2 · composite bows 2 · light
  crossbow 1 · heavy crossbow 1 every other round · sling 1 · dagger/dart **3** · hand axe
  / hammer / javelin / spear (thrown) 1. *(Confirm each vs PHB before relying on it.)*
- Range mods: −2 medium, −5 long.
- Firing into melee: assign hit probability by participant count, weighting size S ×0.5,
  M ×1, L ×1.5; ratio the groups, convert to % per missile.
- Cover AC bonus: 25%/50%/75%/90% → +2/+4/+7/+10. Concealment → +1/+2/+3/+4.
- Str bonus applies to thrown/specially-built missiles only (not range). Dex bonus applies
  to the to-hit. Giant/siege missiles ignore the target's Dex AC component.

## Grenade-like missiles (thrown flasks)
- Range 3" total; >1" = medium (−2), >2" = long (−5).
- Oil (flaming): direct hit **2d6** first round + **1d6** second, then burns out; splash to
  3 ft does **1–3**/round for 1–3 segments. Must be alight (rag-lit or torched) to burn.
- Acid: 2d8 direct, 1 splash. Holy/unholy water: 2d7 direct, 2 splash (vs undead / planar).
- On a hit, the container must fail an item save (Blow/Crushing) to break and take effect.

## Spell casting in melee
- Caster must be near-motionless and uninterrupted start→finish. Any successful hit (blow,
  missile, or failed-save spell) **before completion cancels the spell** (lost). Casting
  forfeits the Dex AC bonus.
- Declared at round start. Completion lands on the casting-time segment.
- **Weapon-vs-spell race:** adjusted strike segment = weapon speed − losing init die
  (negatives treated positive); compare to casting time to see if the blow lands first,
  simultaneously, or after.

## Closing & charging
- Close: move at base rate to engage; no blow that round if not yet adjacent.
- Charge: indoors = **double** base move (no charge if encumbered); target must be within
  10 ft at the end for a blow.
  - Charger gets **+2 to hit**; loses Dex AC and worsens AC by 1 (AC 10 unaffected).
  - **No initiative at charge end** — the longer weapon/reach strikes first.
  - **One charge per turn** (per 10 rounds) → a 9-round interval before the next.

## Set weapon vs charge
- Brace a piercing weapon (spear, spiked pole arm, fork, glaive) butt-down. On a hit vs a
  charging/onrushing foe it does **double damage** (multiply the damage die ×2, don't roll
  twice). Set weapon automatically strikes first.

## Strike blows — length & speed factor (only when they apply)
- **Closing/charging:** the longer weapon strikes first that contact.
- **Initiative tie + both using weapons:** the lower speed factor strikes first.
- **Speed-factor multiple strike** (post-close, non-charge rounds): compare the two speed
  factors; if the difference is ≥ twice the lower factor **or** ≥ 5, the lower-factor weapon
  gets **2 strikes before** the other acts; if the difference is ≥ 10, 2 strikes then a 3rd
  simultaneous with the slower weapon's first.
- Speed factor is otherwise ignored in a normal round.

## Multiple attack routines
- High-level fighters: 2 attacks every odd round at 13th+ (3/round under haste). Init
  ordering as above. Damage applied as scored; the target must survive to continue its own
  routine.

## Special to-hit bonuses
- +2 vs encumbered / held by one leg / off balance. +4 vs stunned / slowed / both legs held
  / partly bound. Auto-hit vs magically asleep/held/paralyzed/immobile (and max damage,
  double the normal number of attacks).
- Flank: negates shield AC. Rear flank: also negates Dex AC.
- Rear: +2 to hit, negates shield and Dex.
- Stunned/prone/motionless: treat as rear, but **+4**.
- Invisible foe: attacker is at −4 and cannot flank/rear it (unless it can see it).
- To-hit adjustments from spells (bless/curse/prayer/protection) must be applied to **AC**,
  never to the die roll.

## Number of opponents per figure (frontage)
- Single S figure: 4 M, or 6 S, or 2 L attackers. Single M: 8 S / 6 M / 4 L. Single L:
  12 S / 8 M / 6 L. Reduced by corridors/corners; long/wide bodies change the count.
- *(This is the rules basis for weapon "space required" spreading and frontage caps.)*

## Two-weapon use
- Primary −2 / secondary −4 (Dex Reaction/Attack adj. modifies both; high Dex reduces the
  penalties but never to a bonus). Secondary must be dagger or hand axe. No parry value.

## Melee options: attack, parry, fall back, flee (PHB)
A combatant in melee picks one each round:
- **Attack** — weapon, natural weaponry, or grapple.
- **Parry** — forgo your attack this round; your own **Strength "to hit" bonus is subtracted
  from every attacker's to-hit roll** against you that round (you're harder to hit). Only the
  Str to-hit bonus counts, so it's marginal without high Strength — Str 18/00 gives −3, an
  average character gives nothing. No effect on incoming spells / auto-hits.
- **Fall back** — a retrograde move *facing* the opponent(s); **no free attack**. May be
  combined with a parry. Opponents may follow if not otherwise engaged. This is the
  controlled "fighting withdrawal."
- **Flee / break off (DMG)** — rapid withdrawal. Breaking off grants each engaged opponent
  **one free attack**, figured as a **rear attack on a stunned foe (+4, negates shield & Dex)**;
  after it resolves you move at full rate, and a foe can only keep attacking if it follows at
  equal-or-greater speed (→ becomes a pursuit/evasion situation).

The three retreats are distinct: parry (stand, defend), fall back (facing retreat, safe),
flee (fast retreat, eats the free attack).

## Morale (NPCs / intelligent monsters)
- Base 50%. Monsters +5%/HD over 1, +1%/hp over the HD. Checks: superior force (each round),
  25%/50% of the group lost, leader down. Roll d% ≤ score = holds.
- Failure (margin = how badly): 1–15 fall back fighting · 16–30 disengage-retreat ·
  31–50 flee in panic · 51+ surrender.

## Subdual
- Striking to subdue with the flat/haft: damage is 75% temporary, 25% real (does not apply
  to PCs).

---

## Status in the engine
**Implemented:** surprise; encounter distance; side initiative; THAC0 matrices by class
tier & monster HD; weapon-vs-AC; weapon speed (init-tie order + the spell race); charge
(+2, AC penalty, longer-weapon-first); set spear vs charge; polearm reach/closing;
breaking-off free attack (the de-facto withdrawal); saving throws (PHB/DMG matrices,
monster HD→level, non-intelligent at half HD); poison-on-hit; multi-cell footprints &
movement grid (SUB=4 cells / 10 ft); marching order; AD&D sheet bridge; render-only melee
churn with weapon space-required separation.

**Not yet implemented (gaps):**
- **Parry** (PHB, RAW) — forgo attack; subtract the parrier's Str to-hit bonus from
  attackers' rolls that round. Not yet a declarable action.
- **Fall back** (PHB, RAW) — declarable facing retreat, no free attack, combinable with
  parry. Not yet implemented.
- **Flee / break off** (DMG) — the free attack already fires when a token leaves melee; what's
  missing is the labeled "flee" declaration that triggers it deliberately then full-moves away.
- **Missile rate of fire** — bows 2/round, dart 3, heavy crossbow 1/2 rounds, etc. (`rof`
  field now on `dart`; the resolve loop still fires once).
- **Grenade-like missiles** — burning oil / acid / holy water flasks, splash, item-save break.
- **Parley & reaction table** (charisma-adjusted d%).
- **Morale** (checks, modifiers, failure table).
- **Flank / rear / stunned-prone to-hit modifiers** and shield/Dex negation.
- **Number-of-opponents-per-figure frontage cap** (the hard version of space-required).
- **Two-weapon fighting** (−2/−4).
- **Multiple attack routines** for high-level fighters / haste.
- **Firing into melee** allocation ratio; **cover/concealment** AC bonuses.
