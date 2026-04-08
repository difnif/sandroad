import React from 'react';
import { X, FilePlus } from 'lucide-react';

export default function TabBar({ openIds, projectsList, activeId, onSwitch, onClose, onNew }) {
  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-1">
      {openIds.map(pid => {
        const meta = projectsList.find(p => p.id === pid);
        if (!meta) return null;
        const isActive = pid === activeId;
        return (
          <div
            key={pid}
            className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-t-md border-b-2 text-xs whitespace-nowrap ${
              isActive
                ? 'bg-white border-amber-500 text-stone-900 font-medium'
                : 'bg-amber-50 border-transparent text-stone-500 hover:text-stone-800 cursor-pointer'
            }`}
            onClick={() => !isActive && onSwitch(pid)}
          >
            <span>{meta.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(pid); }}
              className="p-0.5 hover:bg-stone-200 rounded"
              title="탭 닫기"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <button
        onClick={onNew}
        className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100"
        title="새 도시"
      >
        <FilePlus size={14} /> 새 도시
      </button>
    </div>
  );
}
