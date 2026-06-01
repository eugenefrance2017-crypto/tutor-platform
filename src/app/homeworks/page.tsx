"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, getDocs, doc,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import toast from "react-hot-toast";
import dynamic from 'next/dynamic';

const PDFCropper = dynamic(() => import('./PDFCropper'), { ssr: false });

function ChemicalToolbar({ onInsert }: { onInsert: (symbol: string) => void }) {
  const [open, setOpen] = useState(false);
  const buttons = [["₂","₃","₄","₅","₆","₇","₈","₉","₀"],["²","³","⁺","⁻"],["→","⇄","↑","↓","Δ","°"],["()","[]","+","=","·"]];
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">🧪</button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 p-2 bg-white rounded-xl shadow-xl border border-gray-200 w-72">
          <div className="flex flex-wrap gap-1">
            {buttons.map((group, gi) => (<span key={gi} className="flex flex-wrap gap-1">{gi > 0 && <span className="border-r border-gray-300 mx-1" />}{group.map((s) => (<button key={s} type="button" onClick={() => { onInsert(s); setOpen(false); }} className="px-2 py-1 bg-gray-50 rounded text-xs hover:bg-indigo-100 hover:text-indigo-700 transition">{s}</button>))}</span>))}
          </div>
        </div>
      )}
    </div>
  );
}

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app); const storage = getStorage(app);

const TASK_TYPES: Record<string, string> = {
  text: "📝 Текст", single_choice: "🔘 Тест (один)", multi_choice: "☑️ Тест (много)",
  matching: "🔗 Соответствие", equation: "⚛️ Уравнение", ordering: "🔬 Порядок",
  table_fill: "📊 Таблица", find_error: "❌ Ошибка", drag_drop: "🖱️ Drag & Drop",
  assembly: "🧩 Сборка", file_upload: "📎 Файл", voice: "🎤 Голос",
  pdf_image: "📷 Фото/PDF", photo: "🖼️ Фото",
};

