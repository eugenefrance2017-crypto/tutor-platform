import type { Metadata, Viewport } from "next";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🎯 Динамические метаданные — превью ссылки с именем ученика
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  try {
    const linkSnap = await getDoc(doc(db, "parent_shared_links", params.token));
    if (linkSnap.exists()) {
      const linkData = linkSnap.data();
      const childSnap = await getDoc(doc(db, "profiles", linkData.child_id));
      const childName = childSnap.exists() ? childSnap.data().full_name : "Ученика";

      return {
        title: `Отчёт об успеваемости: ${childName} | Jenyawisch`,
        description: `Персональный отчёт о прогрессе, посещаемости и прогнозе ЕГЭ для ${childName}.`,
        robots: "noindex, nofollow",
        openGraph: {
          title: `Отчёт об успеваемости: ${childName}`,
          description: "Персональный отчёт о прогрессе ученика",
          type: "website",
          images: [
            {
              url: "/og-parent-report.png", // Можешь добавить красивую картинку-заглушку в /public
              width: 1200,
              height: 630,
              alt: "Отчёт об успеваемости",
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title: `Отчёт об успеваемости: ${childName}`,
          description: "Персональный отчёт о прогрессе ученика",
        },
      };
    }
  } catch (e) {
    console.error("Ошибка генерации метаданных:", e);
  }

  return {
    title: "Отчёт об успеваемости | Jenyawisch",
    description: "Персональный отчёт о прогрессе ученика",
    robots: "noindex, nofollow",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f59e0b", // Янтарный цвет в стиле Fearless
};

// Отключаем Sidebar для публичных страниц (чтобы не было утечек навигации)
export default function ParentSharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}