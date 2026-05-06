// Structure Inspector — validates project completeness and suggests architecture patterns
// Two modes:
//   1. Local checks (instant, no API) — basic rule validation
//   2. AI analysis (Claude API) — architecture pattern suggestions

import { BUILDING_TYPES, VEHICLE_TYPES, DATA_TYPES } from '../constants/unitTypes.js';

// ========== LOCAL CHECKS (instant) ==========

export function runLocalInspection(project) {
  if (!project) return { score: 0, checks: [], summary: '' };

  const cols = project.columns || [];
  const roads = project.roads || [];
  const nodes = [];
  const nodeMap = {};

  // Collect all nodes
  for (const col of cols) {
    walkTree(project.structure[col.key] || [], (node, parentId, depth) => {
      const entry = { ...node, col: col.key, colLabel: col.label, parentId, depth };
      nodes.push(entry);
      nodeMap[node.id] = entry;
    });
  }

  const checks = [];

  // ---- 1. 기본 구조 검사 ----
  checks.push(...checkBasicStructure(nodes, cols, project));

  // ---- 2. 필수 건물 검사 ----
  checks.push(...checkEssentialBuildings(nodes));

  // ---- 3. 연결 검사 ----
  checks.push(...checkConnections(nodes, roads, nodeMap));

  // ---- 4. 데이터 흐름 검사 ----
  checks.push(...checkDataFlow(nodes, roads, nodeMap));

  // ---- 5. 보안/인증 검사 ----
  checks.push(...checkSecurity(nodes, roads, nodeMap));

  // ---- 6. 인프라 검사 ----
  checks.push(...checkInfra(nodes, roads));

  // Score: 100 - (errors * 10 + warnings * 3 + info * 0)
  const errors = checks.filter(c => c.level === 'error').length;
  const warnings = checks.filter(c => c.level === 'warning').length;
  const infos = checks.filter(c => c.level === 'info').length;
  const score = Math.max(0, Math.min(100, 100 - errors * 10 - warnings * 3));

  return {
    score,
    checks,
    counts: { errors, warnings, infos, total: checks.length },
    nodeCount: nodes.length,
    roadCount: roads.length,
    summary: generateLocalSummary(score, errors, warnings, infos, nodes.length, roads.length)
  };
}

// ---- Check functions ----

function checkBasicStructure(nodes, cols, project) {
  const checks = [];

  if (nodes.length === 0) {
    checks.push(issue('error', 'empty_project',
      '도시에 건물이 하나도 없습니다',
      'No buildings in the city',
      '🏗️ 에디터에서 항목을 추가해주세요',
      '🏗️ Add items in the editor first'));
    return checks;
  }

  if (nodes.length < 3) {
    checks.push(issue('warning', 'too_few_items',
      `건물이 ${nodes.length}개뿐입니다. 최소 5개 이상 권장`,
      `Only ${nodes.length} buildings. Recommend at least 5`,
      '🏘️ 도시가 너무 작습니다. 주요 기능을 더 추가해보세요',
      '🏘️ City is too small. Add more key features'));
  }

  if (cols.length === 1) {
    checks.push(issue('info', 'single_district',
      '구역이 1개입니다. 관리자/유저 등 역할별로 구분하면 구조가 명확해집니다',
      'Only 1 district. Separating by role (admin/user) improves clarity',
      '🏙️ 도시가 하나의 구역으로만 되어있어요',
      '🏙️ City has only one district'));
  }

  // Check for deep nesting
  const maxDepth = Math.max(...nodes.map(n => n.depth));
  if (maxDepth > 4) {
    checks.push(issue('warning', 'deep_nesting',
      `최대 깊이가 ${maxDepth}단계입니다. 3단계 이내가 관리하기 좋습니다`,
      `Max depth is ${maxDepth}. Keep within 3 levels for maintainability`,
      '🏢 건물이 너무 깊이 쌓여있습니다',
      '🏢 Buildings are nested too deeply'));
  }

  return checks;
}

