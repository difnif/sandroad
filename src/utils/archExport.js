// Architecture Specification Document Generator
// Converts entire project (tree + city view + roads) into
// a structured document for AI code development instructions.

import { BUILDING_TYPES, VEHICLE_TYPES, ROAD_TYPES, DATA_TYPES } from '../constants/unitTypes.js';

export function exportArchitectureDoc(project, lang = 'ko') {
  if (!project) return '';
  const L = (ko, en) => lang === 'ko' ? ko : en;
  const cols = project.columns || [];
  const roads = project.roads || [];
  const lines = [];

  // ============ HEADER ============
  lines.push(`# ${project.name || 'Untitled'} — ${L('아키텍처 명세서', 'Architecture Specification')}`);
  lines.push(`> ${L('자동 생성됨', 'Auto-generated')} | ${new Date().toLocaleDateString()} | sandroad`);
  lines.push('');

  // ============ OVERVIEW ============
  lines.push(`## 1. ${L('프로젝트 개요', 'Project Overview')}`);
  lines.push('');
  const totalItems = countAllItems(project);
  const totalRoads = roads.length;
  const districtNames = cols.map(c => c.label).join(', ');
  lines.push(`- **${L('프로젝트명', 'Project')}**: ${project.name || 'Untitled'}`);
  lines.push(`- **${L('구역 수', 'Districts')}**: ${cols.length} (${districtNames})`);
  lines.push(`- **${L('총 항목 수', 'Total items')}**: ${totalItems}`);
  lines.push(`- **${L('연결(도로) 수', 'Connections')}**: ${totalRoads}`);
  lines.push('');

  // ============ DISTRICT STRUCTURE ============
  lines.push(`## 2. ${L('구역별 구조', 'District Structure')}`);
  lines.push('');

  cols.forEach((col, colIdx) => {
    const items = project.structure[col.key] || [];
    lines.push(`### ${L('구역', 'District')} ${colIdx + 1}: ${col.label}`);
    lines.push('');
    if (items.length === 0) {
      lines.push(`_(${L('항목 없음', 'No items')})_`);
    } else {
      renderTreeDetailed(items, lines, 0, lang, roads, project);
    }
    lines.push('');
  });

  // ============ CONNECTION MAP ============
  lines.push(`## 3. ${L('연결 관계', 'Connection Map')}`);
  lines.push('');

  if (roads.length === 0) {
    lines.push(`_(${L('연결 없음', 'No connections')})_`);
  } else {
    // Group roads by source
    const grouped = {};
    roads.forEach(road => {
      if (!grouped[road.from]) grouped[road.from] = [];
      grouped[road.from].push(road);
    });

    // Also collect reverse for bidirectional view
    const reverseGrouped = {};
    roads.forEach(road => {
      if (!reverseGrouped[road.to]) reverseGrouped[road.to] = [];
      reverseGrouped[road.to].push(road);
    });

    const nodeMap = buildNodeMap(project);

    lines.push(`| # | ${L('출발', 'From')} | ${L('도착', 'To')} | ${L('도로', 'Road')} | ${L('이동수단', 'Vehicle')} | ${L('데이터', 'Data')} | ${L('설명', 'Description')} |`);
    lines.push('|---|------|------|------|---------|--------|------|');

    roads.forEach((road, idx) => {
      const fromNode = nodeMap[road.from];
      const toNode = nodeMap[road.to];
      const rt = ROAD_TYPES[road.type] || ROAD_TYPES.main;
      const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
      const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;

      const fromName = fromNode ? `${getBtEmoji(fromNode.buildingType)} ${fromNode.name}` : road.from;
      const toName = toNode ? `${getBtEmoji(toNode.buildingType)} ${toNode.name}` : road.to;

      lines.push(`| ${idx + 1} | ${fromName} | ${toName} | ${vt.emoji} ${L(rt.label_ko, rt.label_en)} | ${vt.emoji} ${L(vt.label_ko, vt.label_en)} (${L(vt.desc_ko, vt.desc_en)}) | ${dt.emoji} ${L(dt.label_ko, dt.label_en)} | ${road.label || ''} |`);
    });
    lines.push('');

    // ============ PER-NODE CONNECTION DETAIL ============
    lines.push(`### 3-1. ${L('노드별 연결 상세', 'Per-Node Connection Detail')}`);
    lines.push('');

    const allNodeIds = new Set([...roads.map(r => r.from), ...roads.map(r => r.to)]);
    for (const nodeId of allNodeIds) {
      const node = nodeMap[nodeId];
      if (!node) continue;
      const bt = BUILDING_TYPES[node.buildingType] || BUILDING_TYPES.page;

      const outgoing = grouped[nodeId] || [];
      const incoming = reverseGrouped[nodeId] || [];

      if (outgoing.length === 0 && incoming.length === 0) continue;

      lines.push(`#### ${bt.emoji} ${node.name} (${L(bt.label_ko, bt.label_en)})`);
      lines.push('');

      if (outgoing.length > 0) {
        lines.push(`**${L('보내는 연결', 'Outgoing')}** (${outgoing.length}):`);
        outgoing.forEach(road => {
          const target = nodeMap[road.to];
          const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
          const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;
          const targetBt = getBtEmoji(target?.buildingType);
          lines.push(`- → ${targetBt} **${target?.name || '?'}** | ${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)}${road.label ? ` | "${road.label}"` : ''}`);
        });
        lines.push('');
      }

      if (incoming.length > 0) {
        lines.push(`**${L('받는 연결', 'Incoming')}** (${incoming.length}):`);
        incoming.forEach(road => {
          const source = nodeMap[road.from];
          const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
          const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;
          const sourceBt = getBtEmoji(source?.buildingType);
          lines.push(`- ← ${sourceBt} **${source?.name || '?'}** | ${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)}${road.label ? ` | "${road.label}"` : ''}`);
        });
        lines.push('');
      }
    }
  }

  // ============ DATA FLOW SUMMARY ============
  lines.push(`## 4. ${L('데이터 흐름 요약', 'Data Flow Summary')}`);
  lines.push('');

  const dataFlows = {};
  roads.forEach(road => {
    const dt = road.dataType || 'content';
    if (!dataFlows[dt]) dataFlows[dt] = [];
    dataFlows[dt].push(road);
  });

  if (Object.keys(dataFlows).length === 0) {
    lines.push(`_(${L('데이터 흐름 없음', 'No data flows')})_`);
  } else {
    const nodeMap = buildNodeMap(project);
    for (const [dtKey, dtRoads] of Object.entries(dataFlows)) {
      const dt = DATA_TYPES[dtKey] || DATA_TYPES.content;
      lines.push(`### ${dt.emoji} ${L(dt.label_ko, dt.label_en)}`);
      lines.push('');
      dtRoads.forEach(road => {
        const from = nodeMap[road.from];
        const to = nodeMap[road.to];
        const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
        lines.push(`- ${getBtEmoji(from?.buildingType)} ${from?.name || '?'} → ${getBtEmoji(to?.buildingType)} ${to?.name || '?'} (${vt.emoji} ${L(vt.desc_ko, vt.desc_en)})`);
      });
      lines.push('');
    }
  }

  // ============ COMPONENT INVENTORY ============
  lines.push(`## 5. ${L('컴포넌트 인벤토리', 'Component Inventory')}`);
  lines.push('');

  const typeCount = {};
  const nodeMap = buildNodeMap(project);
  for (const node of Object.values(nodeMap)) {
    const bt = node.buildingType || 'page';
    if (!typeCount[bt]) typeCount[bt] = { count: 0, items: [] };
    typeCount[bt].count++;
    typeCount[bt].items.push(node.name);
  }

  lines.push(`| ${L('유형', 'Type')} | ${L('아이콘', 'Icon')} | ${L('개수', 'Count')} | ${L('항목', 'Items')} |`);
  lines.push('|------|------|------|------|');

  for (const [btKey, data] of Object.entries(typeCount)) {
    const bt = BUILDING_TYPES[btKey] || BUILDING_TYPES.page;
    lines.push(`| ${L(bt.label_ko, bt.label_en)} | ${bt.emoji} | ${data.count} | ${data.items.join(', ')} |`);
  }
  lines.push('');

  // ============ INTEGRATION MAP ============
  lines.push(`## 6. ${L('연동 방식 분포', 'Integration Method Distribution')}`);
  lines.push('');

  const vehicleCount = {};
  roads.forEach(road => {
    const v = road.vehicle || 'car';
    if (!vehicleCount[v]) vehicleCount[v] = 0;
    vehicleCount[v]++;
  });

  if (Object.keys(vehicleCount).length === 0) {
    lines.push(`_(${L('연동 없음', 'No integrations')})_`);
  } else {
    lines.push(`| ${L('연동 방식', 'Method')} | ${L('아이콘', 'Icon')} | ${L('설명', 'Description')} | ${L('사용 횟수', 'Count')} |`);
    lines.push('|---------|------|------|------|');
    for (const [vKey, count] of Object.entries(vehicleCount)) {
      const vt = VEHICLE_TYPES[vKey] || VEHICLE_TYPES.car;
      lines.push(`| ${L(vt.label_ko, vt.label_en)} | ${vt.emoji} | ${L(vt.desc_ko, vt.desc_en)} | ${count} |`);
    }
    lines.push('');
  }

  // ============ HIERARCHY TREE (COMPACT) ============
  lines.push(`## 7. ${L('전체 계층 트리', 'Full Hierarchy Tree')}`);
  lines.push('');
  lines.push('```');
  cols.forEach(col => {
    const items = project.structure[col.key] || [];
    lines.push(`[${col.label}]`);
    renderTreeCompact(items, lines, 1, nodeMap);
    lines.push('');
  });
  lines.push('```');
  lines.push('');

  // ============ DEPENDENCY GRAPH (TEXT) ============
  lines.push(`## 8. ${L('의존 관계 그래프 (텍스트)', 'Dependency Graph (Text)')}`);
  lines.push('');
  lines.push('```');
  roads.forEach(road => {
    const from = nodeMap[road.from];
    const to = nodeMap[road.to];
    const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
    const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;
    const arrow = road.type === 'highway' ? '===>' : road.type === 'main' ? '--->' : road.type === 'tunnel' ? '···>' : '-->';
    lines.push(`  ${from?.name || '?'} ${arrow} ${to?.name || '?'}  [${vt.emoji} ${dt.emoji}]`);
  });
  lines.push('```');
  lines.push('');

  // ============ AI INSTRUCTION CONTEXT ============
  lines.push(`## 9. ${L('AI 개발 지시용 컨텍스트', 'AI Development Context')}`);
  lines.push('');
  lines.push(L(
    '이 문서를 AI에게 제공하면 다음을 파악할 수 있습니다:',
    'Providing this document to AI enables understanding of:'
  ));
  lines.push('');
  lines.push(L(
    `- **화면 구조**: 어떤 페이지/컴포넌트가 있고 어떤 계층인지
- **데이터 흐름**: 어디서 어디로 어떤 데이터가 이동하는지
- **연동 방식**: REST, WebSocket, 배치, 수동 등 각 연결의 기술 스택
- **인프라 구성**: DB, 캐시, 큐, 스토리지 등의 배치
- **외부 연동**: 서드파티 API 연결 포인트
- **보안 경로**: 인증/권한 체크 흐름`,
    `- **Screen structure**: Pages, components, and their hierarchy
- **Data flow**: What data moves where and how
- **Integration methods**: REST, WebSocket, batch, manual for each connection
- **Infrastructure**: DB, cache, queue, storage placement
- **External integrations**: Third-party API connection points
- **Security paths**: Auth/permission check flows`
  ));
  lines.push('');
  lines.push('---');
  lines.push(`_${L('이 문서는 sandroad에서 자동 생성되었습니다.', 'This document was auto-generated by sandroad.')}_`);

  return lines.join('\n');
}

