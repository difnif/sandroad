import React, { useEffect, useRef, useState } from 'react';
import {
  computeLayout, getColorHex, SCENE_BG, TEXT_COLOR, BOX_BG_COLOR, LINK_RAINBOW
} from '../../utils/graphLayout.js';

const BOX_W = 9;
const BOX_H = 2.6;
const BOX_D = 1.2;

export default function GraphScene({
  nodes, links, project, themeId,
  selectedId, onSelectNode,
  mode, tilt
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
  const THREERef = useRef(null);

  // Key fix: state-based ready flag so dependent effects re-run
  const [sceneReady, setSceneReady] = useState(false);

  // ----- Init scene once -----
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

      updateCamera();

      // Pointer / orbit
      let isDragging = false;
      let prevX = 0, prevY = 0;
      let mouseDownPos = null;

      const onPointerDown = (e) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
        mouseDownPos = { x: e.clientX, y: e.clientY };
      };
      const onPointerMove = (e) => {
        if (!isDragging) return;
        tiltRef.current += (e.clientX - prevX) * 0.3;
        pitchRef.current = Math.max(-60, Math.min(60, pitchRef.current + (e.clientY - prevY) * 0.3));
        prevX = e.clientX;
        prevY = e.clientY;
        updateCamera();
      };
      const onPointerUp = (e) => {
        if (!mouseDownPos) { isDragging = false; return; }
        const moved = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
        isDragging = false;
        if (moved < 5) handleClick(e);
        mouseDownPos = null;
      };

      // Touch support
      let lastTouchDist = 0;
      const onTouchStart = (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          prevX = e.touches[0].clientX;
          prevY = e.touches[0].clientY;
          mouseDownPos = { x: prevX, y: prevY };
        } else if (e.touches.length === 2) {
          isDragging = false;
          lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      };
      const onTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          const dx = e.touches[0].clientX - prevX;
          const dy = e.touches[0].clientY - prevY;
          tiltRef.current += dx * 0.3;
          pitchRef.current = Math.max(-60, Math.min(60, pitchRef.current + dy * 0.3));
          prevX = e.touches[0].clientX;
          prevY = e.touches[0].clientY;
          updateCamera();
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (lastTouchDist > 0) {
            const scale = lastTouchDist / dist;
            distRef.current = Math.max(20, Math.min(200, distRef.current * scale));
            updateCamera();
          }
          lastTouchDist = dist;
        }
      };
      const onTouchEnd = (e) => {
        if (mouseDownPos && e.changedTouches.length === 1) {
          const t = e.changedTouches[0];
          const moved = Math.hypot(t.clientX - mouseDownPos.x, t.clientY - mouseDownPos.y);
          if (moved < 10) handleClick(t);
        }
        isDragging = false;
        mouseDownPos = null;
        lastTouchDist = 0;
      };

      const onWheel = (e) => {
        e.preventDefault();
        distRef.current = Math.max(20, Math.min(200, distRef.current * (e.deltaY > 0 ? 1.1 : 0.9)));
        updateCamera();
      };

      const raycaster = new THREE.Raycaster();
      const mouseV = new THREE.Vector2();

      const handleClick = (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseV.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseV.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseV, camera);
        const meshes = Object.values(boxesRef.current);
        const intersects = raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
          onSelectNode(intersects[0].object.userData.id);
        } else {
          onSelectNode(null);
        }
      };

      const onResize = () => {
        if (!mount) return;
        const w2 = mount.clientWidth;
        const h2 = mount.clientHeight;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
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

      // Signal ready — this triggers the build effect to run
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
        if (mount && renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    })();

    function updateCamera() {
      const camera = cameraRef.current;
      if (!camera) return;
      const tiltRad = (tiltRef.current * Math.PI) / 180;
      const pitchRad = (pitchRef.current * Math.PI) / 180;
      const d = distRef.current;
      camera.position.x = Math.sin(tiltRad) * Math.cos(pitchRad) * d;
      camera.position.y = Math.sin(pitchRad) * d;
      camera.position.z = Math.cos(tiltRad) * Math.cos(pitchRad) * d;
      camera.lookAt(0, 0, 0);
    }

    return () => cleanup();
    // eslint-disable-next-line
  }, []);

  // ----- Sync external tilt prop -----
  useEffect(() => {
    if (tilt === null || tilt === undefined) return;
    if (!sceneReady) return;
    tiltRef.current = tilt;
    const camera = cameraRef.current;
    if (!camera) return;
    const tiltRad = (tilt * Math.PI) / 180;
    const pitchRad = (pitchRef.current * Math.PI) / 180;
    const d = distRef.current;
    camera.position.x = Math.sin(tiltRad) * Math.cos(pitchRad) * d;
    camera.position.y = Math.sin(pitchRad) * d;
    camera.position.z = Math.cos(tiltRad) * Math.cos(pitchRad) * d;
    camera.lookAt(0, 0, 0);
  }, [tilt, sceneReady]);

  // ----- Update background on theme change -----
  useEffect(() => {
    const scene = sceneRef.current;
    const THREE = THREERef.current;
    if (!scene || !THREE) return;
    scene.background = new THREE.Color(SCENE_BG[themeId] || SCENE_BG.sand);
  }, [themeId, sceneReady]);

  // ----- Build boxes/lines when data/theme changes OR scene becomes ready -----
  useEffect(() => {
    const scene = sceneRef.current;
    const THREE = THREERef.current;
    if (!scene || !THREE || !sceneReady) return;

    // Dispose old
    Object.values(boxesRef.current).forEach(m => {
      scene.remove(m);
      m.geometry.dispose();
      if (Array.isArray(m.material)) {
        m.material.forEach(mat => { if (mat.map) mat.map.dispose(); mat.dispose(); });
      } else {
        m.material.dispose();
      }
    });
    boxesRef.current = {};

    linkLinesRef.current.forEach(l => {
      scene.remove(l); l.geometry.dispose(); l.material.dispose();
    });
    linkLinesRef.current = [];

    hierLinesRef.current.forEach(l => {
      scene.remove(l); l.geometry.dispose(); l.material.dispose();
    });
    hierLinesRef.current = [];

    if (!nodes || nodes.length === 0) return;

    const positions = computeLayout(project, nodes);

    // Build boxes
    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const colorHex = getColorHex(themeId, pos.colColor);
      const depthScale = 1 - (node.depth - 1) * 0.12;

      const geometry = new THREE.BoxGeometry(BOX_W * depthScale, BOX_H * depthScale, BOX_D);
      const frontTex = makeFaceTexture(THREE, node, colorHex, themeId);
      const sideMat = new THREE.MeshLambertMaterial({ color: getSideColor(themeId) });
      const backMat = new THREE.MeshLambertMaterial({ color: getSideColor(themeId) });
      const frontMat = new THREE.MeshBasicMaterial({ map: frontTex });
      const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
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
      const p = positions[node.parentId];
      const c = positions[node.id];
      if (!p || !c) continue;
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p.x, p.y, 0.65),
        new THREE.Vector3(c.x, c.y, 0.65)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: hierColor, transparent: true, opacity: 0.4 });
      const line = new THREE.Line(geom, mat);
      scene.add(line);
      hierLinesRef.current.push(line);
    }

    // Link lines (curved, behind boxes)
    links.forEach((link, idx) => {
      const a = positions[link.from];
      const b = positions[link.to];
      if (!a || !b) return;
      const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, -4);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(a.x, a.y, -0.7),
        mid,
        new THREE.Vector3(b.x, b.y, -0.7)
      );
      const points = curve.getPoints(32);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const rainbowColor = LINK_RAINBOW[idx % LINK_RAINBOW.length];
      const mat = new THREE.LineBasicMaterial({
        color: themeId === 'dark' ? 0x858585 : 0xa8a29e,
        transparent: true, opacity: 0.6
      });
      const line = new THREE.Line(geom, mat);
      line.userData = { from: link.from, to: link.to, rainbowColor, label: link.label };
      scene.add(line);
      linkLinesRef.current.push(line);
    });
  }, [nodes, links, project, themeId, sceneReady]);

  // ----- Update visuals based on selection / mode -----
  useEffect(() => {
    const lines = linkLinesRef.current;
    const THREE = THREERef.current;
    if (!THREE) return;

    lines.forEach(line => {
      const { from, to, rainbowColor } = line.userData;
      const mat = line.material;
      if (selectedId) {
        const isConnected = from === selectedId || to === selectedId;
        if (isConnected) {
          mat.color.setHex(mode === 'rainbow' ? rainbowColor : 0xf59e0b);
          mat.opacity = 1;
        } else {
          mat.color.setHex(themeId === 'dark' ? 0x3e3e42 : 0xd6d3d1);
          mat.opacity = 0.15;
        }
      } else {
        if (mode === 'rainbow') {
          mat.color.setHex(rainbowColor);
          mat.opacity = 0.8;
        } else {
          mat.color.setHex(themeId === 'dark' ? 0x858585 : 0xa8a29e);
          mat.opacity = 0.6;
        }
      }
    });

    const boxes = boxesRef.current;
    if (selectedId) {
      const connected = new Set([selectedId]);
      links.forEach(l => {
        if (l.from === selectedId) connected.add(l.to);
        if (l.to === selectedId) connected.add(l.from);
      });
      Object.entries(boxes).forEach(([id, mesh]) => {
        const isConn = connected.has(id);
        mesh.material.forEach(m => {
          m.transparent = !isConn;
          m.opacity = isConn ? 1 : 0.25;
        });
      });
    } else {
      Object.values(boxes).forEach(mesh => {
        mesh.material.forEach(m => {
          m.transparent = false;
          m.opacity = 1;
        });
      });
    }
  }, [selectedId, mode, links, themeId]);

  return <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />;
}

