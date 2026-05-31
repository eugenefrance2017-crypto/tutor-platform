"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useTheme } from "../theme-provider";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function StudentLinks({ studentId }: { studentId: string }) {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => { if (!studentId) return; getDoc(doc(db, "profiles", studentId)).then((snap) => { if (snap.exists()) setProfile(snap.data()); }); }, [studentId]);
  if (!profile || (!profile.zoom_link && !profile.board_link)) return null;
  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-white/20">
      {profile.zoom_link && <a href={profile.zoom_link} target="_blank" className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition">🎥 Zoom</a>}
      {profile.board_link && <a href={profile.board_link} target="_blank" className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition">🖊️ Доска</a>}
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState(""); const [role, setRole] = useState("student");
  useEffect(() => { setUid(searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || ""); setRole(searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student"); }, [searchParams]);

  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ lessons: 0, completed: 0, homeworks: 0, activeHw: 0, students: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return; localStorage.setItem("uid", uid); localStorage.setItem("role", role);
    getDoc(doc(db, "profiles", uid)).then((snap) => { if (snap.exists()) setProfile(snap.data()); });
    const isTutor = role === "tutor";
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where(isTutor ? "tutor_id" : "student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, lessons: data.length, completed: data.filter((l: any) => l.status === "completed").length })); const now = new Date(); setUpcoming(data.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > now).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 3)); });
    if (isTutor) { const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("tutor_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, activeHw: data.filter((h: any) => h.status === "active").length })); }); const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => setStats((prev) => ({ ...prev, students: snap.docs.length }))); return () => { unsubLessons(); unsubHw(); unsubStudents(); }; }
    else { const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, activeHw: data.filter((h: any) => h.status === "active").length })); }); return () => { unsubLessons(); unsubHw(); }; }
  }, [uid, role]);

  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
  const isTutor = role === "tutor";

  const cards = [
    { href: `/schedule?uid=${uid}&role=${role}`, icon: "📅", title: "Расписание", desc: "Управление занятиями", gradient: "from-indigo-500 to-blue-500" },
    { href: `/homeworks?uid=${uid}&role=${role}`, icon: "📚", title: "Домашние задания", desc: "Создание и проверка", gradient: "from-amber-500 to-orange-500" },
    { href: `/students?uid=${uid}&role=${role}`, icon: "👥", title: "Ученики", desc: "Список и прогресс", gradient: "from-emerald-500 to-green-500" },
    { href: `/library?uid=${uid}&role=${role}`, icon: "📦", title: "Библиотека", desc: "Шаблоны заданий", gradient: "from-purple-500 to-violet-500" },
    { href: `/exam-trials?uid=${uid}&role=${role}`, icon: "📝", title: "Пробники", desc: "Результаты ЕГЭ/ОГЭ", gradient: "from-rose-500 to-pink-500" },
    { href: `/ai-generator?uid=${uid}&role=${role}`, icon: "🤖", title: "ИИ-генератор", desc: "Создать задания с AI", gradient: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-slate-950 dark:via-indigo-950/30 dark:to-slate-950 transition-colors duration-700">
      <nav className="sticky top-0 z-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-b border-indigo-100 dark:border-indigo-900/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="flex items-center gap-2">
            <span className="text-2xl">🧪🧬</span>
            <span className="text-lg font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">Jenyawisch</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{today}</span>
            <button onClick={toggleTheme} className="text-lg hover:scale-110 transition-transform">{theme === "light" ? "🌙" : "☀️"}</button>
            <Link href={`/profile?uid=${uid}&role=${role}`}>
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900 hover:scale-110 transition-transform">
                {profile?.full_name?.[0]?.toUpperCase() || "?"}
              </div>
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 transition">Выйти</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 p-6 sm:p-8">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-bl from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-emerald-400/20 to-amber-400/20 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white">
              👋 Добрый день, <span className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">{profile?.full_name || (isTutor ? "Репетитор" : "Ученик")}</span>!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
              {isTutor ? "🧑‍🏫 Репетитор" : "🎓 Ученик"} • {today}
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[{ label: "Занятий", value: stats.lessons, icon: "📅", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400" }, { label: "Проведено", value: stats.completed, icon: "✅", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" }, { label: "Учеников", value: stats.students, icon: "👥", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" }, { label: "Заданий", value: stats.homeworks, icon: "📚", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400" }].map((s) => (
            <div key={s.label} className={`${s.bg} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}>
              <div className="flex items-center justify-between mb-2"><span className="text-2xl">{s.icon}</span><span className={`text-xs font-bold ${s.text}`}>{s.label}</span></div>
              <p className={`text-3xl sm:text-4xl font-black ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-5 border border-white/50 dark:border-slate-700/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${card.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`} />
              <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform duration-300">{card.icon}</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{card.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.desc}</p>
              <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${card.gradient} w-0 group-hover:w-full transition-all duration-500`} />
            </Link>
          ))}
        </div>

        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 p-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📋 Ближайшие занятия</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((l: any, i: number) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border-l-4 transition-all hover:scale-[1.01] ${l.subject === "chemistry" ? "border-l-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20" : "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20"}`}>
                  <div className="flex items-center gap-3"><span className="text-xl">{l.subject === "chemistry" ? "🧪" : "🧬"}</span><div><p className="font-semibold text-gray-800 dark:text-white">{l.subject === "chemistry" ? "Химия" : "Биология"}</p><p className="text-sm text-gray-500 dark:text-gray-400">{isTutor ? `👤 ${l.student_name}` : "🧑‍🏫 Репетитор"}</p></div></div>
                  <div className="text-right"><p className="font-semibold text-gray-700 dark:text-gray-300">{new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(l.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p></div>
                  {isTutor && l.student_id && <StudentLinks studentId={l.student_id} />}
                </div>
              ))}
            </div>
          ) : <div className="text-center py-10"><p className="text-5xl mb-3">📭</p><p className="text-gray-400 dark:text-gray-500">Нет ближайших занятий</p></div>}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-indigo-50 dark:bg-slate-950"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}><DashboardContent /></Suspense>);
}