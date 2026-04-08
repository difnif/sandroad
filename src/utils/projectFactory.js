import { genProjectId } from './idGen.js';

export const makeEmptyProject = (name) => {
  const cols = [
    { key: 'col1', label: '구역 1', color: 'sand' },
    { key: 'col2', label: '구역 2', color: 'river' },
    { key: 'col3', label: '구역 3', color: 'moss' },
    { key: 'col4', label: '구역 4', color: 'brick' }
  ];
  return {
    id: genProjectId(),
    name: name || '새 도시',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    columns: cols,
    structure: Object.fromEntries(cols.map(c => [c.key, []]))
  };
};
