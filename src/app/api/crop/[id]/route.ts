import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { validateTaskId, safePath as resolveSecurePath } from '@/lib/validation';

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
    const { imagePath, croppedData } = await req.json();

    if (!imagePath || !croppedData) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 });
    }

    // Secure path resolution — prevents path traversal
    const fullPath = resolveSecurePath(outputDir, imagePath);
    if (!fullPath) {
      return NextResponse.json({ error: '路徑不合法' }, { status: 400 });
    }

    // Validate croppedData is a base64 image data URL
    if (typeof croppedData !== 'string' || !croppedData.startsWith('data:image/')) {
      return NextResponse.json({ error: '無效的圖片資料' }, { status: 400 });
    }

    const base64 = croppedData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    fs.writeFileSync(fullPath, buffer);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '裁切儲存失敗' }, { status: 500 });
  }
}
