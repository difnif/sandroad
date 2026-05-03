// Road data utilities - uses unitTypes.js for type definitions

import { genNodeId } from './idGen.js';
import { VEHICLE_TYPES, ROAD_TYPES, DATA_TYPES } from '../constants/unitTypes.js';

export { VEHICLE_TYPES, ROAD_TYPES, DATA_TYPES };

export function createRoad(fromId, toId, roadType = 'main', vehicle = 'car', dataType = 'content', label = '') {
  return { id: genNodeId(), from: fromId, to: toId, type: roadType, vehicle, dataType, label };
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
      const depth = getNodeDepth(project.structure[col.key], node.id);
      const roadType = depth <= 2 ? 'main' : 'sub';
      newRoads.push(createRoad(parentId, node.id, roadType, 'car', 'content'));
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

export function createVehicleAnimState(road) {
  const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
  return {
    roadId: road.id,
    progress: Math.random(),
    speed: 0.002 * (vt.speed || 1),
    direction: 1,
    vehicle: road.vehicle,
    dataType: road.dataType || 'content',
    from: road.from,
    to: road.to,
    x: 0, y: 0,
    movingRight: true
  };
}
