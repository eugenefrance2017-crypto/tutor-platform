"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function AIGeneratorContent() {
  const searchParams = useSearchParams(); const uid = searchParams.get("uid") || ""; const role = searchParams.get("role") || "tutor";
  const [topic, setTopic] = useState(""); const [subject, setSubject] = useState("chemistry"); const [type, setType] = useState("text");
  const [count, setCount] = useState(3); const [exam, setExam] = useState("ege"); const [taskNumber, setTaskNumber] = useState("");
  const [loading, setLoading] = useState(false); const [generated, setGenerated] = useState<any[]>([]);

  async function generate() { if (!topic.trim()) return toast.error("Введите тему!"); setLoading(true); try { const res = await fetch("/api/generate-task", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, subject, type, count, exam, taskNumber: taskNumber || null }) }); const data = await res.json(); if (data.error) throw new Error(data.error); setGenerated(data.tasks); toast.success(`Сгенерировано ${data.tasks.length} заданий!`); } catch (error: any) { toast.error(error.message || "Ошибка генерации"); } finally { setLoading(false); } }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6"><Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600">← Назад</Link><h1 className="text-2xl font-bold">🤖 ИИ-генератор</h1><div></div></div>
        <div className="bg-white/90 rounded-3xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm">Экзамен</label><select value={exam} onChange={(e) => setExam(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="ege">📕 ЕГЭ</option><option value="oge">📗 ОГЭ</option></select></div>
            <div><label className="text-sm">Предмет</label><select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="chemistry">🧪 Химия</option><option value="biology">🧬 Биология</option></select></div>
            <div><label className="text-sm">Тип</label><select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm mt-1"><option value="text">📝 Текст</option><option value="single_choice">🔘 Тест (один)</option><option value="multi_choice">☑️ Тест (несколько)</option></select></div>
            <div><label className="text-sm">Количество</label><input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)} min={1} max={10} className="w-full border rounded-xl p-2.5 text-sm mt-1" /></div>
            <div className="sm:col-span-2"><label className="text-sm">Тема</label><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Напр.: Окислительно-восстановительные реакции" className="w-full border rounded-xl p-2.5 text-sm mt-1" /></div>
          </div>
          <button onClick={generate} disabled={loading} className="w-full bg-violet-500 text-white py-3 rounded-xl font-medium hover:bg-violet-600 disabled:opacity-50">{loading ? "⏳ Генерирую..." : "🤖 Сгенерировать"}</button>
        </div>
        {generated.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">📋 Результаты</h2>
            {generated.map((task, idx) => (
              <div key={idx} className="bg-white/90 rounded-2xl shadow-lg p-5">
                <div className="flex justify-between mb-2"><h3 className="font-semibold">{task.title || `Задание ${idx + 1}`}</h3><span className="text-xs px-2 py-1 bg-violet-100 rounded-full">{task.max_score} баллов</span></div>
                {task.task_text && <p className="text-sm text-gray-600 mb-3">{task.task_text}</p>}
                {task.correct_answer && <p className="text-sm text-emerald-600 mt-2">✅ Ответ: {task.correct_answer}</p>}
                {task.explanation && <p className="text-xs text-gray-500 mt-2">💡 {task.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIGeneratorPage() { return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><AIGeneratorContent /></Suspense>); }