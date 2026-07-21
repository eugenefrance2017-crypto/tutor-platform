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

const CLASSES = {
  acid: { name: "Карбоновые кислоты", icon: "🧪", color: "bg-red-100 text-red-800" },
  aldehyde: { name: "Альдегиды", icon: "🟠", color: "bg-orange-100 text-orange-800" },
  ketone: { name: "Кетоны", icon: "🟡", color: "bg-yellow-100 text-yellow-800" },
  alcohol: { name: "Спирты", icon: "🔴", color: "bg-pink-100 text-pink-800" },
  hydrocarbon: { name: "Углеводороды", icon: "🔵", color: "bg-blue-100 text-blue-800" },
  amine: { name: "Амины", icon: "⚪", color: "bg-gray-100 text-gray-800" },
  ester: { name: "Эфиры", icon: "🟤", color: "bg-amber-100 text-amber-800" },
  other: { name: "Прочее", icon: "🟣", color: "bg-purple-100 text-purple-800" },
};

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().replace(/ё/g, "е").replace(/[-\s]/g, "").replace(/[.,!?]/g, "");
}

function TrivialNamesContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [className, setClassName] = useState<keyof typeof CLASSES>("acid");
  const [trivial, setTrivial] = useState("");
  const [systematic, setSystematic] = useState("");
  const [formula, setFormula] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<"trivial_to_systematic" | "systematic_to_trivial" | "formula_to_trivial">("trivial_to_systematic");

  const [userAnswer, setUserAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const [stats, setStats] = useState({ solved: 0, correct: 0 });
  const [blitzMode, setBlitzMode] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzTime, setBlitzTime] = useState(60);
  const [blitzGameOver, setBlitzGameOver] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`trivial_stats_${uid}`);
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
        unsubscribe = onSnapshot(query(collection(db, "trivial_names"), where("tutor_id", "==", tid)), (snap) => {
          setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "trivial_names"), where("tutor_id", "==", uid)), (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
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
    setClassName("acid"); setTrivial(""); setSystematic(""); setFormula("");
    setDifficulty(1); setTags([]); setMode("trivial_to_systematic"); setEditingId(null);
  }

  function editItem(item: any) {
    setClassName(item.class || "acid"); setTrivial(item.trivial || "");
    setSystematic(item.systematic || ""); setFormula(item.formula || "");
    setDifficulty(item.difficulty || 1); setTags(item.tags || []);
    setMode(item.mode || "trivial_to_systematic");
    setEditingId(item.id); setShowAddForm(true);
  }

  async function saveItem() {
    if (!trivial.trim() || !systematic.trim()) { toast.error("Заполните оба названия!"); return; }
    const data = {
      tutor_id: uid, class: className, trivial, systematic, formula,
      difficulty, tags: tags.filter(t => t.trim()), mode,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) { await updateDoc(doc(db, "trivial_names", editingId), data); toast.success("✨ Обновлено!"); }
      else { await addDoc(collection(db, "trivial_names"), { ...data, created_at: new Date().toISOString() }); toast.success("📛 Добавлено!"); }
      setShowAddForm(false); resetForm();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Удалить?")) return;
    try { await deleteDoc(doc(db, "trivial_names", id)); toast.success("🗑️ Удалено!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startItem(item: any) {
    setSelectedItem(item); setUserAnswer(""); setChecked(false); setIsCorrect(false);
  }

  function getCorrectAnswer(item: any): string {
    if (item.mode === "trivial_to_systematic") return item.systematic;
    if (item.mode === "systematic_to_trivial") return item.trivial;
    return item.trivial;
  }

  function getQuestionText(item: any): string {
    if (item.mode === "trivial_to_systematic") return item.trivial;
    if (item.mode === "systematic_to_trivial") return item.systematic;
    return item.formula;
  }

  function getQuestionLabel(item: any): string {
    if (item.mode === "trivial_to_systematic") return "📛 Тривиальное название:";
    if (item.mode === "systematic_to_trivial") return "🧪 Систематическое название:";
    return "🧪 Химическая формула:";
  }

  function checkAnswer() {
    if (!selectedItem) return;
    const correctAnswer = getCorrectAnswer(selectedItem);
    const correct = normalizeName(userAnswer) === normalizeName(correctAnswer);
    setIsCorrect(correct); setChecked(true);
    const newStats = { solved: stats.solved + 1, correct: stats.correct + (correct ? 1 : 0) };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`trivial_stats_${uid}`, JSON.stringify(newStats));
    if (blitzMode) {
      if (correct) { setBlitzScore(s => s + 10); toast.success(`⭐ +10!`); setTimeout(() => nextRandom(), 800); }
      else { toast.error(`✨ Правильно: ${correctAnswer}`); setTimeout(() => nextRandom(), 1200); }
    } else {
      if (correct) toast.success("⭐ Верно!");
      else toast.error(`✨ Правильно: ${correctAnswer}`);
    }
  }

  function nextRandom() {
    if (items.length === 0) return;
    const others = items.filter(i => i.id !== selectedItem?.id);
    const random = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : items[0];
    startItem(random);
  }

  function startBlitz() {
    if (items.length < 3) { toast.error("Нужно минимум 3 элемента!"); return; }
    setBlitzScore(0); setBlitzTime(60); setBlitzGameOver(false); setBlitzMode(true);
    nextRandom();
  }

  function stopBlitz() { setBlitzMode(false); setBlitzGameOver(false); setSelectedItem(null); }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">📛</div>
        <div className="absolute bottom-20 right-10 text-6xl">🧪</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
      </div>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/trainers?uid=${uid}&role=${role}`} className="text-purple-700 hover:text-purple-900 transition font-medium flex items-center gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition">←</span> Назад
          </Link>
          <div className="text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-3xl animate-float">📛</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Тривиальные названия</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          <div className="flex gap-2">
            {items.length >= 3 && !blitzMode && <button onClick={startBlitz} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">⚡ Блиц</button>}
            {role === "tutor" && <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">+ Вещество</button>}
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
              <div className={`text-2xl font-black ${blitzTime <= 15 ? 'text-red-600 animate-pulse' : 'text-purple-700'}`}>⏱️ {blitzTime}с</div>
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
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать" : "📛 Новое вещество"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-purple-700 font-medium">🧪 Класс вещества</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                  {Object.entries(CLASSES).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => setClassName(key as any)} className={`py-2 rounded-lg text-xs font-medium transition ${className === key ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{val.icon} {val.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">🎯 Режим тренировки</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                  <button type="button" onClick={() => setMode("trivial_to_systematic")} className={`py-2.5 rounded-lg text-xs font-medium transition ${mode === "trivial_to_systematic" ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>📛 Тривиальное → Систематическое</button>
                  <button type="button" onClick={() => setMode("systematic_to_trivial")} className={`py-2.5 rounded-lg text-xs font-medium transition ${mode === "systematic_to_trivial" ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>🧪 Систематическое → Тривиальное</button>
                  <button type="button" onClick={() => setMode("formula_to_trivial")} className={`py-2.5 rounded-lg text-xs font-medium transition ${mode === "formula_to_trivial" ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>⚗️ Формула → Тривиальное</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">📛 Тривиальное название</label>
                <input value={trivial} onChange={(e) => setTrivial(e.target.value)} placeholder="уксусная кислота" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">🧪 Систематическое название (ИЮПАК)</label>
                <input value={systematic} onChange={(e) => setSystematic(e.target.value)} placeholder="этановая кислота" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <ChemicalInput value={formula} onChange={setFormula} label="⚗️ Химическая формула (необязательно)" placeholder="CH₃COOH" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-purple-700 font-medium">⭐ Сложность</label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3].map(level => (
                      <button key={level} type="button" onClick={() => setDifficulty(level as 1 | 2 | 3)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${difficulty === level ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{"⭐".repeat(level)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-purple-700 font-medium">🏷️ Теги</label>
                  <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="ЕГЭ, органика" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveItem} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">💾 {editingId ? "Обновить" : "Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && selectedItem && !blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CLASSES[selectedItem.class as keyof typeof CLASSES].icon}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${CLASSES[selectedItem.class as keyof typeof CLASSES].color}`}>{CLASSES[selectedItem.class as keyof typeof CLASSES].name}</span>
              </div>
              {!blitzMode && <button onClick={() => setSelectedItem(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕</button>}
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 mb-6 border border-purple-200 text-center">
              <p className="text-xs text-purple-700 font-medium mb-2">{getQuestionLabel(selectedItem)}</p>
              <p className="text-3xl font-bold text-gray-900">{getQuestionText(selectedItem)}</p>
              {selectedItem.formula && selectedItem.mode !== "formula_to_trivial" && (
                <p className="text-sm font-mono text-gray-600 mt-2">⚗️ {selectedItem.formula}</p>
              )}
            </div>
            {!checked && (
              <div className="mb-6">
                <label className="text-sm text-gray-700 font-medium mb-2 block">💭 Ваш ответ:</label>
                <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkAnswer()} placeholder={selectedItem.mode === "trivial_to_systematic" ? "этановая кислота" : "уксусная кислота"} className="w-full border-2 border-dashed border-purple-300 rounded-xl p-4 text-lg text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition" autoFocus />
                <button onClick={checkAnswer} disabled={!userAnswer.trim()} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">✅ Проверить</button>
              </div>
            )}
            {checked && (
              <>
                <div className={`p-6 rounded-2xl mb-4 text-center ${isCorrect ? "bg-emerald-50 border-2 border-emerald-300" : "bg-red-50 border-2 border-red-300"}`}>
                  <p className="text-4xl mb-2">{isCorrect ? "⭐" : "✨"}</p>
                  <p className="text-xl font-black mb-1 text-gray-900">{isCorrect ? "Верно!" : "Неверно"}</p>
                  {!isCorrect && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-gray-700">Тривиальное: <span className="font-bold">{selectedItem.trivial}</span></p>
                      <p className="text-sm text-gray-700">Систематическое: <span className="font-bold">{selectedItem.systematic}</span></p>
                      {selectedItem.formula && <p className="text-sm text-gray-700 font-mono">Формула: {selectedItem.formula}</p>}
                    </div>
                  )}
                </div>
                {!blitzMode && (
                  <div className="flex gap-2">
                    <button onClick={nextRandom} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🎲 Следующее</button>
                    <button onClick={() => { setChecked(false); setUserAnswer(""); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">🔄 Ещё раз</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedItem && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-purple-200">
                <p className="text-6xl mb-4">📛</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первое вещество!" : "Пока нет веществ"}</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-purple-200 hover:border-purple-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${CLASSES[item.class as keyof typeof CLASSES].color}`}>{CLASSES[item.class as keyof typeof CLASSES].icon} {CLASSES[item.class as keyof typeof CLASSES].name}</span>
                    <span className="text-xs">{"⭐".repeat(item.difficulty || 1)}</span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-600">📛 Тривиальное:</p>
                    <p className="text-sm font-bold text-purple-700">{item.trivial}</p>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-600">🧪 Систематическое:</p>
                    <p className="text-sm font-bold text-gray-900">{item.systematic}</p>
                  </div>
                  {item.formula && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600">⚗️ Формула:</p>
                      <p className="text-sm font-mono text-gray-700">{item.formula}</p>
                    </div>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">{item.tags.slice(0, 3).map((tag: string, i: number) => (<span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">#{tag}</span>))}</div>
                  )}
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startItem(item)} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2 rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startItem(item)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">👁️</button>
                        <button onClick={() => editItem(item)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteItem(item.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
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

export default function TrivialNamesTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <TrivialNamesContent />
    </Suspense>
  );
}