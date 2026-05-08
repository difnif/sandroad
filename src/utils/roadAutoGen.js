// Road Auto-Generation System
// 1. Buildings placed → surrounding roads auto-generated
// 2. Connections made → movers use existing roads (shortest path)
// 3. Road type auto-upgrades based on mover count
// 4. Auto-generated roads are locked by default

import { genNodeId } from './idGen.js';
import { autoRoadType, GRID } from '../constants/unitTypes.js';

const TILE = GRID.TILE_W; // 128px

// ========== AUTO ROAD GENERATION (from building layout) ==========

// Generate road segments around buildings and between districts
export function generateInfraRoads(project) {
  const cols = project.columns || [];
  const roads = [];
  const roadSet = new Set(); // prevent duplicates: "x1,y1|x2,y2"

  // Collect all building positions
  const buildings = [];
  for (const col of cols) {
    walkTree(project.structure[col.key] || [], (node) => {
      if (node.cityX != null && node.cityY != null) {
        buildings.push({
          id: node.id,
          x: node.cityX,
          y: node.cityY,
          w: (node.areaW || 1) * TILE,
          h: (node.areaH || 1) * TILE,
          col: col.key,
          colLabel: col.label,
          depth: node.depth || 1,
        });
      }
    });
  }

  if (buildings.length === 0) return [];

  // 1. Sidewalks around each building
  for (const b of buildings) {
    const segments = getBuildingPerimeter(b);
    for (const seg of segments) {
      const key = segKey(seg);
      if (!roadSet.has(key)) {
        roadSet.add(key);
        roads.push(createRoadSegment(seg, 'sidewalk', true));
      }
    }
  }

  // 2. Streets connecting nearby buildings in same district
  const byCol = groupBy(buildings, 'col');
  for (const [colKey, colBuildings] of Object.entries(byCol)) {
    if (colBuildings.length < 2) continue;
    // Connect closest pairs within district
    const connections = findLocalConnections(colBuildings);
    for (const conn of connections) {
      const pathSegments = findPath(conn.from, conn.to);
      for (const seg of pathSegments) {
        const key = segKey(seg);
        if (!roadSet.has(key)) {
          roadSet.add(key);
          roads.push(createRoadSegment(seg, 'street', true));
        }
      }
    }
  }

  // 3. Avenues between districts
  const colCenters = [];
  for (const [colKey, colBuildings] of Object.entries(byCol)) {
    const cx = avg(colBuildings.map(b => b.x + b.w / 2));
    const cy = avg(colBuildings.map(b => b.y + b.h / 2));
    colCenters.push({ col: colKey, x: cx, y: cy });
  }

  for (let i = 0; i < colCenters.length; i++) {
    for (let j = i + 1; j < colCenters.length; j++) {
      const pathSegments = findPath(colCenters[i], colCenters[j]);
      for (const seg of pathSegments) {
        const key = segKey(seg);
        if (!roadSet.has(key)) {
          roadSet.add(key);
          roads.push(createRoadSegment(seg, 'avenue', true));
        }
      }
    }
  }

  return roads;
}

// ========== MOVER ROUTING (shortest path on existing roads) ==========

// Find shortest path between two building IDs using existing road network
export function findMoverRoute(fromBuilding, toBuilding, infraRoads) {
  // Simple: direct line for now (grid-snapped)
  // Future: A* pathfinding on road graph
  return {
    fromId: fromBuilding.id,
    toId: toBuilding.id,
    waypoints: [
      { x: fromBuilding.x + (fromBuilding.w || TILE) / 2, y: fromBuilding.y + (fromBuilding.h || TILE) / 2 },
      { x: toBuilding.x + (toBuilding.w || TILE) / 2, y: toBuilding.y + (toBuilding.h || TILE) / 2 },
    ]
  };
}

// ========== ROAD AUTO-UPGRADE ==========

// Recalculate road types based on mover count
export function upgradeRoads(infraRoads, movers, project) {
  const roadMoverCount = {};

  // Count movers per road segment
  for (const mover of movers) {
    // Each mover uses road segments along its path
    const route = mover.route;
    if (!route) continue;
    for (const segId of (route.segmentIds || [])) {
      roadMoverCount[segId] = (roadMoverCount[segId] || 0) + 1;
    }
  }

  // Upgrade locked auto-roads based on traffic
  return infraRoads.map(road => {
    if (!road.locked) return road; // manual roads stay as-is
    const count = roadMoverCount[road.id] || 0;
    const isInterDistrict = road.interDistrict || false;
    const newType = autoRoadType(count, isInterDistrict);

    if (newType !== road.type) {
      return { ...road, type: newType };
    }
    return road;
  });
}

// ========== LOCKING SYSTEM ==========

export function toggleRoadLock(roads, roadId) {
  return roads.map(r => r.id === roadId ? { ...r, locked: !r.locked } : r);
}

