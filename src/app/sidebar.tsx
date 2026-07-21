"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

// 🎨 Цвета для каждой эры
const eraColors = {
  dashboard: {
    bg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-400",
    text: "text-emerald-300",
    icon: "text-emerald-400",
    hover: "hover:bg-emerald-500/10",
    active: "bg-emerald-500/20 border-l-4 border-emerald-400",
  },
  schedule: {
    bg: "bg-gradient-to-br from-red-500/20 to-rose-500/20",
    border: "border-red-400",
    text: "text-red-300",
    icon: "text-red-400",
    hover: "hover:bg-red-500/10",
    active: "bg-red-500/20 border-l-4 border-red-400",
  },
  students: {
    bg: "bg-gradient-to-br from-sky-500/20 to-blue-500/20",
    border: "border-sky-400",
    text: "text-sky-300",
    icon: "text-sky-400",
    hover: "hover:bg-sky-500/10",
    active: "bg-sky-500/20 border-l-4 border-sky-400",
  },
  homeworks: {
    bg: "bg-gradient-to-br from-amber-700/20 to-stone-700/20",
    border: "border-amber-600",
    text: "text-amber-300",
    icon: "text-amber-500",
    hover: "hover:bg-amber-700/10",
    active: "bg-amber-700/20 border-l-4 border-amber-600",
  },
  library: {
    bg: "bg-gradient-to-br from-orange-600/20 to-red-700/20",
    border: "border-orange-500",
    text: "text-orange-300",
    icon: "text-orange-500",
    hover: "hover:bg-orange-600/10",
    active: "bg-orange-600/20 border-l-4 border-orange-500",
  },
  trainers: {
    bg: "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
    border: "border-purple-400",
    text: "text-purple-300",
    icon: "text-purple-400",
    hover: "hover:bg-purple-500/10",
    active: "bg-purple-500/20 border-l-4 border-purple-400",
  },
  chat: {
    bg: "bg-gradient-to-br from-pink-500/20 to-rose-500/20",
    border: "border-pink-400",
    text: "text-pink-300",
    icon: "text-pink-400",
    hover: "hover:bg-pink-500/10",
    active: "bg-pink-500/20 border-l-4 border-pink-400",
  },
  courses: {
    bg: "bg-gradient-to-br from-blue-500/20 to-indigo-500/20",
    border: "border-blue-400",
    text: "text-blue-300",
    icon: "text-blue-400",
    hover: "hover:bg-blue-500/10",
    active: "bg-blue-500/20 border-l-4 border-blue-400",
  },
  payments: {
    bg: "bg-gradient-to-br from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-400",
    text: "text-yellow-300",
    icon: "text-yellow-400",
    hover: "hover:bg-yellow-500/10",
    active: "bg-yellow-500/20 border-l-4 border-yellow-400",
  },
  settings: {
    bg: "bg-gradient-to-br from-stone-500/20 to-emerald-700/20",
    border: "border-stone-400",
    text: "text-stone-300",
    icon: "text-stone-400",
    hover: "hover:bg-stone-500/10",
    active: "bg-stone-500/20 border-l-4 border-stone-400",
  },
  profile: {
    bg: "bg-gradient-to-br from-pink-400/20 to-rose-400/20",
    border: "border-pink-300",
    text: "text-pink-200",
    icon: "text-pink-300",
    hover: "hover:bg-pink-400/10",
    active: "bg-pink-400/20 border-l-4 border-pink-300",
  },
  progress: {
    bg: "bg-gradient-to-br from-pink-500/20 to-orange-500/20",
    border: "border-pink-400",
    text: "text-pink-300",
    icon: "text-pink-400",
    hover: "hover:bg-pink-500/10",
    active: "bg-pink-500/20 border-l-4 border-pink-400",
  },
  trials: {
    bg: "bg-gradient-to-br from-amber-500/20 to-yellow-500/20",
    border: "border-amber-400",
    text: "text-amber-300",
    icon: "text-amber-400",
    hover: "hover:bg-amber-500/10",
    active: "bg-amber-500/20 border-l-4 border-amber-400",
  },
  leaderboard: {
    bg: "bg-gradient-to-br from-yellow-600/20 to-amber-700/20",
    border: "border-yellow-500",
    text: "text-yellow-200",
    icon: "text-yellow-400",
    hover: "hover:bg-yellow-600/10",
    active: "bg-yellow-600/20 border-l-4 border-yellow-500",
  },
  analytics: {
    bg: "bg-gradient-to-br from-indigo-600/20 to-purple-700/20",
    border: "border-indigo-400",
    text: "text-indigo-300",
    icon: "text-indigo-400",
    hover: "hover:bg-indigo-600/10",
    active: "bg-indigo-600/20 border-l-4 border-indigo-400",
  },
  pricing: {
    bg: "bg-gradient-to-br from-rose-400/20 to-amber-400/20",
    border: "border-rose-300",
    text: "text-rose-200",
    icon: "text-rose-300",
    hover: "hover:bg-rose-400/10",
    active: "bg-rose-400/20 border-l-4 border-rose-300",
  },
  default: {
    bg: "bg-white/5",
    border: "border-white/10",
    text: "text-gray-300",
    icon: "text-gray-400",
    hover: "hover:bg-white/5",
    active: "bg-white/10 border-l-4 border-white/30",
  },
};

