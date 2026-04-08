import React from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function AddColumnCard({ onAdd, disabled }) {
  const { theme, t } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className={`min-h-[200px] border-2 border-dashed ${theme.border} rounded-lg flex items-center justify-center ${theme.textDim} hover:${theme.text} hover:${theme.borderStrong} transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <div className={`flex flex-col items-center gap-2 text-xs ${monoCls}`}>
        <Plus size={20} />
        {t.addColumn}
      </div>
    </button>
  );
}
