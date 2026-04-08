import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function NewProjectDialog({ open, onCancel, onCreate }) {
  const { theme, t } = useTheme();
  const [name, setName] = useState('');

  if (!open) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    await onCreate(trimmed);
    setName('');
  };

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className={`${theme.bgPanel} rounded-lg shadow-xl p-5 max-w-sm w-full border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-sm font-bold ${theme.text} mb-3`}>{t.createProject}</h3>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder={t.projectNamePlaceholder}
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`}
        />
        <p className={`mt-2 text-[11px] ${theme.textMuted}`}>{t.projectInitialNote}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => { setName(''); onCancel(); }}
            className={`px-3 py-1.5 text-xs font-medium border rounded-md ${theme.button}`}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleCreate}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${theme.accent}`}
          >
            {t.create}
          </button>
        </div>
      </div>
    </div>
  );
}
