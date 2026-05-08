// Sandroad Unit Classification System v2
// Buildings, Characters, Vehicles, Roads, Fences

// ========== BUILDING TYPES ==========
export const BUILDING_TYPES = {
  page:      { emoji: '🏢', label_ko: '페이지',     label_en: 'Page',        category: 'frontend', color: '#3b82f6' },
  component: { emoji: '🏠', label_ko: '컴포넌트',   label_en: 'Component',   category: 'frontend', color: '#60a5fa' },
  api:       { emoji: '📡', label_ko: 'API',        label_en: 'API',         category: 'backend',  color: '#10b981' },
  db:        { emoji: '🏦', label_ko: 'DB',         label_en: 'Database',    category: 'backend',  color: '#f59e0b' },
  auth:      { emoji: '🏛️', label_ko: '인증',       label_en: 'Auth',        category: 'backend',  color: '#8b5cf6' },
  storage:   { emoji: '🏭', label_ko: '스토리지',   label_en: 'Storage',     category: 'infra',    color: '#78716c' },
  noti:      { emoji: '🗼', label_ko: '알림',       label_en: 'Notification',category: 'infra',    color: '#ef4444' },
  payment:   { emoji: '🏪', label_ko: '결제',       label_en: 'Payment',     category: 'backend',  color: '#a855f7' },
  analytics: { emoji: '🔭', label_ko: '분석',       label_en: 'Analytics',   category: 'infra',    color: '#6b7280' },
  cache:     { emoji: '⛽', label_ko: '캐시',       label_en: 'Cache',       category: 'infra',    color: '#f97316' },
  queue:     { emoji: '🚉', label_ko: '큐/배치',    label_en: 'Queue',       category: 'infra',    color: '#0ea5e9' },
  external:  { emoji: '🌉', label_ko: '외부연동',   label_en: 'External',    category: 'external', color: '#14b8a6' },
  config:    { emoji: '⚙️', label_ko: '설정',       label_en: 'Config',      category: 'infra',    color: '#a8a29e' },
  custom:    { emoji: '🏷️', label_ko: '커스텀',     label_en: 'Custom',      category: 'custom',   color: '#d4d4d4' },
};

export const BUILDING_CATEGORIES = {
  frontend: { label_ko: '프론트엔드', label_en: 'Frontend', color: '#3b82f6' },
  backend:  { label_ko: '백엔드',     label_en: 'Backend',  color: '#10b981' },
  infra:    { label_ko: '인프라',     label_en: 'Infra',    color: '#78716c' },
  external: { label_ko: '외부',       label_en: 'External', color: '#14b8a6' },
  custom:   { label_ko: '커스텀',     label_en: 'Custom',   color: '#d4d4d4' },
};

// ========== BUILDING SIZES ==========
export const BUILDING_SIZES = {
  small:  { gridW: 1, gridH: 1, label_ko: '소형', label_en: 'Small',  assetW: 128, assetH: 160 },
  medium: { gridW: 2, gridH: 1, label_ko: '중형', label_en: 'Medium', assetW: 256, assetH: 200 },
  large:  { gridW: 2, gridH: 2, label_ko: '대형', label_en: 'Large',  assetW: 256, assetH: 320 },
};

