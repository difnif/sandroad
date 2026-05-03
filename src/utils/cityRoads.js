// Road data model and utilities for city view.
//
// Road: { id, from, to, type: 'main'|'sub', vehicle: 'car'|'drone'|'worker', label }
// Stored in project.roads[]

import { genNodeId } from './idGen.js';

export function createRoad(fromId, toId, type = 'main', vehicle = 'car', label = '') {
  return {
    id: genNodeId(),
    from: fromId,
    to: toId,
    type,
    vehicle,
    label
  };
}

export function addRoad(roads, road) {
  // Prevent duplicates (same from-to pair)
  const exists = (roads || []).some(r =>
    (r.from === road.from && r.to === road.to) ||
    (r.from === road.to && r.to === road.from)
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

// Vehicle display info
export const VEHICLE_INFO = {
  car:    { emoji: '🚗', label_ko: '차량', label_en: 'Car',    color: '#3b82f6', desc_ko: '일반 통신/데이터 이동', desc_en: 'Standard data flow' },
  drone:  { emoji: '🚁', label_ko: '드론', label_en: 'Drone',  color: '#8b5cf6', desc_ko: 'API 연동/비동기', desc_en: 'API / async connection' },
  worker: { emoji: '👷', label_ko: '인력', label_en: 'Worker', color: '#f59e0b', desc_ko: '수동 작업/관리', desc_en: 'Manual operation' }
};

export const ROAD_TYPES = {
  main: { width: 6, dash: null,   label_ko: '대로', label_en: 'Main road' },
  sub:  { width: 3, dash: [8, 4], label_ko: '소로', label_en: 'Sub road' }
};

// Animation state for vehicles
export function createVehicleAnimState(road) {
  return {
    roadId: road.id,
    progress: 0,       // 0~1 along the road
    speed: 0.003 + Math.random() * 0.002, // slightly varied
    direction: 1,      // 1 = from→to, -1 = to→from
    vehicle: road.vehicle
  };
}
