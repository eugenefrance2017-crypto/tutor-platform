import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "./Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jenyawisch",
  description: "Tutor platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className} style={{ backgroundColor: "#000000", margin: 0, padding: 0 }}>
        <Suspense fallback={<div className="fixed top-0 left-0 h-full w-64 bg-stone-900" />}>
          <Sidebar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}