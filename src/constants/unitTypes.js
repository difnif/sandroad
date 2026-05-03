// Sandroad Unit Classification System
// Buildings, Data, Vehicles, Roads

// ========== BUILDING TYPES (기능별) ==========
export const BUILDING_TYPES = {
  page:      { emoji: '🏢', label_ko: '페이지',     label_en: 'Page',       city: '오피스빌딩', desc_ko: '사용자가 보는 화면/탭',        desc_en: 'User-facing screen/tab',         category: 'frontend', color: '#3b82f6' },
  component: { emoji: '🏠', label_ko: '컴포넌트',   label_en: 'Component',  city: '주택',       desc_ko: 'UI 컴포넌트, 위젯',           desc_en: 'UI component/widget',            category: 'frontend', color: '#60a5fa' },
  api:       { emoji: '📡', label_ko: 'API',        label_en: 'API',        city: '통신타워',   desc_ko: 'REST/GraphQL 엔드포인트',     desc_en: 'REST/GraphQL endpoint',          category: 'backend',  color: '#10b981' },
  db:        { emoji: '🏦', label_ko: 'DB',         label_en: 'Database',   city: '은행',       desc_ko: '데이터베이스 테이블',          desc_en: 'Database table/collection',      category: 'backend',  color: '#f59e0b' },
  auth:      { emoji: '🏛️', label_ko: '인증',       label_en: 'Auth',       city: '시청',       desc_ko: '로그인, 권한, 토큰',          desc_en: 'Login, permissions, tokens',     category: 'backend',  color: '#8b5cf6' },
  storage:   { emoji: '🏭', label_ko: '스토리지',   label_en: 'Storage',    city: '창고',       desc_ko: '파일, 이미지 저장',            desc_en: 'File/image storage',             category: 'infra',    color: '#78716c' },
  noti:      { emoji: '🗼', label_ko: '알림',       label_en: 'Notification', city: '방송탑',   desc_ko: '푸시, 이메일, SMS',            desc_en: 'Push, email, SMS',               category: 'infra',    color: '#ef4444' },
  payment:   { emoji: '🏪', label_ko: '결제',       label_en: 'Payment',    city: '상점',       desc_ko: '결제 처리',                    desc_en: 'Payment processing',             category: 'backend',  color: '#a855f7' },
  analytics: { emoji: '🔭', label_ko: '분석',       label_en: 'Analytics',  city: '관측소',     desc_ko: '트래킹, 통계',                 desc_en: 'Tracking, statistics',           category: 'infra',    color: '#6b7280' },
  cache:     { emoji: '⛽', label_ko: '캐시',       label_en: 'Cache',      city: '주유소',     desc_ko: '캐싱 레이어',                  desc_en: 'Caching layer',                  category: 'infra',    color: '#f97316' },
  queue:     { emoji: '🚉', label_ko: '큐/배치',    label_en: 'Queue',      city: '기차역',     desc_ko: '메시지 큐, 배치 작업',         desc_en: 'Message queue, batch jobs',      category: 'infra',    color: '#0ea5e9' },
  external:  { emoji: '🌉', label_ko: '외부연동',   label_en: 'External',   city: '항구',       desc_ko: '서드파티 API',                 desc_en: 'Third-party API',                category: 'external', color: '#14b8a6' },
  config:    { emoji: '⚙️', label_ko: '설정',       label_en: 'Config',     city: '발전소',     desc_ko: '환경변수, 설정',               desc_en: 'Environment vars, config',       category: 'infra',    color: '#a8a29e' },
};

// Category groups for picker UI
export const BUILDING_CATEGORIES = {
  frontend: { label_ko: '프론트엔드', label_en: 'Frontend', color: '#3b82f6' },
  backend:  { label_ko: '백엔드',     label_en: 'Backend',  color: '#10b981' },
  infra:    { label_ko: '인프라',     label_en: 'Infra',    color: '#78716c' },
  external: { label_ko: '외부',       label_en: 'External', color: '#14b8a6' },
};

// ========== DATA TYPES (화물 종류) ==========
export const DATA_TYPES = {
  user:      { emoji: '👤', label_ko: '사용자 데이터', label_en: 'User Data',    color: '#3b82f6', road_color: '#93c5fd' },
  content:   { emoji: '📦', label_ko: '콘텐츠',       label_en: 'Content',      color: '#22c55e', road_color: '#86efac' },
  auth:      { emoji: '🔑', label_ko: '인증정보',     label_en: 'Auth Info',    color: '#eab308', road_color: '#fde047' },
  file:      { emoji: '📁', label_ko: '파일/미디어',  label_en: 'File/Media',   color: '#a16207', road_color: '#d4a574' },
  noti:      { emoji: '🔔', label_ko: '알림',         label_en: 'Notification', color: '#ef4444', road_color: '#fca5a5' },
  payment:   { emoji: '💳', label_ko: '결제정보',     label_en: 'Payment',      color: '#a855f7', road_color: '#c4b5fd' },
  analytics: { emoji: '📊', label_ko: '분석이벤트',   label_en: 'Analytics',    color: '#6b7280', road_color: '#d1d5db' },
  state:     { emoji: '📋', label_ko: '설정/상태',    label_en: 'State/Config', color: '#f97316', road_color: '#fdba74' },
};

