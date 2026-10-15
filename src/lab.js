import { Stage, boundsOf, PALETTE } from './engine/stage.js';
import { ALGOS, CATEGORIES, byId, icon } from './algos/index.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mobile = () => matchMedia('(max-width: 860px)').matches;

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
const REPLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';

const LEGEND = {
  active: 'current', compare: 'comparing', swap: 'moving', done: 'final', found: 'found', pivot: 'pivot / min',
  visited: 'visited', key: 'queued', new: 'new', muted: 'discarded',
};

let algo, steps = [], idx = 0, playing = false, timer = null, speed = 1, lastVars = {};

const stage = new Stage($('stage'), {
  insets: () => {
    if (mobile()) return { l: 10, r: 10, t: 64, b: 64 };
    const dock = document.querySelector('.dock');
    return { l: 76, r: 400, t: 140, b: (dock?.offsetHeight || 180) + 28 };
  },
});

// ── loading ──────────────────────────────────────────────────────
function load(a, inputStr, { autoplay = true, pushUrl = true } = {}) {
  let data;
  try {
    data = a.input.parse(inputStr);
  } catch (e) {
    $('inputErr').textContent = e.message;
    return false;
  }
  $('inputErr').textContent = '';
  const changedAlgo = algo !== a;
  algo = a;
  steps = a.run(data);
  stop();
  stage.clear();
  stage.frame(boundsOf(steps));
  if (changedAlgo) renderPanel();
  $('inputField').value = inputStr;
  renderLegend();
  if (pushUrl) {
    const u = new URL(location.href);
    u.searchParams.set('algo', a.id);
    if (inputStr !== a.input.default) u.searchParams.set('input', inputStr); else u.searchParams.delete('input');
    history.replaceState(null, '', u);
  }
  document.title = `${a.title} — SD279 Visual Lab`;
  lastVars = {};
  go(0);
  if (autoplay) setTimeout(() => !playing && idx === 0 && play(), 700);
  return true;
}

function renderPanel() {
  $('pickerIcon').innerHTML = icon(algo.cat, 16);
  $('pickerTitle').textContent = algo.title;
  $('pickerCat').textContent = `${algo.cat} · Week ${algo.week}`;
  $('sideCat').textContent = `${algo.cat} · week ${algo.week}`;
  $('sideTitle').textContent = algo.title;
  $('sideBlurb').textContent = algo.blurb;
  $('sideWeek').textContent = algo.week;
  const cx = Object.entries(algo.time).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`);
  if (algo.space) cx.push(`<div><div class="k">space</div><div class="v">${esc(algo.space)}</div></div>`);
  if (algo.stable != null) cx.push(`<div><div class="k">stable</div><div class="v">${algo.stable ? 'yes' : 'no'}</div></div>`);
  $('cx').innerHTML = cx.join('');
  $('code').innerHTML = algo.code.map((l, i) => `<div data-l="${i}"><i>${i + 1}</i><span>${esc(l)}</span></div>`).join('');
  $('inputLabel').textContent = `${algo.input.label} — ${algo.input.hint}`;
  const sl = $('slidesLink');
  if (algo.slides) { sl.href = `/${algo.slides}`; sl.style.display = ''; } else sl.style.display = 'none';
  renderPicker();
}

function renderLegend() {
  const used = new Set();
  for (const s of steps) for (const n of s.nodes) if (n.state && LEGEND[n.state]) used.add(n.state);
  $('legend').innerHTML = [...used].map((st) => `<span><i style="background:${PALETTE[st]}${st === 'default' ? ';box-shadow:inset 0 0 0 1px #ccd' : ''}"></i>${LEGEND[st]}</span>`).join('');
  $('legend').style.display = used.size ? '' : 'none';
}

// ── stepping ─────────────────────────────────────────────────────
function go(i) {
  idx = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[idx];
  stage.apply(s);
  $('msg').innerHTML = s.msg;
  $('phasePill').textContent = s.phase || '—';
  $('stepChip').textContent = `${idx + 1} / ${steps.length}`;
  $('scrub').max = steps.length - 1;
  $('scrub').value = idx;
  $('scrubA').textContent = `step ${idx + 1}`;
  $('scrubB').textContent = `of ${steps.length}`;

  document.querySelectorAll('#code div').forEach((d) => d.classList.toggle('on', Number(d.dataset.l) === s.line));
  $('lineChip').textContent = s.line >= 0 ? `line ${s.line + 1}` : '—';
  const on = document.querySelector('#code div.on');
  if (on && !mobile()) on.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  const vars = Object.entries(s.vars);
  $('vars').innerHTML = vars.length
    ? vars.map(([k, v]) => `<div class="${lastVars[k] !== undefined && lastVars[k] !== v ? 'flash' : ''}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')
    : '<div class="empty">No variables in play at this step.</div>';
  lastVars = s.vars;

  const stats = Object.entries(s.stats).slice(0, 2);
  const cxMain = algo.time.avg || algo.time.all || Object.values(algo.time)[0];
  $('statsDock').innerHTML = [
    `<div class="stat glass"><div class="k">Step</div><div class="v">${idx + 1}<span class="pill gray">/ ${steps.length}</span></div></div>`,
    ...stats.map(([k, v]) => `<div class="stat glass"><div class="k" style="text-transform:capitalize">${esc(k)}</div><div class="v">${v}</div></div>`),
    cxMain ? `<div class="stat glass"><div class="k">Typical cost</div><div class="v" style="font-family:var(--mono);font-size:1.15rem;padding-top:5px">${esc(cxMain)}</div></div>` : '',
  ].join('');
  renderPhases();
  $('playBtn').innerHTML = playing ? PAUSE : idx === steps.length - 1 ? REPLAY : PLAY;
}

