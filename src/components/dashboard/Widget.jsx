import React from 'react';
import AnalogDots from './AnalogDots.jsx';

export const WIDGET_COLOR_CLASSES = {
  stone:   { pill: 'bg-stone-100 text-stone-700 border-stone-300',       active: 'bg-stone-700 text-white border-stone-700' },
  red:     { pill: 'bg-red-50 text-red-700 border-red-300',              active: 'bg-red-600 text-white border-red-600' },
  amber:   { pill: 'bg-amber-50 text-amber-800 border-amber-300',        active: 'bg-amber-600 text-white border-amber-600' },
  rose:    { pill: 'bg-rose-50 text-rose-700 border-rose-300',           active: 'bg-rose-600 text-white border-rose-600' },
  emerald: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-300',  active: 'bg-emerald-600 text-white border-emerald-600' },
  sky:     { pill: 'bg-sky-50 text-sky-700 border-sky-300',              active: 'bg-sky-600 text-white border-sky-600' }
};

export default function Widget({
  widgetKey, def, cfg, value, isActive, showWarn, dashStyle, analogMode, balanceText, onClick
}) {
  if (!cfg?.enabled) return null;
  const colorClasses = WIDGET_COLOR_CLASSES[cfg.color] || WIDGET_COLOR_CLASSES.stone;

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
      className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1.5 transition-all ${
        isActive
          ? colorClasses.active
          : (showWarn ? colorClasses.pill : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400')
      }`}
    >
      <span className="opacity-70">{def.label}</span>
      <span className="font-mono">{displayValue}</span>
    </button>
  );
}
