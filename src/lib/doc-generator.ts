import { PageCapture, AIAnalysis, SOPDocument, SOPSection, TOCEntry } from './types';
import { updateTask } from './task-manager';
import { escCss, sanitizeImageSrc, sanitizeWatermarkImage } from './validation';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'output');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function generateSOPDocument(
  taskId: string,
  title: string,
  sourceUrl: string,
  pages: PageCapture[],
  analyses: AIAnalysis[]
): Promise<string> {
  updateTask(taskId, { currentStep: '正在產生 SOP 文件...', progress: 85 });

  const taskOutputDir = path.join(OUTPUT_DIR, taskId);
  const imagesDir = path.join(taskOutputDir, 'images');
  ensureDir(imagesDir);

  for (const page of pages) {
    if (page.screenshotBase64) {
      fs.writeFileSync(path.join(imagesDir, page.screenshotPath), Buffer.from(page.screenshotBase64, 'base64'));
    }
  }

  const sections = buildSections(pages, analyses);
  const toc = buildTableOfContents(sections);

  const doc: SOPDocument = {
    title,
    generatedAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    sourceUrl,
    tableOfContents: toc,
    sections,
  };

  const html = renderHTML(doc);
  const htmlPath = path.join(taskOutputDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  const jsonPath = path.join(taskOutputDir, 'data.json');
  const jsonData = { ...doc, sections: doc.sections.map(s => ({ ...s, screenshotBase64: undefined })) };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

  updateTask(taskId, { currentStep: '文件產生完成！', progress: 100, status: 'completed', resultPath: htmlPath });
  return htmlPath;
}

function buildSections(pages: PageCapture[], analyses: AIAnalysis[]): SOPSection[] {
  const categoryMap = new Map<string, SOPSection[]>();

  for (let i = 0; i < pages.length && i < analyses.length; i++) {
    const page = pages[i];
    const analysis = analyses[i];
    const imgPath = `images/${page.screenshotPath}`;
    const section: SOPSection = {
      id: `section-${i}`,
      title: analysis.pageTitle || page.title,
      category: analysis.functionCategory || '一般功能',
      description: analysis.pageDescription || '',
      screenshotPath: imgPath,
      screenshots: [imgPath],
      steps: analysis.steps || [],
      tips: analysis.tips || [],
      warnings: analysis.warnings || [],
    };

    if (!categoryMap.has(section.category)) categoryMap.set(section.category, []);
    categoryMap.get(section.category)!.push(section);
  }

  const sections: SOPSection[] = [];
  let idx = 0;
  for (const [category, catSections] of categoryMap) {
    for (const section of catSections) {
      section.id = `section-${idx}`;
      section.category = category;
      sections.push(section);
      idx++;
    }
  }
  return sections;
}

function buildTableOfContents(sections: SOPSection[]): TOCEntry[] {
  const categoryEntries = new Map<string, TOCEntry>();
  for (const section of sections) {
    if (!categoryEntries.has(section.category)) {
      categoryEntries.set(section.category, { id: `cat-${categoryEntries.size}`, title: section.category, level: 1, children: [] });
    }
    categoryEntries.get(section.category)!.children!.push({ id: section.id, title: section.title, level: 2 });
  }
  return Array.from(categoryEntries.values());
}

// =============================================
// HTML Rendering — Matching the PDF manual style
// =============================================

interface CoverConfig {
  documentName?: string;
  subtitle?: string;
  author?: string;
  department?: string;
  version?: string;
  extraInfo?: string;
}

interface FontSizeConfig {
  chapterTitle?: number;
  sectionTitle?: number;
  description?: number;
  step?: number;
  note?: number;
}

interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  watermark?: string;
  watermarkOpacity?: number;
  watermarkType?: 'text' | 'image';
  watermarkImage?: string;
  cover?: CoverConfig;
  fontSize?: FontSizeConfig;
}

function renderHTML(doc: SOPDocument): string {
  return renderHTMLWithTheme(doc);
}

