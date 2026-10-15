import { bubble, selection, insertion, merge, quick } from './sorting.js';
import { linearSearch, binarySearch, arrayOps, stack, queue } from './linear.js';
import { linkedList, reverseList, hashMap } from './lists.js';
import { bst, traversal, heap } from './trees.js';
import { bfs, dfs, dijkstra, complexity } from './graphs.js';

// Ordered roughly like the course schedule.
export const ALGOS = [
  complexity,
  arrayOps, stack, queue,
  linkedList, reverseList,
  hashMap,
  bst, traversal, heap,
  bfs, dfs, dijkstra,
  linearSearch, binarySearch,
  bubble, selection, insertion, merge, quick,
];
export const CATEGORIES = ['All', 'Complexity', 'Linear', 'Hashing', 'Trees', 'Graphs', 'Searching', 'Sorting'];
export const byId = (id) => ALGOS.find((a) => a.id === id);

// Simple line icons per category (inline SVG paths, 24×24 viewBox)
export const ICONS = {
  Complexity: '<path d="M4 20V4M4 20h16M7 16c3 0 5-1 7-4s4-6 6-8"/>',
  Linear: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="9.5" y="9" width="5" height="6" rx="1"/><rect x="16" y="9" width="5" height="6" rx="1"/>',
  Hashing: '<path d="M9 3 7 21M17 3l-2 18M4 8h17M3 16h17"/>',
  Trees: '<circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="m10.6 6.8-3.4 9.3M13.4 6.8l3.4 9.3"/>',
  Graphs: '<circle cx="5" cy="7" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="11" cy="18" r="2.2"/><path d="M7.2 7h9.6M6.2 8.9l3.7 7.2M17.7 7.9l-5.3 8.3"/>',
  Searching: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
  Sorting: '<path d="M5 20v-6M10 20V9M15 20v-9M20 20V4"/>',
};
export const icon = (cat, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[cat] || ICONS.Linear}</svg>`;
