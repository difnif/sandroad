import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { computeCityLayout, getDistrictColor } from '../../utils/cityLayout.js';
import { formatColumnNumber } from '../../utils/numbering.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const GRID_SIZE = 20; // snap grid
const LONG_PRESS_MS = 500;

export default function CityCanvas({
  project, themeId,
  selectedId, onSelectNode,
  onRequestInlineEdit,
  onPositionConfirm // (itemId, {x, y}) => void
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();

  const [viewState, setViewState] = useState({ panX: 0, panY: 0, zoom: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [hoveredId, setHoveredId] = useState(null);
  const initializedRef = useRef(false);

  // Drag state
  const [dragState, setDragState] = useState(null);
  // { itemId, origX, origY, currentX, currentY, itemW, itemH, phase: 'dragging' | 'dropped' }

  // Interaction refs
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef(null);
  const longPressTimer = useRef(null);
  const longPressTarget = useRef(null); // { id, worldX, worldY }

  const layout = useMemo(() => computeCityLayout(project), [project]);

  const projectIdRef = useRef(null);
  useEffect(() => {
    const pid = project?.id || null;
    if (pid !== projectIdRef.current) {
      projectIdRef.current = pid;
      initializedRef.current = false;
    }
  }, [project]);

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-center once
  useEffect(() => {
    if (layout.districts.length === 0) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    const bounds = getLayoutBounds(layout);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const bw = bounds.maxX - bounds.minX + 100;
    const bh = bounds.maxY - bounds.minY + 100;
    const zoom = Math.min(canvasSize.w / bw, canvasSize.h / bh, 1.5);
    setViewState({
      panX: canvasSize.w / 2 - cx * zoom,
      panY: canvasSize.h / 2 - cy * zoom,
      zoom: Math.max(0.3, zoom)
    });
  }, [layout, canvasSize]);

  // ====== Helpers ======
  const screenToWorld = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - viewState.panX) / viewState.zoom,
      y: (clientY - rect.top - viewState.panY) / viewState.zoom
    };
  }, [viewState]);

  const hitTest = useCallback((worldX, worldY) => {
    const buildings = layout.allItems.filter(i => i.type === 'building').reverse();
    for (const b of buildings) {
      if (worldX >= b.x && worldX <= b.x + b.w && worldY >= b.y && worldY <= b.y + b.h) return b;
    }
    const lands = layout.allItems.filter(i => i.type === 'land').reverse();
    for (const l of lands) {
      if (worldX >= l.x && worldX <= l.x + l.w && worldY >= l.y && worldY <= l.y + l.h) return l;
    }
    return null;
  }, [layout]);

  const snapToGrid = (v) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTarget.current = null;
  };

  const startLongPress = (clientX, clientY) => {
    const world = screenToWorld(clientX, clientY);
    const hit = hitTest(world.x, world.y);
    if (!hit) return;

    longPressTarget.current = { id: hit.id, startClientX: clientX, startClientY: clientY };

    longPressTimer.current = setTimeout(() => {
      // Enter drag mode
      const item = layout.allItems.find(i => i.id === hit.id);
      if (!item) return;
      setDragState({
        itemId: item.id,
        origX: item.x,
        origY: item.y,
        currentX: item.x,
        currentY: item.y,
        itemW: item.w,
        itemH: item.h,
        phase: 'dragging'
      });
      onSelectNode?.(item.id);
      // Vibrate feedback on mobile
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  };

  // ====== Draw ======
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    canvas.style.width = canvasSize.w + 'px';
    canvas.style.height = canvasSize.h + 'px';
    ctx.scale(dpr, dpr);

    const bgColor = themeId === 'dark' ? '#1e1e1e' : themeId === 'light' ? '#f8f8f8' : '#fef7e0';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    ctx.save();
    ctx.translate(viewState.panX, viewState.panY);
    ctx.scale(viewState.zoom, viewState.zoom);

    // Background grid
    drawGrid(ctx, viewState, canvasSize, themeId);

    // Snap grid (stronger, only during drag)
    if (dragState && dragState.phase === 'dragging') {
      drawSnapGrid(ctx, viewState, canvasSize, themeId);
    }

    // Districts
    layout.districts.forEach((dist, idx) => {
      const colors = getDistrictColor(themeId, dist.color);
      drawDistrict(ctx, dist, colors, formatColumnNumber(idx), themeId);
    });

    const lands = layout.allItems.filter(i => i.type === 'land');
    const buildings = layout.allItems.filter(i => i.type === 'building');

    // Roads
    for (const item of layout.allItems) {
      if (item.parentId) {
        const parent = layout.allItems.find(p => p.id === item.parentId);
        if (parent) drawRoad(ctx, parent, item, themeId);
      }
    }

    // Lands
    for (const land of lands) {
      const isDragging = dragState?.itemId === land.id;
      const drawX = isDragging ? dragState.currentX : land.x;
      const drawY = isDragging ? dragState.currentY : land.y;
      const drawItem = { ...land, x: drawX, y: drawY };

      const dist = layout.districts.find(d => d.key === findColKey(project, land.id));
      const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
      const isSelected = selectedId === land.id;
      const isHovered = hoveredId === land.id;

      if (isDragging) {
        // Ghost at original position
        ctx.globalAlpha = 0.2;
        drawLand(ctx, { ...land }, colors, false, false, themeId);
        ctx.globalAlpha = 1;
        // Actual at drag position
        drawLand(ctx, drawItem, colors, true, false, themeId);
      } else {
        drawLand(ctx, drawItem, colors, isSelected, isHovered, themeId);
      }
    }

    // Buildings
    for (const bld of buildings) {
      const isDragging = dragState?.itemId === bld.id;
      const drawX = isDragging ? dragState.currentX : bld.x;
      const drawY = isDragging ? dragState.currentY : bld.y;
      const drawItem = { ...bld, x: drawX, y: drawY };

      const dist = layout.districts.find(d => d.key === findColKey(project, bld.id));
      const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
      const isSelected = selectedId === bld.id;
      const isHovered = hoveredId === bld.id;

      if (isDragging) {
        ctx.globalAlpha = 0.2;
        drawBuilding(ctx, { ...bld }, colors, false, false, themeId);
        ctx.globalAlpha = 1;
        drawBuilding(ctx, drawItem, colors, true, false, themeId);
      } else {
        drawBuilding(ctx, drawItem, colors, isSelected, isHovered, themeId);
      }
    }

    // Drag crosshair guides
    if (dragState && dragState.phase === 'dragging') {
      const cx = dragState.currentX + (dragState.itemW || 0) / 2;
      const cy = dragState.currentY + (dragState.itemH || 0) / 2;
      ctx.strokeStyle = themeId === 'dark' ? 'rgba(78,201,176,0.5)' : 'rgba(245,158,11,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      // Horizontal guide
      ctx.beginPath(); ctx.moveTo(cx - 500, cy); ctx.lineTo(cx + 500, cy); ctx.stroke();
      // Vertical guide
      ctx.beginPath(); ctx.moveTo(cx, cy - 500); ctx.lineTo(cx, cy + 500); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Confirm/Cancel overlay (in screen coords, outside the transform)
    if (dragState && dragState.phase === 'dropped') {
      const sx = dragState.currentX * viewState.zoom + viewState.panX;
      const sy = (dragState.currentY + (dragState.itemH || 48) + 10) * viewState.zoom + viewState.panY;
      // These are drawn as DOM overlays instead — see JSX below
    }

  }, [layout, viewState, canvasSize, themeId, selectedId, hoveredId, project, dragState]);

  // ====== Pointer handlers ======
  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') return;
    if (dragState?.phase === 'dropped') return; // confirm/cancel mode

    if (dragState?.phase === 'dragging') {
      // Drop
      setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null);
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);

    if (hit) {
      // Start long-press detection
      startLongPress(e.clientX, e.clientY);
    }

    isPanning.current = true;
    panStart.current = { x: e.clientX - viewState.panX, y: e.clientY - viewState.panY };
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return;

    // Cancel long press if moved too much
    if (longPressTarget.current) {
      const d = Math.hypot(
        e.clientX - longPressTarget.current.startClientX,
        e.clientY - longPressTarget.current.startClientY
      );
      if (d > 8) clearLongPress();
    }

    // Drag mode
    if (dragState?.phase === 'dragging') {
      const world = screenToWorld(e.clientX, e.clientY);
      setDragState(prev => prev ? {
        ...prev,
        currentX: snapToGrid(world.x - (prev.itemW || 0) / 2),
        currentY: snapToGrid(world.y - (prev.itemH || 0) / 2)
      } : null);
      return;
    }

    // Hover
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);
    setHoveredId(hit?.id || null);

    if (isPanning.current && !dragState) {
      setViewState(prev => clampView({
        ...prev,
        panX: e.clientX - panStart.current.x,
        panY: e.clientY - panStart.current.y
      }, canvasSize, layout));
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') return;
    clearLongPress();

    if (dragState?.phase === 'dragging') {
      setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null);
      isPanning.current = false;
      return;
    }

    isPanning.current = false;

    const dx = Math.abs(e.clientX - (panStart.current.x + viewState.panX));
    const dy = Math.abs(e.clientY - (panStart.current.y + viewState.panY));
    if (dx < 5 && dy < 5 && !dragState) {
      const world = screenToWorld(e.clientX, e.clientY);
      const hit = hitTest(world.x, world.y);
      const now = Date.now();
      if (hit) {
        if (now - lastTapTime.current < 400 && selectedId === hit.id) {
          onRequestInlineEdit?.(hit.id);
        } else {
          onSelectNode?.(hit.id);
        }
      } else {
        onSelectNode?.(null);
      }
      lastTapTime.current = now;
    }
  };

  // ====== Touch handlers ======
  const handleTouchStart = (e) => {
    if (dragState?.phase === 'dropped') return;

    if (e.touches.length === 1) {
      const t = e.touches[0];

      if (dragState?.phase === 'dragging') return; // already dragging

      startLongPress(t.clientX, t.clientY);
      isPanning.current = true;
      panStart.current = { x: t.clientX - viewState.panX, y: t.clientY - viewState.panY };
    } else if (e.touches.length === 2) {
      clearLongPress();
      isPanning.current = false;
      lastTouchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();

    // Cancel long press if moved
    if (longPressTarget.current && e.touches.length === 1) {
      const t = e.touches[0];
      const d = Math.hypot(
        t.clientX - longPressTarget.current.startClientX,
        t.clientY - longPressTarget.current.startClientY
      );
      if (d > 8) clearLongPress();
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];

      if (dragState?.phase === 'dragging') {
        const world = screenToWorld(t.clientX, t.clientY);
        setDragState(prev => prev ? {
          ...prev,
          currentX: snapToGrid(world.x - (prev.itemW || 0) / 2),
          currentY: snapToGrid(world.y - (prev.itemH || 0) / 2)
        } : null);
        return;
      }

      if (isPanning.current) {
        setViewState(prev => clampView({
          ...prev,
          panX: t.clientX - panStart.current.x,
          panY: t.clientY - panStart.current.y
        }, canvasSize, layout));
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDist.current > 0) {
        const rawScale = dist / lastTouchDist.current;
        const scale = 1 + (rawScale - 1) * 0.5;
        setViewState(prev => clampView({
          ...prev,
          zoom: Math.max(0.15, Math.min(5, prev.zoom * scale))
        }, canvasSize, layout));
      }
      lastTouchDist.current = dist;

      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
      if (lastTouchCenter.current) {
        setViewState(prev => clampView({
          ...prev,
          panX: prev.panX + (center.x - lastTouchCenter.current.x),
          panY: prev.panY + (center.y - lastTouchCenter.current.y)
        }, canvasSize, layout));
      }
      lastTouchCenter.current = center;
    }
  };

  const handleTouchEnd = (e) => {
    clearLongPress();

    if (dragState?.phase === 'dragging' && e.changedTouches.length === 1) {
      setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null);
      isPanning.current = false;
      return;
    }

    if (isPanning.current && e.changedTouches.length === 1 && !dragState) {
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - (panStart.current.x + viewState.panX));
      const dy = Math.abs(t.clientY - (panStart.current.y + viewState.panY));
      if (dx < 10 && dy < 10) {
        const world = screenToWorld(t.clientX, t.clientY);
        const hit = hitTest(world.x, world.y);
        const now = Date.now();
        if (hit) {
          if (now - lastTapTime.current < 400 && selectedId === hit.id) {
            onRequestInlineEdit?.(hit.id);
          } else {
            onSelectNode?.(hit.id);
          }
        } else {
          onSelectNode?.(null);
        }
        lastTapTime.current = now;
      }
    }
    isPanning.current = false;
    lastTouchDist.current = 0;
    lastTouchCenter.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (dragState) return;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setViewState(prev => {
      const newZoom = Math.max(0.15, Math.min(5, prev.zoom * factor));
      const cx = canvasSize.w / 2, cy = canvasSize.h / 2;
      const ratio = newZoom / prev.zoom;
      return clampView({ zoom: newZoom, panX: cx - (cx - prev.panX) * ratio, panY: cy - (cy - prev.panY) * ratio }, canvasSize, layout);
    });
  };

  // ====== Confirm / Cancel ======
  const handleConfirm = () => {
    if (dragState?.phase === 'dropped') {
      onPositionConfirm?.(dragState.itemId, { x: dragState.currentX, y: dragState.currentY });
      setDragState(null);
    }
  };
  const handleCancel = () => {
    setDragState(null);
  };

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  // Confirm/cancel button screen position
  const confirmPos = dragState?.phase === 'dropped' ? {
    x: dragState.currentX * viewState.zoom + viewState.panX + (dragState.itemW || 0) * viewState.zoom / 2,
    y: (dragState.currentY + (dragState.itemH || 48)) * viewState.zoom + viewState.panY + 12
  } : null;

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: dragState?.phase === 'dragging' ? 'grabbing' : isPanning.current ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      />

      {/* Drag hint */}
      {dragState?.phase === 'dragging' && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 ${theme.bgPanel} border ${theme.border} rounded-full px-3 py-1 text-[10px] ${theme.textMuted} ${monoCls} shadow-md`}>
          {lang === 'ko' ? '원하는 위치에 놓으세요' : 'Drop at desired position'}
        </div>
      )}

      {/* Confirm/Cancel buttons */}
      {confirmPos && (
        <div
          className="absolute flex items-center gap-2 z-20"
          style={{ left: confirmPos.x, top: confirmPos.y, transform: 'translateX(-50%)' }}
        >
          <button
            onClick={handleConfirm}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg ${theme.buttonPrimary}`}
          >
            {lang === 'ko' ? '확인' : 'Confirm'}
          </button>
          <button
            onClick={handleCancel}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-lg ${theme.button} border`}
          >
            {lang === 'ko' ? '취소' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Long press hint (shown when item is hovered and not dragging) */}
      {hoveredId && !dragState && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${theme.bgPanel} border ${theme.border} rounded-full px-3 py-1 text-[9px] ${theme.textDim} ${monoCls}`}>
          {lang === 'ko' ? '꾹 눌러서 배치 변경' : 'Long press to move'}
        </div>
      )}
    </div>
  );
}

