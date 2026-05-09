# Gamma World 1e → Mighty Protectors Bestiary

**Status:** v0.4 (31 of 55 statted)
**Destination:** `gcc/gw-mp-bestiary.md`
**Last updated:** 2026-05-09
**Conversion rules:** see `gcc/DESIGN-gw-mp-conversion.md`
**MP character generation reference:** MP 2.1.7.1

Stat blocks for GW1e wilderness encounter table creatures, converted to MP. Encounter tables defined in `gw-encounter-data.js`; this file is the matching MP stat catalog. Ordered alphabetically.

---

## Status by tier

**Tier 1 — Universal (3 creatures, 2/3 done)**
- [x] **Android** (6 tables) — three sub-types: Thinker / Worker / Warrior
- [x] **Tribesmen** (6 tables) — generic PSH/humanoid; tiered MP gen by Power Level
- [ ] Robotic Unit (7 tables) — *deferred, separate Robotic Unit conversion model needed*

**Tier 2 — Wide-spread (3 creatures, 3/3 done) ✓**
- [x] **Badder**, **Blaash**, **Zarn**

**Tier 3 — Common (10 creatures, 10/10 done) ✓**
- [x] **Arn**, **Herp**, **Hisser**, **Hoop**, **Pam (Parn)**, **Perth**, **Podog**, **Sep**, **Sleeth**, **Yexil**

**Tier 4 — Regional (14 creatures, 14/14 done) ✓**
- [x] **Ark**, **Blight**, **Cal Then**, **Centisteed**, **Crep Plant**, **Eat (Ert)**, **Horl Choo (Hori)**, **Kai Lin**, **Obb**, **Orlen**, **Serf**, **Soul Besh**, **Win Seen**, **Zeethh**

**Tier 5 — Single-table specialists (25 creatures, 2/25 done; Choo subsumed by Horl Choo)**
- [x] **Pineto (Pinelo)**, **Seroon Lou** (consolidated from Seroon + Lou)
- *Water (10):* Bari Nep, Cren Tosh, Ert Telden, Fen, Fleshin, Herkel, Keeshin, Menarl, Nari Ep, Teri
- *Radioactive (3):* Arn Blight, Serf Hisser, Sert
- *Other (10):* Brutorz, Choo Kep, Erl, Gren, Hopper, Kep, Rakox, Telden + 2 TBD

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
**Encounter tables:** forest, ruins (Tier 4)
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
**Encounter tables:** clear, forest, mountains (Tier 3)
**Number appearing:** 1d4
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
**Encounter tables:** clear, forest, ruins, water (Tier 2)
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

### Blaash

**GW source:** AC 8, HD 15, MV 6/15 (ground/fly). ~1m mutated moth, 2m wingspan, fearless and carnivorous. Glows brightly when attacking; emits intensity 18 radiation in 5m radius continuous. Self+kin immune. Post-kill feeding phase.
**Encounter tables:** clear, mountains, forest, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1d10
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 10  EN 15  AG 14  IN 4  CL 12
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 9   EN 15  AG 14  IN 4  CL 12

