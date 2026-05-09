# Gamma World 1e → Mighty Protectors Bestiary

**Status:** v0.3 (21 of 56 statted)
**Destination:** `gcc/gw-mp-bestiary.md`
**Last updated:** 2026-05-08
**Conversion rules:** see `gcc/DESIGN-gw-mp-conversion.md`
**MP character generation reference:** MP 2.1.7.1

Stat blocks for GW1e wilderness encounter table creatures, converted to MP. Encounter tables defined in `gw-encounter-data.js`; this file is the matching MP stat catalog. Ordered alphabetically.

---

## Status by tier

**Tier 1 — Universal (3 creatures, 2/3 done)**
- [x] **Android** (6 tables) — three sub-types: Thinker / Worker / Warrior
- [x] **Tribesmen** (6 tables) — generic PSH/humanoid; tiered MP gen by Power Level
- [ ] Robotic Unit (7 tables) — *deferred, separate Robotic Unit conversion model needed*

**Tier 2 — Wide-spread (3 creatures, 3/3 done)**
- [x] **Badder** (4 tables)
- [x] **Blaash** (4 tables)
- [x] **Zarn** (4 tables)

**Tier 3 — Common (10 creatures, 10/10 done) ✓**
- [x] **Arn**, **Herp**, **Hisser**, **Hoop**, **Pam (Parn)**, **Perth**, **Podog**, **Sep**, **Sleeth**, **Yexil**

**Tier 4 — Regional (14 creatures, 4/14 done)**
- [x] **Ark**, **Serf**, **Soul Besh**, **Win Seen**
- [ ] Blight, Cal Then, Centisteed, Crep Plant, Ert, Hori, Kai Lin, Obb, Orlen, Zeethh

**Tier 5 — Single-table specialists (26 creatures, 2/26 done)**
- [x] **Pineto (Pinelo)**, **Seroon Lou** (consolidated from Seroon + Lou)
- *Water (10):* Bari Nep, Cren Tosh, Ert Telden, Fen, Fleshin, Herkel, Keeshin, Menarl, Nari Ep, Teri
- *Radioactive (3):* Arn Blight, Serf Hisser, Sert
- *Other (10):* Brutorz, Choo, Choo Kep, Erl, Gren, Hopper, Kep, Pinelo (renamed Pineto), Rakox, Telden

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

Hits        7~                Phys Def    0
Power       50                Mental Def  4
Move        11                Init        d6+1
HTH         d3                Inventing   9
Mass        d4 (~150 lbs)
```

**Abilities:** Heightened Intelligence ~+8 (8 CP), Heightened Cool ~+8 (8 CP), Heightened Defense Mental (5 CP), Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP)
**Equipment:** GM choice — pistol (5 CP) or short blade (5 CP)
**CP estimate:** ~31 + equipment

#### Android — Worker

```
BCs:        ST 18  EN 18  AG 10  IN 10  CL 10    (ST 18 + Con 18 fixed)

Hits        10~               Phys Def    0
Power       56                Mental Def  0
Move        15                Init        d4
HTH         d8                Inventing   5
Mass        d6 (~250 lbs)
```

**Abilities:** Heightened Strength ~+8 (8 CP), Heightened Endurance ~+8 (8 CP), Armor 8 = 6/1/0/1 K/E/B/Ent (12.5 CP)
**Equipment:** GM choice — large club (15 CP) or heavy blade (15 CP)
**CP estimate:** ~33.5 + equipment

#### Android — Warrior

```
BCs:        ST 18  EN 18  AG 18  IN 18  CL 10    (all 18 except MS rolled)

Hits        14~               Phys Def    4
Power       72                Mental Def  0
Move        18                Init        d4
HTH         d8                Inventing   9
Mass        d6 (~250 lbs)
```

**Abilities:** Heightened Strength/Endurance/Agility/Intelligence ~+8 each (32 CP), Armor 9 = 7/1/0/1 K/E/B/Ent (15 CP)
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

Hits        11               Phys Def    1
Power       53               Mental Def  1
Move        13               Init        d4
HTH         d6+1 (kinetic)   Inventing   7
Mass        d6+1 (~700 lbs)  Profile     x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Telekinesis A 7.5 CP (300 lbs / d6+1, range 12"), Weather Control A+B (25 CP), Siphon (Hits, Area Effect) 12.5 CP (d6 Hits, 5" diameter), Armor 6 = 1/3/1/1 K/E/B/Ent (10 CP, rad-leaning), Adaptation Radiation 5 CP
**Weaknesses:** Phobia (large winged creatures) -5 CP
**Equipment:** Large Club (15 CP), wicker shield in Armor
**CP estimate:** ~85
**Origin:** Mutated or Evolved

---

### Arn

**GW source:** AC 9, HD 8, MV 3/16 (ground/fly), bite 2d6, carries ≤2kg in flight. 1.3m mutated flying insect, beast of burden.
**Encounter tables:** clear, forest, mountains (Tier 3)
**Number appearing:** 1d4
**Build:** A/P Insect, Low power level (animal behavior)

```
Base BCs:    ST 8  EN 8  AG 14  IN 4  CL 6
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 8  AG 14  IN 4  CL 6

