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
import { updateInTree } from '../utils/treeOps.js';
import GraphScene from '../components/graph/GraphScene.jsx';
import GraphControls from '../components/graph/GraphControls.jsx';
import NodeInfoPanel from '../components/graph/NodeInfoPanel.jsx';
import ActionTimeline from '../components/graph/ActionTimeline.jsx';
import ConsultBar from '../components/graph/ConsultBar.jsx';
import VennView from '../components/graph/VennView.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function GraphViewScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, t, themeId } = useTheme();
  const { projects, loading: projectsLoading } = useProjectsList();
  const { openIds, activeId, loaded: tabsLoaded } = useTabs(projects);
  const { project, loading: projLoading, updateLocal } = useProjectData(activeId);
  const { record, clearAll: clearActions } = useActions();

  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('focus');
  const [tilt, setTilt] = useState(0);
  const [viewMode, setViewMode] = useState('venn'); // 'boxes' | 'venn'  — venn default
  const [customPositions, setCustomPositions] = useState({});
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [consultCollapsed, setConsultCollapsed] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const inlineInputRef = useRef(null);
  const savePositionsTimer = useRef(null);

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

  const savePositions = (newPos) => {
    if (savePositionsTimer.current) clearTimeout(savePositionsTimer.current);
    savePositionsTimer.current = setTimeout(() => {
      updateLocal(p => ({ ...p, graphPositions: newPos }));
    }, 800);
  };

  const handlePositionChange = useCallback((nodeId, pos) => {
    const node = nodes.find(n => n.id === nodeId);
    setCustomPositions(prev => {
      const next = { ...prev, [nodeId]: { x: pos.x, y: pos.y } };
      savePositions(next);
      return next;
    });
    record(ACTION_TYPES.MOVE, {
      nodeId, nodeName: node?.name || nodeId,
      from: customPositions[nodeId] || { x: 0, y: 0 }, to: pos
    });
  }, [nodes, customPositions, record]);

  const handleResetLayout = () => {
    setCustomPositions({});
    updateLocal(p => { const n = { ...p }; delete n.graphPositions; return n; });
  };

  const handleRequestInlineEdit = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setInlineEditId(nodeId);
    setInlineEditValue(node.name || '');
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  }, [nodes]);

  const commitInlineEdit = () => {
    if (!inlineEditId || !project) return;
    const node = nodes.find(n => n.id === inlineEditId);
    if (!node) { setInlineEditId(null); return; }
    const newName = inlineEditValue.trim() || node.name;
    if (newName !== node.name) {
      updateLocal(p => ({
        ...p,
        structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], inlineEditId, { name: newName }) }
      }));
      record(ACTION_TYPES.RENAME, { nodeId: inlineEditId, nodeName: node.name, from: node.name, to: newName });
    }
    setInlineEditId(null);
  };

  const cancelInlineEdit = () => setInlineEditId(null);

  const handleSendMessage = useCallback((text, pinnedContext) => {
    setChatMessages(prev => [...prev, {
      role: 'user', content: text,
      ...(pinnedContext ? { actions: pinnedContext.split('\n').map(l => {
        const m = l.match(/^#(\d+): (.+)/);
        return m ? { num: parseInt(m[1]), description: m[2] } : null;
      }).filter(Boolean) } : {})
    }]);
    setAiLoading(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'ko'
          ? `요청 확인: "${text}"\n\nClaude API 연동 후 구조 제안을 받을 수 있어요.`
          : `Request: "${text}"\n\nStructure proposals available after Claude API connection.`
      }]);
      setAiLoading(false);
    }, 1000);
  }, [lang]);

  if (projectsLoading || !tabsLoaded) return <LoadingSpinner />;

  const hasCustomPositions = Object.keys(customPositions).length > 0;
  const hasContent = project && nodes.length > 0;

  return (
    <div className={`fixed inset-0 ${theme.bg} flex flex-col`}>
      {/* Header */}
      <div className={`flex-shrink-0 ${theme.bgPanel} border-b ${theme.border} px-3 py-2 flex items-center gap-2 flex-wrap`}>
        <div className={`${theme.text} ${monoCls} flex items-center gap-2`}>
          <span className="text-sm font-bold">sandroad</span>
          <span className={`text-[10px] ${theme.textMuted}`}>
            {viewMode === 'venn' ? 'venn' : '3D'} view
          </span>
        </div>
        {project && (
          <span className={`text-xs ${theme.textMuted} ${monoCls} ml-2 truncate max-w-[160px]`}>
            · {project.name}
          </span>
        )}
        <div className="flex-1" />

        <GraphControls
          mode={mode} onModeChange={setMode}
          tilt={tilt} onTiltChange={setTilt}
          viewMode={viewMode} onViewModeChange={setViewMode}
        />

        {viewMode === 'boxes' && hasCustomPositions && (
          <button onClick={handleResetLayout} className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded ${monoCls} ${theme.button}`}>
            <RotateCcw size={11} />
          </button>
        )}

        <div className={`w-px h-5 ${theme.border}`} style={{ borderLeftWidth: 1 }} />

        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}
        >
          <Edit3 size={12} /> editor
        </button>
        <button
          onClick={logout}
          className={`px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}
        >
          {t.logout}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {!project ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            {projLoading ? t.loadingProject : t.selectOrCreate}
          </div>
        ) : !hasContent ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            {lang === 'ko' ? '항목을 먼저 추가해주세요' : 'no items yet'}
          </div>
        ) : (
          <>
            {viewMode === 'venn' ? (
              <VennView
                project={project}
                themeId={themeId}
                selectedId={selectedId}
                onSelectNode={setSelectedId}
                onRequestInlineEdit={handleRequestInlineEdit}
                onPositionChange={handlePositionChange}
              />
            ) : (
              <GraphScene
                nodes={nodes}
                links={links}
                project={project}
                themeId={themeId}
                selectedId={selectedId}
                onSelectNode={setSelectedId}
                mode={mode}
                tilt={tilt}
                onTiltChange={setTilt}
                customPositions={customPositions}
                onPositionChange={handlePositionChange}
                onRequestInlineEdit={handleRequestInlineEdit}
              />
            )}

            {/* Stats */}
            <div className={`absolute top-3 left-3 ${theme.bgPanel} border ${theme.border} rounded px-2 py-1 text-[10px] ${theme.textMuted} ${monoCls}`}>
              {nodes.length} nodes · {links.length} links
            </div>

            {/* Inline edit overlay */}
            {inlineEditId && (
              <div className="absolute inset-0 flex items-center justify-center z-30" onClick={cancelInlineEdit}>
                <div
                  className={`${theme.bgPanel} border-2 ${theme.borderStrong} rounded-lg shadow-xl p-4 w-[90vw] max-w-sm`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`text-xs ${theme.textMuted} mb-2 ${monoCls}`}>
                    {lang === 'ko' ? '항목 이름 수정' : 'Edit item name'}
                  </div>
                  <input
                    ref={inlineInputRef}
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitInlineEdit();
                      if (e.key === 'Escape') cancelInlineEdit();
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={cancelInlineEdit} className={`px-3 py-1.5 text-xs font-medium border rounded-md ${theme.button}`}>
                      {t.cancel}
                    </button>
                    <button onClick={commitInlineEdit} className={`px-3 py-1.5 text-xs font-medium rounded-md ${theme.buttonPrimary}`}>
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'boxes' && (
              <NodeInfoPanel
                selectedNode={selectedNode}
                allNodes={nodes}
                links={links}
                onClose={() => setSelectedId(null)}
                onJumpToEditor={() => navigate('/')}
              />
            )}

            {/* Action Timeline (floating) */}
            <ActionTimeline
              collapsed={timelineCollapsed}
              onToggleCollapse={() => setTimelineCollapsed(prev => !prev)}
            />
          </>
        )}
      </div>

      {/* Consult Bar */}
      <ConsultBar
        collapsed={consultCollapsed}
        onToggleCollapse={() => setConsultCollapsed(prev => !prev)}
        onSendMessage={handleSendMessage}
        messages={chatMessages}
        isLoading={aiLoading}
      />
    </div>
  );
}
