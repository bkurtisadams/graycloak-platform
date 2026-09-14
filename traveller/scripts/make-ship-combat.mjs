#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Build a playable Book 2 space combat and hand it to the client.
//
// A pirate only turns up on about 14% of arrivals at a class A or B starport
// (Book 2 p.36), which is a poor way to test a fight. This writes a combat
// that is already under way in exactly the shape v0.133.0's resume reads, so
// the client picks it up on the next load.
//
// Usage, from the traveller directory:
//
//   node scripts/make-ship-combat.mjs
//   node scripts/make-ship-combat.mjs --campaign=<campaign-id>
//   node scripts/make-ship-combat.mjs --opponent=cruiser --pressurised
//
// Then paste the printed one-liner into the browser console on the campaign
// and reload. With no --campaign the fight is accepted by any campaign, since
// restoreShipCombat only refuses a mismatch when an id is recorded.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
// import() takes a URL, not a filesystem path. On Windows a path begins C:\\,
// which the ESM loader reads as the protocol "c:" and rejects with
// ERR_UNSUPPORTED_ESM_URL_SCHEME. It happens to work on Linux and macOS, where
// a leading / is harmlessly re-parsed, which is how this shipped. Same fault
// v1.188.00 fixed in test/pages-load.test.mjs.
const rules = await import(pathToFileURL(path.join(here, '..', 'vendor', 'classic-traveller-rules', 'index.js')).href);

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
  return [key, value];
}));

const campaignId = args.get('campaign') ?? null;
const opponentKind = args.get('opponent') ?? 'scout';
const pressurised = args.has('pressurised');
const outputPath = args.get('out') ?? path.join(here, '..', 'work', 'ship-combat-fixture.json');

// Book 2 p.16: weapons are never in a ship's plans and specifications, so both
// hulls have to be armed after delivery or neither can fire.
const WEAPONS = {
  scout: ['beam-laser', 'beam-laser'],
  cruiser: ['beam-laser', 'beam-laser', 'missile-launcher']
};
const DESIGNS = { scout: 'type-s-scout-courier', cruiser: 'type-c-cruiser' };

function authority(captainId, name) {
  // The authority block is built around Book 1's scout reserve assignment and
  // wants an assigned character who appears in the crew, so an encountered
  // ship gets a captain. Somebody is flying it.
  return {
    assignmentType: 'private-owner',
    controllingAuthority: name,
    legalTitleHolder: `${name} captain`,
    legalTitleSourceStatus: 'referee-generated-encounter',
    characterOwnsShip: true,
    assignedCharacterId: captainId,
    assignedCharacterName: `${name} captain`,
    recallable: false,
    saleAllowed: true,
    useAsDesired: true,
    possessionAtServicePleasure: false,
    servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
    operatorResponsibilities: { upkeep: true, crewCosts: true }
  };
}

function buildShip({ shipId, name, designKey, weapons, missiles = 0, sand = 0 }) {
  const captainId = `npc-${shipId}-captain`;
  const gunnerId = `npc-${shipId}-gunner`;
  let ship = rules.createShipDocument({
    designKey,
    id: `fixture-${shipId}`,
    name,
    authority: authority(captainId, name),
    crewAssignments: [
      { role: 'pilot', characterId: captainId, characterName: `${name} captain` },
      // Book 2 p.17 wants a gunner per turret, and without one Gunner Interact
      // is worth nothing.
      { role: 'gunner', characterId: gunnerId, characterName: `${name} gunner` }
    ]
  });
  ship = rules.creditShipAccount(ship, 50000000, { kind: 'capital', description: 'Fitting-out fund' });

  // One weapon per turret slot, spreading across hardpoints where the hull has
  // them — Book 2 p.15 caps a turret at its mount.
  const turrets = ship.specifications.armament.turrets;
  let index = 0;
  for (const weapon of weapons) {
    const turret = turrets[Math.min(turrets.length - 1, Math.floor(index / 2))];
    if (!turret) break;
    try {
      ship = rules.armShipTurret(ship, { turretId: turret.id, weapon, pricePerWeaponCr: 0 }).ship;
      index += 1;
    } catch {
      // Turret full; try the next hardpoint.
      index += 2;
    }
  }
  if (missiles || sand) ship = rules.purchaseOrdnance(ship, { missiles, sandCanisters: sand }).ship;
  return { ship, captainId, gunnerId };
}

