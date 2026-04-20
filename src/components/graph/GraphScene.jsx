import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  computeLayout, getColorHex, SCENE_BG, TEXT_COLOR, BOX_BG_COLOR, LINK_RAINBOW
} from '../../utils/graphLayout.js';
import { formatDepthNumber } from '../../utils/numbering.js';

const BOX_W = 9;
const BOX_H = 2.6;
const BOX_D = 1.2;

const DEPTH_BAR_WIDTHS = [16, 12, 8, 6, 4];
const DEPTH_BADGE_BG = {
  sand: ['#292524','#57534e','#78716c','#a8a29e','#d6d3d1'],
  dark: ['#007acc','#4e4e52','#3a3d41','#2d2d30','#252526'],
  light: ['#0066b8','#616161','#9e9e9e','#d4d4d4','#e5e5e5']
};
const DEPTH_BADGE_FG = {
  sand: ['#fef3c7','#fef3c7','#ffffff','#1c1917','#1c1917'],
  dark: ['#ffffff','#cccccc','#cccccc','#858585','#6e6e6e'],
  light: ['#ffffff','#ffffff','#ffffff','#616161','#9e9e9e']
};

export default function GraphScene({
  nodes, links, project, themeId,
  selectedId, onSelectNode,
  mode, tilt, onTiltChange,
  customPositions, onPositionChange,
  onRequestInlineEdit
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const boxesRef = useRef({});
  const linkLinesRef = useRef([]);
  const hierLinesRef = useRef([]);
  const frameRef = useRef(null);
  const tiltRef = useRef(tilt || 0);
  const pitchRef = useRef(15);
  const distRef = useRef(70);
  const lookAtRef = useRef({ x: 0, y: 0, z: 0 });
  const THREERef = useRef(null);
  const dragPlaneRef = useRef(null);

  // Callback refs so event handlers always see latest
  const onTiltChangeRef = useRef(onTiltChange);
  onTiltChangeRef.current = onTiltChange;
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;
  const onRequestInlineEditRef = useRef(onRequestInlineEdit);
  onRequestInlineEditRef.current = onRequestInlineEdit;

  const [sceneReady, setSceneReady] = useState(false);

  function updateCamera() {
    const camera = cameraRef.current;
    if (!camera) return;
    const tiltRad = (tiltRef.current * Math.PI) / 180;
    const pitchRad = (pitchRef.current * Math.PI) / 180;
    const d = distRef.current;
    const la = lookAtRef.current;
    camera.position.x = la.x + Math.sin(tiltRad) * Math.cos(pitchRad) * d;
    camera.position.y = la.y + Math.sin(pitchRad) * d;
    camera.position.z = la.z + Math.cos(tiltRad) * Math.cos(pitchRad) * d;
    camera.lookAt(la.x, la.y, la.z);
  }

  // ----- Init scene -----
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      THREERef.current = THREE;
      if (cancelled || !mountRef.current) return;

      const mount = mountRef.current;
      const w = mount.clientWidth;
      const h = mount.clientHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(SCENE_BG[themeId] || SCENE_BG.sand);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.5);
      dir.position.set(10, 20, 30);
      scene.add(dir);

      // Invisible plane for drag projection (XY plane at z=0)
      dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      updateCamera();

      // ============ Interaction state ============
      const raycaster = new THREE.Raycaster();
      const mouseV = new THREE.Vector2();

      let interactionMode = null; // null | 'rotate' | 'dragBox' | 'pinch'
      let dragBoxId = null;
      let dragOffset = { x: 0, y: 0 };
      let prevX = 0, prevY = 0;
      let pointerDownPos = null;
      let pointerDownTime = 0;
      let lastTapTime = 0;
      let lastTouchDist = 0;
      let lastTouchCenter = null;

      function getMouseVec(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseV.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseV.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        return mouseV;
      }

      function hitTestBoxes(clientX, clientY) {
        getMouseVec(clientX, clientY);
        raycaster.setFromCamera(mouseV, camera);
        const meshes = Object.values(boxesRef.current);
        const intersects = raycaster.intersectObjects(meshes);
        return intersects.length > 0 ? intersects[0] : null;
      }

      function projectToPlane(clientX, clientY) {
        getMouseVec(clientX, clientY);
        raycaster.setFromCamera(mouseV, camera);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlaneRef.current, target);
        return target;
      }

      // --- Pointer events (mouse + single touch fallback) ---
      const onPointerDown = (e) => {
        if (e.pointerType === 'touch') return; // handled by touch events
        pointerDownPos = { x: e.clientX, y: e.clientY };
        pointerDownTime = Date.now();
        prevX = e.clientX;
        prevY = e.clientY;

        const hit = hitTestBoxes(e.clientX, e.clientY);
        if (hit) {
          interactionMode = 'dragBox';
          dragBoxId = hit.object.userData.id;
          const projected = projectToPlane(e.clientX, e.clientY);
          const mesh = hit.object;
          dragOffset.x = mesh.position.x - projected.x;
          dragOffset.y = mesh.position.y - projected.y;
        } else {
          interactionMode = 'rotate';
        }
      };

      const onPointerMove = (e) => {
        if (e.pointerType === 'touch') return;
        if (interactionMode === 'dragBox' && dragBoxId) {
          const projected = projectToPlane(e.clientX, e.clientY);
          const mesh = boxesRef.current[dragBoxId];
          if (mesh) {
            mesh.position.x = projected.x + dragOffset.x;
            mesh.position.y = projected.y + dragOffset.y;
          }
        } else if (interactionMode === 'rotate') {
          const dx = e.clientX - prevX;
          const dy = e.clientY - prevY;
          tiltRef.current += dx * 0.3;
          pitchRef.current = Math.max(-60, Math.min(60, pitchRef.current + dy * 0.3));
          prevX = e.clientX;
          prevY = e.clientY;
          updateCamera();
          onTiltChangeRef.current?.(Math.round(tiltRef.current));
        }
      };

      const onPointerUp = (e) => {
        if (e.pointerType === 'touch') return;
        const moved = pointerDownPos
          ? Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y)
          : 999;
        const elapsed = Date.now() - pointerDownTime;

        if (interactionMode === 'dragBox' && dragBoxId) {
          if (moved < 5) {
            // Click (not drag) on box
            const now = Date.now();
            if (now - lastTapTime < 400) {
              // Double click → inline edit
              onRequestInlineEditRef.current?.(dragBoxId);
            } else {
              onSelectNodeRef.current?.(dragBoxId);
            }
            lastTapTime = now;
          } else {
            // Drag ended — save new position
            const mesh = boxesRef.current[dragBoxId];
            if (mesh) {
              onPositionChangeRef.current?.(dragBoxId, { x: mesh.position.x, y: mesh.position.y });
            }
          }
        } else if (interactionMode === 'rotate' && moved < 5) {
          // Click on empty space → deselect
          onSelectNodeRef.current?.(null);
        }

        interactionMode = null;
        dragBoxId = null;
        pointerDownPos = null;
      };

      // --- Touch events ---
      const onTouchStart = (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          pointerDownPos = { x: t.clientX, y: t.clientY };
          pointerDownTime = Date.now();
          prevX = t.clientX;
          prevY = t.clientY;

          const hit = hitTestBoxes(t.clientX, t.clientY);
          if (hit) {
            interactionMode = 'dragBox';
            dragBoxId = hit.object.userData.id;
            const projected = projectToPlane(t.clientX, t.clientY);
            const mesh = hit.object;
            dragOffset.x = mesh.position.x - projected.x;
            dragOffset.y = mesh.position.y - projected.y;
          } else {
            interactionMode = 'rotate';
          }
        } else if (e.touches.length === 2) {
          interactionMode = 'pinch';
          dragBoxId = null;
          lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          lastTouchCenter = {
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2
          };
        }
      };

      const onTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          const t = e.touches[0];
          if (interactionMode === 'dragBox' && dragBoxId) {
            const projected = projectToPlane(t.clientX, t.clientY);
            const mesh = boxesRef.current[dragBoxId];
            if (mesh) {
              mesh.position.x = projected.x + dragOffset.x;
              mesh.position.y = projected.y + dragOffset.y;
            }
          } else if (interactionMode === 'rotate') {
            const dx = t.clientX - prevX;
            const dy = t.clientY - prevY;
            tiltRef.current += dx * 0.3;
            pitchRef.current = Math.max(-60, Math.min(60, pitchRef.current + dy * 0.3));
            prevX = t.clientX;
            prevY = t.clientY;
            updateCamera();
            onTiltChangeRef.current?.(Math.round(tiltRef.current));
          }
        } else if (e.touches.length === 2 && interactionMode === 'pinch') {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (lastTouchDist > 0) {
            distRef.current = Math.max(20, Math.min(200, distRef.current * (lastTouchDist / dist)));
          }
          lastTouchDist = dist;

          const center = {
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2
          };
          if (lastTouchCenter) {
            const panScale = distRef.current * 0.003;
            lookAtRef.current.x -= (center.x - lastTouchCenter.x) * panScale;
            lookAtRef.current.y += (center.y - lastTouchCenter.y) * panScale;
          }
          lastTouchCenter = center;
          updateCamera();
        }
      };

      const onTouchEnd = (e) => {
        if (interactionMode === 'dragBox' && dragBoxId && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const moved = pointerDownPos
            ? Math.hypot(t.clientX - pointerDownPos.x, t.clientY - pointerDownPos.y)
            : 999;
          if (moved < 10) {
            const now = Date.now();
            if (now - lastTapTime < 400) {
              onRequestInlineEditRef.current?.(dragBoxId);
            } else {
              onSelectNodeRef.current?.(dragBoxId);
            }
            lastTapTime = now;
          } else {
            const mesh = boxesRef.current[dragBoxId];
            if (mesh) {
              onPositionChangeRef.current?.(dragBoxId, { x: mesh.position.x, y: mesh.position.y });
            }
          }
        } else if (interactionMode === 'rotate' && pointerDownPos && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const moved = Math.hypot(t.clientX - pointerDownPos.x, t.clientY - pointerDownPos.y);
          if (moved < 10) onSelectNodeRef.current?.(null);
        }
        interactionMode = null;
        dragBoxId = null;
        pointerDownPos = null;
        lastTouchDist = 0;
        lastTouchCenter = null;
      };

      const onWheel = (e) => {
        e.preventDefault();
        distRef.current = Math.max(20, Math.min(200, distRef.current * (e.deltaY > 0 ? 1.1 : 0.9)));
        updateCamera();
      };

      const onResize = () => {
        if (!mount) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
      renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
      renderer.domElement.addEventListener('touchend', onTouchEnd);
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('resize', onResize);

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
      setSceneReady(true);

      cleanup = () => {
        cancelled = true;
        setSceneReady(false);
        cancelAnimationFrame(frameRef.current);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('touchstart', onTouchStart);
        renderer.domElement.removeEventListener('touchmove', onTouchMove);
        renderer.domElement.removeEventListener('touchend', onTouchEnd);
        renderer.domElement.removeEventListener('wheel', onWheel);
        window.removeEventListener('resize', onResize);
        if (mount && renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
        renderer.dispose();
      };
    })();
    return () => cleanup();
    // eslint-disable-next-line
  }, []);

  // Sync external tilt
  useEffect(() => {
    if (tilt === null || tilt === undefined || !sceneReady) return;
    tiltRef.current = tilt;
    updateCamera();
  }, [tilt, sceneReady]);

  // Background
  useEffect(() => {
    const s = sceneRef.current, T = THREERef.current;
    if (s && T) s.background = new T.Color(SCENE_BG[themeId] || SCENE_BG.sand);
  }, [themeId, sceneReady]);

  // Build boxes/lines
  useEffect(() => {
    const scene = sceneRef.current, THREE = THREERef.current;
    if (!scene || !THREE || !sceneReady) return;

    // Dispose old
    Object.values(boxesRef.current).forEach(m => {
      scene.remove(m); m.geometry.dispose();
      if (Array.isArray(m.material)) m.material.forEach(mt => { if (mt.map) mt.map.dispose(); mt.dispose(); });
      else m.material.dispose();
    });
    boxesRef.current = {};
    linkLinesRef.current.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
    linkLinesRef.current = [];
    hierLinesRef.current.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
    hierLinesRef.current = [];

    if (!nodes || !nodes.length) return;

    const positions = computeLayout(project, nodes, customPositions || {});
    const siblingMap = buildSiblingMap(nodes);

    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const colorHex = getColorHex(themeId, pos.colColor);
      const depthScale = 1 - (node.depth - 1) * 0.1;
      const sibIdx = siblingMap[node.id] || 0;

      const geometry = new THREE.BoxGeometry(BOX_W * depthScale, BOX_H * depthScale, BOX_D);
      const frontTex = makeFaceTexture(THREE, node, colorHex, themeId, sibIdx);
      const sideColor = getSideColor(themeId, node.depth);
      const sideMat = new THREE.MeshLambertMaterial({ color: sideColor });
      const frontMat = new THREE.MeshBasicMaterial({ map: frontTex });
      const materials = [sideMat, sideMat.clone(), sideMat.clone(), sideMat.clone(), frontMat, sideMat.clone()];
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = { id: node.id, name: node.name, depth: node.depth, col: node.col };
      scene.add(mesh);
      boxesRef.current[node.id] = mesh;
    }

    // Hierarchy lines
    const hierColor = themeId === 'dark' ? 0x6e6e6e : 0xa8a29e;
    for (const node of nodes) {
      if (!node.parentId) continue;
      const pMesh = boxesRef.current[node.parentId];
      const cMesh = boxesRef.current[node.id];
      if (!pMesh || !cMesh) continue;
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pMesh.position.x, pMesh.position.y, 0.65),
        new THREE.Vector3(cMesh.position.x, cMesh.position.y, 0.65)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: hierColor, transparent: true, opacity: 0.4 });
      scene.add(new THREE.Line(geom, mat));
      hierLinesRef.current.push(scene.children[scene.children.length - 1]);
    }

    // Link lines
    links.forEach((link, idx) => {
      const aM = boxesRef.current[link.from], bM = boxesRef.current[link.to];
      if (!aM || !bM) return;
      const mid = new THREE.Vector3(
        (aM.position.x + bM.position.x) / 2,
        (aM.position.y + bM.position.y) / 2, -4
      );
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(aM.position.x, aM.position.y, -0.7),
        mid,
        new THREE.Vector3(bM.position.x, bM.position.y, -0.7)
      );
      const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
      const mat = new THREE.LineBasicMaterial({
        color: themeId === 'dark' ? 0x858585 : 0xa8a29e, transparent: true, opacity: 0.6
      });
      const line = new THREE.Line(geom, mat);
      line.userData = { from: link.from, to: link.to, rainbowColor: LINK_RAINBOW[idx % LINK_RAINBOW.length] };
      scene.add(line);
      linkLinesRef.current.push(line);
    });
  }, [nodes, links, project, themeId, sceneReady, customPositions]);

  // Selection / mode visuals
  useEffect(() => {
    const lines = linkLinesRef.current;
    if (!THREERef.current) return;

    lines.forEach(line => {
      const { from, to, rainbowColor } = line.userData;
      const mat = line.material;
      if (selectedId) {
        const conn = from === selectedId || to === selectedId;
        mat.color.setHex(conn ? (mode === 'rainbow' ? rainbowColor : 0xf59e0b) : (themeId === 'dark' ? 0x3e3e42 : 0xd6d3d1));
        mat.opacity = conn ? 1 : 0.15;
      } else {
        mat.color.setHex(mode === 'rainbow' ? rainbowColor : (themeId === 'dark' ? 0x858585 : 0xa8a29e));
        mat.opacity = mode === 'rainbow' ? 0.8 : 0.6;
      }
    });

    const boxes = boxesRef.current;
    if (selectedId) {
      const conn = new Set([selectedId]);
      links.forEach(l => { if (l.from === selectedId) conn.add(l.to); if (l.to === selectedId) conn.add(l.from); });
      Object.entries(boxes).forEach(([id, m]) => {
        const c = conn.has(id);
        m.material.forEach(mt => { mt.transparent = !c; mt.opacity = c ? 1 : 0.25; });
      });
    } else {
      Object.values(boxes).forEach(m => m.material.forEach(mt => { mt.transparent = false; mt.opacity = 1; }));
    }
  }, [selectedId, mode, links, themeId]);

  return <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
}

