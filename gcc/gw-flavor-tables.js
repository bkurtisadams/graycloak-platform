// gw-flavor-tables.js v0.1.1 — Gamma World 1e flavor for the MP-structured roller
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
  // Motivations follow MP's two tables (Superhero / Supervillain), reflavored
  // for the wasteland. Publicity Seeker is dropped (no mass media out here);
  // Rebuild (hero) and Zealotry (villain) are GW-native additions.
  const heroMotivations = [
    'Penance \u2014 atone for a wrong you once did your tribe or kind',
    'Vengeance \u2014 make those who destroyed your home or people pay',
    'Utopian \u2014 live up to a creed or Cryptic Alliance ideal, and lead by example',
    'Thrill Seeker \u2014 chase the rush of wasteland danger',
    'Duty Bound \u2014 carry on a tradition or guard a settlement that depends on you',
    'Need To Know \u2014 uncover the secrets of the Ancients, relics, and mutations',
    'For Hire \u2014 sell your skills to those who can pay, but never to the cruel',
    'Self-Defense \u2014 strike first at the warlords and machines hunting you',
    'Glory Hound \u2014 earn the awe and gratitude of the wasteland\u2019s peoples',
    'Carnage \u2014 you love to wreck things \u2014 better the Death Machines and raiders than anyone',
    'Justice \u2014 see raiders, slavers, and tyrants answer for their crimes',
    'Rebuild \u2014 drag civilization back from the ashes and make it last',
  ];
  const villainMotivations = [
    'Insanity \u2014 a radiation-twisted mind bent on something extreme and irrational',
    'Vengeance \u2014 pay back those you blame, or take it out on the world',
    'Dystopian \u2014 impose an oppressive new order on the wasteland',
    'Thrill Seeker \u2014 live for the thrill of bold and terrible deeds',
    'Anarchist \u2014 tear down every authority that dares to rebuild',
    'Prejudice \u2014 hate and hunt a kind not your own \u2014 mutant, pure-strain, or beast',
    'Mercenary / Servitor \u2014 perform any cruelty for the right price or master',
    'Greedy / Egotist \u2014 seize artifacts, power, and a destiny you believe you are owed',
    'Belligerent / Carnage \u2014 destroy the old, the famous, and the venerated for the joy of it',
    'Survival \u2014 driven by needs and hungers you cannot control',
    'Dupe \u2014 serve a Cryptic Alliance or ancient machine, unaware you fight for evil',
    'Conquest \u2014 dominate the wasteland; no domain ever feels like enough',
    'Twisted Honor \u2014 commit atrocities in service of a warped creed or code',
    'Opportunist \u2014 break any law of the new world when you can get away with it',
    'Zealotry \u2014 serve the Glow or a machine-god and remake all in its image',
  ];
  const motivations = heroMotivations.concat(villainMotivations);
  function motivationsBySide(side){
    if(side==='Good')return heroMotivations.slice();
    if(side==='Evil')return villainMotivations.slice();
    return heroMotivations.concat(villainMotivations);
  }
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
    version: '0.1.1',
    cultures, backgrounds, motivations, heroMotivations, villainMotivations, motivationsBySide, origins, birthplaces,
    names: { givens, bynames },
    pick, rollName,
  };
})();
