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

function route(from, to, distance) {
  return Object.freeze({ from, to, distance });
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
    }),
    // v0.325.0 (Kurt, Sep 2026): fourteen hand-made worlds left Far Meridian
    // at 18% settled, sparser than Book 3's sparse setting (DM -1, about a
    // third) that the charted subsectors round it now use. Each empty hex was
    // thrown once for a world on 6 (seed 'far-meridian|book-3-fill|v0.325.0'),
    // and each world found created by the p.12 checklist, bringing the
    // subsector to 28 worlds, 35%. Names, notes and zones are the referee's
    // to change.
    system({
      id: 'gribainol', hex: '0106', name: 'Gribainol',
      mainWorld: world('gribainol-main', 'Gribainol', 'A345553-F'),
      naval: true, gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Agricultural, Non-Industrial).'
    }),
    system({
      id: 'zaegaecor', hex: '0308', name: 'Zaegaecor',
      mainWorld: world('zaegaecor-main', 'Zaegaecor', 'D552888-6'),
      scout: true, gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Poor).'
    }),
    system({
      id: 'baegro', hex: '0401', name: 'Baegro',
      mainWorld: world('baegro-main', 'Baegro', 'B667433-6'),
      gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Industrial).'
    }),
    system({
      id: 'greafucost', hex: '0403', name: 'Greafucost',
      mainWorld: world('greafucost-main', 'Greafucost', 'A410795-9'),
      gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Agricultural).'
    }),
    system({
      id: 'fiobys', hex: '0404', name: 'Fiobys',
      mainWorld: world('fiobys-main', 'Fiobys', 'C24078C-6'),
      gasGiant: false,
      notes: 'Charted by Book 3 (1977) world creation (Poor).'
    }),
    system({
      id: 'ycest', hex: '0408', name: 'Ycest',
      mainWorld: world('ycest-main', 'Ycest', 'B361377-9'),
      gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Industrial).'
    }),
    system({
      id: 'staega', hex: '0506', name: 'Staega',
      mainWorld: world('staega-main', 'Staega', 'C66A449-6'),
      scout: true, gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Industrial).'
    }),
    system({
      id: 'fodrizund', hex: '0508', name: 'Fodrizund',
      mainWorld: world('fodrizund-main', 'Fodrizund', 'D120652-7'),
      gasGiant: false,
      notes: 'Charted by Book 3 (1977) world creation (Non-Agricultural, Non-Industrial, Poor).'
    }),
    system({
      id: 'triotreand', hex: '0603', name: 'Triotreand',
      mainWorld: world('triotreand-main', 'Triotreand', 'B440766-A'),
      naval: true, gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Poor).'
    }),
    system({
      id: 'dreavidrand', hex: '0701', name: 'Dreavidrand',
      mainWorld: world('dreavidrand-main', 'Dreavidrand', 'C8A7575-A'),
      gasGiant: false,
      notes: 'Charted by Book 3 (1977) world creation (Non-Industrial).'
    }),
    system({
      id: 'fiozaisust', hex: '0705', name: 'Fiozaisust',
      mainWorld: world('fiozaisust-main', 'Fiozaisust', 'C433653-8'),
      gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Agricultural, Non-Industrial, Poor).'
    }),
    system({
      id: 'greagu', hex: '0803', name: 'Greagu',
      mainWorld: world('greagu-main', 'Greagu', 'A500666-9'),
      naval: true, gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Agricultural, Non-Industrial).'
    }),
    system({
      id: 'hiipaim', hex: '0808', name: 'Hiipaim',
      mainWorld: world('hiipaim-main', 'Hiipaim', 'A8B1221-C'),
      scout: true, gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Industrial).'
    }),
    system({
      id: 'fyshael', hex: '0810', name: 'Fyshael',
      mainWorld: world('fyshael-main', 'Fyshael', 'C614540-5'),
      gasGiant: true,
      notes: 'Charted by Book 3 (1977) world creation (Non-Industrial).'
    })
  ]),
  // Book 3 p.2-3 Route Determination, thrown once (seed
  // 'far-meridian|book-3-p2-routes', rollJumpRoutes) and kept as map data:
  // 13 lanes from 23 checks. Cinder, Sable, Tamarind and Lacuna chart none —
  // their starports and distances leave the table no row or a failed throw —
  // so leaving them takes the Generate program (Book 2 p.32). Edit freely:
  // the referee may always impose a lane.
  routes: Object.freeze([
    route('heliograph', 'northmark', 2),
    route('heliograph', 'san-telmo', 4),
    route('vesper', 'san-telmo', 1),
    route('san-telmo', 'port-meridian', 1),
    route('san-telmo', 'orison', 4),
    route('port-meridian', 'bellona', 2),
    route('port-meridian', 'aster', 1),
    route('port-meridian', 'calder', 2),
    route('pelagos', 'aster', 2),
    route('pelagos', 'orison', 2),
    route('aster', 'calder', 1),
    route('aster', 'orison', 2),
    route('calder', 'orison', 2),
    // v0.325.0: the added worlds' lanes, thrown with them (Book 3 p.3; 89 checks,
    // 45 charted); the original thirteen above are unchanged.
    route('heliograph', 'greafucost', 3),
    route('gribainol', 'san-telmo', 2),
    route('gribainol', 'port-meridian', 3),
    route('gribainol', 'ycest', 4),
    route('tamarind', 'ycest', 2),
    route('northmark', 'baegro', 1),
    route('northmark', 'greafucost', 2),
    route('northmark', 'triotreand', 3),
    route('san-telmo', 'greafucost', 2),
    route('san-telmo', 'fiobys', 1),
    route('san-telmo', 'staega', 2),
    route('san-telmo', 'triotreand', 3),
    route('zaegaecor', 'bellona', 1),
    route('zaegaecor', 'ycest', 1),
    route('baegro', 'greafucost', 2),
    route('baegro', 'fiobys', 3),
    route('greafucost', 'fiobys', 1),
    route('greafucost', 'port-meridian', 2),
    route('greafucost', 'pelagos', 1),
    route('greafucost', 'aster', 2),
    route('greafucost', 'staega', 3),
    route('greafucost', 'triotreand', 2),
    route('greafucost', 'orison', 3),
    route('greafucost', 'fiozaisust', 3),
    route('fiobys', 'port-meridian', 1),
    route('fiobys', 'aster', 1),
    route('fiobys', 'triotreand', 2),
    route('port-meridian', 'staega', 1),
    route('port-meridian', 'triotreand', 3),
    route('bellona', 'ycest', 1),
    route('pelagos', 'triotreand', 1),
    route('aster', 'staega', 1),
    route('aster', 'fiozaisust', 2),
    route('aster', 'greagu', 3),
    route('staega', 'calder', 1),
    route('triotreand', 'calder', 2),
    route('triotreand', 'orison', 1),
    route('triotreand', 'greagu', 2),
    route('calder', 'fiozaisust', 1),
    route('dreavidrand', 'greagu', 3),
    route('orison', 'greagu', 1),
    route('fiozaisust', 'greagu', 2),
    route('sable', 'hiipaim', 1),
    route('cinder', 'greagu', 1),
    route('hiipaim', 'fyshael', 2)
  ])
});
