import { NextRequest } from 'next/server';
import { subscribe, getTask } from '@/lib/task-manager';
import { validateTaskId } from '@/lib/validation';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!validateTaskId(taskId)) {
    return new Response(JSON.stringify({ error: 'Invalid task ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const task = getTask(taskId);

  // If task not in memory, check if output already exists on disk (server may have restarted)
  if (!task) {
    const outputDir = path.join(process.cwd(), 'output', taskId);
    const htmlExists = fs.existsSync(path.join(outputDir, 'index.html'));

    if (htmlExists) {
      // Task completed before server restart — send a completed event
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify({
            id: taskId,
            status: 'completed',
            progress: 100,
            currentStep: '文件已產生完成！',
            totalPages: 0,
            processedPages: 0,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          setTimeout(() => { try { controller.close(); } catch {} }, 500);
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    return new Response(JSON.stringify({ error: '找不到此任務' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Server-Sent Events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream may be closed */ }
      };

      const unsubscribe = subscribe(taskId, (taskState) => {
        send({
          id: taskState.id,
          status: taskState.status,
          progress: taskState.progress,
          currentStep: taskState.currentStep,
          totalPages: taskState.totalPages,
          processedPages: taskState.processedPages,
          error: taskState.error,
          resultPath: taskState.resultPath,
        });

        if (taskState.status === 'completed' || taskState.status === 'error') {
          setTimeout(() => {
            try { controller.close(); } catch {}
          }, 1000);
        }
      });

      req.signal.addEventListener('abort', () => {
        unsubscribe();
        try { controller.close(); } catch {};
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
