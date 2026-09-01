// Original Graycloak campaign content, not Classic Traveller setting canon.
// The 8x10/one-parsec hex geometry follows the Classic Traveller Book 3
// subsector-map convention; names and worlds below are authored test content.

export const FAR_MERIDIAN_SUBSECTOR = Object.freeze({
  id: 'far-meridian-test-subsector',
  name: 'Far Meridian',
  provenance: Object.freeze({
    kind: 'graycloak-original-test-content',
    status: 'provisional'
  }),
  systems: Object.freeze([
    Object.freeze({ id: 'port-meridian', hex: '0405', name: 'Port Meridian', mainWorld: Object.freeze({ id: 'new-esperanza', name: 'New Esperanza' }) }),
    Object.freeze({ id: 'aster', hex: '0505', name: 'Aster', mainWorld: Object.freeze({ id: 'aster-prime', name: 'Aster Prime' }) }),
    Object.freeze({ id: 'san-telmo', hex: '0305', name: 'San Telmo', mainWorld: Object.freeze({ id: 'san-telmo-main', name: 'San Telmo' }) }),
    Object.freeze({ id: 'pelagos', hex: '0503', name: 'Pelagos', mainWorld: Object.freeze({ id: 'pelagos-main', name: 'Pelagos' }) }),
    Object.freeze({ id: 'bellona', hex: '0407', name: 'Bellona', mainWorld: Object.freeze({ id: 'bellona-main', name: 'Bellona' }) }),
    Object.freeze({ id: 'calder', hex: '0605', name: 'Calder', mainWorld: Object.freeze({ id: 'calder-main', name: 'Calder' }) }),
    Object.freeze({ id: 'vesper', hex: '0204', name: 'Vesper', mainWorld: Object.freeze({ id: 'vesper-main', name: 'Vesper' }) }),
    Object.freeze({ id: 'orison', hex: '0704', name: 'Orison', mainWorld: Object.freeze({ id: 'orison-main', name: 'Orison' }) }),
    Object.freeze({ id: 'northmark', hex: '0302', name: 'Northmark', mainWorld: Object.freeze({ id: 'northmark-main', name: 'Northmark' }) }),
    Object.freeze({ id: 'sable', hex: '0708', name: 'Sable', mainWorld: Object.freeze({ id: 'sable-main', name: 'Sable' }) }),
    Object.freeze({ id: 'tamarind', hex: '0209', name: 'Tamarind', mainWorld: Object.freeze({ id: 'tamarind-main', name: 'Tamarind' }) }),
    Object.freeze({ id: 'cinder', hex: '0802', name: 'Cinder', mainWorld: Object.freeze({ id: 'cinder-main', name: 'Cinder' }) }),
    Object.freeze({ id: 'lacuna', hex: '0609', name: 'Lacuna', mainWorld: Object.freeze({ id: 'lacuna-main', name: 'Lacuna' }) }),
    Object.freeze({ id: 'heliograph', hex: '0102', name: 'Heliograph', mainWorld: Object.freeze({ id: 'heliograph-main', name: 'Heliograph' }) })
  ])
});
