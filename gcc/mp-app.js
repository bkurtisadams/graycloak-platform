// mp-app.js v4.13.0 — File System Access API (Save/Save As/Open), canvas lock

const veh = new Vehicle();
let editor = null;

// ---- Populate templates dropdown ----
(function buildTemplateDropdown() {
  const sel = document.getElementById("sel-template");
  for (let i = 0; i < MP.TEMPLATES.length; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = MP.TEMPLATES[i].name;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    if (sel.value === "") return;
    const tpl = MP.TEMPLATES[parseInt(sel.value)];
    if (!tpl) return;
    veh.name = tpl.name;
    veh.model = "";
    veh.operator = "";
    veh.basicCost = tpl.basicCost;
    veh.techMod = tpl.techMod || 0;
    veh.maneuverMod = tpl.maneuverMod || 0;
    veh.wontExplode = tpl.wontExplode || false;
    veh.isBase = tpl.isBase || false;
    veh.pictureData = "";
    veh.systems = [];
    veh._nextId = 1;
    for (const ts of tpl.systems) {
      const sys = veh.addSystem();
      sys.spaces = ts.spaces || 0;
      sys.extraCPs = ts.extraCPs || 0;
      sys.desc = ts.desc || "";
      sys.integral = ts.integral || false;
      sys.bulky = ts.bulky || 0;
      sys.delicate = ts.delicate || 0;
      sys.open = ts.open || false;
      sys.adjST = ts.adjST || 0;
      sys.adjEN = ts.adjEN || 0;
      sys.adjAG = ts.adjAG || 0;
      sys.adjIN = ts.adjIN || 0;
      sys.adjCL = ts.adjCL || 0;
      // Copy layout cells from template (deep copy to avoid shared refs)
      sys.cells = (ts.cells || []).map(c => ({gx:c.gx, gy:c.gy, label:c.label}));
    }
    syncFormFromVeh();
    // Treat template selection as a new vehicle — don't overwrite existing slot
    localStorage.removeItem(LS_KEY);
    localStorage.setItem('mp-veh-edit-idx', '-1');
    _vehCampaign = null;
    _fileHandle = null;
    updateAll();
  });
})();

// ---- Sync form fields from vehicle state ----
function syncFormFromVeh() {
  document.getElementById("vs-name").value = veh.name;
  // Sync template dropdown — match by name
  const tplSel = document.getElementById("sel-template");
  const tplIdx = MP.TEMPLATES.findIndex(t => t.name === veh.name);
  tplSel.value = tplIdx >= 0 ? tplIdx : "";
  document.getElementById("vs-model").value = veh.model;
  document.getElementById("vs-operator").value = veh.operator;
  document.getElementById("vs-basic-cost").value = veh.basicCost;
  document.getElementById("vs-tech").value = veh.techMod;
  document.getElementById("vs-maneuver").value = veh.maneuverMod;
  document.getElementById("vs-noexplode").checked = veh.wontExplode;
  document.getElementById("vs-base").checked = veh.isBase;
  const img = document.getElementById("vs-picture-img");
  if (veh.pictureData) {
    img.src = veh.pictureData;
    img.style.display = "block";
    document.getElementById("vs-picture-area").classList.add("has-image");
  } else {
    img.src = "";
    img.style.display = "none";
    document.getElementById("vs-picture-area").classList.remove("has-image");
  }
  // Restore picture height
  const ph = veh.pictureHeight || 120;
  document.getElementById("vs-picture-area").style.height = ph + "px";
  document.getElementById("vs-pic-height").value = ph;
  document.getElementById("vs-pic-height-val").textContent = ph;
}

// ---- Update all ----
function updateAll() {
  // Recompute descriptions for systems with abilityData (live stats)
  for (const sys of veh.systems) {
    if (sys.abilityData) {
      const newDesc = MP.recomputeDesc(sys.abilityData, veh.st, veh.en, veh.ag, veh.intel, veh.cl, veh.techMod);
      if (newDesc !== null) sys.desc = newDesc;
    }
  }

  const ch = veh.chassis;
  const a = veh.armor;

  document.getElementById("vs-sys-spaces").textContent = ch.sp;
  document.getElementById("vs-profile").textContent = "x" + ch.prof;
  document.getElementById("vs-weight").textContent = ch.wt.replace(" lbs", "");
  document.getElementById("vs-mass").textContent = ch.mass;
  document.getElementById("vs-basic-cost").value = veh.basicCost;
  // Tint tech/maneuver fields: red = increasing cost, green = decreasing
  const techInp = document.getElementById("vs-tech");
  const manInp = document.getElementById("vs-maneuver");
  techInp.style.background = veh.techMod > 0 ? "rgba(60,160,60,0.25)" : veh.techMod < 0 ? "rgba(200,60,60,0.25)" : "";
  manInp.style.background = veh.maneuverMod > 0 ? "rgba(60,160,60,0.25)" : veh.maneuverMod < 0 ? "rgba(200,60,60,0.25)" : "";
  document.getElementById("vs-hits").textContent = veh.hits;
  document.getElementById("vs-power").textContent = veh.power;
  // Sync current to max if current exceeds max, is unset, or max changed
  const hitsCur = document.getElementById("vs-hits-cur");
  const powerCur = document.getElementById("vs-power-cur");
  if (veh.currentHits === null || veh.currentHits > veh.hits || hitsCur.dataset.lastMax !== String(veh.hits)) {
    veh.currentHits = veh.hits;
  }
  hitsCur.value = veh.currentHits;
  hitsCur.dataset.lastMax = veh.hits;
  if (veh.currentPower === null || veh.currentPower > veh.power || powerCur.dataset.lastMax !== String(veh.power)) {
    veh.currentPower = veh.power;
  }
  powerCur.value = veh.currentPower;
  powerCur.dataset.lastMax = veh.power;
  document.getElementById("vs-explosion").textContent = veh.explosionDice;
  document.getElementById("vs-area").textContent = veh.explosionArea;
  document.getElementById("vs-armor-kin").value = a.kin;
  document.getElementById("vs-armor-eng").value = a.eng;
  document.getElementById("vs-armor-bio").value = a.bio;
  document.getElementById("vs-armor-ent").value = a.ent;
  document.getElementById("vs-armor-psy").value = a.psy;
  document.getElementById("vs-total-cost").textContent = veh.totalCost;
  document.getElementById("vs-st").textContent = veh.st;
  document.getElementById("vs-hth").textContent = MP.hthDamage(veh.st);
  document.getElementById("vs-en").textContent = veh.en;
  document.getElementById("vs-en-save").textContent = MP.save(veh.en);
  document.getElementById("vs-ag").textContent = veh.ag;
  document.getElementById("vs-ag-save").textContent = MP.save(veh.ag);
  document.getElementById("vs-handling").textContent = veh.handling;
  document.getElementById("vs-in").textContent = veh.intel;
  document.getElementById("vs-in-save").textContent = MP.save(veh.intel);
  document.getElementById("vs-cl").textContent = veh.cl;
  document.getElementById("vs-cl-save").textContent = MP.save(veh.cl);
  document.getElementById("vs-turn-rate").textContent = veh.turnRate;
  document.getElementById("vs-init").textContent = MP.initDie(veh.cl);

  renderSystemsTable();
  renderKey();
  updateSystemDropdown();
  updateActiveIndicator();
  updatePlacedCount();
  if (typeof updateSilBar === "function") updateSilBar();
  if (editor) editor.draw();
  autoSave();
}

// HTML attribute escaper
function escAttr(s) {
  return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ---- Systems table: 18 rows + remaining ----
const SYS_ROW_COUNT = 18;

function renderSystemsTable() {
  const el = document.getElementById("vs-sys-rows");
  let html = "";

  for (let i = 0; i < SYS_ROW_COUNT; i++) {
    const s = veh.systems[i] || null;
    const cost = s ? (s.extraCPs || "") : "";
    const spaces = s ? (s.spaces || "") : "";
    const prof = s && s.spaces ? (s.integral ? "—" : veh.sysProfileDisplay(s)) : "";
    const hits = s && s.spaces ? (s.integral ? "" : veh.sysHits(s)) : "";
    const hitsDisplay = s && s.spaces && s.integral ? "—" : (hits !== "" ? `(${hits})` : "");
    const pts = s && s.spaces ? `(${veh.sysCPs(s)})` : "";
    const dmg = s ? escAttr(s.dmg || "") : "";
    const desc = s ? escAttr(s.desc || "") : "";
    const integral = s ? (s.integral || false) : false;
    const open = s ? (s.open || false) : false;
    const bulky = s ? (s.bulky || "") : "";
    const delicate = s ? (s.delicate || "") : "";
    const adjST = s ? (s.adjST || "") : "";
    const adjEN = s ? (s.adjEN || "") : "";
    const adjAG = s ? (s.adjAG || "") : "";
    const adjIN = s ? (s.adjIN || "") : "";
    const adjCL = s ? (s.adjCL || "") : "";

    const sysColor = s && s.desc ? MP.sysColor(s.desc) : "";

    html += `<div class="vs-sys-row-wrap" data-idx="${i}" draggable="true">
      <span class="vs-sys-grip" title="Drag to reorder">&#9776;</span>
      <div class="vs-sys-row">
        <input type="number" value="${cost}" data-field="extraCPs" data-idx="${i}" step="2.5" min="0" title="Extra CPs added to this system (adds to vehicle cost)">
        <input type="number" value="${spaces}" data-field="spaces" data-idx="${i}" min="0" title="System spaces allocated">
        <span class="vs-sys-val">${prof}</span>
        <span class="vs-sys-val">${hitsDisplay}</span>
        <input type="text" value="${dmg}" data-field="dmg" data-idx="${i}" title="Damage taken by this system">
        <span class="vs-sys-val vs-sys-pts">${pts}</span>
        <span class="vs-sys-swatch" style="background:${sysColor || 'transparent'}"></span>
        <input type="text" class="vs-sys-desc" value="${desc}" data-field="desc" data-idx="${i}" title="System name, abilities, arc, facing">
        <span class="vs-sys-ins" data-idx="${i}" title="Insert Ability (Ctrl+I)">+</span>
        <span class="vs-sys-edit" data-idx="${i}" title="Edit Ability (Ctrl+E)">✎</span>
        <span class="vs-sys-del" data-idx="${i}" title="Clear row">&times;</span>
      </div>
      <div class="vs-sys-mods">
        <input type="checkbox" data-field="integral" data-idx="${i}" ${integral ? "checked" : ""} title="Integral — hidden, can't be targeted, no profile/hits, not shown on layout. Halves CPs.">
        <input type="number" class="${bulky ? "has-val" : ""}" value="${bulky}" data-field="bulky" data-idx="${i}" min="0" title="Bulky — +4.3 Hits per dose, -2.5 CPs per dose">
        <input type="number" class="${delicate ? "has-val" : ""}" value="${delicate}" data-field="delicate" data-idx="${i}" min="0" title="Delicate — -4.3 Hits per dose, +2.5 CPs per dose">
        <input type="checkbox" data-field="open" data-idx="${i}" ${open ? "checked" : ""} title="Open System — passable, yields ¼ CPs">
        <input type="number" class="${adjST ? "has-val" : ""}" value="${adjST}" data-field="adjST" data-idx="${i}" title="ST adjustment from this system">
        <input type="number" class="${adjEN ? "has-val" : ""}" value="${adjEN}" data-field="adjEN" data-idx="${i}" title="EN adjustment from this system">
        <input type="number" class="${adjAG ? "has-val" : ""}" value="${adjAG}" data-field="adjAG" data-idx="${i}" title="AG adjustment (e.g. Automation)">
        <input type="number" class="${adjIN ? "has-val" : ""}" value="${adjIN}" data-field="adjIN" data-idx="${i}" title="IN adjustment (e.g. Robot Brain)">
        <input type="number" class="${adjCL ? "has-val" : ""}" value="${adjCL}" data-field="adjCL" data-idx="${i}" title="CL adjustment (e.g. Performance)">
      </div>
    </div>`;
  }

  // Row 19: remaining
  const remSys = veh.getRemainingSys();
  const remPlaced = remSys.cells.length;
  const remAvail = veh.remainingSpaces;
  const remTotal = remPlaced + remAvail;
  html += `<div class="vs-sys-row-wrap vs-sys-remain">
    <span class="vs-sys-grip"></span>
    <div class="vs-sys-row">
      <span class="vs-sys-val"></span>
      <span class="vs-sys-val">${remTotal}</span>
      <span></span><span></span><span></span><span></span>
      <span></span>
      <span class="vs-remain-note"><em>Floor (${remPlaced} placed, ${remAvail} unplaced)</em></span>
      <span></span><span></span><span></span>
    </div>
    <div class="vs-sys-mods"></div>
  </div>`;

  el.innerHTML = html;

  // Wire inputs
  el.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", () => {
      const idx = parseInt(inp.dataset.idx);
      const field = inp.dataset.field;
      let sys = veh.systems[idx] || null;

      if (!sys) {
        if (inp.type === "checkbox" && !inp.checked) return;
        if (inp.type !== "checkbox" && !inp.value.trim()) return;
        while (veh.systems.length <= idx) veh.addSystem();
        sys = veh.systems[idx];
      }

      if (field === "integral" || field === "open") {
        sys[field] = inp.checked;
        // Integral systems can't be painted — clear any existing cells
        if (field === "integral" && inp.checked && sys.cells.length > 0) {
          sys.cells = [];
          if (editor && editor.activeSysId === sys.id) editor.activeSysId = null;
        }
      } else if (["extraCPs","spaces","bulky","delicate","adjST","adjEN","adjAG","adjIN","adjCL"].includes(field)) {
        sys[field] = parseFloat(inp.value) || 0;
      } else {
        sys[field] = inp.value;
      }
      updateAll();
    });
  });

  // Wire clear
  el.querySelectorAll(".vs-sys-del").forEach(del => {
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(del.dataset.idx);
      const sys = veh.systems[idx];
      if (!sys) return;
      if (editor && editor.activeSysId === sys.id) editor.activeSysId = null;
      veh.systems.splice(idx, 1);
      updateAll();
    });
  });

  // Wire insert ability icon
  el.querySelectorAll(".vs-sys-ins").forEach(ins => {
    ins.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(ins.dataset.idx);
      if (!isNaN(idx)) abilityDlg.open(idx, false);
    });
  });

  // Wire edit ability icon
  el.querySelectorAll(".vs-sys-edit").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      if (!isNaN(idx)) abilityDlg.open(idx, true);
    });
  });

  // Wire drag-to-reorder
  let dragIdx = null;

  el.querySelectorAll(".vs-sys-row-wrap[draggable]").forEach(row => {
    row.addEventListener("dragstart", e => {
      dragIdx = parseInt(row.dataset.idx);
      row.classList.add("vs-sys-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("vs-sys-dragging");
      el.querySelectorAll(".vs-sys-row-wrap").forEach(r => r.classList.remove("vs-sys-dragover"));
      dragIdx = null;
    });
    row.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      el.querySelectorAll(".vs-sys-row-wrap").forEach(r => r.classList.remove("vs-sys-dragover"));
      row.classList.add("vs-sys-dragover");
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("vs-sys-dragover");
    });
    row.addEventListener("drop", e => {
      e.preventDefault();
      const dropIdx = parseInt(row.dataset.idx);
      if (dragIdx === null || dragIdx === dropIdx) return;
      // Ensure both indices have systems
      while (veh.systems.length <= Math.max(dragIdx, dropIdx)) veh.addSystem();
      const [moved] = veh.systems.splice(dragIdx, 1);
      veh.systems.splice(dropIdx, 0, moved);
      dragIdx = null;
      updateAll();
    });
  });
}

