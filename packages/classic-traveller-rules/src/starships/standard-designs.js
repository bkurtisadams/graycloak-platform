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
    powerPlantFuelTonsForFourWeeks: 20
  },
  computer: {
    model: '1bis',
    tons: 1,
    cpu: 4,
    storage: 0,
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
    'Classic Traveller Book 2 p.18 (base price CR 32,490,000, standard-design reduction already included)'
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
