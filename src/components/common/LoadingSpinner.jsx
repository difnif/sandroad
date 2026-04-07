import React from 'react';

export default function LoadingSpinner({ message = '불러오는 중...' }) {
  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
        <p className="text-sm text-stone-500">{message}</p>
      </div>
    </div>
  );
}