// ---- Vehicle Key: 4 columns, 8 rows ----
const KEY_ROW_COUNT = 8;

function renderKey() {
  const tbody = document.getElementById("vs-key-tbody");
  let html = "";
  for (let i = 0; i < KEY_ROW_COUNT; i++) {
    const left = i;
    const right = i + KEY_ROW_COUNT;
    const kL = veh.keyEntries[left] || null;
    const kR = veh.keyEntries[right] || null;
    html += `<tr>
      <td><input type="text" class="vs-key-label" value="${escAttr(kL ? kL.label : "")}" data-kidx="${left}" data-field="label" placeholder="#"></td>
      <td><input type="text" class="vs-key-desc" value="${escAttr(kL ? kL.desc : "")}" data-kidx="${left}" data-field="desc"></td>
      <td><input type="text" class="vs-key-label" value="${escAttr(kR ? kR.label : "")}" data-kidx="${right}" data-field="label" placeholder="#"></td>
      <td><input type="text" class="vs-key-desc" value="${escAttr(kR ? kR.desc : "")}" data-kidx="${right}" data-field="desc"></td>
    </tr>`;
  }
  tbody.innerHTML = html;

  tbody.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", () => {
      const kidx = parseInt(inp.dataset.kidx);
      while (veh.keyEntries.length <= kidx) veh.addKeyEntry("", "");
      veh.keyEntries[kidx][inp.dataset.field] = inp.value;
      autoSave();
    });
  });
}

// ---- System dropdown in layout toolbar ----
function buildSysDropdownHtml(ed) {
  let html = '<option value="">— select system —</option>';
  for (const sys of veh.systems) {
    if (!sys.desc && !sys.spaces) continue;
    const name = escAttr(sys.desc || "(unnamed)");
    const selected = (ed && ed.activeSysId === sys.id) ? " selected" : "";
    if (sys.integral) {
      html += `<option value="${sys.id}"${selected} disabled>${name} (integral)</option>`;
    } else {
      const placed = sys.cells.length;
      const total = sys.spaces || 0;
      html += `<option value="${sys.id}"${selected}>${name} (${placed}/${total})</option>`;
    }
  }
  const remSys = veh.getRemainingSys();
  const remPlaced = remSys.cells.length;
  const remTotal = veh.remainingSpaces + remPlaced;
  if (remTotal > 0) {
    const remSelected = (ed && ed.activeSysId === "remaining") ? " selected" : "";
    html += `<option value="remaining"${remSelected}>Floor (${remPlaced}/${remTotal})</option>`;
  }
  return html;
}

function updateSystemDropdown() {
  const sel = document.getElementById("sel-layout-sys");
  sel.innerHTML = buildSysDropdownHtml(editor);
  // Restore selection if still valid
  if (editor && editor.activeSysId) {
    sel.value = editor.activeSysId === "remaining" ? "remaining" : String(editor.activeSysId);
    if (!sel.value) {
      editor.activeSysId = null;
      editor.setMode("select");
    }
  }
}

// ---- Active system indicator ----
function getActiveIndicatorHtml(ed) {
  if (!ed || !ed.activeSysId) return null;
  let sys, color, name, placed, total;
  if (ed.activeSysId === "remaining") {
    sys = veh.getRemainingSys();
    color = "#c8c8c8";
    name = "Floor";
    placed = sys.cells.length;
    total = veh.remainingSpaces + placed;
  } else {
    sys = veh.findSystem(ed.activeSysId);
    if (!sys) return null;
    color = MP.sysColor(sys.desc);
    name = sys.desc || "(unnamed)";
    placed = sys.cells.length;
    total = sys.spaces || 0;
  }
  return { color, name, placed, total };
}

function updateActiveIndicator() {
  const el = document.getElementById("vs-active-sys");
  const info = getActiveIndicatorHtml(editor);
  if (!info) {
    el.innerHTML = '<span style="font-size:8px;color:var(--tx3);font-style:italic">Select a system to paint</span>';
    return;
  }
  el.innerHTML = `<span class="vs-active-swatch" style="background:${info.color}"></span>`
    + `<span class="vs-active-name">${info.name}</span>`
    + `<span class="vs-active-count">${info.placed} / ${info.total}</span>`;
}

// ---- Config change handlers ----
function onConfigChange() {
  veh.name = document.getElementById("vs-name").value;
  veh.model = document.getElementById("vs-model").value;
  veh.operator = document.getElementById("vs-operator").value;
  veh.basicCost = parseFloat(document.getElementById("vs-basic-cost").value) || 0;
  veh.techMod = parseFloat(document.getElementById("vs-tech").value) || 0;
  veh.maneuverMod = parseFloat(document.getElementById("vs-maneuver").value) || 0;
  veh.wontExplode = document.getElementById("vs-noexplode").checked;
  veh.isBase = document.getElementById("vs-base").checked;
  updateAll();
}

["vs-name","vs-model","vs-operator"].forEach(id => {
  document.getElementById(id).addEventListener("input", onConfigChange);
});
["vs-basic-cost","vs-tech","vs-maneuver"].forEach(id => {
  document.getElementById(id).addEventListener("change", onConfigChange);
  document.getElementById(id).addEventListener("input", onConfigChange);
  wheelNumber(document.getElementById(id));
});
["vs-noexplode","vs-base"].forEach(id => {
  document.getElementById(id).addEventListener("change", onConfigChange);
});

// ---- Armor inputs ----
["vs-armor-kin","vs-armor-eng","vs-armor-bio","vs-armor-ent","vs-armor-psy"].forEach(id => {
  const field = {
    "vs-armor-kin":"armorKin","vs-armor-eng":"armorEng","vs-armor-bio":"armorBio",
    "vs-armor-ent":"armorEnt","vs-armor-psy":"armorPsy"
  }[id];
  document.getElementById(id).addEventListener("change", () => {
    veh[field] = parseFloat(document.getElementById(id).value) || 0;
    autoSave();
  });
});

// ---- Current hits / power ----
document.getElementById("vs-hits-cur").addEventListener("change", () => {
  veh.currentHits = parseInt(document.getElementById("vs-hits-cur").value) || 0;
  autoSave();
});
document.getElementById("vs-power-cur").addEventListener("change", () => {
  veh.currentPower = parseInt(document.getElementById("vs-power-cur").value) || 0;
  autoSave();
});

// ---- Import image ----
document.getElementById("inp-picture").addEventListener("change", e => {
  if (!e.target.files.length) return;
  const reader = new FileReader();
  reader.onload = ev => {
    veh.pictureData = ev.target.result;
    const img = document.getElementById("vs-picture-img");
    img.src = veh.pictureData;
    img.style.display = "block";
    document.getElementById("vs-picture-area").classList.add("has-image");
    autoSave();
  };
  reader.readAsDataURL(e.target.files[0]);
  e.target.value = "";
});

// Import button below picture (always visible)
document.getElementById("btn-import-img2").addEventListener("click", () => {
  document.getElementById("inp-picture").click();
});

// Clear picture
document.getElementById("btn-clear-img").addEventListener("click", () => {
  veh.pictureData = "";
  const img = document.getElementById("vs-picture-img");
  img.src = "";
  img.style.display = "none";
  document.getElementById("vs-picture-area").classList.remove("has-image");
  updateAll();
});

// Picture height slider
document.getElementById("vs-pic-height").addEventListener("input", () => {
  const h = parseInt(document.getElementById("vs-pic-height").value) || 120;
  document.getElementById("vs-picture-area").style.height = h + "px";
  document.getElementById("vs-pic-height-val").textContent = h;
  veh.pictureHeight = h;
  autoSave();
});

// ---- Layout toolbar: system dropdown ----
document.getElementById("sel-layout-sys").addEventListener("change", () => {
  const sel = document.getElementById("sel-layout-sys");
  let sysId = null;
  if (sel.value === "remaining") {
    sysId = "remaining";
  } else {
    sysId = parseInt(sel.value) || null;
  }
  if (editor) {
    editor.activeSysId = sysId;
    if (sysId) {
      setLayoutMode("paint");
    }
    updateActiveIndicator();
    editor.draw();
  }
});

// ---- Mode buttons: Select / Paint / Sil ----
function setLayoutMode(mode) {
  if (!editor) return;
  editor.setMode(mode);
  editor.selectedCell = null;
  document.getElementById("btn-mode-select").classList.toggle("active", mode === "select");
  document.getElementById("btn-mode-paint").classList.toggle("active", mode === "paint");
  document.getElementById("btn-mode-wall").classList.toggle("active", mode === "wall");
  document.getElementById("btn-mode-sil").classList.toggle("active", mode === "sil");
  updateSilBar();
  editor.draw();
}

function syncSilInputs(doc, barId, inputPrefix, ed) {
  const bar = doc.getElementById(barId);
  const sil = veh.silhouette;
  const inSilMode = ed && ed.mode === "sil";
  bar.classList.toggle("disabled", !inSilMode);
  const fields = ["x","y","w","h","rot"];
  const keys  = ["gx","gy","gw","gh","rot"];
  const defs  = [0, 0, 10, 8, 0];
  for (let i = 0; i < fields.length; i++) {
    const el = doc.getElementById(inputPrefix + "-" + fields[i]);
    if (el) el.value = sil ? (sil[keys[i]] ?? defs[i]) : "";
  }
  const colorEl = doc.getElementById(inputPrefix + "-color");
  if (colorEl) colorEl.value = (sil && sil.color) || "#4a7a9a";
  const alphaEl = doc.getElementById(inputPrefix + "-alpha");
  if (alphaEl) {
    const av = sil && sil.alpha != null ? Math.round(sil.alpha * 100) : 25;
    alphaEl.value = av;
    const valEl = doc.getElementById(inputPrefix + "-alpha-val");
    if (valEl) valEl.textContent = av + "%";
  }
}

function updateSilBar() {
  syncSilInputs(document, "vs-sil-bar", "sil", editor);
}

document.getElementById("btn-mode-select").addEventListener("click", () => setLayoutMode("select"));
document.getElementById("btn-mode-paint").addEventListener("click", () => setLayoutMode("paint"));
document.getElementById("btn-mode-wall").addEventListener("click", () => setLayoutMode("wall"));
document.getElementById("btn-mode-sil").addEventListener("click", () => setLayoutMode("sil"));

document.getElementById("btn-hull-trace").addEventListener("click", () => {
  veh.autoTraceHull();
  if (editor) editor.draw();
  updateAll();
});

document.getElementById("btn-clear-walls").addEventListener("click", () => {
  if (!veh.walls.length) return;
  if (!confirm("Remove all walls?")) return;
  veh.clearWalls();
  if (editor) editor.draw();
  updateAll();
});

document.getElementById("btn-zoom-in").addEventListener("click", () => editor.zoomIn());
document.getElementById("btn-zoom-out").addEventListener("click", () => editor.zoomOut());
document.getElementById("btn-zoom-reset").addEventListener("click", () => editor.resetView());
document.getElementById("chk-zoom-enable").addEventListener("change", (e) => {
  if (editor) editor.wheelZoom = e.target.checked;
  saveViewState();
});

function saveViewState() {
  if (!editor) return;
  try {
    localStorage.setItem("mp-view-state", JSON.stringify({
      zoom: editor.zoom, panX: editor.panX, panY: editor.panY,
      wheelZoom: editor.wheelZoom
    }));
  } catch(e) {}
}

function restoreViewState() {
  if (!editor) return;
  try {
    const raw = localStorage.getItem("mp-view-state");
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.zoom != null) editor.zoom = s.zoom;
    if (s.panX != null) editor.panX = s.panX;
    if (s.panY != null) editor.panY = s.panY;
    if (s.wheelZoom != null) {
      editor.wheelZoom = s.wheelZoom;
      document.getElementById("chk-zoom-enable").checked = s.wheelZoom;
    }
  } catch(e) {}
}

// Delete selected cell button (for mobile/touch)
document.getElementById("btn-del-cell").addEventListener("click", () => {
  if (editor) editor.deleteSelectedCell();
});

// Clear all painted cells from layout
document.getElementById("btn-clear-layout").addEventListener("click", () => {
  if (!confirm("Clear all painted cells from the layout?")) return;
  for (const sys of veh.systems) sys.cells = [];
  veh.getRemainingSys().cells = [];
  if (editor) { editor.selectedCell = null; editor.activeSysId = null; }
  updateAll();
});

// ---- Silhouette bar ----
document.getElementById("btn-sil-import").addEventListener("click", () => {
  document.getElementById("inp-silhouette").click();
});
document.getElementById("inp-silhouette").addEventListener("change", e => {
  if (!e.target.files.length) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const gw = 10;
      const gh = Math.max(1, Math.round(gw * (img.height / img.width)));
      editor.loadSilhouette(ev.target.result, gw, gh);
      setLayoutMode("sil");
      updateSilBar();
      autoSave();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
  e.target.value = "";
});
document.getElementById("btn-sil-clear").addEventListener("click", () => {
  if (editor) editor.clearSilhouette();
  updateSilBar();
  autoSave();
});

// Sil X/Y/W/H/Rot inputs
["sil-x","sil-y","sil-w","sil-h","sil-rot"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    const sil = veh.silhouette;
    if (!sil) return;
    sil.gx = parseFloat(document.getElementById("sil-x").value) || 0;
    sil.gy = parseFloat(document.getElementById("sil-y").value) || 0;
    sil.gw = Math.max(1, parseFloat(document.getElementById("sil-w").value) || 1);
    sil.gh = Math.max(1, parseFloat(document.getElementById("sil-h").value) || 1);
    sil.rot = parseFloat(document.getElementById("sil-rot").value) || 0;
    if (editor) editor.draw();
    autoSave();
  });
});
document.getElementById("sil-color").addEventListener("input", onSilColorChange);
document.getElementById("sil-color").addEventListener("change", onSilColorChange);
function onSilColorChange() {
  const sil = veh.silhouette;
  if (!sil) return;
  sil.color = document.getElementById("sil-color").value;
  if (editor) { editor._silTinted = null; editor.draw(); }
  autoSave();
}
document.getElementById("sil-alpha").addEventListener("input", onSilAlphaChange);
function onSilAlphaChange() {
  const sil = veh.silhouette;
  if (!sil) return;
  const v = parseInt(document.getElementById("sil-alpha").value) || 25;
  sil.alpha = v / 100;
  document.getElementById("sil-alpha-val").textContent = v + "%";
  if (editor) editor.draw();
  autoSave();
}

