import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { computeCityLayout, getDistrictColor } from '../../utils/cityLayout.js';
import { VEHICLE_INFO, ROAD_TYPES, createVehicleAnimState } from '../../utils/cityRoads.js';
import { formatColumnNumber } from '../../utils/numbering.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const GRID_SIZE = 20;
const LONG_PRESS_MS = 500;

export default function CityCanvas({
  project, themeId,
  selectedId, onSelectNode,
  onRequestInlineEdit,
  onPositionConfirm,
  // Phase 2+3
  roads,           // project.roads array
  onRoadCreate,    // (fromId, toId, type, vehicle) => void
  onRoadDelete,    // (roadId) => void
  onPlaceItem,     // (itemId, {x,y}) => void — confirm unplaced item placement
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

  // Road drawing mode
  const [roadMode, setRoadMode] = useState(false);
  const [roadFrom, setRoadFrom] = useState(null); // first selected node id
  const [roadType, setRoadType] = useState('main');
  const [roadVehicle, setRoadVehicle] = useState('car');

  // Vehicle animations
  const vehicleAnims = useRef([]);
  const animFrameRef = useRef(null);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef(null);
  const longPressTimer = useRef(null);
  const longPressTarget = useRef(null);

  const layout = useMemo(() => computeCityLayout(project), [project]);
  const allRoads = roads || [];

  const projectIdRef = useRef(null);
  useEffect(() => {
    const pid = project?.id || null;
    if (pid !== projectIdRef.current) { projectIdRef.current = pid; initializedRef.current = false; }
  }, [project]);

  // Init vehicle anims when roads change
  useEffect(() => {
    vehicleAnims.current = allRoads.map(r => createVehicleAnimState(r));
  }, [allRoads]);

  // Resize
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(e => { if (e[0]) setCanvasSize({ w: e[0].contentRect.width, h: e[0].contentRect.height }); });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  // Auto-center once
  useEffect(() => {
    if (layout.districts.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const bounds = getLayoutBounds(layout);
    const cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
    const bw = bounds.maxX - bounds.minX + 100, bh = bounds.maxY - bounds.minY + 100;
    const zoom = Math.min(canvasSize.w / bw, canvasSize.h / bh, 1.5);
    setViewState({ panX: canvasSize.w / 2 - cx * zoom, panY: canvasSize.h / 2 - cy * zoom, zoom: Math.max(0.3, zoom) });
  }, [layout, canvasSize]);

  // Helpers
  const screenToWorld = useCallback((cx, cy) => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return { x: 0, y: 0 };
    return { x: (cx - r.left - viewState.panX) / viewState.zoom, y: (cy - r.top - viewState.panY) / viewState.zoom };
  }, [viewState]);

  const hitTest = useCallback((wx, wy) => {
    // Check unplaced first
    for (const u of [...layout.unplacedItems].reverse()) {
      if (wx >= u.x && wx <= u.x + u.w && wy >= u.y && wy <= u.y + u.h) return { ...u, isUnplaced: true };
    }
    const buildings = layout.allItems.filter(i => i.type === 'building').reverse();
    for (const b of buildings) { if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return b; }
    const lands = layout.allItems.filter(i => i.type === 'land').reverse();
    for (const l of lands) { if (wx >= l.x && wx <= l.x + l.w && wy >= l.y && wy <= l.y + l.h) return l; }
    return null;
  }, [layout]);

  const snapToGrid = (v) => Math.round(v / GRID_SIZE) * GRID_SIZE;
  const clearLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } longPressTarget.current = null; };

  const startLongPress = (cx, cy) => {
    const world = screenToWorld(cx, cy);
    const hit = hitTest(world.x, world.y);
    if (!hit) return;
    longPressTarget.current = { id: hit.id, startClientX: cx, startClientY: cy };
    longPressTimer.current = setTimeout(() => {
      const item = layout.allItems.find(i => i.id === hit.id) || layout.unplacedItems.find(i => i.id === hit.id);
      if (!item) return;
      setDragState({ itemId: item.id, origX: item.x, origY: item.y, currentX: item.x, currentY: item.y, itemW: item.w, itemH: item.h, phase: 'dragging', isUnplaced: !!hit.isUnplaced });
      onSelectNode?.(item.id);
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  };

  // ====== Draw + Animate ======
  useEffect(() => {
    let running = true;

    const draw = () => {
      if (!running) return;
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasSize.w * dpr; canvas.height = canvasSize.h * dpr;
      canvas.style.width = canvasSize.w + 'px'; canvas.style.height = canvasSize.h + 'px';
      ctx.scale(dpr, dpr);

      const bgColor = themeId === 'dark' ? '#1e1e1e' : themeId === 'light' ? '#f8f8f8' : '#fef7e0';
      ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      ctx.save();
      ctx.translate(viewState.panX, viewState.panY);
      ctx.scale(viewState.zoom, viewState.zoom);

      drawGrid(ctx, viewState, canvasSize, themeId);
      if (dragState?.phase === 'dragging') drawSnapGrid(ctx, viewState, canvasSize, themeId);

      // Districts
      layout.districts.forEach((dist, idx) => {
        const colors = getDistrictColor(themeId, dist.color);
        drawDistrict(ctx, dist, colors, formatColumnNumber(idx));
      });

      // Roads
      const itemMap = {};
      for (const item of layout.allItems) itemMap[item.id] = item;
      for (const item of layout.unplacedItems) itemMap[item.id] = item;

      allRoads.forEach(road => {
        const fromItem = itemMap[road.from], toItem = itemMap[road.to];
        if (!fromItem || !toItem) return;
        const colors = getDistrictColor(themeId, fromItem.colKey ? (layout.districts.find(d => d.key === fromItem.colKey)?.color || 'stone') : 'stone');
        drawRoadLine(ctx, fromItem, toItem, road, colors, themeId);
      });

      // Hierarchy roads
      for (const item of layout.allItems) {
        if (item.parentId) {
          const parent = itemMap[item.parentId];
          if (parent) drawHierRoad(ctx, parent, item, themeId);
        }
      }

      // Lands
      const lands = layout.allItems.filter(i => i.type === 'land');
      const buildings = layout.allItems.filter(i => i.type === 'building');

      for (const land of lands) {
        const isDragging = dragState?.itemId === land.id;
        const drawItem = isDragging ? { ...land, x: dragState.currentX, y: dragState.currentY } : land;
        const dist = layout.districts.find(d => d.key === land.colKey);
        const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
        if (isDragging) { ctx.globalAlpha = 0.2; drawLand(ctx, land, colors, false, false); ctx.globalAlpha = 1; }
        drawLand(ctx, drawItem, colors, selectedId === land.id, hoveredId === land.id);
      }

      for (const bld of buildings) {
        const isDragging = dragState?.itemId === bld.id;
        const drawItem = isDragging ? { ...bld, x: dragState.currentX, y: dragState.currentY } : bld;
        const dist = layout.districts.find(d => d.key === bld.colKey);
        const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
        if (isDragging) { ctx.globalAlpha = 0.2; drawBuilding(ctx, bld, colors, false, false); ctx.globalAlpha = 1; }
        drawBuilding(ctx, drawItem, colors, selectedId === bld.id, hoveredId === bld.id);
      }

      // Unplaced items (translucent, pulsing border)
      for (const item of layout.unplacedItems) {
        const isDragging = dragState?.itemId === item.id;
        const drawItem = isDragging ? { ...item, x: dragState.currentX, y: dragState.currentY } : item;
        const dist = layout.districts.find(d => d.key === item.colKey);
        const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
        const pulse = 0.4 + Math.sin(Date.now() / 500) * 0.15;
        ctx.globalAlpha = pulse;
        if (item.type === 'land') drawLand(ctx, drawItem, colors, selectedId === item.id, false);
        else drawBuilding(ctx, drawItem, colors, selectedId === item.id, false);
        ctx.globalAlpha = 1;
        // "NEW" badge
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('NEW', drawItem.x + (drawItem.w || 48) / 2, drawItem.y - 4);
      }

      // Vehicles on roads
      vehicleAnims.current.forEach(anim => {
        const road = allRoads.find(r => r.id === anim.roadId);
        if (!road) return;
        const fromItem = itemMap[road.from], toItem = itemMap[road.to];
        if (!fromItem || !toItem) return;

        // Update animation
        anim.progress += anim.speed;
        if (anim.progress > 1) { anim.progress = 0; anim.direction *= -1; }

        const t = anim.direction > 0 ? anim.progress : 1 - anim.progress;
        const fx = fromItem.x + (fromItem.w || 0) / 2, fy = fromItem.y + (fromItem.h || 0) / 2;
        const tx = toItem.x + (toItem.w || 0) / 2, ty = toItem.y + (toItem.h || 0) / 2;
        const vx = fx + (tx - fx) * t, vy = fy + (ty - fy) * t;

        const info = VEHICLE_INFO[anim.vehicle] || VEHICLE_INFO.car;
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(info.emoji, vx, vy);
      });

      // Road drawing mode indicator
      if (roadMode && roadFrom) {
        const fromItem = itemMap[roadFrom];
        if (fromItem) {
          ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
          const cx = fromItem.x + (fromItem.w || 0) / 2, cy = fromItem.y + (fromItem.h || 0) / 2;
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(fromItem.w || 0, fromItem.h || 0) / 2 + 8, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Drag crosshair
      if (dragState?.phase === 'dragging') {
        const cx = dragState.currentX + (dragState.itemW || 0) / 2, cy = dragState.currentY + (dragState.itemH || 0) / 2;
        ctx.strokeStyle = themeId === 'dark' ? 'rgba(78,201,176,0.5)' : 'rgba(245,158,11,0.5)';
        ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(cx - 500, cy); ctx.lineTo(cx + 500, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 500); ctx.lineTo(cx, cy + 500); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { running = false; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [layout, viewState, canvasSize, themeId, selectedId, hoveredId, project, dragState, allRoads, roadMode, roadFrom]);

  // ====== Pointer handlers ======
  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') return;
    if (dragState?.phase === 'dropped') return;
    if (dragState?.phase === 'dragging') { setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null); return; }
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);
    if (hit) startLongPress(e.clientX, e.clientY);
    isPanning.current = true;
    panStart.current = { x: e.clientX - viewState.panX, y: e.clientY - viewState.panY };
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    if (longPressTarget.current) { const d = Math.hypot(e.clientX - longPressTarget.current.startClientX, e.clientY - longPressTarget.current.startClientY); if (d > 8) clearLongPress(); }
    if (dragState?.phase === 'dragging') {
      const world = screenToWorld(e.clientX, e.clientY);
      setDragState(prev => prev ? { ...prev, currentX: snapToGrid(world.x - (prev.itemW || 0) / 2), currentY: snapToGrid(world.y - (prev.itemH || 0) / 2) } : null);
      return;
    }
    const world = screenToWorld(e.clientX, e.clientY); setHoveredId(hitTest(world.x, world.y)?.id || null);
    if (isPanning.current && !dragState) {
      setViewState(prev => clampView({ ...prev, panX: e.clientX - panStart.current.x, panY: e.clientY - panStart.current.y }, canvasSize, layout));
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') return;
    clearLongPress();
    if (dragState?.phase === 'dragging') { setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null); isPanning.current = false; return; }
    isPanning.current = false;
    const dx = Math.abs(e.clientX - (panStart.current.x + viewState.panX));
    const dy = Math.abs(e.clientY - (panStart.current.y + viewState.panY));
    if (dx < 5 && dy < 5 && !dragState) {
      const world = screenToWorld(e.clientX, e.clientY);
      const hit = hitTest(world.x, world.y);
      const now = Date.now();
      if (hit) {
        if (roadMode) {
          if (!roadFrom) { setRoadFrom(hit.id); }
          else if (hit.id !== roadFrom) { onRoadCreate?.(roadFrom, hit.id, roadType, roadVehicle); setRoadFrom(null); setRoadMode(false); }
        } else if (now - lastTapTime.current < 400 && selectedId === hit.id) {
          const item = layout.allItems.find(i => i.id === hit.id) || layout.unplacedItems.find(i => i.id === hit.id);
          if (item) setDragState({ itemId: item.id, origX: item.x, origY: item.y, currentX: item.x, currentY: item.y, itemW: item.w, itemH: item.h, phase: 'dragging', isUnplaced: item.placed === false });
        } else { onSelectNode?.(hit.id); }
      } else { onSelectNode?.(null); if (roadMode) { setRoadFrom(null); } }
      lastTapTime.current = now;
    }
  };

  // Touch
  const handleTouchStart = (e) => {
    if (dragState?.phase === 'dropped') return;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (!dragState?.phase) startLongPress(t.clientX, t.clientY);
      isPanning.current = true; panStart.current = { x: t.clientX - viewState.panX, y: t.clientY - viewState.panY };
    } else if (e.touches.length === 2) {
      clearLongPress(); isPanning.current = false;
      lastTouchDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      lastTouchCenter.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
    }
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    if (longPressTarget.current && e.touches.length === 1) { const t = e.touches[0]; if (Math.hypot(t.clientX - longPressTarget.current.startClientX, t.clientY - longPressTarget.current.startClientY) > 8) clearLongPress(); }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (dragState?.phase === 'dragging') { const w = screenToWorld(t.clientX, t.clientY); setDragState(prev => prev ? { ...prev, currentX: snapToGrid(w.x - (prev.itemW||0)/2), currentY: snapToGrid(w.y - (prev.itemH||0)/2) } : null); return; }
      if (isPanning.current) setViewState(prev => clampView({ ...prev, panX: t.clientX - panStart.current.x, panY: t.clientY - panStart.current.y }, canvasSize, layout));
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastTouchDist.current > 0) { const s = 1 + (dist / lastTouchDist.current - 1) * 0.5; setViewState(prev => clampView({ ...prev, zoom: Math.max(0.15, Math.min(5, prev.zoom * s)) }, canvasSize, layout)); }
      lastTouchDist.current = dist;
      const center = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      if (lastTouchCenter.current) setViewState(prev => clampView({ ...prev, panX: prev.panX + (center.x - lastTouchCenter.current.x), panY: prev.panY + (center.y - lastTouchCenter.current.y) }, canvasSize, layout));
      lastTouchCenter.current = center;
    }
  };
  const handleTouchEnd = (e) => {
    clearLongPress();
    if (dragState?.phase === 'dragging') { setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null); isPanning.current = false; return; }
    if (isPanning.current && e.changedTouches.length === 1 && !dragState) {
      const t = e.changedTouches[0]; const dx = Math.abs(t.clientX - (panStart.current.x + viewState.panX)); const dy = Math.abs(t.clientY - (panStart.current.y + viewState.panY));
      if (dx < 10 && dy < 10) {
        const w = screenToWorld(t.clientX, t.clientY); const hit = hitTest(w.x, w.y); const now = Date.now();
        if (hit) {
          if (roadMode) { if (!roadFrom) setRoadFrom(hit.id); else if (hit.id !== roadFrom) { onRoadCreate?.(roadFrom, hit.id, roadType, roadVehicle); setRoadFrom(null); setRoadMode(false); } }
          else if (now - lastTapTime.current < 400 && selectedId === hit.id) {
            const item = layout.allItems.find(i => i.id === hit.id) || layout.unplacedItems.find(i => i.id === hit.id);
            if (item) setDragState({ itemId: item.id, origX: item.x, origY: item.y, currentX: item.x, currentY: item.y, itemW: item.w, itemH: item.h, phase: 'dragging', isUnplaced: item.placed === false });
          } else onSelectNode?.(hit.id);
        } else { onSelectNode?.(null); if (roadMode) setRoadFrom(null); }
        lastTapTime.current = now;
      }
    }
    isPanning.current = false; lastTouchDist.current = 0; lastTouchCenter.current = null;
  };
  const handleWheel = (e) => {
    e.preventDefault(); if (dragState) return;
    const f = e.deltaY > 0 ? 0.95 : 1.05;
    setViewState(prev => { const nz = Math.max(0.15, Math.min(5, prev.zoom * f)); const cx = canvasSize.w / 2, cy = canvasSize.h / 2; const r = nz / prev.zoom; return clampView({ zoom: nz, panX: cx - (cx - prev.panX) * r, panY: cy - (cy - prev.panY) * r }, canvasSize, layout); });
  };

  // Confirm / Cancel
  const handleConfirm = () => {
    if (!dragState?.phase === 'dropped') return;
    if (dragState.isUnplaced) onPlaceItem?.(dragState.itemId, { x: dragState.currentX, y: dragState.currentY });
    else onPositionConfirm?.(dragState.itemId, { x: dragState.currentX, y: dragState.currentY });
    setDragState(null);
  };
  const handleCancel = () => setDragState(null);

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';
  const confirmPos = dragState?.phase === 'dropped' ? {
    x: dragState.currentX * viewState.zoom + viewState.panX + (dragState.itemW || 0) * viewState.zoom / 2,
    y: (dragState.currentY + (dragState.itemH || 48)) * viewState.zoom + viewState.panY + 12
  } : null;

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0"
        style={{ cursor: roadMode ? 'crosshair' : dragState?.phase === 'dragging' ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onWheel={handleWheel} />

      {/* Road mode toolbar */}
      <div className={`absolute top-3 right-3 flex flex-col gap-1 z-10`}>
        <button
          onClick={() => { setRoadMode(!roadMode); setRoadFrom(null); }}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg shadow-md border-2 transition-colors ${monoCls} ${
            roadMode
              ? 'bg-amber-500 text-white border-amber-600'
              : `${theme.bgPanel} ${theme.text} ${theme.border}`
          }`}
        >
          {roadMode ? (lang === 'ko' ? '🚧 도로 모드 ON' : '🚧 Road ON') : (lang === 'ko' ? '🛤️ 도로 깔기' : '🛤️ Add Road')}
        </button>
        {roadMode && (
          <div className={`${theme.bgPanel} border ${theme.border} rounded-lg p-2 shadow-md space-y-1`}>
            <div className={`text-[9px] ${theme.textMuted} ${monoCls}`}>
              {roadFrom
                ? (lang === 'ko' ? '도착지를 선택하세요' : 'Select destination')
                : (lang === 'ko' ? '출발지를 선택하세요' : 'Select source')}
            </div>
            <div className="flex gap-1">
              {Object.entries(ROAD_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setRoadType(k)}
                  className={`px-2 py-0.5 text-[9px] rounded border ${monoCls} ${roadType === k ? theme.buttonPrimary : theme.button}`}>
                  {lang === 'ko' ? v.label_ko : v.label_en}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {Object.entries(VEHICLE_INFO).map(([k, v]) => (
                <button key={k} onClick={() => setRoadVehicle(k)}
                  className={`px-2 py-0.5 text-[9px] rounded border ${monoCls} ${roadVehicle === k ? theme.buttonPrimary : theme.button}`}>
                  {v.emoji} {lang === 'ko' ? v.label_ko : v.label_en}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unplaced items count */}
      {layout.unplacedItems.length > 0 && (
        <div className={`absolute top-3 left-3 ${theme.bgPanel} border-2 border-amber-400 rounded-lg px-3 py-1.5 text-[11px] ${theme.text} ${monoCls} shadow-md`}>
          {lang === 'ko' ? `📦 미배치: ${layout.unplacedItems.length}개` : `📦 Unplaced: ${layout.unplacedItems.length}`}
        </div>
      )}

      {/* Drag hint */}
      {dragState?.phase === 'dragging' && (
        <div className={`absolute top-14 left-1/2 -translate-x-1/2 ${theme.bgPanel} border ${theme.border} rounded-full px-3 py-1 text-[10px] ${theme.textMuted} ${monoCls} shadow-md`}>
          {dragState.isUnplaced
            ? (lang === 'ko' ? '대지 안에 배치하세요' : 'Place inside a land')
            : (lang === 'ko' ? '원하는 위치에 놓으세요' : 'Drop at desired position')}
        </div>
      )}

      {/* RPG confirm/cancel */}
      {confirmPos && (
        <div className="absolute flex items-center gap-3 z-20" style={{ left: confirmPos.x, top: confirmPos.y, transform: 'translateX(-50%)' }}>
          <button onClick={handleConfirm} className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 transition-transform active:scale-90"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderColor: '#15803d', boxShadow: '0 4px 12px rgba(22,163,74,0.4), inset 0 1px 2px rgba(255,255,255,0.3)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
          <button onClick={handleCancel} className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 transition-transform active:scale-90"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderColor: '#b91c1c', boxShadow: '0 4px 12px rgba(220,38,38,0.4), inset 0 1px 2px rgba(255,255,255,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {/* Hover hint */}
      {hoveredId && !dragState && !roadMode && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${theme.bgPanel} border ${theme.border} rounded-full px-3 py-1 text-[9px] ${theme.textDim} ${monoCls}`}>
          {lang === 'ko' ? '더블클릭 또는 꾹 눌러서 배치 변경' : 'Double-click or long press to move'}
        </div>
      )}
    </div>
  );
}

