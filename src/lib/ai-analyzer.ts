import Anthropic from '@anthropic-ai/sdk';
import { PageCapture, AIAnalysis } from './types';
import { updateTask, addAnalysis } from './task-manager';

const client = new Anthropic();

export async function analyzePages(taskId: string, pages: PageCapture[], language: string = 'zh-TW'): Promise<AIAnalysis[]> {
  const analyses: AIAnalysis[] = [];
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    updateTask(taskId, {
      currentStep: `正在用 AI 分析頁面 ${i + 1}/${total}: ${page.title}`,
      progress: 50 + Math.round((i / total) * 30),
    });

    try {
      const analysis = await analyzeSinglePage(page, language);
      analyses.push(analysis);
      addAnalysis(taskId, analysis);
    } catch (error) {
      console.error(`Failed to analyze page ${page.url}:`, error);
      // Create a basic analysis as fallback
      analyses.push({
        pageTitle: page.title,
        pageDescription: `${page.title} 頁面`,
        functionCategory: '一般功能',
        steps: [],
        tips: [],
        warnings: [],
      });
    }

    // Rate limiting: wait between API calls
    if (i < pages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return analyses;
}

async function analyzeSinglePage(page: PageCapture, language: string): Promise<AIAnalysis> {
  const langMap: Record<string, string> = {
    'zh-TW': '繁體中文',
    'zh-CN': '简体中文',
    'en': 'English',
  };
  const langName = langMap[language] || '繁體中文';

  const elementsDescription = page.elements
    .slice(0, 30)
    .map(el => `- [${el.type}] ${el.text}`)
    .join('\n');

  const prompt = `你是一位專業的系統操作手冊撰寫人員。請分析這個網頁截圖，並以${langName}撰寫該頁面的操作說明。

撰寫風格參考（請嚴格遵守）：
- 步驟用 A、B、C、D 等字母標記
- 提及按鈕或 UI 元素時用【】括號標注，例如：點選【登入】、輸入【帳號】欄位
- 備註用 ※ 開頭
- 語氣簡潔直白，適合一般大眾閱讀
- 描述要根據截圖中實際看到的內容，不要臆測

網頁資訊：
- URL: ${page.url}
- 標題: ${page.title}
- 頁面上的互動元素：
${elementsDescription || '（未偵測到具體元素）'}

請以以下 JSON 格式回覆（不要加任何其他文字，僅回傳 JSON）：

{
  "pageTitle": "此頁面的功能名稱（簡短，例如：點數查詢、慢籤管理、儀表板）",
  "pageDescription": "此頁面的用途說明（1-2句話，簡潔描述此功能做什麼）",
  "functionCategory": "功能分類（例如：註冊與登入、會員功能、管理者功能、系統設定、資料查詢、報表等）",
  "steps": [
    {
      "stepNumber": 1,
      "action": "操作描述（例如：點選【按鈕名稱】）",
      "description": "補充說明（可為空字串）",
      "elementRef": "相關 UI 元素名稱（按鈕、連結、欄位名稱）"
    }
  ],
  "tips": ["使用提示，用 ※ 風格，例如：此功能需先完成會員註冊才可使用"],
  "warnings": ["注意事項，例如：帳號一經刪除無法復原"]
}

要求：
1. 步驟要具體且易於理解
2. elementRef 填入按鈕或欄位的實際名稱文字
3. action 中要用【】標注 UI 元素名稱
4. 不要超過 8 個步驟
5. 如果是登入頁面，說明完整登入流程
6. 如果是表單頁面，說明每個欄位的用途`;

  const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: page.screenshotBase64 || '',
      },
    },
    {
      type: 'text',
      text: prompt,
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: messageContent,
      },
    ],
  });

  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        pageTitle: parsed.pageTitle || page.title,
        pageDescription: parsed.pageDescription || '',
        functionCategory: parsed.functionCategory || '一般功能',
        steps: (parsed.steps || []).map((s: Record<string, unknown>, idx: number) => ({
          stepNumber: s.stepNumber || idx + 1,
          action: s.action || '',
          description: s.description || '',
          elementRef: s.elementRef || '',
        })),
        tips: parsed.tips || [],
        warnings: parsed.warnings || [],
      };
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
  }

  return {
    pageTitle: page.title,
    pageDescription: responseText.substring(0, 200),
    functionCategory: '一般功能',
    steps: [],
    tips: [],
    warnings: [],
  };
}

export async function generateDocumentTitle(url: string, pages: PageCapture[]): Promise<string> {
  try {
    const pageTitles = pages.slice(0, 10).map(p => p.title).join(', ');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `根據以下網站資訊，產生一個簡短的繁體中文系統操作手冊標題（只回傳標題文字，不要加其他內容）：

網站 URL: ${url}
頁面標題: ${pageTitles}

格式範例：「○○○系統 操作手冊」`,
        },
      ],
    });

    const title = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')
      .replace(/[「」《》]/g, '')
      .trim();

    return title || `${new URL(url).hostname} 系統操作手冊`;
  } catch {
    return `${new URL(url).hostname} 系統操作手冊`;
  }
}