// ---- Popout Layout Window ----
let popoutWin = null;
let popoutEditor = null;
let popoutSyncInterval = null;

function buildPopoutSysDropdown(doc) {
  doc.getElementById("pop-sel-sys").innerHTML = buildSysDropdownHtml(popoutEditor);
}

function updatePopoutIndicator(doc) {
  const el = doc.getElementById("pop-active-sys");
  const info = getActiveIndicatorHtml(popoutEditor);
  if (!info) {
    el.innerHTML = '<span style="font-size:9px;color:#6a8a9a;font-style:italic">Select a system to paint</span>';
    return;
  }
  el.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${info.color};border:1px solid #8ab4d0;vertical-align:middle"></span> `
    + `<b style="color:#c05a00">${escAttr(info.name)}</b> `
    + `<b style="color:#b03000">${info.placed} / ${info.total}</b>`;
}

function syncPopout() {
  if (!popoutWin || popoutWin.closed) {
    clearInterval(popoutSyncInterval);
    popoutWin = null;
    popoutEditor = null;
    popoutSyncInterval = null;
    return;
  }
  // Sync main sheet from any popout painting
  updateAll();
}

function openPopout() {
  if (popoutWin && !popoutWin.closed) {
    popoutWin.focus();
    return;
  }

  popoutWin = window.open("", "mp_layout_popout", "width=1000,height=700,resizable=yes");
  if (!popoutWin) { alert("Popup blocked. Please allow popups for this site."); return; }

  const doc = popoutWin.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Vehicle Layout — ${escAttr(veh.name || "Untitled")}</title>
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#d6eaf8;--bg2:#c4dff0;--inp:#ffffff;--brd:#8ab4d0;--brd2:#a0c8e0;
--tx:#1a2a3a;--tx2:#3a5a70;--tx3:#6a8a9a;--accent:#c05a00;--accent-lt:#d06a10;
--fb:'Bitter',serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg);font-family:var(--fb);font-size:12px;color:var(--tx);overflow:hidden}
.pop-wrap{display:flex;flex-direction:column;height:100%}
.pop-toolbar{display:flex;align-items:center;gap:3px;padding:4px 6px;background:var(--bg2);border-bottom:2px solid var(--brd);flex-wrap:wrap;flex-shrink:0}
.pop-canvas-wrap{flex:1;overflow:hidden;position:relative;background:#fff}
.pop-canvas-wrap canvas{display:block;width:100%;height:100%}
.pop-hint{font-size:9px;color:var(--tx3);padding:3px 6px;background:var(--bg2);border-top:1px solid var(--brd);flex-shrink:0}
.pop-hint b{color:var(--tx)}
select{background:var(--inp);border:1px solid var(--brd);border-radius:2px;padding:2px 4px;font-family:var(--fb);font-size:9px;color:var(--tx)}
select:focus{outline:none;border-color:var(--accent)}
.pop-sys-sel{max-width:220px}
.ed-btn{display:inline-flex;align-items:center;gap:2px;padding:3px 7px;font-size:10px;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:var(--fb);font-weight:700;white-space:nowrap}
.ed-btn:hover{background:var(--accent-lt)}
.ed-btn-mode{background:#e0e8f0;color:var(--tx2);border:1px solid var(--brd)}
.ed-btn-mode:hover{background:#d0d8e8}
.ed-btn-mode.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.ed-btn-mode.ed-btn-disabled{opacity:0.4;pointer-events:none}
.ed-sep{width:1px;height:16px;background:var(--brd);margin:0 2px}
.pop-active{margin-left:auto;font-size:9px;white-space:nowrap}
.pop-sil-bar{display:flex;align-items:center;gap:3px;padding:3px 6px;background:var(--bg2);border-top:1px solid var(--brd);flex-wrap:wrap;flex-shrink:0}
.pop-sil-bar.disabled{opacity:0.4;pointer-events:none}
.pop-sil-label{font-size:8px;font-weight:700;color:#0a4a6a;white-space:nowrap}
.pop-sil-inp{width:42px;background:var(--inp);border:1px solid var(--brd);border-radius:2px;padding:1px 2px;font-family:var(--fb);font-size:9px;color:var(--tx);text-align:center}
.pop-sil-color{width:22px;height:18px;border:1px solid var(--brd);border-radius:2px;padding:0;cursor:pointer;background:none}
.ed-btn-sm{padding:3px 7px;font-size:9px;background:#2a3a4a;border:1px solid #4a6a7a;color:#ccc;border-radius:2px;cursor:pointer;font-family:var(--fb);font-weight:700}
.ed-btn-sm:hover{border-color:var(--accent)}
</style>
</head><body>
<div class="pop-wrap">
  <div class="pop-toolbar">
    <select id="pop-sel-sys" class="pop-sys-sel" title="Select a system to paint">
      <option value="">— select system —</option>
    </select>
    <button id="pop-select" class="ed-btn ed-btn-mode active" title="Select cell, Delete to remove">Select</button>
    <button id="pop-paint" class="ed-btn ed-btn-mode" title="Paint cells">Paint</button>
    <button id="pop-wall" class="ed-btn ed-btn-mode" title="Click edges for walls. Shift=cycle type. Drag=draw.">Wall</button>
    <button id="pop-sil" class="ed-btn ed-btn-mode" title="Move/resize silhouette">Sil.</button>
    <span class="ed-sep"></span>
    <button id="pop-hull" class="ed-btn" title="Auto-trace hull">Hull</button>
    <span class="ed-sep"></span>
    <button id="pop-zin" class="ed-btn">+</button>
    <button id="pop-zout" class="ed-btn">&minus;</button>
    <button id="pop-zreset" class="ed-btn">Reset</button>
    <span class="ed-sep"></span>
    <button id="pop-lock" class="ed-btn" title="Lock layout">&#x1F513;</button>
    <span class="ed-sep"></span>
    <button id="pop-popout-close" class="ed-btn">Close</button>
    <span id="pop-active-sys" class="pop-active"></span>
  </div>
  <div class="pop-canvas-wrap" id="pop-canvas-wrap">
    <canvas id="pop-canvas"></canvas>
  </div>
  <div class="pop-sil-bar" id="pop-sil-bar">
    <label class="pop-sil-label">Silhouette:</label>
    <button id="pop-sil-import" class="ed-btn-sm">Import</button>
    <button id="pop-sil-clear" class="ed-btn-sm">Clear</button>
    <input type="file" id="pop-inp-sil" accept="image/*" style="display:none">
    <span class="ed-sep"></span>
    <label class="pop-sil-label">X:</label><input type="number" id="pop-sil-x" class="pop-sil-inp" step="0.5">
    <label class="pop-sil-label">Y:</label><input type="number" id="pop-sil-y" class="pop-sil-inp" step="0.5">
    <label class="pop-sil-label">W:</label><input type="number" id="pop-sil-w" class="pop-sil-inp" step="0.5" min="1">
    <label class="pop-sil-label">H:</label><input type="number" id="pop-sil-h" class="pop-sil-inp" step="0.5" min="1">
    <label class="pop-sil-label">Rot:</label><input type="number" id="pop-sil-rot" class="pop-sil-inp" step="15">
    <span class="ed-sep"></span>
    <input type="color" id="pop-sil-color" class="pop-sil-color" value="#4a7a9a" title="Silhouette tint color">
    <label class="pop-sil-label" title="Silhouette opacity">Op:</label><input type="range" id="pop-sil-alpha" min="5" max="100" value="25" step="5" class="pop-sil-range" style="width:60px;height:14px;cursor:pointer" title="Silhouette opacity"><span id="pop-sil-alpha-val" class="pop-sil-label" style="min-width:22px;text-align:right">25%</span>
  </div>
  <div class="pop-hint">
    <b>Del</b>=delete selected cell &bull; <b>Right-click</b>=cell menu &bull; Middle-drag/Scroll=pan/zoom &bull;
    1 cell = 1 system space (2.5') / heavy lines = 5'
  </div>
</div>
</body></html>`);
  doc.close();

  // Wait for DOM ready
  popoutWin.addEventListener("load", () => {
    const pdoc = popoutWin.document;
    const canvas = pdoc.getElementById("pop-canvas");
    const wrap = pdoc.getElementById("pop-canvas-wrap");

    popoutWin.MP = MP;
    popoutWin.FloorPlanEditor = FloorPlanEditor;
    popoutWin.CELL_PX = CELL_PX;

    popoutEditor = new FloorPlanEditor(canvas, wrap, veh);
    popoutEditor.panX = 40;
    popoutEditor.panY = 40;

    // Ensure canvas resizes on window resize/fullscreen
    popoutWin.addEventListener("resize", () => {
      if (popoutEditor) { popoutEditor._resize(); popoutEditor.draw(); }
    });

    popoutEditor.onUpdate = () => {
      buildPopoutSysDropdown(pdoc);
      updatePopoutIndicator(pdoc);
      updatePopoutSilBar(pdoc);
      popoutEditor.draw();
      updateAll();
    };

    // Context menu in popout
    const popMenu = pdoc.createElement("div");
    popMenu.style.cssText = "position:fixed;z-index:10000;min-width:150px;background:#fff;border:1px solid #8ab4d0;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.18);font-family:'Bitter',serif;font-size:11px;color:#1a2a3a;padding:3px 0;display:none;user-select:none";
    const popMenuItems = [
      {action:"highlight", label:"Highlight System", style:""},
      {action:"info", label:"System Info", style:""},
      {action:"select", label:"Select for Painting", style:""},
      {action:"label", label:"Edit Cell Label", style:""},
      {action:"togglelabels", label:"Toggle Labels", style:""},
      {action:"sep"},
      {action:"delete", label:"Delete Cell", style:"color:#c03030"}
    ];
    let _popCtx = {gx:0, gy:0, sys:null, cell:null};
    for (const mi of popMenuItems) {
      if (mi.action === "sep") {
        const sep = pdoc.createElement("div");
        sep.style.cssText = "height:1px;background:#a0c8e0;margin:3px 0";
        popMenu.appendChild(sep);
        continue;
      }
      const d = pdoc.createElement("div");
      d.textContent = mi.label;
      d.style.cssText = "padding:4px 10px;cursor:pointer;white-space:nowrap;" + mi.style;
      d.addEventListener("mouseover", () => d.style.background = "#c4dff0");
      d.addEventListener("mouseout", () => d.style.background = "");
      d.addEventListener("click", () => {
        popMenu.style.display = "none";
        const {gx, gy, sys, cell} = _popCtx;
        if (mi.action === "highlight" && sys) popoutEditor.highlightSystem(sys.id, 2500);
        else if (mi.action === "info" && sys && sys.id !== "remaining") {
          const idx = veh.systems.indexOf(sys);
          const msg = `${sys.desc || "(unnamed)"}\nRow #${idx+1}\nSpaces: ${sys.cells.length}/${sys.spaces||0}\nHits: ${veh.sysHits(sys)}\nCPs: ${veh.sysCPs(sys)}\nProfile: ${veh.sysProfileDisplay(sys)||"—"}\nDamage: ${sys.dmg||"—"}`;
          popoutWin.alert(msg);
        }
        else if (mi.action === "select" && sys) {
          popoutEditor.activeSysId = sys.id;
          setPopoutMode("paint");
          updatePopoutIndicator(pdoc);
          buildPopoutSysDropdown(pdoc);
          popoutEditor.draw();
        }
        else if (mi.action === "label" && cell) popoutEditor._showCellLabelEditor(cell, gx, gy);
        else if (mi.action === "togglelabels" && sys) { sys.hideLabels = !sys.hideLabels; popoutEditor.draw(); if (editor) editor.draw(); autoSave(); }
        else if (mi.action === "delete") {
          veh.unpaintCell(gx, gy);
          popoutEditor.selectedCell = null;
          popoutEditor.draw();
          if (popoutEditor.onUpdate) popoutEditor.onUpdate();
        }
      });
      popMenu.appendChild(d);
    }
    pdoc.body.appendChild(popMenu);

    popoutEditor.onContextMenu = (gx, gy, sys, cell, cx, cy) => {
      _popCtx = {gx, gy, sys, cell};
      popMenu.style.display = "block";
      let x = cx, y = cy;
      const mw = popMenu.offsetWidth, mh = popMenu.offsetHeight;
      const ww = popoutWin.innerWidth, wh = popoutWin.innerHeight;
      if (x + mw > ww) x = ww - mw - 4;
      if (y + mh > wh) y = wh - mh - 4;
      popMenu.style.left = Math.max(0, x) + "px";
      popMenu.style.top = Math.max(0, y) + "px";
    };
    pdoc.addEventListener("mousedown", e => {
      if (popMenu.style.display !== "none" && !popMenu.contains(e.target)) popMenu.style.display = "none";
    });
    pdoc.addEventListener("keydown", e => {
      if (e.key === "Escape") popMenu.style.display = "none";
    });

    buildPopoutSysDropdown(pdoc);
    updatePopoutIndicator(pdoc);

    function setPopoutMode(mode) {
      popoutEditor.setMode(mode);
      popoutEditor.selectedCell = null;
      pdoc.getElementById("pop-select").classList.toggle("active", mode === "select");
      pdoc.getElementById("pop-paint").classList.toggle("active", mode === "paint");
      pdoc.getElementById("pop-wall").classList.toggle("active", mode === "wall");
      pdoc.getElementById("pop-sil").classList.toggle("active", mode === "sil");
      updatePopoutSilBar(pdoc);
      popoutEditor.draw();
    }

    function updatePopoutSilBar(d) {
      syncSilInputs(d, "pop-sil-bar", "pop-sil", popoutEditor);
    }
    updatePopoutSilBar(pdoc);

    pdoc.getElementById("pop-sel-sys").addEventListener("change", function() {
      let sysId = null;
      if (this.value === "remaining") {
        sysId = "remaining";
      } else {
        sysId = parseInt(this.value) || null;
      }
      popoutEditor.activeSysId = sysId;
      if (sysId) setPopoutMode("paint");
      updatePopoutIndicator(pdoc);
      popoutEditor.draw();
    });

    pdoc.getElementById("pop-select").addEventListener("click", () => setPopoutMode("select"));
    pdoc.getElementById("pop-paint").addEventListener("click", () => setPopoutMode("paint"));
    pdoc.getElementById("pop-wall").addEventListener("click", () => setPopoutMode("wall"));
    pdoc.getElementById("pop-sil").addEventListener("click", () => setPopoutMode("sil"));
    pdoc.getElementById("pop-hull").addEventListener("click", () => {
      veh.autoTraceHull();
      popoutEditor.draw();
      if (editor) editor.draw();
      updateAll();
    });
    pdoc.getElementById("pop-zin").addEventListener("click", () => popoutEditor.zoomIn());
    pdoc.getElementById("pop-zout").addEventListener("click", () => popoutEditor.zoomOut());
    pdoc.getElementById("pop-zreset").addEventListener("click", () => popoutEditor.resetView());
    pdoc.getElementById("pop-lock").addEventListener("click", () => {
      popoutEditor.locked = !popoutEditor.locked;
      const btn = pdoc.getElementById("pop-lock");
      btn.innerHTML = popoutEditor.locked ? "&#x1F512;" : "&#x1F513;";
      btn.style.background = popoutEditor.locked ? "#c07020" : "";
      const lockIds = ["pop-select","pop-paint","pop-wall","pop-sil","pop-hull","pop-sel-sys"];
      for (const id of lockIds) {
        const el = pdoc.getElementById(id);
        if (!el) continue;
        if (popoutEditor.locked) { el.classList.add("ed-btn-disabled"); el.disabled = true; }
        else { el.classList.remove("ed-btn-disabled"); el.disabled = false; }
      }
      popoutEditor.draw();
    });
    pdoc.getElementById("pop-popout-close").addEventListener("click", () => popoutWin.close());

    // Silhouette controls in popout
    pdoc.getElementById("pop-sil-import").addEventListener("click", () => {
      pdoc.getElementById("pop-inp-sil").click();
    });
    pdoc.getElementById("pop-inp-sil").addEventListener("change", function(e) {
      if (!e.target.files.length) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const gw = 10;
          const gh = Math.max(1, Math.round(gw * (img.height / img.width)));
          popoutEditor.loadSilhouette(ev.target.result, gw, gh);
          setPopoutMode("sil");
          if (editor) { editor._ensureSilImage(); editor.draw(); }
          autoSave();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = "";
    });
    pdoc.getElementById("pop-sil-clear").addEventListener("click", () => {
      popoutEditor.clearSilhouette();
      updatePopoutSilBar(pdoc);
      if (editor) editor.draw();
      autoSave();
    });

    ["pop-sil-x","pop-sil-y","pop-sil-w","pop-sil-h","pop-sil-rot"].forEach(id => {
      pdoc.getElementById(id).addEventListener("input", () => {
        const sil = veh.silhouette;
        if (!sil) return;
        sil.gx = parseFloat(pdoc.getElementById("pop-sil-x").value) || 0;
        sil.gy = parseFloat(pdoc.getElementById("pop-sil-y").value) || 0;
        sil.gw = Math.max(1, parseFloat(pdoc.getElementById("pop-sil-w").value) || 1);
        sil.gh = Math.max(1, parseFloat(pdoc.getElementById("pop-sil-h").value) || 1);
        sil.rot = parseFloat(pdoc.getElementById("pop-sil-rot").value) || 0;
        popoutEditor.draw();
        if (editor) editor.draw();
        autoSave();
      });
    });
    const onPopSilColor = () => {
      const sil = veh.silhouette;
      if (!sil) return;
      sil.color = pdoc.getElementById("pop-sil-color").value;
      if (popoutEditor) { popoutEditor._silTinted = null; popoutEditor.draw(); }
      if (editor) { editor._silTinted = null; editor.draw(); }
      syncSilInputs(document, "vs-sil-bar", "sil", editor);
      autoSave();
    };
    pdoc.getElementById("pop-sil-color").addEventListener("input", onPopSilColor);
    pdoc.getElementById("pop-sil-color").addEventListener("change", onPopSilColor);

    const onPopSilAlpha = () => {
      const sil = veh.silhouette;
      if (!sil) return;
      const v = parseInt(pdoc.getElementById("pop-sil-alpha").value) || 25;
      sil.alpha = v / 100;
      pdoc.getElementById("pop-sil-alpha-val").textContent = v + "%";
      if (popoutEditor) popoutEditor.draw();
      if (editor) editor.draw();
      syncSilInputs(document, "vs-sil-bar", "sil", editor);
      autoSave();
    };
    pdoc.getElementById("pop-sil-alpha").addEventListener("input", onPopSilAlpha);

    popoutEditor.draw();
  });

  // Poll for sync and detect close
  popoutSyncInterval = setInterval(syncPopout, 500);

  popoutWin.addEventListener("beforeunload", () => {
    clearInterval(popoutSyncInterval);
    popoutEditor = null;
    popoutWin = null;
    popoutSyncInterval = null;
    updateAll(); // refresh main
  });
}

