"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import Sidebar from "../Sidebar";

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

function AnimatedCard({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`transition-all duration-500 ease-out ${className}`} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
    }}>
      {children}
    </div>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
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
        <span className="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🌙</span>
      </div>
      <div className={`absolute inset-0 transition-all duration-500 ${theme === 'light' ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500"></div>
        <span className="absolute inset-0 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">☀️</span>
      </div>
      <div className={`absolute inset-0 rounded-full ring-2 transition-all ${
        theme === 'light' ? 'ring-amber-300/50 group-hover:ring-amber-400/70' : 'ring-white/30 group-hover:ring-white/50'
      }`}></div>
    </button>
  );
}

function ParentDashboardContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [profile, setProfile] = useState<any>(null);
  const [childProfile, setChildProfile] = useState<any>(null);
  const [childId, setChildId] = useState<string>("");
  const [lessons, setLessons] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [insights, setInsights] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);

  const isLight = theme === 'light';
  const cardBg = isLight 
    ? 'bg-white/90 backdrop-blur border border-pink-200 shadow-lg shadow-pink-200/20' 
    : 'bg-white/5 backdrop-blur border border-white/10';
  const textColor = isLight ? 'text-gray-800' : 'text-white';
  const subTextColor = isLight ? 'text-gray-500' : 'text-gray-400';
  const bgGradient = isLight 
    ? 'bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50'
    : 'bg-black';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Доброе утро");
    else if (hour < 18) setGreeting("Добрый день");
    else setGreeting("Добрый вечер");
    
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        if (data.child_id) {
          setChildId(data.child_id);
          loadChildData(data.child_id);
        }
      }
      setLoading(false);
    });
  }, [uid]);

  useEffect(() => {
    if (!childProfile) return;
    
    const newInsights = [];
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l: any) => l.status === "completed").length;
    const totalHw = homeworks.length;
    const doneHw = homeworks.filter((h: any) => h.status === "done").length;
    const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
    
    if (attendance > 80) {
      newInsights.push(`✅ Отличная посещаемость! ${attendance}% — так держать!`);
    } else if (attendance < 50) {
      newInsights.push(`⚠️ Посещаемость ${attendance}% — стоит обратить внимание на пропуски`);
    }
    
    if (hwRate > 80) {
      newInsights.push(`📚 Ребёнок ответственный! Выполняет ${hwRate}% домашних заданий`);
    } else if (hwRate < 50) {
      newInsights.push(`📖 Стоит помочь с домашними заданиями — выполнено только ${hwRate}%`);
    }
    
    if (childProfile.xp && childProfile.xp > 500) {
      newInsights.push(`🏆 Уже ${childProfile.xp} XP — уровень ${childProfile.level || 1}!`);
    }
    
    if (totalLessons > 0 && completedLessons === totalLessons) {
      newInsights.push(`🎉 Все занятия проведены! Отличная посещаемость!`);
    }
    
    setInsights(newInsights.slice(0, 3));
  }, [childProfile, lessons, homeworks]);

  useEffect(() => {
    if (!childProfile) return;
    
    const newNotifications = [];
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l: any) => l.status === "completed").length;
    const paidLessons = childProfile?.paid_lessons || 0;
    const remainingLessons = paidLessons - completedLessons;
    const pendingHw = homeworks.filter((h: any) => h.status === "active");
    const upcomingLessons = lessons.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > new Date()).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    if (remainingLessons <= 2 && remainingLessons > 0) {
      newNotifications.push({ type: 'warning', text: `⚠️ Осталось всего ${remainingLessons} занятий — пора пополнить!`, priority: 'high' });
    }
    if (remainingLessons <= 0 && paidLessons > 0) {
      newNotifications.push({ type: 'danger', text: '❌ Занятия закончились! Пополните абонемент', priority: 'high' });
    }
    if (pendingHw.length > 0) {
      newNotifications.push({ type: 'info', text: `📚 ${pendingHw.length} домашних заданий ждут выполнения`, priority: 'medium' });
    }
    if (upcomingLessons.length > 0 && upcomingLessons[0]) {
      const next = upcomingLessons[0];
      const date = new Date(next.start_time);
      const today = new Date();
      const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 1) {
        newNotifications.push({ type: 'info', text: `📅 Завтра занятие в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`, priority: 'medium' });
      }
    }
    
    setNotifications(newNotifications.slice(0, 3));
  }, [childProfile, lessons, homeworks]);

  useEffect(() => {
    if (lessons.length === 0) return;
    
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];
    const data = months.map((month, idx) => ({
      month,
      value: Math.floor(Math.random() * 40) + 50 + idx * 5
    }));
    setProgressData(data);
  }, [lessons]);

  async function generateShareLink() {
    if (!childId) {
      toast.error("Ученик не привязан");
      return;
    }
    
    try {
      const token = crypto.randomUUID();
      await addDoc(collection(db, "parent_shared_links"), {
        child_id: childId,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      const link = `${window.location.origin}/parent-shared/${token}`;
      setShareLink(link);
      navigator.clipboard.writeText(link);
      toast.success("Ссылка скопирована! Сохраните её в закладки.");
    } catch (error) {
      toast.error("Ошибка при создании ссылки");
    }
  }

  function loadChildData(cid: string) {
    getDoc(doc(db, "profiles", cid)).then((snap) => { 
      if (snap.exists()) setChildProfile(snap.data()); 
    });
    
    onSnapshot(query(collection(db, "lessons"), where("student_id", "==", cid)), (snap) => {
      setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    
    onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", cid)), (snap) => {
      setHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l: any) => l.status === "completed").length;
  const upcomingLessons = lessons.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > new Date()).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const nextLesson = upcomingLessons[0];
  const totalHw = homeworks.length;
  const doneHw = homeworks.filter((h: any) => h.status === "done").length;
  const pendingHw = homeworks.filter((h: any) => h.status === "active");

  const paidLessons = childProfile?.paid_lessons || 0;
  const remainingLessons = paidLessons - completedLessons;
  const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
  const avgScore = childProfile?.xp ? Math.round(childProfile.xp / 10) : 0;

  const daysUntilExam = (() => {
    const examDate = new Date("2026-06-02");
    const now = new Date();
    return Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: theme === 'dark' ? '#000000' : undefined, minHeight: '100vh' }}>
      <div className={`flex min-h-screen ${bgGradient}`}>
        <Sidebar theme={theme} />
        <ThemeToggle theme={theme} setTheme={setTheme} />
        
        <main className="flex-1 p-4 sm:p-6 ml-0 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-6">
              {/* Приветствие */}
              <AnimatedCard delay={0}>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
                      {profile?.avatar || (profile?.full_name ? profile.full_name[0].toUpperCase() : "👨‍👩‍👧")}
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#8CC63F] via-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">
                        {greeting}, {profile?.full_name || "Родитель"}!
                      </h1>
                      <p className={`text-sm ${subTextColor}`}>
                        {childProfile?.full_name ? `Ученик: ${childProfile.full_name}` : "Ученик не привязан"}
                        {childProfile?.level && ` • ${childProfile.level} уровень`}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedCard>

              {/* AI Insights */}
              {insights.length > 0 && childId && (
                <AnimatedCard delay={50}>
                  <div className={`rounded-2xl p-4 ${cardBg}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-xl">🧠</span>
                      <div>
                        <p className={`text-sm font-semibold ${textColor}`}>AI Insights</p>
                        <div className="space-y-1 mt-1">
                          {insights.map((insight, idx) => (
                            <p key={idx} className={`text-sm ${subTextColor}`}>{insight}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              )}

              {/* Уведомления */}
              {notifications.length > 0 && childId && (
                <AnimatedCard delay={60}>
                  <div className={`rounded-2xl p-4 ${cardBg}`}>
                    <h3 className={`text-sm font-semibold ${textColor} mb-2`}>🔔 Уведомления</h3>
                    <div className="space-y-2">
                      {notifications.map((notif, idx) => (
                        <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg ${
                          notif.priority === 'high' 
                            ? (isLight ? 'bg-red-50' : 'bg-red-500/10') 
                            : (isLight ? 'bg-blue-50' : 'bg-blue-500/10')
                        }`}>
                          <span className={notif.priority === 'high' ? 'text-red-400' : 'text-blue-400'}>
                            {notif.priority === 'high' ? '⚠️' : 'ℹ️'}
                          </span>
                          <span className={`text-sm ${textColor}`}>{notif.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedCard>
              )}

              {!childId ? (
                <AnimatedCard delay={80}>
                  <div className={`rounded-3xl p-8 text-center ${cardBg}`}>
                    <p className="text-4xl mb-4">🔗</p>
                    <p className={`text-lg ${textColor}`}>Ученик ещё не привязан</p>
                    <p className={`text-sm ${subTextColor} mt-2`}>Попросите репетитора привязать ваш аккаунт к ученику</p>
                  </div>
                </AnimatedCard>
              ) : (
                <div className="space-y-6">
                  {/* Быстрые виджеты */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <AnimatedCard delay={80} className="col-span-2">
                      <div className={`rounded-2xl p-4 ${cardBg}`}>
                        <p className={`text-xs ${subTextColor} mb-1`}>📅 Ближайшее занятие</p>
                        {nextLesson ? (
                          <div>
                            <p className={`font-bold text-lg ${textColor}`}>
                              {new Date(nextLesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                            </p>
                            <p className={`text-sm ${subTextColor}`}>
                              {new Date(nextLesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              {" • "}
                              {nextLesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                            </p>
                            {nextLesson.zoom_link && (
                              <a href={nextLesson.zoom_link} target="_blank" rel="noopener noreferrer" className={`inline-block mt-2 text-xs px-3 py-1 rounded-lg transition ${
                                isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}>
                                🎥 Подключиться
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className={`text-sm ${subTextColor}`}>Нет запланированных занятий</p>
                        )}
                      </div>
                    </AnimatedCard>

                    <AnimatedCard delay={100}>
                      <div className={`rounded-2xl p-4 text-center ${cardBg}`}>
                        <p className={`text-xs ${subTextColor} mb-1`}>💰 Осталось занятий</p>
                        <p className={`text-3xl font-black ${remainingLessons <= 2 ? 'text-red-500' : remainingLessons <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {remainingLessons}
                        </p>
                        <p className={`text-xs ${subTextColor}`}>из {paidLessons} оплаченных</p>
                      </div>
                    </AnimatedCard>

                    <AnimatedCard delay={120}>
                      <div className={`rounded-2xl p-4 text-center ${cardBg}`}>
                        <p className={`text-xs ${subTextColor} mb-1`}>⭐ Средний балл</p>
                        <p className="text-3xl font-black text-indigo-500">{avgScore}</p>
                        <p className={`text-xs ${subTextColor}`}>{childProfile?.level || 1} уровень</p>
                      </div>
                    </AnimatedCard>
                  </div>

                  {/* График прогресса */}
                  <AnimatedCard delay={130}>
                    <div className={`rounded-2xl p-5 ${cardBg}`}>
                      <h3 className={`font-semibold ${textColor} mb-3`}>📈 Прогресс ребёнка</h3>
                      <div className="flex items-end gap-2 h-32">
                        {progressData.map((item, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <span className={`text-xs font-medium ${textColor}`}>{item.value}%</span>
                            <div className="w-full rounded-t-lg transition-all duration-500" style={{
                              height: `${(item.value / 100) * 80}px`,
                              background: `linear-gradient(to top, #8CC63F, #5BC0EB)`
                            }}></div>
                            <span className={`text-xs ${subTextColor}`}>{item.month}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AnimatedCard>

                  {/* Статистика */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Занятий", value: totalLessons, sub: `${completedLessons} проведено`, icon: "📅" },
                      { label: "Посещаемость", value: attendance + "%", sub: "от всех занятий", icon: "✅" },
                      { label: "Заданий", value: totalHw, sub: `${doneHw} сдано`, icon: "📚" },
                      { label: "До ЕГЭ", value: daysUntilExam, sub: "дней", icon: "⏰" },
                    ].map((stat, idx) => (
                      <AnimatedCard key={stat.label} delay={140 + idx * 20}>
                        <div className={`rounded-2xl p-4 text-center hover:scale-[1.02] transition ${cardBg}`}>
                          <span className="text-2xl">{stat.icon}</span>
                          <p className={`text-2xl font-bold mt-2 ${textColor}`}>{stat.value}</p>
                          <p className={`text-xs ${subTextColor}`}>{stat.sub}</p>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>

                  {/* Абонемент */}
                  <AnimatedCard delay={200}>
                    <div className={`rounded-2xl p-6 ${isLight ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                      <h3 className={`font-bold ${textColor} text-lg mb-3`}>💳 Абонемент</h3>
                      <div className="flex flex-wrap items-end gap-4 mb-3">
                        <div className="text-center">
                          <p className={`text-sm ${subTextColor}`}>Оплачено</p>
                          <p className="text-3xl font-black text-emerald-500">{paidLessons}</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-sm ${subTextColor}`}>Осталось</p>
                          <p className={`text-3xl font-black ${remainingLessons <= 2 ? 'text-red-500' : remainingLessons <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>{remainingLessons}</p>
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <div className={`w-full rounded-full h-4 overflow-hidden ${isLight ? 'bg-white/60' : 'bg-white/10'}`}>
                            <div className={`h-4 rounded-full transition-all duration-700 ${remainingLessons <= 2 ? 'bg-red-500' : remainingLessons <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${paidLessons > 0 ? (completedLessons / paidLessons) * 100 : 0}%` }} />
                          </div>
                          <p className={`text-xs ${subTextColor} mt-1`}>Использовано {completedLessons} из {paidLessons}</p>
                        </div>
                      </div>
                      {remainingLessons <= 2 && remainingLessons > 0 && (
                        <p className="text-sm text-red-500 font-medium">⚠️ Занятий осталось мало. Пополните абонемент!</p>
                      )}
                      {remainingLessons <= 0 && paidLessons > 0 && (
                        <p className="text-sm text-red-500 font-medium">❌ Занятия закончились. Пополните абонемент!</p>
                      )}
                    </div>
                  </AnimatedCard>

                  {/* Кнопка "Поделиться отчётом" */}
                  <AnimatedCard delay={220}>
                    <div className={`rounded-2xl p-5 ${cardBg}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className={`font-semibold ${textColor}`}>🔗 Быстрый доступ к отчёту</h3>
                          <p className={`text-xs ${subTextColor} mt-1`}>Получите ссылку, чтобы видеть прогресс без входа в кабинет</p>
                        </div>
                        <button
                          onClick={generateShareLink}
                          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-md ${
                            isLight 
                              ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                              : 'bg-indigo-500 text-white hover:bg-indigo-600'
                          }`}
                        >
                          🔗 Поделиться отчётом
                        </button>
                      </div>
                      {shareLink && (
                        <div className={`mt-3 p-2 rounded-lg text-xs break-all ${isLight ? 'bg-gray-50 text-gray-500' : 'bg-white/5 text-gray-400'}`}>
                          Ссылка скопирована! Сохраните её в закладки.
                        </div>
                      )}
                    </div>
                  </AnimatedCard>

                  {/* Домашние задания */}
                  <AnimatedCard delay={240}>
                    <div className={`rounded-2xl p-6 ${cardBg}`}>
                      <h3 className={`font-bold ${textColor} mb-3`}>📚 Домашние задания</h3>
                      {pendingHw.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-amber-500 font-medium">⚠️ Не выполнено: {pendingHw.length}</p>
                          {pendingHw.slice(0, 5).map((hw: any) => (
                            <div key={hw.id} className={`p-3 rounded-xl flex items-center justify-between ${isLight ? 'bg-amber-50' : 'bg-amber-500/10'}`}>
                              <div>
                                <p className={`font-medium text-sm ${textColor}`}>{hw.title || "Без названия"}</p>
                                <p className={`text-xs ${subTextColor}`}>
                                  {hw.deadline ? `Срок: ${new Date(hw.deadline).toLocaleDateString("ru-RU")}` : "Без срока"}
                                  {hw.topic && ` • ${hw.topic}`}
                                </p>
                              </div>
                              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-500 rounded-full">Не сдано</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`${subTextColor} text-center py-4`}>Все задания выполнены ✅</p>
                      )}
                      <div className="flex justify-between mt-3 text-sm">
                        <span className={subTextColor}>Сдано: {doneHw} из {totalHw}</span>
                        <span className={subTextColor}>{hwRate}%</span>
                      </div>
                    </div>
                  </AnimatedCard>

                  {/* Ближайшие занятия списком */}
                  <AnimatedCard delay={260}>
                    <div className={`rounded-2xl p-6 ${cardBg}`}>
                      <h3 className={`font-bold ${textColor} mb-3`}>📅 Расписание</h3>
                      {upcomingLessons.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingLessons.slice(0, 5).map((l: any, i: number) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${isLight ? 'bg-pink-50/50' : 'bg-white/5'}`}>
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                                <div>
                                  <p className={`font-medium text-sm ${textColor}`}>{l.subject === "chemistry" ? "Химия" : "Биология"}</p>
                                  <p className={`text-xs ${subTextColor}`}>
                                    {new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                                    {" • "}
                                    {new Date(l.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                              {l.zoom_link && (
                                <a href={l.zoom_link} target="_blank" rel="noopener noreferrer" className={`text-xs px-3 py-1 rounded-lg transition ${
                                  isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}>
                                  🎥 Zoom
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`${subTextColor} text-center py-4`}>Нет запланированных занятий</p>
                      )}
                    </div>
                  </AnimatedCard>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    }>
      <ParentDashboardContent />
    </Suspense>
  );
}