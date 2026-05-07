import React, { useState, useMemo } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const ITEM_TYPES = [
  { key: 'buildings', emoji: '🏢', label_ko: '건물', label_en: 'Buildings' },
  { key: 'roads',     emoji: '🛤️', label_ko: '도로', label_en: 'Roads' },
  { key: 'vehicles',  emoji: '🚗', label_ko: '탈것 (도로 위 이동수단)', label_en: 'Vehicles (on roads)' },
  { key: 'positions', emoji: '📍', label_ko: '배치 위치 (건물 좌표 초기화)', label_en: 'Positions (reset placement)' },
];

const TIME_RANGES = [
  { key: '1h',   label_ko: '최근 1시간', label_en: 'Last 1 hour',  ms: 1000*60*60 },
  { key: '2h',   label_ko: '최근 2시간', label_en: 'Last 2 hours', ms: 1000*60*60*2 },
  { key: '6h',   label_ko: '최근 6시간', label_en: 'Last 6 hours', ms: 1000*60*60*6 },
  { key: 'today',label_ko: '오늘 작업',  label_en: 'Today',         ms: 'today' },
  { key: '1w',   label_ko: '일주일',     label_en: 'This week',     ms: 1000*60*60*24*7 },
  { key: 'all',  label_ko: '전부',       label_en: 'Everything',    ms: Infinity },
];