function getColorKey(href: string): string {
  if (href.includes("schedule")) return "schedule";
  if (href.includes("students")) return "students";
  if (href.includes("homeworks")) return "homeworks";
  if (href.includes("library")) return "library";
  if (href.includes("trainers")) return "trainers";
  if (href.includes("chat")) return "chat";
  if (href.includes("courses")) return "courses";
  if (href.includes("payments")) return "payments";
  if (href.includes("settings")) return "settings";
  if (href.includes("profile")) return "profile";
  if (href.includes("progress")) return "progress";
  if (href.includes("trials")) return "trials";
  if (href.includes("leaderboard")) return "leaderboard";
  if (href.includes("analytics")) return "analytics";
  if (href.includes("pricing")) return "pricing";
  return "default";
}

const menuByRole = {
  tutor: [
    { group: "Основное", items: [
      { href: "/dashboard", icon: "🏠", label: "Главная" },
      { href: "/schedule", icon: "📅", label: "Расписание" },
      { href: "/students", icon: "", label: "Ученики" },
    ]},
    { group: "Обучение", items: [
      { href: "/homeworks", icon: "📚", label: "Задания" },
      { href: "/library", icon: "📦", label: "Банк заданий" },
      { href: "/courses", icon: "📖", label: "Курсы" },
    ]},
    { group: "Аналитика", items: [
      { href: "/analytics", icon: "📊", label: "Статистика" },
    ]},
    { group: "Финансы и связь", items: [
      { href: "/payments", icon: "💳", label: "Платежи" },
      { href: "/chat", icon: "💬", label: "Чат" },
      { href: "/settings", icon: "⚙️", label: "Настройки" },
    ]},
  ],
  student: [
    { group: "Основное", items: [
      { href: "/dashboard", icon: "", label: "Главная" },
      { href: "/schedule", icon: "📅", label: "Расписание" },
    ]},
    { group: "Обучение", items: [
      { href: "/homeworks", icon: "📚", label: "Задания" },
      { href: "/courses", icon: "📖", label: "Курсы" },
    ]},
    { group: "Прогресс", items: [
      { href: "/progress", icon: "📈", label: "Прогресс" },
      { href: "/trials", icon: "🎓", label: "Пробники" },
      { href: "/leaderboard", icon: "🏆", label: "Рейтинг" },
    ]},
    { group: "Связь", items: [
      { href: "/chat", icon: "", label: "Чат" },
      { href: "/pricing", icon: "💰", label: "Тарифы" },
    ]},
  ],
  parent: [
    { group: "Основное", items: [
      { href: "/dashboard", icon: "🏠", label: "Главная" },
      { href: "/schedule", icon: "📅", label: "Расписание" },
    ]},
    { group: "Контроль", items: [
      { href: "/progress", icon: "📈", label: "Прогресс" },
      { href: "/homeworks", icon: "", label: "Задания" },
    ]},
    { group: "Финансы и связь", items: [
      { href: "/payments", icon: "💳", label: "Платежи" },
      { href: "/chat", icon: "💬", label: "Чат" },
      { href: "/pricing", icon: "💰", label: "Тарифы" },
    ]},
  ],
  admin: [
    { group: "Управление", items: [
      { href: "/dashboard", icon: "🏠", label: "Главная" },
      { href: "/analytics", icon: "", label: "Аналитика" },
    ]},
    { group: "Пользователи", items: [
      { href: "/students", icon: "👥", label: "Ученики" },
      { href: "/trainers", icon: "👨‍🏫", label: "Репетиторы" },
    ]},
    { group: "Финансы", items: [
      { href: "/payments", icon: "💰", label: "Платежи" },
    ]},
    { group: "Система", items: [
      { href: "/settings", icon: "⚙️", label: "Настройки" },
    ]},
  ],
};

const PUBLIC_PATHS = ["/", "/pricing", "/auth/login", "/auth/register", "/auth/signout"];

