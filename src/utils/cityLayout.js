// City layout engine v2: supports custom cityPos, unplaced items staging area

const DISTRICT_GAP = 120;
const LAND_GAP = 40;
const LAND_PAD = 20;
const BUILDING_SIZE = 48;
const BUILDING_GAP = 12;
const SUBLAND_GAP = 30;
const BUILDINGS_PER_ROW = 3;
const LAND_MIN_W = 200;
const LAND_MIN_H = 120;
const STAGING_OFFSET_Y = -80; // unplaced items appear above their parent land

export function computeCityLayout(project) {
  if (!project) return { districts: [], allItems: [], unplacedItems: [] };

  const cols = project.columns || [];
  const districts = [];
  const allItems = [];
  const unplacedItems = [];
  let districtX = 0;

  cols.forEach((col, colIdx) => {
    const items = project.structure[col.key] || [];
    const { lands, width, height, unplaced } = layoutDistrict(items, districtX, 0, 1, col.key);

    districts.push({
      key: col.key, label: col.label, color: col.color, colIndex: colIdx,
      x: districtX, y: 0,
      width: Math.max(width, LAND_MIN_W + 60),
      height: Math.max(height, LAND_MIN_H + 60),
    });

    for (const land of lands) allItems.push(...flattenLandItems(land));
    unplacedItems.push(...unplaced);

    districtX += Math.max(width, LAND_MIN_W + 60) + DISTRICT_GAP;
  });

  // Center
  const totalW = districtX - DISTRICT_GAP;
  const offsetX = -totalW / 2;
  for (const d of districts) d.x += offsetX;
  for (const item of allItems) item.x += offsetX;
  for (const item of unplacedItems) item.x += offsetX;

  return { districts, allItems, unplacedItems };
}

function layoutDistrict(items, startX, startY, depth, colKey) {
  const lands = [];
  const unplaced = [];
  let currentY = startY + 30;
  let maxRight = 0;

  items.forEach((item) => {
    const isLand = item.children && item.children.length > 0;

    // Check if this item is marked unplaced
    if (item.placed === false) {
      // Will be rendered in staging area
      unplaced.push({
        id: item.id, name: item.name, tags: item.tags || {},
        depth, type: isLand ? 'land' : 'building',
        x: startX + 20, y: currentY + STAGING_OFFSET_Y,
        w: isLand ? LAND_MIN_W : BUILDING_SIZE,
        h: isLand ? LAND_MIN_H : BUILDING_SIZE,
        placed: false, colKey,
        parentId: null
      });
      return;
    }

    if (isLand) {
      const land = layoutLand(item, startX + 20, currentY, depth, colKey, unplaced);
      lands.push(land);
      currentY += land.totalHeight + LAND_GAP;
      maxRight = Math.max(maxRight, land.totalWidth);
    } else {
      const bld = {
        id: item.id, name: item.name, tags: item.tags || {},
        depth, type: 'building',
        x: (item.cityPos?.x) ?? (startX + 20 + LAND_PAD),
        y: (item.cityPos?.y) ?? (currentY + LAND_PAD),
        w: BUILDING_SIZE, h: BUILDING_SIZE,
        totalWidth: BUILDING_SIZE + LAND_PAD * 2,
        totalHeight: BUILDING_SIZE + LAND_PAD * 2,
        children: [], placed: true, colKey,
        assetId: item.assetId || null
      };
      lands.push(bld);
      currentY += bld.totalHeight + LAND_GAP;
    }
  });

  const height = currentY - startY;
  const width = maxRight + 40;
  return { lands, width, height, unplaced };
}

