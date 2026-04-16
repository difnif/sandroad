import React, { useState, useEffect, useRef, memo } from 'react';
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

// A text input that keeps its own local draft state so typing isn't
// interrupted by parent re-renders, Firestore echoes, or IME composition.
// The parent is updated on each change (for downstream save), but this
// component's displayed value comes from local state so the cursor
// never jumps back.
function DraftInput({
  value, onChange, onSubmit,
  className, placeholder, type = 'text', rows, multiline
}) {
  const [draft, setDraft] = useState(value ?? '');
  const composingRef = useRef(false);
  const prevValueRef = useRef(value);

  // When the parent value changes for a *different* reason than our local
  // typing (e.g. another client edited, or project switched), sync the draft.
  useEffect(() => {
    if (value !== prevValueRef.current && value !== draft && !composingRef.current) {
      setDraft(value ?? '');
    }
    prevValueRef.current = value;
    // eslint-disable-next-line
  }, [value]);

  const commit = (v) => {
    setDraft(v);
    // During Korean IME composition, don't push to parent — wait for compositionend
    if (composingRef.current) return;
    onChange(v);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };
  const handleCompositionEnd = (e) => {
    composingRef.current = false;
    const v = e.currentTarget.value;
    setDraft(v);
    onChange(v);
  };

  if (multiline) {
    return (
      <textarea
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={className}
        placeholder={placeholder}
        rows={rows}
        onInput={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
      />
    );
  }

  return (
    <input
      type={type}
      value={draft}
      onChange={(e) => commit(e.target.value)}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      className={className}
      placeholder={placeholder}
    />
  );
}

function TreeNode({
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
      <div className="flex items-start gap-1">
        <button
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

        <DraftInput
          value={node.name}
          onChange={(v) => onUpdate(colKey, flatItem.id, 'name', v)}
          className={`flex-1 min-w-0 px-1.5 py-0.5 text-sm font-medium ${monoCls} border focus:outline-none rounded ${theme.inputTransparent}`}
          placeholder={t.itemNamePlaceholder}
        />
      </div>

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

      <DraftInput
        multiline
        value={node.description || ''}
        onChange={(v) => onUpdate(colKey, flatItem.id, 'description', v)}
        className={`mt-1 px-1.5 py-0.5 text-xs ${monoCls} border focus:outline-none rounded resize-none ${theme.inputTransparent} ${theme.textMuted} block`}
        placeholder={t.itemDescPlaceholder}
        rows={1}
      />
    </div>
  );
}

// Wrap in memo — only re-render when relevant props change.
// The flatItem reference changes with every keystroke in the parent state though,
// so we compare by id/content instead of reference.
export default memo(TreeNode, (prev, next) => {
  if (prev.colKey !== next.colKey) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.hasClipboard !== next.hasClipboard) return false;
  if (prev.isDragOverlay !== next.isDragOverlay) return false;
  const a = prev.flatItem, b = next.flatItem;
  if (a.id !== b.id) return false;
  if (a.depth !== b.depth) return false;
  if (a.siblingIndex !== b.siblingIndex) return false;
  if (a.hasChildren !== b.hasChildren) return false;
  if (!!a.hiddenChildren !== !!b.hiddenChildren) return false;
  if (a.node.name !== b.node.name) return false;
  if (a.node.description !== b.node.description) return false;
  // Shallow tag equality
  const ta = a.node.tags || {}, tb = b.node.tags || {};
  for (const k of ['common', 'linked', 'commonPending', 'linkedPending', 'review']) {
    if (!!ta[k] !== !!tb[k]) return false;
  }
  // expandedIds is a Set and updates together with hasChildren/hiddenChildren in flatItem;
  // we already cover the "am I expanded?" via hiddenChildren and the parent will pass new flatItem.
  return true;
});
