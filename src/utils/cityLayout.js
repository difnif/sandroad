// City layout engine: converts tree structure to top-down city positions.
//
// Terminology:
//   District = column (city boundary)
//   Land     = item with children (large block, can expand right)
//   Building = leaf item (placed inside its parent land)
//
// Layout rules:
//   - Districts are arranged horizontally
//   - L1 lands stack vertically within a district
//   - Buildings are placed in a grid inside their parent land
//   - Sub-lands (items with children) expand to the RIGHT of their parent

const DISTRICT_GAP = 120;      // horizontal gap between districts
const LAND_GAP = 40;           // vertical gap between L1 lands
const LAND_PAD = 20;           // padding inside a land
const BUILDING_SIZE = 48;      // building footprint
const BUILDING_GAP = 12;       // gap between buildings
const SUBLAND_GAP = 30;        // horizontal gap between parent land and sub-land
const BUILDINGS_PER_ROW = 3;   // max buildings per row inside a land
const LAND_MIN_W = 200;
const LAND_MIN_H = 120;

export function computeCityLayout(project) {
  if (!project) return { districts: [], allItems: [] };

  const cols = project.columns || [];
  const districts = [];
  const allItems = [];
  let districtX = 0;

  cols.forEach((col, colIdx) => {
    const items = project.structure[col.key] || [];
    const { lands, width, height } = layoutDistrict(items, districtX, 0, 1);

    districts.push({
      key: col.key,
      label: col.label,
      color: col.color,
      colIndex: colIdx,
      x: districtX,
      y: 0,
      width: Math.max(width, LAND_MIN_W + 60),
      height: Math.max(height, LAND_MIN_H + 60),
    });

    for (const land of lands) {
      allItems.push(...flattenLandItems(land));
    }

    districtX += Math.max(width, LAND_MIN_W + 60) + DISTRICT_GAP;
  });

  // Center everything
  const totalW = districtX - DISTRICT_GAP;
  const offsetX = -totalW / 2;
  for (const d of districts) d.x += offsetX;
  for (const item of allItems) item.x += offsetX;

  return { districts, allItems };
}

function layoutDistrict(items, startX, startY, depth) {
  const lands = [];
  let currentY = startY + 30; // leave room for district label
  let maxRight = 0;

  items.forEach((item, idx) => {
    const isLand = item.children && item.children.length > 0;
    if (isLand) {
      const land = layoutLand(item, startX + 20, currentY, depth);
      lands.push(land);
      currentY += land.totalHeight + LAND_GAP;
      maxRight = Math.max(maxRight, land.totalWidth);
    } else {
      // Standalone building (L1 with no children) — treat as tiny land
      const bld = {
        id: item.id,
        name: item.name,
        tags: item.tags || {},
        depth,
        type: 'building',
        x: startX + 20 + LAND_PAD,
        y: currentY + LAND_PAD,
        w: BUILDING_SIZE,
        h: BUILDING_SIZE,
        totalWidth: BUILDING_SIZE + LAND_PAD * 2,
        totalHeight: BUILDING_SIZE + LAND_PAD * 2,
        children: [],
        placed: item.placed !== false,
        assetId: item.assetId || null,
        cityPos: item.cityPos || null,
      };
      lands.push(bld);
      currentY += bld.totalHeight + LAND_GAP;
    }
  });

  const height = currentY - startY;
  const width = maxRight + 40;
  return { lands, width, height };
}

function layoutLand(item, landX, landY, depth) {
  const buildings = [];
  const subLands = [];

  // Separate children into buildings (leaves) and sub-lands (branches)
  for (const child of (item.children || [])) {
    const hasKids = child.children && child.children.length > 0;
    if (hasKids) {
      subLands.push(child);
    } else {
      buildings.push(child);
    }
  }

  // Layout buildings in a grid inside this land
  const rows = Math.ceil(buildings.length / BUILDINGS_PER_ROW);
  const gridW = Math.min(buildings.length, BUILDINGS_PER_ROW) * (BUILDING_SIZE + BUILDING_GAP) - BUILDING_GAP;
  const gridH = rows * (BUILDING_SIZE + BUILDING_GAP) - (rows > 0 ? BUILDING_GAP : 0);

  const landContentW = Math.max(gridW, LAND_MIN_W - LAND_PAD * 2);
  const landContentH = Math.max(gridH, LAND_MIN_H - LAND_PAD * 2 - 24);

  const landW = landContentW + LAND_PAD * 2;
  const landH = landContentH + LAND_PAD * 2 + 24; // +24 for label

  const buildingItems = buildings.map((bld, idx) => {
    const row = Math.floor(idx / BUILDINGS_PER_ROW);
    const col = idx % BUILDINGS_PER_ROW;
    return {
      id: bld.id,
      name: bld.name,
      tags: bld.tags || {},
      depth: depth + 1,
      type: 'building',
      x: landX + LAND_PAD + col * (BUILDING_SIZE + BUILDING_GAP),
      y: landY + LAND_PAD + 24 + row * (BUILDING_SIZE + BUILDING_GAP),
      w: BUILDING_SIZE,
      h: BUILDING_SIZE,
      parentId: item.id,
      placed: bld.placed !== false,
      assetId: bld.assetId || null,
      cityPos: bld.cityPos || null,
    };
  });

  // Layout sub-lands to the RIGHT
  let subLandX = landX + landW + SUBLAND_GAP;
  let subLandMaxH = 0;
  const subLandResults = [];

  for (const sub of subLands) {
    const subResult = layoutLand(sub, subLandX, landY, depth + 1);
    subLandResults.push(subResult);
    subLandX += subResult.totalWidth + SUBLAND_GAP;
    subLandMaxH = Math.max(subLandMaxH, subResult.totalHeight);
  }

  const totalWidth = (subLandX - landX - (subLands.length > 0 ? SUBLAND_GAP : 0));
  const totalHeight = Math.max(landH, subLandMaxH);

  return {
    id: item.id,
    name: item.name,
    tags: item.tags || {},
    depth,
    type: 'land',
    x: landX,
    y: landY,
    w: landW,
    h: landH,
    totalWidth: Math.max(totalWidth, landW),
    totalHeight: totalHeight,
    buildings: buildingItems,
    subLands: subLandResults,
    placed: item.placed !== false,
    assetId: item.assetId || null,
    cityPos: item.cityPos || null,
  };
}