// A Model/1 holds six points: CPU 2 plus storage 4 (Book 2 p.14). Carrying more
// than that is the point of the reprogramming phase — Book 2 p.24's sample data
// card carries eleven.
const CARRIED = ['target', 'return-fire', 'predict-1', 'gunner-interact', 'auto-evade', 'launch', 'anti-missile'];
function loadoutFor(ship, preference) {
  const model = rules.COMPUTER_MODELS[ship.specifications.computer.model];
  const room = model.cpu + (model.storage ?? 0);
  const loaded = [];
  let used = 0;
  for (const key of preference) {
    const space = rules.COMPUTER_PROGRAMS[key].space;
    if (used + space > room) continue;
    loaded.push(key);
    used += space;
  }
  return loaded;
}

const player = buildShip({
  shipId: 'player', name: 'Marisol', designKey: DESIGNS.scout, weapons: WEAPONS.scout
});
const opponent = buildShip({
  shipId: 'opponent', name: opponentKind === 'cruiser' ? 'Corsair (Type C)' : 'Corsair',
  designKey: DESIGNS[opponentKind] ?? DESIGNS.scout,
  weapons: WEAPONS[opponentKind] ?? WEAPONS.scout,
  missiles: opponentKind === 'cruiser' ? 6 : 0
});

// Book 2 p.35: ships depressurise before combat whenever possible. Pass
// --pressurised to fight it as an ambush the player was not ready for, which is
// what makes p.35 decompression reachable.
const PRESSURE = pressurised ? [...rules.PRESSURE_SECTIONS] : [];
const occupants = pressurised ? {
  bridge: [{ actorId: player.captainId, name: 'Marisol captain', vaccSuitAvailable: true, vaccSuitSkill: 0, dexterity: 7 }],
  turrets: [{ actorId: player.gunnerId, name: 'Marisol gunner', vaccSuitAvailable: true, vaccSuitSkill: 1, dexterity: 8 }]
} : {};

const encounter = rules.createShipCombatEncounter({
  id: `fixture-ship-combat-${Date.now()}`,
  campaignId,
  // Book 2 p.22 never says which side is which; the initiator is the intruder
  // and acts first in every game turn.
  intruderSide: 'intruder',
  intruderAssignmentNote: 'Fixture: the pirate initiated the encounter',
  participants: [
    {
      shipId: 'opponent',
      name: opponent.ship.identity.name,
      side: 'intruder',
      disposition: 'pirate',
      ship: opponent.ship,
      carriedPrograms: CARRIED,
      loadedPrograms: loadoutFor(opponent.ship, ['target', 'predict-1', 'gunner-interact', 'auto-evade', 'launch']),
      stations: { pilot: opponent.captainId, gunners: Object.fromEntries(
        opponent.ship.state.armament.turrets.map((turret) => [turret.id, opponent.gunnerId])
      ) },
      skills: { pilot: 1, computer: 0, gunnery: Object.fromEntries(
        opponent.ship.state.armament.turrets.map((turret) => [turret.id, 1])
      ) },
      pressurisedSections: []
    },
    {
      shipId: 'player',
      name: player.ship.identity.name,
      side: 'native',
      disposition: 'merchant',
      ship: player.ship,
      carriedPrograms: CARRIED,
      loadedPrograms: loadoutFor(player.ship, ['target', 'return-fire', 'auto-evade', 'gunner-interact']),
      stations: { pilot: player.captainId, gunners: { 'T-1': player.gunnerId } },
      skills: { pilot: 2, computer: 1, gunnery: { 'T-1': 1 } },
      pressurisedSections: PRESSURE,
      occupants
    }
  ]
});

