"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Home, Calendar, MessageCircle, BookOpen, Target, FileText, Flame, 
  TrendingUp, Trophy, FlaskConical, Users, Crown, Library, GraduationCap, 
  Bot, DollarSign, Settings, LayoutDashboard, LogOut, ChevronRight,
  BarChart3, FileCheck, Menu, X
} from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import BottomNav from "@/components/BottomNav";

const NAVIGATION = [
  {
    category: "Основное",
    items: [
      { label: "Главная", href: "/dashboard", roles: ["tutor", "student", "parent"], icon: Home },
      { label: "Расписание", href: "/schedule", roles: ["tutor", "student", "parent"], icon: Calendar },
      { label: "Уроки", href: "/lessons", roles: ["tutor", "student", "parent"], icon: BookOpen }, // 🔥 ДОБАВЛЕНО
      { label: "Чат", href: "/chat", roles: ["tutor", "student", "parent"], icon: MessageCircle },
    ]
  },
  {
    category: "Обучение",
    items: [
      { label: "Домашние задания", href: "/homeworks", roles: ["tutor", "student", "parent"], icon: BookOpen },
      { label: "Тренажёры", href: "/trainers", roles: ["tutor", "student"], icon: Target },
      { label: "Пробники ЕГЭ", href: "/exam-trials", roles: ["student"], icon: FileText },
      { label: "Ежедневное задание", href: "/daily", roles: ["student"], icon: Flame },
      { label: "Прогресс", href: "/progress", roles: ["student", "parent"], icon: TrendingUp },
      { label: "Рейтинг", href: "/leaderboard", roles: ["student"], icon: Trophy },
      { label: "Таблица Менделеева", href: "/periodic-table", roles: ["student", "tutor"], icon: FlaskConical },
    ]
  },
  {
    category: "Управление",
    items: [
      { label: "Ученики", href: "/students", roles: ["tutor"], icon: Users },
      { label: "Группы", href: "/groups", roles: ["tutor"], icon: Crown },
      { label: "Банк заданий", href: "/library", roles: ["tutor"], icon: Library },
      { label: "Курсы", href: "/courses", roles: ["tutor"], icon: GraduationCap },
      { label: "AI Генератор", href: "/ai-generator", roles: ["tutor"], icon: Bot },
      { label: "Финансы", href: "/payments", roles: ["tutor"], icon: DollarSign },
      { label: "Пользователи", href: "/users", roles: ["tutor"], icon: Users },
      { label: "Настройки", href: "/settings", roles: ["tutor"], icon: Settings },
    ]
  },
  {
    category: "Кабинет родителя",
    items: [
      { label: "Обзор", href: "/parent-dashboard", roles: ["parent"], icon: LayoutDashboard },
      { label: "Задания ребёнка", href: "/parent-homeworks", roles: ["parent"], icon: FileCheck },
      { label: "Отчёты", href: "/parent-reports", roles: ["parent"], icon: BarChart3 },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("student");
  const [userName, setUserName] = useState<string>("Пользователь");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const SIDEBAR_WIDTH = 220; // 🔥 Компактная ширина

  // Авто-скрытие только на странице урока
  const isAutoHide = pathname?.startsWith("/lesson/") ?? false;

  // Десктоп: отслеживание курсора для авто-скрытия
  useEffect(() => {
    if (!isAutoHide) {
      setIsHovered(false);
      return;
    }

    let hideTimeout: NodeJS.Timeout;

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20) {
        clearTimeout(hideTimeout);
        setIsHovered(true);
        return;
      }
      if (e.clientX > SIDEBAR_WIDTH + 20) {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => setIsHovered(false), 500);
        return;
      }
    };

    const handleMouseLeaveWindow = () => {
      setIsHovered(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeaveWindow);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeaveWindow);
      clearTimeout(hideTimeout);
    };
  }, [isAutoHide]);

  // Мобильные: свайп от левого края открывает сайдбар
  useEffect(() => {
    if (!isAutoHide) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (startX < 20 && deltaX > 50 && Math.abs(deltaY) < 30) {
        setIsMobileOpen(true);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isAutoHide]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as 'dark' | 'light';
      if (storedTheme) setTheme(storedTheme);
      
      const storedRole = localStorage.getItem("role");
      const storedName = localStorage.getItem("userName");
      const storedAvatar = localStorage.getItem("userAvatar");
      
      if (storedRole) setRole(storedRole);
      if (storedName) setUserName(storedName);
      if (storedAvatar) setUserAvatar(storedAvatar);
      
      setMounted(true);
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) setTheme(customEvent.detail as 'dark' | 'light');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) setTheme(e.newValue as 'dark' | 'light');
    };

    window.addEventListener('themechange', handleThemeChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const filteredNavigation = NAVIGATION.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(role))
  })).filter(group => group.items.length > 0);

  const publicPaths = ["/", "/pricing", "/auth"];
  const isPublic = publicPaths.includes(pathname) || pathname?.startsWith("/parent-shared/");
  
  if (isPublic) return null;

  const getRoleInfo = () => {
    switch (role) {
      case "tutor": return { icon: "👨‍🏫", label: "Репетитор", color: "from-emerald-500 to-teal-600" };
      case "parent": return { icon: "👨‍👩‍👧", label: "Родитель", color: "from-purple-500 to-pink-600" };
      default: return { icon: "🎓", label: "Ученик", color: "from-indigo-500 to-blue-600" };
    }
  };

  const roleInfo = getRoleInfo();
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      localStorage.removeItem("uid");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");
      localStorage.removeItem("userAvatar");
      toast.success("Вы вышли из аккаунта");
      router.push("/auth");
    } catch (error) {
      toast.error("Ошибка при выходе");
    }
  };

  const desktopVisible = isAutoHide ? isHovered : true;
  const translateClass = isMobileOpen
    ? "translate-x-0"
    : desktopVisible
    ? "-translate-x-full lg:translate-x-0"
    : "-translate-x-full";

  const SidebarContent = () => (
    <aside 
      className={`fixed top-0 left-0 h-full flex flex-col z-50 shadow-xl overflow-hidden transition-all duration-300 border-r ${translateClass} ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 border-slate-700/50' 
          : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900 border-slate-200'
      }`}
      style={{ width: SIDEBAR_WIDTH }}
    >
      <Toaster position="top-center" />
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-300/20'}`}></div>
        <div className={`absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-2xl ${isDark ? 'bg-purple-500/10' : 'bg-purple-300/20'}`}></div>
      </div>

      <div className={`relative p-3 border-b backdrop-blur-sm ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <Link href="/dashboard" className="flex items-center gap-2 mb-3 group" onClick={() => setIsMobileOpen(false)}>
          <div className="relative w-7 h-7 flex-shrink-0">
            <Image
              src="/logo/logo.png"
              alt="Jenyawisch"
              width={28}
              height={28}
              className="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-300"
              priority
            />
          </div>
          <span className="font-black text-base bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent group-hover:from-indigo-300 group-hover:via-purple-300 group-hover:to-emerald-300 transition-all duration-300">
            Jenyawisch
          </span>
        </Link>
        
        <Link href="/profile" onClick={() => setIsMobileOpen(false)}>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 p-2 rounded-lg border backdrop-blur-sm shadow-sm cursor-pointer transition-all duration-200 group ${
              isDark 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-700/50 border-slate-600/30 hover:border-indigo-500/50' 
                : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-indigo-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-sm font-bold text-white shadow-sm ring-1 ring-white/10 group-hover:scale-105 transition-transform`}>
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{userName}</p>
              <p className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>{roleInfo.icon}</span>
                <span>{roleInfo.label}</span>
              </p>
            </div>
          </motion.div>
        </Link>
      </div>

      <nav className="relative flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {filteredNavigation.map((group, groupIdx) => (
          <motion.div key={groupIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIdx * 0.05 }}>
            <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-2 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <span className={`w-6 h-px ${isDark ? 'bg-gradient-to-r from-slate-600 to-transparent' : 'bg-gradient-to-r from-slate-300 to-transparent'}`}></span>
              {group.category}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <motion.li key={item.href} whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && <motion.div layoutId="activeIndicator" className="w-1 h-1 bg-white rounded-full" />}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </nav>

      <div className={`relative p-3 border-t backdrop-blur-sm ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 border shadow-sm group ${
            isDark
              ? 'bg-gradient-to-br from-slate-800 to-slate-700 hover:from-red-500/20 hover:to-red-600/20 hover:text-red-400 text-slate-400 border-slate-600/30'
              : 'bg-gradient-to-br from-slate-100 to-slate-200 hover:from-red-50 hover:to-red-100 hover:text-red-600 text-slate-600 border-slate-300'
          }`}
        >
          <LogOut className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
          <span className="group-hover:font-bold transition-all">Выйти</span>
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? '#475569' : '#cbd5e1'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#64748b' : '#94a3b8'}; }
      `}</style>
    </aside>
  );

  return (
    <>
      {/* 🔥 Нижняя навигация для мобильных (заменяет верхний гамбургер) */}
      <BottomNav onMenuClick={() => setIsMobileOpen(true)} />

      {/* Индикатор свайпа (для страницы урока) */}
      {isAutoHide && !isMobileOpen && (
        <div className="lg:hidden fixed left-1.5 top-1/2 -translate-y-1/2 w-1 h-10 bg-[#8CC63F]/50 rounded-full z-50 animate-pulse" />
      )}

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <SidebarContent />
    </>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPaths = ["/", "/pricing", "/auth"];
  const isPublic = publicPaths.includes(pathname) || pathname?.startsWith("/parent-shared/");
  const isLessonPage = pathname?.startsWith("/lesson/");

  if (isPublic) {
    return <>{children}</>;
  }

  if (isLessonPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  // 🔥 Обновлённый отступ под новую ширину (220px вместо 280px)
  return <div className="lg:ml-[220px] min-h-screen">{children}</div>;
}