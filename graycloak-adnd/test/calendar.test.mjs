import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

function load(){
  const context = vm.createContext({});
  new vm.Script(fs.readFileSync(fileURLToPath(new URL('../public/adnd-calendar.js', import.meta.url)), 'utf8'),
    { filename: 'adnd-calendar.js' }).runInContext(context);
  return vm.runInContext('ADNDCalendar', context);
}
const epoch = { year: 576, month: 'Fireseek', day: 1, hour: 6 };

test('calendar model: 16 months, 364 days, every month opens on Starday', () => {
  const C = load();
  assert.equal(C.MONTHS.length, 16);
  assert.equal(C.DAYS_PER_YEAR, 364);
  assert.equal(C.MONTHS.filter(m => m.festival).length, 4);
  assert.equal(C.monthIndex('needfest'), 0);
  assert.equal(C.monthIndex("Ready'reat"), 14);
  assert.equal(C.monthIndex('Juno'), null);
  for (let t = 0; t < 364 * 14400; t += 14400) {
    const d = C.dateFromTick({ year: 1, month: 'Needfest', day: 1 }, t);
    if (d.day === 1) assert.equal(d.weekday, 'Starday', `${d.month} opens on Starday`);
  }
});

test('dateFromTick walks hours, days, festivals and the year boundary', () => {
  const C = load();
  assert.equal(C.formatDateTime(C.dateFromTick(epoch, 0)), 'Starday, 1 Fireseek 576 CY · 06:00');
  assert.equal(C.formatDateTime(C.dateFromTick(epoch, 600)), 'Starday, 1 Fireseek 576 CY · 07:00');
  assert.equal(C.formatDateTime(C.dateFromTick(epoch, 10800)), 'Sunday, 2 Fireseek 576 CY · 00:00');
  assert.equal(C.formatDateTime(C.dateFromTick(epoch, 26401)), 'Moonday, 3 Fireseek 576 CY · 02:00');
  const growfest = C.dateFromTick(epoch, (28 * 3) * 14400);
  assert.equal(growfest.month, 'Growfest');
  assert.equal(growfest.festival, true);
  assert.equal(growfest.day, 1);
  const nextYear = C.dateFromTick(epoch, 364 * 14400);
  assert.equal(C.formatDate(nextYear), 'Starday, 1 Fireseek 577 CY');
  assert.equal(C.dateFromTick(epoch, -1), null);
  assert.equal(C.dateFromTick({ year: 576, month: 13, day: 1 }, 0), null, 'numeric months are rejected');
  assert.equal(C.dateFromTick({ year: 576, month: 'Needfest', day: 9 }, 0), null, 'day beyond month length');
});

test('tickFromDate inverts dateFromTick', () => {
  const C = load();
  for (const t of [0, 600, 14400 * 40 + 1200, 14400 * 363 + 600 * 23]) {
    const d = C.dateFromTick(epoch, t);
    assert.equal(C.tickFromDate(epoch, { year: d.year, month: d.month, day: d.day, hour: d.hour }), t - (t % 600));
  }
  assert.equal(C.tickFromDate(epoch, { year: 575, month: 'Sunsebb', day: 28 }), null, 'before the epoch');
});
