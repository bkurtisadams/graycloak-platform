import {
  importCharacterDocument,
  updateCharacterGameplayState
} from '../../packages/classic-traveller-rules/index.js';

import {
  importNpcActorDocument,
  updateNpcActorDocument
} from './npc-actor-document.js';

import { importEncounterDocument } from './encounter-document.js';

const PHYSICAL_CHARACTERISTICS = Object.freeze(['STR', 'DEX', 'END']);

function physicalState(value) {
  return Object.fromEntries(PHYSICAL_CHARACTERISTICS.map((key) => [key, value[key]]));
}

function samePhysicalState(left, right) {
  return PHYSICAL_CHARACTERISTICS.every((key) => left[key] === right[key]);
}

function characterStatusForCombatant(combatant) {
  if (combatant.status === 'dead') return { alive: false, consciousness: 'not-applicable' };
  if (combatant.status === 'unconscious') return { alive: true, consciousness: 'unconscious' };
  return { alive: true, consciousness: 'conscious' };
}

export function synchronizeEncounterDocuments({ encounter, characters = [], npcActors = [] } = {}) {
  const currentEncounter = importEncounterDocument(encounter);
  if (!Array.isArray(characters)) throw new TypeError('characters must be an array');
  if (!Array.isArray(npcActors)) throw new TypeError('npcActors must be an array');

  const combatantBySourceId = new Map(
    currentEncounter.combatants
      .filter((entry) => entry.sourceActorId)
      .map((entry) => [entry.sourceActorId, entry])
  );
  const changes = [];

  const updatedCharacters = characters.map((source) => {
    const character = importCharacterDocument(source);
    const combatant = combatantBySourceId.get(character.identity.id);
    if (!combatant || combatant.side !== 'party') return character;

    const before = {
      current: physicalState(character.current),
      alive: character.status.alive,
      consciousness: character.status.consciousness
    };
    const status = characterStatusForCombatant(combatant);
    const after = {
      current: physicalState(combatant.current),
      alive: status.alive,
      consciousness: status.consciousness
    };
    if (samePhysicalState(before.current, after.current)
      && before.alive === after.alive
      && before.consciousness === after.consciousness) return character;

    const updated = updateCharacterGameplayState(character, after);
    changes.push({
      documentKind: 'character',
      sourceId: character.identity.id,
      name: character.identity.name,
      before,
      after
    });
    return updated;
  });

  const updatedNpcActors = npcActors.map((source) => {
    const actor = importNpcActorDocument(source);
    const combatant = combatantBySourceId.get(actor.identity.id);
    if (!combatant) return actor;

    const before = { current: physicalState(actor.current) };
    const after = { current: physicalState(combatant.current) };
    if (samePhysicalState(before.current, after.current)) return actor;

    const updated = updateNpcActorDocument(actor, { current: after.current });
    changes.push({
      documentKind: 'npc-actor',
      sourceId: actor.identity.id,
      name: actor.identity.name,
      before,
      after
    });
    return updated;
  });

  return {
    characters: updatedCharacters,
    npcActors: updatedNpcActors,
    changes
  };
}
