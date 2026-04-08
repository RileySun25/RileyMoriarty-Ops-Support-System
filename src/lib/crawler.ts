import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { GenerateRequest, PageCapture, PageElement } from './types';
import { updateTask, addPageCapture } from './task-manager';
import { demonstrateOperations } from './operation-agent';
import { isUrlSafe } from './validation';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');
const CRAWL_TIMEOUT = parseInt(process.env.CRAWL_TIMEOUT || '120000');
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '50');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Safely navigate with progressive loading strategy */
async function safeGoto(page: Page, url: string, timeout = 30000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

/** Dismiss common overlay modals (privacy, cookie, etc.) */
async function dismissModals(page: Page) {
  // Specific: privacy modal with checkbox + confirm (e.g. pharmacyPrivacyAccepted)
  try {
    const checkbox = page.locator('#agreeCheckbox');
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      const modalBody = page.locator('.modal-body, .modal-content');
      if (await modalBody.isVisible({ timeout: 500 }).catch(() => false)) {
        await modalBody.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(500);
      }
      await checkbox.check();
      await page.waitForTimeout(300);
      const confirm = page.locator('#confirmButton');
      if (await confirm.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirm.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch { /* skip */ }

  // Generic dismiss buttons
  for (const selector of [
    'button:has-text("接受")', 'button:has-text("同意")', 'button:has-text("Accept")',
    '.cookie-consent button', '[data-dismiss="modal"]',
  ]) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch { /* skip */ }
  }
}

/** Find and navigate to the login page */
async function navigateToLoginPage(page: Page, baseOrigin: string) {
  const currentUrl = page.url().toLowerCase();
  if (currentUrl.includes('login') || currentUrl.includes('account') || currentUrl.includes('signin')) {
    return;
  }

  // Strategy 1: Find login links on current page
  for (const selector of [
    'a[href*="Account"]', 'a[href*="account"]', 'a[href*="login"]', 'a[href*="Login"]',
    'a[href*="signin"]', 'a:has-text("登入")', 'a:has-text("Login")', 'a:has-text("登入/註冊")',
  ]) {
    try {
      const link = page.locator(selector).first();
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        const href = await link.getAttribute('href');
        if (href) {
          const loginUrl = href.startsWith('http') ? href : `${baseOrigin}${href.startsWith('/') ? '' : '/'}${href}`;
          await safeGoto(page, loginUrl);
        } else {
          await link.click();
          await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000);
        }
        return;
      }
    } catch { /* try next */ }
  }

  // Strategy 2: Try common paths
  const queryString = new URL(page.url()).search;
  for (const loginPath of ['/Account', '/login', '/auth/login', '/signin']) {
    try {
      const testUrl = `${baseOrigin}${loginPath}${queryString}`;
      const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      if (response && response.ok()) {
        await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);
        return;
      }
    } catch { /* try next */ }
  }
}

/** Check if the current URL indicates the user is logged in (not on a login/auth page) */
function isOnLoginPage(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('/account') || lower.includes('/login') || lower.includes('/signin') || lower.includes('accounts.google.com');
}

// =============================================
// Main crawl function
// =============================================