Hits        2                Phys Def    1
Power       33               Mental Def  0
Move        10 ground        Init        d3
HTH         d3               Inventing   2
Mass        d2 (~40 lbs)     Profile     /1.5
```

**Abilities:** A/P Insect Low (10 CP — Flight 16m/turn ≤2kg cargo, Natural Weaponry mandibles +4/+6 sharp), Size Change Smaller 4.5' (2.5 CP), Armor 2 = 1/0/0/1 (2.5 CP, chitin)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant insect) -5
**CP estimate:** ~15
**Origin:** Mutated or Evolved

---

### Badder

**GW source:** AC 4, HD 6, MV 12, Dex 18, MS 16, bite 1d6, mutation Empathy, hard of hearing, keen sense of smell. 1.5m intelligent mutated badger, medieval society. 10% chance of 1 random artifact weapon.
**Encounter tables:** clear, forest, ruins, water (Tier 2)
**Number appearing:** 1d6
**Build:** Humanoid (anthropomorphic, "Short" descriptor free at 1.5m)

```
Base BCs:    ST 12  EN 6  AG 18  IN 13  CL 16

Hits        9                Phys Def    2
Power       49               Mental Def  1
Move        12               Init        d6+1
HTH         d6 (covers bite) Inventing   7
Mass        d4 (~100 lbs)
```

**Abilities:** Heightened Agility ~+8 (8 CP), Heightened Cool ~+6 (6 CP), Heightened Intelligence ~+3 (3 CP), Heightened Senses Odors Full+Acute (10 CP), Telepathy visual+verbal+Mood Reading (10 CP — Empathy), Armor 3 = 1/1/0/1 (5 CP, cured hide)
**Weaknesses:** Diminished Senses hearing -5 CP
**Equipment:** Spear (15 CP), wooden shield in Armor, 10% random artifact weapon
**CP estimate:** ~57
**Origin:** Mutated or Evolved

---

### Blaash

**GW source:** AC 8, HD 15, MV 6/15 (ground/fly). ~1m mutated moth, 2m wingspan, fearless and carnivorous. Glows brightly when attacking; emits intensity 18 radiation in 5m radius (continuous, harmless to blaash + kin). After kill, stops to feed voraciously.
**Encounter tables:** clear, mountains, forest, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1d10
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 10  EN 15  AG 14  IN 4  CL 12
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 9   EN 15  AG 14  IN 4  CL 12

Hits        9~               Phys Def    1
Power       42               Mental Def  -2
Move        13 (flight)      Init        d4+1
HTH         d3               Inventing   2
Mass        d3 (~50 lbs)     Profile     /1.5
```

**Abilities:** A/P Insect Standard (20 CP — Flight 15m/turn, Heightened Senses, Natural Weaponry +2/+d3 sharp), Size Change Smaller 4.5' (2.5 CP), Power Blast Energy Aura Continuous 5" diameter ~d6 Hits/turn (17.5 CP — radiation field), Adaptation Energy/radiation complete (5 CP), Light Control C Glare (5 CP), Armor 3 = 1/2/0/0 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5
**Tactics:** Aura always-on while engaged. Post-kill feeding = ambush window. Fearless, no morale.
**CP estimate:** ~55
**Origin:** Mutated or Evolved

---

### Herp

**GW source:** AC 3, HD 20, MV 10. 3.5m carnivorous mutated beetle, flightless. Wing case reflects sonic attacks. Acid stream 30m range, 15d6 dmg, eats through 1/2 cm duralloy in 3 turns. Diligent and skillful hunter, all-weather tracking.
**Encounter tables:** clear, forest, mountains (Tier 3)
**Number appearing:** 1
**Build:** A/P Insect, High power level (HD 20 boss-tier)

```
Base BCs:    ST 10  EN 10  AG 10  IN 5  CL 10
Size mod:    +9 ST, +9 EN  (Size Change Larger 15 CP, 12' tier)
Effective:   ST 19  EN 19  AG 10  IN 5  CL 10

Hits        11~              Phys Def    0
Power       53               Mental Def  -2
Move        16               Init        d4
HTH         d8 (bite)        Inventing   3
Mass        d8 (~1000 lbs)   Profile     x2
```

**Abilities:** A/P Insect High (30 CP — Natural Weaponry mandibles, Heightened Senses all-weather tracking, Heightened Attack +1d6 hit, Reflection Sonic), Size Change Larger 12' (15 CP), Power Blast Bio acid stream 30m range ~3d8 sharp/bio (25 CP), Armor 12 = 8/2/0/2 K/E/B/Ent (20 CP, heavy carapace)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive -5, Compulsion (fight to death) -5
**Tactics:** Acid stream at range first; closes only when prey is wounded. Reflective wing case turns sonic attacks back on attacker.
**CP estimate:** ~90
**Origin:** Mutated or Evolved

---

### Hisser

**GW source:** AC 3, HD 18, MV 12. 3m half-man-half-snake, arid regions near water. Telepathic, MS 12. Mass mind, sonic attack ability, +1 random mental mutation per individual. Scaly skin laser+sonic resistant. Matriarchal society (one queen + ~70 males, queen lays eggs, splits at 70). No spoken language — all telepathic. Use Ancient artifacts.
**Encounter tables:** forest, mountains, water (Tier 3)
**Number appearing:** 1d4
**Build:** Humanoid (intelligent, society — no A/P)

