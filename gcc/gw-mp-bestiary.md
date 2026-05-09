# Gamma World 1e → Mighty Protectors Bestiary

**Status:** v0.2 (7 of 56 statted)
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
BCs:        ST 10  EN 12  AG 10  IN 18  CL 18    (MS 18 + IN 18 fixed; rest rolled)

Hits        7~                Phys Def    0
Power       50                Mental Def  4
Move        11                Init        d6+1
Saves       EN 11- / AG 10- / IN 12- / CL 12-
HTH         d3                Inventing   9
Mass        d4 (~150 lbs)
```

**Abilities:**
- Heightened Intelligence (~+8 to IN) 8 CP
- Heightened Cool (~+8 to CL) 8 CP
- Heightened Defense (Mental) 5 CP
- Armor 6 = 4/1/0/1 K/E/B/Ent (10 CP, synthetic skin + light gear)

**Equipment:** GM choice — pistol (5 CP) or short blade (5 CP)
**Common weaknesses:** -10 CP (see above)
**CP estimate:** ~31 + equipment

#### Android — Worker

```
BCs:        ST 18  EN 18  AG 10  IN 10  CL 10    (ST 18 + Con 18 fixed; rest rolled)

Hits        10~               Phys Def    0
Power       56                Mental Def  0
Move        15                Init        d4
Saves       EN 12- / AG 10- / IN 10- / CL 10-
HTH         d8                Inventing   5
Mass        d6 (~250 lbs)
```

**Abilities:**
- Heightened Strength (~+8 to ST) 8 CP
- Heightened Endurance (~+8 to EN) 8 CP
- Armor 8 = 6/1/0/1 K/E/B/Ent (12.5 CP, synthetic skin + medium gear)

**Equipment:** GM choice — large club (15 CP) or heavy blade (15 CP)
**Common weaknesses:** -10 CP
**CP estimate:** ~33.5 + equipment

#### Android — Warrior

```
BCs:        ST 18  EN 18  AG 18  IN 18  CL 10    (all 18 except MS rolled)

Hits        14~               Phys Def    4
Power       72                Mental Def  0
Move        18                Init        d4
Saves       EN 12- / AG 12- / IN 12- / CL 10-
HTH         d8                Inventing   9
Mass        d6 (~250 lbs)
```

**Abilities:**
- Heightened Strength (~+8) 8 CP
- Heightened Endurance (~+8) 8 CP
- Heightened Agility (~+8) 8 CP
- Heightened Intelligence (~+8) 8 CP
- Armor 9 = 7/1/0/1 K/E/B/Ent (15 CP, military synthetic + heavy gear)

**Equipment:** GM choice — auto rifle (15 CP) or blast rifle (15 CP) + large blade (10 CP)
**Common weaknesses:** -10 CP
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

### Blaash

**GW source:** AC 8, HD 15, MV 6/15 (ground/fly), no stated MS. ~1m mutated moth, 2m wingspan, fearless and carnivorous. Glows brightly when attacking; emits intensity 18 radiation in 5m radius (continuous, harmful to others, harmless to blaash + kin). After kill, stops to feed voraciously.
**Encounter tables:** clear, mountains, forest, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1d10
**Build:** A/P Insect, Standard power level (animal behavior, no tools/language)

```
Base BCs:    ST 10  EN 15  AG 14  IN 4  CL 12
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 9   EN 15  AG 14  IN 4  CL 12

Hits        9~               Phys Def    1
Power       42               Mental Def  -2
Move        13 (flight only) Init        d4+1
Saves       EN 11- / AG 11- / IN 8- / CL 10-
HTH         d3               Inventing   2
Mass        d3 (~50 lbs)     Profile     /1.5
```

**Abilities:**
- A/P Insect (Standard, 20 CP for bundle):
  - Flight — 15m/turn (primary locomotion; ground 6 in GW, treat as 13 in MP)
  - Heightened Senses (vision + smell, full)
  - Natural Weaponry — small claws/legs, +2 hit, +d3 sharp (post-kill feeding)
- Size Change: Smaller 2.5 CP (4.5' tier)
- Power Blast (Energy, Aura, Continuous, 5" diameter, ~d6 Hits/turn) ~17.5 CP — intensity 18 radiation field
- Adaptation (Energy / radiation, complete) 5 CP — self + kin immune
- Light Control C (Glare while attacking) 5 CP — visible glow, no mechanical penalty
- Armor 3 = 1/2/0/0 K/E/B/Ent (5 CP, chitin + light energy resist)

**Weaknesses (in A/P bundle):**
- Lowered Intelligence -5 CP
- Distinctive (giant glowing moth) -5 CP

**Tactics:**
- Aura is always-on while engaged — anyone within 5m takes radiation damage automatically
- After kill: lands and feeds, vulnerable to ambush during this phase
- Fearless — no morale check, will not retreat

**Equipment:** none

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
Saves       EN 11- / AG 10- / IN 8- / CL 9-
HTH         d4+1             Inventing   3
Mass        d4 (~150 lbs)
```

