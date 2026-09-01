import {
  calculateShipCharterPrice,
  privateMessageAvailable,
  privateMessageHonorarium
} from '../../packages/classic-traveller-rules/index.js';

function seed32(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seedText) {
  let state = seed32(seedText) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function diceFromRandom(random) {
  const rollD6 = () => Math.floor(random() * 6) + 1;
  return {
    rollD6,
    roll2D6() {
      const dice = [rollD6(), rollD6()];
      return { dice, total: dice[0] + dice[1] };
    }
  };
}

function dateLabel(campaign) {
  if (!campaign?.time) return 'NO-DATE';
  return `${String(campaign.time.dayOfYear).padStart(3, '0')}-${campaign.time.year}`;
}

export function contractBoardKey({ campaign, system, ship } = {}) {
  const portKey = ship?.state?.portCall?.systemId === system?.id && ship.state.portCall.arrivalDate
    ? ship.state.portCall.arrivalDate
    : dateLabel(campaign);
  return [campaign?.identity?.id ?? 'campaign', system?.id ?? 'system', portKey, 'contract-board'].join('|');
}

function chooseDestination(destinations, random, excludeIds = new Set()) {
  const eligible = destinations.filter((entry) => !excludeIds.has(entry.system.id));
  const pool = eligible.length ? eligible : destinations;
  if (!pool.length) return null;
  return pool[Math.floor(random() * pool.length)];
}

function issuerName(system, suffix) {
  return `${system.mainWorld.name} ${suffix}`;
}

function offerBase({ key, index, kind, title, rulesBasis, system, destination, issuerName: name, issuerType, paymentCr, deadlineDays, cargoTons = 0, exclusiveShip = false, requirementsDescription = '', notes = '' }) {
  return Object.freeze({
    offerId: `${key}:${index}:${kind}:${destination.system.id}`,
    kind,
    title,
    rulesBasis,
    setting: 'Sea of Suns',
    issuerName: name,
    issuerType,
    originSystemId: system.id,
    originSystemName: system.name,
    destinationSystemId: destination.system.id,
    destinationSystemName: destination.system.name,
    distance: destination.distance,
    paymentCr,
    deadlineDays,
    cargoTons,
    exclusiveShip,
    requirementsDescription,
    notes
  });
}

export function generateContractBoard({ campaign, system, destinations = [], ship } = {}) {
  if (!campaign || !system || !ship) return Object.freeze({ key: null, offers: Object.freeze([]) });
  const reachable = destinations.filter((entry) => entry?.system && Number.isInteger(entry.distance) && entry.distance >= 1);
  if (!reachable.length) return Object.freeze({ key: contractBoardKey({ campaign, system, ship }), offers: Object.freeze([]) });

  const key = contractBoardKey({ campaign, system, ship });
  const random = randomFromSeed(key);
  const dice = diceFromRandom(random);
  const offers = [];
  const used = new Set();

  const charterDestination = chooseDestination(reachable, random, used);
  if (charterDestination) {
    used.add(charterDestination.system.id);
    const charter = calculateShipCharterPrice(ship);
    offers.push(offerBase({
      key, index: 1, kind: 'charter', title: 'Whole-Ship Charter', rulesBasis: 'classic-traveller-book-2-charter',
      system, destination: charterDestination,
      issuerName: issuerName(system, 'Commercial Exchange'), issuerType: 'commercial',
      paymentCr: charter.totalCr, deadlineDays: 14, exclusiveShip: true,
      requirementsDescription: 'Exclusive use of ship for one two-week charter block. Owner supplies crew and overhead.',
      notes: `Book 2 charter rate: Cr900/cargo ton + Cr9,000/high-passage berth + Cr900/low berth; Type S quote ${charter.totalCr}.`
    }));
  }

  const courierDestination = chooseDestination(reachable, random, used);
  if (courierDestination) {
    used.add(courierDestination.system.id);
    const paymentCr = 7000 + courierDestination.distance * 4000 + dice.rollD6() * 1000;
    offers.push(offerBase({
      key, index: 2, kind: 'priority-courier', title: 'Priority Courier Packet', rulesBasis: 'sea-of-suns-original',
      system, destination: courierDestination,
      issuerName: issuerName(system, 'Dispatch Office'), issuerType: 'government',
      paymentCr, deadlineDays: 14,
      requirementsDescription: 'Sealed priority packet. Negligible cargo displacement.',
      notes: 'Original Sea of Suns contract built on the setting assumption that interstellar information travels by ship.'
    }));
  }

  const jobDestination = chooseDestination(reachable, random, used);
  if (jobDestination) {
    used.add(jobDestination.system.id);
    if (random() < 0.55) {
      const maxCargo = Math.max(1, Math.min(3, Math.floor(ship.specifications.cargo.capacityTons)));
      const cargoTons = 1 + Math.floor(random() * maxCargo);
      const paymentCr = cargoTons * 3000 + jobDestination.distance * 2500 + dice.rollD6() * 500;
      offers.push(offerBase({
        key, index: 3, kind: 'delivery', title: 'Priority Small-Lot Delivery', rulesBasis: 'sea-of-suns-original',
        system, destination: jobDestination,
        issuerName: issuerName(system, 'Factors Guild'), issuerType: 'commercial',
        paymentCr, deadlineDays: 14, cargoTons,
        requirementsDescription: `${cargoTons} tons sealed priority cargo. Payment on timely delivery.`,
        notes: 'Original Sea of Suns fixed-fee delivery contract; separate from Book 2 common-carrier freight.'
      }));
    } else {
      const paymentCr = 10000 + jobDestination.distance * 5000 + dice.roll2D6().total * 500;
      offers.push(offerBase({
        key, index: 3, kind: 'survey', title: 'Route Verification Survey', rulesBasis: 'sea-of-suns-original',
        system, destination: jobDestination,
        issuerName: issuerName(system, 'Survey Bureau'), issuerType: 'survey',
        paymentCr, deadlineDays: 21,
        requirementsDescription: 'Verify current route and navigation observations at destination. No dedicated cargo tonnage.',
        notes: 'Original Sea of Suns survey work suited to Scout-trained crews.'
      }));
    }
  }

  const messageCheck = privateMessageAvailable(dice);
  if (messageCheck.available) {
    const destination = chooseDestination(reachable, random);
    const honorarium = privateMessageHonorarium(dice);
    offers.push(offerBase({
      key, index: 4, kind: 'private-message', title: 'Private Message', rulesBasis: 'classic-traveller-book-2-private-message',
      system, destination,
      issuerName: 'Private Principal', issuerType: 'private',
      paymentCr: honorarium.amountCr, deadlineDays: 21,
      requirementsDescription: 'Private message for hand delivery. Negligible cargo displacement.',
      notes: `Book 2 private-message availability succeeded on ${messageCheck.roll.total}; honorarium generated within the stated Cr20-Cr120 range.`
    }));
  }

  return Object.freeze({ key, offers: Object.freeze(offers) });
}
