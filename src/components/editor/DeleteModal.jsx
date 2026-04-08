import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DeleteModal({ pendingDelete, onConfirm, onCancel }) {
  if (!pendingDelete) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full text-red-600 flex-shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-stone-900 mb-1">
              {pendingDelete.type === 'project' ? '도시 삭제' : '항목 삭제'}
            </h3>
            <p className="text-xs text-stone-600 break-words">
              {pendingDelete.type === 'project'
                ? `"${pendingDelete.name}" 도시를 삭제하시겠습니까? 모든 구조가 사라지며 되돌릴 수 없습니다.`
                : `"${pendingDelete.name || '항목'}"을(를) 삭제합니다. 하위 항목도 모두 함께 삭제됩니다.`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
