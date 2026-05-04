// Tree Import/Export utilities
// Supports: .md, .txt, .xlsx
// Format is consistent: export → import roundtrip preserves structure

import { genNodeId } from './idGen.js';

// ========== EXPORT ==========

// Export all columns as Markdown
export function exportAsMarkdown(project) {
  if (!project) return '';
  const lines = [];
  lines.push(`# ${project.name || 'Untitled'}`);
  lines.push('');

  for (const col of project.columns || []) {
    lines.push(`## ${col.label}`);
    lines.push('');
    const items = project.structure[col.key] || [];
    exportTreeMd(items, lines, 0);
    lines.push('');
  }
  return lines.join('\n');
}

function exportTreeMd(nodes, lines, depth) {
  const indent = '  '.repeat(depth);
  nodes.forEach(node => {
    lines.push(`${indent}- ${node.name || '(unnamed)'}`);
    if (node.children?.length) {
      exportTreeMd(node.children, lines, depth + 1);
    }
  });
}

// Export as plain text
export function exportAsText(project) {
  if (!project) return '';
  const lines = [];
  lines.push(`=== ${project.name || 'Untitled'} ===`);
  lines.push('');

  for (const col of project.columns || []) {
    lines.push(`[${col.label}]`);
    const items = project.structure[col.key] || [];
    exportTreeTxt(items, lines, 0);
    lines.push('');
  }
  return lines.join('\n');
}

function exportTreeTxt(nodes, lines, depth) {
  const indent = '  '.repeat(depth);
  nodes.forEach(node => {
    lines.push(`${indent}- ${node.name || '(unnamed)'}`);
    if (node.children?.length) {
      exportTreeTxt(node.children, lines, depth + 1);
    }
  });
}

// Export as XLSX data (2D array for SheetJS)
// Format: each row = one item, column position = depth
// Col headers: [구역, 1차, 2차, 3차, 4차, 5차]
export function exportAsXlsxData(project, lang = 'ko') {
  if (!project) return [];
  const headers = lang === 'ko'
    ? ['구역', '1차', '2차', '3차', '4차', '5차']
    : ['District', 'L1', 'L2', 'L3', 'L4', 'L5'];
  const rows = [headers];

  for (const col of project.columns || []) {
    const items = project.structure[col.key] || [];
    if (items.length === 0) {
      const row = new Array(6).fill('');
      row[0] = col.label;
      rows.push(row);
    } else {
      flattenToRows(items, col.label, 1, rows);
    }
  }
  return rows;
}

function flattenToRows(nodes, colLabel, depth, rows) {
  nodes.forEach((node, idx) => {
    const row = new Array(6).fill('');
    if (idx === 0 || depth === 1) row[0] = (idx === 0 && depth === 1) ? colLabel : '';
    row[Math.min(depth, 5)] = node.name || '';
    rows.push(row);
    if (node.children?.length) {
      flattenToRows(node.children, '', depth + 1, rows);
    }
  });
}

// ========== IMPORT ==========

// Parse markdown/text into columns + structure
export function importFromText(text) {
  const lines = text.split('\n');
  const columns = [];
  const structure = {};
  let currentCol = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect column header
    // MD: ## ColumnName  or  # ColumnName (if only one level of #)
    // TXT: [ColumnName]
    const mdColMatch = trimmed.match(/^##\s+(.+)$/);
    const txtColMatch = trimmed.match(/^\[(.+)\]$/);
    const mdTitleMatch = trimmed.match(/^#\s+(.+)$/);

    if (mdColMatch || txtColMatch) {
      const label = (mdColMatch || txtColMatch)[1].trim();
      const key = `col_${columns.length + 1}`;
      currentCol = { key, label, color: pickColor(columns.length) };
      columns.push(currentCol);
      structure[key] = [];
      continue;
    }

    // Skip title line (# Project Name or === Name ===)
    if (mdTitleMatch || trimmed.match(/^===.+===$/)) continue;

    // Parse item line: count indent, extract name
    if (!currentCol) {
      // Auto-create a default column if items appear before any column header
      const key = 'col_1';
      currentCol = { key, label: 'Main', color: 'sand' };
      columns.push(currentCol);
      structure[key] = [];
    }

    const itemMatch = line.match(/^(\s*)-\s+(.+)$/);
    if (itemMatch) {
      const indent = itemMatch[1].length;
      const depth = Math.floor(indent / 2); // 2 spaces per level
      const name = itemMatch[2].trim();

      const node = { id: genNodeId(), name, children: [] };
      insertAtDepth(structure[currentCol.key], node, depth);
    }
  }

  return { columns, structure };
}

// Parse XLSX data (2D array) into columns + structure
export function importFromXlsxData(rows) {
  if (!rows || rows.length < 2) return { columns: [], structure: {} };

  const columns = [];
  const structure = {};
  let currentCol = null;

  // Skip header row
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(cell => !cell)) continue;

    // Check column (first cell)
    const colName = String(row[0] || '').trim();
    if (colName) {
      const key = `col_${columns.length + 1}`;
      currentCol = { key, label: colName, color: pickColor(columns.length) };
      columns.push(currentCol);
      structure[key] = [];
    }

    if (!currentCol) {
      const key = 'col_1';
      currentCol = { key, label: 'Main', color: 'sand' };
      columns.push(currentCol);
      structure[key] = [];
    }

    // Find the deepest non-empty cell (that's the item at that depth)
    for (let c = 5; c >= 1; c--) {
      const val = String(row[c] || '').trim();
      if (val) {
        const depth = c - 1; // col 1 = depth 0 (L1), col 2 = depth 1 (L2), etc.
        const node = { id: genNodeId(), name: val, children: [] };
        insertAtDepth(structure[currentCol.key], node, depth);
        break;
      }
    }
  }

  return { columns, structure };
}

// Insert node at correct depth in tree
function insertAtDepth(tree, node, targetDepth) {
  if (targetDepth === 0) {
    tree.push(node);
    return;
  }

  // Find the last item at depth 0 to traverse into
  if (tree.length === 0) {
    // No parent exists, create at root level
    tree.push(node);
    return;
  }

  let current = tree[tree.length - 1];
  for (let d = 1; d < targetDepth; d++) {
    if (!current.children || current.children.length === 0) {
      // Can't go deeper, attach here
      if (!current.children) current.children = [];
      current.children.push(node);
      return;
    }
    current = current.children[current.children.length - 1];
  }

  if (!current.children) current.children = [];
  current.children.push(node);
}

// Color rotation for columns
const COLORS = ['sand', 'clay', 'river', 'moss', 'brick', 'sky', 'dune', 'stone'];
function pickColor(index) {
  return COLORS[index % COLORS.length];
}

// ========== FILE HELPERS ==========

export function downloadAsFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