export async function crawlWebsite(taskId: string, request: GenerateRequest): Promise<PageCapture[]> {
  const taskScreenshotDir = path.join(SCREENSHOT_DIR, taskId);
  ensureDir(taskScreenshotDir);

  // Use headed (visible) browser for manual login or Gmail (due to 2FA)
  const needsVisibleBrowser = request.authMethod === 'manual' || request.authMethod === 'gmail';

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: !needsVisibleBrowser,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=PasswordLeakDetection,HttpsUpgrades',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-TW',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      javaScriptEnabled: true,
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();
    page.setDefaultTimeout(CRAWL_TIMEOUT);

    // 1. Navigate to the target URL
    updateTask(taskId, { currentStep: `正在載入 ${request.url}...`, progress: 5 });
    await safeGoto(page, request.url, 60000);
    await dismissModals(page);

    // 2. Handle authentication
    if (request.authMethod !== 'none') {
      updateTask(taskId, { currentStep: '正在前往登入頁面...', progress: 8 });
      const baseOrigin = new URL(request.url).origin;
      await navigateToLoginPage(page, baseOrigin);
      await dismissModals(page);

      if (request.authMethod === 'manual') {
        // === Manual login: wait for user to complete login ===
        await handleManualLogin(taskId, page, baseOrigin);
      } else if (request.authMethod === 'gmail') {
        // === Gmail: auto-fill then wait for 2FA ===
        updateTask(taskId, { currentStep: '正在啟動 Google 登入...', progress: 10 });
        const loginSuccess = await handleGmailLogin(taskId, page, context, request);

        if (!loginSuccess) {
          // Fall back: wait for user to complete 2FA manually
          updateTask(taskId, {
            status: 'waiting_login',
            currentStep: '請在彈出的瀏覽器視窗中完成兩步驟驗證（2FA），完成後系統會自動繼續...',
            progress: 12,
          });
          await waitForLoginComplete(page, baseOrigin, 180000); // 3 min timeout
        }
      } else if (request.authMethod === 'credentials') {
        updateTask(taskId, { currentStep: '正在填入帳號密碼...', progress: 10 });
        await handleCredentialLogin(page, request);
      }

      // Verify login
      updateTask(taskId, { currentStep: '驗證登入狀態...', progress: 13 });
      await page.waitForTimeout(2000);

      if (isOnLoginPage(page.url())) {
        console.warn('Still on login page after auth:', page.url());
      } else {
        console.log('Login successful, now on:', page.url());
      }
    }

    // 3. Start crawling
    updateTask(taskId, { status: 'crawling', currentStep: '開始探索網站頁面...', progress: 15 });
    const maxPages = request.maxPages || MAX_PAGES;
    const captures = await discoverAndCapture(taskId, page, context, request.url, maxPages, taskScreenshotDir);

    // 4. Operation demonstration (if enabled)
    const demoOps = request.demoOperations;
    if (demoOps && (demoOps.create || demoOps.edit || demoOps.delete)) {
      updateTask(taskId, { currentStep: '正在偵測���示範的操作流程...', progress: 46 });
      const demoCaptures = await demonstrateOperations(taskId, page, captures, demoOps, taskScreenshotDir);
      captures.push(...demoCaptures);
    }

    updateTask(taskId, {
      currentStep: `已完成 ${captures.length} 個頁面的擷取`,
      progress: 50,
      totalPages: captures.length,
    });

    await browser.close();
    return captures;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

// =============================================
// Authentication handlers
// =============================================

/** Manual login: open login page and wait for user to log in */
async function handleManualLogin(taskId: string, page: Page, baseOrigin: string) {
  updateTask(taskId, {
    status: 'waiting_login',
    currentStep: '請在彈出的瀏覽器視窗中完成登入，登入成功後系統會自動繼續...',
    progress: 10,
  });
  await waitForLoginComplete(page, baseOrigin, 300000); // 5 min timeout
}

/** Wait for the page to navigate away from login to the actual site */
async function waitForLoginComplete(page: Page, baseOrigin: string, timeout: number) {
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < timeout) {
    const currentUrl = page.url();
    // Success: user has navigated to a page on the original site that is not the login page
    if (currentUrl.startsWith(baseOrigin) && !isOnLoginPage(currentUrl)) {
      console.log('Login detected! Now on:', currentUrl);
      await page.waitForTimeout(2000);
      return;
    }
    await page.waitForTimeout(pollInterval);
  }

  console.warn('Login wait timed out');
}