```
Base BCs:    ST 12  EN 14  AG 14  IN 12  CL 12
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 17  EN 18  AG 14  IN 12  CL 12

Hits        13~              Phys Def    1
Power       61               Mental Def  0
Move        16               Init        d6
HTH         d6+1             Inventing   7
Mass        d6 (~400 lbs)    Profile     x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Telepathy visual+verbal (10 CP), Sonic Abilities A + Area Effect (12.5 CP), Random mutation per individual ~10 CP avg (roll on §10-12), Armor 12 = 6/3/1/2 K/E/B/Ent (20 CP — scales weighted K+E for laser/sonic)
**Mass Mind:** Narrative cooperative power — when 3+ hissers act together, +1 to hit and shared situational awareness. No CP cost (no clean MP equivalent).
**Equipment:** Recovered tech artifact per individual (GM choice; pistol/blaster ~10-15 CP)
**CP estimate:** ~60 + per-individual mutation + equipment
**Origin:** Mutated or Evolved
**Note:** 1 in 70 is a queen-aspirant female with full Heightened Cool +6 and Heightened Defense Mental.

---

### Hoop

**GW source:** AC 9, HD 15, MV 18. 2.6m mutated rabbitoid bipeds. Leap 8m vertical. Intelligent (MS 3-18), telepathic, mass mind. Special: transmute metal to rubber (touch range, all metal within 1m of contact point). Manipulative forepaws. Seek and use Ancient weapons.
**Encounter tables:** clear, mountains, ruins (Tier 3)
**Number appearing:** 1d6
**Build:** Humanoid (intelligent — no A/P, "Tall" descriptor free at 2.6m)

```
Base BCs:    ST 10  EN 14  AG 18  IN 10  CL 14    (MS 3-18, midpoint ~14)
Size mod:    +2 ST, +1 EN  (Size Change Larger 2.5 CP, 7' tier)
Effective:   ST 12  EN 15  AG 18  IN 10  CL 14

Hits        12~              Phys Def    4
Power       55               Mental Def  0
Move        15               Init        d4+1
HTH         d4+1             Inventing   5
Mass        d4 (~150 lbs)    Profile     x1.2
```

**Abilities:** Size Change Larger 7' (2.5 CP), Heightened Agility ~+8 (8 CP — covers leap-8m vertical), Telepathy (10 CP), Transmutation Metal→Rubber touch range 1m radius (17.5 CP — niche but devastating; metal armor + ferrous weapons disabled)
**Mass Mind:** Narrative coordination, no CP cost.
**Equipment:** Ancient weapons preferred — pistol (5 CP) / rifle (10 CP) / blaster (10-15 CP) per individual; chief-tier may have premium artifacts
**CP estimate:** ~38 + equipment
**Origin:** Mutated or Evolved
**MS variability:** Roll 3d6 per individual for MS, applying directly to CL. Range 3-18 means a band of hoops varies wildly in mental sharpness. Chief-tier hoops (top end) get full Heightened Cool ~+8.
**Note:** Transmutation is the signature threat. PCs in metal armor or wielding ferrous weapons are particularly vulnerable. GM determines effects per object: rubber armor = AC 9, rubber pistol = jammed, etc.

---

### Pam (Parn)

**GW source:** AC 6 (also -3 to opponent AC in close combat from antennae), HD 10 + antennae. MV 6/16 (ground/burrow inferred). 3m beetle. 4d6 (4-24) 1.3m barbed spines on back, shoots 2/turn at 50m, 2d6 dmg each. 4 sword-like antenna structures (3m long), 3d6 dmg each in close combat. Each antenna AC 5, 18 HP separately. Ruthless carnivore, fights to death.
**Encounter tables:** clear, mountains, desert, radioactive (Tier 3, 4 tables — listed as "Pam" in encounter data)
**Number appearing:** 1d4
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 10  EN 10  AG 10  IN 4  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 15  EN 14  AG 10  IN 4  CL 10

Hits        9~               Phys Def    0
Power       43               Mental Def  -2
Move        13 ground        Init        d4
HTH         d6 (close)       Inventing   2
Mass        d6 (~400 lbs)    Profile     x1.5
```

**Abilities:** A/P Insect Standard (20 CP — Natural Weaponry antennae +d8+1 sharp 4 limbs, Heightened Attack -3 to opponent AC = +3 hit equivalent in close combat, Physical Ability B Extra Limbs antennae as separate strikers), Size Change Larger 9' (7.5 CP), Special Missile Weapon spines (50m range, 2d6 sharp, 2/turn, ammo 4d6 quills) ~12.5 CP, Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Compulsion (fights to death) -5
**Antenna sub-targets:** Each of 4 antennae has Armor 8 / 18 HP independent of body. Sever individually. Once severed, that antenna's close-combat strike is unavailable.
**CP estimate:** ~55
**Origin:** Mutated or Evolved

---

### Perth

**GW source:** AC 4, HD 8, MV N/A (immobile). 1m tall mutated palm-like flower-bush. If disturbed, glows rainbow → next turn emits 3d6 random-intensity radiation, 15m radius. Each round different intensity. If damaged: 1d4 simultaneous radiation blasts of varying intensity. Petals → sun-dried for 1 HP/gram healing powder (20g/flower, 3 days sun; half effective if dried artificially).
**Encounter tables:** clear, desert, forest (Tier 3)
**Number appearing:** 1d3
**Build:** Plant (immobile flower-bush — no A/P type assignment needed for purely-stationary)

```
BCs:        ST 5  EN 8  AG 1  IN 3  CL 6

Hits        2~               Phys Def    -4
Power       17               Mental Def  -4
Move        0 (immobile)     Init        d3
HTH         d2 (lash)        Inventing   1
Mass        d3 (~50 lbs)
```

**Abilities:** Power Blast Energy/radiation, Area Effect 15m radius / 15" diameter, intensity rolled 3d6 each turn (17.5 CP), Multi-Blast modifier when damaged (1d4 simultaneous of varying intensity) ~5 CP, Light Control C Glare (rainbow display) 5 CP, Armor 9 = 4/3/0/2 K/E/B/Ent (15 CP — bark/fiber + energy resist)
**Weaknesses:** Distinctive (stationary plant) -5, Low Self Control (reactive blasting only, no targeting discrimination) -5
**Resource:** Petals yield healing powder. 20g/flower, sun-dried 3 days = 1 HP/gram. Artificial drying = 0.5 HP/gram.
**CP estimate:** ~42
**Origin:** Mutated or Evolved
**Tactics:** Area-denial encounter. PCs choose to engage at range, harvest at risk, or avoid. Damaging Perth makes it dangerously erratic (multi-blast).

---

### Pineto (Pinelo)

**GW source:** AC 4, HD 2, MV 18. Mutated horizontal-trunk plant beast, mobile branches, root clump = "head" with keen vision/olfactory. 800kg cargo, used as mount/beast of burden. Tail (tree top) lashes 1d6 dmg. Sharp needles all over body — riders take 1 dmg/turn without saddle. Goad-controlled (jammed behind root clump). Wild packs 1d8.
**Encounter tables:** forest (Tier 5 singleton — listed as "Pinelo" in encounter data, OCR variant)
**Number appearing:** 1d4 (1d8 in wild packs)
**Build:** A/P Plant, Low power level (animal behavior — used as mount)

```
Base BCs:    ST 10  EN 4  AG 14  IN 2  CL 6    (HD 2 = EN 4)

Hits        4~               Phys Def    1
Power       42               Mental Def  -4
Move        18 (with Speed)  Init        d3
HTH         d4               Inventing   1
Mass        d6 (~400 lbs)
```

**Abilities:** A/P Plant Low (10 CP — Mobility, Heightened Senses vision+olfactory at root clump), Heightened Strength ~+4 (4 CP — for 800kg cargo), Heightened Agility ~+4 (4 CP), Speed +6 (5 CP — for MV 18), Natural Weaponry tail lash + needle contact (5 CP), Armor 9 = 5/2/0/2 K/E/B/Ent (15 CP, bark + needles)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (tree-horse) -5
**Mount mechanics:** Wielded via goad behind root clump. Without saddle, rider takes 1 contact dmg/turn from needles. Carries 800 kg.
**CP estimate:** ~43
**Origin:** Mutated or Evolved

---

### Podog

**GW source:** AC 5 (8 if ridden), HD 4, MV 15. Large mutated mongrels. Carnivorous pack hunters, simple commands. Bite 2d6. Totally poison-immune. 1 in 100 has Dual Brain + Telepathy with master. Bay-cry mimics prey/opponent for confusion + initiative bonus. Wild packs = mated pair + 1-2 litters.
**Encounter tables:** clear, mountains, desert (Tier 3)
**Number appearing:** 1d6 (2d6 in wild packs)
**Build:** A/P Mammal, Low power level (animal behavior)

```
Base BCs:    ST 12  EN 1  AG 14  IN 3  CL 8    (HD 4 = EN 4 with size +3)
Size mod:    +3 ST, +3 EN  (Size Change Larger 5 CP, 8' tier)
Effective:   ST 15  EN 4  AG 14  IN 3  CL 8

Hits        4~               Phys Def    1
Power       36               Mental Def  -2
Move        11 + Speed = 15  Init        d3
HTH         d4 (bite 2d6)    Inventing   1
Mass        d6 (~400 lbs)    Profile     x1.3
```

**Abilities:** A/P Mammal Low (10 CP — Heightened Senses smell pack-tracking, Natural Weaponry bite +d6 sharp), Adaptation Bio (poison full immunity) 5 CP, Size Change Larger 8' (5 CP), Speed +4 (5 CP — for MV 15), Reflection Sonic (Sound Imitation — bay/mimic cry, +1 init when activated) ~5 CP, Armor 8 (when wild) = 5/1/0/2 K/E/B/Ent (12.5 CP) / Armor 4 (when ridden, due to rider exposing flanks)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant dog) -5
**Equipment:** none
**CP estimate:** ~42.5
**Origin:** Mutated or Evolved
**Prized variant (1 in 100):** Add Heightened Defense Mental (5 CP) + Heightened Intelligence ~+3 (3 CP) + Telepathy (master link only, 7.5 CP) = +15.5 CP. Dual Brain mutants are rarely sold.

---

### Sep

**GW source:** AC 5, HD 17, MV 10. Mutated land-shark. Telekinetic sand-burrowing. Detects creatures up to 50m away. Springs from ground, bites 9d6 dmg, burrows back, maneuvers 1-2 turns underground, attacks from different direction. Drags prey beneath sand to eat.
**Encounter tables:** desert, forest, mountains (Tier 3)
**Number appearing:** 1d6
**Build:** A/P Fish, Standard power level

```
Base BCs:    ST 10  EN 8  AG 6  IN 4  CL 10
Size mod:    +9 ST, +9 EN  (Size Change Larger 15 CP, 12' tier)
Effective:   ST 19  EN 17  AG 6  IN 4  CL 10

Hits        10~              Phys Def    -4
Power       46               Mental Def  -2
Move        14 ground        Init        d4
HTH         d10+1 (bite)     Inventing   2
Mass        d10 (~2000 lbs)  Profile     x2
```

**Abilities:** A/P Fish Standard (20 CP — Natural Weaponry massive bite ~2d10 sharp, Heightened Senses 50m detection, Telekinesis A sand manipulation as primary locomotion), Size Change Larger 12' (15 CP), Heightened Strength ~+4 to push bite higher (4 CP), Heightened Attack +2 hit (4 CP), Armor 8 = 5/1/0/2 K/E/B/Ent (12.5 CP — hide)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant land shark) -5
**Tactics:** Burrow → ambush → bite (9d6) → re-burrow → reposition 1-2 turns → attack from new angle. Extremely hard to engage at range; PCs fight blind unless they can detect underground movement.
**CP estimate:** ~55
**Origin:** Mutated or Evolved
**Note:** CP underbudget for HD 17 (125-175 expected). Bite damage and ambush mechanic are the threat — kit is light because the encounter design is built around hit-and-disappear, not durability.

---

### Serf

**GW source:** AC 6, HD 10, MV 12. Mutated humanoid. Heightened Strength, partial carapace, poison claws (intensity 8). Very intelligent (MS 15). Mental mutations: Light Wave Manipulation, Density Control (others), Life Leech, Death Field Generation, Mental Blast, Telepathy. Semi-nomadic, military "brigades" in old uniforms from Tombs of Ancients. General holds power via ancient weapon. 90% prefer mental attacks over weapons.
**Encounter tables:** desert, forest (Tier 4)
**Number appearing:** 1d4
**Build:** Humanoid (intelligent — no A/P)

```
Base BCs:    ST 16  EN 10  AG 12  IN 14  CL 15

Hits        11~              Phys Def    1
Power       52               Mental Def  3
Move        12               Init        d6
HTH         d6+1             Inventing   8
Mass        d4 (~150 lbs)
```

**Abilities (full kit — typical Serf has all):**
- Heightened Strength ~+6 (6 CP, baked into ST 16)
- Natural Weaponry — poison claws +d4 sharp (5 CP)
- Poison/Venom A — claws contact intensity 8 (5 CP)
- Light Wave Manipulation — Invisibility Visible Light (10 CP) + Light Control C Glare (5 CP) = 15 CP
- Density Control (others) — Gravity Control A or Transmutation, 30m range (20 CP)
- Life Leech — Siphon (Hits, Area Effect, 10m radius, 6 HP/turn) (15 CP)
- Death Field Generation — Death Touch + Area Effect 20m radius (35 CP)
- Mental Blast — Mental Ability A (17.5 CP)
- Telepathy (10 CP)
- Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP — partial carapace)

