// mp-dialog.js — Shared modal dialog API for GCC pages
// Requires: mp-dialog.css loaded, and modal HTML in page (auto-injected if missing)
(function() {
  // Auto-inject modal HTML if not present
  if (!document.getElementById('mp-modal-overlay')) {
    const div = document.createElement('div');
    div.innerHTML = '<div class="mp-modal-overlay" id="mp-modal-overlay"><div class="mp-modal" id="mp-modal"><div class="mp-modal-header" id="mp-modal-header"></div><div class="mp-modal-body" id="mp-modal-body"></div><div class="mp-modal-footer" id="mp-modal-footer"></div></div></div>';
    document.body.appendChild(div.firstElementChild);
  }

  const overlay = document.getElementById('mp-modal-overlay');
  const modal = document.getElementById('mp-modal');
  const header = document.getElementById('mp-modal-header');
  const body = document.getElementById('mp-modal-body');
  const footer = document.getElementById('mp-modal-footer');
  let _resolve = null;

  function open() { overlay.classList.add('open'); }
  function close(val) { overlay.classList.remove('open'); modal.classList.remove('wide'); if (_resolve) { _resolve(val); _resolve = null; } }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close(null);
  });

  const diceIcon = '<svg viewBox="0 0 16 16" width="16" height="16" style="fill:#fff"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="4.5" cy="4.5" r="1.2"/><circle cx="11.5" cy="11.5" r="1.2"/><circle cx="8" cy="8" r="1.2"/></svg>';
  const infoIcon = '<svg viewBox="0 0 16 16" width="16" height="16" style="fill:#fff"><circle cx="8" cy="8" r="7" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="8" cy="4.5" r="1"/><rect x="7" y="6.5" width="2" height="5" rx="0.5"/></svg>';
  const warnIcon = '<svg viewBox="0 0 16 16" width="16" height="16" style="fill:#fff"><path d="M8 1L15 14H1Z" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="8" cy="11.5" r="0.8"/><rect x="7.2" y="5.5" width="1.6" height="4" rx="0.5"/></svg>';

  function alert(title, msg, icon) {
    header.innerHTML = (icon || infoIcon) + ' ' + title;
    body.innerHTML = '<p>' + msg + '</p>';
    footer.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'mp-modal-btn primary';
    btn.textContent = 'OK';
    btn.onclick = () => close(true);
    footer.appendChild(btn);
    open();
    btn.focus();
    return new Promise(r => { _resolve = r; });
  }

  function confirm(title, msg, opts) {
    opts = opts || {};
    header.innerHTML = (opts.icon || warnIcon) + ' ' + title;
    body.innerHTML = '<p>' + msg + '</p>';
    footer.innerHTML = '';
    const btnNo = document.createElement('button');
    btnNo.className = 'mp-modal-btn';
    btnNo.textContent = opts.cancelText || 'Cancel';
    btnNo.onclick = () => close(false);
    const btnYes = document.createElement('button');
    btnYes.className = 'mp-modal-btn ' + (opts.danger ? 'danger' : 'primary');
    btnYes.textContent = opts.okText || 'OK';
    btnYes.onclick = () => close(true);
    footer.appendChild(btnNo);
    footer.appendChild(btnYes);
    open();
    btnYes.focus();
    return new Promise(r => { _resolve = r; });
  }

  function choose(title, choices, opts) {
    opts = opts || {};
    header.innerHTML = (opts.icon || diceIcon) + ' ' + title;
    let html = opts.intro ? '<p>' + opts.intro + '</p>' : '';
    choices.forEach((c, i) => {
      html += '<div class="mp-choice" data-idx="' + i + '">';
      html += '<span class="mp-choice-num">' + (i + 1) + '</span>';
      html += '<div class="mp-choice-text"><div class="mp-choice-label">' + c.label + '</div>';
      if (c.desc) html += '<div class="mp-choice-desc">' + c.desc + '</div>';
      html += '</div></div>';
    });
    body.innerHTML = html;
    footer.innerHTML = '';
    if (opts.cancelable !== false) {
      const btnCancel = document.createElement('button');
      btnCancel.className = 'mp-modal-btn';
      btnCancel.textContent = 'Cancel';
      btnCancel.onclick = () => close(null);
      footer.appendChild(btnCancel);
    }
    body.querySelectorAll('.mp-choice').forEach(el => {
      el.addEventListener('click', () => close(parseInt(el.dataset.idx)));
    });
    open();
    return new Promise(r => { _resolve = r; });
  }

  function pickMulti(title, choices, opts) {
    opts = opts || {};
    const min = opts.min || 1;
    const max = opts.max || choices.length;
    header.innerHTML = (opts.icon || diceIcon) + ' ' + title;
    let html = opts.intro ? '<p>' + opts.intro + '</p>' : '';
    choices.forEach((c, i) => {
      html += '<div class="mp-choice" data-idx="' + i + '">';
      html += '<span class="mp-choice-num">' + (i + 1) + '</span>';
      html += '<div class="mp-choice-text"><div class="mp-choice-label">' + c.label + '</div>';
      if (c.desc) html += '<div class="mp-choice-desc">' + c.desc + '</div>';
      html += '</div></div>';
    });
    body.innerHTML = html;
    footer.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'mp-modal-btn';
    btnCancel.textContent = 'Cancel';
    btnCancel.onclick = () => close(null);
    footer.appendChild(btnCancel);
    const btnOk = document.createElement('button');
    btnOk.className = 'mp-modal-btn primary';
    btnOk.textContent = opts.okText || 'Confirm';
    btnOk.disabled = true;
    footer.appendChild(btnOk);
    const selected = new Set();
    body.querySelectorAll('.mp-choice').forEach(el => {
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
    modal.classList.toggle('wide', !!opts.wide);
    header.innerHTML = (opts.icon || infoIcon) + ' ' + title;
    body.innerHTML = (opts.intro ? '<p>' + opts.intro + '</p>' : '') +
      '<textarea class="' + (opts.textClass || 'mp-dlg-textarea') + '" placeholder="' + (opts.placeholder || '') + '"></textarea>' +
      (opts.hint ? '<div class="' + (opts.hintClass || '') + '">' + opts.hint + '</div>' : '');
    footer.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'mp-modal-btn';
    btnCancel.textContent = opts.cancelText || 'Cancel';
    btnCancel.onclick = () => close(null);
    const btnOk = document.createElement('button');
    btnOk.className = 'mp-modal-btn primary';
    btnOk.textContent = opts.okText || 'OK';
    btnOk.onclick = () => { close(body.querySelector('textarea').value); };
    footer.appendChild(btnCancel);
    footer.appendChild(btnOk);
    open();
    body.querySelector('textarea').focus();
    return new Promise(r => { _resolve = r; });
  }

  // Generic list picker — items: [{name, sub, image}], returns index or null
  function listPick(title, items, opts) {
    opts = opts || {};
    modal.classList.toggle('wide', true);
    header.innerHTML = (opts.icon || infoIcon) + ' ' + title;
    if (!items.length) {
      body.innerHTML = '<div class="char-empty">' + (opts.emptyText || 'No items found.') + '</div>';
      footer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'mp-modal-btn primary';
      btn.textContent = 'OK';
      btn.onclick = () => close(null);
      footer.appendChild(btn);
      open();
      btn.focus();
      return new Promise(r => { _resolve = r; });
    }
    let html = '<ul class="char-list">';
    items.forEach((it, i) => {
      const portrait = it.image
        ? '<img class="ci-portrait" src="' + it.image + '">'
        : '<div class="ci-ph">' + (it.icon || '?') + '</div>';
      html += '<li class="char-item" data-ci="' + i + '">' + portrait +
        '<div class="ci-info"><div class="ci-name">' + (it.name || 'Unnamed') + '</div>' +
        (it.sub ? '<div class="ci-sub">' + it.sub + '</div>' : '') +
        '</div></li>';
    });
    html += '</ul>';
    body.innerHTML = html;
    footer.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'mp-modal-btn';
    btnCancel.textContent = 'Cancel';
    btnCancel.onclick = () => close(null);
    footer.appendChild(btnCancel);
    body.querySelectorAll('.char-item').forEach(el => {
      el.addEventListener('click', () => close(parseInt(el.dataset.ci)));
    });
    open();
    return new Promise(r => { _resolve = r; });
  }

  // Character list picker (convenience wrapper)
  function listChars(title, chars, opts) {
    return listPick(title, chars.map(ch => ({
      name: ch.name || ch.heroName || 'Unnamed',
      sub: [ch.trueId, ch.side, ch.player].filter(Boolean).join(' · '),
      image: ch._image || null,
    })), opts);
  }

  // Vehicle list picker (convenience wrapper)
  function listVehs(title, vehs, opts) {
    return listPick(title, vehs.map(v => ({
      name: v.name || 'Unnamed',
      sub: [v.model, v.operator].filter(Boolean).join(' · '),
      image: v.pictureData || v._image || null,
      icon: '🚗',
    })), opts);
  }

  window.MPDialog = { alert, confirm, choose, pickMulti, prompt, listPick, listChars, listVehs };
})();
