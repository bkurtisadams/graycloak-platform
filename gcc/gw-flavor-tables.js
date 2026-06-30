// gw-flavor-tables.js v0.1.0 — Gamma World 1e flavor for the MP-structured roller
// EDITABLE STARTER CONTENT. None of this is GW 1e RAW (the system is rules-light
// on backstory); these are house tables that fill MP's narrative slots with a
// Gamma World feel. Trim, expand, or replace freely. Cryptic Alliance names below
// are the well-known ones — verify against your 1e book and cut any that are off.
(function(){
  const cultures = [
    'Primitive tribe', 'Cryptic Alliance initiate', 'Ruin-clan', 'Nomad band',
    'Pure-strain enclave', 'Mutant collective', 'Ancient-city dweller',
    'Knights of Genetic Purity (anti-mutant purists)',
    'The Healers (restore pre-war medicine)',
    'The Restorationists (rebuild old-world tech)',
    'The Iron Society (mutant supremacists)',
    'The Followers of the Voice (cryptic computer cult)',
    'The Brotherhood of Thought (peace among all sentients)',
    'The Friends of Entropy (tear it all down)',
    'The Seekers (destroy ancient technology)',
    'The Zoopremists (mutated-animal supremacists)',
    'The Ranks of the Fit (warlord conquerors)',
    'The Radioactivists (worship the Glow)',
    'The Archivists (hoard pre-war knowledge)',
    'The Programmers (revere the machine-mind)',
  ];
  const backgrounds = [
    'Scavenger', 'Tribal hunter', 'Ruin-delver', 'Mutant shaman', 'Caravan guard',
    'Beast-tamer', 'Artifact-tinker', 'Healer\u2019s apprentice', 'Trapper', 'Forager',
    'Wasteland scout', 'Cryptic Alliance agent', 'Slave-pit escapee', 'Trade-tongue broker',
    'Hot-zone prospector', 'Village smith', 'Border raider', 'Wandering storyteller',
    'Relic-hunter', 'Marsh-farmer',
  ];
  const motivations = [
    'Survive and rebuild', 'Reclaim lost knowledge', 'Protect the tribe',
    'Hunt the Ancients\u2019 tech', 'Avenge a destroyed home', 'Unite the wasteland',
    'Hoard artifacts', 'Explore beyond the known lands', 'Cleanse the impure',
    'Free the enslaved', 'Master a strange mutation', 'Find others of my kind',
    'Settle a blood-debt', 'Map the Death Lands', 'Serve a Cryptic Alliance',
    'Escape a prophecy', 'Tame the Glow', 'Build a safe haven',
  ];
  const origins = [
    'Spontaneous mutation', 'Inherited mutant line', 'Radiation exposure',
    'Ancient-lab escapee', 'Selective breeding stock', 'Born in a hot-zone',
    'Touched by a relic', 'Chemical exposure', 'Uplifted by the Ancients',
    'Crossbred experiment', 'Survived a Death-Machine attack', 'Hatched near a reactor',
  ];
  const birthplaces = [
    'The Glowing Wastes', 'The Death Lands', 'A ruined arcology', 'The Glowing Marsh',
    'A nomad caravan', 'The Iron Wastes', 'A buried vault', 'The Cryptic spires',
    'A radiation barrens', 'The Pure enclave',
  ];
  // Name parts — wasteland / mutant flavor
  const givens = [
    'Uruk', 'Artur', 'Kael', 'Brann', 'Sora', 'Vex', 'Mira', 'Tharn', 'Zeb', 'Ola',
    'Rhul', 'Kessa', 'Dorn', 'Yara', 'Grimm', 'Senna', 'Koro', 'Liss', 'Varn', 'Tully',
    'Ash', 'Pell', 'Nara', 'Goll', 'Sef', 'Rax', 'Iva', 'Bly', 'Cade', 'Ren',
    'Mox', 'Tib', 'Hessa', 'Drev', 'Lune', 'Garr', 'Sib', 'Oren', 'Vasha', 'Krell',
  ];
  const bynames = [
    'of Meresmire', 'the Scaled', 'Ironclaw', 'Three-Eyes', 'of the Glow', 'Ruinwalker',
    'the Pale', 'Gravelfoot', 'of the Iron Wastes', 'Sparkhand', 'the Hollow', 'Quillback',
    'of the Deep Vault', 'Ashborn', 'the Twice-Mutated', 'Greenblood', 'of Tribe Karn',
    'Stormtaste', 'the Unbroken', 'of the Marsh', 'Coldspark', 'the Two-Headed', 'Rustbane',
  ];

  function pick(list){ return (list && list.length) ? list[Math.floor(Math.random() * list.length)] : ''; }
  function rollName(){
    const g = pick(givens);
    // ~65% of names carry a byname
    return Math.random() < 0.65 ? `${g} ${pick(bynames)}` : g;
  }

  window.GWFlavor = {
    version: '0.1.0',
    cultures, backgrounds, motivations, origins, birthplaces,
    names: { givens, bynames },
    pick, rollName,
  };
})();
