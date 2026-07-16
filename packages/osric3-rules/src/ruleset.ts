export const OSRIC3_RULESET = Object.freeze({
  id: 'osric3',
  packageVersion: '0.6.0',
  intendedRuleset: 'OSRIC 3.0',
  auditStatus: 'foundation' as const,
  legacyImport: 'gcc/adnd-chargen.js v1.2.0, gcc/adnd-class-data.js v1.2.0, and gcc/adnd-equipment.js v6.0.0',
  note:
    'The package boundary, deterministic APIs, and parity tests are authoritative. Imported numeric tables remain marked legacy-import until checked against the OSRIC 3.0 Player and GM Guides.',
});
