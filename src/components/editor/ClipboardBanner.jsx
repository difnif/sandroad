import React from 'react';
import { Clipboard, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function ClipboardBanner({ clipboard, onClear }) {
  const { theme, t, themeId } = useTheme();
  if (!clipboard) return null;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const bannerCls = themeId === 'sand'
    ? 'bg-amber-100 border-amber-300 text-amber-900'
    : themeId === 'dark'
      ? 'bg-[#3c2f1f] border-[#5a4528] text-[#dcdcaa]'
      : 'bg-[#fef3c7] border-[#fde68a] text-[#92400e]';

  return (
    <div className={`mb-3 px-3 py-2 border rounded-md flex items-center gap-2 text-xs ${monoCls} ${bannerCls}`}>
      <Clipboard size={14} />
      <span className="font-medium">{t.copied}:</span>
      <span className="truncate flex-1">
        {clipboard.node.name}
        {clipboard.sourceName && <span className="opacity-70"> ({clipboard.sourceName})</span>}
      </span>
      <span className="opacity-70 hidden sm:inline">{t.clipboardHint}</span>
      <button onClick={onClear} className="p-0.5 hover:bg-black/10 rounded">
        <X size={12} />
      </button>
    </div>
  );
}
