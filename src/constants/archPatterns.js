// Architecture Patterns & Layers for Sandroad
// Tags nodes/groups with architectural role information
// This data enriches the architecture spec document

// ========== PATTERNS (프로젝트/구역 레벨) ==========
export const ARCH_PATTERNS = {
  mvc: {
    label: 'MVC',
    desc_ko: 'Model-View-Controller. 모델/뷰/컨트롤러 분리',
    desc_en: 'Model-View-Controller separation',
    layers: ['model', 'view', 'controller'],
    color: '#3b82f6'
  },
  mvp: {
    label: 'MVP',
    desc_ko: 'Model-View-Presenter. 프레젠터가 뷰와 모델 중재',
    desc_en: 'Model-View-Presenter. Presenter mediates view and model',
    layers: ['model', 'view', 'presenter'],
    color: '#8b5cf6'
  },
  mvvm: {
    label: 'MVVM',
    desc_ko: 'Model-View-ViewModel. 데이터 바인딩 기반',
    desc_en: 'Model-View-ViewModel. Data binding based',
    layers: ['model', 'view', 'viewmodel'],
    color: '#06b6d4'
  },
  redux: {
    label: 'Flux/Redux',
    desc_ko: '단방향 데이터 플로우. Store/Action/Reducer',
    desc_en: 'Unidirectional data flow. Store/Action/Reducer',
    layers: ['store', 'action', 'reducer', 'view'],
    color: '#7c3aed'
  },
  mvi: {
    label: 'MVI',
    desc_ko: 'Model-View-Intent. 반응형 사이클',
    desc_en: 'Model-View-Intent. Reactive cycle',
    layers: ['model', 'view', 'intent'],
    color: '#f59e0b'
  },
  clean: {
    label: 'Clean Architecture',
    desc_ko: '엔터티/유스케이스/인터페이스 어댑터/프레임워크 계층',
    desc_en: 'Entities/Use Cases/Interface Adapters/Frameworks layers',
    layers: ['entity', 'usecase', 'adapter', 'framework'],
    color: '#10b981'
  },
  fsd: {
    label: 'Feature-Sliced Design',
    desc_ko: 'App/Processes/Pages/Widgets/Features/Entities/Shared 계층',
    desc_en: 'App/Processes/Pages/Widgets/Features/Entities/Shared layers',
    layers: ['app', 'process', 'page', 'widget', 'feature', 'entity', 'shared'],
    color: '#ef4444'
  },
  hexagonal: {
    label: 'Hexagonal',
    desc_ko: 'Port & Adapter. 도메인 중심, 외부 의존 격리',
    desc_en: 'Port & Adapter. Domain-centric, isolated external deps',
    layers: ['domain', 'port', 'adapter'],
    color: '#14b8a6'
  },
  layered: {
    label: 'Layered',
    desc_ko: '프레젠테이션/비즈니스/데이터 3계층',
    desc_en: 'Presentation/Business/Data 3-tier',
    layers: ['presentation', 'business', 'data'],
    color: '#78716c'
  },
  microservice: {
    label: 'Microservice',
    desc_ko: '독립 배포 가능한 서비스 단위 분리',
    desc_en: 'Independently deployable service units',
    layers: ['gateway', 'service', 'datastore'],
    color: '#0ea5e9'
  }
};