function flattenLandItems(land) {
  const items = [{ ...land, children: undefined, buildings: undefined, subLands: undefined }];
  if (land.buildings) {
    for (const b of land.buildings) items.push(b);
  }
  if (land.subLands) {
    for (const sub of land.subLands) items.push(...flattenLandItems(sub));
  }
  return items;
}

// Color palettes for districts
export const DISTRICT_COLORS = {
  sand: {
    sand:  { fill: '#fef3c7', border: '#f59e0b', text: '#92400e', landFill: '#fffbeb', bldFill: '#fde68a' },
    clay:  { fill: '#ffedd5', border: '#fb923c', text: '#9c4221', landFill: '#fff7ed', bldFill: '#fed7aa' },
    dune:  { fill: '#fef9c3', border: '#eab308', text: '#854d0e', landFill: '#fefce8', bldFill: '#fef08a' },
    river: { fill: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e', landFill: '#f0f9ff', bldFill: '#bae6fd' },
    moss:  { fill: '#d1fae5', border: '#10b981', text: '#065f46', landFill: '#ecfdf5', bldFill: '#a7f3d0' },
    brick: { fill: '#ffe4e6', border: '#fb7185', text: '#9f1239', landFill: '#fff1f2', bldFill: '#fecdd3' },
    sky:   { fill: '#e0e7ff', border: '#818cf8', text: '#3730a3', landFill: '#eef2ff', bldFill: '#c7d2fe' },
    stone: { fill: '#e7e5e4', border: '#78716c', text: '#44403c', landFill: '#f5f5f4', bldFill: '#d6d3d1' },
  },
  dark: {
    red:    { fill: '#3c1f1f', border: '#f48771', text: '#f48771', landFill: '#2d1515', bldFill: '#5a2828' },
    orange: { fill: '#3c2a1f', border: '#ce9178', text: '#ce9178', landFill: '#2d1f15', bldFill: '#5a3a28' },
    yellow: { fill: '#3c3a1f', border: '#dcdcaa', text: '#dcdcaa', landFill: '#2d2b15', bldFill: '#5a5628' },
    green:  { fill: '#1f3c25', border: '#6a9955', text: '#6a9955', landFill: '#152d1a', bldFill: '#285a32' },
    cyan:   { fill: '#1f3a3c', border: '#4ec9b0', text: '#4ec9b0', landFill: '#152b2d', bldFill: '#28565a' },
    blue:   { fill: '#1f2d3c', border: '#569cd6', text: '#569cd6', landFill: '#15202d', bldFill: '#28425a' },
    purple: { fill: '#2d1f3c', border: '#c586c0', text: '#c586c0', landFill: '#20152d', bldFill: '#42285a' },
    gray:   { fill: '#2d2d30', border: '#cccccc', text: '#cccccc', landFill: '#252526', bldFill: '#3e3e42' },
  },
  light: {
    red:    { fill: '#fef2f2', border: '#dc2626', text: '#991b1b', landFill: '#ffffff', bldFill: '#fecaca' },
    orange: { fill: '#fffbeb', border: '#ea580c', text: '#9c4221', landFill: '#ffffff', bldFill: '#fed7aa' },
    yellow: { fill: '#fefce8', border: '#ca8a04', text: '#854d0e', landFill: '#ffffff', bldFill: '#fef08a' },
    green:  { fill: '#f0fdf4', border: '#16a34a', text: '#166534', landFill: '#ffffff', bldFill: '#bbf7d0' },
    cyan:   { fill: '#ecfeff', border: '#0891b2', text: '#155e75', landFill: '#ffffff', bldFill: '#a5f3fc' },
    blue:   { fill: '#eff6ff', border: '#2563eb', text: '#1e40af', landFill: '#ffffff', bldFill: '#bfdbfe' },
    purple: { fill: '#faf5ff', border: '#9333ea', text: '#6b21a8', landFill: '#ffffff', bldFill: '#d8b4fe' },
    gray:   { fill: '#f9fafb', border: '#4b5563', text: '#1f2937', landFill: '#ffffff', bldFill: '#d1d5db' },
  }
};

export function getDistrictColor(themeId, colorKey) {
  const m = DISTRICT_COLORS[themeId] || DISTRICT_COLORS.sand;
  return m[colorKey] || m[Object.keys(m)[0]];
}
