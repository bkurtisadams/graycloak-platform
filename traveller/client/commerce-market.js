function seed32(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededDice(seedText) {
  let state = seed32(seedText) || 0x6d2b79f5;
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rollD6 = () => Math.floor(random() * 6) + 1;
  return Object.freeze({
    rollD6,
    roll2D6() {
      const dice = [rollD6(), rollD6()];
      return { dice, total: dice[0] + dice[1] };
    }
  });
}

export function campaignDateKey(campaign) {
  if (!campaign?.time) return 'NO-DATE';
  return `${String(campaign.time.dayOfYear).padStart(3, '0')}-${campaign.time.year}`;
}

export function campaignWeekKey(campaign) {
  if (!campaign?.time) return 'NO-WEEK';
  const week = Math.floor((campaign.time.dayOfYear - 1) / 7) + 1;
  return `${campaign.time.year}-W${String(week).padStart(2, '0')}`;
}

export function routeMarketSeed(campaign, originSystemId, destinationSystemId, kind) {
  return [campaign?.identity?.id ?? 'campaign', campaignDateKey(campaign), originSystemId, destinationSystemId, kind].join('|');
}

export function weeklyTradeSeed(campaign, systemId) {
  return [campaign?.identity?.id ?? 'campaign', campaignWeekKey(campaign), systemId, 'speculative'].join('|');
}

export function saleQuoteSeed(campaign, systemId, cargoId) {
  return [campaign?.identity?.id ?? 'campaign', campaignDateKey(campaign), systemId, cargoId, 'resale'].join('|');
}
