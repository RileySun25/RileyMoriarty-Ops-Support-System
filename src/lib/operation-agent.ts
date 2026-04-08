import Anthropic from '@anthropic-ai/sdk';
import { Page } from 'playwright';
import { PageCapture, PageElement, DemoOperations } from './types';
import { updateTask, addPageCapture } from './task-manager';
import * as fs from 'fs';
import * as path from 'path';

const client = new Anthropic();

// =============================================
// Types
// =============================================

interface DetectedOperation {
  type: 'create' | 'edit' | 'delete';
  buttonText: string;
  selector: string;
  description: string;
}

interface AgentAction {
  action: 'click' | 'fill' | 'select' | 'done';
  selector?: string;
  value?: string;
  description: string;
}

// =============================================
// Keyword pre-filter (saves API calls)
// =============================================

const OP_KEYWORDS: Record<string, string[]> = {
  create: ['新增', '建立', '新建', '添加', 'Add', 'Create', 'New', '+'],
  edit:   ['編輯', '修改', '更新', 'Edit', 'Modify', 'Update'],
  delete: ['刪除', '移除', '清除', 'Delete', 'Remove'],
};

function pageHasOperationKeywords(elements: PageElement[], wantedTypes: Set<string>): boolean {
  for (const el of elements) {
    if (!el.text) continue;
    for (const type of wantedTypes) {
      const keywords = OP_KEYWORDS[type];
      if (keywords?.some(kw => el.text.includes(kw))) return true;
    }
  }
  return false;
}

// =============================================
// Claude Vision: detect available operations
// =============================================

async function detectOperations(
  screenshotBase64: string,
  elements: PageElement[],
  wantedTypes: Set<string>,
): Promise<DetectedOperation[]> {
  const elementsDesc = elements
    .slice(0, 40)
    .map(el => `- [${el.type}] "${el.text}" (selector: ${el.selector})`)
    .join('\n');

  const wantedLabel = [...wantedTypes].map(t =>
    t === 'create' ? '新增/建立(create)' : t === 'edit' ? '編輯/修改(edit)' : '刪除/移除(delete)'
  ).join('、');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } },
        {
          type: 'text',
          text: `分析這個網頁截圖，找出可執行的操作。只找以下類型：${wantedLabel}

頁面上的互動元素：
${elementsDesc || '（無）'}

以 JSON 格式回覆（僅回傳 JSON）：
{
  "operations": [
    {
      "type": "create" | "edit" | "delete",
      "buttonText": "按鈕上的文字",
      "selector": "CSS selector（從上方元素列表中選取最匹配的）",
      "description": "此操作的簡述"
    }
  ]
}

規則：
- 只列出截圖中明確可見的按鈕
- create: 「新增」「建立」「Add」「Create」等
- edit: 「編輯」「修改」「Edit」等
- delete: 「刪除」「移除」「Delete」等
- 找不到則回傳 {"operations": []}
- 每種 type 最多列 1 個最明顯的`,
        },
      ],
    }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return (parsed.operations || []).filter(
        (op: DetectedOperation) => wantedTypes.has(op.type),
      );
    }
  } catch { /* parse fail */ }
  return [];
}

// =============================================
// Claude Vision: decide next action
// =============================================

