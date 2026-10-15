import { Recorder, parseNumbers, randomList, centered } from './util.js';

const GAP = 1.18;
const sortInput = (def) => ({
  label: 'Values to sort',
  hint: 'Up to 12 whole numbers between 1 and 40',
  default: def,
  random: () => randomList(9, 2, 30).join(' '),
  parse: (s) => parseNumbers(s, { max: 40, maxCount: 12, minCount: 2 }),
});

function wrap(values) {
  return values.map((v, k) => ({ id: `e${k}`, v }));
}
function barH(v, max) {
  return 0.35 + (v / max) * 4.6;
}
// Turn the array into bar nodes. `st(i, el)` returns a state, `pos(i, el)` can override x/z.
function bars(arr, max, st = () => 'default', pos = () => ({})) {
  return arr.map((el, i) => ({
    id: el.id, label: el.v, shape: 'box', w: 0.92, d: 0.92, h: barH(el.v, max),
    x: centered(i, arr.length, GAP), z: 0, state: st(i, el) || 'default', sub: i, ...pos(i, el),
  }));
}
const pin = (id, label, target, color) => (target ? { id, label, target, color } : null);
const pins = (...p) => p.filter(Boolean);

// ─────────────────────────────────────────────────────────────── Bubble
export const bubble = {
  id: 'bubble-sort', title: 'Bubble Sort', cat: 'Sorting', week: '11–12', slides: 'algorithms.html',
  blurb: 'Repeatedly walk the array, swapping neighbours that are out of order. After each pass the largest remaining value has “bubbled” to the end.',
  time: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)', stable: true,
  code: [
    'for i ← 0 to n − 2:',
    '  swapped ← false',
    '  for j ← 0 to n − 2 − i:',
    '    if A[j] > A[j + 1]:',
    '      swap(A[j], A[j + 1]); swapped ← true',
    '  if not swapped: break   // already sorted',
    'return A',
  ],
  input: sortInput('7 3 9 2 6 4 8 1'),
  run(values) {
    const R = new Recorder();
    const A = wrap(values), n = A.length, max = Math.max(...values);
    const sorted = new Set();
    const st = (hi = {}) => (i, el) => hi[i] || (sorted.has(el.id) ? 'done' : 'default');
    R.stats = { comparisons: 0, swaps: 0 };
    R.snap({ nodes: bars(A, max) }, { line: -1, phase: 'Start', msg: `We have ${n} unsorted values. Bubble sort compares neighbours left to right and swaps them when they are in the wrong order.` });
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      R.snap({ nodes: bars(A, max, st()) }, { line: 1, phase: `Pass ${i + 1}`, vars: { i, swapped }, msg: `Pass ${i + 1}: reset <b>swapped</b> to false. The last ${i} value${i === 1 ? ' is' : 's are'} already in final position.` });
      for (let j = 0; j < n - 1 - i; j++) {
        R.count('comparisons');
        const a = A[j], b = A[j + 1];
        const out = a.v > b.v;
        R.snap(
          { nodes: bars(A, max, st({ [j]: 'compare', [j + 1]: 'compare' })), pins: pins(pin('j', 'j', a.id), pin('j1', 'j+1', b.id, 'amber')) },
          { line: 3, phase: `Pass ${i + 1}`, vars: { i, j, 'A[j]': a.v, 'A[j+1]': b.v, swapped }, msg: `Compare A[${j}] = <b>${a.v}</b> with A[${j + 1}] = <b>${b.v}</b>. ${out ? `${a.v} > ${b.v}, so they are out of order.` : `${a.v} ≤ ${b.v}, already in order — no swap.`}` }
        );
        if (out) {
          A[j] = b; A[j + 1] = a; swapped = true;
          R.count('swaps');
          R.snap(
            { nodes: bars(A, max, st({ [j]: 'swap', [j + 1]: 'swap' }), (k) => (k === j ? { z: -0.9 } : k === j + 1 ? { z: 0.9 } : {})), pins: pins(pin('j', 'j', b.id), pin('j1', 'j+1', a.id, 'amber')) },
            { line: 4, phase: `Pass ${i + 1}`, vars: { i, j, swapped }, msg: `Swap them: <b>${a.v}</b> moves right, <b>${b.v}</b> moves left.` }
          );
        }
      }
      sorted.add(A[n - 1 - i].id);
      R.snap({ nodes: bars(A, max, st()) }, { line: 5, phase: `Pass ${i + 1}`, vars: { i, swapped }, msg: `End of pass ${i + 1}: <b>${A[n - 1 - i].v}</b> is locked into its final position.${swapped ? '' : ' No swaps happened in this pass, so the array is already sorted — we can stop early.'}` });
      if (!swapped) break;
    }
    A.forEach((e) => sorted.add(e.id));
    R.snap({ nodes: bars(A, max, () => 'done') }, { line: 6, phase: 'Sorted', msg: `Sorted! ${R.stats.comparisons} comparisons and ${R.stats.swaps} swaps for n = ${n}.` });
    return R.steps;
  },
};

