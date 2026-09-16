// v0.192.6: chat is the shell's bottom edge. Closed, it is the composer and
// the latest line; open, the feed rises above it. State is per browser.
const CHAT_OPEN_KEY = 'graycloak-traveller-chat-open';

function setOpen(bar, open, { persist = true } = {}) {
  bar.classList.toggle('open', open);
  const toggle = bar.querySelector('.chat-open-toggle');
  if (toggle) {
    toggle.textContent = open ? '[ CLOSE \u25be ]' : '[ OPEN \u25b4 ]';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (persist) {
    try { window.localStorage.setItem(CHAT_OPEN_KEY, open ? '1' : '0'); } catch { /* private mode */ }
  }
  if (open) {
    const feed = bar.querySelector('#activity-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  }
}

function mirrorLatest(bar) {
  const feed = bar.querySelector('#activity-feed');
  const latest = bar.querySelector('.chat-latest');
  if (!feed || !latest) return;
  const update = () => {
    const entries = feed.children;
    const entry = entries.length ? entries[entries.length - 1] : null;
    latest.textContent = entry ? entry.textContent.replace(/\s+/g, ' ').trim() : '';
    latest.title = latest.textContent;
  };
  new MutationObserver(update).observe(feed, { childList: true, subtree: true, characterData: true });
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  const bar = document.querySelector('#shell-chat');
  if (!bar) return;
  let stored = null;
  try { stored = window.localStorage.getItem(CHAT_OPEN_KEY); } catch { /* private mode */ }
  setOpen(bar, stored === '1', { persist: false });
  bar.querySelector('.chat-open-toggle')?.addEventListener('click', () => setOpen(bar, !bar.classList.contains('open')));
  bar.querySelector('#chat-input')?.addEventListener('focus', () => { if (!bar.classList.contains('open')) setOpen(bar, true); });
  bar.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bar.classList.contains('open')) { setOpen(bar, false); event.stopPropagation(); }
  });
  mirrorLatest(bar);
});
