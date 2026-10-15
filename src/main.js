import { Stage, boundsOf } from './engine/stage.js';
import { ALGOS, CATEGORIES, byId, icon } from './algos/index.js';

const $ = (id) => document.getElementById(id);
const CAT_COLOR = {
  Complexity: '#a052f5', Linear: '#3b82f6', Hashing: '#f0a020', Trees: '#1fae7a',
  Graphs: '#ef5b5b', Searching: '#0ea5b7', Sorting: '#5b5bf6',
};

// ── course data (carried over from the original portal) ──────────
const WEEKS = [
  { n: 1, t: 'Python OOP Concepts', s: null, v: [] },
  { n: 2, t: 'Introduction to Data Structures', s: 'intro_dsa_arrays.html', v: ['array'] },
  { n: 3, t: 'Complexity (Asymptotic) Analysis', s: 'complexity_analysis.html', v: ['big-o'] },
  { n: 4, t: 'Arrays and Lists', s: 'intro_dsa_arrays.html', v: ['array'] },
  { n: 5, t: 'Stacks & Queues', s: 'stacks_queues.html', v: ['stack', 'queue'] },
  { n: 6, t: 'Linked Lists', s: 'linked_lists.html', v: ['linked-list', 'reverse-list'] },
  { n: 7, t: 'Hash Maps', s: 'hash_maps.html', v: ['hash-map'] },
  { n: 8, t: 'Trees — Binary Search Trees', s: 'binary_trees_bst.html', v: ['bst', 'tree-traversal'] },
  { n: 9, t: 'Heaps and Priority Queues', s: null, v: ['heap'] },
  { n: 10, t: 'Graphs', s: 'graphs.html', v: ['bfs', 'dfs', 'dijkstra'] },
  { n: 11, t: 'Searching and Sorting Algorithms', s: 'algorithms.html', v: ['linear-search', 'binary-search', 'bubble-sort', 'selection-sort'] },
  { n: 12, t: 'Searching and Sorting Algorithms (cont.)', s: 'algorithms.html', v: ['insertion-sort', 'merge-sort', 'quick-sort'] },
  { n: 13, t: 'Project Presentations', s: null, v: [], note: 'in class' },
];
const DECKS = [
  ['Week 2 & 4', 'Intro to DSA & Arrays', 'What are data structures and algorithms? Abstract Data Types, complexity recap, categories of DS, and a deep dive into the Array ADT — memory layout, operations, patterns.', 25, 'intro_dsa_arrays.html'],
  ['Week 3', 'Asymptotic & Complexity Analysis', 'Big-O, Big-Ω, Big-Θ, little-o and little-ω. Formal proofs, loop analysis rules, nested loops, recurrence relations, Master Theorem, and amortised analysis.', 40, 'complexity_analysis.html'],
  ['Week 5', 'Stacks & Queues', 'LIFO and FIFO principles, push/pop/enqueue/dequeue operations, array and linked list implementations, balanced brackets, BFS, deque, priority queue, and classic interview problems.', 25, 'stacks_queues.html'],
  ['Week 6', 'Linked Lists', "Singly, doubly and circular linked lists. Traversal, insert, delete operations with visual traces. Floyd's cycle detection, reversal, find middle, merge sorted lists.", 25, 'linked_lists.html'],
  ['Week 7', 'Hash Maps', 'Hash functions, collision handling (chaining vs open addressing), load factor, rehashing, LRU cache, hash sets, consistent hashing, and common patterns like two-sum and anagram grouping.', 25, 'hash_maps.html'],
  ['Week 8', 'Binary Trees & BSTs', 'Tree terminology, binary tree types, node structure, DFS traversals (inorder, preorder, postorder), BFS level-order, BST property, search/insert/delete, balancing and complexity.', 18, 'binary_trees_bst.html'],
  ['Week 10', 'Graphs', "Graph theory, directed vs undirected, weighted graphs, adjacency matrix and list representations, DFS, BFS, cycle detection, topological sort, Dijkstra's, Kruskal's MST.", 25, 'graphs.html'],
  ['Week 11–12', 'Sorting & Searching Algorithms', 'Bubble, Selection, Insertion, Merge, Quick, Heap sort. Counting and Radix sort. Linear search, Binary search and its variants. Full complexity table and real-world implementations.', 28, 'algorithms.html'],
];
const ASSESS = [
  ['Quizzes (pop-up, unannounced)', 10, '#5b5bf6'], ['Presentation', 5, '#a052f5'], ['Class attendance', 10, '#3b82f6'],
  ['Class participation', 5, '#0ea5b7'], ['Project work', 10, '#1fae7a'], ['End of semester exam', 60, '#12162b'],
];
const POLICIES = [
  ['Quizzes', 'Unannounced pop-up quizzes. No make-ups for missed quizzes. One lowest quiz score will be dropped at end of semester.', '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'],
  ['Late work', 'Submissions lose 40% per late day. One day late = 60% max. Two days late = 20% max. Submit before the deadline.', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  ['Integrity', 'All code must be your own. Copying or sharing code results in failing the project and referral to HOD. Discuss bugs but never share solutions.', '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>'],
  ['Submission', 'Submit as a zip file named with your ID. Include README, source code, test files, and documentation explaining your solution.', '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1zM10 12h4"/>'],
  ['Office hours', 'Office hours are for clarifying lecture content or resolving serious problems — not for re-running missed lectures or getting assignment answers.', '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>'],
  ['Attendance', 'Attendance counts for 10 marks. Class participation counts for 5. Regular attendance and engagement are essential for success.', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── hero: four live simulations merged into one isometric diorama ──
const HERO_SIMS = [
  { id: 'bubble-sort', input: '7 3 9 2 6 4 8 1', off: [-5, -4.6], every: 1 },
  { id: 'stack', input: 'push 4 ; push 7 ; push 2 ; pop ; push 9 ; push 5 ; pop ; pop ; pop ; pop', off: [5.4, -5], every: 1 },
  { id: 'bst', input: '50 30 70 ; insert 20 ; insert 40 ; insert 60 ; insert 80 ; insert 35 ; search 60', off: [4.6, 1.4], every: 1 },
  { id: 'queue', input: 'enq 5 ; enq 8 ; enq 3 ; deq ; enq 6 ; enq 1 ; deq ; deq ; enq 9 ; deq ; deq ; deq', off: [-6, 4], every: 1 },
];

function shift(step, k, [ox, oz]) {
  const p = (id) => (id == null ? id : `${k}:${id}`);
  return {
    nodes: step.nodes.map((n) => ({ ...n, id: p(n.id), from: n.from && p(n.from), x: (n.x || 0) + ox, z: (n.z || 0) + oz, sub: undefined, tag: undefined })),
    edges: step.edges.map((e) => ({ ...e, id: p(e.id), from: p(e.from), to: p(e.to), label: undefined })),
    pins: step.pins.map((q) => ({ ...q, id: p(q.id), target: p(q.target) })),
    texts: [],
  };
}

function initHero() {
  const el = $('heroStage');
  const wide = () => innerWidth > 860;
  const stage = new Stage(el, {
    interactive: false,
    insets: (w) => (wide() ? { l: Math.min(w * 0.4, 560), r: 70, t: 170, b: 170 } : { l: 0, r: 0, t: 10, b: 10 }),
  });
  stage.camDir.set(1, 1.05, 1.25).normalize();
  const sims = HERO_SIMS.map((s, k) => {
    const a = byId(s.id);
    const steps = a.run(a.input.parse(s.input)).map((st) => ({ raw: st, ...shift(st, k, s.off) }));
    return { ...s, a, steps, i: 0 };
  });
  stage.frame(boundsOf(sims.flatMap((s) => s.steps)));
  let featured = 0, tick = 0;
  const render = () => {
    const merged = { nodes: [], edges: [], pins: [], texts: [] };
    for (const s of sims) {
      const st = s.steps[s.i];
      merged.nodes.push(...st.nodes); merged.edges.push(...st.edges); merged.pins.push(...st.pins);
    }
    stage.apply(merged);
    const f = sims[featured], raw = f.steps[f.i].raw;
    $('liveTitle').textContent = f.a.title;
    $('livePhase').textContent = raw.phase || 'running';
    $('liveMsg').innerHTML = raw.msg;
    $('liveBar').style.width = `${((f.i + 1) / f.steps.length) * 100}%`;
  };
  render();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; stage.setRunning(visible && !document.hidden); }).observe(el);
  document.addEventListener('visibilitychange', () => stage.setRunning(visible && !document.hidden));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setInterval(() => {
    if (!visible || document.hidden || reduce) return;
    tick++;
    for (const s of sims) s.i = (s.i + 1) % s.steps.length;
    if (tick % 9 === 0) featured = (featured + 1) % sims.length;
    render();
  }, 1100);
  document.querySelector('.hc-live').onclick = () => (location.href = `/lab.html?algo=${sims[featured].id}`);
}

// course path tracker in the hero
function initTrack() {
  const pts = [2, 3, 5, 6, 7, 8, 10, 12, 13];
  const labels = { 2: 'Intro', 3: 'Big-O', 5: 'Stacks', 6: 'Lists', 7: 'Hash', 8: 'Trees', 10: 'Graphs', 12: 'Sorting', 13: 'Project' };
  $('track').innerHTML = pts.map((w) => `<a class="t past" href="#schedule"><span class="n">${w}</span><em>${labels[w]}</em></a>`).join('');
}

// ── 3D card ring (CSS 3D) ───────────────────────────────────────
function cardMini(a, k) {
  const c = CAT_COLOR[a.cat];
  let h = '';
  for (let i = 0; i < 12; i++) {
    const v = a.cat === 'Sorting' ? 20 + ((i * 37 + k * 11) % 80) : a.cat === 'Complexity' ? 8 + i * i * 0.65 : 25 + ((i * 53 + k * 29) % 70);
    h += `<i style="height:${Math.min(100, v)}%;${i % 4 === k % 4 ? `background:${c}` : ''}"></i>`;
  }
  return `<div class="mini">${h}</div>`;
}
function initRing() {
  const ring = $('ring'), wrap = $('ringWrap');
  const N = ALGOS.length;
  const cardW = innerWidth < 860 ? 180 : 210;
  const R = Math.round(((cardW + 26) * N) / (2 * Math.PI));
  ring.innerHTML = ALGOS.map((a, k) => `
    <a class="ring-card" href="/lab.html?algo=${a.id}" style="transform:rotateY(${(360 / N) * k}deg) translateZ(${R}px)" draggable="false">
      <span class="ic" style="background:${CAT_COLOR[a.cat]}">${icon(a.cat, 18)}</span>
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.blurb)}</p>
      ${cardMini(a, k)}
      <div class="foot"><span>${a.cat}</span><span>wk ${a.week}</span></div>
    </a>`).join('');
  let angle = 0, vel = 0.06, dragging = false, lastX = 0, moved = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = () => (ring.style.transform = `translateZ(${-R - 60}px) rotateX(-7deg) rotateY(${angle}deg)`);
  const loop = () => {
    if (!dragging) { angle -= reduce ? 0 : vel; vel += (0.06 - vel) * 0.02; }
    draw();
    requestAnimationFrame(loop);
  };
  loop();
  wrap.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; moved = 0; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX; moved += Math.abs(dx);
    angle += dx * 0.18; vel = -dx * 0.18;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) {
      // treat as a click on whatever card is under the pointer
      wrap.releasePointerCapture?.(e.pointerId);
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.classList?.contains('ring-card'));
      if (hit) location.href = hit.getAttribute('href');
    }
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', () => (dragging = false));
  ring.addEventListener('click', (e) => e.preventDefault());
}

