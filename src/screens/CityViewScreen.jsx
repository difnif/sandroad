import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Undo2, Redo2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useActions, ACTION_TYPES } from '../contexts/ActionContext.jsx';
import { useProjectsList } from '../hooks/useProjectsList.js';
import { useProjectData } from '../hooks/useProjectData.js';
import { useTabs } from '../hooks/useTabs.js';
import { updateInTree } from '../utils/treeOps.js';
import { createRoad, addRoad, removeRoad, updateRoad, generateRoadsFromTree, VEHICLE_TYPES, DATA_TYPES } from '../utils/cityRoads.js';
import { getBuildingType, getLabel, getDesc } from '../constants/unitTypes.js';
import UnitTypePicker from '../components/city/UnitTypePicker.jsx';
import CityCanvas from '../components/city/CityCanvas.jsx';
import ActionTimeline from '../components/graph/ActionTimeline.jsx';
import ConsultBar from '../components/graph/ConsultBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function CityViewScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, t, themeId } = useTheme();
  const { projects, loading: projectsLoading } = useProjectsList();
  const { openIds, activeId, loaded: tabsLoaded } = useTabs(projects);
  const { project, loading: projLoading, updateLocal } = useProjectData(activeId);
  const { record, undo: actionUndo, redo: actionRedo, canUndo, canRedo } = useActions();

  const [selectedId, setSelectedId] = useState(null);
  const [selectedRoadId, setSelectedRoadId] = useState(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [consultCollapsed, setConsultCollapsed] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [typePicker, setTypePicker] = useState(null); // { mode, nodeId, currentValue }
  const inlineInputRef = useRef(null);
  const autoRoadsGenerated = useRef(false);

  // Undo stack (project snapshots)
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  const roads = project?.roads || [];

  // Auto-generate roads on first entry
  useEffect(() => {
    if (!project || autoRoadsGenerated.current) return;
    if (project.roads && project.roads.length > 0) { autoRoadsGenerated.current = true; return; }
    // Check if there are items to generate roads from
    const hasItems = project.columns?.some(c => (project.structure[c.key] || []).length > 0);
    if (!hasItems) return;
    autoRoadsGenerated.current = true;
    const generatedRoads = generateRoadsFromTree(project);
    if (generatedRoads.length > 0) {
      updateLocal(p => ({ ...p, roads: generatedRoads }));
    }
  }, [project]);

  // Reset auto-roads flag when project changes
  useEffect(() => { autoRoadsGenerated.current = false; }, [activeId]);

  // Space bar pause
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'z' && undoStack.current.length > 0) {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.key === 'y' && redoStack.current.length > 0) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [project]);

  // Save snapshot before mutation
  const saveSnapshot = () => {
    if (project) {
      undoStack.current.push(JSON.stringify({ structure: project.structure, roads: project.roads }));
      if (undoStack.current.length > 30) undoStack.current.shift();
      redoStack.current = [];
    }
  };

  const handleUndo = () => {
    if (undoStack.current.length === 0) return;
    redoStack.current.push(JSON.stringify({ structure: project.structure, roads: project.roads }));
    const prev = JSON.parse(undoStack.current.pop());
    updateLocal(p => ({ ...p, ...prev }));
    actionUndo();
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    undoStack.current.push(JSON.stringify({ structure: project.structure, roads: project.roads }));
    const next = JSON.parse(redoStack.current.pop());
    updateLocal(p => ({ ...p, ...next }));
    actionRedo();
  };

  // Find node
  const findNode = (nodeId) => {
    if (!project) return null;
    for (const col of project.columns || []) {
      const found = findInTree(project.structure[col.key] || [], nodeId);
      if (found) return { ...found, col: col.key };
    }
    return null;
  };

  const selectedNode = useMemo(() => selectedId ? findNode(selectedId) : null, [selectedId, project]);
  const selectedRoad = useMemo(() => selectedRoadId ? roads.find(r => r.id === selectedRoadId) : null, [selectedRoadId, roads]);
  const selectedNodeRoads = useMemo(() => selectedId ? roads.filter(r => r.from === selectedId || r.to === selectedId) : [], [selectedId, roads]);

  // Inline edit
  const handleRequestInlineEdit = (nodeId) => {
    const node = findNode(nodeId);
    if (!node) return;
    setInlineEditId(nodeId); setInlineEditValue(node.name || '');
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  };

  const commitInlineEdit = () => {
    if (!inlineEditId || !project) return;
    const node = findNode(inlineEditId);
    if (!node) { setInlineEditId(null); return; }
    const newName = inlineEditValue.trim() || node.name;
    if (newName !== node.name) {
      saveSnapshot();
      updateLocal(p => ({ ...p, structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], inlineEditId, { name: newName }) } }));
      record(ACTION_TYPES.RENAME, { nodeId: inlineEditId, from: node.name, to: newName });
    }
    setInlineEditId(null);
  };

  // Position confirm
  const handlePositionConfirm = (itemId, pos) => {
    const node = findNode(itemId); if (!node) return;
    saveSnapshot();
    updateLocal(p => ({ ...p, structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], itemId, { cityPos: pos }) } }));
    record(ACTION_TYPES.MOVE, { nodeId: itemId, nodeName: node.name, to: pos });
  };

  // Place unplaced
  const handlePlaceItem = (itemId, pos) => {
    const node = findNode(itemId); if (!node) return;
    saveSnapshot();
    updateLocal(p => ({ ...p, structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], itemId, { placed: true, cityPos: pos }) } }));
    record(ACTION_TYPES.ADD, { nodeId: itemId, nodeName: node.name, colLabel: node.col });
  };

  // Road CRUD
  const handleRoadCreate = (fromId, toId, type, vehicle) => {
    saveSnapshot();
    const road = createRoad(fromId, toId, type, vehicle);
    updateLocal(p => ({ ...p, roads: addRoad(p.roads, road) }));
    const fn = findNode(fromId), tn = findNode(toId);
    record(ACTION_TYPES.CONNECT, { fromName: fn?.name || fromId, toName: tn?.name || toId, roadType: type, vehicle });
  };

  const handleRoadDelete = (roadId) => {
    saveSnapshot();
    const road = roads.find(r => r.id === roadId);
    updateLocal(p => ({ ...p, roads: removeRoad(p.roads, roadId) }));
    if (road) {
      const fn = findNode(road.from), tn = findNode(road.to);
      record(ACTION_TYPES.DISCONNECT, { fromName: fn?.name || road.from, toName: tn?.name || road.to });
    }
    if (selectedRoadId === roadId) setSelectedRoadId(null);
  };

  // Building type change
  const handleBuildingTypeChange = (nodeId, newType) => {
    const node = findNode(nodeId); if (!node) return;
    saveSnapshot();
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], nodeId, { buildingType: newType }) }
    }));
    record(ACTION_TYPES.TAG_CHANGE, { nodeId, nodeName: node.name, tagName: `type:${newType}` });
  };

  // Chat
  const handleSendMessage = (text) => {
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setAiLoading(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: lang === 'ko' ? `요청 확인: "${text}"\nClaude API 연동 후 사용 가능.` : `Received: "${text}"` }]);
      setAiLoading(false);
    }, 1000);
  };

  if (projectsLoading || !tabsLoaded) return <LoadingSpinner />;
  const hasItems = project && project.columns?.some(c => (project.structure[c.key] || []).length > 0);

  return (
    <div className={`fixed inset-0 ${theme.bg} flex flex-col`}>
      {/* Header */}
      <div className={`flex-shrink-0 ${theme.bgPanel} border-b ${theme.border} px-3 py-2 flex items-center gap-2`}>
        <div className={`${theme.text} ${monoCls} flex items-center gap-2`}>
          <span className="text-sm font-bold">sandroad</span>
          <span className={`text-[10px] ${theme.textMuted}`}>city view</span>
        </div>
        {project && <span className={`text-xs ${theme.textMuted} ${monoCls} ml-2 truncate max-w-[120px]`}>· {project.name}</span>}

        {/* Undo/Redo */}
        <button onClick={handleUndo} disabled={undoStack.current.length === 0}
          className={`p-1 rounded ${theme.textMuted} disabled:opacity-30`} title="Undo (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button onClick={handleRedo} disabled={redoStack.current.length === 0}
          className={`p-1 rounded ${theme.textMuted} disabled:opacity-30`} title="Redo (Ctrl+Y)">
          <Redo2 size={14} />
        </button>

        <div className="flex-1" />
        <button onClick={() => navigate('/')} className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}>
          <Edit3 size={12} /> editor
        </button>
        <button onClick={logout} className={`px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}>
          {t.logout}
        </button>
      </div>

      {/* City */}
      <div className="flex-1 relative overflow-hidden">
        {!project ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            {projLoading ? t.loadingProject : t.selectOrCreate}
          </div>
        ) : !hasItems ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            {lang === 'ko' ? '에디터에서 항목을 먼저 추가해주세요' : 'Add items in the editor first'}
          </div>
        ) : (
          <>
            <CityCanvas
              project={project} themeId={themeId}
              selectedId={selectedId} onSelectNode={setSelectedId}
              onRequestInlineEdit={handleRequestInlineEdit}
              onPositionConfirm={handlePositionConfirm}
              roads={roads} onRoadCreate={handleRoadCreate}
              onRoadDelete={handleRoadDelete} onPlaceItem={handlePlaceItem}
              onRoadSelect={setSelectedRoadId} selectedRoadId={selectedRoadId}
              paused={paused} speed={speed}
            />

            {/* Selected node panel */}
            {selectedNode && (() => {
              const bt = getBuildingType(selectedNode.buildingType);
              return (
              <div className={`absolute bottom-14 left-3 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-lg p-3 text-xs ${monoCls} max-w-[300px] z-10`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{bt.emoji}</span>
                  <div className="flex-1">
                    <div className={`font-bold ${theme.text} text-sm`}>{selectedNode.name}</div>
                    <div className={`text-[10px] ${theme.textMuted}`}>
                      {getLabel(bt, lang)} · {selectedNode.children?.length ? `${selectedNode.children.length} children` : 'leaf'}
                    </div>
                  </div>
                  <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: bt.color }} />
                </div>

                {/* Type change button */}
                <button
                  onClick={() => setTypePicker({ mode: 'building', nodeId: selectedId, currentValue: selectedNode.buildingType || 'page' })}
                  className={`mt-2 w-full flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border ${theme.button}`}
                  style={{ borderLeftColor: bt.color, borderLeftWidth: 3 }}
                >
                  {bt.emoji} {lang === 'ko' ? '건물 유형 변경' : 'Change type'}
                </button>

                {selectedNodeRoads.length > 0 && (
                  <div className={`mt-2 pt-2 border-t ${theme.border}`}>
                    <div className={`text-[9px] font-bold ${theme.text} mb-1`}>
                      {lang === 'ko' ? `도로 (${selectedNodeRoads.length})` : `Roads (${selectedNodeRoads.length})`}
                    </div>
                    {selectedNodeRoads.map(road => {
                      const otherId = road.from === selectedId ? road.to : road.from;
                      const other = findNode(otherId);
                      const vi = VEHICLE_TYPES[road.vehicle] || VEHICLE_TYPES.car;
                      const dt = DATA_TYPES[road.dataType] || DATA_TYPES.content;
                      return (
                        <div key={road.id} className="flex items-center gap-1 mb-0.5">
                          <span>{vi.emoji}{dt.emoji}</span>
                          <span className={`text-[10px] ${theme.text} flex-1 truncate`}>→ {other?.name || '?'}</span>
                          <button onClick={() => handleRoadDelete(road.id)} className="text-[9px] text-red-400 hover:text-red-600">✗</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex gap-1">
                  <button onClick={() => handleRequestInlineEdit(selectedId)} className={`px-2 py-1 text-[10px] rounded ${theme.button}`}>
                    {lang === 'ko' ? '수정' : 'Edit'}
                  </button>
                  <button onClick={() => navigate('/')} className={`px-2 py-1 text-[10px] rounded ${theme.button}`}>
                    {lang === 'ko' ? '에디터' : 'Editor'}
                  </button>
                  <button onClick={() => setSelectedId(null)} className={`px-2 py-1 text-[10px] rounded ${theme.button}`}>✗</button>
                </div>
              </div>
              );
            })()}

            {/* Selected road panel */}
            {selectedRoad && !selectedNode && (
              <div className={`absolute bottom-14 left-3 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-lg p-3 text-xs ${monoCls} max-w-[280px] z-10`}>
                <div className={`font-bold ${theme.text} text-sm`}>
                  {VEHICLE_TYPES[selectedRoad.vehicle]?.emoji} {lang === 'ko' ? '도로' : 'Road'}
                </div>
                <div className={`text-[10px] ${theme.textMuted} mt-1`}>
                  {findNode(selectedRoad.from)?.name || '?'} → {findNode(selectedRoad.to)?.name || '?'}
                </div>
                <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                  {lang === 'ko'
                    ? `${VEHICLE_TYPES[selectedRoad.vehicle]?.desc_ko || ''}`
                    : `${VEHICLE_TYPES[selectedRoad.vehicle]?.desc_en || ''}`}
                </div>
                <div className="mt-2 flex gap-1">
                  <button onClick={() => handleRoadDelete(selectedRoad.id)} className={`px-2 py-1 text-[10px] rounded bg-red-500 text-white`}>
                    {lang === 'ko' ? '삭제' : 'Delete'}
                  </button>
                  <button onClick={() => setSelectedRoadId(null)} className={`px-2 py-1 text-[10px] rounded ${theme.button}`}>✗</button>
                </div>
              </div>
            )}

            {/* Inline edit */}
            {inlineEditId && (
              <div className="absolute inset-0 flex items-center justify-center z-30" onClick={() => setInlineEditId(null)}>
                <div className={`${theme.bgPanel} border-2 ${theme.borderStrong} rounded-lg shadow-xl p-4 w-[90vw] max-w-sm`} onClick={e => e.stopPropagation()}>
                  <div className={`text-xs ${theme.textMuted} mb-2 ${monoCls}`}>{lang === 'ko' ? '항목 이름 수정' : 'Edit name'}</div>
                  <input ref={inlineInputRef} type="text" value={inlineEditValue}
                    onChange={e => setInlineEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEditId(null); }}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`} />
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setInlineEditId(null)} className={`px-3 py-1.5 text-xs font-medium border rounded-md ${theme.button}`}>{t.cancel}</button>
                    <button onClick={commitInlineEdit} className={`px-3 py-1.5 text-xs font-medium rounded-md ${theme.buttonPrimary}`}>OK</button>
                  </div>
                </div>
              </div>
            )}

            {/* Playback controls — top left */}
            <div className={`absolute top-12 left-3 flex items-center gap-1 ${theme.bgPanel} border ${theme.border} rounded-lg px-2 py-1 shadow-md z-10`}>
              <button
                onClick={() => setPaused(p => !p)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${paused ? 'bg-emerald-500 text-white' : `${theme.bgAlt} ${theme.text}`}`}
                title={paused ? 'Play (Space)' : 'Pause (Space)'}
              >
                {paused ? '▶' : '⏸'}
              </button>
              <div className={`w-px h-5 ${theme.border} mx-0.5`} />
              {[1, 2, 4, 8].map(s => (
                <button key={s}
                  onClick={() => { setSpeed(s); if (paused) setPaused(false); }}
                  className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${monoCls} ${speed === s && !paused ? theme.buttonPrimary : theme.button} border`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <ActionTimeline collapsed={timelineCollapsed} onToggleCollapse={() => setTimelineCollapsed(p => !p)} />
          </>
        )}
      </div>

      <ConsultBar collapsed={consultCollapsed} onToggleCollapse={() => setConsultCollapsed(p => !p)}
        onSendMessage={handleSendMessage} messages={chatMessages} isLoading={aiLoading} />

      {/* Unit Type Picker Modal */}
      {typePicker && (
        <UnitTypePicker
          mode={typePicker.mode}
          currentValue={typePicker.currentValue}
          onSelect={(typeKey) => {
            if (typePicker.mode === 'building' && typePicker.nodeId) {
              handleBuildingTypeChange(typePicker.nodeId, typeKey);
            }
          }}
          onClose={() => setTypePicker(null)}
        />
      )}
    </div>
  );
}

function findInTree(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = findInTree(n.children, id); if (f) return f; }
  }
  return null;
}