// ===== Drawing functions =====

function drawGrid(ctx, viewState, canvasSize, themeId) {
  const gridColor = themeId === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
  const step = 50;
  const startX = Math.floor((-viewState.panX / viewState.zoom - 500) / step) * step;
  const startY = Math.floor((-viewState.panY / viewState.zoom - 500) / step) * step;
  const endX = startX + canvasSize.w / viewState.zoom + 1000;
  const endY = startY + canvasSize.h / viewState.zoom + 1000;
  ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5;
  for (let x = startX; x < endX; x += step) { ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke(); }
  for (let y = startY; y < endY; y += step) { ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke(); }
}

function drawSnapGrid(ctx, viewState, canvasSize, themeId) {
  const gridColor = themeId === 'dark' ? 'rgba(78,201,176,0.08)' : 'rgba(245,158,11,0.1)';
  const step = GRID_SIZE;
  const startX = Math.floor((-viewState.panX / viewState.zoom - 200) / step) * step;
  const startY = Math.floor((-viewState.panY / viewState.zoom - 200) / step) * step;
  const endX = startX + canvasSize.w / viewState.zoom + 400;
  const endY = startY + canvasSize.h / viewState.zoom + 400;
  ctx.strokeStyle = gridColor; ctx.lineWidth = 0.3;
  for (let x = startX; x < endX; x += step) { ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke(); }
  for (let y = startY; y < endY; y += step) { ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke(); }
}

