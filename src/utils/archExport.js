// Architecture Specification Document Generator
// Supports section-by-section generation for progress UI

import { BUILDING_TYPES, VEHICLE_TYPES, ROAD_TYPES, DATA_TYPES } from '../constants/unitTypes.js';
import { ARCH_PATTERNS, ARCH_LAYERS } from '../constants/archPatterns.js';

// Section definitions with weights for progress calculation
const SECTIONS = [
  { id: 'header',     weight: 2,  label_ko: '헤더 생성',           label_en: 'Generating header' },
  { id: 'overview',   weight: 5,  label_ko: '프로젝트 개요',       label_en: 'Project overview' },
  { id: 'structure',  weight: 20, label_ko: '구역별 구조 분석',     label_en: 'Analyzing district structure' },
  { id: 'connections',weight: 20, label_ko: '연결 관계 매핑',       label_en: 'Mapping connections' },
  { id: 'pernode',    weight: 15, label_ko: '노드별 상세 연결',     label_en: 'Per-node connection detail' },
  { id: 'dataflow',   weight: 10, label_ko: '데이터 흐름 요약',     label_en: 'Data flow summary' },
  { id: 'inventory',  weight: 8,  label_ko: '컴포넌트 인벤토리',    label_en: 'Component inventory' },
  { id: 'integration',weight: 5,  label_ko: '연동 방식 분포',       label_en: 'Integration distribution' },
  { id: 'tree',       weight: 5,  label_ko: '계층 트리 구성',       label_en: 'Building hierarchy tree' },
  { id: 'depgraph',   weight: 5,  label_ko: '의존 관계 그래프',     label_en: 'Dependency graph' },
  { id: 'archinfo',   weight: 8,  label_ko: '아키텍처 패턴 정보',   label_en: 'Architecture pattern info' },
  { id: 'context',    weight: 5,  label_ko: 'AI 컨텍스트 정리',     label_en: 'AI context summary' },
];

