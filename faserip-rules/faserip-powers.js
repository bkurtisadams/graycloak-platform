// faserip-rules powers v0.1.0
// v0.1.0: Appendix A/B power mechanics, slice 1 — Absorption. RULED
//         2026-09-05 (Judge): the pool granted is the Power rank NUMBER,
//         flat, whatever the absorbed attack's damage; damage above the rank
//         number is taken against real Health and may not be paid out of the
//         pool the same attack grants; later damage comes off the pool first;
//         the excess is the absorber's own attack the following round. Pool
//         caps at the rank number (a second absorption refreshes, it does not
//         stack), one 10-round clock refreshed by each absorption, and the
//         redirect rolls on the absorbed damage type's own column at the
//         absorber's Agility.
// Certified against the Players Book Appendix A Absorption Power text and
// its worked example (Health 100 + Amazing(48) -> 148).

export const POWERS_VERSION = '0.1.0';
export const POWERS_CERTIFIED = true;

// --- Absorption ---------------------------------------------------------

// "Any such absorbed energy dissipates 10 rounds after it has been absorbed,
// and must be discharged before then or it is lost."
export const ABSORPTION_POOL_ROUNDS = 10;

// Redirect column by absorbed damage type. RULED 2026-09-05: the book gives
// an amount but no attack form; the redirect resolves as the absorbed type
// on its own column, at the absorber's Agility.
export const ABSORPTION_REDIRECT_COLUMNS = {
  energy: 'En',
  force: 'Fo',
  'physical-blunt': 'BA',
  'physical-edged': 'EA',
  'physical-ranged': 'Sh',
};

export function absorptionRedirectColumn(damageType) {
  return ABSORPTION_REDIRECT_COLUMNS[damageType] ?? 'En';
}

// Resolve one attack of the absorbed type.
//   rankNumber : the Absorption Power's rank number (R)
//   damage     : incoming damage of the absorbed type
//   health     : the absorber's current REAL Health
//   round      : current combat round (for the pool clock)
// The pool is granted flat at R and refreshed, never stacked. Damage above R
// is taken against real Health and is NOT paid out of the pool granted by the
// same attack; it is also the amount available to redirect next round.
export function absorbAttack({ rankNumber, damage, health, round = 0 }) {
  const R = Math.max(0, Math.floor(Number(rankNumber) || 0));
  const dmg = Math.max(0, Math.floor(Number(damage) || 0));
  const excess = Math.max(0, dmg - R);
  return {
    absorbed: Math.min(dmg, R),
    pool: R,                                   // flat, capped, refreshed
    poolExpiresRound: round + ABSORPTION_POOL_ROUNDS,
    health: Math.max(0, health - excess),      // excess bypasses the pool
    healthLoss: excess,
    redirect: excess,                          // usable the following round
    redirectRound: round + 1,
  };
}

// Damage of any other kind (or of the absorbed kind once the Power is spent)
// comes off the pool first, then real Health.
export function applyDamageToPool({ pool = 0, health, damage }) {
  const dmg = Math.max(0, Math.floor(Number(damage) || 0));
  const fromPool = Math.min(pool, dmg);
  return {
    pool: pool - fromPool,
    health: Math.max(0, health - (dmg - fromPool)),
    fromPool,
    fromHealth: dmg - fromPool,
  };
}

// The pool is lost outright if not discharged in time.
export function absorptionPoolExpired(currentRound, poolExpiresRound) {
  return currentRound >= poolExpiresRound;
}

// Displayed Health while a pool is held: real Health plus the pool. Expiry
// removes the pool only — real Health already reflects any excess taken.
export function absorptionDisplayHealth({ health, pool = 0, expired = false }) {
  return expired ? health : health + pool;
}