export default function ResetPanel({ project, onApplyReset, onClose }) {
  const { theme, themeId } = useTheme();
  const M = theme.fontMono ? 'font-mono-ui' : '';
  const L = (ko, en) => (themeId === 'sand' ? ko : en);

  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedTime, setSelectedTime] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleType = (key) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Calculate what will be affected
  const impact = useMemo(() => {
    if (!project || selectedTypes.size === 0 || !selectedTime) return null;

    const now = Date.now();
    const timeRange = TIME_RANGES.find(t => t.key === selectedTime);
    if (!timeRange) return null;

    let cutoff;
    if (timeRange.ms === 'today') {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      cutoff = d.getTime();
    } else if (timeRange.ms === Infinity) {
      cutoff = 0;
    } else {
      cutoff = now - timeRange.ms;
    }

    const roads = project.roads || [];
    const result = { buildings: 0, roads: 0, vehicles: 0, positions: 0 };

    // Count buildings to delete
    if (selectedTypes.has('buildings')) {
      for (const col of project.columns || []) {
        countNodesAfter(project.structure[col.key] || [], cutoff, r => result.buildings += r);
      }
    }

    // Count roads to delete
    if (selectedTypes.has('roads')) {
      result.roads = roads.filter(r => (r.createdAt || 0) >= cutoff || cutoff === 0).length;
    }

    // Count vehicles (roads that have non-default vehicle)
    if (selectedTypes.has('vehicles')) {
      result.vehicles = roads.filter(r =>
        r.vehicle && r.vehicle !== 'car' &&
        ((r.createdAt || 0) >= cutoff || cutoff === 0)
      ).length;
    }

    // Count positioned items
    if (selectedTypes.has('positions')) {
      for (const col of project.columns || []) {
        countPlacedAfter(project.structure[col.key] || [], cutoff, r => result.positions += r);
      }
    }

    const total = result.buildings + result.roads + result.vehicles + result.positions;
    return { ...result, total, cutoff };
  }, [project, selectedTypes, selectedTime]);

  const handleReset = () => {
    if (!impact || impact.total === 0) return;
    if (!showConfirm) { setShowConfirm(true); return; }
    if (confirmText !== (themeId === 'sand' ? '엎기' : 'reset')) return;

    const cutoff = impact.cutoff;
    const newProject = JSON.parse(JSON.stringify(project));

    // Delete buildings
    if (selectedTypes.has('buildings')) {
      for (const col of newProject.columns || []) {
        newProject.structure[col.key] = removeNodesAfter(newProject.structure[col.key] || [], cutoff);
      }
    }

    // Delete roads
    if (selectedTypes.has('roads')) {
      newProject.roads = (newProject.roads || []).filter(r =>
        !((r.createdAt || 0) >= cutoff || cutoff === 0)
      );
    }

    // Reset vehicles (set back to 'car')
    if (selectedTypes.has('vehicles') && !selectedTypes.has('roads')) {
      newProject.roads = (newProject.roads || []).map(r => {
        if (r.vehicle && r.vehicle !== 'car' && ((r.createdAt || 0) >= cutoff || cutoff === 0)) {
          return { ...r, vehicle: 'car' };
        }
        return r;
      });
    }

    // Reset positions
    if (selectedTypes.has('positions')) {
      for (const col of newProject.columns || []) {
        resetPositionsAfter(newProject.structure[col.key] || [], cutoff);
      }
    }

    onApplyReset(newProject);
    onClose();
  };

  const canExecute = selectedTypes.size > 0 && selectedTime && impact && impact.total > 0;
  const needsConfirm = showConfirm && confirmText === (themeId === 'sand' ? '엎기' : 'reset');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className={`${theme.bgPanel} border ${theme.border} rounded-xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`px-4 py-3 border-b ${theme.border} flex items-center`}>
          <Trash2 size={16} className="text-red-500 mr-2" />
          <span className={`font-bold ${theme.text} ${M} text-sm flex-1`}>
            {L('엎기', 'Reset')}
          </span>
          <button onClick={onClose} className={`p-1 rounded ${theme.textMuted}`}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Item type checkboxes */}
          <div>
            <div className={`text-[11px] font-bold ${theme.text} ${M} mb-2`}>
              {L('삭제 항목 (중복 선택 가능)', 'What to delete (multi-select)')}
            </div>
            <div className="space-y-1.5">
              {ITEM_TYPES.map(type => (
                <label key={type.key}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    selectedTypes.has(type.key)
                      ? 'border-red-400 bg-red-50'
                      : `${theme.border} ${theme.bgAlt}`
                  }`}>
                  <input type="checkbox" checked={selectedTypes.has(type.key)}
                    onChange={() => toggleType(type.key)}
                    className="w-4 h-4 rounded accent-red-500" />
                  <span className="text-base">{type.emoji}</span>
                  <span className={`text-[11px] ${theme.text} ${M}`}>
                    {L(type.label_ko, type.label_en)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Time range radio */}
          <div>
            <div className={`text-[11px] font-bold ${theme.text} ${M} mb-2`}>
              {L('시기 (하나 선택)', 'Time range (pick one)')}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_RANGES.map(range => (
                <button key={range.key}
                  onClick={() => setSelectedTime(range.key)}
                  className={`px-2 py-1.5 text-[10px] rounded-lg border font-bold ${M} transition-all ${
                    selectedTime === range.key
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : `${theme.border} ${theme.button}`
                  }`}>
                  {L(range.label_ko, range.label_en)}
                </button>
              ))}
            </div>
          </div>

          {/* Impact preview */}
          {impact && impact.total > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <div className="text-[11px] font-bold text-red-700 flex items-center gap-1">
                <AlertTriangle size={12} /> {L('삭제 예상', 'Will be deleted')}
              </div>
              {impact.buildings > 0 && <div className={`text-[10px] text-red-600 ${M}`}>🏢 {L('건물', 'Buildings')}: {impact.buildings}{L('개', '')}</div>}
              {impact.roads > 0 && <div className={`text-[10px] text-red-600 ${M}`}>🛤️ {L('도로', 'Roads')}: {impact.roads}{L('개', '')}</div>}
              {impact.vehicles > 0 && <div className={`text-[10px] text-red-600 ${M}`}>🚗 {L('탈것 초기화', 'Vehicles reset')}: {impact.vehicles}{L('개', '')}</div>}
              {impact.positions > 0 && <div className={`text-[10px] text-red-600 ${M}`}>📍 {L('배치 초기화', 'Positions reset')}: {impact.positions}{L('개', '')}</div>}
              <div className={`text-[11px] font-bold text-red-800 pt-1 border-t border-red-200 ${M}`}>
                {L('총', 'Total')}: {impact.total}{L('건', ' items')}
              </div>
            </div>
          )}

          {impact && impact.total === 0 && selectedTypes.size > 0 && selectedTime && (
            <div className={`text-center py-3 text-[11px] ${theme.textMuted} ${M}`}>
              {L('해당 조건에 삭제할 항목이 없습니다', 'Nothing to delete for this selection')}
            </div>
          )}

          {/* Confirm step */}
          {showConfirm && canExecute && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <div className={`text-[11px] font-bold text-red-800 ${M} mb-2`}>
                {L(`"엎기"를 입력하세요`, `Type "reset" to confirm`)}
              </div>
              <input type="text" value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={L('엎기', 'reset')}
                className={`w-full px-3 py-2 text-sm border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 ${M} bg-white`}
                autoFocus />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${theme.border} flex gap-2`}>
          <button onClick={onClose}
            className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border ${M} ${theme.button}`}>
            {L('취소', 'Cancel')}
          </button>
          <button onClick={handleReset}
            disabled={!canExecute || (showConfirm && !needsConfirm)}
            className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border disabled:opacity-30 ${M} ${
              showConfirm && needsConfirm
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-red-500 text-white border-red-600 disabled:bg-red-300'
            }`}>
            <Trash2 size={12} className="inline mr-1" />
            {showConfirm ? L('확인 — 엎기 실행', 'Confirm — Execute Reset') : L('엎기', 'Reset')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Helpers =====

function countNodesAfter(nodes, cutoff, callback) {
  let count = 0;
  for (const n of nodes) {
    if ((n.createdAt || 0) >= cutoff || cutoff === 0) count++;
    if (n.children?.length) countNodesAfter(n.children, cutoff, (c) => count += c);
  }
  callback(count);
}

function countPlacedAfter(nodes, cutoff, callback) {
  let count = 0;
  for (const n of nodes) {
    if (n.placed && n.cityX != null && ((n.createdAt || 0) >= cutoff || cutoff === 0)) count++;
    if (n.children?.length) countPlacedAfter(n.children, cutoff, (c) => count += c);
  }
  callback(count);
}

function removeNodesAfter(nodes, cutoff) {
  return nodes.filter(n => {
    if ((n.createdAt || 0) >= cutoff || cutoff === 0) return false;
    if (n.children?.length) n.children = removeNodesAfter(n.children, cutoff);
    return true;
  });
}

function resetPositionsAfter(nodes, cutoff) {
  for (const n of nodes) {
    if ((n.createdAt || 0) >= cutoff || cutoff === 0) {
      delete n.cityX; delete n.cityY;
      n.placed = false;
    }
    if (n.children?.length) resetPositionsAfter(n.children, cutoff);
  }
}
