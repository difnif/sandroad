import React from 'react';
import { Clipboard, X } from 'lucide-react';

export default function ClipboardBanner({ clipboard, onClear }) {
  if (!clipboard) return null;
  return (
    <div className="mb-3 px-3 py-2 bg-amber-100 border border-amber-300 rounded-md flex items-center gap-2 text-xs text-amber-900">
      <Clipboard size={14} />
      <span className="font-medium">복사됨:</span>
      <span className="truncate flex-1">
        {clipboard.node.name}
        {clipboard.sourceName && <span className="text-amber-700"> ({clipboard.sourceName})</span>}
      </span>
      <span className="text-amber-700 hidden sm:inline">· 컬럼 상단 또는 항목의 붙여넣기 버튼으로 이동</span>
      <button onClick={onClear} className="p-0.5 hover:bg-amber-200 rounded">
        <X size={12} />
      </button>
    </div>
  );
}
