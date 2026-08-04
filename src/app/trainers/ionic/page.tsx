"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Edit, Check, X, Droplets, Wind, Palette, AlertCircle } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tutor-platform-a5e37.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tutor-platform-a5e37",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115123071384",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Цвета осадков для ЕГЭ
const PRECIPITATE_COLORS = [
  { value: "white", label: "Белый", example: "AgCl, BaSO₄", color: "bg-gray-100 border-gray-300 text-gray-800" },
  { value: "yellow", label: "Жёлтый", example: "AgI, PbI₂", color: "bg-yellow-100 border-yellow-400 text-yellow-900" },
  { value: "black", label: "Чёрный", example: "CuS, PbS", color: "bg-gray-900 border-gray-700 text-white" },
  { value: "blue", label: "Синий", example: "Cu(OH)₂", color: "bg-blue-200 border-blue-500 text-blue-900" },
  { value: "green", label: "Зелёный", example: "Fe(OH)₂", color: "bg-green-200 border-green-500 text-green-900" },
  { value: "brown", label: "Бурый/Коричневый", example: "Fe(OH)₃", color: "bg-amber-700 border-amber-900 text-white" },
  { value: "red", label: "Красный/Кирпичный", example: "Cu₂O", color: "bg-red-200 border-red-500 text-red-900" },
];

const REACTION_SIGNS = [
  { value: "precipitate", label: "Осадок ↓", icon: <Droplets className="w-4 h-4" /> },
  { value: "gas", label: "Газ ↑", icon: <Wind className="w-4 h-4" /> },
  { value: "color", label: "Изменение окраски", icon: <Palette className="w-4 h-4" /> },
  { value: "none", label: "Нет признаков", icon: <AlertCircle className="w-4 h-4" /> },
];

// ✅ ИСПРАВЛЕННАЯ нормализация: теперь символ ₅ на месте, синтаксическая ошибка устранена
function normalizeIonic(s: string): string {
  return s
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/⁺/g, "+")
    .replace(/⁻/g, "-")
    .replace(/₀/g, "0")
    .replace(/₁/g, "1")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3")
    .replace(/₄/g, "4")
    .replace(/₅/g, "5") // <-- ИСПРАВЛЕНО
    .replace(/₆/g, "6")
    .replace(/₇/g, "7")
    .replace(/₈/g, "8")
    .replace(/₉/g, "9")
    .replace(/→|->|=/g, ">");
}

// ✅ Проверка с учётом того, что порядок ионов не важен
function checkIonicEquality(user: string, correct: string): boolean {
  const normUser = normalizeIonic(user);
  const normCorrect = normalizeIonic(correct);
  if (normUser === normCorrect) return true;
  
  const partsUser = normUser.split(/[+>]/).filter(Boolean).sort();
  const partsCorrect = normCorrect.split(/[+>]/).filter(Boolean).sort();
  return JSON.stringify(partsUser) === JSON.stringify(partsCorrect);
}

function IonicContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [equations, setEquations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  
  // Состояния формы для репетитора
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [substances, setSubstances] = useState<string[]>(["", "", "", "", "", ""]);
  const [correctReactants, setCorrectReactants] = useState<string[]>([]);
  const [molecular, setMolecular] = useState("");
  const [fullIonic, setFullIonic] = useState("");
  const [netIonic, setNetIonic] = useState("");
  const [reactionSign, setReactionSign] = useState("precipitate");
  const [precipitateColor, setPrecipitateColor] = useState("");
  const [hint, setHint] = useState("");

  // Состояния для ученика
  const [selectedEq, setSelectedEq] = useState<any>(null);
  const [userReactants, setUserReactants] = useState<string[]>([]);
  const [userMolecular, setUserMolecular] = useState("");
  const [userFull, setUserFull] = useState("");
  const [userNet, setUserNet] = useState("");
  const [userSign, setUserSign] = useState("");
  const [userPrecipitateColor, setUserPrecipitateColor] = useState("");
  const [checked, setChecked] = useState(false);
  const [scores, setScores] = useState({ reactants: 0, molecular: 0, full: 0, net: 0, sign: 0, color: 0 });

  const [stats, setStats] = useState({ solved: 0, avgScore: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`ionic_stats_${uid}`);
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
        unsubscribe = onSnapshot(query(collection(db, "ionic_equations"), where("tutor_id", "==", tid)), (snap) => {
          setEquations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
          setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "ionic_equations"), where("tutor_id", "==", uid)), (snap) => {
        setEquations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
        setLoading(false);
      }, () => setLoading(false));
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [uid, role]);

  function resetForm() {
    setTitle(""); setDifficulty(1); setTags([]);
    setSubstances(["", "", "", "", "", ""]);
    setCorrectReactants([]);
    setMolecular(""); setFullIonic(""); setNetIonic("");
    setReactionSign("precipitate"); setPrecipitateColor("");
    setHint(""); setEditingId(null);
  }

  function editEq(eq: any) {
    setTitle(eq.title || ""); setDifficulty(eq.difficulty || 1);
    setTags(eq.tags || []);
    setSubstances(eq.substances || ["", "", "", "", "", ""]);
    setCorrectReactants(eq.correct_reactants || []);
    setMolecular(eq.molecular || ""); setFullIonic(eq.full_ionic || ""); 
    setNetIonic(eq.net_ionic || ""); setReactionSign(eq.reaction_sign || "precipitate");
    setPrecipitateColor(eq.precipitate_color || ""); setHint(eq.hint || ""); 
    setEditingId(eq.id); setShowAddForm(true);
  }

  async function saveEq() {
    if (!title.trim() || !netIonic.trim()) {
      toast.error("Заполните название и сокращённое уравнение!"); return;
    }
    const validSubstances = substances.filter(s => s.trim());
    if (validSubstances.length < 2) {
      toast.error("Добавьте минимум 2 вещества!"); return;
    }
    const data = {
      tutor_id: tutorId, title, difficulty, tags: tags.filter(t => t.trim()),
      substances: validSubstances,
      correct_reactants: correctReactants,
      molecular, full_ionic: fullIonic, net_ionic: netIonic,
      reaction_sign: reactionSign,
      precipitate_color: reactionSign === "precipitate" ? precipitateColor : "",
      hint, updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "ionic_equations", editingId), data);
        toast.success("✨ Обновлено!");
      } else {
        await addDoc(collection(db, "ionic_equations"), { ...data, created_at: new Date().toISOString() });
        toast.success("⚗️ Добавлено!");
      }
      setShowAddForm(false); resetForm();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteEq(id: string) {
    if (!window.confirm("Удалить это уравнение?")) return;
    try { await deleteDoc(doc(db, "ionic_equations", id)); toast.success("🗑️ Удалено!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startEq(eq: any) {
    setSelectedEq(eq); 
    setUserReactants([]);
    setUserMolecular(""); setUserFull(""); setUserNet("");
    setUserSign(""); setUserPrecipitateColor("");
    setChecked(false); setScores({ reactants: 0, molecular: 0, full: 0, net: 0, sign: 0, color: 0 });
  }

  function toggleSubstance(sub: string) {
    if (userReactants.includes(sub)) {
      setUserReactants(userReactants.filter(r => r !== sub));
    } else {
      setUserReactants([...userReactants, sub]);
    }
  }

  function checkAnswer() {
    if (!selectedEq) return;
    
    const correctR = selectedEq.correct_reactants || [];
    const userR = userReactants;
    const rCorrect = correctR.length === userR.length && correctR.every(r => userR.includes(r));
    const rScore = rCorrect ? 20 : 0;
    
    const mScore = checkIonicEquality(userMolecular, selectedEq.molecular) ? 20 : 0;
    const fScore = checkIonicEquality(userFull, selectedEq.full_ionic) ? 20 : 0;
    const nScore = checkIonicEquality(userNet, selectedEq.net_ionic) ? 20 : 0;
    
    const sScore = userSign === selectedEq.reaction_sign ? 10 : 0;
    
    let cScore = 0;
    if (selectedEq.reaction_sign === "precipitate" && selectedEq.precipitate_color) {
      cScore = userPrecipitateColor === selectedEq.precipitate_color ? 10 : 0;
    } else {
      cScore = 10;
    }
    
    const total = rScore + mScore + fScore + nScore + sScore + cScore;
    setScores({ reactants: rScore, molecular: mScore, full: fScore, net: nScore, sign: sScore, color: cScore });
    setChecked(true);
    
    const newStats = {
      solved: stats.solved + 1,
      avgScore: Math.round((stats.avgScore * stats.solved + total) / (stats.solved + 1)),
    };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`ionic_stats_${uid}`, JSON.stringify(newStats));
    
    if (total === 100) toast.success("⭐ Идеально! 100%");
    else if (total >= 70) toast.success("🌟 Хорошо!");
    else toast.error("✨ Есть ошибки, смотри разбор");
  }

  function nextRandom() {
    if (equations.length === 0) return;
    const others = equations.filter(e => e.id !== selectedEq?.id);
    const random = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : equations[0];
    startEq(random);
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">⚗️</div>
        <div className="absolute bottom-20 right-10 text-6xl">🧪</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
      </div>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/trainers?uid=${uid}&role=${role}`} className="text-cyan-700 hover:text-cyan-900 transition font-medium flex items-center gap-1 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" /> Назад
          </Link>
          <div className="text-center flex-1">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-3xl animate-float">⚗️</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">Ионные уравнения</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          {role === "tutor" && (
            <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-cyan-700 hover:to-blue-800 transition shadow-lg shadow-cyan-300">+ Уравнение</button>
          )}
        </div>

        {role === "student" && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-cyan-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center"><p className="text-3xl font-black text-cyan-700">{stats.solved}</p><p className="text-xs text-gray-700 font-medium">Решено</p></div>
              <div className="text-center"><p className="text-3xl font-black text-cyan-700">{stats.avgScore}%</p><p className="text-xs text-gray-700 font-medium">Средний балл</p></div>
            </div>
          </div>
        )}

        {/* Форма для репетитора */}
        {role === "tutor" && showAddForm && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-cyan-200">
            <h2 className="font-bold text-lg mb-4 text-cyan-800">{editingId ? "✏️ Редактировать" : "⚗️ Новое ионное уравнение"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-cyan-700 font-medium">📝 Название</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Нейтрализация" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
                <div>
                  <label className="text-xs text-cyan-700 font-medium">⭐ Сложность</label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3].map(level => (
                      <button key={level} type="button" onClick={() => setDifficulty(level as 1 | 2 | 3)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${difficulty === level ? "bg-cyan-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{"⭐".repeat(level)}</button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-cyan-700 font-medium mb-2 block">📋 Список веществ (для задания 30)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {substances.map((sub, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={sub} onChange={(e) => { const newS = [...substances]; newS[i] = e.target.value; setSubstances(newS); }} placeholder={`Вещество ${i + 1}`} className="flex-1 border border-cyan-200 rounded-lg p-2 text-sm font-mono" />
                      <button onClick={() => { const newS = [...substances]; newS.splice(i, 1); setSubstances(newS); }} className="px-2 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSubstances([...substances, ""])} className="mt-2 text-sm text-cyan-600 hover:text-cyan-800">+ Добавить вещество</button>
              </div>

              <div>
                <label className="text-xs text-cyan-700 font-medium mb-2 block">✅ Правильные реагенты (кликни на вещества из списка выше)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-cyan-50 rounded-lg border border-cyan-200 min-h-[60px]">
                  {substances.filter(s => s.trim()).map((sub, i) => (
                    <button key={i} type="button" onClick={() => {
                      if (correctReactants.includes(sub)) {
                        setCorrectReactants(correctReactants.filter(r => r !== sub));
                      } else {
                        setCorrectReactants([...correctReactants, sub]);
                      }
                    }} className={`px-3 py-2 rounded-lg text-sm font-mono font-medium transition border-2 ${correctReactants.includes(sub) ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-800 border-cyan-200 hover:border-cyan-400'}`}>
                      {sub}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Выбрано: {correctReactants.length} веществ</p>
              </div>
              
              <div>
                <label className="text-xs text-cyan-700 font-medium mb-1 block">🧪 Молекулярное уравнение</label>
                <input value={molecular} onChange={(e) => setMolecular(e.target.value)} placeholder="AgNO₃ + NaCl → AgCl↓ + NaNO₃" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-cyan-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-cyan-700 font-medium mb-1 block">⚛️ Полное ионное уравнение</label>
                <input value={fullIonic} onChange={(e) => setFullIonic(e.target.value)} placeholder="Ag⁺ + NO₃⁻ + Na⁺ + Cl⁻ → AgCl↓ + Na⁺ + NO₃⁻" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-cyan-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-cyan-700 font-medium mb-1 block">🎯 Сокращённое ионное уравнение</label>
                <input value={netIonic} onChange={(e) => setNetIonic(e.target.value)} placeholder="Ag⁺ + Cl⁻ → AgCl↓" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-cyan-400 outline-none" />
              </div>
              
              <div>
                <label className="text-xs text-cyan-700 font-medium mb-2 block">⚠️ Признак реакции</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {REACTION_SIGNS.map(sign => (
                    <button key={sign.value} type="button" onClick={() => setReactionSign(sign.value)} className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium border transition ${reactionSign === sign.value ? "bg-cyan-100 border-cyan-500 text-cyan-800" : "bg-white border-gray-200 text-gray-600 hover:border-cyan-300"}`}>
                      {sign.icon} {sign.label}
                    </button>
                  ))}
                </div>
              </div>

              {reactionSign === "precipitate" && (
                <div>
                  <label className="text-xs text-cyan-700 font-medium mb-2 block">🎨 Цвет осадка</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PRECIPITATE_COLORS.map(color => (
                      <button key={color.value} type="button" onClick={() => setPrecipitateColor(color.value)} className={`p-2 rounded-lg text-xs font-medium border-2 transition ${precipitateColor === color.value ? color.color + " scale-105 shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-cyan-300"}`}>
                        <div className="font-bold">{color.label}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{color.example}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-xs text-cyan-700 font-medium">💡 Подсказка</label>
                <textarea value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Сильные электролиты распадаются на ионы..." rows={2} className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              
              <div className="flex gap-2">
                <button onClick={saveEq} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-3 rounded-xl font-bold hover:from-cyan-700 hover:to-blue-800 transition shadow-md shadow-cyan-300">{editingId ? "💾 Обновить" : "💾 Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Интерфейс ученика */}
        {role === "student" && selectedEq && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-cyan-200 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-bold text-xl text-gray-900">⚗️ {selectedEq.title}</h2>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-800">{"⭐".repeat(selectedEq.difficulty || 1)}</span>
                <button onClick={() => setSelectedEq(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕ Закрыть</button>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 mb-6 border border-cyan-200">
              <p className="text-xs text-cyan-700 font-medium mb-3">📋 Выберите вещества, которые вступают в реакцию:</p>
              <div className="flex flex-wrap gap-2">
                {selectedEq.substances?.map((sub: string, idx: number) => {
                  const isSelected = userReactants.includes(sub);
                  return (
                    <button key={idx} onClick={() => toggleSubstance(sub)} className={`px-4 py-2.5 rounded-lg text-sm font-mono font-medium transition border-2 ${isSelected ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg scale-105' : 'bg-white text-gray-800 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50'}`}>
                      {sub}
                    </button>
                  );
                })}
              </div>
              {userReactants.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cyan-200">
                  <p className="text-xs text-cyan-700 font-medium mb-2">✅ Выбранные реагенты:</p>
                  <div className="flex flex-wrap gap-2">
                    {userReactants.map((r, i) => (
                      <span key={i} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-mono font-bold">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedEq.hint && !checked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {selectedEq.hint}
              </div>
            )}

            {!checked && (
              <div className="space-y-4 mb-6">
                <p className="text-xs text-cyan-600 mb-1">💡 Лайфхак: Пиши как обычно (например: AgNO3 + NaCl -> AgCl + NaNO3). Система сама всё поймёт!</p>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">🧪 Молекулярное уравнение:</label>
                  <input value={userMolecular} onChange={(e) => setUserMolecular(e.target.value)} placeholder="Например: AgNO3 + NaCl -> AgCl + NaNO3" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-cyan-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">⚛️ Полное ионное уравнение:</label>
                  <input value={userFull} onChange={(e) => setUserFull(e.target.value)} placeholder="Например: Ag+ + NO3- + Na+ + Cl- -> AgCl + Na+ + NO3-" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-cyan-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">🎯 Сокращённое ионное уравнение:</label>
                  <input value={userNet} onChange={(e) => setUserNet(e.target.value)} placeholder="Например: Ag+ + Cl- -> AgCl" className="w-full border border-cyan-200 rounded-lg p-2.5 text-sm font-mono text-gray-900 focus:ring-2 focus:ring-cyan-400 outline-none" />
                </div>
                
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">⚠️ Признак реакции:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REACTION_SIGNS.map(sign => (
                      <button key={sign.value} onClick={() => setUserSign(sign.value)} className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition text-sm font-medium ${userSign === sign.value ? "border-cyan-500 bg-cyan-50 text-cyan-900" : "border-gray-200 bg-white hover:border-cyan-300 text-gray-700"}`}>
                        {sign.icon} {sign.label}
                      </button>
                    ))}
                  </div>
                </div>

                {userSign === "precipitate" && (
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">🎨 Цвет осадка:</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {PRECIPITATE_COLORS.map(color => (
                        <button key={color.value} onClick={() => setUserPrecipitateColor(color.value)} className={`p-2 rounded-lg text-xs font-medium border-2 transition ${userPrecipitateColor === color.value ? color.color + " scale-105 shadow-md" : "bg-white border-gray-200 text-gray-600 hover:border-cyan-300"}`}>
                          <div className="font-bold">{color.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={checkAnswer} className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-3.5 rounded-xl font-bold hover:from-cyan-700 hover:to-blue-800 transition text-lg shadow-md shadow-cyan-300">✅ Проверить</button>
              </div>
            )}

            {checked && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className={`p-4 rounded-xl text-center border-2 ${Object.values(scores).reduce((a, b) => a + b, 0) === 100 ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
                    <p className="text-3xl mb-1">{Object.values(scores).reduce((a, b) => a + b, 0) === 100 ? "⭐" : "🌟"}</p>
                    <p className="text-2xl font-black text-gray-900">{Object.values(scores).reduce((a, b) => a + b, 0)}%</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3 text-xs">
                      <div className={`p-2 rounded ${scores.reactants === 20 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        <div>Реагенты</div>
                        <div className="font-bold">{scores.reactants}%</div>
                      </div>
                      <div className={`p-2 rounded ${scores.molecular === 20 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        <div>Молек.</div>
                        <div className="font-bold">{scores.molecular}%</div>
                      </div>
                      <div className={`p-2 rounded ${scores.full === 20 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        <div>Полное</div>
                        <div className="font-bold">{scores.full}%</div>
                      </div>
                      <div className={`p-2 rounded ${scores.net === 20 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        <div>Сокращ.</div>
                        <div className="font-bold">{scores.net}%</div>
                      </div>
                      <div className={`p-2 rounded ${scores.sign === 10 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        <div>Признак</div>
                        <div className="font-bold">{scores.sign}%</div>
                      </div>
                      <div className={`p-2 rounded ${scores.color === 10 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        <div>Цвет</div>
                        <div className="font-bold">{scores.color}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                    <p className="text-xs text-cyan-700 font-medium mb-2">✅ Правильные ответы:</p>
                    <div className="space-y-2 text-sm font-mono">
                      <div><span className="text-gray-600 font-sans">Реагенты:</span> <span className="font-bold text-gray-900 ml-2">{selectedEq.correct_reactants?.join(" + ")}</span></div>
                      <div><span className="text-gray-600 font-sans">Молекулярное:</span> <span className="font-bold text-gray-900 ml-2">{selectedEq.molecular}</span></div>
                      <div><span className="text-gray-600 font-sans">Полное ионное:</span> <span className="text-gray-800 ml-2">{selectedEq.full_ionic}</span></div>
                      <div><span className="text-gray-600 font-sans">Сокращённое:</span> <span className="font-bold text-gray-900 ml-2">{selectedEq.net_ionic}</span></div>
                      <div><span className="text-gray-600 font-sans">Признак:</span> <span className="font-bold text-gray-900 ml-2 font-sans">{REACTION_SIGNS.find(s => s.value === selectedEq.reaction_sign)?.label}</span></div>
                      {selectedEq.reaction_sign === "precipitate" && selectedEq.precipitate_color && (
                        <div><span className="text-gray-600 font-sans">Цвет осадка:</span> <span className="font-bold text-gray-900 ml-2 font-sans">{PRECIPITATE_COLORS.find(c => c.value === selectedEq.precipitate_color)?.label}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={nextRandom} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-3 rounded-xl font-bold hover:from-cyan-700 hover:to-blue-800 transition shadow-md shadow-cyan-300">🎲 Следующее</button>
                    <button onClick={() => { setChecked(false); setUserReactants([]); setUserMolecular(""); setUserFull(""); setUserNet(""); setUserSign(""); setUserPrecipitateColor(""); setScores({ reactants: 0, molecular: 0, full: 0, net: 0, sign: 0, color: 0 }); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">🔄 Ещё раз</button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {/* Список уравнений */}
        {!selectedEq && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equations.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-cyan-200">
                <p className="text-6xl mb-4">⚗️</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первое уравнение!" : "Пока нет уравнений"}</p>
              </div>
            ) : (
              equations.map((eq) => (
                <motion.div key={eq.id} whileHover={{ y: -4 }} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-cyan-200 hover:border-cyan-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-sm flex-1">{eq.title}</h3>
                    <span className="text-xs ml-2">{"⭐".repeat(eq.difficulty || 1)}</span>
                  </div>
                  <p className="text-xs font-mono text-gray-700 mb-2 truncate">{eq.substances?.slice(0, 3).join(", ")}...</p>
                  <div className="flex items-center gap-1 mb-3 text-xs text-cyan-700 bg-cyan-50 w-fit px-2 py-1 rounded-full">
                    {REACTION_SIGNS.find(s => s.value === eq.reaction_sign)?.icon}
                    {REACTION_SIGNS.find(s => s.value === eq.reaction_sign)?.label}
                    {eq.reaction_sign === "precipitate" && eq.precipitate_color && (
                      <span className="ml-1">• {PRECIPITATE_COLORS.find(c => c.value === eq.precipitate_color)?.label}</span>
                    )}
                  </div>
                  {eq.tags && eq.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {eq.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startEq(eq)} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-2 rounded-lg text-sm font-bold hover:from-cyan-700 hover:to-blue-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startEq(eq)} className="px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm hover:bg-cyan-200">👁️</button>
                        <button onClick={() => editEq(eq)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteEq(eq.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } } .animate-float { animation: float 3s ease-in-out infinite; } .delay-100 { animation-delay: 0.1s; }`}</style>
    </div>
  );
}

export default function IonicTrainerPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>}>
        <IonicContent />
      </Suspense>
    </AuthGuard>
  );
}