// ──────────────────────────────────────────────────────────── Selection
export const selection = {
  id: 'selection-sort', title: 'Selection Sort', cat: 'Sorting', week: '11–12', slides: 'algorithms.html',
  blurb: 'Find the smallest value in the unsorted part and swap it to the front. The sorted prefix grows by one each pass.',
  time: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)', stable: false,
  code: [
    'for i ← 0 to n − 2:',
    '  min ← i',
    '  for j ← i + 1 to n − 1:',
    '    if A[j] < A[min]: min ← j',
    '  swap(A[i], A[min])',
    'return A',
  ],
  input: sortInput('6 2 8 4 1 9 3 7'),
  run(values) {
    const R = new Recorder();
    const A = wrap(values), n = A.length, max = Math.max(...values);
    R.stats = { comparisons: 0, swaps: 0 };
    const st = (i0, hi = {}) => (k) => hi[k] || (k < i0 ? 'done' : 'default');
    R.snap({ nodes: bars(A, max) }, { phase: 'Start', msg: 'Selection sort splits the array into a sorted part (left) and an unsorted part (right). Each pass selects the minimum of the unsorted part.' });
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      R.snap({ nodes: bars(A, max, st(i, { [i]: 'active' })), pins: pins(pin('i', 'i', A[i].id), pin('min', 'min', A[m].id, 'violet')) }, { line: 1, phase: `Pass ${i + 1}`, vars: { i, min: m }, msg: `Pass ${i + 1}: assume A[${i}] = <b>${A[i].v}</b> is the smallest so far.` });
      for (let j = i + 1; j < n; j++) {
        R.count('comparisons');
        const less = A[j].v < A[m].v;
        R.snap(
          { nodes: bars(A, max, st(i, { [m]: 'pivot', [j]: 'compare' })), pins: pins(pin('i', 'i', A[i].id), pin('min', 'min', A[m].id, 'violet'), pin('j', 'j', A[j].id, 'amber')) },
          { line: 3, phase: `Pass ${i + 1}`, vars: { i, j, min: m, 'A[j]': A[j].v, 'A[min]': A[m].v }, msg: `Is A[${j}] = <b>${A[j].v}</b> smaller than current min <b>${A[m].v}</b>? ${less ? 'Yes — update min.' : 'No.'}` }
        );
        if (less) m = j;
      }
      if (m !== i) {
        [A[i], A[m]] = [A[m], A[i]];
        R.count('swaps');
        R.snap({ nodes: bars(A, max, st(i, { [i]: 'swap', [m]: 'swap' }), (k) => (k === i ? { z: 0.9 } : k === m ? { z: -0.9 } : {})), pins: pins(pin('i', 'i', A[i].id)) }, { line: 4, phase: `Pass ${i + 1}`, vars: { i, min: m }, msg: `Swap the minimum <b>${A[i].v}</b> into position ${i}.` });
      } else {
        R.snap({ nodes: bars(A, max, st(i, { [i]: 'active' })), pins: pins(pin('i', 'i', A[i].id)) }, { line: 4, phase: `Pass ${i + 1}`, vars: { i, min: m }, msg: `The minimum is already at position ${i} — nothing to swap.` });
      }
    }
    R.snap({ nodes: bars(A, max, () => 'done') }, { line: 5, phase: 'Sorted', msg: `Sorted with ${R.stats.comparisons} comparisons — always n(n−1)/2, no matter the input. Only ${R.stats.swaps} swaps though, which is selection sort’s strength.` });
    return R.steps;
  },
};

