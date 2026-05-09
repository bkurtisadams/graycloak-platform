# DESIGN: Gamma World 1e → Mighty Protectors Creature Conversion

**Status:** v1.1
**Destination:** `gcc/DESIGN-gw-mp-conversion.md`
**Last updated:** 2026-05-09

**MP rule sources:**
- Mighty Protectors core rulebook
- "New Abilities for Mighty Protectors" supplement v1.7 (2021) — provides Bridge Travel, Change Environment, Inertia, Physical Ability J Swarm, Possession, Shape Travel, Stretching E Plasticity (update), Tunneling, Unprotection, plus Low Self-Control and Physical Disability sub-types

## Purpose

Canonical reference for converting Gamma World 1e creatures, mutations, and equipment to Mighty Protectors (Heroic Publishing) for Earth-3-style hex-crawl campaigns where MP is the rule system and GW1e provides the bestiary, encounters, and setting.

## Scope

Covers Mutated Animal, Mutated Plant, Pure Strain Human, and Humanoid creatures. Does **not** cover GW Robotic Units (separate conversion model — TBD).

---

## 1. Stat Mapping

Direct attribute mappings:

| GW1e Stat | MP Stat | Mapping |
|---|---|---|
| Physical Strength | ST | 1:1 in 3-18 range |
| Constitution / HD | EN | 1:1 (HD = Con per GW rule) |
| Dexterity | AG | 1:1 |
| Intelligence | IN | 1:1 |
| Mental Strength | CL | Willpower/fortitude framing |
| Charisma | CL | Used via Influence Tasks (3.1.1) |

