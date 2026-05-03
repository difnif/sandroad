import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useActions, ACTION_TYPES } from '../contexts/ActionContext.jsx';
import { useProjectsList } from '../hooks/useProjectsList.js';
import { useProjectData } from '../hooks/useProjectData.js';
import { useTabs } from '../hooks/useTabs.js';
import { updateInTree } from '../utils/treeOps.js';
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
  const { record } = useActions();

  const [selectedId, setSelectedId] = useState(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const [consultCollapsed, setConsultCollapsed] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const inlineInputRef = useRef(null);

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  const findNode = (nodeId) => {
    if (!project) return null;
    for (const col of project.columns || []) {
      const found = findInTree(project.structure[col.key] || [], nodeId);
      if (found) return { ...found, col: col.key };
    }
    return null;
  };

  const handleRequestInlineEdit = (nodeId) => {
    const node = findNode(nodeId);
    if (!node) return;
    setInlineEditId(nodeId);
    setInlineEditValue(node.name || '');
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  };

  const commitInlineEdit = () => {
    if (!inlineEditId || !project) return;
    const node = findNode(inlineEditId);
    if (!node) { setInlineEditId(null); return; }
    const newName = inlineEditValue.trim() || node.name;
    if (newName !== node.name) {
      updateLocal(p => ({
        ...p,
        structure: { ...p.structure, [node.col]: updateInTree(p.structure[node.col] || [], inlineEditId, { name: newName }) }
      }));
      record(ACTION_TYPES.RENAME, { nodeId: inlineEditId, from: node.name, to: newName });
    }
    setInlineEditId(null);
  };

  const handleSendMessage = (text) => {
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setAiLoading(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'ko' ? `요청 확인: "${text}"\nClaude API 연동 후 사용 가능.` : `Received: "${text}"\nAvailable after API setup.`
      }]);
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
        {project && <span className={`text-xs ${theme.textMuted} ${monoCls} ml-2 truncate max-w-[160px]`}>· {project.name}</span>}
        <div className="flex-1" />
        <button onClick={() => navigate('/')} className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}>
          <Edit3 size={12} /> editor
        </button>
        <button onClick={logout} className={`px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}>
          {t.logout}
        </button>
      </div>

      {/* City canvas */}
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
              project={project}
              themeId={themeId}
              selectedId={selectedId}
              onSelectNode={setSelectedId}
              onRequestInlineEdit={handleRequestInlineEdit}
            />

            {/* Selected info */}
            {selectedId && (() => {
              const node = findNode(selectedId);
              if (!node) return null;
              return (
                <div className={`absolute bottom-14 left-3 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-lg p-3 text-xs ${monoCls} max-w-[280px]`}>
                  <div className={`font-bold ${theme.text}`}>{node.name}</div>
                  <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                    {node.children?.length ? `${node.children.length} children` : 'leaf'}
                  </div>
                  {node.description && <div className={`mt-1 pt-1 border-t ${theme.border} ${theme.textMuted}`}>{node.description}</div>}
                  <div className="mt-2 flex gap-1">
                    <button onClick={() => handleRequestInlineEdit(selectedId)} className={`px-2 py-1 text-[10px] rounded ${theme.button}`}>
                      {lang === 'ko' ? '이름 수정' : 'Edit name'}
                    </button>
                    <button onClick={() => navigate('/')} className={`px-2 py-1 text-[10px] rounded ${theme.button}`}>
                      {lang === 'ko' ? '에디터에서 보기' : 'View in editor'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Inline edit modal */}
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

            <ActionTimeline collapsed={timelineCollapsed} onToggleCollapse={() => setTimelineCollapsed(p => !p)} />
          </>
        )}
      </div>

      <ConsultBar collapsed={consultCollapsed} onToggleCollapse={() => setConsultCollapsed(p => !p)}
        onSendMessage={handleSendMessage} messages={chatMessages} isLoading={aiLoading} />
    </div>
  );
}

function findInTree(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findInTree(n.children, id);
      if (found) return found;
    }
  }
  return null;
}
