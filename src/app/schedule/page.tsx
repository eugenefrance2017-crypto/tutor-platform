"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, getDocs, doc,
} from "firebase/firestore";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function ScheduleContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState(""); const [role, setRole] = useState("student");
  useEffect(() => { setUid(searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || ""); setRole(searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student"); }, [searchParams]);

  const [lessons, setLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false); const [editLesson, setEditLesson] = useState<any>(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const isTutor = role === "tutor";

  useEffect(() => { if (!uid) return; const q = query(collection(db, "lessons"), where(isTutor ? "tutor_id" : "student_id", "==", uid)); const unsub = onSnapshot(q, (snap) => setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [uid, isTutor]);
  useEffect(() => { if (isTutor) { getDocs(query(collection(db, "profiles"), where("role", "==", "student"))).then((snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); getDocs(query(collection(db, "library_items"), where("tutor_id", "==", uid))).then((snap) => setLibraryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); } }, [isTutor, uid]);

  async function saveLesson(e: React.FormEvent) { 
    e.preventDefault(); const form = e.target as HTMLFormElement; 
    const studentId = (form.elements.namedItem("student_id") as HTMLSelectElement).value; 
    if (!studentId) return toast.error("Выберите ученика!"); 
    const hwTemplateId = (form.elements.namedItem("hw_template") as HTMLSelectElement)?.value || null;
    const data = { 
      tutor_id: uid, student_id: studentId, 
      student_name: students.find((s) => s.id === studentId)?.full_name || "", 
      subject: (form.elements.namedItem("subject") as HTMLSelectElement).value, 
      start_time: `${(form.elements.namedItem("date") as HTMLInputElement).value}T${(form.elements.namedItem("start_time") as HTMLInputElement).value}:00`, 
      end_time: `${(form.elements.namedItem("date") as HTMLInputElement).value}T${(form.elements.namedItem("end_time") as HTMLInputElement).value}:00`,
      hw_template_id: hwTemplateId,
    }; 
    if (editLesson) { await updateDoc(doc(db, "lessons", editLesson.id), data); toast.success("Занятие обновлено!"); } 
    else { await addDoc(collection(db, "lessons"), { ...data, status: "scheduled", created_at: new Date().toISOString() }); toast.success("Занятие создано!"); } 
    form.reset(); setShowForm(false); setEditLesson(null); 
  }

  async function deleteLesson(id: string) { if (window.confirm("Удалить занятие?")) { await deleteDoc(doc(db, "lessons", id)); toast.success("Занятие удалено!"); } }

  async function setStatus(lesson: any) {
    if (lesson.hw_template_id) {
      const template = libraryItems.find(item => item.id === lesson.hw_template_id);
      if (template && template.sections?.length > 0) {
        const totalMaxScore = template.sections.reduce((sum: number, s: any) => sum + (s.max_score || 0), 0);
        await addDoc(collection(db, "homeworks"), {
          tutor_id: uid, student_id: lesson.student_id, student_name: lesson.student_name || "",
          lesson_id: lesson.id, title: `ДЗ после занятия: ${template.title || new Date(lesson.start_time).toLocaleDateString('ru-RU')}`,
          description: `Автоматически создано после занятия ${new Date(lesson.start_time).toLocaleDateString('ru-RU')}`,
          task_type: "multi", sections: template.sections, max_score: totalMaxScore,
          status: "active", created_at: new Date().toISOString(),
        });
        toast.success("ДЗ отправлено ученику!");
      }
    }
    await updateDoc(doc(db, "lessons", lesson.id), { status: "completed" });
    toast.success("Занятие проведено!");
  }

  async function cancelLesson(id: string) { await updateDoc(doc(db, "lessons", id), { status: "cancelled" }); toast.success("Занятие отменено!"); }

  const getWeekDates = () => { const now = new Date(); const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1 + currentWeek * 7); const dates: Date[] = []; for (let i = 0; i < 7; i++) { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); dates.push(d); } return dates; };
  const weekDates = getWeekDates();
  const weekStr = `${weekDates[0].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} – ${weekDates[6].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
  const getLessonsForDate = (date: Date) => lessons.filter((l) => { const d = new Date(l.start_time); return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(); }).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const today = new Date();
  const dayNames = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">📅 Расписание</h1>
          {isTutor && <button onClick={() => { setShowForm(true); setEditLesson(null); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition">+ Занятие</button>}
        </div>
        <div className="flex items-center justify-between mb-4 bg-white/80 backdrop-blur rounded-2xl p-3 shadow-sm border border-white">
          <button onClick={() => setCurrentWeek(currentWeek - 1)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition">← Назад</button>
          <span className="font-semibold text-gray-700">{weekStr}</span>
          <button onClick={() => setCurrentWeek(currentWeek + 1)} className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Вперёд →</button>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {dayNames.map((day) => (<div key={day} className="text-center font-semibold text-xs sm:text-sm text-gray-500 py-2">{day}</div>))}
          {weekDates.map((date, idx) => { const dateLessons = getLessonsForDate(date); const isToday = date.toDateString() === today.toDateString(); return (<div key={idx} className={`min-h-[120px] rounded-2xl p-2 border-2 transition ${isToday ? "border-indigo-400 bg-indigo-50/50" : "border-transparent bg-white/60 hover:border-gray-200"}`}><div className={`text-center text-sm font-bold mb-2 ${isToday ? "text-indigo-600" : "text-gray-600"}`}>{date.getDate()}</div><div className="space-y-1">{dateLessons.map((l: any) => (<div key={l.id} className={`p-1.5 rounded-lg text-xs cursor-pointer transition group relative ${l.subject === "chemistry" ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`} title={`${l.subject === "chemistry" ? "🧪" : "🧬"} ${l.student_name || ""} — ${new Date(l.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}><div className="font-medium truncate">{l.subject === "chemistry" ? "🧪" : "🧬"} {l.student_name}</div><div className="text-[10px] opacity-70">{new Date(l.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>{l.hw_template_id && <div className="text-[10px]">📋 ДЗ привязано</div>}<div className="absolute top-0 right-0 hidden group-hover:flex gap-0.5 bg-white rounded-lg p-0.5 shadow z-10">{l.status === "scheduled" && <><button onClick={() => setStatus(l)} className="p-0.5 text-xs" title="Проведено">✅</button><button onClick={() => cancelLesson(l.id)} className="p-0.5 text-xs" title="Отменить">❌</button></>}<button onClick={() => { setEditLesson(l); setShowForm(true); }} className="p-0.5 text-xs">✏️</button><button onClick={() => deleteLesson(l.id)} className="p-0.5 text-xs">🗑️</button></div></div>))}</div></div>); })}
        </div>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setShowForm(false); setEditLesson(null); }}>
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-semibold text-lg mb-4">{editLesson ? "✏️ Редактировать" : "🆕 Новое занятие"}</h2>
              <form onSubmit={saveLesson} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Ученик</label><select name="student_id" required defaultValue={editLesson?.student_id || ""} className="w-full border rounded-xl p-3"><option value="">Выбрать</option>{students.map((s: any) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}</select></div>
                <div><label className="block text-sm font-medium mb-1">Предмет</label><select name="subject" required defaultValue={editLesson?.subject || "chemistry"} className="w-full border rounded-xl p-3"><option value="chemistry">🧪 Химия</option><option value="biology">🧬 Биология</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Дата</label><input type="date" name="date" required defaultValue={editLesson?.start_time?.slice(0, 10) || ""} className="w-full border rounded-xl p-3" /></div>
                <div className="flex gap-2"><div className="flex-1"><label className="block text-sm font-medium mb-1">Начало</label><input type="time" name="start_time" required defaultValue={editLesson?.start_time?.slice(11, 16) || ""} className="w-full border rounded-xl p-3" /></div><div className="flex-1"><label className="block text-sm font-medium mb-1">Конец</label><input type="time" name="end_time" required defaultValue={editLesson?.end_time?.slice(11, 16) || ""} className="w-full border rounded-xl p-3" /></div></div>
                <div><label className="block text-sm font-medium mb-1">📋 Шаблон ДЗ (из библиотеки)</label><select name="hw_template" defaultValue={editLesson?.hw_template_id || ""} className="w-full border rounded-xl p-3"><option value="">Не привязано</option>{libraryItems.map((item) => (<option key={item.id} value={item.id}>{item.title || "Без названия"} ({item.sections?.length || 0} зад.)</option>))}</select></div>
                <div className="flex gap-3"><button type="submit" className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600">{editLesson ? "💾 Сохранить" : "✅ Создать"}</button><button type="button" onClick={() => { setShowForm(false); setEditLesson(null); }} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300">Отмена</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><ScheduleContent /></Suspense>);
}