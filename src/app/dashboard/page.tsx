"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function DashboardContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState(""); const [role, setRole] = useState("student");
  useEffect(() => { setUid(searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || ""); setRole(searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student"); }, [searchParams]);

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ lessons: 0, completed: 0, homeworks: 0, activeHw: 0, students: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    localStorage.setItem("uid", uid); localStorage.setItem("role", role);
    getDoc(doc(db, "profiles", uid)).then((snap) => { if (snap.exists()) setProfile(snap.data()); });
    const isTutor = role === "tutor";
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where(isTutor ? "tutor_id" : "student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, lessons: data.length, completed: data.filter((l: any) => l.status === "completed").length })); const now = new Date(); setUpcoming(data.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > now).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 3)); });
    if (isTutor) { const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("tutor_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, activeHw: data.filter((h: any) => h.status === "active").length })); }); const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => setStats((prev) => ({ ...prev, students: snap.docs.length }))); return () => { unsubLessons(); unsubHw(); unsubStudents(); }; }
    else { const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, activeHw: data.filter((h: any) => h.status === "active").length })); }); return () => { unsubLessons(); unsubHw(); }; }
  }, [uid, role]);

  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
  const isTutor = role === "tutor";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-emerald-50/30">
      <nav className="bg-white/80 backdrop-blur shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="flex items-center gap-2">
            <span className="text-2xl">🧪🧬</span>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent hidden sm:block">Репетитор ХиБи</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{today}</span>
            <Link href={`/profile?uid=${uid}&role=${role}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-emerald-400 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-110 transition">
                {profile?.full_name?.[0]?.toUpperCase() || "?"}
              </div>
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-red-400 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50">Выйти</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-6 sm:p-8 border border-white">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">👋 Добрый день, {profile?.full_name || (isTutor ? "Репетитор" : "Ученик")}!</h2>
          <p className="text-gray-500 mt-2">{isTutor ? "🧑‍🏫 Репетитор" : "🎓 Ученик"} • {today}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Занятий", value: stats.lessons, icon: "📅", color: "from-indigo-500 to-blue-500" },
            { label: "Проведено", value: stats.completed, icon: "✅", color: "from-emerald-500 to-green-500" },
            ...(isTutor
              ? [{ label: "Учеников", value: stats.students, icon: "👥", color: "from-amber-500 to-orange-500" }, { label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-rose-500 to-pink-500" }]
              : [{ label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-amber-500 to-orange-500" }, { label: "Активных", value: stats.activeHw, icon: "🟢", color: "from-rose-500 to-pink-500" }]),
          ].map((stat) => (
            <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 sm:p-5 shadow-lg border border-white hover:scale-[1.02] transition">
              <div className="flex items-center justify-between mb-2"><span className="text-2xl">{stat.icon}</span><span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white`}>{stat.label}</span></div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: `/schedule?uid=${uid}&role=${role}`, icon: "📅", title: "Расписание", desc: isTutor ? "Управление занятиями" : "Мои занятия", color: "hover:border-indigo-300" },
            { href: `/homeworks?uid=${uid}&role=${role}`, icon: "📚", title: "Домашние задания", desc: isTutor ? "Создание и проверка" : "Мои задания", color: "hover:border-amber-300" },
            ...(isTutor
              ? [{ href: `/students?uid=${uid}&role=${role}`, icon: "👥", title: "Ученики", desc: "Список и прогресс", color: "hover:border-emerald-300" }, { href: `/library?uid=${uid}&role=${role}`, icon: "📦", title: "Библиотека", desc: "Шаблоны заданий", color: "hover:border-purple-300" }]
              : [{ href: `/profile?uid=${uid}&role=${role}`, icon: "👤", title: "Мой кабинет", desc: "Прогресс и достижения", color: "hover:border-purple-300" }]),
          ].map((card) => (
            <Link key={card.href} href={card.href} className={`bg-white/80 backdrop-blur rounded-2xl p-5 shadow-lg border-2 border-transparent ${card.color} transition hover:shadow-xl`}>
              <span className="text-4xl mb-3 block">{card.icon}</span>
              <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-6 border border-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">📋 Ближайшие занятия</h2>
            <Link href={`/schedule?uid=${uid}&role=${role}`} className="text-sm text-indigo-500 hover:text-indigo-700 transition">Все →</Link>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((l: any, i: number) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border-l-4 ${l.subject === "chemistry" ? "border-l-indigo-500 bg-indigo-50/50" : "border-l-emerald-500 bg-emerald-50/50"}`}>
                  <div className="flex items-center gap-3"><span className="text-xl">{l.subject === "chemistry" ? "🧪" : "🧬"}</span><div><p className="font-medium text-gray-800">{l.subject === "chemistry" ? "Химия" : "Биология"}</p><p className="text-sm text-gray-500">{isTutor ? `👤 ${l.student_name || l.student_id}` : "🧑‍🏫 Ваш репетитор"}</p></div></div>
                  <div className="text-right"><p className="font-medium text-gray-700">{new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p><p className="text-sm text-gray-500">{new Date(l.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} – {new Date(l.end_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p></div>
                </div>
              ))}
            </div>
          ) : (<div className="text-center py-8"><p className="text-4xl mb-2">📭</p><p className="text-gray-400">Нет ближайших занятий</p></div>)}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><DashboardContent /></Suspense>);
}