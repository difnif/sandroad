import { genNodeId } from './idGen.js';
import { normalizeTags } from '../constants/tags.js';

// ============================================================
// Basic tree ops (existing API)
// ============================================================
export const updateInTree = (nodes, id, updates) =>
  nodes.map(n => n.id === id
    ? { ...n, ...updates }
    : (n.children?.length ? { ...n, children: updateInTree(n.children, id, updates) } : n)
  );

export const toggleTagInTree = (nodes, id, tagName) =>
  nodes.map(n => {
    if (n.id === id) {
      const current = normalizeTags(n.tags);
      return { ...n, tags: { ...current, [tagName]: !current[tagName] } };
    }
    if (n.children?.length) return { ...n, children: toggleTagInTree(n.children, id, tagName) };
    return n;
  });

export const addChildInTree = (nodes, parentId, newNode) =>
  nodes.map(n => {
    if (n.id === parentId) return { ...n, children: [...(n.children || []), newNode] };
    if (n.children?.length) return { ...n, children: addChildInTree(n.children, parentId, newNode) };
    return n;
  });

export const removeFromTree = (nodes, id) =>
  nodes
    .filter(n => n.id !== id)
    .map(n => n.children?.length ? { ...n, children: removeFromTree(n.children, id) } : n);

export const findNodeInTree = (nodes, id) => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const f = findNodeInTree(n.children, id);
      if (f) return f;
    }
  }
  return null;
};

export const findDepthInTree = (nodes, id, depth = 1) => {
  for (const n of nodes) {
    if (n.id === id) return depth;
    if (n.children?.length) {
      const d = findDepthInTree(n.children, id, depth + 1);
      if (d) return d;
    }
  }
  return 0;
};

export const collectAllIds = (nodes) => {
  const out = [];
  for (const n of nodes) {
    out.push(n.id);
    if (n.children) out.push(...collectAllIds(n.children));
  }
  return out;
};

export const countNodes = (nodes) => {
  let c = 0;
  for (const n of nodes) {
    c++;
    if (n.children) c += countNodes(n.children);
  }
  return c;
};

export const cloneNodeWithNewIds = (node) => ({
  id: genNodeId(),
  name: node.name || '',
  description: node.description || '',
  tags: { ...normalizeTags(node.tags) },
  children: (node.children || []).map(cloneNodeWithNewIds)
});

export const newEmptyNode = () => ({
  id: genNodeId(),
  name: '새 항목',
  description: '',
  tags: normalizeTags({}),
  children: []
});

export const normalizeNode = (n) => ({
  id: n.id || genNodeId(),
  name: n.name || '',
  description: n.description || '',
  tags: normalizeTags(n.tags),
  children: (n.children || []).map(normalizeNode)
});

// ============================================================
// Path-based operations for DnD and indent/outdent
// ============================================================

// Return the index path from root to node id, or null if not found.
// E.g. for `A.B.C`, path might be [0, 1, 2].
export const findPath = (nodes, id, path = []) => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return [...path, i];
    if (nodes[i].children?.length) {
      const p = findPath(nodes[i].children, id, [...path, i]);
      if (p) return p;
    }
  }
  return null;
};

export const getNodeAtPath = (nodes, path) => {
  let arr = nodes;
  let node = null;
  for (const idx of path) {
    node = arr[idx];
    if (!node) return null;
    arr = node.children || [];
  }
  return node;
};

// Immutably remove at the given path. Returns { newNodes, removed }.
export const removeAtPath = (nodes, path) => {
  if (path.length === 1) {
    const idx = path[0];
    return {
      newNodes: [...nodes.slice(0, idx), ...nodes.slice(idx + 1)],
      removed: nodes[idx]
    };
  }
  const idx = path[0];
  const child = nodes[idx];
  const { newNodes: newChildren, removed } = removeAtPath(child.children || [], path.slice(1));
  const newChild = { ...child, children: newChildren };
  return {
    newNodes: [...nodes.slice(0, idx), newChild, ...nodes.slice(idx + 1)],
    removed
  };
};

// Immutably insert `item` at the given path.
// The final index in path is the insertion position in its parent array.
export const insertAtPath = (nodes, path, item) => {
  if (path.length === 1) {
    const idx = path[0];
    return [...nodes.slice(0, idx), item, ...nodes.slice(idx)];
  }
  const idx = path[0];
  const child = nodes[idx];
  const newChildren = insertAtPath(child.children || [], path.slice(1), item);
  const newChild = { ...child, children: newChildren };
  return [...nodes.slice(0, idx), newChild, ...nodes.slice(idx + 1)];
};