async function getNextAction(
  screenshotBase64: string,
  operationType: string,
  stepsSoFar: string[],
  pageElements: string,
): Promise<AgentAction> {
  const stepsDesc = stepsSoFar.length > 0
    ? `已完成的步驟：\n${stepsSoFar.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : '剛點擊了操作按鈕，請看目前畫面';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } },
        {
          type: 'text',
          text: `你正在示範「${operationType}」操作。請看目前的頁面截圖，決定下一步。

${stepsDesc}

頁面元素：
${pageElements}

以 JSON 格式回覆（僅回傳 JSON）：
{
  "action": "click" | "fill" | "select" | "done",
  "selector": "CSS selector",
  "value": "fill/select 時要填入的值",
  "description": "這步在做什麼（中文）"
}

規則：
- click: 點擊按鈕/連結/確認
- fill: 填入文字。value 用合理的測試資料（姓名→「測試用戶」、電話→「0912345678」、Email→「test@example.com」、日期→「2025-01-15」、金額→「100」）
- select: 選擇下拉選項。value 填選項文字
- done: 操作已完成（看到成功訊息、回到列表、或已無後續步驟）
- 一次只回傳一個動作
- 遇到確認對話框就 click 確認按鈕
- 表單必填欄位依序填寫
- 遇到錯誤或卡住就回傳 done`,
        },
      ],
    }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text).join('');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        action: parsed.action || 'done',
        selector: parsed.selector,
        value: parsed.value,
        description: parsed.description || '',
      };
    }
  } catch { /* parse fail */ }
  return { action: 'done', description: '無法判斷下一步' };
}

// =============================================
// Discover current page elements (lightweight)
// =============================================

async function getPageElements(page: Page): Promise<string> {
  return page.evaluate(() => {
    const els: string[] = [];
    document.querySelectorAll(
      'button, [role="button"], a, input:not([type="hidden"]), textarea, select',
    ).forEach(el => {
      const text = (el as HTMLElement).innerText?.trim()
        || el.getAttribute('placeholder')
        || el.getAttribute('aria-label') || '';
      if (!text) return;
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.')
        : '';
      els.push(`- [${tag}] "${text.substring(0, 60)}" (${id || cls || tag})`);
    });
    return els.slice(0, 40).join('\n');
  });
}

// =============================================
// Screenshot helper
// =============================================

async function takeOpScreenshot(
  page: Page,
  screenshotDir: string,
  title: string,
  opIdx: number,
  stepIdx: number,
): Promise<PageCapture | null> {
  try {
    const timestamp = Date.now();
    const filename = `op_${opIdx}_step_${stepIdx}_${timestamp}.png`;
    const screenshotPath = path.join(screenshotDir, filename);
    await page.screenshot({ path: screenshotPath, fullPage: true, type: 'png' });
    const screenshotBase64 = fs.readFileSync(screenshotPath).toString('base64');

    return {
      url: page.url(),
      title,
      screenshotPath: filename,
      screenshotBase64,
      elements: [],
      navigationDepth: 0,
      timestamp,
    };
  } catch {
    return null;
  }
}

// =============================================
// Try to click an element by selector or text
// =============================================

async function tryClick(page: Page, selector?: string, buttonText?: string): Promise<boolean> {
  // Try exact selector first
  if (selector) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click();
        return true;
      }
    } catch { /* try next */ }
  }

  // Fallback: match by text
  if (buttonText) {
    for (const tag of ['button', 'a', '[role="button"]']) {
      try {
        const el = page.locator(`${tag}:has-text("${buttonText}")`).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.click();
          return true;
        }
      } catch { /* try next */ }
    }
  }

  return false;
}

// =============================================
// Execute a single operation flow
// =============================================

const MAX_STEPS = 8;

async function executeOperation(
  page: Page,
  operation: DetectedOperation,
  screenshotDir: string,
  opIdx: number,
): Promise<PageCapture[]> {
  const captures: PageCapture[] = [];
  const stepDescriptions: string[] = [];
  const opLabel = operation.type === 'create' ? '新增'
    : operation.type === 'edit' ? '編輯' : '刪除';

  // Step 0: Capture initial state
  const initCap = await takeOpScreenshot(
    page, screenshotDir, `[操作示範] ${opLabel} - 起始畫面`, opIdx, 0,
  );
  if (initCap) captures.push(initCap);

  // Click the operation button
  const clicked = await tryClick(page, operation.selector, operation.buttonText);
  if (!clicked) {
    console.warn(`Operation agent: could not click "${operation.buttonText}"`);
    return captures;
  }

  await page.waitForTimeout(1500);
  stepDescriptions.push(`點擊【${operation.buttonText}】`);

  // Capture after clicking
  const clickCap = await takeOpScreenshot(
    page, screenshotDir, `[操作示範] ${opLabel} - 點擊${operation.buttonText}後`, opIdx, 1,
  );
  if (clickCap) captures.push(clickCap);

  // AI agent loop
  for (let step = 2; step < MAX_STEPS + 2; step++) {
    try {
      // Get current state
      const tmpPath = path.join(screenshotDir, `op_${opIdx}_tmp.png`);
      await page.screenshot({ path: tmpPath, fullPage: true, type: 'png' });
      const base64 = fs.readFileSync(tmpPath).toString('base64');
      fs.unlinkSync(tmpPath);

      const elements = await getPageElements(page);
      const nextAction = await getNextAction(base64, opLabel, stepDescriptions, elements);

      if (nextAction.action === 'done') {
        const doneCap = await takeOpScreenshot(
          page, screenshotDir, `[操作示範] ${opLabel} - 完成`, opIdx, step,
        );
        if (doneCap) captures.push(doneCap);
        break;
      }

      // Execute action
      let actionOk = false;
      if (nextAction.action === 'click') {
        actionOk = await tryClick(page, nextAction.selector);
      } else if (nextAction.action === 'fill' && nextAction.selector && nextAction.value) {
        try {
          const el = page.locator(nextAction.selector).first();
          if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
            await el.fill(nextAction.value);
            actionOk = true;
          }
        } catch { /* skip */ }
      } else if (nextAction.action === 'select' && nextAction.selector && nextAction.value) {
        try {
          const el = page.locator(nextAction.selector).first();
          if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
            await el.selectOption({ label: nextAction.value }).catch(async () => {
              // Fallback: try by value
              await el.selectOption(nextAction.value!).catch(() => {});
            });
            actionOk = true;
          }
        } catch { /* skip */ }
      }

      await page.waitForTimeout(1000);
      stepDescriptions.push(nextAction.description);

      // Capture this step (even if action failed — shows current state)
      const stepCap = await takeOpScreenshot(
        page, screenshotDir,
        `[操作示範] ${opLabel} - ${nextAction.description}`,
        opIdx, step,
      );
      if (stepCap) captures.push(stepCap);

      // If action failed, stop the loop
      if (!actionOk) {
        console.warn(`Operation agent: action failed at step ${step}`);
        break;
      }

      // Rate limit between Claude calls
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`Operation agent step ${step} error:`, e);
      break;
    }
  }

  return captures;
}

// =============================================
// Main entry point
// =============================================

export async function demonstrateOperations(
  taskId: string,
  page: Page,
  captures: PageCapture[],
  demoOps: DemoOperations,
  screenshotDir: string,
): Promise<PageCapture[]> {
  const wantedTypes = new Set<string>();
  if (demoOps.create) wantedTypes.add('create');
  if (demoOps.edit) wantedTypes.add('edit');
  if (demoOps.delete) wantedTypes.add('delete');
  if (wantedTypes.size === 0) return [];

  const allDemoCaptures: PageCapture[] = [];

  // Phase A: keyword pre-filter — find pages that likely have matching operations
  const candidates = captures.filter(
    c => c.screenshotBase64 && pageHasOperationKeywords(c.elements, wantedTypes),
  );

  if (candidates.length === 0) {
    console.log('Operation agent: no pages with matching keywords found');
    return [];
  }

  // Limit detection to first 8 candidate pages to control API cost
  const toDetect = candidates.slice(0, 8);

  // Phase B: Claude Vision detection on candidates
  const pagesWithOps: { capture: PageCapture; operations: DetectedOperation[] }[] = [];

  for (let i = 0; i < toDetect.length; i++) {
    const capture = toDetect[i];
    updateTask(taskId, {
      currentStep: `偵測可示範的操作 (${i + 1}/${toDetect.length}): ${capture.title}`,
      progress: 46 + Math.round((i / toDetect.length) * 2),
    });

    try {
      const detected = await detectOperations(capture.screenshotBase64!, capture.elements, wantedTypes);
      if (detected.length > 0) {
        pagesWithOps.push({ capture, operations: detected });
      }
    } catch (e) {
      console.error(`Operation detect failed on ${capture.url}:`, e);
    }

    await new Promise(r => setTimeout(r, 800));
  }

  if (pagesWithOps.length === 0) {
    console.log('Operation agent: no operations detected by AI');
    return [];
  }

  // Phase C: execute operations (limit to 5 total operations)
  let opIndex = 0;
  const maxTotalOps = 5;

  for (const { capture, operations } of pagesWithOps) {
    for (const operation of operations) {
      if (opIndex >= maxTotalOps) break;

      const opLabel = operation.type === 'create' ? '新增'
        : operation.type === 'edit' ? '編輯' : '刪除';

      updateTask(taskId, {
        currentStep: `示範操作: ${capture.title} - ${opLabel}`,
        progress: 48 + Math.round((opIndex / maxTotalOps) * 2),
      });

      try {
        // Navigate to the page
        await page.goto(capture.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500);

        // Execute operation
        const demoCaptures = await executeOperation(page, operation, screenshotDir, opIndex);

        for (const dc of demoCaptures) {
          allDemoCaptures.push(dc);
          addPageCapture(taskId, dc);
        }

        opIndex++;
      } catch (e) {
        console.error(`Operation demo failed (${operation.type} on ${capture.url}):`, e);
      }

      // Navigate back to the page for next operation
      try {
        await page.goto(capture.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);
      } catch { /* skip */ }
    }

    if (opIndex >= maxTotalOps) break;
  }

  return allDemoCaptures;
}