function drawDistrict(ctx, dist, colors, roman, themeId) {
  ctx.fillStyle = colors.fill; ctx.strokeStyle = colors.border; ctx.lineWidth = 3;
  roundedRect(ctx, dist.x, dist.y, dist.width, dist.height, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = colors.text; ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`${roman}. ${dist.label}`, dist.x + 16, dist.y + 10);
}

function drawLand(ctx, land, colors, isSelected, isHovered, themeId) {
  if (isHovered || isSelected) {
    ctx.shadowColor = isSelected ? 'rgba(245,158,11,0.4)' : 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = colors.landFill;
  ctx.strokeStyle = isSelected ? '#f59e0b' : colors.border;
  ctx.lineWidth = isSelected ? 2.5 : 1.5;
  ctx.setLineDash([6, 3]);
  roundedRect(ctx, land.x, land.y, land.w, land.h, 8); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.fillStyle = colors.text; ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`[L${land.depth}] ${land.name || ''}`, land.x + 8, land.y + 6);
}

function drawBuilding(ctx, bld, colors, isSelected, isHovered, themeId) {
  ctx.shadowColor = isHovered ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHovered ? 6 : 3; ctx.shadowOffsetY = isHovered ? 3 : 1;
  ctx.fillStyle = isSelected ? '#fef3c7' : colors.bldFill;
  ctx.strokeStyle = isSelected ? '#f59e0b' : colors.border;
  ctx.lineWidth = isSelected ? 2 : 1;
  roundedRect(ctx, bld.x, bld.y, bld.w, bld.h, 4); ctx.fill(); ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.fillStyle = colors.border;
  roundedRect(ctx, bld.x, bld.y, bld.w, 6, 4); ctx.fill();
  ctx.fillStyle = colors.text; ctx.font = '9px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((bld.name || '').slice(0, 8), bld.x + bld.w / 2, bld.y + bld.h / 2 + 2);
  const tags = bld.tags || {}; let dotX = bld.x + 6; const dotY = bld.y + bld.h - 6;
  if (tags.common) { ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI*2); ctx.fill(); dotX += 8; }
  if (tags.linked) { ctx.fillStyle = '#14b8a6'; ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI*2); ctx.fill(); dotX += 8; }
  if (tags.review) { ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI*2); ctx.fill(); }
}

