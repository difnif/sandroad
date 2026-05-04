import React, { useState, useRef, useEffect } from 'react';
import { FileDown, X, ChevronUp, ChevronDown, Loader, Copy, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { generateArchDoc, downloadContent } from '../../utils/archExport.js';

export default function ArchPanel({ project, collapsed, onToggleCollapse }) {
  const { theme, themeId } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  const [status, setStatus] = useState('idle'); // idle | generating | done
  const [progress, setProgress] = useState(0);
  const [sectionLabel, setSectionLabel] = useState('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const panelEndRef = useRef(null);

  // Auto-scroll during generation
  useEffect(() => {
    if (status === 'generating') {
      panelEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, status]);

  const handleGenerate = async () => {
    if (!project) return;
    setStatus('generating');
    setProgress(0);
    setContent('');
    setSectionLabel('');

    await generateArchDoc(project, lang, (info) => {
      setProgress(info.percent);
      setSectionLabel(info.sectionLabel);
      setContent(info.content);
      if (info.done) setStatus('done');
    });
  };

  const handleDownload = () => {
    downloadContent(content, `${project?.name || 'sandroad'}_architecture.md`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = content; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setStatus('idle');
    setContent('');
    setProgress(0);
    setSectionLabel('');
  };

  // Collapsed: small button
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`absolute bottom-12 right-3 z-20 ${theme.bgPanel} border ${theme.border} rounded-full w-10 h-10 flex items-center justify-center shadow-lg`}
        title={lang === 'ko' ? '명세서 패널' : 'Spec panel'}
      >
        <FileDown size={16} className={theme.textMuted} />
        {status === 'generating' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[7px] font-bold flex items-center justify-center animate-pulse">
            {progress}
          </span>
        )}
        {status === 'done' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[7px] font-bold flex items-center justify-center">
            ✓
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`${theme.bgPanel} border-t ${theme.border} flex flex-col`} style={{ maxHeight: '50vh' }}>
      {/* Header */}
      <div className={`px-3 py-2 border-b ${theme.border} flex items-center gap-2`}>
        <FileDown size={14} className={theme.text} />
        <span className={`text-xs font-bold ${theme.text} ${monoCls} flex-1`}>
          {lang === 'ko' ? '아키텍처 명세서' : 'Architecture Spec'}
        </span>

        {/* Progress or actions */}
        {status === 'generating' && (
          <div className="flex items-center gap-2">
            <Loader size={12} className={`${theme.textMuted} animate-spin`} />
            <span className={`text-[10px] ${theme.textMuted} ${monoCls}`}>{progress}%</span>
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-1">
            <button onClick={handleCopy}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border ${monoCls} ${copied ? 'bg-emerald-500 text-white border-emerald-600' : theme.button}`}>
              {copied ? <><Check size={10} /> {lang === 'ko' ? '복사됨' : 'Copied'}</> : <><Copy size={10} /> {lang === 'ko' ? '복사' : 'Copy'}</>}
            </button>
            <button onClick={handleDownload}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border ${monoCls} ${theme.buttonPrimary}`}>
              <FileDown size={10} /> .md
            </button>
            <button onClick={handleClear}
              className={`p-1 rounded ${theme.textMuted} text-[10px]`} title="Clear">
              <X size={12} />
            </button>
          </div>
        )}
        {status === 'idle' && (
          <button onClick={handleGenerate} disabled={!project}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded border disabled:opacity-40 ${monoCls} ${theme.buttonPrimary}`}>
            {lang === 'ko' ? '생성 시작' : 'Generate'}
          </button>
        )}

        <button onClick={onToggleCollapse} className={`p-1 rounded ${theme.textMuted}`}>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Progress bar */}
      {status === 'generating' && (
        <div className={`px-3 py-1.5 ${theme.bgAlt}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${theme.text} ${monoCls} w-8 text-right`}>{progress}%</span>
          </div>
          <div className={`text-[9px] ${theme.textMuted} ${monoCls} flex items-center gap-1`}>
            <Loader size={8} className="animate-spin" />
            {sectionLabel}...
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {status === 'idle' && (
          <div className={`p-6 text-center ${theme.textDim} text-[11px] ${monoCls}`}>
            {lang === 'ko'
              ? '프로젝트의 모든 구조, 연결, 데이터 흐름을\n아키텍처 명세서로 출력합니다.\n\nAI에게 코드 개발을 지시할 때 사용하세요.'
              : 'Export all structure, connections, and data flows\nas an architecture specification.\n\nUse this to instruct AI for code development.'}
          </div>
        )}

        {(status === 'generating' || status === 'done') && (
          <div className="p-3">
            {status === 'done' ? (
              // Editable textarea when done
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full min-h-[200px] p-3 text-[11px] leading-relaxed border rounded-lg resize-y focus:outline-none ${monoCls} ${theme.input}`}
                style={{ fontFamily: 'monospace' }}
                spellCheck={false}
              />
            ) : (
              // Read-only preview during generation
              <pre className={`text-[10px] leading-relaxed ${theme.text} ${monoCls} whitespace-pre-wrap`}>
                {content}
                <span className="animate-pulse">▊</span>
                <div ref={panelEndRef} />
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {status === 'done' && (
        <div className={`px-3 py-1.5 border-t ${theme.border} ${theme.bgAlt} flex items-center gap-2`}>
          <span className={`text-[9px] ${theme.textDim} ${monoCls} flex-1`}>
            {lang === 'ko'
              ? '내용을 직접 수정한 후 다운로드하거나 복사할 수 있습니다'
              : 'Edit the content before downloading or copying'}
          </span>
          <span className={`text-[9px] ${theme.textMuted} ${monoCls}`}>
            {content.length.toLocaleString()} {lang === 'ko' ? '자' : 'chars'}
          </span>
        </div>
      )}
    </div>
  );
}
