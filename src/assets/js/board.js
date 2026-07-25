/* ============================================================
   CSTATICS BRASIL — Prancheta tática (editor + animação por etapas)
   Modelo de estado -> render SVG. Sem framework.
   Ferramentas: mover, jogador T/CT, smoke/flash/molotov/HE, seta, texto.
   Etapas: cada etapa é um retrato da prancheta; Reproduzir interpola
   posições entre etapas (jogadores deslizam, utilitárias surgem/somem).
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

  // glyph = codepoint do Font Awesome 6 Solid (renderizado como fonte no <text> do SVG)
  const UTIL = {
    smoke:   { color: '#cbd5e1', glyph: '', name: 'Smoke' },
    flash:   { color: '#ffe08a', glyph: '', name: 'Flash' },
    molotov: { color: '#ff6a2c', glyph: '', name: 'Molotov' },
    he:      { color: '#ff5449', glyph: '', name: 'HE' }
  };
  const UTIL_TOOLS = ['smoke', 'flash', 'molotov', 'he'];
  const STORE_KEY = 'cstatics-board-v2';
  const SEG = 950;   // duração da transição entre etapas (ms)
  const HOLD = 260;  // pausa em cada etapa (ms)

  if (!MAPS.length) return;

  // steps: array de etapas; cada etapa é um array de elementos
  let state = { map: MAPS[0].slug, steps: [[]], cur: 0 };
  let sel = null;
  let tool = 'select';
  let uid = 1;
  let undoStack = [];
  let redoStack = [];
  let drag = null;
  let playing = false;
  let playRAF = null;
  let playReturn = 0;

  /* ---------- utilidades ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const nextId = () => 'e' + (uid++);
  const round = (n) => Math.round(n * 10) / 10;

  const E = () => state.steps[state.cur];           // elementos da etapa atual
  const setE = (arr) => { state.steps[state.cur] = arr; };
  const find = (id) => E().find((o) => o.id === id);
  const snapshot = () => ({ map: state.map, steps: clone(state.steps), cur: state.cur });

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
    state.steps = target.steps;
    state.cur = Math.min(target.cur || 0, state.steps.length - 1);
    sel = null;
    syncMapSelect();
    renderSurface();
    render();
    renderSteps();
    save();
    updateUI();
  }
  function undo() { if (undoStack.length && !playing) restore(undoStack.pop(), redoStack); }
  function redo() { if (redoStack.length && !playing) restore(redoStack.pop(), undoStack); }

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
    if (g.radar) {
      // radar real (imagem) substitui o esquema; os callouts se sobrepõem
      surface.appendChild(el('image', { href: g.radar, x: 0, y: 0, width: 400, height: 300, preserveAspectRatio: 'xMidYMid slice', class: 'bd-radar' }));
    } else {
      (g.areas || []).forEach((a) => surface.appendChild(el('polygon', { points: a.points, class: 'bd-floor' })));
      (g.sites || []).forEach((s) => surface.appendChild(el('polygon', { points: s.points, class: 'bd-zone bd-zone--' + String(s.label).toLowerCase() })));
      (g.objects || []).forEach((o) => surface.appendChild(el('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 1.1, class: 'bd-obj' })));
      (g.links || []).forEach((l) => surface.appendChild(el('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: 'bd-link' })));
      (g.sites || []).forEach((s) => {
        const side = String(s.label).toLowerCase();
        surface.appendChild(el('circle', { cx: s.bx, cy: s.by, r: 9.5, class: 'bd-badge bd-badge--' + side }));
        surface.appendChild(textEl(s.label, { x: s.bx, y: s.by, class: 'bd-badge-txt bd-badge-txt--' + side }));
      });
      if (!g.sites) (g.labels || []).forEach((s) => surface.appendChild(textEl(s.text, { x: s.x, y: s.y, class: 'bd-site' })));
    }
    Object.keys(g.callouts || {}).forEach((k) => {
      const c = g.callouts[k];
      surface.appendChild(el('circle', { cx: c.x, cy: c.y, r: 1.5, class: 'bd-dot' }));
      if (k !== 'a-site' && k !== 'b-site') {
        surface.appendChild(textEl(c.label, { x: c.x, y: c.y - 3.5, class: 'bd-callout' }));
      }
    });
  }

  /* ---------- elementos ---------- */
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
    E().forEach((o) => {
      const n = nodeFor(o);
      if (n) layer.appendChild(n);
    });
    updateUI();
  }

  // desenha uma lista arbitrária (frames da animação), respeitando _op (opacidade)
  function renderFrame(list) {
    layer.textContent = '';
    list.forEach((o) => {
      const n = nodeFor(o);
      if (!n) return;
      if (o._op != null && o._op < 1) n.style.opacity = String(Math.max(0, o._op));
      n.style.cursor = 'default';
      layer.appendChild(n);
    });
  }

  /* ---------- criação ---------- */
  function addPlayer(side, x, y) {
    const n = E().filter((o) => o.type === 'player' && o.side === side).length + 1;
    const o = { id: nextId(), type: 'player', side: side, x: x, y: y, label: String(n) };
    E().push(o);
    return o;
  }
  function addUtil(kind, x, y) {
    const o = { id: nextId(), type: 'util', kind: kind, x: x, y: y };
    E().push(o);
    return o;
  }

  /* ---------- ponteiro ---------- */
  svg.addEventListener('pointerdown', (e) => {
    if (playing) return;
    if (e.button !== undefined && e.button !== 0) return;

    const delHit = e.target.closest ? e.target.closest('.bd-del') : null;
    if (delHit) {
      const id = delHit.getAttribute('data-del');
      const prev = snapshot();
      setE(E().filter((o) => o.id !== id));
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
      E().push(o);
      sel = o.id;
      render();
      drag = { mode: 'arrow', id: o.id, prev: prev, moved: false };
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }

    if (tool === 'text') {
      const pos = { x: p.x, y: p.y };
      askText(null).then((txt) => {
        if (txt == null) return;
        txt = txt.trim();
        if (!txt) return;
        const prev = snapshot();
        E().push({ id: nextId(), type: 'text', x: pos.x, y: pos.y, text: txt });
        commit(prev);
        render();
      });
      return;
    }

    // colocação: clique posiciona; arraste no mesmo gesto ajusta
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
      if (len < 4) { setE(E().filter((x) => x.id !== drag.id)); sel = null; render(); }
      else commit(drag.prev);
    } else if (drag.mode === 'move' && (drag.placement || drag.moved)) {
      commit(drag.prev);
    }
    if (e && e.pointerId != null) { try { svg.releasePointerCapture(e.pointerId); } catch (_) {} }
    drag = null;
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  svg.addEventListener('dblclick', (e) => {
    if (playing) return;
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
    if (playing) { if (e.key === 'Escape') stopPlay(); return; }
    const k = e.key.toLowerCase();
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
      e.preventDefault();
      const prev = snapshot();
      setE(E().filter((o) => o.id !== sel));
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
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => { if (!playing) setTool(b.getAttribute('data-tool')); }));

  const btnUndo = document.getElementById('bdUndo');
  const btnRedo = document.getElementById('bdRedo');
  const btnClear = document.getElementById('bdClear');
  const btnShare = document.getElementById('bdShare');
  const counter = document.getElementById('bdCounter');
  const mapSel = document.getElementById('boardMap');

  if (btnUndo) btnUndo.onclick = undo;
  if (btnRedo) btnRedo.onclick = redo;
  if (btnClear) btnClear.onclick = () => {
    if (playing) return;
    const empty = state.steps.length === 1 && !E().length;
    if (empty) return;
    askConfirm('Limpar toda a prancheta? Isso remove todas as etapas e itens.').then((ok) => {
      if (!ok) return;
      const prev = snapshot();
      state.steps = [[]];
      state.cur = 0;
      sel = null;
      commit(prev);
      renderSurface();
      render();
      renderSteps();
    });
  };

  MAPS.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.slug;
    opt.textContent = m.name;
    mapSel.appendChild(opt);
  });
  function syncMapSelect() { mapSel.value = state.map; }
  mapSel.addEventListener('change', () => {
    if (playing) { mapSel.value = state.map; return; }
    const prev = snapshot();
    state.map = mapSel.value;
    commit(prev);
    renderSurface();
    render();
  });

  /* ---------- etapas ---------- */
  const stepList = document.getElementById('bdStepList');
  const btnStepAdd = document.getElementById('bdStepAdd');
  const btnStepDel = document.getElementById('bdStepDel');

  function renderSteps() {
    if (!stepList) return;
    stepList.textContent = '';
    state.steps.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'bd-step' + (i === state.cur ? ' active' : '');
      b.type = 'button';
      b.textContent = String(i + 1);
      b.title = 'Ir para a etapa ' + (i + 1);
      b.onclick = () => { if (playing) return; state.cur = i; sel = null; render(); renderSteps(); };
      stepList.appendChild(b);
    });
    if (btnStepDel) btnStepDel.disabled = state.steps.length <= 1 || playing;
    if (btnStepAdd) btnStepAdd.disabled = playing;
  }
  if (btnStepAdd) btnStepAdd.onclick = () => {
    if (playing) return;
    const prev = snapshot();
    state.steps.splice(state.cur + 1, 0, clone(E())); // duplica a etapa atual
    state.cur += 1;
    sel = null;
    commit(prev);
    render();
    renderSteps();
    toast('Etapa ' + (state.cur + 1) + ' criada (cópia da anterior) — mova os itens para a nova posição.');
  };
  if (btnStepDel) btnStepDel.onclick = () => {
    if (playing || state.steps.length <= 1) return;
    const prev = snapshot();
    state.steps.splice(state.cur, 1);
    state.cur = Math.min(state.cur, state.steps.length - 1);
    sel = null;
    commit(prev);
    render();
    renderSteps();
  };

  /* ---------- animação (Reproduzir) ---------- */
  const btnPlay = document.getElementById('bdPlay');
  const progress = document.getElementById('bdProgress');

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function interpolate(A, B, t) {
    const map = {};
    A.forEach((o) => { map[o.id] = { a: o }; });
    B.forEach((o) => { map[o.id] = Object.assign(map[o.id] || {}, { b: o }); });
    const out = [];
    Object.keys(map).forEach((id) => {
      const a = map[id].a, b = map[id].b;
      if (a && b) out.push(lerpEl(a, b, t));
      else if (b) out.push(Object.assign({}, b, { _op: t }));
      else if (a) out.push(Object.assign({}, a, { _op: 1 - t }));
    });
    return out;
  }
  function lerpEl(a, b, t) {
    const o = Object.assign({}, b);
    const L = (p, q) => p + (q - p) * t;
    if (a.type === 'arrow' && b.type === 'arrow') {
      o.x1 = L(a.x1, b.x1); o.y1 = L(a.y1, b.y1); o.x2 = L(a.x2, b.x2); o.y2 = L(a.y2, b.y2);
    } else if (a.x != null && b.x != null) {
      o.x = L(a.x, b.x); o.y = L(a.y, b.y);
    }
    return o;
  }
  function frameAt(elapsed) {
    const steps = state.steps;
    const segCount = steps.length - 1;
    if (segCount <= 0) return steps[0].map((o) => Object.assign({}, o));
    const unit = SEG + HOLD;
    let seg = Math.floor(elapsed / unit);
    if (seg >= segCount) return steps[segCount].map((o) => Object.assign({}, o));
    const within = elapsed - seg * unit;
    const t = within <= HOLD ? 0 : Math.min((within - HOLD) / SEG, 1);
    return interpolate(steps[seg], steps[seg + 1], ease(t));
  }
  function setProgress(p) { if (progress) progress.firstElementChild.style.width = (Math.max(0, Math.min(1, p)) * 100) + '%'; }
  function updatePlayBtn(on) {
    if (!btnPlay) return;
    btnPlay.classList.toggle('is-playing', on);
    btnPlay.querySelector('i').className = on ? 'fa-solid fa-stop' : 'fa-solid fa-play';
    const lbl = btnPlay.querySelector('span');
    if (lbl) lbl.textContent = on ? 'Parar' : 'Reproduzir';
  }

  function play() {
    if (playing) { stopPlay(); return; }
    if (state.steps.length < 2) { toast('Crie ao menos duas etapas para animar a jogada.'); return; }
    playing = true;
    sel = null;
    playReturn = state.cur;
    const segCount = state.steps.length - 1;
    const total = segCount * (SEG + HOLD) + 600;
    updatePlayBtn(true);
    renderSteps();
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const loop = (now) => {
      if (!playing) return;
      const elapsed = now - start;
      renderFrame(frameAt(Math.min(elapsed, total)));
      setProgress(elapsed / total);
      if (elapsed >= total) { stopPlay(); return; }
      playRAF = requestAnimationFrame(loop);
    };
    playRAF = requestAnimationFrame(loop);
  }
  function stopPlay() {
    if (!playing) return;
    playing = false;
    if (playRAF) { cancelAnimationFrame(playRAF); playRAF = null; }
    state.cur = Math.min(playReturn, state.steps.length - 1);
    setProgress(0);
    updatePlayBtn(false);
    render();
    renderSteps();
  }
  if (btnPlay) btnPlay.onclick = play;

  /* ---------- contador + botões ---------- */
  function updateUI() {
    if (btnUndo) btnUndo.disabled = !undoStack.length || playing;
    if (btnRedo) btnRedo.disabled = !redoStack.length || playing;
    if (counter) {
      const els = E();
      const t = els.filter((o) => o.type === 'player' && o.side === 't').length;
      const ct = els.filter((o) => o.type === 'player' && o.side === 'ct').length;
      const u = els.filter((o) => o.type === 'util').length;
      const a = els.filter((o) => o.type === 'arrow').length;
      counter.textContent = 'Etapa ' + (state.cur + 1) + '/' + state.steps.length + ' · T ' + t + ' · CT ' + ct + ' · Util ' + u + ' · Setas ' + a;
    }
  }

  /* ---------- persistência ---------- */
  function pack() { return { m: state.map, s: state.steps, c: state.cur }; }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(pack())); } catch (_) {}
  }
  function unpack(raw) {
    if (!raw || !GEO[raw.m]) return null;
    if (Array.isArray(raw.s) && raw.s.length) return { map: raw.m, steps: raw.s, cur: Math.min(raw.c || 0, raw.s.length - 1) };
    if (Array.isArray(raw.e)) return { map: raw.m, steps: [raw.e], cur: 0 }; // formato antigo (uma etapa)
    return null;
  }
  function loadStored() {
    try { return unpack(JSON.parse(localStorage.getItem(STORE_KEY))); } catch (_) { return null; }
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
  function encodeState() { return b64urlEncode(JSON.stringify(pack())); }
  function decodeState(code) {
    try { return unpack(JSON.parse(b64urlDecode(code))); } catch (_) { return null; }
  }

  let toastTimer = null;
  function toast(msg) {
    const box = document.getElementById('bdToast');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 3000);
  }

  if (btnShare) btnShare.onclick = async () => {
    if (playing) return;
    const url = location.origin + location.pathname + '#b=' + encodeState();
    try { history.replaceState(null, '', url); } catch (_) {}
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado — cole no chat do time.');
    } catch (_) {
      toast('Link pronto na barra de endereço.');
    }
  };

  /* ---------- modal estilizado ---------- */
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
  function bumpUid() {
    let max = 0;
    state.steps.forEach((s) => s.forEach((o) => {
      const m = /^e(\d+)$/.exec(o.id || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }));
    uid = max + 1;
  }
  function boot() {
    let loaded = null;
    if (location.hash.indexOf('#b=') === 0) loaded = decodeState(location.hash.slice(3));
    if (!loaded) loaded = loadStored();
    if (loaded) {
      state.map = loaded.map;
      state.steps = (loaded.steps && loaded.steps.length) ? loaded.steps : [[]];
      state.cur = Math.min(loaded.cur || 0, state.steps.length - 1);
      bumpUid();
    }
    syncMapSelect();
    renderSurface();
    render();
    renderSteps();
    updateUI();
  }
  boot();
})();
