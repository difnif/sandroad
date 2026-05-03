import React, { useRef, useState } from 'react';
import { Upload, Download, HelpCircle, X, FileText, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import {
  exportAsMarkdown, exportAsText, exportAsXlsxData,
  importFromText, importFromXlsxData,
  downloadAsFile, readFileAsText, readFileAsArrayBuffer
} from '../../utils/treeIO.js';

export default function FileToolbar({ project, onImport }) {
  const { theme, themeId } = useTheme();
  const [showGuide, setShowGuide] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success'|'error', msg }
  const fileInputRef = useRef(null);
  const monoCls = theme.fontMono ? 'font-mono-ui' : '';
  const lang = themeId === 'sand' ? 'ko' : 'en';

  // --- Export ---
  const handleExportMd = () => {
    const content = exportAsMarkdown(project);
    downloadAsFile(content, `${project?.name || 'sandroad'}.md`);
    setShowExportMenu(false);
  };

  const handleExportTxt = () => {
    const content = exportAsText(project);
    downloadAsFile(content, `${project?.name || 'sandroad'}.txt`);
    setShowExportMenu(false);
  };

  const handleExportXlsx = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = exportAsXlsxData(project, lang);
      const ws = XLSX.utils.aoa_to_sheet(data);
      // Column widths
      ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Structure');
      XLSX.writeFile(wb, `${project?.name || 'sandroad'}.xlsx`);
    } catch (err) {
      console.error('XLSX export error:', err);
      setImportStatus({ type: 'error', msg: lang === 'ko' ? 'xlsx 패키지 필요: npm install xlsx' : 'Need xlsx package: npm install xlsx' });
      setTimeout(() => setImportStatus(null), 4000);
    }
    setShowExportMenu(false);
  };

  // --- Import ---
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset for re-upload

    const ext = file.name.split('.').pop().toLowerCase();

    try {
      let result;

      if (ext === 'md' || ext === 'txt') {
        const text = await readFileAsText(file);
        result = importFromText(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx');
        const buffer = await readFileAsArrayBuffer(file);
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        result = importFromXlsxData(rows);
      } else if (ext === 'csv') {
        const text = await readFileAsText(file);
        const rows = text.split('\n').map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        result = importFromXlsxData(rows);
      } else {
        setImportStatus({ type: 'error', msg: lang === 'ko' ? '지원하지 않는 형식입니다 (.md, .txt, .xlsx)' : 'Unsupported format (.md, .txt, .xlsx)' });
        setTimeout(() => setImportStatus(null), 3000);
        return;
      }

      if (result.columns.length === 0) {
        setImportStatus({ type: 'error', msg: lang === 'ko' ? '구조를 인식할 수 없습니다. 가이드를 확인해주세요.' : 'Could not parse structure. Check the guide.' });
        setTimeout(() => setImportStatus(null), 3000);
        return;
      }

      // Count items
      let itemCount = 0;
      for (const items of Object.values(result.structure)) {
        itemCount += countNodes(items);
      }

      onImport?.(result);
      setImportStatus({ type: 'success', msg: lang === 'ko' ? `${result.columns.length}개 구역, ${itemCount}개 항목 가져옴` : `Imported ${result.columns.length} districts, ${itemCount} items` });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus({ type: 'error', msg: `${lang === 'ko' ? '오류' : 'Error'}: ${err.message}` });
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Import */}
        <button
          onClick={handleFileSelect}
          className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded ${monoCls} ${theme.button}`}
          title={lang === 'ko' ? '파일에서 가져오기' : 'Import from file'}
        >
          <Upload size={12} />
          <span className="hidden sm:inline">{lang === 'ko' ? '가져오기' : 'Import'}</span>
        </button>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded ${monoCls} ${theme.button}`}
            title={lang === 'ko' ? '파일로 내보내기' : 'Export to file'}
          >
            <Download size={12} />
            <span className="hidden sm:inline">{lang === 'ko' ? '내보내기' : 'Export'}</span>
          </button>

          {showExportMenu && (
            <div className={`absolute right-0 top-full mt-1 ${theme.bgPanel} border ${theme.border} rounded-lg shadow-xl py-1 z-30 min-w-[140px]`}>
              <button onClick={handleExportMd} className={`w-full px-3 py-1.5 text-left text-[11px] ${theme.text} hover:${theme.bgHover} flex items-center gap-2 ${monoCls}`}>
                <FileText size={12} /> Markdown (.md)
              </button>
              <button onClick={handleExportTxt} className={`w-full px-3 py-1.5 text-left text-[11px] ${theme.text} hover:${theme.bgHover} flex items-center gap-2 ${monoCls}`}>
                <FileText size={12} /> Text (.txt)
              </button>
              <button onClick={handleExportXlsx} className={`w-full px-3 py-1.5 text-left text-[11px] ${theme.text} hover:${theme.bgHover} flex items-center gap-2 ${monoCls}`}>
                <FileSpreadsheet size={12} /> Excel (.xlsx)
              </button>
            </div>
          )}
        </div>

        {/* Guide */}
        <button
          onClick={() => setShowGuide(true)}
          className={`p-1 rounded ${theme.textMuted} hover:${theme.text}`}
          title={lang === 'ko' ? '파일 형식 가이드' : 'Format guide'}
        >
          <HelpCircle size={14} />
        </button>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept=".md,.txt,.xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Status toast */}
      {importStatus && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-xs font-bold ${monoCls} ${
          importStatus.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {importStatus.msg}
        </div>
      )}

      {/* Close export menu on outside click */}
      {showExportMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
      )}

      {/* Format guide modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-4" onClick={() => setShowGuide(false)}>
          <div className={`${theme.bgPanel} border ${theme.border} rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className={`px-4 py-3 border-b ${theme.border} flex items-center`}>
              <span className={`font-bold ${theme.text} ${monoCls} flex-1`}>
                {lang === 'ko' ? '📄 파일 형식 가이드' : '📄 File Format Guide'}
              </span>
              <button onClick={() => setShowGuide(false)} className={`p-1 rounded ${theme.textMuted}`}>
                <X size={16} />
              </button>
            </div>

            <div className={`p-4 text-xs ${theme.text} ${monoCls} space-y-4`}>
              {/* MD format */}
              <div>
                <div className={`font-bold text-sm mb-1`}>Markdown (.md)</div>
                <pre className={`${theme.bgAlt} rounded p-3 text-[10px] overflow-x-auto whitespace-pre`}>
{`# 프로젝트 이름

## 관리자앱
- 대시보드
  - 통계 위젯
  - 알림 목록
- 사용자 관리
  - 회원 목록
  - 권한 설정

## 학생앱
- 홈
  - 추천 강의
- 마이페이지
  - 프로필 수정`}
                </pre>
                <div className={`mt-1 ${theme.textMuted}`}>
                  {lang === 'ko'
                    ? '## = 구역, - = 항목, 들여쓰기(2칸) = 하위 항목'
                    : '## = district, - = item, indent(2sp) = child'}
                </div>
              </div>

              {/* TXT format */}
              <div>
                <div className={`font-bold text-sm mb-1`}>Text (.txt)</div>
                <pre className={`${theme.bgAlt} rounded p-3 text-[10px] overflow-x-auto whitespace-pre`}>
{`=== 프로젝트 이름 ===

[관리자앱]
- 대시보드
  - 통계 위젯
  - 알림 목록
- 사용자 관리

[학생앱]
- 홈
  - 추천 강의`}
                </pre>
                <div className={`mt-1 ${theme.textMuted}`}>
                  {lang === 'ko'
                    ? '[이름] = 구역, - = 항목, 들여쓰기(2칸) = 하위 항목'
                    : '[name] = district, - = item, indent(2sp) = child'}
                </div>
              </div>

              {/* XLSX format */}
              <div>
                <div className={`font-bold text-sm mb-1`}>Excel (.xlsx)</div>
                <div className={`${theme.bgAlt} rounded p-3 overflow-x-auto`}>
                  <table className="text-[10px] border-collapse w-full">
                    <thead>
                      <tr className={`border-b ${theme.border}`}>
                        <th className="px-2 py-1 text-left">{lang === 'ko' ? '구역' : 'District'}</th>
                        <th className="px-2 py-1 text-left">1{lang === 'ko' ? '차' : 'L'}</th>
                        <th className="px-2 py-1 text-left">2{lang === 'ko' ? '차' : 'L'}</th>
                        <th className="px-2 py-1 text-left">3{lang === 'ko' ? '차' : 'L'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="px-2 py-0.5">{lang === 'ko' ? '관리자앱' : 'Admin'}</td><td className="px-2 py-0.5">{lang === 'ko' ? '대시보드' : 'Dashboard'}</td><td></td><td></td></tr>
                      <tr><td></td><td></td><td className="px-2 py-0.5">{lang === 'ko' ? '통계 위젯' : 'Stats'}</td><td></td></tr>
                      <tr><td></td><td></td><td className="px-2 py-0.5">{lang === 'ko' ? '알림 목록' : 'Alerts'}</td><td></td></tr>
                      <tr><td></td><td className="px-2 py-0.5">{lang === 'ko' ? '사용자 관리' : 'Users'}</td><td></td><td></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className={`mt-1 ${theme.textMuted}`}>
                  {lang === 'ko'
                    ? '1열 = 구역, 2~6열 = 1차~5차 항목. 가장 깊은 열에만 이름 입력.'
                    : 'Col1 = district, Col2-6 = L1-L5. Name in deepest column only.'}
                </div>
              </div>

              {/* Tips */}
              <div className={`pt-2 border-t ${theme.border}`}>
                <div className={`font-bold text-sm mb-1`}>{lang === 'ko' ? '💡 팁' : '💡 Tips'}</div>
                <div className={`${theme.textMuted} space-y-1`}>
                  <div>{lang === 'ko' ? '• 내보내기한 파일을 수정해서 다시 가져오기 가능' : '• Export, edit, and re-import works seamlessly'}</div>
                  <div>{lang === 'ko' ? '• 기존 구조에 병합이 아닌, 새 프로젝트로 생성됨' : '• Creates a new project (not merged)'}</div>
                  <div>{lang === 'ko' ? '• CSV 파일도 xlsx와 같은 형식으로 지원' : '• CSV files also supported in xlsx format'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function countNodes(nodes) {
  let c = 0;
  for (const n of nodes) { c++; if (n.children) c += countNodes(n.children); }
  return c;
}
