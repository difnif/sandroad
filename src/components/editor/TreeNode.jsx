import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Copy, Clipboard,
  GripVertical, ArrowLeft, ArrowRight, ArrowUp, ArrowDown
} from 'lucide-react';
import { TAG_KEYS, TAG_META, TAG_PILL_STYLES, normalizeTags } from '../../constants/tags.js';
import { MAX_DEPTH } from '../../constants/theme.js';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { formatDepthNumber } from '../../utils/numbering.js';

export default function TreeNode({
  flatItem,
  colKey,
  isSelected,
  isDragOverlay,
  onToggleExpand,
  onUpdate,
  onToggleTag,
  onAddChild,
  onCopy,
  onPasteAsChild,
  onRequestDelete,
  onToggleSelect,
  onOutdent,
  onIndent,
  onMoveUp,
  onMoveDown,
  hasClipboard,
  expandedIds
}) {
  const { theme, t, themeId } = useTheme();

  const { node, depth, siblingIndex, hasChildren, hiddenChildren } = flatItem;
  const isCollapsed = !!hiddenChildren;
  const isExpanded = hasChildren && !isCollapsed;
  const canAddChild = depth < MAX_DEPTH;
  const canPasteAsChild = hasClipboard && depth < MAX_DEPTH;
  const canIndent = siblingIndex > 0 && depth < MAX_DEPTH;
  const canOutdent = depth > 1;
  const tags = normalizeTags(node.tags);
  const tagPillStyles = TAG_PILL_STYLES[themeId] || TAG_PILL_STYLES.sand;
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  // Sortable hook — skip when this is a drag overlay preview
  const sortable = useSortable({ id: flatItem.id, disabled: isDragOverlay });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = isDragOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        paddingLeft: `${(depth - 1) * 14 + 8}px`
      };

  const hoverCls = themeId === 'sand'
    ? 'hover:bg-amber-50/40'
    : themeId === 'dark' ? 'hover:bg-[#2a2d2e]' : 'hover:bg-[#f3f3f3]';
  const borderRowCls = themeId === 'sand'
    ? 'border-stone-100'
    : themeId === 'dark' ? 'border-[#2d2d30]' : 'border-[#e5e5e5]';
  const selectedCls = isSelected
    ? (themeId === 'dark' ? 'bg-[#094771]/40 border-l-2 border-l-[#007acc]' : themeId === 'light' ? 'bg-[#dbeafe]/50 border-l-2 border-l-[#0066b8]' : 'bg-amber-100/60 border-l-2 border-l-amber-600')
    : '';

  const numberLabel = formatDepthNumber(depth, siblingIndex);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-2 py-1.5 ${hoverCls} ${selectedCls} border-b ${borderRowCls}`}
    >
      {/* Row 1: drag handle + expand + depth badge + name */}
      <div className="flex items-start gap-1">
        <button
          ref={null}
          {...attributes}
          {...listeners}
          className={`mt-1 w-4 h-4 flex items-center justify-center ${theme.textDim} hover:${theme.text} flex-shrink-0 cursor-grab active:cursor-grabbing touch-none`}
          title="drag"
          aria-label="drag"
        >
          <GripVertical size={12} />
        </button>

        <button
          onClick={() => onToggleSelect(flatItem.id)}
          className={`mt-1 w-3 h-3 rounded-sm border flex-shrink-0 ${isSelected ? 'bg-amber-500 border-amber-500' : `${theme.border}`}`}
          title="select"
        />

        <button
          onClick={() => onToggleExpand(flatItem.id)}
          className={`mt-1 w-4 h-4 flex items-center justify-center ${theme.textDim} hover:${theme.text} flex-shrink-0`}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <span
          className={`mt-0.5 min-w-[22px] text-center text-[10px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${theme.depthBadge[depth]} ${monoCls}`}
        >
          {numberLabel}
        </span>

        <input
          type="text"
          value={node.name}
          onChange={(e) => onUpdate(colKey, flatItem.id, 'name', e.target.value)}
          className={`flex-1 min-w-0 px-1.5 py-0.5 text-sm font-medium ${monoCls} border focus:outline-none rounded ${theme.inputTransparent}`}
          placeholder={t.itemNamePlaceholder}
        />
      </div>

      {/* Row 2: tags + actions */}
      <div className="flex items-center gap-1 mt-1 flex-wrap" style={{ marginLeft: '64px' }}>
        {TAG_KEYS.map(tagKey => {
          const meta = TAG_META[tagKey];
          const on = tags[tagKey];
          const styles = tagPillStyles[meta.color];
          const prefix = meta.kind === 'pending' ? '◷ ' : meta.kind === 'review' ? '? ' : '';
          const label = t.tags[tagKey];
          return (
            <button
              key={tagKey}
              onClick={() => onToggleTag(colKey, flatItem.id, tagKey)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${monoCls} ${on ? styles.on : styles.off}`}
              title={label}
            >
              {prefix}{label}
            </button>
          );
        })}
        <div className="flex-1" />

        {/* Move buttons */}
        <button
          onClick={() => onMoveUp(colKey, flatItem.id)}
          className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
          title="move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={() => onMoveDown(colKey, flatItem.id)}
          className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
          title="move down"
        >
          <ArrowDown size={12} />
        </button>
        <button
          onClick={() => canOutdent && onOutdent(colKey, flatItem.id)}
          disabled={!canOutdent}
          className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded disabled:opacity-30`}
          title="outdent"
        >
          <ArrowLeft size={12} />
        </button>
        <button
          onClick={() => canIndent && onIndent(colKey, flatItem.id)}
          disabled={!canIndent}
          className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded disabled:opacity-30`}
          title="indent"
        >
          <ArrowRight size={12} />
        </button>

        <button
          onClick={() => onCopy(colKey, flatItem.id)}
          className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
          title={t.copy}
        >
          <Copy size={12} />
        </button>
        {canPasteAsChild && (
          <button
            onClick={() => onPasteAsChild(colKey, flatItem.id)}
            className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
            title={t.pasteAsChild}
          >
            <Clipboard size={12} />
          </button>
        )}
        {canAddChild && (
          <button
            onClick={() => onAddChild(colKey, flatItem.id)}
            className={`p-1 ${theme.textMuted} hover:${theme.accentText} rounded`}
            title={t.addChildItem}
          >
            <Plus size={12} />
          </button>
        )}
        <button
          onClick={() => onRequestDelete(colKey, flatItem.id, node.name)}
          className={`p-1 ${theme.textMuted} hover:text-red-500 rounded`}
          title={t.delete}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Row 3: description */}
      <textarea
        value={node.description || ''}
        onChange={(e) => onUpdate(colKey, flatItem.id, 'description', e.target.value)}
        className={`mt-1 px-1.5 py-0.5 text-xs ${monoCls} border focus:outline-none rounded resize-none ${theme.inputTransparent} ${theme.textMuted}`}
        style={{ marginLeft: '64px', width: 'calc(100% - 64px)' }}
        placeholder={t.itemDescPlaceholder}
        rows={1}
        onInput={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
      />
    </div>
  );
}
