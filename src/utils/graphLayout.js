// Cluster layout v3: generous spacing, rounded regions, clear hierarchy

const COL_SPACING = 45;           // horizontal distance between columns
const L1_VERTICAL_SPACING = 18;   // vertical space between L1 items
const CHILD_SPREAD = 10;          // horizontal spread of children
const CHILD_DOWN_OFFSET = 7;      // vertical offset of children from parent
const REGION_PAD = 5;             // padding inside region boundary

export function computeClusterLayout(project, nodes, customPositions = {}) {
  if (!project || !nodes.length) return { positions: {}, regions: [] };

  const positions = {};
  const regions = [];
  const cols = project.columns || [];
  const totalCols = cols.length;

  // Build parent-child map
  const childrenOf = {};
  const rootsOf = {};
  for (const col of cols) rootsOf[col.key] = [];
  for (const node of nodes) {
    if (node.parentId) {
      if (!childrenOf[node.parentId]) childrenOf[node.parentId] = [];
      childrenOf[node.parentId].push(node);
    } else {
      if (rootsOf[node.col]) rootsOf[node.col].push(node);
    }
  }

  cols.forEach((col, colIdx) => {
    const colX = (colIdx - (totalCols - 1) / 2) * COL_SPACING;
    const roots = rootsOf[col.key] || [];
    const totalHeight = (roots.length - 1) * L1_VERTICAL_SPACING;

    roots.forEach((root, rootIdx) => {
      const rootY = totalHeight / 2 - rootIdx * L1_VERTICAL_SPACING;

      if (customPositions[root.id]) {
        positions[root.id] = { ...customPositions[root.id], z: 0, colColor: col.color, depth: root.depth };
      } else {
        positions[root.id] = { x: colX, y: rootY, z: 0, colColor: col.color, depth: root.depth };
      }

      layoutChildren(root.id, positions[root.id], col.color, 2, childrenOf, positions, customPositions);

      // Region for this L1 family
      const familyIds = collectFamily(root.id, childrenOf);
      if (familyIds.length > 1) {
        const bounds = computeBounds(familyIds, positions, REGION_PAD);
        regions.push({ parentId: root.id, colKey: col.key, bounds, depth: 1, color: col.color, label: root.name });
      }
    });

    // Column-level region
    const allColIds = nodes.filter(n => n.col === col.key).map(n => n.id);
    if (allColIds.length > 0) {
      const bounds = computeBounds(allColIds, positions, REGION_PAD + 3);
      regions.push({ parentId: null, colKey: col.key, bounds, depth: 0, color: col.color, label: col.label, colIndex: colIdx });
    }
  });

  return { positions, regions };
}

function layoutChildren(parentId, parentPos, colColor, depth, childrenOf, positions, customPositions) {
  const kids = childrenOf[parentId];
  if (!kids || !kids.length) return;

  const count = kids.length;
  const spreadWidth = (count - 1) * CHILD_SPREAD;

  kids.forEach((kid, idx) => {
    if (customPositions[kid.id]) {
      positions[kid.id] = { ...customPositions[kid.id], z: 0, colColor, depth: kid.depth };
    } else {
      const offsetX = count === 1 ? 0 : (-spreadWidth / 2 + idx * CHILD_SPREAD);
      positions[kid.id] = {
        x: parentPos.x + offsetX,
        y: parentPos.y - CHILD_DOWN_OFFSET,
        z: 0, colColor, depth: kid.depth
      };
    }
    layoutChildren(kid.id, positions[kid.id], colColor, depth + 1, childrenOf, positions, customPositions);
  });
}

function collectFamily(nodeId, childrenOf) {
  const ids = [nodeId];
  const kids = childrenOf[nodeId];
  if (kids) for (const kid of kids) ids.push(...collectFamily(kid.id, childrenOf));
  return ids;
}

function computeBounds(ids, positions, pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const p = positions[id];
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

// --- Colors ---
export const COLOR_HEX = {
  sand: { sand: 0xfbbf24, clay: 0xfb923c, dune: 0xfde047, river: 0x38bdf8, moss: 0x34d399, brick: 0xfb7185, sky: 0x818cf8, stone: 0xa8a29e },
  dark: { red: 0xf48771, orange: 0xce9178, yellow: 0xdcdcaa, green: 0x6a9955, cyan: 0x4ec9b0, blue: 0x569cd6, purple: 0xc586c0, gray: 0xcccccc },
  light: { red: 0xe53e3e, orange: 0xdd6b20, yellow: 0xd69e2e, green: 0x10b981, cyan: 0x06b6d4, blue: 0x3b82f6, purple: 0xa855f7, gray: 0x6b7280 }
};
export function getColorHex(themeId, colorKey) {
  const m = COLOR_HEX[themeId] || COLOR_HEX.sand;
  return m[colorKey] || m[Object.keys(m)[0]];
}
export const SCENE_BG = { sand: 0xfef3c7, dark: 0x1e1e1e, light: 0xffffff };
export const TEXT_COLOR = { sand: '#1c1917', dark: '#cccccc', light: '#1e1e1e' };
export const BOX_BG_COLOR = { sand: '#ffffff', dark: '#252526', light: '#ffffff' };
export const LINK_RAINBOW = [0xef4444, 0xf59e0b, 0xeab308, 0x10b981, 0x06b6d4, 0x3b82f6, 0x8b5cf6, 0xec4899];

// Region fill/border colors - more saturated for visibility
export const REGION_STYLES = {
  sand: {
    sand:  { fill: 0xfde68a, border: 0xf59e0b },
    clay:  { fill: 0xfed7aa, border: 0xfb923c },
    dune:  { fill: 0xfef08a, border: 0xeab308 },
    river: { fill: 0xbae6fd, border: 0x0ea5e9 },
    moss:  { fill: 0xa7f3d0, border: 0x10b981 },
    brick: { fill: 0xfecdd3, border: 0xfb7185 },
    sky:   { fill: 0xc7d2fe, border: 0x818cf8 },
    stone: { fill: 0xd6d3d1, border: 0x78716c },
  },
  dark: {
    red:    { fill: 0x5a2828, border: 0xf48771 },
    orange: { fill: 0x5a3a28, border: 0xce9178 },
    yellow: { fill: 0x5a5628, border: 0xdcdcaa },
    green:  { fill: 0x285a32, border: 0x6a9955 },
    cyan:   { fill: 0x28565a, border: 0x4ec9b0 },
    blue:   { fill: 0x28425a, border: 0x569cd6 },
    purple: { fill: 0x42285a, border: 0xc586c0 },
    gray:   { fill: 0x3e3e42, border: 0xcccccc },
  },
  light: {
    red:    { fill: 0xfde8e8, border: 0xe53e3e },
    orange: { fill: 0xfeebc8, border: 0xdd6b20 },
    yellow: { fill: 0xfef3c7, border: 0xd69e2e },
    green:  { fill: 0xd1fae5, border: 0x10b981 },
    cyan:   { fill: 0xcffafe, border: 0x06b6d4 },
    blue:   { fill: 0xdbeafe, border: 0x3b82f6 },
    purple: { fill: 0xe9d5ff, border: 0xa855f7 },
    gray:   { fill: 0xf3f3f3, border: 0x6b7280 },
  }
};

export function getRegionStyle(themeId, colorKey) {
  const m = REGION_STYLES[themeId] || REGION_STYLES.sand;
  return m[colorKey] || m[Object.keys(m)[0]];
}