**Abilities:** none baseline (PSH); +1 mutation from `DESIGN-gw-mp-conversion.md` §10-12 if humanoid
**Weaknesses:** none baseline; tribe disposition handled at reaction
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

**CP estimate:** Normal grunt ~25 base + equipment; Low sub-leader ~40 + equipment + mutations; Standard chief ~70 + equipment + mutations; High legendary ~110 + equipment + mutations.

**Note:** All BC arrays are starting points; characters may exceed array maximums via Heightened-X abilities later, up to absolute BC Cap (MP 2.1.16.5).

---

### Zarn

**GW source:** AC 7, HD 4, MV teleportation only (max 200m). 10cm orange parasitic beetle, semi-intelligent. Spits intensity 16 paralytic contact poison (5m range) on one turn, then teleports to new position next turn; alternates spit/teleport until victim paralyzed. Spittle persistent — save vs poison each turn per unwashed area. Paralysis lasts 1 week. Bores through skull, lays 4d6 (4-24) eggs in brain; eggs hatch day 4, hatchlings emerge day 5. Eggs only removable surgically.
**Encounter tables:** clear, mountains, desert, radioactive (Tier 2, 4 tables)
**Number appearing:** 1
**Build:** A/P Insect, Low power level (semi-intelligent animal behavior)

```
Base BCs:    ST 10  EN 4  AG 14  IN 5  CL 10
Size mod:    -2 ST, -2 EN  (Size Change Smaller 10 CP, 1' tier)
Effective:   ST 8   EN 2  AG 14  IN 5  CL 10

Hits        2~               Phys Def    1
Power       29               Mental Def  -2
Move        N/A (teleport)   Init        d4
Saves       EN 7- / AG 11- / IN 7- / CL 10-
HTH         d2               Inventing   3
Mass        d2- (~10 oz)     Profile     /6
```

**Abilities:**
- A/P Insect (Low, 10 CP for bundle):
  - Heightened Senses (target acquisition, vision + thermal)
  - Natural Weaponry — bore-mandibles, +2 hit, +d4 sharp (post-paralysis only)
- Size Change: Smaller 10 CP (1' tier)
- Teleportation (range 200m / 200" range, alternating turns) ~12.5 CP — primary locomotion
- Special Missile Weapon — spit, intensity 16 paralytic poison, 5m range, persistent (save/turn until washed) ~17.5 CP
- Armor 5 = 3/0/0/2 K/E/B/Ent (7.5 CP, chitin + entropy resist)

**Weaknesses (in A/P bundle):**
- Lowered Intelligence -5 CP
- Distinctive (orange beetle) -5 CP

**Tactics:**
1. Turn 1: spit poison at nearest target (5m range, intensity 16 paralytic)
2. Turn 2: teleport up to 200m to new position
3. Repeat until target paralyzed
4. Post-paralysis: bore through skull, lay 4d6 eggs (1-week paralysis)
5. Eggs hatch day 4; hatchlings emerge day 5; surgical removal only

**Equipment:** none

**CP estimate:** ~57.5
**Origin:** Mutated or Evolved

**Note:** CP exceeds typical HD-4 budget (25-50). Justified — kit-heavy creature with high utility (teleport mobility + ranged paralysis + persistent poison + parasitic body horror) outweighs HP pool. Treat as low-HP boss-tier encounter.

---

*Catalog continues as batches are statted. Send next batch of GW writeups to add entries.*
