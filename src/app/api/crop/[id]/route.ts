import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const outputDir = path.join(process.cwd(), 'output', taskId);

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ error: '找不到此任務' }, { status: 404 });
  }

  try {
    const { imagePath, croppedData } = await req.json();

    if (!imagePath || !croppedData) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 });
    }

    // Prevent path traversal
    const safePath = path.normalize(imagePath).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(outputDir, safePath);
    if (!fullPath.startsWith(outputDir)) {
      return NextResponse.json({ error: '路徑不合法' }, { status: 400 });
    }

    // croppedData is a base64 data URL like "data:image/png;base64,..."
    const base64 = croppedData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    fs.writeFileSync(fullPath, buffer);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '裁切儲存失敗' }, { status: 500 });
  }
}
