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


export const TYPE_A_FREE_TRADER_KEY = 'type-a-free-trader';

export const TYPE_A_FREE_TRADER = deepFreeze({
  key: TYPE_A_FREE_TRADER_KEY,
  typeCode: 'A',
  name: 'Free Trader',
  mission: ['commercial', 'freight', 'passengers'],
  hull: {
    tons: 200,
    standard: true,
    streamlined: true
  },
  drives: {
    jump: { letter: 'A', rating: 1 },
    maneuver: { letter: 'A', rating: 1 },
    powerPlant: { letter: 'A', rating: 1 }
  },
  fuel: {
    capacityTons: 30,
    jumpFuelTonsAtMaxJump: 20,
    powerPlantFuelTonsPerTrip: 10
  },
  computer: { model: '1', tons: 1, cpu: 2, storage: 4, maximumSupportedJump: 2 },
  accommodations: {
    staterooms: 10,
    lowBerths: 20
  },
  cargo: {
    capacityTons: 82
  },
  armament: {
    hardpoints: 2,
    turrets: []
  },
  vehicles: [],
  crew: {
    standardCount: 4,
    standardDuties: ['pilot', 'engineer', 'medic', 'steward'],
    rulesMinimumPositions: [
      { role: 'pilot', skill: 'Pilot', minimumLevel: 1 },
      { role: 'engineer', skill: 'Engineer', minimumLevel: 1 },
      { role: 'medic', skill: 'Medic', minimumLevel: 1 },
      { role: 'steward', skill: 'Steward', minimumLevel: 1 }
    ],
    notes: 'Book 2 p.19: four crew - pilot, engineer, medic and steward. Two hardpoints are specified but carry no turrets; two tons are held in reserve for fire control if turrets are fitted later.'
  },
  economics: {
    standardDesignDiscountApplied: true,
    newCostMCr: 37.08,
    buildMonths: 11,
    annualRoutineMaintenanceCr: 37080
  },
  sources: [
    'Classic Traveller Book 2 p.19 (standard Free Trader design)',
    'Classic Traveller Book 2 p.17 (crew requirements)',
    'Classic Traveller Book 2 p.18 (base price CR 37,080,000)'
  ]
});

export const TYPE_R_SUBSIDIZED_MERCHANT_KEY = 'type-r-subsidized-merchant';

export const TYPE_R_SUBSIDIZED_MERCHANT = deepFreeze({
  key: TYPE_R_SUBSIDIZED_MERCHANT_KEY,
  typeCode: 'R',
  name: 'Subsidized Merchant',
  mission: ['commercial', 'subsidized route', 'freight', 'passengers'],
  hull: {
    tons: 400,
    standard: true,
    streamlined: true
  },
  drives: {
    jump: { letter: 'C', rating: 1 },
    maneuver: { letter: 'C', rating: 1 },
    powerPlant: { letter: 'C', rating: 1 }
  },
  fuel: {
    capacityTons: 50,
    jumpFuelTonsAtMaxJump: 40,
    powerPlantFuelTonsPerTrip: 10
  },
  computer: { model: '1', tons: 1, cpu: 2, storage: 4, maximumSupportedJump: 2 },
  accommodations: {
    staterooms: 13,
    lowBerths: 9
  },
  cargo: {
    capacityTons: 200
  },
  armament: {
    hardpoints: 2,
    turrets: []
  },
  vehicles: [
      { name: 'Life Boat', tons: 20, stowage: 'hull compartment' }
  ],
  crew: {
    standardCount: 5,
    standardDuties: ['pilot', 'navigator', 'engineer', 'medic', 'steward'],
    rulesMinimumPositions: [
      { role: 'pilot', skill: 'Pilot', minimumLevel: 1 },
      { role: 'navigator', skill: 'Navigator', minimumLevel: 1 },
      { role: 'engineer', skill: 'Engineer', minimumLevel: 1 },
      { role: 'medic', skill: 'Medic', minimumLevel: 1 },
      { role: 'steward', skill: 'Steward', minimumLevel: 1 }
    ],
    notes: 'Book 2 p.19: five crew - pilot, navigator, medic, steward and engineer. Two hardpoints, no turrets installed.'
  },
  economics: {
    standardDesignDiscountApplied: true,
    newCostMCr: 100.035,
    buildMonths: 15,
    annualRoutineMaintenanceCr: 100035
  },
  sources: [
    'Classic Traveller Book 2 p.19 (standard Subsidized Merchant Type R design)',
    'Classic Traveller Book 2 p.17 (crew requirements)',
    'Classic Traveller Book 2 p.19 (base price CR 100,035,000)'
  ]
});

