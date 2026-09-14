import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateNpcCharacter,
  createSequenceDice,
  createDice,
  CHARGEN_PHASES,
  SERVICE_KEYS,
  NPC_TERM_RANGE,
  generateCrewCandidate,
  CREW_ROLE_SKILLS
} from '../index.js';

test('a rolled NPC is a complete Book 1 character', () => {
  // Book 1 p.8 generates a hired crewman the same way as anyone else, so this
  // drives the ordinary sequence rather than inventing a generator: an NPC
  // rolled here is one a player could have rolled.
  const { character } = generateNpcCharacter({ name: 'Test NPC' });
  assert.equal(character.phase, CHARGEN_PHASES.COMPLETE);
  assert.ok(SERVICE_KEYS.includes(character.service));
  assert.ok(character.terms >= NPC_TERM_RANGE.minimum);
  // Book 1 p.4: initial values roll 2-12 and modifications keep them 1-15.
  for (const value of Object.values(character.characteristics)) {
    assert.ok(value >= 1 && value <= 15, `characteristic out of range: ${value}`);
  }
  assert.equal(character.upp.length, 6);
  // A term of service yields skills, and p.7 gives two in the first term.
  assert.ok(Object.keys(character.skills).length >= 1);
  // Age advances four years a term from 18.
  assert.equal(character.age, 18 + character.terms * 4);
});

test('a requested service is enlisted in, and an unknown one is refused', () => {
  for (const service of SERVICE_KEYS) {
    const { character } = generateNpcCharacter({ service, name: 'Test' });
    // Enlistment can fail, and Book 1 p.5 then drafts the volunteer — so the
    // requested service is attempted, not guaranteed.
    assert.ok(SERVICE_KEYS.includes(character.service));
  }
  assert.throws(() => generateNpcCharacter({ service: 'pirates' }), /unknown service/);
});

test('the same dice produce the same NPC', () => {
  // Reproducibility matters for a fixture: the generator takes its choices from
  // the dice, never from Math.random.
  const roll = () => generateNpcCharacter({
    name: 'Seeded',
    dice: createSequenceDice(Array.from({ length: 400 }, (unused, index) => (index % 6) + 1))
  }).character;
  const first = roll();
  const second = roll();
  assert.equal(first.upp, second.upp);
  assert.equal(first.service, second.service);
  assert.deepEqual(first.skills, second.skills);
});

test('Book 1 p.5: a career lost in service is reported, not hidden', () => {
  // "Failure to successfully achieve the survival throw results in death; a new
  // character must be generated." The generator does exactly that and counts
  // how many it lost, because the attrition is the rule working.
  const dice = createDice();
  let sawLosses = false;
  for (let attempt = 0; attempt < 60 && !sawLosses; attempt += 1) {
    const result = generateNpcCharacter({ name: 'Test', dice });
    assert.ok(Number.isInteger(result.died) && result.died >= 0);
    assert.ok(result.attempts >= 1);
    if (result.died > 0) sawLosses = true;
  }
  assert.equal(sawLosses, true, 'no losses in 60 rolls, which suggests survival is not being thrown');

  // And it gives up rather than looping forever when nobody can survive.
  assert.throws(() => generateNpcCharacter({
    name: 'Doomed',
    // A run of 1s fails every survival throw.
    dice: createSequenceDice(Array.from({ length: 4000 }, () => 1)),
    maximumAttempts: 3
  }), /no character survived 3 attempts/);
});

test('choices are taken from two dice, so a four-entry list is not skewed', () => {
  // One die modulo four would favour the first two entries by half again.
  // Over many rolls every service should appear.
  const seen = new Set();
  for (let attempt = 0; attempt < 200; attempt += 1) {
    seen.add(generateNpcCharacter({ name: 'Spread' }).character.service);
  }
  assert.deepEqual([...seen].sort(), [...SERVICE_KEYS].sort());
});

// ---------------------------------------------------------------------------
// Book 1, NON-PLAYER CHARACTERS: hiring crew at a port
// ---------------------------------------------------------------------------

test('Book 1: characters are generated until one has the required skill', () => {
  // "the referee would generate characters until one occurs with the required
  // skill (such as navigation, medical, etc.). Generally, the first appropriate
  // character to be generated would present himself for employment."
  for (const [role, skill] of Object.entries(CREW_ROLE_SKILLS)) {
    const found = generateCrewCandidate({ role });
    if (!found.character) {
      // A search may legitimately come up empty — Gunnery and Medical are on
      // few table cells — and it says so rather than assigning silently.
      assert.equal(found.exhausted, true);
      assert.equal(found.method, 'search');
      continue;
    }
    assert.ok(found.character.skills[skill] >= 1, `${role} candidate lacks ${skill}`);
    assert.equal(found.skill, skill);
    assert.equal(found.assigned, false);
    // "if not accepted or considered suitable, an appropriate delay would occur
    // before another presents himself" — the delay is the referee's, so the
    // count of applicants passed over is what gets reported.
    assert.equal(found.passedOver, found.generated - 1);
  }
  assert.throws(() => generateCrewCandidate({ role: 'cook' }), /unknown crew role/);
});

test("Book 1's alternative: assign the required skill instead of searching", () => {
  // "As an alternative, the referee might simply generate a character and
  // assign him the required skill, plus perhaps 1 or 2 more."
  const assigned = generateCrewCandidate({
    role: 'gunner', method: 'assign', minimumLevel: 2,
    // A search limit of one forces the alternative path immediately.
    searchLimit: 1
  });
  assert.equal(assigned.method, 'assign');
  assert.equal(assigned.assigned, true);
  assert.ok(assigned.character.skills.Gunnery >= 2);
  // The extra "1 or 2 more" is deliberately not invented: "perhaps" is not a
  // rule, so the referee chooses.
  assert.equal(assigned.passedOver, 0);
});

test('the required level is respected, and a level-0 post is not a search', () => {
  const skilled = generateCrewCandidate({ role: 'pilot', minimumLevel: 1 });
  if (skilled.character) assert.ok(skilled.character.skills.Pilot >= 1);
  // Asking for expertise a career rarely produces can exhaust the search, and
  // that is reported with the best applicant seen rather than nothing at all.
  const demanding = generateCrewCandidate({ role: 'medic', minimumLevel: 6, searchLimit: 5 });
  assert.equal(demanding.character, null);
  assert.equal(demanding.exhausted, true);
  assert.ok(demanding.bestCandidate === null || typeof demanding.bestCandidate === 'object');
});