// --fight runs the fixture to a conclusion with the NPC tactics driving both
// sides, which proves the fixture is playable before it reaches a browser.
if (args.has('fight')) {
  const dice = rules.createDice();
  let fight = encounter;
  let guard = 0;
  while (fight.outcome === 'in-progress' && guard < 400) {
    guard += 1;
    const phase = rules.currentPhase(fight).key;
    const acting = rules.actingSide(fight);
    if (phase === 'movement') fight = rules.moveOrdnance(fight);
    if (phase === 'laser-fire' || phase === 'return-fire') {
      const allocations = [];
      for (const shooter of fight.participants.filter((entry) => entry.side === acting && !entry.escaped && !entry.surrendered)) {
        const intent = rules.shipCombatIntent(fight, shooter.id, dice);
        if (!['press-attack', 'disable-drives'].includes(intent.intent)) {
          if (phase === 'laser-fire') console.log(`  turn ${fight.gameTurn}: ${shooter.name} — ${intent.intent} (${intent.reason})`);
          continue;
        }
        const foe = fight.participants.find((entry) => entry.side !== shooter.side && !entry.escaped);
        if (!foe) continue;
        for (const turret of shooter.ship.specifications.armament.turrets) {
          if (!rules.turretOperational(shooter.ship, turret.id)) continue;
          if (!rules.turretWeapons(shooter.ship, turret.id).some((key) => rules.getTurretWeapon(key).fires === 'laser')) continue;
          if (phase === 'return-fire' && !shooter.wasFiredAtBy.includes(foe.id)) continue;
          allocations.push({ shipId: shooter.id, turretId: turret.id, targetId: foe.id });
        }
      }
      if (allocations.length) {
        fight = rules.allocateLaserFire(fight, allocations);
        const resolved = rules.resolveLaserFire(fight, dice);
        fight = resolved.encounter;
        for (const shot of resolved.shots) {
          if (!shot.fired) { console.log(`  turn ${fight.gameTurn} ${phase}: ${shot.shipId} held — ${shot.reason}`); continue; }
          if (shot.hit) console.log(`  turn ${fight.gameTurn} ${phase}: ${shot.shipId} hit ${shot.location}`);
        }
      }
    }
    if (fight.outcome !== 'in-progress') break;
    fight = rules.advanceShipCombatPhase(fight);
  }
  console.log(`\n  outcome: ${fight.outcome} after ${fight.gameTurn} turns (${rules.elapsedMinutes(fight)} minutes)`);
  for (const participant of fight.participants) {
    const status = rules.participantStatus(participant);
    console.log(`  ${status.name}: guns ${status.armedTurrets.length}, adrift ${status.adrift}, hits ${status.damage.totalHits}`);
  }
  const boarder = fight.participants.find((entry) => !rules.participantStatus(entry).toothless);
  const prize = fight.participants.find((entry) => rules.participantStatus(entry).toothless);
  if (boarder && prize) {
    const assessment = rules.boardingAssessment(fight, { boarderShipId: boarder.id, defenderShipId: prize.id });
    console.log(`  boarding ${prize.name}: ${assessment.allowed ? 'available' : assessment.blockers.join('; ')}`);
  }
  process.exit(0);
}

const payload = { version: 1, campaignId, savedAt: Date.now(), encounter };
// work/ is a scratch directory and may not exist on a fresh checkout, so the
// first run of this script would otherwise fail on ENOENT.
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const summary = encounter.participants.map((participant) => {
  const card = rules.shipDataCard(participant);
  const guns = card.turrets.map((turret) => `${turret.id} ${turret.code || 'empty'}`).join(', ');
  return `  ${participant.name} (${participant.side}, ${participant.disposition}) — ${card.typeCode} `
    + `/ ${guns} / Model/${card.computer.model} running ${card.computer.loaded.length} of ${card.computer.carried.length} carried`;
}).join('\n');

console.log(`Ship combat fixture written to ${outputPath}\n`);
console.log(summary);
console.log(`\n  turn ${encounter.gameTurn}, ${encounter.phasingSide} ${rules.currentPhase(encounter).label}`);
console.log(`  player ship pressurised: ${pressurised ? 'yes — an ambush she was not ready for' : 'no — depressurised, crew in vacc suits'}`);
console.log(`  campaign: ${campaignId ?? 'any (no id recorded)'}`);
// The payload is far too big to paste, so the browser fetches the file this
// script just wrote. The dev server is rooted at the platform directory, which
// is why the path starts at /traveller.
const fetchPath = `/traveller/work/${path.basename(outputPath)}`;
console.log('\nTo play it: open the campaign, paste this into the browser console, and reload.\n');
console.log(`await fetch('${fetchPath}').then(r => r.text()).then(t => localStorage.setItem('graycloak.traveller.ship-combat.v1', t))`);
console.log('\nTo clear it again:\n');
console.log("localStorage.removeItem('graycloak.traveller.ship-combat.v1')");
console.log('\nOr to check it without a browser:\n');
console.log('node scripts/make-ship-combat.mjs --fight');