export const TYPE_M_SUBSIDIZED_MERCHANT_KEY = 'type-m-subsidized-merchant';

export const TYPE_M_SUBSIDIZED_MERCHANT = deepFreeze({
  key: TYPE_M_SUBSIDIZED_MERCHANT_KEY,
  typeCode: 'M',
  name: 'Subsidized Merchant',
  mission: ['commercial', 'subsidized route', 'freight', 'passengers'],
  hull: {
    tons: 600,
    standard: true,
    streamlined: false
  },
  drives: {
    jump: { letter: 'J', rating: 3 },
    maneuver: { letter: 'D', rating: 1 },
    powerPlant: { letter: 'D', rating: 1 }
  },
  fuel: {
    capacityTons: 190,
    jumpFuelTonsAtMaxJump: 180,
    powerPlantFuelTonsPerTrip: 10
  },
  computer: { model: '3', tons: 3, cpu: 5, storage: 9, maximumSupportedJump: 3 },
  accommodations: {
    staterooms: 30,
    lowBerths: 80
  },
  cargo: {
    capacityTons: 124
  },
  armament: {
    hardpoints: 3,
    turrets: []
  },
  vehicles: [],
  crew: {
    standardCount: 9,
    standardDuties: ['pilot', 'navigator', 'medic', 'engineer', 'steward'],
    rulesMinimumPositions: [
      { role: 'pilot', skill: 'Pilot', minimumLevel: 1 },
      { role: 'navigator', skill: 'Navigator', minimumLevel: 1 },
      { role: 'engineer', skill: 'Engineer', minimumLevel: 1 },
      { role: 'medic', skill: 'Medic', minimumLevel: 1 },
      { role: 'steward', skill: 'Steward', minimumLevel: 1 }
    ],
    notes: 'Book 2 p.20: nine crew - pilot, navigator, medic, three engineers and three stewards. Three hardpoints, no turrets; three tons reserved for fire control. Not streamlined.'
  },
  economics: {
    standardDesignDiscountApplied: true,
    newCostMCr: 219.87,
    buildMonths: 23,
    annualRoutineMaintenanceCr: 219870
  },
  sources: [
    'Classic Traveller Book 2 p.20 (standard Subsidized Merchant Type M design)',
    'Classic Traveller Book 2 p.17 (crew requirements)',
    'Classic Traveller Book 2 p.20 (base price CR 219,870,000 as printed; costing the design from the Book 2 component tables gives MCr 226.30 before the standard-design reduction, MCr 18 short of the printed figure - flagged, printed price kept)'
  ]
});

export const TYPE_Y_YACHT_KEY = 'type-y-yacht';

export const TYPE_Y_YACHT = deepFreeze({
  key: TYPE_Y_YACHT_KEY,
  typeCode: 'Y',
  name: 'Yacht',
  mission: ['private', 'leisure'],
  hull: {
    tons: 200,
    standard: true,
    streamlined: false
  },
  drives: {
    jump: { letter: 'A', rating: 1 },
    maneuver: { letter: 'A', rating: 1 },
    powerPlant: { letter: 'A', rating: 1 }
  },
  fuel: {
    capacityTons: 39,
    jumpFuelTonsAtMaxJump: 20,
    // Tankage of 39 tons includes 9 tons for one full refuelling of the ship's boat.
    powerPlantFuelTonsPerTrip: 10
  },
  computer: { model: '1', tons: 1, cpu: 2, storage: 4, maximumSupportedJump: 2 },
  accommodations: {
    staterooms: 16,
    lowBerths: 0
  },
  cargo: {
    capacityTons: 13
  },
  armament: {
    hardpoints: 1,
    turrets: []
  },
  vehicles: [
      { name: "Ship's Boat", tons: 30, stowage: 'hull compartment' },
      { name: 'Air/Raft', tons: 4, stowage: 'hull compartment' },
      { name: 'ATV', tons: 10, stowage: 'hull compartment' }
  ],
  crew: {
    standardCount: 4,
    standardDuties: ['pilot', 'engineer', 'medic', 'steward'],
    rulesMinimumPositions: [
      { role: 'pilot', skill: 'Pilot', minimumLevel: 1 },
      { role: 'engineer', skill: 'Engineer', minimumLevel: 1 },
      { role: 'medic', skill: 'Medic', minimumLevel: 1 },
      { role: 'steward', skill: 'Steward', minimumLevel: 1 }
    ],
    notes: 'Book 2 p.20: four crew - pilot, engineer, medic and steward. Two staterooms are joined into a suite for the owner-aboard. One hardpoint, no turret installed.'
  },
  economics: {
    standardDesignDiscountApplied: true,
    newCostMCr: 59.49,
    buildMonths: 11,
    annualRoutineMaintenanceCr: 59490
  },
  sources: [
    'Classic Traveller Book 2 p.20 (standard Yacht Type Y design)',
    'Classic Traveller Book 2 p.17 (crew requirements)',
    'Classic Traveller Book 2 p.20 (base price CR 59,490,000)'
  ]
});

