import { Recorder, parseNumbers, parseScript, randomList, randInt, centered, hex } from './util.js';

const GAP = 1.3;
const cell = (id, v, i, n, state = 'default', extra = {}) => ({
  id, label: v, w: 1.1, d: 1.1, h: 0.6, x: centered(i, n, GAP), z: 0, state, sub: i, ...extra,
});

// ───────────────────────────────────────────────────────── Linear search
export const linearSearch = {
  id: 'linear-search', title: 'Linear Search', cat: 'Searching', week: '11–12', slides: 'algorithms.html',
  blurb: 'Check every element from left to right until the target is found or the array runs out. Works on unsorted data.',
  time: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)' }, space: 'O(1)',
  code: [
    'for i ← 0 to n − 1:',
    '  if A[i] = target:',
    '    return i',
    'return −1   // not found',
  ],
  input: {
    label: 'Array ; target', hint: 'e.g. "4 9 2 7 5 ; 7"', default: '14 3 22 8 17 5 30 11 ; 17',
    random: () => { const a = randomList(9, 1, 40); return `${a.join(' ')} ; ${Math.random() < 0.75 ? a[randInt(0, 8)] : 41}`; },
    parse(s) {
      const [a, t] = s.split(';');
      if (t == null) throw new Error('Add the target after a semicolon, e.g. "4 9 2 ; 9"');
      return { A: parseNumbers(a, { maxCount: 12 }), target: parseNumbers(t, { maxCount: 1 })[0] };
    },
  },
  run({ A, target }) {
    const R = new Recorder();
    const n = A.length;
    R.stats = { comparisons: 0 };
    const draw = (hi = {}) => A.map((v, i) => cell(`c${i}`, v, i, n, hi[i] || 'default'));
    const tgt = { id: 't', text: `target = <b>${target}</b>`, x: centered(0, n, GAP) - 2.9, y: 0.3, z: 0, cls: 'chip' };
    R.snap({ nodes: draw(), texts: [tgt] }, { phase: 'Start', vars: { target }, msg: `Look for <b>${target}</b> by checking each slot in order.` });
    for (let i = 0; i < n; i++) {
      R.count('comparisons');
      const hit = A[i] === target;
      const hi = {};
      for (let k = 0; k < i; k++) hi[k] = 'muted';
      hi[i] = hit ? 'found' : 'compare';
      R.snap({ nodes: draw(hi), texts: [tgt], pins: [{ id: 'i', label: 'i', target: `c${i}` }] }, { line: 1, phase: 'Scan', vars: { i, 'A[i]': A[i], target }, msg: `A[${i}] = <b>${A[i]}</b>. ${hit ? 'Match!' : `Not ${target}, move on.`}` });
      if (hit) {
        R.snap({ nodes: draw(hi), texts: [tgt], pins: [{ id: 'i', label: `found @ ${i}`, target: `c${i}`, color: 'green' }] }, { line: 2, phase: 'Found', vars: { i }, msg: `Return index ${i} after ${i + 1} comparison${i ? 's' : ''}.` });
        return R.steps;
      }
    }
    R.snap({ nodes: draw(Object.fromEntries(A.map((_, i) => [i, 'muted']))), texts: [tgt] }, { line: 3, phase: 'Not found', msg: `Checked all ${n} elements — ${target} is not in the array. Return −1. That is the worst case: n comparisons.` });
    return R.steps;
  },
};

