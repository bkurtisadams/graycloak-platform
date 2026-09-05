export const CAMPAIGN_COMMAND_SCHEMA_VERSION = 1;

function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }

export function createCampaignCommandIntent({ commandId, campaignId, expectedRevision, type, actorId = null, choices = {} } = {}) {
  if (!nonblank(commandId)) throw new TypeError('commandId is required');
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('expectedRevision must be a nonnegative integer');
  if (!nonblank(type)) throw new TypeError('command type is required');
  if (actorId !== null && !nonblank(actorId)) throw new TypeError('actorId must be null or nonblank');
  if (!plain(choices)) throw new TypeError('choices must be a plain object');
  return {
    schemaVersion: CAMPAIGN_COMMAND_SCHEMA_VERSION,
    commandId: commandId.trim(),
    campaignId: campaignId.trim(),
    expectedRevision,
    type: type.trim(),
    actorId,
    choices: clone(choices)
  };
}

export function normalizeCampaignCommandIntent(raw) {
  if (!plain(raw)) throw new TypeError('campaign command must be an object');
  return createCampaignCommandIntent(raw);
}

export function createCampaignCommandService({ store, definitions = {}, authorize } = {}) {
  if (!store || typeof store.read !== 'function' || typeof store.transact !== 'function') throw new TypeError('store must provide read and transact');
  if (!plain(definitions)) throw new TypeError('definitions must be an object');
  const defaultAuthorize = ({ session, command }) => {
    if (!session?.player?.id) return false;
    if (session.campaignId !== command.campaignId) return false;
    if (session.player.role === 'spectator') return false;
    if (session.player.role === 'referee' || session.player.role === 'solo') return true;
    return command.actorId !== null && session.controlledCharacterIds?.includes(command.actorId);
  };
  const authorizeCommand = typeof authorize === 'function' ? authorize : defaultAuthorize;

  return Object.freeze({
    execute(raw, { session, principal = null } = {}) {
      let command;
      try { command = normalizeCampaignCommandIntent(raw); }
      catch (error) { return { ok: false, code: 'invalid-command', message: error.message }; }
      const definition = definitions[command.type];
      if (!definition || typeof definition.execute !== 'function') return { ok: false, code: 'unsupported-command', type: command.type };
      if (!authorizeCommand({ session, principal, command })) return { ok: false, code: 'forbidden' };
      let choices;
      try {
        choices = typeof definition.normalizeChoices === 'function'
          ? definition.normalizeChoices(clone(command.choices))
          : clone(command.choices);
      } catch (error) {
        return { ok: false, code: 'invalid-choices', message: error.message };
      }
      try {
        const result = store.transact({
          campaignId: command.campaignId,
          expectedRevision: command.expectedRevision,
          commandId: command.commandId,
          update: (state) => definition.execute({ state, choices, command, session, principal })
        });
        if (result.status === 'committed' || result.status === 'already-committed') return { ok: true, ...result };
        return { ok: false, code: result.status, ...result };
      } catch (error) {
        return { ok: false, code: 'execution-failed', message: error.message };
      }
    }
  });
}
