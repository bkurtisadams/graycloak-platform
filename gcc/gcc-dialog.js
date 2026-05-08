// gcc-dialog.js v1.0 — Unified dialog API for GCC pages
// Replaces: mp-dialog.js
// Requires: gcc-dialog.css loaded (auto-injects modal HTML if missing)
(function() {
  // Auto-inject dialog HTML if not present
  if (!document.getElementById('gcc-dlg-overlay')) {
    const div = document.createElement('div');
    div.innerHTML = '<div class="gcc-dlg-overlay" id="gcc-dlg-overlay">' +
      '<div class="gcc-dlg" id="gcc-dlg">' +
      '<div class="gcc-dlg-header" id="gcc-dlg-header">' +
      '<span class="gcc-dlg-title" id="gcc-dlg-title"></span>' +
      '<button class="gcc-dlg-close" id="gcc-dlg-close">&times;</button>' +
      '</div>' +
      '<div class="gcc-dlg-body" id="gcc-dlg-body"></div>' +
      '<div class="gcc-dlg-footer" id="gcc-dlg-footer"></div>' +
      '</div></div>';
    document.body.appendChild(div.firstElementChild);
  }

  const overlay = document.getElementById('gcc-dlg-overlay');
  const dlg = document.getElementById('gcc-dlg');
  const titleEl = document.getElementById('gcc-dlg-title');
  const body = document.getElementById('gcc-dlg-body');
  const footer = document.getElementById('gcc-dlg-footer');
  const closeBtn = document.getElementById('gcc-dlg-close');
  let _resolve = null;

  function open() { overlay.classList.add('open'); }
  function close(val) {
    overlay.classList.remove('open');
    dlg.classList.remove('wide');
    if (_resolve) { _resolve(val); _resolve = null; }
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
  closeBtn.addEventListener('click', () => close(null));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close(null);
  });

  // --- SVG icons (compact 14px) ---
  const icons = {
    info: '<svg viewBox="0 0 14 14" width="14" height="14" style="fill:currentColor;vertical-align:middle;margin-right:5px"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="4" r="0.9"/><rect x="6.2" y="5.8" width="1.6" height="4" rx="0.4"/></svg>',
    warn: '<svg viewBox="0 0 14 14" width="14" height="14" style="fill:currentColor;vertical-align:middle;margin-right:5px"><path d="M7 1L13.5 13H0.5Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="7" cy="10.5" r="0.7"/><rect x="6.3" y="5" width="1.4" height="3.8" rx="0.4"/></svg>',
    dice: '<svg viewBox="0 0 14 14" width="14" height="14" style="fill:currentColor;vertical-align:middle;margin-right:5px"><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="4" cy="4" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="7" cy="7" r="1"/></svg>'
  };

  // --- Public API ---

  function alert(title, msg, icon) {
    titleEl.innerHTML = (icon || icons.info) + title;
    body.innerHTML = '<p>' + msg + '</p>';
    footer.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'gcc-dlg-btn primary';
    btn.textContent = 'OK';
    btn.onclick = () => close(true);
    footer.appendChild(btn);
    open();
    btn.focus();
    return new Promise(r => { _resolve = r; });
  }

  function confirm(title, msg, opts) {
    opts = opts || {};
    titleEl.innerHTML = (opts.icon || icons.warn) + title;
    body.innerHTML = '<p>' + msg + '</p>';
    footer.innerHTML = '';
    const btnNo = document.createElement('button');
    btnNo.className = 'gcc-dlg-btn';
    btnNo.textContent = opts.cancelText || 'Cancel';
    btnNo.onclick = () => close(false);
    const btnYes = document.createElement('button');
    btnYes.className = 'gcc-dlg-btn ' + (opts.danger ? 'danger' : 'primary');
    btnYes.textContent = opts.okText || 'OK';
    btnYes.onclick = () => close(true);
    if (opts.okText !== '') footer.appendChild(btnNo);
    if (opts.okText !== '') footer.appendChild(btnYes);
    else { footer.appendChild(btnNo); } // okText='' means only show cancel
    open();
    if (opts.okText !== '') btnYes.focus(); else btnNo.focus();
    return new Promise(r => { _resolve = r; });
  }

  function choose(title, choices, opts) {
    opts = opts || {};
    titleEl.innerHTML = (opts.icon || icons.dice) + title;
    let html = opts.intro ? '<p>' + opts.intro + '</p>' : '';
    choices.forEach((c, i) => {
      html += '<div class="gcc-dlg-choice" data-idx="' + i + '">';
      html += '<span class="gcc-dlg-choice-num">' + (i + 1) + '</span>';
      html += '<div><div class="gcc-dlg-choice-label">' + c.label + '</div>';
      if (c.desc) html += '<div class="gcc-dlg-choice-desc">' + c.desc + '</div>';
      html += '</div></div>';
    });
    body.innerHTML = html;
    footer.innerHTML = '';
    if (opts.cancelable !== false) {
      const btn = document.createElement('button');
      btn.className = 'gcc-dlg-btn';
      btn.textContent = 'Cancel';
      btn.onclick = () => close(null);
      footer.appendChild(btn);
    }
    body.querySelectorAll('.gcc-dlg-choice').forEach(el => {
      el.addEventListener('click', () => close(parseInt(el.dataset.idx)));
    });
    open();
    return new Promise(r => { _resolve = r; });
  }

  function pickMulti(title, choices, opts) {
    opts = opts || {};
    const min = opts.min || 1;
    const max = opts.max || choices.length;
    titleEl.innerHTML = (opts.icon || icons.dice) + title;
    let html = opts.intro ? '<p>' + opts.intro + '</p>' : '';
    choices.forEach((c, i) => {
      html += '<div class="gcc-dlg-choice" data-idx="' + i + '">';
      html += '<span class="gcc-dlg-choice-num">' + (i + 1) + '</span>';
      html += '<div><div class="gcc-dlg-choice-label">' + c.label + '</div>';
      if (c.desc) html += '<div class="gcc-dlg-choice-desc">' + c.desc + '</div>';
      html += '</div></div>';
    });
    body.innerHTML = html;
    footer.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'gcc-dlg-btn';
    btnCancel.textContent = 'Cancel';
    btnCancel.onclick = () => close(null);
    footer.appendChild(btnCancel);
    const btnOk = document.createElement('button');
    btnOk.className = 'gcc-dlg-btn primary';
    btnOk.textContent = opts.okText || 'Confirm';
    btnOk.disabled = true;
    footer.appendChild(btnOk);
    const selected = new Set();
    body.querySelectorAll('.gcc-dlg-choice').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        if (selected.has(idx)) { selected.delete(idx); el.classList.remove('selected'); }
        else if (selected.size < max) { selected.add(idx); el.classList.add('selected'); }
        btnOk.disabled = selected.size < min;
      });
    });
    btnOk.onclick = () => close([...selected]);
    open();
    return new Promise(r => { _resolve = r; });
  }

  function prompt(title, opts) {
    opts = opts || {};
    dlg.classList.toggle('wide', !!opts.wide);
    titleEl.innerHTML = (opts.icon || icons.info) + title;
    body.innerHTML = (opts.intro ? '<p>' + opts.intro + '</p>' : '') +
      '<textarea class="' + (opts.textClass || 'gcc-dlg-textarea') + '" placeholder="' + (opts.placeholder || '') + '"></textarea>' +
      (opts.hint ? '<div class="' + (opts.hintClass || 'gcc-dlg-hint') + '">' + opts.hint + '</div>' : '');
    footer.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'gcc-dlg-btn';
    btnCancel.textContent = opts.cancelText || 'Cancel';
    btnCancel.onclick = () => close(null);
    const btnOk = document.createElement('button');
    btnOk.className = 'gcc-dlg-btn primary';
    btnOk.textContent = opts.okText || 'OK';
    btnOk.onclick = () => { close(body.querySelector('textarea').value); };
    footer.appendChild(btnCancel);
    footer.appendChild(btnOk);
    open();
    body.querySelector('textarea').focus();
    return new Promise(r => { _resolve = r; });
  }

  function listPick(title, items, opts) {
    opts = opts || {};
    dlg.classList.toggle('wide', true);
    titleEl.innerHTML = (opts.icon || icons.info) + title;
    if (!items.length) {
      body.innerHTML = '<div class="gcc-dlg-empty">' + (opts.emptyText || 'No items found.') + '</div>';
      footer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'gcc-dlg-btn primary';
      btn.textContent = 'OK';
      btn.onclick = () => close(null);
      footer.appendChild(btn);
      open();
      btn.focus();
      return new Promise(r => { _resolve = r; });
    }
    let html = '<ul class="gcc-dlg-list">';
    items.forEach((it, i) => {
      const portrait = it.image
        ? '<img class="ci-portrait" src="' + it.image + '">'
        : '<div class="ci-ph">' + (it.icon || '?') + '</div>';
      html += '<li class="gcc-dlg-item" data-ci="' + i + '">' + portrait +
        '<div class="ci-info"><div class="ci-name">' + (it.name || 'Unnamed') + '</div>' +
        (it.sub ? '<div class="ci-sub">' + it.sub + '</div>' : '') +
        '</div></li>';
    });
    html += '</ul>';
    body.innerHTML = html;
    footer.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'gcc-dlg-btn';
    btnCancel.textContent = 'Cancel';
    btnCancel.onclick = () => close(null);
    footer.appendChild(btnCancel);
    body.querySelectorAll('.gcc-dlg-item').forEach(el => {
      el.addEventListener('click', () => close(parseInt(el.dataset.ci)));
    });
    open();
    return new Promise(r => { _resolve = r; });
  }

  function listChars(title, chars, opts) {
    return listPick(title, chars.map(ch => ({
      name: ch.name || ch.heroName || 'Unnamed',
      sub: [ch.trueId, ch.side, ch.player].filter(Boolean).join(' \u00b7 '),
      image: ch._image || null,
    })), opts);
  }

  function listVehs(title, vehs, opts) {
    return listPick(title, vehs.map(v => ({
      name: v.name || 'Unnamed',
      sub: [v.model, v.operator].filter(Boolean).join(' \u00b7 '),
      image: v.pictureData || v._image || null,
      icon: '\ud83d\ude97',
    })), opts);
  }

  // Expose as GCCDialog + backward-compat alias
  const api = { alert, confirm, choose, pickMulti, prompt, listPick, listChars, listVehs };
  window.GCCDialog = api;
  window.MPDialog = api;
})();
