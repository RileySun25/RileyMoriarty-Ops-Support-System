import Link from 'next/link';

export const metadata = {
  title: '使用指南 - RileyMoriarty Ops Support System',
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-xl">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wide">使用指南</h1>
            <p className="mt-2 text-blue-200 text-sm">RileyMoriarty Ops Support System 完整操作說明</p>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Quick Start */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">快速開始</h2>
          <p className="text-slate-500 mb-6">只需三步驟，即可自動產生專業的系統操作說明文件。</p>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: '輸入網址與登入資訊',
                desc: '在首頁填入目標系統的網址，若需要登入則提供帳號密碼。',
              },
              {
                step: '2',
                title: '等待自動處理',
                desc: '系統自動瀏覽網站、擷取截圖、AI 分析每個功能畫面。',
              },
              {
                step: '3',
                title: '檢視與下載文件',
                desc: '處理完成後，可直接線上瀏覽或下載 SOP 文件。',
              },
            ].map((item) => (
              <div key={item.step} className="relative pl-12">
                <div className="absolute left-0 top-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prerequisites */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">環境準備</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">1. 系統需求</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span><strong>Node.js 18 以上</strong> — 執行伺服器端邏輯與瀏覽器自動化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span><strong>Anthropic API Key</strong> — 用於 Claude AI 分析截圖內容（需至 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">console.anthropic.com</code> 取得）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span><strong>穩定的網路連線</strong> — 系統需要連線至目標網站與 Claude API</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">2. 安裝步驟</h3>
              <div className="space-y-3">
                {[
                  { label: '安裝專案依賴套件', cmd: 'npm install' },
                  { label: '安裝 Playwright 瀏覽器引擎', cmd: 'npm run setup' },
                  { label: '複製環境變數範本', cmd: 'cp .env.example .env' },
                  { label: '編輯 .env 填入 API Key', cmd: 'ANTHROPIC_API_KEY=sk-ant-your-key-here' },
                  { label: '啟動開發伺服器', cmd: 'npm run dev' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-600 text-sm w-48 flex-shrink-0">{item.label}</span>
                    <code className="bg-slate-900 text-green-400 px-4 py-2 rounded-lg text-sm font-mono flex-1">
                      {item.cmd}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Usage */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">詳細操作說明</h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">1</span>
                <h3 className="text-lg font-semibold text-slate-800">設定目標網站</h3>
              </div>
              <div className="pl-11 space-y-3">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-700 mb-2">網站 URL</h4>
                  <p className="text-sm text-slate-600">
                    輸入您想要產生操作說明的系統或產品的完整網址。
                    例如：<code className="bg-white px-2 py-0.5 rounded border text-sm">https://your-system.example.com</code>
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    系統會以此 URL 作為起點，自動探索同網域下的所有可到達頁面。
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-700 mb-2">最大頁面數</h4>
                  <p className="text-sm text-slate-600">
                    控制系統最多擷取多少個頁面。預設為 <strong>30 頁</strong>，最多可設定 100 頁。
                    頁面越多，產生時間越長、AI 分析費用也越高。建議先以較少頁面測試，確認效果後再增加。
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-700 mb-2">文件語言</h4>
                  <p className="text-sm text-slate-600">
                    選擇產生文件的語言。支援<strong>繁體中文</strong>、簡體中文、English。
                    AI 會依據選擇的語言撰寫所有操作說明內容。
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">2</span>
                <h3 className="text-lg font-semibold text-slate-800">設定登入方式</h3>
              </div>
              <div className="pl-11 space-y-3">
                <p className="text-sm text-slate-600">
                  系統提供三種登入模式，依據目標網站的需求選擇：
                </p>

                <div className="grid gap-3">
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <h4 className="font-medium text-slate-700">不需登入（公開網站）</h4>
                    </div>
                    <p className="text-sm text-slate-500 pl-4">
                      適用於不需要登入即可瀏覽的公開網站。系統會直接開始擷取頁面。
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      <h4 className="font-medium text-slate-700">帳號密碼（表單登入）</h4>
                    </div>
                    <p className="text-sm text-slate-500 pl-4">
                      適用於有傳統登入表單的網站。系統會自動偵測頁面上的帳號密碼欄位並填入。
                      支援大多數標準登入表單，包含各種欄位名稱（username、email、account 等）。
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full" />
                      <h4 className="font-medium text-slate-700">Google 登入（OAuth）</h4>
                    </div>
                    <p className="text-sm text-slate-500 pl-4">
                      適用於使用「以 Google 帳號登入」的網站。系統會自動點擊 Google 登入按鈕並輸入帳密。
                    </p>
                    <div className="mt-2 ml-4 bg-amber-50 border border-amber-200 rounded p-3">
                      <p className="text-xs text-amber-700">
                        <strong>注意：</strong>Google 有嚴格的自動化偵測機制，可能會要求手機驗證或 CAPTCHA。
                        若 Google 登入失敗，建議改用目標系統本身提供的帳號密碼登入方式。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">3</span>
                <h3 className="text-lg font-semibold text-slate-800">開始產生</h3>
              </div>
              <div className="pl-11 space-y-3">
                <p className="text-sm text-slate-600">
                  點擊「開始產生 SOP 文件」按鈕後，系統會依序進行以下步驟：
                </p>
                <div className="space-y-2">
                  {[
                    { phase: '啟動瀏覽器', desc: '開啟無頭瀏覽器（Chromium）並載入目標網站', pct: '0-5%' },
                    { phase: '自動登入', desc: '根據設定的登入方式自動完成身份驗證', pct: '5-15%' },
                    { phase: '探索頁面', desc: '從首頁出發，自動發現並瀏覽所有可到達的頁面（最深 3 層）', pct: '15-45%' },
                    { phase: '擷取互動', desc: '自動嘗試展開下拉選單、切換分頁標籤等互動元素', pct: '45-50%' },
                    { phase: 'AI 分析', desc: '將每張截圖送給 Claude AI，產生功能描述與操作步驟', pct: '50-80%' },
                    { phase: '產生文件', desc: '將分析結果組合成含目錄、截圖、步驟的完整 HTML 文件', pct: '80-100%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
                      <code className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono flex-shrink-0 mt-0.5">
                        {item.pct}
                      </code>
                      <div>
                        <span className="font-medium text-slate-700 text-sm">{item.phase}</span>
                        <span className="text-slate-400 mx-2">—</span>
                        <span className="text-sm text-slate-500">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  整個過程的時間取決於目標網站的頁面數量和複雜度，通常介於 2 至 15 分鐘。
                  進度條會即時顯示目前狀態。
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">4</span>
                <h3 className="text-lg font-semibold text-slate-800">檢視與下載結果</h3>
              </div>
              <div className="pl-11 space-y-3">
                <p className="text-sm text-slate-600">產生完成後，您可以：</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-1">瀏覽 SOP 文件</h4>
                    <p className="text-sm text-blue-600">
                      在新分頁中開啟產生的 HTML 文件，可直接線上閱覽，也可以使用瀏覽器的列印功能另存為 PDF。
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="font-medium text-slate-700 mb-1">下載 JSON 資料</h4>
                    <p className="text-sm text-slate-500">
                      下載結構化 JSON 資料，包含所有分析結果，可供進一步處理或整合至其他系統。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Output Document Structure */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">產出文件說明</h2>
          <p className="text-slate-600 mb-4">
            系統產生的 SOP 文件包含以下內容結構：
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">目錄</h3>
                <p className="text-sm text-slate-500">依功能分類自動產生的目錄，含可點擊的錨點連結。</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">功能截圖</h3>
                <p className="text-sm text-slate-500">每個功能頁面的完整畫面截圖，讓讀者能清楚看到實際操作介面。</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">操作步驟</h3>
                <p className="text-sm text-slate-500">AI 自動辨識的操作步驟，含編號、動作說明，以及對應的 UI 元素標示。</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-slate-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">小提示與注意事項</h3>
                <p className="text-sm text-slate-500">AI 針對每個功能提供的使用建議和重要注意事項，幫助使用者避免常見問題。</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tips & Troubleshooting */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">常見問題與建議</h2>

          <div className="space-y-4">
            {[
              {
                q: '產生過程中斷或失敗怎麼辦？',
                a: '請檢查網路連線是否穩定、目標網站是否可正常存取。若登入失敗，嘗試切換登入方式。您可以隨時回到首頁重新嘗試。',
              },
              {
                q: 'Google 登入失敗？',
                a: 'Google 對自動化登入有嚴格的安全偵測（CAPTCHA、手機驗證等）。建議優先使用目標系統自身的帳號密碼登入，或先在系統上建立一個本地帳號。',
              },
              {
                q: '頁面擷取不完整？',
                a: '部分使用 JavaScript 動態載入的頁面（如 SPA 單頁應用程式）可能需要較長的等待時間。系統已內建等待機制，但極度複雜的網頁可能無法完全擷取。可嘗試增加頁面數上限。',
              },
              {
                q: '如何產生 PDF？',
                a: '在瀏覽 SOP 文件的頁面中，使用瀏覽器的「列印」功能（Ctrl+P / Cmd+P），選擇「另存為 PDF」即可。文件已針對列印版面進行最佳化。',
              },
              {
                q: 'API 費用如何？',
                a: '每個頁面需要呼叫一次 Claude API（含圖片分析）。以 30 頁計算，約消耗 Claude API 數千 token。請參考 Anthropic 官方定價。',
              },
              {
                q: '支援哪些類型的網站？',
                a: '支援大多數標準的 Web 應用程式，包括傳統多頁式網站、後台管理系統、SaaS 產品。對於大量使用 iframe 或 Shadow DOM 的網站，擷取效果可能有限。',
              },
            ].map((item, i) => (
              <details key={i} className="group border border-slate-200 rounded-lg">
                <summary className="flex items-center justify-between cursor-pointer p-4 hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-700">{item.q}</span>
                  <svg
                    className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Environment Variables */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">環境變數設定</h2>
          <p className="text-slate-600 mb-4">
            在 <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">.env</code> 檔案中可設定以下參數：
          </p>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b">變數名稱</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b">說明</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b">預設值</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 border-b">必填</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b">
                  <td className="px-4 py-3"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code></td>
                  <td className="px-4 py-3">Anthropic API 金鑰</td>
                  <td className="px-4 py-3 text-slate-400">-</td>
                  <td className="px-4 py-3"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">必填</span></td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">MAX_PAGES</code></td>
                  <td className="px-4 py-3">系統允許的最大擷取頁面數量上限</td>
                  <td className="px-4 py-3">50</td>
                  <td className="px-4 py-3"><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">選填</span></td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">SCREENSHOT_QUALITY</code></td>
                  <td className="px-4 py-3">截圖品質（1-100）</td>
                  <td className="px-4 py-3">80</td>
                  <td className="px-4 py-3"><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">選填</span></td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">CRAWL_TIMEOUT</code></td>
                  <td className="px-4 py-3">單頁瀏覽逾時時間（毫秒）</td>
                  <td className="px-4 py-3">120000</td>
                  <td className="px-4 py-3"><span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">選填</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Architecture Overview */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">系統架構</h2>
          <p className="text-slate-600 mb-6">本系統由以下核心模組構成：</p>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: '瀏覽器自動化引擎',
                tech: 'Playwright + Chromium',
                desc: '負責自動登入、頁面探索、截圖擷取和互動元素偵測。',
                color: 'blue',
              },
              {
                title: 'AI 分析引擎',
                tech: 'Claude API (Vision)',
                desc: '接收截圖後，辨識功能用途並自動撰寫操作步驟與說明。',
                color: 'purple',
              },
              {
                title: '文件產生器',
                tech: 'HTML + CSS',
                desc: '將 AI 分析結果組合成含目錄、截圖、步驟的精美 HTML 文件。',
                color: 'green',
              },
              {
                title: '即時進度系統',
                tech: 'Server-Sent Events',
                desc: '透過 SSE 串流即時回報處理進度，讓使用者隨時掌握狀態。',
                color: 'amber',
              },
            ].map((item) => (
              <div key={item.title} className={`border border-${item.color}-200 bg-${item.color}-50/30 rounded-lg p-5`}>
                <h3 className="font-semibold text-slate-800">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{item.tech}</p>
                <p className="text-sm text-slate-600 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-slate-900 rounded-lg p-5 text-sm font-mono text-slate-300">
            <p className="text-slate-500 mb-2"># 處理流程</p>
            <p>使用者輸入 URL + 登入資訊</p>
            <p className="text-slate-500">  |</p>
            <p>  Playwright 啟動 Chromium → 自動登入 → 探索頁面 → 擷取截圖</p>
            <p className="text-slate-500">  |</p>
            <p>  Claude AI 分析每張截圖 → 產生功能說明與操作步驟</p>
            <p className="text-slate-500">  |</p>
            <p>  文件產生器組合 → 輸出 HTML SOP 文件</p>
          </div>
        </section>

        {/* File Structure */}
        <section className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">輸出檔案結構</h2>
          <div className="bg-slate-900 rounded-lg p-5 text-sm font-mono text-slate-300">
            <p>output/&lt;task-id&gt;/</p>
            <p>├── <span className="text-green-400">index.html</span>      <span className="text-slate-500"># 完整 SOP 文件（可直接用瀏覽器開啟）</span></p>
            <p>├── <span className="text-blue-400">data.json</span>       <span className="text-slate-500"># 結構化 JSON 資料（供程式處理）</span></p>
            <p>└── <span className="text-amber-400">images/</span>         <span className="text-slate-500"># 頁面截圖資料夾</span></p>
            <p>    ├── page_001.png</p>
            <p>    ├── page_002.png</p>
            <p>    └── ...</p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-4 pb-8">
          <Link
            href="/"
            className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all text-lg"
          >
            開始產生 SOP 文件
          </Link>
        </div>
      </main>
    </div>
  );
}
