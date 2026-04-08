// Tag schema definition (labels are now in i18n strings)
export const TAG_KEYS = ['common', 'linked', 'commonPending', 'linkedPending', 'review'];

export const TAG_META = {
  common:        { color: 'indigo', kind: 'confirmed' },
  linked:        { color: 'teal',   kind: 'confirmed' },
  commonPending: { color: 'indigo', kind: 'pending' },
  linkedPending: { color: 'teal',   kind: 'pending' },
  review:        { color: 'rose',   kind: 'review' }
};

// Tag pill styles per theme
export const TAG_PILL_STYLES = {
  sand: {
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
  },
  dark: {
    indigo: {
      on:  'bg-[#1e2a47] text-[#7aa2f7] border-[#3d59a1]',
      off: 'bg-transparent text-[#6e6e6e] border-[#3e3e42] hover:border-[#3d59a1] hover:text-[#7aa2f7]'
    },
    teal: {
      on:  'bg-[#1f3a3c] text-[#4ec9b0] border-[#28565a]',
      off: 'bg-transparent text-[#6e6e6e] border-[#3e3e42] hover:border-[#28565a] hover:text-[#4ec9b0]'
    },
    rose: {
      on:  'bg-[#3c1f2a] text-[#f48771] border-[#5a2842]',
      off: 'bg-transparent text-[#6e6e6e] border-[#3e3e42] hover:border-[#5a2842] hover:text-[#f48771]'
    }
  },
  light: {
    indigo: {
      on:  'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]',
      off: 'bg-white text-[#9e9e9e] border-[#e5e5e5] hover:border-[#bfdbfe] hover:text-[#1e40af]'
    },
    teal: {
      on:  'bg-[#cffafe] text-[#155e75] border-[#a5f3fc]',
      off: 'bg-white text-[#9e9e9e] border-[#e5e5e5] hover:border-[#a5f3fc] hover:text-[#155e75]'
    },
    rose: {
      on:  'bg-[#fde8e8] text-[#a51616] border-[#f8b4b4]',
      off: 'bg-white text-[#9e9e9e] border-[#e5e5e5] hover:border-[#f8b4b4] hover:text-[#a51616]'
    }
  }
};

export const normalizeTags = (t) => ({
  common:        !!t?.common,
  linked:        !!t?.linked,
  commonPending: !!t?.commonPending,
  linkedPending: !!t?.linkedPending,
  review:        !!t?.review
});
