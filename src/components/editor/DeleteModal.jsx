import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function DeleteModal({ pendingDelete, onConfirm, onCancel }) {
  const { theme, t } = useTheme();
  if (!pendingDelete) return null;

  let title, message;
  if (pendingDelete.type === 'project') {
    title = t.deleteProject;
    message = t.deleteProjectConfirm(pendingDelete.name);
  } else if (pendingDelete.type === 'column') {
    title = t.deleteColumn;
    message = t.deleteColumnConfirm(pendingDelete.name);
  } else {
    title = t.deleteItem;
    message = t.deleteItemConfirm(pendingDelete.name);
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className={`${theme.bgPanel} rounded-lg shadow-xl p-5 max-w-sm w-full border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-500/10 rounded-full text-red-500 flex-shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold ${theme.text} mb-1`}>{title}</h3>
            <p className={`text-xs ${theme.textMuted} break-words`}>{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`px-3 py-1.5 text-xs font-medium border rounded-md ${theme.button}`}
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
