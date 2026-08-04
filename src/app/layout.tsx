import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Sidebar, { MainContent } from "./Sidebar";
import AuthGuard from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jenyawisch - Химия и биология ЕГЭ",
  description: "Интерактивная платформа для подготовки к ЕГЭ по химии и биологии",
  icons: {
    // ✅ Используем статический файл, чтобы избежать бага с @vercel/og на Windows
    icon: "/favicon.png", 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <AuthGuard>
          <Suspense fallback={<div className="fixed top-0 left-0 h-full w-[280px] bg-slate-900 z-50" />}>
            <Sidebar />
          </Suspense>
          
          <MainContent>
            {children}
          </MainContent>
        </AuthGuard>
      </body>
    </html>
  );
}