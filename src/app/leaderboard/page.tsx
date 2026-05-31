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

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "chemistry" | "biology">("all");

  useEffect(() => {
    const q = query(collection(db, "profiles"), where("role", "==", "student"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      setStudents(data);
    });
    return () => unsub();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const avatars = ["from-indigo-400 to-blue-500", "from-emerald-400 to-green-500", "from-amber-400 to-orange-500", "from-rose-400 to-pink-500", "from-purple-400 to-violet-500"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-yellow-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">🏆 Рейтинг</h1>
          <div></div>
        </div>

        <div className="flex gap-2 mb-6">
          {[{ key: "all", label: "Все" }, { key: "chemistry", label: "🧪 Химия" }, { key: "biology", label: "🧬 Биология" }].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key as any)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === f.key ? "bg-yellow-500 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}>{f.label}</button>
          ))}
        </div>

        {/* Топ-3 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {students.slice(0, 3).map((s, i) => (
            <div key={s.id} className={`bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-white text-center ${i === 0 ? 'scale-105 ring-2 ring-yellow-400' : ''}`}>
              <div className="text-4xl mb-2">{medals[i]}</div>
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${avatars[i]}`}>{(s.full_name || "?")[0]}</div>
              <p className="font-bold text-gray-800 mt-2 text-sm truncate">{s.full_name || "Ученик"}</p>
              <p className="text-yellow-600 font-bold">{s.xp || 0} XP</p>
              <p className="text-xs text-gray-400">⭐ {s.level || 1} уровень</p>
            </div>
          ))}
        </div>

        {/* Таблица */}
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg border border-white overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">📊 Все ученики</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {students.length === 0 && <p className="text-center py-8 text-gray-400">Нет учеников</p>}
            {students.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition ${s.id === uid ? 'bg-indigo-50' : ''}`}>
                <span className="text-lg font-bold text-gray-400 w-8">{i + 1}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${avatars[i % avatars.length]}`}>{(s.full_name || "?")[0]}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{s.full_name || "Ученик"}{s.id === uid && <span className="text-xs text-indigo-500 ml-1">(вы)</span>}</p>
                  <p className="text-xs text-gray-400">⭐ {s.level || 1} уровень</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-600">{s.xp || 0} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><LeaderboardContent /></Suspense>);
}