// Generate document section by section, calling onProgress after each
// onProgress({ percent, sectionLabel, done, content })
export async function generateArchDoc(project, lang, onProgress) {
  if (!project) { onProgress?.({ percent: 100, sectionLabel: '', done: true, content: '' }); return ''; }

  const L = (ko, en) => lang === 'ko' ? ko : en;
  const cols = project.columns || [];
  const roads = project.roads || [];
  const nodeMap = buildNodeMap(project);
  const totalWeight = SECTIONS.reduce((s, sec) => s + sec.weight, 0);
  let doneWeight = 0;
  let content = '';

  for (const section of SECTIONS) {
    // Report start
    onProgress?.({
      percent: Math.round((doneWeight / totalWeight) * 100),
      sectionLabel: L(section.label_ko, section.label_en),
      done: false,
      content
    });

    // Small delay for visual progress
    await delay(80 + Math.random() * 120);

    // Generate section
    const sectionContent = generateSection(section.id, project, cols, roads, nodeMap, L, lang);
    content += sectionContent;
    doneWeight += section.weight;
  }

  // Done
  onProgress?.({ percent: 100, sectionLabel: L('완료', 'Complete'), done: true, content });
  return content;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Individual section generators
function generateSection(id, project, cols, roads, nodeMap, L, lang) {
  switch (id) {
    case 'header': return genHeader(project, L);
    case 'overview': return genOverview(project, cols, roads, L);
    case 'structure': return genStructure(project, cols, roads, nodeMap, L, lang);
    case 'connections': return genConnections(roads, nodeMap, L);
    case 'pernode': return genPerNode(roads, nodeMap, L);
    case 'dataflow': return genDataFlow(roads, nodeMap, L);
    case 'inventory': return genInventory(nodeMap, L);
    case 'integration': return genIntegration(roads, L);
    case 'tree': return genTree(project, cols, nodeMap, L);
    case 'depgraph': return genDepGraph(roads, nodeMap, L);
    case 'archinfo': return genArchInfo(nodeMap, L);
    case 'context': return genContext(L);
    default: return '';
  }
}

function genHeader(project, L) {
  return `# ${project.name || 'Untitled'} — ${L('아키텍처 명세서', 'Architecture Specification')}\n> ${L('자동 생성', 'Auto-generated')} | ${new Date().toLocaleDateString()} | sandroad\n\n`;
}

function genOverview(project, cols, roads, L) {
  const total = countAllItems(project);
  const names = cols.map(c => c.label).join(', ');
  let s = `## 1. ${L('프로젝트 개요', 'Project Overview')}\n\n`;
  s += `- **${L('프로젝트명', 'Project')}**: ${project.name || 'Untitled'}\n`;
  s += `- **${L('구역', 'Districts')}**: ${cols.length} (${names})\n`;
  s += `- **${L('총 항목', 'Total items')}**: ${total}\n`;
  s += `- **${L('연결', 'Connections')}**: ${roads.length}\n\n`;
  return s;
}

function genStructure(project, cols, roads, nodeMap, L, lang) {
  let s = `## 2. ${L('구역별 구조', 'District Structure')}\n\n`;
  cols.forEach((col, i) => {
    const items = project.structure[col.key] || [];
    s += `### ${L('구역', 'District')} ${i + 1}: ${col.label}\n\n`;
    if (items.length === 0) { s += `_(${L('항목 없음', 'No items')})_\n\n`; return; }
    s += renderTreeDetailed(items, 0, roads, nodeMap, L);
    s += '\n';
  });
  return s;
}

function genConnections(roads, nodeMap, L) {
  let s = `## 3. ${L('연결 관계', 'Connection Map')}\n\n`;
  if (roads.length === 0) { s += `_(${L('연결 없음', 'No connections')})_\n\n`; return s; }
  s += `| # | ${L('출발', 'From')} | ${L('도착', 'To')} | ${L('도로', 'Road')} | ${L('이동수단', 'Vehicle')} | ${L('데이터', 'Data')} |\n`;
  s += '|---|------|------|------|---------|--------|\n';
  roads.forEach((road, idx) => {
    const f = nodeMap[road.from], t = nodeMap[road.to];
    const rt = ROAD_TYPES[road.type] || ROAD_TYPES.main;
    const vt = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
    const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;
    s += `| ${idx+1} | ${btE(f?.buildingType)} ${f?.name||'?'} | ${btE(t?.buildingType)} ${t?.name||'?'} | ${L(rt.label_ko, rt.label_en)} | ${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)} |\n`;
  });
  s += '\n';
  return s;
}

function genPerNode(roads, nodeMap, L) {
  let s = `### 3-1. ${L('노드별 연결 상세', 'Per-Node Connection Detail')}\n\n`;
  const allIds = new Set([...roads.map(r => r.from), ...roads.map(r => r.to)]);
  for (const nid of allIds) {
    const node = nodeMap[nid]; if (!node) continue;
    const bt = BUILDING_TYPES[node.buildingType] || BUILDING_TYPES.page;
    const outgoing = roads.filter(r => r.from === nid);
    const incoming = roads.filter(r => r.to === nid);
    if (outgoing.length === 0 && incoming.length === 0) continue;
    s += `#### ${bt.emoji} ${node.name} (${L(bt.label_ko, bt.label_en)})\n\n`;
    if (outgoing.length > 0) {
      s += `**${L('보내는 연결', 'Outgoing')}** (${outgoing.length}):\n`;
      outgoing.forEach(r => {
        const tgt = nodeMap[r.to]; const vt = VEHICLE_TYPES[r.vehicle]||VEHICLE_TYPES.car; const dt = DATA_TYPES[r.dataType]||DATA_TYPES.content;
        s += `- → ${btE(tgt?.buildingType)} **${tgt?.name||'?'}** | ${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)}${r.label ? ` | "${r.label}"` : ''}\n`;
      });
      s += '\n';
    }
    if (incoming.length > 0) {
      s += `**${L('받는 연결', 'Incoming')}** (${incoming.length}):\n`;
      incoming.forEach(r => {
        const src = nodeMap[r.from]; const vt = VEHICLE_TYPES[r.vehicle]||VEHICLE_TYPES.car; const dt = DATA_TYPES[r.dataType]||DATA_TYPES.content;
        s += `- ← ${btE(src?.buildingType)} **${src?.name||'?'}** | ${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)}${r.label ? ` | "${r.label}"` : ''}\n`;
      });
      s += '\n';
    }
  }
  return s;
}

function genDataFlow(roads, nodeMap, L) {
  let s = `## 4. ${L('데이터 흐름 요약', 'Data Flow Summary')}\n\n`;
  const flows = {};
  roads.forEach(r => { const k = r.dataType||'content'; if (!flows[k]) flows[k]=[]; flows[k].push(r); });
  if (Object.keys(flows).length === 0) { s += `_(${L('없음', 'None')})_\n\n`; return s; }
  for (const [dk, drs] of Object.entries(flows)) {
    const dt = DATA_TYPES[dk]||DATA_TYPES.content;
    s += `### ${dt.emoji} ${L(dt.label_ko, dt.label_en)}\n\n`;
    drs.forEach(r => {
      const f = nodeMap[r.from], t = nodeMap[r.to]; const vt = VEHICLE_TYPES[r.vehicle]||VEHICLE_TYPES.car;
      s += `- ${btE(f?.buildingType)} ${f?.name||'?'} → ${btE(t?.buildingType)} ${t?.name||'?'} (${vt.emoji} ${L(vt.desc_ko, vt.desc_en)})\n`;
    });
    s += '\n';
  }
  return s;
}

function genInventory(nodeMap, L) {
  let s = `## 5. ${L('컴포넌트 인벤토리', 'Component Inventory')}\n\n`;
  const tc = {};
  for (const n of Object.values(nodeMap)) {
    const k = n.buildingType||'page';
    if (!tc[k]) tc[k] = { count: 0, items: [] };
    tc[k].count++; tc[k].items.push(n.name);
  }
  s += `| ${L('유형', 'Type')} | ${L('아이콘', 'Icon')} | ${L('개수', 'Count')} | ${L('항목', 'Items')} |\n`;
  s += '|------|------|------|------|\n';
  for (const [k, d] of Object.entries(tc)) {
    const bt = BUILDING_TYPES[k]||BUILDING_TYPES.page;
    s += `| ${L(bt.label_ko, bt.label_en)} | ${bt.emoji} | ${d.count} | ${d.items.join(', ')} |\n`;
  }
  s += '\n';
  return s;
}

function genIntegration(roads, L) {
  let s = `## 6. ${L('연동 방식 분포', 'Integration Distribution')}\n\n`;
  const vc = {};
  roads.forEach(r => { const k = r.vehicle||'car'; vc[k] = (vc[k]||0)+1; });
  if (Object.keys(vc).length === 0) { s += `_(${L('없음', 'None')})_\n\n`; return s; }
  s += `| ${L('방식', 'Method')} | ${L('아이콘', 'Icon')} | ${L('설명', 'Desc')} | ${L('횟수', 'Count')} |\n`;
  s += '|------|------|------|------|\n';
  for (const [k, c] of Object.entries(vc)) {
    const vt = VEHICLE_TYPES[k]||VEHICLE_TYPES.car;
    s += `| ${L(vt.label_ko, vt.label_en)} | ${vt.emoji} | ${L(vt.desc_ko, vt.desc_en)} | ${c} |\n`;
  }
  s += '\n';
  return s;
}

function genTree(project, cols, nodeMap, L) {
  let s = `## 7. ${L('전체 계층 트리', 'Full Hierarchy Tree')}\n\n\`\`\`\n`;
  cols.forEach(col => {
    s += `[${col.label}]\n`;
    s += treeCompact(project.structure[col.key]||[], 1);
    s += '\n';
  });
  s += '```\n\n';
  return s;
}

function genDepGraph(roads, nodeMap, L) {
  let s = `## 8. ${L('의존 관계 그래프', 'Dependency Graph')}\n\n\`\`\`\n`;
  roads.forEach(r => {
    const f = nodeMap[r.from], t = nodeMap[r.to];
    const vt = VEHICLE_TYPES[r.vehicle]||VEHICLE_TYPES.car;
    const dt = DATA_TYPES[r.dataType]||DATA_TYPES.content;
    const arrow = r.type === 'highway' ? '===>' : r.type === 'main' ? '--->' : r.type === 'tunnel' ? '···>' : '-->';
    s += `  ${f?.name||'?'} ${arrow} ${t?.name||'?'}  [${vt.emoji}${dt.emoji}]\n`;
  });
  s += '```\n\n';
  return s;
}

function genArchInfo(nodeMap, L) {
  let s = `## 9. ${L('아키텍처 패턴 정보', 'Architecture Pattern Info')}\n\n`;

  // Collect patterns used
  const patternsUsed = {};
  const layersUsed = {};
  for (const node of Object.values(nodeMap)) {
    if (node.archPattern) {
      if (!patternsUsed[node.archPattern]) patternsUsed[node.archPattern] = [];
      patternsUsed[node.archPattern].push(node.name);
    }
    if (node.archLayer) {
      if (!layersUsed[node.archLayer]) layersUsed[node.archLayer] = [];
      layersUsed[node.archLayer].push(node.name);
    }
  }

  if (Object.keys(patternsUsed).length === 0 && Object.keys(layersUsed).length === 0) {
    s += `_(${L('아키텍처 패턴 미지정. /mvc, /redux 등 슬래시 명령어로 지정 가능', 'No patterns set. Use /mvc, /redux etc. slash commands')})_\n\n`;
    return s;
  }

  if (Object.keys(patternsUsed).length > 0) {
    s += `### ${L('적용된 패턴', 'Applied Patterns')}\n\n`;
    for (const [pk, nodes] of Object.entries(patternsUsed)) {
      const info = ARCH_PATTERNS[pk];
      if (!info) continue;
      s += `**🏗️ ${info.label}** — ${L(info.desc_ko, info.desc_en)}\n`;
      s += `${L('적용 대상', 'Applied to')}: ${nodes.join(', ')}\n`;
      s += `${L('계층 구조', 'Layers')}: ${info.layers.join(' → ')}\n\n`;
    }
  }

  if (Object.keys(layersUsed).length > 0) {
    s += `### ${L('아키텍처 레이어 매핑', 'Architecture Layer Mapping')}\n\n`;
    s += `| ${L('레이어', 'Layer')} | ${L('역할', 'Role')} | ${L('적용 노드', 'Nodes')} |\n`;
    s += '|--------|------|-------|\n';
    for (const [lk, nodes] of Object.entries(layersUsed)) {
      const info = ARCH_LAYERS[lk];
      if (!info) continue;
      s += `| 📐 ${info.label} | ${L(info.desc_ko, info.desc_en)} | ${nodes.join(', ')} |\n`;
    }
    s += '\n';
  }

  return s;
}

function genContext(L) {
  let s = `## 10. ${L('AI 개발 지시용 컨텍스트', 'AI Development Context')}\n\n`;
  s += L(
    `이 문서를 AI에게 제공하면 다음을 파악할 수 있습니다:\n\n- **화면 구조**: 페이지/컴포넌트 계층과 역할\n- **데이터 흐름**: 어디서 어디로 어떤 데이터가 이동하는지\n- **연동 방식**: REST, WebSocket, 배치 등 각 연결의 기술 스택\n- **인프라 구성**: DB, 캐시, 큐, 스토리지 등의 배치\n- **외부 연동**: 서드파티 API 연결 포인트\n- **보안 경로**: 인증/권한 체크 흐름\n`,
    `Providing this document to AI enables:\n\n- **Screen structure**: Page/component hierarchy and roles\n- **Data flow**: What data moves where\n- **Integration methods**: REST, WebSocket, batch tech stack per connection\n- **Infrastructure**: DB, cache, queue, storage placement\n- **External integrations**: Third-party API points\n- **Security paths**: Auth/permission flows\n`
  );
  s += '\n---\n_sandroad auto-generated_\n';
  return s;
}

// ===== Helpers =====
function renderTreeDetailed(nodes, depth, roads, nodeMap, L) {
  let s = '';
  const ind = '  '.repeat(depth);
  nodes.forEach(node => {
    const bt = BUILDING_TYPES[node.buildingType]||BUILDING_TYPES.page;
    const connOut = roads.filter(r => r.from === node.id).length;
    const connIn = roads.filter(r => r.to === node.id).length;
    const connStr = (connOut+connIn) > 0 ? ` (${L('연결','conn')}: ↑${connIn} ↓${connOut})` : '';
    s += `${ind}- [${bt.emoji} ${L(bt.label_ko, bt.label_en)}] **${node.name||L('(이름없음)','(unnamed)')}**${connStr}\n`;
    if (node.description) s += `${ind}  ${L('설명','Desc')}: ${node.description}\n`;
    const tags = node.tags||{};
    const tagNames = Object.keys(tags).filter(k => tags[k]);
    if (tagNames.length > 0) s += `${ind}  ${L('태그','Tags')}: ${tagNames.join(', ')}\n`;
    if (node.archPattern) { const ap = ARCH_PATTERNS[node.archPattern]; if (ap) s += `${ind}  🏗️ ${L('패턴','Pattern')}: ${ap.label} (${L(ap.desc_ko, ap.desc_en)})\n`; }
    if (node.archLayer) { const al = ARCH_LAYERS[node.archLayer]; if (al) s += `${ind}  📐 ${L('레이어','Layer')}: ${al.label} (${L(al.desc_ko, al.desc_en)})\n`; }
    const outR = roads.filter(r => r.from === node.id);
    outR.forEach(r => {
      const tgt = nodeMap[r.to]; const vt = VEHICLE_TYPES[r.vehicle]||VEHICLE_TYPES.car; const dt = DATA_TYPES[r.dataType]||DATA_TYPES.content;
      s += `${ind}  → ${btE(tgt?.buildingType)} ${tgt?.name||'?'} [${vt.emoji} ${L(vt.desc_ko, vt.desc_en)} | ${dt.emoji} ${L(dt.label_ko, dt.label_en)}]\n`;
    });
    if (node.children?.length) s += renderTreeDetailed(node.children, depth+1, roads, nodeMap, L);
  });
  return s;
}

function treeCompact(nodes, depth) {
  let s = '';
  nodes.forEach(n => {
    const bt = BUILDING_TYPES[n.buildingType]||BUILDING_TYPES.page;
    const layerTag = n.archLayer ? ` [📐${ARCH_LAYERS[n.archLayer]?.label||''}]` : '';
    s += `${'  '.repeat(depth)}${bt.emoji} ${n.name||'?'}${layerTag}\n`;
    if (n.children?.length) s += treeCompact(n.children, depth+1);
  });
  return s;
}

function buildNodeMap(project) {
  const m = {};
  for (const col of project.columns||[]) walk(project.structure[col.key]||[], n => { m[n.id] = n; });
  return m;
}
function walk(nodes, cb) { for (const n of nodes) { cb(n); if (n.children?.length) walk(n.children, cb); } }
function countAllItems(project) { let c = 0; for (const col of project.columns||[]) walk(project.structure[col.key]||[], () => c++); return c; }
function btE(bt) { return (BUILDING_TYPES[bt]||BUILDING_TYPES.page).emoji; }

export function downloadContent(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
