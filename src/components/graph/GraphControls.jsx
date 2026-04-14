import React from 'react';
import { Target, Palette, Eye, RotateCcw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const TILT_PRESETS = [0, 5, 10, 15, 20, 30];

export default function GraphControls({ mode, onModeChange, tilt, onTiltChange }) {
  const { theme, themeId } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const isFront = Math.abs(tilt) < 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onModeChange('focus')}
          className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1 ${monoCls} ${
            mode === 'focus' ? theme.buttonPrimary : theme.button
          }`}
          title="focus mode"
        >
          <Target size={12} /> focus
        </button>
        <button
          onClick={() => onModeChange('rainbow')}
          className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1 ${monoCls} ${
            mode === 'rainbow' ? theme.buttonPrimary : theme.button
          }`}
          title="rainbow mode"
        >
          <Palette size={12} /> rainbow
        </button>
      </div>

      <div className={`w-px h-5 ${theme.border}`} style={{ borderLeftWidth: 1 }} />

      {/* Tilt presets */}
      <div className="flex items-center gap-0.5">
        <Eye size={12} className={theme.textMuted} />
        {TILT_PRESETS.map(deg => (
          <button
            key={deg}
            onClick={() => onTiltChange(deg)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${monoCls} ${
              Math.abs(tilt - deg) < 1 ? theme.buttonPrimary : theme.button
            }`}
          >
            {deg}°
          </button>
        ))}
      </div>

      {/* Tilt slider */}
      <input
        type="range"
        min="-45"
        max="45"
        value={tilt}
        onChange={(e) => onTiltChange(Number(e.target.value))}
        className="w-24 accent-current"
        title={`tilt: ${tilt}°`}
      />
      <span className={`text-[10px] ${theme.textMuted} ${monoCls} w-10`}>{tilt}°</span>

      <button
        onClick={() => onTiltChange(0)}
        className={`p-1 ${theme.textMuted} hover:${theme.text} rounded`}
        title="reset to front view"
      >
        <RotateCcw size={12} />
      </button>
    </div>
  );
}