// ---- Helpers ----
function getSideColor(themeId) {
  if (themeId === 'dark') return 0x252526;
  if (themeId === 'light') return 0xf5f5f5;
  return 0xfafaf9;
}

function makeFaceTexture(THREE, node, colorHex, themeId) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  const bg = BOX_BG_COLOR[themeId] || '#ffffff';
  const fg = TEXT_COLOR[themeId] || '#1c1917';
  const muted = themeId === 'dark' ? '#858585' : themeId === 'light' ? '#9e9e9e' : '#a8a29e';
  const accentCss = '#' + colorHex.toString(16).padStart(6, '0');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 160);

  // Left color strip
  ctx.fillStyle = accentCss;
  ctx.fillRect(0, 0, 12, 160);

  // Depth label top-right
  ctx.fillStyle = muted;
  ctx.font = '20px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`[L${node.depth}]`, 496, 12);

  // Main: > item_name
  ctx.fillStyle = accentCss;
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('>', 28, 80);

  ctx.fillStyle = fg;
  ctx.font = 'bold 36px monospace';
  const name = (node.name || '').slice(0, 22);
  ctx.fillText(name, 60, 80);

  // Tag indicators
  const tags = node.tags || {};
  const dotY = 138;
  let dotX = 28;
  const drawTag = (label, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = muted;
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, dotX + 8, dotY);
    dotX += 14 + ctx.measureText(label).width + 12;
  };
  if (tags.common) drawTag('common', '#6366f1');
  if (tags.linked) drawTag('linked', '#14b8a6');
  if (tags.commonPending) drawTag('common?', '#6366f1');
  if (tags.linkedPending) drawTag('linked?', '#14b8a6');
  if (tags.review) drawTag('review', '#f43f5e');

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
