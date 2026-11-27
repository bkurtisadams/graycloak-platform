import { die, dice, artifactCondition, artifactIntelligenceModifier, physicalAttack } from './index.js';
// Printed p.31. Each row gives inclusive upper roll bounds and destination.
// Unnamed chart nodes have local identifiers. C:S unlabeled loop inferred as 8–10.
const charts = { A: { S: [[7, 'A'], [10, 'S']], A: [[5, 'B'], [7, 'A'], [10, 'U']], U: [[2, 'B'], [10, 'U']], B: [[3, 'F'], [7, 'B'], [10, 'R']], R: [[1, 'F'], [5, 'L'], [8, 'R'], [10, 'D']], L: [[2, 'A'], [4, 'S'], [10, 'L']], D: [[3, 'L'], [7, 'A'], [10, 'H']] }, B: { S: [[7, 'A'], [9, 'S'], [10, 'L']], L: [[3, 'C'], [4, 'A'], [10, 'L']], A: [[5, 'B'], [7, 'C'], [10, 'Q']], C: [[2, 'U'], [3, 'B'], [6, 'C'], [10, 'T']], T: [[2, 'U'], [10, 'T']], U: [[5, 'Y'], [10, 'D']], D: [[2, 'T'], [5, 'B'], [10, 'H']], B: [[3, 'X'], [10, 'B']], X: [[2, 'Y'], [6, 'X'], [10, 'U']], Y: [[1, 'F'], [5, 'Y'], [10, 'R']], R: [[1, 'F'], [5, 'R'], [7, 'M'], [10, 'E']], M: [[1, 'Y'], [4, 'X'], [10, 'Q']], Q: [[3, 'B'], [7, 'Q'], [10, 'J']], J: [[1, 'A'], [4, 'S'], [8, 'C'], [10, 'H']], E: [[3, 'M'], [7, 'A'], [10, 'H']] }, C: { S: [[6, 'A'], [7, 'L'], [10, 'S']], A: [[5, 'B'], [10, 'U']], B: [[3, 'C'], [7, 'B'], [10, 'L']], L: [[2, 'A'], [3, 'X'], [10, 'L']], U: [[2, 'B'], [4, 'M'], [10, 'U']], M: [[2, 'Y'], [5, 'N'], [10, 'D']], D: [[2, 'M'], [5, 'U'], [7, 'T'], [10, 'H']], T: [[2, 'S'], [10, 'T']], E: [[2, 'N'], [4, 'D'], [8, 'C'], [10, 'H']], N: [[3, 'Z'], [10, 'R']], R: [[2, 'F'], [5, 'R'], [10, 'E']], C: [[2, 'Y'], [5, 'C'], [7, 'V'], [10, 'M']], Y: [[1, 'Z'], [10, 'N']], Z: [[1, 'F'], [6, 'Z'], [10, 'R']], X: [[4, 'V'], [10, 'C']], V: [[2, 'W'], [10, 'V']], W: [[2, 'F'], [4, 'Y'], [10, 'Q']], Q: [[1, 'V'], [6, 'X'], [8, 'J'], [10, 'K']], J: [[5, 'X'], [8, 'A'], [10, 'H']], K: [[2, 'W'], [6, 'B'], [10, 'H']] } };
// C lower center circle: 7–8 to right diamond, 9–10 to left diamond.
charts.C.Q = [[1, 'V'], [6, 'X'], [8, 'K'], [10, 'J']];
export const ARTIFACT_CHARTS = Object.freeze(charts);
export function chartTransition(chart, node, roll) { if (!Number.isInteger(roll) || roll < 1 || roll > 10 || !charts[chart]?.[node])
    throw Error('Invalid chart step'); return charts[chart][node].find(([max]) => roll <= max)[1]; }
export function discoverArtifact(definition, rng = Math.random) { if (!charts[definition.chart])
    throw Error('Invalid artifact chart'); return { definition: { ...definition }, ...artifactCondition(rng), node: 'S', identified: false, minutes: 0, rolls: 0, charges: 0, conditionKnown: false }; }
export function experiment(artifact, { IN, mutations = [], assistants = 0, scientificGenius = false, rng = Math.random } = {}) { if (artifact.identified)
    throw Error('Already identified'); if (!Number.isInteger(assistants) || assistants < 0 || assistants > 20)
    throw Error('Invalid assistants'); const has = id => mutations.includes(id); let mod = artifactIntelligenceModifier(IN) - (has('mental-16') ? 2 : 0) - (has('mental-9') ? 1 : 0) - (has('mental-30') ? 2 : 0); mod += (has('physical-30') ? 2 : 0) - (has('mental-14') && scientificGenius ? 1 : 0); const roll = die(10, rng), adjusted = roll + mod; const next = has('mental-30') && artifact.definition.chart === 'A' ? 'F' : (adjusted > 10 ? artifact.node : chartTransition(artifact.definition.chart, artifact.node, Math.max(1, adjusted))); const hazard = next === 'H'; const functioning = hazard ? (artifact.functioning ?? (die(100, rng) <= artifact.functionChance)) : artifact.functioning; const minutes = has('mental-30') && artifact.definition.chart === 'A' ? 0 : 60 / (5 + assistants) / (has('mental-15') ? 3 : 1); return { ...artifact, functioning, node: hazard ? 'S' : next, identified: next === 'F', minutes: artifact.minutes + minutes, rolls: artifact.rolls + 1, last: { roll, adjusted, from: artifact.node, to: next, hazard, harmRequiresRuling: hazard && artifact.definition.hazardous && functioning && die(100, rng) <= 10 } }; }