function initGrid() {
  $('algoCount').firstChild.textContent = `${ALGOS.length} `;
  $('labCount').textContent = ALGOS.length;
  $('chips').innerHTML = CATEGORIES.map((c, k) => `<button class="chip-btn ${k ? '' : 'on'}" data-c="${c}" role="tab">${c}</button>`).join('');
  $('algoGrid').innerHTML = ALGOS.map((a) => {
    const cx = Object.entries(a.time).slice(0, 3).map(([k, v]) => `<span>${esc(k)} ${esc(v)}</span>`).join('');
    return `<a class="algo-card" href="/lab.html?algo=${a.id}" data-c="${a.cat}">
      <div class="top"><span class="ic" style="color:${CAT_COLOR[a.cat]}">${icon(a.cat, 18)}</span><span class="wk">${a.cat} · wk ${a.week}</span></div>
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.blurb)}</p>
      <div class="cx">${cx}</div>
      <span class="go"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
    </a>`;
  }).join('');
  $('chips').onclick = (e) => {
    const b = e.target.closest('.chip-btn');
    if (!b) return;
    document.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.algo-card').forEach((c) => (c.hidden = b.dataset.c !== 'All' && c.dataset.c !== b.dataset.c));
  };
}

function initCourse() {
  $('assess').innerHTML =
    `<div class="assess-bar">${ASSESS.map(([, n, c]) => `<i style="flex:${n};background:${c}"></i>`).join('')}</div>` +
    ASSESS.map(([t, n, c]) => `<div class="assess-row"><span class="sw" style="background:${c}"></span>${t}<span class="n">${n}</span></div>`).join('') +
    '<div class="assess-total"><span>Total</span><span class="mono">100</span></div>';

  $('scheduleList').innerHTML = WEEKS.map((w) => {
    const vis = w.v.map((id) => `<a href="/lab.html?algo=${id}">▶ ${esc(byId(id).title)}</a>`).join('');
    const act = w.s ? `<a class="slides" href="/${w.s}">View slides ↗</a>` : `<span class="soon">${w.note || 'coming soon'}</span>`;
    return `<div class="wk-row reveal ${w.v.length ? 'has' : ''}"><span class="num">${String(w.n).padStart(2, '0')}</span><div><div class="title">${esc(w.t)}</div>${vis ? `<div class="vis">${vis}</div>` : ''}</div><div class="acts">${act}</div></div>`;
  }).join('');

  $('decks').innerHTML = DECKS.map(([wk, t, d, n, href]) => `
    <a class="card deck reveal" href="/${href}">
      <span class="wk">${wk}</span><h3>${esc(t)}</h3><p>${esc(d)}</p>
      <div class="foot"><span>${n} slides</span><span class="arrow">↗</span></div>
    </a>`).join('');

  $('policyGrid').innerHTML = POLICIES.map(([t, d, ic]) => `
    <div class="card policy reveal"><div class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ic}</svg></div><h3>${t}</h3><p>${d}</p></div>`).join('');
}

function initReveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((n) => io.observe(n));
}

initTrack();
initGrid();
initCourse();
initRing();
initReveal();
(async () => {
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch {}
  initHero();
})();