function renderPhases() {
  // collapse consecutive identical phases into a chain, then show a window around the current one
  const chain = [];
  steps.forEach((s, k) => {
    if (!chain.length || chain[chain.length - 1].name !== s.phase) chain.push({ name: s.phase || '…', start: k });
  });
  let cur = 0;
  chain.forEach((c, k) => { if (c.start <= idx) cur = k; });
  const W = mobile() ? 4 : 5;
  let a = Math.max(0, Math.min(cur - Math.floor(W / 2), chain.length - W));
  const view = chain.slice(a, a + W);
  $('phases').innerHTML = view.map((c, k) => {
    const g = a + k;
    return `<div class="ph ${g < cur ? 'past' : g === cur ? 'on' : ''}" data-s="${c.start}" title="${esc(c.name)}" style="cursor:pointer"><s></s><em>${esc(c.name)}</em></div>`;
  }).join('');
}

function play() {
  if (idx >= steps.length - 1) go(0);
  playing = true;
  $('playBtn').innerHTML = PAUSE;
  schedule();
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!playing) return;
    if (idx < steps.length - 1) { go(idx + 1); schedule(); } else stop();
  }, 1250 / speed);
}
function stop() {
  playing = false;
  clearTimeout(timer);
  if (steps.length) $('playBtn').innerHTML = idx === steps.length - 1 ? REPLAY : PLAY;
}
const step = (d) => { stop(); go(idx + d); };