/** Gmail OAuth login with auto-fill + 2FA detection */
async function handleGmailLogin(
  taskId: string,
  page: Page,
  context: BrowserContext,
  request: GenerateRequest
): Promise<boolean> {
  // Find Google login link/button
  const googleSelectors = [
    'a[href*="GoogleLogin"]',
    'a[href*="google-login"]',
    'a[href*="auth/google"]',
    'a[href*="oauth/google"]',
    'a:has-text("Google 登入")',
    'a:has-text("Google")',
    'button:has-text("Google 登入")',
    'button:has-text("Google")',
    'a.btn-danger:has-text("Google")',
    '[data-provider="google"]',
  ];

  let clicked = false;
  for (const selector of googleSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const tagName = await el.evaluate(e => e.tagName.toLowerCase());
        const href = await el.getAttribute('href');

        if (tagName === 'a' && href) {
          // Direct link: click and follow redirect
          await el.click();
          await page.waitForTimeout(3000);
          clicked = true;
        } else {
          // Button: may open popup
          const [popup] = await Promise.all([
            context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
            el.click(),
          ]);
          if (popup) {
            await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
            const result = await completeGoogleOAuth(popup, request);
            await popup.waitForEvent('close', { timeout: 60000 }).catch(() => {});
            await page.waitForTimeout(3000);
            return result;
          }
          clicked = true;
        }
        break;
      }
    } catch { /* try next */ }
  }

  if (!clicked) {
    console.warn('Could not find Google login button');
    return false;
  }

  // We're now either on Google's OAuth page or being redirected
  if (page.url().includes('accounts.google.com')) {
    return await completeGoogleOAuth(page, request);
  }

  // Wait a bit and check again
  await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 }).catch(() => {});
  if (page.url().includes('accounts.google.com')) {
    return await completeGoogleOAuth(page, request);
  }

  return false;
}

/** Complete Google OAuth: fill email, password, detect 2FA */
async function completeGoogleOAuth(page: Page, request: GenerateRequest): Promise<boolean> {
  console.log('Completing Google OAuth on:', page.url());

  // Step 1: Enter email
  try {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(request.username || '');
    await page.waitForTimeout(800);

    const nextBtn = page.locator('#identifierNext button, #identifierNext, button:has-text("Next"), button:has-text("下一步")').first();
    await nextBtn.click();
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('Failed to enter email:', e);
    return false;
  }

  // Step 2: Enter password
  try {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(request.password || '');
    await page.waitForTimeout(800);

    const nextBtn = page.locator('#passwordNext button, #passwordNext, button:has-text("Next"), button:has-text("下一步")').first();
    await nextBtn.click();
    await page.waitForTimeout(5000);
  } catch (e) {
    console.error('Failed to enter password:', e);
    return false;
  }

  // Step 3: Check if we're past Google (success) or stuck on 2FA/challenge
  const currentUrl = page.url();
  if (!currentUrl.includes('accounts.google.com')) {
    // Successfully redirected back to the original site
    console.log('Google OAuth success, redirected to:', currentUrl);
    return true;
  }

  // Check for consent screen
  try {
    const allowBtn = page.locator('button:has-text("Allow"), button:has-text("允許"), button:has-text("Continue"), button:has-text("繼續"), #submit_approve_access').first();
    if (await allowBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allowBtn.click();
      await page.waitForTimeout(5000);
      if (!page.url().includes('accounts.google.com')) {
        return true;
      }
    }
  } catch { /* not a consent screen */ }

  // Still on Google → likely 2FA challenge
  console.log('Google 2FA detected, URL:', currentUrl);
  return false; // Caller will handle manual 2FA wait
}

/** Standard credential login */
async function handleCredentialLogin(page: Page, request: GenerateRequest) {
  for (const selector of [
    'input#email', 'input[name="email"]', 'input[type="email"]',
    'input[type="text"][name*="user"]', 'input[type="text"][name*="email"]',
    'input[name="username"]', 'input[id*="user"]', 'input[id*="email"]',
    'input[placeholder*="帳號"]', 'input[placeholder*="email"]',
  ]) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.fill(request.username || '');
      break;
    }
  }

  for (const selector of ['input#password', 'input[type="password"]', 'input[name="password"]']) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.fill(request.password || '');
      break;
    }
  }

  for (const selector of [
    'button[type="submit"]', 'input[type="submit"]',
    'button:has-text("登入")', 'button:has-text("Login")', 'button:has-text("Sign in")',
  ]) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.click();
      break;
    }
  }

  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// =============================================
// Crawling & page capture
// =============================================

