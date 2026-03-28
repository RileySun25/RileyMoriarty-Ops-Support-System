'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

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

interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  watermark: string;
  watermarkOpacity: number;
  watermarkType: 'text' | 'image';
  watermarkImage: string;
}

interface SOPDocument {
  title: string;
  generatedAt: string;
  sourceUrl: string;
  sections: SOPSection[];
  theme?: ThemeConfig;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [doc, setDoc] = useState<SOPDocument | null>(null);
  const [ready, setReady] = useState(false);
  const [cacheBust] = useState(() => Date.now());

  // URL params override for colors; watermark comes from saved JSON
  const primaryColor = searchParams.get('primary') || '#3b5998';
  const accentColor = searchParams.get('accent') || '#1a1a2e';
  const watermarkOpacity = parseFloat(searchParams.get('watermarkOpacity') || '0.06');

  useEffect(() => {
    fetch(`/api/download/${id}?format=json`)
      .then(res => res.json())
      .then(data => {
        setDoc(data);
        setTimeout(() => {
          setReady(true);
          setTimeout(() => window.print(), 800);
        }, 1500);
      });
  }, [id]);

  if (!doc) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>載入中...</div>;
  }

  const themeData = doc.theme;
  const wmType = themeData?.watermarkType || 'text';
  const wmText = themeData?.watermark || '';
  const wmImage = themeData?.watermarkImage || '';
  const wmOpacity = themeData?.watermarkOpacity ?? watermarkOpacity;
  const hasTextWatermark = wmType === 'text' && wmText;
  const hasImageWatermark = wmType === 'image' && wmImage;

  // Cover config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cover = (themeData as any)?.cover as Record<string, string> | undefined;

  // Group sections by category
  const categories: { name: string; sections: SOPSection[] }[] = [];
  const catMap = new Map<string, SOPSection[]>();
  for (const s of doc.sections) {
    if (!catMap.has(s.category)) catMap.set(s.category, []);
    catMap.get(s.category)!.push(s);
  }
  for (const [name, sections] of catMap) {
    categories.push({ name, sections });
  }

  // Build numbering
  const sectionNumbers = new Map<string, string>();
  let chapterNum = 1;
  for (const cat of categories) {
    let subNum = 1;
    for (const s of cat.sections) {
      sectionNumbers.set(s.id, `${chapterNum}.${subNum}`);
      subNum++;
    }
    chapterNum++;
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const versionDate = new Date().toISOString().slice(0, 7).replace('-', '');

  return (
    <>
      <style>{`
        @page { size: A4; margin: 20mm 18mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "Microsoft JhengHei", "PingFang TC", -apple-system, sans-serif;
          font-size: 14px; line-height: 1.8; color: #222; background: #fff;
        }
        .watermark-text {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 9999;
          font-size: 60px; font-weight: bold;
          transform: rotate(-30deg);
          color: rgba(0,0,0,${wmOpacity});
        }
        .watermark-image {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 9999;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          gap: 120px;
          opacity: ${wmOpacity};
          transform: rotate(-20deg);
          overflow: hidden;
        }
        .watermark-image img {
          width: 200px; height: auto;
        }
        .cover {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center;
          padding: 60px 40px; border-bottom: 4px solid ${primaryColor};
          page-break-after: always;
        }
        .cover .brand { font-size: 18px; color: #888; letter-spacing: 4px; margin-bottom: 40px; }
        .cover h1 { font-size: 32px; font-weight: 700; color: ${accentColor}; line-height: 1.4; margin-bottom: 8px; }
        .cover .subtitle { font-size: 20px; color: ${primaryColor}; font-weight: 500; margin-bottom: 50px; }
        .cover .version { font-size: 14px; color: #999; margin-bottom: 60px; }
        .cover .team { font-size: 13px; color: #777; line-height: 2; }
        .cover .team strong { color: #333; font-size: 14px; }

        .toc-page { padding: 50px 60px; page-break-after: always; }
        .toc-page h2 { font-size: 24px; color: ${accentColor}; border-bottom: 3px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 30px; }
        .toc-chapter { font-size: 16px; font-weight: 700; color: ${accentColor}; margin-top: 20px; margin-bottom: 8px; }
        .toc-item { padding-left: 24px; margin: 4px 0; font-size: 14px; color: ${primaryColor}; }

        .content-area { padding: 40px 60px; }
        .chapter-divider { margin-top: 50px; margin-bottom: 30px; page-break-before: always; }
        .chapter-divider:first-child { margin-top: 0; page-break-before: avoid; }
        .chapter-divider h2 { font-size: 22px; color: ${accentColor}; border-bottom: 3px solid ${primaryColor}; padding-bottom: 8px; }

        .content-section { margin-bottom: 40px; page-break-inside: avoid; }
        .content-section h3 { font-size: 18px; font-weight: 700; color: #2c3e50; margin-bottom: 10px; }
        .section-desc { color: #555; margin-bottom: 16px; font-size: 14px; }
        .screenshot-wrapper { margin: 16px 0 20px; text-align: center; }
        .screenshot-wrapper img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }

        .step { display: flex; gap: 8px; margin: 10px 0; padding-left: 8px; }
        .step-letter { font-weight: 700; color: ${primaryColor}; min-width: 24px; flex-shrink: 0; }
        .step-body { color: #333; font-size: 14px; line-height: 1.8; }
        .step-action { font-weight: 600; }

        .note { color: #555; font-size: 13px; margin: 6px 0; padding-left: 8px; }
        .warning { color: #b8860b; font-size: 13px; margin: 6px 0; padding: 8px 12px; background: #fff8e1; border-radius: 4px; border-left: 3px solid #f0ad4e; }

        .doc-footer { text-align: center; padding: 30px 60px; border-top: 1px solid #eee; color: #aaa; font-size: 12px; }

        @media print {
          .screenshot-wrapper { page-break-inside: avoid; }
          .chapter-divider { page-break-before: always; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Text watermark */}
      {hasTextWatermark && <div className="watermark-text">{wmText}</div>}

      {/* Image watermark — tiled pattern */}
      {hasImageWatermark && (
        <div className="watermark-image">
          {Array.from({ length: 9 }).map((_, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={wmImage} alt="" />
          ))}
        </div>
      )}

      {/* Print button */}
      {ready && (
        <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '10px 24px', backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            列印 / 儲存 PDF
          </button>
        </div>
      )}

      {/* Cover */}
      <div className="cover">
        <div className="brand">RileyMoriarty Ops Support System</div>
        <h1>{esc(cover?.documentName || doc.title)}</h1>
        <div className="subtitle">{esc(cover?.subtitle || '系統操作說明手冊')}</div>
        <div className="version">Version {esc(cover?.version || versionDate)}</div>
        <div className="team">
          <strong>文件產生資訊</strong><br/>
          {cover?.author && <>製作人：{esc(cover.author)}<br/></>}
          {cover?.department && <>部門：{esc(cover.department)}<br/></>}
          來源：{esc(doc.sourceUrl)}<br/>
          產生時間：{esc(doc.generatedAt)}<br/>
          {cover?.extraInfo && <>{esc(cover.extraInfo)}<br/></>}
          本文件由 RileyMoriarty Ops Support System 產生
        </div>
      </div>

      {/* TOC */}
      <div className="toc-page">
        <h2>目錄</h2>
        {categories.map((cat, catIdx) => (
          <div key={catIdx}>
            <div className="toc-chapter">{catIdx + 1}. {esc(cat.name)}</div>
            {cat.sections.map(s => (
              <div key={s.id} className="toc-item">
                {sectionNumbers.get(s.id)} {esc(s.title)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="content-area">
        {categories.map((cat, catIdx) => (
          <div key={catIdx}>
            <div className="chapter-divider">
              <h2>{catIdx + 1}. {esc(cat.name)}</h2>
            </div>
            {cat.sections.map(section => {
              const num = sectionNumbers.get(section.id) || '';
              return (
                <section key={section.id} className="content-section">
                  <h3>{num} {esc(section.title)}</h3>
                  <p className="section-desc">{esc(section.description)}</p>
                  {(section.screenshots && section.screenshots.length > 0
                    ? section.screenshots
                    : (section.screenshotPath ? [section.screenshotPath] : [])
                  ).map((ssPath, imgIdx) => (
                    <div key={imgIdx} className="screenshot-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/download/${id}?format=image&path=${encodeURIComponent(ssPath)}&t=${cacheBust}`} alt={`${section.title} - ${imgIdx + 1}`} />
                    </div>
                  ))}
                  {section.steps.map((step, i) => (
                    <div key={i} className="step">
                      <div className="step-letter">{letters[i] || `${i + 1}`}.</div>
                      <div className="step-body">
                        <span className="step-action">{esc(step.action)}</span>
                        {step.elementRef && <span>【{esc(step.elementRef)}】</span>}
                        {step.description && <span>，{esc(step.description)}</span>}
                      </div>
                    </div>
                  ))}
                  {section.tips.map((t, i) => (
                    <div key={i} className="note">※{esc(t)}</div>
                  ))}
                  {section.warnings.map((w, i) => (
                    <div key={i} className="warning">※提醒：{esc(w)}</div>
                  ))}
                </section>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="doc-footer">
        <p>本文件由 RileyMoriarty Ops Support System 產生 | {esc(doc.generatedAt)}</p>
        <p>來源：{esc(doc.sourceUrl)}</p>
      </div>
    </>
  );
}
