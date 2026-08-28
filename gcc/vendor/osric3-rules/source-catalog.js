function source(record) {
    if (record.auditStatus === 'verified-osric3' && (!record.book || !record.page)) {
        throw new Error(`Verified OSRIC 3 source ${record.id} requires book and page metadata.`);
    }
    return Object.freeze(record);
}
export const RULE_SOURCE_CATALOG = Object.freeze({
    'ability-display': source({ id: 'ability-display', module: 'ability-tables', ruleset: 'legacy-adnd-1e', section: 'Character-sheet ability display tables', auditStatus: 'legacy-import' }),
    'attack-matrix': source({ id: 'attack-matrix', module: 'combat', ruleset: 'legacy-adnd-1e', section: 'Class and monster attack matrices, repeating-20 rule, weapon-vs-AC adjustments', book: 'OSRIC 3.0 Player Guide (2026-01-22 rev), Tables 1.3.1.4D-1.3.10.4F', page: 43, auditStatus: 'disputed', note: 'Verified vs OSRIC 3.0: repeating-20 span of 6, level-0 linear 21, thief/assassin/druid brackets, monk on the cleric matrix. Disputed pending ruling: fighter-family per-level progression, cleric 19+ (9 vs 8), magic-user 16-20 (14 vs 13). Monster rows 8-9 through 24+ filled from printed Table 2.1.2a. Disputed there too: monster 2-3+ (printed 16, 1e 17) and 6-7+ (printed 13, 1e 14) - 1e values retained, printed values recorded in PRINTED_OSRIC3_MONSTER_THAC0.' }),
    'thief-skills': source({ id: 'thief-skills', module: 'thief-skills', ruleset: 'osric-3.0', section: 'Thief skills: base percentages, backstab, Dexterity and ancestry adjustments', book: 'OSRIC 3.0 Player Guide, Tables 1.3.10.4B-D', page: 68, auditStatus: 'verified-osric3', note: 'Transcribed from the printed tables; first verified module in the package.' }),
    'turn-undead': source({ id: 'turn-undead', module: 'turn-undead', ruleset: 'osric-3.0', section: 'Turning the undead: matrix, affected counts, duration, control, and paladin turning level', book: 'OSRIC 3.0 Player Guide (2026-01-22 rev), §1.6.5, Table 1.6.5a', page: 98, auditStatus: 'verified-osric3', note: 'Single d20 resolution confirmed in print. Legacy matrix was one column too strict from level 4 up, lacked the D* tier and the 9-13/14-18/19+ bands; corrected to the printed table.' }),
    advancement: source({ id: 'advancement', module: 'advancement', ruleset: 'legacy-adnd-1e', section: 'Class XP, level titles, and hit dice', auditStatus: 'legacy-import' }),
    'class-eligibility': source({ id: 'class-eligibility', module: 'classes', ruleset: 'legacy-adnd-1e', section: 'Race, class, level-cap, and multiclass eligibility', auditStatus: 'legacy-import' }),
    encumbrance: source({ id: 'encumbrance', module: 'encumbrance', ruleset: 'legacy-adnd-1e', section: 'Weight allowance, encumbrance, and movement', auditStatus: 'legacy-import' }),
    'legacy-character-xp': source({ id: 'legacy-character-xp', module: 'legacy-character-xp', ruleset: 'legacy-adnd-1e', section: 'GCC character XP field adapter', auditStatus: 'legacy-import' }),
    'multiclass-advancement': source({ id: 'multiclass-advancement', module: 'multiclass-advancement', ruleset: 'osric-3.0', section: 'Multiclass experience division and advancement', book: 'OSRIC 3.0 Player Guide (2026-01-22 rev), §1.3.11', page: 69, auditStatus: 'verified-osric3', note: 'Equal division with fractions dropped; capped classes still allocate XP.' }),
    'prime-requisite-xp': source({ id: 'prime-requisite-xp', module: 'starting-character', ruleset: 'osric-3.0', section: 'Prime-requisite experience bonuses', book: 'OSRIC 3.0 Player Guide (2026-01-22 rev), class description blocks §1.3 (fighter p.41)', page: 41, auditStatus: 'verified-osric3', note: '10% XP bonus at stat 16+ per class block: fighter STR; paladin STR+WIS; ranger STR+INT+WIS; cleric WIS; druid WIS+CHA; magic-user INT; thief DEX; none for assassin, illusionist, monk. Kernel thresholds match all ten.' }),
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
