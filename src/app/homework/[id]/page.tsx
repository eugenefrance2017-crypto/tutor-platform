"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, addDoc, updateDoc, collection } from "firebase/firestore";
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import toast from "react-hot-toast";

function ChemicalToolbar({ onInsert }: { onInsert: (symbol: string) => void }) {
  const [open, setOpen] = useState(false);
  const buttons = [["₂","₃","₄","₅","₆","₇","₈","₉","₀"],["²","³","⁺","⁻"],["→","⇄","↑","↓","Δ","°"],["()","[]","+","=","·"]];
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)} className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">🧪</button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 p-2 bg-white rounded-xl shadow-xl border border-gray-200 w-72">
          <div className="flex flex-wrap gap-1">{buttons.map((group, gi) => (<span key={gi} className="flex flex-wrap gap-1">{gi > 0 && <span className="border-r border-gray-300 mx-1" />}{group.map((s) => (<button key={s} type="button" onClick={() => { onInsert(s); setOpen(false); }} className="px-2 py-1 bg-gray-50 rounded text-xs hover:bg-indigo-100 hover:text-indigo-700 transition">{s}</button>))}</span>))}</div>
        </div>
      )}
    </div>
  );
}
function insertSymbol(textareaId: string, symbol: string, currentValue: string, setValue: (v: string) => void) {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
  if (!textarea) { setValue(currentValue + symbol); return; }
  const start = textarea.selectionStart, end = textarea.selectionEnd;
  const newText = currentValue.substring(0, start) + symbol + currentValue.substring(end);
  setValue(newText);
  setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + symbol.length, start + symbol.length); }, 0);
}

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function DraggableItem({ id, content }: { id: string; content: string }) { 
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id }); 
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, touchAction: 'none' } : { touchAction: 'none' }} className={`px-4 py-3 bg-white rounded-xl shadow-md border-2 cursor-grab active:cursor-grabbing font-medium text-center select-none ${isDragging ? "opacity-50 border-indigo-400 shadow-xl" : "border-gray-200 hover:border-indigo-300 hover:shadow-lg"} transition`}>{content}</div>
  ); 
}

function DroppableZone({ id, name, items, color, onReturn }: { id: string; name: string; items: string[]; color: string; onReturn: (content: string) => void }) { 
  const { isOver, setNodeRef } = useDroppable({ id }); 
  return (
    <div ref={setNodeRef} className={`flex-1 min-h-[100px] rounded-2xl p-3 border-2 border-dashed transition ${isOver ? `${color} scale-[1.02]` : "border-gray-200 bg-gray-50/80"}`}>
      <h4 className="text-xs font-semibold mb-2 text-center text-gray-600">{name}</h4>
      <div className="flex flex-wrap gap-1 justify-center">{items.length === 0 && <p className="text-xs text-gray-400 py-2">Перетащите сюда</p>}{items.map((content, i) => (<span key={i} onClick={() => onReturn(content)} className="px-2 py-1 bg-white rounded-lg text-xs shadow-sm border border-gray-100 cursor-pointer hover:bg-red-50 transition">{content}</span>))}</div>
    </div>
  ); 
}

