/**
 * npc-primitives.js
 * Low-level dice, names, and identifiers for NPC generation.
 * No dependencies. Pure functions.
 */

export const roll1D = () => Math.floor(Math.random() * 6) + 1;
export const roll2D = () => roll1D() + roll1D();
export const rollD = (sides) => Math.floor(Math.random() * sides) + 1;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function rollRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function generateId(prefix = 'actor') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Traveller-flavored names — expand or replace with your own tables
const GIVEN = [
  'Alex','Brin','Cade','Dara','Elias','Fenn','Garr','Holt','Iris','Joss',
  'Kael','Lira','Morn','Nyx','Oren','Pax','Quin','Rynn','Seth','Tess',
  'Varn','Wynn','Xan','Yara','Zev','Arin','Bex','Coro','Del','Etta',
  'Fisk','Gwen','Hess','Ivan','Jory','Kira','Lorn','Mira','Nico','Otta',
  'Perr','Quen','Riva','Sten','Tory','Voss','Wren','Xeno','Yul','Zara'
];

const SURNAMES = [
  'Akers','Bann','Cole','Dray','Eddin','Foss','Gant','Hale','Ives','Jann',
  'Korr','Lind','Morr','Nall','Orin','Parr','Quill','Rann','Sten','Tull',
  'Vance','Warr','Xorn','Yost','Zann','Bran','Carr','Dunn','Erik','Fenn',
  'Goss','Hart','Inn','Jast','Kell','Lorn','Mast','Norr','Ost','Penn',
  'Ross','Stern','Tann','Vast','Wint','Yarr','Zenn'
];

const NICKNAMES = [
  'the Quiet','Sparks','Ironhand','Lucky','the Drift','Two-Guns','Scholar',
  'Dusty','the Fox','Ghost','Hammer','Swift','the Anchor','Rimward','Voidborn'
];

export function generateName(style = 'full') {
  const given = pick(GIVEN);
  const surname = pick(SURNAMES);
  const nickname = Math.random() < 0.15 ? ` "${pick(NICKNAMES)}"` : '';
  if (style === 'short') return `${given}${nickname}`;
  return `${given}${nickname} ${surname}`;
}

export function generateDescription(role, careerLabel) {
  const builds = ['wiry','stocky','lanky','compact','heavyset','lean','athletic','frail'];
  const complexions = ['pale','tanned','weathered','dark','ruddy','sallow','freckled','scarred'];
  const demeanors = ['nervous','confident','weary','sharp-eyed','friendly','suspicious','jovial','grim'];
  const details = [
    'a faded tattoo on the left forearm','a mechanical hand','a noticeable limp',
    'expensive-looking boots','a naval service ring','burn scars across the neck',
    'constantly checking a handheld comm','an outdated merchant uniform'
  ];
  return `A ${pick(builds)}, ${pick(complexions)} ${careerLabel || role} who looks ${pick(demeanors)}. Notable: ${pick(details)}.`;
}
