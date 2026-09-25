// Meridian Reach — the sector the Sea of Suns campaign sits in (Kurt, Sep
// 2026). Original Graycloak campaign content, not Classic Traveller setting
// canon. Sixteen subsectors, A-P across then down (4x4); Far Meridian, the
// authored subsector, holds F, one of the four in the middle. The others are
// charted by Book 3 (1977) generation when the campaign first needs them and
// are kept on the campaign; this file holds only what is authored.
import { FAR_MERIDIAN_SUBSECTOR } from './far-meridian-subsector.js';

export const MERIDIAN_REACH_SECTOR = Object.freeze({
  id: 'meridian-reach',
  name: 'Meridian Reach',
  authored: Object.freeze({ F: FAR_MERIDIAN_SUBSECTOR }),
  // The authored subsector's own lanes (Book 3 p.3, thrown once in v0.313.0).
  routes: FAR_MERIDIAN_SUBSECTOR.routes ?? []
});