// ========== VEHICLE TYPES (시스템 연결) ==========
export const VEHICLE_TYPES = {
  car:       { emoji: '🚗', label_ko: '승용차',   label_en: 'Car',       desc_ko: 'REST API (동기)',          desc_en: 'REST API (sync)',         color: '#3b82f6', speed: 1.0, moveStyle: 'straight' },
  drone:     { emoji: '🛸', label_ko: '드론',     label_en: 'Drone',     desc_ko: 'WebSocket / 실시간',      desc_en: 'WebSocket / realtime',    color: '#8b5cf6', speed: 1.5, moveStyle: 'straight' },
  truck:     { emoji: '🚛', label_ko: '트럭',     label_en: 'Truck',     desc_ko: '배치 처리 / 파일 업로드', desc_en: 'Batch / file upload',     color: '#78716c', speed: 0.7, moveStyle: 'straight' },
  train:     { emoji: '🚂', label_ko: '기차',     label_en: 'Train',     desc_ko: '스케줄 배치 / cron',      desc_en: 'Scheduled batch / cron',  color: '#0ea5e9', speed: 0.8, moveStyle: 'straight' },
  ambulance: { emoji: '🚑', label_ko: '구급차',   label_en: 'Ambulance', desc_ko: '에러 핸들링 / fallback',  desc_en: 'Error handling / fallback', color: '#ef4444', speed: 1.8, moveStyle: 'straight' },
  police:    { emoji: '🚓', label_ko: '경찰차',   label_en: 'Police',    desc_ko: '인증/권한 체크',           desc_en: 'Auth/permission check',   color: '#eab308', speed: 1.3, moveStyle: 'straight' },
};

// ========== CHARACTER TYPES (유저 액션 데이터) ==========
export const CHARACTER_TYPES = {
  worker:     { emoji: '👨‍💼', label_ko: '직원',     label_en: 'Worker',     desc_ko: '일반 유저 입력/조회',     desc_en: 'User input/query',        color: '#3b82f6', speed: 0.6, moveStyle: 'wobble' },
  courier:    { emoji: '🏃', label_ko: '집배원',   label_en: 'Courier',    desc_ko: '알림/포인트/메시지 전달', desc_en: 'Notification/point/msg',  color: '#f59e0b', speed: 0.9, moveStyle: 'wobble' },
  admin:      { emoji: '👷', label_ko: '작업자',   label_en: 'Admin',      desc_ko: '관리자 수동 처리',        desc_en: 'Admin manual operation',  color: '#f97316', speed: 0.5, moveStyle: 'wobble' },
  researcher: { emoji: '🧑‍🔬', label_ko: '연구원',   label_en: 'Researcher', desc_ko: '통계/분석 이벤트 수집',  desc_en: 'Stats/analytics collect', color: '#6b7280', speed: 0.7, moveStyle: 'wobble' },
  bug:        { emoji: '🐛', label_ko: '벌레',     label_en: 'Bug',        desc_ko: '에러/예외 데이터',        desc_en: 'Error/exception data',    color: '#ef4444', speed: 1.2, moveStyle: 'wobble' },
  moth:       { emoji: '🦋', label_ko: '나비',     label_en: 'Moth',       desc_ko: '경고/비정상 패턴',        desc_en: 'Warning/anomaly',         color: '#eab308', speed: 0.8, moveStyle: 'float' },
  guard:      { emoji: '💂', label_ko: '경비',     label_en: 'Guard',      desc_ko: '인증 토큰/세션 데이터',   desc_en: 'Auth token/session',      color: '#8b5cf6', speed: 0.7, moveStyle: 'wobble' },
  robot:      { emoji: '🤖', label_ko: '로봇',     label_en: 'Robot',      desc_ko: '자동화/봇 트리거',        desc_en: 'Automation/bot trigger',  color: '#0ea5e9', speed: 1.0, moveStyle: 'straight' },
};

// ========== DATA TYPES ==========
export const DATA_TYPES = {
  user:      { emoji: '👤', label_ko: '사용자 데이터', label_en: 'User Data',    color: '#3b82f6' },
  content:   { emoji: '📦', label_ko: '콘텐츠',       label_en: 'Content',      color: '#22c55e' },
  auth:      { emoji: '🔑', label_ko: '인증정보',     label_en: 'Auth Info',    color: '#eab308' },
  file:      { emoji: '📁', label_ko: '파일/미디어',  label_en: 'File/Media',   color: '#a16207' },
  noti:      { emoji: '🔔', label_ko: '알림',         label_en: 'Notification', color: '#ef4444' },
  payment:   { emoji: '💳', label_ko: '결제정보',     label_en: 'Payment',      color: '#a855f7' },
  analytics: { emoji: '📊', label_ko: '분석이벤트',   label_en: 'Analytics',    color: '#6b7280' },
  state:     { emoji: '📋', label_ko: '설정/상태',    label_en: 'State/Config', color: '#f97316' },
};