async function discoverAndCapture(
  taskId: string,
  page: Page,
  context: BrowserContext,
  baseUrl: string,
  maxPages: number,
  screenshotDir: string
): Promise<PageCapture[]> {
  const captures: PageCapture[] = [];
  const visited = new Set<string>();
  const toVisit: { url: string; depth: number; parentUrl?: string }[] = [];
  const baseOrigin = new URL(baseUrl).origin;

  // Capture current page first
  const initialCapture = await capturePage(page, screenshotDir, 0);
  if (initialCapture) {
    captures.push(initialCapture);
    addPageCapture(taskId, initialCapture);
    visited.add(normalizeUrl(page.url()));
  }

  // Discover links
  const links = await discoverLinks(page, baseOrigin);
  for (const link of links) {
    const normalized = normalizeUrl(link);
    if (!visited.has(normalized)) {
      toVisit.push({ url: link, depth: 1, parentUrl: page.url() });
    }
  }

  const navLinks = await discoverNavigation(page, baseOrigin);
  for (const link of navLinks) {
    const normalized = normalizeUrl(link);
    if (!visited.has(normalized)) {
      toVisit.push({ url: link, depth: 1, parentUrl: page.url() });
    }
  }

  // Visit discovered pages
  while (toVisit.length > 0 && captures.length < maxPages) {
    const { url, depth, parentUrl } = toVisit.shift()!;
    const normalized = normalizeUrl(url);

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      updateTask(taskId, {
        currentStep: `正在瀏覽頁面 ${captures.length + 1}/${maxPages}: ${shortenUrl(url)}`,
        progress: 15 + Math.round((captures.length / maxPages) * 35),
        processedPages: captures.length,
      });

      // Validate URL before visiting (SSRF prevention)
      if (!isUrlSafe(url, baseOrigin)) {
        console.warn('Skipping unsafe URL:', url);
        continue;
      }

      await safeGoto(page, url, 30000);

      // Check if redirected to login (session expired)
      if (isOnLoginPage(page.url())) {
        console.warn('Redirected to login, skipping:', url);
        continue;
      }

      // Verify we weren't redirected to a different origin
      if (!isUrlSafe(page.url(), baseOrigin) && !isOnLoginPage(page.url())) {
        console.warn('Redirected to external URL, skipping:', page.url());
        continue;
      }

      const capture = await capturePage(page, screenshotDir, depth, parentUrl);
      if (capture) {
        captures.push(capture);
        addPageCapture(taskId, capture);
      }

      if (depth < 3) {
        const newLinks = await discoverLinks(page, baseOrigin);
        for (const link of newLinks) {
          const norm = normalizeUrl(link);
          if (!visited.has(norm)) {
            toVisit.push({ url: link, depth: depth + 1, parentUrl: url });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to capture ${url}:`, err);
    }
  }

  // Interact with dropdowns/tabs
  if (captures.length > 0) {
    updateTask(taskId, { currentStep: '正在探索互動元素（按鈕、選單、分頁）...', progress: 45 });
    const interactionCaptures = await captureInteractions(page, screenshotDir, taskId);
    captures.push(...interactionCaptures);
  }

  return captures;
}

async function capturePage(page: Page, screenshotDir: string, depth: number, parentUrl?: string): Promise<PageCapture | null> {
  try {
    const title = await page.title();
    const url = page.url();
    const timestamp = Date.now();
    const filename = `page_${timestamp}.png`;
    const screenshotPath = path.join(screenshotDir, filename);

    await page.screenshot({ path: screenshotPath, fullPage: true, type: 'png' });
    const screenshotBase64 = fs.readFileSync(screenshotPath).toString('base64');
    const elements = await discoverElements(page);

    return { url, title: title || url, screenshotPath: filename, screenshotBase64, elements, navigationDepth: depth, parentUrl, timestamp };
  } catch {
    return null;
  }
}

async function discoverElements(page: Page): Promise<PageElement[]> {
  return page.evaluate(() => {
    const elements: Array<{ type: 'button'|'link'|'input'|'select'|'menu'|'tab'|'form'|'other'; text: string; selector: string; boundingBox?: {x:number;y:number;width:number;height:number} }> = [];

    document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim() || el.getAttribute('aria-label') || '';
      if (text) {
        const rect = el.getBoundingClientRect();
        elements.push({ type: 'button', text: text.substring(0, 100), selector: genSel(el), boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } });
      }
    });

    document.querySelectorAll('a[href]').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim() || el.getAttribute('aria-label') || '';
      if (text && text.length > 1) elements.push({ type: 'link', text: text.substring(0, 100), selector: genSel(el) });
    });

    document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(el => {
      const input = el as HTMLInputElement;
      const label = input.getAttribute('placeholder') || input.getAttribute('aria-label') || document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() || '';
      elements.push({ type: input.tagName === 'SELECT' ? 'select' : 'input', text: label.substring(0, 100) || input.type, selector: genSel(el) });
    });

    document.querySelectorAll('[role="tab"], .tab, .nav-tab').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim() || '';
      if (text) elements.push({ type: 'tab', text: text.substring(0, 100), selector: genSel(el) });
    });

    document.querySelectorAll('[role="menuitem"], .menu-item, nav a').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim() || '';
      if (text) elements.push({ type: 'menu', text: text.substring(0, 100), selector: genSel(el) });
    });

    function genSel(el: Element): string {
      if (el.id) return `#${el.id}`;
      if (el.className && typeof el.className === 'string') {
        const cls = el.className.split(' ').filter(c => c && !c.includes(':'));
        if (cls.length > 0) return `${el.tagName.toLowerCase()}.${cls.slice(0, 2).join('.')}`;
      }
      return el.tagName.toLowerCase();
    }

    return elements.slice(0, 50);
  });
}

async function discoverLinks(page: Page, baseOrigin: string): Promise<string[]> {
  return page.evaluate((origin: string) => {
    const hrefs: string[] = [];
    document.querySelectorAll('a[href]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      if (href && href.startsWith(origin) && !href.includes('#') && !href.match(/\.(pdf|zip|png|jpg|gif|svg|css|js)$/i)) hrefs.push(href);
    });
    return [...new Set(hrefs)];
  }, baseOrigin);
}

