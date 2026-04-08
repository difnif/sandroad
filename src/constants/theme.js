// Sand-tone palette for columns
export const COLOR_OPTIONS = ['sand', 'clay', 'dune', 'river', 'moss', 'brick', 'sky', 'stone'];

export const COLUMN_STYLES = {
  sand:  { header: 'bg-amber-50 border-amber-300 text-amber-900',     addBtn: 'text-amber-800 hover:bg-amber-100',     dot: 'bg-amber-400' },
  clay:  { header: 'bg-orange-50 border-orange-300 text-orange-900',  addBtn: 'text-orange-800 hover:bg-orange-100',   dot: 'bg-orange-400' },
  dune:  { header: 'bg-yellow-50 border-yellow-300 text-yellow-900',  addBtn: 'text-yellow-800 hover:bg-yellow-100',   dot: 'bg-yellow-400' },
  river: { header: 'bg-sky-50 border-sky-300 text-sky-900',           addBtn: 'text-sky-800 hover:bg-sky-100',         dot: 'bg-sky-400' },
  moss:  { header: 'bg-emerald-50 border-emerald-300 text-emerald-900', addBtn: 'text-emerald-800 hover:bg-emerald-100', dot: 'bg-emerald-400' },
  brick: { header: 'bg-rose-50 border-rose-300 text-rose-900',        addBtn: 'text-rose-800 hover:bg-rose-100',       dot: 'bg-rose-400' },
  sky:   { header: 'bg-indigo-50 border-indigo-300 text-indigo-900',  addBtn: 'text-indigo-800 hover:bg-indigo-100',   dot: 'bg-indigo-400' },
  stone: { header: 'bg-stone-100 border-stone-300 text-stone-900',    addBtn: 'text-stone-800 hover:bg-stone-200',     dot: 'bg-stone-400' }
};

export const DEPTH_BADGE = {
  1: 'bg-stone-800 text-amber-50',
  2: 'bg-stone-500 text-amber-50',
  3: 'bg-stone-300 text-stone-700'
};

export const MAX_DEPTH = 3;
