import React from 'react';
import { Pin, PinOff, Undo2, Redo2, Trash2, List } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useActions } from '../../contexts/ActionContext.jsx';

export default function ActionTimeline({ collapsed, onToggleCollapse }) {
  const { theme, themeId } = useTheme();
  const {
    actions, pinnedIds,
    togglePin, getDescription, undo, redo, clearAll,
    canUndo, canRedo
  } = useActions();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  // Fully hidden — just a small floating badge
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`absolute right-3 bottom-14 z-30 ${theme.bgPanel} border ${theme.border} rounded-full w-10 h-10 flex items-center justify-center shadow-lg`}
      >
        <List size={16} className={theme.textMuted} />
        {actions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
            {actions.length > 99 ? '99' : actions.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`absolute right-3 top-14 bottom-14 z-30 w-64 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-xl flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b ${theme.border} flex items-center gap-1`}>
        <span className={`text-xs font-bold ${theme.text} ${monoCls} flex-1`}>
          {lang === 'ko' ? '액션 기록' : 'Actions'}
          {actions.length > 0 && (
            <span className={`ml-1 font-normal ${theme.textMuted}`}>({actions.length})</span>
          )}
        </span>
        <button onClick={undo} disabled={!canUndo} className={`p-1 rounded ${theme.textMuted} disabled:opacity-30`} title="Undo">
          <Undo2 size={11} />
        </button>
        <button onClick={redo} disabled={!canRedo} className={`p-1 rounded ${theme.textMuted} disabled:opacity-30`} title="Redo">
          <Redo2 size={11} />
        </button>
        <button onClick={clearAll} disabled={!actions.length} className={`p-1 rounded ${theme.textMuted} hover:text-red-500 disabled:opacity-30`}>
          <Trash2 size={11} />
        </button>
        <button onClick={onToggleCollapse} className={`p-1 rounded ${theme.textMuted} hover:${theme.text} text-xs font-bold`}>
          ✕
        </button>
      </div>

      {/* Action list */}
      <div className="flex-1 overflow-y-auto">
        {actions.length === 0 ? (
          <div className={`p-4 text-center text-[10px] ${theme.textDim} ${monoCls} whitespace-pre-line`}>
            {lang === 'ko'
              ? '박스를 드래그하거나\n이름을 수정하면\n여기에 기록됩니다'
              : 'Drag boxes or edit names\nto record actions here'}
          </div>
        ) : (
          <div className="py-0.5">
            {actions.map(action => {
              const isPinned = pinnedIds.has(action.id);
              const desc = getDescription(action, lang);
              return (
                <div
                  key={action.id}
                  className={`px-2.5 py-1.5 border-b ${theme.border} ${isPinned ? (themeId === 'dark' ? 'bg-[#1e2a47]/30' : 'bg-amber-50/60') : ''}`}
                >
                  <div className="flex items-start gap-1">
                    <span className={`flex-shrink-0 text-[8px] font-bold px-1 py-0.5 rounded ${monoCls} ${isPinned ? 'bg-amber-500 text-white' : `${theme.bgAlt} ${theme.textMuted}`}`}>
                      #{action.num}
                    </span>
                    <span className={`text-[10px] ${theme.text} ${monoCls} leading-tight flex-1`}>
                      {action.icon} {desc}
                    </span>
                    <button
                      onClick={() => togglePin(action.id)}
                      className={`flex-shrink-0 p-0.5 ${isPinned ? 'text-amber-500' : theme.textDim}`}
                    >
                      {isPinned ? <PinOff size={9} /> : <Pin size={9} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned summary */}
      {pinnedIds.size > 0 && (
        <div className={`px-2.5 py-1.5 border-t ${theme.border} ${theme.bgAlt}`}>
          <div className={`text-[9px] ${theme.textMuted} ${monoCls}`}>
            📌 {actions.filter(a => pinnedIds.has(a.id)).map(a => `#${a.num}`).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
