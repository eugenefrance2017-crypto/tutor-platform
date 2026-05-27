import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Репетитор химии и биологии",
  description: "Платформа для занятий, расписания и домашних заданий",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}