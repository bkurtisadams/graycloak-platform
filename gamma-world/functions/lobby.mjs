// Pure validation for the emulator lobby. Production deployment deliberately excluded.
export function validateLobbyRequest(auth, data) {
    if (!auth?.uid)
        throw Object.assign(Error('Sign in first'), { code: 'unauthenticated' });
    if (data?.op === 'list')
        return { op: 'list' };
    if (data?.op !== 'send')
        throw Object.assign(Error('Unknown lobby command'), { code: 'invalid-argument' });
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!message || message.length > 500 || !name || name.length > 40 || typeof data.commandId !== 'string' || !/^[A-Za-z0-9_-]{10,80}$/.test(data.commandId))
        throw Object.assign(Error('Invalid name, message or command ID'), { code: 'invalid-argument' });
    return { op: 'send', message, name, commandId: data.commandId };
}
