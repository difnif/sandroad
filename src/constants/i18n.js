// Language strings tied to theme: sand=Korean, dark/light=English
export const STRINGS = {
  sand: {
    // App
    appTagline: '구조 기획 도구',
    loading: 'sandroad 불러오는 중...',
    logout: '로그아웃',

    // Project
    project: '도시',
    projects: '도시',
    projectList: '도시 목록',
    newProject: '새 도시',
    createProject: '새 도시 만들기',
    projectName: '도시 이름',
    projectNamePlaceholder: '도시 이름',
    open: '열림',
    create: '만들기',
    cancel: '취소',
    deleteProject: '도시 삭제',
    deleteProjectConfirm: (name) => `"${name}" 도시를 삭제하시겠습니까? 모든 구조가 사라지며 되돌릴 수 없습니다.`,
    noProjects: '아직 도시가 없습니다',
    selectOrCreate: '도시를 선택하거나 새 도시를 만드세요',
    loadingProject: '도시 불러오는 중...',
    projectInitialNote: '4개 컬럼으로 시작합니다. 이름, 색상, 컬럼 추가/삭제는 생성 후 바꿀 수 있어요.',

    // Column
    column: '컬럼',
    columns: '컬럼',
    addColumn: '+ 컬럼 추가',
    deleteColumn: '컬럼 삭제',
    deleteColumnConfirm: (name) => `"${name}" 컬럼을 삭제하시겠습니까? 안의 모든 항목이 함께 사라집니다.`,
    columnDefaultName: (n) => `구역 ${n}`,
    addRoot: '+ 1차',
    columnEditTitle: '컬럼 이름 수정',
    columnEmpty: ['"+ 1차" 버튼으로', '첫 항목을 추가하세요'],

    // Item
    item: '항목',
    addItem: '+ 항목',
    deleteItem: '항목 삭제',
    deleteItemConfirm: (name) => `"${name || '항목'}"을(를) 삭제합니다. 하위 항목도 모두 함께 삭제됩니다.`,
    itemNamePlaceholder: '항목명',
    itemDescPlaceholder: '설명 (선택)',
    newItemDefault: '새 항목',
    addChildItem: '하위 항목 추가',
    delete: '삭제',

    // Tags
    tags: {
      common: '공통',
      linked: '연동',
      commonPending: '공통예정',
      linkedPending: '연동예정',
      review: '검토'
    },

    // Clipboard
    copied: '복사됨',
    copy: '복사',
    pasteToColumn: '컬럼에 붙여넣기',
    pasteAsChild: '하위로 붙여넣기',
    clipboardHint: '· 컬럼 상단 또는 항목의 붙여넣기 버튼으로 이동',

    // Dashboard
    metrics: '계기판',
    metricsSettings: '계기판 설정',
    style: '스타일',
    styleDigital: '디지털 (숫자)',
    styleAnalog: '아날로그 (점)',
    modePrecise: '정확 (2.4→2.4개)',
    modeRounded: '반올림 (2.8→3개)',
    position: '위치',
    posTop: '상단',
    posBottom: '하단',
    posFloat: '플로팅',
    floatHint: '계기판 영역을 드래그해서 위치 조정',
    widgetVisibility: '위젯 표시 및 색상',
    widgetLabels: {
      d1count: '1차',
      avg12: '1→2 평균',
      avg23: '2→3 평균',
      missing: '연결 누락',
      pending: '예정',
      review: '검토',
      balance: '균형'
    },
    widgetShortLabels: {
      d1count: '1차',
      avg12: '1→2',
      avg23: '2→3',
      missing: '누락',
      pending: '예정',
      review: '검토',
      balance: '균형'
    },
    resetDefault: '기본값으로',
    saving: '저장 중',
    saved: '저장됨',

    // Detail panels
    totalCounts: (d1, d2, d3) => `전체 1차: ${d1} · 2차: ${d2} · 3차: ${d3}`,
    columnDistribution: '컬럼별 하위 항목 분포',
    noMissing: '누락 없음',
    noPending: '예정 항목 없음',
    noReview: '검토 항목 없음',
    columnBalance: '컬럼별 1차 항목 수 편차',

    // Export
    export: '내보내기',

    // Settings
    settings: '설정',
    appearance: '테마 / 언어',
    appearanceHint: '테마 선택 시 색상과 언어가 함께 변경됩니다.',
  },

  dark: {
    appTagline: 'Structure planning tool',
    loading: 'Loading sandroad...',
    logout: 'Logout',

    project: 'Project',
    projects: 'Projects',
    projectList: 'Projects',
    newProject: '+ New project',
    createProject: 'Create new project',
    projectName: 'Project name',
    projectNamePlaceholder: 'project-name',
    open: 'open',
    create: 'Create',
    cancel: 'Cancel',
    deleteProject: 'Delete project',
    deleteProjectConfirm: (name) => `Delete "${name}"? All structure will be lost permanently.`,
    noProjects: 'No projects yet',
    selectOrCreate: 'Select a project or create a new one',
    loadingProject: 'Loading project...',
    projectInitialNote: 'Starts with 4 columns. You can rename, recolor, add or remove columns afterwards.',

    column: 'Column',
    columns: 'Columns',
    addColumn: '+ add column',
    deleteColumn: 'Delete column',
    deleteColumnConfirm: (name) => `Delete column "${name}"? All items inside will be removed.`,
    columnDefaultName: (n) => `column_${n}`,
    addRoot: '+ root',
    columnEditTitle: 'Rename column',
    columnEmpty: ['Click "+ root"', 'to add first item'],

    item: 'Item',
    addItem: '+ item',
    deleteItem: 'Delete item',
    deleteItemConfirm: (name) => `Delete "${name || 'item'}"? All children will be removed too.`,
    itemNamePlaceholder: 'item name',
    itemDescPlaceholder: '// description (optional)',
    newItemDefault: 'new_item',
    addChildItem: 'add child',
    delete: 'delete',

    tags: {
      common: 'common',
      linked: 'linked',
      commonPending: 'common?',
      linkedPending: 'linked?',
      review: 'review'
    },

    copied: 'copied',
    copy: 'copy',
    pasteToColumn: 'paste to column',
    pasteAsChild: 'paste as child',
    clipboardHint: '· paste with column header or item button',

    metrics: 'metrics',
    metricsSettings: 'metrics settings',
    style: 'style',
    styleDigital: 'digital (number)',
    styleAnalog: 'analog (dots)',
    modePrecise: 'precise (2.4→2.4)',
    modeRounded: 'rounded (2.8→3)',
    position: 'position',
    posTop: 'top',
    posBottom: 'bottom',
    posFloat: 'floating',
    floatHint: 'drag the bar to reposition',
    widgetVisibility: 'widgets & colors',
    widgetLabels: {
      d1count: 'L1 count',
      avg12: 'avg L1→L2',
      avg23: 'avg L2→L3',
      missing: 'missing links',
      pending: 'pending',
      review: 'review',
      balance: 'balance'
    },
    widgetShortLabels: {
      d1count: 'L1',
      avg12: '1→2',
      avg23: '2→3',
      missing: 'miss',
      pending: 'pend',
      review: 'rev',
      balance: 'bal'
    },
    resetDefault: 'reset default',
    saving: 'saving',
    saved: 'saved',

    totalCounts: (d1, d2, d3) => `total L1: ${d1} · L2: ${d2} · L3: ${d3}`,
    columnDistribution: 'distribution by column',
    noMissing: 'no missing',
    noPending: 'no pending',
    noReview: 'no review',
    columnBalance: 'L1 deviation by column',

    export: 'export',

    settings: 'settings',
    appearance: 'theme / language',
    appearanceHint: 'Selecting a theme switches both colors and language.'
  }
};

// Light theme uses the same English strings as dark
STRINGS.light = STRINGS.dark;