// Maximum depth of a subtree rooted at `node` (leaf = 1)
export const getSubtreeDepth = (node) => {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getSubtreeDepth));
};

// Outdent: move node one level up, placed right after its parent.
// Returns the new tree array, or the original if the operation isn't valid.
export const outdentInTree = (nodes, id) => {
  const path = findPath(nodes, id);
  if (!path || path.length < 2) return nodes;
  const { newNodes, removed } = removeAtPath(nodes, path);
  const parentPath = path.slice(0, -1);
  const parentIndex = parentPath[parentPath.length - 1];
  const grandparentPath = parentPath.slice(0, -1);
  const insertPath = [...grandparentPath, parentIndex + 1];
  return insertAtPath(newNodes, insertPath, removed);
};

// Indent: move node under its previous sibling (as last child).
// Returns the new tree array, or the original if the operation isn't valid.
export const indentInTree = (nodes, id, maxDepth) => {
  const path = findPath(nodes, id);
  if (!path) return nodes;
  const siblingIndex = path[path.length - 1];
  if (siblingIndex === 0) return nodes; // no previous sibling
  const node = getNodeAtPath(nodes, path);
  if (!node) return nodes;
  const currentDepth = path.length;
  const subDepth = getSubtreeDepth(node);
  if (currentDepth + subDepth > maxDepth) return nodes;

  const { newNodes, removed } = removeAtPath(nodes, path);
  const prevSiblingPath = [...path.slice(0, -1), siblingIndex - 1];
  const prevSibling = getNodeAtPath(newNodes, prevSiblingPath);
  if (!prevSibling) return nodes;
  const prevChildCount = (prevSibling.children || []).length;
  const insertPath = [...prevSiblingPath, prevChildCount];
  return insertAtPath(newNodes, insertPath, removed);
};

// Move node up among its siblings (swap with previous sibling). Subtree stays intact.
export const moveUpInTree = (nodes, id) => {
  const path = findPath(nodes, id);
  if (!path) return nodes;
  const idx = path[path.length - 1];
  if (idx === 0) return nodes;
  const parentPath = path.slice(0, -1);
  const container = parentPath.length === 0 ? nodes : (getNodeAtPath(nodes, parentPath)?.children || []);
  const swapped = [...container];
  [swapped[idx - 1], swapped[idx]] = [swapped[idx], swapped[idx - 1]];
  if (parentPath.length === 0) return swapped;
  return replaceChildrenAtPath(nodes, parentPath, swapped);
};

export const moveDownInTree = (nodes, id) => {
  const path = findPath(nodes, id);
  if (!path) return nodes;
  const idx = path[path.length - 1];
  const parentPath = path.slice(0, -1);
  const container = parentPath.length === 0 ? nodes : (getNodeAtPath(nodes, parentPath)?.children || []);
  if (idx >= container.length - 1) return nodes;
  const swapped = [...container];
  [swapped[idx], swapped[idx + 1]] = [swapped[idx + 1], swapped[idx]];
  if (parentPath.length === 0) return swapped;
  return replaceChildrenAtPath(nodes, parentPath, swapped);
};

// Helper: produce a new tree where the children array at `path` is replaced.
const replaceChildrenAtPath = (nodes, path, newChildren) => {
  if (path.length === 0) return newChildren;
  const idx = path[0];
  const child = nodes[idx];
  const updatedChild = {
    ...child,
    children: path.length === 1
      ? newChildren
      : replaceChildrenAtPath(child.children || [], path.slice(1), newChildren)
  };
  return [...nodes.slice(0, idx), updatedChild, ...nodes.slice(idx + 1)];
};

// Collect selected subtrees and return a modified tree without them.
// Used for multi-move operations.
export const extractNodes = (nodes, ids) => {
  let current = nodes;
  const collected = [];
  const idList = Array.isArray(ids) ? [...ids] : [...ids.values()];
  for (const id of idList) {
    const path = findPath(current, id);
    if (!path) continue;
    const node = getNodeAtPath(current, path);
    if (!node) continue;
    collected.push(node);
    const { newNodes } = removeAtPath(current, path);
    current = newNodes;
  }
  return { tree: current, collected };
};
