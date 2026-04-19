import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const SHORTCUTS = [
  { keys: 'Tab',           desc_ko: '들여쓰기 (→)',         desc_en: 'Indent (→)' },
  { keys: 'Shift+Tab',     desc_ko: '내어쓰기 (←)',         desc_en: 'Outdent (←)' },
  { keys: 'Ctrl+↑',        desc_ko: '위로 이동',            desc_en: 'Move up' },
  { keys: 'Ctrl+↓',        desc_ko: '아래로 이동',          desc_en: 'Move down' },
  { keys: 'Ctrl+Enter',    desc_ko: '같은 레벨에 새 항목',   desc_en: 'New sibling item' },
  { keys: 'Ctrl+Shift+Enter', desc_ko: '하위 항목 추가',    desc_en: 'New child item' },
  { keys: 'Ctrl+C',        desc_ko: '항목 복사',            desc_en: 'Copy item' },
  { keys: 'Ctrl+V',        desc_ko: '하위로 붙여넣기',      desc_en: 'Paste as child' },
  { keys: 'Ctrl+Backspace', desc_ko: '항목 삭제',           desc_en: 'Delete item' },
  { keys: 'Ctrl+G',        desc_ko: '그래프 뷰 전환',       desc_en: 'Switch to graph' },
  { keys: 'Ctrl+S',        desc_ko: '저장 (자동저장됨)',     desc_en: 'Save (auto-saved)' },
  { keys: 'Escape',        desc_ko: '선택 해제',            desc_en: 'Clear selection' },
];

export default function ShortcutsHelp({ open, onClose }) {
  const { theme, themeId } = useTheme();
  if (!open) return null;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const isKo = themeId === 'sand';

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`${theme.bgPanel} rounded-lg shadow-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className={theme.text} />
            <h3 className={`text-sm font-bold ${theme.text}`}>
              {isKo ? '단축키' : 'Keyboard shortcuts'}
            </h3>
          </div>
          <button onClick={onClose} className={`${theme.textDim} hover:${theme.text}`}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className={`flex items-center justify-between py-1.5 border-b ${theme.border}`}>
              <span className={`text-xs ${theme.textMuted}`}>
                {isKo ? s.desc_ko : s.desc_en}
              </span>
              <kbd className={`text-[10px] ${monoCls} px-1.5 py-0.5 rounded border ${theme.border} ${theme.bgAlt} ${theme.text}`}>
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>

        <p className={`mt-3 text-[10px] ${theme.textDim}`}>
          {isKo
            ? '항목의 이름 입력란에 커서가 있을 때 작동합니다.'
            : 'Works when cursor is in an item name field.'}
        </p>
      </div>
    </div>
  );
}
