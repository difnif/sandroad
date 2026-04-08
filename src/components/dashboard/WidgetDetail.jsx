import React from 'react';
import { X } from 'lucide-react';

export default function WidgetDetail({ widgetKey, def, metrics, onClose }) {
  if (!widgetKey) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-lg shadow-lg p-3 z-30 text-xs text-stone-700">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-stone-900">{def.label} 상세</div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
          <X size={14} />
        </button>
      </div>

      {widgetKey === 'd1count' && (
        <div className="space-y-1">
          <div>전체 1차: {metrics.d1} · 2차: {metrics.d2} · 3차: {metrics.d3}</div>
          <div className="pt-2 border-t border-stone-100 space-y-0.5">
            {Object.values(metrics.perColumn).map((c, i) => (
              <div key={i} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-mono">{c.d1} / {c.d2} / {c.d3}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(widgetKey === 'avg12' || widgetKey === 'avg23') && (
        <div className="space-y-1">
          <div>컬럼별 하위 항목 분포</div>
          <div className="pt-2 border-t border-stone-100 space-y-0.5">
            {Object.values(metrics.perColumn).map((c, i) => {
              const ratio = widgetKey === 'avg12'
                ? (c.d1 ? c.d2 / c.d1 : 0)
                : (c.d2 ? c.d3 / c.d2 : 0);
              return (
                <div key={i} className="flex justify-between">
                  <span>{c.label}</span>
                  <span className="font-mono">{ratio.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {widgetKey === 'missing' && (
        metrics.missingList.length === 0
          ? <div className="text-stone-400">누락 없음</div>
          : <div className="space-y-1 max-h-48 overflow-y-auto">
              {metrics.missingList.map((it, i) => (
                <div key={i}>
                  <span className="font-semibold">[{it.colLabel}]</span> {it.path.join(' > ')}
                  <span className="text-stone-400"> — {it.reason}</span>
                </div>
              ))}
            </div>
      )}

      {widgetKey === 'pending' && (
        metrics.pendingList.length === 0
          ? <div className="text-stone-400">예정 항목 없음</div>
          : <div className="space-y-1 max-h-48 overflow-y-auto">
              {metrics.pendingList.map((it, i) => (
                <div key={i}>
                  <span className="font-semibold">[{it.colLabel}]</span> {it.path.join(' > ')}
                  <span className="text-stone-400"> · {it.kind}</span>
                </div>
              ))}
            </div>
      )}

      {widgetKey === 'review' && (
        metrics.reviewList.length === 0
          ? <div className="text-stone-400">검토 항목 없음</div>
          : <div className="space-y-1 max-h-48 overflow-y-auto">
              {metrics.reviewList.map((it, i) => (
                <div key={i}>
                  <span className="font-semibold">[{it.colLabel}]</span> {it.path.join(' > ')}
                </div>
              ))}
            </div>
      )}

      {widgetKey === 'balance' && (
        <div className="space-y-1">
          <div>컬럼별 1차 항목 수 편차</div>
          <div className="pt-2 border-t border-stone-100 space-y-0.5">
            {Object.values(metrics.perColumn).map((c, i) => (
              <div key={i} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-mono">{c.d1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
