import React, { useEffect, useRef, useState } from 'react';
import { Settings, Check, GripVertical } from 'lucide-react';
import Widget from './Widget.jsx';
import WidgetDetail from './WidgetDetail.jsx';

const WIDGET_DEFS_BASE = {
  d1count: { label: '1차',  analogMax: 8 },
  avg12:   { label: '1→2',  analogMax: 5 },
  avg23:   { label: '2→3',  analogMax: 5 },
  missing: { label: '누락', analogMax: 5 },
  pending: { label: '예정', analogMax: 5 },
  review:  { label: '검토', analogMax: 5 },
  balance: { label: '균형', analogMax: 1, isBalance: true }
};

export default function DashboardBar({ metrics, saveStatus, settings, setSettings, onOpenSettings }) {
  const [expanded, setExpanded] = useState(null);
  const [dragOffset, setDragOffset] = useState(null);
  const barRef = useRef(null);

  // Floating drag
  const onMouseDown = (e) => {
    if (settings.position !== 'floating') return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    if (!dragOffset) return;
    const onMove = (e) => {
      setSettings(prev => ({
        ...prev,
        floatX: Math.max(0, e.clientX - dragOffset.x),
        floatY: Math.max(0, e.clientY - dragOffset.y)
      }));
    };
    const onUp = () => setDragOffset(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragOffset, setSettings]);

  // Compute widget values
  const widgetValues = {
    d1count: metrics.d1,
    avg12: metrics.avg12,
    avg23: metrics.avg23,
    missing: metrics.missing,
    pending: metrics.pending,
    review: metrics.review,
    balance: 0
  };

  // Balance text
  const colValues = Object.values(metrics.perColumn).map(c => c.d1);
  const avgVal = colValues.length ? colValues.reduce((a, b) => a + b, 0) / colValues.length : 0;
  const maxDev = colValues.length ? Math.max(...colValues.map(v => Math.abs(v - avgVal))) : 0;
  const balanceText = avgVal > 0 ? `±${maxDev.toFixed(1)}` : '—';

  const barClass = settings.position === 'floating'
    ? 'fixed z-20 shadow-lg border border-stone-300 bg-white/95 backdrop-blur rounded-lg'
    : settings.position === 'bottom'
      ? 'fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur'
      : 'sticky top-0 z-20 border-b border-stone-200 bg-amber-50/80 backdrop-blur';

  const barStyle = settings.position === 'floating'
    ? { left: `${settings.floatX}px`, top: `${settings.floatY}px` }
    : {};

  return (
    <div ref={barRef} className={barClass} style={barStyle} onMouseDown={onMouseDown}>
      <div className={`px-3 py-1.5 ${settings.position === 'floating' ? '' : 'max-w-[1600px] mx-auto'} relative`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {settings.position === 'floating' && (
            <span className="text-stone-400 cursor-move"><GripVertical size={12} /></span>
          )}
          {Object.entries(WIDGET_DEFS_BASE).map(([key, def]) => {
            const cfg = settings.widgets[key] || { enabled: true, color: 'stone' };
            const showWarn = (key === 'missing' && metrics.missing > 0) ||
                             (key === 'pending' && metrics.pending > 0) ||
                             (key === 'review' && metrics.review > 0);
            return (
              <Widget
                key={key}
                widgetKey={key}
                def={def}
                cfg={cfg}
                value={widgetValues[key]}
                isActive={expanded === key}
                showWarn={showWarn}
                dashStyle={settings.style}
                analogMode={settings.analogMode}
                balanceText={balanceText}
                onClick={() => setExpanded(prev => prev === key ? null : key)}
              />
            );
          })}
          <div className="flex-1 min-w-[8px]" />
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            {saveStatus === 'saving' && (
              <>
                <span className="w-2.5 h-2.5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                저장 중
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={12} className="text-emerald-600" />
                <span className="text-emerald-700">저장됨</span>
              </>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded"
            title="계기판 설정"
          >
            <Settings size={14} />
          </button>
        </div>
        {expanded && (
          <WidgetDetail
            widgetKey={expanded}
            def={WIDGET_DEFS_BASE[expanded]}
            metrics={metrics}
            onClose={() => setExpanded(null)}
          />
        )}
      </div>
    </div>
  );
}
