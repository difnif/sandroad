import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, RotateCcw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useActions, ACTION_TYPES } from '../contexts/ActionContext.jsx';
import { useProjectsList } from '../hooks/useProjectsList.js';
import { useProjectData } from '../hooks/useProjectData.js';
import { useTabs } from '../hooks/useTabs.js';
import { extractGraphData } from '../utils/graphLinks.js';
import {
  updateInTree, removeFromTree, addChildInTree, findNodeInTree, findPath
} from '../utils/treeOps.js';
import GraphScene from '../components/graph/GraphScene.jsx';
import GraphControls from '../components/graph/GraphControls.jsx';
import NodeInfoPanel from '../components/graph/NodeInfoPanel.jsx';
import ActionTimeline from '../components/graph/ActionTimeline.jsx';
import ConsultBar from '../components/graph/ConsultBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function GraphViewScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, t, themeId } = useTheme();
  const { projects, loading: projectsLoading } = useProjectsList();
  const { openIds, activeId, loaded: tabsLoaded } = useTabs(projects);
  const { project, loading: projLoading, updateLocal } = useProjectData(activeId);
  const { record, clearAll: clearActions } = useActions();

  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('focus');
  const [tilt, setTilt] = useState(0);
  const [customPositions, setCustomPositions] = useState({});
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [consultCollapsed, setConsultCollapsed] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const inlineInputRef = useRef(null);
  const saveTimer = useRef(null);

  const { nodes, links } = useMemo(() => extractGraphData(project), [project]);
  const selectedNode = useMemo(
    () => selectedId ? nodes.find(n => n.id === selectedId) : null,
    [selectedId, nodes]
  );
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  useEffect(() => {
    if (project?.graphPositions) setCustomPositions(project.graphPositions);
    else setCustomPositions({});
    clearActions();
  }, [activeId]);

  const savePositions = (p) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateLocal(pr => ({ ...pr, graphPositions: p })), 800);
  };

  const handlePositionChange = useCallback((nodeId, pos) => {
    const node = nodes.find(n => n.id === nodeId);
    setCustomPositions(prev => {
      const next = { ...prev, [nodeId]: { x: pos.x, y: pos.y } };
      savePositions(next);
      return next;
    });
    record(ACTION_TYPES.MOVE, { nodeId, nodeName: node?.name || nodeId, to: pos });
  }, [nodes, record]);

  const handleResetLayout = () => {
    setCustomPositions({});
    updateLocal(p => { const n = { ...p }; delete n.graphPositions; return n; });
  };

  // --- Reparent: move nodeId to become a child of newParentId ---
  const handleReparent = useCallback((nodeId, newParentId) => {
    if (!project || nodeId === newParentId) return;

    // Find source column and node
    let srcColKey = null, nodeData = null;
    for (const col of project.columns) {
      const found = findNodeInTree(project.structure[col.key] || [], nodeId);
      if (found) { srcColKey = col.key; nodeData = found; break; }
    }
    if (!srcColKey || !nodeData) return;

    // Find destination column
    let destColKey = null;
    for (const col of project.columns) {
      if (findPath(project.structure[col.key] || [], newParentId)) {
        destColKey = col.key;
        break;
      }
    }
    if (!destColKey) return;

    // Check: don't reparent into own descendant
    const isDescendant = (tree, ancestorId, targetId) => {
      const node = findNodeInTree(tree, ancestorId);
      if (!node) return false;
      const checkChildren = (n) => {
        if (n.id === targetId) return true;
        return (n.children || []).some(checkChildren);
      };
      return checkChildren(node);
    };
    if (isDescendant(project.structure[srcColKey] || [], nodeId, newParentId)) return;

    // Already a child of this parent?
    const parentNode = findNodeInTree(project.structure[destColKey] || [], newParentId);
    if (parentNode && parentNode.children?.some(c => c.id === nodeId)) return;

    // Clone node (with its subtree)
    const cloneDeep = (n) => ({ ...n, children: (n.children || []).map(cloneDeep) });
    const movingNode = cloneDeep(nodeData);

    const destParent = findNodeInTree(project.structure[destColKey] || [], newParentId);
    const destParentName = destParent?.name || newParentId;

    updateLocal(p => {
      const structure = { ...p.structure };
      // Remove from source
      structure[srcColKey] = removeFromTree(structure[srcColKey] || [], nodeId);
      // Add to destination as child of newParentId
      structure[destColKey] = addChildInTree(structure[destColKey] || [], newParentId, movingNode);
      return { ...p, structure };
    });

    record(ACTION_TYPES.INDENT, {
      nodeId, nodeName: nodeData.name,
      parentId: newParentId, parentName: destParentName,
      fromCol: srcColKey, toCol: destColKey
    });
  }, [project, record, updateLocal]);

  // Inline edit
  const handleRequestInlineEdit = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setInlineEditId(nodeId); setInlineEditValue(node.name || '');
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  }, [nodes]);

  const commitInlineEdit = () => {
    if (!inlineEditId || !project) return;
    const node = nodes.find(n => n.id === inlineEditId);
    if (!node) { setInlineEditId(null); return; }
    const newName = inlineEditValue.trim() || node.name;
    if (newName !== node.name) {
      updateLocal(p => ({ ...p, structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], inlineEditId, { name: newName }) } }));
      record(ACTION_TYPES.RENAME, { nodeId: inlineEditId, from: node.name, to: newName });
    }
    setInlineEditId(null);
  };

  // Chat (placeholder)
  const handleSendMessage = useCallback((text, ctx) => {
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setAiLoading(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'ko' ? `요청 확인: "${text}"\nClaude API 연동 후 구조 제안 가능.` : `Received: "${text}"\nAvailable after API setup.`
      }]);
      setAiLoading(false);
    }, 1000);
  }, [lang]);

  if (projectsLoading || !tabsLoaded) return <LoadingSpinner />;

  const hasContent = project && nodes.length > 0;
  const hasCustom = Object.keys(customPositions).length > 0;

  return (
    <div className={`fixed inset-0 ${theme.bg} flex flex-col`}>
      {/* Header */}
      <div className={`flex-shrink-0 ${theme.bgPanel} border-b ${theme.border} px-3 py-2 flex items-center gap-2 flex-wrap`}>
        <div className={`${theme.text} ${monoCls} flex items-center gap-2`}>
          <span className="text-sm font-bold">sandroad</span>
          <span className={`text-[10px] ${theme.textMuted}`}>graph</span>
        </div>
        {project && <span className={`text-xs ${theme.textMuted} ${monoCls} ml-2 truncate max-w-[140px]`}>· {project.name}</span>}
        <div className="flex-1" />
        <GraphControls mode={mode} onModeChange={setMode} tilt={tilt} onTiltChange={setTilt} />
        {hasCustom && (
          <button onClick={handleResetLayout} className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded ${monoCls} ${theme.button}`}>
            <RotateCcw size={11} />
          </button>
        )}
        <div className={`w-px h-5 ${theme.border}`} style={{ borderLeftWidth: 1 }} />
        <button onClick={() => navigate('/')} className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}>
          <Edit3 size={12} /> editor
        </button>
        <button onClick={logout} className={`px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}>
          {t.logout}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 relative overflow-hidden">
        {!hasContent ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            {!project ? (projLoading ? t.loadingProject : t.selectOrCreate) : (lang === 'ko' ? '항목을 먼저 추가해주세요' : 'no items yet')}
          </div>
        ) : (
          <>
            <GraphScene
              nodes={nodes} links={links} project={project} themeId={themeId}
              selectedId={selectedId} onSelectNode={setSelectedId}
              mode={mode} tilt={tilt} onTiltChange={setTilt}
              customPositions={customPositions}
              onPositionChange={handlePositionChange}
              onRequestInlineEdit={handleRequestInlineEdit}
              onReparent={handleReparent}
            />

            {/* Help */}
            <div className={`absolute top-3 left-3 ${theme.bgPanel} border ${theme.border} rounded p-2 text-[10px] ${theme.textMuted} ${monoCls} max-w-[200px]`}>
              <div className={`font-semibold ${theme.text} mb-0.5`}>controls</div>
              <div>· drag box: move + reparent</div>
              <div>· drag empty: rotate</div>
              <div>· pinch: zoom · 2-finger: pan</div>
              <div>· tap: select · double-tap: edit</div>
              <div className={`mt-1 pt-1 border-t ${theme.border}`}>
                {lang === 'ko'
                  ? '박스를 다른 박스 위에 놓으면\n하위 항목으로 이동합니다'
                  : 'Drop a box on another\nto reparent it'}
              </div>
            </div>

            {/* Stats */}
            <div className={`absolute top-3 right-3 ${theme.bgPanel} border ${theme.border} rounded px-2 py-1 text-[10px] ${theme.textMuted} ${monoCls}`}>
              {nodes.length} nodes · {links.length} links
            </div>

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

            <NodeInfoPanel selectedNode={selectedNode} allNodes={nodes} links={links}
              onClose={() => setSelectedId(null)} onJumpToEditor={() => navigate('/')} />

            <ActionTimeline collapsed={timelineCollapsed} onToggleCollapse={() => setTimelineCollapsed(p => !p)} />
          </>
        )}
      </div>

      <ConsultBar collapsed={consultCollapsed} onToggleCollapse={() => setConsultCollapsed(p => !p)}
        onSendMessage={handleSendMessage} messages={chatMessages} isLoading={aiLoading} />
    </div>
  );
}
