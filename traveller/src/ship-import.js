// ---------------------------------------------------------------------------
// v0.169.0: reading a ship file. A ship file is a whole ship document — design,
// fitted weapons, damage, fuel, crew and books — validated in full by the rules
// package before anything in the campaign changes. Pure, so the decision about
// what an import does is testable without a page.
// ---------------------------------------------------------------------------

import { importShipDocument } from '../vendor/classic-traveller-rules/index.js?v=r0.80.0';

/**
 * What importing `text` would do: the validated ship, and whether it updates
 * the active ship, updates a reserve ship (same id), or joins the campaign.
 */
export function resolveShipImport(text, { activeShip = null, reserveShips = [], fileName = 'ship.json' } = {}) {
  let parsed;
  try { parsed = typeof text === 'string' ? JSON.parse(text) : text; }
  catch (error) { throw new Error(`${fileName} is not JSON: ${error.message}`); }
  let ship;
  try { ship = importShipDocument(parsed); }
  catch (error) { throw new Error(`${fileName} is not a Traveller ship document: ${error.message}`); }
  const id = ship.identity.id;
  const replaces = activeShip?.identity.id === id ? 'active'
    : reserveShips.some((entry) => entry.identity.id === id) ? 'reserve'
    : null;
  return { ship, replaces, joinsAsActive: !replaces && !activeShip };
}
