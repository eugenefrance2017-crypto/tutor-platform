"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, query, where, onSnapshot, getDocs, doc, getDoc,
  addDoc, updateDoc, deleteDoc
} from "firebase/firestore";
import toast from "react-hot-toast";
import Sidebar from "../Sidebar";
import NotificationBell from "../NotificationBell";
import confetti from 'canvas-confetti';
import { motion } from "framer-motion";

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

// ============ УТИЛИТЫ ============
const getDaysUntilExam = () => {
  const examDate = new Date(2027, 5, 1);
  return Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const getFormattedDate = () => {
  const formatted = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
};

// ============ АНИМИРОВАННЫЕ КОМПОНЕНТЫ ============
function AnimatedCard({ children, delay = 0, className = "" }: any) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)'
      }}
    >
      {children}
    </div>
  );
}

function CountUpNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) { setDisplayValue(0); return; }
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{displayValue}</>;
}

function StatCard({ icon, value, label, sub, color, delay = 50 }: any) {
  return (
    <AnimatedCard delay={delay}>
      <div className={`rounded-2xl p-3 sm:p-4 text-center hover:scale-105 transition-all duration-300 text-white bg-gradient-to-r ${color} shadow-lg hover:shadow-2xl relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"></div>
        <div className="relative">
          <div className="text-2xl sm:text-3xl mb-1 transition-transform duration-300 group-hover:scale-110">{icon}</div>
          <p className="text-xl sm:text-2xl font-bold">
            <CountUpNumber value={typeof value === 'number' ? value : 0} />
            {typeof value !== 'number' && value}
          </p>
          <p className="text-xs opacity-80">{label}</p>
          <p className="text-[10px] opacity-70 mt-1">{sub}</p>
        </div>
      </div>
    </AnimatedCard>
  );
}

function QuickAction({ href, icon, label, color, delay = 250 }: any) {
  return (
    <AnimatedCard delay={delay}>
      <Link 
        href={href} 
        className={`rounded-2xl p-3 sm:p-4 text-center transition-all duration-300 hover:scale-105 text-white font-medium block bg-gradient-to-r ${color} shadow-lg hover:shadow-2xl relative overflow-hidden group`}
      >
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300"></div>
        <div className="relative">
          <div className="text-xl sm:text-2xl mb-1 transition-transform duration-300 group-hover:scale-110">{icon}</div>
          <span className="text-xs sm:text-sm">{label}</span>
        </div>
      </Link>
    </AnimatedCard>
  );
}

// ============ 🎯 XP RING ============
function XPRing({ xp, level, maxXp = 500 }: { xp: number; level: number; maxXp?: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(xp / maxXp, 1);
  const offset = circumference - (progress * circumference);

  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200 dark:text-gray-700" />
        <motion.circle
          cx="48" cy="48" r={radius}
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          {level}
        </span>
        <span className="text-[10px] text-gray-500">Уровень</span>
      </div>
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
          {xp}/{maxXp} XP
        </span>
      </div>
    </div>
  );
}

// ============ 🔥 STREAK COUNTER ============
function StreakCounter({ streak = 0 }: { streak: number }) {
  const [animatedStreak, setAnimatedStreak] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStreak(streak), 300);
    return () => clearTimeout(timer);
  }, [streak]);

  return (
    <motion.div 
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.8 }}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-2xl"
      >
        🔥
      </motion.span>
      <div>
        <p className="text-xs opacity-90">Серия дней</p>
        <p className="text-2xl font-black">{animatedStreak}</p>
      </div>
      {streak >= 7 && (
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs bg-white/20 px-2 py-1 rounded-full"
        >
           Неделя!
        </motion.span>
      )}
    </motion.div>
  );
}

// ============ 🎯 DAILY GOAL ============
function DailyGoal({ completed = 0, total = 3 }: { completed: number; total: number }) {
  const progress = Math.min(completed / total, 1);
  const isComplete = completed >= total;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border-2 transition-all ${
        isComplete 
          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500' 
          : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: isComplete ? 360 : 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl"
          >
            {isComplete ? '🏆' : '🎯'}
          </motion.span>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">Цель на сегодня</h3>
            <p className="text-xs text-gray-500">Решай задачи каждый день</p>
          </div>
        </div>
        <span className={`text-2xl font-black ${isComplete ? 'text-green-500' : 'text-purple-500'}`}>
          {completed}/{total}
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div 
          className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      {isComplete && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-green-600 dark:text-green-400 font-bold mt-2 text-center"
        >
          ✨ Цель достигнута! Ты молодец!
        </motion.p>
      )}
    </motion.div>
  );
}

// ============  NEXT ACTION ============
function NextAction({ lessons, homeworks }: { lessons: any[]; homeworks: any[] }) {
  const nextLesson = lessons[0];
  const urgentHomework = homeworks.find(h => h.status === 'pending' || h.status === 'active');
  
  let action, icon, color;
  
  if (nextLesson && new Date(nextLesson.start_time) < new Date(Date.now() + 3600000)) {
    const minutesUntil = Math.round((new Date(nextLesson.start_time).getTime() - Date.now()) / 60000);
    action = `Занятие через ${minutesUntil} мин`;
    icon = '📚';
    color = 'from-purple-500 to-indigo-600';
  } else if (urgentHomework) {
    action = `Выполни ДЗ: ${urgentHomework.title || 'Задание'}`;
    icon = '📝';
    color = 'from-pink-500 to-rose-600';
  } else {
    action = 'Повтори пройденный материал';
    icon = '💡';
    color = 'from-amber-500 to-orange-600';
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`rounded-2xl p-5 bg-gradient-to-r ${color} text-white shadow-lg cursor-pointer`}
    >
      <div className="flex items-center gap-3">
        <motion.span 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-3xl"
        >
          {icon}
        </motion.span>
        <div className="flex-1">
          <p className="text-xs opacity-90 mb-1">Следующее действие</p>
          <p className="font-bold">{action}</p>
        </div>
        <span className="text-2xl">→</span>
      </div>
    </motion.div>
  );
}

// ============ 💀 SKELETON LOADING ============
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 bg-white/5 border border-white/10 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-700"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ============ 🎨 EMPTY STATE ============
function EmptyState({ icon, title, description, action }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="text-6xl mb-4"
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {action && (
        <button className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:scale-105 transition">
          {action}
        </button>
      )}
    </motion.div>
  );
}

// ============ ТАЙМЕР ПОМОДОРО ============
function PomodoroTimer({ theme }: any) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const isLight = theme === 'light';

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      toast.success(mode === 'work' ? '⏰ Время перерыва!' : '🎯 Пора работать!');
      setMode(mode === 'work' ? 'break' : 'work');
      setTimeLeft(mode === 'work' ? 5 * 60 : 25 * 60);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${isLight ? 'bg-purple-50/50 border-purple-200' : 'bg-purple-500/5 border-purple-500/20'} border backdrop-blur`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${isLight ? 'text-gray-800' : 'text-white'}`}>🍅 Таймер Помодоро</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${mode === 'work' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>
          {mode === 'work' ? 'Работа' : 'Перерыв'}
        </span>
      </div>
      <div className="text-center">
        <p className={`text-4xl sm:text-5xl font-bold mb-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </p>
        <button
          onClick={() => setIsActive(!isActive)}
          className={`px-6 py-2 rounded-xl font-medium transition ${isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
        >
          {isActive ? '⏸ Пауза' : '▶️ Старт'}
        </button>
      </div>
    </div>
  );
}

// ============ ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ============
function ThemeToggle({ theme, setTheme }: any) {
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`fixed top-24 right-4 z-50 w-14 h-14 rounded-full shadow-2xl overflow-hidden transition-all duration-500 hover:scale-110 group ${
        theme === 'light' ? 'shadow-pink-200/50' : 'shadow-white/10'
      }`}
    >
      <div className={`absolute inset-0 transition-all duration-500 ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
        <span className="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🐍</span>
      </div>
      <div className={`absolute inset-0 transition-all duration-500 ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-rose-400 to-red-400"></div>
        <span className="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💖</span>
      </div>
      <div className={`absolute inset-0 rounded-full ring-2 transition-all ${
        theme === 'light' ? 'ring-pink-300/50 group-hover:ring-pink-400/70' : 'ring-white/30 group-hover:ring-white/50'
      }`}></div>
    </button>
  );
}

// ============ ROLE ROUTER ============
function RoleBasedDashboard({ role, uid, theme, userData }: any) {
  switch(role) {
    case 'tutor': return <TutorDashboard uid={uid} theme={theme} userData={userData} />;
    case 'student': return <StudentDashboard uid={uid} theme={theme} userData={userData} />;
    case 'parent': return <ParentDashboard uid={uid} theme={theme} userData={userData} />;
    case 'admin': return <AdminDashboard uid={uid} theme={theme} userData={userData} />;
    default: return <StudentDashboard uid={uid} theme={theme} userData={userData} />;
  }
}

// ============ TUTOR DASHBOARD ============
function TutorDashboard({ uid, theme, userData }: any) {
  const [studentsCount, setStudentsCount] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [todayLessons, setTodayLessons] = useState(0);
  const [pendingHomeworks, setPendingHomeworks] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [paidLessonsCount, setPaidLessonsCount] = useState(0);
  const [averagePerDay, setAveragePerDay] = useState(0);
  const [forecast, setForecast] = useState(0);
  const [totalLessonsCount, setTotalLessonsCount] = useState(0);
  const [weekChart, setWeekChart] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [todayDate, setTodayDate] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const daysUntilExam = getDaysUntilExam();

  const isLight = theme === 'light';
  const cardBg = isLight 
    ? 'bg-white/90 backdrop-blur border border-pink-200 shadow-lg shadow-pink-200/20' 
    : 'bg-white/5 backdrop-blur border border-white/10';
  const cardBgHover = isLight ? 'hover:bg-pink-50/50' : 'hover:bg-white/10';
  const textColor = isLight ? 'text-gray-800' : 'text-white';
  const subTextColor = isLight ? 'text-gray-500' : 'text-gray-400';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  useEffect(() => {
    if (studentsCount === 0) return;
    const newInsights: string[] = [];
    if (topStudents.length > 0 && topStudents[0]) {
      newInsights.push(`💡 Лучший ученик: ${topStudents[0]?.full_name || 'Иван'} с прогрессом ${topStudents[0]?.progress || 85}%`);
    }
    if (pendingHomeworks > 3) newInsights.push(`⚠️ ${pendingHomeworks} непроверенных ДЗ — пора проверить!`);
    if (todayLessons === 0) newInsights.push(` Сегодня нет занятий — отличный день для планирования!`);
    if (totalEarned > 0 && averagePerDay > 0) newInsights.push(`💰 Средний доход: ${averagePerDay.toLocaleString()} ₽/день`);
    if (studentsCount > 5) newInsights.push(` У тебя ${studentsCount} учеников — ты популярный репетитор!`);
    setInsights(newInsights);
  }, [studentsCount, topStudents, pendingHomeworks, todayLessons, totalEarned, averagePerDay]);

  useEffect(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
    setMonthlyIncome(months.map(m => ({ month: m, amount: Math.floor(Math.random() * 15000) + 5000 })));
  }, []);

  useEffect(() => {
    if (!uid) return;
    
    const loadData = async () => {
      try {
        const q = query(collection(db, "profiles"), where("role", "==", "student"));
        const snap = await getDocs(q);
        const studentsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudentsCount(studentsList.length);
        setActiveStudents(studentsList.filter(s => s.status === "active").length);
        setTopStudents(studentsList.slice(0, 5).map(s => ({ ...s, progress: Math.floor(Math.random() * 40) + 60 })));
      } catch (e) {}
      setLoading(false);
    };
    loadData();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("tutor_id", "==", uid)), (snap) => {
      const lessonsList = snap.docs.map(d => d.data());
      setTodayLessons(lessonsList.filter(l => {
        const start = new Date(l.start_time);
        return start >= today && start < tomorrow;
      }).length);
      setTotalLessonsCount(lessonsList.length);
      
      const weekData = [0, 0, 0, 0, 0, 0, 0];
      lessonsList.forEach(l => {
        const day = new Date(l.start_time).getDay();
        weekData[day === 0 ? 6 : day - 1]++;
      });
      
      setWeekChart(weekData.map((count, i) => ({
        day: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i],
        count,
        max: Math.max(...weekData, 1)
      })));

      setUpcomingLessons(lessonsList.filter(l => new Date(l.start_time) > new Date()).slice(0, 5));
    });
    
    const unsubHomeworks = onSnapshot(query(collection(db, "homeworks"), where("tutor_id", "==", uid)), (snap) => {
      setPendingHomeworks(snap.docs.length);
    });
    
    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("tutor_id", "==", uid), where("status", "==", "paid")), 
      (snap) => {
        const total = snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
        setTotalEarned(total);
        setPaidLessonsCount(snap.docs.length);
        
        if (snap.docs.length > 0) {
          const firstPayment = snap.docs.reduce((earliest, doc) => {
            const date = doc.data().created_at?.toDate?.() || new Date();
            return date < earliest ? date : earliest;
          }, new Date());
          
          const daysActive = Math.max(1, Math.ceil((Date.now() - firstPayment.getTime()) / (1000 * 60 * 60 * 24)));
          const avg = Math.round(total / daysActive);
          setAveragePerDay(avg);
          setForecast(avg * 30);
        }
      }
    );
    
    return () => { unsubLessons(); unsubHomeworks(); unsubPayments(); };
  }, [uid]);

  if (loading) {
    return (
      <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonGrid count={4} />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-2xl shadow-lg">
                {userData?.catAvatar || userData?.avatar || (userData?.full_name ? userData.full_name[0].toUpperCase() : "🐱")}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  {getGreeting()}, {userData?.full_name || "Репетитор"}!
                </h1>
                <p className={`text-sm ${subTextColor}`}>Сегодня {todayDate}</p>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {insights.length > 0 && (
          <AnimatedCard delay={50}>
            <div className={`rounded-2xl p-4 ${cardBg}`}>
              <div className="flex items-start gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <p className={`text-sm font-semibold ${textColor}`}>AI Insights</p>
                  <div className="space-y-1 mt-1">
                    {insights.slice(0, 3).map((insight, idx) => (
                      <p key={idx} className={`text-sm ${subTextColor}`}>{insight}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="👥" value={studentsCount} label="всего учеников" sub={`${activeStudents} активных`} color="from-purple-500 to-indigo-600" />
          <StatCard icon="📅" value={todayLessons} label="сегодня занятий" sub={`${totalLessonsCount} всего`} color="from-pink-500 to-rose-600" />
          <StatCard icon="📝" value={pendingHomeworks} label="на проверку" sub="ожидают проверки" color="from-amber-500 to-orange-600" />
          <StatCard icon="⏰" value={daysUntilExam > 0 ? daysUntilExam : 0} label="дней до ЕГЭ" sub={daysUntilExam > 0 ? "осталось" : "экзамен прошёл"} color="from-emerald-500 to-teal-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard delay={100}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <h3 className={`font-semibold ${textColor} mb-3`}>📊 Занятий по дням недели</h3>
              <div className="flex items-end gap-2 h-32">
                {weekChart.map((item, idx) => {
                  const barColors = ["#EC4899", "#A855F7", "#6366F1", "#3B82F6", "#06B6D4", "#14B8A6", "#10B981"];
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-xs font-medium ${textColor}`}>{item.count}</span>
                      <div className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80" style={{
                        height: `${(item.count / (item.max || 1)) * 80}px`,
                        background: `linear-gradient(to top, ${barColors[idx]}, ${barColors[idx]}cc)`
                      }}></div>
                      <span className="text-xs" style={{ color: barColors[idx] }}>{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={120}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <h3 className={`font-semibold ${textColor} mb-3`}> Доход по месяцам</h3>
              <div className="flex items-end gap-2 h-32">
                {monthlyIncome.map((item, idx) => {
                  const maxAmount = Math.max(...monthlyIncome.map(i => i.amount), 1);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-xs font-medium ${textColor}`}>{item.amount.toLocaleString()}</span>
                      <div className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80" style={{
                        height: `${(item.amount / maxAmount) * 80}px`,
                        background: 'linear-gradient(to top, #EC4899, #A855F7)'
                      }}></div>
                      <span className={`text-xs ${subTextColor}`}>{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard delay={150}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${textColor}`}>📅 Ближайшие занятия</h3>
                <button onClick={() => setShowAllUpcoming(!showAllUpcoming)} className={`text-xs ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>
                  {showAllUpcoming ? "Скрыть" : "Все →"}
                </button>
              </div>
              {upcomingLessons.length === 0 ? (
                <EmptyState 
                  icon="📅" 
                  title="Нет занятий" 
                  description="Запланируй первое занятие с учеником"
                  action="Создать занятие"
                />
              ) : (
                <div className="space-y-2">
                  {(showAllUpcoming ? upcomingLessons : upcomingLessons.slice(0, 3)).map((lesson, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-pink-50/50' : 'bg-white/5'} ${cardBgHover} transition-all duration-300`}>
                      <div>
                        <p className={`font-medium text-sm ${textColor}`}>{lesson.student_name || "Ученик"}</p>
                        <p className={`text-xs ${subTextColor}`}>{new Date(lesson.start_time).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                        {lesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedCard>

          <AnimatedCard delay={180}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${textColor}`}> Топ учеников</h3>
                <Link href={`/students?uid=${uid}&role=tutor`} className={`text-xs ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
              </div>
              <div className="space-y-3">
                {topStudents.slice(0, 5).map((student, idx) => (
                  <div key={student.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={textColor}>{idx + 1}. {student.full_name || student.email || "Ученик"}</span>
                      <span className={`font-bold ${student.progress > 80 ? 'text-emerald-400' : student.progress > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {student.progress}%
                      </span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full ${isLight ? 'bg-pink-100' : 'bg-white/5'}`}>
                      <div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${student.progress}%` }}></div>
                    </div>
                  </div>
                ))}
                {topStudents.length === 0 && <p className={`${subTextColor} text-center py-4`}>Нет данных</p>}
              </div>
            </div>
          </AnimatedCard>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href={`/schedule?uid=${uid}&role=tutor`} icon="📅" label="Создать занятие" color="from-purple-500 to-indigo-600" />
          <QuickAction href={`/homeworks?uid=${uid}&role=tutor`} icon="📚" label="Задать ДЗ" color="from-pink-500 to-rose-600" />
          <QuickAction href={`/library?uid=${uid}&role=tutor`} icon="📦" label="Библиотека" color="from-amber-500 to-orange-600" />
          <QuickAction href={`/exam-trials?uid=${uid}&role=tutor`} icon="📝" label="Пробник" color="from-emerald-500 to-teal-600" />
        </div>

        <AnimatedCard delay={250}>
          <div className={`rounded-2xl p-5 ${cardBg}`}>
            <h3 className={`font-semibold ${textColor} mb-3`}> Доход</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`text-center p-4 rounded-xl ${isLight ? 'bg-pink-50' : 'bg-pink-500/5'}`}>
                <p className={`text-xs ${subTextColor}`}>Заработано</p>
                <p className="text-3xl font-black text-pink-500"><CountUpNumber value={totalEarned} /> ₽</p>
                <p className={`text-xs ${subTextColor}`}>{paidLessonsCount} оплаченных занятий</p>
              </div>
              <div className={`text-center p-4 rounded-xl ${isLight ? 'bg-purple-50' : 'bg-purple-500/5'}`}>
                <p className={`text-xs ${subTextColor}`}>Среднее/день</p>
                <p className="text-3xl font-black text-purple-400"><CountUpNumber value={averagePerDay} /> ₽</p>
                <p className={`text-xs ${subTextColor}`}>за всё время</p>
              </div>
              <div className={`text-center p-4 rounded-xl ${isLight ? 'bg-amber-50' : 'bg-amber-500/5'}`}>
                <p className={`text-xs ${subTextColor}`}>Прогноз на месяц</p>
                <p className="text-3xl font-black text-amber-500"><CountUpNumber value={forecast} /> ₽</p>
                <p className={`text-xs ${subTextColor}`}>на основе среднего</p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </main>
  );
}

// ============ STUDENT DASHBOARD ============
function StudentDashboard({ uid, theme, userData }: any) {
  const [todayLessons, setTodayLessons] = useState(0);
  const [pendingHomeworks, setPendingHomeworks] = useState(0);
  const [completedHomeworks, setCompletedHomeworks] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [weekChart, setWeekChart] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [recentHomeworks, setRecentHomeworks] = useState<any[]>([]);
  const [todayDate, setTodayDate] = useState("");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [prevLevel, setPrevLevel] = useState(1);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const daysUntilExam = getDaysUntilExam();

  const isLight = theme === 'light';
  const cardBg = isLight 
    ? 'bg-white/90 backdrop-blur border border-pink-200 shadow-lg shadow-pink-200/20' 
    : 'bg-white/5 backdrop-blur border border-white/10';
  const textColor = isLight ? 'text-gray-800' : 'text-white';
  const subTextColor = isLight ? 'text-gray-500' : 'text-gray-400';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  // Confetti при повышении уровня
  useEffect(() => {
    if (level > prevLevel && prevLevel > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#A855F7', '#6366F1', '#F59E0B']
      });
      toast.success(`🎉 Поздравляем! Вы достигли уровня ${level}!`);
    }
    setPrevLevel(level);
  }, [level]);

  useEffect(() => {
    setAchievements([
      { icon: '🎯', label: '10 ДЗ', progress: Math.min(completedHomeworks / 10, 1) },
      { icon: '⭐', label: '1000 XP', progress: Math.min(xp / 1000, 1) },
      { icon: '📚', label: 'Отличник', progress: Math.min(averageScore / 80, 1) },
    ]);
  }, [completedHomeworks, xp, averageScore]);

  useEffect(() => {
    const newRecommendations: string[] = [];
    if (averageScore < 70 && averageScore > 0) newRecommendations.push('📖 Повтори тему "Кислоты" к следующему занятию');
    if (pendingHomeworks > 2) newRecommendations.push('⚠️ У тебя есть невыполненные ДЗ — пора сделать!');
    if (todayLessons === 0) newRecommendations.push('📅 Сегодня нет занятий — отличный день для самоподготовки');
    if (xp > 0 && xp < 500) newRecommendations.push('💪 Набери 500 XP для нового уровня!');
    setRecommendations(newRecommendations);
  }, [averageScore, pendingHomeworks, todayLessons, xp]);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", uid)), (snap) => {
      const lessonsList = snap.docs.map(d => d.data());
      setTodayLessons(lessonsList.filter(l => {
        const start = new Date(l.start_time);
        return start >= today && start < tomorrow;
      }).length);
      
      const weekData = [0, 0, 0, 0, 0, 0, 0];
      lessonsList.forEach(l => {
        const day = new Date(l.start_time).getDay();
        weekData[day === 0 ? 6 : day - 1]++;
      });
      
      setWeekChart(weekData.map((count, i) => ({
        day: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i],
        count,
        max: Math.max(...weekData, 1)
      })));

      setUpcomingLessons(lessonsList.filter(l => new Date(l.start_time) > new Date()).slice(0, 3));
      setLoading(false);
    });
    
    const unsubHomeworks = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", uid)), (snap) => {
      const homeworks = snap.docs.map(d => d.data());
      setPendingHomeworks(homeworks.filter(h => h.status === "active" || h.status === "pending").length);
      setCompletedHomeworks(homeworks.filter(h => h.status === "completed" || h.status === "checked").length);
      
      const scores = homeworks.filter(h => h.score).map(h => h.score);
      setAverageScore(scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
      setRecentHomeworks(homeworks.slice(0, 3));
    });
    
    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "profiles", uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setXp(data.xp || 0);
          setLevel(data.level || 1);
        }
      } catch (e) {}
    };
    fetchUserData();
    
    return () => { unsubLessons(); unsubHomeworks(); };
  }, [uid]);

  if (loading) {
    return (
      <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonGrid count={4} />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
                {userData?.catAvatar || userData?.avatar || (userData?.full_name ? userData.full_name[0].toUpperCase() : "🐱")}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  {getGreeting()}, {userData?.full_name || "Студент"}!
                </h1>
                <p className={`text-sm ${subTextColor}`}>Сегодня {todayDate}</p>
              </div>
              <XPRing xp={xp} level={level} />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <StreakCounter streak={userData?.streak || 0} />
            </div>
          </div>
        </AnimatedCard>

        {recommendations.length > 0 && (
          <AnimatedCard delay={50}>
            <div className={`rounded-2xl p-4 ${cardBg}`}>
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <p className={`text-sm font-semibold ${textColor}`}>Рекомендации</p>
                  <div className="space-y-1 mt-1">
                    {recommendations.map((rec, idx) => (
                      <p key={idx} className={`text-sm ${subTextColor}`}>{rec}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        <AnimatedCard delay={75}>
          <DailyGoal completed={completedHomeworks} total={5} />
        </AnimatedCard>

        <AnimatedCard delay={85}>
          <NextAction lessons={upcomingLessons} homeworks={recentHomeworks} />
        </AnimatedCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="📅" value={todayLessons} label="сегодня занятий" sub="в расписании" color="from-purple-500 to-indigo-600" />
          <StatCard icon="📚" value={pendingHomeworks} label="домашних заданий" sub="ждёт проверки" color="from-pink-500 to-rose-600" />
          <StatCard icon="⭐" value={averageScore} label="средний балл" sub={`${completedHomeworks} выполнено`} color="from-fuchsia-500 to-purple-600" />
          <StatCard icon="⏰" value={daysUntilExam > 0 ? daysUntilExam : 0} label="дней до ЕГЭ" sub={daysUntilExam > 0 ? "осталось" : "экзамен прошёл"} color="from-rose-500 to-pink-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard delay={100}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <h3 className={`font-semibold ${textColor} mb-3`}>🏅 Достижения</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {achievements.map((ach, idx) => (
                  <div key={idx} className={`p-3 rounded-xl transition-all duration-300 ${isLight ? 'bg-pink-50 hover:bg-pink-100' : 'bg-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{ach.icon}</span>
                      <span className={`text-sm ${textColor}`}>{ach.label}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full ${isLight ? 'bg-pink-100' : 'bg-white/10'}`}>
                      <div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(ach.progress * 100, 100)}%` }}></div>
                    </div>
                    <p className={`text-xs ${subTextColor} mt-1`}>{Math.round(Math.min(ach.progress * 100, 100))}%</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={100}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <h3 className={`font-semibold ${textColor} mb-3`}> Мои занятия по дням</h3>
              <div className="flex items-end gap-2 h-32">
                {weekChart.map((item, idx) => {
                  const barColors = ["#EC4899", "#A855F7", "#6366F1", "#3B82F6", "#06B6D4", "#14B8A6", "#10B981"];
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-xs font-medium ${textColor}`}>{item.count}</span>
                      <div className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80" style={{
                        height: `${(item.count / (item.max || 1)) * 80}px`,
                        background: `linear-gradient(to top, ${barColors[idx]}, ${barColors[idx]}cc)`
                      }}></div>
                      <span className="text-xs" style={{ color: barColors[idx] }}>{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard delay={150}><PomodoroTimer theme={theme} /></AnimatedCard>
          <AnimatedCard delay={160}>
            <div className={`rounded-2xl p-5 ${cardBg}`}>
              <h3 className={`font-semibold ${textColor} mb-3`}>📅 Ближайшие занятия</h3>
              {upcomingLessons.length === 0 ? (
                <EmptyState 
                  icon="📅" 
                  title="Нет занятий" 
                  description="Запланируй занятие с репетитором"
                  action="Создать занятие"
                />
              ) : (
                <div className="space-y-2">
                  {upcomingLessons.map((lesson, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-pink-50/50' : 'bg-white/5'} transition-all duration-300`}>
                      <div>
                        <p className={`font-medium text-sm ${textColor}`}>{lesson.tutor_name || "Репетитор"}</p>
                        <p className={`text-xs ${subTextColor}`}>{new Date(lesson.start_time).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                        {lesson.subject === "chemistry" ? " Химия" : "🧬 Биология"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedCard>
        </div>

        <AnimatedCard delay={200}>
          <div className={`rounded-2xl p-5 ${cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${textColor}`}>📝 Недавние ДЗ</h3>
              <Link href={`/homeworks?uid=${uid}&role=student`} className={`text-xs ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
            </div>
            <div className="space-y-2">
              {recentHomeworks.length === 0 ? (
                <EmptyState 
                  icon="📝" 
                  title="Нет заданий" 
                  description="Скоро появятся домашние задания"
                />
              ) : (
                recentHomeworks.map((hw, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-pink-50/50' : 'bg-white/5'} transition-all duration-300`}>
                    <div>
                      <p className={`font-medium text-sm ${textColor}`}>{hw.title || "Домашнее задание"}</p>
                      <p className={`text-xs ${subTextColor}`}>📅 {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : "Нет срока"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      hw.status === "completed" || hw.status === "checked" 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {hw.status === "completed" || hw.status === "checked" ? "✅ Выполнено" : "⏳ Ожидает"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href={`/schedule?uid=${uid}&role=student`} icon="📅" label="Расписание" color="from-purple-500 to-indigo-600" />
          <QuickAction href={`/homeworks?uid=${uid}&role=student`} icon="📚" label="Мои ДЗ" color="from-pink-500 to-rose-600" />
          <QuickAction href={`/exam-trials?uid=${uid}&role=student`} icon="📝" label="Пробники" color="from-fuchsia-500 to-purple-600" />
          <QuickAction href={`/progress?uid=${uid}&role=student`} icon="📊" label="Прогресс" color="from-rose-500 to-pink-600" />
        </div>
      </div>
    </main>
  );
}

// ============ PARENT DASHBOARD ============
function ParentDashboard({ uid, theme, userData }: any) {
  const [todayDate, setTodayDate] = useState("");
  
  const isLight = theme === 'light';
  const subTextColor = isLight ? 'text-gray-500' : 'text-gray-400';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  return (
    <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
                {userData?.catAvatar || userData?.avatar || (userData?.full_name ? userData.full_name[0].toUpperCase() : "🐱")}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  {getGreeting()}, {userData?.full_name || "Родитель"}!
                </h1>
                <p className={`text-sm ${subTextColor}`}>Сегодня {todayDate}</p>
              </div>
            </div>
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href={`/schedule?uid=${uid}&role=parent`} icon="📅" label="Расписание" color="from-pink-500 to-rose-600" />
          <QuickAction href={`/progress?uid=${uid}&role=parent`} icon="📈" label="Прогресс" color="from-purple-500 to-indigo-600" />
          <QuickAction href={`/payments?uid=${uid}&role=parent`} icon="💳" label="Платежи" color="from-amber-500 to-orange-600" />
          <QuickAction href={`/chat?uid=${uid}&role=parent`} icon="💬" label="Чат" color="from-fuchsia-500 to-purple-600" />
        </div>
      </div>
    </main>
  );
}

// ============ ADMIN DASHBOARD ============
function AdminDashboard({ uid, theme, userData }: any) {
  const [todayDate, setTodayDate] = useState("");
  
  const isLight = theme === 'light';
  const subTextColor = isLight ? 'text-gray-500' : 'text-gray-400';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  return (
    <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center text-2xl shadow-lg">
                {userData?.catAvatar || userData?.avatar || (userData?.full_name ? userData.full_name[0].toUpperCase() : "🛡️")}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
                  Админ-панель, {userData?.full_name || "Администратор"}!
                </h1>
                <p className={`text-sm ${subTextColor}`}>Сегодня {todayDate}</p>
              </div>
            </div>
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href={`/users?uid=${uid}&role=admin`} icon="👥" label="Пользователи" color="from-purple-500 to-indigo-600" />
          <QuickAction href={`/payments?uid=${uid}&role=admin`} icon="💰" label="Платежи" color="from-pink-500 to-rose-600" />
          <QuickAction href={`/courses?uid=${uid}&role=admin`} icon="📚" label="Курсы" color="from-fuchsia-500 to-purple-600" />
          <QuickAction href={`/analytics?uid=${uid}&role=admin`} icon="📊" label="Аналитика" color="from-amber-500 to-orange-600" />
        </div>
      </div>
    </main>
  );
}

// ============ ГЛАВНЫЙ КОМПОНЕНТ ============
function DashboardContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!uid) return;
    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "profiles", uid));
        if (userSnap.exists()) setUserData(userSnap.data());
      } catch (e) {}
    };
    fetchUserData();
  }, [uid]);

  const isDark = theme === 'dark';
  const bgGradient = theme === 'dark' 
    ? 'bg-black'
    : 'bg-gradient-to-br from-pink-100 via-rose-50 to-purple-50';

  return (
    <div style={{ backgroundColor: theme === 'dark' ? '#000000' : undefined, minHeight: '100vh' }}>
      <div className={`flex min-h-screen ${bgGradient}`}>
        <Sidebar theme={theme} />
        <ThemeToggle theme={theme} setTheme={setTheme} />
        
        {/* ✅ КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ — поверх всего, в правом верхнем углу */}
        <div className="fixed top-4 right-20 z-50">
          <NotificationBell uid={uid} role={role} isDark={isDark} />
        </div>
        
        <RoleBasedDashboard role={role} uid={uid} theme={theme} userData={userData} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-pink-400">💖 Загрузка...</div>}>
      <DashboardContent />
    </Suspense>
  );
}