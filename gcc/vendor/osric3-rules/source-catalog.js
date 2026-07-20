function source(record) {
    if (record.auditStatus === 'verified-osric3' && (!record.book || !record.page)) {
        throw new Error(`Verified OSRIC 3 source ${record.id} requires book and page metadata.`);
    }
    return Object.freeze(record);
}
export const RULE_SOURCE_CATALOG = Object.freeze({
    'ability-display': source({ id: 'ability-display', module: 'ability-tables', ruleset: 'legacy-adnd-1e', section: 'Character-sheet ability display tables', auditStatus: 'legacy-import' }),
    'attack-matrix': source({ id: 'attack-matrix', module: 'combat', ruleset: 'legacy-adnd-1e', section: 'Class and monster attack matrices, repeating-20 rule, weapon-vs-AC adjustments', auditStatus: 'legacy-import', note: 'Anchors parity-checked against gcc/dungeon-encounter.html; extended rows and 8+ HD monster rows pending OSRIC 3.0 verification.' }),
    'thief-skills': source({ id: 'thief-skills', module: 'thief-skills', ruleset: 'osric-3.0', section: 'Thief skills: base percentages, backstab, Dexterity and ancestry adjustments', book: 'OSRIC 3.0 Player Guide, Tables 1.3.10.4B-D', page: 68, auditStatus: 'verified-osric3', note: 'Transcribed from the printed tables; first verified module in the package.' }),
    'turn-undead': source({ id: 'turn-undead', module: 'turn-undead', ruleset: 'legacy-adnd-1e', section: 'Cleric turning undead matrix and paladin turning level', auditStatus: 'legacy-import', note: 'Imported from gcc/adnd-class-data.js; d20 targets — the sim currently rolls 2d6 against them, pending a ruling.' }),
    advancement: source({ id: 'advancement', module: 'advancement', ruleset: 'legacy-adnd-1e', section: 'Class XP, level titles, and hit dice', auditStatus: 'legacy-import' }),
    'class-eligibility': source({ id: 'class-eligibility', module: 'classes', ruleset: 'legacy-adnd-1e', section: 'Race, class, level-cap, and multiclass eligibility', auditStatus: 'legacy-import' }),
    encumbrance: source({ id: 'encumbrance', module: 'encumbrance', ruleset: 'legacy-adnd-1e', section: 'Weight allowance, encumbrance, and movement', auditStatus: 'legacy-import' }),
    'legacy-character-xp': source({ id: 'legacy-character-xp', module: 'legacy-character-xp', ruleset: 'legacy-adnd-1e', section: 'GCC character XP field adapter', auditStatus: 'legacy-import' }),
    'multiclass-advancement': source({ id: 'multiclass-advancement', module: 'multiclass-advancement', ruleset: 'legacy-adnd-1e', section: 'Multiclass experience division and advancement', auditStatus: 'legacy-import' }),
    'prime-requisite-xp': source({ id: 'prime-requisite-xp', module: 'starting-character', ruleset: 'legacy-adnd-1e', section: 'Prime-requisite experience bonuses', auditStatus: 'legacy-import', note: 'The 10% class bonus is parity-checked against gcc/adnd-chargen.js and remains pending direct OSRIC 3.0 citation.' }),
    'saving-throws': source({ id: 'saving-throws', module: 'saving-throws', ruleset: 'legacy-adnd-1e', section: 'Class saving throws', auditStatus: 'legacy-import' }),
    'spell-progression': source({ id: 'spell-progression', module: 'spells', ruleset: 'legacy-adnd-1e', section: 'Class spell progression and Wisdom bonus spells', auditStatus: 'legacy-import' }),
    'starting-character': source({ id: 'starting-character', module: 'starting-character', ruleset: 'legacy-adnd-1e', section: 'Starting age, gold, hit points, and exceptional Strength', auditStatus: 'legacy-import' }),
});
export function getRuleSourceRecord(id) {
    return RULE_SOURCE_CATALOG[id];
}
export function listRuleSourceRecords(auditStatus) {
    const records = Object.values(RULE_SOURCE_CATALOG);
    return Object.freeze(auditStatus ? records.filter((record) => record.auditStatus === auditStatus) : records);
}
