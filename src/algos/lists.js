import { Recorder, parseScript, randInt, centered, hex } from './util.js';

const GAP = 2.6;

// A tiny linked-list model: nodes keyed by id, each with a value and next id.
function makeList(values) {
  const nodes = new Map();
  let head = null, prev = null;
  values.forEach((v, k) => {
    const id = `n${k}`;
    nodes.set(id, { id, v, next: null, addr: hex(0x10 + k * 0x18) });
    if (prev) nodes.get(prev).next = id; else head = id;
    prev = id;
  });
  return { nodes, head, uid: values.length };
}
function order(L) {
  const out = [];
  let c = L.head;
  while (c && out.length < 40) { out.push(c); c = L.nodes.get(c).next; }
  return out;
}
// Draw the list. `over` maps id → {x, z} overrides, `hi` maps id → state.
function drawList(L, { hi = {}, over = {}, fixed = null, edgeHi = {}, nullSide = () => 1 } = {}) {
  const ord = fixed || order(L);
  const n = ord.length;
  const nodes = [], edges = [], texts = [];
  const pos = {};
  ord.forEach((id, i) => (pos[id] = { x: centered(i, Math.max(n, 1), GAP), z: 0 }));
  for (const [id, p] of Object.entries(over)) pos[id] = { ...(pos[id] || { x: 0, z: 0 }), ...p };
  for (const [id, nd] of L.nodes) {
    if (!pos[id]) continue;
    nodes.push({ id, label: nd.v, w: 1.5, d: 1.1, h: 0.6, ...pos[id], state: hi[id] || 'default', sub: nd.addr, subTone: 'mute' });
    if (nd.next && pos[nd.next]) edges.push({ id: `${id}>${nd.next}`, from: id, to: nd.next, directed: true, state: edgeHi[id] || 'default' });
  }
  // a NULL marker beside every node whose next pointer is null
  for (const [id, nd] of L.nodes) {
    if (!pos[id] || nd.next) continue;
    const dir = nullSide(id);
    texts.push({ id: `null-${id}`, text: 'NULL', x: pos[id].x + 1.55 * dir, y: 0.3, z: pos[id].z || 0, cls: 'null' });
  }
  return { nodes, edges, texts };
}
const headPin = (L, extra = []) => [...(L.head ? [{ id: 'head', label: 'head', target: L.head, color: 'slate' }] : []), ...extra];

