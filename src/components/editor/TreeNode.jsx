import React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Copy, Clipboard } from 'lucide-react';
import { DEPTH_BADGE, MAX_DEPTH } from '../../constants/theme.js';
import { TAG_DEFS, TAG_PILL_STYLES, normalizeTags } from '../../constants/tags.js';

export default function TreeNode({
  node, depth, colKey,
  expanded, onToggleExpand,
  onUpdate, onToggleTag, onAddChild, onCopy, onPasteAsChild, onRequestDelete,
  hasClipboard
}) {
  const hasChildren = node.children?.length > 0;
  const isExpanded = expanded.has(node.id);
  const canAddChild = depth < MAX_DEPTH;
  const canPasteAsChild = hasClipboard && depth < MAX_DEPTH;
  const tags = normalizeTags(node.tags);

  return (
    <div>
      <div
        className="px-2 py-1.5 hover:bg-amber-50/40 border-b border-stone-100"
        style={{ paddingLeft: `${(depth - 1) * 14 + 8}px` }}
      >
        {/* Row 1: expand + depth + name */}
        <div className="flex items-start gap-1">
          <button
            onClick={() => onToggleExpand(node.id)}
            className="mt-1 w-4 h-4 flex items-center justify-center text-stone-400 hover:text-stone-700 flex-shrink-0"
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className={`mt-1 text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${DEPTH_BADGE[depth]}`}>
            {depth}
          </span>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdate(colKey, node.id, 'name', e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-0.5 text-sm font-medium text-stone-900 border border-transparent hover:border-stone-200 focus:border-amber-500 focus:bg-white focus:outline-none rounded bg-transparent"
            placeholder="항목명"
          />
        </div>

        {/* Row 2: tags + actions */}
        <div className="flex items-center gap-1 mt-1 flex-wrap" style={{ marginLeft: '36px' }}>
          {Object.entries(TAG_DEFS).map(([tagKey, def]) => {
            const on = tags[tagKey];
            const styles = TAG_PILL_STYLES[def.color];
            const prefix = def.kind === 'pending' ? '◷ ' : def.kind === 'review' ? '? ' : '';
            return (
              <button
                key={tagKey}
                onClick={() => onToggleTag(colKey, node.id, tagKey)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${on ? styles.on : styles.off}`}
                title={def.label}
              >
                {prefix}{def.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={() => onCopy(colKey, node.id)}
            className="p-1 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded"
            title="복사"
          >
            <Copy size={12} />
          </button>
          {canPasteAsChild && (
            <button
              onClick={() => onPasteAsChild(colKey, node.id)}
              className="p-1 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded"
              title="하위로 붙여넣기"
            >
              <Clipboard size={12} />
            </button>
          )}
          {canAddChild && (
            <button
              onClick={() => onAddChild(colKey, node.id)}
              className="p-1 text-stone-500 hover:text-sky-700 hover:bg-sky-50 rounded"
              title="하위 항목 추가"
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={() => onRequestDelete(colKey, node.id, node.name)}
            className="p-1 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="삭제"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Row 3: description */}
        <textarea
          value={node.description || ''}
          onChange={(e) => onUpdate(colKey, node.id, 'description', e.target.value)}
          className="mt-1 px-1.5 py-0.5 text-xs text-stone-600 border border-transparent hover:border-stone-200 focus:border-amber-500 focus:bg-white focus:outline-none rounded bg-transparent resize-none"
          style={{ marginLeft: '36px', width: 'calc(100% - 36px)' }}
          placeholder="설명 (선택)"
          rows={1}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
      </div>

      {hasChildren && isExpanded && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          colKey={colKey}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onUpdate={onUpdate}
          onToggleTag={onToggleTag}
          onAddChild={onAddChild}
          onCopy={onCopy}
          onPasteAsChild={onPasteAsChild}
          onRequestDelete={onRequestDelete}
          hasClipboard={hasClipboard}
        />
      ))}
    </div>
  );
}
