"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/dashboard", icon: "🏠", label: "Главная" },
  { href: "/schedule", icon: "📅", label: "Расписание" },
  { href: "/homeworks", icon: "📚", label: "Задания" },
  { href: "/students", icon: "👥", label: "Ученики" },
  { href: "/library", icon: "📦", label: "Библиотека" },
  { href: "/exam-trials", icon: "📝", label: "Пробники" },
  { href: "/ai-generator", icon: "🤖", label: "ИИ" },
  { href: "/periodic-table", icon: "🧪", label: "Таблицы" },
  { href: "/leaderboard", icon: "🏆", label: "Рейтинг" },
  { href: "/courses", icon: "📖", label: "Курсы" },
  { href: "/users", icon: "⚙️", label: "Пользователи" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 z-40 transition-all duration-300 shadow-xl"
      style={{ width: expanded ? '220px' : '64px' }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 h-16">
        <span className="text-xl flex-shrink-0">🧪🧬</span>
        {expanded && <span className="font-black text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent whitespace-nowrap">Jenyawisch</span>}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {menuItems.map((item) => {
          const fullHref = `${item.href}?uid=${uid}&role=${role}`;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={fullHref} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <span className="text-xl flex-shrink-0 w-8 text-center">{item.icon}</span>
              {expanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <Link href={`/profile?uid=${uid}&role=${role}`} className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-2 transition">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-emerald-400 rounded-full flex-shrink-0 shadow-lg" />
          {expanded && <span className="text-sm text-gray-600 dark:text-gray-400">Профиль</span>}
        </Link>
        <form action="/auth/signout" method="post">
          <button className="w-full flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl p-2 transition text-left">
            <span className="text-xl flex-shrink-0 w-8 text-center">🚪</span>
            {expanded && <span className="text-sm text-red-500">Выйти</span>}
          </button>
        </form>
      </div>
    </div>
  );
}