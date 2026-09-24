#!/usr/bin/env node
// ---------------------------------------------------------------------------
// run-trip.mjs — drive a party through the runner with no browser.
//
// v0.312.0. Build-order step 4. Loads the test fixture campaign (Hawkeye,
// Sea of Suns), optionally swaps in another standard design, and lets the
// default policy run it for N arrivals.
//
//   node scripts/run-trip.mjs                       one run, the whole log
//   node scripts/run-trip.mjs --runs 500            totals over 500 seeds
//   node scripts/run-trip.mjs --jumps 20 --seed a1  a longer run, another seed
//
//   --design <key>     standard design (default type-a-free-trader);
//                      "fixture" keeps the campaign's own ship
//   --from <system>    starting system id (default aster)
//   --jumps <n>        arrivals per run (default 10)
//   --runs <n>         runs, each with its own seed (default 1)
//   --seed <text>      seed prefix (default "run")
//   --lanes <rule>     charted | always | never (default charted: the
//                      subsector's Book 3 lanes)
//   --balance <cr>     opening ship account (default 500000)
//   --financed         the ship carries a new Book 2 p.5 mortgage, home at
//                      --from; with a small --balance it falls into arrears
//   --hail --inspect --fight-pirates   let the policy take those risks
//   --verbose          print every event even with --runs
//   --json             print the totals as JSON
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createShipDocument, financeShip, STANDARD_SHIP_DESIGN_KEYS } from '../vendor/classic-traveller-rules/index.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { createTrip, LANE_RULES } from '../src/runner/trip.js';
import { runTrip } from '../src/runner/run.js';
import { createDefaultPolicy } from '../src/runner/policy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, '..', 'test', 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');
const HAWKEYE = 'char-04164baa70c3b5a6';