// ───────────────────────────────────────────────────────── Binary search
export const binarySearch = {
  id: 'binary-search', title: 'Binary Search', cat: 'Searching', week: '11–12', slides: 'algorithms.html',
  blurb: 'On a sorted array, compare with the middle element and throw away the half that cannot contain the target. Discarded cells sink away.',
  time: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)',
  code: [
    'lo ← 0; hi ← n − 1',
    'while lo ≤ hi:',
    '  mid ← ⌊(lo + hi) / 2⌋',
    '  if A[mid] = target: return mid',
    '  else if A[mid] < target: lo ← mid + 1',
    '  else: hi ← mid − 1',
    'return −1',
  ],
  input: {
    label: 'Sorted array ; target', hint: 'Values are sorted for you', default: '2 5 8 12 16 23 38 45 56 72 91 ; 72',
    random: () => { const a = [...new Set(randomList(12, 1, 95))].sort((x, y) => x - y); return `${a.join(' ')} ; ${a[randInt(0, a.length - 1)]}`; },
    parse(s) {
      const [a, t] = s.split(';');
      if (t == null) throw new Error('Add the target after a semicolon, e.g. "1 4 9 ; 9"');
      return { A: parseNumbers(a, { maxCount: 14 }).sort((x, y) => x - y), target: parseNumbers(t, { maxCount: 1 })[0] };
    },
  },
  run({ A, target }) {
    const R = new Recorder();
    const n = A.length;
    R.stats = { comparisons: 0 };
    let lo = 0, hi = n - 1;
    const draw = (mid, hit) => A.map((v, i) => {
      const out = i < lo || i > hi;
      return cell(`c${i}`, v, i, n, i === mid ? (hit ? 'found' : 'compare') : out ? 'muted' : 'default', out ? { y: -0.35, h: 0.35 } : {});
    });
    const ps = (mid) => [
      lo <= hi && { id: 'lo', label: 'lo', target: `c${lo}`, color: 'blue' },
      lo <= hi && { id: 'hi', label: 'hi', target: `c${hi}`, color: 'violet' },
      mid != null && { id: 'mid', label: 'mid', target: `c${mid}`, color: 'amber' },
    ].filter(Boolean);
    const tgt = [{ id: 't', text: `target = <b>${target}</b>`, x: centered(0, n, GAP) - 2.9, y: 0.3, z: 0, cls: 'chip' }];
    R.snap({ nodes: draw(), pins: ps(), texts: tgt }, { line: 0, phase: 'Start', vars: { lo, hi, target }, msg: `The array is sorted, so we can search a shrinking window [lo..hi]. At most ⌈log₂(${n + 1})⌉ = ${Math.ceil(Math.log2(n + 1))} probes.` });
    let round = 0;
    while (lo <= hi) {
      round++;
      const mid = (lo + hi) >> 1;
      R.count('comparisons');
      R.snap({ nodes: draw(mid), pins: ps(mid), texts: tgt }, { line: 2, phase: `Probe ${round}`, vars: { lo, hi, mid, 'A[mid]': A[mid] }, msg: `mid = ⌊(${lo} + ${hi}) / 2⌋ = ${mid}. A[mid] = <b>${A[mid]}</b>.` });
      if (A[mid] === target) {
        R.snap({ nodes: draw(mid, true), pins: [{ id: 'mid', label: `found @ ${mid}`, target: `c${mid}`, color: 'green' }], texts: tgt }, { line: 3, phase: 'Found', vars: { mid }, msg: `${A[mid]} = target. Found at index ${mid} after only ${round} probe${round > 1 ? 's' : ''}.` });
        return R.steps;
      }
      if (A[mid] < target) {
        lo = mid + 1;
        R.snap({ nodes: draw(), pins: ps(), texts: tgt }, { line: 4, phase: `Probe ${round}`, vars: { lo, hi }, msg: `${A[mid]} < ${target}, so the target must be to the right. Discard the left half: lo ← ${lo}.` });
      } else {
        hi = mid - 1;
        R.snap({ nodes: draw(), pins: ps(), texts: tgt }, { line: 5, phase: `Probe ${round}`, vars: { lo, hi }, msg: `${A[mid]} > ${target}, so the target must be to the left. Discard the right half: hi ← ${hi}.` });
      }
    }
    R.snap({ nodes: draw(), texts: tgt }, { line: 6, phase: 'Not found', vars: { lo, hi }, msg: `lo > hi — the window is empty, so ${target} is not present. Return −1.` });
    return R.steps;
  },
};

