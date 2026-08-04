"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // ✅ Добавлен usePathname
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

const NAVIGATION = [
  {
    category: "Основное",
    items: [
      { label: "Главная", href: "/dashboard", roles: ["tutor", "student", "parent"], icon: Home },
      { label: "Расписание", href: "/schedule", roles: ["tutor", "student", "parent"], icon: Calendar },
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
  const pathname = usePathname(); // ✅ Теперь определён
  const router = useRouter();
  const [role, setRole] = useState<string>("student");
  const [userName, setUserName] = useState<string>("Пользователь");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as 'dark' | 'light';
      if (storedTheme) {
        setTheme(storedTheme);
      }
      
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
      if (customEvent.detail) {
        setTheme(customEvent.detail as 'dark' | 'light');
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        setTheme(e.newValue as 'dark' | 'light');
      }
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

  const SidebarContent = () => (
    <aside 
      className={`fixed top-0 left-0 h-full w-[280px] flex flex-col z-50 shadow-2xl overflow-hidden transition-all duration-300 border-r ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 border-slate-700/50' 
          : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900 border-slate-200'
      }`}
    >
      <Toaster position="top-center" />
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl ${
          isDark ? 'bg-indigo-500/10' : 'bg-indigo-300/20'
        }`}></div>
        <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl ${
          isDark ? 'bg-purple-500/10' : 'bg-purple-300/20'
        }`}></div>
      </div>

      <div className={`relative p-6 border-b backdrop-blur-sm ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 mb-6 group" onClick={() => setIsMobileOpen(false)}>
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/logo/logo.png"
              alt="Jenyawisch"
              width={40}
              height={40}
              className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
              priority
            />
          </div>
          <span className="font-black text-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent group-hover:from-indigo-300 group-hover:via-purple-300 group-hover:to-emerald-300 transition-all duration-300">
            Jenyawisch
          </span>
        </Link>
        
        <Link href="/profile" onClick={() => setIsMobileOpen(false)}>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 p-3 rounded-xl border backdrop-blur-sm shadow-lg cursor-pointer transition-all duration-200 group ${
              isDark 
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-700/50 border-slate-600/30 hover:border-indigo-500/50 hover:shadow-indigo-500/20' 
                : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-indigo-400 hover:shadow-indigo-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-xl font-bold text-white shadow-lg ring-2 ring-white/10 group-hover:scale-110 transition-transform`}>
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{userName}</p>
              <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>{roleInfo.icon}</span>
                <span>{roleInfo.label}</span>
              </p>
            </div>
            <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          </motion.div>
        </Link>
      </div>

      <nav className="relative flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {filteredNavigation.map((group, groupIdx) => (
          <motion.div key={groupIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIdx * 0.1 }}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 flex items-center gap-2 ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}>
              <span className={`w-8 h-px ${isDark ? 'bg-gradient-to-r from-slate-600 to-transparent' : 'bg-gradient-to-r from-slate-300 to-transparent'}`}></span>
              {group.category}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <motion.li key={item.href} whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-800/50 hover:text-white hover:shadow-md"
                            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 hover:shadow-md"
                      }`}
                    >
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <motion.div layoutId="activeIndicator" className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </nav>

      <div className={`relative p-4 border-t backdrop-blur-sm ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 border shadow-lg group ${
            isDark
              ? 'bg-gradient-to-br from-slate-800 to-slate-700 hover:from-red-500/20 hover:to-red-600/20 hover:text-red-400 text-slate-400 border-slate-600/30 hover:border-red-500/30 shadow-lg hover:shadow-red-500/10'
              : 'bg-gradient-to-br from-slate-100 to-slate-200 hover:from-red-50 hover:to-red-100 hover:text-red-600 text-slate-600 border-slate-300 hover:border-red-300'
          }`}
        >
          <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
          <span className="group-hover:font-bold transition-all">Выйти из аккаунта</span>
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? 'linear-gradient(to bottom, #475569, #334155)' : 'linear-gradient(to bottom, #cbd5e1, #94a3b8)'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDark ? 'linear-gradient(to bottom, #64748b, #475569)' : 'linear-gradient(to bottom, #94a3b8, #64748b)'}; }
      `}</style>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={`lg:hidden fixed top-4 left-4 z-[60] p-3 rounded-xl shadow-lg border transition-all duration-200 ${
          isDark 
            ? 'bg-slate-900/90 backdrop-blur-sm text-white border-slate-700/50 hover:bg-slate-800' 
            : 'bg-white/90 backdrop-blur-sm text-slate-900 border-slate-200 hover:bg-slate-50'
        }`}
        aria-label="Toggle menu"
      >
        <motion.div animate={{ rotate: isMobileOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </motion.div>
      </button>

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

  if (isPublic) {
    return <>{children}</>;
  }

  return <div className="lg:ml-[280px] min-h-screen">{children}</div>;
}