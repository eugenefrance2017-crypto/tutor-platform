"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, query, where, onSnapshot, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

const TASK_TYPES: Record<string, string> = {
  text: "📝 Текст", single_choice: "🔘 Тест (один)", multi_choice: "☑️ Тест (много)",
  matching: "🔗 Соответствие", equation: "⚛️ Уравнение", ordering: "🔬 Порядок",
  table_fill: "📊 Таблица", find_error: "❌ Ошибка", drag_drop: "🖱️ Drag & Drop",
  assembly: "🧩 Сборка", file_upload: "📎 Файл",
};

function LibraryContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [tasks, setTasks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState("chemistry");
  const [taskType, setTaskType] = useState("text"); const [taskData, setTaskData] = useState<any>(null);
  const [maxScore, setMaxScore] = useState(10);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "task_library"), where("tutor_id", "==", uid));
    const unsub = onSnapshot(q, (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [uid]);

  async function saveTask() {
    if (!title) return alert("Введите название!");
    const data = { tutor_id: uid, title, subject, task_type: taskType, task_data: taskData, max_score: maxScore, created_at: new Date().toISOString() };
    if (editTask) { await import("firebase/firestore").then(({ updateDoc }) => updateDoc(doc(db, "task_library", editTask.id), data)); }
    else { await addDoc(collection(db, "task_library"), data); }
    setShowForm(false); setEditTask(null); setTitle(""); setTaskData(null); setMaxScore(10);
  }

  async function deleteTask(id: string) { if (confirm("Удалить задание?")) { await import("firebase/firestore").then(({ deleteDoc }) => deleteDoc(doc(db, "task_library", id))); } }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">📦 Библиотека заданий</h1>
          <button onClick={() => { setShowForm(true); setEditTask(null); setTitle(""); setTaskData(null); }} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-600 shadow-lg shadow-purple-200 transition">+ Задание</button>
        </div>

        {/* Форма */}
        {showForm && (
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 mb-6 border border-white">
            <h2 className="font-semibold text-lg mb-4">{editTask ? "✏️ Редактировать" : "🆕 Новое задание"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Название</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр.: Типы химических связей" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-400 outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Предмет</label><select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-400 outline-none"><option value="chemistry">🧪 Химия</option><option value="biology">🧬 Биология</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Тип задания</label><select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-400 outline-none">{Object.entries(TASK_TYPES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></div>
                <div><label className="block text-sm font-medium mb-1">Макс. баллов</label><input type="number" value={maxScore} onChange={(e) => setMaxScore(parseInt(e.target.value) || 10)} min={1} max={100} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-400 outline-none" /></div>
              </div>
              <p className="text-xs text-gray-400">⚙️ Редактор для этого типа задания появится здесь (позже подключим все редакторы)</p>
              <div className="flex gap-3">
                <button onClick={saveTask} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 transition">💾 Сохранить</button>
                <button onClick={() => setShowForm(false)} className="px-6 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {/* Список */}
        {tasks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((t: any) => (
              <div key={t.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-white flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-xs text-gray-400">{TASK_TYPES[t.task_type] || "📝 Текст"} • {t.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"} • ⭐ {t.max_score} баллов</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditTask(t); setShowForm(true); setTitle(t.title); setSubject(t.subject); setTaskType(t.task_type); setMaxScore(t.max_score); }} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition text-sm">✏️</button>
                  <button onClick={() => deleteTask(t.id)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16"><p className="text-5xl mb-4">📭</p><p className="text-gray-400 text-lg">Библиотека пуста</p></div>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><LibraryContent /></Suspense>);
}