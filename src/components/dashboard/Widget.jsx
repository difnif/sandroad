import React from 'react';
import AnalogDots from './AnalogDots.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';

// Widget color classes per theme
const WIDGET_COLOR_BY_THEME = {
  sand: {
    stone:   { pill: 'bg-stone-100 text-stone-700 border-stone-300',       active: 'bg-stone-700 text-white border-stone-700' },
    red:     { pill: 'bg-red-50 text-red-700 border-red-300',              active: 'bg-red-600 text-white border-red-600' },
    amber:   { pill: 'bg-amber-50 text-amber-800 border-amber-300',        active: 'bg-amber-600 text-white border-amber-600' },
    rose:    { pill: 'bg-rose-50 text-rose-700 border-rose-300',           active: 'bg-rose-600 text-white border-rose-600' },
    emerald: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-300',  active: 'bg-emerald-600 text-white border-emerald-600' },
    sky:     { pill: 'bg-sky-50 text-sky-700 border-sky-300',              active: 'bg-sky-600 text-white border-sky-600' }
  },
  dark: {
    stone:   { pill: 'bg-[#2d2d30] text-[#cccccc] border-[#3e3e42]',  active: 'bg-[#cccccc] text-[#1e1e1e] border-[#cccccc]' },
    red:     { pill: 'bg-[#3c1f1f] text-[#f48771] border-[#5a2828]',  active: 'bg-[#f48771] text-[#1e1e1e] border-[#f48771]' },
    amber:   { pill: 'bg-[#3c2f1f] text-[#dcdcaa] border-[#5a4528]',  active: 'bg-[#dcdcaa] text-[#1e1e1e] border-[#dcdcaa]' },
    rose:    { pill: 'bg-[#3c1f2a] text-[#f48771] border-[#5a2842]',  active: 'bg-[#f48771] text-[#1e1e1e] border-[#f48771]' },
    emerald: { pill: 'bg-[#1f3c25] text-[#6a9955] border-[#285a32]',  active: 'bg-[#6a9955] text-[#1e1e1e] border-[#6a9955]' },
    sky:     { pill: 'bg-[#1f2d3c] text-[#569cd6] border-[#28425a]',  active: 'bg-[#569cd6] text-[#1e1e1e] border-[#569cd6]' }
  },
  light: {
    stone:   { pill: 'bg-[#f3f3f3] text-[#1e1e1e] border-[#d4d4d4]',  active: 'bg-[#1e1e1e] text-white border-[#1e1e1e]' },
    red:     { pill: 'bg-[#fde8e8] text-[#a51616] border-[#f8b4b4]',  active: 'bg-[#dc2626] text-white border-[#dc2626]' },
    amber:   { pill: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',  active: 'bg-[#d97706] text-white border-[#d97706]' },
    rose:    { pill: 'bg-[#fde8e8] text-[#a51616] border-[#f8b4b4]',  active: 'bg-[#e11d48] text-white border-[#e11d48]' },
    emerald: { pill: 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]',  active: 'bg-[#059669] text-white border-[#059669]' },
    sky:     { pill: 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]',  active: 'bg-[#0066b8] text-white border-[#0066b8]' }
  }
};

export const WIDGET_COLOR_KEYS = ['stone', 'red', 'amber', 'rose', 'emerald', 'sky'];

export default function Widget({
  widgetKey, def, cfg, value, isActive, showWarn, dashStyle, analogMode, balanceText, label, onClick
}) {
  const { theme, themeId } = useTheme();
  if (!cfg?.enabled) return null;
  const colorMap = WIDGET_COLOR_BY_THEME[themeId] || WIDGET_COLOR_BY_THEME.sand;
  const colorClasses = colorMap[cfg.color] || colorMap.stone;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const baseInactive = themeId === 'sand'
    ? 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
    : themeId === 'dark'
      ? 'bg-[#2d2d30] text-[#cccccc] border-[#3e3e42] hover:border-[#464649]'
      : 'bg-white text-[#1e1e1e] border-[#d4d4d4] hover:border-[#9e9e9e]';

  let displayValue;
  if (def.isBalance) {
    displayValue = balanceText;
  } else if (dashStyle === 'analog') {
    displayValue = <AnalogDots value={value} max={def.analogMax} mode={analogMode} />;
  } else {
    displayValue = value;
  }

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md border text-[11px] font-medium ${monoCls} flex items-center gap-1.5 transition-all ${
        isActive ? colorClasses.active : (showWarn ? colorClasses.pill : baseInactive)
      }`}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-mono">{displayValue}</span>
    </button>
  );
}
