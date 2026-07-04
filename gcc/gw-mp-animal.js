// gw-mp-animal.js v1.0.0 — MP 2.2 Animal/Plant Abilities for gw-character.html
// Source: Mighty Protectors section 2.2 (tables as printed; 2d6 species Ability rolls, indexed 2-12).
// rolls.Normal is a house extrapolation — the MP table starts at Low.
(function(){
  var ADAPT_A='Adaptation: Drowning (2.5), Hi Pressure (5) and Energy: +5 Power (2.5)';
  window.GWMPAnimal={
    version:'1.0.0',
    rolls:{Normal:1,Low:2,Standard:3,High:4},
    weaknesses:['Uneducated','Poverty','Lowered Intelligence','Special Requirement','Physical Disability','Distinctive','Psychosis','Phobia','Low Self-Control','Diminished Senses','Susceptibility'],
    types:[
      {d12:1,name:'Plant/Fungus',st:3,en:3,ag:-6,swap:'Shaping, Requires Source (Plants)',table:['Shaping, Requires Source (Plants)','Duplication','Size Change','Grapnel','Poison/Venom','Natural Weaponry','Physical Ability','Heightened Endurance','Armor','Regeneration','Speed']},
      {d12:2,name:'Insect',st:0,en:0,ag:0,swap:'Heightened Strength',table:['Heightened Endurance','Heightened Agility','Heightened Senses','Armor','Flight','Natural Weaponry','Poison/Venom','Size Change (Smaller)','Heightened Strength','Physical Ability','Summoning (Insects)']},
      {d12:3,name:'Mammal',st:0,en:0,ag:0,swap:'Heightened Endurance',table:['Heightened Strength','Flight','Size Change','Heightened Agility','Heightened Senses','Natural Weaponry','Speed','Heightened Endurance','Physical Ability','Summoning (Mammals)','Heightened Strength']},
      {d12:4,name:'Avian',st:-2,en:-2,ag:4,swap:'Flight',table:['Summoning (Birds)','Speed','Size Change (Smaller)','Heightened Intelligence','Flight','Natural Weaponry','Heightened Agility','Heightened Senses','Physical Ability','Heightened Endurance','Heightened Cool']},
      {d12:5,name:'Reptile',st:2,en:2,ag:-4,swap:'Poison/Venom',table:['Speed','Armor','Physical Ability','Heightened Strength','Heightened Endurance','Natural Weaponry','Poison/Venom','Size Change','Heightened Senses','Flight','Summoning (Reptiles)']},
      {d12:6,name:'Amphibian',st:2,en:2,ag:-4,swap:ADAPT_A,table:['Heightened Senses','Heightened Agility','Poison/Venom','Physical Ability','Grapnel','Natural Weaponry',ADAPT_A,'Heightened Endurance','Speed','Heightened Strength','Adaptation: Breathes Air & Water (5), High Pressure (5)']},
      {d12:7,name:'Arachnid',st:-4,en:2,ag:2,swap:'Heightened Strength',table:['Heightened Strength','Physical Ability','Summoning (Arachnids)','Heightened Agility','Grapnel','Natural Weaponry','Poison/Venom','Size Change (Smaller)','Heightened Endurance','Armor','Heightened Senses']},
      {d12:8,name:'One-Celled',st:-4,en:2,ag:2,swap:'Stretching Abilities',table:['Armor',ADAPT_A,'Size Change (Smaller)','Stretching Abilities','Regeneration','Duplication','Heightened Endurance','Physical Ability','Grapnel','Poison/Venom','Heightened Agility']},
      {d12:9,name:'Crustacean',st:4,en:0,ag:-4,swap:'Armor',table:['Heightened Agility','Size Change','Heightened Strength','Poison/Venom','Heightened Endurance','Natural Weaponry',ADAPT_A,'Physical Ability','Armor','Heightened Senses','Summoning (Crustaceans)']},
      {d12:10,name:'Lower Class',st:-2,en:2,ag:0,swap:'Regeneration',table:['Grapnel','Poison/Venom','Size Change (Smaller)','Physical Ability','Regeneration','Natural Weaponry','Stretching Abilities','Heightened Endurance','Heightened Agility',ADAPT_A,'Speed']},
      {d12:11,name:'Mollusk',st:2,en:2,ag:-4,swap:'Armor',table:['Heightened Agility','Grapnel','Heightened Endurance','Armor','Adaptation: Drowning (Breathes Air & Water) (2.5), Hi Pressure (5) and Energy: +5 Power (2.5)','Natural Weaponry','Poison/Venom','Physical Ability','Size Change (Smaller)','Heightened Senses','Physical Ability']},
      {d12:12,name:'Fish',st:0,en:4,ag:-4,swap:'Adaptation: Drowning (5), High Pressure (5)',table:['Summoning (Fish)','Poison/Venom','Size Change','Heightened Agility',ADAPT_A,'Natural Weaponry','Physical Ability','Speed','Heightened Endurance','Heightened Senses','Armor']}
    ]
  };
})();