function DragDropSection({ section, answer, setAnswer }: { section: any; answer: any; setAnswer: (a: any) => void }) {
  const data = section.data;
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() => { const init: Record<string, string[]> = {}; data.categories.forEach((c: any) => { init[c.id] = answer?.assignments?.[c.id] || []; }); const allAssigned = Object.values(init).flat(); init["unassigned"] = data.items.map((i: any) => i.content).filter((c: string) => !allAssigned.includes(c)); return init; });
  const [activeId, setActiveId] = useState<string | null>(null); const [activeContent, setActiveContent] = useState("");
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }), useSensor(KeyboardSensor));
  function handleDragStart(event: any) { setActiveId(event.active.id as string); setActiveContent((event.active.id as string).replace(/_\d+$/, "")); }
  function handleDragEnd(event: any) { setActiveId(null); const { active, over } = event; if (!over) return; const draggedContent = (active.id as string).replace(/_\d+$/, ""); const targetZone = over.id as string; let sourceZone = "unassigned"; for (const [zone, items] of Object.entries(assignments)) { if (items.includes(draggedContent)) { sourceZone = zone; break; } } if (sourceZone === targetZone) return; const newAssignments = { ...assignments }; newAssignments[sourceZone] = newAssignments[sourceZone].filter((i) => i !== draggedContent); if (targetZone in newAssignments) newAssignments[targetZone] = [...newAssignments[targetZone], draggedContent]; setAssignments(newAssignments); setAnswer({ assignments: newAssignments }); }
  const unassignedItems = assignments["unassigned"] || [];
  const COLORS = ["border-indigo-300 bg-indigo-50/50", "border-emerald-300 bg-emerald-50/50", "border-amber-300 bg-amber-50/50", "border-rose-300 bg-rose-50/50"];
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4"><div><p className="text-sm text-gray-500 mb-2">🖱️ Перетащите элементы:</p><div className="flex flex-wrap gap-2 p-3 bg-gray-100 rounded-xl min-h-[40px]">{unassignedItems.length === 0 && <p className="text-xs text-gray-400">Все распределены ✅</p>}{unassignedItems.map((content: string, idx: number) => (<DraggableItem key={idx} id={content + "_" + idx} content={content} />))}</div></div><div className="flex flex-wrap gap-3">{data.categories.map((cat: any, idx: number) => (<DroppableZone key={cat.id} id={cat.id} name={cat.name} items={assignments[cat.id] || []} color={COLORS[idx % COLORS.length]} onReturn={(content) => { const newAssignments = { ...assignments }; newAssignments[cat.id] = (newAssignments[cat.id] || []).filter((i) => i !== content); newAssignments["unassigned"] = [...(newAssignments["unassigned"] || []), content]; setAssignments(newAssignments); setAnswer({ assignments: newAssignments }); }} />))}</div></div>
      <DragOverlay>{activeId ? <div className="px-4 py-3 bg-white rounded-xl shadow-2xl border-2 border-indigo-400 font-medium">{activeContent}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function SectionTabs({ sections, currentSection, setCurrentSection, sectionAnswers, submitted, sectionScores }: { sections: any[]; currentSection: number; setCurrentSection: (i: number) => void; sectionAnswers: Record<string, any>; submitted: boolean; sectionScores: Record<string, number>; }) {
  return (
    <div className="mb-6">
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3"><div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }} /></div>
      <div className="flex items-center justify-center gap-2 mb-2"><button onClick={() => setCurrentSection(Math.max(0, currentSection - 1))} disabled={currentSection === 0} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm transition">◀</button><div className="flex gap-1.5">{sections.map((sec, idx) => { const answered = sectionAnswers[sec.id] !== undefined && (typeof sectionAnswers[sec.id] === "string" ? sectionAnswers[sec.id].length > 0 : Object.keys(sectionAnswers[sec.id] || {}).length > 0); let color = "bg-gray-100 text-gray-500 border-2 border-gray-200"; if (submitted) { const score = sectionScores[sec.id] || 0; if (score >= sec.max_score) color = "bg-emerald-500 text-white border-emerald-500"; else if (score > 0) color = "bg-amber-500 text-white border-amber-500"; else color = "bg-red-500 text-white border-red-500"; } else if (idx === currentSection) color = "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-200"; else if (answered) color = "bg-indigo-100 text-indigo-700 border-indigo-300"; return (<button key={sec.id} onClick={() => setCurrentSection(idx)} className={`w-9 h-9 rounded-lg text-sm font-bold transition-all hover:scale-105 ${color} flex items-center justify-center`}>{idx + 1}</button>); })}</div><button onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))} disabled={currentSection >= sections.length - 1} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm transition">▶</button></div>
      <p className="text-xs text-gray-400 text-center mt-2">{submitted ? "📊 Результаты проверки" : `📝 Задание ${currentSection + 1} из ${sections.length}`}</p>
    </div>
  );
}

export default function HomeworkPage() {
  const params = useParams(); const id = params.id as string;
  const uid = typeof window !== "undefined" ? localStorage.getItem("uid") : "";
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : "";
  const [homework, setHomework] = useState<any>(null); const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionAnswers, setSectionAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false); const [score, setScore] = useState<number | null>(null);
  const [sectionScores, setSectionScores] = useState<Record<string, number>>({});
  const [tutorComment, setTutorComment] = useState(""); const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "homeworks", id)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data(); setHomework({ id: snap.id, ...data });
        if (data.status === "done" && data.submission) {
          setSubmitted(true);
          getDoc(doc(db, "submissions", data.submission)).then((subSnap) => {
            if (subSnap.exists()) { const sub = subSnap.data(); if (sub.section_answers) setSectionAnswers(sub.section_answers); if (sub.section_scores) setSectionScores(sub.section_scores); if (sub.manual_scores) setManualScores(sub.manual_scores || {}); if (sub.section_comments) setSectionComments(sub.section_comments || {}); if (sub.tutor_comment) setTutorComment(sub.tutor_comment || ""); if (sub.score !== undefined) setScore(sub.score); }
          });
        } else { setSubmitted(false); setScore(null); setSectionAnswers({}); setSectionScores({}); setManualScores({}); setSectionComments({}); setTutorComment(""); }
        if (data.sections) { const init: Record<string, any> = {}; data.sections.forEach((sec: any) => { if (sec.type === "drag_drop" && sec.data?.categories) { const a: Record<string, string[]> = {}; sec.data.categories.forEach((c: any) => (a[c.id] = [])); a["unassigned"] = sec.data.items.map((i: any) => i.content); init[sec.id] = { assignments: a }; } }); if (Object.keys(init).length > 0) setSectionAnswers((prev) => ({ ...init, ...prev })); }
      }
      setLoading(false);
    });
  }, [id]);

  function updateAnswer(sectionId: string, answer: any) { setSectionAnswers({ ...sectionAnswers, [sectionId]: answer }); }

  function calcSectionScore(sec: any, answer: any): number {
    if (!answer || !sec.data) return 0; const unitScore = sec.unit_score || 1;
    if (sec.type === "text" || sec.type === "pdf_image" || sec.type === "photo") { const ua = (typeof answer === "string" ? answer : "").trim(); const ws = sec.data?.word_score || sec.max_score || 1; const ct = sec.data?.check_type || "exact"; if (ct === "exact") return ua.toLowerCase() === (sec.data?.correct_answer || "").toLowerCase() ? ws : 0; if (ct === "keywords" && sec.data?.keywords?.length > 0) { const th = sec.data?.threshold || 0; let f = 0; sec.data.keywords.forEach((kw: string) => { if (ua.toLowerCase().includes(kw.toLowerCase())) f++; }); if (f < th) return 0; return Math.min(f * ws, sec.max_score || Infinity); } if (ct === "range") { const n = parseFloat(ua.replace(",", ".")); if (isNaN(n)) return 0; return (n >= (sec.data?.range_min || 0) && n <= (sec.data?.range_max || 100)) ? ws : 0; } if (ct === "variants" && sec.data?.variants?.length > 0) { const norm = ua.toLowerCase().replace(/\s+/g, ""); return sec.data.variants.some((v: string) => v.replace(/\s+/g, "").toLowerCase() === norm) ? ws : 0; } return 0; }
    if (sec.type === "single_choice" && sec.data.questions) { let t = 0; sec.data.questions.forEach((q: any) => { if (answer[q.id] === q.correct) t += (q.full_score ?? 1); }); return t; }
    if (sec.type === "multi_choice" && sec.data.questions) { let t = 0; sec.data.questions.forEach((q: any) => { const fl = q.full_score ?? 1; const pt = q.partial_score ?? 0; const pn = q.penalty ?? 0; const ua = answer[q.id] || []; const ca = q.correct as number[]; let c = 0, w = 0; ua.forEach((ui: number) => { if (ca.includes(ui)) c++; else w++; }); if (c === ca.length && w === 0) t += fl; else if (c > 0) t += Math.max(0, pt * c - w * pn); }); return t; }
    if (sec.type === "drag_drop" && sec.data.items) { let c = 0; sec.data.items.forEach((item: any) => { if (answer.assignments?.[item.correctCategory]?.includes(item.content)) c++; }); return c * unitScore; }
    if (sec.type === "assembly" && sec.data.correctOrder) { let c = 0; const a = answer || []; sec.data.correctOrder.forEach((id: string, idx: number) => { if (a[idx] === id) c++; }); return c * unitScore; }
    if (sec.type === "matching" && sec.data.pairs) { let c = 0; sec.data.pairs.forEach((p: any) => { if (answer[p.id] === p.id) c++; }); return c * unitScore; }
    if (sec.type === "ordering" && sec.data.steps) { let c = 0; const a = answer || []; sec.data.steps.forEach((s: any, idx: number) => { if (a[idx] === s.id) c++; }); return c * unitScore; }
    if (sec.type === "table_fill" && sec.data.cells) { let c = 0; sec.data.cells.forEach((cl: any) => { if ((answer?.[`${cl.row}_${cl.col}`] || "").trim().toLowerCase() === cl.answer.trim().toLowerCase()) c++; }); return c * unitScore; }
    return 0;
  }

  async function submitAnswer() {
    if (!uid || !homework) return;
    const sections = homework.sections || []; const scores: Record<string, number> = {}; let totalScore = 0;
    sections.forEach((sec: any) => { const s = calcSectionScore(sec, sectionAnswers[sec.id]); scores[sec.id] = Math.round(s); totalScore += s; });
    const finalScore = Math.round(totalScore);
    const result = await addDoc(collection(db, "submissions"), { homework_id: id, student_id: uid, section_answers: sectionAnswers, section_scores: scores, score: finalScore, submitted_at: new Date().toISOString(), status: "submitted" });
    await updateDoc(doc(db, "homeworks", id), { submission: result.id, status: "done" });
    setSubmitted(true); setScore(finalScore); setSectionScores(scores);
    if (finalScore > 0) { const xpEarned = Math.round(finalScore * 10); const profileRef = doc(db, "profiles", uid); const profileSnap = await getDoc(profileRef); if (profileSnap.exists()) { const cur = profileSnap.data().xp || 0; await updateDoc(profileRef, { xp: cur + xpEarned, level: Math.floor((cur + xpEarned) / 100) + 1 }); toast.success(`+${xpEarned} XP!`, { icon: "⭐" }); } }
    toast.success(`Ответ отправлен! Результат: ${finalScore} из ${homework.max_score} баллов`);
  }

  async function submitReview() { if (!homework?.submission) return; const submissionRef = doc(db, "submissions", homework.submission); const sections = homework.sections || []; let totalScore = 0; sections.forEach((sec: any) => { totalScore += manualScores[sec.id] !== undefined ? manualScores[sec.id] : (sectionScores[sec.id] || 0); }); await updateDoc(submissionRef, { tutor_comment: tutorComment, manual_scores: manualScores, section_comments: sectionComments, score: Math.round(totalScore), status: "reviewed" }); toast.success("Проверка сохранена!"); }
  async function returnForRework() { await updateDoc(doc(db, "homeworks", id), { status: "active", submission: null }); setSubmitted(false); setScore(null); setSectionAnswers({}); setSectionScores({}); setManualScores({}); setSectionComments({}); setTutorComment(""); toast.success("Отправлено на доработку!"); }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  if (!homework) return <div className="min-h-screen flex items-center justify-center">Задание не найдено</div>;
  if (homework.task_type !== "multi") return <div className="min-h-screen flex items-center justify-center text-gray-400">Это задание старого типа</div>;

  const sections = homework.sections || []; const section = sections[currentSection];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6"><Link href={`/homeworks?uid=${uid}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link><h1 className="text-xl sm:text-2xl font-bold text-gray-800">📝 {homework.title}</h1><div></div></div>

        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 border border-white mb-6">
          {homework.description && <p className="text-gray-600 mb-4">{homework.description}</p>}
          {submitted && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl mb-4 text-center font-medium">✅ Ответ отправлен! {score !== null && <span className="block mt-1">Результат: {score} из {homework.max_score} баллов</span>}</div>}
          {submitted && homework.explanation && <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl mb-4 text-sm">💡 <span className="font-medium">Пояснение:</span> {homework.explanation}</div>}
          {submitted && tutorComment && <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl mb-4 text-sm">💬 <span className="font-medium">Комментарий преподавателя:</span> {tutorComment}</div>}

          <SectionTabs sections={sections} currentSection={currentSection} setCurrentSection={setCurrentSection} sectionAnswers={sectionAnswers} submitted={submitted} sectionScores={sectionScores} />

          {submitted && (
            <div className="space-y-3 mt-4">
              {sections.map((sec: any, idx: number) => { if (idx !== currentSection) return null; const ans = sectionAnswers[sec.id]; const sc = manualScores[sec.id] !== undefined ? manualScores[sec.id] : (sectionScores[sec.id] || 0); const comment = sectionComments[sec.id] || ""; return (
                <div key={sec.id} className="p-4 bg-gray-50 rounded-xl border">
                  <div className="flex items-center justify-between mb-3"><h4 className="font-medium text-sm">{sec.title || `Задание ${idx + 1}`}</h4><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc >= sec.max_score ? "bg-emerald-100 text-emerald-700" : sc > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{sc}/{sec.max_score} баллов</span></div>
                  {sec.explanation && <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-xs font-medium text-amber-800 mb-1">💡 Пояснение:</p><p className="text-sm text-amber-700">{sec.explanation}</p></div>}
                  {(sec.type === 'pdf_image' || sec.type === 'photo') && (<div>{sec.data?.image && <img src={sec.data.image} alt="Задание" className="w-full rounded-lg border mb-3" />}<div className="mb-3"><p className="text-xs font-medium text-gray-500 mb-1">📝 Ваш ответ:</p><div className="p-3 bg-white rounded-lg text-sm whitespace-pre-wrap border">{ans || "Нет ответа"}</div></div>{sec.data?.correct_answer && <div className="mb-2 p-2 bg-emerald-50 rounded-lg"><p className="text-xs font-medium text-emerald-700">✅ Правильный ответ:</p><p className="text-sm text-emerald-600">{sec.data.correct_answer}</p></div>}</div>)}
                  {sec.type === "text" && (<div><div className="mb-3"><p className="text-xs font-medium text-gray-500 mb-1">📝 Ваш ответ:</p><div className="p-3 bg-white rounded-lg text-sm whitespace-pre-wrap border">{ans || "Нет ответа"}</div></div>{sec.data?.check_type === "exact" && sec.data?.correct_answer && <div className="mb-2 p-2 bg-emerald-50 rounded-lg"><p className="text-xs font-medium text-emerald-700">✅ Правильный ответ:</p><p className="text-sm text-emerald-600">{sec.data.correct_answer}</p></div>}{sec.data?.check_type === "keywords" && sec.data?.keywords && <div className="mb-2 p-2 bg-emerald-50 rounded-lg"><p className="text-xs font-medium text-emerald-700">✅ Ключевые слова:</p><p className="text-sm text-emerald-600">{sec.data.keywords.join(", ")}</p></div>}{sec.data?.check_type === "range" && <div className="mb-2 p-2 bg-emerald-50 rounded-lg"><p className="text-xs font-medium text-emerald-700">✅ Диапазон:</p><p className="text-sm text-emerald-600">от {sec.data.range_min || 0} до {sec.data.range_max || 100}</p></div>}{sec.data?.check_type === "variants" && sec.data?.variants && <div className="mb-2 p-2 bg-emerald-50 rounded-lg"><p className="text-xs font-medium text-emerald-700">✅ Правильные варианты:</p><p className="text-sm text-emerald-600">{sec.data.variants.join(", ")}</p></div>}</div>)}
                  {(sec.type === "single_choice" || sec.type === "multi_choice") && sec.data?.questions?.map((q: any, qi: number) => { const userAns = sec.type === "single_choice" ? ans?.[q.id] : (ans?.[q.id] || []); const correctAns = q.correct; const isCorrect = sec.type === "single_choice" ? userAns === correctAns : Array.isArray(correctAns) && Array.isArray(userAns) && userAns.length === correctAns.length && userAns.every((v: number) => correctAns.includes(v)); return (<div key={q.id} className="mb-2 p-2 bg-white rounded-lg border"><p className="text-sm font-medium">{qi + 1}. {q.question}</p><p className={`text-xs mt-1 ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>Ваш ответ: {sec.type === "single_choice" ? (q.options[userAns] || "—") : (userAns as number[])?.map((i: number) => q.options[i]).join(", ") || "—"}</p>{!isCorrect && <p className="text-xs text-emerald-600">Правильно: {sec.type === "single_choice" ? q.options[correctAns as number] : (correctAns as number[])?.map((i: number) => q.options[i]).join(", ")}</p>}</div>); })}
                  {role === "tutor" && (<div className="mt-3 pt-3 border-t space-y-2"><div className="flex items-center gap-2"><label className="text-xs font-medium">Баллы:</label><input type="number" value={manualScores[sec.id] !== undefined ? manualScores[sec.id] : sc} onChange={(e) => setManualScores({ ...manualScores, [sec.id]: parseInt(e.target.value) || 0 })} min={0} max={sec.max_score} className="w-16 border rounded-lg p-1 text-xs" /><span className="text-xs text-gray-400">/ {sec.max_score}</span></div><div><label className="text-xs font-medium">Комментарий:</label><textarea value={comment} onChange={(e) => setSectionComments({ ...sectionComments, [sec.id]: e.target.value })} rows={2} placeholder="Комментарий..." className="w-full border rounded-lg p-1.5 text-xs mt-1" /></div></div>)}
                </div>
              );})}
              {role === "tutor" && (<div className="space-y-2 mt-2"><div><label className="text-xs font-medium">Общий комментарий:</label><textarea value={tutorComment} onChange={(e) => setTutorComment(e.target.value)} rows={2} className="w-full border rounded-lg p-1.5 text-xs mt-1" /></div><button onClick={submitReview} className="w-full bg-indigo-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-600">💾 Сохранить проверку</button><button onClick={returnForRework} className="w-full bg-amber-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-amber-600">🔄 Отправить на доработку</button></div>)}
            </div>
          )}

          {!submitted && section && (
            <div className="bg-gray-50 rounded-2xl p-5">
              <h3 className="font-semibold mb-2">{section.title || `Задание ${currentSection + 1}`} <span className="text-xs text-gray-400">({section.max_score} баллов)</span></h3>
              {section.task_text && <div className="mb-3 p-3 bg-white rounded-lg text-sm whitespace-pre-wrap">{section.task_text}</div>}
              
              {(section.type === 'pdf_image' || section.type === 'photo') && section.data?.image && (
                <div className="space-y-3">
                  <img src={section.data.image} alt="Задание" className="w-full rounded-lg border" />
                  <div className="flex items-start gap-2">
                    <textarea id={`sec-pdf-${section.id}`} value={sectionAnswers[section.id] || ""} onChange={(e) => updateAnswer(section.id, e.target.value)} rows={3} placeholder="Ваш ответ..." className="flex-1 border rounded-lg p-3 text-sm" />
                    <ChemicalToolbar onInsert={(s) => insertSymbol(`sec-pdf-${section.id}`, s, sectionAnswers[section.id] || "", (v) => updateAnswer(section.id, v))} />
                  </div>
                </div>
              )}
              
              {section.type === "text" && (
                <div className="flex items-start gap-2">
                  <textarea id={`sec-text-${section.id}`} value={sectionAnswers[section.id] || ""} onChange={(e) => updateAnswer(section.id, e.target.value)} rows={5} placeholder="Ваш ответ..." className="flex-1 border rounded-lg p-3 text-sm" />
                  <ChemicalToolbar onInsert={(s) => insertSymbol(`sec-text-${section.id}`, s, sectionAnswers[section.id] || "", (v) => updateAnswer(section.id, v))} />
                </div>
              )}
              
              {(section.type === "single_choice" || section.type === "multi_choice") && section.data?.questions?.map((q: any, qi: number) => (<div key={q.id} className="mb-3"><p className="font-medium text-sm mb-2">{qi + 1}. {q.question}</p>{q.options.map((opt: string, oi: number) => { const ans = sectionAnswers[section.id] || {}; const isSelected = section.type === "single_choice" ? ans[q.id] === oi : (ans[q.id] || []).includes(oi); return (<label key={oi} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${isSelected ? "bg-indigo-50 border border-indigo-300" : ""}`}><input type={section.type === "single_choice" ? "radio" : "checkbox"} checked={isSelected} onChange={() => { if (section.type === "single_choice") updateAnswer(section.id, { ...ans, [q.id]: oi }); else { const arr = ans[q.id] || []; updateAnswer(section.id, { ...ans, [q.id]: arr.includes(oi) ? arr.filter((x: number) => x !== oi) : [...arr, oi] }); } }} className="text-indigo-600" /><span className="text-sm">{opt}</span></label>); })}</div>))}
              
              {section.type === "drag_drop" && section.data?.categories && <DragDropSection section={section} answer={sectionAnswers[section.id] || {}} setAnswer={(a) => updateAnswer(section.id, a)} />}
            </div>
          )}

          {!submitted && (<div className="flex gap-3 mt-4"><button onClick={() => setCurrentSection(Math.max(0, currentSection - 1))} disabled={currentSection === 0} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 disabled:opacity-50">← Назад</button>{currentSection < sections.length - 1 ? <button onClick={() => setCurrentSection(currentSection + 1)} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600">Далее →</button> : <button onClick={submitAnswer} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600">📤 Отправить</button>}</div>)}
        </div>
      </div>
    </div>
  );
}