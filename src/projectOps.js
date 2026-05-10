// Project Operations — copy, sub-districts, infra generation
import { genNodeId } from './idGen.js';

// ========== CITY COPY (duplicate entire project) ==========

export function duplicateProject(project, newName) {
  const idMap = {}; // old id → new id

  const newColumns = project.columns.map(col => {
    const newKey = `col_${genNodeId().slice(0, 6)}`;
    idMap[col.key] = newKey;
    return { ...col, key: newKey };
  });

  const newStructure = {};
  for (const col of project.columns) {
    const newKey = idMap[col.key];
    newStructure[newKey] = deepCloneTree(project.structure[col.key] || [], idMap);
  }

  const newRoads = (project.roads || []).map(r => ({
    ...r,
    id: genNodeId(),
    from: idMap[r.from] || r.from,
    to: idMap[r.to] || r.to,
  }));

  return {
    name: newName || `${project.name} (사본)`,
    columns: newColumns,
    structure: newStructure,
    roads: newRoads,
    assets: project.assets ? JSON.parse(JSON.stringify(project.assets)) : {},
    createdAt: Date.now(),
  };
}

// ========== DISTRICT COPY (duplicate one column) ==========

export function duplicateDistrict(project, colKey) {
  const col = project.columns.find(c => c.key === colKey);
  if (!col) return null;

  const idMap = {};
  const newKey = `col_${genNodeId().slice(0, 6)}`;
  const newItems = deepCloneTree(project.structure[colKey] || [], idMap);

  const newCol = {
    ...col,
    key: newKey,
    label: `${col.label} (사본)`,
  };

  // Copy roads within this district
  const districtNodeIds = new Set(Object.keys(idMap));
  const newRoads = (project.roads || [])
    .filter(r => districtNodeIds.has(r.from) || districtNodeIds.has(r.to))
    .map(r => ({
      ...r,
      id: genNodeId(),
      from: idMap[r.from] || r.from,
      to: idMap[r.to] || r.to,
    }));

  return {
    column: newCol,
    structure: newItems,
    roads: newRoads,
  };
}

// ========== SUB-DISTRICT MANAGEMENT ==========

export function toggleSubDistrict(columns, colKey) {
  return columns.map(c =>
    c.key === colKey ? { ...c, isSubDistrict: !c.isSubDistrict } : c
  );
}

export function getMainDistricts(columns) {
  return columns.filter(c => !c.isSubDistrict);
}

export function getSubDistricts(columns, parentKey) {
  // Sub-districts are columns marked as sub and positioned after their parent
  return columns.filter(c => c.isSubDistrict && c.parentDistrict === parentKey);
}

export function setParentDistrict(columns, subKey, parentKey) {
  return columns.map(c =>
    c.key === subKey ? { ...c, isSubDistrict: true, parentDistrict: parentKey } : c
  );
}

// ========== INFRA DISTRICT GENERATION ==========

const BASIC_INFRA = [
  { name: '알림 설정', buildingType: 'noti', children: [
    { name: '푸시 알림', buildingType: 'noti' },
    { name: '이메일 알림', buildingType: 'noti' },
    { name: '알림 권한 요청', buildingType: 'noti' },
  ]},
  { name: '소리 및 진동', buildingType: 'config', children: [
    { name: '효과음 ON/OFF', buildingType: 'config' },
    { name: '진동 ON/OFF', buildingType: 'config' },
    { name: '음량 조절', buildingType: 'config' },
  ]},
  { name: '테마 설정', buildingType: 'config', children: [
    { name: '다크모드', buildingType: 'config' },
    { name: '라이트모드', buildingType: 'config' },
    { name: '시스템 설정 따르기', buildingType: 'config' },
  ]},
  { name: '언어 설정', buildingType: 'config', children: [
    { name: '한국어', buildingType: 'config' },
    { name: 'English', buildingType: 'config' },
    { name: '시스템 언어', buildingType: 'config' },
  ]},
  { name: '계정 관리', buildingType: 'auth', children: [
    { name: '비밀번호 변경', buildingType: 'auth' },
    { name: '로그아웃', buildingType: 'auth' },
    { name: '회원 탈퇴', buildingType: 'auth' },
  ]},
];

