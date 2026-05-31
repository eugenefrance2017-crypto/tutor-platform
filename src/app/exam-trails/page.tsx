"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, doc, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";

const firebaseConfig = { apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com", projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app", messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function primaryToTest(primary: number, subject: string): number { return Math.round((primary / (subject === "chemistry" ? 56 : 59)) * 100); }

function ExamTrialsContent() {
  const searchParams = useSearchParams(); const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";
  const [trials, setTrials] = useState<any[]>([]); const [students, setStudents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false); const [editTrial, setEditTrial] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState(""); const [subject, setSubject] = useState("chemistry");
  const [primaryScore, setPrimaryScore] = useState(0); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStudent, setFilterStudent] = useState("all");

  useEffect(() => { if (!uid) return; const unsub = onSnapshot(query(collection(db, "exam_trials"), where("tutor_id", "==", uid)), (snap) => setTrials(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); getDocs(query(collection(db, "profiles"), where("role", "==", "student"))).then((snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [uid]);

  async function saveTrial(e: React.FormEvent) { e.preventDefault(); if (!selectedStudent) return toast.error("Выберите ученика!"); if (primaryScore <= 0) return toast.error("Введите баллы!"); const testScore = primaryToTest(primaryScore, subject); const maxPrimary = subject === "chemistry" ? 56 : 59; const data = { tutor_id: uid, student_id: selectedStudent, student_name: students.find(s => s.id === selectedStudent)?.full_name || "", subject, primary_score: primaryScore, test_score: testScore, max_primary: maxPrimary, date, created_at: new Date().toISOString() }; if (editTrial) { await updateDoc(doc(db, "exam_trials", editTrial.id), data); toast.success("Пробник обновлён!"); } else { await addDoc(collection(db, "exam_trials"), data); toast.success("Пробник добавлен!"); } setShowForm(false); setEditTrial(null); setPrimaryScore(0); }
  async function deleteTrial(id: string) { if (!window.confirm("Удалить?")) return; await deleteDoc(doc(db, "exam_trials", id)); toast.success("Удалено!"); }

  const filtered = filterStudent === "all" ? trials : trials.filter(t => t.student_id === filterStudent);
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6"><Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800">← Назад</Link><h1 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">📝 Пробники ЕГЭ/ОГЭ</h1><button onClick={() => { setShowForm(true); setEditTrial(null); setPrimaryScore(0); }} className="bg-rose-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-rose-600">+ Пробник</button></div>
        <div className="mb-4"><select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} className="border rounded-xl px-4 py-2 text-sm"><option value="all">👥 Все ученики</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}</select></div>
        {showForm && (
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 mb-6"><h2 className="font-semibold text-xl mb-4">{editTrial ? '✏️ Редактировать' : '📝 Новый пробник'}</h2>
            <form onSubmit={saveTrial} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-sm">Ученик</label><select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="">Выбрать</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                <div><label className="text-sm">Предмет</label><select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="chemistry">🧪 Химия</option><option value="biology">🧬 Биология</option></select></div>
                <div><label className="text-sm">Первичный балл</label><input type="number" value={primaryScore} onChange={(e) => setPrimaryScore(parseInt(e.target.value) || 0)} className="w-full border rounded-xl p-2.5 text-sm mt-1" /><p className="text-xs text-gray-400 mt-1">Макс: {subject === "chemistry" ? 56 : 59}</p></div>
                <div><label className="text-sm">Тестовый балл</label><input type="number" value={primaryToTest(primaryScore, subject)} readOnly className="w-full border rounded-xl p-2.5 text-sm mt-1 bg-gray-50" /></div>
                <div><label className="text-sm">Дата</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1" /></div>
              </div>
              <div className="flex gap-3"><button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl">✅ Сохранить</button><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-gray-200 rounded-xl">Отмена</button></div>
            </form>
          </div>
        )}
        <div className="space-y-3">
          {sorted.length === 0 ? <div className="text-center py-12 bg-white/80 rounded-3xl"><p className="text-gray-400 text-lg">📭 Нет пробников</p></div> : sorted.map((trial) => (
            <div key={trial.id} className="bg-white/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4"><span className="text-2xl">{trial.subject === "chemistry" ? "🧪" : "🧬"}</span><div><p className="font-semibold">{trial.student_name}</p><p className="text-xs text-gray-400">{new Date(trial.date).toLocaleDateString('ru-RU')}</p></div></div>
                <div className="flex items-center gap-4"><div className="text-right"><p className="text-sm text-gray-500">Первичный: <span className="font-bold">{trial.primary_score}/{trial.max_primary}</span></p><p className="text-lg font-bold text-rose-600">{trial.test_score} баллов</p></div>
                  <button onClick={() => { setEditTrial(trial); setSelectedStudent(trial.student_id); setSubject(trial.subject); setPrimaryScore(trial.primary_score); setDate(trial.date); setShowForm(true); }} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs">✏️</button>
                  <button onClick={() => deleteTrial(trial.id)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs">🗑️</button>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2"><div className="bg-gradient-to-r from-rose-400 to-pink-500 h-2 rounded-full" style={{ width: `${(trial.primary_score / trial.max_primary) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExamTrialsPage() { return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><ExamTrialsContent /></Suspense>); }