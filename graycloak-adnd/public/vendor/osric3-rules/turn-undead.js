// ── Rule provenance ────────────────────────────────────────────────────────
// The matrix exists in three legacy copies: gcc/adnd-class-data.js
// (TURN_UNDEAD), the CDATA.turnUndead JSON in gcc/combat-data.js, and the
// sim wrapper in gcc/dungeon-encounter.html. All three carry identical
// values; this module becomes the single source. Known discrepancy flagged
// during extraction: the sim resolves turning with 2d6 against these
// targets, but the values (10/13/16/19/20) are d20 numbers — on 2d6 every
// 13+ cell is unreachable and even a 10 succeeds only ~17% of the time.
// The kernel states d20 semantics; the sim fix is a separate change.
export const TURN_UNDEAD_RULE_SOURCE = Object.freeze({
    ruleset: 'legacy-adnd-1e',
    section: 'Cleric turning undead matrix and paladin turning level',
    auditStatus: 'legacy-import',
    note: 'Imported from gcc/adnd-class-data.js; identical copies in gcc/combat-data.js retired by this module. Matrix targets are d20 rolls — the encounter sim currently rolls 2d6 against them, which needs a ruling. Values pending OSRIC 3.0 verification.',
});
// ── Undead types (column order of the matrix) ──────────────────────────────
export const UNDEAD_TYPE_IDS = [
    'skeleton',
    'zombie',
    'ghoul',
    'shadow',
    'wight',
    'ghast',
    'wraith',
    'mummy',
    'spectre',
    'vampire',
    'ghost',
    'lich',
    'special',
];
export const UNDEAD_TYPE_LABELS = Object.freeze({
    skeleton: 'Skeleton',
    zombie: 'Zombie',
    ghoul: 'Ghoul',
    shadow: 'Shadow',
    wight: 'Wight',
    ghast: 'Ghast',
    wraith: 'Wraith',
    mummy: 'Mummy',
    spectre: 'Spectre',
    vampire: 'Vampire',
    ghost: 'Ghost',
    lich: 'Lich',
    special: 'Special',
});
const turnRow = (...cells) => Object.freeze(cells);
const TURN_MATRIX = Object.freeze([
    turnRow(10, 13, 16, 19, 20, 0, 0, 0, 0, 0, 0, 0, 0), // effective level 1
    turnRow(7, 10, 13, 16, 19, 20, 0, 0, 0, 0, 0, 0, 0), // 2
    turnRow(4, 7, 10, 13, 16, 19, 20, 0, 0, 0, 0, 0, 0), // 3
    turnRow('T', 4, 7, 10, 13, 16, 19, 20, 0, 0, 0, 0, 0), // 4
    turnRow('T', 'T', 4, 7, 10, 13, 16, 19, 20, 0, 0, 0, 0), // 5
    turnRow('D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20, 0, 0, 0), // 6
    turnRow('D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20, 0, 0), // 7
    turnRow('D', 'D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20, 0), // 8
    turnRow('D', 'D', 'D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20), // 9+
]);
// ── Turning level ──────────────────────────────────────────────────────────
// Clerics turn at class level; paladins turn as a cleric two levels lower
// starting at paladin level 3. Everyone else does not turn.
export function getTurnLevel(classId, level) {
    if (!Number.isFinite(level) || level < 1)
        return 0;
    const lvl = Math.trunc(level);
    if (classId === 'cleric')
        return lvl;
    if (classId === 'paladin' && lvl >= 3)
        return lvl - 2;
    return 0;
}
export function getTurnUndeadCell(turnLevel, undeadType) {
    if (!Number.isFinite(turnLevel) || turnLevel < 1)
        return 0;
    const rowIndex = Math.min(Math.trunc(turnLevel), TURN_MATRIX.length) - 1;
    const row = TURN_MATRIX[rowIndex];
    if (!row)
        return 0;
    const columnIndex = UNDEAD_TYPE_IDS.indexOf(undeadType);
    if (columnIndex < 0)
        return 0;
    return row[columnIndex] ?? 0;
}
export function getTurnUndeadResult(turnLevel, undeadType) {
    const cell = getTurnUndeadCell(turnLevel, undeadType);
    if (cell === 'T')
        return Object.freeze({ result: 'turned' });
    if (cell === 'D')
        return Object.freeze({ result: 'destroyed' });
    if (typeof cell === 'number' && cell > 0)
        return Object.freeze({ result: 'roll', needed: cell });
    return Object.freeze({ result: 'none' });
}