async function discoverNavigation(page: Page, baseOrigin: string): Promise<string[]> {
  return page.evaluate((origin: string) => {
    const hrefs: string[] = [];
    ['nav a', '.sidebar a', '.menu a', '[role="navigation"] a', '.nav a', '#sidebar a', '.navbar a', 'footer a'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const href = (el as HTMLAnchorElement).href;
        if (href && href.startsWith(origin)) hrefs.push(href);
      });
    });
    return [...new Set(hrefs)];
  }, baseOrigin);
}

async function captureInteractions(page: Page, screenshotDir: string, taskId: string): Promise<PageCapture[]> {
  const captures: PageCapture[] = [];
  try {
    const dropdowns = await page.locator('[data-toggle="dropdown"], .dropdown-toggle, button[aria-haspopup="true"], [data-bs-toggle="dropdown"]').all();
    for (const dropdown of dropdowns.slice(0, 5)) {
      try {
        await dropdown.click();
        await page.waitForTimeout(800);
        const capture = await capturePage(page, screenshotDir, 0);
        if (capture) { capture.title = `[互動] ${capture.title} - 展開選單`; captures.push(capture); addPageCapture(taskId, capture); }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } catch { /* skip */ }
    }

    const tabs = await page.locator('[role="tab"]:not([aria-selected="true"]), .nav-tabs .nav-link:not(.active)').all();
    for (const tab of tabs.slice(0, 5)) {
      try {
        await tab.click();
        await page.waitForTimeout(1000);
        const capture = await capturePage(page, screenshotDir, 0);
        if (capture) { const t = await tab.innerText().catch(() => ''); capture.title = `[分頁] ${t || capture.title}`; captures.push(capture); addPageCapture(taskId, capture); }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return captures;
}

function normalizeUrl(url: string): string {
  try { const u = new URL(url); u.hash = ''; u.searchParams.delete('_'); u.searchParams.delete('t'); return u.toString().replace(/\/+$/, ''); }
  catch { return url; }
}

function shortenUrl(url: string): string {
  try { const u = new URL(url); return u.pathname + u.search; }
  catch { return url; }
}
