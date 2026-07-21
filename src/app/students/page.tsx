"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
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

const ACHIEVEMENTS = [
  { key: "first_sub", icon: "🎯", title: "Первое задание" },
  { key: "five_subs", icon: "", title: "5 заданий" },
  { key: "perfect", icon: "💯", title: "Идеальный результат" },
  { key: "ten_subs", icon: "🌟", title: "10 заданий" },
  { key: "streak_7", icon: "⚡", title: "7 дней подряд" },
  { key: "master", icon: "👑", title: "Мастер темы" },
];

const AVATARS = [
  "from-sky-400 to-blue-600",
  "from-pink-400 to-rose-500",
  "from-cyan-400 to-teal-500",
  "from-blue-500 to-indigo-600",
  "from-fuchsia-400 to-purple-600",
  "from-orange-400 to-red-500",
];

// ========== ВСТРОЕННАЯ АНАЛИТИКА ==========
function InlineStudentAnalytics({ studentId }: { studentId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  useEffect(() => {
    if (!studentId) return;
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", studentId)), (snap) => setHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubSub = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", studentId)), (snap) => setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", studentId)), (snap) => setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTrials = onSnapshot(query(collection(db, "exam_trials"), where("student_id", "==", studentId)), (snap) => setTrials(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubHw(); unsubSub(); unsubLessons(); unsubTrials(); };
  }, [studentId]);

  const stats = useMemo(() => {
    const totalHw = homeworks.length;
    const doneHw = homeworks.filter(h => h.status === "done").length;
    const completionRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.status === "completed").length;
    const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((sum, s) => {
      const hw = homeworks.find(h => h.id === s.homework_id);
      return sum + (hw?.max_score ? (s.score / hw.max_score) * 10 : 0);
    }, 0) / submissions.length * 10) / 10 : 0;
    return { totalHw, doneHw, completionRate, totalLessons, completedLessons, attendance, avgScore };
  }, [homeworks, lessons, submissions]);

  const scoreData = useMemo(() => {
    return submissions.filter(s => s.score !== undefined && s.submitted_at)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .slice(-10).map(s => {
        const hw = homeworks.find(h => h.id === s.homework_id);
        const percent = hw?.max_score ? Math.round((s.score / hw.max_score) * 100) : 0;
        return {
          date: s.submitted_at?.seconds ? new Date(s.submitted_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—",
          балл: percent,
        };
      }).filter(d => d.date !== "—");
  }, [submissions, homeworks]);

  const egePrediction = useMemo(() => {
    if (trials.length === 0) return null;
    const recent = trials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
    const avg = Math.round(recent.reduce((s, t) => s + (t.test_score || 0), 0) / recent.length);
    const prediction = Math.min(100, Math.round(avg * 1.05));
    const level = prediction >= 85 ? "Отлично 🎉" : prediction >= 65 ? "Хорошо 👍" : prediction >= 40 ? "Подтянуть 📚" : "Усиленная подготовка 💪";
    return { score: prediction, level };
  }, [trials]);

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "ЗАНЯТИЙ", value: stats.totalLessons, sub: `${stats.completedLessons} проведено`, icon: "📅", color: "from-sky-500 to-blue-600" },
          { label: "ЗАДАНИЙ", value: stats.totalHw, sub: `${stats.doneHw} проверено`, icon: "📚", color: "from-pink-500 to-rose-500" },
          { label: "ПОСЕЩ.", value: stats.attendance + "%", sub: "от всех", icon: "📊", color: "from-emerald-500 to-teal-500" },
          { label: "СДАНО ДЗ", value: stats.completionRate + "%", sub: "от всех", icon: "⭐", color: "from-amber-500 to-orange-500" },
          { label: "БАЛЛ", value: stats.avgScore, sub: "из 10", icon: "🎯", color: "from-rose-500 to-pink-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 border-2 border-sky-100 text-center hover:scale-[1.02] transition">
            <span className="text-2xl">{stat.icon}</span>
            <p className={`text-2xl font-black mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Прогноз ЕГЭ */}
      {egePrediction && (
        <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-3xl p-5 border-2 border-sky-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-stone-800">🎯 Прогноз ЕГЭ</h3>
            <div className="text-3xl font-black bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">{egePrediction.score}</div>
          </div>
          <p className="text-sm text-stone-600 mb-2">{egePrediction.level}</p>
          <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 h-3 rounded-full transition-all" style={{ width: `${egePrediction.score}%` }} />
          </div>
        </div>
      )}

      {/* График динамики */}
      {scoreData.length > 0 && (
        <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-sky-100">
          <h3 className="font-serif font-bold text-stone-800 mb-4">📈 Динамика успеваемости</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0369a1' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#0369a1' }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '2px solid #0ea5e9', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="балл" stroke="#0284c7" strokeWidth={2} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Прогресс-бары */}
      <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-sky-100 space-y-4">
        <h3 className="font-serif font-bold text-stone-800">📈 Прогресс</h3>
        {[
          { label: "Посещаемость", value: stats.attendance, color: "from-sky-400 to-blue-500" },
          { label: "Сдача ДЗ", value: stats.completionRate, color: "from-pink-400 to-rose-500" },
        ].map((bar) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-stone-600 font-bold uppercase text-xs">{bar.label}</span>
              <span className="font-black text-stone-800">{bar.value}%</span>
            </div>
            <div className="w-full bg-sky-100 rounded-full h-3 overflow-hidden border border-sky-200">
              <div className={`h-3 rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`} style={{ width: `${bar.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========
function StudentsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";

  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [studentHomeworks, setStudentHomeworks] = useState<any[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [studentTrials, setStudentTrials] = useState<any[]>([]);
  const [editingLinks, setEditingLinks] = useState(false);
  const [editZoomLink, setEditZoomLink] = useState("");
  const [editBoardLink, setEditBoardLink] = useState("");
  const [editHolstLink, setEditHolstLink] = useState("");
  const [editingParent, setEditingParent] = useState(false);
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentPassword, setEditParentPassword] = useState("");
  const [editPaidLessons, setEditPaidLessons] = useState(0);
  const [activeTab, setActiveTab] = useState<"stats" | "analytics" | "notes" | "trials">("stats");
  const [chartData, setChartData] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "score" | "date" | "lessons">("name");
  const [studentNotes, setStudentNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "profiles"), where("role", "==", "student"), where("tutor_id", "==", uid));
    const unsub = onSnapshot(q, (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!selected) {
      setStudentProfile(null);
      setEditingLinks(false);
      setEditingParent(false);
      setAiReport(null);
      setStudentNotes("");
      return;
    }

    getDoc(doc(db, "profiles", selected.id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStudentProfile(data);
        setEditZoomLink(data.zoom_link || "");
        setEditBoardLink(data.board_link || "");
        setEditHolstLink(data.holst_link || "");
        setEditParentEmail(data.parent_email || "");
        setEditParentPassword("");
        setEditPaidLessons(data.paid_lessons || 0);
        setStudentNotes(data.notes || "");
      }
    });

    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", selected.id)), (snap) => setStudentLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", selected.id)), (snap) => setStudentHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubSub = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", selected.id)), (snap) => setStudentSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTrials = onSnapshot(query(collection(db, "exam_trials"), where("student_id", "==", selected.id)), (snap) => setStudentTrials(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

    return () => { unsubLessons(); unsubHw(); unsubSub(); unsubTrials(); };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const hwSubmissions = studentSubmissions.filter(s => s.score !== undefined && s.homework_id);
    const data = hwSubmissions.slice(-10).map(s => {
      const hw = studentHomeworks.find(h => h.id === s.homework_id);
      const percent = hw?.max_score ? Math.round((s.score / hw.max_score) * 100) : 0;
      const date = s.submitted_at?.seconds
        ? new Date(s.submitted_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
        : "—";
      return { date, балл: percent };
    }).filter(d => d.date !== "—");
    setChartData(data);
  }, [selected, studentSubmissions, studentHomeworks]);

  const filteredStudents = useMemo(() => {
    let filtered = [...students];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
      return 0;
    });
    return filtered;
  }, [students, searchQuery, sortBy]);

  async function generateAIReport() {
    if (!selected) return;
    setGeneratingReport(true);
    setTimeout(() => {
      const total = studentLessons.length;
      const completed = studentLessons.filter(l => l.status === "completed").length;
      const totalHw = studentHomeworks.length;
      const doneHw = studentHomeworks.filter(h => h.status === "done").length;
      const attendance = total > 0 ? Math.round((completed / total) * 100) : 0;
      const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;

      const report = `🗽 **AI Отчёт: ${selected.full_name}**

🎯 **Статистика:**
• Занятий: ${completed}/${total}
• ДЗ: ${doneHw}/${totalHw}
• Посещаемость: ${attendance}%
• Сдача ДЗ: ${hwRate}%

📈 **Прогресс:**
${attendance >= 80 ? '✨ Отличная посещаемость!' : '⚠️ Стоит улучшить посещаемость'}
${hwRate >= 80 ? '📚 Ответственный подход к ДЗ!' : '📖 Нужно больше внимания ДЗ'}`;

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

  async function saveLinks() {
    if (!selected) return;
    await updateDoc(doc(db, "profiles", selected.id), {
      zoom_link: editZoomLink.trim() || null,
      board_link: editBoardLink.trim() || null,
      holst_link: editHolstLink.trim() || null,
    });
    const snap = await getDoc(doc(db, "profiles", selected.id));
    if (snap.exists()) setStudentProfile(snap.data());
    setEditingLinks(false);
    toast.success("✨ Ссылки сохранены!");
  }

  async function saveParent() {
    if (!selected) return;
    if (editParentEmail.trim() && !editParentPassword.trim()) {
      toast.error("Введите пароль для нового аккаунта");
      return;
    }
    if (editParentEmail.trim() && editParentPassword.trim().length >= 6) {
      try {
        const auth = getAuth(app);
        const result = await createUserWithEmailAndPassword(auth, editParentEmail.trim(), editParentPassword.trim());
        await setDoc(doc(db, "profiles", result.user.uid), {
          email: editParentEmail.trim(),
          role: "parent",
          child_id: selected.id,
          full_name: editParentEmail.split("@")[0],
          created_at: new Date().toISOString(),
        });
        await updateDoc(doc(db, "profiles", selected.id), {
          parent_id: result.user.uid,
          parent_email: editParentEmail.trim(),
          paid_lessons: editPaidLessons,
        });
        toast.success("✨ Аккаунт родителя создан!");
      } catch (error: any) {
        toast.error(error.message || "Ошибка");
        return;
      }
    } else if (editParentEmail.trim()) {
      await updateDoc(doc(db, "profiles", selected.id), { parent_email: editParentEmail.trim(), paid_lessons: editPaidLessons });
      toast.success("✨ Email сохранён!");
    } else {
      await updateDoc(doc(db, "profiles", selected.id), { paid_lessons: editPaidLessons });
      toast.success("✨ Сохранено!");
    }
    const snap = await getDoc(doc(db, "profiles", selected.id));
    if (snap.exists()) setStudentProfile(snap.data());
    setEditingParent(false);
  }

  async function saveNotes() {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await updateDoc(doc(db, "profiles", selected.id), { notes: studentNotes });
      toast.success("📝 Заметки сохранены!");
    } catch { toast.error("Ошибка"); }
    finally { setSavingNotes(false); }
  }

  function exportStudentData() {
    if (!selected) return;
    const data = { student: selected, lessons: studentLessons, homeworks: studentHomeworks, submissions: studentSubmissions, trials: studentTrials };
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
  const doneHw = studentHomeworks.filter((h: any) => h.status === "done").length;
  const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hwRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
  const paidLessons = studentProfile?.paid_lessons || 0;
  const remainingLessons = Math.max(0, paidLessons - completedLessons);
  const upcomingLessons = studentLessons.filter((l: any) => l.status === "scheduled" && new Date(l.start_time) > new Date()).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pendingHw = studentHomeworks.filter((h: any) => h.status === "active");
  const avgScore = studentSubmissions.length > 0
    ? Math.round(studentSubmissions.reduce((sum: number, s: any) => {
        const hw = studentHomeworks.find((h: any) => h.id === s.homework_id);
        return sum + (hw?.max_score ? (s.score / hw.max_score) * 10 : 0);
      }, 0) / studentSubmissions.length * 10) / 10
    : 0;

  const achievements = [];
  if (completedLessons >= 1) achievements.push({ icon: "🎓", title: "Первое занятие" });
  if (completedLessons >= 5) achievements.push({ icon: "", title: "5 занятий" });
  if (completedLessons >= 10) achievements.push({ icon: "⭐", title: "10 занятий" });
  if (doneHw >= 1) achievements.push({ icon: "📝", title: "Первое ДЗ" });
  if (doneHw >= 5) achievements.push({ icon: "🌟", title: "5 заданий" });
  if (attendance >= 90) achievements.push({ icon: "💯", title: "Отличная посещаемость" });
  if (hwRate >= 80) achievements.push({ icon: "👑", title: "Мастер ДЗ" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-8xl"></div>
        <div className="absolute bottom-20 right-10 text-7xl">🐦</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">📸</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌊</div>
        <div className="absolute top-1/2 left-1/2 text-5xl">🏙️</div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl"></span>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-sky-700 drop-shadow-sm">
              УЧЕНИКИ
            </h1>
            <span className="text-4xl"></span>
          </div>
          <p className="text-sky-600/70 font-serif italic text-sm">
            "Welcome to New York, it's been waiting for you" 🗽
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список учеников */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl p-4 border-2 border-sky-200 shadow-sm space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Поиск..."
                className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-sky-500 focus:outline-none"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-xs bg-white focus:border-sky-500 focus:outline-none font-medium"
              >
                <option value="name">По имени</option>
                <option value="date">По дате</option>
              </select>
            </div>

            {filteredStudents.length > 0 ? (
              filteredStudents.map((s: any, idx: number) => (
                <div key={s.id} className="relative group">
                  <button
                    onClick={() => { setSelected(s); setActiveTab("stats"); setAiReport(null); }}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      selected?.id === s.id
                        ? "bg-white shadow-lg scale-[1.02] ring-2 ring-sky-400 border-2 border-sky-400"
                        : "bg-white/80 hover:bg-white hover:shadow-md hover:scale-[1.01] border-2 border-sky-100 hover:border-sky-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${AVATARS[idx % AVATARS.length]} shadow-md ring-2 ring-white`}>
                        {(s.full_name || "У")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 uppercase tracking-wide text-sm">{s.full_name}</p>
                        <p className="text-xs text-sky-600 font-medium">{s.email}</p>
                        {s.xp !== undefined && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-xs text-sky-700 font-bold">⭐ {s.level || 1} ур.</span>
                            <span className="text-xs text-sky-500">• {s.xp} XP</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); generateShareLinkForStudent(s.id, s.full_name || "Ученик"); }}
                        className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
                        title="Ссылка"
                      >
                        🔗
                      </button>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white/80 rounded-xl border-2 border-sky-200">
                <p className="text-5xl mb-3"></p>
                <p className="text-sky-700 font-bold uppercase tracking-wide">
                  {searchQuery ? "Не найдено" : "Нет учеников"}
                </p>
              </div>
            )}
          </div>

          {/* Детали ученика */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-5">
                {/* Карточка ученика */}
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-6 border-2 border-sky-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-400 to-blue-500 opacity-10 rounded-bl-full"></div>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-5 relative z-10">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-black bg-gradient-to-br ${AVATARS[students.findIndex((x) => x.id === selected.id) % AVATARS.length]} shadow-lg ring-4 ring-white`}>
                      {(selected.full_name || "У")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selected.full_name}</h2>
                      <p className="text-sky-600 text-sm font-medium">{selected.email}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => generateShareLinkForStudent(selected.id, selected.full_name)} className="px-3 py-2 bg-sky-100 text-sky-700 rounded-lg text-sm font-bold hover:bg-sky-200 transition uppercase tracking-wide">🔗 Ссылка</button>
                      <button onClick={exportStudentData} className="px-3 py-2 bg-sky-100 text-sky-700 rounded-lg text-sm font-bold hover:bg-sky-200 transition uppercase tracking-wide">📥 Экспорт</button>
                      <button onClick={generateAIReport} disabled={generatingReport} className="px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg text-sm font-bold hover:scale-[1.02] transition flex items-center gap-1 shadow-md uppercase tracking-wide">
                        {generatingReport ? "⏳" : "🤖"} AI
                      </button>
                    </div>
                  </div>

                  {aiReport && (
                    <div className="mb-5 bg-sky-50 rounded-xl p-4 border-2 border-sky-200 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-black text-sky-700 text-sm uppercase tracking-wide">🤖 AI-аналитика</h3>
                        <button onClick={() => setAiReport(null)} className="text-sky-400 hover:text-sky-700 text-xs font-bold">✕</button>
                      </div>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{aiReport}</pre>
                    </div>
                  )}

                  {/* Ссылки */}
                  <div className="bg-sky-50/50 rounded-xl p-4 mb-4 border-2 border-sky-100 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">🎧 Ссылки</h3>
                      {!editingLinks ? (
                        <button onClick={() => setEditingLinks(true)} className="text-xs text-sky-600 hover:text-sky-800 font-bold uppercase">✏️ Изменить</button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={saveLinks} className="text-xs text-emerald-600 hover:text-emerald-800 font-bold uppercase">💾 Сохранить</button>
                          <button onClick={() => setEditingLinks(false)} className="text-xs text-slate-500 hover:text-slate-700 font-bold uppercase">Отмена</button>
                        </div>
                      )}
                    </div>
                    {editingLinks ? (
                      <div className="space-y-3">
                        <div><label className="text-xs text-slate-600 font-bold uppercase">🎥 Zoom</label><input type="url" value={editZoomLink} onChange={(e) => setEditZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." className="w-full border-2 border-sky-200 rounded-lg p-2 text-xs mt-1 bg-white focus:border-sky-500 focus:outline-none" /></div>
                        <div><label className="text-xs text-slate-600 font-bold uppercase">🖊️ Miro</label><input type="url" value={editBoardLink} onChange={(e) => setEditBoardLink(e.target.value)} placeholder="https://miro.com/app/..." className="w-full border-2 border-sky-200 rounded-lg p-2 text-xs mt-1 bg-white focus:border-sky-500 focus:outline-none" /></div>
                        <div><label className="text-xs text-slate-600 font-bold uppercase">🎨 Holst</label><input type="url" value={editHolstLink} onChange={(e) => setEditHolstLink(e.target.value)} placeholder="https://holst.so/embed/..." className="w-full border-2 border-sky-200 rounded-lg p-2 text-xs mt-1 bg-white focus:border-sky-500 focus:outline-none" /></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {studentProfile?.zoom_link ? <a href={studentProfile.zoom_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition border border-blue-200"><span>🎥</span><span className="text-xs text-blue-700 truncate font-medium">{studentProfile.zoom_link}</span></a> : <p className="text-xs text-slate-500 p-2 font-medium">🎥 Zoom не указан</p>}
                        {studentProfile?.board_link ? <a href={studentProfile.board_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition border border-purple-200"><span>🖊️</span><span className="text-xs text-purple-700 truncate font-medium">{studentProfile.board_link}</span></a> : <p className="text-xs text-slate-500 p-2 font-medium">️ Доска не указана</p>}
                      </div>
                    )}
                  </div>

                  {/* Родитель и оплата */}
                  <div className="bg-sky-50/50 rounded-xl p-4 mb-4 border-2 border-sky-100 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">👨‍👩‍👧 Родитель и оплата</h3>
                      {!editingParent ? (
                        <button onClick={() => setEditingParent(true)} className="text-xs text-sky-600 hover:text-sky-800 font-bold uppercase">✏️ Изменить</button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={saveParent} className="text-xs text-emerald-600 hover:text-emerald-800 font-bold uppercase">💾 Сохранить</button>
                          <button onClick={() => setEditingParent(false)} className="text-xs text-slate-500 hover:text-slate-700 font-bold uppercase">Отмена</button>
                        </div>
                      )}
                    </div>
                    {editingParent ? (
                      <div className="space-y-3">
                        <div><label className="text-xs text-slate-600 font-bold uppercase">Email родителя</label><input value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} placeholder="parent@email.com" className="w-full border-2 border-sky-200 rounded-lg p-2 text-xs mt-1 bg-white focus:border-sky-500 focus:outline-none" /></div>
                        <div><label className="text-xs text-slate-600 font-bold uppercase">Пароль</label><input type="password" value={editParentPassword} onChange={(e) => setEditParentPassword(e.target.value)} placeholder="Мин. 6 символов" className="w-full border-2 border-sky-200 rounded-lg p-2 text-xs mt-1 bg-white focus:border-sky-500 focus:outline-none" /></div>
                        <div><label className="text-xs text-slate-600 font-bold uppercase">Оплачено занятий</label><input type="number" value={editPaidLessons} onChange={(e) => setEditPaidLessons(parseInt(e.target.value) || 0)} min={0} className="w-full border-2 border-sky-200 rounded-lg p-2 text-xs mt-1 bg-white focus:border-sky-500 focus:outline-none" /></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600 font-medium">Родитель: {studentProfile?.parent_email || studentProfile?.parent_id ? <span className="text-sky-700 font-bold">{studentProfile.parent_email || studentProfile.parent_id}</span> : "Не привязан"}</p>
                        <p className="text-xs text-slate-600 font-medium">Оплачено: <b className="text-sky-700">{studentProfile?.paid_lessons || 0}</b></p>
                        {studentProfile?.paid_lessons > 0 && (
                          <div className="w-full bg-sky-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (completedLessons / studentProfile.paid_lessons) * 100)}%` }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Уровень и достижения */}
                  {studentProfile?.xp !== undefined && (
                    <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-xl p-4 border-2 border-sky-200 relative z-10">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-black text-sky-800 uppercase tracking-wide">⭐ Уровень {studentProfile.level || 1}</span>
                        <span className="text-sky-600 font-bold">{studentProfile.xp || 0} XP</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-sky-200">
                        <div className="bg-gradient-to-r from-sky-500 to-blue-600 h-3 rounded-full transition-all duration-700" style={{ width: `${((studentProfile.xp || 0) % 100)}%` }} />
                      </div>
                      {studentProfile.achievements?.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {studentProfile.achievements.map((a: string) => {
                            const ach = ACHIEVEMENTS.find(x => x.key === a);
                            return ach ? <span key={a} className="text-lg cursor-help" title={`${ach.title}`}>{ach.icon}</span> : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Табы */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "stats", label: "📸 СТАТИСТИКА" },
                    { key: "analytics", label: "📈 АНАЛИТИКА" },
                    { key: "notes", label: "📝 ЗАМЕТКИ" },
                    { key: "trials", label: "🎓 ПРОБНИКИ" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                        activeTab === tab.key
                          ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md"
                          : "bg-white/60 text-sky-700 hover:bg-white border-2 border-sky-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Статистика */}
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
                        { label: "ПОСЕЩ.", value: attendance + "%", sub: "от всех", icon: "📊", gradient: "from-emerald-500 to-teal-600" },
                        { label: "СДАНО ДЗ", value: hwRate + "%", sub: "от всех", icon: "⭐", gradient: "from-amber-500 to-orange-600" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-md border-2 border-sky-100 text-center hover:scale-[1.02] transition">
                          <span className="text-2xl">{stat.icon}</span>
                          <p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</p>
                          <p className="text-xs text-stone-500">{stat.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-md border-2 border-sky-100">
                      <h3 className="font-serif font-bold text-stone-700 mb-3">🕐 Последние занятия</h3>
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
                                l.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                "bg-rose-100 text-rose-700"
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

                {/* Аналитика — встроенный компонент */}
                {activeTab === "analytics" && <InlineStudentAnalytics studentId={selected.id} />}

                {/* Заметки */}
                {activeTab === "notes" && (
                  <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-md border-2 border-sky-100">
                    <h3 className="font-serif font-bold text-stone-700 mb-4">📝 ЗАМЕТКИ</h3>
                    <textarea value={studentNotes} onChange={(e) => setStudentNotes(e.target.value)} placeholder="Особенности, планы, темы..." rows={8} className="w-full border-2 border-sky-200 rounded-lg p-3 text-sm bg-white focus:border-sky-500 focus:outline-none transition resize-none font-medium" />
                    <button onClick={saveNotes} disabled={savingNotes} className="mt-3 w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-2.5 rounded-lg font-black uppercase tracking-wide hover:scale-[1.01] transition shadow-md disabled:opacity-50">
                      {savingNotes ? "💾 СОХРАНЕНИЕ..." : "💾 СОХРАНИТЬ"}
                    </button>
                  </div>
                )}

                {/* Пробники */}
                {activeTab === "trials" && (
                  <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-md border-2 border-sky-100">
                    <h3 className="font-serif font-bold text-stone-700 mb-4">🎓 ПРОБНИКИ</h3>
                    {studentTrials.length > 0 ? (
                      <div className="space-y-3">
                        {studentTrials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((trial, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-200">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{trial.subject === "chemistry" ? "" : "🧬"}</span>
                              <div>
                                <p className="text-sm font-bold text-stone-800">{new Date(trial.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p className="text-xs text-stone-600 font-medium">Первичный: {trial.primary_score}/{trial.max_primary}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">{trial.test_score}</p>
                              <p className="text-xs text-stone-600 font-bold uppercase">баллов</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-stone-500 text-sm py-4 text-center font-serif italic">Нет пробников</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-16 bg-white/60 backdrop-blur rounded-2xl px-8 border-2 border-sky-200 shadow-lg">
                  <p className="text-7xl mb-4">📸</p>
                  <p className="text-sky-700 text-lg font-black uppercase tracking-widest">Выберите ученика</p>
                  <p className="text-sky-500 text-xs font-medium italic mt-2">"We're happy, free, confused, and lonely"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse"></div>
          <p className="text-sky-700 font-black uppercase tracking-widest">Загрузка...</p>
        </div>
      </div>
    }>
      <StudentsContent />
    </Suspense>
  );
}