When both GW MS and Cha are stated for the same creature, take the higher (or if both are notable, sum-and-cap to creature's CL ability cap). MP CL absorbs both roles since GW splits psionic-defense and leadership but MP unifies them.

For unstated GW BCs (typical for monster entries giving only AC, HD, MV), default to 10 baseline and adjust from description (size, frame, behavior, equipment use).

GW Charisma's mechanical effect → MP Influence Tasks (3.1.1). The reaction-table outcome is rolled as a CL-based opposed task check.

---

## 2. HP and Hits Anchor

**Average human anchor:** GW Con 10 = 35 HP avg ≈ MP Normal Power Level (50 BC points, 14/12/10/8/6 array per MP 2.1.7.1) ≈ 4 Hits / 40 Power. The all-10s simplification used in this doc has the same total BC points; archetype-specific arrays (warrior, scout, shaman) redistribute that pool per MP Construction Method 1. For NPC bands and converted creatures, use either the all-10s shortcut or full MP 2.1.7.1 generation depending on detail tier needed.

GW HD does **not** carry over as MP Hits proportionally. GW HP is purely physical resilience (Con × d6); MP Hits is multi-factor survivability derived from ST + EN + AG + CL contributions per BC table. Trying to enforce HP-to-Hits proportionality re-imports GW combat attrition into MP and undermines the system swap.

**Procedure:**
1. Map GW Con/HD → MP EN directly (Con 8 → EN 8, etc.).
2. Set other BCs from GW description.
3. Apply Size Change for non-human-sized creatures.
4. Compute Hits from final BCs using MP BC table.
5. Power = ST + EN + AG + IN.
6. Move = (ST + EN + AG) / 3, rounded.
7. Saves and Mass roll from BC table lookups.

**Roll-with damage** (1/10 Power per hit, rounded down) is the major defensive layer that makes MP combat survivable at low Hits totals. Power scales with BC sums, so toughening a creature via Size Change or Heightened-X automatically buffs both Hits and roll-with.

**Durability ability** is **not** a systematic conversion bonus. Reserve for boss-tier creatures and per-encounter tuning. BC-derived Hits + Power roll-with + Armor handles most cases.

---

## 3. Armor Class Conversion

GW AC bundles damage reduction (hide/armor) with hit avoidance (size/speed/agility). MP separates: Armor reduces damage, Physical Defense governs hit chance.

### 3.1 Worn-armor ladder

| GW AC | Description | MP Armor (total points, ~CP) |
|---|---|---|
| 10 | None | 0 (0) |
| 9 | Shield only | 2 (2.5) |
| 8 | Furs/skins | 3 (5) |
| 7 | Furs + shield | 5 (7.5) |
| 6 | Cured hide / partial carapace | 6 (10) |
| 5 | Hide + shield | 8 (12.5) |
| 4 | Piece metal / total carapace | 9 (15) |
| 3 | Powered plate/plastic | 12 (20) |
| 2 | Powered alloy/inertia | 16 (30) |
| 1 | Powered attack/assault | 20+ (40+) |

### 3.2 AC source-splitting

GW creature AC is inherent and bundles multiple contributors. Determine which apply from creature flavor:

| AC source | MP destination |
|---|---|
| Worn armor | MP Armor ability (equipment) |
| Inherent hide/carapace | MP Armor ability (inherent) |
| Inherent agility (Heightened Dex, twitchy/fast) | AG attribute / Heightened Agility (drives Phys Def) |
| Density Control mutation | MP Density Change ability |
| Skill/training/experience | MP Experience Levels (defensive) |
| Magical/supernatural deflection | MP Force Field |

For creatures where AC is hide-dominant: load MP Armor heavily. For agility-dominant: bump AG, leave Armor low. Most creatures split: some Armor + AG-derived Phys Def.

---

## 4. Size Change

Required for any creature outside human baseline (~6 ft / ~175 lbs). Maps GW size descriptions to MP Size Change ability.

### 4.1 Size Change: Larger thresholds

| GW size | MP CP tier | ST/EN bonus | Profile |
|---|---|---|---|
| 6 ft (baseline) | 0 | 0/0 | x1 |
| 7 ft | 2.5 | +2/+1 | x1.2 |
| 8 ft | 5 | +3/+3 | x1.3 |
| 9 ft | 7.5 | +5/+4 | x1.5 |
| 10 ft | 10 | +6/+6 | x1.6 |
| 12 ft | 15 | +9/+9 | x2 |
| 15 ft | 20 | +12/+12 | x2.5 |

### 4.2 Size Change: Smaller thresholds

| GW size | MP CP tier | ST/EN penalty | Profile |
|---|---|---|---|
| 6 ft (baseline) | 0 | 0/0 | x1 |
| 4.5 ft | 2.5 | -1/0 | /1.5 |
| 3 ft | 5 | -1/-1 | /2 |
| 2 ft | 7.5 | -2/-1 | /4 |
| 1 ft | 10 | -2/-2 | /6 |

### 4.3 Big & Tall / Short & Thin (free)

For creatures that are merely tall/big or short/thin under the 10 CP threshold without ST/EN modifier, use the descriptor at 0 CP. They get the Profile change but no BC bump. Useful for creatures slightly outside human baseline (Badder at 1.5m → "Short" descriptor, no CP).

### 4.4 Application rule

For always-large creatures: model as Continual Size Change, baked into effective BCs. Display final BCs (= base + size mod) in stat block; list Size Change ability separately with CP. Do **not** double-count BC bumps via both Heightened-X and Size Change.

For "humanoid-tier" base BCs of large creatures: assume base ST 10 (humanoid baseline) before size. Size mod brings it to final.

---

## 5. Animal/Plant Ability

### 5.1 When required

GW typology classifies creatures as Pure Strain Human, Humanoid, Mutated Animal, or Mutated Plant. For MP conversion, **behavior matters more than typology**:

- **A/P required:** creatures that behave as animals (no language, no tool use, no society) — e.g. mutated insects, regular animal mutants
- **No A/P:** anthropomorphic intelligent species (talk, wield tools, have culture) — even if GW types them as Mutated Animal. Treat as Humanoid build with mutations.

### 5.2 Type selection

Map GW species description to closest MP A/P type:

| GW species | MP A/P type | BC mods |
|---|---|---|
| Mutated mammal (canid, mustelid, etc.) | Mammal | 0/0/0 |
| Mutated insect (arthropod) | Insect | 0/0/0 |
| Mutated bird | Avian | -2/-2/+4 |
| Mutated reptile (snake, lizard) | Reptile | +2/+2/-4 |
| Mutated amphibian (frog, salamander) | Amphibian | +2/+2/-4 |
| Mutated arachnid (spider) | Arachnid | -4/+2/+2 |
| Mutated crustacean (lobster, crab) | Crustacean | +4/0/-4 |
| Mutated mollusk | Mollusk | +2/+2/-4 |
| Mutated fish | Fish | 0/+4/-4 |
| Mutated plant | Plant/Fungus | +3/+3/-6 |
| Single-celled (slime, ooze) | One-Celled | -4/+2/+2 |
| Generic "lower lifeform" | Lower Class | -2/+2/0 |

### 5.3 Power level

Tier the A/P ability count by GW threat level:

| Tier | A/P Power Level | Abilities | Net A/P CP |
|---|---|---|---|
| Beast / mount / minor critter | Low | 2 + 2 weak | ~10 |
| Standard mutant | Standard | 3 + 2 weak | ~20 |
| Apex / boss-tier | High | 4 + 2 weak | ~30 |

### 5.4 Ability picks

**Pick** abilities to match GW description; do not roll random. Match GW-stated traits to entries on the type's 2d6 ability table:

- Keen smell → Heightened Senses
- Flying → Flight
- Bites for damage → Natural Weaponry
- Fast / quick → Speed or Heightened Agility
- Tough → Heightened Endurance
- Strong → Heightened Strength
- Senses surroundings well → Heightened Senses

### 5.5 Bundling implication

A/P abilities are fixed at 10 CP each. Picking Heightened-X via A/P always adds **+10** to that BC. If the GW creature's stat is between baseline and +10, either:

- Don't pick Heightened-X via A/P; pay raw Heightened-X (1 CP per +1) outside the bundle, OR
- Set base BC lower so the +10 lands on target (e.g., base AG 8 + A/P Heightened Agility +10 = effective AG 18)

When base HTH damage from final ST already covers the GW bite/claw damage, **do not** add Natural Weaponry separately; the bite is just base HTH.

### 5.6 A/P weaknesses

A/P bundles 2 weaknesses at -5 CP each. Pick to match GW description (Diminished Senses for "hard of hearing", Phobia for explicit fears, Distinctive for visually unmistakable creatures). Substitute GW-stated weaknesses for the random rolls.

---

## 6. Armor Distribution by Damage Source

Default Armor distribution from MP table is K/E/B/Ent (e.g., 2/1/1/2 at 10 CP). For converted creatures, weight the distribution by GW source:

| GW source | MP damage type |
|---|---|
| Radiation resistance | Energy |
| Poison resistance | Biochemical |
| Heat/cold mutations | Energy / Entropy |
| Sonic attacks/defense | Kinetic |
| Fear / mental | Psychic |
| Generic hide/carapace | Kinetic-weighted |

For Ark with stated Rad Res 10: shift Armor distribution toward Energy (e.g., 1/3/1/1 instead of default 2/1/1/2 at 10 CP), or add Adaptation (Radiation) for 5 CP separately.

---

## 7. Equipment Mapping

### 7.1 Standard weapons

| GW weapon | MP equivalent | CP |
|---|---|---|
| Club / staff | Club or Staff (+2 hit, +d3 blunt) | 10 |
| Large club | Large Club (+2 hit, +d6+1 blunt) | 15 |
| Small club / cudgel | Small Club (+2 hit, +d2-1 blunt) | 5 |
| Dagger / short blade | Short Blade (+0 hit, +d6 sharp) | 5 |
| Sword / blade | Blade (+0 hit, +d8+1 sharp) | 10 |
| Long sword | Long Blade (+1 hit, +2d6 sharp) | 15 |
| Spear | Spear (+2 hit, +d8+1 sharp, 3" reach) | 15 |
| Axe | Axe (-2 hit, +2d6 sharp) | 10 |
| Battle axe | Big Axe (-1 hit, +2d8 sharp) | 15 |
| Javelin | Javelin (+1 hit, +d4 sharp, ranged) | 5 |
| Short bow | Short Bow (+1 hit, +d2-1 sharp) | 3 |
| Bow | Bow (+1 hit, +d3 sharp) | 8 |
| Heavy bow / longbow | Heavy Bow (+1 hit, +d6 sharp) | 13 |
| Crossbow | Heavy Bow analog | 13 |
| Pistol (slug-thrower) | Pistol (+0 hit, d10+1 sharp) | 5 |
| Rifle (slug-thrower) | Rifle (+1 hit, d6+d8 sharp) | 10 |
| Auto rifle | Auto Rifle (+0, d6+1 sharp, autofire x3) | 15 |
| Laser pistol | Blast Pistol (+0, d10+1 energy) | 10 |
| Laser rifle | Blast Rifle (+0, 2d8 energy) | 15 |

### 7.2 Wicker / improvised shields

Folded into Armor total. Wicker shield = +1 to Armor. Wooden shield = +2. Steel shield = +3. Optionally model as separate MP Shield ability if shield bash matters.

---

## 8. CP Policy

- **Creatures (NPCs):** GM-waived BC and Ability caps. Total CP recorded per creature for sanity check, but caps not enforced. Boss-tier creatures freely exceed standard caps.
- **Player Characters:** Standard caps enforced per MP rules.
- **Tier rough budget:** HD 1-3 → ~25-50 CP creature; HD 4-8 → ~75-100 CP; HD 9-12 → ~125-175 CP; HD 13+ → 200+ CP boss-tier.

CP totals in stat blocks are estimates; final pricing happens at MP Builder time.

---

## 9. Origin Type

Default to **Mutated or Evolved** for all converted GW creatures. Skip the d100 origin roll. Robotic Units (when those rules are added) get Science Project.

---

## 10. Mutation Map: Physical Mutations

| GW Mutation | MP Equivalent | CP | Notes |
|---|---|---|---|
| Attraction Odor (D) | Weakness: Distinctive (smell) | -5 | Carnivores attracted |
| Body Structure Change (D) | Weakness: Physical Disability | -5 to -15 | Variable per defect |
| Chameleon Powers | Invisibility (Camouflage modifier) | 7.5 | Visible-light only, blend with surroundings |
| Density Control (self) | Density Change A (Density Increase) + B as opt | 5-15 | Adjustable Density modifier (+5) for variable |
| Diminished Sense (D) | Weakness: Diminished Senses | -2.5 to -10 | Per sense affected |
| Double Physical Pain (D) | Weakness: Vulnerability (kinetic +2 dmg) | -5 | All damage doubled in GW; cap at +2/level in MP |
| Electrical Generation | Lightning Control B (Electrical Field) | 10-15 | 3d6 to-touch dmg = ~10 CP Field |
| Fat Cell Accumulation (D) | Weakness: Reduced Agility (Gawky) | -5 to -10 | Per severity |
| Gas Generation - Musk | Various, by sub-type | 7.5-20 | See sub-types below |
| - Obscuring gas | Darkness Control (Visible Light, gas form) | 5-10 | |
| - Irritating / blinding | Light Control B (Flash) + gas modifier | 5-10 | |
| - Paralysis | Paralysis Ray + Area Effect | 10-15 | |
| - Poison | Poison/Venom A (Damaging) + Area | 10-15 | |
| Heat Generation | Flame Abilities A (Flame Blast) | 10-12.5 | 4d6 GW = ~10 CP MP (2d6) with energy type |
| Heightened Balance | Knowledge: Acrobatics +6 + Heightened Agility flavor | 5-10 | No falls, walk wires |
| Heightened Constitution | Heightened Endurance + Adaptation (Poison + Radiation) | 10-15 | +2 HP/Con, 18 poison res, +3 rad res |
| Heightened Dexterity | Heightened Agility (~+8) | 8 | GW says AC raised to 4; built-in Phys Def |
| Heightened Hearing | Heightened Senses (Audible, +Acute, Tracking) | 10-12.5 | 60m range, no surprise |
| Heightened Precision | Weakness Detection (damage variant) | 10-15 | +2d6 dmg in GW |
| Heightened Smell | Heightened Senses (Odors, Full + Tracking) | 10-12.5 | 60m range, trail-following |
| Heightened Strength | Heightened Strength (~+10) | 10 | +3d6 GW dmg = ~+10 ST in MP |
| Heightened Taste | Heightened Senses (Flavors, Full) | 5-10 | Detect poisons by tasting |
| Heightened Touch | Heightened Senses (Shapes, Full) + Inventing bonus | 10 | Better artifact figuring |
| Heightened Vision | Heightened Senses (Visible Light, Telescopic, IR/UV) | 12.5-15 | 3km range, IR/UV |
| Hemophilia (D) | Weakness: Susceptibility (cuts +2 dmg) | -5 | Bleeds extra |
| Increased Metabolism (D) | Weakness: Special Requirement (food, frequent) | -7.5 | Constant feeding need |
| Increased Speed | Super Speed +1 turn | 10 | Double rate, 2 attacks |
| Infravision | Heightened Senses (Light, Infrared, Full) | 10 | Night vision |
| Light Generation | Light Control B (Flash) | 5-7.5 | -4 to-hit/AC for 1d4 turns |
| Multiple Body Parts | Physical Ability B (Extra Limbs) | 5-15 | +1 Mass each, multi-take |
| New Body Parts | Variable | 5-15 | Extra eyes → Heightened Senses; pincers → Natural Weaponry; trunk → Stretching A |
| No Resistance to Bacteria (D) | Weakness: Susceptibility (disease) | -5 to -7.5 | Per severity |
| No Resistance to Poison (D) | Weakness: Susceptibility (poison, severe) | -7.5 | One poison hit lethal |
| No Sensory Nerve Endings (D) | Weakness: Diminished Senses (Pain) + Inventing penalty | -5 to -10 | Can't feel attacks from behind |
| Oversized Body Parts | Variable Heightened-X | 5-10 | Per part: bigger eyes → Heightened Senses; bigger limbs → Heightened ST |
| Partial Carapace | Armor (kinetic-weighted) | 5-7.5 | AC 6 partial; ~3-5 Armor points kinetic |
| Photosynthetic Skin | Life Support + Healing modifier (sun-only) | 7.5-10 | Self-feed + 4x heal in sunlight |
| Physical Reflection | Reflection (one damage type) | 10-15 | Per type: 5 CP sub-type for Reflection Protection + Effect points |
| Poor Respiratory System (D) | Weakness: Reduced Endurance (Sickly) | -5 to -10 | Tires after 5 turns combat |
| Quills/Spines | Natural Weaponry (sharp) + thrown variant | 5-15 | d4 quill = 5 CP; d12 spine = 15 CP. Throwable: Special Missile Wpn |
| Radiated Eyes | Power Blast (Energy, radiation flavor) | 10-15 | 3d6 GW = ~10-12.5 CP MP |
| Regeneration | Regeneration | 0-2.5 | 1 HP per 5kg/day = 1/3hr to 1/hr by mass |
| Shapechange | Shape-Shifting (one category, no Abilities) | 10-15 | Mammal/insect/reptile pick; no powers |
| Shorter | Size Change: Smaller | 2.5-7.5 | Per height tier, see §4.2 |
| Skin Structure Change (D) | Weakness: Vulnerability or Susceptibility | -5 to -10 | Per defect type |
| Sonic Attack Ability | Sonic Abilities A (Sonic Blast) + Area | 10-15 | 3d6 area; ~10 CP base + Area |
| Symbiotic Attachment | Possession (touch, IN target only) — supplement; or Mind Control (touch, restricted) | 10-25 | Possession is cleaner when full host-control is the effect |
| Taller | Size Change: Larger | 2.5-15 | Per height tier, see §4.1 |
| Total Carapace | Armor (kinetic-weighted, full coverage) | 10-15 | AC 4 = ~9 Armor; -1/4 movement penalty |
| Ultravision | Heightened Senses (Light, Ultraviolet, Full) | 10 | UV + radiation + magic-energy detection |
| Vision Defect (D) | Weakness: Diminished Senses (vision) | -2.5 to -5 | Nearsighted, color-blind, etc. |
| Weight Decrease (D) | Weakness: Reduced Strength (Weak) | -5 to -10 | -1/4 strength and speed |
| Wings | Flight (Wings modifier, can't vacuum) | 5-10 | 12m/turn = MP Flight tier 5-7.5; Wings (-5) modifier |

---

## 11. Mutation Map: Mental Mutations

| GW Mutation | MP Equivalent | CP | Notes |
|---|---|---|---|
| Absorption | Adaptation (one damage sub-type) | 5-10 | Cold/heat/light/paralysis/radiation/mental |
| Anti-reflection (D) | Weakness: Low Self-Control: Anti-Reflection (formal, supplement) | -10 | 25% chance attack targets self or benefits target |
| Complete Mental Block (D) | Weakness: Phobia (specific category) | -10 to -15 | Robotic/Tech/Plant/Animal |
| Cryokinesis | Ice Abilities B (Ice Blast) | 12.5-15 | Up to 10d6 by concentration; high tier MP |
| Death Field Generation | Death Touch + Area Effect (large) | 30-40 | 20m radius, all to 1 HP; very expensive |
| De-evolution | Transmutation (Comprehensive/Complete) | 20-30 | Strip abilities one per turn; rare use |
| Density Control (others) | Gravity Control A (Decrease) or Transmutation | 15-25 | Range 30m on others |
| Directional Sense | Heightened Senses (Time/Direction sub) | 5 | Always knows position |
| Dual Brain | Heightened Intelligence + Heightened Defense (Mental) | 10-15 | +mental save x2, +artifact bonus |
| Empathy | Telepathy (visual, 5 CP) + Heightened Senses (Mood Reading, 5 CP) | 10 | Sense feelings, force on non-intel |
| Epilepsy (D) | Weakness: Personal Problem (Compulsion) or Physical Disability (Epileptic) | -10 to -15 | -15 for "Epileptic" specific |
| Fear Impulse (D) | Weakness: Phobia | -5 to -15 | Per frequency |
| Force Field Generation | Force Field A (Personal Force Field) | 15-17.5 | 5d6 absorb = ~22 protection points = 17.5 CP |
| Genius Capability | Heightened Intelligence + sub-type ability | 15-25 | Military: +Heightened Attack; Scientific: +Inventing; Economic: +Wealth |
| Heightened Brain Talent | Heightened Intelligence + Heightened Defense (Mental) | 10-15 | 1/3 artifact time, 2 mental saves |
| Heightened Intelligence | Heightened Intelligence (~+4) | 4 | +4 mental res, -2 artifact rolls |
| Hostility Field (D) | Weakness: Distinctive (Unattractive) | -5 to -10 | 20% chance attacks from int<16 |
| Illusion Generation | Illusions | 10-20 | 30m radius, all senses; ~15 CP for 9" diameter |
| Intuition | Heightened Initiative + Heightened Attack | 10-15 | +1 to-hit, +3 dmg/die when active |
| Life Leech | Siphon (Hits) + Area Effect | 12.5-17.5 | 6 HP/turn, 10m radius. Area Effect modifier needed |
| Light Wave Manipulation | Invisibility (Visible Light) + Light Control C (Glare for darkness) | 15-20 | Multi-effect; Invisibility 10 CP + Light Control darkness 5-10 |
| Magnetic Control | Magnetism A | 10-15 | 100m range; weight scales with CP |
| Mass Mind | Summoning (cooperative) or Companion-style | 20+ | No clean MP equivalent; flavor as cooperative power |
| Mental Blast | Mental Ability A (Mental Blast) | 17.5-20 | 3d6 GW = MP d4+d6 to 2d6 |
| Mental Control | Mind Control | 5-10 | Save modifier 0 to -2 |
| Mental Control over Physical State | Heightened Endurance + Healing (self) | 15-20 | Pain immunity, 4x heal, 2x stats burst |
| Mental Defenselessness (D) | Weakness: Reduced Cool (Inane) | -10 to -15 | MS becomes 3 |
| Mental Defense Shield | Heightened Defense (Mental only) + Heightened Senses (Mental Waves) | 10-15 | +4 mental res, sense psionics in 30m |
| Molecular Disruption | Disintegration A | 10-25 | Variable by mass; 50kg cap; rare use |
| Molecular Understanding | Weakness Detection | 5-10 | +1 die dmg, instant artifact A |
| Multiple Damage (D) | Weakness: Vulnerability (all kinetic +2 dmg) or Psychosis | -10 to -15 | All damage 2-3x; harsh |
| Planar Travel | Dimensional Travel A or B | 10-20 | Single = 10 CP, Multiple = 20 CP |
| Poor Dual Brain (D) | Weakness: Psychosis or Low Self-Control | -5 to -15 | Per frequency |
| Precognition | Heightened Senses (Vision, Precognitive) | 15-20 | 3 min future, costs HP if seeing harm |
| Pyrokinesis | Flame Abilities A (Flame Blast) + Area | 12.5-17.5 | Up to 10d6, 25m range |
| Radar/Sonar | Heightened Senses (Radar, Full) | 10-15 | 30m, 90m if also Heightened Hearing |
| Reflection | Reflection (one or more types) | 15-30 | High tier; 20d6 max reflection |
| Repulsion Field | Force Field A + Area Effect (15m offset) | 17.5-22.5 | Like FF but at distance; trap targets |
| Sound Imitation | Reflection (sonic, limited) + Translation flavor | 10-15 | Recreate heard sounds |
| Telekinesis | Telekinesis A (Kinetic Manipulation) | 7.5-12.5 | Lift = own carry; range AG"; matches GW |
| Telekinetic Arm | Stretching Abilities A (Elongation) + Telekinesis | 10-15 | 20m arm, ST 18 |
| Telekinetic Flight | Flight (variable speed) | 7.5-15 | 1-20 m/s = MP Flight tier 5-12.5 |
| Telepathy | Telepathy (visual + verbal, 10 CP) | 10-15 | 10m range, all beings; transcends language via visual |
| Teleportation | Teleportation | 10-20 | 30km range; specific rules TBD when shared |
| Thought Imitation | Reflection (mental) + Translation | 15-20 | Return mental attacks; mimic patterns |
| Time Field Manipulation | Dimensional Travel C (Time Travel) | 30 | Requires IN 18 + Heightened Intelligence |
| Total Healing | Healing (self only) | 7.5-12.5 | 4x/week, full heal each |
| Weather Manipulation | Weather Control A (Change) + B (Command) | 20-30 | 10km radius; multi-step changes |
| Will Force | Heightened Cool + Willpower C (Self-Control) | 10-15 | Doubles any ability for 1d10 turns |

---

## 12. Mutation Map: Plant/Vegetable Mutations

| GW Mutation | MP Equivalent | CP | Notes |
|---|---|---|---|
| Adaptation | Adaptation (acquired post-survival) | 5-10 | Per damage type immunity earned |
| Aromatic Powers | Emotion Control (Pheromones) + carnivorous lure | 7.5-12.5 | Lure to plant; 10km wind range |
| Attraction Odor (D) | Weakness: Distinctive | -5 | Herbivores attracted |
| Bacterial Symbiosis | Poison/Venom A (Bio, contact) | 5-10 | Disease on cut |
| Barbed Leaves | Natural Weaponry (sharp) + Grapnel (hold variant) | 7.5-12.5 | Saw-edged + hold |
| Berries (variable effects) | Various, by berry color (see GW table) | 5-15 | Heal, poison, antidote, rad res, etc. |
| Boring Tendrils | Natural Weaponry (sharp, armor-piercing) | 10-15 | Bores through wood/stone/steel |
| Carnivorous Jaws | Natural Weaponry (sharp, +Grapnel optional) | 7.5-15 | 1d8 per bite; up to 12 jaws |
| Color Sensitivity and Imitation | Shape-Shifting (limited, plant only) | 5-10 | Color-change for camouflage / machine ops |
| Contact Poison Sap | Poison/Venom A (contact, intensity 3-18) | 5-15 | Per intensity |
| Daylight Stasis (D) | Weakness: Special Requirement (no daylight) | -5 to -10 | Inactive in sunlight |
| Dissolving Juices | Acid (Bio damage) - custom Power Blast variant | 15-20 | 5d6/turn organic damage |
| Divisional Body Segments | Mobility (precondition) + Physical Ability flavor | 5-10 | Insect-like segments |
| Electrical Generation (plant) | Lightning Control A (Electrical Bolt, contact) | 10-15 | 4d6 max dmg |
| Explosive Fruit/Seeds | Power Blast or Special Weapon (thrown, area) | 10-15 | Plus Radiated as Energy variant |
| Heat Generation (plant) | Flame Abilities A (Flame Blast) | 10-12.5 | 4d6, 15m range |
| Increased Senses | New Senses Ability (basic variant) | 5-10 | Per sense added |
| Low Fertility (D) | (Population/encounter level only — no stat block effect) | 0 | Population modifier, not mechanic |
| Manipulation Vines | Stretching Abilities A (Elongation) + dexterity flavor | 5-10 | Wield weapons, no innate dmg |
| Mobility | Speed (low tier) | 0-5 | Walk/slither/crawl |
| New Plant Parts | Various, per part | 5-15 | Eyes/ears/arms/trunk/brain |
| New Senses | Heightened Senses (default sense set) | 20 | All 5 normal human senses |
| Parasitic Attachment | Possession (touch, IN target only) for control; Siphon (Hits) for feeding-only | 10-25 | Possession when controlling host (supplement); Siphon when just draining |
| Physical Reflection (plant) | Reflection (one damage type) | 10-15 | Per type, see physical mut. |
| Poison Throwing Thorns | Special Missile Weapon (sharp, ammo) + Poison/Venom A | 15-25 | 10m range; combined ability |
| Poison Vines | Poison/Venom A (contact) | 5-15 | Intensity 3-18 |
| Radiated Plant Fiber | Radiation aura (Power Blast Area Field) | 10-15 | 50m radius; Energy type |
| Razor-edged Leaves | Natural Weaponry (sharp, area) | 10-15 | Smaller, sharper, full plant |
| Saw-edged Leaves | Natural Weaponry (sharp, multi-attack) | 7.5-12.5 | 6-8 per branch, d4 each |
| Seed Mobility | Companion or Duplication (seed-form) | 10-20 | Telepathic link to parent optional |
| Size Decrease | Size Change: Smaller | 2.5-15 | Per tier |
| Size Increase | Size Change: Larger | 2.5-25 | Up to 20x base size |
| Sonic Attack Ability (plant) | Sonic Abilities A (Sonic Blast, area) | 10-15 | 3d6 in 10m radius |
| Squeeze Vines/Roots | Grapnel + Natural Weaponry (squeeze damage) | 15-20 | 2 dice/turn crush; long reach |
| Spore Cloud / Shooting Seeds | Carrier Attack (Poison/Venom or other) | 10-15 | Various delivery effects |
| Sucker Vines | Stretching Abilities A + Heightened Agility (limb only) | 7.5-12.5 | Manipulation vines with AG 18 |
| Tangle Vines | Snare attack (low tier) | 5-10 | Trip/entangle weak |
| Temperature Sensitivity (D) | Weakness: Vulnerability (Energy/Entropy +2 dmg) | -5 to -10 | Heat/cold/energy take +2/die |
| Texture Change | Armor (kinetic-weighted) | 5-15 | Hide → scales/plates |
| Thorns/Spines | Natural Weaponry (sharp, all-around) | 5-10 | Dagger dmg passive contact |
| Throwing Thorns | Special Missile Weapon (sharp, ammo) | 5-10 | 10m range, dagger dmg |
| Wings/Gas Bag | Flight (Gliding modifier) | 5-10 | Wind-driven travel |

---

## 13. Defects and Weaknesses

GW physical and mental defects map to MP weaknesses:

| GW Defect | MP Weakness | CP |
|---|---|---|
| Attraction Odor | Distinctive (smell) | -5 |
| Body Structure Change | Physical Disability (variable) | -5 to -15 |
| Diminished Sense | Diminished Senses | -2.5 to -10 |
| Double Physical Pain | Vulnerability (all kinetic +2) | -5 |
| Fat Cell Accumulation | Reduced Agility (Gawky -3 AG -2 ST) | -5 to -10 |
| Hemophilia | Susceptibility (cuts, bleed) | -5 |
| Increased Metabolism | Special Requirement (food, frequent) | -7.5 |
| No Resistance to Bacteria | Susceptibility (disease) | -5 to -7.5 |
| No Resistance to Poison | Susceptibility (poison, severe) | -7.5 |
| No Sensory Nerve Endings | Diminished Senses (Pain) | -5 |
| Poor Respiratory System | Reduced Endurance (Sickly) | -5 to -10 |
| Skin Structure Change | Vulnerability or Susceptibility | -5 to -10 |
| Vision Defect | Diminished Senses (vision) | -2.5 to -5 |
| Weight Decrease | Reduced Strength (Weak) | -5 to -10 |
| Anti-reflection | Low Self-Control: Anti-Reflection (supplement) | -10 |
| Complete Mental Block | Phobia (specific category) | -10 to -15 |
| Epilepsy | Physical Disability (Epileptic) | -15 |
| Fear Impulse | Phobia | -5 to -15 |
| Hostility Field | Distinctive (Unattractive) | -5 to -10 |
| Mental Defenselessness | Reduced Cool (Inane, severe) | -10 to -15 |
| Multiple Damage | Vulnerability (kinetic +2-4) or Psychosis | -10 to -15 |
| Poor Dual Brain | Psychosis or Low Self-Control | -5 to -15 |
| Daylight Stasis (plant) | Special Requirement (no daylight) | -5 to -10 |
| Low Fertility (plant) | (Population only — no CP) | 0 |
| Temperature Sensitivity (plant) | Vulnerability (Energy/Entropy +2) | -5 to -10 |

---

## 14. Conversion Algorithm

For a GW1e creature:

1. **Determine type:** PSH, Humanoid, Mutated Animal, Mutated Plant. Pick based on **behavior**, not strict GW typology — anthropomorphic intelligent species use Humanoid build even if GW types them as Mutated Animal.

2. **Map BCs:**
   - PS → ST (1:1)
   - Con / HD → EN (1:1)
   - Dex → AG (1:1)
   - IN → IN (1:1)
   - MS → CL (willpower framing)
   - Cha → CL (Influence; if both Cha and MS stated, take higher)
   - Unstated BCs default to 10, adjust from description.

3. **Apply Size Change** if non-human-sized. Modify ST/EN per table; record CP cost; note Profile.

4. **Apply A/P Ability** if Mutated Animal/Plant in behavior. Pick type from §5.2; pick abilities matching GW description; pick 2 weaknesses. Net A/P CP = 10 (Low) / 20 (Standard) / 30 (High).

5. **Map AC** via §3.1 (worn) and §3.2 (source-split). Distribute MP Armor across damage types per §6.

6. **Map mutations** via tables in §10-12. Add CP per mutation.

7. **Map equipment** via §7.1.

8. **Map defects/weaknesses** via §13.

9. **Compute derived stats** from final BCs:
   - Hits = sum of ST/EN/AG/CL contributions from BC table
   - Power = ST + EN + AG + IN
   - Move = (ST + EN + AG) / 3, rounded
   - Saves: per BC table row (EN save, AG save, IN save, CL save)
   - Phys Def = AG save - 10
   - Mental Def = IN save - 10
   - Init = CL row's Initiative die
   - HTH = ST row's Base HTH Damage die
   - Inventing Points = IN / 2, rounded up
   - Mass = creature weight / 2, find Carrying Capacity match in BC table, take HTH die

10. **Tally CP estimate.** Note that creatures get GM-waived caps; standard caps don't apply.

11. **Origin Type** = Mutated or Evolved by default.

---

## 15. Worked Examples

### 15.1 ARK — Mutated Mammal (humanoid form)

```
GW source:
  AC 4, HD 8, MV 15, MS 10, Rad Res 10
  3m intelligent dog-man
  Mutations: Telekinesis, Weather Manipulation, Life Leech
  Phobia: large winged creatures
  Equipment: wicker shield, large club

Build type: Humanoid (anthropomorphic intelligent — no A/P)

Base BCs:    ST 11  EN 8  AG 12  IN 13  CL 10
Size mod:    +5 ST, +4 EN  (Size Change Larger 7.5 CP, 9' tier)
Effective:   ST 16  EN 12  AG 12  IN 13  CL 10

Derived:
  Hits        11     (ST 5 + EN 3 + AG 2 + CL 1)
  Power       53
  Move        13
  Saves       EN 11- / AG 11- / IN 11- / CL 10-
  Phys Def    1
  Mental Def  1
  Init        d4
  HTH         d6+1   (kinetic, blunt)
  Inventing   7
  Mass        d6+1   (~700 lbs)
  Profile     x1.5

Abilities:
  Size Change: Larger 7.5 CP (9' tier)
  Telekinesis A (Kinetic Manipulation) 7.5 CP (300 lbs / d6+1, range 12")
  Weather Control A (Change Weather) ~15 CP + B (Command) ~10 CP = 25 CP
  Siphon (Hits, Area Effect) 12.5 CP (d6 Hits, 5" diameter)
  Armor 6 = 2/1/1/2 K/E/B/Ent (10 CP) — partial radiation lean: 1/3/1/1
  Adaptation (Radiation, optional) 5 CP

Weaknesses:
  Phobia (large winged creatures) -5 CP

Equipment:
  Large Club  (+2 hit, +d6+1 blunt, 15 CP)
  Wicker shield (folded into Armor)

CP estimate:  ~85   (BC raises 6 + Size 7.5 + TK 7.5 + Weather 25 +
                    Siphon 12.5 + Armor 10 + Adaptation 5 + Club 15 +
                    Phobia -5)
Origin:       Mutated or Evolved

Notes:
  - "Considers human hands a delicacy" — flavor only
  - GW MS 10 stated explicitly; CL 10 baseline
```

### 15.2 ARN — Mutated Insect (animal form)

```
GW source:
  AC 9, HD 8, MV 3/16 (ground/fly)
  1.3m mutated flying insect, beast of burden
  Bite 2d6, carries ≤2kg in flight

Build type: A/P Insect (animal-tier, no language/tools)
Tier: Low power level

Base BCs:    ST 8  EN 8  AG 14  IN 4  CL 6
Size mod:    -1 ST  (Size Change Smaller 2.5 CP, 4.5' tier)
Effective:   ST 7  EN 8  AG 14  IN 4  CL 6

Derived:
  Hits        2      (ST 0 + EN -1 + AG 2 + CL 1)
  Power       33
  Move        10 ground (override flavor: ~3; Flight is real locomotion)
  Saves       EN 9- / AG 11- / IN 8- / CL 9-
  Phys Def    1
  Mental Def  -2     (effectively 0)
  Init        d3
  HTH         d3
  Inventing   2
  Mass        d2     (~40 lbs)
  Profile     /1.5

Abilities:
  A/P Insect (Low: 2 abilities + 2 weaknesses, net 10 CP)
    - Flight (10 CP from bundle, ~5 CP equivalent base — 16m/turn)
    - Natural Weaponry — mandibles (10 CP from bundle, +4 hit, +6 sharp)
  Size Change: Smaller 2.5 CP (4.5' tier)
  Armor 2 = 1/0/0/1 K/E/B/Ent (2.5 CP, chitin)

Weaknesses (in A/P bundle):
  Lowered Intelligence -5 CP
  Distinctive (giant insect) -5 CP

CP estimate:  ~15   (A/P 10 + Size 2.5 + Armor 2.5)
Origin:       Mutated or Evolved

Notes:
  - 2d6 GW bite ≈ d3 base + d8+1 sharp from Natural Weaponry, avg ~7-8
  - Flight cargo limit ≤2kg folded into Flight description
  - Movement formula gives 10 ground; GW says 3. Flight handles real movement.
```

### 15.3 BADDER — Mutated Mammal (humanoid form)

```
GW source:
  AC 4, HD 6, MV 12, Dex 18, MS 16
  1.5m intelligent mutated badger, medieval society
  Mutation: Empathy
  Hard of hearing, keen sense of smell
  Bite 1d6, simple armor/shields/weapons (10% artifact)

Build type: Humanoid (intelligent, tools, language — no A/P)

Base BCs:    ST 12  EN 6  AG 18  IN 13  CL 16
                    (1.5m → "Short" descriptor, free, no Size Change CP)

Effective: same as base

Derived:
  Hits        9      (ST 3 + EN -1 + AG 5 + CL 2)
  Power       49
  Move        12
  Saves       EN 9- / AG 12- / IN 11- / CL 11-
  Phys Def    2
  Mental Def  1
  Init        d6+1
  HTH         d6     (covers bite damage; no separate Natural Weaponry)
  Inventing   7
  Mass        d4     (~100 lbs)

Abilities:
  Heightened Agility (~+8 to AG) 8 CP   (Dex 18 → AG 18)
  Heightened Cool (~+6 to CL) 6 CP      (MS 16 → CL 16)
  Heightened Intelligence (~+3 to IN) 3 CP
  Heightened Senses — Odors Full + Acute (10 CP)  (keen smell)
  Telepathy (visual + verbal, Mood Reading) 10 CP  (Empathy mutation)
  Armor 3 = 1/1/0/1 K/E/B/Ent (5 CP, cured hide)

Weaknesses:
  Diminished Senses — hearing (-5 CP, hard of hearing)

Equipment:
  Spear  (+2 hit, +d8+1 sharp, 3" reach, 15 CP)
  Wooden shield  (folded into Armor)
  [10% chance: 1 random artifact weapon]

CP estimate:  ~57   (Heightened ABCs 17 + Senses 10 + Telepathy 10 +
                    Armor 5 + Spear 15 + Diminished Senses -5)
Origin:       Mutated or Evolved

Notes:
  - "Evil disposition" — flavor only
  - Burrow notes (50% females, 50% young, leader + 1d4 nobles) =
    encounter-table data, not stat-block
  - Bite 1d6 = base HTH from ST 12; no Natural Weaponry needed
```

---

## 16. Open Questions and Known Gaps

1. **Robotic Units conversion** — separate doc/section needed. GW robots have very different design (kph movement, programmed behavior, specialized weapons). Add when relevant to a campaign.

2. **Teleportation mutation** — MP Teleportation ability rules not yet on hand; estimated 10-20 CP in mutation map. Verify when shared.

3. **Mass Mind** — no clean MP equivalent. Leaving as "narrative cooperative power" rather than CP-costed ability. Revisit if a creature really needs it.

4. **CP estimates throughout are rough.** Actual MP Builder pricing will differ on case-by-case basis. Treat tables as starting points, not authoritative final values.

5. **Damage scale calibration.** GW damage dice are larger absolute numbers than MP equivalents (3d6 GW Mental Blast → ~MP d4+d6). Calibrate to "average human GW HP / MP Hits ratio" not direct dice. Playtest will tune.

6. **"Big & Tall" vs Size Change Larger threshold** — under 10 CP tier (10 ft), descriptor at 0 CP is allowed without ST/EN bonus. Profile changes regardless. Choose based on whether the creature's strength flavor calls for the bump.

7. **A/P bundling overshoot.** When A/P picks Heightened-X at fixed +10, it can overshoot the GW stat. Mitigation rules in §5.5: lower base BC or skip Heightened-X via A/P. Document per-creature decisions.

8. **Reaction tables → Influence Tasks** — GW reaction-table outcomes (Hostile/Uncertain/Friendly/etc.) translate to MP CL-based opposed task checks per 3.1.1. Reaction modifiers from GW (offers, charisma, type cross-modifiers) become difficulty modifiers on the Influence task.

9. **Mutation severity scaling.** Many GW mutations have variable intensity (poison intensity, radiation rank, etc.). MP CP costs in tables are approximate midpoints. Adjust by ±2.5-5 CP per intensity step.

10. **Future bestiary work** — pre-stat encounter-table creatures from `gw-encounter-data.js` (~60 unique entries) into MP Builder Creature mode (when that exists) using this doc as reference. Estimated 30-50 hours pre-pass for full coverage.

---

*End of v1.0. Revisions tracked in commit log. Next pass: populate any gaps surfaced during actual creature conversion, refine CP estimates from playtest.*