**Weaknesses:** Distinctive (military uniform identity) -5
**Equipment:** Old military/police uniforms (cosmetic). General has ancient weapon (artifact, GM picks — typically blast rifle or grenade launcher class, 15-20 CP).
**CP estimate:** ~135 base + general's artifact (substantially over HD-10 budget, but the full mental mutation list makes Serfs boss-tier despite mid HD)
**Origin:** Mutated or Evolved
**Tactics:** 90% open with mental attacks (Mental Blast, Death Field, Life Leech) at range. Close to claws only when mentals are exhausted or ineffective. General coordinates via Telepathy. Light Wave Manipulation enables ambush approach (Invisibility).
**Note:** Heavy mutation kit — GM may scale down to 2-3 picked mutations per Serf for non-elite encounters; full list reserved for the General + lieutenants.

---

### Seroon Lou

**GW source:** AC 8, HD 8, MV 3. Carnivorous aquatic plant up to 30m long, semi-intelligent. Stalk projects 3m above water, mobile roots walk bottom. Eye atop stalk + 11-20 manipulation vines. Wields rocks/clubs, bludgeons prey, drags to bottom for assimilation. Hides among peaceful Narl Ep (similar appearance, darker color).
**Encounter tables:** water (Tier 5 — encounter data lists "Seroon" in water and "Lou" in ruins; per source these are the same creature, recommend merging in `gw-encounter-data.js`)
**Number appearing:** 3d6 (per source; encounter data says 1 / 1d4 — verify)
**Build:** A/P Plant, Standard power level

