// Asset Registry — manages uploaded asset images
// Stores assets in Firebase Storage, metadata in Firestore
// Supports ZIP batch upload with filename-based auto-matching

import { BUILDING_TYPES, VEHICLE_TYPES, CHARACTER_TYPES, ROAD_TYPES, FENCE_TYPES, BUILDING_SIZES } from '../constants/unitTypes.js';

// ========== ASSET SLOT DEFINITIONS ==========

// All possible asset slots the system knows about
export function getAllAssetSlots() {
  const slots = [];

  // Buildings: 14 types × 3 sizes = 42
  for (const [bt, info] of Object.entries(BUILDING_TYPES)) {
    for (const [sz, szInfo] of Object.entries(BUILDING_SIZES)) {
      slots.push({
        category: 'building',
        type: bt,
        size: sz,
        id: `building_${bt}_${sz}`,
        label_ko: `${info.emoji} ${info.label_ko} ${szInfo.label_ko}`,
        label_en: `${info.emoji} ${info.label_en} ${szInfo.label_en}`,
        color: info.color,
      });
    }
  }

  // Vehicles: 6 types × 2 directions = 12
  for (const [vt, info] of Object.entries(VEHICLE_TYPES)) {
    for (const dir of ['right', 'left']) {
      slots.push({
        category: 'vehicle',
        type: vt,
        direction: dir,
        id: `vehicle_${vt}_${dir}`,
        label_ko: `${info.emoji} ${info.label_ko} (${dir === 'right' ? '→' : '←'})`,
        label_en: `${info.emoji} ${info.label_en} (${dir === 'right' ? '→' : '←'})`,
        color: info.color,
      });
    }
  }

  // Characters: 8 types × 2 directions = 16
  for (const [ct, info] of Object.entries(CHARACTER_TYPES)) {
    for (const dir of ['right', 'left']) {
      slots.push({
        category: 'character',
        type: ct,
        direction: dir,
        id: `character_${ct}_${dir}`,
        label_ko: `${info.emoji} ${info.label_ko} (${dir === 'right' ? '→' : '←'})`,
        label_en: `${info.emoji} ${info.label_en} (${dir === 'right' ? '→' : '←'})`,
        color: info.color,
      });
    }
  }

  // Roads: 4 types × 7 shapes
  const shapes = ['straight_h', 'straight_v', 'curve', 't_junction', 'crossroad'];
  for (const [rt] of Object.entries(ROAD_TYPES)) {
    for (const shape of shapes) {
      slots.push({
        category: 'road',
        type: rt,
        shape,
        id: `road_${shape}_${rt}`,
        label_ko: `🛤️ ${ROAD_TYPES[rt].label_ko} ${shape}`,
        label_en: `🛤️ ${ROAD_TYPES[rt].label_en} ${shape}`,
      });
    }
  }

  // Fences: 3 types × 2 pieces
  for (const [ft, info] of Object.entries(FENCE_TYPES)) {
    slots.push({
      category: 'fence',
      type: ft,
      id: `fence_${ft}_straight`,
      label_ko: `${info.label_ko} 직선`,
      label_en: `${info.label_en} straight`,
      color: info.color,
    });
    slots.push({
      category: 'fence',
      type: ft,
      id: `fence_${ft}_corner`,
      label_ko: `${info.label_ko} 코너`,
      label_en: `${info.label_en} corner`,
      color: info.color,
    });
  }

  return slots;
}

// ========== FILENAME PARSING ==========

