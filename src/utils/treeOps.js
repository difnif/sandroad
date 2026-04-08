import { genNodeId } from './idGen.js';
import { normalizeTags } from '../constants/tags.js';

// Pure tree operations
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

// Deep clone with fresh IDs (used for cross-project paste)
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

// Normalize a node loaded from Firestore (in case schema changed)
export const normalizeNode = (n) => ({
  id: n.id || genNodeId(),
  name: n.name || '',
  description: n.description || '',
  tags: normalizeTags(n.tags),
  children: (n.children || []).map(normalizeNode)
});