export function lockRoad(roads, roadId) {
  return roads.map(r => r.id === roadId ? { ...r, locked: true } : r);
}

export function unlockRoad(roads, roadId) {
  return roads.map(r => r.id === roadId ? { ...r, locked: false } : r);
}

// ========== MOVER MANAGEMENT ==========

// Create a mover (vehicle or character) on a connection
export function createMover(fromId, toId, moverType, dataType, direction = 'oneway') {
  return {
    id: genNodeId(),
    fromId,
    toId,
    moverType,   // key from VEHICLE_TYPES or CHARACTER_TYPES
    dataType,    // key from DATA_TYPES
    direction,   // 'oneway' | 'twoway_same' | 'twoway_diff'
    returnMoverType: null, // for twoway_diff: different mover on return
    returnDataType: null,  // for twoway_diff: different data on return
    createdAt: Date.now(),
    label: '',
  };
}

// Get animation state for a mover
export function createMoverAnimState(mover, route) {
  return {
    moverId: mover.id,
    progress: Math.random(),
    speed: 0.002, // base speed, multiplied by mover type speed
    forward: true,
    moverType: mover.moverType,
    dataType: mover.dataType,
    direction: mover.direction,
    route,
    x: 0, y: 0,
  };
}

// ========== HELPERS ==========

function createRoadSegment(seg, type, locked) {
  return {
    id: genNodeId(),
    x1: seg.x1, y1: seg.y1,
    x2: seg.x2, y2: seg.y2,
    type,
    locked,
    interDistrict: seg.interDistrict || false,
    createdAt: Date.now(),
  };
}

function getBuildingPerimeter(b) {
  const pad = 16; // sidewalk offset
  const segments = [
    // top
    { x1: b.x - pad, y1: b.y - pad, x2: b.x + b.w + pad, y2: b.y - pad },
    // bottom
    { x1: b.x - pad, y1: b.y + b.h + pad, x2: b.x + b.w + pad, y2: b.y + b.h + pad },
    // left
    { x1: b.x - pad, y1: b.y - pad, x2: b.x - pad, y2: b.y + b.h + pad },
    // right
    { x1: b.x + b.w + pad, y1: b.y - pad, x2: b.x + b.w + pad, y2: b.y + b.h + pad },
  ];
  return segments;
}

function findLocalConnections(buildings) {
  // Simple: connect each building to its nearest neighbor
  const connections = [];
  const connected = new Set();

  const sorted = [...buildings].sort((a, b) => a.x - b.x || a.y - b.y);
  for (let i = 0; i < sorted.length; i++) {
    let nearest = null, nearestDist = Infinity;
    for (let j = 0; j < sorted.length; j++) {
      if (i === j) continue;
      const key = [sorted[i].id, sorted[j].id].sort().join('|');
      if (connected.has(key)) continue;
      const d = dist(sorted[i], sorted[j]);
      if (d < nearestDist) { nearestDist = d; nearest = j; }
    }
    if (nearest !== null) {
      const key = [sorted[i].id, sorted[nearest].id].sort().join('|');
      connected.add(key);
      connections.push({
        from: { x: sorted[i].x + sorted[i].w / 2, y: sorted[i].y + sorted[i].h / 2 },
        to: { x: sorted[nearest].x + sorted[nearest].w / 2, y: sorted[nearest].y + sorted[nearest].h / 2 },
      });
    }
  }
  return connections;
}

function findPath(from, to) {
  // Grid-snapped L-shaped path (Manhattan routing)
  const segments = [];
  const mx = (from.x + to.x) / 2;
  // Horizontal first, then vertical
  if (Math.abs(from.x - to.x) > 8) {
    segments.push({ x1: from.x, y1: from.y, x2: mx, y2: from.y });
    segments.push({ x1: mx, y1: from.y, x2: mx, y2: to.y });
    segments.push({ x1: mx, y1: to.y, x2: to.x, y2: to.y });
  } else {
    segments.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
  }
  return segments;
}

function segKey(seg) {
  const coords = [
    `${Math.round(seg.x1)},${Math.round(seg.y1)}`,
    `${Math.round(seg.x2)},${Math.round(seg.y2)}`
  ].sort().join('|');
  return coords;
}

function dist(a, b) {
  return Math.hypot((a.x + a.w / 2) - (b.x + b.w / 2), (a.y + a.h / 2) - (b.y + b.h / 2));
}

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / (arr.length || 1); }
function groupBy(arr, key) { const m = {}; arr.forEach(i => { const k = i[key]; if (!m[k]) m[k] = []; m[k].push(i); }); return m; }
function walkTree(nodes, cb, pid = null, d = 1) { for (const n of nodes) { cb(n, pid, d); if (n.children?.length) walkTree(n.children, cb, n.id, d + 1); } }
