import React from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { getBuildingType, getLabel } from '../../constants/unitTypes.js';

// Small badge for tree nodes and city buildings
// Shows emoji + abbreviated label
export default function UnitBadge({ buildingType, onClick, compact }) {
  const { theme, themeId } = useTheme();
  const lang = themeId === 'sand' ? 'ko' : 'en';
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const info = getBuildingType(buildingType);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] ${monoCls} ${theme.bgAlt} border ${theme.border}`}
        title={`${info.emoji} ${getLabel(info, lang)}`}
        style={{ borderLeftColor: info.color, borderLeftWidth: 2 }}
      >
        {info.emoji}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${monoCls} ${theme.bgAlt} border ${theme.border} hover:${theme.bgHover}`}
      style={{ borderLeftColor: info.color, borderLeftWidth: 3 }}
    >
      <span>{info.emoji}</span>
      <span className={theme.textMuted}>{getLabel(info, lang)}</span>
    </button>
  );
}