export const linkedList = {
  id: 'linked-list', title: 'Singly Linked List', cat: 'Linear', week: '6', slides: 'linked_lists.html',
  blurb: 'Nodes scattered in memory (see the addresses), each holding a value and a pointer to the next. Insert and delete re-wire pointers instead of shifting data.',
  time: { access: 'O(n)', 'insert @head': 'O(1)', 'insert @i': 'O(n)', search: 'O(n)' }, space: 'O(n)',
  code: [
    'insert(i, x):  node ← new Node(x)',
    '  if i = 0: node.next ← head; head ← node; return',
    '  curr ← head; repeat i − 1 times: curr ← curr.next',
    '  node.next ← curr.next; curr.next ← node',
    'delete(x):     prev ← null; curr ← head',
    '  while curr and curr.val ≠ x: prev ← curr; curr ← curr.next',
    '  prev.next ← curr.next   // bypass (or head ← curr.next)',
    'search(x):     walk from head comparing each value',
  ],
  input: {
    label: 'Values ; operations', hint: 'insert i x · delete x · search x', default: '12 7 30 4 ; insert 0 5 ; insert 3 21 ; search 30 ; delete 7 ; search 99',
    random: () => `${Array.from({ length: 4 }, () => randInt(1, 50)).join(' ')} ; insert ${randInt(0, 4)} ${randInt(1, 50)} ; delete ${randInt(1, 50)} ; search ${randInt(1, 50)}`,
    parse(s) {
      const { values, ops } = parseScript(s);
      if (values.length > 6) throw new Error('Start with at most 6 values.');
      for (const [op] of ops) if (!['insert', 'delete', 'search'].includes(op)) throw new Error(`Unknown operation "${op}".`);
      return { values, ops };
    },
  },
  run({ values, ops }) {
    const R = new Recorder();
    R.stats = { hops: 0 };
    const L = makeList(values);
    const snap = (o, meta, pins = []) => R.snap({ ...drawList(L, o), pins: headPin(L, pins) }, meta);
    snap({}, { phase: 'Start', msg: 'Each node stores a value and a pointer (<b>next</b>) to the following node. The last node points to NULL. Notice the addresses are not consecutive.' });
    for (const [op, a, b] of ops) {
      if (op === 'insert') {
        const i = Number(a), x = Number(b);
        const ord = order(L);
        if (!(i >= 0 && i <= ord.length) || !Number.isFinite(x)) { snap({}, { line: 0, phase: `insert(${a}, ${b})`, msg: `Index ${a} is out of range (length ${ord.length}).` }); continue; }
        const id = `n${L.uid}`;
        L.nodes.set(id, { id, v: x, next: null, addr: hex(0x10 + L.uid++ * 0x18) });
        const ph = `insert(${i}, ${x})`;
        if (i === 0) {
          const over = { [id]: { x: centered(0, ord.length + 1, GAP) - GAP * 0.4, z: 2.2 } };
          snap({ hi: { [id]: 'new' }, over, fixed: ord }, { line: 0, phase: ph, vars: { i, x }, msg: `Allocate a new node for <b>${x}</b> somewhere in memory (${L.nodes.get(id).addr}).` });
          L.nodes.get(id).next = L.head;
          snap({ hi: { [id]: 'new' }, over, fixed: ord, edgeHi: { [id]: 'active' } }, { line: 1, phase: ph, vars: { i, x }, msg: 'Point node.next at the current head.' });
          L.head = id;
          snap({ hi: { [id]: 'new' }, over, fixed: ord, edgeHi: { [id]: 'active' } }, { line: 1, phase: ph, vars: { i, x }, msg: 'Move head to the new node. Done in O(1) — no other node was touched.' });
          snap({}, { line: 1, phase: ph, msg: `The list is now [${order(L).map((q) => L.nodes.get(q).v).join(' → ')}].` });
          continue;
        }
        let curr = L.head;
        snap({ hi: { [curr]: 'active' }, fixed: ord }, { line: 2, phase: ph, vars: { i, x, step: 0 }, msg: `We need the node <i>before</i> position ${i}. Start at head.` }, [{ id: 'curr', label: 'curr', target: curr }]);
        for (let k = 0; k < i - 1; k++) {
          curr = L.nodes.get(curr).next;
          R.count('hops');
          snap({ hi: { [curr]: 'active' }, fixed: ord }, { line: 2, phase: ph, vars: { i, x, step: k + 1 }, msg: `curr ← curr.next (hop ${k + 1}). Linked lists have no index arithmetic — we must walk.` }, [{ id: 'curr', label: 'curr', target: curr }]);
        }
        const cx = ord.indexOf(curr);
        const over = { [id]: { x: centered(cx, ord.length, GAP) + GAP / 2, z: 2.2 } };
        snap({ hi: { [curr]: 'active', [id]: 'new' }, over, fixed: ord }, { line: 0, phase: ph, vars: { i, x }, msg: `Create the new node <b>${x}</b> at ${L.nodes.get(id).addr}.` }, [{ id: 'curr', label: 'curr', target: curr }]);
        L.nodes.get(id).next = L.nodes.get(curr).next;
        snap({ hi: { [curr]: 'active', [id]: 'new' }, over, fixed: ord, edgeHi: { [id]: 'active' } }, { line: 3, phase: ph, vars: { i, x }, msg: `Step 1: node.next ← curr.next${L.nodes.get(id).next ? ` (node ${L.nodes.get(L.nodes.get(id).next).v})` : ' (NULL)'}. Order matters — doing this first means we never lose the rest of the list.` }, [{ id: 'curr', label: 'curr', target: curr }]);
        L.nodes.get(curr).next = id;
        snap({ hi: { [curr]: 'active', [id]: 'new' }, over, fixed: ord, edgeHi: { [curr]: 'active', [id]: 'active' } }, { line: 3, phase: ph, vars: { i, x }, msg: 'Step 2: curr.next ← node. The old arrow disappears, the new node is spliced in.' }, [{ id: 'curr', label: 'curr', target: curr }]);
        snap({}, { line: 3, phase: ph, msg: `Re-drawn neatly: [${order(L).map((q) => L.nodes.get(q).v).join(' → ')}]. Nothing in memory actually moved.` });
      } else if (op === 'delete' || op === 'search') {
        const x = Number(a);
        const ph = `${op}(${x})`;
        const ord = order(L);
        let prev = null, curr = L.head;
        const pp = () => [prev && { id: 'prev', label: 'prev', target: prev, color: 'violet' }, curr && { id: 'curr', label: 'curr', target: curr }].filter(Boolean);
        while (curr) {
          const hit = L.nodes.get(curr).v === x;
          snap({ hi: { [curr]: hit ? 'found' : 'compare' }, fixed: ord }, { line: op === 'delete' ? 5 : 7, phase: ph, vars: { x, 'curr.val': L.nodes.get(curr).v }, msg: `curr.val = <b>${L.nodes.get(curr).v}</b>. ${hit ? 'Found it!' : `Not ${x}, keep walking.`}` }, pp());
          if (hit) break;
          prev = curr; curr = L.nodes.get(curr).next;
          R.count('hops');
        }
        if (!curr) { snap({ fixed: ord }, { line: op === 'delete' ? 5 : 7, phase: ph, vars: { x }, msg: `Reached NULL — <b>${x}</b> is not in the list.` }); continue; }
        if (op === 'search') { snap({ hi: { [curr]: 'found' }, fixed: ord }, { line: 7, phase: ph, vars: { x }, msg: `Found <b>${x}</b> at position ${ord.indexOf(curr)}.` }, [{ id: 'curr', label: 'found', target: curr, color: 'green' }]); continue; }
        const over = { [curr]: { z: 2.2 } };
        snap({ hi: { [curr]: 'swap' }, over, fixed: ord }, { line: 6, phase: ph, vars: { x }, msg: 'Lift the doomed node out so we can see the pointers.' }, pp());
        if (prev) {
          L.nodes.get(prev).next = L.nodes.get(curr).next;
          snap({ hi: { [curr]: 'swap', [prev]: 'active' }, over, fixed: ord, edgeHi: { [prev]: 'active' } }, { line: 6, phase: ph, vars: { x }, msg: `prev.next ← curr.next. Node ${L.nodes.get(prev).v} now bypasses ${x}.` }, pp());
        } else {
          L.head = L.nodes.get(curr).next;
          snap({ hi: { [curr]: 'swap' }, over, fixed: ord }, { line: 6, phase: ph, vars: { x }, msg: 'It was the head, so head ← curr.next.' }, pp());
        }
        L.nodes.delete(curr);
        snap({}, { line: 6, phase: ph, msg: `The node is unreachable and gets freed (garbage-collected). List: [${order(L).map((q) => L.nodes.get(q).v).join(' → ') || 'empty'}].` });
      }
    }
    return R.steps;
  },
};

