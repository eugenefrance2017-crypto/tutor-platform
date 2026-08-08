"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Home, Calendar, BookOpen, MessageCircle, 
  Users, MoreHorizontal, LayoutDashboard, FileCheck 
} from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Ученик (3 главных + "Ещё" откроет полный список)
  { label: "Главная", href: "/dashboard", icon: Home, roles: ["student"] },
  { label: "Расписание", href: "/schedule", icon: Calendar, roles: ["student"] },
  { label: "Уроки", href: "/lessons", icon: BookOpen, roles: ["student"] },
  
  // Учитель
  { label: "Главная", href: "/dashboard", icon: LayoutDashboard, roles: ["tutor"] },
  { label: "Расписание", href: "/schedule", icon: Calendar, roles: ["tutor"] },
  { label: "Ученики", href: "/students", icon: Users, roles: ["tutor"] },
  
  // Родитель
  { label: "Обзор", href: "/parent-dashboard", icon: LayoutDashboard, roles: ["parent"] },
  { label: "Расписание", href: "/schedule", icon: Calendar, roles: ["parent"] },
  { label: "Задания", href: "/parent-homeworks", icon: FileCheck, roles: ["parent"] },
];

export default function BottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState("student");

  useEffect(() => {
    setRole(localStorage.getItem("role") || "student");
  }, []);

  // 🔥 Берём только 3 пункта, 4-й всегда "Ещё"
  const items = NAV_ITEMS.filter(item => item.roles.includes(role)).slice(0, 3);

  const isPublic = ["/", "/pricing", "/auth"].includes(pathname) || pathname?.startsWith("/parent-shared/");
  const isLesson = pathname?.startsWith("/lesson/");
  if (isPublic || isLesson) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-700 lg:hidden safe-area-pb">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive ? "text-[#8CC63F]" : "text-gray-500 dark:text-slate-400"
              }`}
            >
              <div className="relative p-1">
                <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""} transition-transform`} />
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#8CC63F] rounded-full"
                  />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* 🔥 Кнопка "Ещё" — всегда видна, открывает полный сайдбар */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MoreHorizontal className="w-6 h-6" />
          <span className="text-[10px] font-medium">Ещё</span>
        </button>
      </div>
    </nav>
  );
}