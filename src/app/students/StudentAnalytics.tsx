"use client";

import { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tutor-platform-a5e37.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tutor-platform-a5e37",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115123071384",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function StudentAnalytics({ studentId, darkMode = false }: { studentId: string; darkMode?: boolean }) {
  const [results, setResults] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [dailyAnswers, setDailyAnswers] = useState<any[]>([]); // ✅ НОВОЕ: Ответы на ежедневные задания
  const [profile, setProfile] = useState<any>(null);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);

    // 1. Снимки результатов (ДЗ + пробники)
    const unsubResults = onSnapshot(
      query(collection(db, "student_results"), where("student_id", "==", studentId)),
      (snap) => {
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('❌ Ошибка загрузки student_results:', err);
        setLoading(false);
      }
    );

    // 2. Уроки — для посещаемости
    const unsubLessons = onSnapshot(collection(db, "lessons"), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const studentLessons = all.filter(l => 
        l.student_id === studentId || l.group_participants?.includes(studentId)
      );
      setLessons(studentLessons);
    });

    // 3. Профиль ученика (XP, уровень, серия)
    const unsubProfile = onSnapshot(doc(db, "profiles", studentId), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });

    // 4. Ежедневные задания (для анализа слабых тем)
    const unsubDailyTasks = onSnapshot(
      query(collection(db, "daily_tasks"), where("user_id", "==", studentId)),
      (snap) => setDailyTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // ✅ 5. НОВОЕ: Ответы на ежедневные задания (для графика и средних баллов)
    const unsubDailyAnswers = onSnapshot(
      query(collection(db, "daily_answers"), where("user_id", "==", studentId)),
      (snap) => setDailyAnswers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { 
      unsubResults(); 
      unsubLessons(); 
      unsubProfile(); 
      unsubDailyTasks(); 
      unsubDailyAnswers(); // ✅ Не забываем отписаться
    };
  }, [studentId]);

  // ✅ ОБНОВЛЁННАЯ СТАТИСТИКА: Учитываем ежедневные задания в общем среднем балле
  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.status === "completed").length;
    const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Обычные ДЗ
    const hwResults = results.filter(r => r.homework_type === "regular" || !r.homework_type);
    const totalHw = hwResults.length;
    const doneHw = hwResults.length;
    
    // ✅ Объединяем баллы обычных ДЗ и ежедневных заданий для общего среднего
    // В daily_answers score обычно 0 или 10. Приводим к 100-балльной шкале (умножаем на 10)
    const allScores = [
      ...hwResults.map(r => r.percentage || 0),
      ...dailyAnswers.map(a => (a.score || 0) * 10)
    ];

    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((sum: number, score: number) => sum + score, 0) / allScores.length) / 10
      : 0;

    const completionRate = totalHw > 0 ? 100 : 0;

    return { totalLessons, completedLessons, attendance, totalHw, doneHw, completionRate, avgScore };
  }, [lessons, results, dailyAnswers]);

  // Статистика ежедневной активности (геймификация и ИИ)
  const dailyStats = useMemo(() => {
    const streak = profile?.daily_streak || 0;
    const xp = profile?.xp || 0;
    const level = profile?.level || 1;
    const xpForNextLevel = level * 100;
    const xpProgress = xp % 100;

    const aiInterventions = dailyTasks.filter(t => t.is_adaptive === true).length;

    const weakTopicsMap: Record<string, number> = {};
    dailyTasks.forEach(t => {
      if (t.is_adaptive && t.weak_topic) {
        weakTopicsMap[t.weak_topic] = (weakTopicsMap[t.weak_topic] || 0) + 1;
      }
    });

    const topWeakTopics = Object.entries(weakTopicsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count }));

    return { streak, xp, level, xpProgress, xpForNextLevel, aiInterventions, topWeakTopics };
  }, [profile, dailyTasks]);

  const trialStats = useMemo(() => {
    const trialResults = results
      .filter(r => r.homework_type === "trial_exam")
      .sort((a: any, b: any) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime());

    if (trialResults.length === 0) return null;

    const recent = trialResults.slice(0, 3);
    const avgScore = Math.round(recent.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / recent.length);
    const prediction = Math.min(100, Math.round(avgScore * 1.05));
    const level = prediction >= 85 ? "Отлично 🎉" : prediction >= 65 ? "Хорошо 👍" : prediction >= 40 ? "Подтянуть 📚" : "Усиленная подготовка 💪";

    return {
      count: trialResults.length,
      avgScore,
      prediction,
      level,
      lastDate: new Date(recent[0].reviewed_at).toLocaleDateString("ru-RU")
    };
  }, [results]);

  // ✅ ОБНОВЛЁННЫЙ ГРАФИК: Объединяет обычные ДЗ и ежедневные задания в одну хронологическую ленту
  const scoreData = useMemo(() => {
    const hwData = results
      .filter(r => (r.homework_type === "regular" || !r.homework_type) && r.reviewed_at)
      .map((r: any) => ({
        ts: new Date(r.reviewed_at).getTime(),
        date: new Date(r.reviewed_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        балл: r.percentage || 0,
        type: "ДЗ"
      }));

    const dailyData = dailyAnswers
      .filter(a => a.created_at || a.date)
      .map((a: any) => ({
        ts: new Date(a.created_at || a.date).getTime(),
        date: new Date(a.created_at || a.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        балл: (a.score || 0) * 10, // Конвертируем 0/10 в 0/100 для графика
        type: "Ежедневное"
      }));

    // Объединяем, сортируем по времени и берём последние 15 активностей
    return [...hwData, ...dailyData]
      .sort((a, b) => a.ts - b.ts)
      .slice(-15)
      .map(({ ts, ...rest }) => rest); // Убираем timestamp, оставляем чистые данные для Recharts
  }, [results, dailyAnswers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const bgCard = darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-sky-100';
  const textPrimary = darkMode ? 'text-white' : 'text-stone-800';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-stone-500';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Основные метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "УРОКОВ", value: stats.totalLessons, sub: `${stats.completedLessons} проведено`, icon: "📅", color: "from-sky-500 to-blue-600" },
          { label: "ПОСЕЩ.", value: `${stats.attendance}%`, sub: "от всех", icon: "📊", color: "from-emerald-500 to-teal-500" },
          { label: "СРЕД. БАЛЛ", value: stats.avgScore, sub: "включая ежедневные", icon: "⭐", color: "from-amber-500 to-orange-500" },
          { label: "СДАЧА ДЗ", value: `${stats.completionRate}%`, sub: `${stats.doneHw} из ${stats.totalHw}`, icon: "✅", color: "from-pink-500 to-rose-500" },
        ].map((stat: any) => (
          <div key={stat.label} className={`${bgCard} backdrop-blur rounded-2xl p-4 border-2 text-center hover:scale-[1.02] transition-shadow shadow-sm hover:shadow-md`}>
            <span className="text-2xl block mb-1">{stat.icon}</span>
            <p className={`text-2xl font-black mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
            <p className={`text-[10px] ${textSecondary} font-bold uppercase tracking-wide`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* 2. Геймификация и ИИ-адаптация */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${bgCard} backdrop-blur rounded-2xl p-5 border-2 shadow-sm`}>
          <h3 className={`font-serif font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>🔥 Ежедневная активность</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {dailyStats.level}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className={textPrimary}>Уровень {dailyStats.level}</span>
                <span className="text-amber-500">{dailyStats.xp} / {dailyStats.xpForNextLevel} XP</span>
              </div>
              <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${(dailyStats.xpProgress / 100) * 100}%` }} 
                />
              </div>
            </div>
          </div>
          <div className={`p-3 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-orange-900/20 border border-orange-700/30' : 'bg-orange-50 border border-orange-200'}`}>
            <span className="text-3xl">🔥</span>
            <div>
              <p className={`text-sm font-bold ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Серия: {dailyStats.streak} дн.</p>
              <p className={`text-xs ${textSecondary}`}>Решай каждый день для множителя XP!</p>
            </div>
          </div>
        </div>

        <div className={`${bgCard} backdrop-blur rounded-2xl p-5 border-2 shadow-sm`}>
          <h3 className={`font-serif font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>🤖 Адаптация и слабые места</h3>
          
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <span className={`text-sm font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              Заданий сгенерировано ИИ под пробелы:
            </span>
            <span className="text-2xl font-black text-purple-600">{dailyStats.aiInterventions}</span>
          </div>

          {dailyStats.topWeakTopics.length > 0 ? (
            <div className="space-y-2">
              <p className={`text-xs font-bold uppercase tracking-wide ${textSecondary} mb-2`}>Темы в проработке:</p>
              {dailyStats.topWeakTopics.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className={`text-sm font-medium ${textPrimary}`}>{item.topic}</span>
                  <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                    {item.count} {item.count === 1 ? 'ошибка' : 'ошибки'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🌟</p>
              <p className={`text-sm font-medium ${textPrimary}`}>Красавчик! Критических пробелов нет.</p>
              <p className={`text-xs ${textSecondary}`}>ИИ пока не вмешивался в генерацию.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Прогноз ЕГЭ */}
      {trialStats && (
        <div className={`rounded-3xl p-5 border-2 shadow-sm ${darkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700' : 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-serif font-bold flex items-center gap-2 ${textPrimary}`}>🎯 Прогноз ЕГЭ (по пробникам)</h3>
            <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{trialStats.prediction}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3 text-center">
            <div>
              <p className={`text-xs ${textSecondary}`}>Последний</p>
              <p className={`font-bold ${textPrimary}`}>{trialStats.avgScore} / 100</p>
              <p className="text-[10px] text-gray-500">{trialStats.lastDate}</p>
            </div>
            <div>
              <p className={`text-xs ${textSecondary}`}>Средний</p>
              <p className={`font-bold ${textPrimary}`}>{trialStats.avgScore} / 100</p>
            </div>
            <div>
              <p className={`text-xs ${textSecondary}`}>Всего пробников</p>
              <p className={`font-bold ${textPrimary}`}>{trialStats.count}</p>
            </div>
          </div>
          <p className={`text-sm font-medium mb-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>{trialStats.level}</p>
          <div className={`w-full rounded-full h-3 overflow-hidden border ${darkMode ? 'bg-gray-700 border-purple-700/50' : 'bg-white/60 border-purple-200/50'}`}>
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${trialStats.prediction}%` }} />
          </div>
        </div>
      )}

      {/* 4. Динамика успеваемости (ОБЪЕДИНЕННАЯ) */}
      {scoreData.length > 0 ? (
        <div className={`${bgCard} backdrop-blur rounded-3xl p-5 border-2 shadow-sm`}>
          <h3 className={`font-serif font-bold mb-4 flex items-center gap-2 ${textPrimary}`}>📈 Динамика активности (ДЗ + Ежедневные)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={darkMode ? "#38bdf8" : "#0284c7"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={darkMode ? "#38bdf8" : "#0284c7"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "rgba(56, 189, 248, 0.1)" : "rgba(14, 165, 233, 0.1)"} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: darkMode ? '#38bdf8' : '#0369a1', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: darkMode ? '#38bdf8' : '#0369a1', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: darkMode ? '#1f2937' : 'white', border: `1px solid ${darkMode ? '#38bdf8' : '#0ea5e9'}`, borderRadius: '12px' }} 
                itemStyle={{ color: darkMode ? '#38bdf8' : '#0284c7', fontWeight: 'bold' }}
                // ✅ Показываем тип задания во всплывающей подсказке
                formatter={(value: any, name: any, props: any) => [
                  `${value} / 100`, 
                  props.payload.type === "Ежедневное" ? "Ежедневное задание" : "Домашнее задание"
                ]}
              />
              <Area type="monotone" dataKey="балл" stroke={darkMode ? "#38bdf8" : "#0284c7"} strokeWidth={3} fill="url(#colorScore)" activeDot={{ r: 6, fill: darkMode ? "#38bdf8" : "#0284c7", stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={`${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-white/60 border-sky-200'} backdrop-blur rounded-3xl p-8 border-2 border-dashed text-center`}>
          <p className="text-5xl mb-3 animate-pulse">📸</p>
          <p className={`${textPrimary} font-bold text-lg`}>Пока нет активностей для графика</p>
        </div>
      )}
    </div>
  );
}