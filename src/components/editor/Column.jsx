import React, { useState } from 'react';
import { Clipboard } from 'lucide-react';
import TreeNode from './TreeNode.jsx';
import { COLUMN_STYLES, COLOR_OPTIONS } from '../../constants/theme.js';
import { countNodes } from '../../utils/treeOps.js';

export default function Column({
  column, items,
  expanded,
  onUpdateColumn,
  onAddRoot, onPasteToRoot, hasClipboard,
  onToggleExpand, onUpdateNode, onToggleTag, onAddChild,
  onCopy, onPasteAsChild, onRequestDelete
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const styles = COLUMN_STYLES[column.color] || COLUMN_STYLES.sand;
  const total = countNodes(items);

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden flex flex-col">
      <div className={`px-3 py-2 border-b-2 ${styles.header}`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full ${styles.dot} flex-shrink-0`} />
            {editingLabel ? (
              <input
                autoFocus
                value={column.label}
                onChange={(e) => onUpdateColumn(column.key, { label: e.target.value })}
                onBlur={() => setEditingLabel(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingLabel(false); }}
                className="text-sm font-bold bg-white border border-stone-300 rounded px-1 py-0.5 min-w-0 flex-1"
              />
            ) : (
              <h2
                className="text-sm font-bold truncate"
                onDoubleClick={() => setEditingLabel(true)}
                title="더블클릭으로 이름 수정"
              >
                {column.label}
                <span className="ml-1.5 text-xs opacity-70 font-normal">{total}</span>
              </h2>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <select
              value={column.color}
              onChange={(e) => onUpdateColumn(column.key, { color: e.target.value })}
              className="text-[10px] bg-transparent border border-transparent hover:border-stone-300 rounded px-1 py-0.5 cursor-pointer"
              title="색상 변경"
            >
              {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {hasClipboard && (
              <button
                onClick={() => onPasteToRoot(column.key)}
                className={`text-xs font-medium px-1.5 py-1 rounded transition-colors ${styles.addBtn}`}
                title="컬럼에 붙여넣기"
              >
                <Clipboard size={12} />
              </button>
            )}
            <button
              onClick={() => onAddRoot(column.key)}
              className={`text-xs font-medium px-2 py-1 rounded transition-colors ${styles.addBtn}`}
            >
              + 1차
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[400px] max-h-[70vh] overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-6 text-center text-stone-400 text-xs">
            "+ 1차" 버튼으로<br />첫 구역을 세워보세요
          </div>
        ) : (
          <div className="py-1">
            {items.map(n => (
              <TreeNode
                key={n.id}
                node={n}
                depth={1}
                colKey={column.key}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                onUpdate={onUpdateNode}
                onToggleTag={onToggleTag}
                onAddChild={onAddChild}
                onCopy={onCopy}
                onPasteAsChild={onPasteAsChild}
                onRequestDelete={onRequestDelete}
                hasClipboard={hasClipboard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
