import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const outputDir = path.join(process.cwd(), 'output', id);

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ error: '找不到此文件' }, { status: 404 });
  }

  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
