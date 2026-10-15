import { Recorder, parseScript, parseNumbers, randInt, randomList, centered } from './util.js';

const XG = 1.45, ZG = 2.0;
const PUCK = { shape: 'puck', w: 1.15, d: 1.15, h: 0.5 };

// ─────────────────────────────────────────────── BST model + drawing
class BST {
  constructor() { this.nodes = new Map(); this.root = null; this.uid = 0; }
  add(v) {
    const id = `t${this.uid++}`;
    this.nodes.set(id, { id, v, left: null, right: null });
    return id;
  }
  insertSilently(v) {
    if (this.root == null) { this.root = this.add(v); return; }
    let c = this.root;
    for (;;) {
      const n = this.nodes.get(c);
      if (v === n.v) return;
      const side = v < n.v ? 'left' : 'right';
      if (n[side] == null) { n[side] = this.add(v); return; }
      c = n[side];
    }
  }
  layout() {
    const pos = {};
    let rank = 0, maxDepth = 0;
    const walk = (id, depth) => {
      if (!id) return;
      const n = this.nodes.get(id);
      walk(n.left, depth + 1);
      pos[id] = { r: rank++, depth };
      maxDepth = Math.max(maxDepth, depth);
      walk(n.right, depth + 1);
    };
    walk(this.root, 0);
    for (const p of Object.values(pos)) { p.x = centered(p.r, rank, XG); p.z = p.depth * ZG; }
    return { pos, count: rank, maxDepth };
  }
  draw({ hi = {}, edgeHi = {}, over = {}, extra = [] } = {}) {
    const { pos } = this.layout();
    Object.assign(pos, over);
    const nodes = [], edges = [];
    for (const [id, n] of this.nodes) {
      if (!pos[id]) continue;
      nodes.push({ id, label: n.v, ...PUCK, x: pos[id].x, z: pos[id].z, state: hi[id] || 'default' });
      for (const side of ['left', 'right']) if (n[side] && pos[n[side]]) edges.push({ id: `${id}-${n[side]}`, from: id, to: n[side], state: edgeHi[n[side]] || 'default' });
    }
    return { nodes: nodes.concat(extra), edges };
  }
}

