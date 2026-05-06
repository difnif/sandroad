// Code Analyzer v2 — ZIP handling + comparison with existing project

import { genNodeId } from './idGen.js';

const CODE_EXTS = new Set(['js','jsx','ts','tsx','vue','svelte','py','rb','go','rs','java','kt','swift','json','yaml','yml','toml','sql','prisma','graphql','gql','md','txt']);
const SKIP = [/node_modules\//,/\.git\//,/dist\//,/build\//,/\.next\//,/\.cache\//,/coverage\//,/__pycache__\//,/package-lock/,/yarn\.lock/,/\.min\.js$/,/\.map$/,/\.chunk\./,/\.(png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|mp4|mp3|wav|pdf)$/];

export async function extractZip(file) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const files = [], fileList = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || SKIP.some(p => p.test(path))) continue;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const isCode = CODE_EXTS.has(ext);
    const size = entry._data?.uncompressedSize || 0;
    fileList.push({ path, ext, size, isCode });
    if (isCode && size < 100000) { try { files.push({ path, content: await entry.async('text'), ext, size }); } catch {} }
  }
  let packageJson = null;
  const pkgEntry = zip.file(/package\.json$/)?.[0];
  if (pkgEntry) try { packageJson = await pkgEntry.async('text'); } catch {}
  return { files, fileList, packageJson };
}

export async function stepScan(fileList, packageJson) {
  const fl = fileList.map(f => `${f.isCode ? '📄' : '📦'} ${f.path} (${fmt(f.size)})`).join('\n');
  const r = await callAPI('scan', { fileList: fl, packageJson: packageJson?.slice(0, 5000) || 'not found' });
  return r.parsed || JSON.parse(r.text);
}

export async function stepAnalyze(scanResult, files) {
  const keyPaths = new Set(scanResult.keyFiles || []);
  const auto = [/routes?\./i,/router\./i,/app\./i,/index\./i,/schema\./i,/model/i,/middleware/i,/config/i,/\.env/,/firebase/i,/supabase/i];
  const selected = files.filter(f => keyPaths.has(f.path) || auto.some(p => p.test(f.path))).slice(0, 20);
  const fc = selected.map(f => `--- ${f.path} ---\n${f.content.length > 3000 ? f.content.slice(0, 3000) + '\n// truncated' : f.content}\n`).join('\n');
  const ss = JSON.stringify({ framework: scanResult.framework, detectedPattern: scanResult.detectedPattern, structure: scanResult.structure, summary: scanResult.summary }, null, 2);
  const r = await callAPI('analyze', { scanSummary: ss, fileContents: fc });
  return r.parsed || JSON.parse(r.text);
}

// NEW: Compare code analysis with existing sandroad project
export async function stepCompare(analysisResult, project, lang) {
  const codeStructure = JSON.stringify({
    columns: analysisResult.columns,
    items: (analysisResult.items || []).map(i => ({ name: i.name, buildingType: i.buildingType, parentName: i.parentName, column: i.column })),
    roads: (analysisResult.roads || []).map(r => ({ from: r.from, to: r.to, vehicle: r.vehicle, dataType: r.dataType }))
  }, null, 2);

  const sandStructure = buildSandSummary(project);
  const r = await callAPI('compare', { codeStructure, sandStructure, lang });
  return r.parsed || JSON.parse(r.text);
}

export async function stepVerify(currentStructure, feedback) {
  const r = await callAPI('verify', { currentStructure: JSON.stringify(currentStructure, null, 2), feedback });
  return r.parsed || JSON.parse(r.text);
}

export async function stepNotes(structureSummary, rawNotes) {
  const r = await callAPI('notes', { structureSummary, rawNotes });
  return r.parsed || JSON.parse(r.text);
}

