import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle, Loader, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { runLocalInspection, runAIInspection } from '../../utils/structureInspector.js';

const LEVEL_CONFIG = {
  error:   { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-200',   label_ko: '오류',  label_en: 'Error' },
  warning: { icon: AlertCircle,   color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200', label_ko: '경고',  label_en: 'Warning' },
  info:    { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',  label_ko: '참고',  label_en: 'Info' },
};

export default function InspectionPanel({ project, onClose }) {
  const { theme, themeId } = useTheme();
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  const [localResult, setLocalResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [viewMode, setViewMode] = useState('city'); // 'city' | 'dev'
  const [expandedChecks, setExpandedChecks] = useState(new Set());

  // Run local inspection immediately
  useEffect(() => {
    if (!project) return;
    const result = runLocalInspection(project);
    setLocalResult(result);
  }, [project]);

  // AI inspection (on demand)
  const handleAIInspect = async () => {
    if (!localResult) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await runAIInspection(project, localResult, lang);
      setAiResult(result);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleCheck = (idx) => {
    setExpandedChecks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  if (!localResult) return null;

  const scoreColor = localResult.score >= 80 ? 'text-emerald-500' : localResult.score >= 50 ? 'text-amber-500' : 'text-red-500';
  const scoreBar = localResult.score >= 80 ? 'bg-emerald-500' : localResult.score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className={`${theme.bgPanel} border ${theme.border} rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`px-4 py-3 border-b ${theme.border}`}>
          <div className="flex items-center justify-between">
            <span className={`font-bold ${theme.text} ${monoCls} text-sm`}>
              🔍 {lang === 'ko' ? '구조 검사' : 'Structure Inspection'}
            </span>
            <button onClick={onClose} className={`p-1 rounded ${theme.textMuted}`}><X size={16} /></button>
          </div>

          {/* Score bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <div className={`h-2 rounded-full ${theme.bgAlt} overflow-hidden`}>
                <div className={`h-full rounded-full ${scoreBar} transition-all`} style={{ width: `${localResult.score}%` }} />
              </div>
            </div>
            <span className={`text-lg font-bold ${scoreColor} ${monoCls}`}>{localResult.score}</span>
          </div>
          <div className={`text-[10px] ${theme.textMuted} ${monoCls} mt-1`}>
            {localResult.summary} · {localResult.nodeCount} {lang === 'ko' ? '건물' : 'buildings'} · {localResult.roadCount} {lang === 'ko' ? '도로' : 'roads'}
          </div>

          {/* View toggle */}
          <div className="mt-2 flex gap-1">
            <button onClick={() => setViewMode('city')}
              className={`flex-1 px-3 py-1.5 text-[11px] rounded-lg font-bold ${monoCls} ${
                viewMode === 'city' ? theme.buttonPrimary : `${theme.button} border`
              }`}>
              🏙️ {lang === 'ko' ? '도시 관점' : 'City View'}
            </button>
            <button onClick={() => setViewMode('dev')}
              className={`flex-1 px-3 py-1.5 text-[11px] rounded-lg font-bold ${monoCls} ${
                viewMode === 'dev' ? theme.buttonPrimary : `${theme.button} border`
              }`}>
              💻 {lang === 'ko' ? '개발 관점' : 'Dev View'}
            </button>
          </div>
        </div>

        {/* Check list */}
        <div className="flex-1 overflow-y-auto">
          {/* Counts */}
          <div className={`px-4 py-2 flex gap-3 border-b ${theme.border} ${theme.bgAlt}`}>
            {localResult.counts.errors > 0 && (
              <span className={`text-[10px] font-bold text-red-500 ${monoCls}`}>
                ⛔ {localResult.counts.errors} {lang === 'ko' ? '오류' : 'errors'}
              </span>
            )}
            {localResult.counts.warnings > 0 && (
              <span className={`text-[10px] font-bold text-amber-500 ${monoCls}`}>
                ⚠️ {localResult.counts.warnings} {lang === 'ko' ? '경고' : 'warnings'}
              </span>
            )}
            {localResult.counts.infos > 0 && (
              <span className={`text-[10px] font-bold text-blue-500 ${monoCls}`}>
                ℹ️ {localResult.counts.infos} {lang === 'ko' ? '참고' : 'info'}
              </span>
            )}
            {localResult.counts.total === 0 && (
              <span className={`text-[10px] font-bold text-emerald-500 ${monoCls}`}>
                ✅ {lang === 'ko' ? '문제 없음' : 'All clear'}
              </span>
            )}
          </div>

          {/* Individual checks */}
          <div className="px-3 py-2 space-y-1.5">
            {localResult.checks.map((check, idx) => {
              const cfg = LEVEL_CONFIG[check.level];
              const Icon = cfg.icon;
              const isExpanded = expandedChecks.has(idx);
              const mainText = viewMode === 'city'
                ? (lang === 'ko' ? check.city_ko : check.city_en)
                : (lang === 'ko' ? check.desc_ko : check.desc_en);
              const detailText = viewMode === 'city'
                ? (lang === 'ko' ? check.desc_ko : check.desc_en)
                : (lang === 'ko' ? check.city_ko : check.city_en);

              return (
                <div key={idx}
                  className={`${cfg.bg} border ${cfg.border} rounded-lg overflow-hidden`}>
                  <button onClick={() => toggleCheck(idx)}
                    className="w-full px-3 py-2 flex items-start gap-2 text-left">
                    <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className={`text-[11px] ${theme.text} ${monoCls} leading-relaxed`}>{mainText}</div>
                    </div>
                    {isExpanded ? <ChevronUp size={12} className={theme.textMuted} /> : <ChevronDown size={12} className={theme.textMuted} />}
                  </button>
                  {isExpanded && (
                    <div className={`px-3 pb-2 ml-6 text-[10px] ${theme.textMuted} ${monoCls} border-t ${cfg.border} pt-1.5`}>
                      <div className="font-bold mb-0.5">
                        {viewMode === 'city'
                          ? (lang === 'ko' ? '💻 개발 관점:' : '💻 Dev perspective:')
                          : (lang === 'ko' ? '🏙️ 도시 관점:' : '🏙️ City perspective:')}
                      </div>
                      {detailText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Architecture Analysis */}
          <div className={`px-3 py-3 border-t ${theme.border}`}>
            <div className={`font-bold text-[11px] ${theme.text} ${monoCls} mb-2`}>
              🏗️ {lang === 'ko' ? '아키텍처 패턴 분석' : 'Architecture Pattern Analysis'}
            </div>

            {!aiResult && !aiLoading && (
              <button onClick={handleAIInspect}
                className={`w-full px-4 py-2.5 rounded-lg font-bold text-xs ${monoCls} ${theme.buttonPrimary} flex items-center justify-center gap-2`}>
                <Zap size={14} />
                {lang === 'ko' ? 'AI 아키텍처 분석 실행' : 'Run AI Architecture Analysis'}
              </button>
            )}

            {aiLoading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader size={16} className={`${theme.textMuted} animate-spin`} />
                <span className={`text-[11px] ${theme.textMuted} ${monoCls}`}>
                  {lang === 'ko' ? '구조를 분석하고 있습니다...' : 'Analyzing structure...'}
                </span>
              </div>
            )}

            {aiError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">
                {aiError}
              </div>
            )}

            {aiResult && (
              <div className="space-y-3">
                {/* Suggested patterns */}
                {aiResult.patterns && aiResult.patterns.map((pattern, idx) => (
                  <div key={idx} className={`${theme.bgAlt} border ${theme.border} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold ${theme.text}`}>🏗️ {pattern.name}</span>
                      {pattern.confidence && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          pattern.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                          pattern.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {pattern.confidence === 'high' ? (lang === 'ko' ? '높음' : 'High') :
                           pattern.confidence === 'medium' ? (lang === 'ko' ? '보통' : 'Medium') :
                           (lang === 'ko' ? '낮음' : 'Low')}
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] ${theme.text} ${monoCls} leading-relaxed`}>
                      {pattern.reason}
                    </div>
                    {pattern.changes && pattern.changes.length > 0 && (
                      <div className={`mt-2 pt-2 border-t ${theme.border}`}>
                        <div className={`text-[9px] font-bold ${theme.textMuted} mb-1`}>
                          {lang === 'ko' ? '권장 변경사항:' : 'Recommended changes:'}
                        </div>
                        {pattern.changes.map((change, ci) => (
                          <div key={ci} className={`text-[10px] ${theme.textMuted} ${monoCls} ml-2`}>
                            • {change}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* General suggestions */}
                {aiResult.suggestions && (
                  <div className={`text-[10px] ${theme.text} ${monoCls} leading-relaxed whitespace-pre-wrap`}>
                    {typeof aiResult.suggestions === 'string' ? aiResult.suggestions : JSON.stringify(aiResult.suggestions, null, 2)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
