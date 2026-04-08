import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function ProjectsListModal({
  open, projects, openIds, onClose, onOpen, onRename, onDelete, onNew
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  if (!open) return null;

  const handleRename = async (pid) => {
    const v = renameValue.trim();
    if (v) await onRename(pid, v);
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-5 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-900">도시 목록</h3>
          <button
            onClick={onNew}
            className="text-xs font-medium text-amber-700 hover:text-amber-900"
          >
            + 새 도시
          </button>
        </div>
        <div className="overflow-y-auto space-y-1">
          {projects.length === 0 ? (
            <div className="text-xs text-stone-400 text-center py-6">
              아직 도시가 없습니다
            </div>
          ) : projects.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-stone-200 hover:border-stone-400"
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
                  className="flex-1 px-2 py-0.5 text-sm border border-stone-300 rounded"
                />
              ) : (
                <button
                  onClick={() => onOpen(p.id)}
                  className="flex-1 text-left text-sm text-stone-800 truncate hover:text-amber-700"
                >
                  {p.name}
                  {openIds.includes(p.id) && (
                    <span className="text-[10px] text-amber-600 ml-1">열림</span>
                  )}
                </button>
              )}
              <button
                onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                className="p-1 text-stone-400 hover:text-stone-700"
                title="이름 변경"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => onDelete(p.id, p.name)}
                className="p-1 text-stone-400 hover:text-red-600"
                title="삭제"
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
