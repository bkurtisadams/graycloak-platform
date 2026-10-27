// adnd-calendar.js v1.0.0 — 2026-10-26
// Greyhawk calendar adapter for the numeric campaign clock.
//
// worldTick stays the only authoritative time primitive (one tick = one
// OSRIC combat segment, 6 s; see adnd-world-clock.js). This module turns a
// tick into a Common Year date and time of day given a campaign epoch: the
// calendar date at worldTick 0, stored on the campaign as
//
//   calendarEpoch: { year: 576, month: 'Fireseek', day: 1, hour: 6 }
//
// The month is a name (festival weeks included) so there is no 12-vs-16
// index ambiguity. Model matches greyhawk-map.html / gcc-weather.js: twelve
// 28-day months plus four 7-day festivals, 364 days a year, and every month
// opens on Starday so the weekday is (day - 1) mod 7.
const ADNDCalendar = (function(){
  'use strict';

  const CALENDAR_VERSION = 1;
  const MONTHS = Object.freeze([
    { name: 'Needfest',   days: 7,  festival: true  },
    { name: 'Fireseek',   days: 28, festival: false },
    { name: 'Readying',   days: 28, festival: false },
    { name: 'Coldeven',   days: 28, festival: false },
    { name: 'Growfest',   days: 7,  festival: true  },
    { name: 'Planting',   days: 28, festival: false },
    { name: 'Flocktime',  days: 28, festival: false },
    { name: 'Wealsun',    days: 28, festival: false },
    { name: 'Richfest',   days: 7,  festival: true  },
    { name: 'Reaping',    days: 28, festival: false },
    { name: 'Goodmonth',  days: 28, festival: false },
    { name: 'Harvester',  days: 28, festival: false },
    { name: 'Brewfest',   days: 7,  festival: true  },
    { name: 'Patchwall',  days: 28, festival: false },
    { name: "Ready'reat", days: 28, festival: false },
    { name: 'Sunsebb',    days: 28, festival: false },
  ].map(Object.freeze));
  const WEEKDAYS = Object.freeze(['Starday', 'Sunday', 'Moonday', 'Godsday', 'Waterday', 'Earthday', 'Freeday']);
  const DAYS_PER_YEAR = MONTHS.reduce((s, m) => s + m.days, 0);   // 364
  const SEGMENTS_PER_HOUR = 600;
  const SEGMENTS_PER_DAY = 14400;
  const HOURS_PER_DAY = 24;
  const MONTH_START = (() => {
    const out = [];
    let n = 0;
    for (const m of MONTHS){ out.push(n); n += m.days; }
    return Object.freeze(out);
  })();

  // Month names only: a numeric month is ambiguous between the 12-month
  // (legacy currentDate, Fireseek = 1) and 16-slot (festival) models.
  function monthIndex(value){
    if (typeof value === 'string'){
      const key = value.trim().toLowerCase();
      const i = MONTHS.findIndex(m => m.name.toLowerCase() === key);
      if (i >= 0) return i;
    }
    return null;
  }

  // Epoch normalization. Returns null unless year/month/day are usable.
  function normalizeEpoch(value){
    if (!value || typeof value !== 'object') return null;
    const year = Number.isInteger(value.year) ? value.year : null;
    const mi = monthIndex(value.month);
    const day = Number.isInteger(value.day) ? value.day : null;
    if (year === null || mi === null || day === null) return null;
    if (day < 1 || day > MONTHS[mi].days) return null;
    const hour = Number.isInteger(value.hour) && value.hour >= 0 && value.hour < HOURS_PER_DAY ? value.hour : 0;
    return { year, monthIndex: mi, month: MONTHS[mi].name, day, hour };
  }

  // Days since 1 Needfest, year 0 — a linear day number for arithmetic.
  function dayNumber(year, mi, day){
    return year * DAYS_PER_YEAR + MONTH_START[mi] + (day - 1);
  }
  function dateFromDayNumber(n){
    const year = Math.floor(n / DAYS_PER_YEAR);
    let rem = n - year * DAYS_PER_YEAR;
    let mi = 0;
    while (mi < MONTHS.length - 1 && rem >= MONTH_START[mi + 1]) mi++;
    const day = rem - MONTH_START[mi] + 1;
    return { year, monthIndex: mi, month: MONTHS[mi].name, day, festival: MONTHS[mi].festival,
      weekday: WEEKDAYS[(day - 1) % 7], dayOfYear: rem + 1 };
  }

  // Tick → calendar date and time of day.
  function dateFromTick(epoch, worldTick){
    const e = normalizeEpoch(epoch);
    if (!e || !Number.isSafeInteger(worldTick) || worldTick < 0) return null;
    const totalSegments = e.hour * SEGMENTS_PER_HOUR + worldTick;
    const days = Math.floor(totalSegments / SEGMENTS_PER_DAY);
    const rem = totalSegments - days * SEGMENTS_PER_DAY;
    const hour = Math.floor(rem / SEGMENTS_PER_HOUR);
    const minute = Math.floor((rem - hour * SEGMENTS_PER_HOUR) / 10);
    const date = dateFromDayNumber(dayNumber(e.year, e.monthIndex, e.day) + days);
    return Object.assign(date, { hour, minute, worldTick, daysSinceEpoch: days });
  }

  // Calendar date (and optional hour) → tick, relative to the epoch.
  function tickFromDate(epoch, value){
    const e = normalizeEpoch(epoch);
    const d = normalizeEpoch(value);
    if (!e || !d) return null;
    const days = dayNumber(d.year, d.monthIndex, d.day) - dayNumber(e.year, e.monthIndex, e.day);
    const tick = days * SEGMENTS_PER_DAY + (d.hour - e.hour) * SEGMENTS_PER_HOUR;
    return tick < 0 ? null : tick;
  }

  function ordinal(n){
    const v = n % 100;
    const s = (v >= 11 && v <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
    return `${n}${s}`;
  }
  function formatTime(date){
    if (!date) return '';
    const hh = String(date.hour).padStart(2, '0');
    const mm = String(date.minute == null ? 0 : date.minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  // "Starday, 3 Fireseek 576 CY"
  function formatDate(date){
    if (!date) return '';
    return `${date.weekday}, ${date.day} ${date.month} ${date.year} CY`;
  }
  // "Starday, 3 Fireseek 576 CY · 07:00"
  function formatDateTime(date){
    if (!date) return '';
    return `${formatDate(date)} · ${formatTime(date)}`;
  }

  return {
    CALENDAR_VERSION,
    MONTHS,
    WEEKDAYS,
    DAYS_PER_YEAR,
    SEGMENTS_PER_HOUR,
    SEGMENTS_PER_DAY,
    monthIndex,
    normalizeEpoch,
    dateFromTick,
    tickFromDate,
    ordinal,
    formatTime,
    formatDate,
    formatDateTime,
  };
})();