// ========== LAYERS (노드 레벨 = 건물 역할) ==========
export const ARCH_LAYERS = {
  // MVC
  model:        { label: 'Model',        pattern: ['mvc','mvp','mvi'], desc_ko: '데이터 모델 / 비즈니스 로직',      desc_en: 'Data model / business logic',       defaultBuildingType: 'db' },
  view:         { label: 'View',         pattern: ['mvc','mvp','mvvm','mvi','redux'], desc_ko: 'UI 표시 계층',      desc_en: 'UI presentation layer',             defaultBuildingType: 'page' },
  controller:   { label: 'Controller',   pattern: ['mvc'],            desc_ko: '입력 처리 / 모델-뷰 중재',        desc_en: 'Input handling / model-view mediation', defaultBuildingType: 'api' },
  presenter:    { label: 'Presenter',    pattern: ['mvp'],            desc_ko: '뷰 로직 처리 / 모델 업데이트',     desc_en: 'View logic / model updates',        defaultBuildingType: 'api' },
  viewmodel:    { label: 'ViewModel',    pattern: ['mvvm'],           desc_ko: '뷰 상태 관리 / 데이터 바인딩',     desc_en: 'View state / data binding',         defaultBuildingType: 'component' },

  // Redux/Flux
  store:        { label: 'Store',        pattern: ['redux'],          desc_ko: '전역 상태 저장소',                 desc_en: 'Global state store',                defaultBuildingType: 'cache' },
  action:       { label: 'Action',       pattern: ['redux'],          desc_ko: '상태 변경 이벤트',                 desc_en: 'State change event',                defaultBuildingType: 'api' },
  reducer:      { label: 'Reducer',      pattern: ['redux'],          desc_ko: '상태 변환 함수',                   desc_en: 'State transformation function',     defaultBuildingType: 'config' },
  
  // MVI
  intent:       { label: 'Intent',       pattern: ['mvi'],            desc_ko: '사용자 의도 / 이벤트 스트림',       desc_en: 'User intent / event stream',        defaultBuildingType: 'api' },

  // Clean Architecture
  entity:       { label: 'Entity',       pattern: ['clean','fsd'],    desc_ko: '핵심 비즈니스 엔터티',             desc_en: 'Core business entity',              defaultBuildingType: 'db' },
  usecase:      { label: 'Use Case',     pattern: ['clean'],          desc_ko: '비즈니스 유스케이스 / 인터랙터',    desc_en: 'Business use case / interactor',    defaultBuildingType: 'api' },
  adapter:      { label: 'Adapter',      pattern: ['clean','hexagonal'], desc_ko: '인터페이스 어댑터 / 변환 계층', desc_en: 'Interface adapter / conversion',     defaultBuildingType: 'external' },
  framework:    { label: 'Framework',    pattern: ['clean'],          desc_ko: '프레임워크 / 드라이버 계층',       desc_en: 'Framework / driver layer',           defaultBuildingType: 'config' },

  // FSD
  app:          { label: 'App Layer',    pattern: ['fsd'],            desc_ko: '앱 초기화 / 프로바이더',           desc_en: 'App init / providers',              defaultBuildingType: 'config' },
  process:      { label: 'Process',      pattern: ['fsd'],            desc_ko: '비즈니스 프로세스 / 워크플로우',    desc_en: 'Business process / workflow',        defaultBuildingType: 'queue' },
  widget:       { label: 'Widget',       pattern: ['fsd'],            desc_ko: '조합 컴포넌트 / 복합 UI',         desc_en: 'Composite component / complex UI',  defaultBuildingType: 'component' },
  feature:      { label: 'Feature',      pattern: ['fsd'],            desc_ko: '기능 단위 모듈',                   desc_en: 'Feature module',                    defaultBuildingType: 'component' },
  shared:       { label: 'Shared',       pattern: ['fsd'],            desc_ko: '공통 유틸 / 라이브러리',           desc_en: 'Shared utilities / libraries',      defaultBuildingType: 'config' },

  // Hexagonal
  domain:       { label: 'Domain',       pattern: ['hexagonal'],      desc_ko: '도메인 핵심 로직',                 desc_en: 'Domain core logic',                 defaultBuildingType: 'db' },
  port:         { label: 'Port',         pattern: ['hexagonal'],      desc_ko: '인/아웃바운드 포트 인터페이스',     desc_en: 'In/outbound port interface',        defaultBuildingType: 'api' },

  // Layered
  presentation: { label: 'Presentation', pattern: ['layered'],        desc_ko: '프레젠테이션 계층',                desc_en: 'Presentation layer',                defaultBuildingType: 'page' },
  business:     { label: 'Business',     pattern: ['layered'],        desc_ko: '비즈니스 로직 계층',               desc_en: 'Business logic layer',              defaultBuildingType: 'api' },
  data:         { label: 'Data',         pattern: ['layered'],        desc_ko: '데이터 접근 계층',                 desc_en: 'Data access layer',                 defaultBuildingType: 'db' },

  // Microservice
  gateway:      { label: 'Gateway',      pattern: ['microservice'],   desc_ko: 'API 게이트웨이 / 라우팅',          desc_en: 'API gateway / routing',             defaultBuildingType: 'api' },
  service:      { label: 'Service',      pattern: ['microservice'],   desc_ko: '독립 서비스 단위',                 desc_en: 'Independent service unit',           defaultBuildingType: 'api' },
  datastore:    { label: 'Datastore',    pattern: ['microservice'],   desc_ko: '서비스별 데이터 저장소',            desc_en: 'Per-service data store',             defaultBuildingType: 'db' },

  // Generic
  repository:   { label: 'Repository',   pattern: [],                 desc_ko: '데이터 저장소 추상화',             desc_en: 'Data storage abstraction',           defaultBuildingType: 'db' },
  middleware:   { label: 'Middleware',    pattern: [],                 desc_ko: '요청 가로채기 / 전처리',           desc_en: 'Request interception / preprocessing', defaultBuildingType: 'api' },
  hook:         { label: 'Hook',         pattern: [],                 desc_ko: 'React Hook / 상태 로직',           desc_en: 'React Hook / state logic',           defaultBuildingType: 'component' },
  context:      { label: 'Context',      pattern: [],                 desc_ko: 'React Context / 전역 상태',        desc_en: 'React Context / global state',       defaultBuildingType: 'cache' },
  provider:     { label: 'Provider',     pattern: [],                 desc_ko: '의존성 주입 / 프로바이더',          desc_en: 'Dependency injection / provider',    defaultBuildingType: 'config' },
  util:         { label: 'Utility',      pattern: [],                 desc_ko: '유틸리티 함수 모음',               desc_en: 'Utility function collection',        defaultBuildingType: 'config' },
  dto:          { label: 'DTO',          pattern: [],                 desc_ko: '데이터 전송 객체',                 desc_en: 'Data Transfer Object',               defaultBuildingType: 'config' },
  enum:         { label: 'Enum/Const',   pattern: [],                 desc_ko: '상수 / 열거형 정의',               desc_en: 'Constants / enum definitions',       defaultBuildingType: 'config' },
};

// Get pattern info
export function getArchPattern(key) {
  return ARCH_PATTERNS[key] || null;
}

export function getArchLayer(key) {
  return ARCH_LAYERS[key] || null;
}

// Get layers for a given pattern
export function getLayersForPattern(patternKey) {
  const pattern = ARCH_PATTERNS[patternKey];
  if (!pattern) return [];
  return pattern.layers.map(lk => ({ key: lk, ...ARCH_LAYERS[lk] })).filter(l => l.label);
}
