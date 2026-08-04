"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import confetti from 'canvas-confetti';
import { motion } from "framer-motion";
import { Table2 } from "lucide-react";

import Sidebar from "../Sidebar";
import NotificationBell from "../NotificationBell";
import ReferenceTables from '@/components/ReferenceTables';

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

const safeDate = (dateValue: any) => {
  if (!dateValue) return new Date();
  if (dateValue?.toDate) return dateValue.toDate();
  return new Date(dateValue);
};

// ============ UI КОМПОНЕНТЫ ============
function AnimatedCard({ children, delay = 0, className = "" }: any) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
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

function XPRing({ xp, level, maxXp = 500 }: { xp: number; level: number; maxXp?: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(xp / maxXp, 1);
  const offset = circumference - (progress * circumference);
  return (
    <div className="relative w-20 h-20">
      <svg className="transform -rotate-90 w-20 h-20">
        <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-stone-200 dark:text-stone-700" />
        <motion.circle cx="40" cy="40" r={radius} stroke="url(#gradient)" strokeWidth="8" fill="transparent"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: "easeOut" }} strokeLinecap="round" />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" /><stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">{level}</span>
        <span className="text-[9px] text-stone-500">Уровень</span>
      </div>
    </div>
  );
}

function StreakCounter({ streak = 0 }: { streak: number }) {
  return (
    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.8 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <motion.span animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-xl">🔥</motion.span>
      <div>
        <p className="text-[10px] opacity-90">Серия</p>
        <p className="text-lg font-black">{streak}</p>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 bg-white/5 border border-white/10 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4"></div>
          <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

// ============ ПЛАШКА ГРУПП (ВСЕГДА ВИДНА) ============
interface Group {
  id: string;
  name: string;
  subject: "chemistry" | "biology";
  emoji: string;
  tutor_id: string;
  student_ids: string[];
  active: boolean;
}

function GroupsCarousel({ uid, role, theme, childId }: { uid: string; role: string; theme: string; childId?: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupStats, setGroupStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isLight = theme === 'light';
  const textColor = isLight ? 'text-stone-800' : 'text-white';
  const subTextColor = isLight ? 'text-stone-500' : 'text-indigo-300';

  // ✅ Создание группы с отладкой
  const createGroup = async () => {
    if (!uid || creating) {
      console.error("❌ Не удалось создать группу:", { uid, creating });
      return;
    }
    
    console.log(" Создаю группу с tutor_id:", uid);
    setCreating(true);
    
    try {
      const groupRef = await addDoc(collection(db, "groups"), {
        name: "Новая группа",
        subject: "chemistry",
        emoji: "",
        tutor_id: uid,
        student_ids: [],
        active: true,
        created_at: new Date()
      });
      
      console.log("✅ Группа создана!", {
        id: groupRef.id,
        tutor_id: uid
      });
      
      toast.success("Группа создана!");
    } catch (e: any) {
      console.error("❌ Ошибка создания группы:", e);
      toast.error("Ошибка создания группы");
    }
    setCreating(false);
  };

  useEffect(() => {
    console.log("🔍 GroupsCarousel запустился");
    console.log("🔍 UID:", uid);
    console.log("🔍 Роль:", role);
    
    if (!uid) { 
      console.log("❌ UID пустой!");
      setLoading(false); 
      return; 
    }

    let groupsQuery;
    if (role === "tutor") {
      console.log(" Запрос: groups where tutor_id == ", uid);
      groupsQuery = query(collection(db, "groups"), where("tutor_id", "==", uid), where("active", "==", true));
    } else if (role === "student") {
      console.log(" Запрос: groups where student_ids contains", uid);
      groupsQuery = query(collection(db, "groups"), where("student_ids", "array-contains", uid), where("active", "==", true));
    } else if (role === "parent" && childId) {
      console.log("📚 Запрос: groups where student_ids contains", childId);
      groupsQuery = query(collection(db, "groups"), where("student_ids", "array-contains", childId), where("active", "==", true));
    } else {
      console.log("❌ Неизвестная роль или нет childId");
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(groupsQuery, async (snap) => {
      console.log("📦 Найдено групп:", snap.docs.length);
      snap.docs.forEach((d, idx) => {
        const data = d.data();
        console.log(`Группа ${idx + 1}:`, {
          id: d.id,
          name: data.name,
          tutor_id: data.tutor_id,
          active: data.active,
          "Совпадает с UID?": data.tutor_id === uid
        });
      });
      
      const groupsList: Group[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
      setGroups(groupsList);

      const stats: Record<string, any> = {};
      await Promise.all(groupsList.map(async (group) => {
        try {
          if (role === "tutor") {
            const hwSnap = await getDocs(query(collection(db, "submissions"), where("group_id", "==", group.id)));
            const pending = hwSnap.docs.filter(d => {
              const data = d.data();
              return data.status === "submitted" || data.status === "needs_revision";
            }).length;
            stats[group.id] = { pendingHomeworks: pending };
          } else if (role === "student") {
            const today = new Date();
            const lessonsSnap = await getDocs(query(collection(db, "lessons"), where("group_id", "==", group.id), where("student_id", "==", uid)));
            const upcoming = lessonsSnap.docs
              .map(d => d.data())
              .filter(l => safeDate(l.start_time) > today)
              .sort((a, b) => safeDate(a.start_time).getTime() - safeDate(b.start_time).getTime())[0];
            stats[group.id] = { nextLesson: upcoming };
          }
        } catch (e) {
          console.error("Ошибка загрузки статистики группы:", e);
        }
      }));
      setGroupStats(stats);
      setLoading(false);
    }, (error) => {
      console.error("❌ Ошибка onSnapshot:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [uid, role, childId]);

  return (
    <AnimatedCard delay={50}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
            👥 Мои группы
            <span className={`text-xs px-2 py-1 rounded-full ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-300'}`}>
              {groups.length}
            </span>
          </h2>
          {role === "tutor" && (
            <button
              onClick={createGroup}
              disabled={creating}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                creating 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {creating ? "Создаю..." : "+ Создать группу"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            <div className="min-w-[260px] h-[140px] rounded-2xl bg-stone-200/50 animate-pulse"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center border-2 border-dashed ${
            isLight ? 'border-stone-300 bg-stone-50' : 'border-stone-700 bg-slate-800/50'
          }`}>
            <div className="text-5xl mb-3">📚</div>
            <p className={`font-bold text-base mb-1 ${textColor}`}>
              {role === "tutor" ? "У вас пока нет групп" : "Вы не состоите ни в одной группе"}
            </p>
            <p className={`text-sm mb-4 ${subTextColor}`}>
              {role === "tutor" 
                ? "Создайте первую группу, чтобы управлять учениками и заданиями"
                : role === "student"
                ? "Попросите репетитора добавить вас в группу"
                : "Попросите репетитора привязать ребёнка к группе"}
            </p>
            {role === "tutor" && (
              <button
                onClick={createGroup}
                disabled={creating}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {creating ? "Создаю..." : "🧪 Создать первую группу"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {groups.map((group) => {
              const stats = groupStats[group.id] || {};
              const targetTab = role === "tutor" 
                ? (stats.pendingHomeworks > 0 ? "homeworks" : "schedule")
                : role === "student"
                ? (stats.nextLesson ? "schedule" : "homeworks")
                : "progress";

              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}?tab=${targetTab}`}
                  className={`block min-w-[260px] max-w-[300px] rounded-2xl p-4 transition-all hover:scale-105 ${
                    isLight ? 'bg-white border border-stone-200 shadow-sm hover:shadow-lg' : 'bg-slate-800/80 border border-indigo-500/20 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{group.emoji || "📚"}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm ${textColor} truncate`}>{group.name}</h3>
                      <p className={`text-xs ${subTextColor}`}>
                        {role === "tutor" 
                          ? `${group.student_ids?.length || 0} учеников`
                          : role === "student"
                          ? "Ваша группа"
                          : "Группа ребёнка"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {role === "tutor" && stats.pendingHomeworks > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-rose-500">⚠️</span>
                        <span className={subTextColor}>
                          <span className="font-bold text-rose-600">{stats.pendingHomeworks}</span> ДЗ на проверку
                        </span>
                      </div>
                    )}
                    {role === "student" && stats.nextLesson && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-purple-500">📅</span>
                        <span className={subTextColor}>
                          {safeDate(stats.nextLesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                          {" • "}
                          {safeDate(stats.nextLesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center justify-between pt-2 border-t ${isLight ? 'border-stone-200' : 'border-stone-700'}`}>
                    <span className={`text-xs font-semibold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                      Открыть →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

// ============ TUTOR DASHBOARD ============
function TutorDashboard({ uid, theme, userData }: any) {
  const [todayDate, setTodayDate] = useState("");
  const [studentsCount, setStudentsCount] = useState(0);
  const [todayLessons, setTodayLessons] = useState<any[]>([]);
  const [pendingHomeworks, setPendingHomeworks] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [weeklyLessons, setWeeklyLessons] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [forecast, setForecast] = useState(0);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = theme === 'light';
  const cardBg = isLight ? 'bg-white border border-stone-200 shadow-sm' : 'bg-slate-800/80 backdrop-blur border border-indigo-500/20 shadow-lg';
  const textColor = isLight ? 'text-stone-800' : 'text-white';
  const subTextColor = isLight ? 'text-stone-500' : 'text-indigo-300';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(); weekFromNow.setDate(weekFromNow.getDate() + 7);
    const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0);

    const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => {
      const studentsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudentsCount(studentsList.length);
      const sorted = [...studentsList].sort((a, b) => {
        const progressA = (a.completed_lessons || 0) / (a.paid_lessons || 1);
        const progressB = (b.completed_lessons || 0) / (b.paid_lessons || 1);
        return progressB - progressA;
      }).map(s => ({ ...s, progress: Math.round(((s.completed_lessons || 0) / (s.paid_lessons || 1)) * 100) }));
      setTopStudents(sorted);
    });

    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("tutor_id", "==", uid)), (snap) => {
      const lessonsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTodayLessons(lessonsList.filter(l => {
        const start = safeDate(l.start_time);
        return start >= today && start < tomorrow;
      }).sort((a, b) => safeDate(a.start_time).getTime() - safeDate(b.start_time).getTime()));
      setWeeklyLessons(lessonsList.filter(l => {
        const start = safeDate(l.start_time);
        return start >= today && start <= weekFromNow;
      }).sort((a, b) => safeDate(a.start_time).getTime() - safeDate(b.start_time).getTime()));
    });

    const unsubHomeworks = onSnapshot(query(collection(db, "submissions"), where("tutor_id", "==", uid)), (snap) => {
      setPendingHomeworks(snap.docs.filter(d => {
        const data = d.data();
        return data.status === "submitted" || data.status === "needs_revision";
      }).length);
    });

    const unsubPayments = onSnapshot(query(collection(db, "payments"), where("tutor_id", "==", uid), where("confirmed", "==", true)), (snap) => {
      setMonthlyIncome(snap.docs.reduce((sum, d) => {
        const data = d.data();
        const paymentDate = safeDate(data.confirmed_at || data.created_at);
        if (paymentDate >= firstDayOfMonth) return sum + (data.amount || 0);
        return sum;
      }, 0));
    });

    const unsubSubscriptions = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => {
      const subs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.paid_lessons && s.paid_lessons > 0)
        .map(s => ({ ...s, remaining: Math.max(0, s.paid_lessons - (s.completed_lessons || 0)) }))
        .sort((a, b) => a.remaining - b.remaining);
      setSubscriptions(subs);
      setPendingPayments(subs.filter(s => s.remaining <= 2).length * 2000);
    });

    setLoading(false);
    return () => {
      unsubStudents(); unsubLessons(); unsubHomeworks(); unsubPayments(); unsubSubscriptions();
    };
  }, [uid]);

  useEffect(() => { setForecast(monthlyIncome + pendingPayments); }, [monthlyIncome, pendingPayments]);

  const expiringSoon = subscriptions.filter(s => s.remaining <= 2);
  const endingThisWeek = subscriptions.filter(s => s.remaining > 2 && s.remaining <= 5);

  if (loading) return <main className="flex-1 p-4 sm:p-6"><div className="max-w-5xl mx-auto space-y-4"><SkeletonCard /><SkeletonCard /></div></main>;

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${textColor}`}>
                {getGreeting()}, {userData?.full_name || "Репетитор"}!
              </h1>
              <p className={`text-sm ${subTextColor}`}>Сегодня {todayDate}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className={`rounded-2xl px-4 py-3 ${isLight ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
                <p className={`text-xs ${subTextColor}`}>За месяц</p>
                <p className={`text-xl font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}><CountUpNumber value={monthlyIncome} /> ₽</p>
              </div>
              <div className={`rounded-2xl px-4 py-3 ${isLight ? 'bg-purple-50 border-2 border-purple-200' : 'bg-purple-500/10 border border-purple-500/30'}`}>
                <p className={`text-xs ${subTextColor}`}>Учеников</p>
                <p className={`text-xl font-black ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>{studentsCount}</p>
              </div>
              <div className={`rounded-2xl px-4 py-3 ${isLight ? 'bg-amber-50 border-2 border-amber-200' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                <p className={`text-xs ${subTextColor}`}>Сегодня</p>
                <p className={`text-xl font-black ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{todayLessons.length}</p>
              </div>
            </div>
          </div>
        </AnimatedCard>

        <GroupsCarousel uid={uid} role="tutor" theme={theme} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href={`/schedule?uid=${uid}&role=tutor`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}>
            <div className="text-4xl mb-2">📅</div><span className="text-sm font-semibold">Создать занятие</span>
          </Link>
          <Link href={`/homeworks?uid=${uid}&role=tutor`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-r from-pink-500 to-rose-600'}`}>
            <div className="text-4xl mb-2">📚</div><span className="text-sm font-semibold">Задать ДЗ</span>
          </Link>
          <Link href={`/payments?uid=${uid}&role=tutor`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
            <div className="text-4xl mb-2">💰</div><span className="text-sm font-semibold">Оплата</span>
          </Link>
          <Link href={`/settings?uid=${uid}&role=tutor`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
            <div className="text-4xl mb-2">⚙️</div><span className="text-sm font-semibold">Настройки</span>
          </Link>
        </div>

        <AnimatedCard delay={100}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${textColor} flex items-center gap-2`}>💳 Абонементы</h3>
              <Link href={`/payments?uid=${uid}&role=tutor&tab=subscriptions`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
            </div>
            {expiringSoon.length > 0 && (
              <div className="mb-4">
                <p className={`text-sm font-bold uppercase tracking-wide mb-3 ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>🔴 Требуют продления ({expiringSoon.length})</p>
                <div className="space-y-2">
                  {expiringSoon.map(student => (
                    <div key={student.id} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-rose-50 border border-rose-200' : 'bg-rose-500/10 border border-rose-500/30'}`}>
                      <div>
                        <p className={`font-medium text-base ${textColor}`}>{student.full_name || student.email}</p>
                        <p className={`text-sm ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>Осталось {student.remaining} {student.remaining === 1 ? 'занятие' : 'занятий'}</p>
                      </div>
                      <button onClick={() => toast.success(`Напоминание отправлено ${student.full_name}`)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${isLight ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-rose-600 text-white hover:bg-rose-700'}`}>Напомнить</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {endingThisWeek.length > 0 && (
              <div className="mb-4">
                <p className={`text-sm font-bold uppercase tracking-wide mb-3 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>🟡 Скоро закончатся ({endingThisWeek.length})</p>
                <div className="space-y-2">
                  {endingThisWeek.map(student => (
                    <div key={student.id} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-amber-50' : 'bg-amber-500/10'}`}>
                      <span className={`text-base ${textColor}`}>{student.full_name || student.email}</span>
                      <span className={`text-sm font-medium ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{student.remaining} зан.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className={`text-sm font-bold uppercase tracking-wide mb-2 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}> Активные ({subscriptions.filter(s => s.remaining > 5).length})</p>
              <p className={`text-sm ${subTextColor}`}>Все ученики с действующим абонементом</p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={120}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${textColor}`}>📅 Сегодня</h3>
              <Link href={`/schedule?uid=${uid}&role=tutor`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
            </div>
            {todayLessons.length === 0 ? (
              <p className={`text-center py-8 ${subTextColor}`}>Сегодня нет занятий</p>
            ) : (
              <div className="space-y-3">
                {todayLessons.map((lesson, idx) => (
                  <Link key={idx} href={`/lessons/${lesson.id}`} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-stone-50 hover:bg-stone-100' : 'bg-slate-700/50 hover:bg-slate-700'} transition`}>
                    <div>
                      <p className={`font-medium text-base ${textColor}`}>{lesson.student_name || "Ученик"}</p>
                      <p className={`text-sm ${subTextColor}`}>
                        {safeDate(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        {' • '}
                        {lesson.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${isLight ? 'bg-stone-800 text-white' : 'bg-indigo-500 text-white'}`}>Начать</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </AnimatedCard>

        <AnimatedCard delay={140}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${textColor} flex items-center gap-2`}>⚠️ Требует внимания</h3>
              <span className={`text-sm px-4 py-2 rounded-full ${(pendingHomeworks > 0 || expiringSoon.length > 0) ? 'bg-rose-100 text-rose-700 border-2 border-rose-300' : 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'}`}>
                {pendingHomeworks + expiringSoon.length} задач
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href={`/homeworks?uid=${uid}&role=tutor&mode=review`} className={`aspect-square rounded-2xl p-5 flex flex-col items-center justify-center border-2 transition-all hover:scale-105 ${pendingHomeworks > 0 ? 'bg-rose-50 border-rose-300 hover:border-rose-400' : 'bg-stone-50 border-stone-200 opacity-50'}`}>
                <div className="text-5xl mb-3">📝</div>
                <p className={`text-3xl font-black ${pendingHomeworks > 0 ? 'text-rose-600' : 'text-stone-400'}`}>{pendingHomeworks}</p>
                <p className={`text-base ${subTextColor}`}>ДЗ на проверку</p>
              </Link>
              <Link href={`/payments?uid=${uid}&role=tutor&tab=subscriptions`} className={`aspect-square rounded-2xl p-5 flex flex-col items-center justify-center border-2 transition-all hover:scale-105 ${expiringSoon.length > 0 ? 'bg-amber-50 border-amber-300 hover:border-amber-400' : 'bg-stone-50 border-stone-200 opacity-50'}`}>
                <div className="text-5xl mb-3">💳</div>
                <p className={`text-3xl font-black ${expiringSoon.length > 0 ? 'text-amber-600' : 'text-stone-400'}`}>{expiringSoon.length}</p>
                <p className={`text-base ${subTextColor}`}>Абонементы</p>
              </Link>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={160}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${textColor} flex items-center gap-2`}> Эта неделя</h3>
              <Link href={`/schedule?uid=${uid}&role=tutor`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
            </div>
            <div className="space-y-3">
              {weeklyLessons.length === 0 ? (
                <p className={`text-center py-8 ${subTextColor}`}>На этой неделе нет занятий</p>
              ) : (
                weeklyLessons.slice(0, 5).map((lesson: any, idx: number) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-stone-50 hover:bg-stone-100' : 'bg-slate-700/50 hover:bg-slate-700'} transition`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-300'}`}>
                        {new Date(lesson.start_time).toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)}
                      </div>
                      <div>
                        <p className={`font-medium text-base ${textColor}`}>{lesson.student_name || 'Ученик'}</p>
                        <p className={`text-sm ${subTextColor}`}>
                          {new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          {' • '}
                          {lesson.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'}
                        </p>
                      </div>
                    </div>
                    <Link href={`/lessons/${lesson.id}`} className={`px-4 py-2 rounded-xl text-sm font-semibold ${isLight ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-indigo-500 text-white hover:bg-indigo-600'} transition`}>Начать</Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={180}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${textColor} flex items-center gap-2`}>💰 Финансы</h3>
              <Link href={`/payments?uid=${uid}&role=tutor`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>История →</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className={`aspect-square rounded-2xl p-4 flex flex-col items-center justify-center ${isLight ? 'bg-emerald-50' : 'bg-emerald-500/10'}`}>
                <p className={`text-xs ${subTextColor} mb-2`}>За месяц</p>
                <p className={`text-2xl font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{monthlyIncome.toLocaleString()} ₽</p>
              </div>
              <div className={`aspect-square rounded-2xl p-4 flex flex-col items-center justify-center ${isLight ? 'bg-purple-50' : 'bg-purple-500/10'}`}>
                <p className={`text-xs ${subTextColor} mb-2`}>Ожидается</p>
                <p className={`text-2xl font-black ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>{pendingPayments.toLocaleString()} ₽</p>
              </div>
              <div className={`aspect-square rounded-2xl p-4 flex flex-col items-center justify-center ${isLight ? 'bg-amber-50' : 'bg-amber-500/10'}`}>
                <p className={`text-xs ${subTextColor} mb-2`}>Прогноз</p>
                <p className={`text-2xl font-black ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{forecast.toLocaleString()} ₽</p>
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${textColor} flex items-center gap-2`}>🏆 Топ учеников</h3>
              <Link href={`/students?uid=${uid}&role=tutor`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
            </div>
            <div className="space-y-3">
              {topStudents.slice(0, 3).map((student: any, idx: number) => (
                <div key={student.id} className="space-y-2">
                  <div className="flex justify-between text-base">
                    <span className={textColor}>{idx + 1}. {student.full_name || student.email || 'Ученик'}</span>
                    <span className={`font-bold ${student.progress > 80 ? 'text-emerald-500' : student.progress > 60 ? 'text-amber-500' : 'text-rose-500'}`}>{student.progress}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${isLight ? 'bg-stone-200' : 'bg-slate-700'}`}>
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700" style={{ width: `${student.progress}%` }} />
                  </div>
                </div>
              ))}
              {topStudents.length === 0 && <p className={`${subTextColor} text-center py-6`}>Нет данных</p>}
            </div>
          </div>
        </AnimatedCard>
      </div>
    </main>
  );
}

// ============ STUDENT DASHBOARD ============
function StudentDashboard({ uid, theme, userData }: any) {
  const [todayDate, setTodayDate] = useState("");
  const [todayLessons, setTodayLessons] = useState(0);
  const [pendingHomeworks, setPendingHomeworks] = useState(0);
  const [completedHomeworks, setCompletedHomeworks] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [activeHomeworks, setActiveHomeworks] = useState<any[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [prevLevel, setPrevLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [weekActivity, setWeekActivity] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  const isLight = theme === 'light';
  const cardBg = isLight ? 'bg-white border border-stone-200 shadow-sm' : 'bg-slate-800/80 backdrop-blur border border-indigo-500/20 shadow-lg';
  const textColor = isLight ? 'text-stone-800' : 'text-white';
  const subTextColor = isLight ? 'text-stone-500' : 'text-indigo-300';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  useEffect(() => {
    if (level > prevLevel && prevLevel > 0) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#EC4899', '#A855F7', '#6366F1', '#F59E0B'] });
      toast.success(`🎉 Поздравляем! Вы достигли уровня ${level}!`);
    }
    setPrevLevel(level);
  }, [level]);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", uid)), (snap) => {
      const lessonsList = snap.docs.map(d => d.data());
      setTodayLessons(lessonsList.filter(l => {
        const start = safeDate(l.start_time);
        return start >= today && start < tomorrow;
      }).length);
      const upcoming = lessonsList
        .filter(l => safeDate(l.start_time) > new Date())
        .sort((a, b) => safeDate(a.start_time).getTime() - safeDate(b.start_time).getTime())
        .slice(0, 3);
      setUpcomingLessons(upcoming);
      const weekData = [0, 0, 0, 0, 0, 0, 0];
      lessonsList.forEach(l => {
        const day = safeDate(l.start_time).getDay();
        weekData[day === 0 ? 6 : day - 1]++;
      });
      setWeekActivity(weekData);
    });

    const unsubSubmissions = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", uid)), (snap) => {
      const submissions = snap.docs.map(d => d.data());
      setPendingHomeworks(submissions.filter(s => s.status === "submitted").length);
      setCompletedHomeworks(submissions.filter(s => s.status === "approved").length);
      const scores = submissions.map(s => Number(s.score)).filter(score => !isNaN(score) && score >= 0);
      setAverageScore(scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
    });

    const unsubHomeworks = onSnapshot(query(collection(db, "homeworks"), where("assigned_students", "array-contains", uid)), (snap) => {
      const homeworks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = homeworks.filter(h => h.status === "active" || !h.status);
      setActiveHomeworks(active.sort((a, b) => {
        const dateA = a.deadline ? safeDate(a.deadline) : new Date(0);
        const dateB = b.deadline ? safeDate(b.deadline) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      }).slice(0, 3));
    });

    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "profiles", uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setXp(data.xp || 0);
          setLevel(data.level || 1);
          setStreak(data.streak || 0);
        }
      } catch (e) {}
    };
    fetchUserData();
    setLoading(false);

    return () => { unsubLessons(); unsubSubmissions(); unsubHomeworks(); };
  }, [uid]);

  const todayFocus = activeHomeworks[0] || upcomingLessons[0];
  const totalWeekHours = weekActivity.reduce((a, b) => a + b, 0);

  if (loading) return <main className="flex-1 p-4 sm:p-6"><div className="max-w-5xl mx-auto space-y-4"><SkeletonCard /><SkeletonCard /></div></main>;

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
                {userData?.avatar || (userData?.full_name ? userData.full_name[0].toUpperCase() : "")}
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${textColor}`}>
                  {getGreeting()}, {userData?.full_name || "Студент"}!
                </h1>
                <p className={`text-sm ${subTextColor}`}>Сегодня {todayDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <XPRing xp={xp} level={level} />
              <StreakCounter streak={streak} />
            </div>
          </div>
        </AnimatedCard>

        <GroupsCarousel uid={uid} role="student" theme={theme} />

        {todayFocus && (
          <AnimatedCard delay={75}>
            <Link href={todayFocus.deadline ? `/homeworks/${todayFocus.id}` : `/schedule`} className="block rounded-3xl p-8 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 border-2 border-amber-300 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] relative overflow-hidden">
              <div className="absolute top-0 right-0 text-9xl opacity-10 rotate-12">🎯</div>
              <div className="relative">
                <p className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-3">Фокус на сегодня</p>
                <h2 className="text-2xl font-black text-stone-800 mb-3">
                  {todayFocus.deadline ? todayFocus.title || "Домашнее задание" : "Ближайшее занятие"}
                </h2>
                <p className="text-base text-stone-600 mb-4">
                  {todayFocus.deadline ? `Дедлайн: ${safeDate(todayFocus.deadline).toLocaleDateString('ru-RU')}` : `${safeDate(todayFocus.start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
                </p>
                <span className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition">Начать →</span>
              </div>
            </Link>
          </AnimatedCard>
        )}

        <div className="grid grid-cols-3 gap-4">
          <AnimatedCard delay={100}>
            <Link href="/schedule" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-all ${isLight ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-purple-600 to-indigo-700'} text-white shadow-lg`}>
              <div className="text-4xl mb-2">📅</div>
              <p className="text-2xl font-black">{todayLessons}</p>
              <p className="text-xs opacity-80">занятий сегодня</p>
            </Link>
          </AnimatedCard>
          <AnimatedCard delay={120}>
            <Link href="/progress" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-all ${isLight ? 'bg-gradient-to-r from-pink-500 to-rose-600' : 'bg-gradient-to-r from-pink-600 to-rose-700'} text-white shadow-lg`}>
              <div className="text-4xl mb-2">⭐</div>
              <p className="text-2xl font-black">{averageScore}</p>
              <p className="text-xs opacity-80">средний балл</p>
            </Link>
          </AnimatedCard>
          <AnimatedCard delay={140}>
            <Link href="/homeworks" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-all ${isLight ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-amber-600 to-orange-700'} text-white shadow-lg`}>
              <div className="text-4xl mb-2">📝</div>
              <p className="text-2xl font-black">{activeHomeworks.length}</p>
              <p className="text-xs opacity-80">активных ДЗ</p>
            </Link>
          </AnimatedCard>
        </div>

        {activeHomeworks.length > 0 && (
          <AnimatedCard delay={160}>
            <div className={`${cardBg} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold text-lg ${textColor}`}>📚 Активные ДЗ</h3>
                <Link href={`/homeworks?uid=${uid}&role=student`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
              </div>
              <div className="space-y-3">
                {activeHomeworks.map((hw, idx) => (
                  <Link key={idx} href={`/homeworks/${hw.id}`} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-stone-50 hover:bg-stone-100' : 'bg-slate-700/50 hover:bg-slate-700'} transition`}>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-base ${textColor} truncate`}>{hw.title || "Домашнее задание"}</p>
                      <p className={`text-sm ${subTextColor}`}>
                        {hw.topic && `${hw.topic} • `}
                        {hw.deadline ? `Дедлайн: ${safeDate(hw.deadline).toLocaleDateString('ru-RU')}` : "Без срока"}
                      </p>
                    </div>
                    <span className={`text-sm px-3 py-1.5 rounded-full ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300'}`}>⏳ Ожидает</span>
                  </Link>
                ))}
              </div>
            </div>
          </AnimatedCard>
        )}

        {upcomingLessons.length > 0 && (
          <AnimatedCard delay={180}>
            <div className={`${cardBg} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold text-lg ${textColor}`}> Ближайшие занятия</h3>
                <Link href={`/schedule?uid=${uid}&role=student`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
              </div>
              <div className="space-y-3">
                {upcomingLessons.map((lesson, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-stone-50' : 'bg-slate-700/50'}`}>
                    <div>
                      <p className={`font-medium text-base ${textColor}`}>{lesson.tutor_name || "Репетитор"}</p>
                      <p className={`text-sm ${subTextColor}`}>
                        {safeDate(lesson.start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-sm px-3 py-1.5 rounded-full ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-300'}`}>
                      {lesson.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedCard>
        )}

        <AnimatedCard delay={200}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <h3 className={`font-bold text-lg ${textColor} mb-4`}> Активность за неделю</h3>
            <div className="grid grid-cols-7 gap-3">
              {weekActivity.map((count, idx) => {
                const intensity = count / Math.max(...weekActivity, 1);
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="w-full aspect-square rounded-xl" style={{
                      background: intensity === 0 ? (isLight ? '#F5F5F4' : '#334155') : `rgba(217, 119, 6, ${0.2 + intensity * 0.8})`
                    }} />
                    <span className={`text-xs ${subTextColor}`}>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][idx]}</span>
                  </div>
                );
              })}
            </div>
            <p className={`text-sm ${subTextColor} mt-4 text-center`}>{totalWeekHours} часов на этой неделе</p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={220}>
          <div className={`${cardBg} rounded-2xl p-5`}>
            <h3 className={`font-bold text-lg ${textColor} mb-4`}>🏆 Достижения</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '🎯', label: '10 ДЗ', progress: Math.min(completedHomeworks / 10, 1) },
                { icon: '⭐', label: '1000 XP', progress: Math.min(xp / 1000, 1) },
                { icon: '', label: 'Отличник', progress: Math.min(averageScore / 80, 1) },
              ].map((ach, idx) => (
                <div key={idx} className={`aspect-square rounded-2xl p-4 flex flex-col items-center justify-center ${isLight ? 'bg-pink-50' : 'bg-white/5'}`}>
                  <span className="text-4xl mb-2">{ach.icon}</span>
                  <span className={`text-sm font-semibold ${textColor} mb-2`}>{ach.label}</span>
                  <div className={`w-full h-2 rounded-full ${isLight ? 'bg-pink-100' : 'bg-white/10'}`}>
                    <div className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(ach.progress * 100, 100)}%` }}></div>
                  </div>
                  <p className={`text-xs ${subTextColor} mt-2`}>{Math.round(Math.min(ach.progress * 100, 100))}%</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href={`/homeworks?uid=${uid}&role=student`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-r from-pink-500 to-rose-600'}`}>
            <div className="text-4xl mb-2">📚</div><span className="text-sm font-semibold">Мои ДЗ</span>
          </Link>
          <Link href={`/schedule?uid=${uid}&role=student`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}>
            <div className="text-4xl mb-2">📅</div><span className="text-sm font-semibold">Расписание</span>
          </Link>
          <Link href={`/exam-trials?uid=${uid}&role=student`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
            <div className="text-4xl mb-2">📝</div><span className="text-sm font-semibold">Пробники</span>
          </Link>
          <Link href={`/progress?uid=${uid}&role=student`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
            <div className="text-4xl mb-2">📊</div><span className="text-sm font-semibold">Прогресс</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

// ============ PARENT DASHBOARD ============
function ParentDashboard({ uid, theme, userData }: any) {
  const [todayDate, setTodayDate] = useState("");
  const [childId, setChildId] = useState("");
  const [childData, setChildData] = useState<any>(null);
  const [egePrediction, setEgePrediction] = useState(0);
  const [attendance, setAttendance] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [remainingLessons, setRemainingLessons] = useState(0);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [topicProgress, setTopicProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = theme === 'light';
  const cardBg = isLight ? 'bg-white border border-stone-200 shadow-sm' : 'bg-slate-800/80 backdrop-blur border border-indigo-500/20 shadow-lg';
  const textColor = isLight ? 'text-stone-800' : 'text-white';
  const subTextColor = isLight ? 'text-stone-500' : 'text-indigo-300';

  useEffect(() => { setTodayDate(getFormattedDate()); }, []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const loadData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "profiles", uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          const cid = data.child_id;
          if (cid) {
            setChildId(cid);
            const childSnap = await getDoc(doc(db, "profiles", cid));
            if (childSnap.exists()) {
              const childData = childSnap.data();
              setChildData(childData);
              setRemainingLessons(Math.max(0, (childData.paid_lessons || 0) - (childData.completed_lessons || 0)));
            }
            const lessonsSnap = await getDocs(query(collection(db, "lessons"), where("student_id", "==", cid)));
            const lessons = lessonsSnap.docs.map(d => d.data());
            const completed = lessons.filter(l => l.status === "completed").length;
            const total = lessons.length;
            setAttendance(total > 0 ? Math.round((completed / total) * 100) : 0);
            setUpcomingLessons(lessons.filter(l => safeDate(l.start_time) > new Date()).slice(0, 3));
            const hwSnap = await getDocs(query(collection(db, "submissions"), where("student_id", "==", cid)));
            const submissions = hwSnap.docs.map(d => d.data());
            const scores = submissions.map(s => Number(s.score)).filter(s => !isNaN(s) && s >= 0);
            setAverageScore(scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
            if (scores.length > 0) {
              const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
              setEgePrediction(Math.min(100, Math.round(avg * 1.2)));
            }
            setRecentGrades(submissions.slice(0, 3));
            setTopicProgress([
              { name: "Общая химия", progress: 85 },
              { name: "Неорганическая химия", progress: 72 },
              { name: "Органическая химия", progress: 65 },
            ]);
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    loadData();
  }, [uid]);

  if (loading) return <main className="flex-1 p-4 sm:p-6"><div className="max-w-5xl mx-auto space-y-4"><SkeletonCard /><SkeletonCard /></div></main>;

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <AnimatedCard delay={0}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
              {childData?.avatar || (childData?.full_name ? childData.full_name[0].toUpperCase() : "👨‍🎓")}
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${textColor}`}>
                {getGreeting()}, {userData?.full_name || "Родитель"}!
              </h1>
              <p className={`text-sm ${subTextColor}`}>
                Ученик: {childData?.full_name || "Не привязан"} • Сегодня {todayDate}
              </p>
            </div>
          </div>
        </AnimatedCard>

        {!childId ? (
          <AnimatedCard delay={50}>
            <div className={`${cardBg} rounded-2xl p-5`}>
              <p className={`text-center py-8 ${subTextColor}`}>Ребёнок ещё не привязан. Попросите репетитора привязать аккаунт.</p>
            </div>
          </AnimatedCard>
        ) : (
          <>
            <GroupsCarousel uid={uid} role="parent" theme={theme} childId={childId} />

            <AnimatedCard delay={75}>
              <div className="rounded-3xl p-8 bg-gradient-to-br from-purple-100 via-pink-50 to-rose-100 border-2 border-purple-300 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 text-9xl opacity-10 rotate-12"></div>
                <div className="relative">
                  <p className="text-sm font-bold text-purple-700 uppercase tracking-widest mb-3">Прогноз ЕГЭ</p>
                  <div className="flex items-end gap-4 mb-4">
                    <p className="text-6xl font-black text-stone-800 tracking-tight">{egePrediction}</p>
                    <p className="text-xl font-bold text-stone-600 mb-2">баллов</p>
                    <span className="px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold mb-2">
                      {egePrediction >= 85 ? '🌟 Отлично' : egePrediction >= 65 ? '👍 Хорошо' : '📚 Нужно подтянуть'}
                    </span>
                  </div>
                  <p className="text-base text-stone-600">На основе средних баллов за ДЗ</p>
                </div>
              </div>
            </AnimatedCard>

            <div className="grid grid-cols-3 gap-4">
              <AnimatedCard delay={100}>
                <Link href="/progress" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-all ${isLight ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-emerald-600 to-teal-700'} text-white shadow-lg`}>
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-2xl font-black">{attendance}%</p>
                  <p className="text-xs opacity-80">Посещаемость</p>
                </Link>
              </AnimatedCard>
              <AnimatedCard delay={120}>
                <Link href="/progress" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-all ${isLight ? 'bg-gradient-to-r from-pink-500 to-rose-600' : 'bg-gradient-to-r from-pink-600 to-rose-700'} text-white shadow-lg`}>
                  <div className="text-4xl mb-2">⭐</div>
                  <p className="text-2xl font-black">{averageScore}</p>
                  <p className="text-xs opacity-80">Средний балл</p>
                </Link>
              </AnimatedCard>
              <AnimatedCard delay={140}>
                <Link href="/payments" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-all ${isLight ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-amber-600 to-orange-700'} text-white shadow-lg`}>
                  <div className="text-4xl mb-2">💳</div>
                  <p className="text-2xl font-black">{remainingLessons}</p>
                  <p className="text-xs opacity-80">Осталось занятий</p>
                </Link>
              </AnimatedCard>
            </div>

            <AnimatedCard delay={160}>
              <div className={`rounded-2xl p-5 ${isLight ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300' : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className={`text-sm font-bold uppercase tracking-wide mb-2 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>💳 Абонемент</p>
                    <p className={`text-2xl font-black ${textColor}`}>Осталось {remainingLessons} {remainingLessons === 1 ? 'занятие' : 'занятий'}</p>
                    <p className={`text-base ${subTextColor}`}>{remainingLessons <= 2 ? '⚠️ Пора продлить!' : '✅ Действует'}</p>
                  </div>
                  <Link href="/pricing" className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition">Продлить →</Link>
                </div>
              </div>
            </AnimatedCard>

            {upcomingLessons.length > 0 && (
              <AnimatedCard delay={180}>
                <div className={`${cardBg} rounded-2xl p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold text-lg ${textColor}`}>📅 Ближайшее занятие</h3>
                    <Link href={`/schedule?uid=${uid}&role=parent`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
                  </div>
                  <div className={`p-3 rounded-xl ${isLight ? 'bg-stone-50' : 'bg-slate-700/50'}`}>
                    <p className={`font-medium text-base ${textColor}`}>
                      {safeDate(upcomingLessons[0].start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className={`text-sm ${subTextColor}`}>
                      {upcomingLessons[0].subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'}
                    </p>
                  </div>
                </div>
              </AnimatedCard>
            )}

            <AnimatedCard delay={200}>
              <div className={`${cardBg} rounded-2xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg ${textColor}`}>📊 Последние оценки</h3>
                  <Link href={`/progress?uid=${uid}&role=parent`} className={`text-sm font-semibold ${isLight ? 'text-pink-600 hover:text-pink-800' : 'text-pink-400 hover:text-pink-300'}`}>Все →</Link>
                </div>
                <div className="space-y-3">
                  {recentGrades.length === 0 ? (
                    <p className={`text-center py-8 ${subTextColor}`}>Пока нет оценок</p>
                  ) : (
                    recentGrades.map((grade, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-stone-50' : 'bg-slate-700/50'}`}>
                        <div>
                          <p className={`font-medium text-base ${textColor}`}>{grade.title || "Домашнее задание"}</p>
                          <p className={`text-sm ${subTextColor}`}>Сдано: {grade.submitted_at ? safeDate(grade.submitted_at).toLocaleDateString('ru-RU') : "Неизвестно"}</p>
                        </div>
                        <span className={`text-base font-bold ${grade.score >= 80 ? 'text-emerald-500' : grade.score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {grade.score || 0}/100
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={220}>
              <div className={`${cardBg} rounded-2xl p-5`}>
                <h3 className={`font-bold text-lg ${textColor} mb-4`}>📈 Прогресс по темам</h3>
                <div className="space-y-3">
                  {topicProgress.map((topic, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-base">
                        <span className={textColor}>{topic.name}</span>
                        <span className={`font-bold ${topic.progress >= 80 ? 'text-emerald-500' : topic.progress >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{topic.progress}%</span>
                      </div>
                      <div className={`w-full h-2 rounded-full ${isLight ? 'bg-stone-200' : 'bg-slate-700'}`}>
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700" style={{ width: `${topic.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedCard>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href={`/schedule?uid=${uid}&role=parent`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}>
                <div className="text-4xl mb-2">📅</div><span className="text-sm font-semibold">Расписание</span>
              </Link>
              <Link href={`/progress?uid=${uid}&role=parent`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-r from-pink-500 to-rose-600'}`}>
                <div className="text-4xl mb-2"></div><span className="text-sm font-semibold">Прогресс</span>
              </Link>
              <Link href={`/payments?uid=${uid}&role=parent`} className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
                <div className="text-4xl mb-2">💳</div><span className="text-sm font-semibold">Оплата</span>
              </Link>
              <Link href={`https://t.me/thetorturedchemist`} target="_blank" className={`rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-105 text-white font-medium block shadow-lg hover:shadow-xl ${isLight ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
                <div className="text-4xl mb-2">💬</div><span className="text-sm font-semibold">Написать</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ============ РОУТИНГ ============
function RoleBasedDashboard({ role, uid, theme, userData }: any) {
  switch(role) {
    case 'tutor': return <TutorDashboard uid={uid} theme={theme} userData={userData} />;
    case 'student': return <StudentDashboard uid={uid} theme={theme} userData={userData} />;
    case 'parent': return <ParentDashboard uid={uid} theme={theme} userData={userData} />;
    default: return <StudentDashboard uid={uid} theme={theme} userData={userData} />;
  }
}

function ThemeToggle({ theme, setTheme }: any) {
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // ✅ ДОБАВИТЬ ЭТУ СТРОКУ — чтобы Sidebar мгновенно узнал о смене темы
    window.dispatchEvent(new CustomEvent('themechange', { detail: newTheme }));
  };

  return (
    <button onClick={toggleTheme} className={`fixed top-24 right-4 z-50 w-14 h-14 rounded-full shadow-2xl overflow-hidden transition-all duration-500 hover:scale-110 group ${theme === 'light' ? 'shadow-amber-200/50' : 'shadow-white/10'}`}>
      <div className={`absolute inset-0 transition-all duration-500 ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-900"></div>
        <span className="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🌙</span>
      </div>
      <div className={`absolute inset-0 transition-all duration-500 ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500"></div>
        <span className="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">️</span>
      </div>
    </button>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  
  // ✅ ИСПРАВЛЕНО: читаем тему СРАЗУ из localStorage при инициализации
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  
  const [userData, setUserData] = useState<any>(null);

  // ❌ УДАЛИ этот useEffect — он больше не нужен
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
  //   if (savedTheme) setTheme(savedTheme);
  // }, []);

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
  const bgGradient = theme === 'dark' ? 'bg-slate-900' : 'bg-emerald-50';

  return (
    <div className={`min-h-screen ${bgGradient}`}>
      <div className="flex min-h-screen">
        <Sidebar theme={theme} />
        <ThemeToggle theme={theme} setTheme={setTheme} />
        
        <div className="fixed top-4 right-20 z-50">
          <NotificationBell uid={uid} role={role} isDark={isDark} />
        </div>
        
        <RoleBasedDashboard role={role} uid={uid} theme={theme} userData={userData} />

        <ReferenceTables />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50 flex items-center justify-center text-emerald-700">Загрузка...</div>}>
      <DashboardContent />
    </Suspense>
  );
}