export const reverseList = {
  id: 'reverse-list', title: 'Reverse a Linked List', cat: 'Linear', week: '6', slides: 'linked_lists.html',
  blurb: 'The classic interview question. Walk the list once with three pointers — prev, curr and next — flipping one arrow at a time.',
  time: { all: 'O(n)' }, space: 'O(1)',
  code: [
    'prev ← null; curr ← head',
    'while curr ≠ null:',
    '  next ← curr.next     // save the rest',
    '  curr.next ← prev     // flip the arrow',
    '  prev ← curr; curr ← next',
    'head ← prev',
  ],
  input: {
    label: 'Values', hint: '2 to 7 values', default: '1 2 3 4 5 6',
    random: () => Array.from({ length: randInt(4, 7) }, () => randInt(1, 60)).join(' '),
    parse(s) {
      const { values } = parseScript(s);
      if (values.length < 2 || values.length > 7) throw new Error('Use between 2 and 7 values.');
      return values;
    },
  },
  run(values) {
    const R = new Recorder();
    R.stats = { flips: 0 };
    const L = makeList(values);
    const fixed = order(L);
    let prev = null, curr = L.head, next = null;
    const ps = () => [
      prev && { id: 'prev', label: 'prev', target: prev, color: 'violet' },
      curr && { id: 'curr', label: 'curr', target: curr, color: 'indigo' },
      next && { id: 'next', label: 'next', target: next, color: 'amber' },
    ].filter(Boolean);
    const done = new Set();
    const hi = () => Object.fromEntries([...done].map((d) => [d, 'done']).concat(curr ? [[curr, 'active']] : []));
    const edgeHi = () => Object.fromEntries([...done].map((d) => [d, 'done']));
    const s = (meta) => R.snap({ ...drawList(L, { fixed, hi: hi(), edgeHi: edgeHi(), nullSide: (id) => (done.has(id) ? -1 : 1) }), pins: [...(L.head ? [{ id: 'head', label: 'head', target: L.head, color: 'slate' }] : []), ...ps()] }, meta);
    s({ line: 0, phase: 'Start', vars: { prev: 'null', curr: L.nodes.get(curr).v }, msg: 'prev starts at null and curr at head. Green arrows are already reversed.' });
    while (curr) {
      next = L.nodes.get(curr).next;
      s({ line: 2, phase: `Node ${L.nodes.get(curr).v}`, vars: { prev: prev ? L.nodes.get(prev).v : 'null', curr: L.nodes.get(curr).v, next: next ? L.nodes.get(next).v : 'null' }, msg: `Save next = ${next ? L.nodes.get(next).v : 'null'} before we break the link.` });
      L.nodes.get(curr).next = prev;
      done.add(curr);
      R.count('flips');
      s({ line: 3, phase: `Node ${L.nodes.get(curr).v}`, vars: { prev: prev ? L.nodes.get(prev).v : 'null', curr: L.nodes.get(curr).v }, msg: `Flip: curr.next ← prev. Node ${L.nodes.get(curr).v} now points ${prev ? `back to ${L.nodes.get(prev).v}` : 'to NULL'}.` });
      prev = curr; curr = next;
      s({ line: 4, phase: prev ? `Node ${L.nodes.get(prev).v}` : '', vars: { prev: L.nodes.get(prev).v, curr: curr ? L.nodes.get(curr).v : 'null' }, msg: 'Advance both pointers one step.' });
    }
    next = null;
    L.head = prev;
    s({ line: 5, phase: 'Done', vars: { head: L.nodes.get(prev).v }, msg: `curr is null, so prev is the new head. Reversed: [${order(L).map((q) => L.nodes.get(q).v).join(' → ')}] — one pass, O(1) extra space.` });
    return R.steps;
  },
};

