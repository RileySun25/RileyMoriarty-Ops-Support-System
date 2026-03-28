import { GenerateRequest } from './types';
import { updateTask } from './task-manager';
import { crawlWebsite } from './crawler';
import { analyzePages, generateDocumentTitle } from './ai-analyzer';
import { generateSOPDocument } from './doc-generator';

export async function runSOPGeneration(taskId: string, request: GenerateRequest) {
  // Task is already created by the API route before this runs
  try {
    // Phase 1: Crawl
    updateTask(taskId, { status: 'crawling', currentStep: '啟動瀏覽器...', progress: 2 });
    const pages = await crawlWebsite(taskId, request);

    if (pages.length === 0) {
      updateTask(taskId, {
        status: 'error',
        error: '無法擷取任何頁面，請確認 URL 是否正確以及登入資訊是否有效。',
        progress: 0,
      });
      return;
    }

    // Phase 2: AI Analysis
    updateTask(taskId, { status: 'analyzing', currentStep: '開始 AI 分析...', progress: 50 });
    const analyses = await analyzePages(taskId, pages, request.language || 'zh-TW');

    // Phase 3: Generate Document
    updateTask(taskId, { status: 'generating', currentStep: '產生文件標題...', progress: 82 });
    const title = await generateDocumentTitle(request.url, pages);

    updateTask(taskId, { status: 'generating', currentStep: '組合 SOP 文件...', progress: 85 });
    const resultPath = await generateSOPDocument(taskId, title, request.url, pages, analyses);

    updateTask(taskId, {
      status: 'completed',
      currentStep: '完成！',
      progress: 100,
      resultPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    updateTask(taskId, {
      status: 'error',
      error: `產生過程中發生錯誤：${message}`,
      progress: 0,
    });
  }
}
