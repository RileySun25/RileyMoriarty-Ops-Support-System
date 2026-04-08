# RileyMoriarty Ops Support System

> Self-hosted, AI-powered SOP document generator. Automatically browse any web application, capture screenshots, and produce professional operation manuals — all running locally on your machine.

[繁體中文](#繁體中文) | [English](#english)

---

<a id="english"></a>

## What is this?

**RileyMoriarty Ops Support System** turns any web application into a polished, printable SOP (Standard Operating Procedure) document — automatically.

1. Enter a URL and login credentials
2. The system crawls every page using a real browser (Playwright)
3. Claude AI analyzes each screenshot and writes step-by-step instructions
4. You get a professional HTML document with cover page, table of contents, numbered chapters, annotated screenshots, and operation steps
5. Edit everything in a built-in editor, then export to PDF

**Or create documents manually** — start with a blank document, add sections, upload your own screenshots, and write steps by hand using the full-featured editor.

**Everything runs locally.** No files leave your machine (except the Claude API calls for screenshot analysis). No SaaS. No cloud storage. Your documents stay yours.

## Features

### Core
- **Automated Crawling** — Playwright Chromium auto-login (credentials / Google OAuth / manual), BFS page discovery up to 3 levels deep
- **AI Analysis** — Claude Vision analyzes each screenshot, generating structured steps with UI element references
- **Manual Creation** — Create blank documents and build SOP content manually with the editor
- **Built-in Editor** — Edit all text, reorder sections & steps, crop/replace/upload screenshots, drag-and-drop

### Customization
- **Theme Colors** — 6 color presets + custom primary/accent colors
- **Watermarks** — Text or image watermarks with adjustable opacity (2%–30%)
- **Cover Page** — Document name, subtitle, author, department, version
- **Font Sizes** — Customize chapter title, section title, description, step, and note font sizes (8–48px)
- **Multi-Image Sections** — Multiple screenshots per section with individual crop/remove/add

### Output
- **PDF Export** — A4 layout with smart page breaks (titles always stay with content), watermarks, and custom themes
- **Smart Pagination** — Headings never orphaned at page bottom; automatic page breaks keep titles with their content
- **History Management** — Browse, edit, or delete previously generated documents
- **Real-time Progress** — SSE live updates with 3-layer reconnection fallback

### Security
- **Input Validation** — Task ID whitelist, path traversal prevention, CSS injection protection
- **XSS Prevention** — Stored and reflected XSS protection across all outputs
- **SSRF Protection** — URL allowlist blocks private IPs and non-HTTP protocols
- **Chromium Sandbox** — Browser automation runs with full sandbox enabled

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Anthropic API Key** — get one at [console.anthropic.com](https://console.anthropic.com/)

### Setup

```bash
# Clone the repo
git clone https://github.com/RileySun25/RileyMoriarty-Ops-Support-System.git
cd RileyMoriarty-Ops-Support-System

# Install dependencies
npm install

# Install Playwright browser
npx playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm start
```

## Usage

### AI Auto-Scan Mode
1. **Enter target URL** on the home page
2. **Choose login method** — None / Username-Password / Google OAuth / Manual login
3. **Set max pages** (default: 50)
4. **Click "Start"** — watch real-time progress as the system crawls and analyzes
5. **Edit** — click "Edit" to open the built-in editor
6. **Export** — click "Export PDF" to generate a print-ready A4 document

### Manual Creation Mode
1. **Select "Manual Creation"** on the home page
2. **Enter document title** and click "Create"
3. **Add sections** — use "+ Add Section" button
4. **Upload screenshots** — click on image area or "Replace Image"
5. **Write steps** — add A/B/C structured operation steps
6. **Customize** — set theme colors, watermarks, cover info, font sizes
7. **Export PDF**

### Login Modes

| Mode | Use Case |
|------|----------|
| None | Public websites, no login required |
| Credentials | Username + password login forms |
| Google OAuth | Google SSO (opens visible browser for 2FA if needed) |
| Manual | Opens a visible browser — you complete login manually |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (**required**) | — |
| `MAX_PAGES` | Max pages to crawl | 50 |
| `SCREENSHOT_QUALITY` | Screenshot JPEG quality | 80 |
| `CRAWL_TIMEOUT` | Crawl timeout in ms | 120000 |

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Browser Automation**: Playwright (Chromium)
- **AI**: Claude API (Vision / Sonnet)
- **Real-time**: Server-Sent Events (SSE)
- **Output**: HTML + PDF (via browser print)

## Architecture

```
User → [Next.js Frontend] → [POST /api/generate] → Background Pipeline
                                                        ↓
                  [SSE /api/status/:id] ← [task-manager push]
                                                        ↓
       Phase 1: crawler.ts     → Playwright crawl + screenshots
       Phase 2: ai-analyzer.ts → Claude Vision analysis per page
       Phase 3: doc-generator.ts → Assemble HTML document
                                                        ↓
                            output/{taskId}/ → index.html + data.json + images/
                                                        ↓
                  [/editor/:id] → Edit → Save → Export PDF
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home page (AI scan / manual creation)
│   ├── guide/page.tsx              # Usage guide
│   ├── editor/[id]/
│   │   ├── page.tsx                # Document editor
│   │   └── print/page.tsx          # Print/PDF preview page
│   └── api/
│       ├── generate/route.ts       # Start AI crawl pipeline
│       ├── create/route.ts         # Create blank document
│       ├── status/[id]/route.ts    # SSE progress stream
│       ├── save/[id]/route.ts      # Save edits (JSON + regenerate HTML)
│       ├── download/[id]/route.ts  # Serve generated files
│       ├── crop/[id]/route.ts      # Save cropped/uploaded images
│       ├── history/route.ts        # List all documents
│       └── history/[id]/route.ts   # Delete a document
└── lib/
    ├── types.ts                    # TypeScript interfaces
    ├── task-manager.ts             # In-memory task state + SSE
    ├── orchestrator.ts             # 3-phase pipeline coordinator
    ├── crawler.ts                  # Playwright browser automation
    ├── ai-analyzer.ts              # Claude Vision API integration
    ├── doc-generator.ts            # HTML document generator
    ├── validation.ts               # Security: input validation, path traversal, XSS, SSRF
    └── operation-agent.ts          # Experimental: AI operation demo agent
```

## Output Structure

```
output/{taskId}/
├── index.html    # Complete HTML document (regenerated on each save)
├── data.json     # Structured data (sections, theme config)
└── images/       # Screenshot PNGs (overwritten when cropped)
```

## License

MIT

---

<a id="繁體中文"></a>

## 繁體中文

### 這是什麼？

**RileyMoriarty Ops Support System** 可以將任何 Web 應用程式自動轉換為專業的 SOP 操作說明文件。

1. 輸入目標網站 URL 和登入資訊
2. 系統使用真實瀏覽器（Playwright）自動瀏覽每一頁並截圖
3. Claude AI 分析每張截圖，撰寫步驟化操作說明
4. 產生包含封面、目錄、編號章節、標註截圖、操作步驟的專業 HTML 文件
5. 在內建編輯器中調整所有內容，然後匯出 PDF

**也可以手動建立文件** — 從空白文件開始，新增區段、上傳截圖、撰寫步驟，使用完整的編輯器功能。

**完全本地執行。** 除了 Claude API 分析截圖外，所有檔案都不會離開你的電腦。沒有 SaaS、沒有雲端儲存，文件完全屬於你。

### 功能特色

#### 核心功能
- **自動爬取** — Playwright Chromium 自動登入（帳密 / Google OAuth / 手動），BFS 探索最深 3 層
- **AI 分析** — Claude Vision 分析每張截圖，產生結構化步驟與 UI 元素標註
- **手動建立** — 建立空白文件，手動新增區段、上傳截圖、撰寫步驟
- **內建編輯器** — 編輯所有文字、排序區段與步驟、裁切/更換/上傳截圖、拖拉排序

#### 自訂設定
- **主題配色** — 6 組預設配色 + 自訂主色/強調色
- **浮水印** — 文字或圖片浮水印，透明度可調（2%–30%）
- **封面設定** — 文件名稱、副標題、製作人、部門、版本號
- **字體大小** — 章節標題、區段標題、描述、步驟、提示字級可調（8–48px）
- **多圖片區段** — 每個區段支援多張截圖，可個別裁切/移除/新增

#### 輸出
- **PDF 匯出** — A4 格式，智慧分頁（標題一定跟內容同頁）、浮水印、自訂主題
- **智慧分頁** — 標題不會孤立在頁尾，自動換頁保持標題與內容一起
- **歷史管理** — 瀏覽、編輯或刪除已產生的文件
- **即時進度** — SSE 即時推送，三層斷線重連機制

#### 安全性
- **輸入驗證** — Task ID 白名單、路徑穿越防護、CSS 注入防護
- **XSS 防護** — 所有輸出的 Stored XSS 和 Reflected XSS 防護
- **SSRF 防護** — URL 允許清單阻擋內網 IP 和非 HTTP 協議
- **Chromium 沙箱** — 瀏覽器自動化啟用完整沙箱

### 快速開始

```bash
# 複製專案
git clone https://github.com/RileySun25/RileyMoriarty-Ops-Support-System.git
cd RileyMoriarty-Ops-Support-System

# 安裝依賴
npm install

# 安裝 Playwright 瀏覽器
npx playwright install chromium

# 設定環境變數
cp .env.example .env
# 編輯 .env，填入你的 ANTHROPIC_API_KEY

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)

### 使用方式

#### AI 自動掃描模式
1. 在首頁輸入目標網站的 URL
2. 選擇登入方式（不需登入 / 帳號密碼 / Google OAuth / 手動登入）
3. 設定最大頁面數
4. 點擊「開始產生」，即時觀看進度
5. 完成後點擊「編輯」進入編輯器
6. 點擊「匯出 PDF」產生 A4 格式 PDF

#### 手動建立模式
1. 在首頁選擇「手動建立文件」
2. 輸入文件標題後點擊「建立」
3. 使用「+ 新增區段」新增內容
4. 上傳截圖、撰寫步驟、設定主題
5. 匯出 PDF

## License

MIT
