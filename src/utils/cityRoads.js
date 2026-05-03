// Road data model and utilities

import { genNodeId } from './idGen.js';

export function createRoad(fromId, toId, type = 'main', vehicle = 'car', label = '') {
  return { id: genNodeId(), from: fromId, to: toId, type, vehicle, label };
}

export function addRoad(roads, road) {
  const exists = (roads || []).some(r =>
    (r.from === road.from && r.to === road.to) || (r.from === road.to && r.to === road.from)
  );
  if (exists) return roads || [];
  return [...(roads || []), road];
}

export function removeRoad(roads, roadId) {
  return (roads || []).filter(r => r.id !== roadId);
}

export function updateRoad(roads, roadId, updates) {
  return (roads || []).map(r => r.id === roadId ? { ...r, ...updates } : r);
}

// Auto-generate roads from tree hierarchy (parent → child connections)
// Only generates for direct parent-child pairs that don't already have a road
export function generateRoadsFromTree(project) {
  if (!project) return [];
  const existingRoads = project.roads || [];
  const newRoads = [...existingRoads];
  const existingPairs = new Set(existingRoads.map(r => [r.from, r.to].sort().join('|')));

  for (const col of project.columns || []) {
    walkTree(project.structure[col.key] || [], null, (node, parentId) => {
      if (!parentId) return;
      const key = [parentId, node.id].sort().join('|');
      if (existingPairs.has(key)) return;
      existingPairs.add(key);

      // Determine road type: L1→L2 = main, deeper = sub
      const depth = getNodeDepth(project.structure[col.key], node.id);
      const type = depth <= 2 ? 'main' : 'sub';
      newRoads.push(createRoad(parentId, node.id, type, 'car'));
    });
  }
  return newRoads;
}

function walkTree(nodes, parentId, callback) {
  for (const node of nodes) {
    callback(node, parentId);
    if (node.children?.length) walkTree(node.children, node.id, callback);
  }
}

function getNodeDepth(nodes, id, depth = 1) {
  for (const n of nodes) {
    if (n.id === id) return depth;
    if (n.children) { const d = getNodeDepth(n.children, id, depth + 1); if (d) return d; }
  }
  return 0;
}

export const VEHICLE_INFO = {
  car:    { emoji: '🚗', emojiFlip: '🚗', label_ko: '차량', label_en: 'Car',    color: '#3b82f6', desc_ko: '일반 통신/데이터 이동', desc_en: 'Standard data flow' },
  drone:  { emoji: '🚁', emojiFlip: '🚁', label_ko: '드론', label_en: 'Drone',  color: '#8b5cf6', desc_ko: 'API 연동/비동기', desc_en: 'API / async connection' },
  worker: { emoji: '👷', emojiFlip: '👷', label_ko: '인력', label_en: 'Worker', color: '#f59e0b', desc_ko: '수동 작업/관리', desc_en: 'Manual operation' }
};

export const ROAD_TYPES = {
  main: { width: 6, dash: null,   label_ko: '대로', label_en: 'Main road' },
  sub:  { width: 3, dash: [8, 4], label_ko: '소로', label_en: 'Sub road' }
};

export function createVehicleAnimState(road) {
  return {
    roadId: road.id,
    progress: Math.random(), // stagger start
    speed: 0.002 + Math.random() * 0.002,
    direction: 1,
    vehicle: road.vehicle,
    from: road.from,
    to: road.to,
    x: 0, y: 0, // current position (updated each frame)
    movingRight: true // for flip
  };
}
