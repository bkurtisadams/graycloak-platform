// ── Rule provenance ────────────────────────────────────────────────────────
// Verified against OSRIC 3.0 Player Guide (2026-01-22 PDF revision),
// §1.6.5 and Table 1.6.5a, p. 97-98. Resolution is a single d20 roll.
// Supersedes the legacy import from gcc/adnd-class-data.js, whose matrix
// was one column too strict from level 4 up, lacked the D* tier, and
// capped at effective level 9.
export const TURN_UNDEAD_RULE_SOURCE = Object.freeze({
    ruleset: 'osric-3.0',
    section: 'Turning the undead: matrix, affected counts, duration, control, and paladin turning level',
    book: 'OSRIC 3.0 Player Guide, §1.6.5, Table 1.6.5a',
    page: 98,
    auditStatus: 'verified-osric3',
    note: 'Single d20 resolution per the printed rule; the legacy 2d6 sim roll and off-by-one matrix are retired.',
});
// ── Undead types (column order of Table 1.6.5a) ────────────────────────────
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
    'fiend',
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
    fiend: 'Fiend',
});
const turnRow = (...cells) => Object.freeze(cells);
const TURN_MATRIX = Object.freeze([
    turnRow(10, 13, 16, 19, 20, 0, 0, 0, 0, 0, 0, 0, 0), // effective level 1
    turnRow(7, 10, 13, 16, 19, 20, 0, 0, 0, 0, 0, 0, 0), // 2
    turnRow(4, 7, 10, 13, 16, 19, 20, 0, 0, 0, 0, 0, 0), // 3
    turnRow('T', 'T', 4, 7, 10, 13, 16, 19, 20, 0, 0, 0, 0), // 4
    turnRow('T', 'T', 'T', 4, 7, 10, 13, 16, 19, 20, 0, 0, 0), // 5
    turnRow('D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20, 0, 0), // 6
    turnRow('D', 'D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20, 0), // 7
    turnRow('D*', 'D', 'D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19, 20), // 8
    turnRow('D*', 'D*', 'D', 'D', 'D', 'T', 'T', 4, 7, 10, 13, 16, 19), // 9-13
    turnRow('D*', 'D*', 'D*', 'D', 'D', 'D', 'T', 'T', 'T', 7, 10, 13, 16), // 14-18
    turnRow('D*', 'D*', 'D*', 'D*', 'D', 'D', 'D', 'D', 'T', 4, 7, 10, 13), // 19+
]);
function turnMatrixRowIndex(turnLevel) {
    const lvl = Math.trunc(turnLevel);
    if (lvl <= 8)
        return lvl - 1;
    if (lvl <= 13)
        return 8;
    if (lvl <= 18)
        return 9;
    return 10;
}
// ── Companion rules (§1.6.5 text) ──────────────────────────────────────────
export const TURNED_DURATION_ROUNDS_DICE = '3d4';
export const EVIL_CONTROL_ROLL = Object.freeze({ die: 'd100', controlOn: 61 });
export const GREATER_FIEND_IMMUNITY = Object.freeze({ hitDiceAbove: 10, magicResistanceAbove: 65 });
export function getTurnAffectedDice(cell, undeadType) {
    if (cell === 0)
        return null;
    if (undeadType === 'fiend')
        return '1d2';
    if (cell === 'D*')
        return '1d6+6';
    return '2d6';
}
// Evil clerics turn paladins as undead: the paladin's level maps onto a
// matrix column. Paladins are affected 1d2 and cannot be destroyed.
export function getPaladinTurnTargetType(paladinLevel) {
    const lvl = Math.max(1, Math.trunc(paladinLevel));
    if (lvl <= 2)
        return 'mummy';
    if (lvl <= 4)
        return 'spectre';
    if (lvl <= 6)
        return 'vampire';
    if (lvl <= 8)
        return 'ghost';
    if (lvl <= 10)
        return 'lich';
    return 'fiend';
}
// ── Turning level ──────────────────────────────────────────────────────────
// Clerics turn at class level; paladins turn as a cleric two levels lower
// starting at paladin level 3 (§1.3.8.2). Everyone else does not turn.
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
    const row = TURN_MATRIX[turnMatrixRowIndex(turnLevel)];
    if (!row)
        return 0;
    const columnIndex = UNDEAD_TYPE_IDS.indexOf(undeadType);
    if (columnIndex < 0)
        return 0;
    return row[columnIndex] ?? 0;
}
export function getTurnUndeadResult(turnLevel, undeadType) {
    const cell = getTurnUndeadCell(turnLevel, undeadType);
    const affected = getTurnAffectedDice(cell, undeadType);
    if (cell === 'T')
        return Object.freeze({ result: 'turned', affected: affected });
    if (cell === 'D' || cell === 'D*')
        return Object.freeze({ result: 'destroyed', affected: affected });
    if (typeof cell === 'number' && cell > 0)
        return Object.freeze({ result: 'roll', needed: cell, affected: affected });
    return Object.freeze({ result: 'none' });
}
