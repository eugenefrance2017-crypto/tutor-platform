// ФАЙЛ: app/students/page.tsx
// НОВАЯ ПРАВКА (сверх предыдущих): устранена гонка между восстановлением
// Firebase Auth сессии и первым запросом к Firestore — именно она вызывала
// "FirebaseError: Missing or insufficient permissions" при загрузке списка
// учеников, хотя профиль репетитора был полностью корректен (role: "tutor").
//
// Что изменилось конкретно:
// 1. uid больше не читается синхронно из localStorage при первом рендере.
//    Вместо этого используется хук useFirebaseUid (см. отдельный файл
//    hooks/useFirebaseUid.ts), который подписывается на onAuthStateChanged
//    и отдаёт uid только после того, как Firebase Auth реально подтвердит
//    сессию на клиенте.
// 2. Все Firestore-подписки (список учеников, профиль, занятия, ДЗ,
//    сдачи, баланс) стартуют только когда authReady === true. Пока идёт
//    ожидание — показывается индикатор загрузки, а не пустой список
//    "НЕТ УЧЕНИКОВ", который раньше вводил в заблуждение (выглядело так,
//    будто учеников нет, хотя на самом деле запрос ещё не имел права
//    выполниться).
// 3. Если authReady === true, но пользователь всё равно не залогинен
//    (authUser === null) — показывается явное сообщение "не авторизован"
//    с ссылкой на страницу входа, а не мнимое "нет учеников".

"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StudentAnalytics from "./StudentAnalytics";
import AuthGuard from "@/components/AuthGuard";
import { useFirebaseUid } from "@/hooks/useFirebaseUid"; // ✅ НОВОЕ

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

const AVATARS = [
  "from-sky-400 to-blue-600",
  "from-pink-400 to-rose-500",
  "from-cyan-400 to-teal-500",
  "from-blue-500 to-indigo-600",
  "from-fuchsia-400 to-purple-600",
  "from-orange-400 to-red-500",
];

