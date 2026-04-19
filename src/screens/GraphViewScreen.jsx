import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, FolderOpen } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useProjectsList } from '../hooks/useProjectsList.js';
import { useProjectData } from '../hooks/useProjectData.js';
import { useTabs } from '../hooks/useTabs.js';
import { extractGraphData } from '../utils/graphLinks.js';
import GraphScene from '../components/graph/GraphScene.jsx';
import GraphControls from '../components/graph/GraphControls.jsx';
import NodeInfoPanel from '../components/graph/NodeInfoPanel.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function GraphViewScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, t, themeId } = useTheme();
  const { projects, loading: projectsLoading } = useProjectsList();
  const { openIds, activeId, loaded: tabsLoaded } = useTabs(projects);
  const { project, loading: projLoading } = useProjectData(activeId);

  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('focus');
  const [tilt, setTilt] = useState(0);

  const { nodes, links } = useMemo(() => extractGraphData(project), [project]);
  const selectedNode = useMemo(
    () => selectedId ? nodes.find(n => n.id === selectedId) : null,
    [selectedId, nodes]
  );

  const handleJumpToEditor = (nodeId) => {
    // Navigate back to editor; node-id-based scroll is a future enhancement
    navigate('/');
  };

  if (projectsLoading || !tabsLoaded) {
    return <LoadingSpinner />;
  }

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div className={`fixed inset-0 ${theme.bg} flex flex-col`}>
      {/* Header */}
      <div className={`flex-shrink-0 ${theme.bgPanel} border-b ${theme.border} px-3 py-2 flex items-center gap-2 flex-wrap`}>
        <div className={`${theme.text} ${monoCls} flex items-center gap-2`}>
          <span className="text-sm font-bold">sandroad</span>
          <span className={`text-[10px] ${theme.textMuted}`}>graph view</span>
        </div>
        {project && (
          <span className={`text-xs ${theme.textMuted} ${monoCls} ml-2 truncate max-w-[200px]`}>
            · {project.name}
          </span>
        )}

        <div className="flex-1" />

        <GraphControls
          mode={mode}
          onModeChange={setMode}
          tilt={tilt}
          onTiltChange={setTilt}
        />

        <div className={`w-px h-5 ${theme.border}`} style={{ borderLeftWidth: 1 }} />

        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded ${monoCls} ${theme.button}`}
          title="back to editor"
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

      {/* 3D scene */}
      <div className="flex-1 relative">
        {!project ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            {projLoading ? t.loadingProject : t.selectOrCreate}
          </div>
        ) : nodes.length === 0 ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${theme.textDim} ${monoCls}`}>
            no items yet — add some in the editor
          </div>
        ) : (
          <>
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
            />

            {/* Help hint (top-left) */}
            <div className={`absolute top-3 left-3 ${theme.bgPanel} border ${theme.border} rounded p-2 text-[10px] ${theme.textMuted} ${monoCls} max-w-[200px]`}>
              <div className={`font-semibold ${theme.text} mb-0.5`}>controls</div>
              <div>· drag: rotate view</div>
              <div>· scroll/pinch: zoom</div>
              <div>· 2-finger drag: pan</div>
              <div>· click box: details</div>
              <div className={`mt-1 pt-1 border-t ${theme.border}`}>
                tilt the view (5-30°) to reveal links curving behind boxes
              </div>
            </div>

            {/* Stats badge */}
            <div className={`absolute top-3 right-3 ${theme.bgPanel} border ${theme.border} rounded px-2 py-1 text-[10px] ${theme.textMuted} ${monoCls}`}>
              {nodes.length} nodes · {links.length} links
            </div>

            <NodeInfoPanel
              selectedNode={selectedNode}
              allNodes={nodes}
              links={links}
              onClose={() => setSelectedId(null)}
              onJumpToEditor={handleJumpToEditor}
            />
          </>
        )}
      </div>
    </div>
  );
}
