// gw-cryptic-alliances.js v0.1.0 — Place of Birth 01-80 Alliance table
// DERIVED from the 1e Cryptic Alliance descriptions (prose, not a RAW table):
// d100 ranges are even placeholders; species/culture/side are interpreted. Edit freely.
(function(){ window.GWCrypticAlliances = {
 "version": "0.1.0",
 "_note": "Species/culture/side/ranges DERIVED from prose descriptions — verify & re-weight.",
 "alliances": [
  {
   "lo": 1,
   "hi": 8,
   "name": "Brotherhood of Thought",
   "species": "roll",
   "culture": "Mixed",
   "side": "Good",
   "note": "Unify all intelligent creatures; travel in human+humanoid+animal trios."
  },
  {
   "lo": 9,
   "hi": 16,
   "name": "The Seekers",
   "species": "psh-or-humanoid",
   "culture": "Mixed",
   "side": "Neutral",
   "note": "Appear human; hate technology and seek to erase it."
  },
  {
   "lo": 17,
   "hi": 24,
   "name": "Knights of Genetic Purity",
   "species": "psh",
   "culture": "Mixed",
   "side": "Evil",
   "note": "Pure Strain Human purists out to destroy mutated humans."
  },
  {
   "lo": 25,
   "hi": 32,
   "name": "Friends of Entropy",
   "species": "roll",
   "culture": "Primitive",
   "side": "Evil",
   "note": "The \"Red Death\" — extinguish all life and machines."
  },
  {
   "lo": 33,
   "hi": 40,
   "name": "The Iron Society",
   "species": "humanoid",
   "culture": "High Tech",
   "side": "Evil",
   "note": "Human mutants bent on destroying Pure Strain Humans."
  },
  {
   "lo": 41,
   "hi": 48,
   "name": "Zoopremisists",
   "species": "animal",
   "culture": "Mixed",
   "side": "Evil",
   "note": "Thinking mutant animals who would rule over all."
  },
  {
   "lo": 49,
   "hi": 56,
   "name": "Healers",
   "species": "roll",
   "culture": "High Tech",
   "side": "Good",
   "note": "Quasi-monastic order caring for sick of any origin."
  },
  {
   "lo": 57,
   "hi": 64,
   "name": "Restorationists",
   "species": "psh-or-humanoid",
   "culture": "High Tech",
   "side": "Neutral",
   "note": "Rebuild lost civilization; work with robots."
  },
  {
   "lo": 65,
   "hi": 72,
   "name": "Followers of the Voice",
   "species": "roll",
   "culture": "High Tech",
   "side": "Neutral",
   "note": "Worship computers as creators and restorers."
  },
  {
   "lo": 73,
   "hi": 79,
   "name": "The Ranks of the Fit",
   "species": "roll",
   "culture": "Mixed",
   "side": "Evil",
   "note": "Military-religious order; only mutant animals may rule."
  },
  {
   "lo": 80,
   "hi": 86,
   "name": "The Archivists",
   "species": "humanoid",
   "culture": "Mixed",
   "side": "Neutral",
   "note": "Small humanoids who hoard and worship artifacts."
  },
  {
   "lo": 87,
   "hi": 93,
   "name": "The Radioactivists",
   "species": "animal-or-humanoid",
   "culture": "Primitive",
   "side": "Neutral",
   "note": "Radiation cultists with high rad resistance."
  },
  {
   "lo": 94,
   "hi": 100,
   "name": "The Created",
   "species": "tech",
   "culture": "High Tech",
   "side": "Evil",
   "note": "Android-only cult; machine-created life should rule."
  }
 ],
 "speciesPools": {
  "psh-or-humanoid": [
   "Pure Strain Human",
   "Humanoid (Mutant)"
  ],
  "animal-or-humanoid": [
   "Mutated Animal",
   "Humanoid (Mutant)"
  ]
 },
 "sideByFaction": {
  "Good": "Good",
  "Neutral": "Neutral",
  "Evil": "Evil"
 }
}; })();
