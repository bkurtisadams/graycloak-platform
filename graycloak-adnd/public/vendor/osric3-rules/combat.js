// ── Rule provenance ────────────────────────────────────────────────────────
// The bracket structure and linear THAC0 anchors are parity-checked against
// gcc/dungeon-encounter.html (THAC0 table + pickTier + combatClass). Rows the
// sim truncated (fighter 11+, cleric 10+, magic-user 16+, thief 13+) are
// extended with the standard legacy bracket progression and must be verified
// against the OSRIC 3.0 attack matrices before certification. The repeating-20
// conversion restores the matrix behavior the sim's flat Math.min(20, ...)
// clamp lost: the target number 20 occupies six consecutive armor-class
// columns before the row resumes at 21.
export const ATTACK_MATRIX_RULE_SOURCE = Object.freeze({
    ruleset: 'legacy-adnd-1e',
    section: 'Class and monster attack matrices, repeating-20 rule, weapon-vs-AC adjustments',
    book: 'OSRIC 3.0 Player Guide (2026-01-22 rev), Tables 1.3.1.4D-1.3.10.4F',
    page: 43,
    auditStatus: 'disputed',
    note: 'Checked against OSRIC 3.0 Player Guide class tables. Verified: six-column repeating-20 span; level-0 linear 21; thief, assassin, and druid brackets; monk on the cleric matrix. Disputed pending ruling (kernel keeps 1e values): fighter/paladin/ranger print one point per level (linear 21-level, floor 1 at 20+) vs 1e two-level brackets; cleric 19+ prints 9 vs 1e 8; magic-user/illusionist 16-20 print 14 vs 1e 13. Monster rows above 7 HD still need the Gamemaster Guide.',
});
// ── Matrix class mapping ───────────────────────────────────────────────────
export const ATTACK_MATRIX_CLASS_IDS = ['fighter', 'cleric', 'magic-user', 'thief'];
const ATTACK_MATRIX_CLASS_MAP = Object.freeze({
    fighter: 'fighter',
    paladin: 'fighter',
    ranger: 'fighter',
    cleric: 'cleric',
    druid: 'cleric',
    'magic-user': 'magic-user',
    illusionist: 'magic-user',
    thief: 'thief',
    assassin: 'thief',
    monk: 'cleric',
});
export function getAttackMatrixClass(classId) {
    return ATTACK_MATRIX_CLASS_MAP[classId];
}
function bracket(minLevel, maxLevel, linearThac0) {
    return Object.freeze({ minLevel, maxLevel, linearThac0 });
}
export const LEVEL_ZERO_THAC0 = 21;
export const ATTACK_MATRIX_BRACKETS = Object.freeze({
    // OSRIC 3.0 gives the fighter family one point of improvement per level
    // (Table 1.3.1.4d): linear THAC0 21 - level, floored at 1 from level 20.
    // AD&D 1e used two-level brackets, so every even level differed and the
    // 1e cap was 1 only at much higher level; OSRIC 3.0 is authoritative here.
    fighter: Object.freeze([
        ...Array.from({ length: 19 }, (_unused, index) => bracket(index + 1, index + 1, 20 - index)),
        bracket(20, null, 1),
    ]),
    cleric: Object.freeze([
        bracket(1, 3, 20),
        bracket(4, 6, 18),
        bracket(7, 9, 16),
        bracket(10, 12, 14),
        bracket(13, 15, 12),
        bracket(16, 18, 10),
        // OSRIC 3.0 prints 9 here; 1e printed 8.
        bracket(19, null, 9),
    ]),
    'magic-user': Object.freeze([
        bracket(1, 5, 21),
        bracket(6, 10, 19),
        bracket(11, 15, 16),
        // OSRIC 3.0 prints 14 for 16-20; 1e printed 13.
        bracket(16, 20, 14),
        // The Player Guide's magic-user table stops at level 20. This row is the
        // retained 1e value, not a printed OSRIC 3.0 figure - see the rule source.
        bracket(21, null, 11),
    ]),
    thief: Object.freeze([
        bracket(1, 4, 21),
        bracket(5, 8, 19),
        bracket(9, 12, 16),
        bracket(13, 16, 14),
        bracket(17, 20, 12),
        // Printed thief table stops at level 20; retained 1e value.
        bracket(21, null, 10),
    ]),
});
export function getClassLinearThac0(classId, level) {
    if (!Number.isFinite(level))
        throw new Error(`Invalid level: ${level}`);
    if (level <= 0)
        return LEVEL_ZERO_THAC0;
    const rows = ATTACK_MATRIX_BRACKETS[getAttackMatrixClass(classId)];
    for (const row of rows) {
        if (level >= row.minLevel && (row.maxLevel === null || level <= row.maxLevel)) {
            return row.linearThac0;
        }
    }
    // Unreachable while the top row is open-ended, but keeps the compiler honest.
    const top = rows[rows.length - 1];
    return top ? top.linearThac0 : LEVEL_ZERO_THAC0;
}
// Multi-class characters attack on their most favorable matrix row.
export function getBestClassLinearThac0(classLevels) {
    if (classLevels.length === 0)
        return LEVEL_ZERO_THAC0;
    return classLevels.reduce((best, entry) => Math.min(best, getClassLinearThac0(entry.classId, entry.level)), Number.POSITIVE_INFINITY);
}
// Rows are the printed OSRIC 3.0 monster matrix, Table 2.1.2a, in full.
// The 2-3+ and 6-7+ rows formerly held 1e values (17 and 14); OSRIC 3.0 is
// now the ruling document, so the printed 16 and 13 apply.
export const MONSTER_ATTACK_ROWS = Object.freeze([
    Object.freeze({ id: 'up-to-1-1', label: 'Up to 1-1', linearThac0: 21 }),
    Object.freeze({ id: '1-1', label: '1-1', linearThac0: 20 }),
    Object.freeze({ id: '1', label: '1', linearThac0: 19 }),
    Object.freeze({ id: '1-plus', label: '1+', linearThac0: 18 }),
    Object.freeze({ id: '2-3', label: '2 to 3+', linearThac0: 16 }),
    Object.freeze({ id: '4-5', label: '4 to 5+', linearThac0: 15 }),
    Object.freeze({ id: '6-7', label: '6 to 7+', linearThac0: 13 }),
    Object.freeze({ id: '8-9', label: '8 to 9+', linearThac0: 12 }),
    Object.freeze({ id: '10-11', label: '10 to 11+', linearThac0: 10 }),
    Object.freeze({ id: '12-13', label: '12 to 13+', linearThac0: 9 }),
    Object.freeze({ id: '14-15', label: '14 to 15+', linearThac0: 8 }),
    Object.freeze({ id: '16-17', label: '16 to 17+', linearThac0: 7 }),
    Object.freeze({ id: '18-19', label: '18 to 19+', linearThac0: 5 }),
    Object.freeze({ id: '20-21', label: '20 to 21+', linearThac0: 4 }),
    Object.freeze({ id: '22-23', label: '22 to 23+', linearThac0: 3 }),
    Object.freeze({ id: '24-plus', label: '24+', linearThac0: 2 }),
]);
// The monster matrix exactly as printed in OSRIC 3.0 Table 2.1.2a (linear THAC0,
// read from the AC 0 column). Retained as the transcription of record; the
// active rows above now match it exactly.
export const PRINTED_OSRIC3_MONSTER_THAC0 = Object.freeze({
    'up-to-1-1': 21, '1-1': 20, '1': 19, '1-plus': 18,
    '2-3': 16, '4-5': 15, '6-7': 13, '8-9': 12,
    '10-11': 10, '12-13': 9, '14-15': 8, '16-17': 7,
    '18-19': 5, '20-21': 4, '22-23': 3, '24-plus': 2,
});
export function getMonsterAttackRowId(hd) {
    const { hitDice } = hd;
    const modifier = hd.modifier ?? null;
    if (!Number.isFinite(hitDice) || hitDice < 0)
        throw new Error(`Invalid hit dice: ${hitDice}`);
    if (hitDice < 1)
        return 'up-to-1-1';
    if (hitDice === 1) {
        if (modifier === 'minus')
            return '1-1';
        if (modifier === 'plus')
            return '1-plus';
        return '1';
    }
    if (hitDice <= 3)
        return '2-3';
    if (hitDice <= 5)
        return '4-5';
    if (hitDice <= 7)
        return '6-7';
    if (hitDice <= 9)
        return '8-9';
    if (hitDice <= 11)
        return '10-11';
    if (hitDice <= 13)
        return '12-13';
    if (hitDice <= 15)
        return '14-15';
    if (hitDice <= 17)
        return '16-17';
    if (hitDice <= 19)
        return '18-19';
    if (hitDice <= 21)
        return '20-21';
    if (hitDice <= 23)
        return '22-23';
    return '24-plus';
}
export function getMonsterLinearThac0(hd) {
    const rowId = getMonsterAttackRowId(hd);
    const row = MONSTER_ATTACK_ROWS.find((entry) => entry.id === rowId);
    if (!row)
        throw new Error(`Unknown monster attack row: ${rowId}`);
    return row.linearThac0;
}
// ── Repeating-20 conversion ────────────────────────────────────────────────
// The printed matrices hold the target number at 20 for six consecutive
// armor-class columns (linear values 20 through 25) before resuming at 21.
// A flat `linear THAC0 - AC` therefore overstates difficulty inside the span
// and a Math.min(20, ...) clamp understates it beyond the span.
export const REPEATING_20_SPAN = 6;
export function linearToMatrixTarget(linearValue) {
    if (!Number.isFinite(linearValue))
        throw new Error(`Invalid linear value: ${linearValue}`);
    if (linearValue < 20)
        return linearValue;
    if (linearValue <= 20 + (REPEATING_20_SPAN - 1))
        return 20;
    return linearValue - (REPEATING_20_SPAN - 1);
}
export function getWeaponVsArmorAdjustment(table, armorClass) {
    if (!table)
        return 0;
    const column = Math.max(2, Math.min(10, Math.trunc(armorClass)));
    return table[column] ?? 0;
}
export function resolveAttackTarget(input) {
    const { linearThac0, armorClass } = input;
    const rollModifier = input.rollModifier ?? 0;
    const minimumRoll = input.minimumRoll ?? 1;
    if (!Number.isFinite(linearThac0))
        throw new Error(`Invalid linear THAC0: ${linearThac0}`);
    if (!Number.isFinite(armorClass))
        throw new Error(`Invalid armor class: ${armorClass}`);
    const linearValue = linearThac0 - armorClass;
    const matrixTarget = linearToMatrixTarget(linearValue);
    const requiredRoll = Math.max(minimumRoll, matrixTarget - rollModifier);
    return Object.freeze({
        linearValue,
        matrixTarget,
        requiredRoll,
        inRepeating20Span: linearValue >= 20 && linearValue <= 20 + (REPEATING_20_SPAN - 1),
    });
}
