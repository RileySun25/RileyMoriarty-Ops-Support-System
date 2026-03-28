'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface OperationStep {
  stepNumber: number;
  action: string;
  description: string;
  elementRef?: string;
}

interface SOPSection {
  id: string;
  title: string;
  category: string;
  description: string;
  screenshotPath: string;
  screenshots?: string[];
  steps: OperationStep[];
  tips: string[];
  warnings: string[];
}

interface SOPDocument {
  title: string;
  generatedAt: string;
  sourceUrl: string;
  tableOfContents: unknown[];
  sections: SOPSection[];
}

interface CoverConfig {
  documentName: string;
  subtitle: string;
  author: string;
  department: string;
  version: string;
  extraInfo: string;
}

interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  watermark: string;
  watermarkOpacity: number;
  watermarkType: 'text' | 'image';
  watermarkImage: string;
  cover: CoverConfig;
}

interface CropState {
  sectionIdx: number;
  imageIdx: number;
  imageSrc: string;
  imagePath: string;
}

const DEFAULT_COVER: CoverConfig = {
  documentName: '',
  subtitle: '系統操作說明手冊',
  author: '',
  department: '',
  version: '',
  extraInfo: '',
};

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3b5998',
  accentColor: '#1a1a2e',
  watermark: '',
  watermarkOpacity: 0.06,
  watermarkType: 'text',
  watermarkImage: '',
  cover: { ...DEFAULT_COVER },
};

const COLOR_PRESETS = [
  { name: '經典藍', primary: '#3b5998', accent: '#1a1a2e' },
  { name: '翠綠', primary: '#2e7d32', accent: '#1b3a1b' },
  { name: '深紅', primary: '#c62828', accent: '#2e1a1a' },
  { name: '紫色', primary: '#6a1b9a', accent: '#2a1a3e' },
  { name: '橙色', primary: '#e65100', accent: '#3e2a1a' },
  { name: '靛藍', primary: '#1565c0', accent: '#0d2137' },
];

// =============================================
// Image Crop Modal Component
// =============================================
function CropModal({ imageSrc, onConfirm, onCancel }: {
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const maxW = Math.min(800, window.innerWidth - 80);
    const scale = maxW / img.naturalWidth;
    const displayW = Math.round(img.naturalWidth * scale);
    const displayH = Math.round(img.naturalHeight * scale);
    canvas.width = displayW;
    canvas.height = displayH;
    setDisplayScale(scale);
    drawCanvas(canvas, img, displayW, displayH, null);
  }, [imgLoaded]);

  useEffect(() => {
    if (!canvasRef.current || !imgRef.current) return;
    drawCanvas(canvasRef.current, imgRef.current, canvasRef.current.width, canvasRef.current.height, selection);
  }, [selection]);

  function drawCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement, w: number, h: number, sel: typeof selection) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    if (sel && sel.w > 0 && sel.h > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
      ctx.drawImage(img, sel.x / (w / img.naturalWidth), sel.y / (h / img.naturalHeight),
        sel.w / (w / img.naturalWidth), sel.h / (h / img.naturalHeight),
        sel.x, sel.y, sel.w, sel.h);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h); ctx.setLineDash([]);
      ctx.fillStyle = '#3b82f6';
      for (const [cx, cy] of [[sel.x, sel.y], [sel.x + sel.w, sel.y], [sel.x, sel.y + sel.h], [sel.x + sel.w, sel.y + sel.h]]) {
        ctx.fillRect(cx - 4, cy - 4, 8, 8);
      }
      ctx.font = '12px sans-serif';
      ctx.fillText(`${Math.round(sel.w / displayScale)} x ${Math.round(sel.h / displayScale)}`, sel.x + sel.w / 2 - 30, sel.y - 8);
    }
  }

  function getCanvasPos(e: React.MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[880px] w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">裁切圖片</h3>
            <p className="text-sm text-slate-400">在圖片上拖曳選取要保留的區域</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-50">
          {imgLoaded ? (
            <canvas ref={canvasRef} className="cursor-crosshair border border-slate-200 rounded shadow-sm"
              onMouseDown={e => { const p = getCanvasPos(e); setDragging(true); setStartPos(p); setSelection({ x: p.x, y: p.y, w: 0, h: 0 }); }}
              onMouseMove={e => { if (!dragging || !startPos) return; const p = getCanvasPos(e); setSelection({ x: Math.min(startPos.x, p.x), y: Math.min(startPos.y, p.y), w: Math.abs(p.x - startPos.x), h: Math.abs(p.y - startPos.y) }); }}
              onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}
            />
          ) : <p className="text-slate-400">載入圖片中...</p>}
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-between bg-white rounded-b-2xl">
          <p className="text-xs text-slate-400">
            {selection && selection.w > 10 ? `已選取 ${Math.round(selection.w / displayScale)} x ${Math.round(selection.h / displayScale)} px` : '請在圖片上拖曳選取區域'}
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">取消</button>
            <button
              onClick={() => {
                if (!selection || selection.w < 10 || selection.h < 10 || !imgRef.current || !canvasRef.current) return;
                const img = imgRef.current;
                const scaleX = img.naturalWidth / canvasRef.current.width;
                const scaleY = img.naturalHeight / canvasRef.current.height;
                const out = document.createElement('canvas');
                out.width = Math.round(selection.w * scaleX); out.height = Math.round(selection.h * scaleY);
                out.getContext('2d')?.drawImage(img, Math.round(selection.x * scaleX), Math.round(selection.y * scaleY), out.width, out.height, 0, 0, out.width, out.height);
                onConfirm(out.toDataURL('image/png'));
              }}
              disabled={!selection || selection.w < 10 || selection.h < 10}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >確認裁切</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Main Editor
