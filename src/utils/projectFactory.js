import { genProjectId } from './idGen.js';
import { DEFAULT_COLUMN_COLOR } from '../constants/themes.js';

// Create a default 4-column project. The column color names are valid in all themes
// because each theme defines its own palette and the editor maps unknown colors to the
// theme's first available color.
export const makeEmptyProject = (name, themeId = 'sand') => {
  const defaultColor = DEFAULT_COLUMN_COLOR[themeId] || 'sand';
  // Pick 4 distinct colors from theme palette
  // For simplicity we use 4 placeholder keys; the editor falls back to theme color if missing
  const cols = [
    { key: 'col1', label: themeId === 'sand' ? '구역 1' : 'column_1', color: defaultColor },
    { key: 'col2', label: themeId === 'sand' ? '구역 2' : 'column_2', color: defaultColor },
    { key: 'col3', label: themeId === 'sand' ? '구역 3' : 'column_3', color: defaultColor },
    { key: 'col4', label: themeId === 'sand' ? '구역 4' : 'column_4', color: defaultColor }
  ];
  return {
    id: genProjectId(),
    name: name || (themeId === 'sand' ? '새 도시' : 'new-project'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    columns: cols,
    structure: Object.fromEntries(cols.map(c => [c.key, []]))
  };
};

// Generate a unique column key
export const genColumnKey = (existingKeys) => {
  let i = 1;
  while (existingKeys.includes(`col${i}`)) i++;
  return `col${i}`;
};
