// gw-data-v2.js v2.0.0 — authoritative GW 1e -> MP conversion (from your CSV)
// species (d100), number-of-mutations (d6), PSH abilities, mutation charts
// (physical/mental/plant with exact CPs + ability builds + sub-picks), equipment.
(function(){ window.GWData2 = {
 "version": "2.0.0",
 "species": [
  {
   "lo": 1,
   "hi": 20,
   "name": "Pure Strain Human"
  },
  {
   "lo": 21,
   "hi": 60,
   "name": "Humanoid (Mutant)"
  },
  {
   "lo": 61,
   "hi": 74,
   "name": "Mutated Animal"
  },
  {
   "lo": 75,
   "hi": 90,
   "name": "Mutated Plant"
  },
  {
   "lo": 91,
   "hi": 100,
   "name": "Tech Construct"
  }
 ],
 "mutationCount": {
  "physical": [
   2,
   3,
   4,
   5,
   6,
   0
  ],
  "mental": [
   4,
   3,
   2,
   1,
   0,
   6
  ]
 },
 "pshAbilities": [
  {
   "cp": "5",
   "text": "Able to use Artifacts with DNA lock"
  },
  {
   "cp": "-5",
   "text": "Max Characteristics: ST=18, EN=24, AG=24, IN=24, CL=24"
  }
 ],
 "mutations": {
  "physical": [
   {
    "lo": 1,
    "hi": 2,
    "name": "Attraction Odor",
    "cp": "*",
    "cpNum": null,
    "ability": "+2 to chance of Random Encounters per (-2.5) CPs",
    "picks": []
   },
   {
    "lo": 3,
    "hi": 4,
    "name": "Body Structure Change",
    "cp": "*",
    "cpNum": null,
    "ability": "Random weaknesses including: one eye, allergies, albinoism, etc.",
    "picks": []
   },
   {
    "lo": 5,
    "hi": 5,
    "name": "Chameleon Powers",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Invisbility: Visible Light (10), Chameleon (-2.5), PR=0 (+2.5)",
    "picks": []
   },
   {
    "lo": 6,
    "hi": 6,
    "name": "Density Control",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Density Change A) Increase: 2/2/2/2, +5 ST, x3 Weight, PR=2 per hour, SR 3 (7.5); B) Decrease to 1 gram (2.5), PR=0",
    "picks": []
   },
   {
    "lo": 7,
    "hi": 8,
    "name": "Diminished Sense",
    "cp": "*",
    "cpNum": null,
    "ability": "Weakness: Diminished Senses",
    "picks": []
   },
   {
    "lo": 9,
    "hi": 10,
    "name": "Double Physical Pain",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Weakness: Vulnerability; +1 damage from Kinetic, Energy, Bio, and Entropy attacks",
    "picks": []
   },
   {
    "lo": 11,
    "hi": 12,
    "name": "Electrical Generation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Lightning Control B) Electrical Field: d6+1, PR=1",
    "picks": []
   },
   {
    "lo": 13,
    "hi": 14,
    "name": "Fat Cell Accumulation",
    "cp": "-5",
    "cpNum": -5.0,
    "ability": "Weakness; Physical Disability: Big, x2 Profile, x8 Weight",
    "picks": []
   },
   {
    "lo": 15,
    "hi": 16,
    "name": "Gas Generation - Musk",
    "cp": "",
    "cpNum": null,
    "ability": "Pick one of the following Abilities:",
    "picks": [
     {
      "name": "Obscuring Gas",
      "cp": "10",
      "cpNum": 10.0,
      "ability": "Darkness Control: Visible Light, IR, UV, PR=3, 3\" Diameter (10), Vaporous Effect: lasts 6 Rounds"
     },
     {
      "name": "Irritating Gas",
      "cp": "10",
      "cpNum": 10.0,
      "ability": "Devitalization Ray: 2d12 damage (5), No Range (-12.5), Immunity (+2.5), 11\" Vaporous Area Effect: lasts 6 Rounds (+15), PR=3"
     },
     {
      "name": "Paralysis Gas",
      "cp": "20",
      "cpNum": 20.0,
      "ability": "Paralysis Ray: EN save @ -2 (15), No Range (-12.5), Vaporous Perimeter Area Effect: 3\" (+7.5), Gas (+10), PR=3"
     },
     {
      "name": "Poison Gas",
      "cp": "10",
      "cpNum": 10.0,
      "ability": "Posion/Venom: 3 Bio / Rnd (5), EN save @ -8 (0), Vaporous Area Effect: 3\" (+5)"
     },
     {
      "name": "Blinding Gas",
      "cp": "10",
      "cpNum": 10.0,
      "ability": "Light Control C) Glare: Visible Light, IR, UV, PR=2 (2.5), 5\" Vaporous Area Effect (5), Immunity (+2.5)"
     }
    ]
   },
   {
    "lo": 17,
    "hi": 17,
    "name": "Gills/Webbed Hands & Feet",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Adaptation: Drowning (2.5), High Pressure (5) / Speed: 12/48, 16 mph (2.5), Swimming",
    "picks": []
   },
   {
    "lo": 18,
    "hi": 18,
    "name": "Heightened Balance",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Knowledge A) Balance +6 (5) plus Physical Ability I) Wall Crawling (5)",
    "picks": []
   },
   {
    "lo": 19,
    "hi": 22,
    "name": "Heightened Constitution",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Endurance +10",
    "picks": []
   },
   {
    "lo": 23,
    "hi": 23,
    "name": "Heightened Dexterity",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Agility +10",
    "picks": []
   },
   {
    "lo": 24,
    "hi": 24,
    "name": "Heightened Hearing",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses: Acute Hearing +6 (5), Telescopic Hearing: +4 vs. rng penalties/x16 mag (5)",
    "picks": []
   },
   {
    "lo": 25,
    "hi": 25,
    "name": "Heightened Precision",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Weakness Detection: +4 damage, Structural Weakness, takes an Action & 1\"",
    "picks": []
   },
   {
    "lo": 26,
    "hi": 26,
    "name": "Heightened Smell",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Heightened Senses: Full sense of Scent (5), Acute +6 (5), Telescopic: +4 vs. rng/x16 mag (5), Tracking +6 (5)",
    "picks": []
   },
   {
    "lo": 27,
    "hi": 32,
    "name": "Heightened Strength",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Strength +10",
    "picks": []
   },
   {
    "lo": 33,
    "hi": 33,
    "name": "Heightened Taste",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses: Full sense of Taste (5) CPs, Acute +3 (+5)",
    "picks": []
   },
   {
    "lo": 34,
    "hi": 34,
    "name": "Heightened Touch",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Ht. Senses: Full Sense of Touch (5) / Knowledge A) Artifact Use & Operation, +6 (5) / Weakness Detection with the Structural Weakness modifier: +4 damage (10)",
    "picks": []
   },
   {
    "lo": 35,
    "hi": 35,
    "name": "Heightened Vision",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses: Telescopic Vision: +8 vs. range penalties, x256 Magnification (+10)",
    "picks": []
   },
   {
    "lo": 36,
    "hi": 37,
    "name": "Hemophilia",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Even 1 hit point of damage causes the character to bleed 1 Hit Point per minute. Medic roll to stop.",
    "picks": []
   },
   {
    "lo": 38,
    "hi": 41,
    "name": "Horns or Antlers",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Natural Weaponry: +3 to hit (7.5), +5 sharp kinetic damage (+7.5), Body Part (-5)",
    "picks": []
   },
   {
    "lo": 42,
    "hi": 43,
    "name": "Increased Metabolism",
    "cp": "-5",
    "cpNum": -5.0,
    "ability": "Weakness: The character requires twice as much food as normal",
    "picks": []
   },
   {
    "lo": 44,
    "hi": 46,
    "name": "Increased Speed",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Super Speed: +1 Turn, PR=2 (10)",
    "picks": []
   },
   {
    "lo": 47,
    "hi": 47,
    "name": "Infravision",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses: Infrared Light, Full Sense (10), Ranged (+5) / Imperceptive: -6 Sight perception (-10), only during Daylight (+5)",
    "picks": []
   },
   {
    "lo": 48,
    "hi": 48,
    "name": "Light Generation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Light Control B) Flash: EN save @ +1 (10), 5\" Area Effect, PR=2",
    "picks": []
   },
   {
    "lo": 49,
    "hi": 50,
    "name": "Multiple Body Parts",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Physical Abilities B) Extra Limbs x4 (10)",
    "picks": []
   },
   {
    "lo": 51,
    "hi": 55,
    "name": "New Body Parts",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Cybernetics but substitute the Gear modifier for the Body Part modifier",
    "picks": []
   },
   {
    "lo": 56,
    "hi": 58,
    "name": "Nightvision",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses: Acute Sight +6 (5), Amplified Vision (+5)",
    "picks": []
   },
   {
    "lo": 59,
    "hi": 60,
    "name": "Nocturnal",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Weakness: Susceptibility to Daylight, Common (-7.5), -3 to hit (-2.5)",
    "picks": []
   },
   {
    "lo": 61,
    "hi": 62,
    "name": "No Resistance to Bacteria",
    "cp": "*",
    "cpNum": null,
    "ability": "Vulnerability: +2 Disease damage per (-2.5) CPs",
    "picks": []
   },
   {
    "lo": 63,
    "hi": 64,
    "name": "No Resistance to Poison",
    "cp": "*",
    "cpNum": null,
    "ability": "Vulnerability: +2 Poison damage per (-2.5) CPs",
    "picks": []
   },
   {
    "lo": 65,
    "hi": 66,
    "name": "No Sensory Nerve Endings",
    "cp": "-5",
    "cpNum": -5.0,
    "ability": "Diminished Senses: Can’t Feel Pain",
    "picks": []
   },
   {
    "lo": 67,
    "hi": 67,
    "name": "Oversized Body Parts",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses with the affected organ: vision for eyes, hearing for ears, scent for nose, taste for tongue, touch for hands/fingers) or Speed (legs), Physical Ability D) Prehensile Feet (feet), Ht. Intelligence (head); Body Part mod is optional",
    "picks": []
   },
   {
    "lo": 68,
    "hi": 68,
    "name": "Partial Carapace",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Armor: 12 points (20), Partial Coverage / Light (-10)",
    "picks": []
   },
   {
    "lo": 69,
    "hi": 70,
    "name": "Photosynthetic Skin",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Adaptation: Doesn’t Eat/Excrete (2.5) PLUS Regeneration: 1 hp per 5 minutes (7.5)",
    "picks": []
   },
   {
    "lo": 71,
    "hi": 71,
    "name": "Physical Reflection",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Reflection: Energy Damage Sub-Type (5), 18 pt. limit (+5)",
    "picks": []
   },
   {
    "lo": 72,
    "hi": 73,
    "name": "Poor Respiratory System",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Each Round after 6 Rounds of strenuous activity, the character must make an EN save @ +7 or fall unconscious for 2d6+3 Rounds. Each Round of continued activity lowers the EN save by 1.",
    "picks": []
   },
   {
    "lo": 74,
    "hi": 74,
    "name": "Quillspines",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Natural Weaponry: +2 to hit (5), +2 sharp (0) / Natural Weaponry: +2 to hit (5), +2 sharp (0), Range: STx2 (+12.5), 24 Charges (-2.5)",
    "picks": []
   },
   {
    "lo": 75,
    "hi": 76,
    "name": "Radiated Eyes",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Power Blast: d10+d12 (22.5), No KB (-5), Other Damage Type: Other (+10), Time Requirement: every 3 Rounds (-7.5)",
    "picks": []
   },
   {
    "lo": 77,
    "hi": 78,
    "name": "Regeneration",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Regeneration: 1 hitpoint per 30 minutes (5), Unlimited (+5)",
    "picks": []
   },
   {
    "lo": 79,
    "hi": 79,
    "name": "Shapechange",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Shape-Shifting: pick mammal, insects, or reptiles (5), Realistic (+5), PR=0",
    "picks": []
   },
   {
    "lo": 80,
    "hi": 83,
    "name": "Shorter",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Size Change B) Smaller: 1' tall, /6 Profile, x.005 Weight, -2 ST, -2 EN (10), PR=0, Stays Active (+5), Can't Hold Back (-5)",
    "picks": []
   },
   {
    "lo": 84,
    "hi": 84,
    "name": "Skeletal Enhancement",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Invulnerability to Blunt Kinetic (10) / Natural Weaponry: +4 Blunt Kinetic damage (10)",
    "picks": []
   },
   {
    "lo": 85,
    "hi": 85,
    "name": "Sonic Attack Ability",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Sonic Abilities A) Sonic Blast: 2d8 (20), Touch Range (-12.5), Area Effect: 7” (+10), Time Requirement: every 3 Rounds (-7.5)",
    "picks": []
   },
   {
    "lo": 86,
    "hi": 86,
    "name": "Symbiotic Attachment",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Mind Control: IN save @ -9 (27.5), Touch Range (-12.5), PR=8, Time Requirement: 3 Rounds (-5)",
    "picks": []
   },
   {
    "lo": 87,
    "hi": 91,
    "name": "Taller",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Size Change A) Larger: 10' tall, x1.6 Profile, x4 Weight, +6 ST, +6 EN",
    "picks": []
   },
   {
    "lo": 92,
    "hi": 93,
    "name": "Total Carapace",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Armor: 9 points (15), Misc.: Slow Movement 2/3 (-5)",
    "picks": []
   },
   {
    "lo": 94,
    "hi": 94,
    "name": "Ultravision",
    "cp": "15",
    "cpNum": 15.0,
    "ability": "Heightened Senses: Light Ultraviolet, full sense (10), Ranged (5)",
    "picks": []
   },
   {
    "lo": 95,
    "hi": 97,
    "name": "Vision Defect",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Select 10 CPs of Diminished Senses: Sight",
    "picks": []
   },
   {
    "lo": 98,
    "hi": 99,
    "name": "Weight Decrease",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Weakness: Lowered Strength",
    "picks": []
   },
   {
    "lo": 100,
    "hi": 100,
    "name": "Wings",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Flight: 8/128, 44 mph (15), Wings (-5), PR=1 per hour",
    "picks": []
   }
  ],
  "mental": [
   {
    "lo": 1,
    "hi": 1,
    "name": "Absorption",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Absorption: must pick Energy Sub-Type (5), 18 pt. limit (5)",
    "picks": []
   },
   {
    "lo": 2,
    "hi": 2,
    "name": "Anti-Reflection",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "New MP Weakness: Every time a damaging Ability is used there is a 25% chance of a backlash, causing ½ damage to the character",
    "picks": []
   },
   {
    "lo": 3,
    "hi": 6,
    "name": "Complete Mental Block",
    "cp": "*",
    "cpNum": null,
    "ability": "Weakness: Phobia",
    "picks": []
   },
   {
    "lo": 7,
    "hi": 7,
    "name": "Cryokinesis",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Ice Abilities A) Ice Blast: d10+1 BrkPnt, (ST+EN)/2 Range, PR=1",
    "picks": []
   },
   {
    "lo": 8,
    "hi": 8,
    "name": "Death Field Generation",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Death Touch: 2d6 Entropy (25), Area Effect: 9” (+7.5), PR=12, Duration: 20 minutes between uses (-12.5)",
    "picks": []
   },
   {
    "lo": 9,
    "hi": 10,
    "name": "De-Evolution",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Siphon: 2d6 of Super Abilities (15), ST Range (+10), PR=2 (-5)",
    "picks": []
   },
   {
    "lo": 11,
    "hi": 11,
    "name": "Density Control",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Gravity Control A or B",
    "picks": []
   },
   {
    "lo": 12,
    "hi": 12,
    "name": "Direction Sense",
    "cp": "5",
    "cpNum": 5.0,
    "ability": "Minor Ability: the mutant always knows exactly where it is and can retrace their path even if blindfolded",
    "picks": []
   },
   {
    "lo": 13,
    "hi": 13,
    "name": "Dual Brain",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Super Speed: +1 Turn (10), PR=0 (+5), Only usable with mental abilities or for talking (-5)",
    "picks": []
   },
   {
    "lo": 14,
    "hi": 14,
    "name": "Empathy",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Heightened Senses: Detect Emotions, Full Sense (10), Range (+5) / Emotion Control: IN save @ -4 (15), Misc. Modifier: only usable vs. Non-Sentient Creatures (-10)",
    "picks": []
   },
   {
    "lo": 15,
    "hi": 18,
    "name": "Epilepsy",
    "cp": "-15",
    "cpNum": -15.0,
    "ability": "Weakness: Epileptic",
    "picks": []
   },
   {
    "lo": 19,
    "hi": 22,
    "name": "Fear Impulse",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Emotion Control: IN save @ -4 (15), CL Range, Single Emotion: Fear (-5), PR=3",
    "picks": []
   },
   {
    "lo": 23,
    "hi": 25,
    "name": "Force Field Generation",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Force Field: 5/5/4/4 (12.5), Area Effect: 7\" (+10), 1 Charge: 27 Deflection points (-2.5)",
    "picks": []
   },
   {
    "lo": 26,
    "hi": 26,
    "name": "Genius Capability",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Heightened Expertise: One class, +4 (12.5 CPs) plus Heightened Attack: +2 class damage (+7.5) / Scientific Genius: Knowledge A) Artifacts +3 (5) plus Inventing (5) / Economic Genius: Wealth: d6+1 (5), +2 Reaction Bonus (+5)",
    "picks": []
   },
   {
    "lo": 27,
    "hi": 31,
    "name": "Heightened Brain Talent",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Heightened Senses: Detect Lie, Full (10), Ranged (5) plus Knowledge A) Artifacts +3 (5)",
    "picks": []
   },
   {
    "lo": 32,
    "hi": 41,
    "name": "Heightened Intelligence",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Intelligence +10",
    "picks": []
   },
   {
    "lo": 42,
    "hi": 45,
    "name": "Hostility Field",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Emotion Control: IN save @+2 (0), Area Effect: 9” (+12.5), PR=0 (+7.5), Stays Active (+5), Can’t Hold Back (-5), Single Emotion: Hostility (-5), No Range (-10), Unobvious (+5); Total Cost = 10. As a Weakness it is worth (-10) CPs",
    "picks": []
   },
   {
    "lo": 46,
    "hi": 46,
    "name": "Illusion Generation",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Illusions: Visual, Audible, Olfactory, PR=3/Round (0), Mental (+10), Single Target (0), IN\" Range (+10)",
    "picks": []
   },
   {
    "lo": 47,
    "hi": 47,
    "name": "Intuition",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Heightened Expertise: +1 (5) plus Heightened Attack: +3 (+15)",
    "picks": []
   },
   {
    "lo": 48,
    "hi": 52,
    "name": "Life Leach",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Siphon: 2d4 Hit Pts (10), Area Effect: 3\" (5), PR=2 (-5)",
    "picks": []
   },
   {
    "lo": 53,
    "hi": 53,
    "name": "Light Wave Manipulation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Invisibility, Darkness Control, and Negation: Laser in a 3 slot Multi-Ability: (-5) on each slot",
    "picks": []
   },
   {
    "lo": 54,
    "hi": 54,
    "name": "Magnetic Control",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Magnetism: 1920 lbs / 2d6 damage (10), ST\" Range, PR=1",
    "picks": []
   },
   {
    "lo": 55,
    "hi": 55,
    "name": "Mass Mind",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Siphon: +2d10 Super Abilities (25), Reversible Only (+0) and Misc.: only with Mental Mutations & requires another individual w/the same ability (-15)",
    "picks": []
   },
   {
    "lo": 56,
    "hi": 58,
    "name": "Mental Blast",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Mental Ability A) Mental Blast: d6 Psychic damage, IN\" range, PR=1",
    "picks": []
   },
   {
    "lo": 59,
    "hi": 59,
    "name": "Mental Control",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Possession: IN save @ -6 (10), No Range, PR=8 (the mutant's body remains unmoving and unconscious, as in Astral Projection). See chart below:",
    "picks": []
   },
   {
    "lo": 60,
    "hi": 60,
    "name": "Mental Control Over",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Adaptation: Blood Loss (2.5)",
    "picks": [
     {
      "name": "Physical State",
      "cp": "",
      "cpNum": null,
      "ability": "Willpower B) Pain Resistance (10) / Regeneration: 1 / 3 hours (0) / Ht. ST: +30 (30), 1 Charge (-22.5), Duration: 5 min (-5) / Ht. AG: +30 (30), 1 Charge (-22.5), Duration: 5 min (-5) / Super Speed: +1 Turn (10), 1 Chrg (-17.5), 5 min (+10)"
     }
    ]
   },
   {
    "lo": 61,
    "hi": 62,
    "name": "Mental Defenselessness",
    "cp": "*",
    "cpNum": null,
    "ability": "Weakness: -1 Mental Defense per (-2.5) CPs",
    "picks": []
   },
   {
    "lo": 63,
    "hi": 63,
    "name": "Mental Defense Shield",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Defense: +4 Mental Defense",
    "picks": []
   },
   {
    "lo": 64,
    "hi": 64,
    "name": "Molecular Disruption",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Disintegration: 2d8+d10 (30), ST range, PR=32 (-20)",
    "picks": []
   },
   {
    "lo": 65,
    "hi": 66,
    "name": "Molecular Understanding",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Weakness Detection: +2 dmg, takes an Action and 1\", PR=0 (5) PLUS Knowledge A) Artifact Usage (5)",
    "picks": []
   },
   {
    "lo": 67,
    "hi": 69,
    "name": "Multiple Damage",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Weakness: Vulnerability; +1 damage from Kinetic, Energy, Bio, and Entropy attacks",
    "picks": []
   },
   {
    "lo": 70,
    "hi": 70,
    "name": "Planar Travel",
    "cp": "15",
    "cpNum": 15.0,
    "ability": "Alternate Dimensional Travel (40), Gateway option, Duration: once every 3.5 days (-25)",
    "picks": []
   },
   {
    "lo": 71,
    "hi": 72,
    "name": "Plant/Animal Control",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Mind Control: IN save @ -4 (15), IN+CL\" Rng, PR=8, Pick Animal or Plant only (-5)",
    "picks": []
   },
   {
    "lo": 73,
    "hi": 74,
    "name": "Poor Dual Brain",
    "cp": "*",
    "cpNum": null,
    "ability": "This functions like the Weakness Psychosis with the 2nd Brain occasionally \"taking over\" control",
    "picks": []
   },
   {
    "lo": 75,
    "hi": 75,
    "name": "Precognition",
    "cp": "15",
    "cpNum": 15.0,
    "ability": "Heightened Senses: Detect Karma, full (10), Range: radiates (5)",
    "picks": []
   },
   {
    "lo": 76,
    "hi": 77,
    "name": "Psychometry",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Heightened Senses: Retrocognitive Sight+Hearing (30), Total Concentration (-10), Time Requirement: 1 Phase (-5), PR=2 (-5)",
    "picks": []
   },
   {
    "lo": 78,
    "hi": 78,
    "name": "Pyrokinesis",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Flame Abilities A) Flame Blast: 2d6 (10), (ST+EN) Rng, Duration: 3 Rounds (+5), Indirect (+5), PR=2",
    "picks": []
   },
   {
    "lo": 79,
    "hi": 79,
    "name": "Radar/Sonar",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Heightened Senses: Sonar full (10), Global: 360/90 (5), Range: IN/2 (5), Ht. Expertise: +1 to hit (5), Body Part: Huge Ears (-5)",
    "picks": []
   },
   {
    "lo": 80,
    "hi": 80,
    "name": "Reflection",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Reflection: Kinetic, Energy, Bio (30), 28 pt limit (+15), PR=8 (-15), Total Concentration per Use (-10)",
    "picks": []
   },
   {
    "lo": 81,
    "hi": 81,
    "name": "Repulsion Field",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Force Field: 8/8/7/7 (27.5), Area Effect: 3\" (+5), EN/4\" Range (+5), Total Concentration (-10), Not on Self (-5), PR=12 (-2.5)",
    "picks": []
   },
   {
    "lo": 82,
    "hi": 82,
    "name": "Sound Imitation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Reflection: Sonic Attacks (5), 18 pt. limit (5)",
    "picks": []
   },
   {
    "lo": 83,
    "hi": 83,
    "name": "Stunning Force",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Paralysis Ray: EN save @ -4 (20), Touch Range (-12.5), Immunity (+2.5), 7\" Area Effect (+10), PR=12 (-10)",
    "picks": []
   },
   {
    "lo": 84,
    "hi": 86,
    "name": "Telekinesis",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Telekinesis: 480 lbs / d8+1 damage (10), AG\" Range, PR=1",
    "picks": []
   },
   {
    "lo": 87,
    "hi": 87,
    "name": "Telekinetic Arm",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Armor: 13 points: 7/0/3/3 (22.5), Partial Coverage / Heavy (-5), Backlash (-7.5) / Telekinesis: 480 lbs / d8+1 damage (10), AG\" Range, PR=1",
    "picks": []
   },
   {
    "lo": 88,
    "hi": 88,
    "name": "Telekinetic Flight",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Flight: 4/64, 21 mph (10), PR=1 per hour",
    "picks": []
   },
   {
    "lo": 89,
    "hi": 90,
    "name": "Telepathy",
    "cp": "5",
    "cpNum": 5.0,
    "ability": "Telepathy: Must pick either Verbal or Visual transmission (5), no set range, must perceive target, PR=1 per hour per individual contacted",
    "picks": []
   },
   {
    "lo": 91,
    "hi": 91,
    "name": "Teleportation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Teleportation: 1.5 miles (25), Self Only (-2.5), Duration: once every hour (-15), PR=1",
    "picks": []
   },
   {
    "lo": 92,
    "hi": 92,
    "name": "Thought Imitation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Reflection: Psychic Damage Type (10), 23 pt. limit (10), Concentration (-5), PR=2 (-5)",
    "picks": []
   },
   {
    "lo": 93,
    "hi": 93,
    "name": "Time Field Manipulation",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Dimensional Travel C) Time (30), PR=32 (-10)",
    "picks": []
   },
   {
    "lo": 94,
    "hi": 94,
    "name": "Total Healing",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Healing: 10 Hits in 1 Round (40), Multi-Ability (-10), Self Only (-5), 1 Charge (-20) / Negation: Bio damage Type, 1.5 Weeks, +7 save (32.5), Multi-Ability (-10), 1 Charge (-20) / Negation: Radiation Dmg Type, 1.5 Weeks, +7 save (32.5), Multi-Ability (-10), 1 Charge (-20)",
    "picks": []
   },
   {
    "lo": 95,
    "hi": 95,
    "name": "Weather Manipulation",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Weather Control A) IN save @ +7 (0), PR=5, lasts 6 Rounds; B) Command Weather: 20 CPs",
    "picks": []
   },
   {
    "lo": 96,
    "hi": 100,
    "name": "Will Force",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Siphon: +2d8 Super Abilities (20), Only adds to existing Abilities (-5), PR=4 (-10) PLUS Heightened Expertise: +1 (5)",
    "picks": []
   }
  ],
  "plant": [
   {
    "lo": 1,
    "hi": 1,
    "name": "Adaptation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Invulnerability: Energy (20), Misc: only after taking a full damage attack (-10)",
    "picks": []
   },
   {
    "lo": 2,
    "hi": 5,
    "name": "Aromatic Powers",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Emotion Control: Attraction, IN save @ +2 (0), PR=3, Vaporous Area Effect: 7\" (+10)",
    "picks": []
   },
   {
    "lo": 6,
    "hi": 7,
    "name": "Attraction Odor",
    "cp": "*",
    "cpNum": null,
    "ability": "Weakness: +1 to chance of Random Encounters per   (-2.5) CPs",
    "picks": []
   },
   {
    "lo": 8,
    "hi": 8,
    "name": "Bacterial Symbiosis",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Poison/Venom: 3 Bio damage / Round (5), EN save @-8 (0), PR=2, Ability Field (+5)",
    "picks": []
   },
   {
    "lo": 9,
    "hi": 9,
    "name": "Barbed Leaves",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Natural Weaponry: +2 to hit (5), +4 sharp damage (5)",
    "picks": []
   },
   {
    "lo": 10,
    "hi": 10,
    "name": "Berries",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "1. Purple - Healing: 10 Hits (40), Ingested (-10), 1 Charge (-20) / 2. Green - Ht. Defense: Mental Defense +2 (5), Usable by Others (+5), 1 one-hour Charge (0) / 3. Turquoise - Poison/Venom: 8 Bio/Rnd (30), EN save @-11 (+7.5), Ingested (-10), 1 Charge (-17.5) / 4. Orange - Power Blast: 2d8+d10 Radiation (30), Other (+10), Ingested (-10), 1 Charge (-20) / 5. Orange/Yellow - Invulnerability: Radiation (5), Usable on Others: PR=24 (+5), PR=0 (+22.5), 1 one-hour Charge (-22.5) / 6. Red/Orange - Negation: +3 save bonus vs. Poison/Venom (15), Ingested (-10), Usable by Others: PR=24 (+5), PR=0 (+20), 1 one-hour Chrg (-20)",
    "picks": []
   },
   {
    "lo": 11,
    "hi": 13,
    "name": "Boring Tendrils",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Disintegration Ray: 2d10 (20), ST/2 Range (-5), Body Part (-5), PR=2",
    "picks": []
   },
   {
    "lo": 14,
    "hi": 15,
    "name": "Carnivorous Jaws",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Natural Weaponry: +6 Sharp Kinetic Damage",
    "picks": []
   },
   {
    "lo": 16,
    "hi": 17,
    "name": "Color Sensitivity and Imitation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Shape-Shifting: any plant shape and color (15), Realistic (+5), PR=4 per hour (-10)",
    "picks": []
   },
   {
    "lo": 18,
    "hi": 19,
    "name": "Contact Poison Sap",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Poison/Venom: 3 Bio damage / Round (5), EN save @-8 (0), PR=2, Ability Field (+5)",
    "picks": []
   },
   {
    "lo": 20,
    "hi": 21,
    "name": "Daylight Stasis",
    "cp": "-10",
    "cpNum": -10.0,
    "ability": "Weakness: Special Requirement of Sunlight, Common (-2.5), Almost Constantly (-7.5), Discomfort: -3 penalty on all saves and rolls",
    "picks": []
   },
   {
    "lo": 22,
    "hi": 24,
    "name": "Dissolving Juices",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Disintegration B) Field: d6+1, PR=1",
    "picks": []
   },
   {
    "lo": 25,
    "hi": 25,
    "name": "Divisional Body Segments",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Speed: 32/128, 44 mph (10), PR=1 per hour",
    "picks": []
   },
   {
    "lo": 26,
    "hi": 26,
    "name": "Electrical Generation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Lightning Control B) Electrical Field: d6+1, PR=1",
    "picks": []
   },
   {
    "lo": 27,
    "hi": 28,
    "name": "Explosive and/or Radiated Fruit or Seeds",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Power Blast: pick kinetic or energy 2d10 (20), Area Effect: 3\" (+5), 2 Charges (-15)",
    "picks": []
   },
   {
    "lo": 29,
    "hi": 29,
    "name": "Heat Generation",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Flame Abilities A) Flame Blast: 2d6 (10), (ST+EN) Range, PR=2",
    "picks": []
   },
   {
    "lo": 30,
    "hi": 31,
    "name": "Heightened Physcial Attribute",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Select 10 CPs of Heightened Strength, Endurance, or Agility",
    "picks": []
   },
   {
    "lo": 32,
    "hi": 32,
    "name": "Hidden Brain",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Physical Ability E) Protected Brain: the character is immune to the effects of Called Shots to their head",
    "picks": []
   },
   {
    "lo": 33,
    "hi": 33,
    "name": "Increased Senses",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Increase existing senses by 10 CPs of Heightened Senses",
    "picks": []
   },
   {
    "lo": 34,
    "hi": 35,
    "name": "Low Fertility",
    "cp": "-5",
    "cpNum": -5.0,
    "ability": "Weakness: The mutated plant only heals when their Hits are below half their full value",
    "picks": []
   },
   {
    "lo": 36,
    "hi": 37,
    "name": "Manipulation Vines",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Physical Ability B) Extra Limbs: x4 (10), Elongation 3\" (5), Body Ability (-5)",
    "picks": []
   },
   {
    "lo": 38,
    "hi": 42,
    "name": "Mobility",
    "cp": "(15)",
    "cpNum": null,
    "ability": "Roll Again, or if character is Immobile, buy it off for (15) CPs",
    "picks": []
   },
   {
    "lo": 43,
    "hi": 49,
    "name": "New Plant Parts",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Cybernetics but substitute the Body Part modifier for the Gear modifier",
    "picks": []
   },
   {
    "lo": 50,
    "hi": 57,
    "name": "New Senses",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Select or randomly roll 10 CPs of Heightened Senses",
    "picks": []
   },
   {
    "lo": 58,
    "hi": 58,
    "name": "Parasitic Attachment",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Mind Control: IN save @-7 (22.5), Touch Range (-12.5), PR=8",
    "picks": []
   },
   {
    "lo": 59,
    "hi": 59,
    "name": "Physical Reflection",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Reflection: Energy Damage Sub-Type (5), 18 pt. limit (+5)",
    "picks": []
   },
   {
    "lo": 60,
    "hi": 61,
    "name": "Poison Throwing Thorns",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Poison/Venom: 3 Bio damage / Round (5), EN save @-8 (0), PR=2, STx2 Range (+12.5), 4 Chrgs (-7.5)",
    "picks": []
   },
   {
    "lo": 62,
    "hi": 63,
    "name": "Poison Vines",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Poison/Venom: 4 Bio damage / Round (10), EN save @-8 (0), PR=2",
    "picks": []
   },
   {
    "lo": 64,
    "hi": 69,
    "name": "Radiated Plant Fiber",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Adaptation: Radiation (5) Plus Power Blast: d6+d8 (12.5), (ST+EN)/2 Range, Damage Type: Other (+10), PR=4 (-7.5)",
    "picks": []
   },
   {
    "lo": 70,
    "hi": 71,
    "name": "Razor-Edged Leaves",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Natural Weaponry: +4 Sharp Kinetic damage (5), Ability Field (+5)",
    "picks": []
   },
   {
    "lo": 72,
    "hi": 73,
    "name": "Saw-Edged Leaves",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Power Blast: d6+1 Kinetic (2.5), No Range (-12.5), Autofire x4 (+22.5), Poor Penetration (-5), PR=0 (+2.5)",
    "picks": []
   },
   {
    "lo": 74,
    "hi": 74,
    "name": "Seed Mobility",
    "cp": "20",
    "cpNum": 20.0,
    "ability": "Duplication: 2 duplicates, PR=0 (20)",
    "picks": []
   },
   {
    "lo": 75,
    "hi": 75,
    "name": "Size Decrease",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Size Change B) Smaller: 1' tall, /6 Profile, x.005 Weight, -2 ST, -2 EN, PR=0, Stays Active (+5), Can't Hold Back (-5)",
    "picks": []
   },
   {
    "lo": 76,
    "hi": 85,
    "name": "Size Increase",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Size Change A) Larger: 10' tall, x1.6 Profile, x4 Weight, +6 ST, +6 EN",
    "picks": []
   },
   {
    "lo": 86,
    "hi": 86,
    "name": "Sonic Attack Ability",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Sonic Abilities A) Sonic Blast: 2d8 (20), Touch Range (-12.5), Area Effect: 7” (+10), Time Requirement: every 3 Rounds (-7.5)",
    "picks": []
   },
   {
    "lo": 87,
    "hi": 88,
    "name": "Squeeze Vines/Roots",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Physical Ability B) Extra Limbs x2 (5), Elongation: 3\" (5), Heightened Strength: +10 (10), Misc: only for squeezing (-5), Body Part (-5)",
    "picks": []
   },
   {
    "lo": 89,
    "hi": 90,
    "name": "Spore Cloud",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Devitalization Ray: 2d10 (0), No Range (-10), Vaporous Area Effect: 7\" (+10), Immunity (+2.5), PR=0 (+7.5)",
    "picks": []
   },
   {
    "lo": 91,
    "hi": 91,
    "name": "Sucker Vines",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Physical Ability B) Extra Limbs x2 (5), Elongation: 3\" (5), Heightened Agility +5 (5), Body Part (-5)",
    "picks": []
   },
   {
    "lo": 92,
    "hi": 93,
    "name": "Tangle Vines",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Physical Ability B) Extra Limbs x2 (5), Grapnel: BrkPnt 7 (17.5), ST+AG Rng, Backlash (-7.5), Body Part (-5)",
    "picks": []
   },
   {
    "lo": 94,
    "hi": 94,
    "name": "Temperature Sensitivity",
    "cp": "-5",
    "cpNum": -5.0,
    "ability": "Weakness: Vulnerability +2 damage from either Energy or Entropy damage types (pick one)",
    "picks": []
   },
   {
    "lo": 95,
    "hi": 95,
    "name": "Texture Change",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Armor: 6 points",
    "picks": []
   },
   {
    "lo": 96,
    "hi": 97,
    "name": "Thorns/Spines",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Natural Weaponry: +2 to hit (5), +4 sharp damage (5)",
    "picks": []
   },
   {
    "lo": 98,
    "hi": 99,
    "name": "Throwing Thorns",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Natural Weaponry: +1 to hit (2.5), +3 sharp damage (2.5), Range ST/2 (+7.5), 24 Charges (-2.5)",
    "picks": []
   },
   {
    "lo": 100,
    "hi": 100,
    "name": "Wings/Gas Bag",
    "cp": "10",
    "cpNum": 10.0,
    "ability": "Flight: 6/96, 33 mph (12.5), Gliding (-5), PR=0 (+2.5)",
    "picks": []
   }
  ]
 },
 "equipment": [
  {
   "die": "d6",
   "name": "Pistols",
   "items": [
    {
     "lo": 1,
     "hi": 2,
     "name": "Slug Thrower",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Special Weapon C) Pistol: d10+1 sharp (5),  GBCx2 Range, Components: 3+ Wealth roll to reload (-10), Field Reloading: 1 Action (+10), 12 Charges (-0)"
    },
    {
     "lo": 3,
     "hi": 4,
     "name": "Machine Pistol",
     "cp": "10",
     "cpNum": 10.0,
     "ability": "Special Weapon B) Machine Pistol: d10+1 Sharp (5),  GBCx2 Range, Autofire x2 (+7.5), Breakdown: Luck save @+10 (-2.5), Components: 3+ Wealth roll to reload (-10), Field Reloading: 1 Action (+10), 12 Charges (-0)"
    },
    {
     "lo": 5,
     "hi": 6,
     "name": "Sawed-Off Double-Barrel Shotgun",
     "cp": "8",
     "cpNum": 8.0,
     "ability": "Special Weapon B) Sawed-off Shotgun: d6+d8 Sharp (10), +2 to hit (+5), GBCx1 Rng (-2.5), Autofire x2 (+7.5), Components: 3+ Wealth roll to reload (-10), Field Reloading: 1 Action (+10), 2 Charges (-12.5)"
    },
    {
     "lo": 6,
     "hi": 7,
     "name": "Needler Pistol",
     "cp": "10",
     "cpNum": 10.0,
     "ability": "Special Weapon B) 2d6 sharp (7.5), Armor Piercing: 3 Kinetic (+5), GBCx2 Range, Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Action (+10), 12 Charges (0), Misc: Android or PSH only (-0)"
    },
    {
     "lo": 8,
     "hi": 9,
     "name": "Stun Ray",
     "cp": "10",
     "cpNum": 10.0,
     "ability": "Paralysis Ray: EN save @ -6 (20), GBCx2\" Range, 8 Charges (0), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Turn (+7.5), Gear (-5), Misc: Android or PSH only (-0)"
    },
    {
     "lo": 10,
     "hi": 11,
     "name": "Laser Pistol",
     "cp": "10",
     "cpNum": 10.0,
     "ability": "Light Control A) Laser: d8+d10 (17.5), Dazzle: EN save @ -10, GBCx4\" Rng (+2.5), 24 Chrgs (0), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Turn (+7.5), Gear (-5), Misc: PSH only (-0)"
    },
    {
     "lo": 12,
     "hi": 13,
     "name": "Mark V Blaster",
     "cp": "13",
     "cpNum": 13.0,
     "ability": "Power Blast: d10+d12 Energy (22.5), GBCx1 Range (0), 12 Charges (-2.5), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Action (+10), Gear (-5), Misc: PSH only (-0)"
    },
    {
     "lo": 14,
     "hi": 15,
     "name": "Black Ray Pistol",
     "cp": "20",
     "cpNum": 20.0,
     "ability": "Death Touch: 2d6 (25), GBCx1 Rng (+10), Not vs. Force Fields (-5), 4 Chrgs (+5), Components: Wealth 5+ to reload (-15), Field Reloading: 3 Rounds (+5), Gear (-5), Misc: PSH only (-0)"
    }
   ]
  },
  {
   "die": "d8",
   "name": "Rifles",
   "items": [
    {
     "lo": 16,
     "hi": 17,
     "name": "Assault Rifle",
     "cp": "20",
     "cpNum": 20.0,
     "ability": "Special Weapon B) Assault Rifle: 2d6 sharp (7.5),  GBCx4 Range (+2.5), 2-Handed (-2.5), Autofire x3 (+15), Components: 3+ Wealth roll to reload (-10), Field Reloading: 1 Action (+10), Breakdown: Luck save @+8 (-5), 24 Charges (+2.5)"
    },
    {
     "lo": 18,
     "hi": 19,
     "name": "Shotgun",
     "cp": "18",
     "cpNum": 18.0,
     "ability": "Special Weapon B) Shotgun: d6+d8 Sharp (10), GBCx2 Rng (0), +3 to hit (+7.5), 2-Handed (-2.5), Components: 3+ Wealth roll to reload (-10), Field Reloading: 1 Action (+10), 8 Charges (-2.5)"
    },
    {
     "lo": 20,
     "hi": 21,
     "name": "Needler Rifle",
     "cp": "15",
     "cpNum": 15.0,
     "ability": "Special Weapon B) 2d8 sharp (12.5), Armor Piercing: 3 Kinetic (+5), GBCx4 Range (+2.5), 2-Handed (-2.5), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Action (+10), 12 Charges (0), Misc: PSH only (-0)"
    },
    {
     "lo": 22,
     "hi": 23,
     "name": "Stun Rifle",
     "cp": "18",
     "cpNum": 18.0,
     "ability": "Paralysis Ray: EN save @ -6 (20), Unconscious (+5), GBCx4\" Range (+2.5), +1 to hit (+2.5), 6 Charges (-2.5), 2-Handed (-2.5), Gear (-5), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Action (+10), Android or PSH only (-0)"
    },
    {
     "lo": 24,
     "hi": 26,
     "name": "Laser Rifle",
     "cp": "20",
     "cpNum": 20.0,
     "ability": "Light Control A) Laser: d10+d12 (22.5), Dazzle: EN save @ -12, GBCx8\" Range (+5), +2 to hit (+5), 24 Charges (0), 2-Handed (-2.5), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Turn (+7.5), Gear (-5), Misc: PSH only (-0)"
    },
    {
     "lo": 27,
     "hi": 28,
     "name": "Mark VII Blaster Rifle",
     "cp": "18",
     "cpNum": 18.0,
     "ability": "Power Blast: 2d12 Energy (25), GBCx2 Range (+2.5), 24 Charges (0), +1 to hit (2.5), 2-Handed (-2.5), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Action (+10), Gear (-5), PSH only (-0)"
    },
    {
     "lo": 29,
     "hi": 30,
     "name": "Fusion Rifle",
     "cp": "20",
     "cpNum": 20.0,
     "ability": "Disintegration Ray: d10+d12 (22.5), GBCx4 Range (+5), +1 to hit (+2.5), 2-Handed (-2.5), Gear (-5), 12 Charges (0), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 1 Action (+10), PSH only (-0)"
    },
    {
     "lo": 31,
     "hi": 32,
     "name": "Black Ray Rifle",
     "cp": "28",
     "cpNum": 28.0,
     "ability": "Death Touch: 2d8 (30), GBCx2 Rng (+12.5), Not vs. Force Fields (-5), 6 Chrgs (+7.5), 2-Handed (-2.5), Components: Wealth 5+ to reload (-15), Field Reloading: 3 Rounds (+5), Gear (-5), PSH only (-0)"
    }
   ]
  },
  {
   "die": "d4",
   "name": "Energy Weapons",
   "items": [
    {
     "lo": 33,
     "hi": 34,
     "name": "Vibro Dagger",
     "cp": "10",
     "cpNum": 10.0,
     "ability": "Special Weapon A) +d4 Sharp Kinetic (2.5), +1 to hit (+2.5), Armor Piercing: 17 (+27.5), 1 Charge (-22.5), Duration: 5 minutes (+10), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 15 minutes (+2.5), Thowable: STx2 Rng (0), PSH only (-0)"
    },
    {
     "lo": 35,
     "hi": 36,
     "name": "Vibro Blade",
     "cp": "15",
     "cpNum": 15.0,
     "ability": "Special Weapon A) +d8+1 Sharp Kinetic (10), +1 to hit (+2.5), Armor Piercing: 17 (+27.5), 1 Charge (-22.5), Duration: 5 minutes (+10), Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 15 minutes (+2.5), Thowable: STx2 Rng (0), PSH only (-0)"
    },
    {
     "lo": 37,
     "hi": 38,
     "name": "Energy Mace",
     "cp": "15",
     "cpNum": 15.0,
     "ability": "Special Weapon A) +d6 Blunt Kinetic (10), Contact Attack (+15), Repulsion Blast : 2d10 (+10), 1 Charge (-20), Duration: 5 minutes (+10), , Components: 4+ Wealth roll to reload (-12.5), Field Reloading: 15 minutes (+2.5), Thowable: STx2 Rng (0), PSH only (-0)"
    },
    {
     "lo": 39,
     "hi": 40,
     "name": "Stun Whip",
     "cp": "10",
     "cpNum": 10.0,
     "ability": "Paralysis Ray: EN save @ -7 (22.5), Unconsciousness (+5), GBC/4\" Rng (-5), +2 to hit (5), 1 Charge with a 1 hour duration (-0), Components: 4+ Wealth roll to reload (-12.5), Gear (-5), Misc: Android or PSH only (-0)"
    }
   ]
  },
  {
   "die": "d6",
   "name": "Grenades",
   "items": [
    {
     "lo": 41,
     "hi": 42,
     "name": "Gas",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Transmutation: \"Tear Gas\" Moderate, -2 to hit & -2 Physical Defense, EN save @-5 (5), Gas (0), 5\" Vaporous Area Effect (+7.5), Different Range BC (+2.5), STx2 Range (0), 3 Charges (0), Components: 3+ Wealth roll to replace (-10)"
    },
    {
     "lo": 43,
     "hi": 44,
     "name": "Chemical",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Chemical Blast: 2d8 Acid Bio (5), STx2 Range (+2.5), 1 minute Duration (+7.5), 3\" Area Effect (+5), 6 Charges (-5), Components: 3+ Wealth roll to replace (-10)"
    },
    {
     "lo": 45,
     "hi": 46,
     "name": "Fragmentation",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Special Missile Weapon B) Frag Grenade: d8+d10 Sharp (15), Different Range BC (+2.5), STx2 Rng, 3\" Area Effect (+5), 4 Charges (-7.5), Components: 3+ Wealth roll to replace (-10)"
    },
    {
     "lo": 47,
     "hi": 48,
     "name": "Energy",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Power Blast: 2d12 Energy (25), No KB (-5), Different Range BC (+2.5), STx2 Range (+2.5), 7\" Area Effect (+10), 4 Charges (-15), Components: 4+ Wealth roll to replace (-12.5), PSH only (-0)"
    },
    {
     "lo": 49,
     "hi": 50,
     "name": "ECM",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Power Blast: 3d8 Energy (27.5), No KB (-5), Different Range BC (+2.5), STx2 Range (+2.5), 5\" Area Effect (+7.5), Only vs. Machines (-5), Components: 4+ Wealth roll to reload (-12.5), 3 Charges (-12.5)"
    },
    {
     "lo": 51,
     "hi": 52,
     "name": "Torc",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Disintegration Ray: 2d10 (20), STx2 Range (+2.5), 3\" Area Effect (+5), 3 Charges (-10), Components: 4+ Wealth roll to replace (-12.5), Misc: usable by PSH only (-0)"
    }
   ]
  },
  {
   "die": "d8",
   "name": "Misc Energy Devices",
   "items": [
    {
     "lo": 53,
     "hi": 54,
     "name": "Portent",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Force Field: 4/4/3/3 (7.5), 3\" Area Effect (+5), 4 Charges: 21 pts defelected per chrg (+10), Components: 4+ Wealth roll to replace (-12.5), Gear (-5), Misc: usable only by PSH (-0)"
    },
    {
     "lo": 55,
     "hi": 56,
     "name": "Energy Cloak",
     "cp": "8",
     "cpNum": 8.0,
     "ability": "Invulnerability: Lasers (5), 1 Charge (-22.5), Duration: 10 hours (+15), Linked (-2.5) / Light Control C) Glare: Visible Light, IR, UV, PR=3 (0), 5\" Diameter (5), 1 Charge (-15), Duration: 10  hours (+17.5), Linked (-2.5) / Light Control D) Glow: 15\" diameter (10), Adjustable size (+5), Moves with self (+5), 24 one-hour charges (0), Components: 4+ Wealth roll to replace (-12.5), Misc: usable only by androids or PSH (-0)"
    },
    {
     "lo": 57,
     "hi": 58,
     "name": "Control Baton",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Lightning Control C) Gear Control: EN save @ -8 (17.5), GBCx2 Range, Silent (+5), Gear (-5), 6 Charges (0), Components: 4+ Wealth roll to replace (-12.5), Misc: usable only by PSH (-0)"
    },
    {
     "lo": 59,
     "hi": 60,
     "name": "Comm Sender",
     "cp": "3",
     "cpNum": 3.0,
     "ability": "Communicators (5): 80 miles (+2.5), 12 one-hour charges, Beacon (+5), Components: 3+ Wealth roll to replace (-10)"
    },
    {
     "lo": 61,
     "hi": 62,
     "name": "Medi-Kit",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Knowledge: Medicine (5), MF Gear (-2.5) / Healing: 1 Hit/9 Rounds (10), MF Gear (-2.5), 24 Chrgs / Negation: +3 save bonus vs Bio damage, Time Reduction: 1 minute (12.5), MF Gear (-2.5), 8 Ch (-5), Components: 3+ Wealth roll to replace (-10), Misc: only usable by androids or PSH (-0)"
    },
    {
     "lo": 63,
     "hi": 64,
     "name": "Anti-Grav Sled",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "See separate vehicle sheet"
    },
    {
     "lo": 65,
     "hi": 66,
     "name": "IR Goggles",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Ht. Senses: Infrared, Full (10), Range (5), Protected Sight (+5), Gear (-5), 24 one-hour charges (-2.5),  Components: 3+ Wealth roll (-10)"
    },
    {
     "lo": 67,
     "hi": 68,
     "name": "Life Ray",
     "cp": "15",
     "cpNum": 15.0,
     "ability": "Revivication: 23 target number (22.5), GBC/4 Range (+5), Time Requirement: 2 Rounds (+5), 1 Charge (0), Gear (-5), Components: 4+ Wealth roll (-12.5), Misc: only usable by PSH (-0)"
    }
   ]
  },
  {
   "die": "d8",
   "name": "Drugs",
   "items": [
    {
     "lo": 69,
     "hi": 70,
     "name": "Pain Reducer",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Willpower B) Pain Resistance (10), Usable by Others (+5), 2 one-hour Charges (+5), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 71,
     "hi": 72,
     "name": "Mind Booster",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Heightened Defense: +4 vs Mental (10), Usable by Others (+5), 2 one-hour Charges (+5), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 73,
     "hi": 74,
     "name": "Interra Shot",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Mind Control: IN save @ -10 (30), Bio damage (-5), Single Command: Truth (-5), Duration: 5 minutes between saves (+10), Touch Range (-12.5), 4 Charges (+2.5), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 75,
     "hi": 76,
     "name": "Stim Dose",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Ht. Strength +3 (3), Ht. Agility (+2), Usable by Others (+5), 8 ten-hour charges (+10), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 77,
     "hi": 78,
     "name": "Cur-in Dose",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Negation: Bio damage, 1 hour Time Reduction, +4 save (20), 2 Charges (-15), Duration: 1 hour (+15), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 79,
     "hi": 80,
     "name": "Suggestion Change",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Mind Control: IN save @ -10 (30), Bio damage (-5), Duration: 5 minutes between saves (+10), Touch Range (-12.5), 2 Charges (-2.5), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 81,
     "hi": 82,
     "name": "Accelera Dose",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Healing: 6 Hits/Round (30), Bio Damage Type (-5), 8 Charges (-5), Components: 3+ Wealth roll (-10), Gear (-5)"
    },
    {
     "lo": 83,
     "hi": 84,
     "name": "Anti-radiation Serum",
     "cp": "5",
     "cpNum": 5.0,
     "ability": "Negation: Radiation dmg, 1 hour Time Reduction, +4 save (20), 2 Charges (-15), Duration: 1 hour (+15), Components: 3+ Wealth roll (-10), Gear (-5)"
    }
   ]
  },
  {
   "die": "d6",
   "name": "Defensive Armor",
   "items": [
    {
     "lo": 85,
     "hi": 86,
     "name": "Sheath",
     "cp": "3",
     "cpNum": 3.0,
     "ability": "Armor: 2/1/1/1 (7.5), Partial Protection / Heavy (-5), Gear (-5)"
    },
    {
     "lo": 87,
     "hi": 88,
     "name": "Powered Plate",
     "cp": "13",
     "cpNum": 13.0,
     "ability": "Armor: 3/2/2/2 (15), 4 Charges (-12.5), Duration: 10 hours (+20), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Speed: 12/48, 16 mph (2.5), PR=0 (+2.5), Linked (-2.5)"
    },
    {
     "lo": 89,
     "hi": 90,
     "name": "Powered Alloyed Plate",
     "cp": "18",
     "cpNum": 18.0,
     "ability": "Armor: 3/3/2/3 (17.5), 4 Charges (-12.5), Duration: 10 hours (+20), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Speed: 16/64, 21 mph (5), PR=0 (+2.5), Linked (-2.5)"
    },
    {
     "lo": 91,
     "hi": 92,
     "name": "Plastic",
     "cp": "8",
     "cpNum": 8.0,
     "ability": "Armor: 2/2/2/2 (12.5), Partial Protection / Heavy (-5)"
    },
    {
     "lo": 93,
     "hi": 94,
     "name": "Energized",
     "cp": "20",
     "cpNum": 20.0,
     "ability": "Armor: 3/2/2/2 (15), 2 Charges (-17.5), Duration: 10 hours (+20), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Physical Ability F) Super Leap x128\" (17.5), Linked (-2.5)"
    },
    {
     "lo": 95,
     "hi": 96,
     "name": "Inertia",
     "cp": "15",
     "cpNum": 15.0,
     "ability": "Armor: 3/2/2/2 (15), 2 Charges (-17.5), Duration: 10 hours (+20), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Physical Ability F) Super Leap x128\" (17.5), Misc: -1 Phys Def (-2.5), Linked (-2.5), MF Gear (-2.5) / Invulnerability: Black Rays (5), Radiation (5), 1 Charge (-22.5), Duration: 10 hours (+15), Linked (-2.5)"
    }
   ]
  },
  {
   "die": "d4",
   "name": "Offensive Armor",
   "items": [
    {
     "lo": 97,
     "hi": 97,
     "name": "Powered Scout",
     "cp": "25",
     "cpNum": 25.0,
     "ability": "Armor: 3/2/2/2 (15), 1.5 Charges (-20), Duration: 1.5 days (+22.5), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Flight: 8/128, 44 mph (15), PR=0 (+2.5), Linked (-2.5) / Adaptation: Doesn't Breathe (5), Linked (-2.5) / Force Field: 4/4/3/3 (7.5), 1 Charge: 21 pts defelected (-2.5), Linked (-2.5)"
    },
    {
     "lo": 98,
     "hi": 98,
     "name": "Powered Battle",
     "cp": "35",
     "cpNum": 35.0,
     "ability": "Armor: 3/2/2/2 (15), 1.5 Charges (-20), Duration: 1.5 days (+22.5), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Flight: 4/64, 21 mph (10), PR=0 (+2.5), Linked (-2.5) / Adaptation: Doesn't Breathe (5), Linked (-2.5) / Force Field: 5/5/5/5 (15), 1 Charge: 30 pts defelected (-2.5), Linked (-2.5) / Telekinesis: 1920 lbs / 2d6 damage (15), Touch Range (-10), PR=0 (+2.5), Linked (-2.5)"
    },
    {
     "lo": 99,
     "hi": 99,
     "name": "Powered Attack",
     "cp": "65",
     "cpNum": 65.0,
     "ability": "Armor: 3/3/3/3 (20), 1.5 Charges (-20), Duration: 1.5 days (+22.5), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Flight: 6/96, 33 mph (12.5), PR=0 (+2.5), Linked (-2.5) / Force Field: 7/7/7/7 (25), 1 Charge: 42 pts defelected (-2.5), Linked (-2.5) / Telekinesis: 1920 lbs / 2d6 damage (15), Touch Range (-10), PR=0 (+2.5), Linked (-2.5) / Light Control A) Laser: d8+d10 (17.5), Dazzle: EN save @ -10, GBCx4\" Rng (+2.5), PR=0 (+2.5), Linked (-2.5)"
    },
    {
     "lo": 100,
     "hi": 100,
     "name": "Powered Assault",
     "cp": "75",
     "cpNum": 75.0,
     "ability": "Armor: 3/3/3/3 (20), 1.5 Charges (-20), Duration: 1.5 days (+22.5), Components: 4+ Wealth roll (-12.5), Misc: usable only by PSH (-0) / Flight: 12/192, 66 mph (17.5), PR=0 (+2.5), Linked (-2.5) / Force Field: 8/8/8/8 (30), 1 Charge: 48 pts defelected (-2.5), Linked (-2.5) / Telekinesis: 1920 lbs / 2d6 damage (15), Touch Range (-10), PR=0 (+2.5), Linked (-2.5) / Light Control A) Laser: d8+d10 (17.5), Dazzle: EN save @ -10, GBCx4\" Rng (+2.5), PR=0 (+2.5), Linked (-2.5)"
    }
   ]
  },
  {
   "die": "",
   "name": "Primitive Weapon",
   "items": []
  },
  {
   "die": "",
   "name": "Melee Weapon",
   "items": []
  }
 ]
}; })();
