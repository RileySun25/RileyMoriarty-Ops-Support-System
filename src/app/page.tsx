'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type AuthMethod = 'none' | 'credentials' | 'gmail' | 'manual';
type TaskStatus = 'idle' | 'running' | 'completed' | 'error';

interface ProgressData {
  status: string;
  progress: number;
  currentStep: string;
  totalPages: number;
  processedPages: number;
  error?: string;
  resultPath?: string;
}

interface HistoryItem {
  id: string;
  title: string;
  sourceUrl: string;
  generatedAt: string;
  sectionCount: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [maxPages, setMaxPages] = useState(30);
  const [language, setLanguage] = useState('zh-TW');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle');
  const [taskId, setTaskId] = useState('');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => { setHistory(data); setLoadingHistory(false); })
      .catch(() => setLoadingHistory(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTaskStatus('running');
    setProgress(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          authMethod,
          username: authMethod !== 'none' ? username : undefined,
          password: authMethod !== 'none' ? password : undefined,
          maxPages,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '發生錯誤');
        setTaskStatus('error');
        return;
      }

      setTaskId(data.taskId);
      listenToProgress(data.taskId);
    } catch {
      setError('無法連線到伺服器');
      setTaskStatus('error');
    }
  }

  function listenToProgress(id: string) {
    let settled = false;
    const eventSource = new EventSource(`/api/status/${id}`);

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        setProgress(data);

        if (data.status === 'completed') {
          settled = true;
          setTaskStatus('completed');
          eventSource.close();
        } else if (data.status === 'error') {
          settled = true;
          setError(data.error || '產生過程中發生錯誤');
          setTaskStatus('error');
          eventSource.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (settled) return;

      setTimeout(() => {
        if (settled) return;
        const retry = new EventSource(`/api/status/${id}`);
        retry.onmessage = (event) => {
          try {
            const data: ProgressData = JSON.parse(event.data);
            setProgress(data);
            if (data.status === 'completed') {
              settled = true;
              setTaskStatus('completed');
              retry.close();
            } else if (data.status === 'error') {
              settled = true;
              setError(data.error || '產生過程中發生錯誤');
              setTaskStatus('error');
              retry.close();
            }
          } catch {}
        };
        retry.onerror = () => {
          retry.close();
          if (!settled) {
            fetch(`/api/download/${id}?format=html`, { method: 'HEAD' }).then(res => {
              if (res.ok) {
                settled = true;
                setTaskStatus('completed');
                setProgress(prev => prev ? { ...prev, status: 'completed', progress: 100, currentStep: '完成！' } : null);
              } else {
                setError('與伺服器的連線中斷，請重新嘗試');
                setTaskStatus('error');
              }
            }).catch(() => {
              setError('與伺服器的連線中斷，請重新嘗試');
              setTaskStatus('error');
            });
          }
        };
      }, 2000);
    };
  }

  function handleReset() {
    setTaskStatus('idle');
    setTaskId('');
    setProgress(null);
    setError('');
    // Refresh history
    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => {});
  }

  function deleteHistory(histId: string) {
    if (!confirm('確定要刪除此歷史文件？')) return;
    fetch(`/api/history/${histId}`, { method: 'DELETE' })
      .then(() => setHistory(prev => prev.filter(h => h.id !== histId)))
      .catch(() => {});
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-xl">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wide">RileyMoriarty Ops Support System</h1>
            <p className="mt-2 text-blue-200 text-sm">
              輸入目標網站 URL，自動瀏覽、擷取畫面、產生完整操作說明文件
            </p>
          </div>
          <Link
            href="/guide"
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            使用指南
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {taskStatus === 'idle' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* URL Input */}
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-slate-800 mb-6">目標網站設定</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      網站 URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    />
                    <p className="mt-1 text-sm text-slate-500">
                      請輸入要產生操作說明的系統或產品網址
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        最大頁面數
                      </label>
                      <input
                        type="number"
                        value={maxPages}
                        onChange={(e) => setMaxPages(parseInt(e.target.value) || 30)}
                        min={1}
                        max={100}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        文件語言
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="zh-TW">繁體中文</option>
                        <option value="zh-CN">簡體中文</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auth Settings */}
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-slate-800 mb-6">登入設定</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'none', label: '不需登入', desc: '公開網站，無需身份驗證' },
                      { value: 'credentials', label: '帳號密碼', desc: '自動填入表單登入' },
                      { value: 'gmail', label: 'Google 登入', desc: '自動填入 Gmail，2FA 需手動完成' },
                      { value: 'manual', label: '手動登入', desc: '開啟瀏覽器，您自行完成登入' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAuthMethod(option.value as AuthMethod)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          authMethod === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium text-slate-800">{option.label}</div>
                        <div className="text-sm text-slate-500">{option.desc}</div>
                      </button>
                    ))}
                  </div>

                  {(authMethod === 'credentials' || authMethod === 'gmail') && (
                    <div className="grid grid-cols-2 gap-4 mt-4 animate-fade-in">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {authMethod === 'gmail' ? 'Gmail 帳號' : '帳號 / Email'}
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder={authMethod === 'gmail' ? 'user@gmail.com' : '帳號或 Email'}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">密碼</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="密碼"
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      {authMethod === 'gmail' && (
                        <p className="col-span-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                          系統會自動填入您的 Gmail 帳號密碼。若帳號有開啟兩步驟驗證（2FA），系統會開啟瀏覽器視窗等待您手動完成驗證，之後自動繼續。
                        </p>
                      )}
                    </div>
                  )}

                  {authMethod === 'manual' && (
                    <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg mt-4 animate-fade-in">
                      系統會開啟一個瀏覽器視窗並導航至目標網站的登入頁面。請在該視窗中自行完成登入（支援任何登入方式，包括 2FA、LINE、Google 等），登入成功後系統會自動偵測並開始擷取。
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  className="px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all text-lg"
                >
                  開始產生 SOP 文件
                </button>
              </div>
            </form>

            {/* How it works */}
            <div className="mt-12 grid grid-cols-4 gap-6">
              {[
                { step: '1', title: '輸入網址', desc: '填入目標系統的 URL 和登入資訊' },
                { step: '2', title: '自動瀏覽', desc: '系統自動登入並瀏覽每一個功能頁面' },
                { step: '3', title: 'AI 分析', desc: 'Claude AI 分析截圖，辨識功能並撰寫說明' },
                { step: '4', title: '編輯匯出', desc: '線上編輯調整內容，匯出 PDF 文件' },
              ].map((item) => (
                <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm text-center">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-slate-800">{item.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* History */}
            {!loadingHistory && history.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">歷史文件</h2>
                <div className="space-y-3">
                  {history.map(item => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 truncate">{item.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          <span>{item.generatedAt}</span>
                          <span>{item.sectionCount} 個章節</span>
                          <span className="truncate">{item.sourceUrl}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <Link
                          href={`/editor/${item.id}`}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          編輯
                        </Link>
                        <a
                          href={`/api/download/${item.id}?format=html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          瀏覽
                        </a>
                        <button
                          onClick={() => deleteHistory(item.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="刪除"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Progress View */}
        {taskStatus === 'running' && progress && (
          <div className="bg-white rounded-xl shadow-sm p-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">正在產生文件</h2>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>{progress.currentStep}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.processedPages}</div>
                <div className="text-sm text-slate-500">已擷取頁面</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.totalPages || '-'}</div>
                <div className="text-sm text-slate-500">總頁面數</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {progress.status === 'waiting_login' ? '等待登入' :
                   progress.status === 'crawling' ? '瀏覽中' :
                   progress.status === 'analyzing' ? '分析中' :
                   progress.status === 'generating' ? '產生中' : progress.status}
                </div>
                <div className="text-sm text-slate-500">目前狀態</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {taskStatus === 'running' && !progress && (
          <div className="bg-white rounded-xl shadow-sm p-8 animate-fade-in text-center">
            <div className="flex items-center justify-center gap-1 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-slate-600">正在啟動，請稍候...</p>
          </div>
        )}

        {/* Completed View */}
        {taskStatus === 'completed' && (
          <div className="bg-white rounded-xl shadow-sm p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">SOP 文件產生完成！</h2>
              <p className="text-slate-500 mt-2">
                已成功擷取 {progress?.processedPages || 0} 個頁面並產生操作說明文件
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href={`/editor/${taskId}`}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                編輯文件
              </Link>
              <a
                href={`/api/download/${taskId}?format=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
              >
                瀏覽原始文件
              </a>
              <button
                onClick={handleReset}
                className="px-8 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                產生新文件
              </button>
            </div>
          </div>
        )}

        {/* Error View */}
        {taskStatus === 'error' && (
          <div className="bg-white rounded-xl shadow-sm p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800">產生失敗</h2>
              <p className="text-red-600 mt-2">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors"
              >
                重新嘗試
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