function artifactModifier({ IN, mutations = [], scientificGenius = false }) {
    const has = id => mutations.includes(id);
    return artifactIntelligenceModifier(IN) - (has('mental-16') ? 2 : 0) - (has('mental-9') ? 1 : 0) - (has('mental-30') ? 2 : 0) + (has('physical-30') ? 2 : 0) - (has('mental-14') && scientificGenius ? 1 : 0);
}
// True when some sequence of rolls can still reach the finish from the artifact's current chart node.
export function canIdentify(artifact, researcher = {}) {
    if (artifact.identified) return true;
    const chart = artifact.definition.chart, mutations = researcher.mutations ?? [];
    if (!charts[chart]?.[artifact.node]) throw Error('Invalid chart step');
    if (mutations.includes('mental-30') && chart === 'A') return true;
    const mod = artifactModifier(researcher), seen = new Set([artifact.node]), queue = [artifact.node];
    while (queue.length) {
        const node = queue.shift();
        for (let roll = 1; roll <= 10; roll++) {
            const adjusted = roll + mod;
            let next = adjusted > 10 ? node : chartTransition(chart, node, Math.max(1, adjusted));
            if (next === 'F') return true;
            if (next === 'H') next = 'S';
            if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
    }
    return false;
}
export function interruptIdentification(a) { return a.identified ? a : { ...a, node: 'S' }; }
export const TECHNOLOGY = { laserPistol: { name: 'Laser pistol', chart: 'A', hazardous: true, cell: 'hydrogen', capacity: 10, wc: 13, range: 100, dice: 5 }, charger: { name: 'Energy cell charger', chart: 'B', hazardous: false }, computer: { name: 'Main building computer', chart: 'C', hazardous: false } };
export const CELLS = { chemical: { recharge: 'charger', relativeTime: 1 }, solar: { recharge: 'bright light' }, hydrogen: { recharge: 'charger', relativeTime: 2 }, atomic: { recharge: 'fuel replacement', kg: 12 } };
export function installCell(a, type) { if (!a.identified || a.definition.cell !== type || !a.definition.capacity)
    throw Error('Identify device and use compatible charged cell'); return { ...a, charges: a.definition.capacity }; }
export function operateArtifact(a, rng = Math.random) { if (!a.identified)
    throw Error('Identify artifact first'); if (a.definition.capacity && a.charges <= 0)
    throw Error('No energy remaining'); const works = a.functioning ?? (die(100, rng) <= a.functionChance); return { artifact: { ...a, functioning: works, conditionKnown: true, charges: works && a.definition.capacity ? Math.max(0, a.charges - 1) : a.charges }, works }; }
// Local training range only; armor deflections tracked per target.
export function laserAttack(a, { ac, distance, deflections = 0, rng = Math.random }) { if (a.definition.name !== TECHNOLOGY.laserPistol.name)
    throw Error('Not a laser pistol'); if (!Number.isFinite(distance) || distance < 0 || distance > 200)
    throw Error('Outside maximum range'); const op = operateArtifact(a, rng); if (!op.works)
    return { ...op, deflections, hit: false, damage: 0 }; const hit = physicalAttack({ ac, wc: 13, damageDice: 5, damageSides: 6, distance, effectiveRange: 100, rng }); if (hit.hit && deflections < Math.max(0, 3 - ac))
    return { ...op, ...hit, damage: 0, deflected: true, deflections: deflections + 1 }; return { ...op, ...hit, deflections }; }
export const ROBOTS = { household: { name: 'General Household Robotoid', hp: 20, ac: 4, stage: 1, backupHours: 4 }, medical: { name: 'Medical Robotoid', hp: 36, ac: 3, stage: 3, backupHours: 24 }, security: { name: 'Security Robotoid', hp: 72, ac: 2, stage: 4, backupHours: null }, engineering: { name: 'Engineering Bot (Standard)', hp: 45, ac: 3, stage: 2, backupHours: 12 } };
// Explicit local policy: valid credentials + recognized human phenotype; no blanket robot privilege.
export function authorizeRobot({ species, visibleMutation = false, stage = 0, valid = false, unit, mode = 'programmed' }) { if (!ROBOTS[unit])
    throw Error('Unknown robot'); return valid && Number.isInteger(stage) && stage >= ROBOTS[unit].stage && stage <= 5 && mode !== 'wild' && (species === 'psh' || species === 'humanoid' && !visibleMutation); }
// House rule: training workshop repairs 1 HP per spare part; no resurrection.
export function repairRobot(character, parts) { if (character.species !== 'robot' || character.hp <= 0 || !Number.isInteger(parts) || parts < 0)
    throw Error('Repair requires living robot and spare parts'); const used = Math.min(parts, character.maxHp - character.hp); return { character: { ...character, hp: character.hp + used }, partsUsed: used }; }
