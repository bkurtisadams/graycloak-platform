// ---------------------------------------------------------------------------
// v0.166.0: a space fight starts from the scene it was staged on.
//
// Before this, START COMBAT built a fresh encounter with preset positions and
// zero velocity, and the staged board was only a picture. The scene is now the
// starting conditions: which ships, where, on what vector (Book 2 p.25), on
// which side, and the world whose gravity applies (p.29). When the fight closes
// the ships are written back where the fight left them.
//
// Pure: no DOM and no ship documents. The client builds the ship documents,
// because only it knows the campaign's own ship and how an encountered ship is
// armed.
// ---------------------------------------------------------------------------

import {
  sceneIsVectorBoard, sceneGravityWorld, sceneActorIsDesignReference,
  SCENE_DESIGN_REFERENCE_PREFIX, moveSceneShip, setSceneShipVector
} from './scene-document.js';

// The campaign's own ship keeps the participant id the rest of the client
// already knows it by (close-out, boarding, BREAK OFF).
export const OWN_SHIP_PARTICIPANT_ID = 'player';

// Book 2 p.22: "Most battles ... will involve only two sides". A staged scene
// has party and opposition, and neutral for ships that are simply there.
export const SPACE_COMBAT_SIDES = Object.freeze(['party', 'opposition']);

/**
 * What a staged space scene would put into a fight.
 *
 * `intruder` is which staged side takes Book 2 p.23's intruder turn. It is the
 * referee's choice, recorded rather than derived (the p.22 names are "for
 * convenience", and whoever initiated the encounter intrudes).
 *
 * Neutral ships stay on the scene and out of the fight. A token that is
 * neither the campaign's own ship nor a standard design is refused by name —
 * nothing else can be turned into a ship document yet.
 */
export function spaceSceneCombatPlan(scene, { ownShipId = null, intruder = 'opposition' } = {}) {
  if (!scene || !sceneIsVectorBoard(scene)) throw new TypeError('a space fight starts from a vector scene');
  if (!SPACE_COMBAT_SIDES.includes(intruder)) throw new RangeError(`the intruder is party or opposition (got ${intruder})`);
  const ships = [], standingBy = [], unresolved = [];
  for (const token of scene.tokens) {
    if (token.side === 'neutral') { standingBy.push(token); continue; }
    const own = ownShipId !== null && token.actorId === ownShipId;
    if (!own && !sceneActorIsDesignReference(token.actorId)) { unresolved.push(token); continue; }
    ships.push({
      tokenId: token.id,
      participantId: own ? OWN_SHIP_PARTICIPANT_ID : token.id,
      own,
      designKey: own ? null : token.actorId.slice(SCENE_DESIGN_REFERENCE_PREFIX.length),
      label: token.label,
      stagedSide: token.side,
      side: token.side === intruder ? 'intruder' : 'native',
      position: { x: token.position.x, y: token.position.y },
      // p.25: a vector of 0 is legal, so an absent velocity is a stop.
      velocity: { x: Number(token.velocity?.x) || 0, y: Number(token.velocity?.y) || 0 }
    });
  }
  const problems = [];
  if (unresolved.length) problems.push(`not a ship this campaign can fly: ${unresolved.map((token) => token.label || token.actorId).join(', ')}`);
  for (const side of SPACE_COMBAT_SIDES) {
    if (!ships.some((ship) => ship.stagedSide === side)) problems.push(`no ${side} ship is staged`);
  }
  const world = sceneGravityWorld(scene);
  return {
    sceneId: scene.identity.id,
    ships,
    standingBy: standingBy.map((token) => token.id),
    // p.28: a table holds one world, so a fight samples one — the scene names it.
    planet: world ? world.template : null,
    atmosphere: scene.space?.atmosphere ?? null,
    intruder,
    problems
  };
}

/** The encounter's record of where each participant came from. */
export function spaceSceneLink(plan) {
  return {
    sceneId: plan.sceneId,
    tokens: Object.fromEntries(plan.ships.map((ship) => [ship.participantId, ship.tokenId]))
  };
}

/**
 * The fight's last positions and vectors, written onto the scene it came from.
 * A token removed from the scene since is skipped rather than recreated; a
 * position past the edge is clamped to the span, as any move is.
 */
export function writeSpaceCombatToScene(scene, encounter, link) {
  if (!link || link.sceneId !== scene?.identity?.id) throw new Error('this fight was not staged on this scene');
  if (encounter?.spatialMode !== 'vector') throw new Error('only a vector fight has positions to write back');
  let next = scene;
  const written = [];
  for (const [participantId, tokenId] of Object.entries(link.tokens ?? {})) {
    const state = encounter.spatial.ships[participantId];
    if (!state || !next.tokens.some((token) => token.id === tokenId)) continue;
    next = moveSceneShip(next, { tokenId, x: state.position.x, y: state.position.y });
    next = setSceneShipVector(next, { tokenId, velocity: state.velocity });
    written.push(tokenId);
  }
  return { scene: next, written };
}
