import { connectLobby } from './online.js';
const $ = id => document.getElementById(id);
let api = null, timer = null, user = null, pending = null, reading = false;
const status = s => $('status').textContent = s;
const guard = fn => async () => { try {
    await fn();
}
catch (e) {
    status(e.message);
} };
async function refresh() { if (!user || reading)
    return; reading = true; try {
    const rows = await api.list();
    if (!user)
        return;
    $('lobbyMessages').replaceChildren(...rows.map(m => { const p = document.createElement('p'); p.textContent = `${m.name}: ${m.message}`; return p; }));
    $('lobbyMessages').scrollTop = $('lobbyMessages').scrollHeight;
}
catch (e) {
    status(e.message);
}
finally {
    reading = false;
} }
$('connect').onclick = guard(async () => { if (api)
    return; $('connect').disabled = true; try {
    api = await connectLobby();
    api.onUser(u => { user = u; clearInterval(timer); pending = null; $('account').hidden = !!u; $('logout').hidden = !u; $('send').hidden = !u; status(u ? 'Connected to emulator lobby.' : 'Sign in or create a test account.'); if (u) {
        refresh();
        timer = setInterval(refresh, 2500);
    }
    else
        $('lobbyMessages').replaceChildren(); });
}
catch (e) {
    $('connect').disabled = false;
    throw e;
} });
$('login').onclick = guard(() => api.signIn($('email').value, $('password').value));
$('register').onclick = guard(() => api.register($('email').value, $('password').value));
$('logout').onclick = guard(() => api.signOut());
$('send').onsubmit = async (e) => { e.preventDefault(); if (!user || $('send').querySelector('button').disabled)
    return; const name = $('displayName').value.trim(), message = $('message').value.trim(); if (!pending || pending.name !== name || pending.message !== message)
    pending = { name, message, id: crypto.randomUUID() }; const btn = $('send').querySelector('button'); btn.disabled = true; try {
    await api.send(name, message, pending.id);
    pending = null;
    $('message').value = '';
    await refresh();
}
catch (err) {
    status(err.message);
}
finally {
    btn.disabled = false;
} };
window.addEventListener('pagehide', () => clearInterval(timer));
