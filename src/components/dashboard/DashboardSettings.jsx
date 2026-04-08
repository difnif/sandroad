import React from 'react';
import { X } from 'lucide-react';
import { WIDGET_COLOR_CLASSES } from './Widget.jsx';
import { DEFAULT_DASH } from '../../hooks/useDashboardSettings.js';

const WIDGET_LABELS = {
  d1count: '1차',
  avg12:   '1→2 평균',
  avg23:   '2→3 평균',
  missing: '연결 누락',
  pending: '예정',
  review:  '검토',
  balance: '균형'
};

export default function DashboardSettings({ open, settings, setSettings, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-900">계기판 설정</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>

        {/* Style */}
        <div className="mb-4">
          <label className="text-xs font-medium text-stone-700 block mb-1.5">스타일</label>
          <div className="flex gap-1">
            {['digital', 'analog'].map(s => (
              <button
                key={s}
                onClick={() => setSettings(prev => ({ ...prev, style: s }))}
                className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                  settings.style === s
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-700 border-stone-300'
                }`}
              >
                {s === 'digital' ? '디지털 (숫자)' : '아날로그 (점)'}
              </button>
            ))}
          </div>
          {settings.style === 'analog' && (
            <div className="mt-2 flex gap-1">
              {['precise', 'rounded'].map(m => (
                <button
                  key={m}
                  onClick={() => setSettings(prev => ({ ...prev, analogMode: m }))}
                  className={`flex-1 px-2 py-1 text-[11px] rounded border ${
                    settings.analogMode === m
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-stone-600 border-stone-300'
                  }`}
                >
                  {m === 'precise' ? '정확 (2.4→2.4개)' : '반올림 (2.8→3개)'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Position */}
        <div className="mb-4">
          <label className="text-xs font-medium text-stone-700 block mb-1.5">위치</label>
          <div className="flex gap-1">
            {[['top', '상단'], ['bottom', '하단'], ['floating', '플로팅']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSettings(prev => ({ ...prev, position: v }))}
                className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                  settings.position === v
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-700 border-stone-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {settings.position === 'floating' && (
            <p className="mt-1 text-[10px] text-stone-500">계기판 영역을 드래그해서 위치 조정</p>
          )}
        </div>

        {/* Widgets */}
        <div className="mb-2">
          <label className="text-xs font-medium text-stone-700 block mb-1.5">위젯 표시 및 색상</label>
          <div className="space-y-1">
            {Object.entries(WIDGET_LABELS).map(([k, label]) => {
              const cfg = settings.widgets[k] || { enabled: true, color: 'stone' };
              return (
                <div key={k} className="flex items-center gap-2 px-2 py-1.5 border border-stone-200 rounded">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      widgets: { ...prev.widgets, [k]: { ...cfg, enabled: e.target.checked } }
                    }))}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs flex-1">{label}</span>
                  <select
                    value={cfg.color}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      widgets: { ...prev.widgets, [k]: { ...cfg, color: e.target.value } }
                    }))}
                    className="text-[11px] border border-stone-300 rounded px-1 py-0.5"
                  >
                    {Object.keys(WIDGET_COLOR_CLASSES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setSettings(DEFAULT_DASH)}
            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
          >
            기본값으로
          </button>
        </div>
      </div>
    </div>
  );
}