export const TYPE_C_CRUISER_KEY = 'type-c-cruiser';

export const TYPE_C_CRUISER = deepFreeze({
  key: TYPE_C_CRUISER_KEY,
  typeCode: 'C',
  name: 'Cruiser',
  mission: ['quasi-military', 'patrol', 'private security'],
  hull: {
    tons: 800,
    standard: true,
    streamlined: false
  },
  drives: {
    jump: { letter: 'M', rating: 3 },
    maneuver: { letter: 'M', rating: 3 },
    powerPlant: { letter: 'M', rating: 3 }
  },
  fuel: {
    capacityTons: 288,
    jumpFuelTonsAtMaxJump: 240,
    // Book 2 p.20 prints 288 tons including 48 for refuelling the pinnaces. That leaves exactly the 240 tons of jump fuel and nothing for the power plant's 10Pn of 30 - flagged, printed tankage kept.
    powerPlantFuelTonsPerTrip: 30
  },
  computer: { model: '5', tons: 5, cpu: 12, storage: 25, maximumSupportedJump: 6 },
  accommodations: {
    staterooms: 25,
    lowBerths: 0
  },
  cargo: {
    capacityTons: 80
  },
  armament: {
    hardpoints: 8,
    turrets: [
      { id: 'T-1', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-2', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-3', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-4', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-5', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-6', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-7', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] },
      { id: 'T-8', mount: 'triple', fireControlInstalled: true, fireControlTons: 1, weapons: [] }
    ]
  },
  vehicles: [
      { name: 'Pinnace', tons: 40, stowage: 'hull compartment' },
      { name: 'Pinnace', tons: 40, stowage: 'hull compartment' },
      { name: 'ATV', tons: 10, stowage: 'hull compartment' },
      { name: 'ATV', tons: 10, stowage: 'hull compartment' },
      { name: 'Air/Raft', tons: 4, stowage: 'hull compartment' }
  ],
  crew: {
    standardCount: 45,
    standardDuties: ['commanding officer', 'pilot', 'navigator', 'medic', 'chief engineer'],
    rulesMinimumPositions: [
      { role: 'pilot', skill: 'Pilot', minimumLevel: 1 },
      { role: 'navigator', skill: 'Navigator', minimumLevel: 1 },
      { role: 'engineer', skill: 'Engineer', minimumLevel: 1 },
      { role: 'medic', skill: 'Medic', minimumLevel: 1 },
      { role: 'gunner', skill: 'Gunnery', minimumLevel: 1 }
    ],
    notes: 'Book 2 pp.20-21: 45 aboard - five senior officers in single staterooms and 40 more at double occupancy, including eight gunners for the eight triple turrets. Turrets are installed but carry no weaponry.'
  },
  economics: {
    standardDesignDiscountApplied: true,
    newCostMCr: 419.67,
    buildMonths: 27,
    annualRoutineMaintenanceCr: 419670
  },
  sources: [
    'Classic Traveller Book 2 pp.20-21 (standard Cruiser Type C design)',
    'Classic Traveller Book 2 p.17 (crew requirements)',
    'Classic Traveller Book 2 p.21 (base price CR 419,670,000)'
  ]
});

const STANDARD_DESIGNS = Object.freeze({
  [TYPE_S_SCOUT_COURIER_KEY]: TYPE_S_SCOUT_COURIER,
  [TYPE_A_FREE_TRADER_KEY]: TYPE_A_FREE_TRADER,
  [TYPE_R_SUBSIDIZED_MERCHANT_KEY]: TYPE_R_SUBSIDIZED_MERCHANT,
  [TYPE_M_SUBSIDIZED_MERCHANT_KEY]: TYPE_M_SUBSIDIZED_MERCHANT,
  [TYPE_Y_YACHT_KEY]: TYPE_Y_YACHT,
  [TYPE_C_CRUISER_KEY]: TYPE_C_CRUISER
});

export const STANDARD_SHIP_DESIGN_KEYS = Object.freeze(Object.keys(STANDARD_DESIGNS));

export function getStandardShipDesign(key) {
  const design = STANDARD_DESIGNS[key];
  if (!design) throw new RangeError(`unknown standard ship design: ${key}`);
  return design;
}
