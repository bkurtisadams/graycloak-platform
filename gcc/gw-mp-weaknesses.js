// gw-mp-weaknesses.js v0.1.0 — MP 2.3 rulebook weaknesses for gw-character.html
// SCAFFOLD: entries below are placeholders pending the MP 2.3 text.
// Schema per entry:
//   name    : weakness name as printed in MP 2.3
//   cp      : display cost string (negative), e.g. "-10"   (omit when using picks)
//   cpNum   : numeric cost (negative)                       (omit when using picks)
//   ability : MP rules text / effect summary
//   picks   : optional [{name, cp, cpNum, ability}] for variable-value weaknesses
//             (severity/rarity tiers) — one is chosen when picked or rolled
//   exempt  : true = does NOT count toward the -20 CP creation limit (Animal/Plant)
(function(){ window.GWMPWeaknesses = {
  version: "0.1.0",
  list: [
    // Grounded in existing project data (gw-warheroes.js commando training):
    { name: "Subject to Orders", cp: "-5", cpNum: -5,
      ability: "Bound to obey a superior authority; refusal risks sanction (MP 2.3)" },
    // TODO: populate from MP 2.3 — names, values, and effect text verbatim.
    // Expected entries include (values UNVERIFIED, do not trust until filled from the book):
    // Phobia (severity picks), Prejudice, Nemesis, Special Requirement,
    // Diminished Senses, Physical Handicap (degree picks),
    // Susceptibility (rarity picks), Vulnerability (rarity picks),
    // Watched, Animal/Plant (exempt: true, degree picks), ...
  ]
};})();