document.getElementById("btn-popout").addEventListener("click", openPopout);

// ---- File System Access API (Save / Save As / Open) ----
let _fileHandle = null; // Retained handle for "Save" overwrite

const _hasFileSystemAccess = typeof window.showSaveFilePicker === "function";

const _jsonFileOpts = {
  types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }],
};

function _defaultFileName() {
  return (veh.name || "vehicle").replace(/\s+/g, "_") + ".json";
}

async function _writeToHandle(handle) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(veh.toJSON(), null, 2));
  await writable.close();
  _fileHandle = handle;
  document.title = handle.name + " — MP Vehicle Builder";
}

function _fallbackDownload() {
  const blob = new Blob([JSON.stringify(veh.toJSON(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = _defaultFileName();
  a.click(); URL.revokeObjectURL(url);
}

// Save As — always prompt for location
async function fileSaveAs() {
  if (!_hasFileSystemAccess) { _fallbackDownload(); return; }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: _defaultFileName(),
      ..._jsonFileOpts,
    });
    await _writeToHandle(handle);
  } catch (e) {
    if (e.name !== "AbortError") alert("Save failed: " + e.message);
  }
}

// Save — overwrite current handle, or prompt if none
async function fileSave() {
  if (!_hasFileSystemAccess) { _fallbackDownload(); return; }
  if (_fileHandle) {
    try {
      const perm = await _fileHandle.queryPermission({ mode: "readwrite" });
      if (perm === "granted") { await _writeToHandle(_fileHandle); return; }
      const req = await _fileHandle.requestPermission({ mode: "readwrite" });
      if (req === "granted") { await _writeToHandle(_fileHandle); return; }
    } catch (e) { /* fall through to Save As */ }
  }
  await fileSaveAs();
}

// Open — pick a file to load
async function fileOpen() {
  if (!_hasFileSystemAccess) {
    document.getElementById("inp-json").click();
    return;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      ..._jsonFileOpts,
      multiple: false,
    });
    const file = await handle.getFile();
    const text = await file.text();
    veh.fromJSON(JSON.parse(text));
    syncFormFromVeh();
    updateAll();
    _fileHandle = handle;
    document.title = handle.name + " — MP Vehicle Builder";
  } catch (e) {
    if (e.name !== "AbortError") alert("Open failed: " + e.message);
  }
}

document.getElementById("btn-save").addEventListener("click", () => {
  autoSave();
  MPDialog.alert("Saved", "Vehicle saved successfully.");
});

document.getElementById("btn-load").addEventListener("click", async () => {
  const list = JSON.parse(localStorage.getItem(VEHS_LIST_KEY)) || [];
  const idx = await MPDialog.listVehs("Load Vehicle", list);
  if (idx == null || idx < 0 || idx >= list.length) return;
  veh.fromJSON(list[idx]);
  syncFormFromVeh();
  updateAll();
  _vehCampaign = list[idx]._campaign || null;
  localStorage.setItem(LS_KEY, JSON.stringify(list[idx]));
  localStorage.setItem('mp-veh-edit-idx', idx);
  _fileHandle = null;
  document.title = (veh.name || "Vehicle") + " — MP Vehicle Builder";
});

document.getElementById("btn-new").addEventListener("click", async () => {
  const ok = await MPDialog.confirm("New Vehicle", "Clear all fields and start a new vehicle?", { okText: "Clear", danger: true });
  if (!ok) return;
  veh.fromJSON({ type: "mp-vehicle", name: "", basicCost: 15, systems: [] });
  syncFormFromVeh();
  updateAll();
  localStorage.removeItem(LS_KEY);
  localStorage.setItem('mp-veh-edit-idx', '-1');
  _vehCampaign = null;
  _fileHandle = null;
  document.title = "MP Vehicle Builder";
});

document.getElementById("btn-delete").addEventListener("click", async () => {
  const idx = _getVehEditIdx();
  const list = JSON.parse(localStorage.getItem(VEHS_LIST_KEY)) || [];
  if (idx < 0 || idx >= list.length) { MPDialog.alert("No Vehicle", "No vehicle is currently loaded to delete."); return; }
  const name = list[idx].name || "Unnamed";
  const ok = await MPDialog.confirm("Delete Vehicle", "Permanently delete <b>" + name + "</b>?", { okText: "Delete", danger: true });
  if (!ok) return;
  list.splice(idx, 1);
  localStorage.setItem(VEHS_LIST_KEY, JSON.stringify(list));
  if(typeof GCCSync!=='undefined' && GCCSync.notifySync) GCCSync.notifySync(VEHS_LIST_KEY);
  veh.fromJSON({ type: "mp-vehicle", name: "", basicCost: 15, systems: [] });
  syncFormFromVeh();
  updateAll();
  localStorage.removeItem(LS_KEY);
  localStorage.setItem('mp-veh-edit-idx', '-1');
  _fileHandle = null;
  document.title = "MP Vehicle Builder";
  MPDialog.alert("Deleted", "<b>" + name + "</b> has been deleted.");
});

document.getElementById("btn-export").addEventListener("click", () => {
  _fallbackDownload();
});

// Campaign — assign vehicle to a campaign
document.getElementById("btn-campaign").addEventListener("click", async () => {
  const camps = (function(){try{const k=(typeof GCC!=='undefined'&&GCC.KEYS)?GCC.KEYS.campaigns:'gcc-campaigns';return JSON.parse(localStorage.getItem(k))||[]}catch(e){return[]}})();
  if (!camps.length) { await MPDialog.alert('No Campaigns', 'No campaigns found. Create one on the Campaigns page first.'); return; }
  const current = _vehCampaign || null;
  const items = camps.map(c => ({
    label: c.name,
    desc: c.id === current ? '(current)' : '',
  }));
  if (current) items.push({ label: 'Remove from campaign', desc: 'Unlink this vehicle' });
  const pick = await MPDialog.choose('Assign to Campaign', items, { intro: 'Select a campaign for this vehicle:' });
  if (pick == null) return;
  if (current && pick === items.length - 1) {
    _vehCampaign = null;
    autoSave();
    await MPDialog.alert('Removed', 'Vehicle removed from campaign.');
  } else {
    _vehCampaign = camps[pick].id;
    autoSave();
    await MPDialog.alert('Assigned', 'Vehicle assigned to <b>' + camps[pick].name + '</b>.');
  }
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("inp-json").click();
});

// Fallback file input (Firefox/Safari)
document.getElementById("inp-json").addEventListener("change", e => {
  if (!e.target.files.length) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      veh.fromJSON(JSON.parse(ev.target.result));
      syncFormFromVeh();
      updateAll();
      autoSave();
      _fileHandle = null;
      document.title = (veh.name || "Vehicle") + " — MP Vehicle Builder";
      MPDialog.alert("Imported", "Vehicle imported: " + e.target.files[0].name);
    } catch (err) { MPDialog.alert("Error", "Import failed: " + err.message); }
  };
  reader.readAsText(e.target.files[0]);
  e.target.value = "";
});

// Keyboard shortcuts: Ctrl+S = Save, Ctrl+Shift+S = Export JSON, Ctrl+O = Import JSON
window.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (e.shiftKey) _fallbackDownload(); else { autoSave(); MPDialog.alert("Saved", "Vehicle saved successfully."); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "o") {
    e.preventDefault();
    document.getElementById("inp-json").click();
  }
});

// ---- Lock button ----
document.getElementById("btn-lock").addEventListener("click", () => {
  if (!editor) return;
  editor.locked = !editor.locked;
  const btn = document.getElementById("btn-lock");
  btn.innerHTML = editor.locked ? "&#x1F512;" : "&#x1F513;";
  btn.style.background = editor.locked ? "#c07020" : "";
  btn.title = editor.locked
    ? "Unlock layout to allow editing"
    : "Lock layout to prevent editing (pan/zoom still work)";
  // Disable mode buttons and destructive buttons when locked
  const lockTargets = ["btn-mode-select","btn-mode-paint","btn-mode-wall","btn-mode-sil",
    "btn-hull-trace","btn-del-cell","btn-clear-layout","btn-clear-walls","sel-layout-sys"];
  for (const id of lockTargets) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (editor.locked) { el.classList.add("ed-btn-disabled"); el.disabled = true; }
    else { el.classList.remove("ed-btn-disabled"); el.disabled = false; }
  }
  editor.draw();
});

