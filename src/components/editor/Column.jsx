import React, { useMemo, useState } from 'react';
import { Clipboard, Edit2, X, Check } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TreeNode from './TreeNode.jsx';
import { countNodes } from '../../utils/treeOps.js';
import { flattenVisible } from '../../utils/treeFlatten.js';
import { formatColumnNumber } from '../../utils/numbering.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function Column({
  column, columnIndex, items, expandedIds,
  selectedIds,
  onUpdateColumn, onRequestDeleteColumn,
  onAddRoot, onPasteToRoot, hasClipboard,
  onToggleExpand, onUpdateNode, onToggleTag, onAddChild,
  onCopy, onPasteAsChild, onRequestDelete, onToggleSelect,
  onOutdent, onIndent, onMoveUp, onMoveDown
}) {
  const { theme, t, themeId } = useTheme();
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(column.label);

  const palette = theme.columnColors;
  const resolvedColor = palette.includes(column.color) ? column.color : palette[0];
  const styles = theme.columnStyles[resolvedColor];
  const total = countNodes(items);
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  // Flatten tree for DnD
  const flatItems = useMemo(
    () => flattenVisible(items, expandedIds),
    [items, expandedIds]
  );

  // Column-level droppable for empty area drops
  const { setNodeRef: setDroppableRef, isOver: isOverColumn } = useDroppable({
    id: `col:${column.key}`,
    data: { type: 'column', colKey: column.key }
  });

  const startEdit = () => {
    setLabelDraft(column.label);
    setEditingLabel(true);
  };
  const commitEdit = () => {
    const v = labelDraft.trim() || column.label;
    if (v !== column.label) onUpdateColumn(column.key, { label: v });
    setEditingLabel(false);
  };
  const cancelEdit = () => {
    setLabelDraft(column.label);
    setEditingLabel(false);
  };

  const columnRoman = formatColumnNumber(columnIndex);

  return (
    <div className={`${theme.bgPanel} border ${theme.border} rounded-lg overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className={`px-3 py-2 border-b-2 ${styles.header}`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full ${styles.dot} flex-shrink-0`} />
            <span className={`text-[11px] font-bold opacity-70 ${monoCls} flex-shrink-0`}>
              {columnRoman}.
            </span>
            {editingLabel ? (
              <>
                <input
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`text-sm font-bold ${monoCls} bg-white border border-stone-300 rounded px-1 py-0.5 min-w-0 flex-1 text-stone-900`}
                />
                <button onClick={commitEdit} className="p-0.5 hover:bg-black/10 rounded">
                  <Check size={12} />
                </button>
                <button onClick={cancelEdit} className="p-0.5 hover:bg-black/10 rounded">
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <h2
                  className={`text-sm font-bold truncate ${monoCls} cursor-pointer`}
                  onDoubleClick={startEdit}
                  title={t.columnEditTitle}
                >
                  {column.label}
                  <span className="ml-1.5 text-xs opacity-70 font-normal">{total}</span>
                </h2>
                <button
                  onClick={startEdit}
                  className="p-0.5 hover:bg-black/10 rounded opacity-60 hover:opacity-100"
                  title={t.columnEditTitle}
                >
                  <Edit2 size={11} />
                </button>
              </>
            )}
          </div>
          {!editingLabel && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <select
                value={resolvedColor}
                onChange={(e) => onUpdateColumn(column.key, { color: e.target.value })}
                className={`text-[10px] ${monoCls} bg-transparent border border-transparent hover:border-current/30 rounded px-1 py-0.5 cursor-pointer`}
                title="color"
              >
                {palette.map(c => <option key={c} value={c} className="text-stone-900">{c}</option>)}
              </select>
              {hasClipboard && (
                <button
                  onClick={() => onPasteToRoot(column.key)}
                  className={`text-xs font-medium px-1.5 py-1 rounded transition-colors ${styles.addBtn}`}
                  title={t.pasteToColumn}
                >
                  <Clipboard size={12} />
                </button>
              )}
              <button
                onClick={() => onAddRoot(column.key)}
                className={`text-xs font-medium ${monoCls} px-2 py-1 rounded transition-colors ${styles.addBtn}`}
              >
                {t.addRoot}
              </button>
              <button
                onClick={() => onRequestDeleteColumn(column.key, column.label)}
                className={`p-1 rounded opacity-50 hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition-colors`}
                title={t.deleteColumn}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body (droppable) */}
      <div
        ref={setDroppableRef}
        className={`flex-1 min-h-[400px] max-h-[70vh] overflow-y-auto ${isOverColumn ? 'bg-amber-50/30' : ''}`}
      >
        {flatItems.length === 0 ? (
          <div className={`p-6 text-center ${theme.textDim} text-xs ${monoCls}`}>
            {t.columnEmpty[0]}<br />{t.columnEmpty[1]}
          </div>
        ) : (
          <SortableContext items={flatItems.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="py-1">
              {flatItems.map(flat => (
                <TreeNode
                  key={flat.id}
                  flatItem={flat}
                  colKey={column.key}
                  isSelected={selectedIds.has(flat.id)}
                  expandedIds={expandedIds}
                  hasClipboard={hasClipboard}
                  onToggleExpand={onToggleExpand}
                  onUpdate={onUpdateNode}
                  onToggleTag={onToggleTag}
                  onAddChild={onAddChild}
                  onCopy={onCopy}
                  onPasteAsChild={onPasteAsChild}
                  onRequestDelete={onRequestDelete}
                  onToggleSelect={onToggleSelect}
                  onOutdent={onOutdent}
                  onIndent={onIndent}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
