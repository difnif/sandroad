import React from 'react';
import { Target, Palette, Eye, RotateCcw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const TILT_PRESETS = [0, 5, 10, 15, 20, 30];

export default function GraphControls({ mode, onModeChange, tilt, onTiltChange }) {
  const { theme } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <button onClick={() => onModeChange('focus')}
          className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 ${monoCls} ${mode === 'focus' ? theme.buttonPrimary : theme.button}`}>
          <Target size={11} /> focus
        </button>
        <button onClick={() => onModeChange('rainbow')}
          className={`px-2 py-1 rounded border text-[11px] flex items-center gap-1 ${monoCls} ${mode === 'rainbow' ? theme.buttonPrimary : theme.button}`}>
          <Palette size={11} /> rainbow
        </button>
      </div>
      <div className={`w-px h-5 ${theme.border}`} style={{ borderLeftWidth: 1 }} />
      <div className="flex items-center gap-0.5">
        <Eye size={11} className={theme.textMuted} />
        {TILT_PRESETS.map(deg => (
          <button key={deg} onClick={() => onTiltChange(deg)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${monoCls} ${Math.abs(tilt - deg) < 1 ? theme.buttonPrimary : theme.button}`}>
            {deg}°
          </button>
        ))}
      </div>
      <input type="range" min="-45" max="45" value={tilt}
        onChange={(e) => onTiltChange(Number(e.target.value))} className="w-20 accent-current" />
      <span className={`text-[10px] ${theme.textMuted} ${monoCls} w-8`}>{tilt}°</span>
      <button onClick={() => onTiltChange(0)} className={`p-1 ${theme.textMuted} rounded`}>
        <RotateCcw size={11} />
      </button>
    </div>
  );
}
