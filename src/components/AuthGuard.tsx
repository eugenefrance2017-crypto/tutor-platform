"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Публичные страницы (не требуют авторизации)
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/auth"
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Если страница публичная — сразу пропускаем
    const isPublic = PUBLIC_PATHS.includes(pathname) || 
                     pathname?.startsWith("/parent-shared/");
    
    if (isPublic) {
      setIsAuthorized(true);
      setLoading(false);
      return;
    }

    // Проверяем авторизацию
    const uid = typeof window !== "undefined" ? localStorage.getItem("uid") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

    if (uid && role) {
      setIsAuthorized(true);
    } else {
      // Не авторизован — редирект на логин
      router.push("/auth");
    }
    
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}