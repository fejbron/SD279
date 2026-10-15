import { Recorder, randInt, centered } from './util.js';

// One shared weighted, undirected graph laid out on the ground.
const V = {
  A: [-7, 0], B: [-3.8, -3.2], C: [-3.6, 2.8], D: [0, 0], E: [1.2, -3.8],
  F: [3.2, 3.4], G: [5.2, -1.4], H: [8, 1.8],
};
const E = [
  ['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'D', 8], ['C', 'F', 10],
  ['D', 'E', 2], ['D', 'F', 6], ['E', 'G', 3], ['F', 'G', 2], ['G', 'H', 1], ['F', 'H', 7],
];
const adj = {};
for (const v of Object.keys(V)) adj[v] = [];
for (const [a, b, w] of E) { adj[a].push([b, w]); adj[b].push([a, w]); }
for (const v of Object.keys(adj)) adj[v].sort((p, q) => p[0].localeCompare(q[0]));
const eid = (a, b) => (a < b ? `${a}${b}` : `${b}${a}`);

function drawGraph({ hi = {}, edgeHi = {}, tags = {}, weights = false, extra = [], texts = [] } = {}) {
  const nodes = Object.entries(V).map(([k, [x, z]]) => ({ id: k, label: k, shape: 'puck', w: 1.25, d: 1.25, h: 0.55, x, z, state: hi[k] || 'default', tag: tags[k] }));
  const edges = E.map(([a, b, w]) => ({ id: eid(a, b), from: a, to: b, state: edgeHi[eid(a, b)] || 'default', label: weights ? w : undefined }));
  return { nodes: nodes.concat(extra), edges, texts };
}
const startInput = (def = 'A') => ({
  label: 'Start vertex', hint: 'A – H', default: def,
  random: () => 'ABCDEFGH'[randInt(0, 7)],
  parse(s) {
    const v = s.trim().toUpperCase();
    if (!V[v]) throw new Error('Pick a start vertex from A to H.');
    return v;
  },
});
const ROW_Z = 6.4;
// a row of small blocks representing a queue / priority queue beside the graph
const rowBlocks = (items, prefix, label, state = 'key') =>
  items.map((it, k) => ({ id: `${prefix}${it.id}`, from: it.id, label: it.label, w: 1.05, d: 0.9, h: 0.4, x: -7 + k * 1.25, z: ROW_Z, state }));
const rowText = (id, text) => ({ id, text, x: -8.7, y: 0.2, z: ROW_Z, cls: 'chip' });

export const bfs = {
  id: 'bfs', title: 'Breadth-First Search', cat: 'Graphs', week: '10', slides: 'graphs.html',
  blurb: 'Explore the graph in rings: all neighbours at distance 1, then distance 2, and so on. The queue in the front row decides who goes next.',
  time: { all: 'O(V + E)' }, space: 'O(V)',
  code: [
    'Q ← [s]; visited ← {s}; dist[s] ← 0',
    'while Q not empty:',
    '  u ← Q.dequeue()',
    '  for each neighbour v of u:',
    '    if v not in visited:',
    '      visited.add(v); dist[v] ← dist[u] + 1; Q.enqueue(v)',
  ],
  input: startInput('A'),
  run(s) {
    const R = new Recorder();
    R.stats = { 'edges checked': 0 };
    const visited = new Set([s]), done = new Set(), tree = new Set(), dist = { [s]: 0 };
    const Q = [s];
    const tags = () => Object.fromEntries(Object.entries(dist).map(([k, d]) => [k, `d=${d}`]));
    const snap = (u, extraHi = {}, extraEdge = {}, meta) => {
      const hi = {};
      for (const v of visited) hi[v] = 'key';
      for (const v of done) hi[v] = 'done';
      if (u) hi[u] = 'active';
      Object.assign(hi, extraHi);
      const edgeHi = Object.fromEntries([...tree].map((t) => [t, 'done']));
      Object.assign(edgeHi, extraEdge);
      R.snap({ ...drawGraph({ hi, edgeHi, tags: tags(), extra: rowBlocks(Q.map((q) => ({ id: q, label: q })), 'q', 'queue'), texts: [rowText('qt', 'queue →')] }), pins: u ? [{ id: 'u', label: 'u', target: u }] : [] }, meta);
    };
    snap(null, {}, {}, { line: 0, phase: 'Start', vars: { queue: s }, msg: `Start at <b>${s}</b>: mark it visited (yellow = discovered) and put it in the queue.` });
    while (Q.length) {
      const u = Q.shift();
      snap(u, {}, {}, { line: 2, phase: `Visit ${u}`, vars: { u, queue: Q.join(' ') || '∅' }, msg: `Dequeue <b>${u}</b> (distance ${dist[u]}) from the front of the queue.` });
      for (const [v] of adj[u]) {
        R.count('edges checked');
        const isNew = !visited.has(v);
        if (isNew) { visited.add(v); dist[v] = dist[u] + 1; Q.push(v); tree.add(eid(u, v)); }
        snap(u, { [v]: isNew ? 'new' : visited.has(v) && !done.has(v) ? 'key' : 'done' }, { [eid(u, v)]: isNew ? 'done' : 'compare' }, { line: isNew ? 5 : 4, phase: `Visit ${u}`, vars: { u, v, queue: Q.join(' ') }, msg: isNew ? `${v} is new: mark visited, dist[${v}] = ${dist[v]}, enqueue it.` : `${v} was already discovered — skip it.` });
      }
      done.add(u);
    }
    snap(null, {}, {}, { line: 1, phase: 'Done', vars: { order: [...done].join(' ') }, msg: `Queue empty. Visit order: <b>${[...done].join(' → ')}</b>. Green edges form the BFS tree — the fewest-edges path from ${s} to every vertex.` });
    return R.steps;
  },
};

export const dfs = {
  id: 'dfs', title: 'Depth-First Search', cat: 'Graphs', week: '10', slides: 'graphs.html',
  blurb: 'Go as deep as possible before backtracking. The recursion call stack grows as a tower on the right — exactly the stack from week 5.',
  time: { all: 'O(V + E)' }, space: 'O(V)',
  code: [
    'dfs(u):',
    '  visited.add(u)',
    '  for each neighbour v of u:',
    '    if v not in visited:',
    '      dfs(v)          // push a new call',
    '  return              // pop: backtrack',
  ],
  input: startInput('A'),
  run(s) {
    const R = new Recorder();
    R.stats = { 'edges checked': 0 };
    const visited = new Set(), done = new Set(), tree = new Set(), order = [];
    const stack = [];
    const snap = (u, extraHi = {}, extraEdge = {}, meta) => {
      const hi = {};
      for (const v of visited) hi[v] = 'key';
      for (const v of done) hi[v] = 'done';
      for (const v of stack) hi[v] = hi[v] === 'done' ? 'done' : 'visited';
      if (u) hi[u] = 'active';
      Object.assign(hi, extraHi);
      const edgeHi = Object.fromEntries([...tree].map((t) => [t, 'done']));
      Object.assign(edgeHi, extraEdge);
      const tower = stack.map((v, k) => ({ id: `cs${k}`, label: `dfs(${v})`, w: 2.2, d: 1.4, h: 0.5, x: 11.5, z: 0, y: k * 0.58, state: k === stack.length - 1 ? 'active' : 'default', from: v }));
      R.snap({ ...drawGraph({ hi, edgeHi, extra: tower, texts: [{ id: 'cst', text: 'call stack', x: 11.5, y: 0, z: 1.6, cls: 'chip' }], tags: Object.fromEntries(order.map((v, k) => [v, `#${k + 1}`])) }), pins: u ? [{ id: 'u', label: 'u', target: u }] : [] }, meta);
    };
    const rec = (u, from) => {
      visited.add(u); order.push(u); stack.push(u);
      if (from) tree.add(eid(from, u));
      snap(u, {}, {}, { line: 1, phase: `Visit ${u}`, vars: { u, depth: stack.length }, msg: `Call dfs(${u}) — push it on the call stack and mark ${u} visited (#${order.length}).` });
      for (const [v] of adj[u]) {
        R.count('edges checked');
        const isNew = !visited.has(v);
        snap(u, { [v]: isNew ? 'compare' : undefined }, { [eid(u, v)]: isNew ? 'active' : tree.has(eid(u, v)) ? 'done' : 'compare' }, { line: 3, phase: `Visit ${u}`, vars: { u, v }, msg: isNew ? `Neighbour ${v} is unvisited — go deeper.` : `Neighbour ${v} is already visited — skip.` });
        if (isNew) rec(v, u);
      }
      stack.pop(); done.add(u);
      snap(stack[stack.length - 1], {}, {}, { line: 5, phase: `Backtrack ${u}`, vars: { finished: u }, msg: `All neighbours of ${u} explored. Pop dfs(${u}) and backtrack${stack.length ? ` to ${stack[stack.length - 1]}` : ''}.` });
    };
    snap(null, {}, {}, { line: 0, phase: 'Start', msg: `Run dfs(${s}). Neighbours are tried in alphabetical order.` });
    rec(s, null);
    snap(null, {}, {}, { phase: 'Done', vars: { order: order.join(' ') }, msg: `Discovery order: <b>${order.join(' → ')}</b>. Green edges form the DFS tree. Compare with BFS — DFS dives deep instead of spreading out.` });
    return R.steps;
  },
};

export const dijkstra = {
  id: 'dijkstra', title: 'Dijkstra’s Shortest Path', cat: 'Graphs', week: '10', slides: 'graphs.html',
  blurb: 'Grow a set of vertices whose shortest distance is final, always picking the closest unfinished vertex from a priority queue and relaxing its edges.',
  time: { 'binary heap': 'O((V + E) log V)' }, space: 'O(V)',
  code: [
    'dist[·] ← ∞; dist[s] ← 0; PQ ← {(0, s)}',
    'while PQ not empty:',
    '  u ← PQ.extractMin()      // closest unfinished',
    '  if u finalised: continue; finalise u',
    '  for each edge (u, v, w):',
    '    if dist[u] + w < dist[v]:   // relax',
    '      dist[v] ← dist[u] + w; prev[v] ← u; PQ.insert(v)',
  ],
  input: startInput('A'),
  run(s) {
    const R = new Recorder();
    R.stats = { relaxations: 0, 'PQ pops': 0 };
    const dist = Object.fromEntries(Object.keys(V).map((k) => [k, Infinity]));
    const prev = {}, done = new Set();
    dist[s] = 0;
    let pq = [{ d: 0, v: s, k: 0 }];
    let uid = 1;
    const tags = () => Object.fromEntries(Object.keys(V).map((k) => [k, dist[k] === Infinity ? '∞' : `${dist[k]}`]));
    const snap = (u, extraHi = {}, extraEdge = {}, meta) => {
      const hi = {};
      for (const v of Object.keys(V)) if (dist[v] < Infinity) hi[v] = 'key';
      for (const v of done) hi[v] = 'done';
      if (u) hi[u] = 'active';
      Object.assign(hi, extraHi);
      const edgeHi = {};
      for (const [v, p] of Object.entries(prev)) edgeHi[eid(v, p)] = done.has(v) ? 'done' : 'visited';
      Object.assign(edgeHi, extraEdge);
      const sorted = pq.slice().sort((a, b) => a.d - b.d || a.k - b.k);
      const row = sorted.map((e, k) => ({ id: `pq${e.k}`, from: e.v, label: `${e.v}:${e.d}`, w: 1.15, d: 0.9, h: 0.4, x: -7 + k * 1.35, z: ROW_Z, state: k === 0 ? 'compare' : 'key' }));
      R.snap({ ...drawGraph({ hi, edgeHi, tags: tags(), weights: true, extra: row, texts: [rowText('pqt', 'min-PQ →')] }), pins: u ? [{ id: 'u', label: 'u', target: u }] : [] }, meta);
    };
    snap(null, {}, {}, { line: 0, phase: 'Start', vars: { [`dist[${s}]`]: 0 }, msg: `All distances start at ∞ except dist[${s}] = 0. Edge weights are shown on each road.` });
    while (pq.length) {
      pq.sort((a, b) => a.d - b.d || a.k - b.k);
      const { d, v: u } = pq.shift();
      R.count('PQ pops');
      if (done.has(u)) {
        snap(null, {}, {}, { line: 3, phase: 'Skip', vars: { u }, msg: `Popped a stale entry ${u}:${d} — ${u} is already final, skip it.` });
        continue;
      }
      done.add(u);
      snap(u, {}, {}, { line: 3, phase: `Finalise ${u}`, vars: { u, [`dist[${u}]`]: d }, msg: `Extract the closest vertex <b>${u}</b> (distance ${d}). No shorter path can exist, so ${u} is final (green).` });
      for (const [v, w] of adj[u]) {
        if (done.has(v)) continue;
        const nd = dist[u] + w;
        const better = nd < dist[v];
        snap(u, { [v]: 'compare' }, { [eid(u, v)]: 'compare' }, { line: 5, phase: `Finalise ${u}`, vars: { u, v, w, [`dist[${u}] + w`]: nd, [`dist[${v}]`]: dist[v] === Infinity ? '∞' : dist[v] }, msg: `Relax ${u}→${v}: ${dist[u]} + ${w} = ${nd} ${better ? '<' : '≥'} ${dist[v] === Infinity ? '∞' : dist[v]}. ${better ? 'Shorter — update!' : 'Not shorter, keep the old value.'}` });
        if (better) {
          dist[v] = nd; prev[v] = u;
          pq.push({ d: nd, v, k: uid++ });
          R.count('relaxations');
          snap(u, { [v]: 'new' }, { [eid(u, v)]: 'active' }, { line: 6, phase: `Finalise ${u}`, vars: { [`dist[${v}]`]: nd, [`prev[${v}]`]: u }, msg: `dist[${v}] ← ${nd}, prev[${v}] ← ${u}, and push (${v}, ${nd}) into the priority queue.` });
        }
      }
    }
    snap(null, {}, {}, { line: 1, phase: 'Done', vars: Object.fromEntries(Object.keys(V).map((k) => [k, dist[k]])), msg: `Every vertex is final. Green edges are the shortest-path tree from ${s}; follow prev[] backwards to read any route.` });
    return R.steps;
  },
};

// ─────────────────────────────────────────────────────── Complexity race
export const complexity = {
  id: 'big-o', title: 'Big-O Growth Race', cat: 'Complexity', week: '3', slides: 'complexity_analysis.html',
  blurb: 'Five complexity classes race as n grows. Each column is the number of basic operations — watch n² tower over everything else.',
  time: {}, space: '',
  code: [
    'O(1)        constant      — array index',
    'O(log n)    logarithmic   — binary search',
    'O(n)        linear        — linear search',
    'O(n log n)  linearithmic  — merge sort',
    'O(n²)       quadratic     — bubble sort',
  ],
  input: {
    label: 'Largest n', hint: '4 to 16', default: '12',
    random: () => String(randInt(6, 16)),
    parse(s) {
      const n = Number(s.trim());
      if (!Number.isInteger(n) || n < 4 || n > 16) throw new Error('Pick n between 4 and 16.');
      return n;
    },
  },
  run(N) {
    const R = new Recorder();
    const classes = [
      ['O(1)', () => 1, 'visited'], ['O(log n)', (n) => Math.max(1, Math.log2(n)), 'new'], ['O(n)', (n) => n, 'done'],
      ['O(n log n)', (n) => n * Math.max(1, Math.log2(n)), 'compare'], ['O(n²)', (n) => n * n, 'swap'],
    ];
    const maxOps = N * N;
    const draw = (upto) => {
      const nodes = [], texts = [];
      classes.forEach(([name, f, st], c) => {
        texts.push({ id: `cl${c}`, text: name, x: centered(0, N, 1.05) - 1.9, y: 0.2, z: c * 1.5, cls: 'chip' });
        for (let n = 1; n <= upto; n++) {
          const ops = f(n);
          nodes.push({ id: `${c}-${n}`, label: n === upto ? Math.round(ops) : '', w: 0.85, d: 1.1, h: 0.12 + (ops / maxOps) * 5, x: centered(n - 1, N, 1.05), z: c * 1.5, state: st });
        }
      });
      for (let n = 1; n <= upto; n++) texts.push({ id: `n${n}`, text: `${n}`, x: centered(n - 1, N, 1.05), y: 0, z: classes.length * 1.5 - 0.3, cls: 'axis' });
      return { nodes, texts };
    };
    for (let n = 1; n <= N; n++) {
      const row = classes.map(([name, f]) => `${name} = ${Math.round(f(n))}`).join(' · ');
      R.snap(draw(n), { line: 4, phase: `n = ${n}`, vars: Object.fromEntries(classes.map(([name, f]) => [name, Math.round(f(n))])), msg: n === 1 ? 'With tiny inputs, every algorithm is fast. Let n grow…' : `n = ${n}: ${row}.${n === N ? ` At n = ${N}, the quadratic algorithm already does ${Math.round((N * N) / (N * Math.log2(N)))}× more work than n log n — and the gap keeps widening.` : ''}` });
    }
    return R.steps;
  },
};