export const bst = {
  id: 'bst', title: 'Binary Search Tree', cat: 'Trees', week: '8', slides: 'binary_trees_bst.html',
  blurb: 'Every node’s left subtree holds smaller keys and its right subtree larger ones, so each comparison discards a whole subtree. The tree lies on the ground with the root at the back.',
  time: { 'search / insert / delete': 'O(h)', balanced: 'O(log n)', degenerate: 'O(n)' }, space: 'O(n)',
  code: [
    'search(x): curr ← root',
    '  while curr: if x = curr.val: return curr',
    '            curr ← (x < curr.val) ? curr.left : curr.right',
    'insert(x): walk like search; attach new leaf where we fall off',
    'delete(x): find node z',
    '  case 0/1 child: replace z by its child (or null)',
    '  case 2 children: s ← min(z.right)  // in-order successor',
    '                   z.val ← s.val; delete s from right subtree',
  ],
  input: {
    label: 'Initial keys ; operations', hint: 'insert x · search x · delete x', default: '50 30 70 20 40 60 80 ; insert 65 ; search 40 ; delete 20 ; delete 70 ; delete 50',
    random: () => `${[...new Set(randomList(7, 5, 95))].join(' ')} ; insert ${randInt(5, 95)} ; search ${randInt(5, 95)} ; delete ${randInt(5, 95)}`,
    parse(s) {
      const { values, ops } = parseScript(s);
      if (values.length > 12) throw new Error('Start with at most 12 keys.');
      for (const [op] of ops) if (!['insert', 'search', 'delete'].includes(op)) throw new Error(`Unknown operation "${op}".`);
      return { values, ops };
    },
  },
  run({ values, ops }) {
    const R = new Recorder();
    R.stats = { comparisons: 0 };
    const T = new BST();
    values.forEach((v) => T.insertSilently(v));
    const S = (o, meta, pins = []) => R.snap({ ...T.draw(o), pins: [...(T.root ? [{ id: 'root', label: 'root', target: T.root, color: 'slate' }] : []), ...pins] }, meta);
    S({}, { phase: 'Start', msg: 'A BST built from the initial keys. Read it left → right and the keys come out sorted — that is the BST property.' });
    // walk from root toward x; returns {parent, curr}
    const walk = (x, ph, line, path = []) => {
      let parent = null, curr = T.root;
      while (curr) {
        const n = T.nodes.get(curr);
        R.count('comparisons');
        const eq = x === n.v;
        path.push(curr);
        const hi = Object.fromEntries(path.slice(0, -1).map((p) => [p, 'visited']));
        hi[curr] = eq ? 'found' : 'compare';
        S({ hi, edgeHi: Object.fromEntries(path.slice(1).map((p) => [p, 'active'])) }, { line, phase: ph, vars: { x, 'curr.val': n.v }, msg: eq ? `${x} = ${n.v}. Found it.` : `${x} ${x < n.v ? '<' : '>'} ${n.v}, so go <b>${x < n.v ? 'left' : 'right'}</b>${n[x < n.v ? 'left' : 'right'] ? '' : ' — but that child is empty'}.` }, [{ id: 'curr', label: 'curr', target: curr }]);
        if (eq) return { parent, curr, path };
        parent = curr;
        curr = x < n.v ? n.left : n.right;
      }
      return { parent, curr: null, path };
    };
    for (const [op, a] of ops) {
      const x = Number(a);
      const ph = `${op}(${x})`;
      if (op === 'search') {
        const { curr, path } = walk(x, ph, 2);
        if (!curr) S({ hi: Object.fromEntries(path.map((p) => [p, 'visited'])) }, { line: 2, phase: ph, msg: `Fell off the tree after ${path.length} comparison${path.length === 1 ? '' : 's'} — ${x} is not in the BST.` });
        continue;
      }
      if (op === 'insert') {
        const { parent, curr, path } = walk(x, ph, 3);
        if (curr) { S({ hi: { [curr]: 'found' } }, { line: 3, phase: ph, msg: `${x} is already in the tree — BSTs usually ignore duplicates.` }); continue; }
        const id = T.add(x);
        if (!parent) T.root = id; else T.nodes.get(parent)[x < T.nodes.get(parent).v ? 'left' : 'right'] = id;
        S({ hi: { ...Object.fromEntries(path.map((p) => [p, 'visited'])), [id]: 'new' }, edgeHi: { [id]: 'active' } }, { line: 3, phase: ph, vars: { x }, msg: `Attach <b>${x}</b> as the ${parent ? (x < T.nodes.get(parent).v ? 'left' : 'right') + ' child of ' + T.nodes.get(parent).v : 'root'}. New keys are always added as leaves. The layout re-spaces to make room.` });
        continue;
      }
      // delete
      const { parent, curr } = walk(x, ph, 4);
      if (!curr) { S({}, { line: 4, phase: ph, msg: `${x} is not in the tree — nothing to delete.` }); continue; }
      const z = T.nodes.get(curr);
      const relink = (par, old, nu) => {
        if (!par) T.root = nu;
        else { const p = T.nodes.get(par); if (p.left === old) p.left = nu; else p.right = nu; }
      };
      if (!z.left || !z.right) {
        const child = z.left || z.right;
        S({ hi: { [curr]: 'swap', ...(child ? { [child]: 'active' } : {}) } }, { line: 5, phase: ph, msg: child ? `${x} has one child (${T.nodes.get(child).v}). Link its parent directly to that child.` : `${x} is a leaf — simply remove it.` });
        relink(parent, curr, child);
        T.nodes.delete(curr);
        S({}, { line: 5, phase: ph, msg: `Deleted ${x}. The BST property still holds.` });
        continue;
      }
      // two children
      let sp = curr, s = z.right;
      S({ hi: { [curr]: 'swap', [s]: 'compare' } }, { line: 6, phase: ph, msg: `${x} has two children. Replace it with its in-order successor: the smallest key in its right subtree. Step right once…` }, [{ id: 's', label: 's', target: s, color: 'amber' }]);
      while (T.nodes.get(s).left) {
        sp = s; s = T.nodes.get(s).left;
        S({ hi: { [curr]: 'swap', [s]: 'compare' } }, { line: 6, phase: ph, msg: '…then go left as far as possible.' }, [{ id: 's', label: 's', target: s, color: 'amber' }]);
      }
      const sv = T.nodes.get(s).v;
      z.v = sv;
      S({ hi: { [curr]: 'active', [s]: 'muted' } }, { line: 7, phase: ph, msg: `Copy the successor’s key <b>${sv}</b> into the node that held ${x}.` }, [{ id: 's', label: 's', target: s, color: 'amber' }]);
      relink(sp, s, T.nodes.get(s).right);
      T.nodes.delete(s);
      S({ hi: { [curr]: 'done' } }, { line: 7, phase: ph, msg: `Remove the old successor node (it had at most a right child). ${x} is gone and ${sv} takes its place.` });
    }
    S({}, { phase: 'Done', msg: `Final height: ${T.layout().maxDepth}. Search cost depends on height — a balanced tree keeps it near log₂n.` });
    return R.steps;
  },
};

