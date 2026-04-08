import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function WidgetDetail({ widgetKey, label, metrics, onClose }) {
  const { theme, t } = useTheme();
  if (!widgetKey) return null;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div className={`absolute top-full left-0 right-0 mt-2 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-lg p-3 z-30 text-xs ${theme.text} ${monoCls}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`font-bold ${theme.text}`}>{label}</div>
        <button onClick={onClose} className={`${theme.textDim} hover:${theme.text}`}>
          <X size={14} />
        </button>
      </div>

      {widgetKey === 'd1count' && (
        <div className="space-y-1">
          <div>{t.totalCounts(metrics.d1, metrics.d2, metrics.d3)}</div>
          <div className={`pt-2 border-t ${theme.border} space-y-0.5`}>
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
          <div>{t.columnDistribution}</div>
          <div className={`pt-2 border-t ${theme.border} space-y-0.5`}>
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
          ? <div className={theme.textDim}>{t.noMissing}</div>
          : <div className="space-y-1 max-h-48 overflow-y-auto">
              {metrics.missingList.map((it, i) => (
                <div key={i}>
                  <span className="font-semibold">[{it.colLabel}]</span> {it.path.join(' > ')}
                  <span className={theme.textDim}> — {it.reason}</span>
                </div>
              ))}
            </div>
      )}

      {widgetKey === 'pending' && (
        metrics.pendingList.length === 0
          ? <div className={theme.textDim}>{t.noPending}</div>
          : <div className="space-y-1 max-h-48 overflow-y-auto">
              {metrics.pendingList.map((it, i) => (
                <div key={i}>
                  <span className="font-semibold">[{it.colLabel}]</span> {it.path.join(' > ')}
                  <span className={theme.textDim}> · {it.kind}</span>
                </div>
              ))}
            </div>
      )}

      {widgetKey === 'review' && (
        metrics.reviewList.length === 0
          ? <div className={theme.textDim}>{t.noReview}</div>
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
          <div>{t.columnBalance}</div>
          <div className={`pt-2 border-t ${theme.border} space-y-0.5`}>
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