function handleLogout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("uid");
    localStorage.removeItem("role");
    localStorage.removeItem("theme");
    window.location.href = "/auth/login";
  }
}

interface SidebarProps {
  theme?: "dark" | "light";
}

export default function Sidebar({ theme = "dark" }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === "dark";
  const menuGroups = menuByRole[role as keyof typeof menuByRole] || menuByRole.student;

  useEffect(() => {
    if (!uid) return;
    const name = localStorage.getItem("userName") || "";
    const avatar = localStorage.getItem("userAvatar") || "";
    setUserName(name);
    setUserAvatar(avatar);
  }, [uid]);

  useEffect(() => {
    const checkSize = () => {
      setIsTablet(window.innerWidth < 1024 && window.innerWidth >= 768);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  useEffect(() => {
    if (isTablet) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20 && !isOpen) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => setIsOpen(true), 300);
      } else if (e.clientX > 280 && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isOpen, isTablet]);

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/")) return null;
  if (!uid) return null;

  const roleInfo = {
    tutor: { label: "Репетитор", icon: "‍🏫", color: "from-emerald-400 to-teal-500" },
    student: { label: "Ученик", icon: "🎓", color: "from-sky-400 to-blue-500" },
    parent: { label: "Родитель", icon: "👨‍👩‍👧", color: "from-pink-400 to-rose-500" },
    admin: { label: "Админ", icon: "🛡️", color: "from-red-400 to-orange-500" },
  }[role] || { label: "Гость", icon: "👤", color: "from-gray-400 to-gray-500" };

  // 🎨 Цвета сайдбара для каждой темы
  const sidebarBg = isDark 
    ? "bg-gradient-to-br from-black via-gray-900 to-black border-yellow-500/30"
    : "bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 border-pink-300";
  
  const borderColor = isDark ? "border-yellow-500/30" : "border-pink-200";
  const groupLabelColor = isDark ? "text-yellow-500/70" : "text-pink-500/80";
  const menuItemHover = isDark ? "hover:bg-yellow-500/10" : "hover:bg-pink-100";
  const logoutHover = isDark ? "hover:bg-red-500/10" : "hover:bg-red-50";

  return (
    <>
      {/* Десктопный сайдбар */}
      <div
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen ${sidebarBg} border-r ${borderColor} z-40 transition-all duration-300 shadow-2xl`}
        style={{
          width: isOpen ? "280px" : "0px",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
        }}
      >
        {/* Шапка */}
        <div className={`p-4 ${borderColor} border-b flex items-center justify-between h-16`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <span className={`font-black text-sm bg-gradient-to-r ${isDark ? 'from-yellow-400 to-amber-400' : 'from-pink-600 to-rose-600'} bg-clip-text text-transparent whitespace-nowrap`}>
              Jenyawisch
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={`${isDark ? 'text-yellow-400/60 hover:text-yellow-300' : 'text-pink-600 hover:text-pink-700'} transition text-xl`}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* Профиль */}
        <div className={`p-4 ${borderColor} border-b`}>
          <Link href={`/profile?uid=${uid}&role=${role}`} className="flex items-center gap-3 group">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition`}>
              {userAvatar || userName[0]?.toUpperCase() || roleInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm truncate`}>{userName || "Пользователь"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs">{roleInfo.icon}</span>
                <span className={`text-xs bg-gradient-to-r ${roleInfo.color} bg-clip-text text-transparent font-medium`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Меню */}
        <nav className="flex-1 py-4 overflow-y-auto sidebar-nav">
          {menuGroups.map((group, gi) => (
            <div key={gi} className="mb-4">
              <p className={`px-4 mb-2 text-xs font-bold ${groupLabelColor} uppercase tracking-wider`}>
                {group.group}
              </p>
              <div className="space-y-1 px-2">
                {group.items.map((item) => {
                  const fullHref = `${item.href}?uid=${uid}&role=${role}`;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const colorKey = getColorKey(item.href);
                  const colors = eraColors[colorKey as keyof typeof eraColors] || eraColors.default;

                  return (
                    <Link
                      key={item.href}
                      href={fullHref}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? `${colors.active} ${isDark ? 'text-black' : colors.text} font-bold shadow-lg`
                          : `${menuItemHover} text-gray-400`
                      }`}
                    >
                      <span className={`text-xl flex-shrink-0 w-8 text-center transition-transform group-hover:scale-110 ${
                        isActive ? (isDark ? 'text-black' : colors.icon) : colors.icon
                      }`}>
                        {item.icon}
                      </span>
                      <span className={`text-sm whitespace-nowrap transition-colors ${
                        isActive 
                          ? (isDark ? 'text-black font-bold' : colors.text) 
                          : (isDark ? 'text-gray-300' : 'text-gray-700')
                      }`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <div className={`absolute right-2 w-1.5 h-1.5 rounded-full animate-pulse ${
                          isDark ? 'bg-black' : 'bg-current'
                        }`}></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Нижняя панель — БЕЗ колокольчика */}
        <div className={`p-4 ${borderColor} border-t`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 ${logoutHover} rounded-xl p-2 transition text-left group`}
          >
            <span className="text-xl flex-shrink-0 w-8 text-center group-hover:scale-110 transition">🚪</span>
            <span className={`text-sm ${isDark ? 'text-red-400 group-hover:text-red-300' : 'text-red-600 group-hover:text-red-700'}`}>
              Выйти
            </span>
          </button>
        </div>
      </div>

      {/* Кнопка открытия */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-6 h-16 ${isDark ? 'bg-gradient-to-r from-yellow-600 to-amber-600' : 'bg-gradient-to-r from-pink-500 to-rose-500'} rounded-r-xl items-center justify-center text-white shadow-lg hover:w-8 transition-all`}
          title="Открыть меню"
        >
          <span className="text-sm">›</span>
        </button>
      )}

      {/* Мобильная кнопка */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className={`fixed top-4 left-4 z-50 w-10 h-10 ${isDark ? 'bg-gradient-to-br from-yellow-600 to-amber-600' : 'bg-gradient-to-br from-pink-500 to-rose-500'} rounded-xl shadow-lg flex items-center justify-center lg:hidden`}
      >
        <div className="space-y-1.5">
          <span className={`block w-5 h-0.5 bg-white transition-transform ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </div>
      </button>

      {/* Мобильное меню */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className={`relative w-80 h-full shadow-2xl overflow-y-auto animate-slide-in ${sidebarBg} border-r ${borderColor}`}>
            {/* Шапка */}
            <div className={`p-4 ${borderColor} border-b flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧪</span>
                <span className={`font-black text-sm bg-gradient-to-r ${isDark ? 'from-yellow-400 to-amber-400' : 'from-pink-600 to-rose-600'} bg-clip-text text-transparent`}>
                  Jenyawisch
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className={`${isDark ? 'text-yellow-400/60 hover:text-yellow-300' : 'text-pink-600 hover:text-pink-700'} text-xl`}>✕</button>
            </div>

            {/* Профиль */}
            <div className={`p-4 ${borderColor} border-b`}>
              <Link href={`/profile?uid=${uid}&role=${role}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 group">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition`}>
                  {userAvatar || userName[0]?.toUpperCase() || roleInfo.icon}
                </div>
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{userName || "Пользователь"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs">{roleInfo.icon}</span>
                    <span className={`text-xs bg-gradient-to-r ${roleInfo.color} bg-clip-text text-transparent font-medium`}>
                      {roleInfo.label}
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Меню */}
            <nav className="py-4">
              {menuGroups.map((group, gi) => (
                <div key={gi} className="mb-4">
                  <p className={`px-4 mb-2 text-xs font-bold ${groupLabelColor} uppercase tracking-wider`}>
                    {group.group}
                  </p>
                  <div className="space-y-1 px-2">
                    {group.items.map((item) => {
                      const fullHref = `${item.href}?uid=${uid}&role=${role}`;
                      const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      const colorKey = getColorKey(item.href);
                      const colors = eraColors[colorKey as keyof typeof eraColors] || eraColors.default;

                      return (
                        <Link
                          key={item.href}
                          href={fullHref}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                            isActive
                              ? `${colors.active} ${isDark ? 'text-black' : colors.text} font-bold shadow-lg`
                              : `${menuItemHover} text-gray-400`
                          }`}
                        >
                          <span className={`text-xl w-8 text-center ${
                            isActive ? (isDark ? 'text-black' : colors.icon) : colors.icon
                          }`}>{item.icon}</span>
                          <span className={`text-sm ${
                            isActive 
                              ? (isDark ? 'text-black font-bold' : colors.text) 
                              : (isDark ? 'text-gray-300' : 'text-gray-700')
                          }`}>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Нижняя панель — БЕЗ колокольчика */}
            <div className={`p-4 ${borderColor} border-t`}>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className={`w-full flex items-center gap-3 ${logoutHover} rounded-xl p-3 transition text-left`}
              >
                <span className="text-xl w-8 text-center">🚪</span>
                <span className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>Выйти</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-nav {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .sidebar-nav::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}