# Gamma World 1e → Mighty Protectors Bestiary

**Status:** v0.9.1 (48 of 48 statted) — **bestiary complete ✓** (5 archetypal Robotic Units + generic template). Encounter-tables lines reconciled against `gw-encounter-data.js` (source of truth).
**Destination:** `gcc/gw-mp-bestiary.md`
**Last updated:** 2026-05-24
**Conversion rules:** see `gcc/DESIGN-gw-mp-conversion.md`
**MP character generation reference:** MP 2.1.7.1

Stat blocks for GW1e wilderness encounter table creatures, converted to MP. Encounter tables defined in `gw-encounter-data.js`; this file is the matching MP stat catalog. Ordered alphabetically.

---

## Status by tier

**Tier 1 — Universal (3 creatures, 3/3 done) ✓**
- [x] **Android** (6 tables) — three sub-types: Thinker / Worker / Warrior
- [x] **Robotic Unit** (7 tables) — five archetypal entries + generic template covering all 18 GW1e sub-types per design doc §17
- [x] **Tribesmen** (6 tables) — tiered MP 2.1.7.1 generation; archetype arrays

**Tier 2 — Wide-spread (3 creatures, 3/3 done) ✓**
- [x] **Badder**, **Blaash**, **Zarn**

**Tier 3 — Common (10 creatures, 10/10 done) ✓**
- [x] **Arn**, **Herp**, **Hisser**, **Hoop**, **Pam (Parn)**, **Perth**, **Podog**, **Sep**, **Sleeth**, **Yexil**

**Tier 4 — Regional (14 creatures, 14/14 done) ✓**
- [x] **Ark**, **Blight**, **Cal Then**, **Centisteed**, **Crep Plant**, **Ert**, **Horl Choo (Hori)**, **Kai Lin**, **Obb**, **Orlen**, **Serf**, **Soul Besh**, **Win Seen**, **Zeethh**

**Tier 5 — Single-table specialists (18 creatures, 18/18 done) ✓**
After consolidations: Choo→Horl Choo, Lou→Seroon Lou; phantoms Erl/Sert/Choo Kep removed; OCR variants "Arn Blight"/"Serf Hisser"/"Telden" resolve to existing creatures (Arn+Blight, Serf+Hisser, Ert Telden respectively).
- [x] **Barl Nep (Bari Nep)**, **Ber Lep**, **Brutorz**, **Cren Tosh**, **Ert Telden**, **Fen**, **Fleshin**, **Gren (Grens)**, **Herkel**, **Hopper**, **Keeshin**, **Kep**, **Menarl**, **Narl Ep (Nari Ep)**, **Pineto (Pinelo)**, **Rakox**, **Seroon Lou**, **Terl (Teri / Teal)**

---

## Catalog

### Android

**GW source:** Three sub-types — Thinker (HP 50, AC 6, MV 12), Worker (HP 40, AC 5, MV 12), Warrior (HP 75, AC 4, MV 15). Look indistinguishable from PSH. Specific 18s required by sub-type; remaining BCs rolled per MP 2.1.7.1 Normal Power Level. Consider humans existential threat; travel heavily armed; always fight to the death.
**Encounter tables:** clear, mountains, desert, water, ruins, radioactive (Tier 1, 6 tables)
**Number appearing:** 1d6 each type
**Build:** Humanoid (synthetic). GM picks sub-type per encounter or rolls 1d3.

**Common traits (all sub-types):**
- Origin: **Science Project** (synthetic humanoid, not mutated)
- Compulsion: fight to the death vs. humans -5 CP
- Phobia / Hostility: humans treated as existential threat -5 CP
- "Heavily armed" — GM picks weapons per sub-type
- Unspecified BCs roll per MP 2.1.7.1 Normal Power Level (14/12/10/8/6); stat blocks below show baseline

#### Android — Thinker

```
BCs:        ST 10  EN 12  AG 10  IN 18  CL 18    (MS 18 + IN 18 fixed)

Hits        7~      Power 50      Move 11      Init d6+1
HTH         d3      Inventing 9   Mass d4 (~150 lbs)
```

**Abilities:** Heightened Intelligence ~+8 (8 CP), Heightened Cool ~+8 (8 CP), Heightened Defense Mental (5 CP), Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP)
**Equipment:** GM choice — pistol (5 CP) or short blade (5 CP)
**CP estimate:** ~31 + equipment

#### Android — Worker

```
BCs:        ST 18  EN 18  AG 10  IN 10  CL 10    (ST 18 + Con 18 fixed)

Hits        10~     Power 56      Move 15      Init d4
HTH         d8      Inventing 5   Mass d6 (~250 lbs)
```

**Abilities:** Heightened Strength/Endurance ~+8 each (16 CP), Armor 8 = 6/1/0/1 (12.5 CP)
**Equipment:** GM choice — large club (15 CP) or heavy blade (15 CP)
**CP estimate:** ~33.5 + equipment

#### Android — Warrior

```
BCs:        ST 18  EN 18  AG 18  IN 18  CL 10    (all 18 except MS rolled)

Hits        14~     Power 72      Move 18      Init d4
HTH         d8      Inventing 9   Mass d6 (~250 lbs)
```

**Abilities:** Heightened Strength/Endurance/Agility/Intelligence ~+8 each (32 CP), Armor 9 = 7/1/0/1 (15 CP)
**Equipment:** GM choice — auto rifle (15 CP) or blast rifle (15 CP) + large blade (10 CP)
**CP estimate:** ~57 + equipment

---

### Ark

**GW source:** AC 4, HD 8, MV 15, MS 10, Rad Res 10. 3m intelligent dog-man, mutations Telekinesis + Weather Manipulation + Life Leech, phobia of large winged creatures, wields wicker shield + large club. Considers human hands a delicacy.
**Encounter tables:** forest, ruins (Tier 4, 2 tables)
**Number appearing:** 1d4
**Build:** Humanoid (anthropomorphic intelligent — no A/P)

```
Base BCs:    ST 11  EN 8  AG 12  IN 13  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 16  EN 12  AG 12  IN 13  CL 10

Hits        11      Power 53      Move 13      Init d4
HTH         d6+1    Inventing 7   Mass d6+1 (~700 lbs)   Profile x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Telekinesis A 7.5 CP (300 lbs/d6+1, range 12"), Weather Control A+B (25 CP), Siphon (Hits, Area Effect) 12.5 CP, Armor 6 = 1/3/1/1 K/E/B/Ent (10 CP, rad-leaning), Adaptation Radiation 5 CP
**Weaknesses:** Phobia (large winged creatures) -5 CP
**Equipment:** Large Club (15 CP), wicker shield in Armor
**CP estimate:** ~85
**Origin:** Mutated or Evolved

---

### Arn

**GW source:** AC 9, HD 8, MV 3/16 (ground/fly), bite 2d6, carries ≤2kg in flight. 1.3m mutated flying insect, beast of burden.
**Encounter tables:** clear, mountains, forest (Tier 3, 3 tables)
**Number appearing:** 1d6
**Build:** A/P Insect, Low power level

```
Base BCs:    ST 8  EN 8  AG 14  IN 4  CL 6
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 8  AG 14  IN 4  CL 6

Hits        2       Power 33      Move 10 ground   Init d3
HTH         d3      Inventing 2   Mass d2 (~40 lbs)   Profile /1.5
```

**Abilities:** A/P Insect Low (10 CP — Flight 16m/turn ≤2kg cargo, Natural Weaponry mandibles +4/+6 sharp), Size Change Smaller 4.5' (2.5 CP), Armor 2 = 1/0/0/1 (2.5 CP, chitin)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**CP estimate:** ~15
**Origin:** Mutated or Evolved

---

### Badder

**GW source:** AC 4, HD 6, MV 12, Dex 18, MS 16, bite 1d6, mutation Empathy, hard of hearing, keen sense of smell. 1.5m intelligent mutated badger, medieval society. 10% chance of 1 random artifact weapon.
**Encounter tables:** clear, forest, water, ruins (Tier 2, 4 tables)
**Number appearing:** 1d6
**Build:** Humanoid ("Short" descriptor free at 1.5m)

```
Base BCs:    ST 12  EN 6  AG 18  IN 13  CL 16

Hits        9       Power 49      Move 12      Init d6+1
HTH         d6      Inventing 7   Mass d4 (~100 lbs)
```

**Abilities:** Heightened Agility ~+8 (8 CP), Heightened Cool ~+6 (6 CP), Heightened Intelligence ~+3 (3 CP), Heightened Senses Odors Full+Acute (10 CP), Telepathy visual+verbal+Mood Reading (10 CP — Empathy), Armor 3 = 1/1/0/1 (5 CP)
**Weaknesses:** Diminished Senses hearing -5 CP
**Equipment:** Spear (15 CP), wooden shield in Armor, 10% random artifact weapon
**CP estimate:** ~57
**Origin:** Mutated or Evolved

---

### Barl Nep (Bari Nep)

**GW source:** AC 3, HD 20, MV 20. 1m totally black fish. If attacked: secretes radioactive oil intensity 18 covering 10m diameter area, lasts 10 min in calm water. Killed: extracts intensity 12 oil for 10-min slick.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1
**Build:** A/P Fish, High power level (HD 20 boss)

```
Base BCs:    ST 10  EN 14  AG 14  IN 4  CL 10
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Heightened EN +6 (6 CP)
Effective:   ST 9   EN 20  AG 14  IN 4  CL 10

Hits        11~     Power 47      Move 14 swim + Speed = 20   Init d4
HTH         d4      Inventing 2   Mass d4 (~80 lbs)   Profile /1.5
```

**Abilities:** A/P Fish High (30 CP — Adaptation Aquatic, Heightened Senses, Speed swim, Natural Weaponry bite), Size Change Smaller 4.5' (2.5 CP), Heightened Endurance +6 (6 CP), Speed +6 swim (5 CP — for MV 20), Change Environment Damaging Hard Radiation 11" diameter (12.5 CP — supplement, defensive trigger when attacked, 10m oil slick area, 5 Devit Entropy/round in calm water for 10 min), Adaptation Energy radiation (5 CP), Armor 12 = 6/3/1/2 (20 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (totally black fish) -5
**Resource:** If killed and harvested: yields intensity 12 oil for 10-min radioactive slick (lower intensity than living defense). Combat use: catapult-launched ammunition.
**CP estimate:** ~83
**Origin:** Mutated or Evolved
**Tactics:** Defensive — secretes oil only when attacked. Field persists 10 min in calm water; deters pursuit.

---

### Ber Lep

**GW source:** AC 6, HD 15, MV N/A. Free-floating aquatic plant 2m across, grows as enormous lily-pad-like sheet on water surface. Sweet-smelling acid attracts/kills/dissolves small animals and insects landing on it. Thick enough to support human weight; acid is relatively slow-acting. If injured, teleports 5-30m distant.
**Encounter tables:** ruins (Tier 5, 1 table)
**Number appearing:** 1d8
**Build:** A/P Plant, Standard power level

```
BCs:        ST 8  EN 15  AG 4  IN 3  CL 8

Hits        5~      Power 30      Move N/A (floats; teleports if injured)   Init d3
HTH         d3      Inventing 1   Mass d6 (~600 lbs of plant matter)
```

**Abilities:** A/P Plant Standard (20 CP — Mobility (none/floating only), Heightened Endurance, Adaptation Aquatic), Power Blast Bio sweet acid contact-passive (slow-acting digestive juice, ~1-2/round on stationary creatures, supplement Change Environment alternative possible) (10 CP), Emotion Control Pheromones (sweet-smelling lure for small creatures) (7.5 CP), Teleportation 30m (12.5 CP) with Restriction "only when injured" (-5 CP) = 7.5 CP net, Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP — thick plant fiber, raft-like)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (large floating leaf-sheet) -5
**Tactics:** Passive trap. Small creatures (insects, frogs, small birds) lured by sweet odor, land on sheet, are slowly dissolved. Humans/PCs walking on sheet take slow contact damage but the plant tolerates the weight. If attacked, plant teleports 5-30m away with anyone still on it (potential surprise relocation for PCs).
**CP estimate:** ~55
**Origin:** Mutated or Evolved
**Note:** Slow-acting acid: GM may model as 1 Bio damage per turn of contact. Acid is more dangerous to small/sleeping creatures than active humanoids.

---

### Blaash

**GW source:** AC 8, HD 15, MV 6/15 (ground/fly). ~1m mutated moth, 2m wingspan, fearless and carnivorous. Glows brightly when attacking; emits intensity 18 radiation in 5m radius continuous. Self+kin immune. Post-kill feeding phase.
**Encounter tables:** clear, forest, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1d10
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 10  EN 15  AG 14  IN 4  CL 12
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 9   EN 15  AG 14  IN 4  CL 12

Hits        9~      Power 42      Move 13 (flight)  Init d4+1
HTH         d3      Inventing 2   Mass d3 (~50 lbs)   Profile /1.5
```

