import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ActionContext = createContext(null);

// Action types
export const ACTION_TYPES = {
  MOVE:       'move',
  RENAME:     'rename',
  ADD:        'add',
  DELETE:     'delete',
  CONNECT:    'connect',
  DISCONNECT: 'disconnect',
  INDENT:     'indent',
  OUTDENT:    'outdent',
  REORDER:    'reorder',
  SELECT_GROUP: 'select_group',
  AI_PROPOSAL: 'ai_proposal',
  TAG_CHANGE: 'tag_change',
  COLUMN_ADD: 'column_add',
  COLUMN_DELETE: 'column_delete',
};

// Icons for each action type
export const ACTION_ICONS = {
  move: '📦', rename: '✏️', add: '➕', delete: '🗑️',
  connect: '🔗', disconnect: '✂️', indent: '→', outdent: '←',
  reorder: '↕️', select_group: '☐', ai_proposal: '🤖',
  tag_change: '🏷️', column_add: '📊', column_delete: '📊',
};

// Human-readable description generators
const DESC = {
  ko: {
    move: (a) => `"${a.nodeName}" 항목을 (${a.to.x?.toFixed(1)}, ${a.to.y?.toFixed(1)})로 이동`,
    rename: (a) => `"${a.from}" → "${a.to}" 이름 변경`,
    add: (a) => `"${a.parentName || a.colLabel}" 아래에 "${a.nodeName}" 추가`,
    delete: (a) => `"${a.nodeName}" 항목 삭제`,
    connect: (a) => `"${a.fromName}" ↔ "${a.toName}" 연결 생성`,
    disconnect: (a) => `"${a.fromName}" ↔ "${a.toName}" 연결 해제`,
    indent: (a) => `"${a.nodeName}" 들여쓰기`,
    outdent: (a) => `"${a.nodeName}" 내어쓰기`,
    reorder: (a) => `"${a.nodeName}" 순서 변경 (${a.direction})`,
    select_group: (a) => `${a.count}개 항목 선택`,
    ai_proposal: (a) => `AI 제안: ${a.summary}`,
    tag_change: (a) => `"${a.nodeName}" 태그 변경: ${a.tagName}`,
    column_add: (a) => `"${a.colLabel}" 구역 추가`,
    column_delete: (a) => `"${a.colLabel}" 구역 삭제`,
  },
  en: {
    move: (a) => `Moved "${a.nodeName}" to (${a.to.x?.toFixed(1)}, ${a.to.y?.toFixed(1)})`,
    rename: (a) => `Renamed "${a.from}" → "${a.to}"`,
    add: (a) => `Added "${a.nodeName}" under "${a.parentName || a.colLabel}"`,
    delete: (a) => `Deleted "${a.nodeName}"`,
    connect: (a) => `Connected "${a.fromName}" ↔ "${a.toName}"`,
    disconnect: (a) => `Disconnected "${a.fromName}" ↔ "${a.toName}"`,
    indent: (a) => `Indented "${a.nodeName}"`,
    outdent: (a) => `Outdented "${a.nodeName}"`,
    reorder: (a) => `Reordered "${a.nodeName}" (${a.direction})`,
    select_group: (a) => `Selected ${a.count} items`,
    ai_proposal: (a) => `AI proposal: ${a.summary}`,
    tag_change: (a) => `Tag "${a.tagName}" on "${a.nodeName}"`,
    column_add: (a) => `Added column "${a.colLabel}"`,
    column_delete: (a) => `Deleted column "${a.colLabel}"`,
  }
};

let actionCounter = 0;

export function ActionProvider({ children }) {
  const [actions, setActions] = useState([]);
  const [undoneActions, setUndoneActions] = useState([]);
  const [pinnedIds, setPinnedIds] = useState(new Set());

  // Record a new action
  const record = useCallback((type, data) => {
    actionCounter++;
    const action = {
      id: `a${actionCounter}`,
      num: actionCounter,
      type,
      data,
      timestamp: Date.now(),
      icon: ACTION_ICONS[type] || '•',
    };
    setActions(prev => [...prev, action]);
    setUndoneActions([]); // clear redo stack on new action
    return action;
  }, []);

  // Undo last action (returns the action for the caller to reverse)
  const undo = useCallback(() => {
    setActions(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoneActions(u => [...u, last]);
      return prev.slice(0, -1);
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setUndoneActions(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setActions(a => [...a, last]);
      return prev.slice(0, -1);
    });
  }, []);

  // Pin/unpin an action (for referencing in chat)
  const togglePin = useCallback((actionId) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  }, []);

  // Get pinned actions
  const getPinnedActions = useCallback(() => {
    return actions.filter(a => pinnedIds.has(a.id));
  }, [actions, pinnedIds]);

  // Get description text for an action
  const getDescription = useCallback((action, lang = 'ko') => {
    const descMap = DESC[lang] || DESC.ko;
    const fn = descMap[action.type];
    if (!fn) return `${action.icon} action #${action.num}`;
    try {
      return fn(action.data);
    } catch {
      return `${action.icon} action #${action.num}`;
    }
  }, []);

  // Clear all actions
  const clearAll = useCallback(() => {
    setActions([]);
    setUndoneActions([]);
    setPinnedIds(new Set());
    actionCounter = 0;
  }, []);

  // Serialize actions for AI context
  const serializeForAI = useCallback((lang = 'ko') => {
    return actions.map(a => ({
      id: a.id,
      num: a.num,
      type: a.type,
      description: getDescription(a, lang),
      data: a.data,
      pinned: pinnedIds.has(a.id),
      timestamp: a.timestamp,
    }));
  }, [actions, pinnedIds, getDescription]);

  return (
    <ActionContext.Provider value={{
      actions,
      undoneActions,
      pinnedIds,
      record,
      undo,
      redo,
      togglePin,
      getPinnedActions,
      getDescription,
      clearAll,
      serializeForAI,
      canUndo: actions.length > 0,
      canRedo: undoneActions.length > 0,
    }}>
      {children}
    </ActionContext.Provider>
  );
}

export function useActions() {
  const ctx = useContext(ActionContext);
  if (!ctx) throw new Error('useActions must be inside ActionProvider');
  return ctx;
}
