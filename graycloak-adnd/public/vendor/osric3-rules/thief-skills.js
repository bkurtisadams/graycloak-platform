// ── Rule provenance ────────────────────────────────────────────────────────
// Transcribed directly from the OSRIC 3.0 Player Guide, page 68:
//   Table 1.3.10.4B (base percentages and backstab, levels 1-20)
//   Table 1.3.10.4C (Dexterity adjustments, Dex 9-19)
//   Table 1.3.10.4D (ancestry adjustments)
// This is the kernel's first verified-osric3 module: no legacy engine held a
// thief-skill table, so these values entered the codebase from the book.
// Transcription notes: the half-elf Pick Locks cell prints a stray dash
// glyph and is read as "no adjustment"; levels 18-20 repeat the level-17 row
// exactly as printed.
export const THIEF_SKILLS_RULE_SOURCE = Object.freeze({
    ruleset: 'osric-3.0',
    section: 'Thief skills: base percentages, backstab, Dexterity and ancestry adjustments',
    book: 'OSRIC 3.0 Player Guide, Tables 1.3.10.4B-D',
    page: 68,
    auditStatus: 'verified-osric3',
    note: 'Transcribed from the printed tables. Pick Pockets legitimately exceeds 100% at high level; totals are returned uncapped so callers can apply their own caught-in-the-act rules.',
});
// ── Skills ─────────────────────────────────────────────────────────────────
export const THIEF_SKILL_IDS = [
    'climb',
    'hide',
    'listen',
    'pick-locks',
    'pick-pockets',
    'read-languages',
    'move-quietly',
    'traps',
];
export const THIEF_SKILL_LABELS = Object.freeze({
    climb: 'Climb',
    hide: 'Hide',
    listen: 'Listen',
    'pick-locks': 'Pick Locks',
    'pick-pockets': 'Pick Pockets',
    'read-languages': 'Read Languages',
    'move-quietly': 'Move Quietly',
    traps: 'Traps',
});
// ── Table 1.3.10.4B: base percentages, levels 1-20 ─────────────────────────
//                         climb hide listen locks pockets readLang moveQ traps
const BASE_ROWS = Object.freeze([
    Object.freeze([85, 10, 10, 25, 30, 1, 15, 20]), // L1
    Object.freeze([86, 15, 10, 29, 35, 5, 20, 25]), // L2
    Object.freeze([87, 20, 15, 33, 40, 15, 27, 30]), // L3
    Object.freeze([88, 25, 15, 37, 45, 20, 33, 35]), // L4
    Object.freeze([90, 30, 20, 42, 50, 25, 40, 40]), // L5
    Object.freeze([92, 35, 20, 47, 55, 30, 47, 45]), // L6
    Object.freeze([94, 42, 25, 52, 60, 35, 55, 50]), // L7
    Object.freeze([96, 48, 25, 57, 65, 40, 62, 55]), // L8
    Object.freeze([98, 55, 30, 62, 70, 45, 70, 60]), // L9
    Object.freeze([99, 65, 30, 67, 80, 50, 78, 65]), // L10
    Object.freeze([99, 70, 35, 72, 90, 55, 86, 70]), // L11
    Object.freeze([99, 75, 35, 77, 100, 60, 94, 75]), // L12
    Object.freeze([99, 85, 40, 82, 105, 65, 99, 80]), // L13
    Object.freeze([99, 95, 40, 87, 110, 70, 99, 85]), // L14
    Object.freeze([99, 99, 50, 92, 115, 75, 99, 90]), // L15
    Object.freeze([99, 99, 50, 97, 125, 80, 99, 95]), // L16
    Object.freeze([99, 99, 55, 99, 125, 80, 99, 99]), // L17
    Object.freeze([99, 99, 55, 99, 125, 80, 99, 99]), // L18
    Object.freeze([99, 99, 55, 99, 125, 80, 99, 99]), // L19
    Object.freeze([99, 99, 55, 99, 125, 80, 99, 99]), // L20
]);
function backstabTier(level) {
    const tier = level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : 2;
    return Object.freeze({ multiplier: tier, bonusDice: tier - 1 });
}
// ── Table 1.3.10.4C: Dexterity adjustments (Dex 9-19) ──────────────────────
//                         climb hide listen locks pockets readLang moveQ traps
const DEX_ROWS = Object.freeze({
    9: Object.freeze([0, -10, 0, -10, -15, 0, -20, -15]),
    10: Object.freeze([0, -5, 0, -5, -10, 0, -15, -10]),
    11: Object.freeze([0, 0, 0, 0, -5, 0, -10, -5]),
    12: Object.freeze([0, 0, 0, 0, 0, 0, -5, 0]),
    13: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
    14: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
    15: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
    16: Object.freeze([0, 0, 0, 5, 0, 0, 0, 0]),
    17: Object.freeze([0, 5, 0, 10, 5, 0, 5, 5]),
    18: Object.freeze([0, 10, 0, 15, 10, 0, 10, 10]),
    19: Object.freeze([0, 15, 0, 20, 15, 0, 15, 15]),
});
// ── Table 1.3.10.4D: ancestry adjustments ──────────────────────────────────
//                         climb hide listen locks pockets readLang moveQ traps
const ANCESTRY_ROWS = Object.freeze({
    dwarf: Object.freeze([-10, 0, 0, 15, 0, -5, -5, 15]),
    elf: Object.freeze([-5, 10, 5, -5, 5, 10, 5, 5]),
    gnome: Object.freeze([-15, 0, 5, 10, 0, 0, 0, 0]),
    'half-elf': Object.freeze([0, 5, 0, 0, 10, 0, 0, 0]),
    halfling: Object.freeze([-15, 15, 5, 0, 5, -5, 15, 0]),
    'half-orc': Object.freeze([5, 0, 5, 5, -5, -10, 0, 5]),
    human: Object.freeze([5, 0, 0, 5, 0, 0, 0, 0]),
});
// ── Lookup helpers ─────────────────────────────────────────────────────────
function rowToRecord(row) {
    const record = {};
    THIEF_SKILL_IDS.forEach((id, index) => {
        record[id] = row[index] ?? 0;
    });
    return Object.freeze(record);
}
export function getThiefSkillBase(level) {
    if (!Number.isFinite(level) || level < 1)
        throw new Error(`Invalid thief level: ${level}`);
    const index = Math.min(Math.trunc(level), BASE_ROWS.length) - 1;
    const row = BASE_ROWS[index];
    if (!row)
        throw new Error(`No base row for thief level ${level}`);
    return rowToRecord(row);
}
export function getBackstab(level) {
    if (!Number.isFinite(level) || level < 1)
        throw new Error(`Invalid thief level: ${level}`);
    return backstabTier(Math.trunc(level));
}
// Dexterity outside the printed 9-19 span clamps to the nearest table row:
// the class minimums keep real thieves inside it, so the clamp only guards
// callers passing NPC oddities.
export function getThiefSkillDexterityAdjustments(dexterity) {
    if (!Number.isFinite(dexterity))
        throw new Error(`Invalid Dexterity: ${dexterity}`);
    const key = Math.max(9, Math.min(19, Math.trunc(dexterity)));
    const row = DEX_ROWS[key];
    if (!row)
        throw new Error(`No Dexterity row for ${key}`);
    return rowToRecord(row);
}
export function getThiefSkillAncestryAdjustments(race) {
    const row = ANCESTRY_ROWS[race];
    if (!row)
        throw new Error(`Unknown ancestry: ${race}`);
    return rowToRecord(row);
}
export function getThiefSkillProfile(input) {
    const base = getThiefSkillBase(input.level);
    const dex = getThiefSkillDexterityAdjustments(input.dexterity);
    const ancestry = getThiefSkillAncestryAdjustments(input.race);
    const totals = {};
    for (const id of THIEF_SKILL_IDS) {
        totals[id] = Math.max(1, base[id] + dex[id] + ancestry[id]);
    }
    return Object.freeze({
        level: Math.trunc(input.level),
        backstab: getBackstab(input.level),
        base,
        dexterityAdjustments: dex,
        ancestryAdjustments: ancestry,
        totals: Object.freeze(totals),
    });
}
