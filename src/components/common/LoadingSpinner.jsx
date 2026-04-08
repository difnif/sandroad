import React from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function LoadingSpinner({ message }) {
  // Theme might not be loaded yet at startup; use safe defaults
  let theme, t;
  try {
    const ctx = useTheme();
    theme = ctx.theme;
    t = ctx.t;
  } catch (e) {
    theme = null;
    t = null;
  }

  const bgCls = theme?.bg || 'bg-amber-50/40';
  const textCls = theme?.textMuted || 'text-stone-500';
  const borderCls = theme?.border || 'border-stone-300';
  const monoCls = theme?.fontMono ? 'font-mono-ui' : '';
  const msg = message || t?.loading || 'sandroad 불러오는 중...';

  return (
    <div className={`min-h-screen ${bgCls} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`w-8 h-8 border-2 ${borderCls} border-t-current rounded-full animate-spin`} />
        <p className={`text-sm ${textCls} ${monoCls}`}>{msg}</p>
      </div>
    </div>
  );
}
