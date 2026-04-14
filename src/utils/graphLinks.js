// Extract cross-column "linked" relationships from a project.
// Two nodes in different columns with the same name AND both tagged "linked"
// are considered connected.

export function extractGraphData(project) {
  if (!project) return { nodes: [], links: [] };

  const nodes = [];
  const linkedByName = {}; // name -> [nodeRef]

  // Walk all columns and collect nodes
  for (const col of project.columns || []) {
    const items = project.structure?.[col.key] || [];
    walk(items, col.key, col.label, col.color, 1, null, [], nodes, linkedByName);
  }

  // Build links from same-name "linked" tagged nodes across columns
  const links = [];
  const seen = new Set();
  for (const name of Object.keys(linkedByName)) {
    const group = linkedByName[name];
    if (group.length < 2) continue;
    // Connect every pair within the group
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.col === b.col) continue; // same column - skip
        const key = [a.id, b.id].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ from: a.id, to: b.id, label: name });
      }
    }
  }

  return { nodes, links };
}

function walk(items, colKey, colLabel, colColor, depth, parentId, path, outNodes, linkedMap) {
  for (const item of items) {
    const node = {
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      depth,
      col: colKey,
      colLabel,
      colColor,
      parentId,
      path: [...path, item.name || ''],
      tags: item.tags || {}
    };
    outNodes.push(node);

    // Track linked-tagged nodes by name
    if (item.tags?.linked) {
      const key = (item.name || '').trim();
      if (key) {
        if (!linkedMap[key]) linkedMap[key] = [];
        linkedMap[key].push(node);
      }
    }

    if (item.children?.length) {
      walk(item.children, colKey, colLabel, colColor, depth + 1, item.id, node.path, outNodes, linkedMap);
    }
  }
}
