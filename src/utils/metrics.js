// Compute dashboard metrics from a project
export function computeMetrics(project) {
  if (!project) {
    return {
      d1: 0, d2: 0, d3: 0,
      avg12: 0, avg23: 0,
      missing: 0, pending: 0, review: 0,
      perColumn: {},
      missingList: [], pendingList: [], reviewList: []
    };
  }

  const cols = project.columns;
  let d1 = 0, d2 = 0, d3 = 0;
  const perColumn = {};
  const missingList = [];
  const pendingList = [];
  const reviewList = [];

  // Build map: linked node name -> Set of column keys
  const linkedByName = {};
  const visitForLinkMap = (nodes, colKey) => {
    for (const n of nodes) {
      if (n.tags?.linked) {
        const key = (n.name || '').trim();
        if (key) {
          if (!linkedByName[key]) linkedByName[key] = new Set();
          linkedByName[key].add(colKey);
        }
      }
      if (n.children?.length) visitForLinkMap(n.children, colKey);
    }
  };
  for (const c of cols) visitForLinkMap(project.structure[c.key] || [], c.key);

  const visit = (nodes, colKey, colLabel, depth, path) => {
    for (const n of nodes) {
      if (depth === 1) d1++;
      if (depth === 2) d2++;
      if (depth === 3) d3++;
      if (!perColumn[colKey]) perColumn[colKey] = { label: colLabel, d1: 0, d2: 0, d3: 0 };
      perColumn[colKey][`d${depth}`]++;

      const t = n.tags || {};
      if (t.commonPending || t.linkedPending) {
        pendingList.push({
          colLabel,
          path: [...path, n.name],
          kind: t.linkedPending ? '연동예정' : '공통예정'
        });
      }
      if (t.review) {
        reviewList.push({ colLabel, path: [...path, n.name] });
      }
      if (t.linked) {
        const key = (n.name || '').trim();
        if (key) {
          const inCols = linkedByName[key];
          if (!inCols || inCols.size < 2) {
            missingList.push({ colLabel, path: [...path, n.name], reason: '연동 짝 없음' });
          }
        } else {
          missingList.push({ colLabel, path: [...path, n.name], reason: '이름 비어있음' });
        }
      }

      if (n.children?.length) visit(n.children, colKey, colLabel, depth + 1, [...path, n.name]);
    }
  };
  for (const c of cols) visit(project.structure[c.key] || [], c.key, c.label, 1, []);

  const avg12 = d1 > 0 ? d2 / d1 : 0;
  const avg23 = d2 > 0 ? d3 / d2 : 0;

  return {
    d1, d2, d3,
    avg12: Math.round(avg12 * 10) / 10,
    avg23: Math.round(avg23 * 10) / 10,
    missing: missingList.length,
    pending: pendingList.length,
    review: reviewList.length,
    perColumn,
    missingList, pendingList, reviewList
  };
}