function drawRoad(ctx, from, to, themeId) {
  const fx = from.x + (from.w||0)/2, fy = from.y + (from.h||0)/2;
  const tx = to.x + (to.w||0)/2, ty = to.y + (to.h||0)/2;
  ctx.strokeStyle = themeId === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = themeId === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.setLineDash([]);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r); ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h); ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r); ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y); ctx.closePath();
}

function clampView(view, canvasSize, layout) {
  if (!layout.districts.length) return view;
  const bounds = getLayoutBounds(layout);
  const margin = 200; const z = view.zoom;
  let { panX, panY, zoom } = view;
  const cMinX = bounds.minX * z + panX, cMaxX = bounds.maxX * z + panX;
  const cMinY = bounds.minY * z + panY, cMaxY = bounds.maxY * z + panY;
  if (cMaxX < -margin) panX += (-margin - cMaxX);
  if (cMinX > canvasSize.w + margin) panX -= (cMinX - canvasSize.w - margin);
  if (cMaxY < -margin) panY += (-margin - cMaxY);
  if (cMinY > canvasSize.h + margin) panY -= (cMinY - canvasSize.h - margin);
  return { panX, panY, zoom };
}

function getLayoutBounds(layout) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of layout.districts) {
    minX = Math.min(minX, d.x); minY = Math.min(minY, d.y);
    maxX = Math.max(maxX, d.x + d.width); maxY = Math.max(maxY, d.y + d.height);
  }
  for (const item of layout.allItems) {
    minX = Math.min(minX, item.x); minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + (item.w||0)); maxY = Math.max(maxY, item.y + (item.h||0));
  }
  return { minX, minY, maxX, maxY };
}

function findColKey(project, nodeId) {
  if (!project) return null;
  for (const col of project.columns || []) {
    if (findInTree(project.structure[col.key] || [], nodeId)) return col.key;
  }
  return null;
}

function findInTree(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return true;
    if (n.children && findInTree(n.children, id)) return true;
  }
  return false;
}