// ─────────────────────────────────────────────────────────── Array ADT
export const arrayOps = {
  id: 'array', title: 'Array Operations', cat: 'Linear', week: '2 & 4', slides: 'intro_dsa_arrays.html',
  blurb: 'Contiguous memory with fixed capacity. Reading A[i] is instant, but inserting or deleting in the middle must shift every later element.',
  time: { access: 'O(1)', insert: 'O(n)', delete: 'O(n)' }, space: 'O(n)',
  code: [
    'get(i):        return base + i × size',
    'insert(i, x):  for k ← n down to i + 1: A[k] ← A[k − 1]',
    '               A[i] ← x; n ← n + 1',
    'delete(i):     for k ← i to n − 2: A[k] ← A[k + 1]',
    '               n ← n − 1',
    'append(x):     A[n] ← x; n ← n + 1',
  ],
  input: {
    label: 'Values ; operations', hint: 'get i · insert i x · delete i · append x', default: '12 7 30 4 19 ; get 3 ; insert 1 25 ; delete 3 ; append 8',
    random: () => `${randomList(5, 1, 40).join(' ')} ; get ${randInt(0, 4)} ; insert ${randInt(0, 4)} ${randInt(1, 40)} ; delete ${randInt(0, 4)} ; append ${randInt(1, 40)}`,
    parse(s) {
      const { values, ops } = parseScript(s);
      if (values.length > 8) throw new Error('Start with at most 8 values (capacity is 10).');
      for (const [op] of ops) if (!['get', 'insert', 'delete', 'append'].includes(op)) throw new Error(`Unknown operation "${op}".`);
      return { values, ops };
    },
  },
  run({ values, ops }) {
    const CAP = 10;
    const R = new Recorder();
    R.stats = { reads: 0, shifts: 0 };
    let A = values.map((v, k) => ({ id: `v${k}`, v }));
    let uid = A.length;
    const slots = () => Array.from({ length: CAP }, (_, i) => ({ id: `s${i}`, label: '', w: 1.15, d: 1.15, h: 0.12, x: centered(i, CAP, GAP), z: 0, y: -0.02, state: 'ghost', ghost: true, sub: `${hex(0x40 + i * 4)}`, subTone: 'mute' }));
    const draw = (hi = {}, extra = {}) => [
      ...slots(),
      ...A.map((e, i) => ({ id: e.id, label: e.v, w: 1.0, d: 1.0, h: 0.6, x: centered(i, CAP, GAP), y: 0.1, z: 0, state: hi[e.id] || 'default', ...(extra[e.id] || {}) })),
    ];
    const info = () => [{ id: 'n', text: `n = <b>${A.length}</b> · capacity = ${CAP}`, x: centered(0, CAP, GAP), y: 0, z: 2.1, cls: 'chip' }];
    R.snap({ nodes: draw(), texts: info() }, { phase: 'Start', vars: { n: A.length }, msg: 'An array is one block of memory. Each slot sits at <i>base + i × 4 bytes</i> — the addresses under each slot.' });
    for (const [op, a, b] of ops) {
      const i = Number(a), x = Number(b);
      if (op === 'get') {
        if (!(i >= 0 && i < A.length)) { R.snap({ nodes: draw(), texts: info() }, { line: 0, phase: `get(${a})`, msg: `Index ${a} is out of bounds (n = ${A.length}). Real languages throw an IndexError here.` }); continue; }
        R.count('reads');
        R.snap({ nodes: draw({ [A[i].id]: 'found' }), texts: info(), pins: [{ id: 'p', label: `A[${i}]`, target: A[i].id, color: 'green' }] }, { line: 0, phase: `get(${i})`, vars: { i, address: hex(0x40 + i * 4), value: A[i].v }, msg: `get(${i}): compute the address 0x40 + ${i} × 4 = ${hex(0x40 + i * 4)} and read it directly — <b>${A[i].v}</b>. No loop needed: O(1).` });
      } else if (op === 'append' || op === 'insert') {
        const pos = op === 'append' ? A.length : i, val = op === 'append' ? Number(a) : x;
        if (A.length >= CAP) { R.snap({ nodes: draw(), texts: info() }, { line: 1, phase: `${op}`, msg: 'The array is full! A dynamic array would now allocate a bigger block (usually 2×) and copy everything over.' }); continue; }
        if (!(pos >= 0 && pos <= A.length) || !Number.isFinite(val)) { R.snap({ nodes: draw(), texts: info() }, { line: 1, phase: op, msg: `Invalid ${op} — index must be between 0 and ${A.length}.` }); continue; }
        const label = op === 'append' ? `append(${val})` : `insert(${pos}, ${val})`;
        const shifted = {};
        for (let k = A.length - 1; k >= pos; k--) {
          R.count('shifts');
          shifted[A[k].id] = { x: centered(k + 1, CAP, GAP) };
          R.snap({ nodes: draw({ [A[k].id]: 'swap' }, shifted), texts: info(), pins: [{ id: 'k', label: 'k', target: A[k].id, color: 'amber' }] }, { line: 1, phase: label, vars: { i: pos, k: k + 1 }, msg: `Shift A[${k}] = <b>${A[k].v}</b> right into slot ${k + 1} to open a gap.` });
        }
        const el = { id: `v${uid++}`, v: val };
        A.splice(pos, 0, el);
        R.snap({ nodes: draw({ [el.id]: 'new' }, { [el.id]: { enter: [0, 3, 0] } }), texts: info() }, { line: op === 'append' ? 5 : 2, phase: label, vars: { i: pos, x: val, n: A.length }, msg: op === 'append' ? `Write <b>${val}</b> into slot ${pos} — the first free slot. Appending is O(1).` : `Write <b>${val}</b> into the gap at index ${pos}. That took ${A.length - 1 - pos} shift${A.length - 1 - pos === 1 ? '' : 's'}: insert is O(n).` });
      } else if (op === 'delete') {
        if (!(i >= 0 && i < A.length)) { R.snap({ nodes: draw(), texts: info() }, { line: 3, phase: `delete(${a})`, msg: `Index ${a} is out of bounds.` }); continue; }
        const gone = A[i];
        R.snap({ nodes: draw({ [gone.id]: 'swap' }), texts: info(), pins: [{ id: 'd', label: 'delete', target: gone.id, color: 'red' }] }, { line: 3, phase: `delete(${i})`, vars: { i, value: gone.v }, msg: `Remove A[${i}] = <b>${gone.v}</b>. This leaves a hole that must be closed.` });
        A.splice(i, 1);
        const held = {};
        for (let k = i; k < A.length; k++) held[A[k].id] = { x: centered(k + 1, CAP, GAP) };
        for (let k = i; k < A.length; k++) {
          delete held[A[k].id];
          R.count('shifts');
          R.snap({ nodes: draw({ [A[k].id]: 'swap' }, held), texts: info(), pins: [{ id: 'k', label: 'k', target: A[k].id, color: 'amber' }] }, { line: 3, phase: `delete(${i})`, vars: { i, k }, msg: `Shift A[${k + 1}] = <b>${A[k].v}</b> left into slot ${k} to close the hole.` });
        }
        R.snap({ nodes: draw(), texts: info() }, { line: 4, phase: `delete(${i})`, vars: { n: A.length }, msg: `n ← ${A.length}. Deleting from the front is the worst case: every element moves.` });
      }
    }
    R.snap({ nodes: draw(), texts: info() }, { phase: 'Done', vars: { n: A.length }, msg: `Final array: [${A.map((e) => e.v).join(', ')}].` });
    return R.steps;
  },
};

