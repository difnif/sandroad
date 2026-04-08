import React from 'react';
import { X, FilePlus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function TabBar({ openIds, projectsList, activeId, onSwitch, onClose, onNew }) {
  const { theme, t, themeId } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const activeBg = themeId === 'sand' ? 'bg-white' : themeId === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white';
  const inactiveBg = themeId === 'sand' ? 'bg-amber-50' : themeId === 'dark' ? 'bg-[#2d2d30]' : 'bg-[#f3f3f3]';
  const activeBorder = themeId === 'sand' ? 'border-amber-500' : themeId === 'dark' ? 'border-[#007acc]' : 'border-[#0066b8]';

  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-1">
      {openIds.map(pid => {
        const meta = projectsList.find(p => p.id === pid);
        if (!meta) return null;
        const isActive = pid === activeId;
        return (
          <div
            key={pid}
            className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-t-md border-b-2 text-xs whitespace-nowrap ${monoCls} ${
              isActive
                ? `${activeBg} ${activeBorder} ${theme.text} font-medium`
                : `${inactiveBg} border-transparent ${theme.textMuted} hover:${theme.text} cursor-pointer`
            }`}
            onClick={() => !isActive && onSwitch(pid)}
          >
            <span>{meta.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(pid); }}
              className={`p-0.5 hover:bg-black/10 rounded`}
              title="close"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <button
        onClick={onNew}
        className={`flex items-center gap-1 px-2 py-1 text-xs ${monoCls} ${theme.textMuted} hover:${theme.text} rounded hover:bg-black/5`}
        title={t.newProject}
      >
        <FilePlus size={14} /> {t.newProject}
      </button>
    </div>
  );
}
