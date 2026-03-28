import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GenerateRequest } from '@/lib/types';
import { createTask } from '@/lib/task-manager';
import { runSOPGeneration } from '@/lib/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json({ error: '請提供目標網站 URL' }, { status: 400 });
    }

    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: '請提供有效的 URL 格式' }, { status: 400 });
    }

    if (body.authMethod === 'credentials' && (!body.username || !body.password)) {
      return NextResponse.json({ error: '使用帳號密碼登入時，請提供帳號和密碼' }, { status: 400 });
    }

    if (body.authMethod === 'gmail' && (!body.username || !body.password)) {
      return NextResponse.json({ error: '使用 Gmail 登入時，請提供 Gmail 帳號和密碼' }, { status: 400 });
    }

    const taskId = uuidv4();

    // Create task FIRST so SSE endpoint can find it immediately
    createTask(taskId);

    // Run generation in background (don't await)
    runSOPGeneration(taskId, body).catch(err => {
      console.error('SOP generation failed:', err);
    });

    return NextResponse.json({ taskId, message: '已開始產生 SOP 文件' });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