// ──────────────────────────────────────────────────────────── Insertion
export const insertion = {
  id: 'insertion-sort', title: 'Insertion Sort', cat: 'Sorting', week: '11–12', slides: 'algorithms.html',
  blurb: 'Take the next value as a “key”, shift larger sorted values right, and drop the key into the gap — like sorting a hand of cards.',
  time: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)', stable: true,
  code: [
    'for i ← 1 to n − 1:',
    '  key ← A[i]; j ← i − 1',
    '  while j ≥ 0 and A[j] > key:',
    '    A[j + 1] ← A[j]   // shift right',
    '    j ← j − 1',
    '  A[j + 1] ← key',
    'return A',
  ],
  input: sortInput('5 2 8 1 9 4 7 3'),
  run(values) {
    const R = new Recorder();
    const A = wrap(values), n = A.length, max = Math.max(...values);
    R.stats = { comparisons: 0, shifts: 0 };
    R.snap({ nodes: bars(A, max, (k) => (k === 0 ? 'done' : 'default')) }, { phase: 'Start', msg: 'A single element is trivially sorted, so the sorted region starts as just A[0].' });
    for (let i = 1; i < n; i++) {
      const key = A[i];
      const slots = A.slice(); // slots[k] = element drawn at index k (key drawn separately)
      let hole = i;
      const draw = (hi = {}, keyZ = 1.7) => {
        const ns = [];
        slots.forEach((el, k) => {
          if (el === key || k === hole) return;
          ns.push({ ...bars([el], max)[0], x: centered(k, n, GAP), sub: k, state: hi[k] || (k < i + 1 ? 'done' : 'default') });
        });
        ns.push({ ...bars([key], max)[0], x: centered(hole, n, GAP), z: keyZ, state: 'active', sub: undefined });
        return ns;
      };
      slots[i] = null;
      let j = i - 1;
      R.snap({ nodes: draw(), pins: pins(pin('key', 'key', key.id, 'indigo')) }, { line: 1, phase: `Insert #${i}`, vars: { i, key: key.v, j }, msg: `Lift out key = <b>${key.v}</b>, leaving a hole at index ${i}.` });
      while (j >= 0) {
        R.count('comparisons');
        const bigger = slots[j].v > key.v;
        R.snap({ nodes: draw({ [j]: 'compare' }), pins: pins(pin('key', 'key', key.id), pin('j', 'j', slots[j].id, 'amber')) }, { line: 2, phase: `Insert #${i}`, vars: { i, key: key.v, j, 'A[j]': slots[j].v }, msg: `Is A[${j}] = <b>${slots[j].v}</b> greater than key ${key.v}? ${bigger ? 'Yes — shift it right.' : 'No — the key belongs right after it.'}` });
        if (!bigger) break;
        slots[j + 1] = slots[j]; slots[j] = null; hole = j;
        R.count('shifts');
        R.snap({ nodes: draw({ [j + 1]: 'swap' }), pins: pins(pin('key', 'key', key.id)) }, { line: 3, phase: `Insert #${i}`, vars: { i, key: key.v, j }, msg: `Shift <b>${slots[j + 1].v}</b> from index ${j} to ${j + 1}. The hole moves left.` });
        j--;
      }
      slots[j + 1] = key; hole = -1;
      for (let k = 0; k < n; k++) A[k] = slots[k];
      R.snap({ nodes: bars(A, max, (k) => (k === j + 1 ? 'active' : k <= i ? 'done' : 'default')) }, { line: 5, phase: `Insert #${i}`, vars: { i, key: key.v, 'j+1': j + 1 }, msg: `Drop the key into index ${j + 1}. The first ${i + 1} values are now sorted.` });
    }
    R.snap({ nodes: bars(A, max, () => 'done') }, { line: 6, phase: 'Sorted', msg: `Sorted with ${R.stats.comparisons} comparisons and ${R.stats.shifts} shifts. On nearly-sorted input insertion sort is close to O(n).` });
    return R.steps;
  },
};

