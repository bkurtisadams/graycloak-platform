// gw-character-data.js v0.1.0 — Gamma World 1e to Mighty Protectors starter data
(function(){
  window.GWMPCharacterData = {
  "version": "0.1.0",
  "source": "DESIGN-gw-mp-conversion.md v1.2",
  "mutations": [
    {
      "id": "attraction-odor-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Attraction Odor (D)",
      "mp": "Weakness: Distinctive (smell)",
      "cp": "-5",
      "notes": "Carnivores attracted"
    },
    {
      "id": "body-structure-change-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Body Structure Change (D)",
      "mp": "Weakness: Physical Disability",
      "cp": "-5 to -15",
      "notes": "Variable per defect"
    },
    {
      "id": "chameleon-powers-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Chameleon Powers",
      "mp": "Invisibility (Camouflage modifier)",
      "cp": "7.5",
      "notes": "Visible-light only, blend with surroundings"
    },
    {
      "id": "density-control-self-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Density Control (self)",
      "mp": "Density Change A (Density Increase) + B as opt",
      "cp": "5-15",
      "notes": "Adjustable Density modifier (+5) for variable"
    },
    {
      "id": "diminished-sense-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Diminished Sense (D)",
      "mp": "Weakness: Diminished Senses",
      "cp": "-2.5 to -10",
      "notes": "Per sense affected"
    },
    {
      "id": "double-physical-pain-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Double Physical Pain (D)",
      "mp": "Weakness: Vulnerability (kinetic +2 dmg)",
      "cp": "-5",
      "notes": "All damage doubled in GW; cap at +2/level in MP"
    },
    {
      "id": "electrical-generation-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Electrical Generation",
      "mp": "Lightning Control B (Electrical Field)",
      "cp": "10-15",
      "notes": "3d6 to-touch dmg = ~10 CP Field"
    },
    {
      "id": "fat-cell-accumulation-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Fat Cell Accumulation (D)",
      "mp": "Weakness: Reduced Agility (Gawky)",
      "cp": "-5 to -10",
      "notes": "Per severity"
    },
    {
      "id": "gas-generation-musk-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Gas Generation - Musk",
      "mp": "Various, by sub-type",
      "cp": "7.5-20",
      "notes": "See sub-types below"
    },
    {
      "id": "obscuring-gas-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "- Obscuring gas",
      "mp": "Darkness Control (Visible Light, gas form)",
      "cp": "5-10",
      "notes": ""
    },
    {
      "id": "irritating-blinding-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "- Irritating / blinding",
      "mp": "Light Control B (Flash) + gas modifier",
      "cp": "5-10",
      "notes": ""
    },
    {
      "id": "paralysis-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "- Paralysis",
      "mp": "Paralysis Ray + Area Effect",
      "cp": "10-15",
      "notes": ""
    },
    {
      "id": "poison-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "- Poison",
      "mp": "Poison/Venom A (Damaging) + Area",
      "cp": "10-15",
      "notes": ""
    },
    {
      "id": "heat-generation-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heat Generation",
      "mp": "Flame Abilities A (Flame Blast)",
      "cp": "10-12.5",
      "notes": "4d6 GW = ~10 CP MP (2d6) with energy type"
    },
    {
      "id": "heightened-balance-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Balance",
      "mp": "Knowledge: Acrobatics +6 + Heightened Agility flavor",
      "cp": "5-10",
      "notes": "No falls, walk wires"
    },
    {
      "id": "heightened-constitution-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Constitution",
      "mp": "Heightened Endurance + Adaptation (Poison + Radiation)",
      "cp": "10-15",
      "notes": "+2 HP/Con, 18 poison res, +3 rad res"
    },
    {
      "id": "heightened-dexterity-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Dexterity",
      "mp": "Heightened Agility (~+8)",
      "cp": "8",
      "notes": "GW says AC raised to 4; built-in Phys Def"
    },
    {
      "id": "heightened-hearing-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Hearing",
      "mp": "Heightened Senses (Audible, +Acute, Tracking)",
      "cp": "10-12.5",
      "notes": "60m range, no surprise"
    },
    {
      "id": "heightened-precision-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Precision",
      "mp": "Weakness Detection (damage variant)",
      "cp": "10-15",
      "notes": "+2d6 dmg in GW"
    },
    {
      "id": "heightened-smell-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Smell",
      "mp": "Heightened Senses (Odors, Full + Tracking)",
      "cp": "10-12.5",
      "notes": "60m range, trail-following"
    },
    {
      "id": "heightened-strength-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Strength",
      "mp": "Heightened Strength (~+10)",
      "cp": "10",
      "notes": "+3d6 GW dmg = ~+10 ST in MP"
    },
    {
      "id": "heightened-taste-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Taste",
      "mp": "Heightened Senses (Flavors, Full)",
      "cp": "5-10",
      "notes": "Detect poisons by tasting"
    },
    {
      "id": "heightened-touch-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Touch",
      "mp": "Heightened Senses (Shapes, Full) + Inventing bonus",
      "cp": "10",
      "notes": "Better artifact figuring"
    },
    {
      "id": "heightened-vision-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Heightened Vision",
      "mp": "Heightened Senses (Visible Light, Telescopic, IR/UV)",
      "cp": "12.5-15",
      "notes": "3km range, IR/UV"
    },
    {
      "id": "hemophilia-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Hemophilia (D)",
      "mp": "Weakness: Susceptibility (cuts +2 dmg)",
      "cp": "-5",
      "notes": "Bleeds extra"
    },
    {
      "id": "increased-metabolism-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Increased Metabolism (D)",
      "mp": "Weakness: Special Requirement (food, frequent)",
      "cp": "-7.5",
      "notes": "Constant feeding need"
    },
    {
      "id": "increased-speed-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Increased Speed",
      "mp": "Super Speed +1 turn",
      "cp": "10",
      "notes": "Double rate, 2 attacks"
    },
    {
      "id": "infravision-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Infravision",
      "mp": "Heightened Senses (Light, Infrared, Full)",
      "cp": "10",
      "notes": "Night vision"
    },
    {
      "id": "light-generation-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Light Generation",
      "mp": "Light Control B (Flash)",
      "cp": "5-7.5",
      "notes": "-4 to-hit/AC for 1d4 turns"
    },
    {
      "id": "multiple-body-parts-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Multiple Body Parts",
      "mp": "Physical Ability B (Extra Limbs)",
      "cp": "5-15",
      "notes": "+1 Mass each, multi-take"
    },
    {
      "id": "new-body-parts-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "New Body Parts",
      "mp": "Variable",
      "cp": "5-15",
      "notes": "Extra eyes → Heightened Senses; pincers → Natural Weaponry; trunk → Stretching A"
    },
    {
      "id": "no-resistance-to-bacteria-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "No Resistance to Bacteria (D)",
      "mp": "Weakness: Susceptibility (disease)",
      "cp": "-5 to -7.5",
      "notes": "Per severity"
    },
    {
      "id": "no-resistance-to-poison-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "No Resistance to Poison (D)",
      "mp": "Weakness: Susceptibility (poison, severe)",
      "cp": "-7.5",
      "notes": "One poison hit lethal"
    },
    {
      "id": "no-sensory-nerve-endings-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "No Sensory Nerve Endings (D)",
      "mp": "Weakness: Diminished Senses (Pain) + Inventing penalty",
      "cp": "-5 to -10",
      "notes": "Can't feel attacks from behind"
    },
    {
      "id": "oversized-body-parts-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Oversized Body Parts",
      "mp": "Variable Heightened-X",
      "cp": "5-10",
      "notes": "Per part: bigger eyes → Heightened Senses; bigger limbs → Heightened ST"
    },
    {
      "id": "partial-carapace-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Partial Carapace",
      "mp": "Armor (kinetic-weighted)",
      "cp": "5-7.5",
      "notes": "AC 6 partial; ~3-5 Armor points kinetic"
    },
    {
      "id": "photosynthetic-skin-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Photosynthetic Skin",
      "mp": "Life Support + Healing modifier (sun-only)",
      "cp": "7.5-10",
      "notes": "Self-feed + 4x heal in sunlight"
    },
    {
      "id": "physical-reflection-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Physical Reflection",
      "mp": "Reflection (one damage type)",
      "cp": "10-15",
      "notes": "Per type: 5 CP sub-type for Reflection Protection + Effect points"
    },
    {
      "id": "poor-respiratory-system-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Poor Respiratory System (D)",
      "mp": "Weakness: Reduced Endurance (Sickly)",
      "cp": "-5 to -10",
      "notes": "Tires after 5 turns combat"
    },
    {
      "id": "quills-spines-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Quills/Spines",
      "mp": "Natural Weaponry (sharp) + thrown variant",
      "cp": "5-15",
      "notes": "d4 quill = 5 CP; d12 spine = 15 CP. Throwable: Special Missile Wpn"
    },
    {
      "id": "radiated-eyes-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Radiated Eyes",
      "mp": "Power Blast (Energy, radiation flavor)",
      "cp": "10-15",
      "notes": "3d6 GW = ~10-12.5 CP MP"
    },
    {
      "id": "regeneration-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Regeneration",
      "mp": "Regeneration",
      "cp": "0-2.5",
      "notes": "1 HP per 5kg/day = 1/3hr to 1/hr by mass"
    },
    {
      "id": "shapechange-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Shapechange",
      "mp": "Shape-Shifting (one category, no Abilities)",
      "cp": "10-15",
      "notes": "Mammal/insect/reptile pick; no powers"
    },
    {
      "id": "shorter-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Shorter",
      "mp": "Size Change: Smaller",
      "cp": "2.5-7.5",
      "notes": "Per height tier, see §4.2"
    },
    {
      "id": "skin-structure-change-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Skin Structure Change (D)",
      "mp": "Weakness: Vulnerability or Susceptibility",
      "cp": "-5 to -10",
      "notes": "Per defect type"
    },
    {
      "id": "sonic-attack-ability-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Sonic Attack Ability",
      "mp": "Sonic Abilities A (Sonic Blast) + Area",
      "cp": "10-15",
      "notes": "3d6 area; ~10 CP base + Area"
    },
    {
      "id": "symbiotic-attachment-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Symbiotic Attachment",
      "mp": "Possession (touch, IN target only) — supplement; or Mind Control (touch, restricted)",
      "cp": "10-25",
      "notes": "Possession is cleaner when full host-control is the effect"
    },
    {
      "id": "taller-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Taller",
      "mp": "Size Change: Larger",
      "cp": "2.5-15",
      "notes": "Per height tier, see §4.1"
    },
    {
      "id": "total-carapace-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Total Carapace",
      "mp": "Armor (kinetic-weighted, full coverage)",
      "cp": "10-15",
      "notes": "AC 4 = ~9 Armor; -1/4 movement penalty"
    },
    {
      "id": "ultravision-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Ultravision",
      "mp": "Heightened Senses (Light, Ultraviolet, Full)",
      "cp": "10",
      "notes": "UV + radiation + magic-energy detection"
    },
    {
      "id": "vision-defect-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Vision Defect (D)",
      "mp": "Weakness: Diminished Senses (vision)",
      "cp": "-2.5 to -5",
      "notes": "Nearsighted, color-blind, etc."
    },
    {
      "id": "weight-decrease-d-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Weight Decrease (D)",
      "mp": "Weakness: Reduced Strength (Weak)",
      "cp": "-5 to -10",
      "notes": "-1/4 strength and speed"
    },
    {
      "id": "wings-physical",
      "category": "physical",
      "categoryLabel": "Physical Mutations",
      "name": "Wings",
      "mp": "Flight (Wings modifier, can't vacuum)",
      "cp": "5-10",
      "notes": "12m/turn = MP Flight tier 5-7.5; Wings (-5) modifier"
    },
    {
      "id": "absorption-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Absorption",
      "mp": "Adaptation (one damage sub-type)",
      "cp": "5-10",
      "notes": "Cold/heat/light/paralysis/radiation/mental"
    },
    {
      "id": "anti-reflection-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Anti-reflection (D)",
      "mp": "Weakness: Low Self-Control: Anti-Reflection (formal, supplement)",
      "cp": "-10",
      "notes": "25% chance attack targets self or benefits target"
    },
    {
      "id": "complete-mental-block-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Complete Mental Block (D)",
      "mp": "Weakness: Phobia (specific category)",
      "cp": "-10 to -15",
      "notes": "Robotic/Tech/Plant/Animal"
    },
    {
      "id": "cryokinesis-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Cryokinesis",
      "mp": "Ice Abilities B (Ice Blast)",
      "cp": "12.5-15",
      "notes": "Up to 10d6 by concentration; high tier MP"
    },
    {
      "id": "death-field-generation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Death Field Generation",
      "mp": "Death Touch + Area Effect (large)",
      "cp": "30-40",
      "notes": "20m radius, all to 1 HP; very expensive"
    },
    {
      "id": "de-evolution-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "De-evolution",
      "mp": "Transmutation (Comprehensive/Complete)",
      "cp": "20-30",
      "notes": "Strip abilities one per turn; rare use"
    },
    {
      "id": "density-control-others-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Density Control (others)",
      "mp": "Gravity Control A (Decrease) or Transmutation",
      "cp": "15-25",
      "notes": "Range 30m on others"
    },
    {
      "id": "directional-sense-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Directional Sense",
      "mp": "Heightened Senses (Time/Direction sub)",
      "cp": "5",
      "notes": "Always knows position"
    },
    {
      "id": "dual-brain-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Dual Brain",
      "mp": "Heightened Intelligence + Heightened Defense (Mental)",
      "cp": "10-15",
      "notes": "+mental save x2, +artifact bonus"
    },
    {
      "id": "empathy-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Empathy",
      "mp": "Telepathy (visual, 5 CP) + Heightened Senses (Mood Reading, 5 CP)",
      "cp": "10",
      "notes": "Sense feelings, force on non-intel"
    },
    {
      "id": "epilepsy-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Epilepsy (D)",
      "mp": "Weakness: Personal Problem (Compulsion) or Physical Disability (Epileptic)",
      "cp": "-10 to -15",
      "notes": "-15 for \"Epileptic\" specific"
    },
    {
      "id": "fear-impulse-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Fear Impulse (D)",
      "mp": "Weakness: Phobia",
      "cp": "-5 to -15",
      "notes": "Per frequency"
    },
    {
      "id": "force-field-generation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Force Field Generation",
      "mp": "Force Field A (Personal Force Field)",
      "cp": "15-17.5",
      "notes": "5d6 absorb = ~22 protection points = 17.5 CP"
    },
    {
      "id": "genius-capability-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Genius Capability",
      "mp": "Heightened Intelligence + sub-type ability",
      "cp": "15-25",
      "notes": "Military: +Heightened Attack; Scientific: +Inventing; Economic: +Wealth"
    },
    {
      "id": "heightened-brain-talent-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Heightened Brain Talent",
      "mp": "Heightened Intelligence + Heightened Defense (Mental)",
      "cp": "10-15",
      "notes": "1/3 artifact time, 2 mental saves"
    },
    {
      "id": "heightened-intelligence-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Heightened Intelligence",
      "mp": "Heightened Intelligence (~+4)",
      "cp": "4",
      "notes": "+4 mental res, -2 artifact rolls"
    },
    {
      "id": "hostility-field-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Hostility Field (D)",
      "mp": "Weakness: Distinctive (Unattractive)",
      "cp": "-5 to -10",
      "notes": "20% chance attacks from int<16"
    },
    {
      "id": "illusion-generation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Illusion Generation",
      "mp": "Illusions",
      "cp": "10-20",
      "notes": "30m radius, all senses; ~15 CP for 9\" diameter"
    },
    {
      "id": "intuition-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Intuition",
      "mp": "Heightened Initiative + Heightened Attack",
      "cp": "10-15",
      "notes": "+1 to-hit, +3 dmg/die when active"
    },
    {
      "id": "life-leech-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Life Leech",
      "mp": "Siphon (Hits) + Area Effect",
      "cp": "12.5-17.5",
      "notes": "6 HP/turn, 10m radius. Area Effect modifier needed"
    },
    {
      "id": "light-wave-manipulation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Light Wave Manipulation",
      "mp": "Invisibility (Visible Light) + Light Control C (Glare for darkness)",
      "cp": "15-20",
      "notes": "Multi-effect; Invisibility 10 CP + Light Control darkness 5-10"
    },
    {
      "id": "magnetic-control-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Magnetic Control",
      "mp": "Magnetism A",
      "cp": "10-15",
      "notes": "100m range; weight scales with CP"
    },
    {
      "id": "mass-mind-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Mass Mind",
      "mp": "Summoning (cooperative) or Companion-style",
      "cp": "20+",
      "notes": "No clean MP equivalent; flavor as cooperative power"
    },
    {
      "id": "mental-blast-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Mental Blast",
      "mp": "Mental Ability A (Mental Blast)",
      "cp": "17.5-20",
      "notes": "3d6 GW = MP d4+d6 to 2d6"
    },
    {
      "id": "mental-control-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Mental Control",
      "mp": "Mind Control",
      "cp": "5-10",
      "notes": "Save modifier 0 to -2"
    },
    {
      "id": "mental-control-over-physical-state-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Mental Control over Physical State",
      "mp": "Heightened Endurance + Healing (self)",
      "cp": "15-20",
      "notes": "Pain immunity, 4x heal, 2x stats burst"
    },
    {
      "id": "mental-defenselessness-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Mental Defenselessness (D)",
      "mp": "Weakness: Reduced Cool (Inane)",
      "cp": "-10 to -15",
      "notes": "MS becomes 3"
    },
    {
      "id": "mental-defense-shield-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Mental Defense Shield",
      "mp": "Heightened Defense (Mental only) + Heightened Senses (Mental Waves)",
      "cp": "10-15",
      "notes": "+4 mental res, sense psionics in 30m"
    },
    {
      "id": "molecular-disruption-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Molecular Disruption",
      "mp": "Disintegration A",
      "cp": "10-25",
      "notes": "Variable by mass; 50kg cap; rare use"
    },
    {
      "id": "molecular-understanding-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Molecular Understanding",
      "mp": "Weakness Detection",
      "cp": "5-10",
      "notes": "+1 die dmg, instant artifact A"
    },
    {
      "id": "multiple-damage-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Multiple Damage (D)",
      "mp": "Weakness: Vulnerability (all kinetic +2 dmg) or Psychosis",
      "cp": "-10 to -15",
      "notes": "All damage 2-3x; harsh"
    },
    {
      "id": "planar-travel-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Planar Travel",
      "mp": "Dimensional Travel A or B",
      "cp": "10-20",
      "notes": "Single = 10 CP, Multiple = 20 CP"
    },
    {
      "id": "poor-dual-brain-d-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Poor Dual Brain (D)",
      "mp": "Weakness: Psychosis or Low Self-Control",
      "cp": "-5 to -15",
      "notes": "Per frequency"
    },
    {
      "id": "precognition-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Precognition",
      "mp": "Heightened Senses (Vision, Precognitive)",
      "cp": "15-20",
      "notes": "3 min future, costs HP if seeing harm"
    },
    {
      "id": "pyrokinesis-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Pyrokinesis",
      "mp": "Flame Abilities A (Flame Blast) + Area",
      "cp": "12.5-17.5",
      "notes": "Up to 10d6, 25m range"
    },
    {
      "id": "radar-sonar-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Radar/Sonar",
      "mp": "Heightened Senses (Radar, Full)",
      "cp": "10-15",
      "notes": "30m, 90m if also Heightened Hearing"
    },
    {
      "id": "reflection-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Reflection",
      "mp": "Reflection (one or more types)",
      "cp": "15-30",
      "notes": "High tier; 20d6 max reflection"
    },
    {
      "id": "repulsion-field-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Repulsion Field",
      "mp": "Force Field A + Area Effect (15m offset)",
      "cp": "17.5-22.5",
      "notes": "Like FF but at distance; trap targets"
    },
    {
      "id": "sound-imitation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Sound Imitation",
      "mp": "Reflection (sonic, limited) + Translation flavor",
      "cp": "10-15",
      "notes": "Recreate heard sounds"
    },
    {
      "id": "telekinesis-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Telekinesis",
      "mp": "Telekinesis A (Kinetic Manipulation)",
      "cp": "7.5-12.5",
      "notes": "Lift = own carry; range AG\"; matches GW"
    },
    {
      "id": "telekinetic-arm-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Telekinetic Arm",
      "mp": "Stretching Abilities A (Elongation) + Telekinesis",
      "cp": "10-15",
      "notes": "20m arm, ST 18"
    },
    {
      "id": "telekinetic-flight-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Telekinetic Flight",
      "mp": "Flight (variable speed)",
      "cp": "7.5-15",
      "notes": "1-20 m/s = MP Flight tier 5-12.5"
    },
    {
      "id": "telepathy-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Telepathy",
      "mp": "Telepathy (visual + verbal, 10 CP)",
      "cp": "10-15",
      "notes": "10m range, all beings; transcends language via visual"
    },
    {
      "id": "teleportation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Teleportation",
      "mp": "Teleportation",
      "cp": "10-20",
      "notes": "30km range; specific rules TBD when shared"
    },
    {
      "id": "thought-imitation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Thought Imitation",
      "mp": "Reflection (mental) + Translation",
      "cp": "15-20",
      "notes": "Return mental attacks; mimic patterns"
    },
    {
      "id": "time-field-manipulation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Time Field Manipulation",
      "mp": "Dimensional Travel C (Time Travel)",
      "cp": "30",
      "notes": "Requires IN 18 + Heightened Intelligence"
    },
    {
      "id": "total-healing-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Total Healing",
      "mp": "Healing (self only)",
      "cp": "7.5-12.5",
      "notes": "4x/week, full heal each"
    },
    {
      "id": "weather-manipulation-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Weather Manipulation",
      "mp": "Weather Control A (Change) + B (Command)",
      "cp": "20-30",
      "notes": "10km radius; multi-step changes"
    },
    {
      "id": "will-force-mental",
      "category": "mental",
      "categoryLabel": "Mental Mutations",
      "name": "Will Force",
      "mp": "Heightened Cool + Willpower C (Self-Control)",
      "cp": "10-15",
      "notes": "Doubles any ability for 1d10 turns"
    },
    {
      "id": "adaptation-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Adaptation",
      "mp": "Adaptation (acquired post-survival)",
      "cp": "5-10",
      "notes": "Per damage type immunity earned"
    },
    {
      "id": "aromatic-powers-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Aromatic Powers",
      "mp": "Emotion Control (Pheromones) + carnivorous lure",
      "cp": "7.5-12.5",
      "notes": "Lure to plant; 10km wind range"
    },
    {
      "id": "attraction-odor-d-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Attraction Odor (D)",
      "mp": "Weakness: Distinctive",
      "cp": "-5",
      "notes": "Herbivores attracted"
    },
    {
      "id": "bacterial-symbiosis-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Bacterial Symbiosis",
      "mp": "Poison/Venom A (Bio, contact)",
      "cp": "5-10",
      "notes": "Disease on cut"
    },
    {
      "id": "barbed-leaves-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Barbed Leaves",
      "mp": "Natural Weaponry (sharp) + Grapnel (hold variant)",
      "cp": "7.5-12.5",
      "notes": "Saw-edged + hold"
    },
    {
      "id": "berries-variable-effects-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Berries (variable effects)",
      "mp": "Various, by berry color (see GW table)",
      "cp": "5-15",
      "notes": "Heal, poison, antidote, rad res, etc."
    },
    {
      "id": "boring-tendrils-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Boring Tendrils",
      "mp": "Natural Weaponry (sharp, armor-piercing)",
      "cp": "10-15",
      "notes": "Bores through wood/stone/steel"
    },
    {
      "id": "carnivorous-jaws-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Carnivorous Jaws",
      "mp": "Natural Weaponry (sharp, +Grapnel optional)",
      "cp": "7.5-15",
      "notes": "1d8 per bite; up to 12 jaws"
    },
    {
      "id": "color-sensitivity-and-imitation-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Color Sensitivity and Imitation",
      "mp": "Shape-Shifting (limited, plant only)",
      "cp": "5-10",
      "notes": "Color-change for camouflage / machine ops"
    },
    {
      "id": "contact-poison-sap-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Contact Poison Sap",
      "mp": "Poison/Venom A (contact, intensity 3-18)",
      "cp": "5-15",
      "notes": "Per intensity"
    },
    {
      "id": "daylight-stasis-d-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Daylight Stasis (D)",
      "mp": "Weakness: Special Requirement (no daylight)",
      "cp": "-5 to -10",
      "notes": "Inactive in sunlight"
    },
    {
      "id": "dissolving-juices-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Dissolving Juices",
      "mp": "Acid (Bio damage) - custom Power Blast variant",
      "cp": "15-20",
      "notes": "5d6/turn organic damage"
    },
    {
      "id": "divisional-body-segments-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Divisional Body Segments",
      "mp": "Mobility (precondition) + Physical Ability flavor",
      "cp": "5-10",
      "notes": "Insect-like segments"
    },
    {
      "id": "electrical-generation-plant-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Electrical Generation (plant)",
      "mp": "Lightning Control A (Electrical Bolt, contact)",
      "cp": "10-15",
      "notes": "4d6 max dmg"
    },
    {
      "id": "explosive-fruit-seeds-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Explosive Fruit/Seeds",
      "mp": "Power Blast or Special Weapon (thrown, area)",
      "cp": "10-15",
      "notes": "Plus Radiated as Energy variant"
    },
    {
      "id": "heat-generation-plant-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Heat Generation (plant)",
      "mp": "Flame Abilities A (Flame Blast)",
      "cp": "10-12.5",
      "notes": "4d6, 15m range"
    },
    {
      "id": "increased-senses-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Increased Senses",
      "mp": "New Senses Ability (basic variant)",
      "cp": "5-10",
      "notes": "Per sense added"
    },
    {
      "id": "low-fertility-d-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Low Fertility (D)",
      "mp": "(Population/encounter level only — no stat block effect)",
      "cp": "0",
      "notes": "Population modifier, not mechanic"
    },
    {
      "id": "manipulation-vines-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Manipulation Vines",
      "mp": "Stretching Abilities A (Elongation) + dexterity flavor",
      "cp": "5-10",
      "notes": "Wield weapons, no innate dmg"
    },
    {
      "id": "mobility-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Mobility",
      "mp": "Speed (low tier)",
      "cp": "0-5",
      "notes": "Walk/slither/crawl"
    },
    {
      "id": "new-plant-parts-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "New Plant Parts",
      "mp": "Various, per part",
      "cp": "5-15",
      "notes": "Eyes/ears/arms/trunk/brain"
    },
    {
      "id": "new-senses-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "New Senses",
      "mp": "Heightened Senses (default sense set)",
      "cp": "20",
      "notes": "All 5 normal human senses"
    },
    {
      "id": "parasitic-attachment-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Parasitic Attachment",
      "mp": "Possession (touch, IN target only) for control; Siphon (Hits) for feeding-only",
      "cp": "10-25",
      "notes": "Possession when controlling host (supplement); Siphon when just draining"
    },
    {
      "id": "physical-reflection-plant-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Physical Reflection (plant)",
      "mp": "Reflection (one damage type)",
      "cp": "10-15",
      "notes": "Per type, see physical mut."
    },
    {
      "id": "poison-throwing-thorns-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Poison Throwing Thorns",
      "mp": "Special Missile Weapon (sharp, ammo) + Poison/Venom A",
      "cp": "15-25",
      "notes": "10m range; combined ability"
    },
    {
      "id": "poison-vines-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Poison Vines",
      "mp": "Poison/Venom A (contact)",
      "cp": "5-15",
      "notes": "Intensity 3-18"
    },
    {
      "id": "radiated-plant-fiber-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Radiated Plant Fiber",
      "mp": "Radiation aura (Power Blast Area Field)",
      "cp": "10-15",
      "notes": "50m radius; Energy type"
    },
    {
      "id": "razor-edged-leaves-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Razor-edged Leaves",
      "mp": "Natural Weaponry (sharp, area)",
      "cp": "10-15",
      "notes": "Smaller, sharper, full plant"
    },
    {
      "id": "saw-edged-leaves-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Saw-edged Leaves",
      "mp": "Natural Weaponry (sharp, multi-attack)",
      "cp": "7.5-12.5",
      "notes": "6-8 per branch, d4 each"
    },
    {
      "id": "seed-mobility-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Seed Mobility",
      "mp": "Companion or Duplication (seed-form)",
      "cp": "10-20",
      "notes": "Telepathic link to parent optional"
    },
    {
      "id": "size-decrease-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Size Decrease",
      "mp": "Size Change: Smaller",
      "cp": "2.5-15",
      "notes": "Per tier"
    },
    {
      "id": "size-increase-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Size Increase",
      "mp": "Size Change: Larger",
      "cp": "2.5-25",
      "notes": "Up to 20x base size"
    },
    {
      "id": "sonic-attack-ability-plant-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Sonic Attack Ability (plant)",
      "mp": "Sonic Abilities A (Sonic Blast, area)",
      "cp": "10-15",
      "notes": "3d6 in 10m radius"
    },
    {
      "id": "squeeze-vines-roots-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Squeeze Vines/Roots",
      "mp": "Grapnel + Natural Weaponry (squeeze damage)",
      "cp": "15-20",
      "notes": "2 dice/turn crush; long reach"
    },
    {
      "id": "spore-cloud-shooting-seeds-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Spore Cloud / Shooting Seeds",
      "mp": "Carrier Attack (Poison/Venom or other)",
      "cp": "10-15",
      "notes": "Various delivery effects"
    },
    {
      "id": "sucker-vines-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Sucker Vines",
      "mp": "Stretching Abilities A + Heightened Agility (limb only)",
      "cp": "7.5-12.5",
      "notes": "Manipulation vines with AG 18"
    },
    {
      "id": "tangle-vines-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Tangle Vines",
      "mp": "Snare attack (low tier)",
      "cp": "5-10",
      "notes": "Trip/entangle weak"
    },
    {
      "id": "temperature-sensitivity-d-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Temperature Sensitivity (D)",
      "mp": "Weakness: Vulnerability (Energy/Entropy +2 dmg)",
      "cp": "-5 to -10",
      "notes": "Heat/cold/energy take +2/die"
    },
    {
      "id": "texture-change-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Texture Change",
      "mp": "Armor (kinetic-weighted)",
      "cp": "5-15",
      "notes": "Hide → scales/plates"
    },
    {
      "id": "thorns-spines-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Thorns/Spines",
      "mp": "Natural Weaponry (sharp, all-around)",
      "cp": "5-10",
      "notes": "Dagger dmg passive contact"
    },
    {
      "id": "throwing-thorns-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Throwing Thorns",
      "mp": "Special Missile Weapon (sharp, ammo)",
      "cp": "5-10",
      "notes": "10m range, dagger dmg"
    },
    {
      "id": "wings-gas-bag-plant",
      "category": "plant",
      "categoryLabel": "Plant/Vegetable Mutations",
      "name": "Wings/Gas Bag",
      "mp": "Flight (Gliding modifier)",
      "cp": "5-10",
      "notes": "Wind-driven travel"
    },
    {
      "id": "attraction-odor-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Attraction Odor",
      "mp": "Distinctive (smell)",
      "cp": "-5",
      "notes": ""
    },
    {
      "id": "body-structure-change-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Body Structure Change",
      "mp": "Physical Disability (variable)",
      "cp": "-5 to -15",
      "notes": ""
    },
    {
      "id": "diminished-sense-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Diminished Sense",
      "mp": "Diminished Senses",
      "cp": "-2.5 to -10",
      "notes": ""
    },
    {
      "id": "double-physical-pain-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Double Physical Pain",
      "mp": "Vulnerability (all kinetic +2)",
      "cp": "-5",
      "notes": ""
    },
    {
      "id": "fat-cell-accumulation-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Fat Cell Accumulation",
      "mp": "Reduced Agility (Gawky -3 AG -2 ST)",
      "cp": "-5 to -10",
      "notes": ""
    },
    {
      "id": "hemophilia-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Hemophilia",
      "mp": "Susceptibility (cuts, bleed)",
      "cp": "-5",
      "notes": ""
    },
    {
      "id": "increased-metabolism-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Increased Metabolism",
      "mp": "Special Requirement (food, frequent)",
      "cp": "-7.5",
      "notes": ""
    },
    {
      "id": "no-resistance-to-bacteria-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "No Resistance to Bacteria",
      "mp": "Susceptibility (disease)",
      "cp": "-5 to -7.5",
      "notes": ""
    },
    {
      "id": "no-resistance-to-poison-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "No Resistance to Poison",
      "mp": "Susceptibility (poison, severe)",
      "cp": "-7.5",
      "notes": ""
    },
    {
      "id": "no-sensory-nerve-endings-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "No Sensory Nerve Endings",
      "mp": "Diminished Senses (Pain)",
      "cp": "-5",
      "notes": ""
    },
    {
      "id": "poor-respiratory-system-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Poor Respiratory System",
      "mp": "Reduced Endurance (Sickly)",
      "cp": "-5 to -10",
      "notes": ""
    },
    {
      "id": "skin-structure-change-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Skin Structure Change",
      "mp": "Vulnerability or Susceptibility",
      "cp": "-5 to -10",
      "notes": ""
    },
    {
      "id": "vision-defect-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Vision Defect",
      "mp": "Diminished Senses (vision)",
      "cp": "-2.5 to -5",
      "notes": ""
    },
    {
      "id": "weight-decrease-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Weight Decrease",
      "mp": "Reduced Strength (Weak)",
      "cp": "-5 to -10",
      "notes": ""
    },
    {
      "id": "anti-reflection-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Anti-reflection",
      "mp": "Low Self-Control: Anti-Reflection (supplement)",
      "cp": "-10",
      "notes": ""
    },
    {
      "id": "complete-mental-block-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Complete Mental Block",
      "mp": "Phobia (specific category)",
      "cp": "-10 to -15",
      "notes": ""
    },
    {
      "id": "epilepsy-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Epilepsy",
      "mp": "Physical Disability (Epileptic)",
      "cp": "-15",
      "notes": ""
    },
    {
      "id": "fear-impulse-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Fear Impulse",
      "mp": "Phobia",
      "cp": "-5 to -15",
      "notes": ""
    },
    {
      "id": "hostility-field-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Hostility Field",
      "mp": "Distinctive (Unattractive)",
      "cp": "-5 to -10",
      "notes": ""
    },
    {
      "id": "mental-defenselessness-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Mental Defenselessness",
      "mp": "Reduced Cool (Inane, severe)",
      "cp": "-10 to -15",
      "notes": ""
    },
    {
      "id": "multiple-damage-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Multiple Damage",
      "mp": "Vulnerability (kinetic +2-4) or Psychosis",
      "cp": "-10 to -15",
      "notes": ""
    },
    {
      "id": "poor-dual-brain-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Poor Dual Brain",
      "mp": "Psychosis or Low Self-Control",
      "cp": "-5 to -15",
      "notes": ""
    },
    {
      "id": "daylight-stasis-plant-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Daylight Stasis (plant)",
      "mp": "Special Requirement (no daylight)",
      "cp": "-5 to -10",
      "notes": ""
    },
    {
      "id": "low-fertility-plant-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Low Fertility (plant)",
      "mp": "(Population only — no CP)",
      "cp": "0",
      "notes": ""
    },
    {
      "id": "temperature-sensitivity-plant-defect",
      "category": "defect",
      "categoryLabel": "Defects and Weaknesses",
      "name": "Temperature Sensitivity (plant)",
      "mp": "Vulnerability (Energy/Entropy +2)",
      "cp": "-5 to -10",
      "notes": ""
    }
  ],
  "animalPlantTypes": [
    {
      "id": "none",
      "label": "No Animal/Plant package",
      "mods": {
        "st": 0,
        "en": 0,
        "ag": 0
      },
      "cp": 0,
      "desc": "Use this for Pure Strain Humans and tool-using humanoid mutants."
    },
    {
      "id": "mammal",
      "label": "Mammal",
      "mods": {
        "st": 0,
        "en": 0,
        "ag": 0
      },
      "cp": 20,
      "desc": "Standard A/P package placeholder: 3 abilities plus 2 weaknesses."
    },
    {
      "id": "insect",
      "label": "Insect",
      "mods": {
        "st": 0,
        "en": 0,
        "ag": 0
      },
      "cp": 20,
      "desc": "Standard A/P package placeholder: 3 abilities plus 2 weaknesses."
    },
    {
      "id": "avian",
      "label": "Avian",
      "mods": {
        "st": -2,
        "en": -2,
        "ag": 4
      },
      "cp": 20,
      "desc": "Avian BC mods from conversion doc."
    },
    {
      "id": "reptile",
      "label": "Reptile",
      "mods": {
        "st": 2,
        "en": 2,
        "ag": -4
      },
      "cp": 20,
      "desc": "Reptile BC mods from conversion doc."
    },
    {
      "id": "amphibian",
      "label": "Amphibian",
      "mods": {
        "st": 2,
        "en": 2,
        "ag": -4
      },
      "cp": 20,
      "desc": "Amphibian BC mods from conversion doc."
    },
    {
      "id": "arachnid",
      "label": "Arachnid",
      "mods": {
        "st": -4,
        "en": 2,
        "ag": 2
      },
      "cp": 20,
      "desc": "Arachnid BC mods from conversion doc."
    },
    {
      "id": "crustacean",
      "label": "Crustacean",
      "mods": {
        "st": 4,
        "en": 0,
        "ag": -4
      },
      "cp": 20,
      "desc": "Crustacean BC mods from conversion doc."
    },
    {
      "id": "mollusk",
      "label": "Mollusk",
      "mods": {
        "st": 2,
        "en": 2,
        "ag": -4
      },
      "cp": 20,
      "desc": "Mollusk BC mods from conversion doc."
    },
    {
      "id": "fish",
      "label": "Fish",
      "mods": {
        "st": 0,
        "en": 4,
        "ag": -4
      },
      "cp": 20,
      "desc": "Fish BC mods from conversion doc."
    },
    {
      "id": "plant",
      "label": "Plant/Fungus",
      "mods": {
        "st": 3,
        "en": 3,
        "ag": -6
      },
      "cp": 20,
      "desc": "Plant/Fungus BC mods from conversion doc."
    },
    {
      "id": "one-celled",
      "label": "One-Celled",
      "mods": {
        "st": -4,
        "en": 2,
        "ag": 2
      },
      "cp": 20,
      "desc": "One-celled/slime BC mods from conversion doc."
    },
    {
      "id": "lower-class",
      "label": "Lower Class",
      "mods": {
        "st": -2,
        "en": 2,
        "ag": 0
      },
      "cp": 20,
      "desc": "Generic lower lifeform BC mods from conversion doc."
    }
  ],
  "highImpactNames": [
    "Death Field Generation",
    "Time Field Manipulation",
    "De-evolution",
    "Planar Travel",
    "Mass Mind",
    "Molecular Disruption",
    "Weather Manipulation",
    "Reflection",
    "Teleportation",
    "Physical Reflection",
    "Thought Imitation",
    "Symbiotic Attachment",
    "Parasitic Attachment",
    "Poison Throwing Thorns",
    "Dissolving Juices"
  ]
};
})();
