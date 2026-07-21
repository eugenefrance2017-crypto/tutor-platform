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

function RedoxContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [reactions, setReactions] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"basic" | "ege29">("basic");
  const [reactants, setReactants] = useState("");
  const [products, setProducts] = useState("");
  const [substancesList, setSubstancesList] = useState("");
  const [condition, setCondition] = useState("");
  const [balanceText, setBalanceText] = useState("");
  const [nok, setNok] = useState(1);
  const [oxidizer, setOxidizer] = useState("");
  const [reducer, setReducer] = useState("");
  const [medium, setMedium] = useState<"acidic" | "neutral" | "alkaline">("acidic");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);

  const [userProducts, setUserProducts] = useState<Record<string, string>>({});
  const [userReactants, setUserReactants] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [reactantScore, setReactantScore] = useState<number | null>(null);

  const [blitzMode, setBlitzMode] = useState(false);
  const [blitzTime, setBlitzTime] = useState(120);
  const [blitzLives, setBlitzLives] = useState(3);
  const [blitzCombo, setBlitzCombo] = useState(0);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzIndex, setBlitzIndex] = useState(0);
  const [blitzGameOver, setBlitzGameOver] = useState(false);
  const [blitzReactions, setBlitzReactions] = useState<any[]>([]);
  const [blitzRecord, setBlitzRecord] = useState(0);
  const [stats, setStats] = useState({ solved: 0, avgScore: 0, bestStreak: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStats = localStorage.getItem(`redox_stats_${uid}`);
      if (savedStats) setStats(JSON.parse(savedStats));
      const savedRecord = localStorage.getItem(`redox_blitz_record_${uid}`);
      if (savedRecord) setBlitzRecord(parseInt(savedRecord));
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let unsubscribe: () => void;
    if (role === "student") {
      getDoc(doc(db, "profiles", uid)).then((snap) => {
        let tid = uid;
        if (snap.exists()) { const data = snap.data(); tid = data.tutor_id || uid; }
        setTutorId(tid);
        if (!snap.exists() || !snap.data().tutor_id) { unsubscribe = loadAllReactions(); }
        else { unsubscribe = loadReactions(tid); }
      });
    } else {
      setTutorId(uid);
      unsubscribe = loadReactions(uid);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [uid, role]);

  useEffect(() => {
    if (!blitzMode || blitzGameOver || blitzTime <= 0) return;
    const timer = setInterval(() => {
      setBlitzTime((prev) => {
        if (prev <= 1) { setBlitzGameOver(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [blitzMode, blitzGameOver, blitzTime]);

  function loadAllReactions() {
    return onSnapshot(query(collection(db, "redox_reactions")), (snap) => {
      setReactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }

  function loadReactions(tid: string) {
    return onSnapshot(query(collection(db, "redox_reactions"), where("tutor_id", "==", tid)), (snap) => {
      setReactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }

  function resetForm() {
    setReactants(""); setProducts(""); setSubstancesList(""); setCondition("");
    setBalanceText(""); setNok(1); setOxidizer(""); setReducer(""); setMedium("acidic");
    setMode("basic"); setDifficulty(1); setTags([]); setEditingId(null);
  }

  function editReaction(rxn: any) {
    setMode(rxn.mode || "basic");
    setReactants(rxn.reactants?.join(" + ") || "");
    setProducts(rxn.products?.join(" + ") || "");
    setSubstancesList(rxn.substances?.join(", ") || "");
    setCondition(rxn.condition || "");
    setBalanceText(rxn.balance_text || "");
    setNok(rxn.nok || 1);
    setOxidizer(rxn.oxidizer || "");
    setReducer(rxn.reducer || "");
    setMedium(rxn.medium || "acidic");
    setDifficulty(rxn.difficulty || 1);
    setTags(rxn.tags || []);
    setEditingId(rxn.id);
    setShowAddForm(true);
  }

  async function addReaction() {
    if (!reactants.trim() || !products.trim()) { toast.error("Введите реагенты и продукты!"); return; }
    if (nok < 1) { toast.error("НОК должен быть больше 0!"); return; }
    const reactantsList = reactants.split("+").map(s => s.trim()).filter(Boolean);
    const productsList = products.split("+").map(s => s.trim()).filter(Boolean);
    const substancesArray = substancesList.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    if (reactantsList.length === 0 || productsList.length === 0) { toast.error("Неверный формат реакции"); return; }
    if (mode === "ege29" && substancesArray.length === 0) { toast.error("Укажите список веществ для ЕГЭ-29!"); return; }
    const data = {
      tutor_id: uid, mode, reactants: reactantsList, products: productsList,
      substances: mode === "ege29" ? substancesArray : [],
      condition: mode === "ege29" ? condition : "",
      balance_text: balanceText, nok, oxidizer, reducer, medium, difficulty,
      tags: tags.filter(t => t.trim()), updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "redox_reactions", editingId), data);
        toast.success("✨ Реакция обновлена!");
      } else {
        await addDoc(collection(db, "redox_reactions"), { ...data, created_at: new Date().toISOString() });
        toast.success("🪄 Реакция добавлена!");
      }
      resetForm(); setShowAddForm(false);
    } catch (e: any) { toast.error(`Ошибка: ${e.message}`); }
  }

  async function deleteReaction(id: string) {
    if (!window.confirm("Удалить реакцию?")) return;
    try { await deleteDoc(doc(db, "redox_reactions", id)); toast.success("🗑️ Удалена!"); }
    catch (e: any) { toast.error(`Ошибка: ${e.message}`); }
  }

  function startRandomReaction() {
    if (reactions.length === 0) { toast.error("Нет реакций"); return; }
    const random = reactions[Math.floor(Math.random() * reactions.length)];
    setSelectedReaction(random);
    resetCheck();
  }

  function nextRandomReaction() {
    if (reactions.length <= 1) { resetCheck(); return; }
    const others = reactions.filter(r => r.id !== selectedReaction?.id);
    const random = others[Math.floor(Math.random() * others.length)];
    setSelectedReaction(random);
    resetCheck();
  }

  function updateStats(newScore: number) {
    const newStats = {
      solved: stats.solved + 1,
      avgScore: Math.round((stats.avgScore * stats.solved + newScore) / (stats.solved + 1)),
      bestStreak: newScore === 100 ? stats.bestStreak + 1 : 0,
    };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`redox_stats_${uid}`, JSON.stringify(newStats));
  }

  function normalizeFormula(formula: string): string {
    return formula.replace(/\s+/g, "").replace(/^\d+/, "").toLowerCase().replace(/[⁺⁻⁰]+/g, "");
  }

  function checkUserAnswer() {
    if (!selectedReaction) return;
    let totalScore = 0;
    if (selectedReaction.mode === "ege29") {
      const correctReactants = (selectedReaction.reactants as string[]).map(r => normalizeFormula(r));
      const userReactantsList = Object.values(userReactants).filter(v => v && v.trim()).map(v => normalizeFormula(v as string));
      let reactantCorrect = 0;
      const usedCorrect = new Set<number>();
      for (const userR of userReactantsList) {
        for (let i = 0; i < correctReactants.length; i++) {
          if (!usedCorrect.has(i) && correctReactants[i] === userR) { reactantCorrect++; usedCorrect.add(i); break; }
        }
      }
      const reactantPct = correctReactants.length > 0 ? Math.round((reactantCorrect / correctReactants.length) * 100) : 0;
      setReactantScore(reactantPct);
      totalScore += Math.round(reactantPct * 0.5);
    }
    const correctProducts = (selectedReaction.products as string[]).map(p => normalizeFormula(p));
    const userProductsList = Object.values(userProducts).filter(v => v && v.trim()).map(v => normalizeFormula(v as string));
    let productCorrect = 0;
    const usedCorrectProducts = new Set<number>();
    for (const userP of userProductsList) {
      for (let i = 0; i < correctProducts.length; i++) {
        if (!usedCorrectProducts.has(i) && correctProducts[i] === userP) { productCorrect++; usedCorrectProducts.add(i); break; }
      }
    }
    const productPct = correctProducts.length > 0 ? Math.round((productCorrect / correctProducts.length) * 100) : 0;
    if (selectedReaction.mode === "ege29") { totalScore += Math.round(productPct * 0.5); }
    else { totalScore = productPct; }
    setScore(totalScore);
    setChecked(true);
    if (role === "student") updateStats(totalScore);
    if (blitzMode) { handleBlitzAnswer(totalScore); }
    else {
      if (totalScore === 100) toast.success("⭐ Идеально!");
      else if (totalScore >= 70) toast.success("🌟 Хорошо!");
      else if (totalScore >= 40) toast("🌙 Неплохо");
      else toast.error("✨ Попробуй ещё раз!");
    }
  }

  function handleBlitzAnswer(totalScore: number) {
    if (totalScore >= 80) {
      const newCombo = blitzCombo + 1;
      const multiplier = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 1;
      const points = totalScore * multiplier;
      setBlitzCombo(newCombo);
      const newScore = blitzScore + points;
      setBlitzScore(newScore);
      if (newScore > blitzRecord) {
        setBlitzRecord(newScore);
        if (typeof window !== "undefined") localStorage.setItem(`redox_blitz_record_${uid}`, newScore.toString());
      }
      toast.success(`⭐ +${points} очков! Комбо ×${multiplier}!`);
      setTimeout(() => nextBlitzReaction(), 800);
    } else {
      const newLives = blitzLives - 1;
      setBlitzLives(newLives);
      setBlitzCombo(0);
      if (newLives <= 0) { setBlitzGameOver(true); toast.error("💔 Жизни закончились!"); }
      else { toast.error(`✨ Ошибка! Осталось ${newLives} ❤️`); setTimeout(() => nextBlitzReaction(), 800); }
    }
  }

  function startBlitz() {
    if (reactions.length < 3) { toast.error("Нужно минимум 3 реакции!"); return; }
    const shuffled = [...reactions].sort(() => Math.random() - 0.5);
    setBlitzReactions(shuffled.slice(0, Math.min(5, shuffled.length)));
    setBlitzIndex(0); setBlitzTime(120); setBlitzLives(3); setBlitzCombo(0); setBlitzScore(0);
    setBlitzGameOver(false); setBlitzMode(true);
    setSelectedReaction(shuffled[0]); resetCheck();
  }

  function nextBlitzReaction() {
    const nextIndex = blitzIndex + 1;
    if (nextIndex >= blitzReactions.length) { setBlitzGameOver(true); toast.success("🎉 Все реакции пройдены!"); return; }
    setBlitzIndex(nextIndex);
    setSelectedReaction(blitzReactions[nextIndex]);
    resetCheck();
  }

  function stopBlitz() { setBlitzMode(false); setBlitzGameOver(false); setSelectedReaction(null); resetCheck(); }

  function resetCheck() {
    setChecked(false); setScore(null); setReactantScore(null);
    setUserProducts({}); setUserReactants({});
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">⭐</div>
        <div className="absolute bottom-20 right-10 text-6xl">🌙</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
        <div className="absolute bottom-1/3 right-1/4 text-7xl">🪄</div>
      </div>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/trainers?uid=${uid}&role=${role}`} className="text-purple-700 hover:text-purple-900 transition font-medium flex items-center gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition">←</span> Назад
          </Link>
          <div className="text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-3xl animate-float">🌟</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Тренажёр ОВР</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          <div className="flex gap-2">
            {reactions.length >= 3 && !blitzMode && (
              <button onClick={startBlitz} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">⚡ Блиц</button>
            )}
            {role === "tutor" && (
              <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">+ Реакция</button>
            )}
          </div>
        </div>

        {role === "student" && !blitzMode && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-purple-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved}</p><p className="text-xs text-gray-700 font-medium">Решено</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.avgScore}%</p><p className="text-xs text-gray-700 font-medium">Средний</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.bestStreak}</p><p className="text-xs text-gray-700 font-medium">Серия</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{blitzRecord}</p><p className="text-xs text-gray-700 font-medium">Рекорд ⭐</p></div>
            </div>
          </div>
        )}

        {blitzMode && !blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-black ${blitzTime <= 30 ? 'text-red-600 animate-pulse' : 'text-purple-700'}`}>⏱️ {Math.floor(blitzTime / 60)}:{String(blitzTime % 60).padStart(2, '0')}</div>
                <div className="text-lg">{Array.from({ length: blitzLives }).map((_, i) => <span key={i}>❤️</span>)}</div>
                {blitzCombo >= 3 && <div className="text-sm font-bold text-purple-600 animate-bounce">🔥 ×{blitzCombo >= 5 ? 3 : 2}</div>}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-bold text-purple-700">⭐ {blitzScore}</div>
                <div className="text-xs text-gray-600">{blitzIndex + 1}/{blitzReactions.length}</div>
                <button onClick={stopBlitz} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 font-medium">Выйти</button>
              </div>
            </div>
          </div>
        )}

        {blitzMode && blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 mb-4 border border-purple-200 text-center">
            <p className="text-4xl mb-2">{blitzLives <= 0 ? "💔" : "🎉"}</p>
            <p className="text-2xl font-black text-gray-900 mb-2">{blitzLives <= 0 ? "Игра окончена!" : "Все реакции пройдены!"}</p>
            <p className="text-lg text-purple-700 font-bold mb-1">⭐ {blitzScore} очков</p>
            {blitzScore >= blitzRecord && blitzScore > 0 && <p className="text-sm text-emerald-600 font-bold mb-3">🏆 Новый рекорд!</p>}
            <div className="flex gap-2 justify-center">
              <button onClick={startBlitz} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">🔄 Ещё раз</button>
              <button onClick={stopBlitz} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Выйти</button>
            </div>
          </div>
        )}

        {role === "tutor" && showAddForm && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-purple-200">
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать реакцию" : "➕ Новая ОВР реакция"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-purple-700 font-medium">🎯 Режим</label>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setMode("basic")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${mode === "basic" ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>🟢 Базовый</button>
                  <button type="button" onClick={() => setMode("ege29")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${mode === "ege29" ? "bg-violet-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>🔴 ЕГЭ-29</button>
                </div>
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
                  <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="галогены, ЕГЭ-29" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
              </div>
              {mode === "ege29" && (
                <>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">📋 Список веществ (через запятую)</label>
                    <textarea value={substancesList} onChange={(e) => setSubstancesList(e.target.value)} placeholder="KMnO₄, HCl, KI, H₂O" rows={2} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 font-mono text-gray-900" />
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">📝 Условие задачи</label>
                    <textarea value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Из предложенного перечня выберите вещества..." rows={3} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                  </div>
                </>
              )}
              <ChemicalInput value={reactants} onChange={setReactants} label="🧪 Реагенты (через +)" placeholder="KMnO₄ + HCl + KI" />
              <ChemicalInput value={products} onChange={setProducts} label="📦 Продукты (через +)" placeholder="MnCl₂ + KCl + I₂ + H₂O" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChemicalInput value={oxidizer} onChange={setOxidizer} label="🔴 Окислитель" placeholder="Mn⁺⁷" />
                <ChemicalInput value={reducer} onChange={setReducer} label="🟢 Восстановитель" placeholder="I⁻" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-purple-700 font-medium">🔢 НОК</label><input type="number" value={nok} onChange={(e) => setNok(parseInt(e.target.value) || 1)} min={1} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" /></div>
                <div>
                  <label className="text-xs text-purple-700 font-medium">🧫 Среда</label>
                  <select value={medium} onChange={(e) => setMedium(e.target.value as any)} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900">
                    <option value="acidic">🧪 Кислая (H⁺)</option>
                    <option value="neutral">💧 Нейтральная (H₂O)</option>
                    <option value="alkaline">🧼 Щелочная (OH⁻)</option>
                  </select>
                </div>
              </div>
              <ChemicalInput value={balanceText} onChange={setBalanceText} label="📝 Электронный баланс" placeholder={"Mn⁺⁷ + 5e⁻ → Mn⁺² | 2\n2I⁻ - 2e⁻ → I₂⁰ | 5"} multiline rows={4} />
              <div className="flex gap-2">
                <button onClick={addReaction} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">{editingId ? "💾 Обновить" : "💾 Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && (
          <div>
            {selectedReaction ? (
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl text-gray-900">⚡ {selectedReaction.mode === "ege29" ? "Задание 29 (ЕГЭ)" : "ОВР реакция"}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full ${selectedReaction.mode === "ege29" ? "bg-violet-100 text-violet-800" : "bg-purple-100 text-purple-800"}`}>{selectedReaction.mode === "ege29" ? "🔴 ЕГЭ-29" : "🟢 Базовый"}</span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${selectedReaction.medium === "acidic" ? "bg-red-100 text-red-800" : selectedReaction.medium === "alkaline" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{selectedReaction.medium === "acidic" ? "🧪 Кислая" : selectedReaction.medium === "alkaline" ? "🧼 Щелочная" : "💧 Нейтральная"}</span>
                </div>
                {selectedReaction.mode === "ege29" && (
                  <>
                    {selectedReaction.condition && <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200"><p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedReaction.condition}</p></div>}
                    <div className="bg-violet-50 rounded-2xl p-4 mb-4 border border-violet-200">
                      <p className="text-xs text-violet-700 font-medium mb-2">📋 Даны вещества:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedReaction.substances?.map((sub: string, idx: number) => {
                          const isSelected = Object.values(userReactants).some(v => normalizeFormula(v || "") === normalizeFormula(sub));
                          return (
                            <button key={idx} onClick={() => {
                              if (isSelected) {
                                const nr = { ...userReactants };
                                Object.keys(nr).forEach(key => { if (normalizeFormula(nr[key] || "") === normalizeFormula(sub)) delete nr[key]; });
                                setUserReactants(nr);
                              } else {
                                const nextSlot = selectedReaction.reactants?.length || 3;
                                for (let i = 0; i < nextSlot; i++) {
                                  if (!userReactants[i]) { setUserReactants({ ...userReactants, [i]: sub }); break; }
                                }
                              }
                            }} className={`px-3 py-2 rounded-lg text-sm font-mono font-medium transition border-2 ${isSelected ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-105' : 'bg-white text-gray-800 border-violet-200 hover:border-violet-400 hover:bg-violet-50'}`}>{sub}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                      <p className="text-xs text-purple-700 font-medium mb-2">Выбранные реагенты:</p>
                      <div className="flex flex-wrap gap-2 min-h-[40px] items-center">
                        {Array.from({ length: selectedReaction.reactants?.length || 3 }).map((_, idx) => (
                          <div key={idx} className={`px-4 py-2 rounded-lg text-sm font-mono font-bold border-2 ${userReactants[idx] ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-400 border-dashed border-gray-300'}`}>
                            {userReactants[idx] || `?`}
                            {userReactants[idx] && <button onClick={() => { const nr = { ...userReactants }; delete nr[idx]; setUserReactants(nr); }} className="ml-2 text-white hover:text-red-200">×</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {selectedReaction.mode === "basic" && (
                  <div className="bg-purple-50 rounded-2xl p-6 mb-6 text-center border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-2">🧪 Даны реагенты:</p>
                    <p className="text-2xl font-bold font-mono text-gray-900">{selectedReaction.reactants?.join(" + ")}</p>
                  </div>
                )}
                {!checked && (
                  <div className="mb-6 space-y-4">
                    <div>
                      <p className="text-sm text-gray-700 mb-2">📝 Запишите продукты реакции:</p>
                      <div className="space-y-2">
                        {selectedReaction.products?.map((_: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-500">{idx + 1}.</span>
                            <div className="flex-1">
                              <ChemicalInput value={userProducts[idx] || ""} onChange={(v) => setUserProducts({ ...userProducts, [idx]: v })} placeholder={`Продукт ${idx + 1}...`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={checkUserAnswer} className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300">✅ Проверить</button>
                  </div>
                )}
                {checked && score !== null && (
                  <div className={`p-6 rounded-2xl mb-6 text-center ${score === 100 ? "bg-emerald-50 border-2 border-emerald-300" : score >= 70 ? "bg-purple-50 border-2 border-purple-300" : "bg-red-50 border-2 border-red-300"}`}>
                    <p className="text-4xl mb-2">{score === 100 ? "⭐" : score >= 70 ? "🌟" : "✨"}</p>
                    <p className="text-2xl font-black mb-1 text-gray-900">{score}%</p>
                    <p className="text-sm text-gray-700">{score === 100 ? "Идеально!" : score >= 70 ? "Хорошо!" : "Попробуйте ещё!"}</p>
                    {selectedReaction.mode === "ege29" && reactantScore !== null && (
                      <div className="flex justify-center gap-4 mt-2 text-xs">
                        <span className="text-red-700">Реагенты: {reactantScore}%</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-purple-700">Продукты: {Math.round((score - Math.round(reactantScore * 0.5)) * 2)}%</span>
                      </div>
                    )}
                  </div>
                )}
                {checked && (
                  <div className="bg-purple-50 rounded-2xl p-6 mb-4 border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-2">✅ Правильная реакция:</p>
                    <p className="text-xl font-bold font-mono text-gray-900">{selectedReaction.reactants?.join(" + ")} → {selectedReaction.products?.join(" + ")}</p>
                    {selectedReaction.balance_text && (
                      <div className="mt-4 bg-violet-50 rounded-xl p-4 border border-violet-200">
                        <p className="text-sm text-violet-700 font-medium mb-2">⚡ Электронный баланс:</p>
                        <pre className="text-sm font-mono text-gray-900 whitespace-pre-wrap">{selectedReaction.balance_text}</pre>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedReaction.oxidizer && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">🔴 {selectedReaction.oxidizer}</span>}
                          {selectedReaction.reducer && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">🟢 {selectedReaction.reducer}</span>}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">НОК = {selectedReaction.nok}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  {checked && <button onClick={nextRandomReaction} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">{reactions.length > 1 ? "Следующая →" : "🔄 Ещё раз"}</button>}
                  {!checked && reactions.length > 1 && <button onClick={nextRandomReaction} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-300 transition font-medium">Пропустить →</button>}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-6xl mb-4">⚡</p>
                <p className="text-gray-700 text-lg">Готовы тренироваться?</p>
                <button onClick={startRandomReaction} className="mt-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-violet-700 text-white text-lg font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-xl shadow-purple-300">🧪 Начать тренировку</button>
              </div>
            )}
          </div>
        )}

        {role === "tutor" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border border-purple-200">
                <h2 className="font-semibold text-purple-800 mb-3">📋 Реакции ({reactions.length})</h2>
                {reactions.length === 0 ? <p className="text-gray-600 text-center py-4 text-sm">Нет реакций</p> : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {reactions.map((rxn: any) => (
                      <button key={rxn.id} onClick={() => { setSelectedReaction(rxn); resetCheck(); }} className={`w-full text-left p-3 rounded-xl transition border-2 ${selectedReaction?.id === rxn.id ? "bg-purple-50 border-purple-400 shadow-md" : "bg-gray-50 border-transparent hover:border-purple-200"}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rxn.mode === "ege29" ? "bg-violet-100 text-violet-800" : "bg-purple-100 text-purple-800"}`}>{rxn.mode === "ege29" ? "ЕГЭ-29" : "Базовый"}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${rxn.medium === "acidic" ? "bg-red-50 text-red-700" : rxn.medium === "alkaline" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{rxn.medium === "acidic" ? "H⁺" : rxn.medium === "alkaline" ? "OH⁻" : "H₂O"}</span>
                          <span className="text-xs">{"⭐".repeat(rxn.difficulty || 1)}</span>
                        </div>
                        <p className="text-sm font-medium font-mono truncate mt-1 text-gray-900">{rxn.reactants?.join(" + ")}</p>
                        {rxn.tags && rxn.tags.length > 0 && <div className="flex gap-1 mt-1 flex-wrap">{rxn.tags.slice(0, 2).map((tag: string, i: number) => (<span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">#{tag}</span>))}</div>}
                        <div className="flex gap-2 mt-1">
                          <button onClick={(e) => { e.stopPropagation(); editReaction(rxn); }} className="text-purple-500 hover:text-purple-700 text-xs">✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteReaction(rxn.id); }} className="text-red-500 hover:text-red-700 text-xs">🗑️</button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-2">
              {selectedReaction ? (
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="font-bold text-xl text-gray-900">⚡ {selectedReaction.mode === "ege29" ? "Задание 29 (ЕГЭ)" : "ОВР реакция"}</h2>
                    <span className={`text-xs px-3 py-1 rounded-full ${selectedReaction.medium === "acidic" ? "bg-red-100 text-red-800" : selectedReaction.medium === "alkaline" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{selectedReaction.medium === "acidic" ? "🧪 Кислая" : selectedReaction.medium === "alkaline" ? "🧼 Щелочная" : "💧 Нейтральная"}</span>
                  </div>
                  <div className="bg-purple-50 rounded-2xl p-6 mb-6 text-center border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-2">🧪 Даны реагенты:</p>
                    <p className="text-2xl font-bold font-mono text-gray-900">{selectedReaction.reactants?.join(" + ")}</p>
                  </div>
                  {!checked && (
                    <div className="mb-6 space-y-4">
                      <div>
                        <p className="text-sm text-gray-700 mb-2">📝 Запишите продукты реакции:</p>
                        <div className="space-y-2">
                          {selectedReaction.products?.map((_: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-500">{idx + 1}.</span>
                              <div className="flex-1">
                                <ChemicalInput value={userProducts[idx] || ""} onChange={(v) => setUserProducts({ ...userProducts, [idx]: v })} placeholder={`Продукт ${idx + 1}...`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={checkUserAnswer} className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300">✅ Проверить</button>
                    </div>
                  )}
                  {checked && score !== null && (
                    <div className={`p-6 rounded-2xl mb-6 text-center ${score === 100 ? "bg-emerald-50 border-2 border-emerald-300" : score >= 70 ? "bg-purple-50 border-2 border-purple-300" : "bg-red-50 border-2 border-red-300"}`}>
                      <p className="text-4xl mb-2">{score === 100 ? "⭐" : score >= 70 ? "🌟" : "✨"}</p>
                      <p className="text-2xl font-black mb-1 text-gray-900">{score}%</p>
                    </div>
                  )}
                  {checked && (
                    <>
                      <div className="bg-emerald-50 rounded-2xl p-6 mb-4">
                        <p className="text-sm text-emerald-700 font-medium mb-2">✅ Правильная реакция:</p>
                        <p className="text-xl font-bold font-mono text-gray-900">{selectedReaction.reactants?.join(" + ")} → {selectedReaction.products?.join(" + ")}</p>
                      </div>
                      {selectedReaction.balance_text && (
                        <div className="bg-violet-50 rounded-2xl p-4 border border-violet-200">
                          <p className="text-sm text-violet-700 font-medium mb-2">⚡ Электронный баланс:</p>
                          <pre className="text-sm font-mono text-gray-900 whitespace-pre-wrap">{selectedReaction.balance_text}</pre>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedReaction.oxidizer && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">🔴 {selectedReaction.oxidizer}</span>}
                            {selectedReaction.reducer && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">🟢 {selectedReaction.reducer}</span>}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {checked && <button onClick={resetCheck} className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🔄 Попробовать ещё раз</button>}
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-12 border border-purple-200 text-center">
                  <p className="text-6xl mb-4">⚡</p>
                  <p className="text-gray-700 text-lg">Выберите реакцию слева</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } } .animate-float { animation: float 3s ease-in-out infinite; } .delay-100 { animation-delay: 0.1s; }`}</style>
    </div>
  );
}

export default function RedoxTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <RedoxContent />
    </Suspense>
  );
}