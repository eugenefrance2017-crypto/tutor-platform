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

function StudentLinks({ studentId }: { studentId: string }) {
  const [studentProfile, setStudentProfile] = useState<any>(null);
  useEffect(() => { if (!studentId) return; getDoc(doc(db, "profiles", studentId)).then((snap) => { if (snap.exists()) setStudentProfile(snap.data()); }); }, [studentId]);
  if (!studentProfile || (!studentProfile.zoom_link && !studentProfile.board_link)) return null;
  return (
    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
      {studentProfile.zoom_link && <a href={studentProfile.zoom_link} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1">🎥 Zoom</a>}
      {studentProfile.board_link && <a href={studentProfile.board_link} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-1">🖊️ Доска</a>}
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState(""); const [role, setRole] = useState("student");
  useEffect(() => { 
    const urlUid = searchParams.get("uid");
    const urlRole = searchParams.get("role");
    if (urlUid) { setUid(urlUid); localStorage.setItem("uid", urlUid); }
    else { setUid(localStorage.getItem("uid") || ""); }
    if (urlRole) { setRole(urlRole); localStorage.setItem("role", urlRole); }
    else { setRole(localStorage.getItem("role") || "student"); }
  }, [searchParams]);

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ lessons: 0, completed: 0, homeworks: 0, activeHw: 0, students: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then((snap) => { if (snap.exists()) setProfile(snap.data()); });
    const isTutor = role === "tutor";
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where(isTutor ? "tutor_id" : "student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, lessons: data.length, completed: data.filter((l: any) => l.status === "completed").length })); const now = new Date(); setUpcoming(data.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > now).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 3)); });
    if (isTutor) { const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("tutor_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, activeHw: data.filter((h: any) => h.status === "active").length })); }); const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => setStats((prev) => ({ ...prev, students: snap.docs.length }))); return () => { unsubLessons(); unsubHw(); unsubStudents(); }; }
    else { const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, activeHw: data.filter((h: any) => h.status === "active").length })); }); return () => { unsubLessons(); unsubHw(); }; }
  }, [uid, role]);

  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
  const isTutor = role === "tutor";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
      <nav className="md:hidden bg-white/80 backdrop-blur shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="flex items-center gap-2">
            <span className="text-xl">🧪🧬</span>
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">Jenyawisch</span>
          </Link>
          <Link href={`/profile?uid=${uid}&role=${role}`}><div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-emerald-400 rounded-full flex items-center justify-center text-white text-sm font-bold">{profile?.full_name?.[0]?.toUpperCase() || "?"}</div></Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-6 sm:p-8 border border-white">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">👋 Добрый день, {profile?.full_name || (isTutor ? "Репетитор" : "Ученик")}!</h2>
          <p className="text-gray-500 mt-2">{isTutor ? "🧑‍🏫 Репетитор" : "🎓 Ученик"} • {today}</p>
          {!isTutor && profile?.xp !== undefined && <div className="mt-3 flex items-center gap-2"><span className="text-sm font-medium text-indigo-600">⭐ Уровень {profile.level || 1}</span><span className="text-sm text-gray-400">• ⭐ {profile.xp} XP</span></div>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[{ label: "Занятий", value: stats.lessons, icon: "📅", color: "from-indigo-500 to-blue-500" }, { label: "Проведено", value: stats.completed, icon: "✅", color: "from-emerald-500 to-green-500" }, ...(isTutor ? [{ label: "Учеников", value: stats.students, icon: "👥", color: "from-amber-500 to-orange-500" }, { label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-rose-500 to-pink-500" }] : [{ label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-amber-500 to-orange-500" }, { label: "Активных", value: stats.activeHw, icon: "🟢", color: "from-rose-500 to-pink-500" }])].map((stat) => (
            <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 sm:p-5 shadow-lg border border-white hover:scale-[1.02] transition">
              <div className="flex items-center justify-between mb-2"><span className="text-2xl">{stat.icon}</span><span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white`}>{stat.label}</span></div>
              <p className="text-3xl sm:text-4xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ href: `/schedule?uid=${uid}&role=${role}`, icon: "📅", title: "Расписание", desc: "Управление занятиями" }, { href: `/homeworks?uid=${uid}&role=${role}`, icon: "📚", title: "Задания", desc: "Создание и проверка" }, { href: `/students?uid=${uid}&role=${role}`, icon: "👥", title: "Ученики", desc: "Список и прогресс" }, { href: `/library?uid=${uid}&role=${role}`, icon: "📦", title: "Библиотека", desc: "Шаблоны заданий" }, { href: `/exam-trials?uid=${uid}&role=${role}`, icon: "📝", title: "Пробники", desc: "Результаты ЕГЭ/ОГЭ" }, { href: `/ai-generator?uid=${uid}&role=${role}`, icon: "🤖", title: "ИИ-генератор", desc: "Создать задания с AI" }].map((card) => (
            <Link key={card.href} href={card.href} className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-lg border-2 border-transparent hover:border-indigo-300 transition hover:shadow-xl">
              <span className="text-4xl mb-3 block">{card.icon}</span>
              <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-6 border border-white">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-800">📋 Ближайшие занятия</h2><Link href={`/schedule?uid=${uid}&role=${role}`} className="text-sm text-indigo-500 hover:text-indigo-700 transition">Все →</Link></div>
          {upcoming.length > 0 ? <div className="space-y-3">{upcoming.map((l: any, i: number) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border-l-4 ${l.subject==="chemistry"?"border-l-indigo-500 bg-indigo-50/50":"border-l-emerald-500 bg-emerald-50/50"}`}>
              <div className="flex items-center gap-3"><span className="text-xl">{l.subject==="chemistry"?"🧪":"🧬"}</span><div><p className="font-medium text-gray-800">{l.subject==="chemistry"?"Химия":"Биология"}</p><p className="text-sm text-gray-500">{isTutor?`👤 ${l.student_name||l.student_id}`:"🧑‍🏫 Ваш репетитор"}</p></div></div>
              <div className="text-right"><p className="font-medium text-gray-700">{new Date(l.start_time).toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</p><p className="text-sm text-gray-500">{new Date(l.start_time).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})} – {new Date(l.end_time).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</p></div>
              {isTutor && l.student_id && <StudentLinks studentId={l.student_id} />}
            </div>
          ))}</div> : <div className="text-center py-8"><p className="text-4xl mb-2">📭</p><p className="text-gray-400">Нет ближайших занятий</p></div>}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div><p className="text-gray-500">Загрузка...</p></div></div>}><DashboardContent /></Suspense>);
}