import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, Star, Trash2, Package, ChevronDown, ChevronRight, Image } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import {
  getAllAssetSlots, processAssetZip, getAssetStats,
  addAssetToSlot, setActiveAsset, removeAssetFromSlot
} from '../../utils/assetRegistry.js';

const CATEGORY_INFO = {
  building:  { emoji: '🏢', label_ko: '건물',     label_en: 'Buildings' },
  vehicle:   { emoji: '🚗', label_ko: '탈것',     label_en: 'Vehicles' },
  character: { emoji: '👨‍💼', label_ko: '캐릭터',   label_en: 'Characters' },
  road:      { emoji: '🛤️', label_ko: '도로',     label_en: 'Roads' },
  fence:     { emoji: '🏗️', label_ko: '울타리',   label_en: 'Fences' },
};

export default function AssetManager({ project, onUpdateAssets, onClose }) {
  const { theme, themeId } = useTheme();
  const M = theme.fontMono ? 'font-mono-ui' : '';
  const L = (ko, en) => themeId === 'sand' ? ko : en;

  const [expandedCat, setExpandedCat] = useState('building');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const zipRef = useRef(null);
  const imgRef = useRef(null);

  const allSlots = useMemo(() => getAllAssetSlots(), []);
  const assets = project?.assets || {};
  const stats = useMemo(() => getAssetStats(assets), [assets]);

  const slotsByCategory = useMemo(() => {
    const m = {};
    for (const s of allSlots) { if (!m[s.category]) m[s.category] = []; m[s.category].push(s); }
    return m;
  }, [allSlots]);

  // ZIP upload
  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    setUploading(true);
    try {
      const result = await processAssetZip(file);
      setUploadResult(result);
      // Auto-register matched
      let newAssets = { ...assets };
      for (const m of result.matched) {
        newAssets = addAssetToSlot(newAssets, m.slotId, { url: m.url, filename: m.filename, theme: m.theme, number: m.number });
      }
      onUpdateAssets(newAssets);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Individual image upload to selected slot
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file || !selectedSlot) return; e.target.value = '';
    const url = URL.createObjectURL(file);
    const newAssets = addAssetToSlot(assets, selectedSlot.id, { url, filename: file.name, theme: 'custom', number: String((assets[selectedSlot.id]?.images?.length || 0) + 1).padStart(2, '0') });
    onUpdateAssets(newAssets);
  };

  // Set active
  const handleSetActive = (slotId, index) => {
    onUpdateAssets(setActiveAsset(assets, slotId, index));
  };

  // Remove
  const handleRemove = (slotId, index) => {
    onUpdateAssets(removeAssetFromSlot(assets, slotId, index));
  };

  const slotImages = selectedSlot ? (assets[selectedSlot.id]?.images || []) : [];
  const activeIdx = selectedSlot ? (assets[selectedSlot.id]?.activeIndex || 0) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className={`${theme.bgPanel} border ${theme.border} rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`px-4 py-3 border-b ${theme.border} flex items-center gap-2`}>
          <Package size={16} className={theme.text} />
          <span className={`font-bold ${theme.text} ${M} text-sm flex-1`}>
            {L('에셋 관리', 'Asset Manager')}
          </span>
          <span className={`text-[10px] ${theme.textMuted} ${M}`}>
            {stats.filled}/{stats.total} ({stats.percent}%)
          </span>
          <button onClick={onClose} className={`p-1 rounded ${theme.textMuted}`}><X size={16} /></button>
        </div>

        {/* ZIP upload bar */}
        <div className={`px-4 py-2 border-b ${theme.border} ${theme.bgAlt} flex items-center gap-2`}>
          <button onClick={() => zipRef.current?.click()} disabled={uploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border ${M} ${theme.buttonPrimary}`}>
            <Upload size={12} /> {uploading ? L('처리 중...', 'Processing...') : L('ZIP 일괄 업로드', 'Batch ZIP Upload')}
          </button>
          <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={handleZipUpload} />
          <span className={`text-[9px] ${theme.textDim} ${M} flex-1`}>
            {L('파일 이름 규칙으로 자동 매칭', 'Auto-match by filename')}
          </span>
          {uploadResult && (
            <span className={`text-[9px] ${M} ${uploadResult.unmatched.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              ✅ {uploadResult.matched.length} {L('매칭', 'matched')}
              {uploadResult.unmatched.length > 0 && ` · ⚠️ ${uploadResult.unmatched.length} ${L('미매칭', 'unmatched')}`}
            </span>
          )}
        </div>

        {/* Body: two columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: slot list */}
          <div className={`w-1/2 border-r ${theme.border} overflow-y-auto`}>
            {Object.entries(CATEGORY_INFO).map(([catKey, catInfo]) => {
              const catSlots = slotsByCategory[catKey] || [];
              const isExpanded = expandedCat === catKey;
              const filledCount = catSlots.filter(s => assets[s.id]?.images?.length > 0).length;

              return (
                <div key={catKey}>
                  <button onClick={() => setExpandedCat(isExpanded ? null : catKey)}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-left ${theme.bgAlt} border-b ${theme.border}`}>
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span className="text-sm">{catInfo.emoji}</span>
                    <span className={`text-[11px] font-bold ${theme.text} ${M} flex-1`}>
                      {L(catInfo.label_ko, catInfo.label_en)}
                    </span>
                    <span className={`text-[9px] ${theme.textMuted} ${M}`}>
                      {filledCount}/{catSlots.length}
                    </span>
                  </button>

                  {isExpanded && catSlots.map(slot => {
                    const hasImages = assets[slot.id]?.images?.length > 0;
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                        className={`w-full px-4 py-1.5 flex items-center gap-2 text-left border-b ${theme.border} ${
                          isSelected ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${hasImages ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <span className={`text-[10px] ${theme.text} ${M} flex-1 truncate`}>
                          {L(slot.label_ko, slot.label_en)}
                        </span>
                        {hasImages && (
                          <span className={`text-[8px] px-1 rounded bg-emerald-100 text-emerald-700 ${M}`}>
                            {assets[slot.id].images.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Right: slot detail */}
          <div className="w-1/2 p-3 overflow-y-auto">
            {!selectedSlot ? (
              <div className={`text-center py-12 ${theme.textDim} ${M} text-xs`}>
                {L('왼쪽에서 슬롯을 선택하세요', 'Select a slot on the left')}
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`font-bold ${theme.text} ${M} text-sm`}>
                  {L(selectedSlot.label_ko, selectedSlot.label_en)}
                </div>

                {/* Image grid */}
                <div className="grid grid-cols-3 gap-2">
                  {slotImages.map((img, idx) => (
                    <div key={idx} className={`relative border-2 rounded-lg overflow-hidden aspect-square ${
                      idx === activeIdx ? 'border-amber-400' : `${theme.border}`
                    }`}>
                      <img src={img.url} alt={img.filename} className="w-full h-full object-contain bg-white" />

                      {/* Active star */}
                      <button onClick={() => handleSetActive(selectedSlot.id, idx)}
                        className={`absolute top-0.5 left-0.5 p-0.5 rounded ${idx === activeIdx ? 'text-amber-400' : 'text-gray-300'}`}>
                        <Star size={12} fill={idx === activeIdx ? '#f59e0b' : 'none'} />
                      </button>

                      {/* Delete */}
                      <button onClick={() => handleRemove(selectedSlot.id, idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 rounded text-red-400 hover:text-red-600">
                        <Trash2 size={10} />
                      </button>

                      {/* Number */}
                      <span className={`absolute bottom-0.5 right-0.5 text-[7px] ${M} px-1 rounded bg-black/50 text-white`}>
                        {img.number || String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                  ))}

                  {/* Add button */}
                  <button onClick={() => imgRef.current?.click()}
                    className={`border-2 border-dashed ${theme.border} rounded-lg aspect-square flex flex-col items-center justify-center gap-1 ${theme.textMuted}`}>
                    <Image size={16} />
                    <span className={`text-[8px] ${M}`}>+</span>
                  </button>
                </div>

                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                {slotImages.length === 0 && (
                  <div className={`text-[10px] ${theme.textDim} ${M} text-center py-2`}>
                    {L('이미지를 업로드하거나 ZIP으로 일괄 등록하세요', 'Upload an image or batch import via ZIP')}
                  </div>
                )}

                {/* Filename hint */}
                <div className={`text-[9px] ${theme.textDim} ${M} ${theme.bgAlt} rounded p-2`}>
                  {L('ZIP 파일 이름 규칙', 'ZIP filename rule')}:
                  <div className="font-bold mt-0.5">{selectedSlot.id}_sand_01.png</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
