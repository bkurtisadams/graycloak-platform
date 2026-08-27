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
    fighter: Object.freeze([
        bracket(1, 2, 20),
        bracket(3, 4, 18),
        bracket(5, 6, 16),
        bracket(7, 8, 14),
        bracket(9, 10, 12),
        bracket(11, 12, 10),
        bracket(13, 14, 8),
        bracket(15, 16, 6),
        bracket(17, null, 4),
    ]),
    cleric: Object.freeze([
        bracket(1, 3, 20),
        bracket(4, 6, 18),
        bracket(7, 9, 16),
        bracket(10, 12, 14),
        bracket(13, 15, 12),
        bracket(16, 18, 10),
        bracket(19, null, 8),
    ]),
    'magic-user': Object.freeze([
        bracket(1, 5, 21),
        bracket(6, 10, 19),
        bracket(11, 15, 16),
        bracket(16, 20, 13),
        bracket(21, null, 11),
    ]),
    thief: Object.freeze([
        bracket(1, 4, 21),
        bracket(5, 8, 19),
        bracket(9, 12, 16),
        bracket(13, 16, 14),
        bracket(17, 20, 12),
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
export const MONSTER_ATTACK_ROWS = Object.freeze([
    Object.freeze({ id: 'up-to-1-1', label: 'Up to 1-1', linearThac0: 21 }),
    Object.freeze({ id: '1-1', label: '1-1', linearThac0: 20 }),
    Object.freeze({ id: '1', label: '1', linearThac0: 19 }),
    Object.freeze({ id: '1-plus', label: '1+', linearThac0: 18 }),
    Object.freeze({ id: '2-3', label: '2 to 3+', linearThac0: 17 }),
    Object.freeze({ id: '4-5', label: '4 to 5+', linearThac0: 15 }),
    Object.freeze({ id: '6-7', label: '6 to 7+', linearThac0: 14 }),
]);
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
    return '6-7';
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
