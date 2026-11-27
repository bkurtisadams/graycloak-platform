import * as gw from '../packages/gamma-world-rules/index.js';
const $ = id => document.getElementById(id);
let a = null, deflections = 0, chassis = { species: 'robot', hp: 10, maxHp: 20 };
function log(text) { const p = document.createElement('p'); p.textContent = text; $('events').append(p); $('events').scrollTop = $('events').scrollHeight; $('guidance').textContent = text; }
function run(id, fn) { $(id).addEventListener('click', () => { try {
    fn();
    render();
}
catch (e) {
    log(e.message);
} }); }
function render() { if (!a)
    return; $('artifactName').textContent = a.identified ? a.definition.name : 'Unidentified device'; $('artifactState').textContent = `Chart ${a.definition.chart} · ${a.identified ? 'Identified' : 'Unknown'} · ${a.rolls} rolls · ${a.minutes.toFixed(1)} game minutes · Condition: ${a.conditionKnown ? a.condition + (a.functioning === false ? ' · Nonfunctional' : ' · Functional') : 'unknown'}`; $('experiment').disabled = a.identified; $('interrupt').disabled = a.identified; $('install').disabled = !a.identified || !a.definition.cell; $('operate').disabled = !a.identified || !!a.definition.capacity && !a.charges; $('laser').disabled = !a.identified || a.definition.name !== gw.TECHNOLOGY.laserPistol.name || !a.charges; $('powerState').textContent = a.identified && a.definition.cell ? `${a.charges}/${a.definition.capacity} shots · ${a.definition.cell} cell` : 'Power: ' + (a.identified ? 'not modeled for this device' : 'unknown'); }
for (const [id, u] of Object.entries(gw.ROBOTS)) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = u.name;
    $('unit').append(o);
}
for (const [id, c] of Object.entries(gw.CELLS)) {
    const p = document.createElement('p');
    p.textContent = `${id}: ${c.recharge}${c.relativeTime ? ' · relative charger time ' + c.relativeTime : ''}${c.kg ? ' · ' + c.kg + ' kg' : ''}`;
    $('cells').append(p);
}
run('discover', () => { const keys = Object.keys(gw.TECHNOLOGY), key = $('discovery').value === 'random' ? keys[gw.die(keys.length) - 1] : $('discovery').value; a = gw.discoverArtifact(gw.TECHNOLOGY[key]); deflections = 0; log('Recovered unknown device. Experiment to identify it.'); });
run('experiment', () => { a = gw.experiment(a, { IN: Number($('intelligence').value), assistants: Number($('helpers').value) }); const l = a.last; log(`Roll ${l.roll} (adjusted ${l.adjusted}): ${a.identified ? 'identified ' + a.definition.name : l.hazard ? 'dangerous result; restart chart' : 'continue experimenting'}${l.harmRequiresRuling ? ' · referee must resolve harm' : ''}.`); });
run('interrupt', () => { a = gw.interruptIdentification(a); log('Session interrupted. Identification restarts; elapsed time retained.'); });
run('install', () => { a = gw.installCell(a, $('cell').value); log('Fresh laboratory cell installed.'); });
run('operate', () => { const r = gw.operateArtifact(a); a = r.artifact; log(r.works ? 'Device responds.' : 'Device fails to respond.'); });
run('laser', () => { const r = gw.laserAttack(a, { ac: Number($('ac').value), distance: Number($('range').value), deflections }); a = r.artifact; deflections = r.deflections; log(!r.works ? 'Device failed to operate' : r.deflected ? 'Armor deflects hit' : r.hit ? `Hit: ${r.damage} damage` : 'Miss'); });
for (const id of ['ac', 'range'])
    $(id).addEventListener('change', () => { deflections = 0; log('Training target reset.'); });
run('authorize', () => { const unit = $('unit').value, u = gw.ROBOTS[unit]; const ok = gw.authorizeRobot({ unit, species: $('species').value, stage: Number($('stage').value), valid: $('valid').checked, visibleMutation: $('visible').checked, mode: $('robotMode').value }); $('robotState').textContent = `${u.name}: AC ${u.ac}, ${u.hp} HP, stage ${u.stage}. ${ok ? 'Authorization accepted' : 'Authorization denied'}.`; log($('robotState').textContent); });
run('repair', () => { const r = gw.repairRobot(chassis, Number($('parts').value)); chassis = r.character; $('repairState').textContent = `Test chassis: ${chassis.hp}/${chassis.maxHp} HP · ${r.partsUsed} parts used.`; log($('repairState').textContent); });