function checkEssentialBuildings(nodes) {
  const checks = [];
  const types = new Set(nodes.map(n => n.buildingType || 'page'));

  // Page는 무조건 있어야
  if (!types.has('page') && nodes.length > 0) {
    checks.push(issue('warning', 'no_page',
      '페이지(화면) 건물이 없습니다. 사용자가 보는 화면이 정의되지 않았어요',
      'No page buildings. User-facing screens are not defined',
      '🏢 오피스빌딩(페이지)이 없는 도시입니다',
      '🏢 City has no office buildings (pages)'));
  }

  // DB 없으면 경고
  if (!types.has('db') && nodes.length >= 5) {
    checks.push(issue('warning', 'no_db',
      '데이터베이스 건물이 없습니다. 데이터를 어디에 저장하나요?',
      'No database building. Where is data stored?',
      '🏦 은행(DB)이 없는 도시입니다. 데이터를 보관할 곳이 필요해요',
      '🏦 City has no bank (DB). Need a place to store data'));
  }

  // API 없으면
  if (!types.has('api') && nodes.length >= 5) {
    checks.push(issue('info', 'no_api',
      'API 엔드포인트가 정의되지 않았습니다',
      'No API endpoints defined',
      '📡 통신타워(API)가 없습니다. 클라이언트-서버 통신 방법을 정해주세요',
      '📡 No communication tower (API). Define client-server communication'));
  }

  // Auth 없으면 (항목 많을 때만)
  if (!types.has('auth') && nodes.length >= 8) {
    checks.push(issue('warning', 'no_auth',
      '인증/권한 시스템이 정의되지 않았습니다',
      'No auth system defined',
      '🏛️ 시청(인증)이 없습니다. 누가 도시에 들어올 수 있는지 정해야 해요',
      '🏛️ No city hall (auth). Need to define who can enter'));
  }

  return checks;
}

function checkConnections(nodes, roads, nodeMap) {
  const checks = [];

  if (nodes.length >= 3 && roads.length === 0) {
    checks.push(issue('error', 'no_roads',
      '도로가 하나도 없습니다. 건물 간 연결이 정의되지 않았어요',
      'No roads. No connections between buildings defined',
      '🛤️ 도로 없는 도시! 건물들이 서로 고립되어 있습니다',
      '🛤️ City with no roads! Buildings are completely isolated'));
    return checks;
  }

  // Orphan nodes (no roads connected)
  const connectedIds = new Set();
  roads.forEach(r => { connectedIds.add(r.from); connectedIds.add(r.to); });

  const orphans = nodes.filter(n => !connectedIds.has(n.id) && n.depth <= 2);
  if (orphans.length > 0 && roads.length > 0) {
    const names = orphans.slice(0, 5).map(n => n.name).join(', ');
    checks.push(issue('warning', 'orphan_nodes',
      `연결되지 않은 항목 ${orphans.length}개: ${names}`,
      `${orphans.length} disconnected items: ${names}`,
      `🏚️ 도로가 연결되지 않은 건물들이 있습니다: ${names}`,
      `🏚️ Buildings with no roads: ${names}`));
  }

  // Duplicate roads
  const roadPairs = new Set();
  roads.forEach(r => {
    const key = [r.from, r.to].sort().join('|');
    if (roadPairs.has(key)) {
      const from = nodeMap[r.from], to = nodeMap[r.to];
      checks.push(issue('warning', 'duplicate_road',
        `중복 도로: ${from?.name || '?'} ↔ ${to?.name || '?'}`,
        `Duplicate road: ${from?.name || '?'} ↔ ${to?.name || '?'}`,
        `🔁 같은 구간에 도로가 두 개 이상 깔려있습니다`,
        `🔁 Multiple roads on the same segment`));
    }
    roadPairs.add(key);
  });

  // Self-referencing roads
  roads.forEach(r => {
    if (r.from === r.to) {
      const node = nodeMap[r.from];
      checks.push(issue('error', 'self_road',
        `자기 자신을 참조하는 도로: ${node?.name || '?'}`,
        `Self-referencing road: ${node?.name || '?'}`,
        `🔄 건물이 자기 자신에게 도로를 연결했습니다`,
        `🔄 Building has a road to itself`));
    }
  });

  return checks;
}