**Abilities:** A/P Insect Standard (20 CP — Flight 15m, Heightened Senses, Natural Weaponry +d3 sharp), Size Change Smaller 4.5' (2.5 CP), Change Environment Damaging Hard Radiation 11" diameter (12.5 CP — 5 Devitalization Entropy/round, supplement), Adaptation Energy/radiation complete (5 CP), Light Control C Glare (5 CP), Armor 3 = 1/2/0/0 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:** Hard Radiation field always-on while engaged — anyone within 5m takes 5 Devit Entropy/round automatically (medical treatment may be required per supplement p. 119). Post-kill feeding = ambush window. Fearless.
**CP estimate:** ~50
**Origin:** Mutated or Evolved

---

### Blight

**GW source:** AC 9, HD 12, MV 2/10 (ground/fly). 3m carnivorous winged worm, up to 10m wingspan. Invisibility at will. First attack from invisibility: blinding flash 1d4 turns. Bite 3d6, preferred constriction 5d6/turn. Resistant to radiation, heat, sonic.
**Encounter tables:** mountains, desert, radioactive (Tier 4, 3 tables)
**Number appearing:** 1d4
**Build:** A/P Reptile, Standard power level (snake-like worm)

```
Base BCs:    ST 10  EN 8  AG 12  IN 4  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 15  EN 12  AG 12  IN 4  CL 10

Hits        9~      Power 43      Move 13 ground / 10 fly   Init d4
HTH         d6      Inventing 2   Mass d6 (~600 lbs)   Profile x1.5
```

**Abilities:** A/P Reptile Standard (20 CP — Flight 10m, Natural Weaponry bite +d8 sharp, Heightened Senses), Size Change Larger 9' (7.5 CP), Invisibility Visible Light (10 CP — at-will), Light Control B Flash (5 CP — first-strike blind 1d4 turns), Grapnel constriction 5d6/turn (15 CP), Adaptation Energy radiation+heat (5 CP), Adaptation Kinetic sonic (5 CP), Armor 0
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant worm) -5
**Tactics:** Invisible aerial approach → flash blind on reveal → swoop grapple → constrict (5d6/turn while held). Bite as fallback.
**CP estimate:** ~67.5
**Origin:** Mutated or Evolved

---

### Brutorz

**GW source:** AC 7, HD 14, MV 18. 2m+ at shoulder, mutated horse ("neo-Percheron"), 1000kg bulk, agile despite size. MS 12, intelligent, partial to PSH. Precognition mutation. Combat: 2d6 kicks per forehoof, 3d6 bite. Treated with respect, serves as humanoid mount.
**Encounter tables:** clear, mountains (Tier 5, 2 tables)
**Number appearing:** 1 (2d6 in wild herds)
**Build:** A/P Mammal, Standard power level

```
Base BCs:    ST 12  EN 10  AG 14  IN 8  CL 12
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 17  EN 14  AG 14  IN 8  CL 12

Hits        11~     Power 53      Move 15 + Speed = 18   Init d4+1
HTH         d6+1    Inventing 4   Mass d8 (~2200 lbs)   Profile x1.5
```

**Abilities:** A/P Mammal Standard (20 CP — Speed, Heightened Agility, Natural Weaponry hooves+bite — kicks 2d6/forehoof + bite 3d6 modeled as +d6 blunt and +d8 sharp), Size Change Larger 9' (7.5 CP), Heightened Senses Time/Precognitive (15 CP — Precognition mutation), Heightened Strength ~+4 (4 CP), Speed +3 (2.5 CP — for MV 18), Armor 5 = 3/1/0/1 K/E/B/Ent (7.5 CP — partial muscled hide)
**Weaknesses (in A/P bundle):** Distinctive (giant horse) -5
*Skip Lowered Intelligence — MS 12 is normal*
**Equipment:** saddle/harness for mount use
**CP estimate:** ~56.5
**Origin:** Mutated or Evolved
**Reaction:** Default favorable to PSH (+2 reaction). Will serve as mount if treated with respect. Wild herds (2d6) more skittish; precognition gives them edge in detecting hostile intent.

---

### Cal Then

**GW source:** AC 9, HD 6, MV 4/12 (ground/fly). Intelligent (MS 18) flying insect, up to 2.5m. Huge mandibles 10d6 dmg, can crush duralloy given time. Gourmet for bones — rips flesh off living creatures to get to bones. Resistant to all heat and cold.
**Encounter tables:** mountains, desert (Tier 4, 2 tables)
**Number appearing:** 1
**Build:** A/P Insect, Standard power level (high-MS variant — skip Lowered Int weakness)

```
Base BCs:    ST 10  EN 3  AG 14  IN 8  CL 18
Size mod:    +3 ST, +3 EN  (Size Change Larger 5 CP, 8' tier)
Effective:   ST 13  EN 6  AG 14  IN 8  CL 18

Hits        7~      Power 41      Move 12 fly      Init d6+1
HTH         d4+1    Inventing 4   Mass d4 (~150 lbs)   Profile x1.3
```

**Abilities:** A/P Insect Standard (20 CP — Flight 12m, Natural Weaponry crushing mandibles +d8 sharp, Heightened Senses bone-detection), Size Change Larger 8' (5 CP), Heightened Cool ~+8 outside A/P (8 CP — for MS 18), Heightened Strength ~+4 (4 CP — for crushing power), Heightened Attack +2d6 (10 CP — 10d6 GW = high-tier MP bite), Unprotection -3 Kinetic associated with bite, Max -6 (10 CP — supplement ability, for "given time, crush even duralloy" — each bite reduces target armor), Adaptation Energy heat+cold (5 CP)
**Weaknesses:**
- Distinctive (giant flying insect) -5 CP (in A/P bundle)
- Compulsion (gourmand for bones, distractible by fresh bones) -5 CP (in A/P bundle)
- *No Lowered Intelligence weakness — MS 18 is brilliant*
**CP estimate:** ~57
**Origin:** Mutated or Evolved
**Tactics:** Smart — calculates approach, picks isolated targets. Crushing bite + Unprotection = each bite both deals damage AND reduces target's kinetic armor by 3 (max -6 stacked) — duralloy crushed in 2 bites. Pause to pick bones from a kill (ambush window).

---

### Centisteed

**GW source:** AC 9, HD 7, MV 30. Long-bodied mutated horse with 16 legs, almost insect-like. Carries 2 human-sized riders at full speed. Force Field Generation. Total mental immunity. Increased Metabolism (huge fodder requirement). Combat-unstable — one rider must dedicate to control.
**Encounter tables:** clear, forest (Tier 4, 2 tables)
**Number appearing:** 1
**Build:** A/P Mammal, Standard power level

```
Base BCs:    ST 14  EN 4  AG 14  IN 3  CL 8
Size mod:    +3 ST, +3 EN  (Size Change Larger 5 CP, 8' tier)
Effective:   ST 17  EN 7  AG 14  IN 3  CL 8

Hits        6~      Power 41      Move 30 (Super Speed + Speed)   Init d3
HTH         d6+1    Inventing 1   Mass d8 (~1500 lbs)   Profile x1.3
```

