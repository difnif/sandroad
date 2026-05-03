import React, { useEffect, useRef, useState, useMemo } from 'react';
import { computeCityLayout, getDistrictColor } from '../../utils/cityLayout.js';
import { formatColumnNumber, formatDepthNumber } from '../../utils/numbering.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function CityCanvas({
  project, themeId,
  selectedId, onSelectNode,
  onRequestInlineEdit
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useTheme();

  const [viewState, setViewState] = useState({ panX: 0, panY: 0, zoom: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [hoveredId, setHoveredId] = useState(null);

  // Interaction refs
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef(null);

  // Layout
  const layout = useMemo(() => computeCityLayout(project), [project]);

  // Resize observer
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

  // Auto-center on first load
  useEffect(() => {
    if (layout.districts.length === 0) return;
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

  // Draw
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

    // Clear
    const bgColor = themeId === 'dark' ? '#1e1e1e' : themeId === 'light' ? '#f8f8f8' : '#fef7e0';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    ctx.save();
    ctx.translate(viewState.panX, viewState.panY);
    ctx.scale(viewState.zoom, viewState.zoom);

    // Draw grid (subtle)
    drawGrid(ctx, viewState, canvasSize, themeId);

    // Draw districts
    layout.districts.forEach((dist, idx) => {
      const colors = getDistrictColor(themeId, dist.color);
      drawDistrict(ctx, dist, colors, formatColumnNumber(idx), themeId);
    });

    // Draw items (lands first, then buildings on top)
    const lands = layout.allItems.filter(i => i.type === 'land');
    const buildings = layout.allItems.filter(i => i.type === 'building');

    // Draw roads between connected lands (hierarchy lines)
    for (const item of layout.allItems) {
      if (item.parentId) {
        const parent = layout.allItems.find(p => p.id === item.parentId);
        if (parent) {
          drawRoad(ctx, parent, item, themeId);
        }
      }
    }

    // Draw lands
    for (const land of lands) {
      const dist = layout.districts.find(d => d.key === findColKey(project, land.id));
      const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
      const isSelected = selectedId === land.id;
      const isHovered = hoveredId === land.id;
      drawLand(ctx, land, colors, isSelected, isHovered, themeId);
    }

    // Draw buildings
    for (const bld of buildings) {
      const dist = layout.districts.find(d => d.key === findColKey(project, bld.id));
      const colors = dist ? getDistrictColor(themeId, dist.color) : getDistrictColor(themeId, 'stone');
      const isSelected = selectedId === bld.id;
      const isHovered = hoveredId === bld.id;
      drawBuilding(ctx, bld, colors, isSelected, isHovered, themeId);
    }

    ctx.restore();

  }, [layout, viewState, canvasSize, themeId, selectedId, hoveredId, project]);

  // --- Interaction handlers ---
  const screenToWorld = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - viewState.panX) / viewState.zoom,
      y: (sy - viewState.panY) / viewState.zoom
    };
  };

  const hitTest = (worldX, worldY) => {
    // Check buildings first (on top), then lands
    const buildings = layout.allItems.filter(i => i.type === 'building').reverse();
    for (const b of buildings) {
      if (worldX >= b.x && worldX <= b.x + b.w && worldY >= b.y && worldY <= b.y + b.h) return b;
    }
    const lands = layout.allItems.filter(i => i.type === 'land').reverse();
    for (const l of lands) {
      if (worldX >= l.x && worldX <= l.x + l.w && worldY >= l.y && worldY <= l.y + l.h) return l;
    }
    return null;
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - viewState.panX, y: e.clientY - viewState.panY };
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return;

    // Hover
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(world.x, world.y);
    setHoveredId(hit?.id || null);

    if (isPanning.current) {
      setViewState(prev => ({
        ...prev,
        panX: e.clientX - panStart.current.x,
        panY: e.clientY - panStart.current.y
      }));
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') return;
    const wasPanning = isPanning.current;
    isPanning.current = false;

    // Detect click vs drag
    const dx = Math.abs(e.clientX - (panStart.current.x + viewState.panX));
    const dy = Math.abs(e.clientY - (panStart.current.y + viewState.panY));
    if (dx < 5 && dy < 5) {
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

  // Touch
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX - viewState.panX, y: e.touches[0].clientY - viewState.panY };
    } else if (e.touches.length === 2) {
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
    if (e.touches.length === 1 && isPanning.current) {
      setViewState(prev => ({
        ...prev,
        panX: e.touches[0].clientX - panStart.current.x,
        panY: e.touches[0].clientY - panStart.current.y
      }));
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDist.current > 0) {
        const scale = dist / lastTouchDist.current;
        setViewState(prev => ({
          ...prev,
          zoom: Math.max(0.2, Math.min(4, prev.zoom * scale))
        }));
      }
      lastTouchDist.current = dist;

      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
      if (lastTouchCenter.current) {
        setViewState(prev => ({
          ...prev,
          panX: prev.panX + (center.x - lastTouchCenter.current.x),
          panY: prev.panY + (center.y - lastTouchCenter.current.y)
        }));
      }
      lastTouchCenter.current = center;
    }
  };

  const handleTouchEnd = (e) => {
    if (isPanning.current && e.changedTouches.length === 1) {
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
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setViewState(prev => {
      const newZoom = Math.max(0.2, Math.min(4, prev.zoom * scale));
      const ratio = newZoom / prev.zoom;
      return {
        zoom: newZoom,
        panX: mx - (mx - prev.panX) * ratio,
        panY: my - (my - prev.panY) * ratio
      };
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      />
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

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let x = startX; x < endX; x += step) {
    ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
  }
  for (let y = startY; y < endY; y += step) {
    ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
  }
}

function drawDistrict(ctx, dist, colors, roman, themeId) {
  const r = 12;
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  roundedRect(ctx, dist.x, dist.y, dist.width, dist.height, r);
  ctx.fill();
  ctx.stroke();

  // Label
  ctx.fillStyle = colors.text;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${roman}. ${dist.label}`, dist.x + 16, dist.y + 10);
}

function drawLand(ctx, land, colors, isSelected, isHovered, themeId) {
  const r = 8;
  // Shadow
  if (isHovered || isSelected) {
    ctx.shadowColor = isSelected ? 'rgba(245,158,11,0.4)' : 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  }

  ctx.fillStyle = colors.landFill;
  ctx.strokeStyle = isSelected ? '#f59e0b' : colors.border;
  ctx.lineWidth = isSelected ? 2.5 : 1.5;
  ctx.setLineDash([6, 3]);
  roundedRect(ctx, land.x, land.y, land.w, land.h, r);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Land label
  ctx.fillStyle = colors.text;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const depthLabel = `[L${land.depth}]`;
  ctx.fillText(`${depthLabel} ${land.name || ''}`, land.x + 8, land.y + 6);
}

function drawBuilding(ctx, bld, colors, isSelected, isHovered, themeId) {
  const r = 4;

  // Shadow
  ctx.shadowColor = isHovered ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = isHovered ? 6 : 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = isHovered ? 3 : 1;

  // Building body
  ctx.fillStyle = isSelected ? '#fef3c7' : colors.bldFill;
  ctx.strokeStyle = isSelected ? '#f59e0b' : colors.border;
  ctx.lineWidth = isSelected ? 2 : 1;
  roundedRect(ctx, bld.x, bld.y, bld.w, bld.h, r);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Roof accent line
  ctx.fillStyle = colors.border;
  roundedRect(ctx, bld.x, bld.y, bld.w, 6, r);
  ctx.fill();

  // Building name
  ctx.fillStyle = colors.text;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = (bld.name || '').slice(0, 8);
  ctx.fillText(name, bld.x + bld.w / 2, bld.y + bld.h / 2 + 2);

  // Tag dots
  const tags = bld.tags || {};
  let dotX = bld.x + 6;
  const dotY = bld.y + bld.h - 6;
  if (tags.common) { ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2); ctx.fill(); dotX += 8; }
  if (tags.linked) { ctx.fillStyle = '#14b8a6'; ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2); ctx.fill(); dotX += 8; }
  if (tags.review) { ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2); ctx.fill(); }
}

function drawRoad(ctx, from, to, themeId) {
  const fx = from.x + (from.w || 0) / 2;
  const fy = from.y + (from.h || 0) / 2;
  const tx = to.x + (to.w || 0) / 2;
  const ty = to.y + (to.h || 0) / 2;

  // Road background
  ctx.strokeStyle = themeId === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();

  // Road center line (dashed)
  ctx.strokeStyle = themeId === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.setLineDash([]);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getLayoutBounds(layout) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of layout.districts) {
    minX = Math.min(minX, d.x);
    minY = Math.min(minY, d.y);
    maxX = Math.max(maxX, d.x + d.width);
    maxY = Math.max(maxY, d.y + d.height);
  }
  for (const item of layout.allItems) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + (item.w || 0));
    maxY = Math.max(maxY, item.y + (item.h || 0));
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
