"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Printer, MessageCircle, Calendar, CreditCard } from "lucide-react";

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

function ParentReportsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  
  const [profile, setProfile] = useState<any>(null);
  const [childId, setChildId] = useState<string>("");
  const [childProfile, setChildProfile] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [egePrediction, setEgePrediction] = useState<{ score: number; level: string } | null>(null);
  const [paidLessons, setPaidLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [remainingLessons, setRemainingLessons] = useState(0);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string>("");

  useEffect(() => {
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

  function loadChildData(cid: string) {
    getDoc(doc(db, "profiles", cid)).then((snap) => { 
      if (snap.exists()) {
        const data = snap.data();
        setChildProfile(data);
        setPaidLessons(data.paid_lessons || 0);
        setSubscriptionEndDate(data.subscription_end_date || "");
      }
    });
    
    // Занятия — сортировка по дате (новые сверху)
    onSnapshot(
      query(collection(db, "lessons"), where("student_id", "==", cid)),
      (snap) => {
        const lessonsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lessonsData.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        
        // Подсчёт статистики
        const completed = lessonsData.filter(l => l.status === "completed").length;
        setCompletedLessons(completed);
        setRemainingLessons(Math.max(0, (data.paid_lessons || 0) - completed));
        
        // Прогноз ЕГЭ
        if (lessonsData.length > 0) {
          const recent = lessonsData.slice(0, 3);
          const avg = Math.round(recent.reduce((sum, l) => sum + (l.score || 0), 0) / recent.length);
          const prediction = Math.min(100, Math.round(avg * 1.05));
          const level = prediction >= 85 ? "Отлично 🎉" : prediction >= 65 ? "Хорошо 👍" : prediction >= 40 ? "Нужно подтянуть 📚" : "Усиленная подготовка 💪";
          setEgePrediction({ score: prediction, level });
        }
        
        setLessons(lessonsData);
      }
    );
    
    // Домашки
    onSnapshot(
      query(collection(db, "homeworks"), where("student_id", "==", cid)),
      (snap) => {
        const homeworksData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        // График успеваемости
        const chart = homeworksData
          .filter(hw => hw.status === "done" && hw.score !== undefined)
          .map(hw => ({
            date: new Date(hw.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
            балл: Math.round((hw.score / hw.max_score) * 100)
          }))
          .slice(-10);
        setChartData(chart);
        
        setHomeworks(homeworksData);
      }
    );
  }

  const getHwForLesson = (lessonDate: string) => {
    const lessonStart = new Date(lessonDate);
    const lessonEnd = new Date(lessonStart.getTime() + 2 * 60 * 60 * 1000); // +2 часа
    return homeworks.filter((hw: any) => {
      const hwCreated = new Date(hw.created_at);
      return hwCreated >= lessonStart && hwCreated <= lessonEnd;
    });
  };

  const getLessonStatus = (status: string) => {
    switch (status) {
      case "completed": return { icon: "✅", label: "Проведено", color: "bg-emerald-100 text-emerald-700" };
      case "scheduled": return { icon: "📅", label: "Запланировано", color: "bg-amber-100 text-amber-700" };
      case "cancelled": return { icon: "❌", label: "Отменено", color: "bg-red-100 text-red-700" };
      default: return { icon: "❓", label: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  const formattedSubEndDate = subscriptionEndDate 
    ? new Date(subscriptionEndDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;
  
  const isSubscriptionEndingSoon = subscriptionEndDate 
    ? (new Date(subscriptionEndDate).getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000)
    : false;
  
  const isSubscriptionExpired = subscriptionEndDate 
    ? new Date(subscriptionEndDate) < new Date()
    : false;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">🌻</div>
        <p className="text-amber-700 font-serif italic">Загрузка отчёта...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative overflow-hidden print:bg-white">
      {/* Фоновые элементы Fearless */}
      <div className="fixed inset-0 pointer-events-none opacity-20 print:hidden">
        <div className="absolute top-10 left-10 text-8xl">🌻</div>
        <div className="absolute bottom-20 right-10 text-7xl">🎸</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">✨</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌾</div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Шапка */}
        <div className="flex items-center justify-between mb-6 print:mb-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🌻</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent">
                Отчёт о занятиях
              </h1>
              <p className="text-xs text-stone-500 font-serif italic mt-0.5">
                {childProfile?.full_name} • {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={printReport} className="p-2.5 bg-white/80 border-2 border-amber-200 rounded-xl hover:bg-amber-50 transition text-amber-700" title="Печать / PDF">
              <Printer size={20} />
            </button>
          </div>
        </div>

        {/* Блок абонемента */}
        <div className="bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 rounded-3xl p-5 border-2 border-amber-300 mb-6 print:border print:border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif font-bold text-amber-900 text-lg">Абонемент</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Оплачено занятий */}
            <div className="bg-white/70 rounded-2xl p-4 border border-amber-200">
              <p className="text-xs text-amber-700 uppercase tracking-wide font-medium mb-1">Оплачено</p>
              <p className="text-3xl font-bold text-amber-900">{paidLessons}</p>
              <p className="text-xs text-stone-500">занятий</p>
            </div>
            
            {/* Осталось занятий */}
            <div className="bg-white/70 rounded-2xl p-4 border border-amber-200">
              <p className="text-xs text-amber-700 uppercase tracking-wide font-medium mb-1">Осталось</p>
              <p className={`text-3xl font-bold ${remainingLessons <= 3 ? 'text-rose-600' : 'text-amber-900'}`}>
                {remainingLessons}
              </p>
              <p className="text-xs text-stone-500">занятий</p>
            </div>
            
            {/* Дата окончания */}
            <div className="bg-white/70 rounded-2xl p-4 border border-amber-200">
              <p className="text-xs text-amber-700 uppercase tracking-wide font-medium mb-1 flex items-center gap-1">
                <Calendar size={12} /> Действует до
              </p>
              <p className={`text-lg font-bold ${isSubscriptionExpired ? 'text-rose-600' : isSubscriptionEndingSoon ? 'text-amber-600' : 'text-amber-900'}`}>
                {formattedSubEndDate || "—"}
              </p>
              <p className="text-xs text-stone-500">
                {isSubscriptionExpired ? "Истёк" : isSubscriptionEndingSoon ? "Скоро закончится" : "Активен"}
              </p>
            </div>
          </div>
          
          {/* Кнопки действий */}
          <div className="flex flex-wrap gap-3 print:hidden">
            <Link 
              href="/pricing" 
              className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-yellow-700 transition shadow-md flex items-center justify-center gap-2"
            >
              <CreditCard size={16} /> Продлить абонемент
            </Link>
            {profile?.tutor_telegram && (
              <a 
                href={`https://t.me/${profile.tutor_telegram.replace('@', '')}?text=Здравствуйте!%20Хочу%20обсудить%20продление%20абонемента%20для%20${childProfile?.full_name}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 sm:flex-none px-5 py-3 bg-white border-2 border-amber-300 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-50 transition shadow-sm flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Написать репетитору
              </a>
            )}
          </div>
        </div>

        {/* Предупреждение: занятия заканчиваются */}
        {remainingLessons <= 5 && remainingLessons > 0 && !isSubscriptionExpired && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-3xl p-5 border-2 border-amber-300 mb-6 print:hidden shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-serif font-bold text-amber-900">Заканчиваются занятия</h3>
                <p className="text-sm text-amber-700">Осталось {remainingLessons} {remainingLessons === 1 ? 'занятие' : remainingLessons < 5 ? 'занятия' : 'занятий'} по абонементу</p>
              </div>
            </div>
          </div>
        )}

        {/* Предупреждение: абонемент истёк */}
        {isSubscriptionExpired && (
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-3xl p-5 border-2 border-rose-300 mb-6 print:hidden shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">❌</span>
              <div className="flex-1">
                <h3 className="font-serif font-bold text-rose-900">Абонемент истёк</h3>
                <p className="text-sm text-rose-700">Срок действия абонемента закончился {formattedSubEndDate}. Продлите для продолжения занятий.</p>
              </div>
            </div>
          </div>
        )}

        {/* Прогноз ЕГЭ */}
        {egePrediction && egePrediction.score > 0 && (
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-3xl p-5 border-2 border-amber-200 mb-6 print:border print:border-gray-200 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-serif font-bold text-stone-800 flex items-center gap-2">
                  <span>🎯</span> Прогноз ЕГЭ
                </h3>
                <p className="text-sm text-stone-600 mt-1">{egePrediction.level}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  {egePrediction.score}
                </p>
                <p className="text-xs text-stone-500">из 100 баллов</p>
              </div>
            </div>
            <div className="w-full bg-white/60 rounded-full h-3 mt-3 overflow-hidden border border-amber-200">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-3 rounded-full transition-all" style={{ width: `${egePrediction.score}%` }} />
            </div>
          </div>
        )}

        {/* График успеваемости */}
        {chartData.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-amber-200 mb-6 print:border print:border-gray-200 shadow-sm">
            <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span>📈</span> Динамика успеваемости
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245, 158, 11, 0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716c' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#78716c' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #f59e0b', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="балл" stroke="#f59e0b" strokeWidth={2} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Список занятий */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список занятий */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="font-semibold text-gray-700 mb-2 px-1">📅 История занятий</h3>
            {lessons.map((lesson: any) => {
              const status = getLessonStatus(lesson.status);
              const lessonHw = getHwForLesson(lesson.start_time);
              return (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson({ ...lesson, homeworks: lessonHw })}
                  className={`w-full text-left p-3 rounded-xl transition border-2 ${
                    selectedLesson?.id === lesson.id
                      ? "bg-white border-amber-400 shadow-md"
                      : "bg-white/60 border-transparent hover:border-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(lesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(lesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        {" • "}
                        {lesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                      {status.icon}
                    </span>
                  </div>
                  {lessonHw.length > 0 && (
                    <p className="text-xs text-amber-500 mt-1">📚 {lessonHw.length} заданий</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Детали занятия */}
          <div className="lg:col-span-2">
            {selectedLesson ? (
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-white space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {new Date(selectedLesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </h2>
                    <p className="text-gray-500">
                      {new Date(selectedLesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      {" • "}
                      {selectedLesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLessonStatus(selectedLesson.status).color}`}>
                    {getLessonStatus(selectedLesson.status).icon} {getLessonStatus(selectedLesson.status).label}
                  </span>
                </div>

                {/* Тема и заметки */}
                {selectedLesson.topic && (
                  <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-xs text-violet-500 font-medium mb-1">📝 Тема занятия</p>
                    <p className="text-sm text-gray-800">{selectedLesson.topic}</p>
                  </div>
                )}

                {selectedLesson.notes && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 font-medium mb-1">🗒️ Заметки репетитора</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedLesson.notes}</p>
                  </div>
                )}

                {/* Результаты */}
                {selectedLesson.score !== undefined && (
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-xs text-amber-600 font-medium mb-1">⭐ Результат</p>
                    <p className="text-2xl font-black text-amber-600">{selectedLesson.score} баллов</p>
                    {selectedLesson.max_score && (
                      <p className="text-sm text-gray-500">из {selectedLesson.max_score} возможных</p>
                    )}
                  </div>
                )}

                {/* Домашние задания */}
                {selectedLesson.homeworks && selectedLesson.homeworks.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-xs text-amber-600 font-medium mb-2">📚 Домашние задания</p>
                    <div className="space-y-2">
                      {selectedLesson.homeworks.map((hw: any) => (
                        <div key={hw.id} className="p-3 bg-white rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{hw.title || "Без названия"}</p>
                            <p className="text-xs text-gray-400">
                              {hw.status === "done" ? "✅ Сдано" : hw.status === "checked" ? "✔️ Проверено" : "⏳ Ожидает"}
                              {hw.score !== undefined && ` • ${hw.score} баллов`}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            hw.status === "done" ? "bg-blue-100 text-blue-700" :
                            hw.status === "checked" ? "bg-emerald-100 text-emerald-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {hw.status === "done" ? "Сдано" : hw.status === "checked" ? "Проверено" : "Не сдано"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ссылки */}
                {(selectedLesson.zoom_link || selectedLesson.board_link) && (
                  <div className="flex gap-2">
                    {selectedLesson.zoom_link && (
                      <a href={selectedLesson.zoom_link} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition">
                        🎥 Запись Zoom
                      </a>
                    )}
                    {selectedLesson.board_link && (
                      <a href={selectedLesson.board_link} target="_blank" rel="noopener noreferrer" className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition">
                        🖊️ Доска
                      </a>
                    )}
                  </div>
                )}

                {!selectedLesson.topic && !selectedLesson.notes && selectedLesson.status === "scheduled" && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-6xl mb-4">📅</p>
                    <p>Занятие ещё не проведено</p>
                    <p className="text-sm">Отчёт появится после занятия</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-16">
                  <p className="text-6xl mb-4">👈</p>
                  <p className="text-gray-400 text-lg">Выберите занятие слева</p>
                  <p className="text-gray-300 text-sm mt-1">чтобы увидеть отчёт</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Стили для печати */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          div { break-inside: avoid; page-break-inside: avoid; }
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

export default function ParentReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4 animate-pulse">🌻</div><p className="text-amber-700 font-serif italic">Загрузка отчёта...</p></div></div>}>
      <ParentReportsContent />
    </Suspense>
  );
}