Hits        9~      Power 42      Move 13 (flight)  Init d4+1
HTH         d3      Inventing 2   Mass d3 (~50 lbs)   Profile /1.5
```

**Abilities:** A/P Insect Standard (20 CP — Flight 15m, Heightened Senses, Natural Weaponry +d3 sharp), Size Change Smaller 4.5' (2.5 CP), Power Blast Energy Aura Continuous 5" diameter ~d6 Hits/turn (17.5 CP), Adaptation Energy/radiation complete (5 CP), Light Control C Glare (5 CP), Armor 3 = 1/2/0/0 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:** Aura always-on while engaged. Post-kill feeding = ambush window. Fearless.
**CP estimate:** ~55
**Origin:** Mutated or Evolved

---

### Blight

**GW source:** AC 9, HD 12, MV 2/10 (ground/fly). 3m carnivorous winged worm, up to 10m wingspan. Invisibility at will. First attack from invisibility: blinding flash 1d4 turns. Bite 3d6, preferred constriction 5d6/turn. Resistant to radiation, heat, sonic.
**Encounter tables:** desert, water (Tier 4)
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

### Cal Then

**GW source:** AC 9, HD 6, MV 4/12 (ground/fly). Intelligent (MS 18) flying insect, up to 2.5m. Huge mandibles 10d6 dmg, can crush duralloy given time. Gourmet for bones — rips flesh off living creatures to get to bones. Resistant to all heat and cold.
**Encounter tables:** desert, ruins (Tier 4)
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
**Encounter tables:** desert, mountains (Tier 4)
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

### Crep Plant

**GW source:** AC 3, HD 15, MV 1. Two varieties: water (pink, submerged) and land (red, rainy areas). Mental mutations: Death Field Generation, Molecular Disruption, Life Leech (feeds via). Plant mutations: Mobility, 1d4 manipulation vines, Parasitic Attachment. Reproduction: leaf-attachments drain blood 10 HP/turn, drop after victim dies, burrow → new plant.
**Encounter tables:** forest, water (Tier 4)
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

### Eat (Ert)

**GW source:** AC 9, HD 3, MV 8. 1m fish in swift mountain streams. Bite has chance to turn victim to granite-like rock — treat as intensity 12 poison attack, "D" result = stone.
**Encounter tables:** water + 1 other (Tier 4 — listed as "Ert" in encounter data, OCR variant of "EAT")
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

### Herp

**GW source:** AC 3, HD 20, MV 10. 3.5m carnivorous mutated beetle, flightless. Wing case reflects sonic. Acid stream 30m, 15d6 dmg, eats through 1/2 cm duralloy in 3 turns. All-weather tracking.
**Encounter tables:** clear, forest, mountains (Tier 3)
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
**Encounter tables:** forest, mountains, water (Tier 3)
**Number appearing:** 1d4
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
**Encounter tables:** clear, mountains, ruins (Tier 3)
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

### Horl Choo (Hori)

**GW source:** AC 5, HD 18, MV 6. Black plant resembling a lumpy porcupine with 3m spear-like quill-stems. 5d6 (6-30) stems. Flings spears at any being within 90m: intensity 9 poison + 3d6 dmg. Spears attached by strong vines — retrieve missed shots, drag impaled prey back to base. Dissolving juices break down victim. Limited mobility (moves to better hunting grounds).
**Encounter tables:** forest, mountains (Tier 4 — listed as "Hori" in encounter data, OCR truncation of "Horlchoo"; *also* listed separately as "Choo" in another table — same creature, recommend merging both encounter entries to "Horl Choo")
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
**Encounter tables:** desert, radioactive (Tier 4)
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

### Obb

**GW source:** AC 10, HD 12, MV 1/15 (ground/fly). 1m mutated fungus resembling a bat. Nearly immobile on ground, hawk-swift in air. Single black eye delivers intensity 16 radiation blast. Two clawed appendages strike for 3d6 each. Devours half of body, plants spores in remains; 1d6 young obbs emerge in 1 day. Resistant to radiation, all laser, light, heat. Sometimes peacefully associates with intelligent beings — alien logic.
**Encounter tables:** ruins, radioactive (Tier 4)
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
**Encounter tables:** ruins, water (Tier 4)
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
**Encounter tables:** clear, mountains, desert, radioactive (Tier 3 — listed as "Pam" in encounter data, OCR drop of "Parn")
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
**Encounter tables:** clear, desert, forest (Tier 3)
**Number appearing:** 1d3
**Build:** Plant (immobile)

```
BCs:        ST 5  EN 8  AG 1  IN 3  CL 6

Hits        2~      Power 17      Move 0      Init d3
HTH         d2      Inventing 1   Mass d3 (~50 lbs)
```

**Abilities:** Power Blast Energy/radiation Area Effect 15m radius rolled 3d6 each turn (17.5 CP), Multi-Blast 1d4 simultaneous when damaged (5 CP), Light Control C Glare rainbow (5 CP), Armor 9 = 4/3/0/2 K/E/B/Ent (15 CP)
**Weaknesses:** Distinctive (stationary plant) -5, Low Self Control (reactive blasting only) -5
**Resource:** 20g/flower healing powder (1 HP/g sun-dried 3 days; 0.5 HP/g artificial).
**CP estimate:** ~42
**Origin:** Mutated or Evolved
**Tactics:** Area-denial. PCs choose: engage at range, harvest at risk, or avoid. Damage triggers multi-blast.

---

### Pineto (Pinelo)

**GW source:** AC 4, HD 2, MV 18. Mutated horizontal-trunk plant beast, mobile branches. 800kg cargo as mount. Tail lashes 1d6. Sharp needles — riders take 1 dmg/turn without saddle. Goad-controlled.
**Encounter tables:** forest (Tier 5 — "Pinelo" OCR variant)
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
**Encounter tables:** clear, mountains, desert (Tier 3)
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

### Sep

**GW source:** AC 5, HD 17, MV 10. Mutated land-shark. Telekinetic sand-burrowing. Detects creatures up to 50m. Springs from ground, bites 9d6, burrows back, maneuvers 1-2 turns underground, attacks from new direction.
**Encounter tables:** desert, forest, mountains (Tier 3)
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
**Encounter tables:** desert, forest (Tier 4)
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
**Encounter tables:** water (Tier 5 — encounter data lists "Seroon" in water and "Lou" in ruins; per source these are the same creature, recommend merging encounter entries)
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
**Encounter tables:** clear, desert, ruins (Tier 3)
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
**Encounter tables:** desert, forest (Tier 4)
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
**Encounter tables:** forest, water (Tier 4)
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
**Encounter tables:** clear, mountains, ruins (Tier 3)
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
**Encounter tables:** clear, radioactive (Tier 4)
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
