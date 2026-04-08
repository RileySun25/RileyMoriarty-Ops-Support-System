import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { validateTaskId } from '@/lib/validation';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!validateTaskId(id)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
  }

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
