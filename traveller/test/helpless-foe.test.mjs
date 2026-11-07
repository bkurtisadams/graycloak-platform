// v0.373.0 (Kurt, Nov 2026): a foe with no working gun, in the abbreviated
// fight, acts on the encounter's reaction (The Traveller Book p.78/p.102):
// 2-7 it runs and Book 2 p.37's shots are allowed; 8+ it heaves to. And the
// encounter table is The Traveller Book (1982) p.75's.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShipCombatEncounter, createDice, rollShipEncounter, advanceShipCombatPhase, allocateLaserFire, resolveLaserFire
} from '../vendor/classic-traveller-rules/index.js';
import {
  buildEncounteredShip, shipCombatLoadout, autoAdvanceShipFight, settleHelplessFoe, forfeitEscapeShots,
  opposingShipDesignKey, STANDARD_SHOTS_BEFORE_ESCAPE, HEAVES_TO_ON_REACTION, laserAllocationAgainstSingleFoe
} from '../src/ship-arrival-combat.js';

// An armed Type S (the travellers) against an unarmed merchant, as Bruce met one.
function fight() {
  const { ship: merchant } = buildEncounteredShip({ designKey: 'type-r-subsidized-merchant', name: 'Subsidized Merchant', key: 'subsidized-merchant' });
  const { ship: scout } = buildEncounteredShip({ designKey: 'type-s-scout-courier', name: 'Marisol', key: 'scout' });
  const loadout = (ship) => { const l = shipCombatLoadout(ship); return { carriedPrograms: l.carried, loadedPrograms: l.loaded }; };
  const encounter = createShipCombatEncounter({
    id: 'f', campaignId: 'c', participants: [
      { shipId: 'opponent', name: 'Subsidized Merchant', side: 'native', disposition: 'merchant', ship: merchant, ...loadout(merchant), stations: { pilot: 'npc' }, skills: { pilot: 1, computer: 0 }, pressurisedSections: [] },
      { shipId: 'player', name: 'Marisol', side: 'intruder', disposition: 'merchant', ship: scout, ...loadout(scout), stations: { pilot: 'p' }, skills: { pilot: 1, computer: 0 }, pressurisedSections: [] }
    ]
  });
  // The player fires once, as Bruce did; the fight then sees a side with no
  // working gun.
  const dice = createDice();
  const first = autoAdvanceShipFight(encounter, dice, { playerSide: 'intruder' }).encounter;
  const aimed = allocateLaserFire(first, laserAllocationAgainstSingleFoe(first, 'player', 'opponent'));
  return resolveLaserFire(aimed, dice).encounter;
}

test('v0.373.0 an unarmed foe once ended the fight at once; now it acts on its reaction', () => {
  const start = fight();
  assert.equal(start.outcome, 'disarmed', 'the old ending, before the reaction is applied');
  assert.equal(HEAVES_TO_ON_REACTION, 8);

  const gaveUp = settleHelplessFoe(start, { playerSide: 'intruder', reactionTotal: 8 });
  assert.equal(gaveUp.settled, 'surrendered');
  assert.equal(gaveUp.encounter.outcome, 'surrendered');
  assert.equal(gaveUp.encounter.participants.find((entry) => entry.id === 'opponent').surrendered, true);
  assert.match(gaveUp.line, /heaves to/);

  const ran = settleHelplessFoe(start, { playerSide: 'intruder', reactionTotal: 7 });
  assert.equal(ran.settled, 'running');
  assert.equal(ran.encounter.outcome, 'in-progress');
  const runner = ran.encounter.participants.find((entry) => entry.id === 'opponent');
  assert.equal(runner.fled, true);
  assert.equal(runner.shotsRemainingBeforeEscape, STANDARD_SHOTS_BEFORE_ESCAPE);
  assert.match(ran.line, /runs/);
});

test('v0.373.0 a runner stays in the fight until its shots are spent, then is away', () => {
  const ran = settleHelplessFoe(fight(), { playerSide: 'intruder', reactionTotal: 4 }).encounter;
  // The engine no longer ends the abbreviated fight for a side that is running.
  const moved = advanceShipCombatPhase(ran, { dice: createDice() });
  assert.equal(moved.outcome, 'in-progress');
  // Holding fire spends the shots that could have been fired: one beam laser
  // aboard, so two holds spend the standard two.
  const once = forfeitEscapeShots(ran, 'player');
  assert.equal(once.participants.find((entry) => entry.id === 'opponent').escaped, false);
  const held = forfeitEscapeShots(once, 'player');
  assert.equal(held.participants.find((entry) => entry.id === 'opponent').escaped, true);
  const after = advanceShipCombatPhase(held, { dice: createDice() });
  assert.equal(after.outcome, 'disengaged');
});

test('v0.373.0 nothing changes without a reaction, or while the travellers are the helpless ones', () => {
  const start = fight();
  assert.equal(settleHelplessFoe(start, { playerSide: 'intruder', reactionTotal: null }).line, null);
  // Seen from the merchant's side, its own ship is the helpless one.
  assert.equal(settleHelplessFoe(start, { playerSide: 'native', reactionTotal: 4 }).line, null);
});

test('v0.373.0 the fight builds the hull The Traveller Book table names', () => {
  const at = (total, starport) => rollShipEncounter({ rollD6: () => 1, roll2D6: () => ({ dice: [1, total - 1], total }) }, { starport });
  const liner = at(9, 'A');
  assert.equal(liner.type, 'subsidized-liner');
  assert.equal(opposingShipDesignKey({ hullKey: liner.hull.hull }), 'type-m-subsidized-merchant');
  const pirate = at(10, 'C');
  assert.equal(opposingShipDesignKey({ hullKey: pirate.hull.hull }), 'type-c-cruiser');
  // An encounter saved before v0.373.0 still builds.
  assert.equal(opposingShipDesignKey({ hullKey: 'free-trader' }), 'type-a-free-trader');
});