```
Base BCs:    ST 12  EN 8  AG 8  IN 6  CL 8

Hits        4~               Phys Def    -2
Power       34               Mental Def  -2
Move        3 ground (root walk) / 9 vine reach effective
Init        d3
HTH         d6 (clubbed strike)  Inventing   3
Mass        d8 (~1500 lbs, elongated body)
```

**Abilities:** A/P Plant Standard (20 CP — Stretching Abilities A Elongation 3m+ vine reach, Natural Weaponry vines wielding rocks/clubs +d6 blunt, Heightened Senses eye-on-stalk tracking), Adaptation Aquatic (5 CP), Armor 3 = 1/1/0/1 K/E/B/Ent (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (huge aquatic plant — though *partial* concealment via Narl Ep mimicry is a flavor advantage)
**Tactics:** Hides underwater near Narl Ep colonies, reaches up via vine to grab clubs/rocks from shallows or shore, strikes from concealment. Drags subdued prey beneath water for slow root-assimilation.
**CP estimate:** ~30
**Origin:** Mutated or Evolved

---

### Sleeth

**GW source:** AC 5, HD 18, MV 12. 3m mutated lizard. IN 17, MS 17. Mental mutations: Telepathy, Precognition, special Force Field Negation (any FF within 30m). Completely resistant to illusions, poison resistance 18. 1 in 10 has additional rolled mutation. Quiet peaceful philosophical race in small communities. Can use all weapons.
**Encounter tables:** clear, desert, ruins (Tier 3)
**Number appearing:** 1d10
**Build:** Humanoid (intelligent, peaceful — no A/P)

```
Base BCs:    ST 12  EN 14  AG 14  IN 17  CL 17
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 17  EN 18  AG 14  IN 17  CL 17

Hits        13~              Phys Def    1
Power       66               Mental Def  3
Move        16               Init        d6+1
HTH         d6+1             Inventing   9
Mass        d6 (~400 lbs)    Profile     x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Telepathy visual+verbal (10 CP), Heightened Senses Vision Precognitive (15 CP — 3-min future, costs Hits if seeing harm), Negation (Force Field, 30m range — special) (15 CP), Adaptation Mental illusion-immunity (5 CP), Adaptation Bio poison-resistance 18 (5 CP), Armor 8 = 4/2/0/2 K/E/B/Ent (12.5 CP — scaled hide)
**Weaknesses:** none (peaceful nature is flavor, not CP weakness)
**Equipment:** Any weapon — Sleeths use all kinds. GM picks; iron-age to recovered-tech tier per community (15-25 CP avg)
**CP estimate:** ~85 + equipment
**Origin:** Mutated or Evolved
**1-in-10 variant:** Roll one additional mutation from `DESIGN-gw-mp-conversion.md` §10-12. ~10 CP avg added.
**Reaction:** Sleeths are friendly to mutants and welcome philosophical/religious discussion. Default reaction is favorable; combat is rare and reluctant. Good source of Ancient lore.

---

### Soul Besh

**GW source:** AC 8, HD 10, MV 9. Flightless mutated mosquito, 1.3m long. Chameleon powers (concealment ambush). 2m coiled proboscis: pierces sleeping victim, 1d6 dmg + intensity 18 paralytic poison same turn. Next turn: sucks blood at 12 HP/turn. Antidote: boil exoskeleton, 150cc syrup, 10cc human dose.
**Encounter tables:** desert, forest (Tier 4)
**Number appearing:** 1
**Build:** A/P Insect, Standard power level

```
Base BCs:    ST 8  EN 10  AG 14  IN 4  CL 8
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 10  AG 14  IN 4  CL 8

Hits        4~               Phys Def    1
Power       35               Mental Def  -2
Move        9                Init        d3+1
HTH         d3 (proboscis)   Inventing   2
Mass        d3 (~50 lbs)     Profile     /1.5
```

**Abilities:** A/P Insect Standard (20 CP — Invisibility Visible-Light Camouflage, Stretching Abilities A Elongation 2m proboscis, Natural Weaponry proboscis pierce +d6 sharp), Size Change Smaller 4.5' (2.5 CP), Poison/Venom A intensity 18 paralytic (carrier on Natural Weaponry) (10 CP), Siphon (Hits vampiric, 12 HP/turn after pierce, sustained) (17.5 CP), Armor 3 = 1/1/0/1 (5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (giant mosquito) -5
**Tactics:**
1. Camouflaged ambush, prefer sleeping prey
2. Proboscis pierce: 1d6 dmg + intensity 18 paralytic save
3. After paralysis: drain blood 12 HP/turn until interrupted
**Resource:** Boiled exoskeleton yields 150cc antidote to intensity 18 poison (10cc human dose).
**CP estimate:** ~55
**Origin:** Mutated or Evolved

---

### Tribesmen

**GW source:** No dedicated stat block — encounter table specifies "wandering band of 1-100 (2d10) Pure Strain Humans or humanoids." Tech level varies per region (stone-age clubs/spears → industrial firearms → recovered tech). Reaction varies by tribe disposition.
**Encounter tables:** clear, mountains, desert, water, ruins, radioactive (Tier 1, 6 tables)
**Number appearing:** 2d10 wandering / 1-100 full tribe (RAW)
**Build:** Humanoid (PSH or mutated humanoid — GM picks per encounter)

#### Tiered MP Power Level generation

Generate band members per MP 2.1.7.1, scaling by role:

| Tier | % of band | MP Power Level | BC array | BC total | Mutations (humanoid only) |
|---|---|---|---|---|---|
| Bulk grunts | ~80% | Normal | 14/12/10/8/6 | 50 | 1 |
| Sub-leaders / warriors | ~15-20% | Low | 16/14/12/10/8 | 60 | 1d3 |
| Chief / shaman | 1 per band | Standard | 18/16/14/12/10 | 70 | 1d4+1 |
| Legendary chief (boss) | optional | High | 20/18/16/14/12 | 80 | 2d4 |

Per individual: use **Random Method** (d10 roll) for variety, or **Construction Method 1** (assign array as desired) with archetype guidance below. Bulk band can use a single shared template per archetype to save table time.

#### Archetype array assignments (Construction Method 1, Normal Power Level)

| Archetype | ST | EN | AG | IN | CL |
|---|---|---|---|---|---|
| Warrior (combat) | 14 | 12 | 10 | 6 | 8 |
| Scout / hunter | 10 | 12 | 14 | 8 | 6 |
| Shaman / leader | 6 | 8 | 10 | 12 | 14 |
| Generalist | use Random Method per MP 2.1.7.1 |

Higher Power Level tiers shift the array up (Low: 16/14/12/10/8; Standard: 18/16/14/12/10; High: 20/18/16/14/12) — same archetype shape, more BC points.

#### Bulk grunt example (Normal Power, warrior archetype)

```
BCs:        ST 14  EN 12  AG 10  IN 6   CL 8

Hits        4                Phys Def    0
Power       42               Mental Def  -2
Move        12               Init        d3+1
HTH         d4+1             Inventing   3
Mass        d4 (~150 lbs)
```

**Abilities:** none baseline (PSH); +1 mutation from `DESIGN-gw-mp-conversion.md` §10-12 if humanoid
**Origin:** PSH (none) or Mutated or Evolved (humanoid)

#### Equipment by tech level (pick one per tribe)

| Tech level | Bulk grunt | Sub-leader | Chief |
|---|---|---|---|
| Stone age | Spear (15) + dagger (5) | + small shield in Armor | + carved-bone artifact (10%) |
| Iron age | Sword (10) + bow (8) | + leather armor (5) | + steel armor (10) + horse |
| Industrial | Rifle (10) | + bandolier extra ammo | + auto rifle (15) |
| Recovered tech | Pistol (5) | + 1 random artifact (25%) | + 1 random artifact (75%) + power armor |

#### Reaction handling

GW reaction-table results → MP CL-based Influence Task per `DESIGN-gw-mp-conversion.md` §1. Common tribe dispositions:
- Hostile bandits → opposed CL check, default Hostile
- Cautious nomads → neutral, modifier per offer/charisma
- Friendly traders → favorable, want goods exchange
- Mutant supremacists → hostile to PSH, neutral to humanoids
- PSH purists → hostile to humanoids, neutral to PSH

**CP estimate:** Normal grunt ~25 + equipment; Low sub-leader ~40 + equipment + mutations; Standard chief ~70 + equipment + mutations; High legendary ~110 + equipment + mutations.

---

### Win Seen

**GW source:** AC 9, HD 13, MV N/A (immobile). Creeping vine tangle, runners up to 20m diameter, all plants in colony are connected. Two varieties:
- **Yellow-green aquatic:** Floats on lakes/ponds. Sonic attack on touch + intensity 14 contact poison.
- **Blue-green land:** Above + attraction odor (lures carnivores) + crude Magnetic Control (50kg ferrous within 50m, 25 turns; activates only after damage taken).
**Encounter tables:** forest, water (Tier 4)
**Number appearing:** 2d4 (per source; encounter data shows 1d3)
**Build:** A/P Plant, Low power level (immobile, contact-trigger defenses)

```
BCs:        ST 14  EN 13  AG 4  IN 3  CL 8

Hits        7~               Phys Def    -4
Power       34               Mental Def  -2
Move        0 (immobile)     Init        d3
HTH         d6 (vine grasp)  Inventing   1
Mass        d8 (~1500 lbs total tangle)
```

**Abilities:**
- A/P Plant Low (10 CP — Sonic Abilities A Sonic Blast contact-trigger, Poison/Venom A intensity 14 contact)
- *Land variety adds:* Magnetism A (50m, 50kg ferrous, 25 turn duration, conditional on damage trigger) (15 CP), Emotion Control Pheromones (attraction odor, lures carnivores) (10 CP)
- *Aquatic variety adds:* Adaptation Aquatic (5 CP)
- Armor 0 (vines defenseless, no carapace)

**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (large vine tangle) -5, Special Requirement (immobile, can be uprooted/burned) -5
**Resource:** Cooking yields 100cc antidote to intensity 14 poison (10cc human dose).
**CP estimate:** ~20 (aquatic) / ~40 (land variety with magnetism + pheromones)
**Origin:** Mutated or Evolved
**Tactics:** Passive-trigger defense — entering plant's perimeter triggers sonic attack + poison contact. Damage activates magnetic suppression (land) — drops ferrous gear to ground. Pheromones (land) creates persistent carnivore-infested encounter zone around the plant.
**Note:** Two variants by terrain. GM picks based on encounter location.

---

### Yexil

**GW source:** AC 6, HD 10, MV 4/15 (ground/fly). 8m wingspan, 3m tall, indeterminate origin chimera. Slow-witted, friendly. 2 long hairy legs, lion-like head with large mandibles, hands at end of each wing. Bite 3d6, laser eyes 5d6 at 25m. Orange/black fur, cold-resistant. Gourmet — favorite foods are manufactured clothing (snappier outfits taste better). Trades worthless tech (pistols, bombs, grenades) for clothes.
**Encounter tables:** clear, mountains, ruins (Tier 3)
**Number appearing:** 1d4
**Build:** Humanoid (intelligent enough to trade — no A/P) with chimeric features

```
Base BCs:    ST 11  EN 6  AG 12  IN 6  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 16  EN 10  AG 12  IN 6  CL 10

Hits        9~               Phys Def    1
Power       44               Mental Def  -2
Move        13               Init        d4
HTH         d6+1 (bite)      Inventing   3
Mass        d8 (~1500 lbs)   Profile     x1.5
```

**Abilities:** Size Change Larger 9' (7.5 CP), Flight 15m/turn (7.5 CP), Power Blast Energy laser eyes 25m range ~5d6→ 2d8 energy (17.5 CP), Natural Weaponry bite +d8 sharp (7.5 CP), Adaptation Energy/cold (5 CP — fur cold-resistance), Physical Ability B Extra Limbs hand-tipped wings (5 CP — manipulative wings), Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP)
**Weaknesses:** Lowered Intelligence (slow-witted) -5, Compulsion (gourmand, distractible by fancy clothing) -5
**Equipment:** Random tech the yexil considers worthless — pistol (5), bombs (5-10), grenades (5-10). GM picks 1d3 items.
**Trade:** Will exchange tech for "snappy" clothing. Reaction modifier: +2 if PCs offer fashionable garments, -2 if drab.
**CP estimate:** ~55
**Origin:** Indeterminate (treat as Mutated or Evolved for mechanical purposes)
**Tactics:** Friendly first — offers trade. Combat is reluctant unless attacked. Laser eyes at 25m, bite up close. Fur protects from cold-based attacks fully.

---

### Zarn

**GW source:** AC 7, HD 4, MV teleportation only (max 200m). 10cm orange parasitic beetle, semi-intelligent. Spits intensity 16 paralytic contact poison (5m range) on one turn, then teleports to new position next turn; alternates spit/teleport until victim paralyzed. Spittle persistent — save vs poison each turn per unwashed area. Paralysis lasts 1 week. Bores through skull, lays 4d6 (4-24) eggs in brain; eggs hatch day 4, hatchlings emerge day 5. Eggs only removable surgically.
**Encounter tables:** clear, mountains, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1
**Build:** A/P Insect, Low power level

```
Base BCs:    ST 10  EN 4  AG 14  IN 5  CL 10
Size mod:    -2 ST, -2 EN  (Size Change Smaller 10 CP, 1' tier)
Effective:   ST 8   EN 2  AG 14  IN 5  CL 10

Hits        2~               Phys Def    1
Power       29               Mental Def  -2
Move        N/A (teleport)   Init        d4
HTH         d2               Inventing   3
Mass        d2- (~10 oz)     Profile     /6
```

**Abilities:** A/P Insect Low (10 CP — Heightened Senses target acquisition vision+thermal, Natural Weaponry bore-mandibles +2/+d4 sharp post-paralysis only), Size Change Smaller 1' (10 CP), Teleportation 200m range alt-turns (12.5 CP — primary locomotion), Special Missile Weapon spit intensity 16 paralytic 5m persistent (17.5 CP), Armor 5 = 3/0/0/2 K/E/B/Ent (7.5 CP)
**Weaknesses (in A/P bundle):** Lowered Intelligence -5, Distinctive (orange beetle) -5
**Tactics:**
1. Turn 1: spit poison at nearest target (5m range, intensity 16 paralytic)
2. Turn 2: teleport up to 200m to new position
3. Repeat until target paralyzed
4. Post-paralysis: bore through skull, lay 4d6 eggs (1-week paralysis)
5. Eggs hatch day 4; hatchlings emerge day 5; surgical removal only
**CP estimate:** ~57.5
**Origin:** Mutated or Evolved
**Note:** CP exceeds typical HD-4 budget (25-50). Justified — kit-heavy creature with high utility (teleport mobility + ranged paralysis + persistent poison + parasitic body horror) outweighs HP pool. Treat as low-HP boss-tier encounter.

---

*Catalog continues as batches are statted. Send next batch of GW writeups to add entries.*
