function characteristic(characteristicKey, amount) {
  return Object.freeze({ type: 'characteristic', characteristic: characteristicKey, amount });
}

function material(name) {
  return Object.freeze({ type: 'material', name });
}

function weapon(category) {
  return Object.freeze({ type: 'weapon', category });
}

const NONE = Object.freeze({ type: 'none' });

export const MUSTERING_OUT_TABLES = Object.freeze({
  navy: Object.freeze({
    benefits: Object.freeze([
      material('Low Passage'),
      characteristic('INT', 1),
      characteristic('EDU', 2),
      weapon('blade'),
      material("Travellers' Aid Society"),
      material('High Passage'),
      characteristic('SOC', 2)
    ]),
    cash: Object.freeze([1000, 5000, 5000, 10000, 20000, 50000, 50000])
  }),
  marines: Object.freeze({
    benefits: Object.freeze([
      material('Low Passage'),
      characteristic('INT', 2),
      characteristic('EDU', 1),
      weapon('blade'),
      material("Travellers' Aid Society"),
      material('High Passage'),
      characteristic('SOC', 2)
    ]),
    cash: Object.freeze([2000, 5000, 5000, 10000, 20000, 30000, 40000])
  }),
  army: Object.freeze({
    benefits: Object.freeze([
      material('Low Passage'),
      characteristic('INT', 1),
      characteristic('EDU', 2),
      weapon('gun'),
      material('High Passage'),
      material('Middle Passage'),
      characteristic('SOC', 1)
    ]),
    cash: Object.freeze([2000, 5000, 10000, 10000, 10000, 20000, 30000])
  }),
  scouts: Object.freeze({
    benefits: Object.freeze([
      material('Low Passage'),
      characteristic('INT', 2),
      characteristic('EDU', 2),
      weapon('blade'),
      weapon('gun'),
      material('Scout Ship'),
      NONE
    ]),
    cash: Object.freeze([20000, 20000, 30000, 30000, 50000, 50000, 50000])
  }),
  merchants: Object.freeze({
    benefits: Object.freeze([
      material('Low Passage'),
      characteristic('INT', 1),
      characteristic('EDU', 1),
      weapon('gun'),
      weapon('blade'),
      material('Low Passage'),
      material('Free Trader')
    ]),
    cash: Object.freeze([1000, 5000, 10000, 20000, 20000, 40000, 40000])
  }),
  other: Object.freeze({
    benefits: Object.freeze([
      material('Low Passage'),
      characteristic('INT', 1),
      characteristic('EDU', 1),
      weapon('gun'),
      material('High Passage'),
      NONE,
      NONE
    ]),
    cash: Object.freeze([1000, 5000, 10000, 10000, 10000, 50000, 100000])
  })
});

export function musterRollAllowance(terms, rank = 0) {
  if (!Number.isInteger(terms) || terms < 0) {
    throw new RangeError(`terms must be a non-negative integer; received ${terms}`);
  }
  if (!Number.isInteger(rank) || rank < 0) {
    throw new RangeError(`rank must be a non-negative integer; received ${rank}`);
  }

  const rankBonus = rank >= 5 ? 3 : rank >= 3 ? 2 : rank >= 1 ? 1 : 0;
  return Object.freeze({ terms, rankBonus, total: terms + rankBonus });
}

export function benefitTableDM(rank = 0) {
  return rank >= 5 ? 1 : 0;
}

export function cashTableDM(skills = {}) {
  return (skills.Gambling ?? 0) >= 1 ? 1 : 0;
}

export function getMusterBenefitOutcome(serviceKey, total) {
  const table = MUSTERING_OUT_TABLES[serviceKey];
  if (!table) throw new RangeError(`unknown Classic Traveller service: ${serviceKey}`);
  if (!Number.isInteger(total) || total < 1 || total > 7) {
    throw new RangeError(`mustering-out benefit total must be 1 through 7; received ${total}`);
  }
  return table.benefits[total - 1];
}

export function getMusterCash(serviceKey, total) {
  const table = MUSTERING_OUT_TABLES[serviceKey];
  if (!table) throw new RangeError(`unknown Classic Traveller service: ${serviceKey}`);
  if (!Number.isInteger(total) || total < 1 || total > 7) {
    throw new RangeError(`mustering-out cash total must be 1 through 7; received ${total}`);
  }
  return table.cash[total - 1];
}

export function retirementPayForTerms(terms) {
  if (!Number.isInteger(terms) || terms < 0) {
    throw new RangeError(`terms must be a non-negative integer; received ${terms}`);
  }
  if (terms < 5) return 0;
  if (terms === 5) return 4000;
  if (terms === 6) return 6000;
  if (terms === 7) return 8000;
  return 10000 + Math.max(0, terms - 8) * 2000;
}
