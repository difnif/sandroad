import React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Copy, Clipboard } from 'lucide-react';
import { TAG_KEYS, TAG_META, TAG_PILL_STYLES, normalizeTags } from '../../constants/tags.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';

const MAX_DEPTH = 3;

export default function TreeNode({
  node, depth, colKey,
  expanded, onToggleExpand,
  onUpdate, onToggleTag, onAddChild, onCopy, onPasteAsChild, onRequestDelete,
  hasClipboard
}) {
  const { theme, t, themeId } = useTheme();
  const hasChildren = node.children?.length > 0;
  const isExpanded = expanded.has(node.id);
  const canAddChild = depth < MAX_DEPTH;
  const canPasteAsChild = hasClipboard && depth < MAX_DEPTH;
  const tags = normalizeTags(node.tags);
  const tagPillStyles = TAG_PILL_STYLES[themeId] || TAG_PILL_STYLES.sand;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const hoverCls = themeId === 'sand'
    ? 'hover:bg-amber-50/40'
    : themeId === 'dark' ? 'hover:bg-[#2a2d2e]' : 'hover:bg-[#f3f3f3]';
  const borderRowCls = themeId === 'sand' ? 'border-stone-100' : themeId === 'dark' ? 'border-[#2d2d30]' : 'border-[#e5e5e5]';

  return (
    <div>
      <div
        className={`px-2 py-1.5 ${hoverCls} border-b ${borderRowCls}`}
        style={{ paddingLeft: `${(depth - 1) * 14 + 8}px` }}
      >
        {/* Row 1: expand + depth + name */}
        <div className="flex items-start gap-1">
          <button
            onClick={() => onToggleExpand(node.id)}
            className={`mt-1 w-4 h-4 flex items-center justify-center ${theme.textDim} hover:${theme.text} flex-shrink-0`}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className={`mt-1 text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${theme.depthBadge[depth]}`}>
            {depth}
          </span>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdate(colKey, node.id, 'name', e.target.value)}
            className={`flex-1 min-w-0 px-1.5 py-0.5 text-sm font-medium ${monoCls} border focus:outline-none rounded ${theme.inputTransparent}`}
            placeholder={t.itemNamePlaceholder}
          />
        </div>

        {/* Row 2: tags + actions */}
        <div className="flex items-center gap-1 mt-1 flex-wrap" style={{ marginLeft: '36px' }}>
          {TAG_KEYS.map(tagKey => {
            const meta = TAG_META[tagKey];
            const on = tags[tagKey];
            const styles = tagPillStyles[meta.color];
            const prefix = meta.kind === 'pending' ? '◷ ' : meta.kind === 'review' ? '? ' : '';
            const label = t.tags[tagKey];
            return (
              <button
                key={tagKey}
                onClick={() => onToggleTag(colKey, node.id, tagKey)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${monoCls} ${on ? styles.on : styles.off}`}
                title={label}
              >
                {prefix}{label}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={() => onCopy(colKey, node.id)}
            className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
            title={t.copy}
          >
            <Copy size={12} />
          </button>
          {canPasteAsChild && (
            <button
              onClick={() => onPasteAsChild(colKey, node.id)}
              className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
              title={t.pasteAsChild}
            >
              <Clipboard size={12} />
            </button>
          )}
          {canAddChild && (
            <button
              onClick={() => onAddChild(colKey, node.id)}
              className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
              title={t.addChildItem}
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={() => onRequestDelete(colKey, node.id, node.name)}
            className={`p-1 ${theme.textMuted} hover:text-red-500 rounded`}
            title={t.delete}
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Row 3: description */}
        <textarea
          value={node.description || ''}
          onChange={(e) => onUpdate(colKey, node.id, 'description', e.target.value)}
          className={`mt-1 px-1.5 py-0.5 text-xs ${monoCls} border focus:outline-none rounded resize-none ${theme.inputTransparent} ${theme.textMuted}`}
          style={{ marginLeft: '36px', width: 'calc(100% - 36px)' }}
          placeholder={t.itemDescPlaceholder}
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