/**
 * Render HTML from document data + optional theme.
 * Exported so the save API can regenerate index.html on every save.
 */
export function renderHTMLWithTheme(
  doc: { title: string; generatedAt: string; sourceUrl: string; sections: SOPSection[]; tableOfContents?: TOCEntry[]; theme?: ThemeConfig },
  themeOverride?: ThemeConfig,
): string {
  const theme = themeOverride || doc.theme || {};
  const primaryColor = escCss(theme.primaryColor || '', '#3b5998');
  const accentColor = escCss(theme.accentColor || '', '#1a1a2e');
  const wmType = theme.watermarkType || 'text';
  const wmText = theme.watermark || '';
  const wmImage = sanitizeWatermarkImage(theme.watermarkImage || '');
  const wmOpacity = Math.max(0.02, Math.min(0.3, theme.watermarkOpacity ?? 0.06));
  const cover = theme.cover || {};
  const fs = theme.fontSize || {};
  const fsChapter = fs.chapterTitle || 22;
  const fsSection = fs.sectionTitle || 18;
  const fsDesc = fs.description || 14;
  const fsStep = fs.step || 14;
  const fsNote = fs.note || 13;

  // Rebuild TOC from sections if not present
  const toc = doc.tableOfContents && doc.tableOfContents.length > 0
    ? doc.tableOfContents
    : buildTableOfContents(doc.sections as SOPSection[]);

  // Build numbered TOC
  let tocHTML = '';
  let chapterNum = 1;
  const sectionNumbering = new Map<string, string>();

  for (const category of toc) {
    tocHTML += `<div class="toc-chapter">${chapterNum}. ${esc(category.title)}</div>\n`;
    let subNum = 1;
    for (const child of category.children || []) {
      const num = `${chapterNum}.${subNum}`;
      sectionNumbering.set(child.id, num);
      tocHTML += `<div class="toc-item"><a href="#${child.id}">${num} ${esc(child.title)}</a></div>\n`;
      subNum++;
    }
    chapterNum++;
  }

  // Build sections
  let sectionsHTML = '';
  let currentCategory = '';
  let catChapter = 0;

  for (const section of doc.sections) {
    if (section.category !== currentCategory) {
      currentCategory = section.category;
      catChapter++;
      sectionsHTML += `
        <div class="chapter-divider" id="cat-${catChapter - 1}">
          <h2>${catChapter}. ${esc(section.category)}</h2>
        </div>`;
    }

    const num = sectionNumbering.get(section.id) || '';

    // Steps as A. B. C.
    let stepsHTML = '';
    if (section.steps.length > 0) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      stepsHTML = section.steps.map((step, i) => {
        const letter = letters[i] || `${i + 1}`;
        const elementTag = step.elementRef ? `【${esc(step.elementRef)}】` : '';
        return `<div class="step">
          <div class="step-letter">${letter}.</div>
          <div class="step-body">
            <span class="step-action">${esc(step.action)}</span>${elementTag ? ` ${elementTag}` : ''}${step.description ? `，${esc(step.description)}` : ''}
          </div>
        </div>`;
      }).join('\n');
    }

    // Tips as ※
    const tipsHTML = section.tips.map(t => `<div class="note">※${esc(t)}</div>`).join('\n');
    const warningsHTML = section.warnings.map(w => `<div class="warning">※提醒：${esc(w)}</div>`).join('\n');

    // Render all screenshots (backward compat: fall back to screenshotPath)
    const imgs = section.screenshots && section.screenshots.length > 0
      ? section.screenshots
      : (section.screenshotPath ? [section.screenshotPath] : []);
    const screenshotsHTML = imgs.map(p =>
      `<div class="screenshot-wrapper"><img src="${esc(sanitizeImageSrc(p))}" alt="${esc(section.title)}"></div>`
    ).join('\n');

    sectionsHTML += `
      <section class="content-section" id="${section.id}">
        <h3>${num} ${esc(section.title)}</h3>
        <p class="section-desc">${esc(section.description)}</p>
        ${screenshotsHTML}
        ${stepsHTML}
        ${tipsHTML}
        ${warningsHTML}
      </section>`;
  }

  const versionDate = new Date().toISOString().slice(0, 7).replace('-', '');

  // Watermark HTML
  let watermarkHTML = '';
  if (wmType === 'text' && wmText) {
    watermarkHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999;font-size:60px;font-weight:bold;transform:rotate(-30deg);color:rgba(0,0,0,${wmOpacity})">${esc(wmText)}</div>`;
  } else if (wmType === 'image' && wmImage) {
    const tiles = Array.from({ length: 9 }).map(() => `<img src="${esc(wmImage)}" style="width:200px;height:auto">`).join('');
    watermarkHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:120px;opacity:${wmOpacity};transform:rotate(-20deg);overflow:hidden">${tiles}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(doc.title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: "Microsoft JhengHei", "PingFang TC", -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #222;
    background: #f5f5f5;
  }

  .page {
    max-width: 900px;
    margin: 30px auto;
    background: #fff;
    box-shadow: 0 2px 20px rgba(0,0,0,0.08);
  }

  /* ===== Cover Page ===== */
  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 40px;
    background: linear-gradient(180deg, #f8f8ff 0%, #fff 100%);
    border-bottom: 4px solid ${primaryColor};
    page-break-after: always;
  }

  .cover .brand {
    font-size: 18px;
    color: #888;
    letter-spacing: 4px;
    margin-bottom: 40px;
  }

  .cover h1 {
    font-size: 32px;
    font-weight: 700;
    color: ${accentColor};
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .cover .subtitle {
    font-size: 20px;
    color: ${primaryColor};
    font-weight: 500;
    margin-bottom: 50px;
  }

  .cover .version {
    font-size: 14px;
    color: #999;
    margin-bottom: 60px;
  }

  .cover .team {
    font-size: 13px;
    color: #777;
    line-height: 2;
  }

  .cover .team strong {
    color: #333;
    font-size: 14px;
  }

  /* ===== TOC Page ===== */
  .toc-page {
    padding: 50px 60px;
    page-break-after: always;
  }

  .toc-page h2 {
    font-size: 24px;
    color: ${accentColor};
    border-bottom: 3px solid ${primaryColor};
    padding-bottom: 10px;
    margin-bottom: 30px;
  }

  .toc-chapter {
    font-size: 16px;
    font-weight: 700;
    color: ${accentColor};
    margin-top: 20px;
    margin-bottom: 8px;
  }

  .toc-item {
    padding-left: 24px;
    margin: 4px 0;
  }

  .toc-item a {
    color: ${primaryColor};
    text-decoration: none;
    font-size: 14px;
    border-bottom: 1px dotted #ccc;
    display: inline-block;
    padding-bottom: 1px;
  }

  .toc-item a:hover { color: ${accentColor}; border-bottom-color: ${primaryColor}; }

  /* ===== Content Sections ===== */
  .content-area {
    padding: 40px 60px;
  }

  .chapter-divider {
    margin-top: 50px;
    margin-bottom: 30px;
    page-break-before: always;
  }

  .chapter-divider:first-child {
    margin-top: 0;
    page-break-before: avoid;
  }

  .chapter-divider h2 {
    font-size: ${fsChapter}px;
    color: ${accentColor};
    border-bottom: 3px solid ${primaryColor};
    padding-bottom: 8px;
    break-after: avoid;
    page-break-after: avoid;
  }

  .content-section {
    margin-bottom: 40px;
  }

  .content-section h3 {
    font-size: ${fsSection}px;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 10px;
    padding-left: 0;
    break-after: avoid;
    page-break-after: avoid;
  }

  .section-desc {
    color: #555;
    margin-bottom: 16px;
    font-size: ${fsDesc}px;
    break-after: avoid;
    page-break-after: avoid;
  }

  /* ===== Screenshot ===== */
  .screenshot-wrapper {
    margin: 16px 0 20px;
    text-align: center;
    page-break-inside: avoid;
  }

  .screenshot-wrapper img {
    max-width: 100%;
    max-height: 500px;
    width: auto;
    height: auto;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  }

  /* ===== Steps (A. B. C.) ===== */
  .step {
    display: flex;
    gap: 8px;
    margin: 10px 0;
    padding-left: 8px;
    page-break-inside: avoid;
  }

  .step-letter {
    font-weight: 700;
    color: ${primaryColor};
    min-width: 24px;
    flex-shrink: 0;
  }

  .step-body {
    color: #333;
    font-size: ${fsStep}px;
    line-height: 1.8;
  }

  .step-action {
    font-weight: 600;
  }

  /* ===== Notes ===== */
  .note {
    color: #555;
    font-size: ${fsNote}px;
    margin: 6px 0;
    padding-left: 8px;
    page-break-inside: avoid;
  }

  .warning {
    color: #b8860b;
    font-size: ${fsNote}px;
    margin: 6px 0;
    padding-left: 8px;
    background: #fff8e1;
    padding: 8px 12px;
    border-radius: 4px;
    border-left: 3px solid #f0ad4e;
    page-break-inside: avoid;
  }

  /* ===== Footer ===== */
  .doc-footer {
    text-align: center;
    padding: 30px 60px;
    border-top: 1px solid #eee;
    color: #aaa;
    font-size: 12px;
  }

  /* ===== Print ===== */
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; margin: 0; max-width: 100%; }
    .cover { min-height: auto; padding: 80px 40px; }
    .chapter-divider { page-break-before: always; }
    .chapter-divider h2 { break-after: avoid; page-break-after: avoid; }
    .content-section h3 { break-after: avoid; page-break-after: avoid; }
    .section-desc { break-after: avoid; page-break-after: avoid; }
    .screenshot-wrapper { page-break-inside: avoid; }
    .step { page-break-inside: avoid; }
    .note { page-break-inside: avoid; }
    .warning { page-break-inside: avoid; }
  }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .cover { padding: 40px 24px; }
    .toc-page, .content-area { padding: 24px; }
    .cover h1 { font-size: 24px; }
  }