// ===== Helpers =====

function renderTreeDetailed(nodes, lines, depth, lang, roads, project) {
  const indent = '  '.repeat(depth);
  const nodeMap = buildNodeMap(project);
  const L = (ko, en) => lang === 'ko' ? ko : en;

  nodes.forEach(node => {
    const bt = BUILDING_TYPES[node.buildingType] || BUILDING_TYPES.page;
    const hasChildren = node.children && node.children.length > 0;
    const typeLabel = `[${bt.emoji} ${L(bt.label_ko, bt.label_en)}]`;

    // Count connections for this node
    const connOut = roads.filter(r => r.from === node.id).length;
    const connIn = roads.filter(r => r.to === node.id).length;
    const connStr = (connOut + connIn) > 0
      ? ` (${L('연결', 'conn')}: ↑${connIn} ↓${connOut})`
      : '';

    lines.push(`${indent}- ${typeLabel} **${node.name || L('(이름없음)', '(unnamed)')}**${connStr}`);

    // Tags
    const tags = node.tags || {};
    const tagNames = Object.keys(tags).filter(k => tags[k]);
    if (tagNames.length > 0) {
      lines.push(`${indent}  ${L('태그', 'Tags')}: ${tagNames.join(', ')}`);
    }

    // Description
    if (node.description) {
      lines.push(`${indent}  ${L('설명', 'Desc')}: ${node.description}`);
    }

    // Direct connections from this node
    const outRoads = roads.filter(r => r.from === node.id);
    const inRoads = roads.filter(r => r.to === node.id);

    if (outRoads.length > 0) {
      outRoads.forEach(road => {
        const target = nodeMap[road.to];
        const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
        const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;
        lines.push(`${indent}  → ${getBtEmoji(target?.buildingType)} ${target?.name || '?'} [${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)}]`);
      });
    }

    if (hasChildren) {
      renderTreeDetailed(node.children, lines, depth + 1, lang, roads, project);
    }
  });
}

