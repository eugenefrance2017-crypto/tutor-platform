import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Jenyawisch | Отчёт об успеваемости",
  description: "Отчёт о прогрессе ученика",
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function ParentSharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Отключаем Sidebar для страниц parent-shared (чтобы не было ошибок гидратации)
  return <>{children}</>;
}