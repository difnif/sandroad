// Flatten a tree to a linear list for DnD.
// Nodes that are NOT expanded still appear in the flat list, but their
// children are stashed in `hiddenChildren` so the subtree travels as one unit.

export function flattenVisible(nodes, expandedIds, depth = 1, parentId = null) {
  const out = [];
  nodes.forEach((node, idx) => {
    const hasChildren = !!(node.children && node.children.length);
    const isExpanded = hasChildren && expandedIds.has(node.id);
    const shallow = {
      id: node.id,
      name: node.name,
      description: node.description,
      tags: node.tags
    };
    out.push({
      id: node.id,
      depth,
      parentId,
      siblingIndex: idx,
      node: shallow,
      hasChildren,
      hiddenChildren: (hasChildren && !isExpanded) ? node.children : null
    });
    if (isExpanded) {
      out.push(...flattenVisible(node.children, expandedIds, depth + 1, node.id));
    }
  });
  return out;
}

// Rebuild a nested tree from a flat list using the `depth` field.
// Uses a stack to determine parent-child relationships.
export function rebuildTree(flatItems) {
  const roots = [];
  const stack = []; // { node, depth }
  for (const item of flatItems) {
    const newNode = {
      ...item.node,
      children: item.hiddenChildren ? [...item.hiddenChildren] : []
    };
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(newNode);
    } else {
      stack[stack.length - 1].node.children.push(newNode);
    }
    stack.push({ node: newNode, depth: item.depth });
  }
  return roots;
}

// Return the range [start, end) of a subtree starting at startIdx in the flat list.
// The range covers the root at startIdx plus all visible descendants.
export function getSubtreeRange(flatItems, startIdx) {
  const start = flatItems[startIdx];
  let end = startIdx + 1;
  while (end < flatItems.length && flatItems[end].depth > start.depth) {
    end++;
  }
  return { start: startIdx, end };
}

// Ensure no item's depth exceeds (previous item's depth + 1).
// Keeps the tree well-formed after arbitrary reorderings.
export function normalizeFlatDepth(flatItems) {
  const out = [];
  for (let i = 0; i < flatItems.length; i++) {
    const prevDepth = i > 0 ? out[i - 1].depth : 0;
    const clamped = Math.min(flatItems[i].depth, prevDepth + 1);
    const minDepth = 1;
    out.push({ ...flatItems[i], depth: Math.max(minDepth, clamped) });
  }
  return out;
}