// Convert analysis to project data
export function analysisToProjectData(analysisResult, existingProject = null) {
  const COLORS = ['sand','clay','river','moss','brick','sky','dune','stone'];
  const columns = (analysisResult.columns || []).map((c, i) => ({ key: `col_${i+1}`, label: c.label, color: c.color || COLORS[i%COLORS.length] }));
  const structure = {}, nameToId = {};
  for (const col of columns) structure[col.key] = [];
  const byCol = {};
  for (const item of (analysisResult.items || [])) { const ci = item.column || 0; if (!byCol[ci]) byCol[ci] = []; byCol[ci].push(item); }
  for (const [ci, items] of Object.entries(byCol)) {
    const col = columns[parseInt(ci)]; if (!col) continue;
    const roots = items.filter(i => !i.parentName), children = items.filter(i => i.parentName);
    for (const item of roots) { const n = mkNode(item); nameToId[item.name] = n.id; structure[col.key].push(n); }
    let rem = [...children], passes = 5;
    while (rem.length > 0 && passes-- > 0) {
      const next = [];
      for (const item of rem) { const pid = nameToId[item.parentName]; if (pid) { const n = mkNode(item); nameToId[item.name] = n.id; insertChild(structure[col.key], pid, n); } else next.push(item); }
      if (next.length === rem.length) { for (const item of next) { const n = mkNode(item); nameToId[item.name] = n.id; structure[col.key].push(n); } break; }
      rem = next;
    }
  }
  const roads = (analysisResult.roads || []).map(r => ({ id: genNodeId(), from: nameToId[r.from]||'', to: nameToId[r.to]||'', type: r.roadType||'main', vehicle: r.vehicle||'car', dataType: r.dataType||'content', label: r.label||'' })).filter(r => r.from && r.to);
  return { columns, structure, roads };
}

// Apply user-approved comparison results to project
export function applyComparisonResults(project, approvedItems, approvedRoads, approvedRenames) {
  const structure = JSON.parse(JSON.stringify(project.structure));
  const roads = [...(project.roads || [])];
  const cols = [...project.columns];
  const nameToId = buildNameToId(project);

  // Apply renames
  for (const rename of (approvedRenames || [])) {
    const id = nameToId[rename.sandName];
    if (id) {
      for (const col of cols) {
        updateNameInTree(structure[col.key] || [], id, rename.codeName);
      }
      nameToId[rename.codeName] = id;
    }
  }

  // Add new items
  for (const item of (approvedItems || [])) {
    const colIdx = item.column || 0;
    const col = cols[colIdx];
    if (!col) continue;
    const node = mkNode(item);
    nameToId[item.name] = node.id;
    if (item.parentName && nameToId[item.parentName]) {
      insertChild(structure[col.key], nameToId[item.parentName], node);
    } else {
      structure[col.key].push(node);
    }
  }

  // Add new roads
  const existingPairs = new Set(roads.map(r => `${r.from}|${r.to}`));
  for (const road of (approvedRoads || [])) {
    const fromId = nameToId[road.from], toId = nameToId[road.to];
    if (!fromId || !toId) continue;
    const key = `${fromId}|${toId}`, keyR = `${toId}|${fromId}`;
    if (existingPairs.has(key) || existingPairs.has(keyR)) continue;
    roads.push({ id: genNodeId(), from: fromId, to: toId, type: road.roadType || 'main', vehicle: road.vehicle || 'car', dataType: road.dataType || 'content', label: road.label || '' });
    existingPairs.add(key);
  }

  return { columns: cols, structure, roads };
}

// Helpers
async function callAPI(step, data) {
  const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step, data }) });
  if (!r.ok) throw new Error(`${step} failed: ${r.status}`);
  return r.json();
}

function buildSandSummary(project) {
  const lines = [];
  for (const col of project.columns || []) {
    lines.push(`[${col.label}]`);
    walkTree(project.structure[col.key] || [], (n, pid, d) => {
      lines.push(`${'  '.repeat(d)}${n.buildingType || 'page'}: ${n.name || '?'}`);
    });
  }
  const roads = project.roads || [];
  const nm = buildNameToId(project);
  const idToName = Object.fromEntries(Object.entries(nm).map(([k, v]) => [v, k]));
  lines.push('\nRoads:');
  roads.forEach(r => lines.push(`  ${idToName[r.from]||'?'} → ${idToName[r.to]||'?'} [${r.vehicle||'car'}]`));
  return lines.join('\n');
}

function buildNameToId(project) {
  const m = {};
  for (const col of project.columns || []) walkTree(project.structure[col.key] || [], (n) => { m[n.name] = n.id; });
  return m;
}

function walkTree(nodes, cb, pid = null, d = 1) { for (const n of nodes) { cb(n, pid, d); if (n.children?.length) walkTree(n.children, cb, n.id, d + 1); } }
function mkNode(item) { return { id: genNodeId(), name: item.name || 'unnamed', description: item.description || '', children: [], tags: {}, buildingType: item.buildingType || 'page', archPattern: item.archPattern || null, archLayer: item.archLayer || null, placed: true }; }
function insertChild(tree, pid, child) { for (const n of tree) { if (n.id === pid) { if (!n.children) n.children = []; n.children.push(child); return true; } if (n.children && insertChild(n.children, pid, child)) return true; } return false; }
function updateNameInTree(tree, id, newName) { for (const n of tree) { if (n.id === id) { n.name = newName; return; } if (n.children) updateNameInTree(n.children, id, newName); } }
function fmt(b) { return b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`; }
