// mp-canvas.js v3.1.0 — Canvas lock mode

const CELL_PX = 28;

class FloorPlanEditor {
  constructor(canvasEl, wrapEl, vehicle) {
    this.canvas = canvasEl;
    this.wrap = wrapEl;
    this.ctx = canvasEl.getContext("2d");
    this.veh = vehicle;

    this.mode = "select";   // "select" | "paint" | "sil" | "wall"
    this.activeSysId = null; // system id being painted

    this.panX = 0;
    this.panY = 0;
    this.panStart = null;
    this.zoom = 1.0;
    this.painting = false;  // mouse held down in paint mode

    this.hoverGx = null;
    this.hoverGy = null;
    this.selectedCell = null; // {gx, gy, sysId} for Delete key
    this._cellDrag = null;   // {fromGx, fromGy, toGx, toGy, sysId}

    this.locked = false; // When true, disable all editing (paint/drag/wall/sil/delete/label)
    this.wheelZoom = true; // When false, mousewheel doesn't zoom

    this.onUpdate = null;
    this.onContextMenu = null; // callback(gx, gy, sys, cell, cssX, cssY)
    this.onViewChange = null; // callback() when zoom/pan changes

    // Highlight overlay — flash all cells for a system
    this.highlightSysId = null;
    this._highlightTimer = null;

    // Silhouette overlay
    this._silImg = null;      // loaded Image element
    this._silTinted = null;   // offscreen canvas with color-tinted silhouette
    this._silTintColor = null;// last tint color used
    this._silDrag = null;     // {type:"move"|"resize", startGx, startGy, origSil}
    this._silHover = "";      // "" | "move" | "resize"

    this._bind();
    this._resize();
    this.draw();
  }

