// Shared helpers for algorithm modules.
// An algorithm's run() returns an array of steps:
//   { nodes, edges, pins, texts, line, msg, phase, vars, stats }

export class Recorder {
  constructor() {
    this.steps = [];
    this.stats = {};
  }
  count(name, by = 1) {
    this.stats[name] = (this.stats[name] || 0) + by;
  }
  snap(scene, { line = -1, msg = '', phase = '', vars = {} } = {}) {
    this.steps.push({
      nodes: [], edges: [], pins: [], texts: [],
      ...scene,
      line, msg, phase,
      vars: { ...vars },
      stats: { ...this.stats },
    });
  }
}

export function parseNumbers(str, { min = 1, max = 99, maxCount = 14, minCount = 1 } = {}) {
  const nums = String(str).split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.some((n) => !Number.isInteger(n))) throw new Error('Use whole numbers separated by spaces or commas.');
  if (nums.length < minCount) throw new Error(`Enter at least ${minCount} number${minCount > 1 ? 's' : ''}.`);
  if (nums.length > maxCount) throw new Error(`Keep it to ${maxCount} numbers or fewer so it fits on screen.`);
  if (nums.some((n) => n < min || n > max)) throw new Error(`Numbers must be between ${min} and ${max}.`);
  return nums;
}

// "3 8 1 ; push 4 ; pop" → { values:[3,8,1], ops:[['push','4'],['pop']] }
export function parseScript(str, { valuesRequired = false } = {}) {
  const parts = String(str).split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);
  let values = [];
  if (parts.length && /^[-\d\s,]+$/.test(parts[0])) values = parts.shift().split(/[\s,]+/).filter(Boolean).map(Number);
  else if (valuesRequired) throw new Error('Start with the initial values, e.g. "5 2 9 ; …"');
  const ops = parts.map((p) => p.split(/\s+/));
  return { values, ops };
}

export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const randomList = (n, a = 1, b = 30) => Array.from({ length: n }, () => randInt(a, b));
export const centered = (i, n, gap) => (i - (n - 1) / 2) * gap;
export const hex = (n) => '0x' + n.toString(16).toUpperCase().padStart(2, '0');
