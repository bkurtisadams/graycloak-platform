import { applyAdventureConsequences } from '../src/adventure-engine.js';
import { SEA_OF_SUNS_ADVENTURES } from '../campaigns/sea-of-suns/adventure-catalog.js';

// Compatibility facade for the browser. Campaign-specific adventure content lives in
// traveller/campaigns/... while the consequence processor remains generic.
export function applySituationThreadConsequences(options = {}) {
  return applyAdventureConsequences({
    ...options,
    definitions: SEA_OF_SUNS_ADVENTURES
  });
}
