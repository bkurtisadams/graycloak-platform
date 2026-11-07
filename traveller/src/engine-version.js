// engine-version.js — what the player's page says when its own version and the
// server's game version differ (v0.371.0). It used to say "Redeploy the
// function" whichever way round they were, so Bruce (page v0.368.0, server
// v0.370.0: the page was the stale side) was told to redeploy something that
// was already current. It also named a command that re-uploads the folder
// already built, which cannot change the version; the build is deploy.bat.

const parts = (version) => {
  const found = String(version ?? '').replace(/^v/, '').split('.');
  if (found.length < 2 || found.some((entry) => !/^\d+$/.test(entry))) return null;
  return found.map(Number);
};

// -1, 0 or 1; null when either is not a dotted number.
export function compareVersions(a, b) {
  const left = parts(a);
  const right = parts(b);
  if (!left || !right) return null;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const x = left[index] ?? 0;
    const y = right[index] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** What to say when the server's game is not this page's version (pure). */
export function engineMismatchMessage(engine, page) {
  if (!engine?.client || !page || engine.client === 'unknown' || engine.client === page) return null;
  if (compareVersions(engine.client, page) === 1) {
    return `This page is older than the game on the server: the server is v${engine.client}; this page is v${page}. Reload with Ctrl+F5. If it still says so, the site has not finished updating: wait a minute and try again.`;
  }
  return `The game on the server is v${engine.client}; this page is v${page}. Redeploy the function: run C:\\graycloak-platform\\traveller\\functions\\deploy.bat`;
}
