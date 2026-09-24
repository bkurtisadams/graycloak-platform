// software.js — the programs a ship carries.
//
// v0.68.0. Book 2 p.12: "The basic software package provided with new ships
// consists of a credit of CR 2 million, applicable to any programs on the
// above list." The book leaves the choice to the buyer, so this is a ruling
// (Graycloak, Sep 2026), made because the numbers settle it cleanly:
//
//   1. the flight set — Maneuver, Jump-1 through the ship's jump number
//      (p.32: "the specific program for the jump distance required must be
//      used"), Navigation, Library, Anti-Hijack;
//   2. then Target, if the credit still covers it;
//   3. then the dearest defensive program that still fits.
//
// A Free Trader's flight set is exactly MCr 1.0, leaving MCr 1.0 for Target:
// the one program that lets a turret fire. A Scout's is MCr 1.3 (Jump-2 costs
// 0.3), so Target does not fit but Auto/Evade does — consistent with p.18
// delivering the Type S with a turret and no weapons. Anything else is bought.

import { COMPUTER_PROGRAMS, BASIC_SOFTWARE_PACKAGE_CREDIT_MCR, getComputerProgram } from './components.js';

export const BASIC_SOFTWARE_PACKAGE_IS_RAW = false;

// Tenths of a megacredit: every p.12 price is a whole number of them, and
// summing 0.1 + 0.3 in floating point is how a package comes out a cent over.
const tenths = (mcr) => Math.round(mcr * 10);

export function flightSoftware(jumpRating) {
  if (!Number.isInteger(jumpRating) || jumpRating < 0 || jumpRating > 6) throw new RangeError('jumpRating must be an integer from 0 to 6');
  const jumps = Array.from({ length: jumpRating }, (_, index) => `jump-${index + 1}`);
  return Object.freeze(['maneuver', ...jumps, 'navigation', 'library', 'anti-hijack']);
}

/** The programs a new ship of this jump rating is delivered with. */
export function basicSoftwarePackage(jumpRating, { creditMCr = BASIC_SOFTWARE_PACKAGE_CREDIT_MCR } = {}) {
  let budget = tenths(creditMCr);
  const chosen = [];
  const take = (key) => {
    const cost = tenths(getComputerProgram(key).priceMCr);
    if (cost > budget) return false;
    chosen.push(key);
    budget -= cost;
    return true;
  };
  for (const key of flightSoftware(jumpRating)) take(key);
  take('target');
  const defensive = Object.values(COMPUTER_PROGRAMS)
    .filter((program) => program.class === 'defensive')
    .sort((a, b) => b.priceMCr - a.priceMCr || a.key.localeCompare(b.key));
  for (const program of defensive) {
    if (take(program.key)) break;
  }
  return Object.freeze(chosen);
}

export function softwarePackageCostMCr(programKeys) {
  return programKeys.reduce((sum, key) => sum + tenths(getComputerProgram(key).priceMCr), 0) / 10;
}
