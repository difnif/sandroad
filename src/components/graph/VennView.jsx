import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { computeVennLayout, getVennColor, DEPTH_OPACITY } from '../../utils/vennLayout.js';
import { formatColumnNumber, formatDepthNumber } from '../../utils/numbering.js';

export default function VennView({
  project, themeId,
  selectedId, onSelectNode,
  onRequestInlineEdit, onPositionChange
}) {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const [viewSize, setViewSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) setViewSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const layout = useMemo(
    () => computeVennLayout(project, Math.max(viewSize.w / zoom, 1200), Math.max(viewSize.h / zoom, 800)),
    [project, viewSize, zoom]
  );

  // Count siblings for numbering
  const siblingMap = useMemo(() => {
    const map = {};
    for (const col of layout.columns) {
      const byParent = {};
      for (const item of col.items) {
        const key = item.depth === 1 ? 'root' : 'child';
        // Simple approach: group by depth within same column
      }
      // Build from project structure
      const items = project?.structure?.[col.key] || [];
      buildSiblingMap(items, map);
    }
    return map;
  }, [layout, project]);

  // --- Interaction handlers ---
  const handlePointerDown = (e, itemId) => {
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const item = findItem(layout, itemId);
    if (!item) return;
    setDragging({
      id: itemId,
      startX: (e.clientX - rect.left) / zoom - pan.x,
      startY: (e.clientY - rect.top) / zoom - pan.y,
      origX: item.x,
      origY: item.y
    });
  };

  const handlePointerMove = (e) => {
    if (dragging) {
      // Item drag — not implemented as position override yet
      // For now just visual feedback
    }
    if (panning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + dx / zoom, y: prev.y + dy / zoom }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e) => {
    if (dragging) {
      setDragging(null);
    }
    if (panning) {
      setPanning(false);
      setPanStart(null);
    }
  };

  const handleBgPointerDown = (e) => {
    setPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleItemTap = (e, itemId) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapTime < 400 && selectedId === itemId) {
      onRequestInlineEdit?.(itemId);
    } else {
      onSelectNode?.(itemId);
    }
    setLastTapTime(now);
  };

  const handleBgTap = () => {
    onSelectNode?.(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      style={{ touchAction: 'none', cursor: panning ? 'grabbing' : 'grab' }}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleBgTap}
      onWheel={handleWheel}
    >
      <svg
        width={viewSize.w}
        height={viewSize.h}
        className="absolute inset-0"
      >
        <g transform={`translate(${pan.x * zoom}, ${pan.y * zoom}) scale(${zoom})`}>
          {/* Column circles */}
          {layout.columns.map((col, colIdx) => {
            const vc = getVennColor(themeId, col.color);
            const roman = formatColumnNumber(colIdx);
            return (
              <g key={col.key}>
                {/* Column background circle */}
                <circle
                  cx={col.cx}
                  cy={col.cy}
                  r={col.radius}
                  fill={vc.bg}
                  stroke={vc.border}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                />
                {/* Column label */}
                <text
                  x={col.cx}
                  y={col.cy - col.radius + 22}
                  textAnchor="middle"
                  fill={vc.text}
                  fontSize={14}
                  fontWeight="bold"
                  fontFamily="monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  {roman}. {col.label}
                </text>
                <text
                  x={col.cx}
                  y={col.cy - col.radius + 38}
                  textAnchor="middle"
                  fill={vc.text}
                  fontSize={10}
                  fontFamily="monospace"
                  opacity={0.6}
                  style={{ pointerEvents: 'none' }}
                >
                  {col.totalItems} items
                </text>

                {/* Item circles */}
                {col.items.map(item => {
                  const isSelected = selectedId === item.id;
                  const opacity = DEPTH_OPACITY[Math.min(item.depth - 1, 4)];
                  const sibIdx = siblingMap[item.id] ?? 0;
                  const numLabel = formatDepthNumber(item.depth, sibIdx);

                  // Colors: deeper = more transparent, smaller
                  const fillOpacity = item.hasChildren ? 0.15 : 0.25;
                  const strokeColor = isSelected ? '#f59e0b' : vc.border;
                  const strokeW = isSelected ? 3 : (item.depth === 1 ? 1.5 : 1);
                  const fillColor = isSelected
                    ? 'rgba(245,158,11,0.15)'
                    : vc.bg.replace(/[\d.]+\)$/, `${fillOpacity * opacity})`);

                  return (
                    <g
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => handleItemTap(e, item.id)}
                      onPointerDown={(e) => handlePointerDown(e, item.id)}
                    >
                      <circle
                        cx={item.x}
                        cy={item.y}
                        r={item.radius}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeW}
                      />
                      {/* Number badge */}
                      {item.radius >= 12 && (
                        <text
                          x={item.x - item.radius + 12}
                          y={item.y - item.radius + 14}
                          fontSize={item.depth === 1 ? 10 : 8}
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill={vc.text}
                          opacity={0.7}
                          style={{ pointerEvents: 'none' }}
                        >
                          {numLabel}
                        </text>
                      )}
                      {/* Name */}
                      {item.radius >= 18 && (
                        <text
                          x={item.x}
                          y={item.y + (item.hasChildren ? -2 : 1)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={item.depth === 1 ? 12 : item.depth === 2 ? 9 : 7}
                          fontWeight={item.depth <= 2 ? 'bold' : 'normal'}
                          fontFamily="monospace"
                          fill={vc.text}
                          opacity={opacity}
                          style={{ pointerEvents: 'none' }}
                        >
                          {(item.name || '').slice(0, Math.floor(item.radius / 5))}
                        </text>
                      )}
                      {/* Tag dots */}
                      {item.depth <= 2 && item.radius >= 20 && (
                        <g transform={`translate(${item.x}, ${item.y + item.radius - 8})`}>
                          {item.tags?.common && <circle cx={-8} cy={0} r={2.5} fill="#6366f1" />}
                          {item.tags?.linked && <circle cx={0} cy={0} r={2.5} fill="#14b8a6" />}
                          {item.tags?.review && <circle cx={8} cy={0} r={2.5} fill="#f43f5e" />}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className={`absolute bottom-3 left-3 flex items-center gap-1 ${theme.bgPanel} border ${theme.border} rounded-lg px-2 py-1 shadow-md`}>
        <button
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className={`w-6 h-6 flex items-center justify-center text-sm font-bold ${theme.text} rounded hover:${theme.bgHover}`}
        >+</button>
        <span className={`text-[10px] ${theme.textMuted} ${monoCls} w-10 text-center`}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.max(0.3, prev / 1.2))}
          className={`w-6 h-6 flex items-center justify-center text-sm font-bold ${theme.text} rounded hover:${theme.bgHover}`}
        >−</button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className={`text-[9px] ${theme.textMuted} ${monoCls} ml-1`}
        >reset</button>
      </div>
    </div>
  );
}

// Find an item across all columns
function findItem(layout, id) {
  for (const col of layout.columns) {
    const found = col.items.find(i => i.id === id);
    if (found) return found;
  }
  return null;
}

// Build sibling index map from tree structure
function buildSiblingMap(nodes, map, depth = 1) {
  nodes.forEach((n, idx) => {
    map[n.id] = idx;
    if (n.children) buildSiblingMap(n.children, map, depth + 1);
  });
}