// ─────────────────────────────────────────────────────── Traversals
export const traversal = {
  id: 'tree-traversal', title: 'Tree Traversals', cat: 'Trees', week: '8', slides: 'binary_trees_bst.html',
  blurb: 'Depth-first (in-order, pre-order, post-order) and breadth-first (level-order). Visited keys fly down into the output row so you can compare orders.',
  time: { all: 'O(n)' }, space: 'O(h) recursion · O(w) queue',
  code: [
    'inorder(n):   inorder(n.left); visit(n); inorder(n.right)',
    'preorder(n):  visit(n); preorder(n.left); preorder(n.right)',
    'postorder(n): postorder(n.left); postorder(n.right); visit(n)',
    'levelorder:   Q ← [root]; while Q: n ← Q.dequeue()',
    '              visit(n); enqueue n.left, n.right',
  ],
  input: {
    label: 'Keys ; order', hint: 'order: inorder · preorder · postorder · levelorder', default: '50 30 70 20 40 60 80 35 ; inorder',
    random: () => `${[...new Set(randomList(8, 5, 95))].join(' ')} ; ${['inorder', 'preorder', 'postorder', 'levelorder'][randInt(0, 3)]}`,
    parse(s) {
      const [a, b = 'inorder'] = s.split(';');
      const mode = b.trim().toLowerCase().replace(/[-\s]/g, '');
      if (!['inorder', 'preorder', 'postorder', 'levelorder'].includes(mode)) throw new Error('Order must be inorder, preorder, postorder or levelorder.');
      return { keys: parseNumbers(a, { maxCount: 12 }), mode };
    },
  },
  run({ keys, mode }) {
    const R = new Recorder();
    R.stats = { visited: 0 };
    const T = new BST();
    keys.forEach((v) => T.insertSilently(v));
    const { maxDepth, count } = T.layout();
    const out = [];
    const outZ = (maxDepth + 1) * ZG + 0.8;
    const line = { inorder: 0, preorder: 1, postorder: 2, levelorder: 3 }[mode];
    const visitedSet = new Set();
    const draw = (cur, extraHi = {}) => {
      const hi = Object.fromEntries([...visitedSet].map((id) => [id, 'done']));
      Object.assign(hi, extraHi);
      if (cur) hi[cur] = hi[cur] === 'done' ? 'found' : 'active';
      const extra = out.map((o, k) => ({ id: `o${k}`, from: o.id, label: o.v, w: 1.0, d: 1.0, h: 0.4, x: centered(k, count, 1.2), z: outZ, state: 'done', sub: k + 1, subTone: 'mute' }));
      return { ...T.draw({ hi, extra }), texts: [{ id: 'ol', text: `${mode} output`, x: centered(0, count, 1.2) - 1.2, y: 0.2, z: outZ - 1, cls: 'chip' }] };
    };
    const pinAt = (id, label = 'visit') => (id ? [{ id: 'cur', label, target: id }] : []);
    R.snap(draw(), { line, phase: 'Start', msg: { inorder: 'In-order: left subtree, then the node, then the right subtree. On a BST this prints the keys in sorted order.', preorder: 'Pre-order: the node first, then its subtrees. Useful for copying a tree.', postorder: 'Post-order: both subtrees first, the node last. Useful for deleting a tree or evaluating expressions.', levelorder: 'Level-order: visit row by row using a queue (this is BFS on a tree).' }[mode] });
    const visit = (id) => {
      out.push({ id: `${id}`, v: T.nodes.get(id).v });
      visitedSet.add(id);
      R.count('visited');
      R.snap({ ...draw(id), pins: pinAt(id) }, { line, phase: `Visit ${T.nodes.get(id).v}`, vars: { output: out.map((o) => o.v).join(' ') }, msg: `Visit <b>${T.nodes.get(id).v}</b> and append it to the output.` });
    };
    if (mode === 'levelorder') {
      const Q = [T.root];
      while (Q.length) {
        const id = Q.shift();
        const n = T.nodes.get(id);
        visit(id);
        const kids = [n.left, n.right].filter(Boolean);
        Q.push(...kids);
        if (kids.length) R.snap({ ...draw(id, Object.fromEntries(Q.map((q) => [q, 'key']))), pins: pinAt(id, 'dequeued') }, { line: 4, phase: `Visit ${n.v}`, vars: { queue: Q.map((q) => T.nodes.get(q).v).join(', ') }, msg: `Enqueue its children: ${kids.map((k) => T.nodes.get(k).v).join(', ')}. Queued nodes are yellow.` });
      }
    } else {
      const rec = (id, depth) => {
        if (!id) return;
        const n = T.nodes.get(id);
        R.snap({ ...draw(id), pins: pinAt(id, 'call') }, { line, phase: `Visit ${n.v}`, vars: { 'call depth': depth, node: n.v }, msg: `Call ${mode}(${n.v}).${mode === 'preorder' ? ' Pre-order visits it right away.' : ` Go ${mode === 'inorder' ? 'left first' : 'into both children first'}.`}` });
        if (mode === 'preorder') visit(id);
        rec(n.left, depth + 1);
        if (mode === 'inorder') visit(id);
        rec(n.right, depth + 1);
        if (mode === 'postorder') visit(id);
      };
      rec(T.root, 0);
    }
    R.snap(draw(), { phase: 'Done', vars: { output: out.map((o) => o.v).join(' ') }, msg: `${mode}: <b>${out.map((o) => o.v).join(' → ')}</b>. Every node was visited exactly once: O(n).` });
    return R.steps;
  },
};

