"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function StudentsContent() {
  const searchParams = useSearchParams(); const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [studentHomeworks, setStudentHomeworks] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "profiles"), where("role", "==", "student"));
    const unsub = onSnapshot(q, (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", selected.id)), (snap) => setStudentLessons(snap.docs.map((d) => d.data())));
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", selected.id)), (snap) => setStudentHomeworks(snap.docs.map((d) => d.data())));
    return () => { unsubLessons(); unsubHw(); };
  }, [selected]);

  const totalLessons = studentLessons.length;
  const completedLessons = studentLessons.filter((l: any) => l.status === "completed").length;
  const totalHw = studentHomeworks.length;
  const doneHw = studentHomeworks.filter((h: any) => h.status === "done").length;
  const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;

  const AVATARS = ["from-indigo-400 to-blue-500", "from-emerald-400 to-green-500", "from-amber-400 to-orange-500", "from-rose-400 to-pink-500", "from-purple-400 to-violet-500", "from-cyan-400 to-teal-500"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">👥 Ученики</h1>
          <div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список учеников */}
          <div className="lg:col-span-1 space-y-3">
            {students.length > 0 ? students.map((s: any, idx: number) => (
              <button key={s.id} onClick={() => setSelected(s)}
                className={`w-full text-left p-4 rounded-2xl transition border-2 flex items-center gap-4 ${
                  selected?.id === s.id ? "bg-white border-emerald-400 shadow-lg shadow-emerald-100 scale-[1.02]" : "bg-white/80 border-transparent hover:border-gray-200 shadow-sm"
                }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${AVATARS[idx % AVATARS.length]} shadow-md`}>
                  {(s.full_name || "У")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
              </button>
            )) : (
              <div className="text-center py-12 bg-white/80 rounded-2xl"><p className="text-4xl mb-2">👻</p><p className="text-gray-400">Нет учеников</p></div>
            )}
          </div>

          {/* Детали */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-6">
                {/* Профиль */}
                <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6 border border-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br ${AVATARS[students.findIndex((x) => x.id === selected.id) % AVATARS.length]} shadow-lg`}>
                      {(selected.full_name || "У")[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{selected.full_name}</h2>
                      <p className="text-gray-400 text-sm">{selected.email}</p>
                    </div>
                  </div>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Занятий", value: totalLessons, sub: `${completedLessons} проведено`, icon: "📅", color: "from-indigo-500 to-blue-500" },
                    { label: "Заданий", value: totalHw, sub: `${doneHw} проверено`, icon: "📚", color: "from-amber-500 to-orange-500" },
                    { label: "Посещаемость", value: attendance + "%", sub: "от всех занятий", icon: "📊", color: "from-emerald-500 to-green-500" },
                    { label: "Сдано ДЗ", value: hwRate + "%", sub: "от всех заданий", icon: "⭐", color: "from-rose-500 to-pink-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white text-center hover:scale-[1.02] transition">
                      <span className="text-2xl">{stat.icon}</span>
                      <p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Прогресс-бары */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white space-y-4">
                  <h3 className="font-semibold text-gray-700">📈 Прогресс</h3>
                  {[
                    { label: "Посещаемость", value: attendance, color: "from-emerald-400 to-green-500" },
                    { label: "Сдача ДЗ", value: hwRate, color: "from-amber-400 to-orange-500" },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">{bar.label}</span><span className="font-medium">{bar.value}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div className={`h-3 rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`} style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Последние занятия */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white">
                  <h3 className="font-semibold text-gray-700 mb-3">🕐 Последние занятия</h3>
                  {studentLessons.length > 0 ? (
                    <div className="space-y-2">
                      {studentLessons.slice(-5).reverse().map((l: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span>{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                            <span className="text-sm font-medium">{new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${l.status === "scheduled" ? "bg-blue-100 text-blue-700" : l.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {l.status === "scheduled" ? "Запланировано" : l.status === "completed" ? "Проведено" : "Отменено"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-gray-400 text-sm py-4 text-center">Нет занятий</p>)}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full"><div className="text-center py-16"><p className="text-6xl mb-4">👈</p><p className="text-gray-400 text-lg">Выберите ученика</p><p className="text-gray-300 text-sm mt-1">Чтобы увидеть статистику и прогресс</p></div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><StudentsContent /></Suspense>);
}