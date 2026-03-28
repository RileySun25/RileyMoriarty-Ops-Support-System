### 寫在最前面

會有這個工具系統化的起點，主要是今年迎來升職，但職務內容也隨之增加，但在補足人力之前目前部門人少，我受夠了製作流程SOP或是各項產品說明、教學手冊，都要截圖複製來複製去。
即便AI工具很發達，但必須承認的是在製作教學文件或是流程說明文件這種東西，很仰賴的是初次的版本。通常都需要有初版，才能再利用AI工具讓他優化變更美或是排版升級。
但真心話是製作第一版的流程教學說明真的很麻煩xd 你要截圖、把圖複製到文件上，再寫上說明，這繁瑣的流程，我相信沒有一個人想做第二次。

所以從登入系統、截圖、瀏覽網頁、產生文件、彈性的客製化設定，整個流程都讓AI幫你做第一次，
有了第一版之後，就方便許多可以直接調整，可以裁切截圖、可以新增描述等等。
在我的工作上對我製作這些檔案節省了很多時間，也美化許多。

本來是在地端運行而已，但今天剛好與朋友去寫論文，
跟朋友分享了我開發的工具，朋友驚呼也太方便xd
所以我就回來請Claude Code幫我整理一份適合公開的版本做成開源工具。
希望可以協助到那些也跟我一樣懶得做產品說明、系統教學文件的人哈哈哈哈哈哈哈哈

另外，這工具的起點還有後續的優化，全部想法都是來自我，
但所有的開發、前端後端、還有推上git甚至是寫這份說明readme的都是Claude Code與我協作的，感謝它。。

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

**Everything runs locally.** No files leave your machine (except the Claude API calls for screenshot analysis). No SaaS. No cloud storage. Your documents stay yours.

## Features

- **Automated Crawling** — Playwright Chromium auto-login (credentials / Google OAuth / manual), BFS page discovery up to 3 levels deep
- **AI Analysis** — Claude Vision analyzes each screenshot, generating structured steps with UI element references
- **Built-in Editor** — Edit all text, reorder sections & steps, crop/replace screenshots, drag-and-drop
- **Theme Customization** — 6 color presets + custom colors, text or image watermarks with adjustable opacity
- **Cover Page Config** — Document name, subtitle, author, department, version — all customizable
- **PDF Export** — One-click print-to-PDF with clean A4 layout, page breaks, and watermarks
- **History Management** — Browse, edit, or delete previously generated documents
- **Real-time Progress** — SSE live updates with 3-layer reconnection fallback
- **Fully Local** — Self-hosted, no external file transfers, data stays on your machine

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

1. **Enter target URL** on the home page
2. **Choose login method** — None / Username-Password / Google OAuth / Manual login
3. **Set max pages** (default: 50)
4. **Click "Start"** — watch real-time progress as the system crawls and analyzes
5. **Edit** — click "Edit" to open the built-in editor, adjust text, reorder sections, crop images
6. **Export** — click "Export PDF" to generate a print-ready A4 document

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

**完全本地執行。** 除了 Claude API 分析截圖外，所有檔案都不會離開你的電腦。沒有 SaaS、沒有雲端儲存，文件完全屬於你。

### 功能特色

- **自動爬取** — Playwright Chromium 自動登入（帳密 / Google OAuth / 手動），BFS 探索最深 3 層
- **AI 分析** — Claude Vision 分析每張截圖，產生結構化步驟與 UI 元素標註
- **內建編輯器** — 編輯所有文字、排序區段與步驟、裁切/更換截圖、拖拉排序
- **主題自訂** — 6 組預設配色 + 自訂色彩，文字或圖片浮水印，透明度可調
- **封面設定** — 文件名稱、副標題、製作人、部門、版本號，全部可自訂
- **PDF 匯出** — 一鍵匯出 A4 格式 PDF，含分頁、浮水印
- **歷史管理** — 瀏覽、編輯或刪除已產生的文件
- **即時進度** — SSE 即時推送，三層斷線重連機制
- **完全本地** — 自架部署，無外部檔案傳輸，資料留在你的電腦

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

### 正式部署

```bash
npm run build
npm start
```

### 使用方式

1. 在首頁輸入目標網站的 URL
2. 選擇登入方式（不需登入 / 帳號密碼 / Google OAuth / 手動登入）
3. 設定最大頁面數
4. 點擊「開始產生」，即時觀看進度
5. 完成後點擊「編輯」進入編輯器，調整文字、順序、截圖
6. 點擊「匯出 PDF」產生 A4 格式 PDF

## License

MIT
