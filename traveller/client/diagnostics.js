// diagnostics.js — v0.294.0: what a page knows, as text the user can paste.
//
// Kurt (Sep 2026): "query the console to find the reason". The assistant
// cannot see a browser, so the page gathers what matters itself — its own
// [traveller] log lines, who is signed in, and the campaign's seats, joins
// and ownership as this page sees them — and copies it for pasting.

const LOG = [];
const LIMIT = 200;

function remember(level, args) {
  const text = args.map((value) => {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return `${value.name}: ${value.message}${value.code ? ` (${value.code})` : ''}`;
    try { return JSON.stringify(value); } catch { return String(value); }
  }).join(' ');
  if (!text.includes('[traveller')) return;
  LOG.push(`${new Date().toISOString()} ${level} ${text}`);
  if (LOG.length > LIMIT) LOG.shift();
}

for (const level of ['info', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...args) => { remember(level, args); original(...args); };
}
window.addEventListener('error', (event) => remember('uncaught', [event.message]));
window.addEventListener('unhandledrejection', (event) => remember('unhandled', ['[traveller] unhandled', event.reason]));

export function diagnosticLog() { return [...LOG]; }

export async function copyDiagnostics(report) {
  const text = JSON.stringify({ page: window.location.pathname, at: new Date().toISOString(), ...report, log: diagnosticLog() }, null, 2);
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch { copied = false; }
  if (!copied) window.prompt('Copy this and paste it to Claude:', text);
  return copied;
}