document.getElementById("btn-csv").addEventListener("click", () => {
  const blob = new Blob([veh.toCSV()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = (veh.name || "vehicle").replace(/\s+/g, "_") + ".csv";
  a.click(); URL.revokeObjectURL(url);
});

document.getElementById("btn-pdf").addEventListener("click", () => {
  // Render the layout canvas to a static image for print
  const layoutCanvas = document.getElementById("vs-layout-canvas");
  const printImg = editor.toImage(500);
  let layoutImgData = "";
  if (printImg) layoutImgData = printImg.toDataURL("image/png");

  // Snapshot the layout canvas area with a static image for printing
  const layoutWrap = document.getElementById("vs-layout-wrap");
  let origCanvas = null;
  let tempImg = null;
  if (layoutImgData) {
    origCanvas = layoutCanvas;
    origCanvas.style.display = "none";
    tempImg = document.createElement("img");
    tempImg.src = layoutImgData;
    tempImg.style.cssText = "display:block;max-width:100%;max-height:100%;object-fit:contain;margin:auto";
    layoutWrap.appendChild(tempImg);
  }

  window.print();

  // Restore canvas after print
  setTimeout(() => {
    if (origCanvas) origCanvas.style.display = "";
    if (tempImg && tempImg.parentNode) tempImg.parentNode.removeChild(tempImg);
  }, 500);
});

// ---- localStorage auto-save ----
const LS_KEY = "mp-vehicle-autosave";
const VEHS_LIST_KEY = (typeof GCC!=='undefined' && GCC.KEYS) ? GCC.KEYS.mpVehs : 'mp-veh-list';
let _saveTimer = null;
let _vehCampaign = null; // campaign association metadata

function _getVehEditIdx() {
  const v = localStorage.getItem('mp-veh-edit-idx');
  return v != null ? parseInt(v) : -1;
}

function autoSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      const data = veh.toJSON();
      // Ensure stable entity ID
      if (!data._id) {
        const list = JSON.parse(localStorage.getItem(VEHS_LIST_KEY)) || [];
        const idx = _getVehEditIdx();
        if (idx >= 0 && idx < list.length && list[idx]._id) {
          data._id = list[idx]._id;
        } else {
          data._id = (typeof GCC!=='undefined' && GCC.genId) ? GCC.genId('veh') : 'veh_'+Date.now();
        }
      }
      // Add computed summary for campaign card display
      data._totalCost = veh.totalCost;
      data._hits = veh.hits;
      data._power = veh.power;
      data._spaces = veh.totalSpaces;
      // Campaign association
      if (_vehCampaign) data._campaign = _vehCampaign;
      data._saved = new Date().toISOString();
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      // Sync to slot list for landing page
      const list = JSON.parse(localStorage.getItem(VEHS_LIST_KEY)) || [];
      const idx = _getVehEditIdx();
      if (idx >= 0 && idx < list.length) {
        list[idx] = data;
      } else {
        list.push(data);
        localStorage.setItem('mp-veh-edit-idx', list.length - 1);
      }
      localStorage.setItem(VEHS_LIST_KEY, JSON.stringify(list));
      if(typeof GCCSync!=='undefined' && GCCSync.notifySync) GCCSync.notifySync(VEHS_LIST_KEY);
    } catch (e) { /* quota exceeded or private browsing */ }
  }, 300);
}

function autoLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.type !== "mp-vehicle") return false;
    veh.fromJSON(data);
    return true;
  } catch (e) { return false; }
}

// ---- Ability Insert Dialog (Ctrl+I) ----

// Mousewheel cycling on select elements
function wheelSelect(sel) {
  sel.addEventListener("wheel", e => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const newIdx = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + dir));
    if (newIdx !== sel.selectedIndex) { sel.selectedIndex = newIdx; sel.dispatchEvent(new Event("change")); }
  }, {passive: false});
}
// Mousewheel on number inputs
function wheelNumber(inp) {
  inp.addEventListener("wheel", e => {
    e.preventDefault();
    const step = parseFloat(inp.step) || 1;
    const dir = e.deltaY > 0 ? -step : step;
    const min = parseFloat(inp.min); const max = parseFloat(inp.max);
    let v = (parseFloat(inp.value) || 0) + dir;
    if (!isNaN(min)) v = Math.max(min, v);
    if (!isNaN(max)) v = Math.min(max, v);
    inp.value = v;
    inp.dispatchEvent(new Event("input"));
  }, {passive: false});
}

// Generic modifier select builders
function buildStepSelect(sel, steps, fmtFn, defIdx) {
  sel.innerHTML = "";
  for (let i = 0; i < steps.length; i++) {
    const opt = document.createElement("option");
    opt.value = i; opt.textContent = fmtFn(steps[i], i);
    if (i === (defIdx || 0)) opt.selected = true;
    sel.appendChild(opt);
  }
  wheelSelect(sel);
}

function fmtCp(s) { return `${s.label} (${s.cp >= 0 ? "+" : ""}${s.cp})`; }

// ---- Ability Picker Popup ----
const abilityPicker = {
  overlay: null,
  grid: null,
  onSelect: null,
  currentId: "",

  init() {
    this.overlay = document.getElementById("aid-picker-overlay");
    this.grid = document.getElementById("aid-picker-grid");

    // Build grouped columns
    const cats = {};
    for (const ab of MP.ABILITY_TYPES) { if (!cats[ab.cat]) cats[ab.cat] = []; cats[ab.cat].push(ab); }

    // Layout: 4 columns, balanced by count
    const colCats = [
      ["Vehicle", "Crew", "Cargo", "Movement"],
      ["Offensive"],
      ["Defensive", "Custom"],
      ["Miscellaneous"]
    ];

    for (const catGroup of colCats) {
      const col = document.createElement("div");
      col.className = "aid-picker-col";
      for (const cat of catGroup) {
        if (!cats[cat] || cats[cat].length === 0) continue;
        const hdr = document.createElement("div");
        hdr.className = "aid-picker-cat";
        hdr.textContent = cat;
        col.appendChild(hdr);
        for (const ab of cats[cat]) {
          const item = document.createElement("div");
          item.className = "aid-picker-item";
          item.textContent = ab.name;
          item.dataset.abId = ab.id;
          item.addEventListener("click", () => {
            this._select(ab.id);
          });
          col.appendChild(item);
        }
      }
      this.grid.appendChild(col);
    }

    this.overlay.addEventListener("mousedown", e => { if (e.target === this.overlay) this.close(); });
    this.overlay.addEventListener("keydown", e => { if (e.key === "Escape") this.close(); });
  },

  open(currentId, callback) {
    this.currentId = currentId || "";
    this.onSelect = callback;
    // Highlight current selection
    this.grid.querySelectorAll(".aid-picker-item").forEach(el => {
      el.classList.toggle("selected", el.dataset.abId === this.currentId);
    });
    this.overlay.style.display = "flex";
    this.overlay.focus();
  },

  close() {
    this.overlay.style.display = "none";
    this.onSelect = null;
  },

  _select(abId) {
    if (this.onSelect) this.onSelect(abId);
    this.close();
  }
};

