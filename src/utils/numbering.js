// Format a column index as a Roman numeral (I, II, III, ...)
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

export function formatColumnNumber(index) {
  return ROMAN[index] || String(index + 1);
}

// Circled digits for depth 4
const CIRCLED = [
  '①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
  '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'
];

// Format a node number based on its depth and position among siblings
//   depth 1 -> 1, 2, 3
//   depth 2 -> 1), 2), 3)
//   depth 3 -> (1), (2), (3)
//   depth 4 -> ①②③
//   depth 5 -> a, b, c
export function formatDepthNumber(depth, siblingIndex) {
  const n = siblingIndex + 1;
  switch (depth) {
    case 1: return String(n);
    case 2: return `${n})`;
    case 3: return `(${n})`;
    case 4: return CIRCLED[siblingIndex] || `(${n})`;
    case 5: return String.fromCharCode(97 + (siblingIndex % 26));
    default: return String(n);
  }
}