// ──────────────────────────────────────────────────────────────── Merge
export const merge = {
  id: 'merge-sort', title: 'Merge Sort', cat: 'Sorting', week: '11–12', slides: 'algorithms.html',
  blurb: 'Divide and conquer: split the array in half until pieces have one element, then merge sorted halves back together. Each level moves toward you in 3D.',
  time: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)', stable: true,
  code: [
    'mergeSort(A, lo, hi):',
    '  if hi − lo ≤ 1: return        // one element',
    '  mid ← (lo + hi) / 2',
    '  mergeSort(A, lo, mid); mergeSort(A, mid, hi)',
    '  merge: i ← lo, j ← mid',
    '    take the smaller of A[i], A[j] into the output',
    '    copy any leftovers',
  ],
  input: sortInput('8 3 5 1 9 6 2 7'),
  run(values) {
    const R = new Recorder();
    const n = values.length, max = Math.max(...values);
    const els = values.map((v, k) => ({ id: `e${k}`, v, idx: k, lvl: 0, state: 'default' }));
    const splits = []; // {mid, depth}
    R.stats = { comparisons: 0, writes: 0 };
    const LZ = 1.9;
    const draw = (extraPins = []) => {
      // each split that an element sits right of (at a deeper level) opens a small gap
      const nodes = els.map((e) => {
        const gaps = splits.filter((s) => s.depth < e.lvl && s.mid <= e.idx && e.idx < s.hi).length;
        return {
          id: e.id, label: e.v, w: 0.92, d: 0.92, h: barH(e.v, max) * 0.7,
          x: centered(e.idx, n, GAP) + gaps * 0.55, z: e.lvl * LZ, state: e.state, sub: e.idx,
        };
      });
      return { nodes, pins: extraPins };
    };
    R.snap(draw(), { line: -1, phase: 'Start', msg: `Merge sort on ${n} values. Watch the array split into smaller pieces that slide toward you, then merge back sorted.` });
    const rec = (lo, hi, depth) => {
      const seg = els.filter((e) => e.idx >= lo && e.idx < hi);
      if (hi - lo <= 1) {
        seg.forEach((e) => (e.state = 'done'));
        R.snap(draw(), { line: 1, phase: 'Divide', vars: { lo, hi }, msg: `[${seg[0].v}] has one element — a single element is already sorted.` });
        seg.forEach((e) => (e.state = 'default'));
        return;
      }
      const mid = (lo + hi) >> 1;
      splits.push({ lo, mid, hi, depth });
      seg.forEach((e) => { e.lvl = depth + 1; e.state = e.idx < mid ? 'visited' : 'key'; });
      R.snap(draw(), { line: 2, phase: 'Divide', vars: { lo, mid, hi }, msg: `Split [${seg.map((e) => e.v).join(', ')}] at mid = ${mid} into a left half (blue) and a right half (yellow).` });
      seg.forEach((e) => (e.state = 'default'));
      rec(lo, mid, depth + 1);
      rec(mid, hi, depth + 1);
      // merge back up to `depth`
      const L = els.filter((e) => e.idx >= lo && e.idx < mid).sort((a, b) => a.idx - b.idx);
      const Rr = els.filter((e) => e.idx >= mid && e.idx < hi).sort((a, b) => a.idx - b.idx);
      let i = 0, j = 0, k = lo;
      const placed = [];
      // while merging, unplaced elements stay one level deeper in their old slots
      const mark = (pi, pj) => draw(pins(pi && pin('i', 'i', pi.id), pj && pin('j', 'j', pj.id, 'amber')));
      while (i < L.length || j < Rr.length) {
        let take;
        const both = i < L.length && j < Rr.length;
        if (both) {
          R.count('comparisons');
          L[i].state = 'compare'; Rr[j].state = 'compare';
          const left = L[i].v <= Rr[j].v;
          R.snap(mark(L[i], Rr[j]), { line: 5, phase: 'Merge', vars: { lo, mid, hi, 'L[i]': L[i].v, 'R[j]': Rr[j].v, k }, msg: `Compare <b>${L[i].v}</b> (left) and <b>${Rr[j].v}</b> (right). Take the smaller${L[i].v === Rr[j].v ? ' — ties take the left one to keep the sort stable' : ''}.` });
          L[i].state = Rr[j].state = 'default';
          take = left ? L[i++] : Rr[j++];
        } else take = i < L.length ? L[i++] : Rr[j++];
        take.idx = k++; take.lvl = depth; take.state = 'active';
        placed.push(take);
        R.count('writes');
        R.snap(mark(L[i], Rr[j]), { line: both ? 5 : 6, phase: 'Merge', vars: { lo, mid, hi, k: k - 1 }, msg: both ? `Write <b>${take.v}</b> into position ${k - 1} of the merged run.` : `One half is used up — copy leftover <b>${take.v}</b> into position ${k - 1}.` });
        take.state = 'done';
      }
      splits.splice(splits.findIndex((s) => s.lo === lo && s.hi === hi && s.depth === depth), 1);
      R.snap(draw(), { line: 6, phase: 'Merge', vars: { lo, hi }, msg: `Merged run [${placed.map((e) => e.v).join(', ')}] is sorted.` });
      placed.forEach((e) => (e.state = 'default'));
    };
    rec(0, n, 0);
    els.forEach((e) => (e.state = 'done'));
    R.snap(draw(), { phase: 'Sorted', msg: `Sorted in ${R.stats.comparisons} comparisons. Merge sort always does ~n·log₂n work (here log₂${n} ≈ ${Math.log2(n).toFixed(1)} levels) but needs O(n) extra space for merging.` });
    return R.steps;
  },
};