// ========== VEHICLE TYPES (이동 수단 = 연동 방식) ==========
export const VEHICLE_TYPES = {
  car:       { emoji: '🚗', label_ko: '승용차',   label_en: 'Car',       desc_ko: 'REST API (동기)',          desc_en: 'REST API (sync)',         color: '#3b82f6', speed: 1.0 },
  drone:     { emoji: '🚁', label_ko: '드론',     label_en: 'Drone',     desc_ko: 'WebSocket / 실시간',      desc_en: 'WebSocket / realtime',    color: '#8b5cf6', speed: 1.5 },
  worker:    { emoji: '👷', label_ko: '인력',     label_en: 'Worker',    desc_ko: '수동 작업 / 관리자',       desc_en: 'Manual operation',        color: '#f59e0b', speed: 0.5 },
  truck:     { emoji: '🚛', label_ko: '택배트럭', label_en: 'Truck',     desc_ko: '배치 처리 / 파일 업로드', desc_en: 'Batch / file upload',     color: '#78716c', speed: 0.7 },
  bike:      { emoji: '🚲', label_ko: '자전거',   label_en: 'Bike',      desc_ko: '경량 polling / 이벤트',   desc_en: 'Lightweight polling',     color: '#22c55e', speed: 1.2 },
  train:     { emoji: '🚂', label_ko: '기차',     label_en: 'Train',     desc_ko: '스케줄 배치 / cron',      desc_en: 'Scheduled batch / cron',  color: '#0ea5e9', speed: 0.8 },
  ambulance: { emoji: '🚑', label_ko: '구급차',   label_en: 'Ambulance', desc_ko: '에러 핸들링 / fallback',  desc_en: 'Error handling / fallback', color: '#ef4444', speed: 1.8 },
  police:    { emoji: '🚓', label_ko: '경찰차',   label_en: 'Police',    desc_ko: '인증/권한 체크',           desc_en: 'Auth/permission check',   color: '#eab308', speed: 1.3 },
};

// ========== ROAD TYPES (도로 규모) ==========
export const ROAD_TYPES = {
  highway:   { width: 10, dash: null,    label_ko: '고속도로', label_en: 'Highway',   desc_ko: '핵심 데이터 파이프라인', desc_en: 'Core data pipeline', centerLine: true },
  main:      { width: 6,  dash: null,    label_ko: '대로',     label_en: 'Main road', desc_ko: '주요 API 통신',         desc_en: 'Major API communication', centerLine: true },
  sub:       { width: 3,  dash: [8, 4],  label_ko: '소로',     label_en: 'Sub road',  desc_ko: '내부 컴포넌트 통신',    desc_en: 'Internal component comm', centerLine: false },
  tunnel:    { width: 4,  dash: [3, 6],  label_ko: '지하도',   label_en: 'Tunnel',    desc_ko: '백그라운드 동기화',     desc_en: 'Background sync', centerLine: false, opacity: 0.4 },
};

// ========== HELPERS ==========

export function getBuildingType(typeKey) {
  return BUILDING_TYPES[typeKey] || BUILDING_TYPES.page;
}

export function getDataType(typeKey) {
  return DATA_TYPES[typeKey] || DATA_TYPES.content;
}

export function getVehicleType(typeKey) {
  return VEHICLE_TYPES[typeKey] || VEHICLE_TYPES.car;
}

export function getRoadType(typeKey) {
  return ROAD_TYPES[typeKey] || ROAD_TYPES.main;
}

// Get label based on language
export function getLabel(typeObj, lang) {
  return lang === 'ko' ? typeObj.label_ko : typeObj.label_en;
}

export function getDesc(typeObj, lang) {
  return lang === 'ko' ? (typeObj.desc_ko || '') : (typeObj.desc_en || '');
}

// Default building type based on depth
export function defaultBuildingType(depth) {
  if (depth <= 1) return 'page';
  if (depth === 2) return 'component';
  return 'component';
}

// Get all types as array for pickers
export function buildingTypeList() {
  return Object.entries(BUILDING_TYPES).map(([key, val]) => ({ key, ...val }));
}
export function dataTypeList() {
  return Object.entries(DATA_TYPES).map(([key, val]) => ({ key, ...val }));
}
export function vehicleTypeList() {
  return Object.entries(VEHICLE_TYPES).map(([key, val]) => ({ key, ...val }));
}
export function roadTypeList() {
  return Object.entries(ROAD_TYPES).map(([key, val]) => ({ key, ...val }));
}