// ───────────────────────────────────────────────────────────── Min-heap
export const heap = {
  id: 'heap', title: 'Min-Heap / Priority Queue', cat: 'Trees', week: '9', slides: null,
  blurb: 'A complete binary tree stored in a plain array: children of i live at 2i+1 and 2i+2. Watch the tree and its array (front row) move together as values sift up and down.',
  time: { insert: 'O(log n)', extractMin: 'O(log n)', peek: 'O(1)' }, space: 'O(n)',
  code: [
    'insert(x): A.append(x); i ← n − 1',
    '  while i > 0 and A[parent(i)] > A[i]:',
    '    swap(A[i], A[parent(i)]); i ← parent(i)   // sift up',
    'extractMin(): min ← A[0]; A[0] ← A.pop()',
    '  i ← 0; while a child is smaller:',
    '    c ← smaller child; swap(A[i], A[c]); i ← c  // sift down',
    '  return min',
    'parent(i) = ⌊(i − 1)/2⌋   left = 2i+1   right = 2i+2',
  ],
  input: {
    label: 'Operations', hint: 'insert x · extract', default: 'insert 8 ; insert 3 ; insert 10 ; insert 1 ; insert 6 ; insert 14 ; insert 4 ; insert 2 ; extract ; extract',
    random: () => [...Array.from({ length: 8 }, () => `insert ${randInt(1, 40)}`), 'extract', 'extract'].join(' ; '),
    parse(s) {
      const { values, ops } = parseScript(s);
      const all = [...values.map((v) => ['insert', String(v)]), ...ops.map(([o, a]) => [o === 'extractmin' || o === 'pop' ? 'extract' : o, a])];
      for (const [op] of all) if (!['insert', 'extract'].includes(op)) throw new Error(`Unknown operation "${op}".`);
      if (all.filter(([o]) => o === 'insert').length > 15) throw new Error('At most 15 inserts.');
      return all;
    },
  },
  run(ops) {
    const R = new Recorder();
    R.stats = { comparisons: 0, swaps: 0 };
    const A = [];
    let uid = 0;
    const out = [];
    const maxN = Math.max(4, ops.filter(([o]) => o === 'insert').length);
    const maxD = Math.floor(Math.log2(maxN));
    const W = Math.pow(2, maxD) * 1.55;
    const tpos = (i) => {
      const d = Math.floor(Math.log2(i + 1)), p = i - (Math.pow(2, d) - 1);
      return { x: (p + 0.5) * (W / Math.pow(2, d)) - W / 2, z: d * 1.9 };
    };
    const arrZ = (maxD + 1) * 1.9 + 1.1;
    const draw = (hi = {}, extraTree = {}) => {
      const nodes = [], edges = [];
      A.forEach((e, i) => {
        nodes.push({ id: e.id, label: e.v, ...PUCK, ...tpos(i), state: hi[i] || 'default', ...(extraTree[i] || {}) });
        nodes.push({ id: `${e.id}a`, label: e.v, w: 1.0, d: 1.0, h: 0.45, x: centered(i, maxN, 1.2), z: arrZ, state: hi[i] || 'default', sub: i, subTone: 'mute' });
        if (i > 0) edges.push({ id: `${A[(i - 1) >> 1].id}-${e.id}`, from: A[(i - 1) >> 1].id, to: e.id });
      });
      const texts = [
        { id: 'arr', text: 'array view', x: centered(0, maxN, 1.2) - 1.3, y: 0.2, z: arrZ - 0.9, cls: 'chip' },
        { id: 'out', text: `extracted: <b>${out.join(', ') || '—'}</b>`, x: W / 2 + 1.5, y: 0.2, z: 0, cls: 'chip' },
      ];
      return { nodes, edges, texts };
    };
    R.snap(draw(), { phase: 'Empty', msg: 'An empty min-heap. Rule: every parent is ≤ its children, so the minimum is always at the root, A[0].' });
    for (const [op, a] of ops) {
      if (op === 'insert') {
        const e = { id: `h${uid++}`, v: Number(a) };
        A.push(e);
        let i = A.length - 1;
        const ph = `insert(${e.v})`;
        R.snap(draw({ [i]: 'new' }, { [i]: { enter: [0, 3, 0] } }), { line: 0, phase: ph, vars: { i, x: e.v }, msg: `Append <b>${e.v}</b> at index ${i} — the next free spot keeps the tree complete.` });
        while (i > 0) {
          const p = (i - 1) >> 1;
          R.count('comparisons');
          const bad = A[p].v > A[i].v;
          R.snap(draw({ [i]: 'active', [p]: 'compare' }), { line: 1, phase: ph, vars: { i, parent: p, 'A[i]': A[i].v, 'A[parent]': A[p].v }, msg: `Parent of ${i} is ⌊(${i}−1)/2⌋ = ${p}. Is ${A[p].v} > ${A[i].v}? ${bad ? 'Yes — heap order violated, sift up.' : 'No — heap order holds, stop.'}` });
          if (!bad) break;
          [A[i], A[p]] = [A[p], A[i]];
          R.count('swaps');
          R.snap(draw({ [p]: 'active', [i]: 'swap' }), { line: 2, phase: ph, vars: { i: p }, msg: `Swap them. ${A[p].v} moves up to index ${p}.` });
          i = p;
        }
        R.snap(draw({ [i]: 'done' }), { line: 2, phase: ph, msg: `${e.v} settled at index ${i}. The root (minimum) is ${A[0].v}.` });
      } else {
        const ph = 'extractMin()';
        if (!A.length) { R.snap(draw(), { line: 3, phase: ph, msg: 'Heap is empty.' }); continue; }
        const min = A[0];
        R.snap(draw({ 0: 'found' }), { line: 3, phase: ph, vars: { min: min.v }, msg: `The minimum <b>${min.v}</b> is at the root.` });
        const last = A.pop();
        out.push(min.v);
        if (!A.length) { R.snap(draw(), { line: 6, phase: ph, msg: `Removed ${min.v}; the heap is now empty.` }); continue; }
        if (last !== min) A[0] = last;
        R.snap(draw({ 0: 'swap' }), { line: 3, phase: ph, vars: { 'A[0]': A[0].v }, msg: `Move the last element <b>${last.v}</b> into the root to keep the tree complete. Now it probably breaks heap order…` });
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = 2 * i + 2;
          let c = -1;
          if (l < A.length) c = l;
          if (r < A.length && A[r].v < A[l].v) c = r;
          if (c < 0) break;
          R.count('comparisons');
          const bad = A[c].v < A[i].v;
          R.snap(draw({ [i]: 'active', [c]: 'compare', ...(r < A.length && c === l ? { [r]: 'muted' } : {}), ...(c === r ? { [l]: 'muted' } : {}) }), { line: 4, phase: ph, vars: { i, child: c, 'A[i]': A[i].v, 'A[child]': A[c].v }, msg: `Smaller child of index ${i} is ${A[c].v} (index ${c}). ${bad ? `${A[c].v} < ${A[i].v}, so sift down.` : 'It is not smaller — stop.'}` });
          if (!bad) break;
          [A[i], A[c]] = [A[c], A[i]];
          R.count('swaps');
          R.snap(draw({ [c]: 'swap', [i]: 'active' }), { line: 5, phase: ph, vars: { i: c }, msg: `Swap down to index ${c}.` });
          i = c;
        }
        R.snap(draw({ 0: 'done' }), { line: 6, phase: ph, vars: { returned: min.v }, msg: `Return ${min.v}. The new minimum ${A[0].v} is at the root after only ⌊log₂n⌋ swaps at most.` });
      }
    }
    R.snap(draw(), { phase: 'Done', msg: `Heap array: [${A.map((e) => e.v).join(', ')}]. Extracted in order: ${out.join(', ') || 'none'} — repeated extractMin is exactly heap sort.` });
    return R.steps;
  },
};