// ──────────────────────────────────────────────────────────────── Quick
export const quick = {
  id: 'quick-sort', title: 'Quick Sort', cat: 'Sorting', week: '11–12', slides: 'algorithms.html',
  blurb: 'Pick a pivot, partition so smaller values go left and larger go right, then recurse on each side. Uses the Lomuto partition scheme.',
  time: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)' }, space: 'O(log n)', stable: false,
  code: [
    'quickSort(A, lo, hi):',
    '  if lo ≥ hi: return',
    '  pivot ← A[hi]; i ← lo',
    '  for j ← lo to hi − 1:',
    '    if A[j] < pivot: swap(A[i], A[j]); i ← i + 1',
    '  swap(A[i], A[hi])   // pivot to final spot',
    '  quickSort(A, lo, i − 1); quickSort(A, i + 1, hi)',
  ],
  input: sortInput('6 9 2 7 1 8 3 5'),
  run(values) {
    const R = new Recorder();
    const A = wrap(values), n = A.length, max = Math.max(...values);
    const done = new Set();
    R.stats = { comparisons: 0, swaps: 0 };
    const st = (lo, hi, extra = {}) => (k, el) => extra[k] || (done.has(el.id) ? 'done' : k < lo || k > hi ? 'muted' : 'default');
    R.snap({ nodes: bars(A, max) }, { phase: 'Start', msg: 'Quick sort picks a pivot and partitions around it. Every partition places exactly one value — the pivot — in its final position.' });
    const rec = (lo, hi) => {
      if (lo > hi) return;
      if (lo === hi) {
        done.add(A[lo].id);
        R.snap({ nodes: bars(A, max, st(lo, hi)) }, { line: 1, phase: 'Base case', vars: { lo, hi }, msg: `Range [${lo}..${hi}] has one element, so <b>${A[lo].v}</b> is in place.` });
        return;
      }
      const p = A[hi];
      let i = lo;
      const pz = (k) => (A[k] === p ? { z: -1.2 } : {});
      R.snap({ nodes: bars(A, max, st(lo, hi, { [hi]: 'pivot' }), pz), pins: pins(pin('p', 'pivot', p.id, 'violet'), pin('i', 'i', A[i].id)) }, { line: 2, phase: `Partition ${lo}–${hi}`, vars: { lo, hi, pivot: p.v, i }, msg: `Partition range [${lo}..${hi}]. The pivot is the last element, <b>${p.v}</b>. <b>i</b> marks where the next small value goes.` });
      for (let j = lo; j < hi; j++) {
        R.count('comparisons');
        const small = A[j].v < p.v;
        R.snap({ nodes: bars(A, max, st(lo, hi, { [hi]: 'pivot', [j]: 'compare' }), pz), pins: pins(pin('p', 'pivot', p.id, 'violet'), pin('i', 'i', A[i].id), pin('j', 'j', A[j].id, 'amber')) }, { line: 4, phase: `Partition ${lo}–${hi}`, vars: { lo, hi, pivot: p.v, i, j, 'A[j]': A[j].v }, msg: `Is <b>${A[j].v}</b> < pivot ${p.v}? ${small ? `Yes — swap it to position i = ${i} and advance i.` : 'No — leave it on the right side.'}` });
        if (small) {
          if (i !== j) {
            [A[i], A[j]] = [A[j], A[i]];
            R.count('swaps');
            R.snap({ nodes: bars(A, max, st(lo, hi, { [hi]: 'pivot', [i]: 'swap', [j]: 'swap' }), (k) => (k === i ? { z: 0.9 } : k === j ? { z: 0.9 } : pz(k))), pins: pins(pin('p', 'pivot', p.id, 'violet')) }, { line: 4, phase: `Partition ${lo}–${hi}`, vars: { lo, hi, pivot: p.v, i, j }, msg: `Swap A[${i}] and A[${j}].` });
          }
          i++;
        }
      }
      [A[i], A[hi]] = [A[hi], A[i]];
      R.count('swaps');
      done.add(p.id);
      R.snap({ nodes: bars(A, max, st(lo, hi, { [i]: 'done' })), pins: pins(pin('p', 'pivot', p.id, 'violet')) }, { line: 5, phase: `Partition ${lo}–${hi}`, vars: { lo, hi, pivot: p.v, i }, msg: `Move the pivot to index ${i}. Everything left of it is smaller, everything right is larger — <b>${p.v}</b> is now final.` });
      R.snap({ nodes: bars(A, max, st(lo, hi)) }, { line: 6, phase: 'Recurse', vars: { left: `${lo}..${i - 1}`, right: `${i + 1}..${hi}` }, msg: `Recurse on the left part [${lo}..${i - 1}] and the right part [${i + 1}..${hi}].` });
      rec(lo, i - 1);
      rec(i + 1, hi);
    };
    rec(0, n - 1);
    R.snap({ nodes: bars(A, max, () => 'done') }, { phase: 'Sorted', msg: `Sorted with ${R.stats.comparisons} comparisons and ${R.stats.swaps} swaps. A bad pivot (e.g. already-sorted input) degrades quick sort to O(n²).` });
    return R.steps;
  },
};
