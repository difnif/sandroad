// Compute 3D positions for nodes given column structure.
// Layout: each column is a vertical strip in the X axis,
// items are stacked top-to-bottom by their order/depth.

const COL_SPACING = 16;
const ROW_SPACING = 4;
const DEPTH_INDENT = 1.2;

export function computeLayout(project, nodes) {
  if (!project || !nodes.length) return {};

  const positions = {};
  const cols = project.columns || [];
  const totalCols = cols.length;

  // Group nodes by column, preserving the order in which they were walked
  const byCol = {};
  for (const col of cols) byCol[col.key] = [];
  for (const node of nodes) {
    if (byCol[node.col]) byCol[node.col].push(node);
  }

  cols.forEach((col, colIdx) => {
    const x = (colIdx - (totalCols - 1) / 2) * COL_SPACING;
    const colNodes = byCol[col.key];
    const colHeight = colNodes.length;
    colNodes.forEach((node, rowIdx) => {
      const depthIndent = (node.depth - 1) * DEPTH_INDENT;
      const y = -(rowIdx - colHeight / 2) * ROW_SPACING;
      positions[node.id] = { x: x + depthIndent, y, z: 0, colColor: col.color };
    });
  });

  return positions;
}

// Hex color mapping per theme for column colors
export const COLOR_HEX = {
  sand: {
    sand: 0xfbbf24, clay: 0xfb923c, dune: 0xfde047, river: 0x38bdf8,
    moss: 0x34d399, brick: 0xfb7185, sky: 0x818cf8, stone: 0xa8a29e
  },
  dark: {
    red: 0xf48771, orange: 0xce9178, yellow: 0xdcdcaa, green: 0x6a9955,
    cyan: 0x4ec9b0, blue: 0x569cd6, purple: 0xc586c0, gray: 0xcccccc
  },
  light: {
    red: 0xe53e3e, orange: 0xdd6b20, yellow: 0xd69e2e, green: 0x10b981,
    cyan: 0x06b6d4, blue: 0x3b82f6, purple: 0xa855f7, gray: 0x6b7280
  }
};

export function getColorHex(themeId, colorKey) {
  const themeMap = COLOR_HEX[themeId] || COLOR_HEX.sand;
  return themeMap[colorKey] || themeMap[Object.keys(themeMap)[0]];
}

// Background color per theme for the 3D scene
export const SCENE_BG = {
  sand: 0xfef3c7,
  dark: 0x1e1e1e,
  light: 0xffffff
};

// Text color per theme
export const TEXT_COLOR = {
  sand: '#1c1917',
  dark: '#cccccc',
  light: '#1e1e1e'
};

export const BOX_BG_COLOR = {
  sand: '#ffffff',
  dark: '#252526',
  light: '#ffffff'
};

// Rainbow colors for link rendering
export const LINK_RAINBOW = [
  0xef4444, 0xf59e0b, 0xeab308, 0x10b981,
  0x06b6d4, 0x3b82f6, 0x8b5cf6, 0xec4899
];