// ===== Drawing =====
function drawGrid(ctx, vs, cs, t) { const c = t === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'; const s = 50; const sx = Math.floor((-vs.panX/vs.zoom-500)/s)*s; const sy = Math.floor((-vs.panY/vs.zoom-500)/s)*s; const ex = sx+cs.w/vs.zoom+1000; const ey = sy+cs.h/vs.zoom+1000; ctx.strokeStyle = c; ctx.lineWidth = 0.5; for (let x = sx; x < ex; x += s) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, ey); ctx.stroke(); } for (let y = sy; y < ey; y += s) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(ex, y); ctx.stroke(); } }
function drawSnapGrid(ctx, vs, cs, t) { const c = t === 'dark' ? 'rgba(78,201,176,0.08)' : 'rgba(245,158,11,0.1)'; const s = GRID_SIZE; const sx = Math.floor((-vs.panX/vs.zoom-200)/s)*s; const sy = Math.floor((-vs.panY/vs.zoom-200)/s)*s; const ex = sx+cs.w/vs.zoom+400; const ey = sy+cs.h/vs.zoom+400; ctx.strokeStyle = c; ctx.lineWidth = 0.3; for (let x = sx; x < ex; x += s) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, ey); ctx.stroke(); } for (let y = sy; y < ey; y += s) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(ex, y); ctx.stroke(); } }
function drawDistrict(ctx, d, c, r) { ctx.fillStyle = c.fill; ctx.strokeStyle = c.border; ctx.lineWidth = 3; roundedRect(ctx, d.x, d.y, d.width, d.height, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = c.text; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${r}. ${d.label}`, d.x + 16, d.y + 10); }
function drawLand(ctx, l, c, sel, hov) { if (hov||sel) { ctx.shadowColor = sel ? 'rgba(245,158,11,0.4)' : 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; } ctx.fillStyle = c.landFill; ctx.strokeStyle = sel ? '#f59e0b' : c.border; ctx.lineWidth = sel ? 2.5 : 1.5; ctx.setLineDash([6,3]); roundedRect(ctx, l.x, l.y, l.w, l.h, 8); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.fillStyle = c.text; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`[L${l.depth}] ${l.name||''}`, l.x+8, l.y+6); }
function drawBuilding(ctx, b, c, sel, hov) { ctx.shadowColor = hov ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'; ctx.shadowBlur = hov ? 6 : 3; ctx.shadowOffsetY = hov ? 3 : 1; ctx.fillStyle = sel ? '#fef3c7' : c.bldFill; ctx.strokeStyle = sel ? '#f59e0b' : c.border; ctx.lineWidth = sel ? 2 : 1; roundedRect(ctx, b.x, b.y, b.w, b.h, 4); ctx.fill(); ctx.stroke(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.fillStyle = c.border; roundedRect(ctx, b.x, b.y, b.w, 6, 4); ctx.fill(); ctx.fillStyle = c.text; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((b.name||'').slice(0,8), b.x+b.w/2, b.y+b.h/2+2); const tags = b.tags||{}; let dx = b.x+6; const dy = b.y+b.h-6; if (tags.common) { ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI*2); ctx.fill(); dx += 8; } if (tags.linked) { ctx.fillStyle = '#14b8a6'; ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI*2); ctx.fill(); dx += 8; } if (tags.review) { ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI*2); ctx.fill(); } }
function drawHierRoad(ctx, from, to, t) { const fx = from.x+(from.w||0)/2, fy = from.y+(from.h||0)/2, tx = to.x+(to.w||0)/2, ty = to.y+(to.h||0)/2; ctx.strokeStyle = t === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.strokeStyle = t === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1; ctx.setLineDash([3,5]); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
function drawRoadLine(ctx, from, to, road, colors, t) {
  const fx = from.x+(from.w||0)/2, fy = from.y+(from.h||0)/2, tx = to.x+(to.w||0)/2, ty = to.y+(to.h||0)/2;
  const rt = ROAD_TYPES[road.type] || ROAD_TYPES.main;
  const vi = VEHICLE_INFO[road.vehicle] || VEHICLE_INFO.car;
  // Road fill
  ctx.strokeStyle = colors.roadFill || (t === 'dark' ? '#3e3e42' : '#c4a45e');
  ctx.lineWidth = rt.width + 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  // Road surface
  ctx.strokeStyle = t === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = rt.width; if (rt.dash) ctx.setLineDash(rt.dash);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.setLineDash([]);
  // Center dash
  ctx.strokeStyle = vi.color; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.setLineDash([]);
}
function roundedRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
function clampView(v, cs, layout) { if (!layout.districts.length) return v; const b = getLayoutBounds(layout); const m = 200; let { panX, panY, zoom } = v; const cMinX = b.minX*zoom+panX, cMaxX = b.maxX*zoom+panX, cMinY = b.minY*zoom+panY, cMaxY = b.maxY*zoom+panY; if (cMaxX < -m) panX += (-m-cMaxX); if (cMinX > cs.w+m) panX -= (cMinX-cs.w-m); if (cMaxY < -m) panY += (-m-cMaxY); if (cMinY > cs.h+m) panY -= (cMinY-cs.h-m); return { panX, panY, zoom }; }
function getLayoutBounds(layout) { let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity; for (const d of layout.districts) { minX=Math.min(minX,d.x); minY=Math.min(minY,d.y); maxX=Math.max(maxX,d.x+d.width); maxY=Math.max(maxY,d.y+d.height); } for (const i of layout.allItems) { minX=Math.min(minX,i.x); minY=Math.min(minY,i.y); maxX=Math.max(maxX,i.x+(i.w||0)); maxY=Math.max(maxY,i.y+(i.h||0)); } for (const i of layout.unplacedItems||[]) { minX=Math.min(minX,i.x); minY=Math.min(minY,i.y); maxX=Math.max(maxX,i.x+(i.w||0)); maxY=Math.max(maxY,i.y+(i.h||0)); } return { minX, minY, maxX, maxY }; }
