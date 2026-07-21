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

const MODES = {
  oxide_type: { name: "Тип оксида", icon: "🔴", color: "bg-red-100 text-red-800", desc: "Основный / Кислотный / Амфотерный", options: [{ value: "basic", label: "Основный", icon: "🔵" }, { value: "acidic", label: "Кислотный", icon: "🔴" }, { value: "amphoteric", label: "Амфотерный", icon: "🟣" }, { value: "neutral", label: "Несолеобразующий", icon: "⚪" }] },
  oxidation_state: { name: "Степень окисления", icon: "⚡", color: "bg-amber-100 text-amber-800", desc: "Определите СО элемента", options: [] },
  element_props: { name: "Свойства элемента", icon: "🧬", color: "bg-blue-100 text-blue-800", desc: "Металл/неметалл", options: [{ value: "metal", label: "Металл", icon: "🔵" }, { value: "nonmetal", label: "Неметалл", icon: "🔴" }, { value: "metalloid", label: "Полуметалл", icon: "🟣" }] },
  crystal_lattice: { name: "Кристаллическая решётка", icon: "💎", color: "bg-purple-100 text-purple-800", desc: "Тип решётки", options: [{ value: "ionic", label: "Ионная", icon: "⚡" }, { value: "atomic", label: "Атомная", icon: "🔬" }, { value: "molecular", label: "Молекулярная", icon: "🫧" }, { value: "metallic", label: "Металлическая", icon: "🔩" }] },
  properties: { name: "Химические свойства", icon: "⚗️", color: "bg-green-100 text-green-800", desc: "С чем реагирует", options: [] },
  acid_base: { name: "Кислоты и основания", icon: "🧪", color: "bg-pink-100 text-pink-800", desc: "Сильная/слабая", options: [] },
};

function InorganicContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<keyof typeof MODES | "all">("all");

  const [cardMode, setCardMode] = useState<keyof typeof MODES>("oxide_type");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);

  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [userMultipleAnswers, setUserMultipleAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const [stats, setStats] = useState({ solved: 0, correct: 0 });
  const [modeStats, setModeStats] = useState<Record<string, { solved: number; correct: number }>>({});
  const [blitzMode, setBlitzMode] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzTime, setBlitzTime] = useState(60);
  const [blitzGameOver, setBlitzGameOver] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`inorganic_stats_${uid}`);
      if (saved) setStats(JSON.parse(saved));
      const savedModes = localStorage.getItem(`inorganic_mode_stats_${uid}`);
      if (savedModes) setModeStats(JSON.parse(savedModes));
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let unsubscribe: () => void;
    if (role === "student") {
      getDoc(doc(db, "profiles", uid)).then((snap) => {
        const tid = snap.exists() ? (snap.data().tutor_id || uid) : uid;
        setTutorId(tid);
        unsubscribe = onSnapshot(query(collection(db, "inorganic_cards"), where("tutor_id", "==", tid)), (snap) => {
          setCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "inorganic_cards"), where("tutor_id", "==", uid)), (snap) => {
        setCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
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

  const filteredCards = filterMode === "all" ? cards : cards.filter(c => c.mode === filterMode);

  function resetForm() {
    setCardMode("oxide_type"); setQuestion(""); setAnswer("");
    setOptions([]); setExplanation(""); setDifficulty(1); setTags([]); setEditingId(null);
  }

  function editCard(card: any) {
    setCardMode(card.mode || "oxide_type"); setQuestion(card.question || "");
    setAnswer(card.answer || ""); setOptions(card.options || []);
    setExplanation(card.explanation || ""); setDifficulty(card.difficulty || 1);
    setTags(card.tags || []); setEditingId(card.id); setShowAddForm(true);
  }

  async function saveCard() {
    if (!question.trim() || !answer.trim()) { toast.error("Заполните все поля!"); return; }
    const data = {
      tutor_id: uid, mode: cardMode, question, answer,
      options: options.filter(o => o.trim()), explanation, difficulty,
      tags: tags.filter(t => t.trim()), updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) { await updateDoc(doc(db, "inorganic_cards", editingId), data); toast.success("✨ Обновлено!"); }
      else { await addDoc(collection(db, "inorganic_cards"), { ...data, created_at: new Date().toISOString() }); toast.success("🧪 Добавлено!"); }
      setShowAddForm(false); resetForm();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteCard(id: string) {
    if (!window.confirm("Удалить?")) return;
    try { await deleteDoc(doc(db, "inorganic_cards", id)); toast.success("🗑️ Удалено!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startCard(card: any) {
    setSelectedCard(card); setUserAnswer(null); setUserMultipleAnswers([]);
    setChecked(false); setIsCorrect(false);
  }

  function checkAnswer() {
    if (!selectedCard) return;
    let correct = false;
    if (selectedCard.options && selectedCard.options.length > 0 && selectedCard.answer.includes(",")) {
      const correctSet = new Set(selectedCard.answer.split(",").map((s: string) => s.trim().toLowerCase()));
      const userSet = new Set(userMultipleAnswers.map(a => a.toLowerCase()));
      correct = correctSet.size === userSet.size && [...correctSet].every(v => userSet.has(v));
    } else {
      correct = (userAnswer || "").toLowerCase().trim() === selectedCard.answer.toLowerCase().trim();
    }
    setIsCorrect(correct); setChecked(true);
    const newStats = { solved: stats.solved + 1, correct: stats.correct + (correct ? 1 : 0) };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`inorganic_stats_${uid}`, JSON.stringify(newStats));
    const mode = selectedCard.mode;
    const newModeStats = { ...modeStats };
    if (!newModeStats[mode]) newModeStats[mode] = { solved: 0, correct: 0 };
    newModeStats[mode].solved += 1;
    if (correct) newModeStats[mode].correct += 1;
    setModeStats(newModeStats);
    if (typeof window !== "undefined") localStorage.setItem(`inorganic_mode_stats_${uid}`, JSON.stringify(newModeStats));
    if (blitzMode) {
      if (correct) { setBlitzScore(s => s + 10); toast.success(`⭐ +10!`); setTimeout(() => nextRandom(), 800); }
      else { toast.error(`✨ Правильно: ${selectedCard.answer}`); setTimeout(() => nextRandom(), 1200); }
    } else {
      if (correct) toast.success("⭐ Верно!");
      else toast.error(`✨ Правильно: ${selectedCard.answer}`);
    }
  }

  function nextRandom() {
    const pool = filteredCards.length > 0 ? filteredCards : cards;
    if (pool.length === 0) return;
    const others = pool.filter(c => c.id !== selectedCard?.id);
    const random = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : pool[0];
    startCard(random);
  }

  function startBlitz() {
    const pool = filteredCards.length > 0 ? filteredCards : cards;
    if (pool.length < 3) { toast.error("Нужно минимум 3 карточки!"); return; }
    setBlitzScore(0); setBlitzTime(60); setBlitzGameOver(false); setBlitzMode(true);
    nextRandom();
  }

  function stopBlitz() { setBlitzMode(false); setBlitzGameOver(false); setSelectedCard(null); }

  function getOptionsForCard(card: any): { value: string; label: string; icon?: string }[] {
    const modeConfig = MODES[card.mode as keyof typeof MODES];
    if (!modeConfig) return [];
    if (card.options && card.options.length > 0) return card.options.map((opt: string) => ({ value: opt, label: opt }));
    return modeConfig.options || [];
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">🧪</div>
        <div className="absolute bottom-20 right-10 text-6xl">⚗️</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
        <div className="absolute bottom-1/3 right-1/4 text-7xl">💎</div>
      </div>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/trainers?uid=${uid}&role=${role}`} className="text-purple-700 hover:text-purple-900 transition font-medium flex items-center gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition">←</span> Назад
          </Link>
          <div className="text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-3xl animate-float">🧪</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Неорганика</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          <div className="flex gap-2">
            {cards.length >= 3 && !blitzMode && <button onClick={startBlitz} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">⚡ Блиц</button>}
            {role === "tutor" && <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">+ Карточка</button>}
          </div>
        </div>

        {role === "student" && !blitzMode && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-purple-200">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved}</p><p className="text-xs text-gray-700 font-medium">Решено</p></div>
              <div className="text-center"><p className="text-3xl font-black text-emerald-600">{stats.correct}</p><p className="text-xs text-gray-700 font-medium">Верно</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved > 0 ? Math.round((stats.correct / stats.solved) * 100) : 0}%</p><p className="text-xs text-gray-700 font-medium">Точность</p></div>
            </div>
            {Object.keys(modeStats).length > 0 && (
              <div className="pt-4 border-t border-purple-200">
                <p className="text-xs text-gray-600 font-medium mb-2">📊 По темам:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(modeStats).map(([mode, data]) => (
                    <div key={mode} className="bg-purple-50 rounded-lg p-2">
                      <p className="text-xs font-bold text-purple-800 truncate">{MODES[mode as keyof typeof MODES]?.icon} {MODES[mode as keyof typeof MODES]?.name}</p>
                      <p className="text-[10px] text-gray-600">{data.correct}/{data.solved} ({data.solved > 0 ? Math.round((data.correct / data.solved) * 100) : 0}%)</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {!selectedCard && !showAddForm && (
          <div className="mb-6">
            <p className="text-xs text-gray-600 font-medium mb-2">🎯 Фильтр по теме:</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterMode("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterMode === "all" ? "bg-purple-600 text-white" : "bg-white/60 text-gray-700 hover:bg-white"}`}>🌐 Все ({cards.length})</button>
              {Object.entries(MODES).map(([key, val]) => {
                const count = cards.filter(c => c.mode === key).length;
                if (count === 0 && role !== "tutor") return null;
                return <button key={key} onClick={() => setFilterMode(key as any)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterMode === key ? "bg-purple-600 text-white" : "bg-white/60 text-gray-700 hover:bg-white"}`}>{val.icon} {val.name} ({count})</button>;
              })}
            </div>
          </div>
        )}

        {role === "tutor" && showAddForm && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-purple-200">
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать" : "🧪 Новая карточка"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-purple-700 font-medium">🎯 Тип задания</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                  {Object.entries(MODES).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => setCardMode(key as any)} className={`p-2 rounded-lg text-xs font-medium transition text-left ${cardMode === key ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                      <div className="flex items-center gap-1 mb-1"><span>{val.icon}</span><span className="font-bold">{val.name}</span></div>
                      <p className={`text-[10px] ${cardMode === key ? 'text-purple-100' : 'text-gray-500'}`}>{val.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <ChemicalInput value={question} onChange={setQuestion} label="❓ Вопрос / формула" placeholder={cardMode === "oxide_type" ? "Na₂O" : cardMode === "oxidation_state" ? "Определите СО серы в H₂SO₄" : "Введите вопрос..."} multiline rows={2} />
              <div>
                <label className="text-xs text-purple-700 font-medium">✅ Правильный ответ</label>
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={cardMode === "properties" ? "H₂O, HCl, CuSO₄" : "basic"} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                {cardMode === "properties" && <p className="text-[10px] text-gray-500 mt-1">💡 Для множественного выбора разделяйте запятой</p>}
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">📋 Свои варианты ответов</label>
                <input value={options.join(", ")} onChange={(e) => setOptions(e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Вариант 1, Вариант 2" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">💡 Объяснение</label>
                <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Na₂O — основной оксид..." rows={2} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
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
                  <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="ЕГЭ-8" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveCard} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">💾 {editingId ? "Обновить" : "Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && selectedCard && !blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{MODES[selectedCard.mode as keyof typeof MODES]?.icon}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${MODES[selectedCard.mode as keyof typeof MODES]?.color}`}>{MODES[selectedCard.mode as keyof typeof MODES]?.name}</span>
              </div>
              {!blitzMode && <button onClick={() => setSelectedCard(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕</button>}
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 mb-6 border border-purple-200 text-center">
              <p className="text-xs text-purple-700 font-medium mb-2">❓ Вопрос:</p>
              <p className="text-2xl font-bold text-gray-900 whitespace-pre-wrap">{selectedCard.question}</p>
            </div>
            {!checked && (() => {
              const cardOptions = getOptionsForCard(selectedCard);
              const isMultiple = selectedCard.answer.includes(",");
              if (cardOptions.length > 0 && !isMultiple) {
                return (
                  <div className="mb-6">
                    <p className="text-sm text-gray-700 font-medium mb-3">💭 Выберите ответ:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cardOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setUserAnswer(opt.value)} className={`p-4 rounded-xl text-sm font-medium transition border-2 text-left ${userAnswer === opt.value ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-gray-800 border-purple-200 hover:border-purple-400 hover:bg-purple-50'}`}>{opt.icon && <span className="mr-2">{opt.icon}</span>}{opt.label}</button>
                      ))}
                    </div>
                    <button onClick={checkAnswer} disabled={userAnswer === null} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">✅ Проверить</button>
                  </div>
                );
              } else if (isMultiple && cardOptions.length > 0) {
                return (
                  <div className="mb-6">
                    <p className="text-sm text-gray-700 font-medium mb-3">💭 Выберите все правильные ответы:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cardOptions.map((opt) => {
                        const isSelected = userMultipleAnswers.includes(opt.value);
                        return <button key={opt.value} onClick={() => { if (isSelected) setUserMultipleAnswers(userMultipleAnswers.filter(a => a !== opt.value)); else setUserMultipleAnswers([...userMultipleAnswers, opt.value]); }} className={`p-4 rounded-xl text-sm font-medium transition border-2 text-left ${isSelected ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-gray-800 border-purple-200 hover:border-purple-400 hover:bg-purple-50'}`}>{opt.icon && <span className="mr-2">{opt.icon}</span>}{opt.label}</button>;
                      })}
                    </div>
                    <button onClick={checkAnswer} disabled={userMultipleAnswers.length === 0} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">✅ Проверить</button>
                  </div>
                );
              } else {
                return (
                  <div className="mb-6">
                    <label className="text-sm text-gray-700 font-medium mb-2 block">💭 Ваш ответ:</label>
                    <ChemicalInput value={userAnswer || ""} onChange={(v) => setUserAnswer(v)} placeholder="Введите ответ..." />
                    <button onClick={checkAnswer} disabled={!userAnswer?.trim()} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">✅ Проверить</button>
                  </div>
                );
              }
            })()}
            {checked && (
              <>
                <div className={`p-6 rounded-2xl mb-4 text-center ${isCorrect ? "bg-emerald-50 border-2 border-emerald-300" : "bg-red-50 border-2 border-red-300"}`}>
                  <p className="text-4xl mb-2">{isCorrect ? "⭐" : "✨"}</p>
                  <p className="text-xl font-black mb-1 text-gray-900">{isCorrect ? "Верно!" : "Неверно"}</p>
                  {!isCorrect && <p className="text-sm text-gray-700">Правильный ответ: <span className="font-bold">{selectedCard.answer}</span></p>}
                </div>
                {selectedCard.explanation && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <p className="text-xs text-amber-800 font-medium mb-1">💡 Объяснение:</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedCard.explanation}</p>
                  </div>
                )}
                {!blitzMode && (
                  <div className="flex gap-2">
                    <button onClick={nextRandom} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🎲 Следующая</button>
                    <button onClick={() => { setChecked(false); setUserAnswer(null); setUserMultipleAnswers([]); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">🔄 Ещё раз</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedCard && !showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-purple-200">
                <p className="text-6xl mb-4">🧪</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первую карточку!" : "В этой категории пока нет карточек"}</p>
              </div>
            ) : (
              filteredCards.map((card) => (
                <div key={card.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-purple-200 hover:border-purple-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${MODES[card.mode as keyof typeof MODES]?.color}`}>{MODES[card.mode as keyof typeof MODES]?.icon} {MODES[card.mode as keyof typeof MODES]?.name}</span>
                    <span className="text-xs">{"⭐".repeat(card.difficulty || 1)}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">{card.question}</p>
                  <div className="mb-2">
                    <p className="text-xs text-gray-600">Ответ:</p>
                    <p className="text-sm font-mono font-bold text-purple-700 truncate">{card.answer}</p>
                  </div>
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {card.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startCard(card)} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2 rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startCard(card)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">👁️</button>
                        <button onClick={() => editCard(card)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteCard(card.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
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

export default function InorganicTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <InorganicContent />
    </Suspense>
  );
}