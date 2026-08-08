import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Sidebar, { MainContent } from "@/app/Sidebar";
import AuthGuard from "@/components/AuthGuard";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Химия и биология ЕГЭ - Jenyawisch",
  description: "Интерактивная подготовка к ЕГЭ по химии и биологии",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jenyawisch",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/logo/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${jakarta.className} antialiased`}
        style={{ margin: 0, padding: 0, overflowX: "hidden" }}
      >
        <AuthGuard>
          <Suspense fallback={<div className="fixed top-0 left-0 h-full w-[220px] bg-slate-900 z-50 lg:block hidden" />}>
            <Sidebar />
          </Suspense>

          <MainContent>{children}</MainContent>
        </AuthGuard>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('✅ SW registered: ', registration);
                  }).catch(function(registrationError) {
                    console.log('❌ SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}