// ──────────────────────────────────────────────────────────────── Stack
export const stack = {
  id: 'stack', title: 'Stack (LIFO)', cat: 'Linear', week: '5', slides: 'stacks_queues.html',
  blurb: 'Last In, First Out. Plates are pushed onto and popped off the top only — the tower grows and shrinks in 3D.',
  time: { push: 'O(1)', pop: 'O(1)', peek: 'O(1)' }, space: 'O(n)',
  code: [
    'push(x):  top ← top + 1; S[top] ← x',
    'pop():    if top = −1: error “underflow”',
    '          x ← S[top]; top ← top − 1; return x',
    'peek():   return S[top]',
    'isEmpty(): return top = −1',
  ],
  input: {
    label: 'Operations', hint: 'push x · pop · peek', default: 'push 4 ; push 7 ; push 2 ; peek ; pop ; push 9 ; push 5 ; pop ; pop',
    random: () => Array.from({ length: 8 }, () => (Math.random() < 0.62 ? `push ${randInt(1, 50)}` : Math.random() < 0.8 ? 'pop' : 'peek')).join(' ; '),
    parse(s) {
      const { values, ops } = parseScript(s);
      const pre = values.map((v) => ['push', String(v)]);
      for (const [op] of ops) if (!['push', 'pop', 'peek'].includes(op)) throw new Error(`Unknown operation "${op}". Use push, pop or peek.`);
      if (pre.length + ops.length > 18) throw new Error('Keep it to 18 operations.');
      return [...pre, ...ops];
    },
  },
  run(ops) {
    const R = new Recorder();
    const S = [];
    let uid = 0;
    R.stats = { pushes: 0, pops: 0 };
    const H = 0.62, Y = 0.7;
    const draw = (hi = {}, extra = {}) => [
      { id: 'base', label: '', w: 2.4, d: 2.4, h: 0.1, y: -0.05, state: 'ghost', ghost: true },
      ...S.map((e, i) => ({ id: e.id, label: e.v, w: 1.9, d: 1.9, h: H, y: 0.06 + i * Y, state: hi[e.id] || 'default', sub: i, ...(extra[e.id] || {}) })),
    ];
    const tp = (color = 'indigo') => (S.length ? [{ id: 'top', label: 'top', target: S[S.length - 1].id, color }] : []);
    const out = [];
    const outTexts = () => [{ id: 'o', text: `popped: <b>${out.length ? out.join(', ') : '—'}</b>`, x: 3.4, y: 0.2, z: 0, cls: 'chip' }];
    R.snap({ nodes: draw(), texts: outTexts() }, { phase: 'Empty', vars: { top: -1 }, msg: 'An empty stack. <b>top = −1</b> means there is nothing to pop.' });
    for (const [op, a] of ops) {
      if (op === 'push') {
        const e = { id: `s${uid++}`, v: Number(a) };
        S.push(e);
        R.count('pushes');
        R.snap({ nodes: draw({ [e.id]: 'new' }, { [e.id]: { enter: [0, 5, 0] } }), pins: tp(), texts: outTexts() }, { line: 0, phase: `push(${e.v})`, vars: { top: S.length - 1, size: S.length }, msg: `push(${e.v}): increment top to ${S.length - 1} and place <b>${e.v}</b> on top. Nothing else moves — O(1).` });
      } else if (op === 'pop') {
        if (!S.length) { R.snap({ nodes: draw(), texts: outTexts() }, { line: 1, phase: 'pop()', vars: { top: -1 }, msg: '<b>Stack underflow!</b> pop() on an empty stack is an error.' }); continue; }
        const e = S[S.length - 1];
        R.snap({ nodes: draw({ [e.id]: 'swap' }, { [e.id]: { exit: [0, 2.5, 0] } }), pins: tp('red'), texts: outTexts() }, { line: 2, phase: 'pop()', vars: { top: S.length - 1, x: e.v }, msg: `pop(): read the top element <b>${e.v}</b>…` });
        S.pop(); out.push(e.v);
        R.count('pops');
        R.snap({ nodes: draw(), pins: tp(), texts: outTexts() }, { line: 2, phase: 'pop()', vars: { top: S.length - 1, returned: e.v }, msg: `…lift it off and decrement top to ${S.length - 1}. Return <b>${e.v}</b> — the most recently pushed item leaves first.` });
      } else if (op === 'peek') {
        if (!S.length) { R.snap({ nodes: draw(), texts: outTexts() }, { line: 3, phase: 'peek()', msg: 'peek() on an empty stack — nothing to see.' }); continue; }
        const e = S[S.length - 1];
        R.snap({ nodes: draw({ [e.id]: 'found' }), pins: tp('green'), texts: outTexts() }, { line: 3, phase: 'peek()', vars: { top: S.length - 1, value: e.v }, msg: `peek() looks at the top value <b>${e.v}</b> without removing it.` });
      }
    }
    R.snap({ nodes: draw(), pins: tp(), texts: outTexts() }, { line: 4, phase: 'Done', vars: { size: S.length }, msg: `Final stack (bottom → top): [${S.map((e) => e.v).join(', ')}]. Popped in order: ${out.join(', ') || 'nothing'}.` });
    return R.steps;
  },
};

