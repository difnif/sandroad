import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function ProjectsListModal({
  open, projects, openIds, onClose, onOpen, onRename, onDelete, onNew
}) {
  const { theme, t } = useTheme();
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  if (!open) return null;

  const handleRename = async (pid) => {
    const v = renameValue.trim();
    if (v) await onRename(pid, v);
    setRenamingId(null);
    setRenameValue('');
  };

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`${theme.bgPanel} rounded-lg shadow-xl p-5 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-bold ${theme.text}`}>{t.projectList}</h3>
          <button
            onClick={onNew}
            className={`text-xs font-medium ${theme.accentText}`}
          >
            {t.newProject}
          </button>
        </div>
        <div className="overflow-y-auto space-y-1">
          {projects.length === 0 ? (
            <div className={`text-xs ${theme.textDim} text-center py-6`}>{t.noProjects}</div>
          ) : projects.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border ${theme.border} hover:${theme.borderStrong}`}
            >
              {renamingId === p.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(p.id);
                    if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                  }}
                  className={`flex-1 px-2 py-0.5 text-sm border rounded ${monoCls} ${theme.input}`}
                />
              ) : (
                <button
                  onClick={() => onOpen(p.id)}
                  className={`flex-1 text-left text-sm ${monoCls} ${theme.text} truncate hover:${theme.accentText}`}
                >
                  {p.name}
                  {openIds.includes(p.id) && (
                    <span className={`text-[10px] ${theme.accentText} ml-1`}>{t.open}</span>
                  )}
                </button>
              )}
              <button
                onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                className={`p-1 ${theme.textDim} hover:${theme.text}`}
                title="rename"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => onDelete(p.id, p.name)}
                className={`p-1 ${theme.textDim} hover:text-red-500`}
                title={t.delete}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
