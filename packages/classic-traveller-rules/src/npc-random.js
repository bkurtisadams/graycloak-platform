// v0.78.0 (build-order step 7): the quick-NPC stack draws its randomness from
// here, so a caller can hand it the game's seeded dice and have an NPC replay
// exactly. Unset, it is Math.random, as before.
let source = Math.random;

export function npcRandom() {
  return source();
}

/** Runs fn with random() as the NPC stack's source; synchronous, restored after. */
export function withNpcRandom(random, fn) {
  if (typeof random !== 'function') return fn();
  const previous = source;
  source = random;
  try { return fn(); } finally { source = previous; }
}