// ---- Main Ability Dialog ----
const abilityDlg = {
  overlay: null,
  targetIdx: null,
  editMode: false, // true when editing existing ability

  init() {
    this.overlay = document.getElementById("ability-dlg-overlay");

    // Build system spaces dropdown inside cost panel
    const spSel = document.getElementById("aid-sp-input");
    for (const row of MP.SYS_TABLE) {
      const opt = document.createElement("option");
      opt.value = row.sp; opt.textContent = `${row.sp} sp → ${row.cp} CPs`;
      if (row.sp === 8) opt.selected = true;
      spSel.appendChild(opt);
    }
    wheelSelect(spSel);
    spSel.addEventListener("change", () => this._refresh());

    // Build generic modifier dropdowns
    buildStepSelect(document.getElementById("aid-area"), MP.AREA_EFFECT_STEPS, fmtCp, 0);
    buildStepSelect(document.getElementById("aid-ap"), MP.ARMOR_PIERCING_STEPS, fmtCp, 0);
    buildStepSelect(document.getElementById("aid-autofire"), MP.AUTOFIRE_STEPS, fmtCp, 0);
    buildStepSelect(document.getElementById("aid-duration"), MP.DURATION_STEPS, fmtCp, 0);
    buildStepSelect(document.getElementById("aid-hardened"), MP.HARDENED_STEPS, fmtCp, 0);

    // Helper to build a simple select from an array of {l, cp}
    function buildSimpleSel(id, opts) {
      const sel = document.getElementById(id);
      opts.forEach((o, i) => {
        const opt = document.createElement("option"); opt.value = i; opt.textContent = o.l; opt.dataset.cp = o.cp; sel.appendChild(opt);
      });
      wheelSelect(sel);
    }

    buildSimpleSel("aid-conc", MP.MISC_OPTS.conc);
    buildSimpleSel("aid-kb", MP.MISC_OPTS.kb);
    buildSimpleSel("aid-partial", MP.MISC_OPTS.partial);
    buildSimpleSel("aid-poorpen", MP.MISC_OPTS.poorpen);
    buildSimpleSel("aid-obvious", MP.MISC_OPTS.obvious);
    buildSimpleSel("aid-carrier", MP.MISC_OPTS.carrier);
    buildSimpleSel("aid-dmgtype", MP.MISC_OPTS.dmgtype);
    buildSimpleSel("aid-indirect", MP.MISC_OPTS.indirect);
    // Time Requirement: default is index 2 (1 Phase), ±2.5/step
    const trSel = document.getElementById("aid-timereq");
    MP.TIME_REQ_STEPS.forEach((s, i) => {
      const cp = (2 - i) * 2.5; // index 2 = 1 Phase = 0 CP base
      const cpStr = cp === 0 ? "0" : (cp > 0 ? "+" + cp : String(cp));
      const opt = document.createElement("option"); opt.value = i;
      opt.textContent = s.label + " (" + cpStr + ")"; opt.dataset.cp = cp;
      if (i === 2) opt.selected = true;
      trSel.appendChild(opt);
    });
    wheelSelect(trSel);

    buildSimpleSel("aid-activation", MP.MISC_OPTS.activation);
    buildSimpleSel("aid-loss", MP.MISC_OPTS.loss);
    buildSimpleSel("aid-canthold", MP.MISC_OPTS.canthold);
    buildSimpleSel("aid-multi", MP.MISC_OPTS.multi);
    buildSimpleSel("aid-usable", MP.MISC_OPTS.usable);
    buildSimpleSel("aid-reqsave", MP.MISC_OPTS.reqsave);
    buildSimpleSel("aid-other", MP.MISC_OPTS.other);

    // System Modifiers — Arc dropdown
    const arcSel = document.getElementById("aid-arc");
    MP.ARC_OPTS.forEach((o,i) => {
      const opt = document.createElement("option"); opt.value = i; opt.textContent = o.l; opt.dataset.cp = o.cp; arcSel.appendChild(opt);
    });
    wheelSelect(arcSel);

    // System Modifiers — Facing dropdown
    const facSel = document.getElementById("aid-facing");
    MP.FACING_OPTS.forEach((f,i) => {
      const opt = document.createElement("option"); opt.value = i; opt.textContent = f; facSel.appendChild(opt);
    });
    wheelSelect(facSel);
    // Hide facing when arc is 360°
    arcSel.addEventListener("change", () => {
      const is360 = parseInt(arcSel.value) === 3;
      facSel.closest(".aid-2c-full").style.display = is360 ? "none" : "";
    });

    // Mousewheel on number inputs
    wheelNumber(document.getElementById("aid-bulky"));
    wheelNumber(document.getElementById("aid-delicate"));
    wheelNumber(document.getElementById("aid-breakdown"));

    // Wire ability picker button
    document.getElementById("aid-ability-btn").addEventListener("click", () => {
      const curId = document.getElementById("aid-ability-val").value;
      abilityPicker.open(curId, (abId) => {
        this._setAbility(abId);
      });
    });

    // Wire all modifier controls
    document.querySelectorAll("#aid-generic-mods select, #aid-sys-mods select").forEach(sel => {
      sel.addEventListener("change", () => this._refresh());
    });
    document.querySelectorAll("#aid-generic-mods input[type='checkbox'], #aid-sys-mods input[type='checkbox']").forEach(chk => {
      chk.addEventListener("change", () => this._refresh());
    });
    document.querySelectorAll("#aid-generic-mods input[type='number'], #aid-sys-mods input[type='number']").forEach(inp => {
      inp.addEventListener("input", () => this._refresh());
    });

    // Wire description mode radios
    document.querySelectorAll('input[name="aid-desc-mode"]').forEach(radio => {
      radio.addEventListener("change", () => {
        try { localStorage.setItem("mp-desc-mode", this._getDescMode()); } catch(e) {}
        this._updatePreview();
      });
    });

    // Restore saved description mode
    this._restoreDescMode();

    document.getElementById("aid-ok").addEventListener("click", () => this._commit());
    document.getElementById("aid-cancel").addEventListener("click", () => this.close());
    this.overlay.addEventListener("mousedown", e => { if (e.target === this.overlay) this.close(); });
    this.overlay.addEventListener("keydown", e => { if (e.key === "Escape") this.close(); if (e.key === "Enter") this._commit(); });
  },

  _setAbility(abId) {
    document.getElementById("aid-ability-val").value = abId;
    const ab = MP.abilityById(abId);
    const btn = document.getElementById("aid-ability-btn");
    if (ab) {
      btn.textContent = ab.name;
      btn.classList.add("has-ability");
    } else {
      btn.textContent = "— select ability —";
      btn.classList.remove("has-ability");
    }
    this._onAbilityChange();
  },

  // Get the ability's base CPs from the hidden input
  _getAbilityCp() {
    return parseFloat(document.getElementById("aid-cp-input").value) || 0;
  },

  // Set ability CPs and refresh
  _setAbilityCp(cp) {
    document.getElementById("aid-cp-input").value = cp;
    this._refresh();
  },

  // Get the system row from the spaces dropdown (user controls spaces independently)
  _getSysRow() {
    const sp = parseInt(document.getElementById("aid-sp-input").value) || 8;
    return MP.lookupSys(sp);
  },

  // Master refresh — called on any input change
  _refresh() {
    this._updateCostPanel();
    this._updatePreview();
    this._updateModTints();
  },

  // Collect individual modifier contributions with labels for the cost breakdown
  _getModBreakdown() {
    const items = [];
    const abId = document.getElementById("aid-ability-val").value;
    function add(label, cp) { if (cp !== 0) items.push({label, cp}); }

    // Ability-specific modifiers
    const abMods = MP.ABILITY_MODIFIERS[abId] || [];
    for (const am of abMods) {
      if (am.type === "select") {
        const sel = document.querySelector(`select[data-am-id="${am.id}"]`);
        if (sel) {
          const c = parseFloat(sel.options[sel.selectedIndex]?.dataset?.cp) || 0;
          if (c !== 0) add(am.label, c);
        }
      } else if (am.type === "number") {
        const inp = document.querySelector(`input[data-am-id="${am.id}"]`);
        const val = parseInt(inp?.value) || 0;
        if (val > 0) add(am.label + " x" + val, am.cpFn(val));
      } else {
        const chk = document.querySelector(`input[data-am-id="${am.id}"]`);
        if (chk?.checked && am.cp !== 0) add(am.label, am.cp);
      }
    }

    // Generic step selects
    function stepItem(id, steps, label) {
      const v = parseInt(document.getElementById(id).value);
      if (v > 0 && steps[v]) add(label, steps[v].cp);
    }
    stepItem("aid-area", MP.AREA_EFFECT_STEPS, "Area Effect");
    stepItem("aid-ap", MP.ARMOR_PIERCING_STEPS, "Armor Pierce");
    stepItem("aid-autofire", MP.AUTOFIRE_STEPS, "Autofire");
    stepItem("aid-duration", MP.DURATION_STEPS, "Duration");
    stepItem("aid-hardened", MP.HARDENED_STEPS, "Hardened");

    if (document.getElementById("aid-gear").checked) add("Gear", -5);

    const bulky = parseInt(document.getElementById("aid-bulky").value) || 0;
    if (bulky > 0) add("Bulky x" + bulky, bulky * 2.5);
    const delicate = parseInt(document.getElementById("aid-delicate").value) || 0;
    if (delicate > 0) add("Delicate x" + delicate, -(delicate * 2.5));

    // Simple select modifiers
    function selItem(id, label) {
      const s = document.getElementById(id);
      const c = parseFloat(s.options[s.selectedIndex]?.dataset?.cp) || 0;
      if (c !== 0) {
        const txt = s.options[s.selectedIndex].textContent.replace(/ \([^)]*\)$/, "");
        add(txt, c);
      }
    }
    selItem("aid-pr", "PR");
    selItem("aid-charges", "Charges");
    selItem("aid-range", "Range");
    selItem("aid-conc", "Concentrate");
    selItem("aid-kb", "Knockback");

    const bkdn = parseInt(document.getElementById("aid-breakdown").value) || 0;
    if (bkdn > 0) add("Breakdown x" + bkdn, -(bkdn * 2.5));

    selItem("aid-partial", "Partial Cov");
    selItem("aid-poorpen", "Poor Pen");
    selItem("aid-obvious", "Obvious");
    selItem("aid-carrier", "Carrier");
    selItem("aid-dmgtype", "Dmg Type");
    selItem("aid-indirect", "Indirect");

    // Time Req: default is index 2
    const trSel = document.getElementById("aid-timereq");
    const trCp = parseFloat(trSel.options[trSel.selectedIndex]?.dataset?.cp) || 0;
    if (trCp !== 0) add(trSel.options[trSel.selectedIndex].textContent.replace(/ \([^)]*\)$/, ""), trCp);

    selItem("aid-activation", "Activation");
    selItem("aid-loss", "Ability Loss");
    selItem("aid-canthold", "Can't Hold");
    if (document.getElementById("aid-linked").checked) add("Linked", -2.5);
    selItem("aid-multi", "Multi-Ability");
    selItem("aid-usable", "Usable");
    selItem("aid-reqsave", "Req Save");
    selItem("aid-other", "Other");

    if (document.getElementById("aid-wontexplode").checked) add("Won't Explode", 5);
    selItem("aid-arc", "Arc");

    return items;
  },

  _updateCostPanel() {
    const abilityCp = this._getAbilityCp();
    const modItems = this._getModBreakdown();
    const modAdj = modItems.reduce((s, m) => s + m.cp, 0);
    const totalCost = abilityCp + modAdj;
    const sysRow = this._getSysRow();
    const bulky = parseInt(document.getElementById("aid-bulky").value) || 0;
    const delicate = parseInt(document.getElementById("aid-delicate").value) || 0;
    const integral = document.getElementById("aid-integral").checked;
    const open = document.getElementById("aid-open").checked;

    // Left: system info from current spaces selection
    const sp = sysRow ? sysRow.sp : 0;
    const genCp = sysRow ? sysRow.cp : 0;
    document.getElementById("aid-cp-gen").textContent = genCp + " CPs";

    const prof = sysRow ? sysRow.prof : 0;
    const profStr = prof ? "x" + (Number.isInteger(prof) ? prof : prof.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")) : "—";
    document.getElementById("aid-cp-prof").textContent = integral ? "—" : profStr;

    let hits = sysRow ? sysRow.hits : 0;
    hits += Math.ceil(4.3 * bulky);
    hits -= Math.ceil(4.3 * delicate);
    hits = Math.max(1, hits);
    document.getElementById("aid-cp-hits").textContent = integral ? "— (hidden)" : String(hits);

    // Tech/budget
    let budget = genCp + veh.techMod;
    if (integral) budget = Math.ceil(budget / 2);
    if (open) budget = Math.ceil(budget / 4);
    budget = Math.max(0, budget);
    const techRow = document.getElementById("aid-cp-tech-row");
    if (veh.techMod !== 0 || integral || open) {
      const parts = [];
      if (veh.techMod !== 0) parts.push((veh.techMod > 0 ? "+" : "") + veh.techMod + " tech");
      if (integral) parts.push("½ int");
      if (open) parts.push("¼ open");
      document.getElementById("aid-cp-tech").textContent = parts.join(", ");
      techRow.style.display = "";
    } else {
      techRow.style.display = "none";
    }
    document.getElementById("aid-cp-budget").textContent = budget + " CPs";

    // Right: cost breakdown with editable ability CP
    const linesEl = document.getElementById("aid-cost-lines");
    let html = "";
    const ab = MP.abilityById(document.getElementById("aid-ability-val").value);
    const baseName = ab ? ab.name : "Base";
    html += `<div class="aid-cost-line"><span class="aid-cost-line-lbl">${baseName}</span>`
      + `<input type="number" class="aid-cost-cp-input" id="aid-cp-inline" value="${abilityCp}" min="0" max="200" step="2.5" title="Base ability CPs — scroll or type to adjust"></div>`;
    for (const m of modItems) {
      const sign = m.cp >= 0 ? "+" : "";
      const cls = m.cp > 0 ? " pos" : m.cp < 0 ? " neg" : "";
      html += `<div class="aid-cost-line"><span class="aid-cost-line-lbl">${m.label}</span><span class="aid-cost-line-val${cls}">${sign}${m.cp}</span></div>`;
    }
    linesEl.innerHTML = html;

    // Wire the inline CP input
    const cpInline = document.getElementById("aid-cp-inline");
    cpInline.addEventListener("input", () => {
      document.getElementById("aid-cp-input").value = cpInline.value;
      this._refresh();
    });
    wheelNumber(cpInline);

    // Total
    document.getElementById("aid-cp-total").textContent = totalCost;

    // Balance line
    const remaining = budget - totalCost;
    const balEl = document.getElementById("aid-cost-balance");
    if (remaining > 0) {
      balEl.textContent = remaining + " CPs remaining";
      balEl.className = "aid-cost-balance under";
    } else if (remaining < 0) {
      balEl.textContent = Math.abs(remaining) + " CPs over budget → adds to vehicle cost";
      balEl.className = "aid-cost-balance over";
    } else {
      balEl.textContent = "═══ balanced ═══";
      balEl.className = "aid-cost-balance even";
    }
  },

  // Green tint on active (non-default) modifier rows
  _updateModTints() {
    // Generic modifier rows in aid-generic-mods
    document.querySelectorAll("#aid-generic-mods .aid-2c, #aid-generic-mods .aid-2c-full").forEach(row => {
      const sel = row.querySelector("select");
      const chk = row.querySelector("input[type='checkbox']");
      const num = row.querySelector("input[type='number']");
      let active = false;
      if (sel) {
        const defIdx = (sel.id === "aid-timereq") ? 2 : 0;
        active = sel.selectedIndex !== defIdx;
      } else if (chk) {
        active = chk.checked;
      } else if (num) {
        active = (parseInt(num.value) || 0) > 0;
      }
      row.classList.toggle("aid-mod-active", active);
    });
    // System modifier rows
    document.querySelectorAll("#aid-sys-mods .aid-2c, #aid-sys-mods .aid-2c-full").forEach(row => {
      const sel = row.querySelector("select");
      const chk = row.querySelector("input[type='checkbox']");
      const num = row.querySelector("input[type='number']");
      let active = false;
      if (sel) active = sel.selectedIndex !== 0;
      else if (chk) active = chk.checked;
      else if (num) active = (parseInt(num.value) || 0) > 0;
      row.classList.toggle("aid-mod-active", active);
    });
    // Ability-specific modifier rows
    document.querySelectorAll("#aid-ability-mods .aid-2c, #aid-ability-mods .aid-2c-full").forEach(row => {
      const sel = row.querySelector("select");
      const chk = row.querySelector("input[type='checkbox']");
      const num = row.querySelector("input[type='number']");
      let active = false;
      if (sel) {
        const amId = sel.dataset.amId;
        const abId = document.getElementById("aid-ability-val").value;
        const abMods = MP.ABILITY_MODIFIERS[abId] || [];
        const am = abMods.find(m => m.id === amId);
        const defIdx = am ? (am.def || 0) : 0;
        active = sel.selectedIndex !== defIdx;
      } else if (chk) active = chk.checked;
      else if (num) active = (parseInt(num.value) || 0) > 0;
      row.classList.toggle("aid-mod-active", active);
    });
  },

  _onAbilityChange() {
    const abId = document.getElementById("aid-ability-val").value;
    const detail = MP.ABILITY_DETAILS[abId];
    this._rebuildPR(detail ? detail.pr : 0);
    this._rebuildCharges(detail ? detail.pr : 0);
    this._rebuildRange(detail?.calc?.baseRange || 'BCx1"');
    this._rebuildAbilityMods(abId);
    this._refresh();
  },

  _rebuildPR(basePR) {
    const sel = document.getElementById("aid-pr");
    const opts = MP.buildPROptions(basePR);
    const baseIdx = MP.prScaleIndex(basePR);
    sel.innerHTML = "";
    for (let i = 0; i < opts.length; i++) {
      const opt = document.createElement("option");
      opt.value = i; opt.textContent = opts[i].label; opt.dataset.cp = opts[i].cp;
      if (opts[i].idx === baseIdx) opt.selected = true;
      sel.appendChild(opt);
    }
    wheelSelect(sel);
  },

  _rebuildCharges(basePR) {
    const sel = document.getElementById("aid-charges");
    const opts = MP.buildChargesOptions(basePR);
    const baseIdx = MP.prScaleIndex(basePR);
    sel.innerHTML = "";
    for (let i = 0; i < opts.length; i++) {
      const opt = document.createElement("option");
      opt.value = i; opt.textContent = opts[i].label; opt.dataset.cp = opts[i].cp;
      if (opts[i].idx === baseIdx) opt.selected = true;
      sel.appendChild(opt);
    }
    wheelSelect(sel);
  },

  _rebuildRange(baseLabel) {
    const sel = document.getElementById("aid-range");
    const opts = MP.buildRangeOptions(baseLabel);
    const baseIdx = MP.rangeScaleIndex(baseLabel);
    sel.innerHTML = "";
    for (let i = 0; i < opts.length; i++) {
      const opt = document.createElement("option");
      opt.value = i; opt.textContent = opts[i].label; opt.dataset.cp = opts[i].cp;
      opt.dataset.rangeLabel = opts[i].rangeLabel;
      if (opts[i].idx === baseIdx) opt.selected = true;
      sel.appendChild(opt);
    }
    wheelSelect(sel);
  },

  _rebuildAbilityMods(abId) {
    const container = document.getElementById("aid-ability-mods");
    const abMods = MP.ABILITY_MODIFIERS[abId];
    container.innerHTML = "";
    if (!abMods || abMods.length === 0) return;
    const hdr = document.createElement("div");
    hdr.className = "aid-section-hdr";
    hdr.textContent = "ABILITY MODIFIERS";
    container.appendChild(hdr);

    const grid = document.createElement("div");
    grid.className = "aid-2col";
    container.appendChild(grid);

    for (const am of abMods) {
      // Select-type modifiers span full width since they have long option labels
      const isFullWidth = am.type === "select";
      const row = document.createElement("div");
      row.className = isFullWidth ? "aid-2c-full" : "aid-2c";
      row.dataset.amId = am.id;
      const lbl = document.createElement("label");
      lbl.className = "aid-mlbl2"; lbl.textContent = am.label + ":";
      row.appendChild(lbl);

      if (am.type === "select") {
        const sel = document.createElement("select");
        sel.className = "aid-msel2"; sel.dataset.amId = am.id;
        for (let i = 0; i < am.options.length; i++) {
          const opt = document.createElement("option");
          opt.value = i; opt.textContent = am.options[i].l; opt.dataset.cp = am.options[i].cp;
          if (i === (am.def || 0)) opt.selected = true;
          sel.appendChild(opt);
        }
        row.appendChild(sel);
        wheelSelect(sel);
        sel.addEventListener("change", () => this._refresh());
      } else if (am.type === "number") {
        const inp = document.createElement("input");
        inp.type = "number"; inp.className = "aid-mnum2"; inp.value = "0";
        inp.min = "0"; inp.max = String(am.max); inp.step = String(am.step || 1);
        inp.dataset.amId = am.id;
        row.appendChild(inp);
        const hint = document.createElement("span");
        hint.className = "aid-mh2"; hint.textContent = am.hint || "";
        row.appendChild(hint);
        wheelNumber(inp);
        inp.addEventListener("input", () => this._refresh());
      } else {
        const chk = document.createElement("input");
        chk.type = "checkbox"; chk.className = "aid-mchk"; chk.dataset.amId = am.id;
        row.appendChild(chk);
        const cpStr = am.cp !== 0 ? (am.cp > 0 ? "+" + am.cp : String(am.cp)) : "0";
        const hint = document.createElement("span");
        hint.className = "aid-mh2"; hint.textContent = `(${cpStr})`;
        row.appendChild(hint);
        chk.addEventListener("change", () => this._refresh());
      }
      grid.appendChild(row);
    }
  },

  // Capture full dialog state as structured data
  _captureState() {
    const abId = document.getElementById("aid-ability-val").value;
    const state = {
      abId: abId,
      abilityCp: this._getAbilityCp(),
      spaces: parseInt(document.getElementById("aid-sp-input").value) || 8,
      area: parseInt(document.getElementById("aid-area").value) || 0,
      ap: parseInt(document.getElementById("aid-ap").value) || 0,
      autofire: parseInt(document.getElementById("aid-autofire").value) || 0,
      duration: parseInt(document.getElementById("aid-duration").value) || 0,
      hardened: parseInt(document.getElementById("aid-hardened").value) || 0,
      gear: document.getElementById("aid-gear").checked,
      bulky: parseInt(document.getElementById("aid-bulky").value) || 0,
      delicate: parseInt(document.getElementById("aid-delicate").value) || 0,
      pr: parseInt(document.getElementById("aid-pr").value) || 0,
      charges: parseInt(document.getElementById("aid-charges").value) || 0,
      range: parseInt(document.getElementById("aid-range").value) || 0,
      conc: parseInt(document.getElementById("aid-conc").value) || 0,
      kb: parseInt(document.getElementById("aid-kb").value) || 0,
      breakdown: parseInt(document.getElementById("aid-breakdown").value) || 0,
      partial: parseInt(document.getElementById("aid-partial").value) || 0,
      poorpen: parseInt(document.getElementById("aid-poorpen").value) || 0,
      obvious: parseInt(document.getElementById("aid-obvious").value) || 0,
      carrier: parseInt(document.getElementById("aid-carrier").value) || 0,
      dmgtype: parseInt(document.getElementById("aid-dmgtype").value) || 0,
      indirect: parseInt(document.getElementById("aid-indirect").value) || 0,
      timereq: parseInt(document.getElementById("aid-timereq").value) || 0,
      activation: parseInt(document.getElementById("aid-activation").value) || 0,
      loss: parseInt(document.getElementById("aid-loss").value) || 0,
      canthold: parseInt(document.getElementById("aid-canthold").value) || 0,
      linked: document.getElementById("aid-linked").checked,
      multi: parseInt(document.getElementById("aid-multi").value) || 0,
      usable: parseInt(document.getElementById("aid-usable").value) || 0,
      reqsave: parseInt(document.getElementById("aid-reqsave").value) || 0,
      other: parseInt(document.getElementById("aid-other").value) || 0,
      integral: document.getElementById("aid-integral").checked,
      open: document.getElementById("aid-open").checked,
      indep: document.getElementById("aid-indep").checked,
      wontexplode: document.getElementById("aid-wontexplode").checked,
      arc: parseInt(document.getElementById("aid-arc").value) || 0,
      facing: parseInt(document.getElementById("aid-facing").value) || 0,
      facingShow: document.getElementById("aid-facing-show").checked,
    };
    // Ability-specific modifiers
    const abMods = MP.ABILITY_MODIFIERS[abId] || [];
    state.abilityMods = {};
    for (const am of abMods) {
      if (am.type === "select") {
        const sel = document.querySelector(`select[data-am-id="${am.id}"]`);
        state.abilityMods[am.id] = parseInt(sel?.value) || 0;
      } else if (am.type === "number") {
        const inp = document.querySelector(`input[data-am-id="${am.id}"]`);
        state.abilityMods[am.id] = parseInt(inp?.value) || 0;
      } else {
        const chk = document.querySelector(`input[data-am-id="${am.id}"]`);
        state.abilityMods[am.id] = chk?.checked || false;
      }
    }
    return state;
  },

  // Restore dialog from structured data
  _restoreState(state) {
    if (!state) return;
    this._setAbility(state.abId || "");

    document.getElementById("aid-cp-input").value = state.abilityCp || 20;
    document.getElementById("aid-sp-input").value = String(state.spaces || 8);

    document.getElementById("aid-area").selectedIndex = state.area || 0;
    document.getElementById("aid-ap").selectedIndex = state.ap || 0;
    document.getElementById("aid-autofire").selectedIndex = state.autofire || 0;
    document.getElementById("aid-duration").selectedIndex = state.duration || 0;
    document.getElementById("aid-hardened").selectedIndex = state.hardened || 0;
    document.getElementById("aid-gear").checked = state.gear || false;
    document.getElementById("aid-bulky").value = state.bulky || 0;
    document.getElementById("aid-delicate").value = state.delicate || 0;
    // Backward compat: old saves have prch, new have pr/charges
    if (state.prch !== undefined && state.pr === undefined) {
      document.getElementById("aid-pr").selectedIndex = state.prch || 0;
      document.getElementById("aid-charges").selectedIndex = 0;
    } else {
      document.getElementById("aid-pr").selectedIndex = state.pr || 0;
      document.getElementById("aid-charges").selectedIndex = state.charges || 0;
    }
    document.getElementById("aid-range").selectedIndex = state.range || 0;
    document.getElementById("aid-conc").selectedIndex = state.conc || 0;
    document.getElementById("aid-kb").selectedIndex = state.kb || 0;
    document.getElementById("aid-breakdown").value = state.breakdown || 0;
    document.getElementById("aid-partial").selectedIndex = state.partial || 0;
    document.getElementById("aid-poorpen").selectedIndex = state.poorpen || 0;
    document.getElementById("aid-obvious").selectedIndex = state.obvious || 0;
    document.getElementById("aid-carrier").selectedIndex = state.carrier || 0;
    document.getElementById("aid-dmgtype").selectedIndex = state.dmgtype || 0;
    document.getElementById("aid-indirect").selectedIndex = state.indirect || 0;
    document.getElementById("aid-timereq").selectedIndex = state.timereq ?? 2;
    document.getElementById("aid-activation").selectedIndex = state.activation || 0;
    document.getElementById("aid-loss").selectedIndex = state.loss || 0;
    document.getElementById("aid-canthold").selectedIndex = state.canthold || 0;
    document.getElementById("aid-linked").checked = state.linked || false;
    document.getElementById("aid-multi").selectedIndex = state.multi || 0;
    document.getElementById("aid-usable").selectedIndex = state.usable || 0;
    document.getElementById("aid-reqsave").selectedIndex = state.reqsave || 0;
    document.getElementById("aid-other").selectedIndex = state.other || 0;
    document.getElementById("aid-integral").checked = state.integral || false;
    document.getElementById("aid-open").checked = state.open || false;
    document.getElementById("aid-indep").checked = state.indep || false;
    document.getElementById("aid-wontexplode").checked = state.wontexplode || false;
    document.getElementById("aid-arc").selectedIndex = state.arc || 0;
    document.getElementById("aid-facing").selectedIndex = state.facing || 0;
    document.getElementById("aid-facing-show").checked = state.facingShow || false;
    // Hide facing when arc is 360°
    document.getElementById("aid-facing").closest(".aid-2c-full").style.display = (state.arc === 3) ? "none" : "";

    // Restore ability-specific modifiers (after _onAbilityChange rebuilds them)
    if (state.abilityMods) {
      for (const [amId, val] of Object.entries(state.abilityMods)) {
        if (typeof val === "boolean") {
          const chk = document.querySelector(`input[data-am-id="${amId}"]`);
          if (chk) chk.checked = val;
        } else {
          // Could be a number input or a select
          const inp = document.querySelector(`input[data-am-id="${amId}"]`);
          if (inp) { inp.value = val; }
          else {
            const sel = document.querySelector(`select[data-am-id="${amId}"]`);
            if (sel) sel.selectedIndex = val;
          }
        }
      }
    }

    // Restore description mode if saved with this ability
    if (state.descMode) this._setDescMode(state.descMode);

    this._refresh();
  },

  _resetDialog() {
    this._setAbility("");
    document.getElementById("aid-cp-input").value = "20";
    document.getElementById("aid-sp-input").value = "8";
    document.getElementById("aid-area").selectedIndex = 0;
    document.getElementById("aid-ap").selectedIndex = 0;
    document.getElementById("aid-autofire").selectedIndex = 0;
    document.getElementById("aid-duration").selectedIndex = 0;
    document.getElementById("aid-hardened").selectedIndex = 0;
    document.getElementById("aid-gear").checked = false;
    document.getElementById("aid-bulky").value = "0";
    document.getElementById("aid-delicate").value = "0";
    document.getElementById("aid-conc").selectedIndex = 0;
    document.getElementById("aid-kb").selectedIndex = 0;
    document.getElementById("aid-breakdown").value = "0";
    document.getElementById("aid-partial").selectedIndex = 0;
    document.getElementById("aid-poorpen").selectedIndex = 0;
    document.getElementById("aid-obvious").selectedIndex = 0;
    document.getElementById("aid-carrier").selectedIndex = 0;
    document.getElementById("aid-dmgtype").selectedIndex = 0;
    document.getElementById("aid-indirect").selectedIndex = 0;
    document.getElementById("aid-timereq").selectedIndex = 2;
    document.getElementById("aid-activation").selectedIndex = 0;
    document.getElementById("aid-loss").selectedIndex = 0;
    document.getElementById("aid-canthold").selectedIndex = 0;
    document.getElementById("aid-linked").checked = false;
    document.getElementById("aid-multi").selectedIndex = 0;
    document.getElementById("aid-usable").selectedIndex = 0;
    document.getElementById("aid-reqsave").selectedIndex = 0;
    document.getElementById("aid-other").selectedIndex = 0;
    document.getElementById("aid-integral").checked = false;
    document.getElementById("aid-open").checked = false;
    document.getElementById("aid-indep").checked = false;
    document.getElementById("aid-wontexplode").checked = false;
    document.getElementById("aid-arc").selectedIndex = 0;
    document.getElementById("aid-facing").selectedIndex = 0;
    document.getElementById("aid-facing-show").checked = false;
    document.getElementById("aid-facing").closest(".aid-2c-full").style.display = "";
  },

  open(rowIdx, editMode) {
    this.targetIdx = rowIdx;
    this.editMode = editMode || false;

    const sys = veh.systems[rowIdx];

    if (this.editMode && sys && sys.abilityData) {
      // Edit mode: restore from structured data
      document.getElementById("aid-title").textContent = "Edit Ability";
      this._setAbility(sys.abilityData.abId || "");
      this._restoreState(sys.abilityData);
    } else {
      // Insert mode: blank dialog
      document.getElementById("aid-title").textContent = "Insert Ability";
      this._resetDialog();
      // Pre-fill from existing row
      if (sys) {
        if (sys.spaces) {
          const row = MP.lookupSys(sys.spaces);
          document.getElementById("aid-cp-input").value = row ? row.cp : 20;
          document.getElementById("aid-sp-input").value = String(sys.spaces);
        }
        if (sys.integral) document.getElementById("aid-integral").checked = true;
        if (sys.open) document.getElementById("aid-open").checked = true;
      }
      this._onAbilityChange();
    }

    this.overlay.style.display = "flex";
    document.getElementById("aid-ability-btn").focus();
  },

  close() { this.overlay.style.display = "none"; this.targetIdx = null; this.editMode = false; },

  // Read CP from a select with data-cp attributes
  _selCp(id) { const s = document.getElementById(id); return parseFloat(s.options[s.selectedIndex]?.dataset?.cp) || 0; },

  // Get current description mode from radio buttons
  _getDescMode() {
    const checked = document.querySelector('input[name="aid-desc-mode"]:checked');
    return checked ? checked.value : "compact";
  },

  // Set description mode and persist
  _setDescMode(mode) {
    const radio = document.querySelector(`input[name="aid-desc-mode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    try { localStorage.setItem("mp-desc-mode", mode); } catch(e) {}
  },

  // Restore description mode from localStorage
  _restoreDescMode() {
    try {
      const mode = localStorage.getItem("mp-desc-mode");
      if (mode && ["full","compact","min"].includes(mode)) this._setDescMode(mode);
    } catch(e) {}
  },

  // Build description string from current dialog state
  // mode: "full" | "compact" | "min"
  // Returns {desc, modAdj, bulkyTotal, delicateTotal}
  _buildDescription(mode) {
    const abId = document.getElementById("aid-ability-val").value;
    const ab = MP.abilityById(abId);
    const detail = MP.ABILITY_DETAILS[abId];
    const name = ab ? ab.name : "Custom";
    const abilityCp = this._getAbilityCp();
    const sysRow = this._getSysRow();
    const baseCp = sysRow ? sysRow.cp : 0;
    const info = MP.computeAbilityInfo(abId, abilityCp, veh.st, veh.en, veh.ag, veh.intel, veh.cl);

    const full = mode === "full";
    const min = mode === "min";
    // cp annotation helper: full/compact show CPs, min omits
    function cpA(cp) { if (min) return ""; return ` (${cp >= 0 ? "+" + cp : cp})`; }
    // base CP annotation
    function baseCpA() { if (min) return ""; return " (" + abilityCp + ")"; }

    const parts = [];
    let basePart = name;
    if (info && info.desc) basePart += ": " + info.desc;
    basePart += baseCpA();
    parts.push(basePart);

    let modAdj = 0, bulkyTotal = 0, delicateTotal = 0;

    // Ability-specific modifiers
    const abMods = MP.ABILITY_MODIFIERS[abId] || [];
    for (const am of abMods) {
      const lbl = full ? am.label : am.short;
      if (am.type === "select") {
        const sel = document.querySelector(`select[data-am-id="${am.id}"]`);
        if (sel) {
          const selIdx = parseInt(sel.value);
          const opt = am.options[selIdx];
          const defIdx = am.def || 0;
          if (opt && (opt.cp !== 0 || selIdx !== defIdx)) {
            const optLbl = opt.l.replace(/ \([^)]*\)$/, "");
            parts.push(opt.cp !== 0 ? `${lbl}: ${optLbl}${cpA(opt.cp)}` : `${lbl}: ${optLbl}`);
            modAdj += opt.cp;
          }
        }
      } else if (am.type === "number") {
        const inp = document.querySelector(`input[data-am-id="${am.id}"]`);
        const val = parseInt(inp?.value) || 0;
        if (val > 0) {
          const c = am.cpFn(val);
          parts.push(`${lbl} x${val}${cpA(c)}`);
          modAdj += c;
        }
      } else {
        const chk = document.querySelector(`input[data-am-id="${am.id}"]`);
        if (chk?.checked) {
          parts.push(am.cp !== 0 ? `${lbl}${cpA(am.cp)}` : lbl);
          modAdj += am.cp;
        }
      }
    }

    // Generic modifiers
    function addStep(id, steps, fullLbl, shortLbl, descFn) {
      const val = parseInt(document.getElementById(id).value);
      if (val > 0 && steps[val]) {
        const c = steps[val].cp;
        const s = steps[val];
        const label = full ? fullLbl : shortLbl;
        parts.push(descFn(label, s, c));
        modAdj += c;
      }
    }
    addStep("aid-area", MP.AREA_EFFECT_STEPS, "Area Effect", "AE", (l,s,c) => `${l} ${s.label}${cpA(c)}`);
    addStep("aid-ap", MP.ARMOR_PIERCING_STEPS, "Armor Piercing", "AP", (l,s,c) => `${l} ${s.val}${cpA(c)}`);
    addStep("aid-autofire", MP.AUTOFIRE_STEPS, "Autofire", "AF", (l,s,c) => `${l} x${s.rof}${cpA(c)}`);
    addStep("aid-duration", MP.DURATION_STEPS, "Duration", "Dur", (l,s,c) => `${l} ${s.label}${cpA(c)}`);
    addStep("aid-hardened", MP.HARDENED_STEPS, "Hardened", "Hrd", (l,s,c) => `${l} ${s.val}${cpA(c)}`);

    if (document.getElementById("aid-gear").checked) {
      parts.push(`Gear${cpA(-5)}`); modAdj -= 5;
    }

    const bulky = parseInt(document.getElementById("aid-bulky").value) || 0;
    if (bulky > 0) {
      const c = bulky * 2.5;
      parts.push(`${full ? "Bulky" : "Blk"} x${bulky}${cpA(c)}`);
      modAdj += c; bulkyTotal = bulky;
    }
    const delicate = parseInt(document.getElementById("aid-delicate").value) || 0;
    if (delicate > 0) {
      const c = delicate * 2.5;
      parts.push(`${full ? "Delicate" : "Del"} x${delicate}${cpA(-c)}`);
      modAdj -= c; delicateTotal = delicate;
    }

    // PR — always show current value; annotate CP only when modified
    const prSel = document.getElementById("aid-pr");
    const prCp = this._selCp("aid-pr");
    if (prSel && prSel.selectedIndex >= 0) {
      const txt = prSel.options[prSel.selectedIndex].textContent.replace(/ \([^)]*\)$/, "");
      if (prCp !== 0) {
        parts.push(`${txt}${cpA(prCp)}`);
        modAdj += prCp;
      } else if (detail && detail.pr > 0) {
        parts.push(txt); // show base PR without CP annotation
      }
    }

    // Charges — always show current value; annotate CP only when modified
    const chSel = document.getElementById("aid-charges");
    const chCp = this._selCp("aid-charges");
    if (chSel && chSel.selectedIndex >= 0) {
      const txt = chSel.options[chSel.selectedIndex].textContent.replace(/ \([^)]*\)$/, "");
      if (chCp !== 0) {
        parts.push(`${full ? "Charges" : "Ch"}: ${txt}${cpA(chCp)}`);
        modAdj += chCp;
      } else if (detail && detail.pr > 0) {
        parts.push(`${full ? "Charges" : "Ch"}: ${txt}`);
      }
    }

    // Range
    const rngSel = document.getElementById("aid-range");
    const rngCp = parseFloat(rngSel.options[rngSel.selectedIndex]?.dataset?.cp) || 0;
    if (rngCp !== 0) {
      const rngLabel = rngSel.options[rngSel.selectedIndex]?.dataset?.rangeLabel || "";
      parts.push(`${full ? "Range" : "Rng"} ${rngLabel}${cpA(rngCp)}`);
      modAdj += rngCp;
    }

    // Misc dropdowns — include if cp != 0 OR if selected index != 0 (for 0-cp selections like Spot Coverage)
    const miscIds = [
      "aid-conc","aid-kb","aid-partial","aid-poorpen","aid-obvious","aid-carrier",
      "aid-dmgtype","aid-indirect","aid-timereq","aid-activation","aid-loss",
      "aid-canthold","aid-multi","aid-usable","aid-reqsave","aid-other"
    ];
    for (const id of miscIds) {
      const s = document.getElementById(id);
      const c = parseFloat(s.options[s.selectedIndex]?.dataset?.cp) || 0;
      const defIdx = (id === "aid-timereq") ? 2 : 0;
      if (c !== 0 || s.selectedIndex !== defIdx) {
        const txt = s.options[s.selectedIndex].textContent.replace(/ \([^)]*\)$/, "");
        parts.push(c !== 0 ? `${txt}${cpA(c)}` : txt);
        modAdj += c;
      }
    }

    // Linked checkbox
    if (document.getElementById("aid-linked").checked) {
      parts.push(`${full ? "Linked" : "Lnk"}${cpA(-2.5)}`);
      modAdj -= 2.5;
    }

    const bkdn = parseInt(document.getElementById("aid-breakdown").value) || 0;
    if (bkdn > 0) {
      const c = bkdn * 2.5;
      parts.push(`${full ? "Breakdown" : "Bkdn"} x${bkdn}${cpA(-c)}`);
      modAdj -= c;
    }

    // System modifiers
    const isIntegral = document.getElementById("aid-integral").checked;
    const isOpen = document.getElementById("aid-open").checked;
    const isIndep = document.getElementById("aid-indep").checked;
    const wontExplode = document.getElementById("aid-wontexplode").checked;
    const arcCp = this._selCp("aid-arc");

    if (isIntegral) {
      if (min) { parts.push("Integral"); }
      else { const halfCp = Math.ceil((baseCp + veh.techMod) / 2); parts.push(`Integral (½ → ${halfCp})`); }
    }
    if (isOpen) {
      if (min) { parts.push("Open"); }
      else {
        let openBase = baseCp + veh.techMod;
        if (isIntegral) openBase = Math.ceil(openBase / 2);
        parts.push(`Open (¼ → ${Math.ceil(openBase / 4)})`);
      }
    }
    if (isIndep) parts.push(full ? "Indep. Power" : "Indep");
    if (wontExplode) { parts.push(min ? "No Explode" : `Won't Explode${cpA(5)}`); modAdj += 5; }
    if (arcCp !== 0) {
      const arcSel = document.getElementById("aid-arc");
      const arcTxt = arcSel.options[arcSel.selectedIndex].textContent.replace(/ \([^)]*\)$/, "");
      // Shorten arc labels for compact/min
      let arcLabel = arcTxt;
      if (!full) {
        arcLabel = arcLabel.replace("No Arc — line only", "Line Only")
                           .replace("Forward 120°", "Fwd")
                           .replace("Wide 240°", "240°")
                           .replace("Wide 360°", "360°");
      }
      parts.push(`${arcLabel}${cpA(arcCp)}`);
      modAdj += arcCp;
    }

    // Facing (when checkbox checked and not 360° arc)
    const arcIdx = parseInt(document.getElementById("aid-arc").value) || 0;
    const facShow = document.getElementById("aid-facing-show").checked;
    if (arcIdx !== 3 && facShow) {
      const facIdx = parseInt(document.getElementById("aid-facing").value) || 0;
      const facLabel = MP.FACING_OPTS[facIdx] || "Fwd";
      parts.push(facLabel);
    }

    return { desc: parts.join(", "), parts, modAdj, bulkyTotal, delicateTotal,
             isIntegral, isOpen, abilityCp, spaces: sysRow ? sysRow.sp : 0 };
  },

  _updatePreview() {
    const mode = this._getDescMode();
    const result = this._buildDescription(mode);
    const el = document.getElementById("aid-preview");
    el.textContent = result.desc || "—";
  },

  _commit() {
    const idx = this.targetIdx;
    if (idx === null) return;

    const mode = this._getDescMode();
    const r = this._buildDescription(mode);
    const abilityData = this._captureState();
    abilityData.descMode = mode;

    while (veh.systems.length <= idx) veh.addSystem();
    const sys = veh.systems[idx];

    if (this.editMode) {
      sys.spaces = r.spaces;
      sys.desc = r.desc;
      sys.bulky = r.bulkyTotal;
      sys.delicate = r.delicateTotal;
      sys.integral = r.isIntegral;
      sys.open = r.isOpen;
      sys.abilityData = abilityData;
    } else {
      if (!sys.spaces) sys.spaces = r.spaces;
      if (r.bulkyTotal) sys.bulky = (sys.bulky || 0) + r.bulkyTotal;
      if (r.delicateTotal) sys.delicate = (sys.delicate || 0) + r.delicateTotal;
      if (r.isIntegral) sys.integral = true;
      if (r.isOpen) sys.open = true;
      if (sys.desc && sys.desc.trim()) sys.desc += ", " + r.desc;
      else sys.desc = r.desc;
      sys.abilityData = abilityData;
    }

    this.close();
    updateAll();
  }
};