// ── picker ───────────────────────────────────────────────────────
let pickSel = 0;
function renderPicker() {
  const q = $('pickerSearch').value.trim().toLowerCase();
  const list = ALGOS.filter((a) => !q || `${a.title} ${a.cat} ${a.blurb} week ${a.week}`.toLowerCase().includes(q));
  pickSel = Math.min(pickSel, Math.max(0, list.length - 1));
  let html = '', k = 0;
  for (const cat of CATEGORIES.slice(1)) {
    const items = list.filter((a) => a.cat === cat);
    if (!items.length) continue;
    html += `<div class="grp">${cat}</div>`;
    for (const a of items) {
      html += `<a href="?algo=${a.id}" data-id="${a.id}" data-k="${k}" class="${a === algo ? 'cur' : ''} ${k === pickSel ? 'sel' : ''}"><span class="ic">${icon(a.cat, 15)}</span>${esc(a.title)}<span class="wk">wk ${esc(a.week)}</span></a>`;
      k++;
    }
  }
  $('pickerList').innerHTML = html || '<div class="grp">No matches</div>';
}
function openPicker(v) {
  $('picker').classList.toggle('open', v);
  $('pickerBtn').setAttribute('aria-expanded', v);
  if (v) { $('pickerSearch').value = ''; pickSel = 0; renderPicker(); setTimeout(() => $('pickerSearch').focus(), 30); }
}
function choose(id) {
  const a = byId(id);
  if (!a) return;
  openPicker(false);
  load(a, a.input.default);
}

// ── events ───────────────────────────────────────────────────────
$('playBtn').onclick = () => (playing ? stop() : play());
$('prevBtn').onclick = () => step(-1);
$('nextBtn').onclick = () => step(1);
$('firstBtn').onclick = () => { stop(); go(0); };
$('scrub').oninput = (e) => { stop(); go(Number(e.target.value)); };
$('speed').onchange = (e) => { speed = Number(e.target.value); stage.speed = Math.max(1, speed); if (playing) schedule(); };
$('phases').onclick = (e) => { const p = e.target.closest('.ph'); if (p) { stop(); go(Number(p.dataset.s)); } };
$('inputForm').onsubmit = (e) => { e.preventDefault(); load(algo, $('inputField').value.trim()); };
$('randomBtn').onclick = () => load(algo, algo.input.random());
$('resetInput').onclick = () => load(algo, algo.input.default);
$('pickerBtn').onclick = (e) => { e.stopPropagation(); openPicker(!$('picker').classList.contains('open')); };
$('pickerSearch').oninput = () => { pickSel = 0; renderPicker(); };
$('pickerList').onclick = (e) => { const a = e.target.closest('a[data-id]'); if (a) { e.preventDefault(); choose(a.dataset.id); } };
document.addEventListener('click', (e) => { if (!e.target.closest('#picker')) openPicker(false); });
document.querySelectorAll('[data-cam]').forEach((b) => (b.onclick = () => {
  const c = b.dataset.cam;
  if (c === 'in') stage.zoomBy(1.2);
  else if (c === 'out') stage.zoomBy(1 / 1.2);
  else if (c === 'left') stage.rotateBy(-Math.PI / 8);
  else if (c === 'right') stage.rotateBy(Math.PI / 8);
  else stage.resetView();
}));

document.addEventListener('keydown', (e) => {
  const inPicker = $('picker').classList.contains('open');
  if (inPicker) {
    const items = [...document.querySelectorAll('#pickerList a')];
    if (e.key === 'Escape') openPicker(false);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      pickSel = (pickSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      renderPicker();
      document.querySelector('#pickerList a.sel')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && items[pickSel]) { e.preventDefault(); choose(items[pickSel].dataset.id); }
    return;
  }
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === ' ') { e.preventDefault(); playing ? stop() : play(); }
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'Home') { stop(); go(0); }
  else if (e.key === 'End') { stop(); go(steps.length - 1); }
  else if (e.key === '/') { e.preventDefault(); openPicker(true); }
});
document.addEventListener('visibilitychange', () => stage.setRunning(!document.hidden));
new ResizeObserver(() => stage.applyFrustum()).observe(document.querySelector('.dock'));

// ── boot ─────────────────────────────────────────────────────────
(async () => {
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch {}
  const p = new URLSearchParams(location.search);
  const a = byId(p.get('algo')) || byId('bubble-sort');
  const inp = p.get('input');
  if (!inp || !load(a, inp, { pushUrl: false })) load(a, a.input.default, { pushUrl: false });
})();
