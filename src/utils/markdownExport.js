import { formatColumnNumber, formatDepthNumber } from './numbering.js';

const treeToMd = (nodes, depth, siblingStart = 0) => {
  let md = '';
  nodes.forEach((node, idx) => {
    const num = formatDepthNumber(depth, siblingStart + idx);
    const h = '#'.repeat(Math.min(depth + 1, 6));
    const badges = [];
    const t = node.tags || {};
    if (t.common) badges.push('`공통`');
    if (t.linked) badges.push('`연동`');
    if (t.commonPending) badges.push('`공통예정`');
    if (t.linkedPending) badges.push('`연동예정`');
    if (t.review) badges.push('`검토`');
    md += `${h} ${num} ${node.name}${badges.length ? ' ' + badges.join(' ') : ''}\n\n`;
    if (node.description) md += `${node.description}\n\n`;
    if (node.children?.length) md += treeToMd(node.children, depth + 1);
  });
  return md;
};

// Export entire project as one markdown file
export function exportProjectAsMarkdown(project, metrics) {
  if (!project) return;
  const date = new Date().toISOString().split('T')[0];
  let md = `# ${project.name}\n\n`;
  md += `> sandroad export · ${date}\n\n---\n\n`;
  project.columns.forEach((c, colIdx) => {
    const roman = formatColumnNumber(colIdx);
    md += `# ${roman}. ${c.label}\n\n`;
    const items = project.structure[c.key] || [];
    if (!items.length) md += `_(empty)_\n\n`;
    else md += treeToMd(items, 1);
    md += `---\n\n`;
  });
  if (metrics && (metrics.missingList.length || metrics.pendingList.length || metrics.reviewList.length)) {
    md += `# 검토 항목\n\n`;
    if (metrics.missingList.length) {
      md += `## 연결 누락 (${metrics.missingList.length})\n\n`;
      for (const it of metrics.missingList) md += `- **[${it.colLabel}]** ${it.path.join(' > ')} — ${it.reason}\n`;
      md += `\n`;
    }
    if (metrics.pendingList.length) {
      md += `## 예정 (${metrics.pendingList.length})\n\n`;
      for (const it of metrics.pendingList) md += `- **[${it.colLabel}]** ${it.path.join(' > ')} · ${it.kind}\n`;
      md += `\n`;
    }
    if (metrics.reviewList.length) {
      md += `## 검토 필요 (${metrics.reviewList.length})\n\n`;
      for (const it of metrics.reviewList) md += `- **[${it.colLabel}]** ${it.path.join(' > ')}\n`;
      md += `\n`;
    }
  }
  downloadMd(md, `sandroad-${slugify(project.name)}-${date}.md`);
}

// Export a single column as a separate markdown file
export function exportColumnAsMarkdown(project, colKey, colLabel, colIndex) {
  if (!project) return;
  const date = new Date().toISOString().split('T')[0];
  const roman = formatColumnNumber(colIndex);
  const items = project.structure[colKey] || [];

  let md = `# ${roman}. ${colLabel}\n\n`;
  md += `> ${project.name} · sandroad export · ${date}\n\n---\n\n`;

  if (!items.length) {
    md += `_(empty)_\n\n`;
  } else {
    md += treeToMd(items, 1);
  }

  downloadMd(md, `sandroad-${slugify(project.name)}-${slugify(colLabel)}-${date}.md`);
}

function downloadMd(md, filename) {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function slugify(s) {
  return (s || '').replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '').slice(0, 40);
}