// ────────────────────────────────────────────────── Queue (circular buffer)
export const queue = {
  id: 'queue', title: 'Queue (Circular)', cat: 'Linear', week: '5', slides: 'stacks_queues.html',
  blurb: 'First In, First Out — built on a circular array. Front and rear pointers chase each other around the ring, wrapping with modulo.',
  time: { enqueue: 'O(1)', dequeue: 'O(1)', peek: 'O(1)' }, space: 'O(n)',
  code: [
    'enqueue(x): if size = cap: error “full”',
    '            Q[rear] ← x; rear ← (rear + 1) mod cap; size++',
    'dequeue():  if size = 0: error “empty”',
    '            x ← Q[front]; front ← (front + 1) mod cap; size−−',
    '            return x',
  ],
  input: {
    label: 'Operations', hint: 'enq x · deq', default: 'enq 5 ; enq 8 ; enq 3 ; deq ; enq 6 ; enq 1 ; deq ; deq ; enq 9 ; enq 4 ; enq 7 ; enq 2',
    random: () => Array.from({ length: 12 }, () => (Math.random() < 0.65 ? `enq ${randInt(1, 50)}` : 'deq')).join(' ; '),
    parse(s) {
      const { ops } = parseScript(s);
      for (const [op] of ops) if (!['enq', 'deq', 'enqueue', 'dequeue'].includes(op)) throw new Error(`Unknown operation "${op}". Use enq x or deq.`);
      if (ops.length > 20) throw new Error('Keep it to 20 operations.');
      return ops.map(([op, a]) => [op.startsWith('enq') ? 'enq' : 'deq', a]);
    },
  },
  run(ops) {
    const CAP = 8, RAD = 3.3;
    const R = new Recorder();
    R.stats = { enqueued: 0, dequeued: 0 };
    const Q = Array(CAP).fill(null);
    let front = 0, rear = 0, size = 0, uid = 0;
    const at = (i) => ({ x: Math.sin((i / CAP) * Math.PI * 2) * RAD, z: -Math.cos((i / CAP) * Math.PI * 2) * RAD });
    const draw = (hi = {}, extra = {}) => [
      ...Array.from({ length: CAP }, (_, i) => ({ id: `slot${i}`, label: '', w: 1.35, d: 1.35, h: 0.12, ...at(i), y: -0.02, state: 'ghost', ghost: true, sub: i, subTone: 'mute' })),
      ...Q.map((e, i) => e && { id: e.id, label: e.v, w: 1.1, d: 1.1, h: 0.6, ...at(i), y: 0.1, state: hi[e.id] || 'default', ...(extra[e.id] || {}) }).filter(Boolean),
    ];
    const ps = () => [
      { id: 'front', label: 'front', target: `slot${front}`, color: 'green' },
      { id: 'rear', label: 'rear', target: `slot${rear}`, color: 'violet' },
    ];
    const txt = () => [{ id: 'c', text: `size <b>${size}</b> / ${CAP}`, x: 0, y: 0.1, z: RAD + 2.3, cls: 'chip' }];
    R.snap({ nodes: draw(), pins: ps(), texts: txt() }, { phase: 'Empty', vars: { front, rear, size }, msg: 'A circular queue of capacity 8. front = rear = 0 and size = 0. When a pointer passes slot 7 it wraps back to 0.' });
    for (const [op, a] of ops) {
      if (op === 'enq') {
        if (size === CAP) { R.snap({ nodes: draw(), pins: ps(), texts: txt() }, { line: 0, phase: `enqueue(${a})`, vars: { front, rear, size }, msg: '<b>Queue full!</b> Every slot is taken, so enqueue fails.' }); continue; }
        const e = { id: `q${uid++}`, v: Number(a) };
        Q[rear] = e;
        const was = rear;
        R.snap({ nodes: draw({ [e.id]: 'new' }, { [e.id]: { enter: [0, 4, 0] } }), pins: ps(), texts: txt() }, { line: 1, phase: `enqueue(${e.v})`, vars: { front, rear, size }, msg: `Write <b>${e.v}</b> into slot rear = ${rear}.` });
        rear = (rear + 1) % CAP; size++;
        R.count('enqueued');
        R.snap({ nodes: draw(), pins: ps(), texts: txt() }, { line: 1, phase: `enqueue(${e.v})`, vars: { front, rear, size }, msg: `Advance rear: (${was} + 1) mod ${CAP} = ${rear}${was === CAP - 1 ? ' — it wrapped around to the start!' : '.'}` });
      } else {
        if (!size) { R.snap({ nodes: draw(), pins: ps(), texts: txt() }, { line: 2, phase: 'dequeue()', vars: { front, rear, size }, msg: '<b>Queue empty!</b> Nothing to dequeue.' }); continue; }
        const e = Q[front];
        R.snap({ nodes: draw({ [e.id]: 'swap' }), pins: ps(), texts: txt() }, { line: 3, phase: 'dequeue()', vars: { front, rear, size, x: e.v }, msg: `Read the oldest element <b>${e.v}</b> at front = ${front}.` });
        Q[front] = null;
        const was = front;
        front = (front + 1) % CAP; size--;
        R.count('dequeued');
        R.snap({ nodes: draw(), pins: ps(), texts: txt() }, { line: 3, phase: 'dequeue()', vars: { front, rear, size, returned: e.v }, msg: `Return <b>${e.v}</b> and advance front to ${front}${was === CAP - 1 ? ' (wrapped!)' : ''}. Nothing else shifts — that is why a circular buffer makes dequeue O(1).` });
      }
    }
    R.snap({ nodes: draw(), pins: ps(), texts: txt() }, { line: 4, phase: 'Done', vars: { front, rear, size }, msg: `Final queue (front → rear): [${Array.from({ length: size }, (_, k) => Q[(front + k) % CAP].v).join(', ')}].` });
    return R.steps;
  },
};
