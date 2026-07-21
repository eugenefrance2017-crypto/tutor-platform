"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import ChemicalInput from "@/components/ChemicalInput";

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

const PROBLEM_TYPES = {
  mass_fraction: { name: "Массовая доля", icon: "📊", unit: "%" },
  moles: { name: "Количество вещества", icon: "🧪", unit: "моль" },
  mass: { name: "Масса вещества", icon: "⚖️", unit: "г" },
  volume: { name: "Объём газа", icon: "💨", unit: "л" },
  yield: { name: "Выход продукта", icon: "🎯", unit: "%" },
};

function CalcContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);

  const [problemType, setProblemType] = useState<keyof typeof PROBLEM_TYPES>("mass_fraction");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [problemText, setProblemText] = useState("");
  const [answer, setAnswer] = useState("");
  const [solution, setSolution] = useState("");

  const [userAnswer, setUserAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const [stats, setStats] = useState({ solved: 0, correct: 0 });
  const [blitzMode, setBlitzMode] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzTime, setBlitzTime] = useState(120);
  const [blitzGameOver, setBlitzGameOver] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`calc_stats_${uid}`);
      if (saved) setStats(JSON.parse(saved));
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let unsubscribe: () => void;
    if (role === "student") {
      getDoc(doc(db, "profiles", uid)).then((snap) => {
        const tid = snap.exists() ? (snap.data().tutor_id || uid) : uid;
        setTutorId(tid);
        unsubscribe = onSnapshot(query(collection(db, "calc_problems"), where("tutor_id", "==", tid)), (snap) => {
          setProblems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "calc_problems"), where("tutor_id", "==", uid)), (snap) => {
        setProblems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
      }, () => setLoading(false));
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [uid, role]);

  useEffect(() => {
    if (!blitzMode || blitzGameOver) return;
    if (blitzTime <= 0) { setBlitzGameOver(true); return; }
    const timer = setInterval(() => setBlitzTime(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [blitzMode, blitzGameOver, blitzTime]);

  function resetForm() {
    setProblemType("mass_fraction"); setTitle(""); setDifficulty(1); setTags([]);
    setProblemText(""); setAnswer(""); setSolution(""); setEditingId(null);
  }

  function editProblem(p: any) {
    setProblemType(p.type || "mass_fraction"); setTitle(p.title || "");
    setDifficulty(p.difficulty || 1); setTags(p.tags || []);
    setProblemText(p.problem_text || ""); setAnswer(p.answer || "");
    setSolution(p.solution || ""); setEditingId(p.id); setShowAddForm(true);
  }

  async function saveProblem() {
    if (!title.trim() || !problemText.trim() || !answer.trim()) {
      toast.error("Заполните все поля!"); return;
    }
    const data = {
      tutor_id: uid, type: problemType, title, difficulty,
      tags: tags.filter(t => t.trim()), problem_text: problemText,
      answer: answer.trim(), solution, updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) { await updateDoc(doc(db, "calc_problems", editingId), data); toast.success("✨ Обновлено!"); }
      else { await addDoc(collection(db, "calc_problems"), { ...data, created_at: new Date().toISOString() }); toast.success("🧮 Добавлено!"); }
      setShowAddForm(false); resetForm();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteProblem(id: string) {
    if (!window.confirm("Удалить?")) return;
    try { await deleteDoc(doc(db, "calc_problems", id)); toast.success("🗑️ Удалено!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startProblem(p: any) {
    setSelectedProblem(p); setUserAnswer(""); setChecked(false); setIsCorrect(false); setShowSolution(false);
  }

  function checkAnswer() {
    if (!selectedProblem) return;
    const userNum = parseFloat(userAnswer.replace(",", ".").trim());
    const correctNum = parseFloat(selectedProblem.answer.replace(",", ".").trim());
    const tolerance = Math.abs(correctNum * 0.01);
    const correct = !isNaN(userNum) && !isNaN(correctNum) && Math.abs(userNum - correctNum) <= Math.max(tolerance, 0.01);
    setIsCorrect(correct); setChecked(true);
    const newStats = { solved: stats.solved + 1, correct: stats.correct + (correct ? 1 : 0) };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`calc_stats_${uid}`, JSON.stringify(newStats));
    if (blitzMode) {
      if (correct) { setBlitzScore(s => s + 10); toast.success(`⭐ +10!`); setTimeout(() => nextRandom(), 800); }
      else { toast.error(`✨ Правильно: ${selectedProblem.answer}`); setTimeout(() => nextRandom(), 1200); }
    } else {
      if (correct) toast.success("⭐ Верно!");
      else toast.error(`✨ Правильно: ${selectedProblem.answer} ${PROBLEM_TYPES[selectedProblem.type as keyof typeof PROBLEM_TYPES].unit}`);
    }
  }

  function nextRandom() {
    if (problems.length === 0) return;
    const others = problems.filter(p => p.id !== selectedProblem?.id);
    const random = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : problems[0];
    startProblem(random);
  }

  function startBlitz() {
    if (problems.length < 3) { toast.error("Нужно минимум 3 задачи!"); return; }
    setBlitzScore(0); setBlitzTime(120); setBlitzGameOver(false); setBlitzMode(true);
    nextRandom();
  }

  function stopBlitz() { setBlitzMode(false); setBlitzGameOver(false); setSelectedProblem(null); }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">🧮</div>
        <div className="absolute bottom-20 right-10 text-6xl">⚗️</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
      </div>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/trainers?uid=${uid}&role=${role}`} className="text-purple-700 hover:text-purple-900 transition font-medium flex items-center gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition">←</span> Назад
          </Link>
          <div className="text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-3xl animate-float">🧮</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Расчётные задачи</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          <div className="flex gap-2">
            {problems.length >= 3 && !blitzMode && <button onClick={startBlitz} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">⚡ Блиц</button>}
            {role === "tutor" && <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">+ Задача</button>}
          </div>
        </div>

        {role === "student" && !blitzMode && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-purple-200">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved}</p><p className="text-xs text-gray-700 font-medium">Решено</p></div>
              <div className="text-center"><p className="text-3xl font-black text-emerald-600">{stats.correct}</p><p className="text-xs text-gray-700 font-medium">Верно</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved > 0 ? Math.round((stats.correct / stats.solved) * 100) : 0}%</p><p className="text-xs text-gray-700 font-medium">Точность</p></div>
            </div>
          </div>
        )}

        {blitzMode && !blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-black ${blitzTime <= 30 ? 'text-red-600 animate-pulse' : 'text-purple-700'}`}>⏱️ {Math.floor(blitzTime / 60)}:{String(blitzTime % 60).padStart(2, '0')}</div>
              <div className="text-lg font-bold text-purple-700">⭐ {blitzScore}</div>
              <button onClick={stopBlitz} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">Выйти</button>
            </div>
          </div>
        )}

        {blitzMode && blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 mb-4 border border-purple-200 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-2xl font-black text-gray-900 mb-2">Время вышло!</p>
            <p className="text-lg text-purple-700 font-bold mb-4">⭐ {blitzScore} очков</p>
            <div className="flex gap-2 justify-center">
              <button onClick={startBlitz} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">🔄 Ещё раз</button>
              <button onClick={stopBlitz} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Выйти</button>
            </div>
          </div>
        )}

        {role === "tutor" && showAddForm && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-purple-200">
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать задачу" : "🧮 Новая расчётная задача"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-purple-700 font-medium">📝 Название</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Массовая доля соли в растворе" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-purple-700 font-medium">🎯 Тип задачи</label>
                  <select value={problemType} onChange={(e) => setProblemType(e.target.value as any)} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900">
                    {Object.entries(PROBLEM_TYPES).map(([key, val]) => (<option key={key} value={key}>{val.icon} {val.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-purple-700 font-medium">⭐ Сложность</label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3].map(level => (
                      <button key={level} type="button" onClick={() => setDifficulty(level as 1 | 2 | 3)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${difficulty === level ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{"⭐".repeat(level)}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">🏷️ Теги</label>
                <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="растворы, концентрации" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <ChemicalInput value={problemText} onChange={setProblemText} label="📜 Условие задачи" placeholder="Вычислите массовую долю NaCl в растворе..." multiline rows={4} />
              <div>
                <label className="text-xs text-purple-700 font-medium">✅ Правильный ответ ({PROBLEM_TYPES[problemType].unit})</label>
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="15.5" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 font-mono text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">💡 Пошаговое решение</label>
                <textarea value={solution} onChange={(e) => setSolution(e.target.value)} placeholder={"1. Находим массу раствора...\n2. Вычисляем массовую долю..."} rows={5} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProblem} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">💾 {editingId ? "Обновить" : "Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && selectedProblem && !blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{PROBLEM_TYPES[selectedProblem.type as keyof typeof PROBLEM_TYPES].icon}</span>
                <h2 className="font-bold text-xl text-gray-900">{selectedProblem.title}</h2>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">{"⭐".repeat(selectedProblem.difficulty || 1)}</span>
                {!blitzMode && <button onClick={() => setSelectedProblem(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕</button>}
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 mb-6 border border-purple-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedProblem.problem_text}</p>
            </div>
            {!checked && (
              <div className="mb-6">
                <label className="text-sm text-gray-700 font-medium mb-2 block">💭 Ваш ответ ({PROBLEM_TYPES[selectedProblem.type as keyof typeof PROBLEM_TYPES].unit}):</label>
                <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkAnswer()} placeholder="Введите число..." className="w-full border-2 border-dashed border-purple-300 rounded-xl p-4 text-lg font-mono text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition" autoFocus />
                <button onClick={checkAnswer} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300">✅ Проверить</button>
              </div>
            )}
            {checked && (
              <>
                <div className={`p-6 rounded-2xl mb-4 text-center ${isCorrect ? "bg-emerald-50 border-2 border-emerald-300" : "bg-red-50 border-2 border-red-300"}`}>
                  <p className="text-4xl mb-2">{isCorrect ? "⭐" : "✨"}</p>
                  <p className="text-xl font-black mb-1 text-gray-900">{isCorrect ? "Верно!" : "Неверно"}</p>
                  {!isCorrect && <p className="text-sm text-gray-700">Правильный ответ: <span className="font-mono font-bold">{selectedProblem.answer} {PROBLEM_TYPES[selectedProblem.type as keyof typeof PROBLEM_TYPES].unit}</span></p>}
                </div>
                {selectedProblem.solution && (
                  <div className="mb-4">
                    <button onClick={() => setShowSolution(!showSolution)} className="w-full bg-amber-100 text-amber-800 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition">{showSolution ? "🙈 Скрыть решение" : "💡 Показать решение"}</button>
                    {showSolution && <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4"><pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{selectedProblem.solution}</pre></div>}
                  </div>
                )}
                {!blitzMode && (
                  <div className="flex gap-2">
                    <button onClick={nextRandom} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🎲 Следующая задача</button>
                    <button onClick={() => { setChecked(false); setUserAnswer(""); setShowSolution(false); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">🔄 Ещё раз</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedProblem && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-purple-200">
                <p className="text-6xl mb-4">🧮</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первую задачу!" : "Пока нет задач"}</p>
              </div>
            ) : (
              problems.map((p) => (
                <div key={p.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-purple-200 hover:border-purple-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">{PROBLEM_TYPES[p.type as keyof typeof PROBLEM_TYPES].icon}</span>
                      <h3 className="font-bold text-gray-900 text-sm flex-1">{p.title}</h3>
                    </div>
                    <span className="text-xs ml-2">{"⭐".repeat(p.difficulty || 1)}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{p.problem_text}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{PROBLEM_TYPES[p.type as keyof typeof PROBLEM_TYPES].name}</span>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex gap-1">{p.tags.slice(0, 2).map((tag: string, i: number) => (<span key={i} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">#{tag}</span>))}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startProblem(p)} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2 rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startProblem(p)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">👁️</button>
                        <button onClick={() => editProblem(p)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteProblem(p.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } } .animate-float { animation: float 3s ease-in-out infinite; } .delay-100 { animation-delay: 0.1s; }`}</style>
    </div>
  );
}

export default function CalcTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <CalcContent />
    </Suspense>
  );
}