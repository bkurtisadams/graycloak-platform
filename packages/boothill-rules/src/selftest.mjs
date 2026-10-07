export function makeChecker() {
  let pass = 0;
  const ok = (cond, msg) => {
    if (!cond) throw new Error(`self-test failed: ${msg}`);
    pass++;
  };
  const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} (got ${a}, want ${b})`);
  return { ok, eq, count: () => pass };
}

export function isMain(metaUrl) {
  if (typeof process === "undefined" || !process.argv?.[1]) return false;
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  return norm(new URL(metaUrl).pathname) === norm(process.argv[1]);
}
