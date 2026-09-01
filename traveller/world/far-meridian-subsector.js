// Original Graycloak campaign content, not Classic Traveller setting canon.
// The 8x10/one-parsec hex geometry follows the Classic Traveller Book 3
// subsector-map convention. System names, UWPs, notes, bases, and travel-zone
// assignments below are provisional Sea of Suns campaign content.

function world(id, name, uwp) {
  return Object.freeze({ id, name, uwp });
}

function system({ id, hex, name, mainWorld, scout = false, naval = false, gasGiant = false, travelZone = 'none', notes = '' }) {
  return Object.freeze({
    id,
    hex,
    name,
    mainWorld,
    bases: Object.freeze({ scout, naval }),
    gasGiant,
    travelZone,
    notes
  });
}

export const FAR_MERIDIAN_SUBSECTOR = Object.freeze({
  id: 'far-meridian-test-subsector',
  name: 'Far Meridian',
  provenance: Object.freeze({
    kind: 'graycloak-original-test-content',
    status: 'provisional'
  }),
  systems: Object.freeze([
    system({
      id: 'port-meridian', hex: '0405', name: 'Port Meridian',
      mainWorld: world('new-esperanza', 'New Esperanza', 'A867944-C'),
      scout: true, naval: true, gasGiant: true,
      notes: 'Regional commercial and naval gateway; the best-developed port on the local routes.'
    }),
    system({
      id: 'aster', hex: '0505', name: 'Aster',
      mainWorld: world('aster-prime', 'Aster Prime', 'B765845-9'),
      scout: true, gasGiant: true,
      notes: 'Prosperous settled world with reliable port services and a long-established Scout presence.'
    }),
    system({
      id: 'san-telmo', hex: '0305', name: 'San Telmo',
      mainWorld: world('san-telmo-main', 'San Telmo', 'B667755-A'),
      scout: true, gasGiant: true,
      notes: 'Wet agricultural-industrial world serving as a provisioning stop on the inner frontier route.'
    }),
    system({
      id: 'pelagos', hex: '0503', name: 'Pelagos',
      mainWorld: world('pelagos-main', 'Pelagos', 'C789674-8'),
      gasGiant: true,
      notes: 'Water-heavy world whose scattered settlements depend on maritime transport and orbital transfer.'
    }),
    system({
      id: 'bellona', hex: '0407', name: 'Bellona',
      mainWorld: world('bellona-main', 'Bellona', 'C200677-9'),
      gasGiant: true,
      notes: 'Airless mining and fabrication world with politically divided industrial settlements.'
    }),
    system({
      id: 'calder', hex: '0605', name: 'Calder',
      mainWorld: world('calder-main', 'Calder', 'C544635-8'),
      gasGiant: true,
      notes: 'Thin-atmosphere frontier world with modest population and locally controlled extraction industries.'
    }),
    system({
      id: 'vesper', hex: '0204', name: 'Vesper',
      mainWorld: world('vesper-main', 'Vesper', 'D310545-8'),
      scout: true, gasGiant: true, travelZone: 'amber',
      notes: 'Sparse settlements and recurring jurisdictional disputes make port calls unpredictable.'
    }),
    system({
      id: 'orison', hex: '0704', name: 'Orison',
      mainWorld: world('orison-main', 'Orison', 'B565687-A'),
      naval: true, gasGiant: true,
      notes: 'Strategically placed naval station and settled world guarding routes toward the eastern marches.'
    }),
    system({
      id: 'northmark', hex: '0302', name: 'Northmark',
      mainWorld: world('northmark-main', 'Northmark', 'C653554-8'),
      scout: true, gasGiant: true, travelZone: 'amber',
      notes: 'Cold, dry colonial world where rival charter interests compete for control of the port hinterland.'
    }),
    system({
      id: 'sable', hex: '0708', name: 'Sable',
      mainWorld: world('sable-main', 'Sable', 'D411430-7'),
      gasGiant: false,
      notes: 'Small low-atmosphere settlement with limited facilities and little traffic beyond local contracts.'
    }),
    system({
      id: 'tamarind', hex: '0209', name: 'Tamarind',
      mainWorld: world('tamarind-main', 'Tamarind', 'C877864-8'),
      scout: true, gasGiant: true,
      notes: 'Large humid world with a substantial population and a busy secondary route through the southern reaches.'
    }),
    system({
      id: 'cinder', hex: '0802', name: 'Cinder',
      mainWorld: world('cinder-main', 'Cinder', 'E200312-6'),
      gasGiant: true, travelZone: 'amber',
      notes: 'Marginal rockball settlement with almost no port infrastructure and significant environmental hazards.'
    }),
    system({
      id: 'lacuna', hex: '0609', name: 'Lacuna',
      mainWorld: world('lacuna-main', 'Lacuna', 'D310200-7'),
      gasGiant: true, travelZone: 'red',
      notes: 'A tiny inhabited world under formal interdiction; ordinary traffic is warned away from the system.'
    }),
    system({
      id: 'heliograph', hex: '0102', name: 'Heliograph',
      mainWorld: world('heliograph-main', 'Heliograph', 'B584443-A'),
      scout: true, gasGiant: false,
      notes: 'Technical and communications outpost known for long-range survey work and route-chart archives.'
    })
  ])
});