// Parse filename to match a slot
// Expected format: {category}_{type}_{size/direction/shape}_{theme}_{number}.png
// Examples:
//   building_page_small_sand_01.png
//   vehicle_truck_right_sand_01.png
//   character_bug_right_sand_01.png
//   road_straight_street_sand_01.png
//   fence_wood_straight_sand_01.png
export function parseAssetFilename(filename) {
  const name = filename.replace(/\.[^.]+$/, ''); // strip extension
  const parts = name.split('_');

  if (parts.length < 3) return null;

  const category = parts[0];
  const type = parts[1];
  const variant = parts[2]; // size, direction, or shape
  const theme = parts[3] || 'sand';
  const number = parts[4] || '01';

  // Try to match to a slot
  let slotId = null;

  switch (category) {
    case 'building':
      if (BUILDING_TYPES[type] && BUILDING_SIZES[variant]) {
        slotId = `building_${type}_${variant}`;
      }
      break;
    case 'vehicle':
      if (VEHICLE_TYPES[type] && (variant === 'right' || variant === 'left')) {
        slotId = `vehicle_${type}_${variant}`;
      }
      break;
    case 'character':
      if (CHARACTER_TYPES[type] && (variant === 'right' || variant === 'left')) {
        slotId = `character_${type}_${variant}`;
      }
      break;
    case 'road':
      // road_straight_street_sand_01
      const shape = type; // filename: road_{shape}_{roadtype}
      const roadType = variant;
      if (ROAD_TYPES[roadType]) {
        slotId = `road_${shape}_${roadType}`;
      }
      break;
    case 'fence':
      if (FENCE_TYPES[type]) {
        slotId = `fence_${type}_${variant}`;
      }
      break;
    case 'deco':
      slotId = `deco_${type}`;
      break;
  }

  return {
    slotId,
    category,
    type,
    variant,
    theme,
    number,
    filename,
  };
}

// ========== ZIP BATCH PROCESSING ==========

export async function processAssetZip(file) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const matched = [];   // { slotId, filename, blob, theme, number }
  const unmatched = [];  // { filename, blob }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const ext = path.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) continue;

    const filename = path.split('/').pop();
    const blob = await entry.async('blob');

    const parsed = parseAssetFilename(filename);
    if (parsed && parsed.slotId) {
      matched.push({
        slotId: parsed.slotId,
        filename,
        blob,
        url: URL.createObjectURL(blob),
        theme: parsed.theme,
        number: parsed.number,
      });
    } else {
      unmatched.push({
        filename,
        blob,
        url: URL.createObjectURL(blob),
      });
    }
  }

  return { matched, unmatched, total: matched.length + unmatched.length };
}

// ========== LOCAL ASSET STORE (in-memory, persists via project) ==========

// Asset data stored in project.assets = { [slotId]: { images: [...], activeIndex: 0 } }
export function getAsset(project, slotId) {
  const assets = project?.assets || {};
  const slot = assets[slotId];
  if (!slot || !slot.images || slot.images.length === 0) return null;
  return slot.images[slot.activeIndex || 0] || null;
}

export function getActiveAssetUrl(project, slotId) {
  const asset = getAsset(project, slotId);
  return asset?.url || null;
}

export function addAssetToSlot(projectAssets, slotId, imageData) {
  const assets = { ...projectAssets };
  if (!assets[slotId]) assets[slotId] = { images: [], activeIndex: 0 };
  assets[slotId].images.push(imageData);
  return assets;
}

export function setActiveAsset(projectAssets, slotId, index) {
  const assets = { ...projectAssets };
  if (assets[slotId]) assets[slotId].activeIndex = index;
  return assets;
}

export function removeAssetFromSlot(projectAssets, slotId, index) {
  const assets = { ...projectAssets };
  if (!assets[slotId]) return assets;
  assets[slotId].images.splice(index, 1);
  if (assets[slotId].activeIndex >= assets[slotId].images.length) {
    assets[slotId].activeIndex = Math.max(0, assets[slotId].images.length - 1);
  }
  return assets;
}

// Get stats for asset manager UI
export function getAssetStats(projectAssets) {
  const slots = getAllAssetSlots();
  let filled = 0, total = slots.length;
  for (const slot of slots) {
    if (projectAssets?.[slot.id]?.images?.length > 0) filled++;
  }
  return { filled, total, percent: Math.round((filled / total) * 100) };
}
