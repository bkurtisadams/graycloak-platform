/**
 * OD&D — Chainmail engine · Coinage
 * odd-chainmail · module/rules/coins.mjs
 * system 0.1.96 · slice: gp-weight-ladder · stamp 0.1.96-gp-weight-ladder.1
 *
 * OD&D Men & Magic exchange, normalized to the gold piece. Rules-call: adjust
 * the rates here if your table differs. Default: 1 pp = 5 gp · 1 gp = 2 ep =
 * 10 sp = 50 cp.
 */

export const COIN_TO_GP = { pp: 5, gp: 1, ep: 0.5, sp: 0.1, cp: 0.02 };

/** Total purse value expressed in gold pieces. */
export function coinsToGp(coins = {}) {
  let gp = 0;
  for (const [k, rate] of Object.entries(COIN_TO_GP)) gp += (Number(coins[k]) || 0) * rate;
  return gp;
}

/**
 * Encumbrance weight of a purse, in gp-weight. Men & Magic p.16: a single coin
 * of any metal weighs the same (1 gp-weight), so coin weight is the raw COUNT
 * across all denominations — NOT the gp value. A purse of 100 cp weighs 100,
 * the same as 100 gp, though it is worth far less.
 */
export function coinsWeight(coins = {}) {
  let n = 0;
  for (const k of Object.keys(COIN_TO_GP)) n += Number(coins[k]) || 0;
  return n;
}

function runSelfTests() {
  let pass = 0;
  const okClose = (a, b, m) => {
    if (Math.abs(a - b) > 1e-9) throw new Error(`coins.mjs FAIL: ${m} (got ${a})`);
    pass++;
  };
  okClose(coinsToGp({ gp: 83 }), 83, "gp passthrough");
  okClose(coinsToGp({ pp: 2 }), 10, "pp x5");
  okClose(coinsToGp({ ep: 2 }), 1, "ep x1/2");
  okClose(coinsToGp({ sp: 10 }), 1, "sp x1/10");
  okClose(coinsToGp({ cp: 50 }), 1, "cp x1/50");
  okClose(coinsToGp({ pp: 1, gp: 1, ep: 1, sp: 1, cp: 1 }), 6.62, "mixed purse");
  okClose(coinsToGp({}), 0, "empty purse");
  // coinsWeight: raw count, denomination-blind (1 coin = 1 gp-wt).
  okClose(coinsWeight({ gp: 100 }), 100, "100 gp weigh 100");
  okClose(coinsWeight({ cp: 100 }), 100, "100 cp weigh 100 too");
  okClose(coinsWeight({ pp: 2, gp: 3, ep: 4, sp: 5, cp: 6 }), 20, "count sum, not value");
  okClose(coinsWeight({}), 0, "empty purse weighs 0");
  console.log(`coins.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}
