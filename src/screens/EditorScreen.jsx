import React, { useEffect, useMemo, useState } from 'react';
import { FolderOpen, FileDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
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
import { MAX_DEPTH } from '../constants/theme.js';

import Column from '../components/editor/Column.jsx';
import TabBar from '../components/editor/TabBar.jsx';
import ClipboardBanner from '../components/editor/ClipboardBanner.jsx';
import DeleteModal from '../components/editor/DeleteModal.jsx';
import NewProjectDialog from '../components/editor/NewProjectDialog.jsx';
import ProjectsListModal from '../components/editor/ProjectsListModal.jsx';
import DashboardBar from '../components/dashboard/DashboardBar.jsx';
import DashboardSettings from '../components/dashboard/DashboardSettings.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function EditorScreen() {
  const { user, logout } = useAuth();
  const { projects, loading: projectsLoading, createNew, remove, rename } = useProjectsList();
  const { openIds, activeId, loaded: tabsLoaded, openTab, closeTab, switchTab } = useTabs(projects);
  const { project, loading: projLoading, saveStatus, updateLocal } = useProjectData(activeId);
  const { clipboard, copy, clear: clearClipboard } = useClipboard();
  const { settings: dashSettings, setSettings: setDashSettings } = useDashboardSettings();

  const [expanded, setExpanded] = useState(new Set()); // node ids
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showProjectsList, setShowProjectsList] = useState(false);
  const [showDashSettings, setShowDashSettings] = useState(false);

  // Auto-open first project on first load
  useEffect(() => {
    if (!tabsLoaded || projectsLoading) return;
    if (openIds.length === 0 && projects.length > 0 && !activeId) {
      openTab(projects[0].id);
    }
  }, [tabsLoaded, projectsLoading, openIds.length, projects, activeId, openTab]);

  // Auto-expand all nodes when a new project loads
  useEffect(() => {
    if (!project) return;
    const ids = new Set();
    for (const c of project.columns || []) {
      collectAllIds(project.structure?.[c.key] || []).forEach(id => ids.add(id));
    }
    setExpanded(ids);
  }, [activeId]); // re-run only when switching project

  const metrics = useMemo(() => computeMetrics(project), [project]);

  // ----- Node operations (all go through updateLocal which schedules save) -----
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
    updateLocal(p => ({
      ...p,
      structure: { ...p.structure, [colKey]: [...(p.structure[colKey] || []), node] }
    }));
    setExpanded(prev => new Set(prev).add(node.id));
  };

  const handleAddChild = (colKey, parentId) => {
    const node = newEmptyNode();
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

  // ----- Clipboard -----
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

  // ----- Column edit -----
  const handleUpdateColumn = (colKey, updates) => {
    updateLocal(p => ({
      ...p,
      columns: p.columns.map(c => c.key === colKey ? { ...c, ...updates } : c)
    }));
  };

  // ----- Project CRUD -----
  const handleCreateProject = async (name) => {
    const proj = await createNew(name);
    if (proj) {
      openTab(proj.id);
    }
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

  // ----- Render -----
  if (projectsLoading || !tabsLoaded) {
    return <LoadingSpinner message="sandroad 불러오는 중..." />;
  }

  return (
    <div
      className="min-h-screen bg-amber-50/30 font-sans"
      style={{ paddingBottom: dashSettings.position === 'bottom' ? '56px' : 0 }}
    >
      {/* Dashboard Bar */}
      <DashboardBar
        metrics={metrics}
        saveStatus={saveStatus}
        settings={dashSettings}
        setSettings={setDashSettings}
        onOpenSettings={() => setShowDashSettings(true)}
      />

      <div className="max-w-[1600px] mx-auto p-3 sm:p-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <div className="text-stone-900">
            <span className="text-lg font-bold">sandroad</span>
            <span className="ml-2 text-xs text-stone-500 hidden sm:inline">구조 기획 도구</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowProjectsList(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            <FolderOpen size={14} /> 도시 목록
          </button>
          <button
            onClick={handleExport}
            disabled={!project}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-stone-800 rounded-md hover:bg-stone-900 disabled:opacity-40"
          >
            <FileDown size={14} /> 내보내기
          </button>
          <button
            onClick={logout}
            className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            로그아웃
          </button>
        </div>

        {/* Tabs */}
        <TabBar
          openIds={openIds}
          projectsList={projects}
          activeId={activeId}
          onSwitch={switchTab}
          onClose={closeTab}
          onNew={() => setShowNewProject(true)}
        />

        {/* Clipboard banner */}
        <ClipboardBanner clipboard={clipboard} onClear={clearClipboard} />

        {/* Columns */}
        {!project ? (
          projLoading ? (
            <div className="p-10 text-center text-stone-400 text-sm">도시 불러오는 중...</div>
          ) : (
            <div className="p-10 text-center text-stone-400 text-sm">
              도시를 선택하거나 새 도시를 만드세요
            </div>
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
          </div>
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
}
