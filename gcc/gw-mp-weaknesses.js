// gw-mp-weaknesses.js v1.0.0 — MP 2.3 Weaknesses for gw-character.html
// Source: Mighty Protectors section 2.3 (values and tiers as printed).
// Schema: {name, cp, cpNum, ability} or {name, ability, picks:[{name,cp,cpNum,ability}]}
// NOTE: no entry here carries exempt:true — the -20-limit exemption applies only to
// weaknesses granted via the Animal/Plant Ability (2.2), set at grant time.
(function(){ window.GWMPWeaknesses = {
  version: "1.0.0",
  list: [
    { name:"Diminished Senses", ability:"A default sense is limited (MP 2.3)", picks:[
      {name:"Blind",cp:"-15",cpNum:-15,ability:"No sight in the visible spectrum"},
      {name:"Deaf",cp:"-20",cpNum:-20,ability:"No hearing in the normal range; knows sign language or equivalent"},
      {name:"Can't Feel Pain",cp:"-5",cpNum:-5,ability:"IN save to notice damage from surprise attacks"},
      {name:"Dayblind",cp:"-2.5",cpNum:-2.5,ability:"Sight reduced to Basic in full sun / bright light"},
      {name:"Farsighted",cp:"-2.5",cpNum:-2.5,ability:"Only Basic sight within 5\""},
      {name:"Nearsighted",cp:"-2.5",cpNum:-2.5,ability:"Only Basic sight beyond 4\""},
      {name:"No Visual Depth Perception",cp:"-5",cpNum:-5,ability:"-2 sight perception and sight-based to-hit beyond 1\""},
      {name:"Partially Color-Blind",cp:"-2.5",cpNum:-2.5,ability:"Cannot distinguish one color pair"},
      {name:"Totally Color-Blind",cp:"-5",cpNum:-5,ability:"Sees only black and white"},
      {name:"Imperceptive (one sense, -3)",cp:"-5",cpNum:-5,ability:"-3 perception checks with one sense; -5 CP per additional -3"},
      {name:"Imperceptive (all senses, -3)",cp:"-10",cpNum:-10,ability:"-3 on all perception checks; -10 CP per additional -3"}
    ]},
    { name:"Distinctive", ability:"Unusual-looking: skin color, odor, behavior, etc. (MP 2.3)", picks:[
      {name:"Noticeable (Difficult to disguise)",cp:"-5",cpNum:-5,ability:"-4 task check to disguise as a typical person"},
      {name:"Noticeable (Impossible to disguise)",cp:"-10",cpNum:-10,ability:"-10 task check; cannot pass as a typical person"},
      {name:"Unattractive (-2 reactions)",cp:"-5",cpNum:-5,ability:"-2 CL save penalty where looks matter; -5 CP per additional -2"},
      {name:"Unattractive (-4 reactions)",cp:"-10",cpNum:-10,ability:"-4 CL save penalty where looks matter"}
    ]},
    { name:"Low Self-Control", ability:"Cannot control an aspect of own abilities or behavior (MP 2.3)", picks:[
      {name:"Can't Hold Back",cp:"-10",cpNum:-10,ability:"Cannot pull damage on any attack; greater accidental-death risk"},
      {name:"Compulsion (rare stimulus)",cp:"-2.5",cpNum:-2.5,ability:"Stimulus ~1/5 episodes; control modifiers add -2.5 (hook) / -5 (CL save) / -10 (CL save at -4); CL save 1/round to recover, -4 if stimulus present"},
      {name:"Compulsion (uncommon stimulus)",cp:"-5",cpNum:-5,ability:"Stimulus ~1/2.5 episodes; control modifiers add -2.5 / -5 / -10 as above"},
      {name:"Compulsion (very common stimulus)",cp:"-10",cpNum:-10,ability:"Stimulus almost every episode; control modifiers add -2.5 / -5 / -10 as above"},
      {name:"Fumble-Prone (-1 threshold)",cp:"-5",cpNum:-5,ability:"Fumble threshold worsens by 1 (e.g. 19-20)"},
      {name:"Fumble-Prone (-2 threshold)",cp:"-10",cpNum:-10,ability:"Fumble threshold worsens by 2 (e.g. 18-20)"}
    ]},
    { name:"Lowered Intelligence", ability:"IN below normal, possibly with a related BC; roll d10 for term: 1-2 Dumb (IN only), 3-4 Deficient (IN+ST), 5-6 Impaired (IN+EN), 7-8 Bumbling (IN+AG), 9-10 Dense (IN+CL); re-roll if it conflicts with a Heightened BC; no BC below 0 (MP 2.3)", picks:[
      {name:"(-5) tier",cp:"-5",cpNum:-5,ability:"-5 IN, or -3 IN with -2 in the paired BC"},
      {name:"(-10) tier",cp:"-10",cpNum:-10,ability:"-10 IN, or -6 IN with -4 in the paired BC"},
      {name:"(-15) tier",cp:"-15",cpNum:-15,ability:"-9 IN with -6 in the paired BC, or -15 IN"},
      {name:"(-20) tier",cp:"-20",cpNum:-20,ability:"-12 IN with -8 in the paired BC, or -20 IN"},
      {name:"Non-Sentient",cp:"-10",cpNum:-10,ability:"Cannot speak or operate machinery; IN used only for perception and animal cunning"}
    ]},
    { name:"Nemesis", ability:"A personal enemy who wishes the character ill; killing it spawns a replacement or an equal-CP weakness (MP 2.3)", picks:[
      {name:"Weaker, rare",cp:"-5",cpNum:-5,ability:"20-40 CP weaker; appears ~1/10 episodes"},
      {name:"Weaker, uncommon",cp:"-7.5",cpNum:-7.5,ability:"20-40 CP weaker; ~1/5 episodes"},
      {name:"Weaker, common",cp:"-12.5",cpNum:-12.5,ability:"20-40 CP weaker; ~1/2.5 episodes"},
      {name:"Equal, rare",cp:"-7.5",cpNum:-7.5,ability:"Within 20 CP; ~1/10 episodes"},
      {name:"Equal, uncommon",cp:"-10",cpNum:-10,ability:"Within 20 CP; ~1/5 episodes"},
      {name:"Equal, common",cp:"-15",cpNum:-15,ability:"Within 20 CP; ~1/2.5 episodes"},
      {name:"Stronger, rare",cp:"-12.5",cpNum:-12.5,ability:"20-40 CP stronger; ~1/10 episodes"},
      {name:"Stronger, uncommon",cp:"-15",cpNum:-15,ability:"20-40 CP stronger; ~1/5 episodes"},
      {name:"Stronger, common",cp:"-20",cpNum:-20,ability:"20-40 CP stronger; ~1/2.5 episodes"}
    ]},
    { name:"Personal Problem", ability:"A distraction from the character's past, personal, or professional life (MP 2.3)", picks:[
      {name:"Agent, Pupil or Employee (rare)",cp:"-5",cpNum:-5,ability:"Bossed around ~1/5 episodes; special assistance bought separately"},
      {name:"Agent, Pupil or Employee (common)",cp:"-10",cpNum:-10,ability:"Bossed around ~1/2.5 episodes"},
      {name:"Agent, Pupil or Employee (constant)",cp:"-15",cpNum:-15,ability:"Bossed around almost every episode"},
      {name:"Dark Past",cp:"-5",cpNum:-5,ability:"Deep secret; if exposed becomes -10 CP Prejudice equivalent (still grants only -5)"},
      {name:"Dependent (occasional trouble)",cp:"-5",cpNum:-5,ability:"Must protect a dependent who is occasionally in trouble"},
      {name:"Dependent (frequent serious trouble)",cp:"-10",cpNum:-10,ability:"Dependent frequently in serious trouble"},
      {name:"Public Identity",cp:"-10",cpNum:-10,ability:"No secret identity; family and personal life exposed (unavailable if no personal life to protect)"},
      {name:"Unusual Age",cp:"-5",cpNum:-5,ability:"Treated as a social inferior: 'too old' or 'too young'"}
    ]},
    { name:"Phobia", ability:"Deathly afraid of something; CL save not to flee, cannot confront it directly even on success (MP 2.3)", picks:[
      {name:"Rare object of fear",cp:"-5",cpNum:-5,ability:"Feared thing appears ~1/5 episodes"},
      {name:"Common object of fear",cp:"-10",cpNum:-10,ability:"~1/2.5 episodes"},
      {name:"Very common object of fear",cp:"-15",cpNum:-15,ability:"Almost every episode"}
    ]},
    { name:"Physical Disability", ability:"Physical limitations most humans lack (MP 2.3)", picks:[
      {name:"Big (x2 Profile)",cp:"-5",cpNum:-5,ability:"Profile x2 (weight x8 optional); easier to hit, range penalties vs smaller targets"},
      {name:"Big (x4 Profile)",cp:"-10",cpNum:-10,ability:"Profile x4 (weight x64 optional)"},
      {name:"Big (x8 Profile)",cp:"-15",cpNum:-15,ability:"Profile x8 (weight x512 optional)"},
      {name:"Big (x16 Profile)",cp:"-20",cpNum:-20,ability:"Profile x16 (weight x4096 optional)"},
      {name:"Epileptic",cp:"-15",cpNum:-15,ability:"EN save @ -4 vs bright flashing lights or seizure; recover on save @ -8 1/round"},
      {name:"One-Handed (off-hand lost)",cp:"-5",cpNum:-5,ability:"Cannot use two-handed Gear; no save penalty"},
      {name:"One-Handed (good hand lost)",cp:"-10",cpNum:-10,ability:"Cannot use two-handed Gear; -2 on manual-dexterity saves"},
      {name:"Mute",cp:"-5",cpNum:-5,ability:"No speech; knows sign language or equivalent"},
      {name:"Slow (2/3 Move)",cp:"-5",cpNum:-5,ability:"Ground Move x2/3, round up"},
      {name:"Slow (1/3 Move)",cp:"-10",cpNum:-10,ability:"Ground Move x1/3, round up"},
      {name:"Slow (cannot walk)",cp:"-15",cpNum:-15,ability:"Ground Move 0; crawl at 1/10 or wheelchair at 1/4 of original (round up)"}
    ]},
    { name:"Poverty", ability:"Lower than average income; not with the Wealth Ability (MP 2.3)", picks:[
      {name:"~$20,000/yr (Wealth d3)",cp:"-2.5",cpNum:-2.5,ability:"Wealth roll d3"},
      {name:"~$10,000/yr (Wealth d2)",cp:"-5",cpNum:-5,ability:"Wealth roll d2"},
      {name:"~$2,500/yr (Wealth d1)",cp:"-7.5",cpNum:-7.5,ability:"Wealth roll d1"},
      {name:"$0/yr (Wealth d2-1)",cp:"-10",cpNum:-10,ability:"Wealth roll d2-1"}
    ]},
    { name:"Prejudice", ability:"Interaction checks ignore actual CL save: base 10- with penalty; onlookers may see through it on a Difficult IN save (MP 2.3)", picks:[
      {name:"-3 penalty",cp:"-5",cpNum:-5,ability:"-3 on character-interaction task checks"},
      {name:"-6 penalty",cp:"-10",cpNum:-10,ability:"-6 on character-interaction task checks"},
      {name:"-3 penalty, specific group only",cp:"-2.5",cpNum:-2.5,ability:"Halved value; identify the prejudiced group"},
      {name:"-6 penalty, specific group only",cp:"-5",cpNum:-5,ability:"Halved value; identify the prejudiced group"}
    ]},
    { name:"Psychosis", ability:"Unreasoning delusion; CL save not to act on it immediately, works it into plans regardless (MP 2.3)", picks:[
      {name:"Rare trigger",cp:"-5",cpNum:-5,ability:"Delusion applies ~1/5 episodes"},
      {name:"Common trigger",cp:"-10",cpNum:-10,ability:"~1/2.5 episodes"},
      {name:"Very common trigger",cp:"-15",cpNum:-15,ability:"Almost every episode"}
    ]},
    { name:"Reduced Agility", ability:"AG below normal, possibly with a related BC; d10 term: 1-2 Clumsy (AG only), 3-4 Gawky (AG+ST), 5-6 Shaky (AG+EN), 7-8 Inept (AG+IN), 9-10 Sluggish (AG+CL); no BC below 0 (MP 2.3)", picks:[
      {name:"(-5) tier",cp:"-5",cpNum:-5,ability:"-5 AG, or -3 AG with -2 in the paired BC"},
      {name:"(-10) tier",cp:"-10",cpNum:-10,ability:"-6 AG with -4 paired, or -10 AG"},
      {name:"(-15) tier",cp:"-15",cpNum:-15,ability:"-9 AG with -6 paired, or -15 AG"},
      {name:"(-20) tier",cp:"-20",cpNum:-20,ability:"-12 AG with -8 paired, or -20 AG"}
    ]},
    { name:"Reduced Cool", ability:"CL below normal, possibly with a related BC; d10 term: 1-2 Unpleasant (CL only), 3-4 Sniveling (CL+ST), 5-6 Disgusting (CL+EN), 7-8 Oafish (CL+AG), 9-10 Inane (CL+IN); no BC below 0 (MP 2.3)", picks:[
      {name:"(-5) tier",cp:"-5",cpNum:-5,ability:"-5 CL, or -3 CL with -2 in the paired BC"},
      {name:"(-10) tier",cp:"-10",cpNum:-10,ability:"-6 CL with -4 paired, or -10 CL"},
      {name:"(-15) tier",cp:"-15",cpNum:-15,ability:"-9 CL with -6 paired, or -15 CL"},
      {name:"(-20) tier",cp:"-20",cpNum:-20,ability:"-12 CL with -8 paired, or -20 CL"}
    ]},
    { name:"Reduced Endurance", ability:"EN below normal, possibly with a related BC; d10 term: 1-2 Unhealthy (EN only), 3-4 Emaciated (EN+ST), 5-6 Decrepit (EN+IN), 7-8 Lethargic (EN+AG), 9-10 Sickly (EN+CL); no BC below 0 (MP 2.3)", picks:[
      {name:"(-5) tier",cp:"-5",cpNum:-5,ability:"-5 EN, or -3 EN with -2 in the paired BC"},
      {name:"(-10) tier",cp:"-10",cpNum:-10,ability:"-6 EN with -4 paired, or -10 EN"},
      {name:"(-15) tier",cp:"-15",cpNum:-15,ability:"-9 EN with -6 paired, or -15 EN"},
      {name:"(-20) tier",cp:"-20",cpNum:-20,ability:"-12 EN with -8 paired, or -20 EN"}
    ]},
    { name:"Reduced Strength", ability:"ST below normal, possibly with a related BC; d10 term: 1-2 Weak (ST only), 3-4 Scrawny (ST+IN), 5-6 Rickety (ST+EN), 7-8 Wastrel (ST+AG), 9-10 Weasely (ST+CL); no BC below 0 (MP 2.3)", picks:[
      {name:"(-5) tier",cp:"-5",cpNum:-5,ability:"-5 ST, or -3 ST with -2 in the paired BC"},
      {name:"(-10) tier",cp:"-10",cpNum:-10,ability:"-6 ST with -4 paired, or -10 ST"},
      {name:"(-15) tier",cp:"-15",cpNum:-15,ability:"-9 ST with -6 paired, or -15 ST"},
      {name:"(-20) tier",cp:"-20",cpNum:-20,ability:"-12 ST with -8 paired, or -20 ST"}
    ]},
    { name:"Special Requirement", ability:"Needs something not normally necessary for survival: diet, atmosphere, energy, medication, life support; consequence when unmet: Discomfort (-3 saves/to-hit, +0), Fatigue (no Hit/Power/Charge recovery, +0), Harm (1 dmg/round, +0; -5 per +1 dmg), Asphyxiation (-5 additional) (MP 2.3)", picks:[
      {name:"Common, ~weekly",cp:"-5",cpNum:-5,ability:"Rarity -2.5 + frequency -2.5"},
      {name:"Common, ~every 3 days",cp:"-7.5",cpNum:-7.5,ability:"Rarity -2.5 + frequency -5"},
      {name:"Common, near-constant",cp:"-10",cpNum:-10,ability:"Rarity -2.5 + frequency -7.5"},
      {name:"Uncommon, ~weekly",cp:"-7.5",cpNum:-7.5,ability:"Rarity -5 + frequency -2.5"},
      {name:"Uncommon, ~every 3 days",cp:"-10",cpNum:-10,ability:"Rarity -5 + frequency -5"},
      {name:"Uncommon, near-constant",cp:"-12.5",cpNum:-12.5,ability:"Rarity -5 + frequency -7.5"},
      {name:"Rare, ~weekly",cp:"-10",cpNum:-10,ability:"Rarity -7.5 + frequency -2.5"},
      {name:"Rare, ~every 3 days",cp:"-12.5",cpNum:-12.5,ability:"Rarity -7.5 + frequency -5"},
      {name:"Rare, near-constant",cp:"-15",cpNum:-15,ability:"Rarity -7.5 + frequency -7.5"}
    ]},
    { name:"Susceptibility", ability:"Takes damage 1/round when exposed to something harmless to normal humans (MP 2.3)", picks:[
      {name:"Rare exposure, 3 dmg",cp:"-5",cpNum:-5,ability:"~1/5 days; 3 points/round"},
      {name:"Rare exposure, 6 dmg",cp:"-7.5",cpNum:-7.5,ability:"~1/5 days; 6 points/round"},
      {name:"Rare exposure, 9 dmg",cp:"-10",cpNum:-10,ability:"~1/5 days; 9 points/round"},
      {name:"Uncommon exposure, 3 dmg",cp:"-7.5",cpNum:-7.5,ability:"~1/2.5 days; 3 points/round"},
      {name:"Uncommon exposure, 6 dmg",cp:"-10",cpNum:-10,ability:"~1/2.5 days; 6 points/round"},
      {name:"Uncommon exposure, 9 dmg",cp:"-12.5",cpNum:-12.5,ability:"~1/2.5 days; 9 points/round"},
      {name:"Common exposure, 3 dmg",cp:"-10",cpNum:-10,ability:"~1/day; 3 points/round"},
      {name:"Common exposure, 6 dmg",cp:"-12.5",cpNum:-12.5,ability:"~1/day; 6 points/round"},
      {name:"Common exposure, 9 dmg",cp:"-15",cpNum:-15,ability:"~1/day; 9 points/round"}
    ]},
    { name:"Uneducated", ability:"Reduced starting Careers (MP 2.3)", picks:[
      {name:"One Career, no bonus",cp:"-5",cpNum:-5,ability:"Starts with a single Career and no bonus"},
      {name:"No Careers",cp:"-10",cpNum:-10,ability:"Starts with no Careers at all"}
    ]},
    { name:"Unliving", ability:"Not a living creature: robot, android, animated statue, zombie, etc.; can still be healed/repaired by others (MP 2.3)", picks:[
      {name:"50% self-repair",cp:"-5",cpNum:-5,ability:"Heals only while Hits below half of full (round up)"},
      {name:"No self-repair",cp:"-10",cpNum:-10,ability:"Cannot heal at all"},
      {name:"Ability loss (1-in-20/Hit)",cp:"-5",cpNum:-5,ability:"d20 vs Hits sustained; failure disables one personal Ability"},
      {name:"No self-repair + ability loss",cp:"-15",cpNum:-15,ability:"Both of the above"},
      {name:"Zombie (body-part loss)",cp:"-5",cpNum:-5,ability:"Loses body parts instead of Abilities (d6 table; Called Shots allowed); -5 only when combined with ability loss, otherwise +0"}
    ]},
    { name:"Vulnerability", ability:"More easily harmed by certain damage types (MP 2.3)", picks:[
      {name:"Attract type (-2 Defense)",cp:"-5",cpNum:-5,ability:"-2 Defense vs a Damage Type; -5 CP per additional -2"},
      {name:"Attract specific form (-2 Defense)",cp:"-2.5",cpNum:-2.5,ability:"-2 Defense vs one damage form only (e.g. electrical Energy)"},
      {name:"Vulnerable to type (+2 dmg)",cp:"-5",cpNum:-5,ability:"+2 damage (or -2 save) from a Damage Type; -5 CP per additional +2"},
      {name:"Vulnerable to specific form (+2 dmg)",cp:"-2.5",cpNum:-2.5,ability:"+2 damage from one damage form only (e.g. cold Entropy)"}
    ]}
  ]
};})();
