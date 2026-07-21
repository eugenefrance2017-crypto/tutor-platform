"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";

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

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "chemistry" | "biology">("all");
  const [period, setPeriod] = useState<"all" | "week" | "month">("all");
  const [sortBy, setSortBy] = useState<"xp" | "score" | "homeworks" | "attendance">("xp");
  const [searchQuery, setSearchQuery] = useState("");
  const [tutorId, setTutorId] = useState<string>("");

  // Загрузка tutor_id из профиля текущего пользователя
  useEffect(() => {
    if (!uid) return;
    const loadTutorId = async () => {
      try {
        const profileSnap = await getDocs(query(collection(db, "profiles"), where("role", "==", "tutor")));
        if (profileSnap.docs.length > 0) {
          setTutorId(profileSnap.docs[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadTutorId();
  }, [uid]);

  // Загрузка учеников с их статистикой
  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "profiles"), where("role", "==", "student"));
    const unsub = onSnapshot(q, async (snap) => {
      const studentsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Загрузка статистики для каждого ученика
      const studentsWithStats = await Promise.all(
        studentsData.map(async (student) => {
          try {
            const [lessonsSnap, homeworksSnap, submissionsSnap] = await Promise.all([
              getDocs(query(collection(db, "lessons"), where("student_id", "==", student.id))),
              getDocs(query(collection(db, "homeworks"), where("student_id", "==", student.id))),
              getDocs(query(collection(db, "submissions"), where("student_id", "==", student.id))),
            ]);

            const lessons = lessonsSnap.docs.map((d) => d.data());
            const homeworks = homeworksSnap.docs.map((d) => d.data());
            const submissions = submissionsSnap.docs.map((d) => d.data());

            const completedLessons = lessons.filter((l) => l.status === "completed").length;
            const doneHw = homeworks.filter((h) => h.status === "done").length;
            const avgScore =
              submissions.length > 0
                ? Math.round(
                    submissions.reduce((sum, s) => {
                      const hw = homeworks.find((h) => h.id === s.homework_id);
                      return sum + (hw?.max_score ? (s.score / hw.max_score) * 100 : 0);
                    }, 0) / submissions.length
                  )
                : 0;
            const attendance =
              lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

            return {
              ...student,
              stats: {
                lessons: lessons.length,
                completedLessons,
                homeworks: homeworks.length,
                doneHw,
                submissions: submissions.length,
                avgScore,
                attendance,
              },
            };
          } catch (e) {
            return { ...student, stats: { lessons: 0, completedLessons: 0, homeworks: 0, doneHw: 0, submissions: 0, avgScore: 0, attendance: 0 } };
          }
        })
      );

      setStudents(studentsWithStats);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  // Фильтрация и сортировка
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    // Фильтр по предмету
    if (filter !== "all") {
      filtered = filtered.filter((s) => s.main_subject === filter);
    }

    // Фильтр по периоду
    if (period !== "all") {
      const now = new Date();
      const cutoff = period === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((s) => {
        const lastActivity = s.last_activity ? new Date(s.last_activity).getTime() : 0;
        return now.getTime() - lastActivity <= cutoff;
      });
    }

    // Поиск
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "xp":
          return (b.xp || 0) - (a.xp || 0);
        case "score":
          return (b.stats?.avgScore || 0) - (a.stats?.avgScore || 0);
        case "homeworks":
          return (b.stats?.doneHw || 0) - (a.stats?.doneHw || 0);
        case "attendance":
          return (b.stats?.attendance || 0) - (a.stats?.attendance || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [students, filter, period, sortBy, searchQuery]);

  const medals = ["🥇", "🥈", "🥉"];
  const avatars = [
    "from-yellow-400 to-amber-500",
    "from-gray-300 to-gray-400",
    "from-orange-400 to-red-500",
    "from-purple-400 to-pink-500",
    "from-emerald-400 to-teal-500",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🐍</div>
          <p className="text-amber-400 font-serif italic">Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950 text-white relative overflow-hidden">
      {/* Фоновые элементы Reputation */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-8xl">🐍</div>
        <div className="absolute bottom-20 right-10 text-7xl">👑</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">⚡</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🏆</div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🐍</span>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
              Рейтинг
            </h1>
            <span className="text-4xl">👑</span>
          </div>
          <p className="text-amber-400/70 font-serif italic text-sm">
            "I got a list of names and they said it's my fault" 🐍
          </p>
        </div>

        {/* Фильтры и поиск */}
        <div className="bg-zinc-900/80 backdrop-blur rounded-2xl p-4 border border-amber-500/20 mb-6">
          {/* Поиск */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Поиск ученика..."
            className="w-full bg-stone-900 border border-amber-500/30 rounded-xl px-4 py-2 text-sm text-white placeholder-amber-400/50 focus:border-amber-500 focus:outline-none mb-4"
          />

          {/* Фильтры */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Предмет */}
            <div>
              <label className="text-xs text-amber-400/70 uppercase tracking-wide font-bold mb-1 block">Предмет</label>
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Все" },
                  { key: "chemistry", label: "🧪" },
                  { key: "biology", label: "🧬" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key as any)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      filter === f.key
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 shadow-lg"
                        : "bg-stone-800 text-amber-400 hover:bg-stone-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Период */}
            <div>
              <label className="text-xs text-amber-400/70 uppercase tracking-wide font-bold mb-1 block">Период</label>
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Всё" },
                  { key: "week", label: "Неделя" },
                  { key: "month", label: "Месяц" },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key as any)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      period === p.key
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 shadow-lg"
                        : "bg-stone-800 text-amber-400 hover:bg-stone-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Сортировка */}
            <div>
              <label className="text-xs text-amber-400/70 uppercase tracking-wide font-bold mb-1 block">Сортировка</label>
              <div className="flex gap-2">
                {[
                  { key: "xp", label: "⭐ XP" },
                  { key: "score", label: "🎯 Балл" },
                  { key: "homeworks", label: "📚 ДЗ" },
                  { key: "attendance", label: "✅ Посещ." },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSortBy(s.key as any)}
                    className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition ${
                      sortBy === s.key
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 shadow-lg"
                        : "bg-stone-800 text-amber-400 hover:bg-stone-700"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Топ-3 */}
        {filteredStudents.length >= 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 0, 2].map((idx) => {
              const s = filteredStudents[idx];
              if (!s) return null;
              const isCurrentUser = s.id === uid;
              return (
                <div
                  key={s.id}
                  className={`relative bg-gradient-to-br ${
                    idx === 0 ? "from-amber-500/20 to-yellow-500/10" : idx === 1 ? "from-gray-400/20 to-gray-500/10" : "from-orange-500/20 to-red-500/10"
                  } backdrop-blur rounded-3xl p-6 border-2 ${
                    idx === 0 ? "border-amber-400" : idx === 1 ? "border-gray-400" : "border-orange-400"
                  } ${idx === 0 ? "sm:scale-110 sm:z-10" : ""} ${isCurrentUser ? "ring-4 ring-amber-500/50" : ""} transition-all hover:scale-[1.02]`}
                >
                  <div className="text-center">
                    <div className="text-5xl mb-3">{medals[idx]}</div>
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-black bg-gradient-to-br ${avatars[idx]} shadow-xl ring-4 ${
                      idx === 0 ? "ring-amber-400" : idx === 1 ? "ring-gray-400" : "ring-orange-400"
                    }`}>
                      {(s.full_name || "?")[0].toUpperCase()}
                    </div>
                    <p className="font-serif font-bold text-white mt-3 text-lg truncate">
                      {s.full_name || "Ученик"}
                    </p>
                    {isCurrentUser && (
                      <span className="inline-block px-2 py-0.5 bg-amber-500 text-stone-900 text-xs font-bold rounded-full mt-1">
                        ВЫ
                      </span>
                    )}
                    <p className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent mt-2">
                      {s.xp || 0} XP
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">⭐ {s.level || 1} уровень</p>
                    
                    {/* Мини-статистика */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-amber-500/20">
                      <div>
                        <p className="text-xs text-amber-400/70">📚</p>
                        <p className="text-sm font-bold text-white">{s.stats?.doneHw || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-400/70">🎯</p>
                        <p className="text-sm font-bold text-white">{s.stats?.avgScore || 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-400/70">✅</p>
                        <p className="text-sm font-bold text-white">{s.stats?.attendance || 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Таблица */}
        <div className="bg-zinc-900/80 backdrop-blur rounded-3xl border border-amber-500/20 overflow-hidden">
          <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
            <h2 className="font-serif font-bold text-amber-400 uppercase tracking-wide">📊 Все ученики</h2>
            <span className="text-xs text-amber-400/70">{filteredStudents.length} учеников</span>
          </div>
          <div className="divide-y divide-amber-500/10">
            {filteredStudents.length === 0 && (
              <p className="text-center py-12 text-amber-400/50 font-serif italic">Нет учеников по выбранным фильтрам</p>
            )}
            {filteredStudents.map((s, i) => {
              const isCurrentUser = s.id === uid;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 p-4 hover:bg-amber-500/5 transition ${
                    isCurrentUser ? "bg-amber-500/10 border-l-4 border-amber-500" : ""
                  } ${i < 3 ? "bg-gradient-to-r from-amber-500/5 to-transparent" : ""}`}
                >
                  <span className={`text-lg font-black w-8 text-center ${i < 3 ? "text-amber-400" : "text-amber-400/50"}`}>
                    {i < 3 ? medals[i] : i + 1}
                  </span>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${avatars[i % avatars.length]} shadow-md`}>
                    {(s.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {s.full_name || "Ученик"}
                      {isCurrentUser && <span className="text-xs text-amber-400 ml-2">(вы)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-amber-400/70">⭐ {s.level || 1} ур.</span>
                      <span className="text-xs text-amber-400/70">📚 {s.stats?.doneHw || 0} ДЗ</span>
                      <span className="text-xs text-amber-400/70">🎯 {s.stats?.avgScore || 0}%</span>
                      <span className="text-xs text-amber-400/70">✅ {s.stats?.attendance || 0}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      {s.xp || 0}
                    </p>
                    <p className="text-xs text-amber-400/70">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Подпись */}
        <div className="text-center py-8">
          <p className="text-amber-400/40 text-xs font-serif italic">
            "Look what you made me do" 🐍
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-950 via-zinc-900 to-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🐍</div>
          <p className="text-amber-400 font-serif italic">Загрузка...</p>
        </div>
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}