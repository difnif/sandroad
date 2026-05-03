import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import {
  BUILDING_TYPES, BUILDING_CATEGORIES,
  DATA_TYPES, VEHICLE_TYPES, ROAD_TYPES,
  getLabel, getDesc
} from '../../constants/unitTypes.js';

// mode: 'building' | 'data' | 'vehicle' | 'road'
export default function UnitTypePicker({ mode, currentValue, onSelect, onClose }) {
  const { theme, themeId } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';
  const [hoveredKey, setHoveredKey] = useState(null);

  const config = getConfig(mode);
  const title = lang === 'ko' ? config.title_ko : config.title_en;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-40" onClick={onClose}>
      <div
        className={`${theme.bgPanel} border ${theme.border} rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 border-b ${theme.border} flex items-center`}>
          <span className={`font-bold ${theme.text} ${monoCls} flex-1 text-sm`}>{title}</span>
          <button onClick={onClose} className={`p-1 rounded ${theme.textMuted}`}><X size={16} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {mode === 'building' ? (
            // Grouped by category
            Object.entries(BUILDING_CATEGORIES).map(([catKey, catInfo]) => {
              const items = Object.entries(BUILDING_TYPES).filter(([, v]) => v.category === catKey);
              if (items.length === 0) return null;
              return (
                <div key={catKey} className="mb-3">
                  <div className={`text-[10px] font-bold ${theme.textMuted} ${monoCls} mb-1.5 px-1`}
                    style={{ color: catInfo.color }}>
                    {lang === 'ko' ? catInfo.label_ko : catInfo.label_en}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map(([key, info]) => (
                      <TypeButton key={key} typeKey={key} info={info}
                        isSelected={currentValue === key} isHovered={hoveredKey === key}
                        lang={lang} theme={theme} monoCls={monoCls}
                        onSelect={() => { onSelect(key); onClose(); }}
                        onHover={() => setHoveredKey(key)} onLeave={() => setHoveredKey(null)} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Flat list for data/vehicle/road
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(config.types).map(([key, info]) => (
                <TypeButton key={key} typeKey={key} info={info}
                  isSelected={currentValue === key} isHovered={hoveredKey === key}
                  lang={lang} theme={theme} monoCls={monoCls}
                  onSelect={() => { onSelect(key); onClose(); }}
                  onHover={() => setHoveredKey(key)} onLeave={() => setHoveredKey(null)} />
              ))}
            </div>
          )}
        </div>

        {/* Hover detail */}
        {hoveredKey && (
          <div className={`px-4 py-2 border-t ${theme.border} ${theme.bgAlt}`}>
            <HoverDetail mode={mode} typeKey={hoveredKey} lang={lang} theme={theme} monoCls={monoCls} />
          </div>
        )}
      </div>
    </div>
  );
}

function TypeButton({ typeKey, info, isSelected, isHovered, lang, theme, monoCls, onSelect, onHover, onLeave }) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${monoCls} ${
        isSelected
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
          : isHovered
            ? `${theme.bgHover} ${theme.border}`
            : `${theme.bgAlt} ${theme.border}`
      }`}
    >
      <span className="text-lg flex-shrink-0">{info.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-bold ${theme.text} truncate`}>
          {lang === 'ko' ? info.label_ko : info.label_en}
        </div>
        {info.city && (
          <div className={`text-[9px] ${theme.textDim} truncate`}>
            {info.city}
          </div>
        )}
      </div>
      {isSelected && <span className="text-amber-500 text-xs font-bold">✓</span>}
    </button>
  );
}

function HoverDetail({ mode, typeKey, lang, theme, monoCls }) {
  let info;
  if (mode === 'building') info = BUILDING_TYPES[typeKey];
  else if (mode === 'data') info = DATA_TYPES[typeKey];
  else if (mode === 'vehicle') info = VEHICLE_TYPES[typeKey];
  else if (mode === 'road') info = ROAD_TYPES[typeKey];
  if (!info) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{info.emoji || ''}</span>
      <div>
        <div className={`text-[11px] font-bold ${theme.text} ${monoCls}`}>
          {lang === 'ko' ? info.label_ko : info.label_en}
        </div>
        <div className={`text-[10px] ${theme.textMuted}`}>
          {lang === 'ko' ? (info.desc_ko || '') : (info.desc_en || '')}
        </div>
      </div>
      {info.color && (
        <div className="ml-auto w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
      )}
    </div>
  );
}

function getConfig(mode) {
  switch (mode) {
    case 'building':
      return { title_ko: '건물 유형 선택', title_en: 'Select Building Type', types: BUILDING_TYPES };
    case 'data':
      return { title_ko: '데이터 유형 선택', title_en: 'Select Data Type', types: DATA_TYPES };
    case 'vehicle':
      return { title_ko: '이동 수단 선택', title_en: 'Select Vehicle Type', types: VEHICLE_TYPES };
    case 'road':
      return { title_ko: '도로 유형 선택', title_en: 'Select Road Type', types: ROAD_TYPES };
    default:
      return { title_ko: '유형 선택', title_en: 'Select Type', types: {} };
  }
}