function parseArgs(argv) {
  const options = { design: 'type-a-free-trader', from: 'aster', jumps: 10, runs: 1, seed: 'run', lanes: 'charted', balance: 500000, financed: false, hail: false, inspect: false, fightPirates: false, verbose: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => argv[++index];
    if (arg === '--design') options.design = value();
    else if (arg === '--from') options.from = value();
    else if (arg === '--jumps') options.jumps = Number(value());
    else if (arg === '--runs') options.runs = Number(value());
    else if (arg === '--seed') options.seed = value();
    else if (arg === '--lanes') options.lanes = value();
    else if (arg === '--balance') options.balance = Number(value());
    else if (arg === '--financed') options.financed = true;
    else if (arg === '--hail') options.hail = true;
    else if (arg === '--inspect') options.inspect = true;
    else if (arg === '--fight-pirates') options.fightPirates = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--json') options.json = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!Number.isInteger(options.jumps) || options.jumps < 1) throw new Error('--jumps must be a positive integer');
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
  if (!Number.isInteger(options.balance) || options.balance < 0) throw new Error('--balance must be a non-negative whole number of credits');
  if (!LANE_RULES.includes(options.lanes)) throw new Error(`--lanes must be ${LANE_RULES.join(', ')}`);
  if (options.design !== 'fixture' && !STANDARD_SHIP_DESIGN_KEYS.includes(options.design)) throw new Error(`--design must be fixture or one of ${STANDARD_SHIP_DESIGN_KEYS.join(', ')}`);
  return options;
}

async function startingCampaign(options) {
  const bundle = JSON.parse(await readFile(FIXTURE, 'utf8'));
  const system = FAR_MERIDIAN_SUBSECTOR.systems.find((entry) => entry.id === options.from);
  if (!system) throw new Error(`no system ${options.from} in ${FAR_MERIDIAN_SUBSECTOR.name}`);
  bundle.campaign.location = { systemId: system.id, systemName: system.name, worldId: system.mainWorld.id, worldName: system.mainWorld.name };
  const date = `${String(bundle.campaign.time.dayOfYear).padStart(3, '0')}-${bundle.campaign.time.year}`;
  if (options.design !== 'fixture') {
    const old = bundle.documents.ships[0];
    // Owned outright by Hawkeye, not the fixture Scout's reserve assignment
    // (which fuels free at scout bases). He flies it and doubles as medic:
    // Book 2 p.16 wants a medic over 100 tons, and p.17 lets one person
    // hold two posts.
    const authority = {
      assignmentType: 'owned', controllingAuthority: 'Hawkeye', legalTitleHolder: 'Hawkeye', legalTitleSourceStatus: 'run-trip script',
      characterOwnsShip: true, assignedCharacterId: HAWKEYE, assignedCharacterName: 'Hawkeye', recallable: false,
      saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    };
    bundle.documents.ships[0] = createShipDocument({
      designKey: options.design, id: old.identity.id, name: 'Marisol', registry: 'A-1', authority,
      crewAssignments: [
        { role: 'pilot', characterId: HAWKEYE, characterName: 'Hawkeye' },
        { role: 'medic', characterId: HAWKEYE, characterName: 'Hawkeye' }
      ],
      state: {
        currentFuelTons: null,
        finances: { balanceCr: options.balance, ledger: options.balance ? [{ id: 'opening', date, kind: 'transfer', description: 'Opening balance', amountCr: options.balance, balanceCr: options.balance }] : [] },
        portCall: { systemId: system.id, arrivalDate: date, berthingDueCr: 100, berthingPaid: true }
      }
    });
    if (options.financed) bundle.documents.ships[0] = financeShip(bundle.documents.ships[0], { startedOn: date, homeSystemId: system.id });
  } else {
    const ship = bundle.documents.ships[0];
    ship.state.portCall = { ...(ship.state.portCall ?? {}), systemId: system.id, arrivalDate: date, berthingDueCr: 100, berthingPaid: true };
  }
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return registry.resolveCampaign(campaign.identity.id);
}

function blankTotals() {
  return {
    runs: 0, arrivals: 0, days: 0,
    stoppedBy: {}, halts: {}, checklistBlocks: {},
    misjumps: 0, misjumpsToEmptySpace: 0, destroyed: 0, stranded: 0,
    driveMalfunctions: 0, drivesStillDownOnArrival: 0,
    lowRevived: 0, lowDied: 0, lotteryPaidCr: 0,
    messagesCarried: 0, messagesDelivered: 0,
    encounters: {}, tolls: 0, repossessions: {},
    freightCr: 0, passageCr: 0, balanceChangeCr: 0
  };
}

const bump = (map, key, by = 1) => { map[key] = (map[key] ?? 0) + by; };

function tally(totals, outcome, startBalance, startDate) {
  totals.runs += 1;
  totals.arrivals += outcome.state.arrivals;
  bump(totals.stoppedBy, outcome.stoppedBy);
  const [d0, y0] = startDate.split('-').map(Number);
  const [d1, y1] = outcome.date.split('-').map(Number);
  totals.days += (y1 - y0) * 365 + (d1 - d0);
  totals.balanceChangeCr += outcome.state.ship.state.finances.balanceCr - startBalance;
  if (outcome.halt) {
    bump(totals.halts, outcome.halt.reason);
    if (outcome.halt.reason === 'departure-checklist') {
      for (const part of outcome.halt.detail.split('; ')) bump(totals.checklistBlocks, part.split(':')[0]);
    }
  }
  if (outcome.stoppedBy === 'destroyed') totals.destroyed += 1;
  if (outcome.stoppedBy === 'stranded') totals.stranded += 1;
  for (const entry of outcome.events) {
    if (entry.kind === 'misjump') {
      totals.misjumps += 1;
      if (/empty space/.test(entry.text)) totals.misjumpsToEmptySpace += 1;
    }
    if (entry.kind === 'drive-failure') {
      totals.driveMalfunctions += 1;
      if (entry.stillFailed?.length) totals.drivesStillDownOnArrival += 1;
    }
    if (entry.kind === 'arrival') {
      totals.lowRevived += entry.lowRevived ?? 0;
      totals.lowDied += entry.lowDied ?? 0;
      totals.lotteryPaidCr += entry.lotteryPaidCr ?? 0;
      totals.messagesDelivered += entry.messagesDelivered ?? 0;
      totals.freightCr += entry.freightCr ?? 0;
      totals.passageCr += entry.passageCr ?? 0;
    }
    if (entry.kind === 'encounter' && entry.key) bump(totals.encounters, entry.key);
    if (entry.kind === 'encounter' && /toll to/.test(entry.text)) totals.tolls += 1;
    if (entry.kind === 'repossession') bump(totals.repossessions, entry.form);
    if (entry.kind === 'port' && /carries a message/.test(entry.text)) totals.messagesCarried += 1;
  }
}

function report(totals, options) {
  const lowTotal = totals.lowRevived + totals.lowDied;
  const per = (n, of = totals.arrivals) => (of ? `${n} (${(100 * n / of).toFixed(1)}% of ${of})` : String(n));
  const lines = [
    `${totals.runs} run${totals.runs === 1 ? '' : 's'} of up to ${options.jumps} arrivals, ${options.design} from ${options.from}, lanes: ${options.lanes}`,
    `arrivals            ${totals.arrivals} in ${totals.days} days`,
    `stopped by          ${JSON.stringify(totals.stoppedBy)}`,
    `halts               ${JSON.stringify(totals.halts)}`,
    `checklist blocks    ${JSON.stringify(totals.checklistBlocks)}`,
    `misjumps            ${per(totals.misjumps)}; into empty space ${totals.misjumpsToEmptySpace}; destroyed ${totals.destroyed}; stranded ${totals.stranded}`,
    `drive malfunctions  ${per(totals.driveMalfunctions)}; still down at jump's end ${totals.drivesStillDownOnArrival}`,
    `low berths          ${totals.lowDied} of ${lowTotal} died${lowTotal ? ` (${(100 * totals.lowDied / lowTotal).toFixed(1)}%)` : ''}; lottery paid Cr${totals.lotteryPaidCr.toLocaleString('en-US')}`,
    `private messages    ${totals.messagesCarried} carried, ${totals.messagesDelivered} delivered`,
    `encounters          ${JSON.stringify(totals.encounters)}; tolls paid ${totals.tolls}`,
    `repossessions       ${JSON.stringify(totals.repossessions)}`,
    `revenue             freight Cr${totals.freightCr.toLocaleString('en-US')}, passage Cr${totals.passageCr.toLocaleString('en-US')}; account change Cr${totals.balanceChangeCr.toLocaleString('en-US')}`
  ];
  return lines.join('\n');
}

const options = parseArgs(process.argv.slice(2));
const policy = createDefaultPolicy({ hail: options.hail, inspect: options.inspect, fightPirates: options.fightPirates });
const context = { subsector: FAR_MERIDIAN_SUBSECTOR };
const totals = blankTotals();
const resolved = await startingCampaign(options);
const showEvents = options.runs === 1 || options.verbose;

for (let run = 0; run < options.runs; run += 1) {
  const seed = options.runs === 1 ? options.seed : `${options.seed}-${run + 1}`;
  const trip = createTrip(resolved, { seed, lanes: options.lanes });
  const startBalance = trip.ship.state.finances.balanceCr;
  const startDate = `${String(trip.campaign.time.dayOfYear).padStart(3, '0')}-${trip.campaign.time.year}`;
  if (showEvents && options.runs > 1) console.log(`\n--- ${seed}`);
  const outcome = runTrip(trip, context, {
    policy, arrivals: options.jumps,
    onEvent: showEvents && !options.json ? (entry) => console.log(`${entry.date}  ${entry.kind.padEnd(14)} ${entry.text}`) : null
  });
  if (showEvents && !options.json) console.log(`${outcome.date}  ${'stop'.padEnd(14)} ${outcome.stoppedBy}${outcome.halt ? `: ${outcome.halt.detail}` : ''}`);
  tally(totals, outcome, startBalance, startDate);
}

console.log(options.json ? JSON.stringify(totals, null, 2) : `\n${report(totals, options)}`);