function layoutLand(item, landX, landY, depth, colKey, unplacedOut) {
  const buildings = [];
  const subLands = [];
  const childUnplaced = [];

  for (const child of (item.children || [])) {
    if (child.placed === false) {
      childUnplaced.push(child);
      continue;
    }
    const hasKids = child.children && child.children.length > 0;
    if (hasKids) subLands.push(child);
    else buildings.push(child);
  }

  // Add unplaced children to staging
  childUnplaced.forEach((ch, idx) => {
    const isLand = ch.children && ch.children.length > 0;
    unplacedOut.push({
      id: ch.id, name: ch.name, tags: ch.tags || {},
      depth: depth + 1, type: isLand ? 'land' : 'building',
      x: landX + LAND_PAD + idx * (BUILDING_SIZE + 8),
      y: landY + STAGING_OFFSET_Y,
      w: isLand ? LAND_MIN_W * 0.6 : BUILDING_SIZE,
      h: isLand ? LAND_MIN_H * 0.6 : BUILDING_SIZE,
      placed: false, colKey,
      parentId: item.id
    });
  });

  const rows = Math.ceil(buildings.length / BUILDINGS_PER_ROW);
  const gridW = Math.min(buildings.length, BUILDINGS_PER_ROW) * (BUILDING_SIZE + BUILDING_GAP) - BUILDING_GAP;
  const gridH = rows * (BUILDING_SIZE + BUILDING_GAP) - (rows > 0 ? BUILDING_GAP : 0);

  const landContentW = Math.max(gridW, LAND_MIN_W - LAND_PAD * 2);
  const landContentH = Math.max(gridH, LAND_MIN_H - LAND_PAD * 2 - 24);
  const landW = landContentW + LAND_PAD * 2;
  const landH = landContentH + LAND_PAD * 2 + 24;

  const buildingItems = buildings.map((bld, idx) => {
    const row = Math.floor(idx / BUILDINGS_PER_ROW);
    const col = idx % BUILDINGS_PER_ROW;
    const defaultX = landX + LAND_PAD + col * (BUILDING_SIZE + BUILDING_GAP);
    const defaultY = landY + LAND_PAD + 24 + row * (BUILDING_SIZE + BUILDING_GAP);
    return {
      id: bld.id, name: bld.name, tags: bld.tags || {},
      depth: depth + 1, type: 'building',
      x: (bld.cityPos?.x) ?? defaultX,
      y: (bld.cityPos?.y) ?? defaultY,
      w: BUILDING_SIZE, h: BUILDING_SIZE,
      parentId: item.id, placed: true, colKey,
      assetId: bld.assetId || null
    };
  });

  let subLandX = landX + landW + SUBLAND_GAP;
  let subLandMaxH = 0;
  const subLandResults = [];

  for (const sub of subLands) {
    const subResult = layoutLand(sub, subLandX, landY, depth + 1, colKey, unplacedOut);
    subLandResults.push(subResult);
    subLandX += subResult.totalWidth + SUBLAND_GAP;
    subLandMaxH = Math.max(subLandMaxH, subResult.totalHeight);
  }

  const totalWidth = subLandX - landX - (subLands.length > 0 ? SUBLAND_GAP : 0);
  const totalHeight = Math.max(landH, subLandMaxH);

  return {
    id: item.id, name: item.name, tags: item.tags || {},
    depth, type: 'land',
    x: (item.cityPos?.x) ?? landX,
    y: (item.cityPos?.y) ?? landY,
    w: landW, h: landH,
    totalWidth: Math.max(totalWidth, landW), totalHeight,
    buildings: buildingItems, subLands: subLandResults,
    placed: true, colKey,
    assetId: item.assetId || null
  };
}

function flattenLandItems(land) {
  const items = [{ ...land, children: undefined, buildings: undefined, subLands: undefined }];
  if (land.buildings) for (const b of land.buildings) items.push(b);
  if (land.subLands) for (const sub of land.subLands) items.push(...flattenLandItems(sub));
  return items;
}

