/* ============================================================
   CSTATICS BRASIL — Prancheta tática (editor)
   Modelo de estado -> render SVG. Sem framework.
   Ferramentas: mover, jogador T/CT, smoke/flash/molotov/HE, seta, texto.
   Persistência: localStorage (autosave) + link compartilhável (#b=...).
   ============================================================ */
(function () {
  'use strict';

  const svg = document.getElementById('boardSvg');
  const surface = document.getElementById('bdSurface');
  const layer = document.getElementById('bdLayer');
  if (!svg || !surface || !layer) return;

  const NS = 'http://www.w3.org/2000/svg';
  const readJSON = (id, fallback) => {
    const node = document.getElementById(id);
    try { return JSON.parse(node.textContent); } catch (_) { return fallback; }
  };
  const GEO = readJSON('mapgeo-data', {});
  const MAPS = (readJSON('maps-data', { maps: [] }).maps || readJSON('maps-data', []) || [])
    .filter((m) => m && m.active && GEO[m.slug]);

  // glyph = codepoint do Font Awesome 6 (renderizado como fonte no <text> do SVG)
  const UTIL = {
    smoke:   { color: '#cbd5e1', glyph: '', name: 'Smoke' },
    flash:   { color: '#ffe08a', glyph: '', name: 'Flash' },
    molotov: { color: '#ff6a2c', glyph: '', name: 'Molotov' },
    he:      { color: '#ff5449', glyph: '', name: 'HE' }
  };
  const UTIL_TOOLS = ['smoke', 'flash', 'molotov', 'he'];
  const STORE_KEY = 'cstatics-board-v1';

  if (!MAPS.length) return;

  let state = { map: MAPS[0].slug, els: [] };
  let sel = null;
  let tool = 'select';
  let uid = 1;
  let undoStack = [];
  let redoStack = [];
  let drag = null;

  /* ---------- utilidades ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const nextId = () => 'e' + (uid++);
  const round = (n) => Math.round(n * 10) / 10;
  const snapshot = () => ({ map: state.map, els: clone(state.els) });

  function el(tag, attrs, kids) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (kids) kids.forEach((c) => n.appendChild(c));
    return n;
  }

  function textEl(str, attrs) {
    const t = el('text', attrs);
    t.textContent = str == null ? '' : String(str);
    return t;
  }

  /* ---------- histórico ---------- */
  function commit(prev) {
    undoStack.push(prev);
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
    save();
    updateUI();
  }

  function restore(target, stashInto) {
    stashInto.push(snapshot());
    state.map = target.map;
    state.els = target.els;
    sel = null;
    syncMapSelect();
    renderSurface();
    render();
    save();
    updateUI();
  }

  function undo() { if (undoStack.length) restore(undoStack.pop(), redoStack); }
  function redo() { if (redoStack.length) restore(redoStack.pop(), undoStack); }

  /* ---------- coordenadas tela -> SVG ---------- */
  function toSvg(evt) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const p = pt.matrixTransform(m.inverse());
    return { x: round(p.x), y: round(p.y) };
  }

  /* ---------- superfície do mapa ---------- */
  function renderSurface() {
    const g = GEO[state.map];
    surface.textContent = '';
    if (!g) return;
    svg.setAttribute('viewBox', g.viewBox || '0 0 400 300');
    (g.areas || []).forEach((a) => surface.appendChild(el('polygon', { points: a.points, class: 'bd-area' })));
    (g.links || []).forEach((l) => surface.appendChild(el('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: 'bd-link' })));
    (g.labels || []).forEach((s) => surface.appendChild(textEl(s.text, { x: s.x, y: s.y, class: 'bd-site' })));
    Object.keys(g.callouts || {}).forEach((k) => {
      const c = g.callouts[k];
      surface.appendChild(el('circle', { cx: c.x, cy: c.y, r: 1.5, class: 'bd-dot' }));
      // pula rótulos que duplicam as letras grandes de site (A / B)
      if (k !== 'a-site' && k !== 'b-site') {
        surface.appendChild(textEl(c.label, { x: c.x, y: c.y - 3.5, class: 'bd-callout' }));
      }
    });
  }

  /* ---------- elementos ---------- */
  // botão de excluir (aparece no item selecionado)
  function delBadge(cx, cy, id) {
    return el('g', { class: 'bd-del', 'data-del': id, transform: `translate(${cx} ${cy})` }, [
      el('circle', { r: 5.5, class: 'bd-del__bg' }),
      el('path', { d: 'M-2 -2 L2 2 M2 -2 L-2 2', class: 'bd-del__x' })
    ]);
  }

  function nodeFor(o) {
    let node;
    if (o.type === 'player') {
      node = el('g', { class: 'bd-el bd-player bd-player--' + o.side, transform: `translate(${o.x} ${o.y})`, 'data-id': o.id }, [
        el('circle', { r: 8.5, class: 'bd-player__disc' }),
        el('circle', { r: 8.5, class: 'bd-player__ring' }),
        textEl(o.label, { class: 'bd-player__label' }),
        textEl(o.side === 't' ? 'T' : 'CT', { y: 16, class: 'bd-player__side' })
      ]);
    } else if (o.type === 'util') {
      const u = UTIL[o.kind] || UTIL.smoke;
      node = el('g', { class: 'bd-el bd-util', transform: `translate(${o.x} ${o.y})`, 'data-id': o.id, style: '--fx:' + u.color }, [
        el('circle', { r: 15, class: 'bd-util__aoe' }),
        el('circle', { r: 9, class: 'bd-util__token' }),
        textEl(u.glyph, { class: 'bd-util__glyph' }),
        textEl(u.name, { y: 20, class: 'bd-util__name' })
      ]);
    } else if (o.type === 'arrow') {
      node = el('g', { class: 'bd-el bd-arrow', 'data-id': o.id }, [
        el('line', { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, class: 'bd-arrow__line', 'marker-end': 'url(#bdArrow)' }),
        el('line', { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, class: 'bd-arrow__hit' })
      ]);
    } else if (o.type === 'text') {
      node = el('g', { class: 'bd-el bd-text', transform: `translate(${o.x} ${o.y})`, 'data-id': o.id }, [
        textEl(o.text, { class: 'bd-text__t' })
      ]);
    } else {
      return null;
    }
    if (o.id === sel) {
      node.classList.add('is-selected');
      if (o.type === 'arrow') node.appendChild(delBadge(round((o.x1 + o.x2) / 2), round((o.y1 + o.y2) / 2), o.id));
      else node.appendChild(delBadge(13, -13, o.id));
    }
    return node;
  }

  function render() {
    layer.textContent = '';
    state.els.forEach((o) => {
      const n = nodeFor(o);
      if (n) layer.appendChild(n);
    });
    updateUI();
  }

  const find = (id) => state.els.find((o) => o.id === id);

  /* ---------- criação ---------- */
  function addPlayer(side, x, y) {
    const n = state.els.filter((o) => o.type === 'player' && o.side === side).length + 1;
    const o = { id: nextId(), type: 'player', side: side, x: x, y: y, label: String(n) };
    state.els.push(o);
    return o;
  }
  function addUtil(kind, x, y) {
    const o = { id: nextId(), type: 'util', kind: kind, x: x, y: y };
    state.els.push(o);
    return o;
  }

  /* ---------- ponteiro ---------- */
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;

    // clique no × de excluir tem prioridade sobre seleção/arraste
    const delHit = e.target.closest ? e.target.closest('.bd-del') : null;
    if (delHit) {
      const id = delHit.getAttribute('data-del');
      const prev = snapshot();
      state.els = state.els.filter((o) => o.id !== id);
      sel = null;
      commit(prev);
      render();
      return;
    }

    const p = toSvg(e);
    const hit = e.target.closest ? e.target.closest('.bd-el') : null;

    if (tool === 'select') {
      if (hit) {
        const id = hit.getAttribute('data-id');
        sel = id;
        render();
        const o = find(id);
        drag = { mode: 'move', id: id, prev: snapshot(), moved: false, ox: p.x, oy: p.y, start: clone(o) };
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      } else if (sel !== null) {
        sel = null;
        render();
      }
      return;
    }

    if (tool === 'arrow') {
      const prev = snapshot();
      const o = { id: nextId(), type: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y };
      state.els.push(o);
      sel = o.id;
      render();
      drag = { mode: 'arrow', id: o.id, prev: prev, moved: false };
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }

    // texto: modal estilizado (assíncrono)
    if (tool === 'text') {
      const pos = { x: p.x, y: p.y };
      askText(null).then((txt) => {
        if (txt == null) return;
        txt = txt.trim();
        if (!txt) return;
        const prev = snapshot();
        state.els.push({ id: nextId(), type: 'text', x: pos.x, y: pos.y, text: txt });
        commit(prev);
        render();
      });
      return;
    }

    // demais ferramentas de colocação:
    // o clique posiciona; se arrastar no mesmo gesto, reposiciona antes de soltar
    const prev = snapshot();
    let created = null;
    if (tool === 'player-t') created = addPlayer('t', p.x, p.y);
    else if (tool === 'player-ct') created = addPlayer('ct', p.x, p.y);
    else if (UTIL_TOOLS.indexOf(tool) >= 0) created = addUtil(tool, p.x, p.y);
    else return;
    sel = created.id;
    render();
    drag = { mode: 'move', id: created.id, prev: prev, moved: false, start: clone(created), ox: p.x, oy: p.y, placement: true };
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toSvg(e);
    const o = find(drag.id);
    if (!o) return;
    if (drag.mode === 'move') {
      const dx = p.x - drag.ox, dy = p.y - drag.oy;
      if (o.type === 'arrow') {
        o.x1 = round(drag.start.x1 + dx); o.y1 = round(drag.start.y1 + dy);
        o.x2 = round(drag.start.x2 + dx); o.y2 = round(drag.start.y2 + dy);
      } else {
        o.x = round(drag.start.x + dx); o.y = round(drag.start.y + dy);
      }
      drag.moved = true;
      render();
    } else if (drag.mode === 'arrow') {
      o.x2 = p.x; o.y2 = p.y;
      drag.moved = true;
      render();
    }
  });

  function endDrag(e) {
    if (!drag) return;
    if (drag.mode === 'arrow') {
      const o = find(drag.id);
      const len = o ? Math.hypot(o.x2 - o.x1, o.y2 - o.y1) : 0;
      if (len < 4) { state.els = state.els.filter((x) => x.id !== drag.id); sel = null; render(); }
      else commit(drag.prev);
    } else if (drag.mode === 'move' && (drag.placement || drag.moved)) {
      // colocação sempre registra; mover item existente só se moveu de fato
      commit(drag.prev);
    }
    if (e && e.pointerId != null) { try { svg.releasePointerCapture(e.pointerId); } catch (_) {} }
    drag = null;
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // editar texto
  svg.addEventListener('dblclick', (e) => {
    const hit = e.target.closest ? e.target.closest('.bd-text') : null;
    if (!hit) return;
    const o = find(hit.getAttribute('data-id'));
    if (!o) return;
    askText(o.text).then((t) => {
      if (t == null) return;
      const prev = snapshot();
      o.text = t.trim();
      commit(prev);
      render();
    });
  });

  /* ---------- teclado ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
      e.preventDefault();
      const prev = snapshot();
      state.els = state.els.filter((o) => o.id !== sel);
      sel = null;
      commit(prev);
      render();
    } else if (e.key === 'Escape') {
      if (sel) { sel = null; render(); }
    } else if ((e.ctrlKey || e.metaKey) && k === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if ((e.ctrlKey || e.metaKey) && k === 'y') {
      e.preventDefault();
      redo();
    } else if (k === 'v') {
      setTool('select');
    }
  });

  /* ---------- barra de ferramentas ---------- */
  function setTool(t) {
    tool = t;
    document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tool') === t));
    svg.style.cursor = t === 'select' ? 'default' : 'crosshair';
  }
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.getAttribute('data-tool'))));

  const btnUndo = document.getElementById('bdUndo');
  const btnRedo = document.getElementById('bdRedo');
  const btnClear = document.getElementById('bdClear');
  const btnShare = document.getElementById('bdShare');
  const counter = document.getElementById('bdCounter');
  const mapSel = document.getElementById('boardMap');

  if (btnUndo) btnUndo.onclick = undo;
  if (btnRedo) btnRedo.onclick = redo;
  if (btnClear) btnClear.onclick = () => {
    if (!state.els.length) return;
    askConfirm('Limpar toda a prancheta? Isso remove todos os itens colocados.').then((ok) => {
      if (!ok) return;
      const prev = snapshot();
      state.els = [];
      sel = null;
      commit(prev);
      render();
    });
  };

  // seletor de mapa
  MAPS.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.slug;
    opt.textContent = m.name;
    mapSel.appendChild(opt);
  });
  function syncMapSelect() { mapSel.value = state.map; }
  mapSel.addEventListener('change', () => {
    const prev = snapshot();
    state.map = mapSel.value;
    commit(prev);
    renderSurface();
    render();
  });

  /* ---------- contador + estado dos botões ---------- */
  function updateUI() {
    if (btnUndo) btnUndo.disabled = !undoStack.length;
    if (btnRedo) btnRedo.disabled = !redoStack.length;
    if (counter) {
      const t = state.els.filter((o) => o.type === 'player' && o.side === 't').length;
      const ct = state.els.filter((o) => o.type === 'player' && o.side === 'ct').length;
      const u = state.els.filter((o) => o.type === 'util').length;
      const a = state.els.filter((o) => o.type === 'arrow').length;
      counter.textContent = `T ${t} · CT ${ct} · Util ${u} · Setas ${a}`;
    }
  }

  /* ---------- persistência ---------- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ m: state.map, e: state.els })); } catch (_) {}
  }
  function loadStored() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && GEO[s.m] && Array.isArray(s.e)) return { map: s.m, els: s.e };
    } catch (_) {}
    return null;
  }

  /* ---------- compartilhar (link) ---------- */
  function b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(str) {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }
  function encodeState() { return b64urlEncode(JSON.stringify({ m: state.map, e: state.els })); }
  function decodeState(code) {
    try {
      const d = JSON.parse(b64urlDecode(code));
      if (d && GEO[d.m] && Array.isArray(d.e)) return { map: d.m, els: d.e };
    } catch (_) {}
    return null;
  }

  let toastTimer = null;
  function toast(msg) {
    const box = document.getElementById('bdToast');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
  }

  if (btnShare) btnShare.onclick = async () => {
    const url = location.origin + location.pathname + '#b=' + encodeState();
    try { history.replaceState(null, '', url); } catch (_) {}
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado — cole no chat do time.');
    } catch (_) {
      toast('Link pronto na barra de endereço.');
    }
  };

  /* ---------- modal estilizado (substitui prompt/confirm) ---------- */
  function openModal(opts) {
    return new Promise((resolve) => {
      const modal = document.getElementById('bdModal');
      const msg = document.getElementById('bdModalMsg');
      const input = document.getElementById('bdModalInput');
      const ok = document.getElementById('bdModalOk');
      const cancel = document.getElementById('bdModalCancel');
      if (!modal) { resolve(opts.withInput ? null : false); return; }

      msg.textContent = opts.msg || '';
      input.hidden = !opts.withInput;
      input.value = opts.initial || '';
      ok.textContent = opts.okLabel || 'OK';
      modal.hidden = false;

      const done = (val) => {
        modal.hidden = true;
        ok.onclick = null; cancel.onclick = null; modal.onpointerdown = null;
        document.removeEventListener('keydown', onKey, true);
        resolve(val);
      };
      const onKey = (ev) => {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(opts.withInput ? null : false); }
        else if (ev.key === 'Enter' && opts.withInput) { ev.preventDefault(); done(input.value); }
      };

      ok.onclick = () => done(opts.withInput ? input.value : true);
      cancel.onclick = () => done(opts.withInput ? null : false);
      modal.onpointerdown = (ev) => { if (ev.target === modal) done(opts.withInput ? null : false); };
      document.addEventListener('keydown', onKey, true);

      setTimeout(() => { if (opts.withInput) { input.focus(); input.select(); } else { ok.focus(); } }, 30);
    });
  }
  function askText(initial) {
    return openModal({ msg: initial != null ? 'Editar texto' : 'Adicionar texto', withInput: true, initial: initial || '', okLabel: initial != null ? 'Salvar' : 'Adicionar' });
  }
  function askConfirm(message) {
    return openModal({ msg: message, withInput: false, okLabel: 'Limpar' });
  }

  /* ---------- boot ---------- */
  function normalizeIds(els) {
    // reatribui ids para garantir unicidade e alimentar o contador uid
    return (els || []).map((o) => Object.assign({}, o, { id: nextId() }));
  }
  function boot() {
    let loaded = null;
    if (location.hash.indexOf('#b=') === 0) loaded = decodeState(location.hash.slice(3));
    if (!loaded) loaded = loadStored();
    if (loaded) {
      state.map = loaded.map;
      state.els = normalizeIds(loaded.els);
    }
    syncMapSelect();
    renderSurface();
    render();
    updateUI();
  }
  boot();
})();