  _bind() {
    this.canvas.addEventListener("mousemove", e => this._onMouseMove(e));
    this.canvas.addEventListener("mousedown", e => this._onMouseDown(e));
    this.canvas.addEventListener("mouseup", e => this._onMouseUp(e));
    this.canvas.addEventListener("dblclick", e => this._onDblClick(e));
    this.canvas.addEventListener("mouseleave", () => {
      this.hoverGx = null; this.hoverGy = null;
      this.painting = false; this.panStart = null;
      this.draw();
    });
    this.canvas.addEventListener("wheel", e => this._onWheel(e), { passive: false });
    this.canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
      if (!this.onContextMenu || this.mode === "wall" || this.locked) return;
      const { cx, cy } = this._canvasPos(e);
      const { gx, gy } = this._cssToGrid(cx, cy);
      const result = this.veh.cellObjAt(gx, gy);
      if (result) {
        this.onContextMenu(gx, gy, result.sys, result.cell, e.clientX, e.clientY);
      }
    });

    // Touch events
    this._touchState = { fingers: 0, lastTap: 0, longTimer: null, pinchDist: 0, panCx: 0, panCy: 0 };
    this.canvas.addEventListener("touchstart", e => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener("touchmove", e => this._onTouchMove(e), { passive: false });
    this.canvas.addEventListener("touchend", e => this._onTouchEnd(e), { passive: false });
    this.canvas.addEventListener("touchcancel", e => this._onTouchEnd(e), { passive: false });

    this._keyHandler = e => this._onKey(e);
    window.addEventListener("keydown", this._keyHandler);
    this._resizeObs = new ResizeObserver(() => { this._resize(); this.draw(); });
    this._resizeObs.observe(this.wrap);
  }

  destroy() {
    if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);
    if (this._resizeObs) this._resizeObs.disconnect();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(this.wrap.clientWidth * dpr);
    const h = Math.round(this.wrap.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.canvas.style.width = this.wrap.clientWidth + "px";
    this.canvas.style.height = this.wrap.clientHeight + "px";
    this.ctx = this.canvas.getContext("2d");
  }

  _canvasPos(ev) {
    const rect = this.canvas.getBoundingClientRect();
    return { cx: ev.clientX - rect.left, cy: ev.clientY - rect.top };
  }

  _cssToGrid(cx, cy) {
    const cell = CELL_PX * this.zoom;
    return { gx: Math.floor((cx - this.panX) / cell), gy: Math.floor((cy - this.panY) / cell) };
  }

  setMode(mode) {
    this.mode = mode;
    this.painting = false;
    this._wallDrag = null;
    if (mode === "paint") this.canvas.style.cursor = "crosshair";
    else if (mode === "wall") this.canvas.style.cursor = "crosshair";
    else this.canvas.style.cursor = "default";
    this.draw();
  }

  // Detect which cell edge the mouse is nearest to
  _nearestEdge(cx, cy) {
    const cell = CELL_PX * this.zoom;
    const fx = (cx - this.panX) / cell;
    const fy = (cy - this.panY) / cell;
    const gx = Math.floor(fx);
    const gy = Math.floor(fy);
    const lx = fx - gx; // 0..1 local position within cell
    const ly = fy - gy;
    // Distance to each edge
    const dTop = ly, dBot = 1 - ly, dLeft = lx, dRight = 1 - lx;
    const min = Math.min(dTop, dBot, dLeft, dRight);
    const threshold = 0.3; // must be within 30% of cell size from edge
    if (min > threshold) return null;
    if (min === dTop) return { gx, gy, edge: "t" };
    if (min === dBot) return { gx, gy, edge: "b" };
    if (min === dLeft) return { gx, gy, edge: "l" };
    return { gx, gy, edge: "r" };
  }

  _onMouseMove(ev) {
    const { cx, cy } = this._canvasPos(ev);
    if (this.panStart) {
      this.panX = this.panStart.panX + (ev.clientX - this.panStart.clientX);
      this.panY = this.panStart.panY + (ev.clientY - this.panStart.clientY);
      this.draw();
      return;
    }

    // Silhouette drag in progress
    if (this._silDrag) {
      const cell = CELL_PX * this.zoom;
      const dx = (cx - this._silDrag.startCx) / cell;
      const dy = (cy - this._silDrag.startCy) / cell;
      const sil = this.veh.silhouette;
      if (this._silDrag.type === "move") {
        sil.gx = Math.round((this._silDrag.origGx + dx) * 2) / 2;
        sil.gy = Math.round((this._silDrag.origGy + dy) * 2) / 2;
      } else if (this._silDrag.type === "resize") {
        sil.gw = Math.max(1, Math.round((this._silDrag.origGw + dx) * 2) / 2);
        sil.gh = Math.max(1, Math.round((this._silDrag.origGh + dy) * 2) / 2);
      }
      this.draw();
      if (this.onUpdate) this.onUpdate();
      return;
    }

    // Cell drag in progress (Select mode)
    if (this._cellDrag) {
      const { gx, gy } = this._cssToGrid(cx, cy);
      this._cellDrag.toGx = gx;
      this._cellDrag.toGy = gy;
      this.draw();
      return;
    }

    const { gx, gy } = this._cssToGrid(cx, cy);
    this.hoverGx = gx;
    this.hoverGy = gy;

    // Cursor updates for sil mode
    if (this.mode === "sil") {
      const hit = this._silhouetteHitTest(cx, cy);
      this._silHover = hit;
      this.canvas.style.cursor = hit === "resize" ? "nwse-resize" : hit === "move" ? "grab" : "default";
    }

    // Cursor for select mode over a painted cell
    if (this.mode === "select") {
      const sys = this.veh.cellAt(gx, gy);
      this.canvas.style.cursor = sys ? "grab" : "default";
    }

    // Wall mode: track hovered edge, drag-draw walls
    if (this.mode === "wall") {
      this._hoverEdge = this._nearestEdge(cx, cy);
      if (this._wallDrag && this._hoverEdge) {
        const e = this._hoverEdge;
        if (!this.veh.findWall(e.gx, e.gy, e.edge)) {
          this.veh.setWall(e.gx, e.gy, e.edge, "wall");
          if (this.onUpdate) this.onUpdate();
        }
      }
    } else {
      this._hoverEdge = null;
    }

    // Drag-paint
    if (this.painting && this.mode === "paint" && this.activeSysId) {
      if (this.veh.paintCell(this.activeSysId, gx, gy)) {
        if (this.onUpdate) this.onUpdate();
      }
    }
    this.draw();
  }

  _onMouseDown(ev) {
    if (ev.button === 1) {
      // Middle-click: always pan
      this.panStart = { clientX: ev.clientX, clientY: ev.clientY, panX: this.panX, panY: this.panY };
      ev.preventDefault();
      return;
    }
    if (ev.button === 2) {
      // Right-click: pan (always in wall mode, otherwise only if no cell)
      const { cx, cy } = this._canvasPos(ev);
      const { gx, gy } = this._cssToGrid(cx, cy);
      if (this.mode === "wall" || !this.veh.cellAt(gx, gy)) {
        this.panStart = { clientX: ev.clientX, clientY: ev.clientY, panX: this.panX, panY: this.panY };
      }
      ev.preventDefault();
      return;
    }
    if (ev.button !== 0) return;
    ev.preventDefault();
    if (this.locked) return; // Lock: block all editing interactions
    const { cx, cy } = this._canvasPos(ev);
    const { gx, gy } = this._cssToGrid(cx, cy);

    // Silhouette mode
    if (this.mode === "sil" && this.veh.silhouette && this._silImg) {
      const hit = this._silhouetteHitTest(cx, cy);
      if (hit) {
        const sil = this.veh.silhouette;
        this._silDrag = {
          type: hit,
          startCx: cx, startCy: cy,
          origGx: sil.gx, origGy: sil.gy,
          origGw: sil.gw, origGh: sil.gh
        };
        this.canvas.style.cursor = hit === "resize" ? "nwse-resize" : "grabbing";
        return;
      }
    }

    // Wall mode — click to toggle, shift+click to cycle type, drag to draw
    if (this.mode === "wall") {
      const edge = this._nearestEdge(cx, cy);
      if (edge) {
        if (ev.shiftKey) {
          this.veh.toggleWall(edge.gx, edge.gy, edge.edge);
        } else {
          const existing = this.veh.findWall(edge.gx, edge.gy, edge.edge);
          if (existing) {
            this.veh.setWall(edge.gx, edge.gy, edge.edge, null); // remove
          } else {
            this.veh.setWall(edge.gx, edge.gy, edge.edge, "wall");
            this._wallDrag = true; // enable drag-draw
          }
        }
        if (this.onUpdate) this.onUpdate();
      }
      this.draw();
      return;
    }

    // Paint mode
    if (this.mode === "paint" && this.activeSysId) {
      this.painting = true;
      if (this.veh.paintCell(this.activeSysId, gx, gy)) {
        if (this.onUpdate) this.onUpdate();
      }
      this.draw();
      return;
    }

    // Select mode — click a cell to select it, start drag
    if (this.mode === "select") {
      const sys = this.veh.cellAt(gx, gy);
      if (sys) {
        this.selectedCell = { gx, gy, sysId: sys.id };
        this._cellDrag = { fromGx: gx, fromGy: gy, toGx: gx, toGy: gy, sysId: sys.id };
        this.canvas.style.cursor = "grabbing";
      } else {
        this.selectedCell = null;
        this._cellDrag = null;
      }
      // Blur any focused input so keyboard Delete reaches the canvas handler
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      this.draw();
      if (this.onUpdate) this.onUpdate();
    }
  }

  _onMouseUp(ev) {
    if (ev.button === 2 || ev.button === 1) { this.panStart = null; if (this.onViewChange) this.onViewChange(); return; }
    if (this._silDrag) {
      this._silDrag = null;
      this.canvas.style.cursor = "default";
      if (this.onUpdate) this.onUpdate();
    }
    // Finalize cell drag
    if (this._cellDrag) {
      const d = this._cellDrag;
      if (d.fromGx !== d.toGx || d.fromGy !== d.toGy) {
        // Only move if target is empty
        if (!this.veh.cellAt(d.toGx, d.toGy)) {
          this.veh.unpaintCell(d.fromGx, d.fromGy);
          this.veh.paintCell(d.sysId, d.toGx, d.toGy);
          this.selectedCell = { gx: d.toGx, gy: d.toGy, sysId: d.sysId };
        }
      }
      this._cellDrag = null;
      this.canvas.style.cursor = "default";
      this.draw();
      if (this.onUpdate) this.onUpdate();
    }
    this.painting = false;
    this._wallDrag = null;
  }

  _onWheel(ev) {
    if (!this.wheelZoom) return;
    ev.preventDefault();
    const { cx, cy } = this._canvasPos(ev);
    const oldZoom = this.zoom;
    this.zoom = Math.max(0.25, Math.min(4, this.zoom * (ev.deltaY < 0 ? 1.12 : 0.89)));
    if (this.zoom === oldZoom) return;
    const ratio = this.zoom / oldZoom;
    this.panX = cx - (cx - this.panX) * ratio;
    this.panY = cy - (cy - this.panY) * ratio;
    this.draw();
    if (this.onViewChange) this.onViewChange();
  }

  _onKey(ev) {
    if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
    if (ev.key === "Escape") {
      this.setMode("select");
      this.activeSysId = null;
      this.selectedCell = null;
      this.draw();
      if (this.onUpdate) this.onUpdate();
    }
    if ((ev.key === "Delete" || ev.key === "Backspace") && this.mode === "select" && this.selectedCell && !this.locked) {
      ev.preventDefault();
      this.veh.unpaintCell(this.selectedCell.gx, this.selectedCell.gy);
      this.selectedCell = null;
      this.draw();
      if (this.onUpdate) this.onUpdate();
    }
  }

  _onDblClick(ev) {
    if (this.mode !== "select" || this.locked) return;
    const { cx, cy } = this._canvasPos(ev);
    const { gx, gy } = this._cssToGrid(cx, cy);
    const result = this.veh.cellObjAt(gx, gy);
    if (!result) return;
    ev.preventDefault();
    this._showCellLabelEditor(result.cell, gx, gy);
  }

  // ---- Touch support ----

  _touchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return { cx: touch.clientX - rect.left, cy: touch.clientY - rect.top };
  }

  _pinchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _pinchCenter(t1, t2) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      cx: (t1.clientX + t2.clientX) / 2 - rect.left,
      cy: (t1.clientY + t2.clientY) / 2 - rect.top
    };
  }

  _onTouchStart(ev) {
    ev.preventDefault();
    const ts = this._touchState;
    const touches = ev.touches;
    ts.fingers = touches.length;
    clearTimeout(ts.longTimer);

    if (touches.length === 2) {
      // Two fingers: start pinch-zoom / pan
      this.painting = false;
      this._cellDrag = null;
      this._silDrag = null;
      ts.pinchDist = this._pinchDist(touches[0], touches[1]);
      const mid = this._pinchCenter(touches[0], touches[1]);
      ts.panCx = mid.cx; ts.panCy = mid.cy;
      ts.panStartX = this.panX; ts.panStartY = this.panY;
      ts.zoomStart = this.zoom;
      return;
    }

    if (touches.length !== 1) return;

    const { cx, cy } = this._touchPos(touches[0]);
    const { gx, gy } = this._cssToGrid(cx, cy);
    ts.startCx = cx; ts.startCy = cy;
    ts.startGx = gx; ts.startGy = gy;
    ts.moved = false;
    ts.startTime = Date.now();

    if (this.locked) return; // Lock: allow pinch-zoom but block single-finger editing

    // Long-press timer for label edit (500ms)
    if (this.mode === "select") {
      ts.longTimer = setTimeout(() => {
        if (!ts.moved) {
          const result = this.veh.cellObjAt(gx, gy);
          if (result) {
            ts.longFired = true;
            this._showCellLabelEditor(result.cell, gx, gy);
          }
        }
      }, 500);
    }
    ts.longFired = false;

    // Sil mode: start drag
    if (this.mode === "sil" && this.veh.silhouette && this._silImg) {
      const hit = this._silhouetteHitTest(cx, cy);
      if (hit) {
        const sil = this.veh.silhouette;
        this._silDrag = {
          type: hit,
          startCx: cx, startCy: cy,
          origGx: sil.gx, origGy: sil.gy,
          origGw: sil.gw, origGh: sil.gh
        };
        return;
      }
    }
  }

  _onTouchMove(ev) {
    ev.preventDefault();
    const ts = this._touchState;
    const touches = ev.touches;

    // Two-finger: pinch-zoom + pan
    if (touches.length === 2 && ts.fingers >= 2) {
      const newDist = this._pinchDist(touches[0], touches[1]);
      const mid = this._pinchCenter(touches[0], touches[1]);
      const scale = newDist / (ts.pinchDist || 1);
      const newZoom = Math.max(0.25, Math.min(4, ts.zoomStart * scale));
      const ratio = newZoom / ts.zoomStart;
      this.zoom = newZoom;
      // Pan follows pinch center
      this.panX = ts.panStartX + (mid.cx - ts.panCx) - (ts.panCx - ts.panStartX) * (ratio - 1);
      this.panY = ts.panStartY + (mid.cy - ts.panCy) - (ts.panCy - ts.panStartY) * (ratio - 1);
      this.draw();
      return;
    }

    if (touches.length !== 1) return;
    const { cx, cy } = this._touchPos(touches[0]);
    const dx = cx - ts.startCx;
    const dy = cy - ts.startCy;

    // If finger moved more than 8px, it's a drag not a tap
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      ts.moved = true;
      clearTimeout(ts.longTimer);
    }

    // Sil drag
    if (this._silDrag) {
      const cell = CELL_PX * this.zoom;
      const ddx = (cx - this._silDrag.startCx) / cell;
      const ddy = (cy - this._silDrag.startCy) / cell;
      const sil = this.veh.silhouette;
      if (this._silDrag.type === "move") {
        sil.gx = Math.round((this._silDrag.origGx + ddx) * 2) / 2;
        sil.gy = Math.round((this._silDrag.origGy + ddy) * 2) / 2;
      } else if (this._silDrag.type === "resize") {
        sil.gw = Math.max(1, Math.round((this._silDrag.origGw + ddx) * 2) / 2);
        sil.gh = Math.max(1, Math.round((this._silDrag.origGh + ddy) * 2) / 2);
      }
      this.draw();
      if (this.onUpdate) this.onUpdate();
      return;
    }

    // If moved, treat as pan (single finger pan in all modes when dragging)
    if (ts.moved) {
      this.panX = (this._touchPanStartX ?? this.panX) + dx;
      this.panY = (this._touchPanStartY ?? this.panY) + dy;
      if (this._touchPanStartX === undefined) {
        this._touchPanStartX = this.panX - dx;
        this._touchPanStartY = this.panY - dy;
      }
      this.draw();
    }
  }

  _onTouchEnd(ev) {
    ev.preventDefault();
    const ts = this._touchState;
    clearTimeout(ts.longTimer);

    // Finalize sil drag
    if (this._silDrag) {
      this._silDrag = null;
      if (this.onUpdate) this.onUpdate();
    }

    // Clean up pan state
    delete this._touchPanStartX;
    delete this._touchPanStartY;

    // If long-press fired, skip tap logic
    if (ts.longFired) { ts.fingers = 0; return; }

    // If it was a multi-finger gesture or finger moved, skip tap
    if (ts.fingers > 1 || ts.moved) { ts.fingers = 0; if (this.onViewChange) this.onViewChange(); return; }

    // Single finger tap (no drag)
    if (ev.touches.length === 0 && !ts.moved && !this.locked) {
      const gx = ts.startGx;
      const gy = ts.startGy;

      if (this.mode === "paint" && this.activeSysId) {
        // Tap to paint — toggle: if occupied by same system, unpaint; else paint
        const existing = this.veh.cellAt(gx, gy);
        if (existing && existing.id === this.activeSysId) {
          this.veh.unpaintCell(gx, gy);
        } else if (!existing) {
          this.veh.paintCell(this.activeSysId, gx, gy);
        }
        this.draw();
        if (this.onUpdate) this.onUpdate();
      } else if (this.mode === "select") {
        const existing = this.veh.cellAt(gx, gy);
        if (this.selectedCell && !existing) {
          // Second tap on empty cell: move selected cell here
          const sc = this.selectedCell;
          this.veh.unpaintCell(sc.gx, sc.gy);
          this.veh.paintCell(sc.sysId, gx, gy);
          this.selectedCell = { gx, gy, sysId: sc.sysId };
          this.draw();
          if (this.onUpdate) this.onUpdate();
        } else if (existing) {
          // Tap on occupied cell: select it
          this.selectedCell = { gx, gy, sysId: existing.id };
          this.draw();
          if (this.onUpdate) this.onUpdate();
        } else {
          // Tap on empty with nothing selected: deselect
          this.selectedCell = null;
          this.draw();
        }
      } else if (this.mode === "wall") {
        // Tap to toggle wall on nearest edge
        const edge = this._nearestEdge(ts.startCx, ts.startCy);
        if (edge) {
          this.veh.toggleWall(edge.gx, edge.gy, edge.edge);
          this.draw();
          if (this.onUpdate) this.onUpdate();
        }
      }
    }
    ts.fingers = 0;
  }

  // Public method for toolbar Delete button
  deleteSelectedCell() {
    if (!this.selectedCell) return false;
    this.veh.unpaintCell(this.selectedCell.gx, this.selectedCell.gy);
    this.selectedCell = null;
    this.draw();
    if (this.onUpdate) this.onUpdate();
    return true;
  }

  highlightSystem(sysId, duration) {
    clearTimeout(this._highlightTimer);
    this.highlightSysId = sysId;
    this.draw();
    this._highlightTimer = setTimeout(() => {
      this.highlightSysId = null;
      this.draw();
    }, duration || 2000);
  }

  // Total placed cells across all systems + remaining
  get totalPlacedCells() {
    let n = 0;
    for (const sys of this.veh.systems) n += sys.cells.length;
    n += this.veh.getRemainingSys().cells.length;
    return n;
  }

  _showCellLabelEditor(cellObj, gx, gy) {
    // Position an input over the cell
    const cell = CELL_PX * this.zoom;
    const rect = this.canvas.getBoundingClientRect();
    const x = rect.left + this.panX + gx * cell;
    const y = rect.top + gy * cell + this.panY;

    const inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 4;
    inp.value = cellObj.label || "";
    inp.placeholder = "??";
    inp.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${cell}px;height:${cell}px;`
      + `font-family:'Bitter',serif;font-size:${Math.max(9, cell * 0.4)}px;font-weight:bold;`
      + `text-align:center;border:2px solid #c05a00;border-radius:2px;background:#fff;`
      + `color:#1a2a3a;outline:none;z-index:9999;padding:0;box-sizing:border-box;`;
    document.body.appendChild(inp);
    inp.focus();
    inp.select();

    const commit = () => {
      cellObj.label = inp.value.trim() || undefined;
      if (inp.parentNode) inp.parentNode.removeChild(inp);
      this.draw();
      if (this.onUpdate) this.onUpdate();
    };

    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { if (inp.parentNode) inp.parentNode.removeChild(inp); }
    });
    inp.addEventListener("blur", commit);
  }

  zoomIn() { this._zoomBy(1.25); }
  zoomOut() { this._zoomBy(0.8); }
  resetView() { this.zoom = 1; this.panX = 40; this.panY = 40; this.draw(); if (this.onViewChange) this.onViewChange(); }

  _zoomBy(factor) {
    const cx = this.wrap.clientWidth / 2;
    const cy = this.wrap.clientHeight / 2;
    const oldZoom = this.zoom;
    this.zoom = Math.max(0.25, Math.min(4, this.zoom * factor));
    const ratio = this.zoom / oldZoom;
    this.panX = cx - (cx - this.panX) * ratio;
    this.panY = cy - (cy - this.panY) * ratio;
    this.draw();
    if (this.onViewChange) this.onViewChange();
  }

  // ---- Silhouette ----
  loadSilhouette(dataUrl, gw, gh) {
    const sil = this.veh.silhouette || {};
    sil.data = dataUrl;
    sil.gx = sil.gx || 0;
    sil.gy = sil.gy || 0;
    sil.gw = gw || 10;
    sil.gh = gh || 8;
    sil.rot = sil.rot || 0;
    this.veh.silhouette = sil;
    this._silImg = new Image();
    this._silTinted = null;
    this._silImg.onload = () => this.draw();
    this._silImg.src = dataUrl;
  }

  clearSilhouette() {
    this.veh.silhouette = null;
    this._silImg = null;
    this._silTinted = null;
    this._silDrag = null;
    this.draw();
  }

  _ensureSilImage() {
    if (this.veh.silhouette && this.veh.silhouette.data && !this._silImg) {
      this._silImg = new Image();
      this._silImg.onload = () => this.draw();
      this._silImg.src = this.veh.silhouette.data;
    }
  }

  _silhouetteHitTest(cx, cy) {
    const sil = this.veh.silhouette;
    if (!sil || !this._silImg) return "";
    const cell = CELL_PX * this.zoom;
    const sx = this.panX + sil.gx * cell;
    const sy = this.panY + sil.gy * cell;
    const sw = sil.gw * cell;
    const sh = sil.gh * cell;
    const rot = (sil.rot || 0) * Math.PI / 180;
    // Transform click into silhouette's rotated local space
    const midX = sx + sw / 2;
    const midY = sy + sh / 2;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const dx = cx - midX;
    const dy = cy - midY;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    // Resize handle: 8px square at bottom-right corner in local space
    const hSize = 8;
    if (lx >= sw / 2 - hSize && lx <= sw / 2 + hSize && ly >= sh / 2 - hSize && ly <= sh / 2 + hSize) return "resize";
    // Move: anywhere inside in local space
    if (lx >= -sw / 2 && lx <= sw / 2 && ly >= -sh / 2 && ly <= sh / 2) return "move";
    return "";
  }

  // ---- Wall rendering helpers ----

  _edgeCoords(gx, gy, edge, ox, oy, cell) {
    // "t" edge: top of cell (gx,gy) = horizontal line at y
    // "l" edge: left of cell (gx,gy) = vertical line at x
    if (edge === "t") {
      return { x1: ox + gx * cell, y1: oy + gy * cell, x2: ox + (gx + 1) * cell, y2: oy + gy * cell };
    }
    // "l"
    return { x1: ox + gx * cell, y1: oy + gy * cell, x2: ox + gx * cell, y2: oy + (gy + 1) * cell };
  }

  _drawWalls(ctx, ox, oy, cell, dpr) {
    if (!this.veh.walls.length) return;
    ctx.save();
    for (const w of this.veh.walls) {
      const { x1, y1, x2, y2 } = this._edgeCoords(w.gx, w.gy, w.edge, ox, oy, cell);
      if (w.type === "wall") {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 3 * dpr;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      } else if (w.type === "door") {
        // Door: gap in the middle third, arc symbol
        const dx = x2 - x1, dy = y2 - y1;
        const g1x = x1 + dx * 0.3, g1y = y1 + dy * 0.3;
        const g2x = x1 + dx * 0.7, g2y = y1 + dy * 0.7;
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 3 * dpr;
        ctx.setLineDash([]);
        // Wall segments on each side of gap
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(g1x, g1y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(g2x, g2y); ctx.lineTo(x2, y2); ctx.stroke();
        // Door arc: quarter-circle from hinge at g1 sweeping to open position
        const arcR = Math.sqrt((g2x - g1x) ** 2 + (g2y - g1y) ** 2);
        ctx.strokeStyle = "#c05a00";
        ctx.lineWidth = 1.5 * dpr;
        const baseAngle = Math.atan2(g2y - g1y, g2x - g1x);
        // Perpendicular direction (into the cell)
        const isHoriz = (w.edge === "t");
        const sweepDir = isHoriz ? 1 : -1;
        ctx.beginPath();
        ctx.arc(g1x, g1y, arcR, baseAngle, baseAngle + sweepDir * Math.PI / 2, sweepDir < 0);
        ctx.stroke();
        // Small line for door leaf
        ctx.beginPath(); ctx.moveTo(g1x, g1y); ctx.lineTo(g2x, g2y); ctx.stroke();
      } else if (w.type === "hatch") {
        // Hatch: dashed line with X marks
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]);
        // Small X at midpoint
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const xSize = 3 * dpr;
        ctx.strokeStyle = "#c05a00";
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(mx - xSize, my - xSize); ctx.lineTo(mx + xSize, my + xSize);
        ctx.moveTo(mx + xSize, my - xSize); ctx.lineTo(mx - xSize, my + xSize);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---- Drawing ----

  draw() {
    this._ensureSilImage();
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cell = CELL_PX * this.zoom * dpr;
    const ox = this.panX * dpr;
    const oy = this.panY * dpr;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Silhouette overlay (behind grid)
    const sil = this.veh.silhouette;
    if (sil && this._silImg && this._silImg.complete) {
      // Build/cache tinted version
      const tintColor = sil.color || "#4a7a9a";
      if (!this._silTinted || this._silTintColor !== tintColor) {
        const iw = this._silImg.naturalWidth;
        const ih = this._silImg.naturalHeight;
        const oc = document.createElement("canvas");
        oc.width = iw; oc.height = ih;
        const octx = oc.getContext("2d");
        // Draw original image
        octx.drawImage(this._silImg, 0, 0, iw, ih);
        // Detect if image has transparency by sampling corners
        const id = octx.getImageData(0, 0, iw, ih);
        let hasAlpha = false;
        for (let p = 3; p < id.data.length; p += 4) {
          if (id.data[p] < 250) { hasAlpha = true; break; }
        }
        if (hasAlpha) {
          // Transparent PNG: source-in preserves shape alpha
          octx.globalCompositeOperation = "source-in";
          octx.fillStyle = tintColor;
          octx.fillRect(0, 0, iw, ih);
        } else {
          // Opaque image: convert dark pixels to tint color
          // Use luminance as alpha, fill with tint
          const r = parseInt(tintColor.slice(1,3), 16);
          const g = parseInt(tintColor.slice(3,5), 16);
          const b = parseInt(tintColor.slice(5,7), 16);
          for (let p = 0; p < id.data.length; p += 4) {
            const lum = (id.data[p] * 0.299 + id.data[p+1] * 0.587 + id.data[p+2] * 0.114);
            const alpha = 255 - lum; // dark=opaque, white=transparent
            id.data[p] = r;
            id.data[p+1] = g;
            id.data[p+2] = b;
            id.data[p+3] = alpha;
          }
          octx.putImageData(id, 0, 0);
        }
        this._silTinted = oc;
        this._silTintColor = tintColor;
      }
      const sx = ox + sil.gx * cell;
      const sy = oy + sil.gy * cell;
      const sw = sil.gw * cell;
      const sh = sil.gh * cell;
      const rot = (sil.rot || 0) * Math.PI / 180;
      const cx2 = sx + sw / 2;
      const cy2 = sy + sh / 2;
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.rotate(rot);
      ctx.globalAlpha = sil.alpha != null ? sil.alpha : 0.25;
      ctx.drawImage(this._silTinted, -sw / 2, -sh / 2, sw, sh);
      ctx.globalAlpha = 1;
      // Border
      ctx.strokeStyle = "#00000030";
      ctx.lineWidth = 1;
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
      ctx.setLineDash([]);
      // Resize handle (bottom-right corner)
      const hSize = 6 * dpr;
      ctx.fillStyle = "#00000040";
      ctx.fillRect(sw / 2 - hSize, sh / 2 - hSize, hSize * 2, hSize * 2);
      ctx.restore();
    }

    const startGx = Math.floor(-ox / cell);
    const endGx = Math.ceil((W - ox) / cell);
    const startGy = Math.floor(-oy / cell);
    const endGy = Math.ceil((H - oy) / cell);

    // Grid
    for (let gx = startGx; gx <= endGx; gx++) {
      const isOrigin = gx === 0;
      const isHeavy = gx % 2 === 0;
      ctx.strokeStyle = isOrigin ? "#d4820a" : isHeavy ? "#aaaaaa" : "#dddddd";
      ctx.lineWidth = isOrigin ? 2 : isHeavy ? 1 : 0.4;
      const x = ox + gx * cell;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let gy = startGy; gy <= endGy; gy++) {
      const isOrigin = gy === 0;
      const isHeavy = gy % 2 === 0;
      ctx.strokeStyle = isOrigin ? "#d4820a" : isHeavy ? "#aaaaaa" : "#dddddd";
      ctx.lineWidth = isOrigin ? 2 : isHeavy ? 1 : 0.4;
      const y = oy + gy * cell;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Feet labels
    const labelSize = Math.max(8, Math.round(9 * this.zoom * dpr));
    ctx.fillStyle = "#999999";
    ctx.font = `${labelSize}px monospace`;
    ctx.textBaseline = "top";
    for (let gx = 0; gx <= endGx; gx += 2) {
      const x = ox + gx * cell;
      const feet = (gx / 2) * 5;
      if (x > 0 && x < W) ctx.fillText(`${feet}'`, x + 3, 3);
    }
    ctx.textBaseline = "middle";
    for (let gy = 2; gy <= endGy; gy += 2) {
      const y = oy + gy * cell;
      const feet = (gy / 2) * 5;
      if (y > 0 && y < H) ctx.fillText(`${feet}'`, 3, y + 2);
    }
    ctx.textBaseline = "alphabetic";

    // Painted cells (including remaining system)
    const allSystems = [...this.veh.systems, this.veh.getRemainingSys()];
    for (const sys of allSystems) {
      const color = MP.sysColor(sys.desc);
      const isSeat = MP.isSeatSystem(sys.desc);
      const isActive = sys.id === this.activeSysId;
      for (const c of sys.cells) {
        const x = ox + c.gx * cell;
        const y = oy + c.gy * cell;
        if (isSeat) {
          // Seat: light tinted background with colored symbol
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = color;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          ctx.globalAlpha = 0.9;
          // Draw seat shape: rounded rect body
          const pad = cell * 0.2;
          const sW = cell - pad * 2;
          const sH = cell - pad * 2;
          const sx = x + pad;
          const sy = y + pad + sH * 0.15;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(sx, sy, sW, sH * 0.7, 2);
          ctx.fill();
          // Backrest
          ctx.beginPath();
          ctx.roundRect(sx, y + pad, sW, sH * 0.25, 2);
          ctx.fill();
        } else {
          // Standard system: solid fill
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = color;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isActive ? "#f4d03f" : "#00000044";
        ctx.lineWidth = isActive ? 2 : 0.5;
        ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        // Label: per-cell label overrides default, show on all cells including seats
        if (cell / dpr > 16 && !sys.hideLabels) {
          const lbl = c.label || MP.sysLabel(sys.desc);
          if (lbl) {
            const fs = Math.max(7, Math.min(11, (cell / dpr) * 0.35)) * dpr;
            ctx.font = `bold ${fs}px sans-serif`;
            ctx.fillStyle = isSeat ? "#000000aa" : "#ffffffdd";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(lbl, x + cell / 2, y + cell / 2 + (isSeat ? cell * 0.05 : 0));
          }
        }
      }
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // ---- Walls ----
    this._drawWalls(ctx, ox, oy, cell, dpr);

    // Wall mode: hover edge preview
    if (this.mode === "wall" && this._hoverEdge) {
      const e = this._hoverEdge;
      const n = Vehicle._normEdge(e.gx, e.gy, e.edge);
      const existing = this.veh.findWall(e.gx, e.gy, e.edge);
      ctx.save();
      ctx.strokeStyle = existing ? "#ef4444" : "#c05a00";
      ctx.lineWidth = 3 * dpr;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      const { x1, y1, x2, y2 } = this._edgeCoords(n.gx, n.gy, n.edge, ox, oy, cell);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Highlight system overlay (bright outline on all cells of highlighted system)
    if (this.highlightSysId) {
      const hlSys = this.veh.findSystem(this.highlightSysId);
      if (hlSys && hlSys.cells.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#f4d03f";
        ctx.lineWidth = 3;
        ctx.setLineDash([4 * dpr, 3 * dpr]);
        ctx.shadowColor = "#f4d03f";
        ctx.shadowBlur = 6 * dpr;
        for (const c of hlSys.cells) {
          const x = ox + c.gx * cell;
          const y = oy + c.gy * cell;
          ctx.strokeRect(x, y, cell, cell);
        }
        ctx.restore();
      }
    }

    // Hover ghost in paint mode
    if (this.mode === "paint" && this.activeSysId && this.hoverGx !== null) {
      const sys = this.veh.findSystem(this.activeSysId);
      const canPaint = sys && (this.activeSysId === "remaining"
        ? this.veh.remainingSpaces > 0
        : sys.cells.length < sys.spaces);
      if (canPaint && !this.veh.cellAt(this.hoverGx, this.hoverGy)) {
        const color = MP.sysColor(sys.desc);
        const x = ox + this.hoverGx * cell;
        const y = oy + this.hoverGy * cell;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.strokeStyle = "#f4d03f";
        ctx.lineWidth = 2;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    // Selected cell highlight (Select mode, Delete to remove)
    if (this.selectedCell && this.mode === "select") {
      const x = ox + this.selectedCell.gx * cell;
      const y = oy + this.selectedCell.gy * cell;
      ctx.strokeStyle = "#f4d03f";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cell, cell);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.strokeRect(x, y, cell, cell);
      ctx.setLineDash([]);
    }

    // Cell drag ghost
    if (this._cellDrag && (this._cellDrag.fromGx !== this._cellDrag.toGx || this._cellDrag.fromGy !== this._cellDrag.toGy)) {
      const sys = this.veh.findSystem(this._cellDrag.sysId);
      const color = sys ? MP.sysColor(sys.desc) : "#707070";
      const tx = ox + this._cellDrag.toGx * cell;
      const ty = oy + this._cellDrag.toGy * cell;
      const occupied = this.veh.cellAt(this._cellDrag.toGx, this._cellDrag.toGy);
      if (!occupied) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(tx + 1, ty + 1, cell - 2, cell - 2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#f4d03f";
        ctx.lineWidth = 2;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.strokeRect(tx + 1, ty + 1, cell - 2, cell - 2);
        ctx.setLineDash([]);
      } else {
        // Can't drop here — red X
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(tx + 1, ty + 1, cell - 2, cell - 2);
        ctx.beginPath();
        ctx.moveTo(tx + 4, ty + 4); ctx.lineTo(tx + cell - 4, ty + cell - 4);
        ctx.moveTo(tx + cell - 4, ty + 4); ctx.lineTo(tx + 4, ty + cell - 4);
        ctx.stroke();
      }
    }

    // Locked badge overlay
    if (this.locked) {
      const bw = 70 * dpr, bh = 22 * dpr, bx = W - bw - 8 * dpr, by = 8 * dpr;
      ctx.fillStyle = "rgba(180,100,20,0.7)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4 * dpr);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u{1F512} LOCKED", bx + bw / 2, by + bh / 2);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }
  }

  toImage(maxWidth) {
    let allCells = [];
    const allSys = [...this.veh.systems, this.veh.getRemainingSys()];
    for (const sys of allSys) allCells.push(...sys.cells.map(c => ({ ...c, sys })));
    if (!allCells.length) return null;
    let minGx = Infinity, minGy = Infinity, maxGx = -Infinity, maxGy = -Infinity;
    for (const c of allCells) {
      minGx = Math.min(minGx, c.gx); minGy = Math.min(minGy, c.gy);
      maxGx = Math.max(maxGx, c.gx + 1); maxGy = Math.max(maxGy, c.gy + 1);
    }
    const gw = maxGx - minGx;
    const gh = maxGy - minGy;
    const cellPx = maxWidth ? Math.min(28, Math.floor(maxWidth / gw)) : 28;
    const w = gw * cellPx + 2;
    const h = gh * cellPx + 2;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x <= gw; x++) {
      ctx.strokeStyle = x % 2 === 0 ? "#aaaaaa" : "#dddddd";
      ctx.lineWidth = x % 2 === 0 ? 1 : 0.4;
      ctx.beginPath(); ctx.moveTo(x * cellPx + 1, 0); ctx.lineTo(x * cellPx + 1, h); ctx.stroke();
    }
    for (let y = 0; y <= gh; y++) {
      ctx.strokeStyle = y % 2 === 0 ? "#aaaaaa" : "#dddddd";
      ctx.lineWidth = y % 2 === 0 ? 1 : 0.4;
      ctx.beginPath(); ctx.moveTo(0, y * cellPx + 1); ctx.lineTo(w, y * cellPx + 1); ctx.stroke();
    }
    for (const cc of allCells) {
      const color = MP.sysColor(cc.sys.desc);
      const isSeat = MP.isSeatSystem(cc.sys.desc);
      const sx = (cc.gx - minGx) * cellPx + 1;
      const sy = (cc.gy - minGy) * cellPx + 1;
      if (isSeat) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = color;
        ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
        ctx.globalAlpha = 0.9;
        const pad = cellPx * 0.2;
        const sW = cellPx - pad * 2;
        const sH = cellPx - pad * 2;
        const bx = sx + pad;
        const by = sy + pad + sH * 0.15;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(bx, by, sW, sH * 0.7, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(bx, sy + pad, sW, sH * 0.25, 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = color;
        ctx.fillRect(sx + 1, sy + 1, cellPx - 2, cellPx - 2);
      }
      ctx.globalAlpha = 1;
      // Per-cell label or default
      if (cellPx > 14 && !cc.sys.hideLabels) {
        const lbl = cc.label || MP.sysLabel(cc.sys.desc);
        if (lbl) {
          ctx.font = `bold ${Math.max(7, Math.min(11, cellPx * 0.35))}px sans-serif`;
          ctx.fillStyle = isSeat ? "#000000aa" : "#ffffffdd";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(lbl, sx + cellPx / 2, sy + cellPx / 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    // Walls on exported image
    if (this.veh.walls.length) {
      const imgOx = 1, imgOy = 1;
      for (const wd of this.veh.walls) {
        const wgx = wd.gx - minGx, wgy = wd.gy - minGy;
        let wx1, wy1, wx2, wy2;
        if (wd.edge === "t") {
          wx1 = imgOx + wgx * cellPx; wy1 = imgOy + wgy * cellPx;
          wx2 = imgOx + (wgx + 1) * cellPx; wy2 = wy1;
        } else {
          wx1 = imgOx + wgx * cellPx; wy1 = imgOy + wgy * cellPx;
          wx2 = wx1; wy2 = imgOy + (wgy + 1) * cellPx;
        }
        if (wd.type === "wall") {
          ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.5; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(wx1, wy1); ctx.lineTo(wx2, wy2); ctx.stroke();
        } else if (wd.type === "door") {
          const ddx = wx2 - wx1, ddy = wy2 - wy1;
          const dg1x = wx1 + ddx * 0.3, dg1y = wy1 + ddy * 0.3;
          const dg2x = wx1 + ddx * 0.7, dg2y = wy1 + ddy * 0.7;
          ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.5; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(wx1, wy1); ctx.lineTo(dg1x, dg1y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(dg2x, dg2y); ctx.lineTo(wx2, wy2); ctx.stroke();
          const arcR = Math.sqrt((dg2x - dg1x) ** 2 + (dg2y - dg1y) ** 2);
          ctx.strokeStyle = "#c05a00"; ctx.lineWidth = 1;
          const baseA = Math.atan2(dg2y - dg1y, dg2x - dg1x);
          const sweepD = (wd.edge === "t") ? 1 : -1;
          ctx.beginPath(); ctx.arc(dg1x, dg1y, arcR, baseA, baseA + sweepD * Math.PI / 2, sweepD < 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(dg1x, dg1y); ctx.lineTo(dg2x, dg2y); ctx.stroke();
        } else if (wd.type === "hatch") {
          ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(wx1, wy1); ctx.lineTo(wx2, wy2); ctx.stroke();
          ctx.setLineDash([]);
          const hmx = (wx1 + wx2) / 2, hmy = (wy1 + wy2) / 2;
          ctx.strokeStyle = "#c05a00"; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hmx - 2, hmy - 2); ctx.lineTo(hmx + 2, hmy + 2);
          ctx.moveTo(hmx + 2, hmy - 2); ctx.lineTo(hmx - 2, hmy + 2);
          ctx.stroke();
        }
      }
    }
    return c;
  }
}
