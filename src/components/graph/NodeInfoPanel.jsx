import React from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export default function NodeInfoPanel({ selectedNode, allNodes, links, onClose, onJumpToEditor }) {
  const { theme, themeId } = useTheme();
  if (!selectedNode) return null;

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const connectedLinks = links.filter(l => l.from === selectedNode.id || l.to === selectedNode.id);

  return (
    <div className={`absolute bottom-4 right-4 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-lg p-3 text-xs ${monoCls} max-w-sm w-[90vw] sm:w-auto`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className={`font-bold ${theme.text} truncate`}>
            <span className="opacity-60">&gt; </span>{selectedNode.name}
          </div>
          <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>
            [{selectedNode.colLabel}] · L{selectedNode.depth}
          </div>
        </div>
        <button
          onClick={onClose}
          className={`${theme.textDim} hover:${theme.text} flex-shrink-0`}
        >
          <X size={14} />
        </button>
      </div>

      {selectedNode.description && (
        <div className={`mt-2 pt-2 border-t ${theme.border} ${theme.textMuted} text-[11px]`}>
          {selectedNode.description}
        </div>
      )}

      {connectedLinks.length > 0 && (
        <div className={`mt-2 pt-2 border-t ${theme.border}`}>
          <div className={`text-[10px] font-semibold ${theme.text} mb-1`}>
            connected ({connectedLinks.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {connectedLinks.map((l, i) => {
              const otherId = l.from === selectedNode.id ? l.to : l.from;
              const other = allNodes.find(n => n.id === otherId);
              if (!other) return null;
              return (
                <div key={i} className={`text-[11px] ${theme.textMuted}`}>
                  → [{other.colLabel}] {other.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => onJumpToEditor(selectedNode.id)}
        className={`mt-3 w-full px-2 py-1.5 text-[11px] rounded ${theme.button} flex items-center justify-center gap-1`}
      >
        <ArrowLeft size={12} /> open in editor
      </button>
    </div>
  );
}
