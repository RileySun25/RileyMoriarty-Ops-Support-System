import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { renderHTMLWithTheme } from '@/lib/doc-generator';
import { validateTaskId } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  if (!validateTaskId(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  const outputDir = path.join(process.cwd(), 'output', taskId);

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ error: '找不到此任務' }, { status: 404 });
  }

  try {
    const body = await req.json();

    // 1. Save JSON data
    const jsonPath = path.join(outputDir, 'data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(body, null, 2), 'utf-8');

    // 2. Regenerate index.html with theme applied
    const html = renderHTMLWithTheme(body);
    const htmlPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save failed:', error);
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 });
  }
}
