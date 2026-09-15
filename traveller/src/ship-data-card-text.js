// v0.170.0: Book 2 p.24's data card as lines of text, from the rules
// package's shipDataCard(). Used for the DATA CARD item on a ship token, on the
// staging board and in a fight; in a fight it carries the damage marks.
export function dataCardLines(card, { programLabel = (key) => key } = {}) {
  const lines = [`${card.name} (Type ${card.typeCode}) \u2014 ${card.designName}`];
  const computer = card.computer;
  const right = [
    `Model/${computer.model}`,
    `CPU = ${computer.cpu}`,
    `Storage = ${computer.storage ?? 0}${computer.hits ? ` \u00b7 ${computer.hits} HIT` : ''}`
  ];
  const left = [
    ...card.sections.map((section, index) => `${index + 1}. ${section.label} (${section.reading})${section.hits ? ` \u00b7 ${section.hits} HIT` : ''}`),
    `4. Fuel (${card.fuel.aboardTons} of ${card.fuel.capacityTons} tons${card.fuel.lostTons ? `, ${card.fuel.lostTons} lost` : ''})`,
    `5. Hold (${card.hold.capacityTons} tons${card.hold.hits ? `, ${card.hold.hits} HIT` : ''})`,
    `6. Bridge (Pilot-${card.bridge.pilotSkill})`
  ];
  const width = Math.max(...left.map((line) => line.length)) + 3;
  left.forEach((line, index) => lines.push(`${line.padEnd(width)}${right[index] ?? ''}`));
  for (const turret of card.turrets) {
    lines.push(`${turret.id} (${turret.code || 'empty'}) Gunner-${turret.gunnerSkill}${turret.operational ? '' : ' \u00b7 OUT'}`);
  }
  lines.push(`${card.magazine.missiles} missiles, ${card.magazine.sandCanisters} sand canisters on board`);
  lines.push(`In computer: ${computer.loaded.map(programLabel).join(', ') || 'nothing'}`);
  const stored = computer.carried.filter((key) => !computer.loaded.includes(key));
  if (stored.length) lines.push(`Carried: ${stored.map(programLabel).join(', ')}`);
  return lines;
}
