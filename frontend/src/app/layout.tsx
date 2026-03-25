import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SenseWorld - AI 对话平台",
  description: "多模态 AI 对话平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