function TestEditor({ onSave, initialData }: { onSave: (data: any) => void; initialData?: any }) {
  const [questions, setQuestions] = useState<{ id: string; question: string; options: string[]; correct: number | number[]; type: "single" | "multi"; full_score?: number; partial_score?: number; penalty?: number; }[]>(initialData?.questions || []);
  const [newQ, setNewQ] = useState(""); const [newOpt, setNewOpt] = useState("");
  function addQuestion() { if (!newQ.trim()) return; setQuestions([...questions, { id: "q" + Date.now(), question: newQ, options: [], correct: 0, type: "single", full_score: 1, partial_score: 0, penalty: 0 }]); setNewQ(""); }
  function addOption(qId: string) { if (!newOpt.trim()) return; setQuestions(questions.map((q) => q.id === qId ? { ...q, options: [...q.options, newOpt] } : q)); setNewOpt(""); }
  function removeOption(qId: string, idx: number) { setQuestions(questions.map((q) => q.id === qId ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q)); }
  function removeQuestion(qId: string) { setQuestions(questions.filter((q) => q.id !== qId)); }
  
  function insertAtCursor(id: string, symbol: string, current: string, setter: (v: string) => void) {
    const ta = document.getElementById(id) as HTMLTextAreaElement;
    if (ta) {
      const st = ta.selectionStart, en = ta.selectionEnd;
      const nv = current.substring(0, st) + symbol + current.substring(en);
      setter(nv);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(st + symbol.length, st + symbol.length); }, 0);
    } else { setter(current + symbol); }
  }

  return (<div className="space-y-4"><h3 className="font-semibold">📝 Редактор теста</h3>{questions.map((q, qi) => (<div key={q.id} className="bg-gray-50 rounded-2xl p-4 space-y-3"><div className="flex items-center justify-between"><span className="font-medium text-sm">Вопрос {qi + 1}</span><button type="button" onClick={() => removeQuestion(q.id)} className="text-red-400 text-sm">Удалить</button></div><div className="flex items-start gap-2 flex-wrap sm:flex-nowrap"><ChemicalToolbar onInsert={(s) => insertAtCursor(`q-${q.id}`, s, q.question, (v) => setQuestions(questions.map((x) => x.id === q.id ? { ...x, question: v } : x)))} /><textarea id={`q-${q.id}`} value={q.question} onChange={(e) => setQuestions(questions.map((x) => x.id === q.id ? { ...x, question: e.target.value } : x))} placeholder="Текст вопроса" className="flex-1 border rounded-lg p-2 text-sm min-w-0" /></div><div className="flex gap-2 items-center"><select value={q.type} onChange={(e) => { const newType = e.target.value as "single" | "multi"; setQuestions(questions.map((x) => x.id === q.id ? { ...x, type: newType, correct: newType === "single" ? 0 : [] } : x)); }} className="border rounded-lg p-1 text-xs"><option value="single">🔘 Один ответ</option><option value="multi">☑️ Несколько ответов</option></select></div><div className="grid grid-cols-3 gap-1"><div><label className="text-[10px] text-gray-400">Полный балл</label><input type="number" value={q.full_score ?? 1} onChange={(e) => setQuestions(questions.map((x) => x.id === q.id ? { ...x, full_score: parseInt(e.target.value) || 1 } : x))} min={0} className="w-full border rounded p-0.5 text-xs" /></div><div><label className="text-[10px] text-gray-400">Частичный</label><input type="number" value={q.partial_score ?? 0} onChange={(e) => setQuestions(questions.map((x) => x.id === q.id ? { ...x, partial_score: parseInt(e.target.value) || 0 } : x))} min={0} className="w-full border rounded p-0.5 text-xs" /></div><div><label className="text-[10px] text-gray-400">Штраф</label><input type="number" value={q.penalty ?? 0} onChange={(e) => setQuestions(questions.map((x) => x.id === q.id ? { ...x, penalty: parseInt(e.target.value) || 0 } : x))} min={0} className="w-full border rounded p-0.5 text-xs" /></div></div><div className="space-y-1">{q.options.map((opt, oi) => { const isCorrect = q.type === "single" ? q.correct === oi : Array.isArray(q.correct) && (q.correct as number[]).includes(oi); return (<div key={oi} className="flex items-center gap-2"><input type={q.type === "single" ? "radio" : "checkbox"} checked={isCorrect} onChange={() => { if (q.type === "single") setQuestions(questions.map((x) => x.id === q.id ? { ...x, correct: oi } : x)); else { const cur = (Array.isArray(q.correct) ? q.correct as number[] : []); const newCorrect = cur.includes(oi) ? cur.filter((c) => c !== oi) : [...cur, oi]; setQuestions(questions.map((x) => x.id === q.id ? { ...x, correct: newCorrect } : x)); } }} className="text-indigo-600" /><textarea id={`opt-${q.id}-${oi}`} value={opt} onChange={(e) => { const newOptions = [...q.options]; newOptions[oi] = e.target.value; setQuestions(questions.map((x) => x.id === q.id ? { ...x, options: newOptions } : x)); }} className="flex-1 border rounded p-1 text-sm min-w-0" /><ChemicalToolbar onInsert={(s) => insertAtCursor(`opt-${q.id}-${oi}`, s, opt, (v) => { const newOptions = [...q.options]; newOptions[oi] = v; setQuestions(questions.map((x) => x.id === q.id ? { ...x, options: newOptions } : x)); })} /><button type="button" onClick={() => removeOption(q.id, oi)} className="text-red-400 text-xs">×</button></div>); })}<div className="flex gap-2"><input value={newOpt} onChange={(e) => setNewOpt(e.target.value)} placeholder="Вариант ответа" className="flex-1 border rounded-lg p-1 text-xs" /><button type="button" onClick={() => addOption(q.id)} className="px-2 py-1 bg-indigo-500 text-white rounded text-xs">+</button></div></div></div>))}<div className="flex gap-2"><input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Новый вопрос" className="flex-1 border rounded-lg p-2 text-sm" /><button type="button" onClick={addQuestion} className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm">+ Вопрос</button></div><button type="button" onClick={() => onSave({ questions })} className="w-full bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-600">✅ Готово</button></div>);
}