abilityPicker.init();
abilityDlg.init();



// Ctrl+I keydown handler on system rows
document.addEventListener("keydown", e => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "i") return;
  // Find which system row has focus (or desc input is focused)
  const active = document.activeElement;
  if (!active) return;
  const rowWrap = active.closest(".vs-sys-row-wrap[data-idx]");
  if (!rowWrap) return;
  e.preventDefault();
  const idx = parseInt(rowWrap.dataset.idx);
  if (isNaN(idx)) return;
  abilityDlg.open(idx, false);
});

// ---- Placed spaces counter ----
function updatePlacedCount() {
  const el = document.getElementById("vs-placed-count");
  let placed = 0;
  let integralSpaces = 0;
  for (const sys of veh.systems) {
    if (sys.integral) { integralSpaces += (sys.spaces || 0); }
    else { placed += sys.cells.length; }
  }
  placed += veh.getRemainingSys().cells.length;
  const paintable = veh.totalSpaces - integralSpaces;
  el.innerHTML = `<span class="vs-pc-n">${placed}</span> / ${paintable} placed`;
}

// ---- Right-click context menu on canvas cells ----
const cellMenu = {
  el: document.getElementById("vs-cell-menu"),
  hdr: document.getElementById("vs-cell-menu-hdr"),
  _gx: 0, _gy: 0, _sys: null, _cell: null, _editor: null,
  _infoEl: null,

  show(gx, gy, sys, cell, cx, cy, ed) {
    this._gx = gx; this._gy = gy; this._sys = sys; this._cell = cell; this._editor = ed;
    this.hdr.textContent = sys.desc || "(unnamed)";
    // Position: keep on screen
    this.el.style.display = "block";
    const mw = this.el.offsetWidth;
    const mh = this.el.offsetHeight;
    let x = cx, y = cy;
    if (x + mw > window.innerWidth) x = window.innerWidth - mw - 4;
    if (y + mh > window.innerHeight) y = window.innerHeight - mh - 4;
    if (x < 0) x = 4;
    if (y < 0) y = 4;
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
  },

  hide() {
    this.el.style.display = "none";
    this.hideInfo();
  },

  hideInfo() {
    if (this._infoEl && this._infoEl.parentNode) this._infoEl.parentNode.removeChild(this._infoEl);
    this._infoEl = null;
  },

  _showInfo() {
    this.hideInfo();
    const sys = this._sys;
    const ed = this._editor;
    if (!sys || sys.id === "remaining") return;

    const idx = veh.systems.indexOf(sys);
    const placed = sys.cells.length;
    const total = sys.spaces || 0;
    const hits = veh.sysHits(sys);
    const cps = veh.sysCPs(sys);
    const prof = veh.sysProfileDisplay(sys);
    const dmg = sys.dmg || "—";
    const flags = [];
    if (sys.integral) flags.push("Integral");
    if (sys.open) flags.push("Open");
    if (sys.bulky) flags.push("Bulky x" + sys.bulky);
    if (sys.delicate) flags.push("Delicate x" + sys.delicate);

    const div = document.createElement("div");
    div.className = "vs-sys-info";
    let html = "";
    html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">Row</span><span class="vs-sys-info-val">#${idx + 1}</span></div>`;
    html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">Spaces</span><span class="vs-sys-info-val">${placed} / ${total}</span></div>`;
    html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">Profile</span><span class="vs-sys-info-val">${prof || "—"}</span></div>`;
    html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">Hits</span><span class="vs-sys-info-val">${hits || "—"}</span></div>`;
    html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">CPs</span><span class="vs-sys-info-val">${cps}</span></div>`;
    html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">Damage</span><span class="vs-sys-info-val">${escAttr(dmg)}</span></div>`;
    if (flags.length) html += `<div class="vs-sys-info-row"><span class="vs-sys-info-lbl">Flags</span><span class="vs-sys-info-val">${flags.join(", ")}</span></div>`;
    if (sys.desc) html += `<div class="vs-sys-info-desc">${escAttr(sys.desc)}</div>`;
    div.innerHTML = html;

    // Position near the menu
    const mr = this.el.getBoundingClientRect();
    div.style.left = (mr.right + 4) + "px";
    div.style.top = mr.top + "px";
    document.body.appendChild(div);
    // If off-screen right, flip to left
    if (div.getBoundingClientRect().right > window.innerWidth) {
      div.style.left = (mr.left - div.offsetWidth - 4) + "px";
    }
    this._infoEl = div;
  },

  _doAction(action) {
    const sys = this._sys;
    const cell = this._cell;
    const ed = this._editor;
    const gx = this._gx;
    const gy = this._gy;
    this.hide();

    switch (action) {
      case "highlight":
        if (ed && sys) ed.highlightSystem(sys.id, 2500);
        break;
      case "info":
        // Re-show menu briefly to anchor info panel
        this.show(gx, gy, sys, cell, parseInt(this.el.style.left), parseInt(this.el.style.top), ed);
        this._showInfo();
        // Hide menu but keep info
        this.el.style.display = "none";
        break;
      case "select":
        if (ed && sys) {
          ed.activeSysId = sys.id;
          if (sys.id === "remaining") {
            document.getElementById("sel-layout-sys").value = "remaining";
          } else {
            document.getElementById("sel-layout-sys").value = String(sys.id);
          }
          setLayoutMode("paint");
          updateActiveIndicator();
          ed.draw();
        }
        break;
      case "label":
        if (ed && cell) {
          ed._showCellLabelEditor(cell, gx, gy);
        }
        break;
      case "togglelabels":
        if (sys) {
          sys.hideLabels = !sys.hideLabels;
          if (ed) ed.draw();
          autoSave();
        }
        break;
      case "delete":
        if (ed) {
          veh.unpaintCell(gx, gy);
          ed.selectedCell = null;
          ed.draw();
          if (ed.onUpdate) ed.onUpdate();
        }
        break;
    }
  }
};

