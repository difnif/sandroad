import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { WIDGET_COLOR_KEYS } from './Widget.jsx';
import { DEFAULT_DASH } from '../../hooks/useDashboardSettings.js';

const WIDGET_KEYS = ['d1count', 'avg12', 'avg23', 'missing', 'pending', 'review', 'balance'];

export default function DashboardSettings({ open, settings, setSettings, onClose }) {
  const { theme, t } = useTheme();
  if (!open) return null;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`${theme.bgPanel} rounded-lg shadow-xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto border ${theme.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-bold ${theme.text}`}>{t.metricsSettings}</h3>
          <button onClick={onClose} className={`${theme.textDim} hover:${theme.text}`}>
            <X size={16} />
          </button>
        </div>

        {/* Style */}
        <div className="mb-4">
          <label className={`text-xs font-medium ${theme.text} block mb-1.5`}>{t.style}</label>
          <div className="flex gap-1">
            {[['digital', t.styleDigital], ['analog', t.styleAnalog]].map(([s, label]) => (
              <button
                key={s}
                onClick={() => setSettings(prev => ({ ...prev, style: s }))}
                className={`flex-1 px-3 py-1.5 text-xs rounded border ${monoCls} ${
                  settings.style === s ? theme.buttonPrimary : theme.button
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {settings.style === 'analog' && (
            <div className="mt-2 flex gap-1">
              {[['precise', t.modePrecise], ['rounded', t.modeRounded]].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setSettings(prev => ({ ...prev, analogMode: m }))}
                  className={`flex-1 px-2 py-1 text-[11px] rounded border ${monoCls} ${
                    settings.analogMode === m ? theme.accent : theme.button
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Position */}
        <div className="mb-4">
          <label className={`text-xs font-medium ${theme.text} block mb-1.5`}>{t.position}</label>
          <div className="flex gap-1">
            {[['top', t.posTop], ['bottom', t.posBottom], ['floating', t.posFloat]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSettings(prev => ({ ...prev, position: v }))}
                className={`flex-1 px-3 py-1.5 text-xs rounded border ${monoCls} ${
                  settings.position === v ? theme.buttonPrimary : theme.button
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {settings.position === 'floating' && (
            <p className={`mt-1 text-[10px] ${theme.textMuted}`}>{t.floatHint}</p>
          )}
        </div>

        {/* Widgets */}
        <div className="mb-2">
          <label className={`text-xs font-medium ${theme.text} block mb-1.5`}>{t.widgetVisibility}</label>
          <div className="space-y-1">
            {WIDGET_KEYS.map(k => {
              const cfg = settings.widgets[k] || { enabled: true, color: 'stone' };
              return (
                <div key={k} className={`flex items-center gap-2 px-2 py-1.5 border ${theme.border} rounded`}>
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      widgets: { ...prev.widgets, [k]: { ...cfg, enabled: e.target.checked } }
                    }))}
                    className="w-3.5 h-3.5"
                  />
                  <span className={`text-xs flex-1 ${monoCls}`}>{t.widgetLabels[k]}</span>
                  <select
                    value={cfg.color}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      widgets: { ...prev.widgets, [k]: { ...cfg, color: e.target.value } }
                    }))}
                    className={`text-[11px] border ${theme.border} rounded px-1 py-0.5 ${monoCls} ${theme.input}`}
                  >
                    {WIDGET_COLOR_KEYS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setSettings(DEFAULT_DASH)}
            className={`px-3 py-1.5 text-xs font-medium ${theme.textMuted} hover:${theme.text}`}
          >
            {t.resetDefault}
          </button>
        </div>
      </div>
    </div>
  );
}
