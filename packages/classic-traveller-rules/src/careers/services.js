function dm(characteristic, minimum, modifier) {
  return Object.freeze({ characteristic, minimum, modifier });
}

export const SERVICE_KEYS = Object.freeze([
  'navy',
  'marines',
  'army',
  'scouts',
  'merchants',
  'other'
]);

export const SERVICES = Object.freeze({
  navy: Object.freeze({
    key: 'navy',
    name: 'Navy',
    draftNumber: 1,
    enlistment: Object.freeze({ target: 8, dms: Object.freeze([dm('INT', 8, 1), dm('EDU', 9, 2)]) }),
    survival: Object.freeze({ target: 5, dms: Object.freeze([dm('INT', 7, 2)]) }),
    commission: Object.freeze({ target: 10, dms: Object.freeze([dm('SOC', 9, 1)]) }),
    promotion: Object.freeze({ target: 8, dms: Object.freeze([dm('EDU', 8, 1)]) }),
    reenlistment: Object.freeze({ target: 6 }),
    ranks: Object.freeze(['', 'Ensign', 'Lieutenant', 'Lt Commander', 'Commander', 'Captain', 'Admiral'])
  }),
  marines: Object.freeze({
    key: 'marines',
    name: 'Marines',
    draftNumber: 2,
    enlistment: Object.freeze({ target: 9, dms: Object.freeze([dm('INT', 8, 1), dm('STR', 8, 2)]) }),
    survival: Object.freeze({ target: 6, dms: Object.freeze([dm('END', 8, 2)]) }),
    commission: Object.freeze({ target: 9, dms: Object.freeze([dm('EDU', 7, 1)]) }),
    promotion: Object.freeze({ target: 9, dms: Object.freeze([dm('SOC', 8, 1)]) }),
    reenlistment: Object.freeze({ target: 6 }),
    ranks: Object.freeze(['', 'Lieutenant', 'Captain', 'Force Commander', 'Lt Colonel', 'Colonel', 'Brigadier'])
  }),
  army: Object.freeze({
    key: 'army',
    name: 'Army',
    draftNumber: 3,
    enlistment: Object.freeze({ target: 5, dms: Object.freeze([dm('DEX', 6, 1), dm('END', 5, 2)]) }),
    survival: Object.freeze({ target: 5, dms: Object.freeze([dm('EDU', 6, 2)]) }),
    commission: Object.freeze({ target: 5, dms: Object.freeze([dm('END', 7, 1)]) }),
    promotion: Object.freeze({ target: 6, dms: Object.freeze([dm('EDU', 7, 1)]) }),
    reenlistment: Object.freeze({ target: 7 }),
    ranks: Object.freeze(['', 'Lieutenant', 'Captain', 'Major', 'Lt Colonel', 'Colonel', 'General'])
  }),
  scouts: Object.freeze({
    key: 'scouts',
    name: 'Scouts',
    draftNumber: 4,
    enlistment: Object.freeze({ target: 7, dms: Object.freeze([dm('INT', 6, 1), dm('STR', 8, 2)]) }),
    survival: Object.freeze({ target: 7, dms: Object.freeze([dm('END', 9, 2)]) }),
    commission: null,
    promotion: null,
    reenlistment: Object.freeze({ target: 3 }),
    ranks: Object.freeze([''])
  }),
  merchants: Object.freeze({
    key: 'merchants',
    name: 'Merchants',
    draftNumber: 5,
    enlistment: Object.freeze({ target: 7, dms: Object.freeze([dm('STR', 7, 1), dm('INT', 6, 2)]) }),
    survival: Object.freeze({ target: 5, dms: Object.freeze([dm('INT', 7, 2)]) }),
    commission: Object.freeze({ target: 4, dms: Object.freeze([dm('INT', 6, 1)]) }),
    promotion: Object.freeze({ target: 10, dms: Object.freeze([dm('INT', 9, 1)]) }),
    reenlistment: Object.freeze({ target: 4 }),
    ranks: Object.freeze(['', '4th Officer', '3rd Officer', '2nd Officer', '1st Officer', 'Captain'])
  }),
  other: Object.freeze({
    key: 'other',
    name: 'Other',
    draftNumber: 6,
    enlistment: Object.freeze({ target: 3, dms: Object.freeze([]) }),
    survival: Object.freeze({ target: 5, dms: Object.freeze([dm('INT', 9, 1)]) }),
    commission: null,
    promotion: null,
    reenlistment: Object.freeze({ target: 5 }),
    ranks: Object.freeze([''])
  })
});

export function getService(serviceKey) {
  const service = SERVICES[serviceKey];
  if (!service) {
    throw new RangeError(`unknown Classic Traveller service: ${serviceKey}`);
  }
  return service;
}

export function serviceForDraftRoll(roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError(`draft roll must be an integer from 1 to 6; received ${roll}`);
  }
  return SERVICES[SERVICE_KEYS[roll - 1]];
}

export function calculateDM(characteristics, dms = []) {
  return dms.reduce((total, rule) => {
    return total + (characteristics[rule.characteristic] >= rule.minimum ? rule.modifier : 0);
  }, 0);
}
