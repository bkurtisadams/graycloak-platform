# GW1e to MP Bestiary Audit

**Status:** first-pass review of Arn, Badder, and Barl Nep. This is an audit report; it does not alter generated data or creature entries.

## System decisions used

- Map only stated GW BCs directly. HD is not MP EN, Hits, or Experience Levels.
- Keep GW Mental Strength separate for converted GW mental mutations.
- Split GW AC by its described source and calibrate against a representative physical matrix result.
- Use individually priced MP Abilities for authored creatures; do not impose the Animal/Plant bundle or its weaknesses.
- Apply normal MP BC, Ability, and damage caps from the creature's actual CP total.
- Convert GW radiation through MP Change Environment and Hard Radiation, not the GW radiation matrix.

## Arn

**Existing entry:** A/P Insect Low; ST 7, EN 8, AG 14; Flight and Natural Weaponry are bundled; Armor 2.

**Issues**

- The mandatory A/P bundle creates unsupported weaknesses and makes Flight/Natural Weaponry fixed 10-CP selections.
- A 1.3 m flying insect should use Size Change B: Smaller at the 4.5-foot tier, with Non-Proportional Flight so its flight movement is not reduced.
- Flight should carry the Wings modifier. The existing 16 m/turn notation does not identify an MP flight tier or its acceleration/top speed.
- Armor 2 is not explained by the source; AC 9 is better treated mostly as the normal result of being an agile, small mount.

**Recommended rework target**

- Final BCs: ST 12, EN 12, AG 15, IN 6, CL 9.
- Size Change B: Smaller (4.5 feet) + Non-Proportional Flight.
- Winged Flight 3/48; Natural Weaponry attack +0, sharp damage +4.
- Heightened Physical Defense +3. This gives Physical Defense 4 and a bite attack of 14-, which reproduces the selected source checks against a shielded Badder and the Arn's AC 9 role.

## Badder

**Existing entry:** ST 12, EN 6, AG 18, IN 13, CL 16; Empathy as Telepathy plus Mood Reading; Armor 3; Heightened Cool partly represents MS 16.

**Issues**

- GW MS 16 was folded into CL 16. MS must remain separate; the source gives no GW Charisma value supporting that high CL.
- MP Telepathy/Mood Reading does not reproduce source Empathy, which can force emotions only on non-intelligent creatures.
- Armor 3 is unsupported unless the individual Badder is actually wearing armor. A shield and simple armor should be listed as equipment, not innate biology.

**Recommended rework target**

- Final BCs: ST 12, EN 6, AG 18, IN 12, CL 12; GW MS 16.
- Hard of hearing as the stated Diminished Senses weakness; keen smell as Heightened Senses.
- Empathy as a GW-MS-derived mood effect against non-intelligent targets: MS 16 attacking MS 12 is 15- (75%). Do not add MP Emotion Control's normal second Intelligence save.
- A trained warrior may have 5 CP of Experience Levels and a shield. This produces Physical Defense 7 while shielded; the Badder's class-3 weapon attack against an Arn matches the selected Matrix I check.

## Barl Nep

**Existing entry:** A/P Fish High; base EN 14 plus Heightened EN +6; Armor 12; Change Environment Hard Radiation 11 inches; approximately 85 CP.

**Issues**

- HD 20 was converted directly into EN 20 and a High A/P package. Neither follows the revised procedure.
- Armor 12 is not supported by the description of a one-metre fish. AC 3 should be modeled largely as Physical Defense, then checked against the source natural-attack matrix.
- The radiation area is wrong: 10 m is approximately 7 inches, not 11 inches.
- The entry should not treat its oil as a generic moving Change Environment aura.

**Recommended rework target**

- Final BCs: ST 8, EN 12, AG 19, IN 4, CL 8; GW MS 10 only if needed.
- Size Change B: Smaller (3 feet), Non-Proportional Swimming, Heightened Physical Defense +6, modest Durability +10, Adaptation: Radiation, and bite Natural Weaponry (+2 attack, +2 sharp damage).
- Hits 19, Power 43, Swim Move 13, Physical Defense 8, Mental Defense -2; bite 17-, d3+2 sharp.
- When attacked: stationary 7-inch, 10-minute Change Environment Hard Radiation slick. It inflicts 5 points of Devitalization Entropy per round under normal MP rules. Use Activation Power (PR 2 once), not a continuing PR cost.
- A dead Barl Nep yields a one-use 7-inch, 10-minute ordinary-radiation slick (1 Devitalization Entropy per round). Treat it as recoverable hazard/treasure, not another living-creature attack.

## Next implementation order

1. Confirm the proposed rework targets.
2. Update the Markdown bestiary entries.
3. Regenerate `gcc/gw-mp-bestiary.js`; do not edit the generated file directly.
