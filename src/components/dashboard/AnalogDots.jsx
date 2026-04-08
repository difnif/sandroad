import React from 'react';

// Render N dots representing a (possibly fractional) value
export default function AnalogDots({ value, max = 5, mode = 'precise', colorClass = 'bg-stone-700' }) {
  const v = mode === 'rounded' ? Math.round(value) : value;
  const displayMax = Math.max(max, Math.ceil(v));
  const dots = [];
  for (let i = 0; i < displayMax; i++) {
    const fill = Math.max(0, Math.min(1, v - i));
    if (fill >= 0.98) {
      dots.push(
        <span key={i} className={`inline-block w-2 h-2 rounded-full ${colorClass}`} />
      );
    } else if (fill <= 0.02) {
      dots.push(
        <span key={i} className="inline-block w-2 h-2 rounded-full border border-stone-300" />
      );
    } else {
      const pct = fill * 100;
      dots.push(
        <span key={i} className="inline-block w-2 h-2 rounded-full border border-stone-300 relative overflow-hidden">
          <span
            className={`absolute left-0 top-0 bottom-0 ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </span>
      );
    }
  }
  return <span className="inline-flex gap-0.5 items-center">{dots}</span>;
}