function checkDataFlow(nodes, roads, nodeMap) {
  const checks = [];

  // Check if pages have any outgoing connections
  const pages = nodes.filter(n => (n.buildingType || 'page') === 'page');
  const pageIds = new Set(pages.map(p => p.id));

  pages.forEach(page => {
    const hasOutgoing = roads.some(r => r.from === page.id);
    const hasIncoming = roads.some(r => r.to === page.id);
    if (!hasOutgoing && !hasIncoming && roads.length > 0) {
      checks.push(issue('info', 'isolated_page',
        `"${page.name}" 페이지가 어떤 데이터와도 연결되지 않았습니다`,
        `"${page.name}" page has no data connections`,
        `🏢 "${page.name}" 빌딩에 도로가 없어서 데이터가 들어오지 않습니다`,
        `🏢 "${page.name}" building has no roads — no data flows`));
    }
  });

  // Check if DB has incoming roads (something writes to it)
  const dbs = nodes.filter(n => n.buildingType === 'db');
  dbs.forEach(db => {
    const hasIncoming = roads.some(r => r.to === db.id);
    if (!hasIncoming && roads.length > 0) {
      checks.push(issue('warning', 'db_no_write',
        `"${db.name}" DB에 데이터를 쓰는 연결이 없습니다`,
        `"${db.name}" DB has no write connections`,
        `🏦 "${db.name}" 은행에 입금하는 도로가 없습니다`,
        `🏦 "${db.name}" bank has no deposit roads`));
    }
  });

  return checks;
}

function checkSecurity(nodes, roads, nodeMap) {
  const checks = [];

  const authNodes = nodes.filter(n => n.buildingType === 'auth');
  const externalNodes = nodes.filter(n => n.buildingType === 'external');
  const paymentNodes = nodes.filter(n => n.buildingType === 'payment');

  // External without auth
  externalNodes.forEach(ext => {
    const hasAuthRoad = roads.some(r =>
      (r.from === ext.id || r.to === ext.id) &&
      (nodeMap[r.from]?.buildingType === 'auth' || nodeMap[r.to]?.buildingType === 'auth')
    );
    if (!hasAuthRoad && authNodes.length > 0) {
      checks.push(issue('warning', 'external_no_auth',
        `"${ext.name}" 외부 연동에 인증 경로가 없습니다`,
        `"${ext.name}" external integration has no auth path`,
        `🌉 "${ext.name}" 항구에 시청(인증)의 검문이 없습니다`,
        `🌉 "${ext.name}" port has no city hall (auth) checkpoint`));
    }
  });

  // Payment without auth
  paymentNodes.forEach(pay => {
    const hasAuthRoad = roads.some(r =>
      (r.from === pay.id || r.to === pay.id) &&
      (nodeMap[r.from]?.buildingType === 'auth' || nodeMap[r.to]?.buildingType === 'auth')
    );
    if (!hasAuthRoad && authNodes.length > 0) {
      checks.push(issue('info', 'payment_no_auth',
        `"${pay.name}" 결제에 인증 경로가 연결되지 않았습니다`,
        `"${pay.name}" payment has no auth connection`,
        `🏪 "${pay.name}" 상점에 신원 확인 없이 결제가 가능합니다`,
        `🏪 "${pay.name}" shop allows payment without ID check`));
    }
  });

  return checks;
}

function checkInfra(nodes, roads) {
  const checks = [];
  const types = new Set(nodes.map(n => n.buildingType || 'page'));

  // No config/env
  if (nodes.length >= 10 && !types.has('config')) {
    checks.push(issue('info', 'no_config',
      '환경 설정(config) 항목이 없습니다',
      'No config/environment items',
      '⚙️ 발전소(설정)가 없습니다. 환경변수나 설정을 어디서 관리하나요?',
      '⚙️ No power plant (config). Where are environment vars managed?'));
  }

  // Has API but no error handling
  if (types.has('api') && !roads.some(r => r.vehicle === 'ambulance')) {
    checks.push(issue('info', 'no_error_handling',
      '에러 핸들링/폴백 연결이 없습니다',
      'No error handling/fallback connections',
      '🚑 구급차(에러 처리)가 운행되지 않습니다. API 오류 시 어떻게 하나요?',
      '🚑 No ambulances (error handling) running. What happens on API failure?'));
  }

  // All roads use same vehicle type
  const vehicleTypes = new Set(roads.map(r => r.vehicle || 'car'));
  if (roads.length >= 5 && vehicleTypes.size === 1) {
    checks.push(issue('info', 'single_vehicle',
      `모든 도로가 동일한 이동 수단(${VEHICLE_TYPES[roads[0]?.vehicle]?.label_ko || '승용차'})을 사용합니다`,
      `All roads use the same vehicle type`,
      '🚗 모든 도로에 같은 차량만 다닙니다. 실시간 통신(드론)이나 배치(트럭) 등 다양한 방식을 고려해보세요',
      '🚗 Same vehicle on all roads. Consider drones (realtime) or trucks (batch)'));
  }

  return checks;
}

