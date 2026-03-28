import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

interface HistoryItem {
  id: string;
  title: string;
  sourceUrl: string;
  generatedAt: string;
  sectionCount: number;
}

export async function GET() {
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    return NextResponse.json([]);
  }

  const items: HistoryItem[] = [];
  const dirs = fs.readdirSync(outputDir, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const jsonPath = path.join(outputDir, dir.name, 'data.json');
    if (!fs.existsSync(jsonPath)) continue;

    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(raw);
      items.push({
        id: dir.name,
        title: data.title || '未命名文件',
        sourceUrl: data.sourceUrl || '',
        generatedAt: data.generatedAt || '',
        sectionCount: data.sections?.length || 0,
      });
    } catch {
      // skip malformed files
    }
  }

  // Sort newest first
  items.sort((a, b) => {
    const da = new Date(a.generatedAt).getTime() || 0;
    const db = new Date(b.generatedAt).getTime() || 0;
    return db - da;
  });

  return NextResponse.json(items);
}
