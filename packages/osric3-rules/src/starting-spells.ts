import { DEFAULT_RANDOM_SOURCE, rollDie, type RandomSource } from './dice.js';
import type { RuleSource } from './types.js';

export type StartingSpellCategoryId = 'offensive' | 'defensive' | 'miscellaneous';

export interface StartingSpellCategory {
  readonly id: StartingSpellCategoryId;
  readonly spells: readonly string[];
}

export interface StartingArcaneSpellPolicy {
  readonly mandatorySpells: readonly string[];
  readonly categories: readonly StartingSpellCategory[];
  readonly categoryDieSize: number;
  readonly chooseResult: number;
}

export interface StartingArcaneSpellSelection {
  readonly spells: readonly string[];
  readonly rolls: Readonly<Partial<Record<StartingSpellCategoryId, number>>>;
  readonly choicesRequired: readonly StartingSpellCategoryId[];
}

export const STARTING_SPELLS_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'osric-3.0',
  section: 'Starting spells for arcane spellcasters',
  auditStatus: 'disputed',
  note:
    'The policy shell reflects the announced OSRIC 3.0 starting-spell procedure, but the official category lists and page citation still require direct Player Guide verification.',
});

export const OSRIC3_MAGIC_USER_STARTING_SPELL_POLICY = Object.freeze({
  mandatorySpells: ['Read Magic'],
  categories: [
    { id: 'offensive', spells: [] },
    { id: 'defensive', spells: [] },
    { id: 'miscellaneous', spells: [] },
  ],
  categoryDieSize: 10,
  chooseResult: 10,
} satisfies StartingArcaneSpellPolicy);

function assertPolicy(policy: StartingArcaneSpellPolicy): void {
  if (!Number.isInteger(policy.categoryDieSize) || policy.categoryDieSize < 1) {
    throw new RangeError('Starting-spell category die must have at least one side.');
  }
  if (!Number.isInteger(policy.chooseResult) || policy.chooseResult < 1 || policy.chooseResult > policy.categoryDieSize) {
    throw new RangeError('Starting-spell choice result must be a face on the category die.');
  }
  const ids = policy.categories.map((category) => category.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Starting-spell category ids must be unique.');
}

function cleanSpellName(spell: string): string {
  return spell.trim();
}

function uniqueSpellNames(spells: readonly string[]): string[] {
  return [...new Set(spells.map(cleanSpellName).filter(Boolean))];
}

export function selectStartingArcaneSpells(
  policy: StartingArcaneSpellPolicy,
  choices: Partial<Record<StartingSpellCategoryId, string>> = {},
  random: RandomSource = DEFAULT_RANDOM_SOURCE,
): StartingArcaneSpellSelection {
  assertPolicy(policy);

  const selected = uniqueSpellNames(policy.mandatorySpells);
  const rolls: Partial<Record<StartingSpellCategoryId, number>> = {};
  const choicesRequired: StartingSpellCategoryId[] = [];

  for (const category of policy.categories) {
    const spells = uniqueSpellNames(category.spells);
    if (spells.length === 0) {
      choicesRequired.push(category.id);
      continue;
    }

    const roll = rollDie(policy.categoryDieSize, random);
    rolls[category.id] = roll;
    if (roll === policy.chooseResult) {
      const requested = cleanSpellName(choices[category.id] ?? '');
      const canonical = spells.find((spell) => spell.toLocaleLowerCase() === requested.toLocaleLowerCase());
      if (!canonical) {
        choicesRequired.push(category.id);
        continue;
      }
      selected.push(canonical);
      continue;
    }

    const spell = spells[roll - 1];
    if (spell) selected.push(spell);
    else choicesRequired.push(category.id);
  }

  return Object.freeze({
    spells: Object.freeze(uniqueSpellNames(selected)),
    rolls: Object.freeze(rolls),
    choicesRequired: Object.freeze(choicesRequired),
  });
}

export function createStartingSpellPolicy(
  categoryLists: Readonly<Record<StartingSpellCategoryId, readonly string[]>>,
  mandatorySpells: readonly string[] = ['Read Magic'],
): StartingArcaneSpellPolicy {
  return Object.freeze({
    mandatorySpells: Object.freeze(uniqueSpellNames(mandatorySpells)),
    categories: Object.freeze([
      Object.freeze({ id: 'offensive' as const, spells: Object.freeze(uniqueSpellNames(categoryLists.offensive)) }),
      Object.freeze({ id: 'defensive' as const, spells: Object.freeze(uniqueSpellNames(categoryLists.defensive)) }),
      Object.freeze({ id: 'miscellaneous' as const, spells: Object.freeze(uniqueSpellNames(categoryLists.miscellaneous)) }),
    ]),
    categoryDieSize: 10,
    chooseResult: 10,
  });
}
