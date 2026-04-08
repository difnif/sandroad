import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { THEMES } from '../../constants/themes.js';

export default function AppearanceSettings({ open, onClose }) {
  const { theme, t, themeId, changeTheme } = useTheme();
  if (!open) return null;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  const themePreviews = {
    sand: { bg: '#fefce8', accent: '#d97706', text: '#1c1917' },
    dark: { bg: '#1e1e1e', accent: '#007acc', text: '#cccccc' },
    light: { bg: '#ffffff', accent: '#0066b8', text: '#1e1e1e' }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`${theme.bgPanel} rounded-lg shadow-xl p-5 max-w-md w-full border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-bold ${theme.text}`}>{t.appearance}</h3>
          <button onClick={onClose} className={`${theme.textDim} hover:${theme.text}`}>
            <X size={16} />
          </button>
        </div>

        <p className={`text-[11px] ${theme.textMuted} mb-3`}>{t.appearanceHint}</p>

        <div className="space-y-2">
          {Object.values(THEMES).map(th => {
            const preview = themePreviews[th.id];
            const isSelected = themeId === th.id;
            return (
              <button
                key={th.id}
                onClick={() => changeTheme(th.id)}
                className={`w-full flex items-center gap-3 p-3 rounded border-2 transition-all ${
                  isSelected ? 'border-current opacity-100' : `${theme.border} opacity-70 hover:opacity-100`
                }`}
              >
                <div
                  className="w-12 h-12 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border"
                  style={{
                    backgroundColor: preview.bg,
                    color: preview.text,
                    borderColor: preview.accent
                  }}
                >
                  Aa
                </div>
                <div className="flex-1 text-left">
                  <div className={`text-sm font-bold ${theme.text} ${th.fontMono ? 'font-mono-ui' : ''}`}>
                    {th.name}
                  </div>
                  <div className={`text-[10px] ${theme.textMuted}`}>
                    {th.id === 'sand' && '모래톤 컬러 · 한글'}
                    {th.id === 'dark' && 'VS Code dark · English'}
                    {th.id === 'light' && 'VS Code light · English'}
                  </div>
                </div>
                {isSelected && (
                  <div className={`text-[10px] ${theme.accentText} font-bold ${monoCls}`}>
                    ✓ {th.id === 'sand' ? '선택됨' : 'selected'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
