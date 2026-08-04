"use client";

import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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

// 🎊 Конфетти
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rotation: number;
    }> = [];
    
    const colors = ["#FFD700", "#FFA500", "#FF6347", "#FF69B4", "#00CED1", "#7FFF00"];
    
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
      });
    }
    
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rotation += 5;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      
      if (particles.some((p) => p.y < canvas.height)) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

// 🏆 Бейджи достижений
function getBadges(student: any): Array<{ icon: string; title: string; color: string }> {
  const badges = [];
  
  if (student.daily_streak >= 7) {
    badges.push({ icon: "🔥", title: `Серия ${student.daily_streak} дней`, color: "from-orange-500 to-red-500" });
  }
  
  if (student.level >= 10) {
    badges.push({ icon: "⭐", title: `Уровень ${student.level}`, color: "from-yellow-500 to-amber-500" });
  }
  
  if (student.stats?.avgScore >= 90) {
    badges.push({ icon: "", title: "Отличник", color: "from-emerald-500 to-teal-500" });
  }
  
  if (student.stats?.doneHw >= 20) {
    badges.push({ icon: "📚", title: "Активист", color: "from-blue-500 to-cyan-500" });
  }
  
  if (student.stats?.attendance >= 95) {
    badges.push({ icon: "✅", title: "100% посещаемость", color: "from-purple-500 to-pink-500" });
  }
  
  return badges.slice(0, 3);
}

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
  const [showOnlyMyStudents, setShowOnlyMyStudents] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  // Отладка
  useEffect(() => {
    console.log("🔍 Current user:", uid, "Role:", role);
  }, [uid, role]);

  // Загрузка tutor_id
  useEffect(() => {
    if (!uid) return;
    const loadTutorId = async () => {
      try {
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          console.log("👤 Profile data:", data);
          
          if (role === "tutor") {
            setTutorId(uid);
            console.log("✅ Tutor ID set to:", uid);
          } else {
            const studentTutorId = data.tutor_id || "";
            setTutorId(studentTutorId);
            console.log("✅ Student's Tutor ID:", studentTutorId);
          }
        }
      } catch (e) {
        console.error("❌ Error loading tutor_id:", e);
      }
    };
    loadTutorId();
  }, [uid, role]);

  // ✅ ИСПРАВЛЕНО: Загрузка учеников
  useEffect(() => {
    if (!uid) {
      console.log("⚠️ No uid, skipping");
      return;
    }

    console.log("📊 Loading students... Role:", role, "TutorId:", tutorId);

    // Загружаем ВСЕХ учеников (без фильтра по tutor_id)
    const q = query(collection(db, "profiles"), where("role", "==", "student"));

    const unsub = onSnapshot(q, (snap) => {
      console.log("📚 Found students:", snap.docs.length);
      
      const studentsWithStats = snap.docs.map((d) => {
        const data = d.data();
        console.log("Student:", d.id, data);
        
        return {
          id: d.id,
          ...data,
          stats: data.stats || { 
            lessons: 0, completedLessons: 0, homeworks: 0, doneHw: 0, 
            submissions: 0, avgScore: 0, attendance: 0 
          },
          previous_xp: data.previous_xp || data.xp || 0,
        };
      });

      setStudents(studentsWithStats);
      setLoading(false);
    }, (error) => {
      console.error("❌ Error loading students:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [uid, tutorId]);

  // Проверка на попадание в Топ-3
  useEffect(() => {
    if (loading || students.length === 0) return;
    
    const myIndex = students.findIndex(s => s.id === uid);
    if (myIndex !== -1 && myIndex < 3 && previousRank !== null && previousRank >= 3) {
      setShowConfetti(true);
      toast.success("🎉 Поздравляем! Вы попали в Топ-3!");
      setTimeout(() => setShowConfetti(false), 5000);
    }
    
    if (myIndex !== -1) {
      setPreviousRank(myIndex);
    }
  }, [students, loading]);

  // Фильтрация и сортировка
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    console.log("🔍 Filtering... Total:", filtered.length);

    // Фильтр "Только мои ученики" (для репетитора)
    if (showOnlyMyStudents && role === "tutor" && tutorId) {
      filtered = filtered.filter(s => {
        const matches = s.tutor_id === tutorId;
        console.log("Student:", s.full_name, "tutor_id:", s.tutor_id, "matches:", matches);
        return matches;
      });
    }

    // Фильтр по предмету
    if (filter !== "all") {
      filtered = filtered.filter((s) => s.main_subject === filter || s.subject === filter);
    }

    // Фильтр по периоду
    if (period !== "all") {
      const now = new Date();
      const cutoff = period === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((s) => {
        const lastActivity = s.last_activity ? new Date(s.last_activity).getTime() : (s.updated_at ? new Date(s.updated_at).getTime() : 0);
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
        case "xp": return (b.xp || 0) - (a.xp || 0);
        case "score": return (b.stats?.avgScore || 0) - (a.stats?.avgScore || 0);
        case "homeworks": return (b.stats?.doneHw || 0) - (a.stats?.doneHw || 0);
        case "attendance": return (b.stats?.attendance || 0) - (a.stats?.attendance || 0);
        default: return 0;
      }
    });

    console.log("✅ Filtered students:", filtered.length);
    return filtered;
  }, [students, filter, period, sortBy, searchQuery, showOnlyMyStudents, role, tutorId]);

  // Прогресс до следующего места
  const getProgressToNext = (index: number) => {
    if (index === 0 || index >= filteredStudents.length - 1) return null;
    const current = filteredStudents[index];
    const next = filteredStudents[index - 1];
    const diff = (next.xp || 0) - (current.xp || 0);
    return { diff, nextName: next.full_name || "Соперник" };
  };

  // Индикатор тренда
  const getTrend = (student: any) => {
    const currentXp = student.xp || 0;
    const previousXp = student.previous_xp || 0;
    const diff = currentXp - previousXp;
    
    if (diff > 50) return { icon: "📈", color: "text-emerald-400", label: `+${diff}` };
    if (diff < -50) return { icon: "📉", color: "text-rose-400", label: `${diff}` };
    return { icon: "➡️", color: "text-gray-400", label: "0" };
  };

  const medals = ["", "🥈", "🥉"];
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
      {showConfetti && <Confetti />}
      
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-8xl">🐍</div>
        <div className="absolute bottom-20 right-10 text-7xl">👑</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">⚡</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🏆</div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
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

        <div className="bg-zinc-900/80 backdrop-blur rounded-2xl p-4 border border-amber-500/20 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Поиск ученика..."
            className="w-full bg-stone-900 border border-amber-500/30 rounded-xl px-4 py-2 text-sm text-white placeholder-amber-400/50 focus:border-amber-500 focus:outline-none mb-4"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {role === "tutor" && (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMyStudents}
                  onChange={(e) => setShowOnlyMyStudents(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm text-amber-400/70">Только мои ученики</span>
              </label>
            </div>
          )}
        </div>

        {filteredStudents.length >= 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 0, 2].map((idx) => {
              const s = filteredStudents[idx];
              if (!s) return null;
              const isCurrentUser = s.id === uid;
              const badges = getBadges(s);
              const trend = getTrend(s);
              
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative bg-gradient-to-br ${
                    idx === 0 ? "from-amber-500/20 to-yellow-500/10" : idx === 1 ? "from-gray-400/20 to-gray-500/10" : "from-orange-500/20 to-red-500/10"
                  } backdrop-blur rounded-3xl p-6 border-2 ${
                    idx === 0 ? "border-amber-400" : idx === 1 ? "border-gray-400" : "border-orange-400"
                  } ${idx === 0 ? "sm:scale-110 sm:z-10" : ""} ${isCurrentUser ? "ring-4 ring-amber-500/50" : ""} transition-all hover:scale-[1.02] ${
                    idx === 0 ? "animate-pulse-gold" : ""
                  }`}
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
                    
                    {badges.length > 0 && (
                      <div className="flex justify-center gap-1 mt-2 flex-wrap">
                        {badges.map((badge, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 bg-gradient-to-r ${badge.color} text-white text-[10px] font-bold rounded-full`}
                            title={badge.title}
                          >
                            {badge.icon}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {isCurrentUser && (
                      <span className="inline-block px-2 py-0.5 bg-amber-500 text-stone-900 text-xs font-bold rounded-full mt-2">
                        ВЫ
                      </span>
                    )}
                    
                    <p className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent mt-2">
                      {s.xp || 0} XP
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">⭐ {s.level || 1} уровень</p>
                    
                    <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${trend.color}`}>
                      <span>{trend.icon}</span>
                      <span>{trend.label} XP</span>
                    </div>
                    
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
                </motion.div>
              );
            })}
          </div>
        )}

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
              const badges = getBadges(s);
              const trend = getTrend(s);
              const progressToNext = getProgressToNext(i);
              
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
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
                    <p className="font-bold text-white text-sm truncate flex items-center gap-2">
                      {s.full_name || "Ученик"}
                      {isCurrentUser && <span className="text-xs text-amber-400">(вы)</span>}
                      {badges.length > 0 && (
                        <span className="flex gap-1">
                          {badges.slice(0, 2).map((badge, idx) => (
                            <span key={idx} className="text-xs" title={badge.title}>
                              {badge.icon}
                            </span>
                          ))}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-amber-400/70">⭐ {s.level || 1} ур.</span>
                      <span className="text-xs text-amber-400/70">📚 {s.stats?.doneHw || 0} ДЗ</span>
                      <span className="text-xs text-amber-400/70"> {s.stats?.avgScore || 0}%</span>
                      <span className="text-xs text-amber-400/70">✅ {s.stats?.attendance || 0}%</span>
                      <span className={`text-xs ${trend.color} flex items-center gap-1`}>
                        {trend.icon} {trend.label}
                      </span>
                    </div>
                    
                    {progressToNext && isCurrentUser && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-amber-400/70 mb-1">
                          <span>До {progressToNext.nextName}</span>
                          <span>{progressToNext.diff} XP</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, 100 - (progressToNext.diff / Math.max(s.xp || 1, 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                      {s.xp || 0}
                    </p>
                    <p className="text-xs text-amber-400/70">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-amber-400/40 text-xs font-serif italic">
            "Look what you made me do" 🐍
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
          50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
        }
        .animate-pulse-gold {
          animation: pulse-gold 2s ease-in-out infinite;
        }
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