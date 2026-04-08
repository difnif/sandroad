import React, { useState } from 'react';

export default function NewProjectDialog({ open, onCancel, onCreate }) {
  const [name, setName] = useState('');

  if (!open) return null;

  const handleCreate = async () => {
    const trimmed = name.trim() || '새 도시';
    await onCreate(trimmed);
    setName('');
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-stone-900 mb-3">새 도시 만들기</h3>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="도시 이름"
          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:border-amber-500 focus:outline-none"
        />
        <p className="mt-2 text-[11px] text-stone-500">
          4개 구역(컬럼)으로 시작합니다. 이름과 색상은 생성 후 바꿀 수 있어요.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => { setName(''); onCancel(); }}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