// ───────────────────────────────────────────────────────────── Hash map
export const hashMap = {
  id: 'hash-map', title: 'Hash Map (Chaining)', cat: 'Hashing', week: '7', slides: 'hash_maps.html',
  blurb: 'A hash function turns each key into a bucket number. Collisions chain together in linked lists, and when the table gets too full it doubles and rehashes.',
  time: { 'put / get (avg)': 'O(1)', worst: 'O(n)' }, space: 'O(n)',
  code: [
    'hash(key) = (Σ char codes) mod m',
    'put(k, v): b ← hash(k)',
    '  if k already in chain b: update value',
    '  else: prepend (k, v) to chain b; size++',
    '  if size / m > 0.75: rehash into ~2m buckets',
    'get(k): b ← hash(k); walk chain b comparing keys',
    'remove(k): b ← hash(k); unlink k from chain b',
  ],
  input: {
    label: 'Operations', hint: 'put key value · get key · remove key', default: 'put cat 3 ; put dog 7 ; put owl 1 ; put act 9 ; put bee 4 ; get act ; remove owl ; get cow',
    random: () => {
      const keys = ['cat', 'dog', 'owl', 'bee', 'ant', 'yak', 'emu', 'fox', 'act', 'god'];
      const ops = [];
      for (let k = 0; k < 6; k++) ops.push(`put ${keys[randInt(0, 9)]} ${randInt(1, 9)}`);
      ops.push(`get ${keys[randInt(0, 9)]}`);
      return ops.join(' ; ');
    },
    parse(s) {
      const { ops } = parseScript(s);
      for (const [op, k] of ops) {
        if (!['put', 'get', 'remove'].includes(op)) throw new Error(`Unknown operation "${op}".`);
        if (!k || k.length > 6) throw new Error('Keys must be 1–6 characters.');
      }
      if (ops.length > 16) throw new Error('Keep it to 16 operations.');
      return ops;
    },
  },
  run(ops) {
    const R = new Recorder();
    R.stats = { probes: 0, collisions: 0 };
    let m = 5;
    let buckets = Array.from({ length: m }, () => []);
    let size = 0, uid = 0;
    const sum = (k) => [...k].reduce((a, c) => a + c.charCodeAt(0), 0);
    const hash = (k) => sum(k) % m;
    const BG = 2.05;
    const draw = (hi = {}, bhi = {}, edgeHi = {}) => {
      const nodes = [], edges = [];
      buckets.forEach((chain, b) => {
        const bx = centered(b, m, BG);
        nodes.push({ id: `b${b}`, label: b, w: 1.7, d: 1.0, h: 0.22, x: bx, z: 0, state: bhi[b] || 'ghost', ghost: !bhi[b], sub: undefined });
        chain.forEach((e, k) => {
          nodes.push({ id: e.id, label: `${e.k}:${e.v}`, w: 1.6, d: 1.3, h: 0.55, x: bx, z: 1.7 + k * 1.75, state: hi[e.id] || 'default' });
          edges.push({ id: `${k ? chain[k - 1].id : `b${b}`}>${e.id}`, from: k ? chain[k - 1].id : `b${b}`, to: e.id, directed: true, state: edgeHi[e.id] || 'default' });
        });
      });
      const texts = [{ id: 'lf', text: `size <b>${size}</b> · m = <b>${m}</b> · load α = <b>${(size / m).toFixed(2)}</b>`, x: centered(0, m, BG) - 1.2, y: 0.2, z: -1.6, cls: 'chip' }];
      return { nodes, edges, texts };
    };
    const calc = (k) => `hash("${k}") = (${[...k].map((c) => c.charCodeAt(0)).join(' + ')}) mod ${m} = ${sum(k)} mod ${m} = <b>${hash(k)}</b>`;
    R.snap(draw(), { phase: 'Empty', vars: { m, size }, msg: `An empty table with m = ${m} buckets. Each bucket holds the head of a (possibly empty) chain.` });
    for (const [op, key, val] of ops) {
      const b = hash(key);
      const chain = buckets[b];
      const ph = `${op}(${key}${val != null ? ', ' + val : ''})`;
      R.snap(draw({}, { [b]: 'active' }), { line: op === 'put' ? 1 : op === 'get' ? 5 : 6, phase: ph, vars: { key, bucket: b }, msg: `${calc(key)}. Go straight to bucket ${b}.` });
      let found = null;
      for (const e of chain) {
        R.count('probes');
        const hit = e.k === key;
        R.snap(draw({ [e.id]: hit ? 'found' : 'compare' }, { [b]: 'active' }), { line: op === 'put' ? 2 : 5, phase: ph, vars: { key, bucket: b, checking: e.k }, msg: `Compare key "${e.k}" with "${key}": ${hit ? 'match.' : 'different key in the same bucket — a collision. Keep walking the chain.'}` });
        if (hit) { found = e; break; }
      }
      if (op === 'put') {
        if (found) {
          found.v = Number(val) || val;
          R.snap(draw({ [found.id]: 'found' }, { [b]: 'active' }), { line: 2, phase: ph, vars: { key }, msg: `Key exists — overwrite its value with ${val}. Keys in a map are unique.` });
          continue;
        }
        if (chain.length) R.count('collisions');
        const e = { id: `h${uid++}`, k: key, v: val };
        chain.unshift(e);
        size++;
        R.snap(draw({ [e.id]: 'new' }, { [b]: 'active' }, { [e.id]: 'active' }), { line: 3, phase: ph, vars: { key, bucket: b, size }, msg: chain.length > 1 ? `Bucket ${b} is occupied (collision), so prepend "${key}" to the front of its chain.` : `Bucket ${b} was empty — "${key}" becomes the chain’s first node.` });
        if (size / m > 0.75) {
          const old = m;
          m = [11, 23, 47][[5, 11, 23].indexOf(m)] || m * 2 + 1;
          const all = buckets.flat();
          R.snap(draw(Object.fromEntries(all.map((x) => [x.id, 'visited']))), { line: 4, phase: 'Rehash', vars: { size, m: old, 'α': (size / old).toFixed(2) }, msg: `Load factor ${size}/${old} = ${(size / old).toFixed(2)} > 0.75. Chains would grow long, so resize to m = ${m} (a prime) and re-insert every key.` });
          buckets = Array.from({ length: m }, () => []);
          for (const x of all.reverse()) buckets[hash(x.k)].unshift(x);
          R.snap(draw(), { line: 4, phase: 'Rehash', vars: { size, m }, msg: `Every key moved to bucket hash(key) mod ${m}. The chains are shorter and α = ${(size / m).toFixed(2)}.` });
        }
      } else if (op === 'get') {
        R.snap(draw(found ? { [found.id]: 'found' } : {}, { [b]: found ? 'active' : 'muted' }), { line: 5, phase: ph, vars: { key, result: found ? found.v : 'null' }, msg: found ? `get("${key}") → <b>${found.v}</b>.` : `End of chain — "${key}" is not in the map, return null.` });
      } else {
        if (!found) { R.snap(draw(), { line: 6, phase: ph, msg: `"${key}" is not present — nothing to remove.` }); continue; }
        R.snap(draw({ [found.id]: 'swap' }, { [b]: 'active' }), { line: 6, phase: ph, msg: `Unlink "${key}" from bucket ${b}’s chain.` });
        chain.splice(chain.indexOf(found), 1);
        size--;
        R.snap(draw(), { line: 6, phase: ph, vars: { size }, msg: `Removed. size = ${size}.` });
      }
    }
    R.snap(draw(), { phase: 'Done', vars: { size, m }, msg: `Final table: ${size} keys in ${m} buckets. Average chain length α = ${(size / m).toFixed(2)} — this is why lookups average O(1).` });
    return R.steps;
  },
};
