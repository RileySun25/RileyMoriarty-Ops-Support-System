import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { renderHTMLWithTheme } from '@/lib/doc-generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = body.title?.trim() || '未命名文件';

    const taskId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outputDir = path.join(process.cwd(), 'output', taskId);
    const imagesDir = path.join(outputDir, 'images');

    fs.mkdirSync(imagesDir, { recursive: true });

    const doc = {
      title,
      generatedAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      sourceUrl: '手動建立',
      tableOfContents: [],
      sections: [],
      theme: {
        primaryColor: '#3b5998',
        accentColor: '#1a1a2e',
        watermark: '',
        watermarkOpacity: 0.06,
        watermarkType: 'text' as const,
        watermarkImage: '',
        cover: {
          documentName: title,
          subtitle: '操作說明手冊',
          author: '',
          department: '',
          version: '',
          extraInfo: '',
        },
        fontSize: {
          chapterTitle: 22,
          sectionTitle: 18,
          description: 14,
          step: 14,
          note: 13,
        },
      },
    };

    // Save data.json
    const jsonPath = path.join(outputDir, 'data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2), 'utf-8');

    // Generate index.html
    const html = renderHTMLWithTheme(doc);
    const htmlPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');

    return NextResponse.json({ taskId });
  } catch (error) {
    console.error('Create failed:', error);
    return NextResponse.json({ error: '建立文件失敗' }, { status: 500 });
  }
}