// ---- Helpers ----
function buildSiblingMap(nodes) {
  const map = {}, byParent = {};
  for (const n of nodes) {
    const k = n.parentId || `root:${n.col}`;
    if (!byParent[k]) byParent[k] = [];
    byParent[k].push(n);
  }
  for (const s of Object.values(byParent)) s.forEach((n, i) => { map[n.id] = i; });
  return map;
}

function getSideColor(themeId, depth) {
  const d = Math.min(depth, 5);
  if (themeId === 'dark') return [0x3a3d41, 0x2d2d30, 0x252526, 0x1e1e1e, 0x1a1a1a][d - 1];
  if (themeId === 'light') return [0xf0f0f0, 0xe5e5e5, 0xdadada, 0xd0d0d0, 0xc5c5c5][d - 1];
  return [0xfafaf9, 0xf5f5f4, 0xe7e5e4, 0xd6d3d1, 0xc8c5c3][d - 1];
}

function makeFaceTexture(THREE, node, colorHex, themeId, siblingIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const d = Math.min(node.depth, 5) - 1;
  const bg = BOX_BG_COLOR[themeId] || '#ffffff';
  const fg = TEXT_COLOR[themeId] || '#1c1917';
  const muted = themeId === 'dark' ? '#858585' : themeId === 'light' ? '#9e9e9e' : '#a8a29e';
  const accent = '#' + colorHex.toString(16).padStart(6, '0');
  const badgeBg = (DEPTH_BADGE_BG[themeId] || DEPTH_BADGE_BG.sand)[d];
  const badgeFg = (DEPTH_BADGE_FG[themeId] || DEPTH_BADGE_FG.sand)[d];

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);
  const barW = DEPTH_BAR_WIDTHS[d] || 4;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, barW, 160);

  const numLabel = formatDepthNumber(node.depth, siblingIndex);
  ctx.font = 'bold 22px monospace';
  const numW = Math.max(ctx.measureText(numLabel).width + 12, 32);
  ctx.fillStyle = badgeBg;
  roundRect(ctx, barW + 8, 8, numW, 26, 4); ctx.fill();
  ctx.fillStyle = badgeFg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(numLabel, barW + 8 + numW / 2, 21);

  ctx.fillStyle = muted; ctx.font = '18px monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(`L${node.depth}`, 496, 12);

  ctx.fillStyle = accent; ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('>', barW + 12, 85);
  ctx.fillStyle = fg; ctx.font = 'bold 34px monospace';
  ctx.fillText((node.name || '').slice(0, 20), barW + 40, 85);

  const tags = node.tags || {};
  let dotX = barW + 12;
  const drawTag = (l, c) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dotX, 140, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = muted; ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(l, dotX + 8, 140); dotX += 14 + ctx.measureText(l).width + 10;
  };
  if (tags.common) drawTag('common', '#6366f1');
  if (tags.linked) drawTag('linked', '#14b8a6');
  if (tags.commonPending) drawTag('c?', '#6366f1');
  if (tags.linkedPending) drawTag('l?', '#14b8a6');
  if (tags.review) drawTag('rev', '#f43f5e');

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