// ========== AI ANALYSIS (architecture suggestions) ==========

export async function runAIInspection(project, localResult, lang = 'ko') {
  const nodeMap = {};
  const nodes = [];
  for (const col of project.columns || []) {
    walkTree(project.structure[col.key] || [], (node) => {
      nodes.push(node);
      nodeMap[node.id] = node;
    });
  }

  const structureSummary = buildStructureSummary(project, nodes, nodeMap);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 'inspect',
      data: {
        structureSummary,
        localResults: JSON.stringify({
          score: localResult.score,
          errors: localResult.checks.filter(c => c.level === 'error').map(c => lang === 'ko' ? c.city_ko : c.city_en),
          warnings: localResult.checks.filter(c => c.level === 'warning').map(c => lang === 'ko' ? c.city_ko : c.city_en),
          nodeCount: localResult.nodeCount,
          roadCount: localResult.roadCount,
          buildingTypes: [...new Set(nodes.map(n => n.buildingType || 'page'))],
          vehicleTypes: [...new Set((project.roads || []).map(r => r.vehicle || 'car'))]
        }),
        lang
      }
    })
  });

  if (!response.ok) throw new Error(`Inspection failed: ${response.status}`);
  const result = await response.json();
  return result.parsed || { suggestions: result.text };
}

// ========== HELPERS ==========

function issue(level, code, desc_ko, desc_en, city_ko, city_en) {
  return { level, code, desc_ko, desc_en, city_ko, city_en };
}

function walkTree(nodes, callback, parentId = null, depth = 1) {
  for (const n of nodes) {
    callback(n, parentId, depth);
    if (n.children?.length) walkTree(n.children, callback, n.id, depth + 1);
  }
}

function generateLocalSummary(score, errors, warnings, infos, nodeCount, roadCount) {
  if (nodeCount === 0) return '프로젝트가 비어있습니다.';
  if (score >= 90) return '구조가 잘 갖춰져 있습니다!';
  if (score >= 70) return '대체로 양호하지만 몇 가지 개선점이 있습니다.';
  if (score >= 50) return '주요 구조 요소가 부족합니다.';
  return '기본 구조부터 다시 점검이 필요합니다.';
}

function buildStructureSummary(project, nodes, nodeMap) {
  const cols = project.columns || [];
  const roads = project.roads || [];
  const lines = [];

  lines.push(`Project: ${project.name || 'unnamed'}`);
  lines.push(`Districts: ${cols.map(c => c.label).join(', ')}`);
  lines.push(`Total: ${nodes.length} nodes, ${roads.length} roads`);
  lines.push('');

  // Type distribution
  const typeCounts = {};
  nodes.forEach(n => { const t = n.buildingType || 'page'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
  lines.push(`Building types: ${Object.entries(typeCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`);

  // Vehicle distribution
  const vCounts = {};
  roads.forEach(r => { const v = r.vehicle || 'car'; vCounts[v] = (vCounts[v] || 0) + 1; });
  lines.push(`Vehicle types: ${Object.entries(vCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`);

  // Structure tree (compact)
  lines.push('\nStructure:');
  cols.forEach(col => {
    lines.push(`[${col.label}]`);
    walkTree(project.structure[col.key] || [], (n, pid, d) => {
      const bt = n.buildingType || 'page';
      lines.push(`${'  '.repeat(d)}${bt}: ${n.name || '?'}`);
    });
  });

  // Roads
  lines.push('\nRoads:');
  roads.forEach(r => {
    const f = nodeMap[r.from], t = nodeMap[r.to];
    lines.push(`  ${f?.name || '?'} → ${t?.name || '?'} [${r.vehicle || 'car'}, ${r.dataType || 'content'}]`);
  });

  return lines.join('\n');
}
