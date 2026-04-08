const treeToMd = (nodes, depth) => {
  let md = '';
  for (const node of nodes) {
    const h = '#'.repeat(Math.min(depth + 1, 6));
    const badges = [];
    const t = node.tags || {};
    if (t.common) badges.push('`공통`');
    if (t.linked) badges.push('`연동`');
    if (t.commonPending) badges.push('`공통예정`');
    if (t.linkedPending) badges.push('`연동예정`');
    if (t.review) badges.push('`검토`');
    md += `${h} ${node.name}${badges.length ? ' ' + badges.join(' ') : ''}\n\n`;
    if (node.description) md += `${node.description}\n\n`;
    if (node.children?.length) md += treeToMd(node.children, depth + 1);
  }
  return md;
};

export function exportProjectAsMarkdown(project, metrics) {
  if (!project) return;
  const date = new Date().toISOString().split('T')[0];
  let md = `# ${project.name}\n\n`;
  md += `> sandroad 구조 내보내기 · ${date}\n\n---\n\n`;
  for (const c of project.columns) {
    md += `# ${c.label}\n\n`;
    const items = project.structure[c.key] || [];
    if (!items.length) md += `_(항목 없음)_\n\n`;
    else md += treeToMd(items, 1);
    md += `---\n\n`;
  }
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
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sandroad-${project.name.replace(/\s+/g, '-')}-${date}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
