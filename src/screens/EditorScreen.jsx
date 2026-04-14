import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileDown, Palette, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useProjectsList } from '../hooks/useProjectsList.js';
import { useProjectData } from '../hooks/useProjectData.js';
import { useTabs } from '../hooks/useTabs.js';
import { useClipboard } from '../hooks/useClipboard.js';
import { useDashboardSettings } from '../hooks/useDashboardSettings.js';

import {
  updateInTree, toggleTagInTree, addChildInTree, removeFromTree,
  findNodeInTree, findDepthInTree, collectAllIds, cloneNodeWithNewIds, newEmptyNode
} from '../utils/treeOps.js';
import { computeMetrics } from '../utils/metrics.js';
import { exportProjectAsMarkdown } from '../utils/markdownExport.js';
import { genColumnKey } from '../utils/projectFactory.js';
import { getNextColumnColor } from '../constants/themes.js';

import Column from '../components/editor/Column.jsx';
import AddColumnCard from '../components/editor/AddColumnCard.jsx';
import TabBar from '../components/editor/TabBar.jsx';
import ClipboardBanner from '../components/editor/ClipboardBanner.jsx';
import DeleteModal from '../components/editor/DeleteModal.jsx';
import NewProjectDialog from '../components/editor/NewProjectDialog.jsx';
import ProjectsListModal from '../components/editor/ProjectsListModal.jsx';
import DashboardBar from '../components/dashboard/DashboardBar.jsx';
import DashboardSettings from '../components/dashboard/DashboardSettings.jsx';
import AppearanceSettings from '../components/common/AppearanceSettings.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

const MAX_DEPTH = 3;
const MAX_COLUMNS = 8;
const MIN_COLUMNS = 1;