function StudentsContent() {
  // ✅ ИЗМЕНЕНО: uid больше не берётся синхронно из localStorage/searchParams.
  // authReady === true означает, что Firebase Auth уже проверил сессию
  // (успешно или нет) — до этого момента никакие Firestore-запросы не идут.
  const { uid, authReady } = useFirebaseUid(app);

  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [studentHomeworks, setStudentHomeworks] = useState<any[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);

  const [studentBalance, setStudentBalance] = useState<number>(0);

  const [editingParent, setEditingParent] = useState(false);
  const [editParentEmail, setEditParentEmail] = useState("");

  const [activeTab, setActiveTab] = useState<"stats" | "analytics" | "trials">("stats");
  const [chartData, setChartData] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  // ✅ ИЗМЕНЕНО: запрос списка учеников ждёт authReady, а не стартует по
  // localStorage.uid сразу при монтировании компонента.
  useEffect(() => {
    if (!authReady) return;      // Firebase Auth ещё не проверил сессию — ждём
    if (!uid) {                  // Auth проверил — пользователь не залогинен
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    const q = query(collection(db, "profiles"), where("role", "==", "student"));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingStudents(false);
    }, (error) => {
      console.error("Ошибка загрузки учеников:", error);
      setLoadingStudents(false);
      toast.error("Не удалось загрузить учеников — проверьте авторизацию");
    });
    return () => unsub();
  }, [uid, authReady]);

  useEffect(() => {
    if (!selected) {
      setStudentProfile(null);
      setEditingParent(false);
      setAiReport(null);
      setStudentBalance(0);
      return;
    }

    getDoc(doc(db, "profiles", selected.id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStudentProfile(data);
        setEditParentEmail(data.parent_email || "");
      }
    });

    // ✅ ДИАГНОСТИКА: именованные обработчики ошибок — покажут в консоли,
    // какая именно коллекция падает с permission-denied
    const unsubBalance = onSnapshot(
      doc(db, "lesson_balances", selected.id),
      (snap) => {
        setStudentBalance(snap.exists() ? (snap.data().remaining || 0) : 0);
      },
      (error) => console.error("🔴 [lesson_balances] permission error for student", selected.id, ":", error.message)
    );

    const unsubLessons = onSnapshot(
      query(collection(db, "lessons"), where("student_id", "==", selected.id)),
      (snap) => setStudentLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error("🔴 [lessons] permission error for student", selected.id, ":", error.message)
    );
    const unsubHw = onSnapshot(
      query(collection(db, "homeworks"), where("assigned_students", "array-contains", selected.id)),
      (snap) => setStudentHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error("🔴 [homeworks] permission error for student", selected.id, ":", error.message)
    );
    const unsubSub = onSnapshot(
      query(collection(db, "submissions"), where("student_id", "==", selected.id)),
      (snap) => setStudentSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error("🔴 [submissions] permission error for student", selected.id, ":", error.message)
    );

    return () => { unsubLessons(); unsubHw(); unsubSub(); unsubBalance(); };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const hwSubmissions = studentSubmissions.filter((s: any) => s.score !== undefined && s.homework_id && s.status === 'approved');
    const data = hwSubmissions.slice(-10).map((s: any) => {
      const hw = studentHomeworks.find((h: any) => h.id === s.homework_id);
      const percent = hw?.max_score ? Math.round((s.score / hw.max_score) * 100) : 0;
      const date = s.submitted_at?.seconds
        ? new Date(s.submitted_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
        : new Date(s.submitted_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      return { date, балл: percent };
    }).filter((d: any) => d.date !== "—");
    setChartData(data);
  }, [selected, studentSubmissions, studentHomeworks]);

  const nextLesson = useMemo(() => {
    const now = Date.now();
    return studentLessons
      .filter((l: any) => l.status === "scheduled" && new Date(l.start_time).getTime() >= now)
      .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null;
  }, [studentLessons]);

  const filteredStudents = useMemo(() => {
    let filtered = [...students];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s: any) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
    }
    filtered.sort((a: any, b: any) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
      return 0;
    });
    return filtered;
  }, [students, searchQuery, sortBy]);

  function generateFeedbackTemplate(type: "praise" | "reminder" | "report") {
    if (!selected) return "";
    const name = selected.full_name.split(" ")[0];
    if (type === "praise") return `Привет, ${name}! 👋\n\nХочу похвалить тебя за отличную работу на последних занятиях! Видно, что ты стараешься, и это даёт результат. Так держать! 🚀\n\nЕсли есть вопросы по материалу — пиши, я всегда на связи.`;
    if (type === "reminder") return `Привет, ${name}! \n\nНапоминаю про домашнее задание. Очень важно выполнить его до следующего урока, чтобы мы могли двигаться дальше без пробелов.\n\nЕсли нужна помощь или что-то непонятно — смело пиши! 📚`;
    if (type === "report") return `Здравствуйте! Это краткий отчёт по успехам ${name}.\n\n✅ Посещаемость: отличная\n✅ Домашние задания: выполняются вовремя\n📈 Прогресс: уверенный рост\n\nМы движемся точно к цели! На следующем занятии разберём новые важные темы. Хорошего дня! 🌻`;
    return "";
  }

  async function sendTelegramFeedback() {
    if (!selected || !feedbackMessage.trim()) return;
    if (!studentProfile?.telegram_chat_id) {
      toast.error("⚠️ Ученик ещё не привязал Telegram! Попросите его сделать это в настройках профиля.");
      return;
    }
    setIsSendingFeedback(true);
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackMessage, targetChatId: studentProfile.telegram_chat_id }),
      });
      if (!response.ok) throw new Error("Ошибка сети");
      toast.success(`✅ Сообщение отправлено ${selected.full_name}!`);
      setShowFeedbackModal(false);
      setFeedbackMessage("");
    } catch (error) {
      console.error(error);
      toast.error("❌ Не удалось отправить сообщение.");
    } finally {
      setIsSendingFeedback(false);
    }
  }

  async function generateAIReport() {
    if (!selected) return;
    setGeneratingReport(true);
    setTimeout(() => {
      const total = studentLessons.length;
      const completed = studentLessons.filter((l: any) => l.status === "completed").length;
      const totalHw = studentHomeworks.length;
      const doneHw = studentSubmissions.filter((s: any) => s.status === "approved").length;
      const attendance = total > 0 ? Math.round((completed / total) * 100) : 0;
      const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;

      const report = `🗽 **AI Отчёт: ${selected.full_name}**\n\n📊 **Статистика:**\n• Занятий проведено: ${completed}/${total}\n• ДЗ проверено: ${doneHw}/${totalHw}\n• Посещаемость: ${attendance}%\n• Сдача ДЗ: ${hwRate}%\n\n📈 **Прогресс:**\n${attendance >= 80 ? '✨ Отличная посещаемость!' : '⚠️ Стоит улучшить посещаемость'}\n${hwRate >= 80 ? '📚 Ответственный подход к ДЗ!' : '📖 Нужно больше внимания ДЗ'}`;
      setAiReport(report);
      setGeneratingReport(false);
    }, 1500);
  }

  async function generateShareLinkForStudent(studentId: string, studentName: string) {
    try {
      const docRef = await addDoc(collection(db, "parent_shared_links"), {
        child_id: studentId,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const link = `${window.location.origin}/parent-shared/${docRef.id}`;
      await navigator.clipboard.writeText(link);
      toast.success(`🔗 Ссылка для ${studentName} скопирована!`);
    } catch (error) {
      toast.error("Ошибка создания ссылки");
    }
  }

  async function saveParent() {
    if (!selected) return;
    try {
      await updateDoc(doc(db, "profiles", selected.id), {
        parent_email: editParentEmail.trim(),
      });
      toast.success("✨ Email родителя сохранён!");
      const snap = await getDoc(doc(db, "profiles", selected.id));
      if (snap.exists()) setStudentProfile(snap.data());
      setEditingParent(false);
    } catch (error: any) {
      toast.error("Ошибка сохранения: " + error.message);
    }
  }

  function exportStudentData() {
    if (!selected) return;
    const data = { student: selected, lessons: studentLessons, homeworks: studentHomeworks, submissions: studentSubmissions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_${selected.full_name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 Данные экспортированы!");
  }

  const totalLessons = studentLessons.length;
  const completedLessons = studentLessons.filter((l: any) => l.status === "completed").length;
  const totalHw = studentHomeworks.length;
  const doneHw = studentSubmissions.filter((s: any) => s.status === "approved").length;
  const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📸</div>
          <p className="text-[#0257b0] font-black tracking-widest">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center bg-white/90 rounded-2xl p-8 border-2 border-[#7dd3fc] shadow-lg">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-[#0257b0] text-lg font-black tracking-widest mb-2">Не авторизован</p>
          <p className="text-[#0284c7] text-sm mb-4">Сессия истекла или вы ещё не входили в аккаунт</p>
          <Link href="/auth" className="inline-block px-5 py-2.5 text-white rounded-lg font-bold tracking-wide" style={{ background: "linear-gradient(90deg,#0ea5ff,#1d4ed8)" }}>
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-8xl">🗽</div>
        <div className="absolute bottom-20 right-10 text-7xl">📸</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">🎵</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌊</div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">📸</span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-sm" style={{ color: "#0257b0" }}>Ученики</h1>
            <span className="text-4xl">🗽</span>
          </div>
          <p className="text-sky-600/70 font-serif italic text-sm">"Welcome to New York, it's been waiting for you" 🗽</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl p-4 border-2 border-sky-200 shadow-sm space-y-3">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Поиск..." className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-xs bg-white focus:border-sky-500 focus:outline-none font-medium">
                <option value="name">По имени</option>
                <option value="date">По дате</option>
              </select>
            </div>

            {loadingStudents ? (
              <div className="text-center py-12 bg-white/80 rounded-xl border-2 border-sky-200">
                <div className="animate-spin text-4xl mb-3">⏳</div>
                <p className="text-sky-700 font-bold uppercase tracking-wide">Загрузка...</p>
              </div>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((s: any, idx: number) => (
                <div key={s.id} className="relative group">
                  <button onClick={() => { setSelected(s); setActiveTab("stats"); setAiReport(null); }} className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${selected?.id === s.id ? "bg-white shadow-lg scale-[1.02] ring-2 ring-sky-400 border-2 border-sky-400" : "bg-white/80 hover:bg-white hover:shadow-md hover:scale-[1.01] border-2 border-sky-100 hover:border-sky-300"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${AVATARS[idx % AVATARS.length]} shadow-md ring-2 ring-white`}>
                        {(s.full_name || "У")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 uppercase tracking-wide text-sm">{s.full_name}</p>
                        <p className="text-xs text-sky-600 font-medium">{s.email}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); generateShareLinkForStudent(s.id, s.full_name || "Ученик"); }} className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition" title="Ссылка">🔗</button>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white/80 rounded-xl border-2 border-sky-200">
                <p className="text-5xl mb-3">🔍</p>
                <p className="text-sky-700 font-bold uppercase tracking-wide">{searchQuery ? "Не найдено" : "Нет учеников"}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-5">
                <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.9)", border: "2px solid #7dd3fc", boxShadow: "0 4px 14px rgba(2,132,199,0.15)" }}>
                  <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black bg-gradient-to-br ${AVATARS[students.findIndex((x: any) => x.id === selected.id) % AVATARS.length]} shadow-lg`} style={{ background: "linear-gradient(135deg,#0ea5ff,#1d4ed8)" }}>
                      {(selected.full_name || "У")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-black tracking-tight" style={{ color: "#0f172a" }}>{selected.full_name}</h2>
                      <p className="text-sm font-semibold" style={{ color: "#0284c7" }}>{selected.email}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => generateShareLinkForStudent(selected.id, selected.full_name)} className="px-3 py-2 rounded-lg text-xs font-bold transition" style={{ background: "#dbeeff", color: "#0257b0" }}>🔗 Ссылка</button>
                      <button onClick={exportStudentData} className="px-3 py-2 rounded-lg text-xs font-bold transition" style={{ background: "#dbeeff", color: "#0257b0" }}>📥 Экспорт</button>
                      <button onClick={generateAIReport} disabled={generatingReport} className="px-3 py-2 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md" style={{ background: "linear-gradient(90deg,#0ea5ff,#1d4ed8)" }}>
                        {generatingReport ? "⏳" : "🤖"} AI
                      </button>
                      <button onClick={() => { setShowFeedbackModal(true); setFeedbackMessage(generateFeedbackTemplate("praise")); }} className="px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1" style={{ background: "#d1fae5", color: "#047857" }}>💬 Telegram</button>
                    </div>
                  </div>

                  {aiReport && (
                    <div className="mt-4 rounded-xl p-4 relative z-10" style={{ background: "rgba(224,246,255,0.7)", border: "2px solid #7dd3fc" }}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-black text-sm" style={{ color: "#1e3a5f" }}>🤖 AI-аналитика</h3>
                        <button onClick={() => setAiReport(null)} className="text-xs font-bold" style={{ color: "#0ea5ff" }}>✕</button>
                      </div>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{aiReport}</pre>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="rounded-xl p-4" style={{ background: "rgba(224,246,255,0.7)", border: "2px solid #7dd3fc" }}>
                      <p className="text-xs font-bold mb-3" style={{ color: "#1e3a5f" }}>📅 Ближайшее занятие</p>
                      {nextLesson ? (
                        <>
                          <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #7dd3fc" }}>
                            <p className="text-sm font-bold" style={{ color: "#0f172a" }}>
                              {new Date(nextLesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "#0284c7" }}>
                              {new Date(nextLesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <Link href={`/schedule?lesson=${nextLesson.id}`} className="text-xs font-extrabold mt-2 inline-block" style={{ color: "#0ea5ff" }}>
                            В расписание →
                          </Link>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500">Занятие не запланировано</p>
                          <Link href={`/schedule?student=${selected.id}`} className="text-xs font-extrabold mt-2 inline-block" style={{ color: "#0ea5ff" }}>
                            Запланировать →
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="rounded-xl p-4" style={{ background: "rgba(224,246,255,0.7)", border: "2px solid #7dd3fc" }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold" style={{ color: "#1e3a5f" }}>👨‍👩‍👧 Родитель</p>
                        {!editingParent ? (
                          <button onClick={() => setEditingParent(true)} className="text-xs font-extrabold" style={{ color: "#0ea5ff" }}>Email</button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={saveParent} className="text-xs font-extrabold text-emerald-600">Сохранить</button>
                            <button onClick={() => setEditingParent(false)} className="text-xs font-bold text-slate-500">Отмена</button>
                          </div>
                        )}
                      </div>
                      {editingParent ? (
                        <div>
                          <label className="text-xs font-bold text-slate-600">Email родителя</label>
                          <input value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} placeholder="parent@email.com" className="w-full border-2 rounded-lg p-2 text-xs mt-1 bg-white focus:outline-none" style={{ borderColor: "#7dd3fc" }} />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs" style={{ color: "#334155" }}>Email: {studentProfile?.parent_email ? <span className="font-bold" style={{ color: "#0257b0" }}>{studentProfile.parent_email}</span> : "Не привязан"}</p>
                          <p className="text-xs" style={{ color: "#334155" }}>
                            Осталось: <b style={{ color: studentBalance > 0 ? "#0257b0" : "#e11d48" }}>{studentBalance}</b> занятий
                          </p>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#fecdd3" }}>
                            <div
                              className="h-full transition-all duration-500"
                              style={{ width: studentBalance <= 0 ? "100%" : "60%", background: studentBalance <= 0 ? "linear-gradient(90deg,#f43f5e,#e11d48)" : "linear-gradient(90deg,#0ea5ff,#1d4ed8)" }}
                            />
                          </div>
                          {studentBalance <= 0 && (
                            <p className="text-xs font-bold" style={{ color: "#e11d48" }}>⚠ Занятия закончились</p>
                          )}
                          <Link href={`/finance?tab=stats&studentId=${selected.id}`} className="text-xs font-extrabold inline-block mt-1" style={{ color: "#0ea5ff" }}>
                            Пополнить / история →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      {[
                        { key: "stats", label: "📸 Статистика" },
                        { key: "analytics", label: "📈 Аналитика" },
                        { key: "trials", label: "🎓 Пробники" },
                      ].map((tab: any) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className="px-4 py-2.5 rounded-lg text-xs font-black transition-all"
                          style={activeTab === tab.key
                            ? { background: "linear-gradient(90deg,#0ea5ff,#1d4ed8)", color: "white", boxShadow: "0 2px 8px rgba(14,165,255,0.35)" }
                            : { background: "rgba(255,255,255,0.7)", color: "#0257b0", border: "2px solid #7dd3fc" }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                {activeTab === "stats" && (
                  <>
                    {chartData.length > 0 && (
                      <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-md border-2 border-sky-100">
                        <h3 className="font-serif font-bold text-stone-700 mb-4">📈 Динамика успеваемости (%)</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0369a1' }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#0369a1' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '2px solid #0ea5e9', borderRadius: '12px' }} />
                            <Line type="monotone" dataKey="балл" stroke="#0284c7" strokeWidth={2} dot={{ r: 4, fill: "#0284c7" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "ЗАНЯТИЙ", value: totalLessons, sub: `${completedLessons} проведено`, icon: "📅", gradient: "from-sky-500 to-blue-600" },
                        { label: "ЗАДАНИЙ", value: totalHw, sub: `${doneHw} проверено`, icon: "📚", gradient: "from-pink-500 to-rose-600" },
                        { label: "ПОСЕЩ.", value: attendance + "%", sub: "от всех", icon: "✅", gradient: "from-emerald-500 to-teal-600" },
                        { label: "СДАНО ДЗ", value: hwRate + "%", sub: "от всех", icon: "⭐", gradient: "from-amber-500 to-orange-600" },
                      ].map((stat: any) => (
                        <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-md border-2 border-sky-100 text-center hover:scale-[1.02] transition">
                          <span className="text-2xl">{stat.icon}</span>
                          <p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</p>
                          <p className="text-xs text-stone-500">{stat.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-md border-2 border-sky-100">
                      <h3 className="font-serif font-bold text-stone-700 mb-3">📅 Последние занятия</h3>
                      {studentLessons.length > 0 ? (
                        <div className="space-y-2">
                          {studentLessons.slice(-5).reverse().map((l: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-200">
                              <div className="flex items-center gap-2">
                                <span>{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                                <span className="text-sm font-medium text-stone-800">{new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                l.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                                l.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}>
                                {l.status === "scheduled" ? "Заплан." : l.status === "completed" ? "Проведено" : "Отмена"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-stone-500 text-sm py-4 text-center font-serif italic">Нет занятий</p>}
                    </div>
                  </>
                )}

                {activeTab === "analytics" && (
                  <StudentAnalytics
                    studentId={selected.id}
                    homeworks={studentHomeworks}
                    submissions={studentSubmissions}
                    lessons={studentLessons}
                  />
                )}

                {activeTab === "trials" && (
                  <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-md border-2 border-sky-100">
                    <h3 className="font-serif font-bold text-stone-700 mb-4">🎓 Пробники</h3>
                    {(() => {
                      const trials = studentHomeworks.filter((hw: any) => hw.type === 'trial_exam');
                      if (trials.length === 0) return <p className="text-stone-500 text-sm py-4 text-center font-serif italic">Нет назначенных пробников</p>;

                      return (
                        <div className="space-y-3">
                          {trials.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).map((trial: any) => {
                            const sub = studentSubmissions.find((s: any) => s.homework_id === trial.id && s.status === 'approved');
                            const score = sub ? sub.score : null;
                            const maxScore = trial.max_score || 100;
                            const percent = score !== null ? Math.round((score / maxScore) * 100) : null;

                            return (
                              <div key={trial.id} className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-200">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{trial.subject === "chemistry" ? "🧪" : "🧬"}</span>
                                  <div>
                                    <p className="text-sm font-bold text-stone-800">{trial.title}</p>
                                    <p className="text-xs text-stone-600 font-medium">
                                      {sub ? `Проверено: ${score}/${maxScore} (${percent}%)` : "⏳ Ещё не проверено"}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {percent !== null ? (
                                    <>
                                      <p className={`text-xl font-black bg-clip-text text-transparent ${percent >= 80 ? 'from-emerald-600 to-teal-700' : percent >= 50 ? 'from-amber-600 to-orange-700' : 'from-rose-600 to-red-700'}`}>{percent}</p>
                                      <p className="text-xs text-stone-600 font-bold uppercase">баллов</p>
                                    </>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-lg font-bold">Ожидание</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-16 bg-white/60 backdrop-blur rounded-2xl px-8 border-2 border-sky-200 shadow-lg">
                  <p className="text-7xl mb-4">👈</p>
                  <p className="text-sky-700 text-lg font-black uppercase tracking-widest">Выберите ученика</p>
                  <p className="text-sky-500 text-xs font-medium italic mt-2">"We're happy, free, confused, and lonely"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showFeedbackModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-sky-200 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">💬 Сообщение для {selected.full_name.split(" ")[0]}</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFeedbackMessage(generateFeedbackTemplate("praise"))} className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 hover:bg-emerald-100 transition font-medium">👍 Похвала</button>
                <button onClick={() => setFeedbackMessage(generateFeedbackTemplate("reminder"))} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 hover:bg-amber-100 transition font-medium">⏰ Напоминание о ДЗ</button>
                <button onClick={() => setFeedbackMessage(generateFeedbackTemplate("report"))} className="text-xs px-3 py-1.5 bg-sky-50 text-sky-700 rounded-full border border-sky-200 hover:bg-sky-100 transition font-medium">📊 Отчёт для родителя</button>
              </div>
              <textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} rows={6} className="w-full border-2 border-sky-200 rounded-xl p-3 text-sm bg-sky-50/30 focus:border-sky-500 focus:outline-none transition resize-none" placeholder="Введите ваше сообщение здесь..." />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-100 transition">Отмена</button>
                <button onClick={sendTelegramFeedback} disabled={isSendingFeedback || !feedbackMessage.trim()} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:scale-[1.02] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSendingFeedback ? (<><span className="animate-spin">⏳</span> Отправка...</>) : (<>📤 Отправить в Telegram</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <AuthGuard allowedRole="tutor">
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">📸</div>
            <p className="text-sky-700 font-black uppercase tracking-widest">Загрузка...</p>
          </div>
        </div>
      }>
        <StudentsContent />
      </Suspense>
    </AuthGuard>
  );
}