// Cluster-based layout: children orbit their parent.
// Each column is a horizontal zone. Within columns, L1 items are spaced.
// L2+ items cluster near their parent with offset.

const COL_SPACING = 28;
const L1_VERTICAL_SPACING = 8;
const CHILD_SPREAD = 4.5;
const CHILD_DOWN_OFFSET = 3.5;

export function computeClusterLayout(project, nodes, customPositions = {}) {
  if (!project || !nodes.length) return { positions: {}, regions: [] };

  const positions = {};
  const regions = []; // { parentId, colKey, bounds: {minX,minY,maxX,maxY}, depth, color }
  const cols = project.columns || [];
  const totalCols = cols.length;

  // Group nodes by column and build parent-child map
  const childrenOf = {}; // parentId -> [node]
  const rootsOf = {};    // colKey -> [node]
  for (const col of cols) rootsOf[col.key] = [];

  for (const node of nodes) {
    if (node.parentId) {
      if (!childrenOf[node.parentId]) childrenOf[node.parentId] = [];
      childrenOf[node.parentId].push(node);
    } else {
      if (rootsOf[node.col]) rootsOf[node.col].push(node);
    }
  }

  // Layout each column
  cols.forEach((col, colIdx) => {
    const colX = (colIdx - (totalCols - 1) / 2) * COL_SPACING;
    const roots = rootsOf[col.key] || [];

    // Estimate total height needed
    let currentY = (roots.length * L1_VERTICAL_SPACING) / 2;

    roots.forEach((root, rootIdx) => {
      const rootY = currentY - rootIdx * L1_VERTICAL_SPACING;

      // Use custom position if available
      if (customPositions[root.id]) {
        positions[root.id] = { ...customPositions[root.id], z: 0, colColor: col.color, depth: root.depth };
      } else {
        positions[root.id] = { x: colX, y: rootY, z: 0, colColor: col.color, depth: root.depth };
      }

      // Recursively layout children
      layoutChildren(root.id, positions[root.id], col.color, 2, childrenOf, positions, customPositions, regions);

      // Create region for this L1 item and its descendants
      const familyIds = collectFamily(root.id, childrenOf);
      if (familyIds.length > 1) {
        const bounds = computeBounds(familyIds, positions);
        regions.push({
          parentId: root.id,
          colKey: col.key,
          bounds,
          depth: 1,
          color: col.color,
          label: root.name
        });
      }
    });

    // Column-level region
    const allColNodeIds = [];
    for (const node of nodes) {
      if (node.col === col.key) allColNodeIds.push(node.id);
    }
    if (allColNodeIds.length > 0) {
      const bounds = computeBounds(allColNodeIds, positions);
      regions.push({
        parentId: null,
        colKey: col.key,
        bounds,
        depth: 0,
        color: col.color,
        label: col.label,
        colIndex: colIdx
      });
    }
  });

  return { positions, regions };
}

function layoutChildren(parentId, parentPos, colColor, depth, childrenOf, positions, customPositions, regions) {
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
        z: 0,
        colColor,
        depth: kid.depth
      };
    }

    // Recurse
    layoutChildren(kid.id, positions[kid.id], colColor, depth + 1, childrenOf, positions, customPositions, regions);

    // Sub-regions for items with children
    const familyIds = collectFamily(kid.id, childrenOf);
    if (familyIds.length > 1) {
      const bounds = computeBounds(familyIds, positions);
      regions.push({
        parentId: kid.id,
        colKey: null,
        bounds,
        depth: depth - 1,
        color: colColor,
        label: kid.name
      });
    }
  });
}

function collectFamily(nodeId, childrenOf) {
  const ids = [nodeId];
  const kids = childrenOf[nodeId];
  if (kids) {
    for (const kid of kids) {
      ids.push(...collectFamily(kid.id, childrenOf));
    }
  }
  return ids;
}

function computeBounds(ids, positions) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const p = positions[id];
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 3;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

// --- Color helpers (unchanged) ---
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

// Region color (semi-transparent)
export function getRegionColor(themeId, colorKey, depth) {
  const hex = getColorHex(themeId, colorKey);
  // Deeper regions are more transparent
  const alpha = depth === 0 ? 0.06 : depth === 1 ? 0.1 : 0.15;
  return { hex, alpha };
}