export default function EditorScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, t, themeId } = useTheme();
  const { projects, loading: projectsLoading, createNew, remove, rename } = useProjectsList();
  const { openIds, activeId, loaded: tabsLoaded, openTab, closeTab, switchTab } = useTabs(projects);
  const { project, loading: projLoading, saveStatus, updateLocal } = useProjectData(activeId);
  const { clipboard, copy, clear: clearClipboard } = useClipboard();
  const { settings: dashSettings, setSettings: setDashSettings } = useDashboardSettings();

  const [expanded, setExpanded] = useState(new Set());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjectsList, setShowProjectsList] = useState(false);
  const [showDashSettings, setShowDashSettings] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);

  useEffect(() => {
    if (!tabsLoaded || projectsLoading) return;
    if (openIds.length === 0 && projects.length > 0 && !activeId) {
      openTab(projects[0].id);
    }
  }, [tabsLoaded, projectsLoading, openIds.length, projects, activeId, openTab]);

  useEffect(() => {
    if (!project) return;
    const ids = new Set();
    for (const c of project.columns || []) {
      collectAllIds(project.structure?.[c.key] || []).forEach(id => ids.add(id));
    }
    setExpanded(ids);
    // eslint-disable-next-line
  }, [activeId]);

  const metrics = useMemo(() => computeMetrics(project), [project]);

  const handleUpdateNode = (colKey, id, field, value) => {
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: updateInTree(p.structure[colKey] || [], id, { [field]: value }) }
    }));
  };

  const handleToggleTag = (colKey, id, tagName) => {
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: toggleTagInTree(p.structure[colKey] || [], id, tagName) }
    }));
  };

  const handleAddRoot = (colKey) => {
    const node = newEmptyNode();
    if (themeId !== 'sand') node.name = 'new_item';
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: [...(p.structure[colKey] || []), node] }
    }));
    setExpanded(prev => new Set(prev).add(node.id));
  };

  const handleAddChild = (colKey, parentId) => {
    const node = newEmptyNode();
    if (themeId !== 'sand') node.name = 'new_item';
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: addChildInTree(p.structure[colKey] || [], parentId, node) }
    }));
    setExpanded(prev => {
      const next = new Set(prev);
      next.add(parentId);
      next.add(node.id);
      return next;
    });
  };

  const handleRequestDelete = (colKey, id, name) => {
    setPendingDelete({ type: 'node', colKey, id, name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'node') {
      const { colKey, id } = pendingDelete;
      updateLocal(p => ({
        ...p,
        structure: { ...p.structure, [colKey]: removeFromTree(p.structure[colKey] || [], id) }
      }));
    } else if (pendingDelete.type === 'project') {
      await remove(pendingDelete.id);
      if (activeId === pendingDelete.id) {
        closeTab(pendingDelete.id);
      }
    } else if (pendingDelete.type === 'column') {
      const { colKey } = pendingDelete;
      updateLocal(p => {
        if (p.columns.length <= MIN_COLUMNS) return p;
        const newColumns = p.columns.filter(c => c.key !== colKey);
        const newStructure = { ...p.structure };
        delete newStructure[colKey];
        return { ...p, columns: newColumns, structure: newStructure };
      });
    }
    setPendingDelete(null);
  };

  const handleToggleExpand = (nodeId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleCopy = (colKey, id) => {
    if (!project) return;
    const node = findNodeInTree(project.structure[colKey] || [], id);
    if (!node) return;
    copy(node, project.name);
  };

  const handlePasteToRoot = (colKey) => {
    if (!clipboard) return;
    const cloned = cloneNodeWithNewIds(clipboard.node);
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: [...(p.structure[colKey] || []), cloned] }
    }));
    setExpanded(prev => {
      const next = new Set(prev);
      collectAllIds([cloned]).forEach(id => next.add(id));
      return next;
    });
  };

  const handlePasteAsChild = (colKey, parentId) => {
    if (!clipboard || !project) return;
    const parentDepth = findDepthInTree(project.structure[colKey] || [], parentId);
    if (parentDepth >= MAX_DEPTH) return;
    const cloned = cloneNodeWithNewIds(clipboard.node);
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: addChildInTree(p.structure[colKey] || [], parentId, cloned) }
    }));
    setExpanded(prev => {
      const next = new Set(prev);
      next.add(parentId);
      collectAllIds([cloned]).forEach(id => next.add(id));
      return next;
    });
  };

  const handleUpdateColumn = (colKey, updates) => {
    updateLocal(p => ({
      ...p,
      columns: p.columns.map(c => c.key === colKey ? { ...c, ...updates } : c)
    }));
  };

  const handleAddColumn = () => {
    if (!project) return;
    if (project.columns.length >= MAX_COLUMNS) return;
    const newKey = genColumnKey(project.columns.map(c => c.key));
    const existingColors = project.columns.map(c => c.color);
    const newColor = getNextColumnColor(themeId, existingColors);
    const newLabel = t.columnDefaultName(project.columns.length + 1);
    updateLocal(p => ({
      ...p,
      columns: [...p.columns, { key: newKey, label: newLabel, color: newColor }],
      structure: { ...p.structure, [newKey]: [] }
    }));
  };

  const handleRequestDeleteColumn = (colKey, name) => {
    if (!project) return;
    if (project.columns.length <= MIN_COLUMNS) return;
    setPendingDelete({ type: 'column', colKey, name });
  };

  const handleCreateProject = async (name) => {
    const proj = await createNew(name);
    if (proj) openTab(proj.id);
    setShowNewProject(false);
  };

  const handleOpenProject = (pid) => {
    openTab(pid);
    setShowProjectsList(false);
  };

  const handleDeleteProject = (pid, name) => {
    setPendingDelete({ type: 'project', id: pid, name });
    setShowProjectsList(false);
  };

  const handleExport = () => {
    exportProjectAsMarkdown(project, metrics);
  };

  if (projectsLoading || !tabsLoaded) {
    return <LoadingSpinner />;
  }

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div
      className={`min-h-screen ${theme.bg}`}
      style={{ paddingBottom: dashSettings.position === 'bottom' ? '56px' : 0 }}
    >
      <DashboardBar
        metrics={metrics}
        saveStatus={saveStatus}
        settings={dashSettings}
        setSettings={setDashSettings}
        onOpenSettings={() => setShowDashSettings(true)}
      />

      <div className="max-w-[1600px] mx-auto p-3 sm:p-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <div className={`${theme.text} ${monoCls}`}>
            <span className="text-lg font-bold">sandroad</span>
            <span className={`ml-2 text-xs ${theme.textMuted} hidden sm:inline`}>{t.appTagline}</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/graph')}
            disabled={!project}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md disabled:opacity-40 ${monoCls} ${theme.button}`}
            title="3D graph view"
          >
            <Box size={14} /> graph
          </button>
          <button
            onClick={() => setShowAppearance(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md ${monoCls} ${theme.button}`}
            title={t.appearance}
          >
            <Palette size={14} />
          </button>
          <button
            onClick={() => setShowProjectsList(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md ${monoCls} ${theme.button}`}
          >
            <FolderOpen size={14} /> {t.projectList}
          </button>
          <button
            onClick={handleExport}
            disabled={!project}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md disabled:opacity-40 ${monoCls} ${theme.buttonPrimary}`}
          >
            <FileDown size={14} /> {t.export}
          </button>
          <button
            onClick={logout}
            className={`px-2.5 py-1.5 text-xs font-medium border rounded-md ${monoCls} ${theme.button}`}
          >
            {t.logout}
          </button>
        </div>

        <TabBar
          openIds={openIds}
          projectsList={projects}
          activeId={activeId}
          onSwitch={switchTab}
          onClose={closeTab}
          onNew={() => setShowNewProject(true)}
        />

        <ClipboardBanner clipboard={clipboard} onClear={clearClipboard} />

        {!project ? (
          projLoading ? (
            <div className={`p-10 text-center ${theme.textDim} text-sm ${monoCls}`}>{t.loadingProject}</div>
          ) : (
            <div className={`p-10 text-center ${theme.textDim} text-sm ${monoCls}`}>{t.selectOrCreate}</div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {project.columns.map(col => (
              <Column
                key={col.key}
                column={col}
                items={project.structure[col.key] || []}
                expanded={expanded}
                onUpdateColumn={handleUpdateColumn}
                onRequestDeleteColumn={handleRequestDeleteColumn}
                onAddRoot={handleAddRoot}
                onPasteToRoot={handlePasteToRoot}
                hasClipboard={!!clipboard}
                onToggleExpand={handleToggleExpand}
                onUpdateNode={handleUpdateNode}
                onToggleTag={handleToggleTag}
                onAddChild={handleAddChild}
                onCopy={handleCopy}
                onPasteAsChild={handlePasteAsChild}
                onRequestDelete={handleRequestDelete}
              />
            ))}
            {project.columns.length < MAX_COLUMNS && (
              <AddColumnCard onAdd={handleAddColumn} />
            )}
          </div>
        )}
      </div>

      <DeleteModal
        pendingDelete={pendingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <NewProjectDialog
        open={showNewProject}
        onCancel={() => setShowNewProject(false)}
        onCreate={handleCreateProject}
      />
      <ProjectsListModal
        open={showProjectsList}
        projects={projects}
        openIds={openIds}
        onClose={() => setShowProjectsList(false)}
        onOpen={handleOpenProject}
        onRename={rename}
        onDelete={handleDeleteProject}
        onNew={() => { setShowProjectsList(false); setShowNewProject(true); }}
      />
      <DashboardSettings
        open={showDashSettings}
        settings={dashSettings}
        setSettings={setDashSettings}
        onClose={() => setShowDashSettings(false)}
      />
      <AppearanceSettings
        open={showAppearance}
        onClose={() => setShowAppearance(false)}
      />
    </div>
  );
}
