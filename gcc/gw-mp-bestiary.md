# Gamma World 1e → Mighty Protectors Bestiary

**Status:** v0.1 (3 of 56 statted)
**Destination:** `gcc/gw-mp-bestiary.md`
**Last updated:** 2026-05-08
**Conversion rules:** see `gcc/DESIGN-gw-mp-conversion.md`

Stat blocks for GW1e wilderness encounter table creatures, converted to MP. Encounter tables defined in `gw-encounter-data.js`; this file is the matching MP stat catalog. Ordered alphabetically.

---

## Status by tier

**Tier 1 — Universal (3 creatures, 0/3 done)**
- [ ] Android (6 tables)
- [ ] Tribesmen (6 tables)
- [ ] Robotic Unit (7 tables) — *deferred, needs separate Robotic Unit conversion model*

**Tier 2 — Wide-spread (3 creatures, 1/3 done)**
- [ ] Blaash (4 tables)
- [x] **Badder** (4 tables)
- [ ] Zarn (4 tables)

**Tier 3 — Common (10 creatures, 1/10 done)**
- [x] **Arn** (3 tables)
- [ ] Herp, Hisser, Hoop, Pam, Perth, Podog, Sep, Sleeth, Yexil (3 tables each)

**Tier 4 — Regional (14 creatures, 1/14 done)**
- [x] **Ark** (2 tables)
- [ ] Blight, Cal Then, Centisteed, Crep Plant, Ert, Hori, Kai Lin, Obb, Orlen, Serf, Soul Besh, Win Seen, Zeethh

**Tier 5 — Single-table specialists (26 creatures, 0/26 done)**
- *Water (11):* Bari Nep, Cren Tosh, Ert Telden, Fen, Fleshin, Herkel, Keeshin, Menarl, Nari Ep, Seroon, Teri
- *Radioactive (3):* Arn Blight, Serf Hisser, Sert
- *Ruins (2):* Ber Lep, Lou
- *Other (10):* Brutorz, Choo, Choo Kep, Erl, Gren, Hopper, Kep, Pinelo, Rakox, Telden

---

## Stat block format

```
### CreatureName

**GW source:** [AC, HD, MV, mutations, equipment, behavior summary]
**Encounter tables:** [list] (Tier N)
**Number appearing:** [die expr]
**Build:** [Humanoid | A/P <Type> <PowerLevel> | Plant | Robot]

[code block: BCs, derived stats]

**Abilities:** [list with CP]
**Weaknesses:** [list with CP]
**Equipment:** [list with CP]
**CP estimate:** ~XX
**Origin:** Mutated or Evolved
```

---

## Catalog

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
Saves       EN 11- / AG 11- / IN 11- / CL 10-
HTH         d6+1 (kinetic)   Inventing   7
Mass        d6+1 (~700 lbs)  Profile     x1.5
```

**Abilities:**
- Size Change: Larger 7.5 CP (9' tier)
- Telekinesis A (Kinetic Manipulation) 7.5 CP — 300 lbs / d6+1, range 12"
- Weather Control A (Change Weather) ~15 CP + B (Command) ~10 CP — total 25 CP
- Siphon (Hits, Area Effect) 12.5 CP — d6 Hits, 5" diameter
- Armor 6 = 1/3/1/1 K/E/B/Ent (10 CP) — radiation-leaning per Rad Res 10
- Adaptation (Radiation) 5 CP

**Weaknesses:**
- Phobia (large winged creatures) -5 CP

**Equipment:**
- Large Club — +2 hit, +d6+1 blunt, 15 CP
- Wicker shield — folded into Armor

**CP estimate:** ~85
**Origin:** Mutated or Evolved

---

### Arn

**GW source:** AC 9, HD 8, MV 3/16 (ground/fly), bite 2d6, carries ≤2kg in flight. 1.3m mutated flying insect, beast of burden.
**Encounter tables:** clear, forest, mountains (Tier 3)
**Number appearing:** 1d4
**Build:** A/P Insect, Low power level (animal behavior — no language/tools)

```
Base BCs:    ST 8  EN 8  AG 14  IN 4  CL 6
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 8  AG 14  IN 4  CL 6

Hits        2                Phys Def    1
Power       33               Mental Def  0
Move        10 ground        Init        d3
Saves       EN 9- / AG 11- / IN 8- / CL 9-
HTH         d3               Inventing   2
Mass        d2 (~40 lbs)     Profile     /1.5
```

**Abilities:**
- A/P Insect (Low tier, 10 CP for bundle):
  - Flight — 16m/turn, ≤2kg cargo
  - Natural Weaponry — mandibles, +4 hit, +6 sharp
- Size Change: Smaller 2.5 CP (4.5' tier)
- Armor 2 = 1/0/0/1 K/E/B/Ent (2.5 CP, chitin)

**Weaknesses (in A/P bundle):**
- Lowered Intelligence -5 CP
- Distinctive (giant insect) -5 CP

**Equipment:** none

**CP estimate:** ~15
**Origin:** Mutated or Evolved

---

### Badder

**GW source:** AC 4, HD 6, MV 12, Dex 18, MS 16, bite 1d6, mutation Empathy, hard of hearing, keen sense of smell. 1.5m intelligent mutated badger, medieval society. 10% chance of 1 random artifact weapon.
**Encounter tables:** clear, forest, ruins, water (Tier 2)
**Number appearing:** 1d6
**Build:** Humanoid (anthropomorphic intelligent — no A/P, "Short" descriptor free at 1.5m)

```
Base BCs:    ST 12  EN 6  AG 18  IN 13  CL 16

Hits        9                Phys Def    2
Power       49               Mental Def  1
Move        12               Init        d6+1
Saves       EN 9- / AG 12- / IN 11- / CL 11-
HTH         d6 (covers bite) Inventing   7
Mass        d4 (~100 lbs)
```

**Abilities:**
- Heightened Agility (~+8 to AG) 8 CP
- Heightened Cool (~+6 to CL) 6 CP
- Heightened Intelligence (~+3 to IN) 3 CP
- Heightened Senses — Odors Full + Acute, 10 CP (keen smell)
- Telepathy (visual + verbal, Mood Reading) 10 CP — Empathy mutation
- Armor 3 = 1/1/0/1 K/E/B/Ent (5 CP, cured hide)

**Weaknesses:**
- Diminished Senses — hearing -5 CP

**Equipment:**
- Spear — +2 hit, +d8+1 sharp, 3" reach, 15 CP
- Wooden shield — folded into Armor
- 10% chance: 1 random artifact weapon

**CP estimate:** ~57
**Origin:** Mutated or Evolved

---

*Catalog continues as batches are statted. Send next batch of GW writeups to add entries.*
