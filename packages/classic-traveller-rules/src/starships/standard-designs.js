function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export const TYPE_S_SCOUT_COURIER_KEY = 'type-s-scout-courier';

export const TYPE_S_SCOUT_COURIER = deepFreeze({
  key: TYPE_S_SCOUT_COURIER_KEY,
  typeCode: 'S',
  name: 'Scout/Courier',
  mission: ['exploration', 'survey', 'courier'],
  hull: {
    tons: 100,
    standard: true,
    streamlined: true
  },
  drives: {
    jump: { letter: 'A', rating: 2 },
    maneuver: { letter: 'A', rating: 2 },
    powerPlant: { letter: 'A', rating: 2 }
  },
  fuel: {
    capacityTons: 40,
    jumpFuelTonsAtMaxJump: 20,
    // Book 2 p.6: the power plant formula 10Pn provides power "for one trip".
    // Pn is 2 for a power plant-A in a 100-ton hull (p.11 maximum drive
    // potential), so 20 tons per trip, not a four-week allowance to prorate.
    // The design's own 40-ton tankage is the proof: 20 jump + 20 power plant.
    powerPlantFuelTonsPerTrip: 20
  },
  computer: {
    // Book 2 p.19: the Scout/Courier ships with "Computer Model/1, with basic
    // software package". p.14's computer models table gives Model/1 a CPU of 2
    // and storage of 4 at MCr 2; the Model/1 bis recorded here previously is a
    // different machine (CPU 4, no storage, MCr 5) and breaks the price proof —
    // costing the hull with it yields MCr 35.19 rather than the printed 32.49.
    // Book 2 p.24's sample data card for a Type S confirms Model/1, CPU 2,
    // storage 4.
    model: '1',
    tons: 1,
    cpu: 2,
    storage: 4,
    maximumSupportedJump: 2
  },
  accommodations: {
    staterooms: 4,
    lowBerths: 0
  },
  cargo: {
    capacityTons: 3
  },
  armament: {
    hardpoints: 1,
    turrets: [{
      id: 'T-1',
      mount: 'double',
      fireControlInstalled: true,
      fireControlTons: 1,
      weapons: []
    }]
  },
  vehicles: [{
    name: 'Air/Raft',
    tons: 4,
    stowage: 'specially fitted hangar within ship'
  }],
  crew: {
    standardCount: 1,
    standardDuties: ['pilot', 'engineer'],
    rulesMinimumPositions: [{ role: 'pilot', skill: 'Pilot', minimumLevel: 1 }],
    notes: 'Book 2 general crew rules do not require a separate engineer on ships under 200 tons; the Type S standard-design description assigns engineering duties to its single crew member.'
  },
  economics: {
    // Book 2 p.18 prints CR 32,490,000, and states on the same page that the
    // standard-design prices already include the 10% reduction for standard
    // designs. Nothing here or in operations.js applies that reduction again;
    // the flag only records that the printed figure has it built in.
    standardDesignDiscountApplied: true,
    newCostMCr: 32.49,
    buildMonths: 9,
    annualRoutineMaintenanceCr: 32490
  },
  sources: [
    'Classic Traveller Book 2 p.19 (standard Scout/Courier design)',
    'Classic Traveller Book 2 p.15 (crew requirements)',
    'Classic Traveller Book 2 p.14 (fuel formula)',
    'Classic Traveller Book 2 p.18 (base price CR 32,490,000, standard-design reduction already included)',
    'Classic Traveller Book 2 p.19 (Computer Model/1), p.14 (computer models table)'
  ]
});

const STANDARD_DESIGNS = Object.freeze({
  [TYPE_S_SCOUT_COURIER_KEY]: TYPE_S_SCOUT_COURIER
});

export const STANDARD_SHIP_DESIGN_KEYS = Object.freeze(Object.keys(STANDARD_DESIGNS));

export function getStandardShipDesign(key) {
  const design = STANDARD_DESIGNS[key];
  if (!design) throw new RangeError(`unknown standard ship design: ${key}`);
  return design;
}
