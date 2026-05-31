import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Sidebar from "./Sidebar";
import ChemRef from "./ChemRef";

export const metadata: Metadata = { title: "Jenyawisch | Химия и биология ЕГЭ ОГЭ", description: "Платформа для подготовки к ЕГЭ и ОГЭ" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#6366f1" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <div className="md:ml-16">
          {children}
        </div>
        <ChemRef />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}