// Circle packing layout for venn diagram view.
// Each column is a large circle. 1st-level items are medium circles inside.
// Deeper items are progressively smaller circles inside their parent.

// Size multipliers by depth
const BASE_RADIUS = {
  column: 180,  // column circle radius
  1: 55,        // L1 item
  2: 28,        // L2
  3: 16,        // L3
  4: 10,        // L4
  5: 7,         // L5
};

// Arrange items in a circle within a parent radius
function arrangeInCircle(count, parentRadius, itemRadius, centerX, centerY) {
  const positions = [];
  if (count === 0) return positions;
  if (count === 1) {
    positions.push({ x: centerX, y: centerY });
    return positions;
  }

  // Available radius for placement (parent minus item size minus padding)
  const placeRadius = Math.max(parentRadius - itemRadius - 8, itemRadius);

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.push({
      x: centerX + Math.cos(angle) * placeRadius,
      y: centerY + Math.sin(angle) * placeRadius
    });
  }
  return positions;
}

// Recursive layout: assign (x, y, radius) to each node
function layoutChildren(children, cx, cy, parentRadius, depth) {
  const results = [];
  const r = BASE_RADIUS[depth] || 7;
  const childPositions = arrangeInCircle(children.length, parentRadius, r, cx, cy);

  children.forEach((child, idx) => {
    const pos = childPositions[idx] || { x: cx, y: cy };
    const hasKids = child.children && child.children.length > 0;
    // If has children, make circle bigger to fit them
    const actualRadius = hasKids ? Math.max(r, r + child.children.length * 4) : r;

    results.push({
      id: child.id,
      name: child.name || '',
      description: child.description || '',
      depth,
      tags: child.tags || {},
      x: pos.x,
      y: pos.y,
      radius: actualRadius,
      hasChildren: hasKids,
    });

    if (hasKids) {
      results.push(...layoutChildren(child.children, pos.x, pos.y, actualRadius, depth + 1));
    }
  });

  return results;
}

// Main layout function
// Returns: { columns: [{ key, label, color, cx, cy, radius, items: [...] }] }
export function computeVennLayout(project, viewWidth, viewHeight) {
  if (!project) return { columns: [] };

  const cols = project.columns || [];
  const colCount = cols.length;

  // Column circle sizing based on item count
  const columns = cols.map((col, colIdx) => {
    const items = project.structure[col.key] || [];
    const itemCount = countDeep(items);

    // Scale column radius by number of items
    const baseR = BASE_RADIUS.column;
    const scaledR = Math.max(baseR, baseR + itemCount * 3);

    // Arrange columns horizontally with some vertical offset for visual interest
    const totalWidth = colCount * (scaledR * 2 + 40);
    const startX = (viewWidth - totalWidth) / 2 + scaledR + 20;
    const cx = startX + colIdx * (scaledR * 2 + 40);
    const cy = viewHeight / 2 + (colIdx % 2 === 1 ? 30 : -30);

    // Layout items inside this column circle
    const layoutItems = layoutChildren(items, cx, cy, scaledR * 0.75, 1);

    return {
      key: col.key,
      label: col.label,
      color: col.color,
      cx, cy,
      radius: scaledR,
      items: layoutItems,
      totalItems: itemCount,
    };
  });

  return { columns };
}

function countDeep(nodes) {
  let c = 0;
  for (const n of nodes) {
    c++;
    if (n.children) c += countDeep(n.children);
  }
  return c;
}

// Color palettes for venn circles
export const VENN_COLORS = {
  sand: {
    sand: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', text: '#92400e' },
    clay: { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.4)', text: '#9c4221' },
    dune: { bg: 'rgba(253,224,71,0.12)', border: 'rgba(253,224,71,0.4)', text: '#854d0e' },
    river: { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.4)', text: '#0c4a6e' },
    moss: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.4)', text: '#065f46' },
    brick: { bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.4)', text: '#9f1239' },
    sky: { bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.4)', text: '#3730a3' },
    stone: { bg: 'rgba(168,162,158,0.12)', border: 'rgba(168,162,158,0.4)', text: '#44403c' },
  },
  dark: {
    red: { bg: 'rgba(244,135,113,0.1)', border: 'rgba(244,135,113,0.35)', text: '#f48771' },
    orange: { bg: 'rgba(206,145,120,0.1)', border: 'rgba(206,145,120,0.35)', text: '#ce9178' },
    yellow: { bg: 'rgba(220,220,170,0.1)', border: 'rgba(220,220,170,0.35)', text: '#dcdcaa' },
    green: { bg: 'rgba(106,153,85,0.1)', border: 'rgba(106,153,85,0.35)', text: '#6a9955' },
    cyan: { bg: 'rgba(78,201,176,0.1)', border: 'rgba(78,201,176,0.35)', text: '#4ec9b0' },
    blue: { bg: 'rgba(86,156,214,0.1)', border: 'rgba(86,156,214,0.35)', text: '#569cd6' },
    purple: { bg: 'rgba(197,134,192,0.1)', border: 'rgba(197,134,192,0.35)', text: '#c586c0' },
    gray: { bg: 'rgba(204,204,204,0.1)', border: 'rgba(204,204,204,0.35)', text: '#cccccc' },
  },
  light: {
    red: { bg: 'rgba(229,62,62,0.08)', border: 'rgba(229,62,62,0.3)', text: '#991b1b' },
    orange: { bg: 'rgba(221,107,32,0.08)', border: 'rgba(221,107,32,0.3)', text: '#9c4221' },
    yellow: { bg: 'rgba(214,158,46,0.08)', border: 'rgba(214,158,46,0.3)', text: '#854d0e' },
    green: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', text: '#065f46' },
    cyan: { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.3)', text: '#155e75' },
    blue: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', text: '#1e40af' },
    purple: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.3)', text: '#6b21a8' },
    gray: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', text: '#374151' },
  }
};

export function getVennColor(themeId, colorKey) {
  const map = VENN_COLORS[themeId] || VENN_COLORS.sand;
  return map[colorKey] || map[Object.keys(map)[0]];
}

// Depth opacity (deeper = more transparent)
export const DEPTH_OPACITY = [1, 0.9, 0.7, 0.5, 0.35];
