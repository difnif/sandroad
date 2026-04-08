import React from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function AnalogDots({ value, max = 5, mode = 'precise' }) {
  const { themeId } = useTheme();
  const v = mode === 'rounded' ? Math.round(value) : value;
  const displayMax = Math.max(max, Math.ceil(v));
  const filledCls = themeId === 'sand' ? 'bg-stone-700' : themeId === 'dark' ? 'bg-[#cccccc]' : 'bg-[#1e1e1e]';
  const emptyCls = themeId === 'sand' ? 'border-stone-300' : themeId === 'dark' ? 'border-[#3e3e42]' : 'border-[#d4d4d4]';
  const dots = [];
  for (let i = 0; i < displayMax; i++) {
    const fill = Math.max(0, Math.min(1, v - i));
    if (fill >= 0.98) {
      dots.push(<span key={i} className={`inline-block w-2 h-2 rounded-full ${filledCls}`} />);
    } else if (fill <= 0.02) {
      dots.push(<span key={i} className={`inline-block w-2 h-2 rounded-full border ${emptyCls}`} />);
    } else {
      const pct = fill * 100;
      dots.push(
        <span key={i} className={`inline-block w-2 h-2 rounded-full border ${emptyCls} relative overflow-hidden`}>
          <span className={`absolute left-0 top-0 bottom-0 ${filledCls}`} style={{ width: `${pct}%` }} />
        </span>
      );
    }
  }
  return <span className="inline-flex gap-0.5 items-center">{dots}</span>;
}
