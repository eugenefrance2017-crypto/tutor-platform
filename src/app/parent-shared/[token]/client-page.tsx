"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

export default function ParentSharedClientPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topicProgress, setTopicProgress] = useState<any[]>([]);
  const [tutorInfo, setTutorInfo] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [egePrediction, setEgePrediction] = useState<{ score: number; level: string } | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!token) return;
    
    async function loadData() {
      try {
        const linkSnap = await getDoc(doc(db, "parent_shared_links", token));
        if (!linkSnap.exists()) {
          setError("Ссылка недействительна");
          setLoading(false);
          return;
        }
        
        const linkData = linkSnap.data();
        
        // ✅ Проверка срока действия
        if (linkData.expires_at) {
          const expiresAt = new Date(linkData.expires_at);
          if (expiresAt < new Date()) {
            setError("Срок действия ссылки истёк");
            setLoading(false);
            return;
          }
        }
        
        const childId = linkData.child_id;
        
        const [childSnap, lessonsSnap, homeworksSnap, submissionsSnap, trialsSnap] = await Promise.all([
          getDoc(doc(db, "profiles", childId)),
          getDocs(query(collection(db, "lessons"), where("student_id", "==", childId))),
          getDocs(query(collection(db, "homeworks"), where("student_id", "==", childId))),
          getDocs(query(collection(db, "submissions"), where("student_id", "==", childId))),
          getDocs(query(collection(db, "exam_trials"), where("student_id", "==", childId))).catch(() => ({ docs: [] })),
        ]);
        
        if (!childSnap.exists()) {
          setError("Ученик не найден");
          setLoading(false);
          return;
        }
        
        const lessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const homeworks = homeworksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const trials = trialsSnap.docs?.map(d => ({ id: d.id, ...d.data() })) || [];
        
        lessons.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        
        // ✅ Загрузка информации о репетиторе
        if (lessons.length > 0 && lessons[0].tutor_id) {
          const tutorSnap = await getDoc(doc(db, "profiles", lessons[0].tutor_id));
          if (tutorSnap.exists()) setTutorInfo(tutorSnap.data());
        }
        
        // ✅ График успеваемости (по дате выполнения, а не deadline)
        const chart = submissions
          .filter(s => s.score !== undefined && s.submitted_at)
          .sort((a, b) => new Date(a.submitted_at?.seconds ? a.submitted_at.seconds * 1000 : 0).getTime() - new Date(b.submitted_at?.seconds ? b.submitted_at.seconds * 1000 : 0).getTime())
          .slice(-10)
          .map(s => {
            const hw = homeworks.find(h => h.id === s.homework_id);
            const percent = hw?.max_score ? Math.round((s.score / hw.max_score) * 100) : 0;
            const date = s.submitted_at?.seconds
              ? new Date(s.submitted_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
              : "—";
            return { date, балл: percent };
          })
          .filter(d => d.date !== "—");
        setChartData(chart);
        
        // ✅ Прогресс по темам
        const topicStats: Record<string, { correct: number; total: number }> = {};
        submissions.forEach(sub => {
          const hw = homeworks.find(h => h.id === sub.homework_id);
          if (!hw?.topic) return;
          if (!topicStats[hw.topic]) topicStats[hw.topic] = { correct: 0, total: 0 };
          topicStats[hw.topic].total++;
          if (sub.score && hw.max_score && sub.score >= hw.max_score * 0.8) {
            topicStats[hw.topic].correct++;
          }
        });
        const topics = Object.entries(topicStats)
          .map(([name, stats]) => ({
            name,
            percent: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            total: stats.total,
          }))
          .sort((a, b) => b.percent - a.percent)
          .slice(0, 5);
        setTopicProgress(topics);
        
        // ✅ AI-инсайты
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter(l => l.status === "completed").length;
        const totalHw = homeworks.length;
        const doneHw = homeworks.filter(h => h.status === "done").length;
        const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
        
        const insights: string[] = [];
        if (attendance >= 90) insights.push("✅ Отличная посещаемость — " + attendance + "%");
        else if (attendance < 70 && totalLessons > 0) insights.push("⚠️ Посещаемость ниже нормы — " + attendance + "%");
        if (hwRate >= 80) insights.push("📚 Ответственный подход к ДЗ — " + hwRate + "%");
        else if (hwRate < 50 && totalHw > 0) insights.push("📖 Стоит уделить внимание домашним заданиям");
        if (chart.length >= 3) {
          const recent = chart.slice(-3);
          const older = chart.slice(0, -3);
          if (older.length > 0) {
            const recentAvg = recent.reduce((s, d) => s + d.балл, 0) / recent.length;
            const olderAvg = older.reduce((s, d) => s + d.балл, 0) / older.length;
            if (recentAvg > olderAvg + 10) insights.push("📈 Видна положительная динамика!");
            else if (recentAvg < olderAvg - 10) insights.push("📉 Стоит обратить внимание на прогресс");
          }
        }
        setAiInsights(insights);
        
        // ✅ Прогноз ЕГЭ
        if (trials.length > 0) {
          const recent = trials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
          const avg = Math.round(recent.reduce((s, t) => s + (t.test_score || 0), 0) / recent.length);
          const prediction = Math.min(100, Math.round(avg * 1.05));
          const level = prediction >= 85 ? "Отлично 🎉" : prediction >= 65 ? "Хорошо 👍" : prediction >= 40 ? "Нужно подтянуть 📚" : "Усиленная подготовка 💪";
          setEgePrediction({ score: prediction, level });
        }
        
        setData({ child: childSnap.data(), lessons, homeworks, submissions, trials });
        setLoading(false);
      } catch (error) {
        console.error(error);
        setError("Ошибка загрузки данных");
        setLoading(false);
      }
    }
    
    loadData();
  }, [token]);

  // Печать отчёта
  function printReport() {
    window.print();
  }

  // Экспорт в PDF (через печать)
  function exportPDF() {
    window.print();
  }

  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">💕</div>
          <p className="text-pink-600 font-serif italic">Загрузка отчёта...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-8 text-center border-2 border-pink-200 max-w-md">
          <p className="text-6xl mb-4">💔</p>
          <h2 className="text-xl font-serif font-bold text-stone-800 mb-2">Отчёт недоступен</h2>
          <p className="text-stone-600 text-sm">{error || "Ссылка недействительна"}</p>
          <p className="text-stone-500 text-xs mt-2 font-serif italic">
            "All's well that ends well" 💕
          </p>
          <Link href="/" className="inline-block mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 transition shadow-md">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = data.lessons.length;
  const completedLessons = data.lessons.filter((l: any) => l.status === "completed").length;
  const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const totalHw = data.homeworks.length;
  const doneHw = data.homeworks.filter((h: any) => h.status === "done").length;
  const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
  const paidLessons = data.child?.paid_lessons || 0;
  const remainingLessons = Math.max(0, paidLessons - completedLessons);
  const upcomingLessons = data.lessons.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > new Date()).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pendingHw = data.homeworks.filter((h: any) => h.status === "active");
  const avgScore = data.submissions.length > 0 
    ? Math.round(data.submissions.reduce((sum: number, s: any) => {
        const hw = data.homeworks.find((h: any) => h.id === s.homework_id);
        return sum + (hw?.max_score ? (s.score / hw.max_score) * 10 : 0);
      }, 0) / data.submissions.length * 10) / 10
    : 0;

  const achievements = [];
  if (completedLessons >= 1) achievements.push({ icon: "🎓", title: "Первое занятие" });
  if (completedLessons >= 5) achievements.push({ icon: "🔥", title: "5 занятий" });
  if (completedLessons >= 10) achievements.push({ icon: "⭐", title: "10 занятий" });
  if (doneHw >= 1) achievements.push({ icon: "📝", title: "Первое ДЗ" });
  if (doneHw >= 5) achievements.push({ icon: "🌟", title: "5 заданий" });
  if (attendance >= 90) achievements.push({ icon: "💯", title: "Отличная посещаемость" });
  if (hwRate >= 80) achievements.push({ icon: "👑", title: "Мастер ДЗ" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 relative overflow-hidden print:bg-white">
      {/* Фоновые элементы Lover */}
      <div className="fixed inset-0 pointer-events-none opacity-20 print:hidden">
        <div className="absolute top-10 left-10 text-8xl">💕</div>
        <div className="absolute bottom-20 right-10 text-7xl">🌸</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">💝</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌷</div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Шапка с кнопками действий */}
        <div className="flex items-center justify-between mb-6 print:mb-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💕</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                Отчёт об успеваемости
              </h1>
              <p className="text-xs text-stone-500 font-serif italic mt-0.5">
                {data.child?.full_name} • {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={printReport} className="p-2 bg-white/80 border-2 border-pink-200 rounded-xl hover:bg-white transition" title="Печать">
              🖨️
            </button>
            <button onClick={exportPDF} className="p-2 bg-white/80 border-2 border-pink-200 rounded-xl hover:bg-white transition" title="Экспорт PDF">
              📄
            </button>
          </div>
        </div>

        {/* Информация о репетиторе */}
        {tutorInfo && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {(tutorInfo.full_name || "Р")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Репетитор</p>
                  <p className="font-serif font-bold text-stone-800">{tutorInfo.full_name || "Репетитор"}</p>
                  {tutorInfo.subjects && <p className="text-xs text-stone-500">{tutorInfo.subjects}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                {tutorInfo.telegram && (
                  <a href={`https://t.me/${tutorInfo.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs font-medium text-blue-700 hover:bg-blue-100 transition print:hidden">
                    💬 Telegram
                  </a>
                )}
                {tutorInfo.whatsapp && (
                  <a href={`https://wa.me/${tutorInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-50 border-2 border-green-200 rounded-xl text-xs font-medium text-green-700 hover:bg-green-100 transition print:hidden">
                    📱 WhatsApp
                  </a>
                )}
                {tutorInfo.email && (
                  <a href={`mailto:${tutorInfo.email}`} className="px-3 py-1.5 bg-rose-50 border-2 border-rose-200 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-100 transition print:hidden">
                    📧 Email
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI-инсайты */}
        {aiInsights.length > 0 && (
          <div className="bg-gradient-to-br from-pink-100 via-rose-100 to-amber-100 rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <h3 className="font-serif font-bold text-stone-800 mb-3 flex items-center gap-2">
              <span>🤖</span> AI-аналитика
            </h3>
            <div className="space-y-2">
              {aiInsights.map((insight, i) => (
                <div key={i} className="bg-white/60 rounded-xl p-3 text-sm text-stone-700">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Прогноз ЕГЭ */}
        {egePrediction && (
          <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-serif font-bold text-stone-800 flex items-center gap-2">
                  <span>🎯</span> Прогноз ЕГЭ
                </h3>
                <p className="text-sm text-stone-600 mt-1">{egePrediction.level}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                  {egePrediction.score}
                </p>
                <p className="text-xs text-stone-500">из 100 баллов</p>
              </div>
            </div>
            <div className="w-full bg-white/60 rounded-full h-3 mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-3 rounded-full transition-all" style={{ width: `${egePrediction.score}%` }} />
            </div>
          </div>
        )}

        {/* Достижения */}
        {achievements.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <h3 className="font-serif font-bold text-stone-800 mb-3 flex items-center gap-2">
              <span>🏆</span> Достижения
            </h3>
            <div className="flex flex-wrap gap-2">
              {achievements.map((ach, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-50 to-rose-50 rounded-full border border-pink-200">
                  <span className="text-base">{ach.icon}</span>
                  <span className="text-xs text-pink-700 font-medium">{ach.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Посещаемость", value: attendance + "%", sub: `${completedLessons}/${totalLessons}`, icon: "✅", gradient: "from-emerald-400 to-teal-500" },
            { label: "Сдано ДЗ", value: hwRate + "%", sub: `${doneHw}/${totalHw}`, icon: "📚", gradient: "from-amber-400 to-orange-500" },
            { label: "Осталось", value: remainingLessons, sub: "занятий", icon: "💰", gradient: "from-sky-400 to-blue-500" },
            { label: "Уровень", value: data.child?.level || 1, sub: `${data.child?.xp || 0} XP`, icon: "⭐", gradient: "from-yellow-400 to-amber-500" },
            { label: "Средний балл", value: avgScore, sub: "из 10", icon: "🎯", gradient: "from-rose-400 to-pink-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 border-2 border-pink-100 text-center hover:scale-[1.02] transition print:border print:border-gray-200">
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</p>
              <p className="text-xs text-stone-500">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* График успеваемости */}
        {chartData.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span>📈</span> Динамика успеваемости
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 72, 153, 0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716c' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#78716c' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #ec4899', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="балл" stroke="#ec4899" strokeWidth={2} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Прогресс по темам */}
        {topicProgress.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span>🎯</span> Прогресс по темам
            </h3>
            <div className="space-y-3">
              {topicProgress.map((topic, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-700 font-medium truncate">{topic.name}</span>
                    <span className={`font-bold ${topic.percent >= 70 ? 'text-emerald-600' : topic.percent >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {topic.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-pink-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        topic.percent >= 70 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                        topic.percent >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                        'bg-gradient-to-r from-rose-400 to-pink-500'
                      }`}
                      style={{ width: `${topic.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Пополнение абонемента */}
        {remainingLessons <= 5 && remainingLessons > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-5 border-2 border-amber-200 mb-6 print:hidden">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-serif font-bold text-amber-800">⚠️ Заканчиваются занятия</h3>
                <p className="text-sm text-amber-600">Осталось {remainingLessons} занятий по абонементу</p>
              </div>
              {tutorInfo?.telegram && (
                <a href={`https://t.me/${tutorInfo.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-orange-600 transition shadow-md">
                  💬 Написать репетитору
                </a>
              )}
            </div>
          </div>
        )}

        {remainingLessons <= 0 && paidLessons > 0 && (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-3xl p-5 border-2 border-rose-200 mb-6 print:hidden">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-serif font-bold text-rose-800">❌ Занятия закончились</h3>
                <p className="text-sm text-rose-600">Свяжитесь с репетитором для пополнения</p>
              </div>
              {tutorInfo?.telegram && (
                <a href={`https://t.me/${tutorInfo.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:from-rose-600 hover:to-pink-600 transition shadow-md">
                  💬 Написать репетитору
                </a>
              )}
            </div>
          </div>
        )}

        {/* Ближайшее занятие */}
        {upcomingLessons.length > 0 && (
          <div className="bg-gradient-to-r from-pink-100 to-rose-100 rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
            <h3 className="font-serif font-bold text-stone-800 mb-3 flex items-center gap-2">
              <span>📅</span> Ближайшее занятие
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-serif font-bold text-stone-800">
                  {new Date(upcomingLessons[0].start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                </p>
                <p className="text-sm text-stone-600">
                  {new Date(upcomingLessons[0].start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  {" • "}
                  {upcomingLessons[0].subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                </p>
              </div>
              {upcomingLessons[0].zoom_link && (
                <a href={upcomingLessons[0].zoom_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-bold hover:from-pink-600 hover:to-rose-600 transition shadow-md print:hidden">
                  🎥 Присоединиться
                </a>
              )}
            </div>
          </div>
        )}

        {/* Домашние задания */}
        <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-pink-200 mb-6 print:border print:border-gray-200">
          <h3 className="font-serif font-bold text-stone-800 mb-3 flex items-center gap-2">
            <span>📚</span> Домашние задания
          </h3>
          {pendingHw.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-600 font-medium">⚠️ Не выполнено: {pendingHw.length}</p>
              {pendingHw.slice(0, 5).map((hw: any) => (
                <div key={hw.id} className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl flex items-center justify-between border border-amber-200">
                  <div>
                    <p className="font-medium text-sm text-stone-800">{hw.title || "Без названия"}</p>
                    <p className="text-xs text-stone-500">
                      {hw.deadline ? `Срок: ${new Date(hw.deadline).toLocaleDateString("ru-RU")}` : "Без срока"}
                      {hw.topic && ` • ${hw.topic}`}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded-full font-medium">Не сдано</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-stone-500 text-sm">Все задания выполнены ✅</p>
            </div>
          )}
          <div className="flex justify-between mt-3 text-sm text-stone-500 pt-3 border-t border-pink-100">
            <span>Сдано: {doneHw} из {totalHw}</span>
            <span className="font-bold">{hwRate}%</span>
          </div>
        </div>

        {/* История занятий */}
        <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-pink-200 print:border print:border-gray-200">
          <h3 className="font-serif font-bold text-stone-800 mb-3 flex items-center gap-2">
            <span>📅</span> История занятий
          </h3>
          {data.lessons.length > 0 ? (
            <div className="space-y-2">
              {data.lessons.slice(0, 10).map((l: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100">
                  <div className="flex items-center gap-2">
                    <span>{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                    <span className="text-sm font-medium text-stone-800">
                      {new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    l.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                    l.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    "bg-rose-100 text-rose-700"
                  }`}>
                    {l.status === "scheduled" ? "Запланировано" : l.status === "completed" ? "Проведено" : "Отменено"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-stone-500 text-sm">Нет занятий</p>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="text-center py-8">
          <p className="text-pink-400/60 text-xs font-serif italic">
            "And they say all's well that ends well" 💕
          </p>
          <p className="text-stone-400 text-xs mt-2">© 2026 Jenyawisch</p>
        </div>
      </div>

      {/* Стили для печати */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}