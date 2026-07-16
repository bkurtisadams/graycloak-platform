export type RandomSource = () => number;

export const DEFAULT_RANDOM_SOURCE: RandomSource = () => Math.random();

function assertRandomSample(sample: number): void {
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError(`Random source must return a finite number in [0, 1); received ${sample}.`);
  }
}

export function rollDie(sides: number, random: RandomSource = DEFAULT_RANDOM_SOURCE): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new RangeError(`Die sides must be a positive integer; received ${sides}.`);
  }

  const sample = random();
  assertRandomSample(sample);
  return Math.floor(sample * sides) + 1;
}

export function rollDice(
  count: number,
  sides: number,
  random: RandomSource = DEFAULT_RANDOM_SOURCE,
): number {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Dice count must be a non-negative integer; received ${count}.`);
  }

  let total = 0;
  for (let index = 0; index < count; index += 1) total += rollDie(sides, random);
  return total;
}

export function rollPercentile(random: RandomSource = DEFAULT_RANDOM_SOURCE): number {
  return rollDie(100, random);
}
