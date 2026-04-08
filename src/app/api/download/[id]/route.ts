import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { validateTaskId, safePath as resolveSecurePath } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!validateTaskId(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  const format = req.nextUrl.searchParams.get('format') || 'html';
  const outputDir = path.join(process.cwd(), 'output', taskId);

  // Check files on disk directly (task may no longer be in memory after server restart)
  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ error: '找不到此任務的輸出檔案' }, { status: 404 });
  }

  if (format === 'html') {
    const htmlPath = path.join(outputDir, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      return NextResponse.json({ error: '找不到產生的 HTML 文件' }, { status: 404 });
    }
    const html = fs.readFileSync(htmlPath, 'utf-8');
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="sop-${taskId}.html"`,
      },
    });
  }

  if (format === 'json') {
    const jsonPath = path.join(outputDir, 'data.json');
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: '找不到產生的 JSON 文件' }, { status: 404 });
    }
    const data = fs.readFileSync(jsonPath, 'utf-8');
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  if (format === 'image') {
    const imgPath = req.nextUrl.searchParams.get('path');
    if (!imgPath) {
      return NextResponse.json({ error: '未指定圖片路徑' }, { status: 400 });
    }
    // Secure path resolution — prevents path traversal
    const fullPath = resolveSecurePath(outputDir, imgPath);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return NextResponse.json({ error: '找不到圖片' }, { status: 404 });
    }
    const imageData = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeMap: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
    return new Response(imageData, {
      headers: { 'Content-Type': mimeMap[ext] || 'image/png', 'Cache-Control': 'public, max-age=86400' },
    });
  }

  return NextResponse.json({ error: '不支援的格式' }, { status: 400 });
}