function renderTreeCompact(nodes, lines, depth, nodeMap) {
  const indent = '  '.repeat(depth);
  nodes.forEach(node => {
    const bt = BUILDING_TYPES[node.buildingType] || BUILDING_TYPES.page;
    lines.push(`${indent}${bt.emoji} ${node.name || '?'}`);
    if (node.children?.length) {
      renderTreeCompact(node.children, lines, depth + 1, nodeMap);
    }
  });
}

function buildNodeMap(project) {
  const map = {};
  for (const col of project.columns || []) {
    walkTree(project.structure[col.key] || [], (node) => {
      map[node.id] = node;
    });
  }
  return map;
}

function walkTree(nodes, callback) {
  for (const n of nodes) {
    callback(n);
    if (n.children?.length) walkTree(n.children, callback);
  }
}

function countAllItems(project) {
  let count = 0;
  for (const col of project.columns || []) {
    walkTree(project.structure[col.key] || [], () => count++);
  }
  return count;
}

function getBtEmoji(buildingType) {
  return (BUILDING_TYPES[buildingType] || BUILDING_TYPES.page).emoji;
}

export function downloadArchDoc(project, lang = 'ko') {
  const content = exportArchitectureDoc(project, lang);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project?.name || 'sandroad'}_architecture.md`;
  a.click();
  URL.revokeObjectURL(url);
}