// =============================================
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<SOPDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'color' | 'watermark' | 'cover'>('color');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [cropState, setCropState] = useState<CropState | null>(null);
  // Use page-load timestamp so cropped images from previous session are never cached
  const [globalCacheBust] = useState(() => Date.now());
  const [imgVersions, setImgVersions] = useState<Record<string, number>>({});
  const watermarkFileRef = useRef<HTMLInputElement>(null);
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const [uploadSectionIdx, setUploadSectionIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/download/${id}?format=json`)
      .then(res => res.json())
      .then(data => {
        // Migrate: ensure every section has screenshots array
        if (data.sections) {
          for (const s of data.sections) {
            if (!s.screenshots || s.screenshots.length === 0) {
              s.screenshots = s.screenshotPath ? [s.screenshotPath] : [];
            }
          }
        }
        setDoc(data);
        if (data.theme) {
          setTheme({
            ...DEFAULT_THEME,
            ...data.theme,
            cover: { ...DEFAULT_COVER, ...data.theme?.cover },
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const saveDoc = useCallback(async (updatedDoc: SOPDocument) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/save/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedDoc, theme }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  }, [id, theme]);

  function updateSection(index: number, updates: Partial<SOPSection>) {
    if (!doc) return;
    const s = [...doc.sections]; s[index] = { ...s[index], ...updates }; setDoc({ ...doc, sections: s });
  }
  function updateStep(si: number, sti: number, u: Partial<OperationStep>) {
    if (!doc) return;
    const s = [...doc.sections]; const st = [...s[si].steps]; st[sti] = { ...st[sti], ...u }; s[si] = { ...s[si], steps: st }; setDoc({ ...doc, sections: s });
  }
  function addStep(si: number) {
    if (!doc) return;
    const s = [...doc.sections]; const st = [...s[si].steps]; st.push({ stepNumber: st.length + 1, action: '新步驟', description: '', elementRef: '' }); s[si] = { ...s[si], steps: st }; setDoc({ ...doc, sections: s });
  }
  function removeStep(si: number, sti: number) {
    if (!doc) return;
    const s = [...doc.sections]; const st = s[si].steps.filter((_, i) => i !== sti); st.forEach((x, i) => x.stepNumber = i + 1); s[si] = { ...s[si], steps: st }; setDoc({ ...doc, sections: s });
  }
  function moveStep(si: number, from: number, to: number) {
    if (!doc || from === to) return;
    const s = [...doc.sections]; const st = [...s[si].steps]; const [m] = st.splice(from, 1); st.splice(to, 0, m); st.forEach((x, i) => x.stepNumber = i + 1); s[si] = { ...s[si], steps: st }; setDoc({ ...doc, sections: s });
  }
  function updateTip(si: number, ti: number, v: string) { if (!doc) return; const s = [...doc.sections]; const t = [...s[si].tips]; t[ti] = v; s[si] = { ...s[si], tips: t }; setDoc({ ...doc, sections: s }); }
  function addTip(si: number) { if (!doc) return; const s = [...doc.sections]; s[si] = { ...s[si], tips: [...s[si].tips, '新提示'] }; setDoc({ ...doc, sections: s }); }
  function removeTip(si: number, ti: number) { if (!doc) return; const s = [...doc.sections]; s[si] = { ...s[si], tips: s[si].tips.filter((_, i) => i !== ti) }; setDoc({ ...doc, sections: s }); }
  function updateWarning(si: number, wi: number, v: string) { if (!doc) return; const s = [...doc.sections]; const w = [...s[si].warnings]; w[wi] = v; s[si] = { ...s[si], warnings: w }; setDoc({ ...doc, sections: s }); }
  function addWarning(si: number) { if (!doc) return; const s = [...doc.sections]; s[si] = { ...s[si], warnings: [...s[si].warnings, '新注意事項'] }; setDoc({ ...doc, sections: s }); }
  function removeWarning(si: number, wi: number) { if (!doc) return; const s = [...doc.sections]; s[si] = { ...s[si], warnings: s[si].warnings.filter((_, i) => i !== wi) }; setDoc({ ...doc, sections: s }); }

  function moveSection(from: number, to: number) {
    if (!doc || from === to || to < 0 || to >= doc.sections.length) return;
    const s = [...doc.sections]; const [m] = s.splice(from, 1); s.splice(to, 0, m); s.forEach((x, i) => x.id = `section-${i}`);
    setDoc({ ...doc, sections: s });
  }
  function handleSectionDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx || !doc) return;
    moveSection(dragIdx, idx); setDragIdx(null); setDragOverIdx(null);
  }
  function removeSection(idx: number) {
    if (!doc) return;
    const s = doc.sections.filter((_, i) => i !== idx); s.forEach((x, i) => x.id = `section-${i}`); setDoc({ ...doc, sections: s });
  }
  function addSection() {
    if (!doc) return;
    const newSection: SOPSection = {
      id: `section-${doc.sections.length}`,
      title: '新區段',
      category: doc.sections.length > 0 ? doc.sections[doc.sections.length - 1].category : '一般功能',
      description: '',
      screenshotPath: '',
      screenshots: [],
      steps: [{ stepNumber: 1, action: '新步驟', description: '', elementRef: '' }],
      tips: [],
      warnings: [],
    };
    setDoc({ ...doc, sections: [...doc.sections, newSection] });
  }

  function imgSrc(screenshotPath: string) {
    return `/api/download/${id}?format=image&path=${encodeURIComponent(screenshotPath)}&t=${globalCacheBust + (imgVersions[screenshotPath] || 0)}`;
  }

  function openCrop(sIdx: number, imgIdx: number) {
    if (!doc) return;
    const screenshots = doc.sections[sIdx].screenshots || [];
    const path = screenshots[imgIdx];
    if (!path) return;
    setCropState({ sectionIdx: sIdx, imageIdx: imgIdx, imageSrc: imgSrc(path), imagePath: path });
  }

  async function handleCropConfirm(croppedDataUrl: string) {
    if (!cropState) return;
    try {
      const res = await fetch(`/api/crop/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: cropState.imagePath, croppedData: croppedDataUrl }),
      });
      if (res.ok) {
        setImgVersions(prev => ({ ...prev, [cropState.imagePath]: (prev[cropState.imagePath] || 0) + 1 }));
      }
    } catch { /* ignore */ }
    setCropState(null);
  }

  function removeImage(sIdx: number, imgIdx: number) {
    if (!doc) return;
    const s = [...doc.sections];
    const imgs = [...(s[sIdx].screenshots || [])];
    imgs.splice(imgIdx, 1);
    s[sIdx] = { ...s[sIdx], screenshots: imgs, screenshotPath: imgs[0] || '' };
    setDoc({ ...doc, sections: s });
  }

  // Upload image for a section (add as new image)
  function triggerUpload(sectionIdx: number) {
    setUploadSectionIdx(sectionIdx);
    uploadFileRef.current?.click();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadSectionIdx === null || !doc) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const section = doc.sections[uploadSectionIdx];
      // Always create a new filename for additional images
      const filename = `images/upload_${Date.now()}.png`;
      try {
        const res = await fetch(`/api/crop/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: filename, croppedData: dataUrl }),
        });
        if (res.ok) {
          setImgVersions(prev => ({ ...prev, [filename]: (prev[filename] || 0) + 1 }));
          // Add to screenshots array
          const newScreenshots = [...(section.screenshots || []), filename];
          updateSection(uploadSectionIdx, {
            screenshots: newScreenshots,
            screenshotPath: newScreenshots[0] || filename,
          });
        }
      } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  }

  function handleWatermarkImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTheme(t => ({ ...t, watermarkType: 'image', watermarkImage: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function updateCover(updates: Partial<CoverConfig>) {
    setTheme(t => ({ ...t, cover: { ...t.cover, ...updates } }));
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      if (doc) await saveDoc(doc);
      const w = window.open(`/editor/${id}/print?primary=${encodeURIComponent(theme.primaryColor)}&accent=${encodeURIComponent(theme.accentColor)}&watermarkOpacity=${theme.watermarkOpacity}`, '_blank');
      if (w) { w.onafterprint = () => setExportingPdf(false); setTimeout(() => setExportingPdf(false), 3000); }
      else setExportingPdf(false);
    } catch { setExportingPdf(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-4">
          {[0, 150, 300].map(d => <div key={d} className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
        </div>
        <p className="text-slate-600">載入文件中...</p>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-red-600 text-lg mb-4">找不到此文件</p>
      <Link href="/" className="text-blue-600 hover:underline">返回首頁</Link>
    </div>
  );

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  return (
    <div className="min-h-screen bg-slate-100">
      {cropState && <CropModal imageSrc={cropState.imageSrc} onConfirm={handleCropConfirm} onCancel={() => setCropState(null)} />}
      <input ref={uploadFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Top toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-500 hover:text-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <input value={doc.title} onChange={e => setDoc({ ...doc, title: e.target.value })}
                className="text-lg font-bold text-slate-800 border-none focus:outline-none focus:ring-0 bg-transparent w-full" style={{ minWidth: '300px' }} />
              <p className="text-xs text-slate-400">{doc.sourceUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(!showSettings)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                樣式設定
              </span>
            </button>
            <button onClick={() => doc && saveDoc(doc)} disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? '儲存中...' : saved ? '已儲存' : '儲存'}
            </button>
            <button onClick={exportPdf} disabled={exportingPdf}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
              {exportingPdf ? '準備中...' : '匯出 PDF'}
            </button>
          </div>
        </div>

        {/* Settings Panel — Tabs */}
        {showSettings && (
          <div className="border-t bg-slate-50 px-4 py-5">
            <div className="max-w-6xl mx-auto">
              {/* Tab buttons */}
              <div className="flex gap-1 mb-5 border-b border-slate-200">
                {([['color', '配色方案'], ['watermark', '浮水印'], ['cover', '封面資訊']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setSettingsTab(key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${settingsTab === key ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Color tab */}
              {settingsTab === 'color' && (
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {COLOR_PRESETS.map(p => (
                      <button key={p.name} onClick={() => setTheme({ ...theme, primaryColor: p.primary, accentColor: p.accent })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${theme.primaryColor === p.primary ? 'border-slate-800 bg-white shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primary }} />{p.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">主色</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={theme.primaryColor} onChange={e => setTheme({ ...theme, primaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
                        <input type="text" value={theme.primaryColor} onChange={e => setTheme({ ...theme, primaryColor: e.target.value })} className="w-24 px-2 py-1 border rounded text-xs font-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">強調色</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={theme.accentColor} onChange={e => setTheme({ ...theme, accentColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
                        <input type="text" value={theme.accentColor} onChange={e => setTheme({ ...theme, accentColor: e.target.value })} className="w-24 px-2 py-1 border rounded text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Watermark tab */}
              {settingsTab === 'watermark' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setTheme({ ...theme, watermarkType: 'text' })}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${theme.watermarkType === 'text' ? 'border-slate-800 bg-white shadow-sm' : 'border-slate-200'}`}>文字浮水印</button>
                    <button onClick={() => setTheme({ ...theme, watermarkType: 'image' })}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${theme.watermarkType === 'image' ? 'border-slate-800 bg-white shadow-sm' : 'border-slate-200'}`}>圖片浮水印 (Logo)</button>
                  </div>
                  {theme.watermarkType === 'text' ? (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">浮水印文字（留空不顯示）</label>
                      <input type="text" value={theme.watermark} onChange={e => setTheme({ ...theme, watermark: e.target.value })} placeholder="例如：公司機密" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">上傳浮水印圖片</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => watermarkFileRef.current?.click()} className="px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-blue-400">
                          {theme.watermarkImage ? '更換圖片' : '選擇圖片'}
                        </button>
                        <input ref={watermarkFileRef} type="file" accept="image/*" className="hidden" onChange={handleWatermarkImageUpload} />
                        {theme.watermarkImage && (
                          <>
                            <div className="w-12 h-12 border rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={theme.watermarkImage} alt="浮水印" className="max-w-full max-h-full object-contain" />
                            </div>
                            <button onClick={() => setTheme({ ...theme, watermarkImage: '' })} className="text-xs text-red-500 hover:text-red-700">移除</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">透明度: {Math.round(theme.watermarkOpacity * 100)}%</label>
                    <input type="range" min="0.02" max="0.3" step="0.01" value={theme.watermarkOpacity}
                      onChange={e => setTheme({ ...theme, watermarkOpacity: parseFloat(e.target.value) })} className="w-full" />
                  </div>
                </div>
              )}

              {/* Cover tab */}
              {settingsTab === 'cover' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">文件名稱（留空使用 AI 產生的標題）</label>
                    <input type="text" value={theme.cover.documentName} onChange={e => updateCover({ documentName: e.target.value })} placeholder={doc.title} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">副標題</label>
                    <input type="text" value={theme.cover.subtitle} onChange={e => updateCover({ subtitle: e.target.value })} placeholder="系統操作說明手冊" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">製作人</label>
                    <input type="text" value={theme.cover.author} onChange={e => updateCover({ author: e.target.value })} placeholder="姓名" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">部門 / 單位</label>
                    <input type="text" value={theme.cover.department} onChange={e => updateCover({ department: e.target.value })} placeholder="例如：資訊部" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">版本號（留空自動產生）</label>
                    <input type="text" value={theme.cover.version} onChange={e => updateCover({ version: e.target.value })} placeholder="例如：v1.0" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">其他資訊</label>
                    <input type="text" value={theme.cover.extraInfo} onChange={e => updateCover({ extraInfo: e.target.value })} placeholder="例如：僅限內部使用" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        {doc.sections.map((section, sIdx) => (
          <div key={section.id}
            onDragOver={e => { e.preventDefault(); setDragOverIdx(sIdx); }}
            onDrop={() => handleSectionDrop(sIdx)}
            className={`bg-white rounded-xl shadow-sm mb-6 transition-all ${dragOverIdx === sIdx && dragIdx !== sIdx ? 'ring-2 ring-blue-400 ring-offset-2' : ''} ${dragIdx === sIdx ? 'opacity-50 scale-[0.98]' : ''}`}>
            {/* Compact reorder bar */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-t-xl border-b border-slate-100 text-slate-400">
              <div draggable
                onDragStart={() => setDragIdx(sIdx)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                className="cursor-grab active:cursor-grabbing hover:text-slate-600 p-1" title="拖曳排序">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
              </div>
              <span className="text-xs font-medium text-slate-400 select-none">#{sIdx + 1}</span>
              <div className="flex items-center gap-0.5 ml-1">
                <button onClick={() => moveSection(sIdx, sIdx - 1)} disabled={sIdx === 0}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="上移">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => moveSection(sIdx, sIdx + 1)} disabled={sIdx === doc.sections.length - 1}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="下移">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <div className="flex-1" />
              <button onClick={() => removeSection(sIdx)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors" title="刪除此區段">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            {/* Header */}
            <div className="flex items-start gap-3 p-5 pb-3 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primaryColor + '18', color: theme.primaryColor }}>{section.category}</span>
                  <input value={section.category} onChange={e => updateSection(sIdx, { category: e.target.value })} className="text-xs text-slate-400 border-none focus:outline-none bg-transparent w-32" placeholder="分類" />
                </div>
                <input value={section.title} onChange={e => updateSection(sIdx, { title: e.target.value })} className="text-lg font-bold text-slate-800 border-none focus:outline-none bg-transparent w-full" />
                <textarea value={section.description} onChange={e => updateSection(sIdx, { description: e.target.value })} className="text-sm text-slate-500 border-none focus:outline-none bg-transparent w-full resize-none mt-1" rows={2} placeholder="頁面說明..." />
              </div>
            </div>

            {/* Screenshots (multi-image) */}
            <div className="px-5 pt-4 space-y-3">
              {(section.screenshots || []).map((ssPath, imgIdx) => (
                <div key={imgIdx} className="group/img relative border rounded-lg overflow-hidden bg-slate-50">
                  {(section.screenshots || []).length > 1 && (
                    <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                      {imgIdx + 1} / {(section.screenshots || []).length}
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc(ssPath)} alt={`${section.title} - ${imgIdx + 1}`} className="w-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center gap-3">
                    <button onClick={() => openCrop(sIdx, imgIdx)}
                      className="opacity-0 group-hover/img:opacity-100 transition-opacity px-3 py-1.5 bg-white rounded-lg shadow-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h2m10 0h2a2 2 0 002-2v-2M4 8V6a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2" /></svg>
                      裁切
                    </button>
                    <button onClick={() => removeImage(sIdx, imgIdx)}
                      className="opacity-0 group-hover/img:opacity-100 transition-opacity px-3 py-1.5 bg-white rounded-lg shadow-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      移除
                    </button>
                  </div>
                </div>
              ))}
              {/* Add image button */}
              <button onClick={() => triggerUpload(sIdx)}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-6 flex items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="text-sm font-medium">{(section.screenshots || []).length === 0 ? '上傳截圖' : '新增圖片'}</span>
              </button>
            </div>

            {/* Steps */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-600">操作步驟</h4>
                <button onClick={() => addStep(sIdx)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ 新增步驟</button>
              </div>
              {section.steps.map((step, stepIdx) => (
                <div key={stepIdx} className="flex items-start gap-2 mb-2 group">
                  <span className="font-bold text-sm mt-2 min-w-[24px]" style={{ color: theme.primaryColor }}>{letters[stepIdx] || `${stepIdx + 1}`}.</span>
                  <div className="flex-1 bg-slate-50 rounded-lg p-2.5 border border-transparent hover:border-slate-200 transition-colors">
                    <input value={step.action} onChange={e => updateStep(sIdx, stepIdx, { action: e.target.value })} className="w-full text-sm font-medium text-slate-800 bg-transparent border-none focus:outline-none" placeholder="操作描述..." />
                    <div className="flex gap-2 mt-1">
                      <input value={step.description || ''} onChange={e => updateStep(sIdx, stepIdx, { description: e.target.value })} className="flex-1 text-xs text-slate-500 bg-transparent border-none focus:outline-none" placeholder="補充說明（可空）" />
                      <input value={step.elementRef || ''} onChange={e => updateStep(sIdx, stepIdx, { elementRef: e.target.value })} className="w-28 text-xs bg-transparent border-none focus:outline-none" placeholder="UI 元素" style={{ color: theme.primaryColor }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {stepIdx > 0 && <button onClick={() => moveStep(sIdx, stepIdx, stepIdx - 1)} className="text-slate-400 hover:text-slate-600 p-0.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>}
                    {stepIdx < section.steps.length - 1 && <button onClick={() => moveStep(sIdx, stepIdx, stepIdx + 1)} className="text-slate-400 hover:text-slate-600 p-0.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>}
                    <button onClick={() => removeStep(sIdx, stepIdx)} className="text-slate-400 hover:text-red-500 p-0.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips & Warnings */}
            <div className="px-5 pb-3">
              <div className="flex items-center justify-between mb-2"><h4 className="text-xs font-semibold text-slate-500">提示</h4><button onClick={() => addTip(sIdx)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ 新增</button></div>
              {section.tips.map((tip, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 group"><span className="text-xs text-slate-400">※</span>
                  <input value={tip} onChange={e => updateTip(sIdx, i, e.target.value)} className="flex-1 text-xs text-slate-600 bg-transparent border-none focus:outline-none" />
                  <button onClick={() => removeTip(sIdx, i)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-2"><h4 className="text-xs font-semibold text-amber-600">注意事項</h4><button onClick={() => addWarning(sIdx)} className="text-xs text-amber-600 hover:text-amber-800 font-medium">+ 新增</button></div>
              {section.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 group bg-amber-50 rounded-md px-2 py-1"><span className="text-xs text-amber-500">※提醒</span>
                  <input value={w} onChange={e => updateWarning(sIdx, i, e.target.value)} className="flex-1 text-xs text-amber-700 bg-transparent border-none focus:outline-none" />
                  <button onClick={() => removeWarning(sIdx, i)} className="text-amber-300 hover:text-red-400 opacity-0 group-hover:opacity-100"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add new section */}
        <button onClick={addSection}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl py-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors mb-8">
          <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span className="text-sm font-medium">新增區段</span>
        </button>
      </div>
    </div>
  );
}