// ========== ROAD TYPES (auto-upgrade thresholds) ==========
export const ROAD_TYPES = {
  sidewalk: { width: 2, dash: [3, 4], label_ko: '인도',     label_en: 'Sidewalk', maxMovers: 2,  upgradesTo: 'street'  },
  street:   { width: 4, dash: null,   label_ko: '일반도로', label_en: 'Street',   maxMovers: 5,  upgradesTo: 'avenue'  },
  avenue:   { width: 7, dash: null,   label_ko: '대로',     label_en: 'Avenue',   maxMovers: 10, upgradesTo: 'highway' },
  highway:  { width: 10, dash: null,  label_ko: '고속도로', label_en: 'Highway',  maxMovers: Infinity, upgradesTo: null },
  tunnel:   { width: 4, dash: [3, 6], label_ko: '지하도',   label_en: 'Tunnel',   maxMovers: Infinity, upgradesTo: null, opacity: 0.4 },
};

// ========== MOVER DIRECTION MODES ==========
export const DIRECTION_MODES = {
  oneway:       { label_ko: '일방향',         label_en: 'One-way',         icon: '→' },
  twoway_same:  { label_ko: '양방향 (동일)',   label_en: 'Two-way (same)',  icon: '⇄' },
  twoway_diff:  { label_ko: '양방향 (변형)',   label_en: 'Two-way (diff)',  icon: '⇋' },
};

// ========== FENCE TYPES ==========
export const FENCE_TYPES = {
  wood:  { label_ko: '나무 울타리', label_en: 'Wood fence',  color: '#a16207' },
  metal: { label_ko: '철제 울타리', label_en: 'Metal fence', color: '#9ca3af' },
  stone: { label_ko: '돌담',       label_en: 'Stone wall',  color: '#78716c' },
};

// ========== GRID CONSTANTS ==========
export const GRID = {
  TILE_W: 128,       // base tile width
  TILE_H: 64,        // base tile height (2:1 ratio)
  FINE_STEP: 32,     // fine grid for area resize
  SNAP_STEP: 128,    // building placement snap
};

// ========== HELPERS ==========
export function getBuildingType(k) { return BUILDING_TYPES[k] || BUILDING_TYPES.page; }
export function getVehicleType(k) { return VEHICLE_TYPES[k] || VEHICLE_TYPES.car; }
export function getCharacterType(k) { return CHARACTER_TYPES[k] || CHARACTER_TYPES.worker; }
export function getDataType(k) { return DATA_TYPES[k] || DATA_TYPES.content; }
export function getRoadType(k) { return ROAD_TYPES[k] || ROAD_TYPES.street; }
export function getLabel(obj, lang) { return lang === 'ko' ? obj.label_ko : obj.label_en; }
export function getDesc(obj, lang) { return lang === 'ko' ? (obj.desc_ko || '') : (obj.desc_en || ''); }

// Get mover type (vehicle or character)
export function getMoverType(key) {
  if (VEHICLE_TYPES[key]) return { ...VEHICLE_TYPES[key], kind: 'vehicle' };
  if (CHARACTER_TYPES[key]) return { ...CHARACTER_TYPES[key], kind: 'character' };
  return { ...VEHICLE_TYPES.car, kind: 'vehicle' };
}

// Auto-determine road type by mover count
export function autoRoadType(moverCount, isInterDistrict) {
  if (isInterDistrict && moverCount >= 3) return 'highway';
  if (moverCount <= 2) return 'sidewalk';
  if (moverCount <= 5) return 'street';
  if (moverCount <= 10) return 'avenue';
  return 'highway';
}

// All movers (vehicles + characters) as flat list for pickers
export function allMoverTypes() {
  return [
    ...Object.entries(VEHICLE_TYPES).map(([k, v]) => ({ key: k, kind: 'vehicle', ...v })),
    ...Object.entries(CHARACTER_TYPES).map(([k, v]) => ({ key: k, kind: 'character', ...v })),
  ];
}