// Wire menu item clicks
cellMenu.el.querySelectorAll(".vs-cell-menu-item").forEach(item => {
  item.addEventListener("click", e => {
    e.stopPropagation();
    cellMenu._doAction(item.dataset.action);
  });
});

// Close menu on click outside
document.addEventListener("mousedown", e => {
  if (cellMenu.el.style.display !== "none" && !cellMenu.el.contains(e.target)) cellMenu.hide();
  if (cellMenu._infoEl && !cellMenu._infoEl.contains(e.target) && !cellMenu.el.contains(e.target)) cellMenu.hideInfo();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { cellMenu.hide(); }
});

// ---- Init ----
const layoutCanvasEl = document.getElementById("vs-layout-canvas");
const layoutWrapEl = document.getElementById("vs-layout-wrap");
editor = new FloorPlanEditor(layoutCanvasEl, layoutWrapEl, veh);
editor.onUpdate = () => {
  updateActiveIndicator();
  updateSystemDropdown();
  updatePlacedCount();
  editor.draw();
};
editor.onContextMenu = (gx, gy, sys, cell, cx, cy) => {
  cellMenu.show(gx, gy, sys, cell, cx, cy, editor);
};
editor.onViewChange = () => saveViewState();
editor.panX = 20;
editor.panY = 20;

// Restore from localStorage if available
if (autoLoad()) {
  syncFormFromVeh();
  // Restore campaign association from loaded data
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const d = JSON.parse(raw); if (d._campaign) _vehCampaign = d._campaign; }
  } catch(e) {}
} else {
  // New vehicle — pick up campaign from campaign page
  const camp = localStorage.getItem('mp-veh-campaign');
  if (camp) { _vehCampaign = camp; localStorage.removeItem('mp-veh-campaign'); }
}
restoreViewState();
updateAll();

// Deep-link: ?char=Name loads a specific vehicle from the list
(function() {
  const vehName = new URLSearchParams(window.location.search).get('char');
  if (!vehName) return;
  const list = JSON.parse(localStorage.getItem(VEHS_LIST_KEY)) || [];
  const idx = list.findIndex(v => (v.name || '') === vehName);
  if (idx < 0) return;
  veh.fromJSON(list[idx]);
  syncFormFromVeh();
  updateAll();
  _vehCampaign = list[idx]._campaign || null;
  localStorage.setItem(LS_KEY, JSON.stringify(list[idx]));
  localStorage.setItem('mp-veh-edit-idx', idx);
  document.title = (veh.name || "Vehicle") + " — MP Vehicle Builder";
})();
