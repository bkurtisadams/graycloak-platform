// v0.196.0: light / dark theme. The choice is per browser, kept in
// localStorage; with nothing stored the OS preference decides. The toggle
// button in each masthead is the only control.
const THEME_STORAGE_KEY = 'graycloak-traveller-theme';
const THEMES = ['light', 'dark'];

function storedTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function currentTheme() {
  return document.documentElement.dataset.theme || storedTheme() || systemTheme();
}

export function applyTheme(theme, { persist = true } = {}) {
  const next = THEMES.includes(theme) ? theme : 'light';
  document.documentElement.dataset.theme = next;
  if (persist) {
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* private mode */ }
  }
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.textContent = next === 'dark' ? '[ LIGHT ]' : '[ DARK ]';
    button.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    button.title = next === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme';
  }
  return next;
}

export function toggleTheme() {
  return applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

applyTheme(storedTheme() ?? systemTheme(), { persist: false });

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme(), { persist: false });
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.hidden = false;
    button.addEventListener('click', toggleTheme);
  }
});

window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (!storedTheme()) applyTheme(systemTheme(), { persist: false });
});
