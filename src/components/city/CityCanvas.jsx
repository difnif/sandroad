import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { computeCityLayout, getDistrictColor } from '../../utils/cityLayout.js';
import { VEHICLE_TYPES, ROAD_TYPES, DATA_TYPES, createVehicleAnimState } from '../../utils/cityRoads.js';
import { BUILDING_TYPES, getBuildingType } from '../../constants/unitTypes.js';
import { formatColumnNumber } from '../../utils/numbering.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const GRID_SIZE = 20;
const LONG_PRESS_MS = 500;
const ROAD_HIT_DIST = 8; // px distance to consider a road click

export default function CityCanvas({
  project, themeId, selectedId, onSelectNode, onRequestInlineEdit,
  onPositionConfirm, roads, onRoadCreate, onRoadDelete, onPlaceItem,
  onRoadSelect, selectedRoadId, paused, speed
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();

  const [viewState, setViewState] = useState({ panX: 0, panY: 0, zoom: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredRoadId, setHoveredRoadId] = useState(null);
  const [hoveredVehicle, setHoveredVehicle] = useState(null); // { roadId, x, y, vehicle, label }
  const [dragState, setDragState] = useState(null);
  const [roadMode, setRoadMode] = useState(false);
  const [roadFrom, setRoadFrom] = useState(null);
  const [roadType, setRoadType] = useState('main');
  const [roadVehicle, setRoadVehicle] = useState('car');
  const initializedRef = useRef(false);

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
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  // Build item lookup
  const itemMap = useMemo(() => {
    const m = {};
    for (const i of layout.allItems) m[i.id] = i;
    for (const i of layout.unplacedItems) m[i.id] = i;
    return m;
  }, [layout]);

  const projectIdRef = useRef(null);
  useEffect(() => {
    const pid = project?.id || null;
    if (pid !== projectIdRef.current) { projectIdRef.current = pid; initializedRef.current = false; }
  }, [project]);

  useEffect(() => {
    vehicleAnims.current = allRoads.map(r => createVehicleAnimState(r));
  }, [allRoads]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(e => { if (e[0]) setCanvasSize({ w: e[0].contentRect.width, h: e[0].contentRect.height }); });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (layout.districts.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const b = getLayoutBounds(layout);
    const cx = (b.minX+b.maxX)/2, cy = (b.minY+b.maxY)/2;
    const bw = b.maxX-b.minX+100, bh = b.maxY-b.minY+100;
    const z = Math.min(canvasSize.w/bw, canvasSize.h/bh, 1.5);
    setViewState({ panX: canvasSize.w/2-cx*z, panY: canvasSize.h/2-cy*z, zoom: Math.max(0.3, z) });
  }, [layout, canvasSize]);

  // Space bar pause
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        // Toggle pause via parent
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Helpers
  const screenToWorld = useCallback((cx, cy) => {
    const r = canvasRef.current?.getBoundingClientRect(); if (!r) return { x: 0, y: 0 };
    return { x: (cx-r.left-viewState.panX)/viewState.zoom, y: (cy-r.top-viewState.panY)/viewState.zoom };
  }, [viewState]);

  const hitTest = useCallback((wx, wy) => {
    for (const u of [...layout.unplacedItems].reverse()) {
      if (wx >= u.x && wx <= u.x+u.w && wy >= u.y && wy <= u.y+u.h) return { ...u, isUnplaced: true };
    }
    const blds = layout.allItems.filter(i => i.type === 'building').reverse();
    for (const b of blds) { if (wx >= b.x && wx <= b.x+b.w && wy >= b.y && wy <= b.y+b.h) return b; }
    const lands = layout.allItems.filter(i => i.type === 'land').reverse();
    for (const l of lands) { if (wx >= l.x && wx <= l.x+l.w && wy >= l.y && wy <= l.y+l.h) return l; }
    return null;
  }, [layout]);

  // Hit test for roads (distance to line segment)
  const hitTestRoad = useCallback((wx, wy) => {
    for (const road of allRoads) {
      const from = itemMap[road.from], to = itemMap[road.to];
      if (!from || !to) continue;
      const fx = from.x+(from.w||0)/2, fy = from.y+(from.h||0)/2;
      const tx = to.x+(to.w||0)/2, ty = to.y+(to.h||0)/2;
      const dist = pointToSegmentDist(wx, wy, fx, fy, tx, ty);
      if (dist < ROAD_HIT_DIST) return road;
    }
    return null;
  }, [allRoads, itemMap]);

  // Hit test for vehicles
  const hitTestVehicle = useCallback((wx, wy) => {
    for (const anim of vehicleAnims.current) {
      if (Math.hypot(wx - anim.x, wy - anim.y) < 12) return anim;
    }
    return null;
  }, []);

  const snapToGrid = (v) => Math.round(v/GRID_SIZE)*GRID_SIZE;
  const clearLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); longPressTimer.current = null; longPressTarget.current = null; };

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
      const canvas = canvasRef.current; if (!canvas) { animFrameRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasSize.w*dpr; canvas.height = canvasSize.h*dpr;
      canvas.style.width = canvasSize.w+'px'; canvas.style.height = canvasSize.h+'px';
      ctx.scale(dpr, dpr);

      ctx.fillStyle = themeId === 'dark' ? '#1e1e1e' : themeId === 'light' ? '#f8f8f8' : '#fef7e0';
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      ctx.save();
      ctx.translate(viewState.panX, viewState.panY);
      ctx.scale(viewState.zoom, viewState.zoom);

      // Always-visible grid
      drawGrid(ctx, viewState, canvasSize, themeId, dragState?.phase === 'dragging');

      // Districts
      layout.districts.forEach((dist, idx) => {
        drawDistrict(ctx, dist, getDistrictColor(themeId, dist.color), formatColumnNumber(idx));
      });

      // Hierarchy roads (subtle)
      for (const item of layout.allItems) {
        if (item.parentId && itemMap[item.parentId]) {
          drawHierRoad(ctx, itemMap[item.parentId], item, themeId);
        }
      }

      // User roads
      allRoads.forEach(road => {
        const f = itemMap[road.from], t = itemMap[road.to];
        if (!f || !t) return;
        const dc = layout.districts.find(d => d.key === (f.colKey || ''));
        const colors = dc ? getDistrictColor(themeId, dc.color) : getDistrictColor(themeId, 'stone');
        const isSelected = selectedRoadId === road.id || hoveredRoadId === road.id;
        drawRoadLine(ctx, f, t, road, colors, themeId, isSelected);
      });

      // Lands
      for (const land of layout.allItems.filter(i => i.type === 'land')) {
        const isDrag = dragState?.itemId === land.id;
        const drawItem = isDrag ? { ...land, x: dragState.currentX, y: dragState.currentY } : land;
        const dc = layout.districts.find(d => d.key === land.colKey);
        const c = dc ? getDistrictColor(themeId, dc.color) : getDistrictColor(themeId, 'stone');
        if (isDrag) { ctx.globalAlpha = 0.2; drawLand(ctx, land, c, false, false); ctx.globalAlpha = 1; }
        drawLand(ctx, drawItem, c, selectedId === land.id, hoveredId === land.id);
      }

      // Buildings
      for (const bld of layout.allItems.filter(i => i.type === 'building')) {
        const isDrag = dragState?.itemId === bld.id;
        const drawItem = isDrag ? { ...bld, x: dragState.currentX, y: dragState.currentY } : bld;
        const dc = layout.districts.find(d => d.key === bld.colKey);
        const c = dc ? getDistrictColor(themeId, dc.color) : getDistrictColor(themeId, 'stone');
        if (isDrag) { ctx.globalAlpha = 0.2; drawBuilding(ctx, bld, c, false, false); ctx.globalAlpha = 1; }
        drawBuilding(ctx, drawItem, c, selectedId === bld.id, hoveredId === bld.id);
      }

      // Unplaced items
      for (const item of layout.unplacedItems) {
        const isDrag = dragState?.itemId === item.id;
        const drawItem = isDrag ? { ...item, x: dragState.currentX, y: dragState.currentY } : item;
        const dc = layout.districts.find(d => d.key === item.colKey);
        const c = dc ? getDistrictColor(themeId, dc.color) : getDistrictColor(themeId, 'stone');
        const pulse = 0.4 + Math.sin(Date.now()/500) * 0.15;
        ctx.globalAlpha = pulse;
        if (item.type === 'land') drawLand(ctx, drawItem, c, selectedId === item.id, false);
        else drawBuilding(ctx, drawItem, c, selectedId === item.id, false);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('NEW', drawItem.x + (drawItem.w||48)/2, drawItem.y - 4);
      }

      // Vehicles
      vehicleAnims.current.forEach(anim => {
        const road = allRoads.find(r => r.id === anim.roadId);
        if (!road) return;
        const f = itemMap[road.from], t = itemMap[road.to];
        if (!f || !t) return;

        // Animate (unless paused)
        if (!paused) {
          anim.progress += anim.speed * (speed || 1);
          if (anim.progress > 1) { anim.progress = 0; anim.direction *= -1; }
        }

        const p = anim.direction > 0 ? anim.progress : 1 - anim.progress;
        const fx = f.x+(f.w||0)/2, fy = f.y+(f.h||0)/2;
        const tx = t.x+(t.w||0)/2, ty = t.y+(t.h||0)/2;
        const vx = fx + (tx-fx)*p, vy = fy + (ty-fy)*p;
        anim.x = vx; anim.y = vy;
        anim.movingRight = (anim.direction > 0) ? (tx > fx) : (fx > tx);

        const info = VEHICLE_TYPES[anim.vehicle] || VEHICLE_TYPES.car;
        const isHovered = hoveredVehicle?.roadId === anim.roadId;

        ctx.save();
        ctx.translate(vx, vy);
        // Flip if moving left
        if (!anim.movingRight) ctx.scale(-1, 1);
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(info.emoji, 0, 0);
        ctx.restore();

        // Hover highlight
        if (isHovered) {
          ctx.strokeStyle = info.color; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(vx, vy, 12, 0, Math.PI*2); ctx.stroke();
        }
      });

      // Vehicle tooltip
      if (hoveredVehicle) {
        const info = VEHICLE_TYPES[hoveredVehicle.vehicle] || VEHICLE_TYPES.car;
        const dt = DATA_TYPES[hoveredVehicle.dataType] || DATA_TYPES.content;
        const fromItem = itemMap[hoveredVehicle.from];
        const toItem = itemMap[hoveredVehicle.to];
        const label = `${info.emoji}${dt.emoji} ${fromItem?.name || '?'} → ${toItem?.name || '?'}`;

        const tx = hoveredVehicle.x, ty = hoveredVehicle.y - 20;
        ctx.font = '10px monospace';
        const tw = ctx.measureText(label).width + 12;
        // Bubble
        ctx.fillStyle = themeId === 'dark' ? '#252526' : '#ffffff';
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 1.5;
        roundedRect(ctx, tx - tw/2, ty - 14, tw, 20, 6);
        ctx.fill(); ctx.stroke();
        // Arrow
        ctx.fillStyle = themeId === 'dark' ? '#252526' : '#ffffff';
        ctx.beginPath(); ctx.moveTo(tx-4, ty+6); ctx.lineTo(tx+4, ty+6); ctx.lineTo(tx, ty+12); ctx.closePath(); ctx.fill();
        // Text
        ctx.fillStyle = info.color;
        ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, tx, ty - 4);
      }

      // Road mode indicator
      if (roadMode && roadFrom) {
        const fi = itemMap[roadFrom];
        if (fi) {
          ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.setLineDash([4,4]);
          ctx.beginPath(); ctx.arc(fi.x+(fi.w||0)/2, fi.y+(fi.h||0)/2, Math.max(fi.w||0, fi.h||0)/2+8, 0, Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Drag crosshair
      if (dragState?.phase === 'dragging') {
        const cx = dragState.currentX + (dragState.itemW||0)/2, cy = dragState.currentY + (dragState.itemH||0)/2;
        ctx.strokeStyle = themeId === 'dark' ? 'rgba(78,201,176,0.5)' : 'rgba(245,158,11,0.5)';
        ctx.lineWidth = 1; ctx.setLineDash([6,4]);
        ctx.beginPath(); ctx.moveTo(cx-500, cy); ctx.lineTo(cx+500, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy-500); ctx.lineTo(cx, cy+500); ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { running = false; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [layout, viewState, canvasSize, themeId, selectedId, hoveredId, project, dragState, allRoads, roadMode, roadFrom, hoveredRoadId, hoveredVehicle, selectedRoadId, paused, speed, itemMap]);

  // ====== Pointer ======
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
    if (longPressTarget.current) { if (Math.hypot(e.clientX - longPressTarget.current.startClientX, e.clientY - longPressTarget.current.startClientY) > 8) clearLongPress(); }
    if (dragState?.phase === 'dragging') {
      const w = screenToWorld(e.clientX, e.clientY);
      setDragState(prev => prev ? { ...prev, currentX: snapToGrid(w.x-(prev.itemW||0)/2), currentY: snapToGrid(w.y-(prev.itemH||0)/2) } : null);
      return;
    }
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);
    setHoveredId(hit?.id || null);

    // Vehicle hover
    const vh = hitTestVehicle(world.x, world.y);
    setHoveredVehicle(vh ? { roadId: vh.roadId, x: vh.x, y: vh.y, vehicle: vh.vehicle, dataType: vh.dataType, from: vh.from, to: vh.to } : null);

    // Road hover
    if (!vh) {
      const rh = hitTestRoad(world.x, world.y);
      setHoveredRoadId(rh?.id || null);
    } else {
      setHoveredRoadId(vh.roadId);
    }

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
      const vh = hitTestVehicle(world.x, world.y);
      const rh = hitTestRoad(world.x, world.y);
      const now = Date.now();

      if (roadMode) {
        if (hit) {
          if (!roadFrom) setRoadFrom(hit.id);
          else if (hit.id !== roadFrom) { onRoadCreate?.(roadFrom, hit.id, roadType, roadVehicle); setRoadFrom(null); setRoadMode(false); }
        } else { setRoadFrom(null); }
      } else if (vh) {
        // Click on vehicle → select its road
        onRoadSelect?.(vh.roadId);
        onSelectNode?.(null);
      } else if (rh && !hit) {
        // Click on road
        onRoadSelect?.(rh.id);
        onSelectNode?.(null);
      } else if (hit) {
        if (now - lastTapTime.current < 400 && selectedId === hit.id) {
          const item = layout.allItems.find(i => i.id === hit.id) || layout.unplacedItems.find(i => i.id === hit.id);
          if (item) setDragState({ itemId: item.id, origX: item.x, origY: item.y, currentX: item.x, currentY: item.y, itemW: item.w, itemH: item.h, phase: 'dragging', isUnplaced: item.placed === false });
        } else {
          onSelectNode?.(hit.id);
          onRoadSelect?.(null);
        }
      } else {
        onSelectNode?.(null);
        onRoadSelect?.(null);
      }
      lastTapTime.current = now;
    }
  };

  // Touch
  const handleTouchStart = (e) => { if (dragState?.phase === 'dropped') return; if (e.touches.length === 1) { const t = e.touches[0]; if (!dragState?.phase) startLongPress(t.clientX, t.clientY); isPanning.current = true; panStart.current = { x: t.clientX-viewState.panX, y: t.clientY-viewState.panY }; } else if (e.touches.length === 2) { clearLongPress(); isPanning.current = false; lastTouchDist.current = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); lastTouchCenter.current = { x: (e.touches[0].clientX+e.touches[1].clientX)/2, y: (e.touches[0].clientY+e.touches[1].clientY)/2 }; } };
  const handleTouchMove = (e) => { e.preventDefault(); if (longPressTarget.current && e.touches.length === 1) { const t = e.touches[0]; if (Math.hypot(t.clientX-longPressTarget.current.startClientX, t.clientY-longPressTarget.current.startClientY) > 8) clearLongPress(); } if (e.touches.length === 1) { const t = e.touches[0]; if (dragState?.phase === 'dragging') { const w = screenToWorld(t.clientX, t.clientY); setDragState(prev => prev ? { ...prev, currentX: snapToGrid(w.x-(prev.itemW||0)/2), currentY: snapToGrid(w.y-(prev.itemH||0)/2) } : null); return; } if (isPanning.current) setViewState(prev => clampView({ ...prev, panX: t.clientX-panStart.current.x, panY: t.clientY-panStart.current.y }, canvasSize, layout)); } else if (e.touches.length === 2) { const dist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); if (lastTouchDist.current > 0) { const s = 1+(dist/lastTouchDist.current-1)*0.5; setViewState(prev => clampView({ ...prev, zoom: Math.max(0.3, Math.min(4, prev.zoom*s)) }, canvasSize, layout)); } lastTouchDist.current = dist; const c = { x: (e.touches[0].clientX+e.touches[1].clientX)/2, y: (e.touches[0].clientY+e.touches[1].clientY)/2 }; if (lastTouchCenter.current) setViewState(prev => clampView({ ...prev, panX: prev.panX+(c.x-lastTouchCenter.current.x), panY: prev.panY+(c.y-lastTouchCenter.current.y) }, canvasSize, layout)); lastTouchCenter.current = c; } };
  const handleTouchEnd = (e) => { clearLongPress(); if (dragState?.phase === 'dragging') { setDragState(prev => prev ? { ...prev, phase: 'dropped' } : null); isPanning.current = false; return; } if (isPanning.current && e.changedTouches.length === 1 && !dragState) { const t = e.changedTouches[0]; const dx = Math.abs(t.clientX-(panStart.current.x+viewState.panX)); const dy = Math.abs(t.clientY-(panStart.current.y+viewState.panY)); if (dx < 10 && dy < 10) { const w = screenToWorld(t.clientX, t.clientY); const hit = hitTest(w.x, w.y); const now = Date.now(); if (roadMode) { if (hit) { if (!roadFrom) setRoadFrom(hit.id); else if (hit.id !== roadFrom) { onRoadCreate?.(roadFrom, hit.id, roadType, roadVehicle); setRoadFrom(null); setRoadMode(false); } } else setRoadFrom(null); } else if (hit) { if (now-lastTapTime.current < 400 && selectedId === hit.id) { const item = layout.allItems.find(i => i.id === hit.id) || layout.unplacedItems.find(i => i.id === hit.id); if (item) setDragState({ itemId: item.id, origX: item.x, origY: item.y, currentX: item.x, currentY: item.y, itemW: item.w, itemH: item.h, phase: 'dragging', isUnplaced: item.placed === false }); } else { onSelectNode?.(hit.id); onRoadSelect?.(null); } } else { onSelectNode?.(null); onRoadSelect?.(null); } lastTapTime.current = now; } } isPanning.current = false; lastTouchDist.current = 0; lastTouchCenter.current = null; };
  const handleWheel = (e) => { e.preventDefault(); if (dragState) return; const f = e.deltaY > 0 ? 0.95 : 1.05; setViewState(prev => { const nz = Math.max(0.3, Math.min(4, prev.zoom*f)); const cx = canvasSize.w/2, cy = canvasSize.h/2; const r = nz/prev.zoom; return clampView({ zoom: nz, panX: cx-(cx-prev.panX)*r, panY: cy-(cy-prev.panY)*r }, canvasSize, layout); }); };

  const handleConfirm = () => { if (dragState?.phase !== 'dropped') return; if (dragState.isUnplaced) onPlaceItem?.(dragState.itemId, { x: dragState.currentX, y: dragState.currentY }); else onPositionConfirm?.(dragState.itemId, { x: dragState.currentX, y: dragState.currentY }); setDragState(null); };
  const handleCancel = () => setDragState(null);

  const confirmPos = dragState?.phase === 'dropped' ? {
    x: dragState.currentX*viewState.zoom + viewState.panX + (dragState.itemW||0)*viewState.zoom/2,
    y: (dragState.currentY + (dragState.itemH||48))*viewState.zoom + viewState.panY + 12
  } : null;

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0"
        style={{ cursor: roadMode ? 'crosshair' : dragState?.phase === 'dragging' ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onWheel={handleWheel} />

      {/* Road mode toolbar */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button onClick={() => { setRoadMode(!roadMode); setRoadFrom(null); }}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg shadow-md border-2 transition-colors ${monoCls} ${roadMode ? 'bg-amber-500 text-white border-amber-600' : `${theme.bgPanel} ${theme.text} ${theme.border}`}`}>
          {roadMode ? (lang === 'ko' ? '🚧 도로 ON' : '🚧 Road ON') : (lang === 'ko' ? '🛤️ 도로' : '🛤️ Road')}
        </button>
        {roadMode && (
          <div className={`${theme.bgPanel} border ${theme.border} rounded-lg p-2 shadow-md space-y-1`}>
            <div className={`text-[9px] ${theme.textMuted} ${monoCls}`}>
              {roadFrom ? (lang === 'ko' ? '도착지 선택' : 'Select dest') : (lang === 'ko' ? '출발지 선택' : 'Select source')}
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
              {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setRoadVehicle(k)}
                  className={`px-2 py-0.5 text-[9px] rounded border ${monoCls} ${roadVehicle === k ? theme.buttonPrimary : theme.button}`}>
                  {v.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unplaced count */}
      {layout.unplacedItems.length > 0 && (
        <div className={`absolute top-3 left-3 ${theme.bgPanel} border-2 border-amber-400 rounded-lg px-3 py-1.5 text-[11px] ${theme.text} ${monoCls} shadow-md z-10`}>
          📦 {layout.unplacedItems.length}
        </div>
      )}

      {/* Drag hint */}
      {dragState?.phase === 'dragging' && (
        <div className={`absolute top-14 left-1/2 -translate-x-1/2 ${theme.bgPanel} border ${theme.border} rounded-full px-3 py-1 text-[10px] ${theme.textMuted} ${monoCls} shadow-md z-10`}>
          {dragState.isUnplaced ? (lang === 'ko' ? '대지 안에 배치하세요' : 'Place inside a land') : (lang === 'ko' ? '원하는 위치에 놓으세요' : 'Drop at position')}
        </div>
      )}

      {/* RPG confirm/cancel */}
      {confirmPos && (
        <div className="absolute flex items-center gap-3 z-20" style={{ left: confirmPos.x, top: confirmPos.y, transform: 'translateX(-50%)' }}>
          <button onClick={handleConfirm} className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 active:scale-90"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderColor: '#15803d', boxShadow: '0 4px 12px rgba(22,163,74,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button onClick={handleCancel} className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 active:scale-90"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', borderColor: '#b91c1c', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Hover hint */}
      {hoveredId && !dragState && !roadMode && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${theme.bgPanel} border ${theme.border} rounded-full px-3 py-1 text-[9px] ${theme.textDim} ${monoCls} z-10`}>
          {lang === 'ko' ? '더블클릭 또는 꾹 눌러서 이동' : 'Double-click or long press to move'}
        </div>
      )}
    </div>
  );
}

