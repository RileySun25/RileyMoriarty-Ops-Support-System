import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RileyMoriarty Ops Support System',
  description: '自動瀏覽網站、擷取畫面、產生標準操作說明文件',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