// Color palettes
export const DISTRICT_COLORS = {
  sand: {
    sand:  { fill: '#fef3c7', border: '#f59e0b', text: '#92400e', landFill: '#fffbeb', bldFill: '#fde68a', roadFill: '#d4a574' },
    clay:  { fill: '#ffedd5', border: '#fb923c', text: '#9c4221', landFill: '#fff7ed', bldFill: '#fed7aa', roadFill: '#c9956e' },
    dune:  { fill: '#fef9c3', border: '#eab308', text: '#854d0e', landFill: '#fefce8', bldFill: '#fef08a', roadFill: '#c4a45e' },
    river: { fill: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e', landFill: '#f0f9ff', bldFill: '#bae6fd', roadFill: '#7ab8d4' },
    moss:  { fill: '#d1fae5', border: '#10b981', text: '#065f46', landFill: '#ecfdf5', bldFill: '#a7f3d0', roadFill: '#6bc4a0' },
    brick: { fill: '#ffe4e6', border: '#fb7185', text: '#9f1239', landFill: '#fff1f2', bldFill: '#fecdd3', roadFill: '#d48090' },
    sky:   { fill: '#e0e7ff', border: '#818cf8', text: '#3730a3', landFill: '#eef2ff', bldFill: '#c7d2fe', roadFill: '#8b96d0' },
    stone: { fill: '#e7e5e4', border: '#78716c', text: '#44403c', landFill: '#f5f5f4', bldFill: '#d6d3d1', roadFill: '#9a9590' },
  },
  dark: {
    red:    { fill: '#3c1f1f', border: '#f48771', text: '#f48771', landFill: '#2d1515', bldFill: '#5a2828', roadFill: '#4a2020' },
    orange: { fill: '#3c2a1f', border: '#ce9178', text: '#ce9178', landFill: '#2d1f15', bldFill: '#5a3a28', roadFill: '#4a2a18' },
    yellow: { fill: '#3c3a1f', border: '#dcdcaa', text: '#dcdcaa', landFill: '#2d2b15', bldFill: '#5a5628', roadFill: '#4a4618' },
    green:  { fill: '#1f3c25', border: '#6a9955', text: '#6a9955', landFill: '#152d1a', bldFill: '#285a32', roadFill: '#1e4a22' },
    cyan:   { fill: '#1f3a3c', border: '#4ec9b0', text: '#4ec9b0', landFill: '#152b2d', bldFill: '#28565a', roadFill: '#1e464a' },
    blue:   { fill: '#1f2d3c', border: '#569cd6', text: '#569cd6', landFill: '#15202d', bldFill: '#28425a', roadFill: '#1e324a' },
    purple: { fill: '#2d1f3c', border: '#c586c0', text: '#c586c0', landFill: '#20152d', bldFill: '#42285a', roadFill: '#321e4a' },
    gray:   { fill: '#2d2d30', border: '#cccccc', text: '#cccccc', landFill: '#252526', bldFill: '#3e3e42', roadFill: '#353538' },
  },
  light: {
    red:    { fill: '#fef2f2', border: '#dc2626', text: '#991b1b', landFill: '#ffffff', bldFill: '#fecaca', roadFill: '#e8b0b0' },
    orange: { fill: '#fffbeb', border: '#ea580c', text: '#9c4221', landFill: '#ffffff', bldFill: '#fed7aa', roadFill: '#e8c090' },
    yellow: { fill: '#fefce8', border: '#ca8a04', text: '#854d0e', landFill: '#ffffff', bldFill: '#fef08a', roadFill: '#e8d870' },
    green:  { fill: '#f0fdf4', border: '#16a34a', text: '#166534', landFill: '#ffffff', bldFill: '#bbf7d0', roadFill: '#90d8a8' },
    cyan:   { fill: '#ecfeff', border: '#0891b2', text: '#155e75', landFill: '#ffffff', bldFill: '#a5f3fc', roadFill: '#80d8e8' },
    blue:   { fill: '#eff6ff', border: '#2563eb', text: '#1e40af', landFill: '#ffffff', bldFill: '#bfdbfe', roadFill: '#90b8e0' },
    purple: { fill: '#faf5ff', border: '#9333ea', text: '#6b21a8', landFill: '#ffffff', bldFill: '#d8b4fe', roadFill: '#b890d8' },
    gray:   { fill: '#f9fafb', border: '#4b5563', text: '#1f2937', landFill: '#ffffff', bldFill: '#d1d5db', roadFill: '#b0b4b8' },
  }
};

export function getDistrictColor(themeId, colorKey) {
  const m = DISTRICT_COLORS[themeId] || DISTRICT_COLORS.sand;
  return m[colorKey] || m[Object.keys(m)[0]];
}
