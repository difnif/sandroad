import React, { useEffect, useRef, useState } from 'react';
import { Settings, Check, GripVertical } from 'lucide-react';
import Widget from './Widget.jsx';
import WidgetDetail from './WidgetDetail.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const WIDGET_DEFS_BASE = {
  d1count: { analogMax: 8 },
  avg12:   { analogMax: 5 },
  avg23:   { analogMax: 5 },
  missing: { analogMax: 5 },
  pending: { analogMax: 5 },
  review:  { analogMax: 5 },
  balance: { analogMax: 1, isBalance: true }
};

export default function DashboardBar({ metrics, saveStatus, settings, setSettings, onOpenSettings }) {
  const { theme, t, themeId } = useTheme();
  const [expanded, setExpanded] = useState(null);
  const [dragOffset, setDragOffset] = useState(null);
  const barRef = useRef(null);

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

  const widgetValues = {
    d1count: metrics.d1,
    avg12: metrics.avg12,
    avg23: metrics.avg23,
    missing: metrics.missing,
    pending: metrics.pending,
    review: metrics.review,
    balance: 0
  };

  const colValues = Object.values(metrics.perColumn).map(c => c.d1);
  const avgVal = colValues.length ? colValues.reduce((a, b) => a + b, 0) / colValues.length : 0;
  const maxDev = colValues.length ? Math.max(...colValues.map(v => Math.abs(v - avgVal))) : 0;
  const balanceText = avgVal > 0 ? `±${maxDev.toFixed(1)}` : '—';

  const barBgFloating = themeId === 'sand'
    ? 'bg-white/95 border-stone-300'
    : themeId === 'dark'
      ? 'bg-[#252526]/95 border-[#3e3e42]'
      : 'bg-white/95 border-[#d4d4d4]';
  const barBgTopBottom = themeId === 'sand'
    ? 'bg-amber-50/80 border-stone-200'
    : themeId === 'dark'
      ? 'bg-[#252526]/95 border-[#3e3e42]'
      : 'bg-[#f3f3f3]/95 border-[#e5e5e5]';

  const barClass = settings.position === 'floating'
    ? `fixed z-20 shadow-lg border ${barBgFloating} backdrop-blur rounded-lg`
    : settings.position === 'bottom'
      ? `fixed bottom-0 left-0 right-0 z-20 border-t ${barBgTopBottom} backdrop-blur`
      : `sticky top-0 z-20 border-b ${barBgTopBottom} backdrop-blur`;

  const barStyle = settings.position === 'floating'
    ? { left: `${settings.floatX}px`, top: `${settings.floatY}px` }
    : {};

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div ref={barRef} className={barClass} style={barStyle} onMouseDown={onMouseDown}>
      <div className={`px-3 py-1.5 ${settings.position === 'floating' ? '' : 'max-w-[1600px] mx-auto'} relative`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {settings.position === 'floating' && (
            <span className={`${theme.textDim} cursor-move`}><GripVertical size={12} /></span>
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
                label={t.widgetShortLabels[key]}
                onClick={() => setExpanded(prev => prev === key ? null : key)}
              />
            );
          })}
          <div className="flex-1 min-w-[8px]" />
          <div className={`text-[11px] ${theme.textMuted} flex items-center gap-1.5 ${monoCls}`}>
            {saveStatus === 'saving' && (
              <>
                <span className={`w-2.5 h-2.5 border-2 ${theme.border} border-t-current rounded-full animate-spin`} />
                {t.saving}
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check size={12} className="text-emerald-500" />
                <span className="text-emerald-500">{t.saved}</span>
              </>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className={`p-1 ${theme.textMuted} hover:${theme.text} rounded`}
            title={t.metricsSettings}
          >
            <Settings size={14} />
          </button>
        </div>
        {expanded && (
          <WidgetDetail
            widgetKey={expanded}
            label={t.widgetLabels[expanded]}
            metrics={metrics}
            onClose={() => setExpanded(null)}
          />
        )}
      </div>
    </div>
  );
}
