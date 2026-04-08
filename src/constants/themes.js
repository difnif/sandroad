// Three theme definitions: sand / dark / light
// Each theme provides: colors, language strings, and column color palette

export const THEMES = {
  sand: {
    id: 'sand',
    name: '모래성',

    // App-level colors
    bg:           'bg-amber-50/30',
    bgAlt:        'bg-amber-50/80',
    bgPanel:      'bg-white',
    bgHover:      'bg-amber-50/40',
    text:         'text-stone-900',
    textMuted:    'text-stone-500',
    textDim:      'text-stone-400',
    border:       'border-stone-200',
    borderStrong: 'border-stone-300',
    accent:       'bg-amber-600 text-white hover:bg-amber-700',
    accentText:   'text-amber-700 hover:text-amber-900',
    button:       'bg-white border-stone-300 text-stone-700 hover:bg-stone-50',
    buttonPrimary:'bg-stone-800 text-white hover:bg-stone-900',
    input:        'bg-white border-stone-300 text-stone-900 focus:border-amber-500',
    inputTransparent: 'bg-transparent border-transparent text-stone-900 hover:border-stone-200 focus:border-amber-500 focus:bg-white',

    // Column palette (8 colors)
    columnColors: ['sand', 'clay', 'dune', 'river', 'moss', 'brick', 'sky', 'stone'],
    columnStyles: {
      sand:  { header: 'bg-amber-50 border-amber-300 text-amber-900',     addBtn: 'text-amber-800 hover:bg-amber-100',     dot: 'bg-amber-400' },
      clay:  { header: 'bg-orange-50 border-orange-300 text-orange-900',  addBtn: 'text-orange-800 hover:bg-orange-100',   dot: 'bg-orange-400' },
      dune:  { header: 'bg-yellow-50 border-yellow-300 text-yellow-900',  addBtn: 'text-yellow-800 hover:bg-yellow-100',   dot: 'bg-yellow-400' },
      river: { header: 'bg-sky-50 border-sky-300 text-sky-900',           addBtn: 'text-sky-800 hover:bg-sky-100',         dot: 'bg-sky-400' },
      moss:  { header: 'bg-emerald-50 border-emerald-300 text-emerald-900', addBtn: 'text-emerald-800 hover:bg-emerald-100', dot: 'bg-emerald-400' },
      brick: { header: 'bg-rose-50 border-rose-300 text-rose-900',        addBtn: 'text-rose-800 hover:bg-rose-100',       dot: 'bg-rose-400' },
      sky:   { header: 'bg-indigo-50 border-indigo-300 text-indigo-900',  addBtn: 'text-indigo-800 hover:bg-indigo-100',   dot: 'bg-indigo-400' },
      stone: { header: 'bg-stone-100 border-stone-300 text-stone-900',    addBtn: 'text-stone-800 hover:bg-stone-200',     dot: 'bg-stone-400' }
    },
    depthBadge: {
      1: 'bg-stone-800 text-amber-50',
      2: 'bg-stone-500 text-amber-50',
      3: 'bg-stone-300 text-stone-700'
    },
    fontMono: false
  },

  dark: {
    id: 'dark',
    name: 'Dark',

    bg:           'bg-[#1e1e1e]',
    bgAlt:        'bg-[#252526]',
    bgPanel:      'bg-[#252526]',
    bgHover:      'bg-[#2a2d2e]',
    text:         'text-[#cccccc]',
    textMuted:    'text-[#858585]',
    textDim:      'text-[#6e6e6e]',
    border:       'border-[#3e3e42]',
    borderStrong: 'border-[#464649]',
    accent:       'bg-[#0e639c] text-white hover:bg-[#1177bb]',
    accentText:   'text-[#3794ff] hover:text-[#4fc3f7]',
    button:       'bg-[#3a3d41] border-[#3e3e42] text-[#cccccc] hover:bg-[#45494e]',
    buttonPrimary:'bg-[#0e639c] text-white hover:bg-[#1177bb]',
    input:        'bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] focus:border-[#007acc]',
    inputTransparent: 'bg-transparent border-transparent text-[#cccccc] hover:border-[#3e3e42] focus:border-[#007acc] focus:bg-[#3c3c3c]',

    columnColors: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'gray'],
    columnStyles: {
      red:    { header: 'bg-[#3c1f1f] border-[#5a2828] text-[#f48771]',     addBtn: 'text-[#f48771] hover:bg-[#5a2828]',     dot: 'bg-[#f48771]' },
      orange: { header: 'bg-[#3c2a1f] border-[#5a3a28] text-[#ce9178]',     addBtn: 'text-[#ce9178] hover:bg-[#5a3a28]',     dot: 'bg-[#ce9178]' },
      yellow: { header: 'bg-[#3c3a1f] border-[#5a5628] text-[#dcdcaa]',     addBtn: 'text-[#dcdcaa] hover:bg-[#5a5628]',     dot: 'bg-[#dcdcaa]' },
      green:  { header: 'bg-[#1f3c25] border-[#285a32] text-[#6a9955]',     addBtn: 'text-[#6a9955] hover:bg-[#285a32]',     dot: 'bg-[#6a9955]' },
      cyan:   { header: 'bg-[#1f3a3c] border-[#28565a] text-[#4ec9b0]',     addBtn: 'text-[#4ec9b0] hover:bg-[#28565a]',     dot: 'bg-[#4ec9b0]' },
      blue:   { header: 'bg-[#1f2d3c] border-[#28425a] text-[#569cd6]',     addBtn: 'text-[#569cd6] hover:bg-[#28425a]',     dot: 'bg-[#569cd6]' },
      purple: { header: 'bg-[#2d1f3c] border-[#42285a] text-[#c586c0]',     addBtn: 'text-[#c586c0] hover:bg-[#42285a]',     dot: 'bg-[#c586c0]' },
      gray:   { header: 'bg-[#2d2d30] border-[#3e3e42] text-[#cccccc]',     addBtn: 'text-[#cccccc] hover:bg-[#3e3e42]',     dot: 'bg-[#858585]' }
    },
    depthBadge: {
      1: 'bg-[#007acc] text-white',
      2: 'bg-[#4e4e52] text-[#cccccc]',
      3: 'bg-[#3a3d41] text-[#858585]'
    },
    fontMono: true
  },

  light: {
    id: 'light',
    name: 'Light',

    bg:           'bg-[#ffffff]',
    bgAlt:        'bg-[#f3f3f3]',
    bgPanel:      'bg-white',
    bgHover:      'bg-[#e8e8e8]',
    text:         'text-[#1e1e1e]',
    textMuted:    'text-[#616161]',
    textDim:      'text-[#9e9e9e]',
    border:       'border-[#e5e5e5]',
    borderStrong: 'border-[#d4d4d4]',
    accent:       'bg-[#0066b8] text-white hover:bg-[#005a9e]',
    accentText:   'text-[#0066b8] hover:text-[#005a9e]',
    button:       'bg-white border-[#d4d4d4] text-[#1e1e1e] hover:bg-[#f3f3f3]',
    buttonPrimary:'bg-[#0066b8] text-white hover:bg-[#005a9e]',
    input:        'bg-white border-[#d4d4d4] text-[#1e1e1e] focus:border-[#0066b8]',
    inputTransparent: 'bg-transparent border-transparent text-[#1e1e1e] hover:border-[#d4d4d4] focus:border-[#0066b8] focus:bg-white',

    columnColors: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'gray'],
    columnStyles: {
      red:    { header: 'bg-[#fde8e8] border-[#f8b4b4] text-[#a51616]',     addBtn: 'text-[#a51616] hover:bg-[#fbd5d5]',     dot: 'bg-[#e53e3e]' },
      orange: { header: 'bg-[#feebc8] border-[#fbd38d] text-[#9c4221]',     addBtn: 'text-[#9c4221] hover:bg-[#fbd38d]',     dot: 'bg-[#dd6b20]' },
      yellow: { header: 'bg-[#fef3c7] border-[#fde68a] text-[#92400e]',     addBtn: 'text-[#92400e] hover:bg-[#fde68a]',     dot: 'bg-[#d69e2e]' },
      green:  { header: 'bg-[#d1fae5] border-[#a7f3d0] text-[#065f46]',     addBtn: 'text-[#065f46] hover:bg-[#a7f3d0]',     dot: 'bg-[#10b981]' },
      cyan:   { header: 'bg-[#cffafe] border-[#a5f3fc] text-[#155e75]',     addBtn: 'text-[#155e75] hover:bg-[#a5f3fc]',     dot: 'bg-[#06b6d4]' },
      blue:   { header: 'bg-[#dbeafe] border-[#bfdbfe] text-[#1e40af]',     addBtn: 'text-[#1e40af] hover:bg-[#bfdbfe]',     dot: 'bg-[#3b82f6]' },
      purple: { header: 'bg-[#e9d5ff] border-[#d8b4fe] text-[#6b21a8]',     addBtn: 'text-[#6b21a8] hover:bg-[#d8b4fe]',     dot: 'bg-[#a855f7]' },
      gray:   { header: 'bg-[#f3f3f3] border-[#d4d4d4] text-[#1e1e1e]',     addBtn: 'text-[#1e1e1e] hover:bg-[#e5e5e5]',     dot: 'bg-[#6b7280]' }
    },
    depthBadge: {
      1: 'bg-[#0066b8] text-white',
      2: 'bg-[#9e9e9e] text-white',
      3: 'bg-[#d4d4d4] text-[#616161]'
    },
    fontMono: true
  }
};

// Default column color for new columns by theme
export const DEFAULT_COLUMN_COLOR = {
  sand: 'sand',
  dark: 'blue',
  light: 'blue'
};

// Cycle of column colors for newly created columns
export function getNextColumnColor(themeId, existingColors) {
  const palette = THEMES[themeId]?.columnColors || THEMES.sand.columnColors;
  for (const c of palette) {
    if (!existingColors.includes(c)) return c;
  }
  return palette[existingColors.length % palette.length];
}
