// wound-dialog.js — Book 1 p.30's wound distribution, drawn the same way on
// the referee's client and on the player's page.
//
// "Each die rolled is taken as a single wound or group of hits, and must be
// applied to a single characteristic; further modifications may be
// distributed against, or added to, such wound groups as desired (players do
// this themselves; the referee does it for non-player characters)."
//
// v0.179.0: the player answers this on their own page, so the rows, the
// preview and the rules behind them live here rather than twice. The caller
// owns the dialog element and what to do with the answer; this owns what the
// player sees and what the choice would do.
import { applyPersonalDamage } from '../vendor/classic-traveller-rules/index.js?v=v0.203.1';

export const WOUND_CHARACTERISTICS = Object.freeze(['STR', 'DEX', 'END']);

// The shape both pages pass in. The referee builds it from
// pendingWoundAllocation(); the player from the published view's pendingWound.
export function woundPromptFrom(pending) {
  if (!pending) return null;
  return {
    key: pending.key,
    round: pending.round ?? null,
    defenderName: pending.defenderName ?? pending.defender?.name ?? 'the character',
    attackerName: pending.attackerName ?? 'attacker',
    weaponName: pending.weaponName ?? 'a weapon',
    damageDice: [...(pending.damageDice ?? [])],
    modifier: pending.modifier ?? 0,
    total: pending.total ?? (pending.damageDice ?? []).reduce((sum, die) => sum + die, 0) + (pending.modifier ?? 0),
    current: { ...(pending.current ?? pending.defender?.current ?? {}) },
    remaining: pending.remaining ?? 1
  };
}

// The starting distribution: one group per die, rotating STR/DEX/END, with
// the weapon's constant undistributed on the first group. The player moves it
// from there; nothing here is a rule, only a place to start.
export function initialWoundDraft(prompt) {
  return {
    key: prompt.key,
    targets: prompt.damageDice.map((die, index) => WOUND_CHARACTERISTICS[index % WOUND_CHARACTERISTICS.length]),
    shares: prompt.damageDice.map((die, index) => (index === 0 ? prompt.modifier : 0))
  };
}

// Move one point of the constant onto `index`, taking it from another group so
// the shares always sum to the constant — the rules reject any other total.
export function moveWoundShare(prompt, draft, index, delta) {
  const shares = [...draft.shares];
  const donor = shares.findIndex((value, other) => other !== index
    && (delta > 0 ? (prompt.modifier > 0 ? value > 0 : true) : (prompt.modifier < 0 ? value < 0 : true)));
  if (donor < 0) return draft;
  shares[index] += delta;
  shares[donor] -= delta;
  return { ...draft, shares };
}

// What this distribution would do, asked of the rules rather than recomputed.
// Pure: nothing is applied and no die is rolled.
export function previewWoundDraft(prompt, draft) {
  const combatant = {
    current: { ...prompt.current },
    characteristics: { ...prompt.current },
    // A wound that needs distributing is by definition not the first (Book 1
    // p.30 puts that entirely on one random characteristic), so no
    // first-blood roll is involved.
    firstBlood: false,
    hitsTaken: 0,
    status: 'active'
  };
  try {
    const damage = applyPersonalDamage(combatant, prompt.damageDice, null, {
      modifier: prompt.modifier,
      allocation: prompt.modifier ? draft.shares : null,
      targets: draft.targets
    });
    return { ok: true, current: damage.combatant.current, status: damage.status, error: null };
  } catch (error) {
    return { ok: false, current: { ...prompt.current }, status: 'active', error: error?.message ?? String(error) };
  }
}

export function woundStatusText(status) {
  if (status === 'dead') return 'DEAD \u2014 ALL THREE AT ZERO (p.30)';
  if (status === 'unconscious') return 'UNCONSCIOUS \u2014 A CHARACTERISTIC AT ZERO (p.30)';
  return 'STILL STANDING';
}

export function woundHitLine(prompt) {
  const modifier = prompt.modifier ? ` ${prompt.modifier > 0 ? '+' : ''}${prompt.modifier}` : '';
  return `${prompt.attackerName.toUpperCase()} \u00b7 ${String(prompt.weaponName).toUpperCase()} \u00b7 `
    + `${prompt.damageDice.map((die) => `[${die}]`).join(' ')}${modifier} = ${prompt.total}`;
}

// One row per die: the group, which characteristic it falls on, and — when
// the weapon has a constant — controls to move a point of it here.
// `onChange(nextDraft)` is called with a new draft; the caller re-renders.
export function renderWoundGroups(container, prompt, draft, onChange) {
  container.replaceChildren();
  prompt.damageDice.forEach((die, index) => {
    const row = container.ownerDocument.createElement('div');
    row.className = 'wound-group-row';
    const share = draft.shares[index] ?? 0;
    const label = container.ownerDocument.createElement('span');
    label.className = 'wound-group-die';
    label.textContent = `[${die}]${share ? ` ${share > 0 ? '+' : ''}${share}` : ''} = ${Math.max(0, die + share)}`;
    label.title = 'Book 1 p.30: a group floors at zero; it cannot heal a characteristic';
    const picks = container.ownerDocument.createElement('span');
    picks.className = 'wound-group-picks';
    for (const key of WOUND_CHARACTERISTICS) {
      const button = container.ownerDocument.createElement('button');
      button.type = 'button';
      const on = draft.targets[index] === key;
      button.className = `text-button declare-choice${on ? ' is-on' : ''}`;
      const current = prompt.current[key] ?? 0;
      button.textContent = `${key} ${current}`;
      button.disabled = current <= 0;
      button.title = current <= 0
        ? `Book 1 p.31: ${key} is already at zero, so further points must go elsewhere`
        : `Apply this group to ${key}`;
      button.setAttribute('aria-pressed', String(on));
      button.addEventListener('click', () => {
        const targets = [...draft.targets];
        targets[index] = key;
        onChange({ ...draft, targets });
      });
      picks.append(button);
    }
    row.append(label, picks);
    if (prompt.modifier) {
      const move = container.ownerDocument.createElement('span');
      move.className = 'wound-group-share';
      for (const delta of [-1, 1]) {
        const button = container.ownerDocument.createElement('button');
        button.type = 'button';
        button.className = 'text-button';
        button.textContent = delta > 0 ? '[ + ]' : '[ \u2212 ]';
        button.title = `Move one point of the weapon\u2019s ${prompt.modifier > 0 ? '+' : ''}${prompt.modifier} onto this group`;
        button.addEventListener('click', () => onChange(moveWoundShare(prompt, draft, index, delta)));
        move.append(button);
      }
      row.append(move);
    }
    container.append(row);
  });
}

// The two preview lines: the characteristics before and after, and what the
// wound leaves the character able to do.
export function renderWoundPreview(container, prompt, preview) {
  container.replaceChildren();
  if (!preview.ok) return;
  const after = container.ownerDocument.createElement('div');
  after.className = 'wound-preview-line';
  after.textContent = WOUND_CHARACTERISTICS
    .map((key) => `${key} ${prompt.current[key] ?? 0} \u2192 ${preview.current[key] ?? 0}`)
    .join('  \u00b7  ');
  const state = container.ownerDocument.createElement('div');
  state.className = `wound-preview-state${preview.status === 'active' ? '' : ' critical'}`;
  state.textContent = woundStatusText(preview.status);
  container.append(after, state);
}
