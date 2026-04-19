import { useEffect, useCallback } from 'react';

// Keyboard shortcuts for the editor.
// Works by inspecting the focused element to find which tree node it belongs to.
// Tree nodes should have data-node-id and data-col-key attributes on their container.

export function useKeyboardShortcuts({
  enabled = true,
  onIndent,        // (colKey, nodeId) => void
  onOutdent,       // (colKey, nodeId) => void
  onMoveUp,        // (colKey, nodeId) => void
  onMoveDown,      // (colKey, nodeId) => void
  onAddSibling,    // (colKey, nodeId) => void
  onAddChild,      // (colKey, nodeId) => void
  onDelete,        // (colKey, nodeId, name) => void
  onCopy,          // (colKey, nodeId) => void
  onPaste,         // (colKey, nodeId) => void — paste as child
  onToggleExpand,  // (nodeId) => void
  onSelectAll,     // () => void
  onClearSelection,// () => void
  onSave,          // () => void
  onNavigateGraph, // () => void
  selectedIds,     // Set
}) {
  const handler = useCallback((e) => {
    if (!enabled) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key;

    // --- Global shortcuts (work anywhere) ---

    // Ctrl+G → graph view
    if (ctrl && key === 'g') {
      e.preventDefault();
      onNavigateGraph?.();
      return;
    }

    // Ctrl+S → save (prevent browser save dialog)
    if (ctrl && key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Escape → clear selection
    if (key === 'Escape') {
      onClearSelection?.();
      return;
    }

    // Ctrl+A → select all (only when not in a text input)
    if (ctrl && key === 'a') {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        onSelectAll?.();
        return;
      }
    }

    // --- Node-specific shortcuts ---
    // Find the focused node from the active element
    const nodeInfo = getNodeFromActiveElement();
    if (!nodeInfo) return;

    const { nodeId, colKey, nodeName } = nodeInfo;

    // Tab → indent, Shift+Tab → outdent
    if (key === 'Tab') {
      e.preventDefault();
      if (shift) {
        onOutdent?.(colKey, nodeId);
      } else {
        onIndent?.(colKey, nodeId);
      }
      // Re-focus the input after tree restructure
      requestAnimationFrame(() => refocusNode(nodeId));
      return;
    }

    // Ctrl+↑ → move up
    if (ctrl && key === 'ArrowUp') {
      e.preventDefault();
      onMoveUp?.(colKey, nodeId);
      requestAnimationFrame(() => refocusNode(nodeId));
      return;
    }

    // Ctrl+↓ → move down
    if (ctrl && key === 'ArrowDown') {
      e.preventDefault();
      onMoveDown?.(colKey, nodeId);
      requestAnimationFrame(() => refocusNode(nodeId));
      return;
    }

    // Ctrl+Enter → add sibling below
    if (ctrl && key === 'Enter') {
      e.preventDefault();
      onAddSibling?.(colKey, nodeId);
      return;
    }

    // Ctrl+Shift+Enter → add child
    if (ctrl && shift && key === 'Enter') {
      e.preventDefault();
      onAddChild?.(colKey, nodeId);
      return;
    }

    // Ctrl+C → copy
    if (ctrl && key === 'c') {
      // Only intercept if no text is selected (allow normal text copy)
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        e.preventDefault();
        onCopy?.(colKey, nodeId);
      }
      return;
    }

    // Ctrl+V → paste as child
    if (ctrl && key === 'v') {
      // Only intercept if input is not focused for normal paste
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        onPaste?.(colKey, nodeId);
      }
      return;
    }

    // Ctrl+Backspace or Ctrl+Delete → delete node
    if (ctrl && (key === 'Backspace' || key === 'Delete')) {
      e.preventDefault();
      onDelete?.(colKey, nodeId, nodeName);
      return;
    }

    // Space → toggle expand/collapse (only when not in input)
    if (key === ' ') {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        onToggleExpand?.(nodeId);
      }
      return;
    }

  }, [
    enabled, onIndent, onOutdent, onMoveUp, onMoveDown,
    onAddSibling, onAddChild, onDelete, onCopy, onPaste,
    onToggleExpand, onSelectAll, onClearSelection, onSave, onNavigateGraph,
    selectedIds
  ]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler, enabled]);
}

// Walk up from the active element to find data-node-id and data-col-key
function getNodeFromActiveElement() {
  let el = document.activeElement;
  if (!el) return null;
  // Walk up to 10 levels
  for (let i = 0; i < 10; i++) {
    if (!el) return null;
    if (el.dataset?.nodeId && el.dataset?.colKey) {
      return {
        nodeId: el.dataset.nodeId,
        colKey: el.dataset.colKey,
        nodeName: el.dataset.nodeName || ''
      };
    }
    el = el.parentElement;
  }
  return null;
}

// After a tree operation, re-focus the input of the moved node
function refocusNode(nodeId) {
  const container = document.querySelector(`[data-node-id="${nodeId}"]`);
  if (!container) return;
  const input = container.querySelector('input[type="text"]');
  if (input) input.focus();
}
