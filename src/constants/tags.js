// Tag system: 5 tag types
export const TAG_DEFS = {
  common:        { label: '공통',     color: 'indigo', kind: 'confirmed' },
  linked:        { label: '연동',     color: 'teal',   kind: 'confirmed' },
  commonPending: { label: '공통예정', color: 'indigo', kind: 'pending' },
  linkedPending: { label: '연동예정', color: 'teal',   kind: 'pending' },
  review:        { label: '검토',     color: 'rose',   kind: 'review' }
};

export const TAG_PILL_STYLES = {
  indigo: {
    on:  'bg-indigo-100 text-indigo-700 border-indigo-300',
    off: 'bg-white text-stone-400 border-stone-200 hover:border-indigo-300 hover:text-indigo-600'
  },
  teal: {
    on:  'bg-teal-100 text-teal-700 border-teal-300',
    off: 'bg-white text-stone-400 border-stone-200 hover:border-teal-300 hover:text-teal-600'
  },
  rose: {
    on:  'bg-rose-100 text-rose-700 border-rose-300',
    off: 'bg-white text-stone-400 border-stone-200 hover:border-rose-300 hover:text-rose-600'
  }
};

export const normalizeTags = (t) => ({
  common:        !!t?.common,
  linked:        !!t?.linked,
  commonPending: !!t?.commonPending,
  linkedPending: !!t?.linkedPending,
  review:        !!t?.review
});
