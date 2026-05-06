import React, { useState, useRef } from 'react';
import { Upload, Loader, ChevronRight, Check, X, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { extractZip, stepScan, stepAnalyze, stepCompare, stepNotes, applyComparisonResults, analysisToProjectData } from '../../utils/codeAnalyzer.js';

// Steps: upload → scan → analyze → compare → features → connections → notes → done
const STEPS = [
  { id: 'upload',   label_ko: '📦 파일 업로드',  label_en: '📦 Upload' },
  { id: 'scan',     label_ko: '🔍 파일 스캔',    label_en: '🔍 Scan' },
  { id: 'analyze',  label_ko: '🏗️ 구조 분석',   label_en: '🏗️ Analyze' },
  { id: 'compare',  label_ko: '⚖️ 기능 비교',   label_en: '⚖️ Compare' },
  { id: 'features', label_ko: '🏠 기능 질문',    label_en: '🏠 Features' },
  { id: 'roads',    label_ko: '🛤️ 연결 질문',    label_en: '🛤️ Connections' },
  { id: 'notes',    label_ko: '📝 메모',         label_en: '📝 Notes' },
  { id: 'done',     label_ko: '✅ 완료',         label_en: '✅ Done' },
];

export default function CodeAnalysisWizard({ project, onApplyResult, onClose }) {
  const { theme, themeId } = useTheme();
  const M = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';
  const L = (ko, en) => lang === 'ko' ? ko : en;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Accumulated data
  const [zipData, setZipData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);

  // User decisions
  const [confirmedMatches, setConfirmedMatches] = useState({});     // { idx: true/false }
  const [approvedNewItems, setApprovedNewItems] = useState({});     // { idx: 'add'|'land'|'skip' }
  const [approvedRenames, setApprovedRenames] = useState({});       // { idx: true/false }
  const [approvedRoads, setApprovedRoads] = useState({});           // { idx: true/false }
  const [rawNotes, setRawNotes] = useState('');
  const [devNotes, setDevNotes] = useState(null);

  const fileRef = useRef(null);
  const isExisting = project?.columns?.some(c => (project.structure?.[c.key] || []).length > 0);

  // === STEP 0: Upload ===
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    setLoading(true); setError(null);
    try { setZipData(await extractZip(file)); setStep(1); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // === STEP 1: Scan ===
  const handleScan = async () => {
    setLoading(true); setError(null);
    try { setScanResult(await stepScan(zipData.fileList, zipData.packageJson)); setStep(2); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // === STEP 2: Analyze ===
  const handleAnalyze = async () => {
    setLoading(true); setError(null);
    try {
      const result = await stepAnalyze(scanResult, zipData.files);
      setAnalysisResult(result);
      if (isExisting) {
        // Has existing project → compare
        setStep(3);
      } else {
        // Empty project → skip compare, go to notes
        setStep(6);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // === STEP 3: Compare ===
  const handleCompare = async () => {
    setLoading(true); setError(null);
    try {
      const result = await stepCompare(analysisResult, project, lang);
      setCompareResult(result);
      // Init user decisions
      (result.matched || []).forEach((_, i) => setConfirmedMatches(p => ({ ...p, [i]: true })));
      (result.newItems || []).forEach((_, i) => setApprovedNewItems(p => ({ ...p, [i]: 'add' })));
      (result.possibleRenames || []).forEach((_, i) => setApprovedRenames(p => ({ ...p, [i]: false })));
      (result.missingConnections || []).forEach((_, i) => setApprovedRoads(p => ({ ...p, [i]: true })));
      setStep(4);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // === STEP 4→5: Features confirmed → connections
  const handleFeaturesNext = () => setStep(5);

  // === STEP 5→6: Connections confirmed → notes
  const handleRoadsNext = () => setStep(6);

  // === STEP 6: Notes ===
  const handleNotes = async () => {
    if (!rawNotes.trim()) { setStep(7); return; }
    setLoading(true); setError(null);
    try {
      const summary = `${analysisResult?.items?.length || 0} items, ${analysisResult?.roads?.length || 0} roads`;
      setDevNotes(await stepNotes(summary, rawNotes));
      setStep(7);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // === STEP 7: Apply ===
  const handleApply = () => {
    let result;

    if (isExisting && compareResult) {
      // Build approved lists from user decisions
      const newItems = (compareResult.newItems || []).filter((_, i) => approvedNewItems[i] === 'add' || approvedNewItems[i] === 'land');
      // Mark unplaced items
      newItems.forEach((item, i) => {
        const origIdx = (compareResult.newItems || []).indexOf(item);
        if (approvedNewItems[origIdx] === 'land') item.placed = false;
      });

      const newRoads = (compareResult.missingConnections || []).filter((_, i) => approvedRoads[i]);
      const renames = (compareResult.possibleRenames || []).filter((_, i) => approvedRenames[i]);

      result = applyComparisonResults(project, newItems, newRoads, renames);
    } else {
      result = analysisToProjectData(analysisResult);
    }

    if (devNotes?.devNotes) result.devNotes = devNotes.devNotes;
    if (analysisResult?.detectedPattern) {
      result.codeAnalysis = { lastAnalyzedAt: Date.now(), framework: scanResult?.framework || '', detectedPattern: analysisResult.detectedPattern, summary: analysisResult.summary || '' };
    }

    onApplyResult(result);
    onClose();
  };

  // === RENDER ===
  const si = STEPS[step];
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className={`${theme.bgPanel} border ${theme.border} rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden`} onClick={e => e.stopPropagation()}>

        {/* Header + progress */}
        <div className={`px-4 py-3 border-b ${theme.border}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-bold ${theme.text} ${M} text-sm`}>{L('코드 분석 위저드', 'Code Analysis Wizard')}</span>
            <button onClick={onClose} className={`p-1 rounded ${theme.textMuted}`}><X size={16} /></button>
          </div>
          <div className="flex gap-0.5">{STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-emerald-500' : i === step ? 'bg-amber-500' : theme.bgAlt}`} />
          ))}</div>
          <div className={`text-[10px] ${theme.textMuted} ${M} mt-1`}>{L(si.label_ko, si.label_en)} ({step + 1}/{STEPS.length})</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700"><AlertTriangle size={14} /> {error}</div>}

          {/* UPLOAD */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">📦</div>
              <div className={`${theme.text} ${M} text-sm font-bold`}>{L('코드 압축 파일을 업로드하세요', 'Upload your code ZIP')}</div>
              <div className={`text-[11px] ${theme.textMuted} ${M}`}>{L('.zip 파일 · node_modules 자동 제외', '.zip · node_modules auto-excluded')}</div>
              {isExisting && <div className={`text-[10px] px-3 py-1.5 rounded-lg ${theme.bgAlt} ${theme.textMuted} ${M}`}>⚠️ {L('기존 프로젝트와 비교 후 병합됩니다', 'Will compare & merge with existing project')}</div>}
              <button onClick={() => fileRef.current?.click()} disabled={loading} className={`px-6 py-3 rounded-lg font-bold text-sm ${M} ${theme.buttonPrimary}`}>
                {loading ? <Loader size={16} className="animate-spin mx-auto" /> : <><Upload size={16} /> {L('ZIP 선택', 'Choose ZIP')}</>}
              </button>
              <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleUpload} />
            </div>
          )}

          {/* SCAN */}
          {step === 1 && zipData && (
            <div className="space-y-3">
              <div className={`font-bold ${theme.text} ${M}`}>{L(`${zipData.fileList.length}개 파일 발견`, `${zipData.fileList.length} files found`)}</div>
              <div className={`${theme.bgAlt} rounded-lg p-3 max-h-[180px] overflow-y-auto text-[10px] ${M} ${theme.textMuted}`}>
                {zipData.fileList.filter(f => f.isCode).slice(0, 40).map((f, i) => <div key={i}>📄 {f.path}</div>)}
                {zipData.fileList.filter(f => f.isCode).length > 40 && <div className="mt-1 font-bold">...{L('외', 'and')} {zipData.fileList.filter(f => f.isCode).length - 40}{L('개', ' more')}</div>}
              </div>
              <Btn loading={loading} onClick={handleScan}>{L('자동 선별 분석', 'Auto-select & analyze')}</Btn>
            </div>
          )}

          {/* ANALYZE */}
          {step === 2 && scanResult && (
            <div className="space-y-3">
              <div className={`font-bold ${theme.text} ${M}`}>🔍 {L('스캔 결과', 'Scan Result')}</div>
              <InfoBox theme={theme} M={M}>
                <div><b>{L('프레임워크', 'Framework')}:</b> {scanResult.framework || '?'}</div>
                <div><b>{L('패턴', 'Pattern')}:</b> {scanResult.detectedPattern || '?'}</div>
                <div><b>{L('핵심 파일', 'Key files')}:</b> {scanResult.keyFiles?.length || 0}{L('개', '')}</div>
              </InfoBox>
              <Btn loading={loading} onClick={handleAnalyze}>{L('구조 분석 시작', 'Start analysis')}</Btn>
            </div>
          )}

          {/* COMPARE (loading) */}
          {step === 3 && !compareResult && (
            <div className="space-y-3">
              <div className={`font-bold ${theme.text} ${M}`}>⚖️ {L('기존 프로젝트와 비교 중', 'Comparing with existing project')}</div>
              <InfoBox theme={theme} M={M}>
                <div>📦 {L('코드에서 발견', 'From code')}: {analysisResult?.items?.length || 0}{L('개 항목', ' items')}, {analysisResult?.roads?.length || 0}{L('개 연결', ' roads')}</div>
                <div>🏙️ {L('현재 샌드로드', 'Current sandroad')}: {countItems(project)}{L('개 항목', ' items')}, {(project.roads || []).length}{L('개 연결', ' roads')}</div>
              </InfoBox>
              <Btn loading={loading} onClick={handleCompare}>{L('비교 분석 실행', 'Run comparison')}</Btn>
            </div>
          )}

          {/* FEATURES QUESTION (step 4) */}
          {step === 4 && compareResult && (
            <div className="space-y-4">
              <div className={`font-bold ${theme.text} ${M}`}>🏠 {L('기능 비교 결과', 'Feature Comparison')}</div>
              {compareResult.summary && <div className={`text-[10px] ${theme.textMuted} ${M} ${theme.bgAlt} rounded-lg p-2`}>{compareResult.summary}</div>}

              {/* Matched features */}
              {(compareResult.matched || []).length > 0 && (
                <Section title={L('✅ 동일 기능 확인', '✅ Matched Features')} theme={theme} M={M}>
                  <div className={`text-[10px] ${theme.textMuted} ${M} mb-2`}>{L('아래 기능들이 이미 작성된 것과 같은 기능으로 보입니다. 맞나요?', 'These features seem to match existing ones. Correct?')}</div>
                  {(compareResult.matched || []).map((m, i) => (
                    <ToggleRow key={i} active={confirmedMatches[i]} onToggle={() => setConfirmedMatches(p => ({ ...p, [i]: !p[i] }))} theme={theme} M={M}>
                      <span className="font-bold">{m.codeName}</span> = <span>{m.sandName}</span>
                      {m.note && <div className={`text-[9px] ${theme.textDim}`}>{m.note}</div>}
                    </ToggleRow>
                  ))}
                </Section>
              )}

              {/* New items */}
              {(compareResult.newItems || []).length > 0 && (
                <Section title={L('🆕 신규 기능 발견', '🆕 New Features Found')} theme={theme} M={M}>
                  <div className={`text-[10px] ${theme.textMuted} ${M} mb-2`}>{L('압축파일에서 아래 기능들이 새로 발견되었습니다.', 'These new features were found in the code.')}</div>
                  {(compareResult.newItems || []).map((item, i) => (
                    <div key={i} className={`border ${theme.border} rounded-lg p-2 mb-1.5`}>
                      <div className={`text-[11px] ${theme.text} ${M} font-bold`}>{item.name} <span className={`text-[9px] ${theme.textDim}`}>[{item.buildingType}]</span></div>
                      {item.description && <div className={`text-[9px] ${theme.textMuted}`}>{item.description}</div>}
                      <div className="flex gap-1 mt-1.5">
                        <MiniBtn active={approvedNewItems[i] === 'add'} onClick={() => setApprovedNewItems(p => ({ ...p, [i]: 'add' }))} theme={theme} M={M}>
                          {L('추가', 'Add')}
                        </MiniBtn>
                        <MiniBtn active={approvedNewItems[i] === 'land'} onClick={() => setApprovedNewItems(p => ({ ...p, [i]: 'land' }))} theme={theme} M={M}>
                          {L('대지에', 'Unplaced')}
                        </MiniBtn>
                        <MiniBtn active={approvedNewItems[i] === 'skip'} onClick={() => setApprovedNewItems(p => ({ ...p, [i]: 'skip' }))} theme={theme} M={M}>
                          {L('건너뛰기', 'Skip')}
                        </MiniBtn>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Possible renames */}
              {(compareResult.possibleRenames || []).length > 0 && (
                <Section title={L('🔄 이름 변경 의심', '🔄 Possible Renames')} theme={theme} M={M}>
                  <div className={`text-[10px] ${theme.textMuted} ${M} mb-2`}>{L('혹시 이름이 달라진 기능들이 있나요?', 'Any features that were renamed?')}</div>
                  {(compareResult.possibleRenames || []).map((r, i) => (
                    <ToggleRow key={i} active={approvedRenames[i]} onToggle={() => setApprovedRenames(p => ({ ...p, [i]: !p[i] }))} theme={theme} M={M}>
                      <span>{r.sandName}</span> → <span className="font-bold">{r.codeName}</span>
                      {r.reason && <div className={`text-[9px] ${theme.textDim}`}>{r.reason}</div>}
                    </ToggleRow>
                  ))}
                </Section>
              )}

              <Btn onClick={handleFeaturesNext}>{L('다음: 연결 확인', 'Next: Check connections')}</Btn>
            </div>
          )}

          {/* CONNECTIONS QUESTION (step 5) */}
          {step === 5 && compareResult && (
            <div className="space-y-4">
              <div className={`font-bold ${theme.text} ${M}`}>🛤️ {L('연결 관계 확인', 'Connection Check')}</div>

              {/* Missing connections */}
              {(compareResult.missingConnections || []).length > 0 && (
                <Section title={L('🔗 누락된 연결', '🔗 Missing Connections')} theme={theme} M={M}>
                  <div className={`text-[10px] ${theme.textMuted} ${M} mb-2`}>
                    {L('압축파일에서는 아래 기능들이 연결되어 있었는데, 시티뷰에는 연결이 없습니다. 연결할까요?',
                       'These were connected in the code but not in city view. Connect them?')}
                  </div>
                  {(compareResult.missingConnections || []).map((conn, i) => (
                    <ToggleRow key={i} active={approvedRoads[i]} onToggle={() => setApprovedRoads(p => ({ ...p, [i]: !p[i] }))} theme={theme} M={M}>
                      <span className="font-bold">{conn.from}</span> → <span className="font-bold">{conn.to}</span>
                      <span className={`text-[9px] ${theme.textDim} ml-1`}>[{conn.vehicle || 'car'}, {conn.dataType || 'content'}]</span>
                      {conn.reason && <div className={`text-[9px] ${theme.textDim}`}>{conn.reason}</div>}
                    </ToggleRow>
                  ))}
                  {/* Batch buttons */}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { const all = {}; (compareResult.missingConnections || []).forEach((_, i) => all[i] = true); setApprovedRoads(all); }}
                      className={`text-[10px] px-2 py-1 rounded ${theme.button} border ${M}`}>
                      {L('전체 연결', 'Connect all')}
                    </button>
                    <button onClick={() => { const all = {}; (compareResult.missingConnections || []).forEach((_, i) => all[i] = false); setApprovedRoads(all); }}
                      className={`text-[10px] px-2 py-1 rounded ${theme.button} border ${M}`}>
                      {L('전체 해제', 'Deselect all')}
                    </button>
                  </div>
                </Section>
              )}

              {/* Already existing connections */}
              {(compareResult.existingConnections || []).length > 0 && (
                <Section title={L('✅ 이미 연결됨', '✅ Already Connected')} theme={theme} M={M}>
                  {(compareResult.existingConnections || []).map((c, i) => (
                    <div key={i} className={`text-[10px] ${theme.textMuted} ${M}`}>✅ {c.from} → {c.to}</div>
                  ))}
                </Section>
              )}

              {(compareResult.missingConnections || []).length === 0 && (compareResult.existingConnections || []).length === 0 && (
                <div className={`text-center py-6 ${theme.textMuted} ${M} text-xs`}>{L('연결 관련 변경사항이 없습니다', 'No connection changes needed')}</div>
              )}

              <Btn onClick={handleRoadsNext}>{L('다음: 메모 작성', 'Next: Add notes')}</Btn>
            </div>
          )}

          {/* NOTES (step 6) */}
          {step === 6 && (
            <div className="space-y-3">
              <div className={`font-bold ${theme.text} ${M}`}>📝 {L('개발 메모', 'Dev Notes')}</div>
              <div className={`text-[11px] ${theme.textMuted} ${M}`}>{L('강조사항이나 요청을 적으면 명세서에 반영됩니다', 'Notes will be included in the architecture spec')}</div>
              <textarea value={rawNotes} onChange={e => setRawNotes(e.target.value)}
                placeholder={L('예: Stripe 결제 연동, FCM 푸시, 다크모드, 로드 3초 이내', 'e.g. Stripe payments, FCM push, dark mode, load < 3s')}
                className={`w-full h-28 px-3 py-2 text-xs border rounded-lg resize-none focus:outline-none ${M} ${theme.input}`} />
              <Btn loading={loading} onClick={handleNotes}>{rawNotes.trim() ? L('정리 후 완료', 'Organize & finish') : L('건너뛰기', 'Skip')}</Btn>
            </div>
          )}

          {/* DONE (step 7) */}
          {step === 7 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <div className={`${theme.text} ${M} font-bold`}>{L('분석 완료!', 'Analysis Complete!')}</div>
              <InfoBox theme={theme} M={M}>
                {compareResult && <>
                  <div>✅ {L('동일 기능', 'Matched')}: {Object.values(confirmedMatches).filter(Boolean).length}</div>
                  <div>🆕 {L('추가 기능', 'New items')}: {Object.values(approvedNewItems).filter(v => v === 'add' || v === 'land').length}</div>
                  <div>🔄 {L('이름 변경', 'Renames')}: {Object.values(approvedRenames).filter(Boolean).length}</div>
                  <div>🛤️ {L('연결 추가', 'New roads')}: {Object.values(approvedRoads).filter(Boolean).length}</div>
                </>}
                {!compareResult && <>
                  <div>📊 {L('구역', 'Districts')}: {analysisResult?.columns?.length || 0}</div>
                  <div>🏢 {L('항목', 'Items')}: {analysisResult?.items?.length || 0}</div>
                  <div>🛤️ {L('연결', 'Roads')}: {analysisResult?.roads?.length || 0}</div>
                </>}
                {devNotes?.devNotes && <div>📝 {L('메모', 'Notes')}: {devNotes.devNotes.length}{L('건', '')}</div>}
              </InfoBox>
              <button onClick={handleApply} className={`px-6 py-3 rounded-lg font-bold text-sm ${M} ${theme.buttonPrimary} flex items-center justify-center gap-2 mx-auto`}>
                <Check size={16} /> {L('프로젝트에 적용', 'Apply to project')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step > 0 && step < 7 && (
          <div className={`px-4 py-2 border-t ${theme.border}`}>
            <button onClick={() => setStep(s => s - 1)} className={`text-[11px] ${theme.textMuted} ${M}`}>← {L('이전', 'Back')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// === Sub-components ===
function Btn({ loading, onClick, children }) {
  const { theme } = useTheme();
  const M = theme.fontMono ? 'font-mono-ui' : '';
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full px-4 py-2.5 rounded-lg font-bold text-xs ${M} ${theme.buttonPrimary} disabled:opacity-50 flex items-center justify-center gap-1`}>
      {loading ? <Loader size={14} className="animate-spin" /> : <><ChevronRight size={14} /> {children}</>}
    </button>
  );
}

function InfoBox({ theme, M, children }) {
  return <div className={`${theme.bgAlt} rounded-lg p-3 text-[11px] ${M} ${theme.text} space-y-1`}>{children}</div>;
}

function Section({ title, theme, M, children }) {
  return (
    <div className={`border ${theme.border} rounded-lg overflow-hidden`}>
      <div className={`px-3 py-2 ${theme.bgAlt} font-bold text-[11px] ${theme.text} ${M}`}>{title}</div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function ToggleRow({ active, onToggle, theme, M, children }) {
  return (
    <div className={`flex items-start gap-2 py-1.5 border-b ${theme.border} last:border-0`}>
      <button onClick={onToggle} className="flex-shrink-0 mt-0.5">
        {active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className={theme.textDim} />}
      </button>
      <div className={`flex-1 text-[10px] ${theme.text} ${M}`}>{children}</div>
    </div>
  );
}

function MiniBtn({ active, onClick, theme, M, children }) {
  return (
    <button onClick={onClick}
      className={`px-2 py-0.5 text-[9px] rounded border ${M} ${active ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold' : `${theme.button}`}`}>
      {children}
    </button>
  );
}

function countItems(project) {
  let c = 0;
  for (const col of project?.columns || []) walkTree(project.structure?.[col.key] || [], () => c++);
  return c;
}
function walkTree(nodes, cb) { for (const n of nodes) { cb(n); if (n.children?.length) walkTree(n.children, cb); } }