**Abilities:** A/P Mammal Standard (20 CP — Speed, Heightened Agility, Natural Weaponry hooves/mandibles), Size Change Larger 8' (5 CP), Force Field A Personal (~22 protection, 17.5 CP), Adaptation Mental complete immunity (5 CP), Super Speed +1 turn (10 CP), Speed +6 (5 CP — total Move 30)
**Weaknesses:**
- A/P bundle: Lowered Intelligence -5, Distinctive (centipede-horse) -5
- Special Requirement (huge fodder, Increased Metabolism) -7.5
- Personal Problem (combat-unstable, requires rider's full attention to control) -10
**Equipment:** saddle/bridle (riding gear)
**CP estimate:** ~52
**Origin:** Mutated or Evolved
**Tactics (as mount):** One rider rolls Influence Task each turn to maintain control; on fail, centisteed bolts/balks. Force Field protects rider too. Mental immunity means it's unaffected by psionic attacks aimed at riders.

---

### Cren Tosh

**GW source:** AC 3, HD 16, MV 12. 2m fish that can transform into any lizard (with Sleeth-like mutations) for up to 24 hours. In fish form, burrows wide tunnels into riverbanks for nesting. Eats only plants, collects shiny objects.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1
**Build:** A/P Fish (primary form), Standard power level

```
Base BCs:    ST 12  EN 12  AG 12  IN 8  CL 12
Size mod:    +2 ST, +1 EN  (Size Change Larger 2.5 CP, 7' tier)
Heightened EN +3 (3 CP)
Effective:   ST 14  EN 16  AG 12  IN 8  CL 12

Hits        12~     Power 50      Move 14 swim   Init d4+1
HTH         d6      Inventing 4   Mass d6 (~400 lbs)   Profile x1.2
```

**Abilities:** A/P Fish Standard (20 CP — Adaptation Aquatic, Heightened Senses, Natural Weaponry bite +d6 sharp), Size Change Larger 7' (2.5 CP), Heightened Endurance +3 (3 CP), Shape-Shifting Comprehensive (lizard category w/ Sleeth-tier mutations) ~25 CP — high-tier shift inheriting target abilities, Tunneling (Max SR 2 dirt, Max Speed 6, associated with bite for nesting tunnels) 12.5 CP (supplement), Armor 12 = 7/2/0/3 (20 CP)
**Weaknesses (in A/P bundle):** Distinctive (large fish/lizard transformer) -5
*Skip Lowered Intelligence — IN 8 with high adaptability is normal*
**Lizard form note:** When shape-shifted, gains Sleeth abilities (see Sleeth entry: Telepathy, Precognition, Force Field Negation, illusion immunity, poison resistance 18). 24-hour duration. Reverts on injury below half Hits or voluntary.
**CP estimate:** ~88 + Sleeth-form variable abilities
**Origin:** Mutated or Evolved
**Tactics:** Default fish-form ambush from bank tunnel. Shape-shift to Sleeth-form only when threatened or for negotiation. Greedy — interested in shiny PC tech.

---

### Crep Plant

**GW source:** AC 3, HD 15, MV 1. Two varieties: water (pink, submerged) and land (red, rainy areas). Mental mutations: Death Field Generation, Molecular Disruption, Life Leech (feeds via). Plant mutations: Mobility, 1d4 manipulation vines, Parasitic Attachment. Reproduction: leaf-attachments drain blood 10 HP/turn, drop after victim dies, burrow → new plant.
**Encounter tables:** mountains, water (Tier 4, 2 tables)
**Number appearing:** 1d10
**Build:** A/P Plant, High power level (HD 15 boss)

```
BCs:        ST 12  EN 15  AG 5  IN 4  CL 10

Hits        7~      Power 36      Move 1 (limited)   Init d3
HTH         d4+1    Inventing 2   Mass d8 (~1500 lbs)
```

**Abilities:** A/P Plant High (30 CP — Mobility, Stretching A 1d4 vines, Natural Weaponry vine grasp, Heightened Endurance), Power Blast Bio Area Effect Death Field 20m radius (25 CP — Death Field Generation), Disintegration A (15 CP — Molecular Disruption), Siphon Hits Parasitic Attachment 10 HP/turn sustained (15 CP — Life Leech feeding mechanism), Armor 12 = 8/2/0/2 K/E/B/Ent (20 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant carnivore plant) -5
**Reproduction:** Successfully attached victim killed by Siphon → leaf-pod drops, burrows, becomes new crep plant in 30 days. Encounter creates persistent local hazard.
**CP estimate:** ~105
**Origin:** Mutated or Evolved
**Variants:** Water (aquatic-only, Adaptation Aquatic +5 CP). Land (any rainy area).

---

### Ert

**GW source:** AC 9, HD 3, MV 8. 1m fish in swift mountain streams. Bite has chance to turn victim to granite-like rock — treat as intensity 12 poison attack, "D" result = stone.
**Encounter tables:** forest, water (Tier 4, 2 tables)
**Number appearing:** 1
**Build:** A/P Fish, Low power level

```
BCs:        ST 6  EN 3  AG 12  IN 3  CL 6

Hits        1~      Power 24      Move 8 swim      Init d3
HTH         d2      Inventing 1   Mass d2 (~30 lbs)
```

**Abilities:** A/P Fish Low (10 CP — Adaptation Aquatic, Natural Weaponry bite +d4 sharp), Transmutation A (organic→stone, contact via bite, intensity 12 save) (17.5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (innocuous-looking fish) -5
**Tactics:** Hides in current, ambushes wading targets. Single bite check vs. intensity 12; "D" save result = full petrification (per GW rules). Fragile — easy kill if spotted, but the threat is the bite-trigger.
**CP estimate:** ~27.5
**Origin:** Mutated or Evolved

---

### Ert Telden

**GW source:** AC 6, HD 12, MV 9. 1m+ fish in backwaters/marshes/swamps. Self-destructive defense: when removed from water, turn 1 burns hot enough to deal 5d6 heat damage to all within 30m; turn 2 explodes for 10d6 to all in range. Sometimes captured by tribes for catapult-launched warfare.
**Encounter tables:** desert, water (Tier 5, 2 tables)
**Number appearing:** 1d6
**Build:** A/P Fish, Standard power level

```
Base BCs:    ST 8  EN 12  AG 12  IN 4  CL 8
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 12  AG 12  IN 4  CL 8

Hits        5~      Power 35      Move 9 swim    Init d3+1
HTH         d3      Inventing 2   Mass d3 (~70 lbs)   Profile /1.5
```

**Abilities:** A/P Fish Standard (20 CP — Adaptation Aquatic, Heightened Senses, Natural Weaponry bite), Size Change Smaller 4.5' (2.5 CP), Power Blast Energy Heat Area Effect 30m radius / 60" diameter — escalating 2-stage (turn 1 ~2d6, turn 2 ~3d6 + Death Touch finisher), trigger-restricted to "when out of water" (~30 CP), Adaptation Energy heat (self-immune, 5 CP), Armor 6 = 3/2/0/1 (10 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (orange-glowing fish out of water) -5, Special Requirement (water-bound — dies if out >2 turns) -7.5
**Tactics (as creature):** Stays in water. Defense is its own death — only triggered if removed.
**Tactics (as weapon):** Tribes catapult Ert Telden over walls. Turn 1: 30m heat field 2d6 area dmg. Turn 2: explosion 3d6 + finisher. Then dead.
**CP estimate:** ~62.5
**Origin:** Mutated or Evolved

---

### Fen

**GW source:** AC 7, HD 10, MV 12 water / 3 land / 8 fly. Intelligent man-sized fish, walks on 2 stubby fins. Lungs + gills (24h out of water OK). Translucent skin = invisible underwater. Use weapons; tail club 6d6. Resistant to radiation, poison resistance 18, reflect heat + light (laser) for 5 turns before taking damage. Shape-change to large bird and fly to escape.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1d10
**Build:** Humanoid (intelligent, weapons — no A/P)

```
BCs:        ST 12  EN 10  AG 14  IN 12  CL 12

Hits        10~     Power 48      Move 12      Init d6
HTH         d6      Inventing 6   Mass d4 (~150 lbs)
```

**Abilities:** Adaptation Aquatic (5 CP), Adaptation Energy radiation complete (5 CP), Adaptation Bio poison resistance 18 (5 CP), Reflection Energy (heat + light/laser, duration 5 rounds before taking damage) ~12.5 CP — limited duration variant, Invisibility Visible Light (Underwater-only restriction) 7.5 CP, Flight 8m (5 CP), Shape-Shifting (large bird, escape only, no abilities transfer) 10 CP, Natural Weaponry tail club +d10 blunt (10 CP — for 6d6 GW), Armor 5 = 2/2/0/1 (7.5 CP)
**Weaknesses:** none baseline
**Equipment:** Any weapon — Fens collect and use freely (15-25 CP iron-age to recovered tech).
**CP estimate:** ~67.5 + equipment
**Origin:** Mutated or Evolved
**Tactics:** Underwater Invisibility for ambush. Reflection covers first 5 rounds of energy attacks. Shape-shift escape if losing. Smart, weapon-using — treat like primitive humanoid tribe with environmental advantages.

---

### Fleshin

**GW source:** AC 8, HD 8, MV 9 water / 5 fly (glide). 2m fish in large lakes. Surface-skims, then launches and glides on broad pectoral fins for hours. Feeds on water birds + small animals; attacks humans when hungry. Dorsal fin: intensity 15 poison spines. If seriously threatened: shapechange to Sleeth with all that creature's powers.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1
**Build:** A/P Fish, Standard power level

```
Base BCs:    ST 12  EN 7  AG 12  IN 4  CL 8
Size mod:    +2 ST, +1 EN  (Size Change Larger 2.5 CP, 7' tier)
Effective:   ST 14  EN 8  AG 12  IN 4  CL 8

Hits        7~      Power 38      Move 11 + 5 glide   Init d3+1
HTH         d6      Inventing 2   Mass d6 (~400 lbs)   Profile x1.2
```

**Abilities:** A/P Fish Standard (20 CP — Adaptation Aquatic, Flight gliding, Natural Weaponry bite +d6 sharp), Size Change Larger 7' (2.5 CP), Poison/Venom A intensity 15 contact passive on dorsal (12.5 CP), Shape-Shifting (Sleeth with full ability transfer, escape/desperation only) 25 CP — high-tier specific-target shift, Armor 3 = 1/1/0/1 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant flying fish) -5
**Sleeth-form transformation:** When seriously threatened, GM runs Fleshin as full Sleeth stat block (Telepathy, Precognition, Force Field Negation, illusion immune, poison res 18, etc.). Reverts when safe.
**CP estimate:** ~65
**Origin:** Mutated or Evolved
**Tactics:** Glide ambush of waterfowl and unwary swimmers. Dorsal poison defends melee approaches. Shape-shift to Sleeth as emergency exit — Sleeth's mental kit + peaceful-talker reputation lets it negotiate or escape from situations a Fleshin couldn't survive.

---

### Gren (Grens)

**GW source:** AC 4, HD 20, MV 12. PSH-looking but with deep green skin. Intelligent, secluded in deep forests. Cannot be seen or sensed by any creature until they reveal themselves. Refuse to use ancient tech or learn Ancient knowledge. 70% shun outsiders, 30% friendly to PSH if approached non-hostilely.
**Encounter tables:** forest (Tier 5, 1 table)
**Number appearing:** 1d6
**Build:** Humanoid (intelligent — no A/P)

```
Base BCs:    ST 12  EN 14  AG 12  IN 14  CL 14
Heightened EN +6 (6 CP)
Effective:   ST 12  EN 20  AG 12  IN 14  CL 14

Hits        12~     Power 58      Move 12      Init d4+1
HTH         d4+1    Inventing 7   Mass d4 (~150 lbs)
```

**Abilities:** Heightened Endurance +6 (6 CP — for HD 20), Invisibility full-sensory (visible + IR + sonic + mental + olfactory), Restriction "deep forest only" (~25 CP — high-tier multi-sense Invisibility with terrain Restriction -5), Adaptation Mental sense-immunity (5 CP — backstop), Heightened Cool ~+4 (4 CP), Heightened Intelligence ~+4 (4 CP), Armor 9 = 5/2/0/2 K/E/B/Ent (15 CP — leather/hide armor)
**Weaknesses:** Phobia (Ancient tech, refuses to use or learn) -5
**Equipment:** Iron-age weapons only — bow (8 CP) + spear (15 CP) typical, never ancient tech
**CP estimate:** ~54 + equipment
**Origin:** Mutated or Evolved
**Reaction:** Default unfriendly (70% shun); 30% chance peaceful engagement if approached non-hostilely. Won't trade or share Ancient lore.
**Tactics:** Total stealth in deep forest until they choose to reveal. Surprise advantage automatic. Retreat to forest depths if injured. Outside their forest, Invisibility doesn't function — they're vulnerable PSH-equivalents.

---

### Herkel

**GW source:** AC 9, HD 4, MV 8. Small (.5m) viciously biting fish, piranha-grade. Bite 6d6/turn. Scales coated with intensity 18 contact poison. Eats anything fittable in jaws.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1d10
**Build:** A/P Fish, Low power level

```
Base BCs:    ST 6  EN 5  AG 14  IN 2  CL 6
Size mod:    -1 ST, -1 EN  (Size Change Smaller 5 CP, 3' tier)
Effective:   ST 5  EN 4  AG 14  IN 2  CL 6

Hits        2~      Power 25      Move 8 swim    Init d3
HTH         d3 + Heightened Attack = vicious  Inventing 1
Mass        d2 (~10 lbs)   Profile /2
```

**Abilities:** A/P Fish Low (10 CP — Adaptation Aquatic, Natural Weaponry vicious bite +d8+1 sharp / 6d6 GW), Size Change Smaller 3' (5 CP), Heightened Attack +1d6 to damage (5 CP — frenzied bite), Poison/Venom A intensity 18 passive contact via scales (15 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5, Compulsion (eats anything, frenzied feeders) -5
**Tactics:** Swarm-attack target en masse (1d10 herkels). Each individual is fragile (Hits 2) but bite damage is high. Touching scales = poison contact. Even handling dead herkels triggers contact poison.
**CP estimate:** ~30
**Origin:** Mutated or Evolved
**Note:** Like piranhas — individual fragility offset by group attacks and high per-bite damage. PCs must avoid water entry near a school.

---

### Herp

**GW source:** AC 3, HD 20, MV 10. 3.5m carnivorous mutated beetle, flightless. Wing case reflects sonic. Acid stream 30m, 15d6 dmg, eats through 1/2 cm duralloy in 3 turns. All-weather tracking.
**Encounter tables:** clear, mountains, forest (Tier 3, 3 tables)
**Number appearing:** 1
**Build:** A/P Insect, High power level (HD 20 boss)

```
Base BCs:    ST 10  EN 10  AG 10  IN 5  CL 10
Size mod:    +9 ST, +9 EN  (Size Change Larger 15 CP, 12' tier)
Effective:   ST 19  EN 19  AG 10  IN 5  CL 10

Hits        11~     Power 53      Move 16      Init d4
HTH         d8      Inventing 3   Mass d8 (~1000 lbs)   Profile x2
```

**Abilities:** A/P Insect High (30 CP — Natural Weaponry mandibles, Heightened Senses all-weather tracking, Heightened Attack +1d6, Reflection Sonic), Size Change Larger 12' (15 CP), Power Blast Bio acid stream 30m ~3d8 sharp/bio (25 CP), Armor 12 = 8/2/0/2 (20 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5, Compulsion (fight to death) -5
**Tactics:** Acid stream at range first; closes only when prey wounded. Reflective wing case turns sonic attacks back on attacker.
**CP estimate:** ~90
**Origin:** Mutated or Evolved

---

### Hisser

**GW source:** AC 3, HD 18, MV 12. 3m half-man-half-snake, arid regions. Telepathic, MS 12. Mass mind, sonic attack ability, +1 random mental mutation per individual. Scaly skin laser+sonic resistant. Matriarchal (queen + 70 males). No spoken language — all telepathic. Use Ancient artifacts.
**Encounter tables:** mountains, forest, water, radioactive (Tier 3, 4 tables)
**Number appearing:** 1d10
**Build:** Humanoid (intelligent — no A/P)

```
Base BCs:    ST 12  EN 14  AG 14  IN 12  CL 12
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 17  EN 18  AG 14  IN 12  CL 12

Hits        13~     Power 61      Move 16      Init d6
HTH         d6+1    Inventing 7   Mass d6 (~400 lbs)   Profile x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Telepathy visual+verbal (10 CP), Sonic Abilities A + Area Effect (12.5 CP), Random mutation per individual ~10 CP (roll on §10-12), Armor 12 = 6/3/1/2 (20 CP — laser/sonic-weighted)
**Mass Mind:** Narrative coordination — when 3+ hissers act together, +1 to hit, shared awareness. No CP cost.
**Equipment:** Recovered tech artifact per individual (~10-15 CP)
**CP estimate:** ~60 + per-individual mutation + equipment
**Origin:** Mutated or Evolved
**Note:** 1 in 70 is queen-aspirant: + Heightened Cool +6, Heightened Defense Mental.

---

### Hoop

**GW source:** AC 9, HD 15, MV 18. 2.6m mutated rabbitoid bipeds. Leap 8m vertical. Intelligent (MS 3-18), telepathic, mass mind. Special: transmute metal to rubber (touch, 1m radius). Manipulative forepaws. Use Ancient weapons.
**Encounter tables:** clear, mountains, ruins (Tier 3, 3 tables)
**Number appearing:** 1d6
**Build:** Humanoid ("Tall" descriptor free at 2.6m)

```
Base BCs:    ST 10  EN 14  AG 18  IN 10  CL 14
Size mod:    +2 ST, +1 EN  (Size Change Larger 2.5 CP, 7' tier)
Effective:   ST 12  EN 15  AG 18  IN 10  CL 14

Hits        12~     Power 55      Move 15      Init d4+1
HTH         d4+1    Inventing 5   Mass d4 (~150 lbs)   Profile x1.2
```

**Abilities:** Size Change Larger 7' (2.5 CP), Heightened Agility ~+8 (8 CP — covers leap-8m), Telepathy (10 CP), Transmutation Metal→Rubber touch range 1m radius (17.5 CP)
**Mass Mind:** Narrative coordination, no CP cost.
**Equipment:** Ancient weapons preferred — pistol/rifle/blaster per individual
**CP estimate:** ~38 + equipment
**Origin:** Mutated or Evolved
**MS variability:** Roll 3d6 per individual for MS → CL. Chief-tier hoops get full Heightened Cool ~+8.
**Note:** Transmutation devastates metal-armored/-armed PCs. Rubber armor = AC 9, rubber pistol = jammed, etc.

---

### Hopper

**GW source:** AC 9, HD 3, MV 12 (hop at 24). Giant hare-like mutant. 100kg burden mount; requires special saddle/harness. 75% chance new rider thrown for 1-6 dice damage on first ride. Stupid (hoops regard them as we do chimps). Chameleon powers. Unburdened: 12m leaps, 8m vertical clear.
**Encounter tables:** clear (Tier 5, 1 table)
**Number appearing:** 1 (1d20 in wild)
**Build:** A/P Mammal, Low power level

```
Base BCs:    ST 12  EN 3  AG 16  IN 2  CL 6
Size mod:    +2 ST, +1 EN  (Size Change Larger 2.5 CP, 7' tier)
Effective:   ST 14  EN 4  AG 16  IN 2  CL 6

Hits        3~      Power 36      Move 11+Speed=17 normal / 24 hop   Init d3
HTH         d4+1    Inventing 1   Mass d4 (~150 lbs)   Profile x1.2
```

**Abilities:** A/P Mammal Low (10 CP — Heightened Agility, Speed, Natural Weaponry kicks +d4 sharp), Size Change Larger 7' (2.5 CP), Speed +6 (5 CP — for MV 12 normal), Super Speed +1 turn with Restriction "leaping only" (10 CP — for MV 24 hop mode), Invisibility Visible Light Camouflage (10 CP — chameleon powers)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant hare) -5
**Mount mechanics:** Special saddle/harness required. New rider rolls d100; on 75-or-less, thrown for 1d6 dice (3-18) blunt damage. Each unfamiliar session: re-roll. Carries 100kg.
**Equipment:** Special saddle (mount accessory)
**CP estimate:** ~37.5
**Origin:** Mutated or Evolved
**Tactics:** Wild hoppers flee using Camouflage + leap-mode speed. Domesticated hoppers serve mounted PCs but require ridership skill check on first use. Ground combat is fragile (Hits 3) — leap to escape, not engage.

---

### Horl Choo (Hori)

**GW source:** AC 5, HD 18, MV 6. Black plant resembling a lumpy porcupine with 3m spear-like quill-stems. 5d6 (6-30) stems. Flings spears at any being within 90m: intensity 9 poison + 3d6 dmg. Spears attached by strong vines — retrieve missed shots, drag impaled prey back to base. Dissolving juices break down victim. Limited mobility (moves to better hunting grounds).
**Encounter tables:** clear, mountains, forest, desert (Tier 4, 4 tables)
**Number appearing:** 1
**Build:** A/P Plant, Standard power level

```
BCs:        ST 14  EN 18  AG 8  IN 4  CL 10

Hits        11~     Power 44      Move 6 (limited)   Init d4
HTH         d6+1    Inventing 2   Mass d8 (~1500 lbs)
```

**Abilities:** A/P Plant Standard (20 CP — Mobility limited, Stretching A retrieving vines, Natural Weaponry vines), Special Missile Weapon spear-stems 90m range 3d6 sharp + intensity 9 poison ammo 5d6 (20 CP — combined poison-tipped missile), Power Blast Bio dissolving juices for digestion (15 CP — also functions as area attack post-impale), Armor 8 = 5/1/0/2 (12.5 CP — woody bark)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:** Wait. Anything within 90m → fire spear. Hits drag prey back via vines. Multiple spears can engage multiple targets. Dissolving juice digests trapped prey while plant continues firing remaining quills.
**CP estimate:** ~67.5
**Origin:** Mutated or Evolved

---

### Kai Lin

**GW source:** AC 6, HD 12, MV 10. 3-4m plant resembling a reptile. Runs on 2 stalks with thorny pads (clawed-foot resemblance), trails root-tail. Rad-resistant green bark scales. Scavenger but kills fresh prey. MS 5. Mutations: Electrical Generation, Attraction Odor, Radiated Eyes.
**Encounter tables:** forest, desert (Tier 4, 2 tables)
**Number appearing:** 1d4
**Build:** A/P Plant, Standard power level

```
Base BCs:    ST 10  EN 8  AG 10  IN 3  CL 5
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 15  EN 12  AG 10  IN 3  CL 5

Hits        7~      Power 40      Move 11      Init d3
HTH         d6      Inventing 2   Mass d6 (~600 lbs)   Profile x1.5
```

**Abilities:** A/P Plant Standard (20 CP — Mobility, Natural Weaponry thorny pad-claws +d4 sharp, Heightened Senses), Size Change Larger 9' (7.5 CP), Lightning Control A Electrical Bolt contact 4d6 (12.5 CP — Electrical Generation), Emotion Control Pheromones (Attraction Odor for prey lure) (7.5 CP), Power Blast Energy radiation eyes short range (12.5 CP — Radiated Eyes), Adaptation Energy radiation (5 CP — rad-resistant bark), Stretching A root-tail entwining for assimilating carrion (5 CP), Armor 6 = 3/2/0/1 K/E/B/Ent (10 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (reptile-plant) -5
**CP estimate:** ~80
**Origin:** Mutated or Evolved
**Tactics:** Group hunters — wander in small packs. Attraction Odor lures prey close, then electrical bolt + radiated eyes at range, claws in close. Trails tail/root behind to assimilate fresh kills or located carrion.

---

### Keeshin

**GW source:** AC 3, HD 7, MV Telekinetic Flight. Small white mutated amphibian in water. IN 18, MS 16. Mental mutations: Telekinetic Flight, Telekinesis, Telekinetic Arm, Force Field Generation, Life Leech, De-evolution, Mental Blast, Cryokinesis, Reflection. Uses any 2 per turn. Solitary, ruthless, greedy. Builds underwater stone dwellings telekinetically with air pockets, stockpiles Ancient devices.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1
**Build:** Humanoid (intelligent — no A/P)

```
BCs:        ST 8  EN 7  AG 16  IN 18  CL 16

Hits        9~      Power 49      Move via Telekinetic Flight   Init d6+1
HTH         d3      Inventing 9   Mass d3 (~50 lbs)
```

**Abilities (full kit):**
- Heightened Intelligence ~+8 to IN (8 CP — for IN 18)
- Heightened Cool ~+6 to CL (6 CP — for MS 16)
- Telepathy (10 CP — implied by mental mutation kit, communicates over Ancient device transactions)
- Flight (Telekinetic, moderate speed) (10 CP)
- Telekinesis A (7.5 CP — also lifts/manipulates stone for dwelling-building)
- Stretching Abilities A Telekinetic Arm (10 CP)
- Force Field A Personal (17.5 CP)
- Siphon Hits Life Leech (12.5 CP)
- Transmutation Comprehensive De-evolution (25 CP)
- Mental Ability A Mental Blast (17.5 CP)
- Ice Abilities B Cryokinesis Blast (12.5 CP)
- Reflection (one type, e.g., energy) (12.5 CP)
- Adaptation Aquatic (5 CP — water-dwelling)
- Armor 6 = 3/2/0/1 (10 CP)

**Action restriction:** Per GW: "may utilize any 2 of these mutations per melee turn." MP equivalent: 2 attack-class abilities per turn cap (interpret as standing limitation; no additional CP modifier).
**Weaknesses:** Compulsion (greedy, gathers Ancient devices) -5 CP
**Equipment:** Stockpile of Ancient artifacts in dwelling. Encountered Keeshin carries 1d6 random artifacts (15-30 CP avg).
**CP estimate:** ~165 base + equipment (boss-tier despite HD 7; mental mutation kit dominates)
**Origin:** Mutated or Evolved
**Tactics:** Solitary ambush from underwater dwelling. Opens with Mental Blast or Cryokinesis at range while flying. Force Field always-on. De-evolution as endgame against tough opponents. Will kill PCs who threaten artifact hoard.
**Note:** Like Serf, this is a low-HP boss-tier creature with massively over-budget mental kit. GM may scale picks (3-4 mutations active per encounter) for non-elite Keeshin.

---

### Kep

**GW source:** AC 2, HD 20, MV N/A. Carnivorous plant in sandy soil, grows underground. 30m diameter pressure-sensitive net of squeeze roots just below surface. Walking over → roots spring out, ensnare. Squeeze 5d6 constrictive dmg/turn. Damaged >half HP: releases captives, retreats underground. Prey ceases struggle: dissolving juices digest. After meal: 1 mobile seed scurries off to make new plant.
**Encounter tables:** desert (Tier 5, 1 table)
**Number appearing:** 1
**Build:** A/P Plant, High power level (HD 20 boss; trap-tier)

```
BCs:        ST 16  EN 16  AG 4  IN 4  CL 10
Heightened EN +4 (4 CP)
Effective:   ST 16  EN 20  AG 4  IN 4  CL 10

Hits        10~     Power 44      Move 0 surface / Tunneling underground   Init d3
HTH         d6+1    Inventing 2   Mass d10 (~3000 lbs root mass)
```

**Abilities:** A/P Plant High (30 CP — Stretching A 30m diameter root net, Natural Weaponry crushing roots, Heightened Endurance, Heightened Strength), Tunneling sand soil (Max SR 1, Max Speed 12, primary locomotion underground, supplement) ~12.5 CP, Grapnel (squeeze roots, 30m diameter trap zone, ensnare + 5d6 crush per turn) ~20 CP, Power Blast Bio dissolving juices post-capture digestion (10 CP), Heightened Endurance +4 (4 CP), Armor 16 = 10/2/0/4 K/E/B/Ent (30 CP — thick root mass)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (when revealed) -5, Special Requirement (sandy soil only) -5
**Trap mechanic:** 30m diameter pressure-sensitive zone. Walking creatures trigger roots-spring on next turn. AG save (severe DC) to dodge. Caught targets: 5d6/turn crush damage until released.
**Retreat:** When >half HP damaged, releases all captives and Tunneling-retreats underground.
**Reproduction:** After complete meal (digestion), produces 1 mobile seed. Seed Tunneling-surfaces, scurries up to 1km away, plants new colony.
**CP estimate:** ~107.5
**Origin:** Mutated or Evolved
**Tactics:** Pure ambush. Detection nearly impossible without Heightened Senses or magical detection. PCs may spot disturbed soil pattern (very hard task) or trigger trap. Surrounding ground is always plant-free — could be a clue.

---

### Menarl

**GW source:** AC 6, HD 7, MV 6. 10m intelligent water snake with 10 human-shaped manipulator arms. Heightened Strength 17, MS 12. Bird-loving — frenzied near birds. Friendly to humanoids, will use Ancient devices if shown how.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1d4
**Build:** Humanoid (intelligent, manipulative — no A/P)

```
Base BCs:    ST 12  EN 3  AG 12  IN 8  CL 12
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 17  EN 7  AG 12  IN 8  CL 12

Hits        7~      Power 44      Move 10 swim   Init d4+1
HTH         d6+1    Inventing 4   Mass d8 (~1500 lbs elongated)   Profile x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Physical Ability B Extra Limbs (10 arms, 4 attack-pairs available per turn) ~17.5 CP, Adaptation Aquatic (5 CP), Natural Weaponry bite + arm-grip (7.5 CP), Armor 6 = 4/1/0/1 (10 CP)
**Weaknesses:**
- Compulsion (frenzy near birds — distractible, attacks birds in preference to other targets) -5
- Distinctive (10-armed water snake) -5
**Equipment:** Will use Ancient devices if shown how — variable per encounter (10-25 CP if armed)
**CP estimate:** ~52.5 + equipment
**Origin:** Mutated or Evolved
**Reaction:** Default friendly to humanoids — barter possible. Frenzy-on-birds is the wild card; if a bird is present, reaction shifts to "consumed by hunting urge", may ignore conversation.

---

### Narl Ep (Nari Ep)

**GW source:** AC 3, HD 20, MV N/A. Enormous white mutated tree, 50m+ tall, lives in water. Pale green leafy top + 5-30 squeeze vines projecting above surface. Spring: seed pods on vines. Pods cracked (sharp blow) → 2-12 seeds fly out + sonic blast 3d6 in 10m radius.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1
**Build:** A/P Plant, High power level (HD 20 boss)

```
Base BCs:    ST 12  EN 8  AG 4  IN 3  CL 8
Size mod:    +12 ST, +12 EN  (Size Change Larger 20 CP, 15' tier)
Effective:   ST 24  EN 20  AG 4  IN 3  CL 8

Hits        10~     Power 51      Move 0 (rooted)   Init d3
HTH         d12+1   Inventing 1   Mass d12 (~5 tons rooted)   Profile x2.5
```

**Abilities:** A/P Plant High (30 CP — Stretching A 5-30 squeeze vines, Natural Weaponry vine grasp +d8+1 blunt, Heightened Endurance, Heightened Strength), Size Change Larger 15' (20 CP), Grapnel (squeeze vines, crushing) (15 CP), Special Missile Weapon — seed pods (sonic blast 3d6 + 2-12 seed projectiles, 10m radius, ammo limited to ripe pods in spring) (15 CP), Sonic Abilities A Sonic Blast Area Effect 10m (12.5 CP — pod-cracking trigger), Adaptation Aquatic (5 CP), Armor 12 = 6/2/1/3 (20 CP — bark + plant fiber)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (50m white tree) -5, Special Requirement (immobile, rooted in water) -5
**Tactics:** Passive defense via squeeze vines for anything within reach. Pods detonate if struck (sharp blow) — sonic blast + projectile seeds. Acts as terrain feature/encounter set-piece in lake/swamp environments.
**CP estimate:** ~117.5
**Origin:** Mutated or Evolved
**Cross-reference:** Seroon Lou often hides among Narl Ep colonies — similar appearance, darker color. PCs encountering "a Narl Ep" should roll for hidden Seroon Lou (10-30% chance per individual plant).

---

### Obb

**GW source:** AC 10, HD 12, MV 1/15 (ground/fly). 1m mutated fungus resembling a bat. Nearly immobile on ground, hawk-swift in air. Single black eye delivers intensity 16 radiation blast. Two clawed appendages strike for 3d6 each. Devours half of body, plants spores in remains; 1d6 young obbs emerge in 1 day. Resistant to radiation, all laser, light, heat. Sometimes peacefully associates with intelligent beings — alien logic.
**Encounter tables:** forest, desert (Tier 4, 2 tables)
**Number appearing:** 1
**Build:** A/P Plant (fungus), Standard power level — high-MS variant, skip Lowered Int

```
Base BCs:    ST 8  EN 12  AG 14  IN 12  CL 12
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 12  AG 14  IN 12  CL 12

Hits        8~      Power 45      Move 1 ground / 15 fly   Init d6
HTH         d4      Inventing 6   Mass d3 (~50 lbs)   Profile /1.5
```

**Abilities:** A/P Plant Standard (20 CP — Flight 15m, Natural Weaponry clawed appendages +d6 sharp x2, Heightened Senses), Size Change Smaller 4.5' (2.5 CP), Power Blast Energy radiation eye intensity 16 25-30m ~2d6 (17.5 CP), Adaptation Energy (radiation + laser + heat, multi-type) (10 CP), Adaptation Light (light immunity) (5 CP)
**Weaknesses:** Distinctive (fungus-bat) -5 CP
*No Lowered Intelligence — MS 12 is normal.*
**Reproduction:** Devours half of victim's body, plants spores in rest. 1d6 young obbs emerge from spore-host in 1 day. Encounter creates persistent local threat at kill site.
**CP estimate:** ~50
**Origin:** Mutated or Evolved
**Reaction:** Alien logic — GM rolls with -2 to standard reaction modifiers; outcomes can be unpredictable peace or unpredictable hostility. May team up with intelligent beings for inscrutable reasons.

---

### Orlen

**GW source:** AC 7, HD 15, MV 15. Two-headed, 2.5m tall humanoid mutants with 4 arms, each arm pair under a separate brain. All telepathic, with telekinesis and willpower in both brains. 25% have 2 random mutations (one per side), typically poison claws (random intensity, 2 hands) + de-evolution (mental). Barter peacefully for tech; built four-arm-adapted versions.
**Encounter tables:** mountains, ruins (Tier 4, 2 tables)
**Number appearing:** 1
**Build:** Humanoid (intelligent, society — no A/P)

```
Base BCs:    ST 12  EN 12  AG 14  IN 12  CL 14
Size mod:    +3 ST, +3 EN  (Size Change Larger 5 CP, 8' tier)
Effective:   ST 15  EN 15  AG 14  IN 12  CL 14

Hits        12~     Power 56      Move 14      Init d4+1
HTH         d6+1    Inventing 6   Mass d6 (~400 lbs)   Profile x1.3
```

**Abilities:** Size Change Larger 8' (5 CP), Physical Ability B Extra Limbs 4 arms (10 CP — 2 manipulative pairs, +1 attack/turn), Dual Brain → Heightened Defense Mental + Heightened Intelligence (10 CP — two-brain mechanic, save vs. mental x2), Telepathy (10 CP), Telekinesis A (7.5 CP), Willpower C Self-Control (10 CP), Armor 5 = 3/1/0/1 (7.5 CP)
**Weaknesses:** Distinctive (two-headed four-armed) -5
**Equipment:** Any tech, often four-arm-adapted artifacts custom-built (~15-20 CP per individual)
**CP estimate:** ~60 + equipment
**Origin:** Mutated or Evolved
**25% variant:** Add Natural Weaponry poison claws (5 CP) + Poison/Venom A random intensity (5-15 CP) + Transmutation Comprehensive (De-evolution, strip abilities) (25 CP). +35-50 CP variant.
**Reaction:** Default favorable — barter for tech. Will fight if attacked but prefers trade.

---

### Pam (Parn)

**GW source:** AC 6 (also -3 to opponent AC in close combat from antennae), HD 10 + antennae. MV 6/16. 3m beetle. 4d6 (4-24) 1.3m barbed spines on back, shoots 2/turn at 50m, 2d6 dmg. 4 sword-like antenna structures (3m), 3d6 dmg each in close. Each antenna AC 5, 18 HP. Ruthless carnivore, fights to death.
**Encounter tables:** mountains, desert, radioactive (Tier 3, 3 tables)
**Number appearing:** 1d4
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 10  EN 10  AG 10  IN 4  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 15  EN 14  AG 10  IN 4  CL 10

Hits        9~      Power 43      Move 13 ground   Init d4
HTH         d6      Inventing 2   Mass d6 (~400 lbs)   Profile x1.5
```

**Abilities:** A/P Insect Standard (20 CP — Natural Weaponry antennae +d8+1 sharp 4 limbs, Heightened Attack -3 to opponent AC = +3 hit close, Physical Ability B Extra Limbs antennae as separate strikers), Size Change Larger 9' (7.5 CP), Special Missile Weapon spines 50m range 2d6 sharp 2/turn ammo 4d6 quills (12.5 CP), Armor 6 = 4/1/0/1 (10 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Compulsion (fights to death) -5
**Antenna sub-targets:** Each of 4 antennae has Armor 8 / 18 HP independent. Sever individually to remove that strike.
**CP estimate:** ~55
**Origin:** Mutated or Evolved

---

### Perth

**GW source:** AC 4, HD 8, MV N/A. 1m tall flower-bush. Disturbed → glows rainbow → emits 3d6 random-intensity radiation in 15m radius. Each round different intensity. Damaged → 1d4 simultaneous blasts. Petals dry to 1 HP/g healing powder (20g/flower, 3-day sun; half effective if artificial drying).
**Encounter tables:** clear, forest, desert (Tier 3, 3 tables)
**Number appearing:** 1d3
**Build:** Plant (immobile)

```
BCs:        ST 5  EN 8  AG 1  IN 3  CL 6

Hits        2~      Power 17      Move 0      Init d3
HTH         d2      Inventing 1   Mass d3 (~50 lbs)
```

**Abilities:** Change Environment Damaging Hard Radiation 33" diameter (25 CP — 5 Devitalization Entropy/round in 15m radius, supplement), Light Control C Glare rainbow (5 CP), Armor 9 = 4/3/0/2 K/E/B/Ent (15 CP)
**Weaknesses:** Distinctive (stationary plant) -5, Low Self Control (reactive blasting only) -5
**Resource:** 20g/flower healing powder (1 HP/g sun-dried 3 days; 0.5 HP/g artificial).
**CP estimate:** ~45
**Origin:** Mutated or Evolved
**Tactics:** Area-denial. PCs choose: engage at range, harvest at risk, or avoid. Damaged-state multi-blast: when Perth takes damage, next round's radiation field deals 1d4× damage (1d4 simultaneous color-blasts of varying intensity per source). Encounter mechanic, not separate ability.

---

### Pineto (Pinelo)

**GW source:** AC 4, HD 2, MV 18. Mutated horizontal-trunk plant beast, mobile branches. 800kg cargo as mount. Tail lashes 1d6. Sharp needles — riders take 1 dmg/turn without saddle. Goad-controlled.
**Encounter tables:** forest (Tier 5, 1 table)
**Number appearing:** 1d4 (1d8 wild packs)
**Build:** A/P Plant, Low power level

```
BCs:        ST 14  EN 4  AG 18  IN 2  CL 6    (HD 2)

Hits        4~      Power 38      Move 18 (with Speed)   Init d3
HTH         d4      Inventing 1   Mass d6 (~400 lbs)
```

**Abilities:** A/P Plant Low (10 CP — Mobility, Heightened Senses), Heightened Strength ~+4 (4 CP — for 800kg cargo), Heightened Agility ~+4 (4 CP), Speed +6 (5 CP — for MV 18), Natural Weaponry tail lash + needle contact (5 CP), Armor 9 = 5/2/0/2 (15 CP — bark + needles)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Mount mechanics:** Wielded via goad. Without saddle, rider takes 1 contact dmg/turn from needles. 800kg capacity.
**CP estimate:** ~43
**Origin:** Mutated or Evolved

---

### Podog

**GW source:** AC 5 (8 if ridden), HD 4, MV 15. Large mutated mongrels. Carnivorous pack hunters, simple commands. Bite 2d6. Totally poison-immune. 1 in 100 has Dual Brain + Telepathy with master. Bay-cry mimics prey/opponent for confusion + initiative bonus.
**Encounter tables:** clear, mountains, desert (Tier 3, 3 tables)
**Number appearing:** 1d6 (2d6 wild packs)
**Build:** A/P Mammal, Low power level

```
Base BCs:    ST 12  EN 1  AG 14  IN 3  CL 8
Size mod:    +3 ST, +3 EN  (Size Change Larger 5 CP, 8' tier)
Effective:   ST 15  EN 4  AG 14  IN 3  CL 8

Hits        4~      Power 36      Move 11+Speed=15   Init d3
HTH         d4      Inventing 1   Mass d6 (~400 lbs)   Profile x1.3
```

**Abilities:** A/P Mammal Low (10 CP — Heightened Senses smell, Natural Weaponry bite +d6 sharp), Adaptation Bio poison full immunity (5 CP), Size Change Larger 8' (5 CP), Speed +4 (5 CP), Reflection Sonic Sound Imitation +1 init (5 CP — bay/mimic cry), Armor 8 (when wild) = 5/1/0/2 (12.5 CP) / Armor 4 (when ridden, flanks exposed)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**CP estimate:** ~42.5
**Origin:** Mutated or Evolved
**Prized variant (1 in 100):** Add Heightened Defense Mental (5 CP) + Heightened Intelligence ~+3 (3 CP) + Telepathy master link (7.5 CP) = +15.5 CP. Rarely sold.

---

### Rakox

**GW source:** AC 4/6, HD 20, MV 9. Slow but powerful mutated oxen. Partial carapace, frill of 8 forward-pointing horns. Gore: 1d6/horn, man-sized opponent gets struck by 1-3 horns per attack. Charge tendency when frightened (esp. wild). Charging rakox does double damage. Stupid, skittish. 1000kg cargo, beasts of burden. 1 / 5d6 in wild herds.
**Encounter tables:** clear (Tier 5, 1 table)
**Number appearing:** 1 (5d6 in wild herds)
**Build:** A/P Mammal, High power level (HD 20)

```
Base BCs:    ST 14  EN 12  AG 6  IN 3  CL 8
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Heightened EN +4 (4 CP)
Effective:   ST 19  EN 20  AG 6  IN 3  CL 8

Hits        12~     Power 48      Move 15 (running formula; GW MV 9 is plodding gait)   Init d3
HTH         d8+1    Inventing 1   Mass d10 (~3000 lbs)   Profile x1.5
```

**Abilities:** A/P Mammal High (30 CP — Natural Weaponry 8 horns + bite, Heightened Strength, Heightened Endurance, Physical Ability B Extra Limbs/multi-horn 1-3 horns hit per gore), Size Change Larger 9' (7.5 CP), Heightened Endurance +4 (4 CP), Heightened Attack +1d6 with Restriction "charging only" (~5 CP — double damage on charge), Armor 9 = 6/2/0/1 K/E/B/Ent (15 CP — partial carapace; AC 4 from front [horns], AC 6 flanks)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (8-horned ox) -5, Phobia / Compulsion (charges when frightened, especially wild) -5
**Combat:** Each gore-attack: 1-3 horns connect (roll d6: 1-2 = 1 horn, 3-4 = 2 horns, 5-6 = 3 horns) for +1d6 sharp per horn. Charging rakox doubles total damage.
**Equipment:** Yoke/draft harness for domesticated use
**CP estimate:** ~60
**Origin:** Mutated or Evolved
**Tactics:** Skittish — easily startled. Wild herds will charge any perceived threat. Defenders need AG save (DC moderate) or take charge damage. Domesticated rakox are reliable beasts of burden but freeze or charge under combat stress (control roll required).

---

### Robotic Unit (Overview)

**GW source:** General class — 18 standard sub-types in GW1e Players Booklet "ROBOTIC UNITS" section. Modeled per `DESIGN-gw-mp-conversion.md` §17. Origin: Science Project. Operational modes: Programmed / Wild / Controlled (§17.9). Damage threshold rule: 25%/50%/75% Hits → 1/2/3 abilities lost (§17.6). Borgs / PCI / ThinkTank have organic-brain quirks (§17.10).
**Encounter tables:** clear, mountains, forest, desert, water, ruins, radioactive (7 tables)
**Number appearing:** 1d4 per encounter; specific sub-type rolled on 2d6 sub-table at encounter time
**Build:** Per sub-type — Humanoid (robotoids), Vehicle (cargo / transports / borgs), or hybrid (combat units)

**2d6 sub-table mapping:**

| Roll | Sub-type | Tier | CP estimate |
|---|---|---|---|
| 2 | Light Cargo Lifter | Utility | ~30 |
| 3 | Heavy Cargo Lifter | Utility | ~50 |
| 4 | Small Cargo Transport | Utility | ~30 |
| 5 | Large Cargo Transport | Utility | ~50 |
| 6 | Ecology Bot (Agricultural) | Utility | ~40 |
| 7 | Ecology Bot (Wilderness) | Utility | ~50 |
| 8 | Engineering Bot (Standard) | Utility | ~92 *(see entry below)* |
| 9 | Engineering Bot (Light Duty) | Utility | ~30 |
| 10 | Engineering Bot (Heavy Duty) | Utility | ~75 |
| 11 | Medical Robotoid | Service | ~50 |
| 12 | General Household Robotoid | Utility | ~25 *(see entry below)* |
| GM | Security Robotoid | Service | ~125 *(see entry below)* |
| GM | Supervisory Borg | Service | ~120 |
| GM | Defense/Attack Borg | Combat | ~205 *(see entry below)* |
| GM | Warbot | Combat | ~280 |
| GM | Death Machine | Apex | ~400 *(see entry below)* |
| GM | Permanent Cybernetic Installation | Apex (scene) | scene |
| GM | ThinkTank | Apex (scene) | scene |

**Five archetypal entries follow** (covering low-utility / mid-utility / mid-service / combat / apex). Other 13 sub-types: convert per design doc §17.12 algorithm using these as reference. PCI and ThinkTank treated as Foundry scenes per §17.13, not single creature stat blocks.

**Common abilities (all robots):** Adaptation Bio (5 CP), Adaptation Mental (10 CP for non-borg / 5 CP partial for borg), Heightened Defense Mental (5 CP).
**Common weaknesses (all robots):** Special Requirement: Power source (-10 broadcast / -5 nuclear), Restriction: No organic functions (-5), Distinctive: Obviously machine (-5), Lowered Cool: Programmed (-5 for programmed-only units), Vulnerability: EMP/Energy Damping (-5).

---

### Robotic Unit: Defense/Attack Borg

**GW source:** Power: nuclear plant. Sensors: standard, IR, UV, telescopic. Control: self-controlled, Stage V I.D., special electronic. Construction: 3m sphere with 1m turret. Anti-grav 96 KPH. 2 tentacles (5m, 10m paralysis fields). Twin t/p beams (500 kg @ 50m). Weaponry: 3 laser batteries × 5 guns each (500m/20d6, 1000m/15d6, 1500m/10d6), 2 energy grenade launchers (range 100/300/500m, 2d20 grenades each), 2 micro-missile launchers (2d20 missiles each), 1 photon grenade launcher (250m range, 1d20 grenades). Energy screen 100 pts. 200 HP, AC 1. Organic-brain quirk per §17.10.
**Encounter tables:** ruins, radioactive (boss-tier; GM-placed)
**Build:** Vehicle (sphere + turret), High power level (boss-tier combat)

```
Base BCs:    ST 14  EN 16  AG 14  IN 14  CL 14
Heightened EN +4 (4 CP)
Effective:   ST 14  EN 20  AG 14  IN 14  CL 14

Hits        12~ + Durability x2 = 24~      Power 76      Move 14 + Speed = 48 (anti-grav 96 kph)   Init d6+1
HTH         d4+1    Inventing 7   Mass d10 (~3 tons)
GW HP equivalent: 200
```

**Abilities:** Adaptation Bio (5 CP), Adaptation Mental partial (5 CP — borg organic brain), Heightened Defense Mental (5 CP), Heightened Endurance +4 (4 CP), Durability x2 (5 CP), Stretching A tentacles (5m, paralysis 10m field, 2 tentacles) (10 CP), Power Blast Energy laser-battery suite — Multi-Blast x3 batteries × 5 guns (50 CP — 20d6 short / 15d6 mid / 10d6 long range), Power Blast Bio/Energy grenade launchers ×2 area effect (15 CP), Power Blast Kinetic micro-missile launchers ×2 (15 CP), Power Blast Energy photon grenade launcher (10 CP), Telekinesis A x2 t/p beams (10 CP — 500kg @ 50m), Force Field A Personal energy screen 100pt (17.5 CP), Speed +30 (15 CP — 96 kph), Armor 20 = 12/4/2/2 K/E/B/Ent (40 CP — duralloy fortress)
**Weaknesses:** Special Requirement: Power source nuclear -5, Restriction: No organic functions -5, Distinctive: Obviously combat machine -5, Phobia/Compulsion: Borg quirk (roll d10 §17.10) -5, Vulnerability: Mental Attacks when FF down -5
**CP estimate:** ~205
**Origin:** Science Project
**Tactics:** Boss-tier combat. Force Field 100pt absorbs initial damage. Opens with laser-battery suppression (15 guns, ~60d6 damage at short range). Falls back to grenades + missiles vs. fortified targets. Borg quirk per encounter is RP/exploit lever. Once FF down, mental attacks viable — PCs with Mental Blast, Telepathy, Possession can engage.
**Notes:** "Usually assigned to a supervisory borg or a permanent cybernetic installation" — rarely standalone; expect supporting forces.

---

### Robotic Unit: Death Machine

**GW source:** Power: nuclear plant. Sensors: standard, IR, UV at 10km. Control: only by specific PCI (effectively uncontrollable by PCs). Construction: 20×9×4m, knobby projections. Anti-grav 150 KPH. Weaponry: 2 blaster cannons (750m/100hp, 1500m/75hp, 3000m/50hp), 6 black ray cannons (300m), 16 batteries × 4 Mark VII blaster rifles each, 4 trek guns (200m), 8 laser batteries × 5 guns each (750m/20d6, 1500m/15d6, 3000m/10d6), 6 mini-missile launchers (2d10 missiles each), 5d10 fusion bombs + launcher (3000m), special energy damping field 50m radius (kills robotics within range, 200 dmg to other energy screens). Energy screens 400 pts, AC 1, 750 HP.
**Encounter tables:** apex boss-tier set-piece (NOT random wilderness)
**Build:** Vehicle (massive lozenge), Apex power level

```
Base BCs:    ST 18  EN 18  AG 16  IN 14  CL 14
Heightened EN +6 (6 CP)
Heightened ST +6 (6 CP)
Effective:   ST 24  EN 24  AG 16  IN 14  CL 14

Hits        21~ + Durability x10 = 210~     Power 92     Move 16 + Speed = 75 (anti-grav 150 kph)   Init d8
HTH         d10     Inventing 7   Mass d12+ (~50 tons)
GW HP equivalent: 750
```

**Abilities:** Adaptation Bio (5 CP), Adaptation Mental partial (5 CP), Heightened Defense Mental (5 CP), Heightened Endurance +6 (6 CP), Heightened Strength +6 (6 CP), Durability x10 (50 CP — for 750 HP), Multi-blast suite Power Blast Energy: blaster cannons + laser batteries + Mark VII rifles (full battery array, ~80 CP), Power Blast Kinetic: black ray cannons (15 CP), Power Blast Kinetic: trek guns + fusion bombs (20 CP — apex-tier ordnance), Power Blast Kinetic: mini-missile launchers (10 CP), Change Environment Damaging EMP energy damping 50m radius (25 CP — supplement Change Environment, kills robotics, 200 dmg to other FFs), Force Field A High-Capacity 400pt (30 CP), Speed +60 (30 CP — 150 kph), Armor 20 = 12/4/2/2 K/E/B/Ent (40 CP — fortress duralloy)
**Weaknesses:** Special Requirement: Power source nuclear -5, Restriction: No organic functions -5, Restriction: Cannot operate without PCI control link -10, Distinctive: Obviously apex weapon -5, Phobia/Compulsion: PCI-controlled (PCI quirks transfer) -5
**CP estimate:** ~400+
**Origin:** Science Project
**Tactics:** APEX BOSS encounter. Set-piece only. Force Field 400pt absorbs sustained damage. The 50m energy damping field auto-disables friendly robots within range — party-controlled robots become liabilities at close range. Multi-battery array fires every round; PCs have no good tactical answer except cover, range, and FF-down → mental attack window. Damage threshold (§17.6) cycles abilities off as Hits drop — PCs may disable specific weapon batteries by targeting visible projections.
**Notes:** Destroying the controlling PCI may shift Death Machine to Wild operational mode (§17.9 wild table). Campaign-defining encounter.

---

### Robotic Unit: Engineering Bot (Standard)

**GW source:** Power: broadcast + 12hr hydrogen cell. Sensors: standard, IR, UV, microscopic. Control: Vocal Stage II I.D., standard electronic, programmed. Construction: 1.5×3×2m. Anti-grav at 24 KPH carrying 2000 kilos. Two 5m crane arms (1500 kg each), 4 tentacles (5m, 250 kg each), t/p beam (500 kg @ 10m). Equipment: stock parts, sonic torch, micro-laser, atomic torch, fusion torch, power tools. Sealed for underwater/vacuum. 9 HD / 45 HP, AC 3.
**Encounter tables:** ruins (Tier 5; common 2d6 robot sub-table roll 8)
**Build:** Humanoid industrial, Standard power level

```
Base BCs:    ST 18  EN 12  AG 12  IN 10  CL 8
Effective:   ST 18  EN 12  AG 12  IN 10  CL 8

Hits        7~      Power 36      Move 12 (anti-grav 24 kph)   Init d4+1
HTH         d6+1    Inventing 5   Mass d8 (~1000 lbs structural)
GW HP equivalent: 45
```

**Abilities:** Adaptation Bio (5 CP), Adaptation Mental (10 CP), Adaptation Aquatic (5 CP — sealed body), Adaptation Vacuum (5 CP — sealed body), Heightened Defense Mental (5 CP), Stretching B Crane Arms (5m extension, ×2) (10 CP), Stretching A Tentacles (5m, ×4) (10 CP), Telekinesis A tractor/pressor beam (500kg @ 10m) (7.5 CP), Equipment: tool array (sonic torch, micro-laser, atomic torch, fusion torch — Power Blast Energy variants for tools-as-weapons) (15 CP), Armor 12 = 7/3/0/2 K/E/B/Ent (20 CP)
**Weaknesses:** Special Requirement: Power source broadcast + 12hr H2 -10, Restriction: No organic functions -5, Distinctive: Obviously industrial machine -5, Lowered Cool: Programmed (will weld PC into wall plate) -5
**CP estimate:** ~92
**Origin:** Science Project
**Tactics:** Default Programmed mode — performs maintenance tasks oblivious to PC presence. Will incorporate PCs into "repair" if they're in the way (welded into walls, cut up and recycled — see GW1e example scenario in §17.0). Not aggressive but extremely dangerous due to industrial efficiency applied to PCs. Damage threshold (§17.6): tool array degrades 1 by 1 as Hits drop. Sealed body means combat works underwater or in vacuum.

---

### Robotic Unit: General Household Robotoid

**GW source:** Power: broadcast + 4hr chemical battery. Sensors: standard, infrared. Control: Vocal Stage I I.D., programmed. Construction: 1.5m humanoid. Walks. 2 arms with 1m tentacles. Equipment: cleaners, polishers, insecticides, vacuum, trash compactor, incinerator. 5 HD / 20 HP, AC 4.
**Encounter tables:** ruins (Tier 5; common 2d6 robot sub-table roll 12 — most common Robotic Unit wilderness encounter)
**Build:** Humanoid, Low power level

```
BCs:        ST 12  EN 10  AG 10  IN 6  CL 6

Hits        4~      Power 22      Move 10 (walking only)   Init d3
HTH         d4      Inventing 3   Mass d4 (~150 lbs metal frame)
GW HP equivalent: 20
```

**Abilities:** Adaptation Bio (5 CP), Adaptation Mental (10 CP), Heightened Defense Mental (5 CP), Stretching A short manipulator tentacles (1m, ×2) (5 CP), Equipment: cleaning tools, vacuum hose, basic kit (5 CP), Armor 9 = 5/2/0/2 K/E/B/Ent (15 CP — light alloy housing)
**Weaknesses:** Special Requirement: Power source broadcast + 4hr backup -10, Restriction: No organic functions -5, Distinctive: Obviously machine -5, Lowered Cool: Programmed (cleaning fixation) -5
**CP estimate:** ~25
**Origin:** Science Project
**Tactics:** Default Programmed mode — engages PCs only if PCs interfere with cleaning routine or fail Stage I I.D. Will summon Security Robotoid if attacked. Easily controlled by Vocal Stage I command. Damage threshold (§17.6): at 75%/50%/25% Hits, lose 1/2/3 abilities (sensors, locomotion, manipulators).
**Notes:** Most common wilderness Robotic Unit encounter. Often found Wild after decades — may be doing same cleaning task in collapsed ruins forever. Easily controlled by PCs (Stage I I.D. is trivial); valuable as helper unit if befriended.

---

### Robotic Unit: Security Robotoid

**GW source:** Power: broadcast or nuclear plant. Sensors: standard, IR, UV. Control: Vocal Stage IV I.D., special electronic, programmed. Construction: 2.5m humanoid. Walks + anti-grav 96 KPH carrying 400 kilos. 2 padded tentacles (3m, paralysis device, 200 kg each). 2 t/p beams (200 kg @ 30m). Weaponry: 4 paralysis rods (3m extensions), slug projector + 10 clips, grenade launcher (50m range, 4 sleep + 5 tear-gas grenades). Programmed to subdue all life forms acting violently. Can summon Medical/Engineering bots. 12 HD / 72 HP, AC 2.
**Encounter tables:** ruins, radioactive (Tier 5; GM-pick on 2d6 robot sub-table)
**Build:** Humanoid, Standard power level (service tier)

```
Base BCs:    ST 16  EN 14  AG 14  IN 12  CL 12
Effective:   ST 16  EN 14  AG 14  IN 12  CL 12

Hits        9~      Power 56      Move 14 walking + Speed = 48 (anti-grav 96 kph)   Init d6
HTH         d6      Inventing 6   Mass d6 (~600 lbs duralloy)
GW HP equivalent: 72
```

**Abilities:** Adaptation Bio (5 CP), Adaptation Mental (10 CP), Heightened Defense Mental (5 CP), Stretching A padded tentacles (3m, paralysis-equipped, ×2) (10 CP), Telekinesis A x2 tractor/pressor beams (200kg @ 30m, dual) (15 CP), Equipment: 4 paralysis rods (Power Blast Bio Paralysis, 3m, 4 charges) (10 CP), Equipment: slug projector (Power Blast Kinetic, 50m, 10 clips) (10 CP), Equipment: grenade launcher (Power Blast Bio/Energy, area 30m, 4 sleep + 5 tear-gas) (10 CP), Speed +30 (15 CP — anti-grav 96 kph supplement), Armor 16 = 10/3/1/2 K/E/B/Ent (30 CP — duralloy plating)
**Weaknesses:** Special Requirement: Power source nuclear -5, Restriction: No organic functions -5, Distinctive: Obviously security machine -5, Compulsion: Programmed to subdue violent acts -5
**CP estimate:** ~125
**Origin:** Science Project
**Tactics:** Default Programmed — engages any creature acting violently, including PCs in legitimate combat. Opens with sleep grenades + paralysis rods (non-lethal). Falls back to slug projector if PCs persist as violent. Calls Medical Robotoid for casualties; Engineering Bot for damage. Stage IV I.D. allows full control (rare for PCs).
**Notes:** "Programmed to subdue all life forms acting violently towards one another" makes this a ZOO-MODE encounter — PCs fighting hostile creatures in front of it triggers attack on all combatants. PCs can sometimes negotiate by surrendering and waiting it out.

---

### Sep

**GW source:** AC 5, HD 17, MV 10. Mutated land-shark. Telekinetic sand-burrowing. Detects creatures up to 50m. Springs from ground, bites 9d6, burrows back, maneuvers 1-2 turns underground, attacks from new direction.
**Encounter tables:** mountains, forest, desert (Tier 3, 3 tables)
**Number appearing:** 1d6
**Build:** A/P Fish, Standard power level

```
Base BCs:    ST 10  EN 8  AG 6  IN 4  CL 10
Size mod:    +9 ST, +9 EN  (Size Change Larger 15 CP, 12' tier)
Effective:   ST 19  EN 17  AG 6  IN 4  CL 10

Hits        10~     Power 46      Move 14 ground   Init d4
HTH         d10+1   Inventing 2   Mass d10 (~2000 lbs)   Profile x2
```

**Abilities:** A/P Fish Standard (20 CP — Natural Weaponry massive bite ~2d10 sharp, Heightened Senses 50m, Tunneling associated with bite for sand-burrow primary locomotion — Max SR 2 sand 5 CP + Max Speed 12 = 10 CP, total 15 CP within or supplementing A/P), Size Change Larger 12' (15 CP), Tunneling (sand burrow, Max SR 2, Max Speed 12, +2 dmg bonus on bite from CP overflow) (15 CP — supplement ability), Heightened Strength ~+4 (4 CP), Heightened Attack +2 hit (4 CP), Armor 8 = 5/1/0/2 (12.5 CP — hide)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:** Burrow → ambush → bite (9d6) → re-burrow → reposition 1-2 turns → attack from new angle.
**CP estimate:** ~70
**Origin:** Mutated or Evolved
**Note:** Tunneling cleanly models sand-burrow locomotion (per New Abilities supplement). +2 bite damage bonus from Tunneling CP overflow stacks with massive bite.

---

### Serf

**GW source:** AC 6, HD 10, MV 12. Mutated humanoid. Heightened Strength, partial carapace, poison claws (intensity 8). MS 15. Mental mutations: Light Wave Manipulation, Density Control (others), Life Leech, Death Field Generation, Mental Blast, Telepathy. Semi-nomadic military "brigades", uniforms. General has ancient weapon. 90% prefer mental attacks.
**Encounter tables:** forest, desert, radioactive (Tier 4, 3 tables)
**Number appearing:** 1d4
**Build:** Humanoid (intelligent — no A/P)

```
Base BCs:    ST 16  EN 10  AG 12  IN 14  CL 15

Hits        11~     Power 52      Move 12      Init d6
HTH         d6+1    Inventing 8   Mass d4 (~150 lbs)
```

**Abilities (full kit — typical Serf has all):**
- Heightened Strength ~+6 (6 CP, in ST 16)
- Natural Weaponry — poison claws +d4 sharp (5 CP)
- Poison/Venom A — claws contact intensity 8 (5 CP)
- Light Wave Manipulation — Invisibility Visible Light + Light Control C Glare (15 CP)
- Density Control (others) — Gravity Control A or Transmutation 30m (20 CP)
- Life Leech — Siphon Hits Area 10m radius 6 HP/turn (15 CP)
- Death Field Generation — Death Touch + Area 20m (35 CP)
- Mental Blast — Mental Ability A (17.5 CP)
- Telepathy (10 CP)
- Armor 6 = 4/1/0/1 (10 CP — partial carapace)

**Weaknesses:** Distinctive (military uniform identity) -5
**Equipment:** Old uniforms (cosmetic). General has ancient weapon (artifact, blast rifle/grenade launcher class, 15-20 CP).
**CP estimate:** ~135 base + general's artifact (over HD-10 budget; full mutation list = boss-tier despite mid HD)
**Origin:** Mutated or Evolved
**Tactics:** 90% open with mentals at range. Close to claws only when mentals exhausted. General coordinates via Telepathy. Light Wave Manipulation enables ambush.
**Note:** GM may scale to 2-3 picked mutations per non-elite Serf; full list reserved for General + lieutenants.

---

### Seroon Lou

**GW source:** AC 8, HD 8, MV 3. Carnivorous aquatic plant up to 30m, semi-intelligent. Stalk 3m above water, mobile roots walk bottom. Eye atop stalk + 11-20 manipulation vines. Wields rocks/clubs. Drags victims to bottom for assimilation. Hides among Narl Ep (similar appearance, darker color).
**Encounter tables:** water, ruins (Tier 5, 2 tables)
**Number appearing:** 3d6 (per source; encounter data conflicts — see OCR notes)
**Build:** A/P Plant, Standard power level

```
BCs:        ST 12  EN 8  AG 8  IN 6  CL 8

Hits        4~      Power 34      Move 3 ground / 9 vine reach   Init d3
HTH         d6      Inventing 3   Mass d8 (~1500 lbs elongated)
```

**Abilities:** A/P Plant Standard (20 CP — Stretching A Elongation 3m+ vines, Natural Weaponry vines wielding clubs +d6 blunt, Heightened Senses eye-on-stalk), Adaptation Aquatic (5 CP), Armor 3 = 1/1/0/1 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5 (mitigated by Narl Ep mimicry advantage)
**Tactics:** Hides near Narl Ep colonies, reaches up via vines, grabs clubs/rocks, strikes from concealment, drags subdued prey under.
**CP estimate:** ~30
**Origin:** Mutated or Evolved

---

### Sleeth

**GW source:** AC 5, HD 18, MV 12. 3m mutated lizard. IN 17, MS 17. Mental mutations: Telepathy, Precognition, special Force Field Negation (any FF within 30m). Illusion-immune, poison resistance 18. 1 in 10 has additional rolled mutation. Peaceful, philosophical, communal. Use all weapons.
**Encounter tables:** clear, desert, ruins (Tier 3, 3 tables)
**Number appearing:** 1d10
**Build:** Humanoid (intelligent, peaceful — no A/P)

```
Base BCs:    ST 12  EN 14  AG 14  IN 17  CL 17
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 17  EN 18  AG 14  IN 17  CL 17

Hits        13~     Power 66      Move 16      Init d6+1
HTH         d6+1    Inventing 9   Mass d6 (~400 lbs)   Profile x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Telepathy (10 CP), Heightened Senses Vision Precognitive (15 CP), Negation Force Field 30m (15 CP), Adaptation Mental illusion-immunity (5 CP), Adaptation Bio poison-resistance 18 (5 CP), Armor 8 = 4/2/0/2 (12.5 CP)
**Weaknesses:** none baseline (peaceful nature is flavor only)
**Equipment:** Any weapon (15-25 CP iron-age to recovered tech)
**CP estimate:** ~85 + equipment
**Origin:** Mutated or Evolved
**1-in-10:** Roll one extra mutation from §10-12. ~10 CP added.
**Reaction:** Friendly default — welcome philosophical/religious discussion. Combat reluctant. Lore-rich NPCs.

---

### Soul Besh

**GW source:** AC 8, HD 10, MV 9. Flightless mutated mosquito, 1.3m. Chameleon powers (concealment ambush). 2m coiled proboscis: pierces sleeping victim 1d6 + intensity 18 paralytic. Next turn: blood-drain 12 HP/turn. Antidote from boiled exoskeleton (150cc, 10cc dose).
**Encounter tables:** forest, desert (Tier 4, 2 tables)
**Number appearing:** 1
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 8  EN 10  AG 14  IN 4  CL 8
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 10  AG 14  IN 4  CL 8

Hits        4~      Power 35      Move 9      Init d3+1
HTH         d3      Inventing 2   Mass d3 (~50 lbs)   Profile /1.5
```

**Abilities:** A/P Insect Standard (20 CP — Invisibility Visible-Light Camouflage, Stretching A Elongation 2m proboscis, Natural Weaponry proboscis pierce +d6 sharp), Size Change Smaller 4.5' (2.5 CP), Poison/Venom A intensity 18 paralytic carrier on bite (10 CP), Siphon Hits vampiric 12/turn sustained (17.5 CP), Armor 3 = 1/1/0/1 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:** Camouflaged ambush of sleeping prey. Pierce + paralytic. Then blood-drain until interrupted.
**Resource:** Boiled exoskeleton = 150cc antidote intensity-18 poison (10cc human dose).
**CP estimate:** ~55
**Origin:** Mutated or Evolved

---

### Terl (Teri / Teal)

**GW source:** AC 5, HD 9, MV Telekinetic Flight. 2m mutated barracuda covered in brightly colored feathers instead of scales. Mates/hatches in water, lives in trees. Breathes water and air. Telekinetic flight. Predator: uses cryogenesis + sonic attack simultaneously to kill prey. Bite 2d6 fallback. Feathers reflect heat + laser. Detects/avoids radiation.
**Encounter tables:** water (Tier 5, 1 table)
**Number appearing:** 1d4
**Build:** A/P Fish, Standard power level

```
Base BCs:    ST 10  EN 8  AG 14  IN 4  CL 10
Size mod:    +2 ST, +1 EN  (Size Change Larger 2.5 CP, 7' tier)
Effective:   ST 12  EN 9  AG 14  IN 4  CL 10

Hits        6~      Power 39      Move via Telekinetic Flight   Init d4
HTH         d4+1 (bite 2d6)   Inventing 2   Mass d4 (~80 lbs)   Profile x1.2
```

**Abilities:** A/P Fish Standard (20 CP — Adaptation Aquatic, Adaptation Aerial dual-breathing, Natural Weaponry bite +d6 sharp), Size Change Larger 7' (2.5 CP), Flight (Telekinetic, moderate speed) 10 CP, Ice Abilities B Ice Blast Cryogenesis (12.5 CP), Sonic Abilities A Sonic Blast (10 CP), Reflection Energy (heat + laser via feathers) (12.5 CP), Heightened Senses (radiation detection, 30m+ range) (7.5 CP), Armor 8 = 5/1/0/2 (12.5 CP — feather + scale)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (feathered barracuda) -5
**Tactics:** Aerial ambush from tree canopy. Opens with Cryokinesis + Sonic Blast simultaneously (2 attacks, GM may model as combined ability check or two separate). Bite as last-resort. Detects radiation passively, won't enter rad zones. Reflects heat/laser fully.
**CP estimate:** ~85
**Origin:** Mutated or Evolved
**Note:** GW writeup appeared THREE times in source/source-OCR variants (Teri / Terl / Teal) — all reference one creature. Use this entry for any of those names.

---

### Tribesmen

**GW source:** No dedicated stat block — encounter table specifies "wandering band of 1-100 (2d10) Pure Strain Humans or humanoids." Tech level varies per region. Reaction varies by tribe disposition.
**Encounter tables:** clear, mountains, desert, water, ruins, radioactive (Tier 1, 6 tables)
**Number appearing:** 2d10 wandering / 1-100 full tribe
**Build:** Humanoid (PSH or mutated humanoid)

#### Tiered MP Power Level generation

| Tier | % of band | MP Power Level | BC array | BC total | Mutations (humanoid only) |
|---|---|---|---|---|---|
| Bulk grunts | ~80% | Normal | 14/12/10/8/6 | 50 | 1 |
| Sub-leaders / warriors | ~15-20% | Low | 16/14/12/10/8 | 60 | 1d3 |
| Chief / shaman | 1 per band | Standard | 18/16/14/12/10 | 70 | 1d4+1 |
| Legendary chief (boss) | optional | High | 20/18/16/14/12 | 80 | 2d4 |

Per individual: Random Method (d10 roll) for variety, or Construction Method 1 (assign array) with archetype guidance below.

#### Archetype assignments (Construction Method 1, Normal Power Level)

| Archetype | ST | EN | AG | IN | CL |
|---|---|---|---|---|---|
| Warrior | 14 | 12 | 10 | 6 | 8 |
| Scout | 10 | 12 | 14 | 8 | 6 |
| Shaman / leader | 6 | 8 | 10 | 12 | 14 |
| Generalist | use Random Method per MP 2.1.7.1 |

Higher Power Levels shift array up — same archetype shape, more BC points.

#### Bulk grunt example (Normal Power, warrior archetype)

```
BCs:        ST 14  EN 12  AG 10  IN 6   CL 8

Hits        4       Power 42      Move 12      Init d3+1
HTH         d4+1    Inventing 3   Mass d4 (~150 lbs)
```

**Abilities:** none baseline (PSH); +1 mutation from §10-12 if humanoid
**Origin:** PSH (none) or Mutated or Evolved (humanoid)

#### Equipment by tech level

| Tech level | Bulk grunt | Sub-leader | Chief |
|---|---|---|---|
| Stone age | Spear (15) + dagger (5) | + small shield in Armor | + carved-bone artifact (10%) |
| Iron age | Sword (10) + bow (8) | + leather armor (5) | + steel armor (10) + horse |
| Industrial | Rifle (10) | + bandolier extra ammo | + auto rifle (15) |
| Recovered tech | Pistol (5) | + 1 random artifact (25%) | + 1 random artifact (75%) + power armor |

#### Reaction handling

GW reaction-table results → MP CL-based Influence Task per `DESIGN-gw-mp-conversion.md` §1.

**CP estimate:** Normal grunt ~25 + equipment; Low sub-leader ~40 + equipment + mutations; Standard chief ~70 + equipment + mutations; High legendary ~110 + equipment + mutations.

---

### Win Seen

**GW source:** AC 9, HD 13, MV N/A. Creeping vine tangle, runners up to 20m diameter, all connected. Two varieties:
- **Yellow-green aquatic:** Floats on lakes/ponds. Sonic attack + intensity 14 contact poison.
- **Blue-green land:** Above + attraction odor (lures carnivores) + crude Magnetic Control (50kg ferrous within 50m, 25 turns; activates after damage taken).
**Encounter tables:** forest, water (Tier 4, 2 tables)
**Number appearing:** 2d4
**Build:** A/P Plant, Low power level (immobile)

```
BCs:        ST 14  EN 13  AG 4  IN 3  CL 8

Hits        7~      Power 34      Move 0      Init d3
HTH         d6      Inventing 1   Mass d8 (~1500 lbs total tangle)
```

**Abilities:**
- A/P Plant Low (10 CP — Sonic Abilities A contact-trigger, Poison/Venom A intensity 14 contact)
- *Land variety adds:* Magnetism A 50m 50kg ferrous 25 turn (15 CP), Emotion Control Pheromones (10 CP)
- *Aquatic variety adds:* Adaptation Aquatic (5 CP)
- Armor 0

**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5, Special Requirement (immobile, can be uprooted/burned) -5
**Resource:** Cooking yields 100cc antidote intensity-14 poison (10cc human dose).
**CP estimate:** ~20 (aquatic) / ~40 (land)
**Origin:** Mutated or Evolved
**Tactics:** Passive contact-trigger defense. Damage activates magnetic suppression (land — drops ferrous gear). Pheromones (land) = persistent carnivore-infested zone around plant.

---

### Yexil

**GW source:** AC 6, HD 10, MV 4/15 (ground/fly). 8m wingspan, 3m tall, indeterminate origin chimera. Slow-witted, friendly. 2 hairy legs, lion-head, large mandibles, hands at end of each wing. Bite 3d6, laser eyes 5d6 at 25m. Orange/black fur, cold-resistant. Gourmet for manufactured clothing — trades worthless tech (pistols/bombs/grenades) for snappy outfits.
**Encounter tables:** clear, mountains, ruins (Tier 3, 3 tables)
**Number appearing:** 1d4
**Build:** Humanoid (intelligent enough to trade — no A/P) with chimeric features

```
Base BCs:    ST 11  EN 6  AG 12  IN 6  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 16  EN 10  AG 12  IN 6  CL 10

Hits        9~      Power 44      Move 13      Init d4
HTH         d6+1    Inventing 3   Mass d8 (~1500 lbs)   Profile x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Flight 15m (7.5 CP), Power Blast Energy laser eyes 25m ~2d8 (17.5 CP), Natural Weaponry bite +d8 sharp (7.5 CP), Adaptation Energy/cold (5 CP), Physical Ability B Extra Limbs hand-tipped wings (5 CP), Armor 6 = 4/1/0/1 (10 CP)
**Weaknesses:** Lowered Intelligence -5, Compulsion (gourmand for clothing) -5
**Equipment:** Random tech (1d3 of pistol/bombs/grenades) — yexil considers worthless, GM picks.
**Trade:** +2 reaction if PCs offer fashionable garments, -2 if drab.
**CP estimate:** ~55
**Origin:** Indeterminate (treat as Mutated or Evolved)
**Tactics:** Friendly first — offers trade. Combat reluctant unless attacked. Laser eyes at 25m, bite up close. Cold-immune.

---

### Zarn

**GW source:** AC 7, HD 4, MV teleportation only (max 200m). 10cm orange parasitic beetle, semi-intelligent. Spits intensity 16 paralytic poison (5m range), then teleports. Spittle persistent — save each turn per unwashed area. Paralysis lasts 1 week. Bores skull, lays 4d6 eggs in brain; hatch day 4, emerge day 5. Surgical removal only.
**Encounter tables:** clear, mountains, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1
**Build:** A/P Insect, Low power level

```
Base BCs:    ST 10  EN 4  AG 14  IN 5  CL 10
Size mod:    -2 ST, -2 EN  (Size Change Smaller 10 CP, 1' tier)
Effective:   ST 8   EN 2  AG 14  IN 5  CL 10

Hits        2~      Power 29      Move N/A (teleport)   Init d4
HTH         d2      Inventing 3   Mass d2- (~10 oz)   Profile /6
```

**Abilities:** A/P Insect Low (10 CP — Heightened Senses, Natural Weaponry bore-mandibles +d4 sharp post-paralysis only), Size Change Smaller 1' (10 CP), Teleportation 200m alt-turns (12.5 CP), Special Missile Weapon spit intensity 16 paralytic 5m persistent (17.5 CP), Armor 5 = 3/0/0/2 (7.5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:**
1. T1: spit poison (5m, intensity 16 paralytic)
2. T2: teleport up to 200m
3. Repeat until paralyzed
4. Post-paralysis: bore skull, lay 4d6 eggs (1-week paralysis)
5. Eggs hatch day 4; hatchlings emerge day 5
**CP estimate:** ~57.5
**Origin:** Mutated or Evolved
**Note:** Over HD-4 budget — kit-heavy creature, low-HP boss-tier encounter.

---

### Zeethh

**GW source:** AC 10, HD 1 each, MV None (teleporting seeds). 1d100 plants. 1.5m blade of mutated purple grass. Tassels grow continuously summer-long, hold 1d6 spiked seeds each. Each turn warm-blooded creatures within 20m: zeethhs teleport 1/4 of total seeds into them.
**Encounter tables:** clear, mountains (Tier 4, 2 tables)
**Number appearing:** 1d100
**Build:** A/P Plant, Low power level (swarm encounter — see swarm mechanic below)

```
Per-plant BCs:  ST 4  EN 1  AG 1  IN 2  CL 12

Hits        1       Power 8       Move 0      Init d6+1
HTH         d2-     Inventing 1   Mass d2- (~5 lbs)
```

**Per-plant abilities:** A/P Plant Low (10 CP — Mobility none, no useful direct attacks individually), Special Missile Weapon teleporting spiked seeds (covered in swarm mechanic, not per-plant)
**Per-plant weaknesses:** Lowered Intelligence -5, Distinctive -5, Special Requirement (rooted/immobile) -5

**Swarm mechanic (the actual threat):**

1. Total seeds available = (plants present × 3)
2. Each turn, 1/4 of total seeds teleport to warm-blooded creatures within 20m
3. Seeds-to-teleport ÷ # of targets = seeds attacking each target
4. Each seed: CL 12 mental attack roll (Mental Attack Matrix)
5. Seed lands: 2d6 dmg + 1 dmg/day for 7 days (in-body)
6. Seeds resist healing — must die (after 7 days) or be surgically removed
7. Adult zeethhs replace teleported seeds at 1/day

**Hosted death cycle:** Host with viable seeds dies → seeds sprout in <1 hour → mature plants in 3 days → start of new colony.

**CP estimate:** Per-plant ~10. Swarm field-effect difficult to price standalone — treat as encounter hazard with 1d100 plants × 3 seeds = up to 300 seeds × 1/4 = up to 75 attacks/turn at saturation.
**Origin:** Mutated or Evolved
**Tactics:** Pure attrition — flee 20m radius or burn the field. Fire is most effective (mass HD 1 plants). PCs caught in field take massive seeded damage; persistent dmg/day for 7 days after escape.
**Note:** This is the most-different-from-stat-block creature so far. Encounter is environmental — track seeds available, teleport count, and per-target attack rolls separately. Consider a side-table or tracker.

---

*Catalog continues as batches are statted. Send next batch of GW writeups to add Tier 5 entries.*