</style>
</head>
<body>
${watermarkHTML}
<div class="page">

  <!-- Cover Page -->
  <div class="cover">
    <div class="brand">RileyMoriarty Ops Support System</div>
    <h1>${esc(cover.documentName || doc.title)}</h1>
    <div class="subtitle">${esc(cover.subtitle || '系統操作說明手冊')}</div>
    <div class="version">Version ${esc(cover.version || versionDate)}</div>
    <div class="team">
      <strong>文件產生資訊</strong><br>
      ${cover.author ? `製作人：${esc(cover.author)}<br>` : ''}
      ${cover.department ? `部門：${esc(cover.department)}<br>` : ''}
      來源：${esc(doc.sourceUrl)}<br>
      產生時間：${esc(doc.generatedAt)}<br>
      ${cover.extraInfo ? `${esc(cover.extraInfo)}<br>` : ''}
      本文件由 RileyMoriarty Ops Support System 產生
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc-page">
    <h2>目錄</h2>
    ${tocHTML}
  </div>

  <!-- Content -->
  <div class="content-area">
    ${sectionsHTML}
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <p>本文件由 RileyMoriarty Ops Support System 產生 | ${esc(doc.generatedAt)}</p>
    <p>來源：${esc(doc.sourceUrl)}</p>
  </div>

</div>

<script>
document.querySelectorAll('.toc-item a, .toc-chapter').forEach(el => {
  if (el.tagName === 'A') {
    el.addEventListener('click', e => {
      e.preventDefault();
      const id = el.getAttribute('href')?.slice(1);
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
});
</script>
</body>
</html>`;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
