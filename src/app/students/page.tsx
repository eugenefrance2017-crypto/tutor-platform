"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import StudentAnalytics from './StudentAnalytics';

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

const ACHIEVEMENTS = [
  { key: "first_sub", icon: "🎯", title: "Первое задание" },
  { key: "five_subs", icon: "🔥", title: "5 заданий" },
  { key: "perfect", icon: "💯", title: "Идеальный результат" },
  { key: "ten_subs", icon: "🌟", title: "10 заданий" },
];

function StudentsContent() {
  const searchParams = useSearchParams(); const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [studentLessons, setStudentLessons] = useState<any[]>([]);
  const [studentHomeworks, setStudentHomeworks] = useState<any[]>([]);
  const [editingLinks, setEditingLinks] = useState(false);
  const [editZoomLink, setEditZoomLink] = useState("");
  const [editBoardLink, setEditBoardLink] = useState("");
  const [editingParent, setEditingParent] = useState(false);
  const [editParentId, setEditParentId] = useState("");
  const [editPaidLessons, setEditPaidLessons] = useState(0);
  const [activeTab, setActiveTab] = useState<"stats" | "analytics">("stats");

  useEffect(() => { const q = query(collection(db, "profiles"), where("role", "==", "student")); const unsub = onSnapshot(q, (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, []);
  
  useEffect(() => {
    if (!selected) { setStudentProfile(null); setEditingLinks(false); setEditingParent(false); return; }
    getDoc(doc(db, "profiles", selected.id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStudentProfile(data);
        setEditZoomLink(data.zoom_link || "");
        setEditBoardLink(data.board_link || "");
        setEditParentId(data.parent_id || "");
        setEditPaidLessons(data.paid_lessons || 0);
      }
    });
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", selected.id)), (snap) => setStudentLessons(snap.docs.map((d) => d.data())));
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", selected.id)), (snap) => setStudentHomeworks(snap.docs.map((d) => d.data())));
    return () => { unsubLessons(); unsubHw(); };
  }, [selected]);

  async function saveLinks() {
    if (!selected) return;
    await updateDoc(doc(db, "profiles", selected.id), { zoom_link: editZoomLink.trim() || null, board_link: editBoardLink.trim() || null });
    const snap = await getDoc(doc(db, "profiles", selected.id));
    if (snap.exists()) setStudentProfile(snap.data());
    setEditingLinks(false);
    toast.success("Ссылки сохранены!");
  }

  async function saveParent() {
    if (!selected) return;
    await updateDoc(doc(db, "profiles", selected.id), { parent_id: editParentId.trim() || null, paid_lessons: editPaidLessons });
    if (editParentId.trim()) {
      await updateDoc(doc(db, "profiles", editParentId.trim()), { child_id: selected.id, role: "parent" });
    }
    const snap = await getDoc(doc(db, "profiles", selected.id));
    if (snap.exists()) setStudentProfile(snap.data());
    setEditingParent(false);
    toast.success("Данные родителя сохранены!");
  }

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
          <div className="lg:col-span-1 space-y-3">
            {students.length > 0 ? students.map((s: any, idx: number) => (
              <button key={s.id} onClick={() => { setSelected(s); setActiveTab("stats"); }} className={`w-full text-left p-4 rounded-2xl transition border-2 flex items-center gap-4 ${selected?.id === s.id ? "bg-white border-emerald-400 shadow-lg shadow-emerald-100 scale-[1.02]" : "bg-white/80 border-transparent hover:border-gray-200 shadow-sm"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${AVATARS[idx % AVATARS.length]} shadow-md`}>{(s.full_name || "У")[0].toUpperCase()}</div>
                <div className="flex-1"><p className="font-semibold text-gray-800">{s.full_name}</p><p className="text-xs text-gray-400">{s.email}</p>{s.xp !== undefined && <div className="mt-1 flex items-center gap-1"><span className="text-xs text-indigo-500 font-medium">⭐ {s.level || 1} ур.</span><span className="text-xs text-gray-400">• {s.xp} XP</span></div>}</div>
              </button>
            )) : <div className="text-center py-12 bg-white/80 rounded-2xl"><p className="text-4xl mb-2">👻</p><p className="text-gray-400">Нет учеников</p></div>}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6 border border-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br ${AVATARS[students.findIndex((x) => x.id === selected.id) % AVATARS.length]} shadow-lg`}>{(selected.full_name || "У")[0].toUpperCase()}</div>
                    <div><h2 className="text-xl font-bold text-gray-800">{selected.full_name}</h2><p className="text-gray-400 text-sm">{selected.email}</p></div>
                  </div>

                  {/* Ссылки Zoom/Доска */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3"><h3 className="font-medium text-sm text-gray-700">🔗 Ссылки для занятий</h3>
                      {!editingLinks ? <button onClick={() => setEditingLinks(true)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">✏️ Изменить</button> : <div className="flex gap-2"><button onClick={saveLinks} className="text-xs text-emerald-500 hover:text-emerald-700 font-medium">💾 Сохранить</button><button onClick={() => setEditingLinks(false)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button></div>}
                    </div>
                    {editingLinks ? <div className="space-y-3"><div><label className="text-xs text-gray-500">🎥 Zoom</label><input type="url" value={editZoomLink} onChange={(e) => setEditZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." className="w-full border rounded-lg p-2 text-xs mt-1" /></div><div><label className="text-xs text-gray-500">🖊️ Доска</label><input type="url" value={editBoardLink} onChange={(e) => setEditBoardLink(e.target.value)} placeholder="https://miro.com/app/..." className="w-full border rounded-lg p-2 text-xs mt-1" /></div></div> : <div className="space-y-2">{studentProfile?.zoom_link ? <a href={studentProfile.zoom_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition"><span>🎥</span><span className="text-xs text-blue-600 truncate">{studentProfile.zoom_link}</span></a> : <p className="text-xs text-gray-400 p-2">🎥 Zoom не указан</p>}{studentProfile?.board_link ? <a href={studentProfile.board_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition"><span>🖊️</span><span className="text-xs text-purple-600 truncate">{studentProfile.board_link}</span></a> : <p className="text-xs text-gray-400 p-2">🖊️ Доска не указана</p>}</div>}
                  </div>

                  {/* Привязка родителя */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3"><h3 className="font-medium text-sm text-gray-700">👨‍👩‍👧 Родитель и оплата</h3>
                      {!editingParent ? <button onClick={() => setEditingParent(true)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">✏️ Изменить</button> : <div className="flex gap-2"><button onClick={saveParent} className="text-xs text-emerald-500 hover:text-emerald-700 font-medium">💾 Сохранить</button><button onClick={() => setEditingParent(false)} className="text-xs text-gray-400 hover:text-gray-600">Отмена</button></div>}
                    </div>
                    {editingParent ? (
                      <div className="space-y-3">
                        <div><label className="text-xs text-gray-500">ID родителя (uid)</label><input value={editParentId} onChange={(e) => setEditParentId(e.target.value)} placeholder="Введите uid родителя" className="w-full border rounded-lg p-2 text-xs mt-1" /></div>
                        <div><label className="text-xs text-gray-500">Оплачено занятий</label><input type="number" value={editPaidLessons} onChange={(e) => setEditPaidLessons(parseInt(e.target.value) || 0)} min={0} className="w-full border rounded-lg p-2 text-xs mt-1" /></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Родитель: {studentProfile?.parent_id ? <span className="text-indigo-600 font-mono">{studentProfile.parent_id}</span> : "Не привязан"}</p>
                        <p className="text-xs text-gray-500">Оплачено занятий: <b className="text-emerald-600">{studentProfile?.paid_lessons || 0}</b></p>
                        {studentProfile?.paid_lessons > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(completedLessons / studentProfile.paid_lessons) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {studentProfile?.xp !== undefined && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4">
                      <div className="flex justify-between text-sm mb-1"><span className="font-medium text-indigo-700">⭐ Уровень {studentProfile.level || 1}</span><span className="text-gray-500">{studentProfile.xp || 0} XP</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full" style={{ width: `${((studentProfile.xp || 0) % 100)}%` }} /></div>
                      {studentProfile.achievements?.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{studentProfile.achievements.map((a: string) => { const ach = ACHIEVEMENTS.find(x => x.key === a); return ach ? <span key={a} className="text-lg cursor-help" title={ach.title}>{ach.icon}</span> : null; })}</div>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setActiveTab("stats")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === "stats" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>📊 Статистика</button>
                  <button onClick={() => setActiveTab("analytics")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === "analytics" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>📈 Аналитика</button>
                </div>

                {activeTab === "stats" ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[{ label: "Занятий", value: totalLessons, sub: `${completedLessons} проведено`, icon: "📅", color: "from-indigo-500 to-blue-500" }, { label: "Заданий", value: totalHw, sub: `${doneHw} проверено`, icon: "📚", color: "from-amber-500 to-orange-500" }, { label: "Посещаемость", value: attendance + "%", sub: "от всех занятий", icon: "📊", color: "from-emerald-500 to-green-500" }, { label: "Сдано ДЗ", value: hwRate + "%", sub: "от всех заданий", icon: "⭐", color: "from-rose-500 to-pink-500" }].map((stat) => (
                        <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white text-center hover:scale-[1.02] transition"><span className="text-2xl">{stat.icon}</span><p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p><p className="text-xs text-gray-500">{stat.sub}</p></div>
                      ))}
                    </div>
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white space-y-4">
                      <h3 className="font-semibold text-gray-700">📈 Прогресс</h3>
                      {[{ label: "Посещаемость", value: attendance, color: "from-emerald-400 to-green-500" }, { label: "Сдача ДЗ", value: hwRate, color: "from-amber-400 to-orange-500" }].map((bar) => (
                        <div key={bar.label}><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">{bar.label}</span><span className="font-medium">{bar.value}%</span></div><div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`} style={{ width: `${bar.value}%` }} /></div></div>
                      ))}
                    </div>
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white">
                      <h3 className="font-semibold text-gray-700 mb-3">🕐 Последние занятия</h3>
                      {studentLessons.length > 0 ? <div className="space-y-2">{studentLessons.slice(-5).reverse().map((l: any, i: number) => (<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-2"><span>{l.subject === "chemistry" ? "🧪" : "🧬"}</span><span className="text-sm font-medium">{new Date(l.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span></div><span className={`text-xs px-2 py-1 rounded-full ${l.status === "scheduled" ? "bg-blue-100 text-blue-700" : l.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{l.status === "scheduled" ? "Запланировано" : l.status === "completed" ? "Проведено" : "Отменено"}</span></div>))}</div> : <p className="text-gray-400 text-sm py-4 text-center">Нет занятий</p>}
                    </div>
                  </>
                ) : (
                  <StudentAnalytics studentId={selected.id} />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full"><div className="text-center py-16"><p className="text-6xl mb-4">👈</p><p className="text-gray-400 text-lg">Выберите ученика</p></div></div>
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