export function generateBasicInfra() {
  const items = BASIC_INFRA.map(item => createInfraNode(item));

  // Add memo building
  const memo = {
    id: genNodeId(),
    name: '📋 인프라 가이드',
    description: '기본 인프라 구역 안내\n\n' +
      '• 알림 설정: 푸시, 이메일 등 알림 채널 관리\n' +
      '• 소리/진동: 앱 내 사운드 및 햅틱 설정\n' +
      '• 테마: 다크/라이트 모드 전환\n' +
      '• 언어: 다국어 지원 설정\n' +
      '• 계정: 인증 및 회원 관리\n\n' +
      '필요에 따라 항목을 추가/삭제하세요.',
    buildingType: 'custom',
    children: [],
    tags: { guide: true },
    placed: true,
    createdAt: Date.now(),
  };

  return {
    column: {
      key: `col_infra_${genNodeId().slice(0, 4)}`,
      label: '⚙️ 인프라',
      color: 'stone',
      isSubDistrict: false,
    },
    structure: items,
    memo,
  };
}

// AI infra generation prompt builder
export function buildInfraAnalysisPrompt(project, lang) {
  const lines = [];
  lines.push('Current project structure:');
  for (const col of project.columns || []) {
    lines.push(`\n[District: ${col.label}]`);
    walkTree(project.structure[col.key] || [], (node, pid, depth) => {
      lines.push(`${'  '.repeat(depth)}${node.buildingType || 'page'}: ${node.name}`);
    });
  }
  lines.push(`\nRoads: ${(project.roads || []).length}`);
  return lines.join('\n');
}

export function parseAIInfraResult(result) {
  // result.parsed should be { districts: [{ label, items: [...] }], memo: "..." }
  const parsed = result.parsed || {};
  const districts = [];

  for (const dist of (parsed.districts || [parsed])) {
    const colKey = `col_infra_${genNodeId().slice(0, 4)}`;
    const items = (dist.items || []).map(item => createInfraNode(item));

    districts.push({
      column: {
        key: colKey,
        label: dist.label || '⚙️ 인프라',
        color: dist.color || 'stone',
        isSubDistrict: dist.isSubDistrict || false,
        parentDistrict: dist.parentDistrict || null,
      },
      structure: items,
    });
  }

  // Memo building
  const memo = {
    id: genNodeId(),
    name: '📋 AI 인프라 가이드',
    description: parsed.memo || parsed.guide || '자동 생성된 인프라 구역입니다. 불필요한 항목은 삭제하세요.',
    buildingType: 'custom',
    children: [],
    tags: { guide: true },
    placed: true,
    createdAt: Date.now(),
  };

  return { districts, memo };
}

// ========== HELPERS ==========

function createInfraNode(item) {
  return {
    id: genNodeId(),
    name: item.name,
    description: item.description || '',
    buildingType: item.buildingType || 'config',
    children: (item.children || []).map(child => createInfraNode(child)),
    tags: item.tags || {},
    placed: true,
    createdAt: Date.now(),
  };
}

function deepCloneTree(nodes, idMap) {
  return nodes.map(node => {
    const newId = genNodeId();
    idMap[node.id] = newId;
    return {
      ...node,
      id: newId,
      children: node.children ? deepCloneTree(node.children, idMap) : [],
      cityPos: node.cityPos ? { ...node.cityPos } : undefined,
      createdAt: Date.now(),
    };
  });
}

function walkTree(nodes, cb, pid = null, d = 1) {
  for (const n of nodes) {
    cb(n, pid, d);
    if (n.children?.length) walkTree(n.children, cb, n.id, d + 1);
  }
}
