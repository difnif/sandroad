import React from 'react';
import { Pin, PinOff, Undo2, Redo2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useActions, ACTION_ICONS } from '../../contexts/ActionContext.jsx';

export default function ActionTimeline({ collapsed, onToggleCollapse }) {
  const { theme, themeId } = useTheme();
  const {
    actions, pinnedIds,
    togglePin, getDescription, undo, redo, clearAll,
    canUndo, canRedo
  } = useActions();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 ${theme.bgPanel} border ${theme.border} rounded-l-lg px-1 py-6 shadow-md`}
        title={lang === 'ko' ? '액션 패널 열기' : 'Open action panel'}
      >
        <ChevronLeft size={14} className={theme.textMuted} />
        {actions.length > 0 && (
          <div className={`mt-1 text-[9px] font-bold ${theme.accentText} text-center`}>
            {actions.length}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`w-64 flex-shrink-0 ${theme.bgPanel} border-l ${theme.border} flex flex-col h-full`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b ${theme.border} flex items-center gap-2`}>
        <span className={`text-xs font-bold ${theme.text} ${monoCls} flex-1`}>
          {lang === 'ko' ? '액션 기록' : 'Actions'}
          {actions.length > 0 && (
            <span className={`ml-1 font-normal ${theme.textMuted}`}>({actions.length})</span>
          )}
        </span>
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-1 rounded ${theme.textMuted} hover:${theme.text} disabled:opacity-30`}
          title="Undo"
        >
          <Undo2 size={12} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-1 rounded ${theme.textMuted} hover:${theme.text} disabled:opacity-30`}
          title="Redo"
        >
          <Redo2 size={12} />
        </button>
        <button
          onClick={clearAll}
          disabled={actions.length === 0}
          className={`p-1 rounded ${theme.textMuted} hover:text-red-500 disabled:opacity-30`}
          title={lang === 'ko' ? '전체 삭제' : 'Clear all'}
        >
          <Trash2 size={12} />
        </button>
        <button
          onClick={onToggleCollapse}
          className={`p-1 rounded ${theme.textMuted} hover:${theme.text}`}
          title="Collapse"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Action list */}
      <div className="flex-1 overflow-y-auto">
        {actions.length === 0 ? (
          <div className={`p-4 text-center text-[11px] ${theme.textDim} ${monoCls}`}>
            {lang === 'ko'
              ? '박스를 드래그하거나 이름을 수정하면\n여기에 액션이 기록됩니다'
              : 'Drag boxes or edit names\nto record actions here'}
          </div>
        ) : (
          <div className="py-1">
            {actions.map((action, idx) => {
              const isPinned = pinnedIds.has(action.id);
              const desc = getDescription(action, lang);
              const timeDiff = getTimeDiff(action.timestamp);
              const isAI = action.type === 'ai_proposal';

              return (
                <div
                  key={action.id}
                  className={`px-3 py-2 border-b ${theme.border} ${
                    isPinned
                      ? (themeId === 'dark' ? 'bg-[#1e2a47]/30' : themeId === 'light' ? 'bg-blue-50/50' : 'bg-amber-50/60')
                      : ''
                  } ${isAI ? (themeId === 'dark' ? 'bg-[#1f3c25]/20' : 'bg-emerald-50/30') : ''}`}
                >
                  <div className="flex items-start gap-1.5">
                    {/* Number badge */}
                    <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${monoCls} ${
                      isPinned
                        ? 'bg-amber-500 text-white'
                        : isAI
                          ? 'bg-emerald-500 text-white'
                          : `${theme.bgAlt} ${theme.textMuted}`
                    }`}>
                      #{action.num}
                    </span>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] ${theme.text} ${monoCls} leading-tight`}>
                        {action.icon} {desc}
                      </div>
                      <div className={`text-[9px] ${theme.textDim} mt-0.5`}>{timeDiff}</div>
                    </div>

                    {/* Pin button */}
                    <button
                      onClick={() => togglePin(action.id)}
                      className={`flex-shrink-0 p-0.5 rounded ${
                        isPinned ? 'text-amber-500' : `${theme.textDim} hover:${theme.textMuted}`
                      }`}
                      title={isPinned ? 'Unpin' : 'Pin (reference in chat)'}
                    >
                      {isPinned ? <PinOff size={10} /> : <Pin size={10} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned summary (for chat reference) */}
      {pinnedIds.size > 0 && (
        <div className={`px-3 py-2 border-t ${theme.border} ${theme.bgAlt}`}>
          <div className={`text-[9px] font-bold ${theme.textMuted} ${monoCls} mb-1`}>
            {lang === 'ko' ? `📌 고정됨 (${pinnedIds.size})` : `📌 Pinned (${pinnedIds.size})`}
          </div>
          <div className={`text-[10px] ${theme.text} ${monoCls}`}>
            {actions
              .filter(a => pinnedIds.has(a.id))
              .map(a => `#${a.num}`)
              .join(', ')}
          </div>
          <div className={`text-[9px] ${theme.textDim} mt-0.5`}>
            {lang === 'ko'
              ? '상담 채팅에서 이 액션들을 참조할 수 있어요'
              : 'Reference these in the consultation chat'}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeDiff(ts) {
  const diff = Date.now() - ts;
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