function DragDropEditor({ onSave, initialData }: { onSave: (data: any) => void; initialData?: any }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(initialData?.categories || [{ id: "cat1", name: "Группа 1" }]);
  const [items, setItems] = useState<{ id: string; content: string; correctCategory: string }[]>(initialData?.items || []);
  const [newItem, setNewItem] = useState(""); const [newCat, setNewCat] = useState("");
  return (<div className="space-y-4"><h3 className="font-semibold">🖱️ Drag & Drop</h3><div><p className="text-sm font-medium mb-2">📁 Категории</p><div className="flex flex-wrap gap-2 mb-2">{categories.map((c) => (<span key={c.id} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-sm flex items-center gap-1">{c.name}<button type="button" onClick={() => { setCategories(categories.filter((x) => x.id !== c.id)); setItems(items.filter((i) => i.correctCategory !== c.id)); }} className="text-red-400 hover:text-red-600 ml-1">×</button></span>))}</div><div className="flex gap-2"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Категория" className="flex-1 border rounded-lg p-2 text-sm" /><button type="button" onClick={() => { if (newCat.trim()) { setCategories([...categories, { id: "cat" + Date.now(), name: newCat }]); setNewCat(""); } }} className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm">+</button></div></div><div><p className="text-sm font-medium mb-2">🖱️ Элементы</p>{items.map((item) => (<div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm mb-2"><span className="flex-1">{item.content}</span><select value={item.correctCategory} onChange={(e) => setItems(items.map((i) => i.id === item.id ? { ...i, correctCategory: e.target.value } : i))} className="border rounded p-1 text-xs">{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select><button type="button" onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="text-red-400 hover:text-red-600 text-sm">×</button></div>))}<div className="flex gap-2"><input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Напр. NaCl" className="flex-1 border rounded-lg p-2 text-sm" /><button type="button" onClick={() => { if (newItem.trim() && categories.length > 0) { setItems([...items, { id: "item" + Date.now(), content: newItem, correctCategory: categories[0].id }]); setNewItem(""); } }} className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm">+</button></div></div><button type="button" onClick={() => onSave({ categories, items })} className="w-full bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-600">✅ Готово</button></div>);
}

function HomeworksContent() {
  const searchParams = useSearchParams(); const [uid, setUid] = useState(""); const [role, setRole] = useState("student");
  useEffect(() => { setUid(searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || ""); setRole(searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student"); }, [searchParams]);
  const [homeworks, setHomeworks] = useState<any[]>([]); const [students, setStudents] = useState<any[]>([]); const [lessons, setLessons] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false); const [editHw, setEditHw] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "active" | "done" | "expired">("all");
  const [desc, setDesc] = useState(""); const [expl, setExpl] = useState(""); const isTutor = role === "tutor";
  const [sections, setSections] = useState<any[]>([]);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [sectionData, setSectionData] = useState<any>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [showPDFCropper, setShowPDFCropper] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialSubject, setTrialSubject] = useState("chemistry");

  useEffect(() => { if (!uid) return; const q = query(collection(db, "homeworks"), where(isTutor ? "tutor_id" : "student_id", "==", uid)); const unsub = onSnapshot(q, (snap) => setHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [uid, isTutor]);
  useEffect(() => { if (!uid || !isTutor) return; getDocs(query(collection(db, "profiles"), where("role", "==", "student"))).then((snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); const q = query(collection(db, "lessons"), where("tutor_id", "==", uid)); const unsub = onSnapshot(q, (snap) => setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })))); return () => unsub(); }, [uid, isTutor]);

  function addSection() { setSections([...sections, { id: "s" + Date.now(), type: "text", title: "", max_score: 10, unit_score: 1, data: { check_type: "exact", word_score: 10 }, explanation: "" }]); }
  function addPhotoSection() { setSections([...sections, { id: "photo-" + Date.now(), type: "photo", title: "Фото задания", max_score: 10, data: { check_type: "exact", word_score: 10 }, explanation: "" }]); }
  function removeSection(id: string) { setSections(sections.filter((s) => s.id !== id)); }
  function updateSection(id: string, field: string, value: any) { setSections(sections.map((s) => s.id === id ? { ...s, [field]: value } : s)); }
  function moveSection(index: number, direction: number) { const target = index + direction; if (target < 0 || target >= sections.length) return; const newSections = [...sections]; [newSections[index], newSections[target]] = [newSections[target], newSections[index]]; setSections(newSections); }
  function editSectionData(sec: any) { setEditingSection(sec); setSectionData(sec.data); setShowSectionEditor(true); }
  function saveSectionData() { if (editingSection) { updateSection(editingSection.id, "data", sectionData); setShowSectionEditor(false); setEditingSection(null); setSectionData(null); } }

  function insertAtTextarea(id: string, symbol: string, currentValue: string, setter: (v: string) => void) {
    const ta = document.getElementById(id) as HTMLTextAreaElement;
    if (ta) {
      const st = ta.selectionStart, en = ta.selectionEnd;
      const nv = currentValue.substring(0, st) + symbol + currentValue.substring(en);
      setter(nv);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(st + symbol.length, st + symbol.length); }, 0);
    } else { setter(currentValue + symbol); }
  }

  function handlePDFSave(images: { dataUrl: string; answer: string; maxScore: number }[]) {
    const newSections = images.map((img, idx) => ({
      id: "pdf-" + Date.now() + "-" + idx, type: "pdf_image",
      title: `Задание ${idx + 1} (из PDF)`, max_score: img.maxScore || 10,
      data: { image: img.dataUrl, check_type: "exact", correct_answer: img.answer, word_score: img.maxScore || 10 },
      explanation: "",
    }));
    setSections([...sections, ...newSections]); setShowPDFCropper(false);
    toast.success(`Добавлено ${images.length} заданий из PDF!`);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, sectionId: string) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { updateSection(sectionId, "data", { ...(sections.find(s => s.id === sectionId)?.data || {}), image: ev.target?.result as string }); };
    reader.readAsDataURL(file);
  }

  async function saveHomework(e: React.FormEvent) { 
    e.preventDefault(); const form = e.target as HTMLFormElement; 
    const studentId = (form.elements.namedItem("student_id") as HTMLSelectElement).value; 
    if (sections.length === 0) return toast.error("Добавьте хотя бы одно задание!"); 
    const totalMaxScore = sections.reduce((sum, s) => sum + (s.max_score || 0), 0); 
    const studentName = studentId ? students.find((s) => s.id === studentId)?.full_name || "" : "";
    const data: any = { 
      tutor_id: uid, student_id: studentId || null, student_name: studentName, 
      lesson_id: (form.elements.namedItem("lesson_id") as HTMLSelectElement).value || null, 
      title: (form.elements.namedItem("title") as HTMLInputElement).value, 
      description: desc, explanation: expl, task_type: "multi", sections: sections, 
      max_score: totalMaxScore, deadline: (form.elements.namedItem("deadline") as HTMLInputElement).value || null, 
      status: "active", created_at: new Date().toISOString(),
      trial_type: isTrial ? "ege" : null, trial_subject: isTrial ? trialSubject : null,
    }; 
    if (editHw) { await updateDoc(doc(db, "homeworks", editHw.id), data); toast.success("Задание обновлено!"); } 
    else { await addDoc(collection(db, "homeworks"), data); toast.success(isTrial ? "Пробник создан!" : "Задание создано!"); } 
    form.reset(); setShowForm(false); setEditHw(null); setSections([]); setDesc(""); setExpl(""); setIsTrial(false);
  }
  
  async function deleteHomework(id: string) { if (window.confirm("Удалить?")) { await deleteDoc(doc(db, "homeworks", id)); toast.success("Удалено!"); } }

  async function assignStudent(hw: any) {
    if (students.length === 0) return toast.error("Нет учеников!");
    const studentList = students.map((s: any, i: number) => `${i + 1}. ${s.full_name || s.email}`).join("\n");
    const choice = window.prompt(`Выберите ученика:\n${studentList}\n\nВведите номер:`, "1");
    if (!choice) return; const num = parseInt(choice);
    if (isNaN(num) || num < 1 || num > students.length) return toast.error("Неверный номер!");
    const student = students[num - 1];
    await updateDoc(doc(db, "homeworks", hw.id), { student_id: student.id, student_name: student.full_name || student.email });
    toast.success(`Привязано к ${student.full_name || student.email}!`);
  }

  async function loadLibraryItems() {
    try {
      const itemsSnap = await getDocs(query(collection(db, "library_items"), where("tutor_id", "==", uid)));
      setLibraryItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setShowLibrary(true);
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  }

  function useFromLibrary(item: any) { setSections(item.sections || []); setShowLibrary(false); toast.success("Загружено из библиотеки!"); }

  const filtered = homeworks.filter((h) => { if (filter === "all") return true; if (filter === "active") return h.status === "active"; if (filter === "done") return h.status === "done"; if (filter === "expired") return h.deadline && new Date(h.deadline) < new Date() && h.status === "active"; return true; });

  return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50"><div className="max-w-5xl mx-auto p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">📚 Домашние задания</h1>
        {isTutor && <Link href={`/library?uid=${uid}&role=${role}`} className="text-violet-600 hover:text-violet-800 transition font-medium text-sm">📖 Библиотека</Link>}
      </div>
      {isTutor && <button onClick={() => { setShowForm(true); setEditHw(null); setSections([]); setDesc(""); setExpl(""); setIsTrial(false); }} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 shadow-lg shadow-amber-200 transition">+ Задание</button>}
    </div>
    <div className="flex flex-wrap gap-3 mb-6">{[{ key: "all", label: "Все" }, { key: "active", label: "🟢 Активные" }, { key: "done", label: "✅ Проверены" }, { key: "expired", label: "⏰ Просрочены" }].map(({ key, label }) => (<button key={key} onClick={() => setFilter(key as any)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === key ? "bg-amber-500 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}>{label}</button>))}</div>

    {showForm && isTutor && (
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 mb-6 border border-white">
        <h2 className="font-semibold text-xl mb-4">{editHw ? '✏️ Редактировать' : isTrial ? '📝 Новый пробник' : '📝 Новое задание'}</h2>
        <form onSubmit={saveHomework} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Название</label><input name="title" required defaultValue={editHw?.title || ''} placeholder="Пробник №1" className="w-full border rounded-xl p-2.5 text-sm mt-1" /></div>
            <div><label className="text-sm font-medium text-gray-700">Ученик (необязательно)</label><select name="student_id" defaultValue={editHw?.student_id || ''} className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="">Без привязки</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Связать с уроком</label><select name="lesson_id" defaultValue={editHw?.lesson_id || ''} className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="">Не привязано</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.title || `Урок ${l.created_at ? new Date(l.created_at).toLocaleDateString('ru-RU') : ''}`}</option>)}</select></div>
            <div><label className="text-sm font-medium text-gray-700">Срок сдачи</label><input type="datetime-local" name="deadline" defaultValue={editHw?.deadline?.slice(0, 16) || ''} className="w-full border rounded-xl p-2.5 text-sm mt-1" /></div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-rose-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="text-rose-500 w-4 h-4" /><span className="text-sm font-medium text-gray-700">📝 Это пробник ЕГЭ/ОГЭ</span></label>
            {isTrial && <select value={trialSubject} onChange={(e) => setTrialSubject(e.target.value)} className="border rounded-lg px-3 py-1.5 text-xs"><option value="chemistry">🧪 Химия</option><option value="biology">🧬 Биология</option></select>}
          </div>

          <div><label className="text-sm font-medium text-gray-700">Описание</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1" rows={2} /></div>
          <div><label className="text-sm font-medium text-gray-700">Пояснение</label><textarea value={expl} onChange={(e) => setExpl(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1" rows={2} /></div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">📋 Задания ({sections.length})</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPDFCropper(true)} className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition">📷 Из PDF</button>
                <button type="button" onClick={loadLibraryItems} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition">📖 Библиотека</button>
                <button type="button" onClick={addSection} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition">+ Текст</button>
                <button type="button" onClick={addPhotoSection} className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-xs font-medium hover:bg-pink-600 transition">+ Фото</button>
              </div>
            </div>

            {showPDFCropper && <PDFCropper onSave={handlePDFSave} onCancel={() => setShowPDFCropper(false)} />}

            {sections.map((sec, index) => (
              <div key={sec.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400 font-mono">#{index + 1}</span><input value={sec.title || ''} onChange={(e) => updateSection(sec.id, 'title', e.target.value)} placeholder="Название" className="font-medium text-sm border-b border-transparent hover:border-gray-300 focus:border-indigo-300 outline-none px-1 py-0.5" /></div>
                  <div className="flex items-center gap-1"><button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button><button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button><button type="button" onClick={() => removeSection(sec.id)} className="p-1 text-red-400 hover:text-red-600 text-sm ml-1">🗑️</button></div>
                </div>

                {(sec.type === 'pdf_image' || sec.type === 'photo') ? (
                  <div>
                    <label className="text-xs text-gray-500">{sec.type === 'photo' ? '🖼️ Фото' : '📷 Из PDF'}</label>
                    {sec.data?.image ? <img src={sec.data.image} alt="Задание" className="w-full rounded-lg border mt-1 max-h-64 object-contain" /> : (
                      <label className="cursor-pointer mt-1 block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-300 transition"><span className="text-2xl">🖼️</span><p className="text-xs text-gray-400 mt-1">Загрузить фото</p><input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, sec.id)} className="hidden" /></label>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div><select value={sec.data?.check_type || 'exact'} onChange={(e) => updateSection(sec.id, 'data', { ...sec.data, check_type: e.target.value })} className="w-full border rounded-lg p-1.5 text-xs mt-1"><option value="exact">Точное</option><option value="keywords">Ключ. слова</option><option value="range">Диапазон</option><option value="variants">Варианты</option></select></div>
                      <div><input type="number" value={sec.max_score || 10} onChange={(e) => updateSection(sec.id, 'max_score', parseInt(e.target.value) || 0)} className="w-full border rounded-lg p-1.5 text-xs mt-1" /></div>
                    </div>
                    {sec.data?.check_type === 'exact' && (
                      <div className="flex items-start gap-1 mt-2 flex-wrap sm:flex-nowrap">
                        <ChemicalToolbar onInsert={(s) => { const inp = document.getElementById(`ans-${sec.id}`) as HTMLInputElement; if (inp) { const st = inp.selectionStart || 0; const cv = sec.data?.correct_answer || ''; updateSection(sec.id, 'data', { ...sec.data, correct_answer: cv.substring(0, st) + s + cv.substring(st) }); setTimeout(() => { inp.focus(); inp.setSelectionRange(st + s.length, st + s.length); }, 0); } else { updateSection(sec.id, 'data', { ...sec.data, correct_answer: (sec.data?.correct_answer || '') + s }); } }} />
                        <input id={`ans-${sec.id}`} value={sec.data?.correct_answer || ''} onChange={(e) => updateSection(sec.id, 'data', { ...sec.data, correct_answer: e.target.value })} placeholder="Правильный ответ" className="flex-1 border rounded-lg p-1.5 text-xs mt-1 min-w-0" />
                      </div>
                    )}
                    {sec.data?.check_type === 'keywords' && (
                      <div className="flex items-start gap-1 mt-2 flex-wrap sm:flex-nowrap">
                        <ChemicalToolbar onInsert={(s) => { const inp = document.getElementById(`kw-${sec.id}`) as HTMLInputElement; if (inp) { const st = inp.selectionStart || 0; const cv = sec.data?.keywords?.join(', ') || ''; const nv = cv.substring(0, st) + s + cv.substring(st); updateSection(sec.id, 'data', { ...sec.data, keywords: nv.split(/[,\s]+/).map((k: string) => k.trim()).filter((k: string) => k) }); setTimeout(() => { inp.focus(); inp.setSelectionRange(st + s.length, st + s.length); }, 0); } else { updateSection(sec.id, 'data', { ...sec.data, keywords: [...(sec.data?.keywords || []), s] }); } }} />
                        <input id={`kw-${sec.id}`} value={sec.data?.keywords?.join(', ') || ''} onChange={(e) => { const kw = e.target.value.split(/[,\s]+/).map((k: string) => k.trim()).filter((k: string) => k); updateSection(sec.id, 'data', { ...sec.data, keywords: kw }); }} placeholder="Ключевые слова" className="flex-1 border rounded-lg p-1.5 text-xs mt-1 min-w-0" />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><select value={sec.type} onChange={(e) => updateSection(sec.id, 'type', e.target.value)} className="w-full border rounded-lg p-1.5 text-xs mt-1">{Object.entries(TASK_TYPES).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
                      <div><input type="number" value={sec.max_score || 10} onChange={(e) => updateSection(sec.id, 'max_score', parseInt(e.target.value) || 0)} className="w-full border rounded-lg p-1.5 text-xs mt-1" /></div>
                    </div>
                    <div>
                      <div className="flex items-start gap-1 flex-wrap sm:flex-nowrap">
                        <ChemicalToolbar onInsert={(s) => insertAtTextarea(`task-${sec.id}`, s, sec.task_text || '', (v) => updateSection(sec.id, 'task_text', v))} />
                        <textarea id={`task-${sec.id}`} value={sec.task_text || ''} onChange={(e) => updateSection(sec.id, 'task_text', e.target.value)} placeholder="Текст задания..." className="flex-1 border rounded-lg p-1.5 text-xs min-w-0" rows={3} />
                      </div>
                    </div>
                    {sec.type === 'text' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div><select value={sec.data?.check_type || 'exact'} onChange={(e) => updateSection(sec.id, 'data', { ...(sec.data || {}), check_type: e.target.value })} className="w-full border rounded-lg p-1.5 text-xs"><option value="exact">Точное</option><option value="keywords">Ключ. слова</option><option value="range">Диапазон</option><option value="variants">Варианты</option></select></div>
                          <div><input type="number" value={sec.data?.word_score || sec.max_score} onChange={(e) => updateSection(sec.id, 'data', { ...(sec.data || {}), word_score: parseInt(e.target.value) || 1 })} className="w-full border rounded-lg p-1.5 text-xs" /></div>
                        </div>
                        {sec.data?.check_type === 'exact' && (
                          <div className="flex items-start gap-1 flex-wrap sm:flex-nowrap">
                            <ChemicalToolbar onInsert={(s) => { const inp = document.getElementById(`ans-${sec.id}`) as HTMLInputElement; if (inp) { const st = inp.selectionStart || 0; const cv = sec.data?.correct_answer || ''; updateSection(sec.id, 'data', { ...sec.data, correct_answer: cv.substring(0, st) + s + cv.substring(st) }); setTimeout(() => { inp.focus(); inp.setSelectionRange(st + s.length, st + s.length); }, 0); } else { updateSection(sec.id, 'data', { ...sec.data, correct_answer: (sec.data?.correct_answer || '') + s }); } }} />
                            <input id={`ans-${sec.id}`} value={sec.data?.correct_answer || ''} onChange={(e) => updateSection(sec.id, 'data', { ...sec.data, correct_answer: e.target.value })} placeholder="Правильный ответ" className="flex-1 border rounded-lg p-1.5 text-xs min-w-0" />
                          </div>
                        )}
                        {sec.data?.check_type === 'keywords' && (
                          <div className="flex items-start gap-1 flex-wrap sm:flex-nowrap">
                            <ChemicalToolbar onInsert={(s) => { const inp = document.getElementById(`kw-${sec.id}`) as HTMLInputElement; if (inp) { const st = inp.selectionStart || 0; const cv = sec.data?.keywords?.join(', ') || ''; const nv = cv.substring(0, st) + s + cv.substring(st); updateSection(sec.id, 'data', { ...sec.data, keywords: nv.split(/[,\s]+/).map((k: string) => k.trim()).filter((k: string) => k) }); setTimeout(() => { inp.focus(); inp.setSelectionRange(st + s.length, st + s.length); }, 0); } else { updateSection(sec.id, 'data', { ...sec.data, keywords: [...(sec.data?.keywords || []), s] }); } }} />
                            <input id={`kw-${sec.id}`} value={sec.data?.keywords?.join(', ') || ''} onChange={(e) => { const kw = e.target.value.split(/[,\s]+/).map((k: string) => k.trim()).filter((k: string) => k); updateSection(sec.id, 'data', { ...sec.data, keywords: kw }); }} placeholder="Ключевые слова" className="flex-1 border rounded-lg p-1.5 text-xs min-w-0" />
                          </div>
                        )}
                        {sec.data?.check_type === 'range' && <div className="grid grid-cols-2 gap-2"><input type="number" value={sec.data?.range_min || 0} onChange={(e) => updateSection(sec.id, 'data', { ...sec.data, range_min: parseFloat(e.target.value) })} className="w-full border rounded-lg p-1.5 text-xs" /><input type="number" value={sec.data?.range_max || 100} onChange={(e) => updateSection(sec.id, 'data', { ...sec.data, range_max: parseFloat(e.target.value) })} className="w-full border rounded-lg p-1.5 text-xs" /></div>}
                        {sec.data?.check_type === 'variants' && <input value={sec.data?.variants?.join(', ') || ''} onChange={(e) => { const vr = e.target.value.split(/[,\s]+/).map((v: string) => v.trim().toLowerCase()).filter((v: string) => v); updateSection(sec.id, 'data', { ...sec.data, variants: vr }); }} placeholder="Варианты через запятую" className="w-full border rounded-lg p-1.5 text-xs" />}
                      </div>
                    )}
                    {(sec.type === 'single_choice' || sec.type === 'multi_choice') && <div><button type="button" onClick={() => editSectionData(sec)} className="w-full text-left px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">{sec.data?.questions?.length ? `📝 Тест (${sec.data.questions.length} вопр.)` : '📝 Создать тест'}</button></div>}
                    {sec.type === 'drag_drop' && <div><button type="button" onClick={() => editSectionData(sec)} className="w-full text-left px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition">{sec.data?.items?.length ? `🖱️ Drag & Drop` : '🖱️ Создать'}</button></div>}
                  </>
                )}
                <div><textarea value={sec.explanation || ''} onChange={(e) => updateSection(sec.id, 'explanation', e.target.value)} placeholder="Пояснение..." className="w-full border rounded-lg p-1.5 text-xs" rows={2} /></div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 shadow-lg shadow-amber-200 transition">{editHw ? '💾 Сохранить' : isTrial ? '📤 Отправить пробник' : '📤 Отправить'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditHw(null); setSections([]); setIsTrial(false); }} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition text-sm">Отмена</button>
          </div>
        </form>

        {showLibrary && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-xl">📚 Библиотека</h3><button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>
              {libraryItems.length === 0 ? <div className="text-center py-8 text-gray-400"><p>📭 Пусто</p></div> : <div className="space-y-2">{libraryItems.map((item) => (<div key={item.id} className="p-4 bg-gray-50 rounded-xl border hover:border-violet-300 cursor-pointer transition" onClick={() => useFromLibrary(item)}><div className="flex items-center justify-between"><div><p className="font-medium text-sm">{item.title || "Без названия"}</p><p className="text-xs text-gray-400">{item.sections?.length || 0} заданий</p></div><button className="px-3 py-1 bg-violet-500 text-white rounded-lg text-xs hover:bg-violet-600">Использовать</button></div></div>))}</div>}
            </div>
          </div>
        )}
      </div>
    )}

    {!showForm && (
      <div className="space-y-4">
        {filtered.length === 0 && <div className="text-center py-12 bg-white/80 rounded-3xl"><p className="text-gray-400 text-lg">📭 Нет заданий</p></div>}
        {filtered.map((hw) => {
          const isExpired = hw.deadline && new Date(hw.deadline) < new Date() && hw.status === 'active';
          return (<div key={hw.id} className={`bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border ${isExpired ? 'border-red-300 bg-red-50/50' : 'border-white'} hover:shadow-xl transition`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><h3 className="font-bold text-lg">{hw.title || 'Без названия'}</h3>{hw.trial_type && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">📝 Пробник</span>}{hw.status === 'done' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">✅ Проверено</span>}{hw.status === 'active' && !isExpired && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">🟢 Активно</span>}{isExpired && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">⏰ Просрочено</span>}{!hw.student_id && isTutor && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Без ученика</span>}</div><div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">{isTutor && <span>👤 {hw.student_name || 'Не назначен'}</span>}<span>📅 {hw.deadline ? new Date(hw.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Без срока'}</span>{hw.max_score > 0 && <span>⭐ {hw.max_score} баллов</span>}</div></div><div className="flex items-center gap-2">{isTutor && hw.status !== 'archived' && (<>{!hw.student_id && <button onClick={() => assignStudent(hw)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs hover:bg-emerald-600">👤</button>}<button onClick={() => { setEditHw(hw); setShowForm(true); setSections(hw.sections || []); setDesc(hw.description || ''); setExpl(hw.explanation || ''); setIsTrial(!!hw.trial_type); setTrialSubject(hw.trial_subject || 'chemistry'); }} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600">✏️</button><button onClick={() => deleteHomework(hw.id)} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">🗑️</button></>)}{!isTutor && hw.status === 'active' && <Link href={`/homework/${hw.id}?uid=${uid}&role=${role}`} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600">✍️ Решать</Link>}{hw.status === 'done' && <Link href={`/homework/${hw.id}?uid=${uid}&role=${role}`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">📊 Результаты</Link>}</div></div></div>);
        })}
      </div>
    )}
  </div></div>);
}

export default function HomeworksPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div><p className="text-gray-500">Загрузка...</p></div></div>}><HomeworksContent /></Suspense>);
}