// ===== Drawing =====
function drawGrid(ctx, vs, cs, t, snap) {
  // Always-visible base grid
  const baseColor = t === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const step = 50;
  const sx = Math.floor((-vs.panX/vs.zoom-500)/step)*step, sy = Math.floor((-vs.panY/vs.zoom-500)/step)*step;
  const ex = sx+cs.w/vs.zoom+1000, ey = sy+cs.h/vs.zoom+1000;
  ctx.strokeStyle = baseColor; ctx.lineWidth = 0.5;
  for (let x = sx; x < ex; x += step) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, ey); ctx.stroke(); }
  for (let y = sy; y < ey; y += step) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(ex, y); ctx.stroke(); }
  // Snap grid (stronger during drag)
  if (snap) {
    const snapColor = t === 'dark' ? 'rgba(78,201,176,0.12)' : 'rgba(245,158,11,0.15)';
    const ss = GRID_SIZE;
    const ssx = Math.floor((-vs.panX/vs.zoom-200)/ss)*ss, ssy = Math.floor((-vs.panY/vs.zoom-200)/ss)*ss;
    const sex = ssx+cs.w/vs.zoom+400, sey = ssy+cs.h/vs.zoom+400;
    ctx.strokeStyle = snapColor; ctx.lineWidth = 0.4;
    for (let x = ssx; x < sex; x += ss) { ctx.beginPath(); ctx.moveTo(x, ssy); ctx.lineTo(x, sey); ctx.stroke(); }
    for (let y = ssy; y < sey; y += ss) { ctx.beginPath(); ctx.moveTo(ssx, y); ctx.lineTo(sex, y); ctx.stroke(); }
  }
}
function drawDistrict(ctx, d, c, r) { ctx.fillStyle = c.fill; ctx.strokeStyle = c.border; ctx.lineWidth = 3; roundedRect(ctx, d.x, d.y, d.width, d.height, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = c.text; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${r}. ${d.label}`, d.x+16, d.y+10); }
function drawLand(ctx, l, c, sel, hov) { if (hov||sel) { ctx.shadowColor = sel ? 'rgba(245,158,11,0.4)' : 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; } ctx.fillStyle = c.landFill; ctx.strokeStyle = sel ? '#f59e0b' : c.border; ctx.lineWidth = sel ? 2.5 : 1.5; ctx.setLineDash([6,3]); roundedRect(ctx, l.x, l.y, l.w, l.h, 8); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.fillStyle = c.text; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`[L${l.depth}] ${l.name||''}`, l.x+8, l.y+6); }
function drawBuilding(ctx, b, c, sel, hov) {
  const bt = getBuildingType(b.buildingType);
  ctx.shadowColor = hov ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = hov ? 6 : 3; ctx.shadowOffsetY = hov ? 3 : 1;
  ctx.fillStyle = sel ? '#fef3c7' : c.bldFill;
  ctx.strokeStyle = sel ? '#f59e0b' : c.border;
  ctx.lineWidth = sel ? 2 : 1;
  roundedRect(ctx, b.x, b.y, b.w, b.h, 4); ctx.fill(); ctx.stroke();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  // Type color bar (left side)
  ctx.fillStyle = bt.color;
  ctx.fillRect(b.x, b.y, 4, b.h);
  // Roof accent
  ctx.fillStyle = bt.color;
  roundedRect(ctx, b.x, b.y, b.w, 6, 4); ctx.fill();
  // Type emoji (large, center-top)
  ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(bt.emoji, b.x + b.w / 2, b.y + b.h / 2 - 6);
  // Name (below emoji)
  ctx.fillStyle = c.text; ctx.font = '8px monospace';
  ctx.fillText((b.name || '').slice(0, 8), b.x + b.w / 2, b.y + b.h / 2 + 10);
  // Tag dots
  const tg = b.tags || {}; let dx = b.x + 6; const dy = b.y + b.h - 5;
  if (tg.common) { ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI*2); ctx.fill(); dx += 7; }
  if (tg.linked) { ctx.fillStyle = '#14b8a6'; ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI*2); ctx.fill(); dx += 7; }
  if (tg.review) { ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI*2); ctx.fill(); }
}
function drawHierRoad(ctx, f, t, th) { const fx = f.x+(f.w||0)/2, fy = f.y+(f.h||0)/2, tx = t.x+(t.w||0)/2, ty = t.y+(t.h||0)/2; ctx.strokeStyle = th === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); }
function drawRoadLine(ctx, f, t, road, c, th, sel) {
  const fx = f.x+(f.w||0)/2, fy = f.y+(f.h||0)/2, tx = t.x+(t.w||0)/2, ty = t.y+(t.h||0)/2;
  const rt = ROAD_TYPES[road.type]||ROAD_TYPES.main;
  const vi = VEHICLE_TYPES[road.vehicle]||VEHICLE_TYPES.car;
  const dt = DATA_TYPES[road.dataType]||DATA_TYPES.content;
  // Road body
  ctx.strokeStyle = sel ? vi.color : (c.roadFill||'#c4a45e');
  ctx.lineWidth = sel ? (rt.width||6)+3 : (rt.width||6)+2; ctx.lineCap = 'round';
  ctx.globalAlpha = rt.opacity || 1;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  // Road surface
  ctx.strokeStyle = th === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = rt.width||6; if (rt.dash) ctx.setLineDash(rt.dash);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.setLineDash([]);
  // Data type color center line
  ctx.strokeStyle = dt.color; ctx.lineWidth = 1.5; ctx.setLineDash([4,6]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function roundedRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
function clampView(v, cs, layout) { if (!layout.districts.length) return v; const b = getLayoutBounds(layout); const bw = Math.max(b.maxX-b.minX, 100), bh = Math.max(b.maxY-b.minY, 100); let { panX, panY, zoom } = v; zoom = Math.max(0.3, Math.min(4, zoom)); const m = 100; const cMinX = b.minX*zoom+panX, cMaxX = b.maxX*zoom+panX, cMinY = b.minY*zoom+panY, cMaxY = b.maxY*zoom+panY; if (cMaxX < -m) panX += (-m-cMaxX); if (cMinX > cs.w+m) panX -= (cMinX-cs.w-m); if (cMaxY < -m) panY += (-m-cMaxY); if (cMinY > cs.h+m) panY -= (cMinY-cs.h-m); return { panX, panY, zoom }; }
function getLayoutBounds(layout) { let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity; for (const d of layout.districts) { minX=Math.min(minX,d.x); minY=Math.min(minY,d.y); maxX=Math.max(maxX,d.x+d.width); maxY=Math.max(maxY,d.y+d.height); } for (const i of layout.allItems) { minX=Math.min(minX,i.x); minY=Math.min(minY,i.y); maxX=Math.max(maxX,i.x+(i.w||0)); maxY=Math.max(maxY,i.y+(i.h||0)); } for (const i of layout.unplacedItems||[]) { minX=Math.min(minX,i.x); minY=Math.min(minY,i.y); maxX=Math.max(maxX,i.x+(i.w||0)); maxY=Math.max(maxY,i.y+(i.h||0)); } return { minX, minY, maxX, maxY }; }
function pointToSegmentDist(px, py, ax, ay, bx, by) { const dx = bx-ax, dy = by-ay; const len2 = dx*dx+dy*dy; if (len2 === 0) return Math.hypot(px-ax, py-ay); let t = ((px-ax)*dx+(py-ay)*dy)/len2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px-(ax+t*dx), py-(ay+t*dy)); }
