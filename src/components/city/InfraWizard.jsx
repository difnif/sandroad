import React, { useState } from 'react';
import { X, Zap, Settings, Loader, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { generateBasicInfra, buildInfraAnalysisPrompt, parseAIInfraResult } from '../../utils/projectOps.js';

export default function InfraWizard({ project, onApply, onClose }) {
  const { theme, themeId } = useTheme();
  const M = theme.fontMono ? 'font-mono-ui' : '';
  const L = (ko, en) => themeId === 'sand' ? ko : en;

  const [mode, setMode] = useState(null); // null | 'basic' | 'ai'
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleBasic = () => {
    const result = generateBasicInfra();
    setPreview({
      districts: [{ column: result.column, structure: result.structure }],
      memo: result.memo,
    });
    setMode('basic');
  };

  const handleAI = async () => {
    setMode('ai');
    setLoading(true);
    setError(null);
    try {
      const structureSummary = buildInfraAnalysisPrompt(project, themeId === 'sand' ? 'ko' : 'en');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'infra',
          data: { structureSummary, lang: themeId === 'sand' ? 'ko' : 'en' }
        })
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const result = await response.json();
      const parsed = parseAIInfraResult(result);
      setPreview(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className={`${theme.bgPanel} border ${theme.border} rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`px-4 py-3 border-b ${theme.border} flex items-center gap-2`}>
          <Settings size={16} className={theme.text} />
          <span className={`font-bold ${theme.text} ${M} text-sm flex-1`}>
            {L('인프라 구역 만들기', 'Create Infra District')}
          </span>
          <button onClick={onClose} className={`p-1 rounded ${theme.textMuted}`}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Mode selection */}
          {!mode && (
            <div className="space-y-3">
              <div className={`text-[11px] ${theme.textMuted} ${M}`}>
                {L('환경설정 관련 기능들을 자동으로 구역에 생성합니다.', 'Auto-generate infrastructure settings district.')}
              </div>

              <button onClick={handleBasic}
                className={`w-full p-4 rounded-xl border-2 ${theme.border} text-left hover:border-amber-400 transition-colors`}>
                <div className="flex items-center gap-2 mb-1">
                  <Settings size={18} className="text-amber-500" />
                  <span className={`font-bold ${theme.text} ${M}`}>{L('베이직 셋팅', 'Basic Settings')}</span>
                </div>
                <div className={`text-[10px] ${theme.textMuted} ${M}`}>
                  {L('알림, 소리, 테마, 언어, 계정 관리 등 기초 설정', 'Notifications, sound, theme, language, account — essentials only')}
                </div>
              </button>

              <button onClick={handleAI}
                className={`w-full p-4 rounded-xl border-2 ${theme.border} text-left hover:border-purple-400 transition-colors`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-purple-500" />
                  <span className={`font-bold ${theme.text} ${M}`}>{L('AI 셋팅 (120% 과하게)', 'AI Settings (120% generous)')}</span>
                </div>
                <div className={`text-[10px] ${theme.textMuted} ${M}`}>
                  {L('현재 구역들을 분석해서 필요한 인프라를 넉넉하게 생성. 과한 건 나중에 지우면 됩니다!',
                     'Analyzes your districts and generates generous infrastructure. Delete what you don\'t need!')}
                </div>
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader size={24} className="text-purple-500 animate-spin" />
              <span className={`text-[11px] ${theme.textMuted} ${M}`}>
                {L('구조를 분석하고 인프라를 설계하고 있습니다...', 'Analyzing structure and designing infrastructure...')}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
              <button onClick={() => { setError(null); setMode(null); }} className="block mt-2 text-red-500 underline">
                {L('다시 시도', 'Try again')}
              </button>
            </div>
          )}

          {/* Preview */}
          {preview && !loading && (
            <div className="space-y-3">
              <div className={`font-bold ${theme.text} ${M} text-sm flex items-center gap-2`}>
                {mode === 'basic' ? <Settings size={14} className="text-amber-500" /> : <Sparkles size={14} className="text-purple-500" />}
                {L('생성 미리보기', 'Preview')}
              </div>

              {preview.districts.map((dist, di) => (
                <div key={di} className={`border ${theme.border} rounded-lg overflow-hidden`}>
                  <div className={`px-3 py-2 ${theme.bgAlt} font-bold text-[11px] ${theme.text} ${M} flex items-center gap-2`}>
                    <span>{dist.column.isSubDistrict ? '  └ ' : ''}{dist.column.label}</span>
                    {dist.column.isSubDistrict && (
                      <span className={`text-[8px] px-1 py-0.5 rounded bg-gray-200 text-gray-600`}>
                        {L('하위', 'sub')}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    {renderTree(dist.structure, theme, M, 0)}
                  </div>
                </div>
              ))}

              {/* Memo */}
              {preview.memo && (
                <div className={`border ${theme.border} rounded-lg p-3 ${theme.bgAlt}`}>
                  <div className={`font-bold text-[11px] ${theme.text} ${M} mb-1`}>📋 {preview.memo.name}</div>
                  <div className={`text-[10px] ${theme.textMuted} ${M} whitespace-pre-wrap`}>
                    {preview.memo.description}
                  </div>
                </div>
              )}

              <div className={`text-[9px] ${theme.textDim} ${M} text-center`}>
                {L('불필요한 항목은 생성 후 에디터에서 삭제할 수 있습니다', 'You can delete unnecessary items in the editor after creation')}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${theme.border} flex gap-2`}>
          {mode && (
            <button onClick={() => { setMode(null); setPreview(null); setError(null); }}
              className={`px-3 py-2 text-xs font-bold rounded-lg border ${M} ${theme.button}`}>
              {L('← 돌아가기', '← Back')}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className={`px-3 py-2 text-xs font-bold rounded-lg border ${M} ${theme.button}`}>
            {L('취소', 'Cancel')}
          </button>
          {preview && !loading && (
            <button onClick={handleApply}
              className={`px-4 py-2 text-xs font-bold rounded-lg ${M} ${theme.buttonPrimary}`}>
              <Zap size={12} className="inline mr-1" />
              {L('생성하기', 'Create')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function renderTree(nodes, theme, M, depth) {
  return nodes.map((node, i) => (
    <div key={i}>
      <div className={`flex items-center gap-1.5 py-0.5`} style={{ paddingLeft: depth * 16 }}>
        <span className="text-xs">{getBuildingEmoji(node.buildingType)}</span>
        <span className={`text-[10px] ${theme.text} ${M}`}>{node.name}</span>
      </div>
      {node.children?.length > 0 && renderTree(node.children, theme, M, depth + 1)}
    </div>
  ));
}

const EMOJI_MAP = { page: '🏢', component: '🏠', api: '📡', db: '🏦', auth: '🏛️', storage: '🏭', noti: '🗼', payment: '🏪', analytics: '🔭', cache: '⛽', queue: '🚉', external: '🌉', config: '⚙️', custom: '🏷️' };
function getBuildingEmoji(type) { return EMOJI_MAP[type] || '🏷️'; }
