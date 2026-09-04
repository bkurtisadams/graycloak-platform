// BATTLESYSTEM [15.4] aerial bombing. Pure rule data only; hosts own phase
// sequencing, battlefield geometry, resource mutation, and presentation.
export class BattlesystemAerial {
  static BOMB_TARGET_AC = Object.freeze({ 1: 10, 2: 8, 3: 4 });

  static bombingTargetAC(altitude) {
    const level = Number(altitude);
    return Number.isInteger(level) ? this.BOMB_TARGET_AC[level] ?? null : null;
  }

  static normalizeBombEquivalents(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  static bombingProfile({ altitude, equivalents = 1 } = {}) {
    const targetAC = this.bombingTargetAC(altitude);
    const count = this.normalizeBombEquivalents(equivalents);
    return targetAC == null || count < 1
      ? null
      : Object.freeze({ targetAC, equivalents: count, damage: '2d6', maneuverabilityPenalty: 1 });
  }
}
