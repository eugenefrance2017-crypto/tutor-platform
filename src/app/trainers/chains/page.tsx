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

function normalizeFormula(f: string): string {
  return f.replace(/\s+/g, "").toLowerCase().replace(/[⁺⁻⁰]+/g, "").replace(/[₂₃₄₅₆₇₈₉₀]/g, (c) => "₂₃₄₅₆₇₈₉₀".indexOf(c).toString()).replace(/→|->/g, "");
}

function ChainsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [chains, setChains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [chainSteps, setChainSteps] = useState<string[]>(["", "", ""]);
  const [reactions, setReactions] = useState<{ equation: string; conditions: string }[]>([]);

  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [userReactions, setUserReactions] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [showReactions, setShowReactions] = useState(false);

  const [stats, setStats] = useState({ solved: 0, avgScore: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`chains_stats_${uid}`);
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
        unsubscribe = onSnapshot(query(collection(db, "organic_chains"), where("tutor_id", "==", tid)), (snap) => {
          setChains(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "organic_chains"), where("tutor_id", "==", uid)), (snap) => {
        setChains(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
      }, () => setLoading(false));
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [uid, role]);

  function resetForm() {
    setTitle(""); setDifficulty(1); setTags([]);
    setChainSteps(["", "", ""]); setReactions([]); setEditingId(null);
  }

  function editChain(chain: any) {
    setTitle(chain.title || ""); setDifficulty(chain.difficulty || 1);
    setTags(chain.tags || []); setChainSteps(chain.chain || ["", ""]);
    setReactions(chain.reactions || []); setEditingId(chain.id);
    setShowAddForm(true);
  }

  function addStep() { setChainSteps([...chainSteps, ""]); }
  function removeStep(idx: number) {
    const newSteps = chainSteps.filter((_, i) => i !== idx);
    setChainSteps(newSteps.length < 2 ? ["", ""] : newSteps);
  }
  function updateStep(idx: number, val: string) {
    const newSteps = [...chainSteps]; newSteps[idx] = val; setChainSteps(newSteps);
  }
  function addReaction() { setReactions([...reactions, { equation: "", conditions: "" }]); }
  function updateReaction(idx: number, field: string, val: string) {
    const newReactions = [...reactions]; newReactions[idx] = { ...newReactions[idx], [field]: val }; setReactions(newReactions);
  }
  function removeReaction(idx: number) { setReactions(reactions.filter((_, i) => i !== idx)); }

  async function saveChain() {
    if (!title.trim()) { toast.error("Введите название!"); return; }
    const filteredSteps = chainSteps.filter(s => s.trim());
    if (filteredSteps.length < 2) { toast.error("Минимум 2 вещества!"); return; }
    const data = {
      tutor_id: uid, title, difficulty, tags: tags.filter(t => t.trim()),
      chain: filteredSteps, reactions, updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "organic_chains", editingId), data);
        toast.success("✨ Цепочка обновлена!");
      } else {
        await addDoc(collection(db, "organic_chains"), { ...data, created_at: new Date().toISOString() });
        toast.success("🧬 Цепочка добавлена!");
      }
      setShowAddForm(false); resetForm();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteChain(id: string) {
    if (!window.confirm("Удалить цепочку?")) return;
    try { await deleteDoc(doc(db, "organic_chains", id)); toast.success("🗑️ Удалена!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startChain(chain: any) {
    setSelectedChain(chain); setUserAnswers({}); setUserReactions({});
    setChecked(false); setScore(null); setShowHints({}); setShowReactions(false);
  }

  function checkChain() {
    if (!selectedChain) return;
    const chain = selectedChain.chain as string[];
    let correct = 0;
    const total = chain.length - 2;
    for (let i = 1; i < chain.length - 1; i++) {
      const userAns = normalizeFormula(userAnswers[i] || "");
      const correctAns = normalizeFormula(chain[i]);
      if (userAns === correctAns) correct++;
    }
    let reactionsCorrect = 0;
    const totalReactions = selectedChain.reactions?.length || 0;
    if (totalReactions > 0) {
      for (let i = 0; i < totalReactions; i++) {
        const userEq = normalizeFormula(userReactions[i] || "");
        const correctEq = normalizeFormula(selectedChain.reactions[i].equation || "");
        if (userEq && correctEq && userEq === correctEq) reactionsCorrect++;
      }
    }
    const substancesScore = total > 0 ? Math.round((correct / total) * 70) : 70;
    const reactionsScore = totalReactions > 0 ? Math.round((reactionsCorrect / totalReactions) * 30) : 30;
    const totalScore = substancesScore + reactionsScore;
    setScore(totalScore); setChecked(true);
    const newStats = {
      solved: stats.solved + 1,
      avgScore: Math.round((stats.avgScore * stats.solved + totalScore) / (stats.solved + 1)),
    };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`chains_stats_${uid}`, JSON.stringify(newStats));
    if (totalScore === 100) toast.success("⭐ Идеально!");
    else if (totalScore >= 70) toast.success("🌟 Отлично!");
    else if (totalScore >= 40) toast("🤔 Неплохо");
    else toast.error("✨ Попробуй ещё раз");
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">🧬</div>
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
              <span className="text-3xl animate-float">🧬</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Цепочки превращений</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          {role === "tutor" && (
            <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">+ Цепочка</button>
          )}
        </div>

        {role === "student" && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-purple-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved}</p><p className="text-xs text-gray-700 font-medium">Решено</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.avgScore}%</p><p className="text-xs text-gray-700 font-medium">Средний</p></div>
            </div>
          </div>
        )}

        {role === "tutor" && showAddForm && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-purple-200">
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать цепочку" : "🧬 Новая цепочка превращений"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-purple-700 font-medium">📝 Название</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="От этана до уксусной кислоты" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
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
                  <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="органика, спирты" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-purple-700 font-medium">🔗 Вещества в цепочке (по порядку)</label>
                  <button type="button" onClick={addStep} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">+ Вещество</button>
                </div>
                <div className="space-y-2">
                  {chainSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-600 w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <ChemicalInput value={step} onChange={(v) => updateStep(idx, v)} placeholder={idx === 0 ? "C₂H₆" : idx === chainSteps.length - 1 ? "CH₃COOH" : "C₂H₅Br"} />
                      </div>
                      {chainSteps.length > 2 && <button type="button" onClick={() => removeStep(idx)} className="text-red-500 hover:text-red-700 text-lg">×</button>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">💡 Первое и последнее вещества будут даны ученику</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-purple-700 font-medium">⚗️ Уравнения реакций</label>
                  <button type="button" onClick={addReaction} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">+ Реакция</button>
                </div>
                <div className="space-y-2">
                  {reactions.map((rxn, idx) => (
                    <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-purple-700 font-medium">Реакция {idx + 1}: {chainSteps[idx] || "?"} → {chainSteps[idx + 1] || "?"}</span>
                        <button type="button" onClick={() => removeReaction(idx)} className="text-red-500 hover:text-red-700 text-sm">×</button>
                      </div>
                      <ChemicalInput value={rxn.equation} onChange={(v) => updateReaction(idx, "equation", v)} placeholder="C₂H₆ + Br₂ → C₂H₅Br + HBr" />
                      <div className="mt-2">
                        <input value={rxn.conditions} onChange={(e) => updateReaction(idx, "conditions", e.target.value)} placeholder="Условия: hν, t°, катализатор..." className="w-full border border-purple-200 rounded-lg p-2 text-xs text-gray-900" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveChain} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">💾 {editingId ? "Обновить" : "Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && selectedChain && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-bold text-xl text-gray-900">🧬 {selectedChain.title}</h2>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">{"⭐".repeat(selectedChain.difficulty || 1)}</span>
                <button onClick={() => setSelectedChain(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕ Закрыть</button>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 mb-6 border border-purple-200">
              <p className="text-xs text-purple-700 font-medium mb-4 text-center">🔗 Заполните пропущенные вещества:</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {selectedChain.chain.map((substance: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    {idx === 0 || idx === selectedChain.chain.length - 1 ? (
                      <div className="px-4 py-3 bg-purple-600 text-white rounded-xl font-mono font-bold text-sm shadow-md">{substance}</div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-28">
                          <ChemicalInput value={userAnswers[idx] || ""} onChange={(v) => setUserAnswers({ ...userAnswers, [idx]: v })} placeholder="?" />
                        </div>
                        <button onClick={() => setShowHints({ ...showHints, [idx]: !showHints[idx] })} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200" title="Подсказка">💡</button>
                      </div>
                    )}
                    {idx < selectedChain.chain.length - 1 && <span className="text-purple-400 text-xl font-bold">→</span>}
                  </div>
                ))}
              </div>
              {Object.entries(showHints).map(([idx, show]) => {
                if (!show) return null;
                const i = parseInt(idx);
                const substance = selectedChain.chain[i];
                return <div key={i} className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">💡 Подсказка для вещества {i + 1}: <span className="font-mono font-bold">{substance.substring(0, Math.ceil(substance.length / 2))}...</span></div>;
              })}
            </div>
            {selectedChain.reactions && selectedChain.reactions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-700 font-medium">⚗️ Напишите уравнения реакций:</p>
                  <button onClick={() => setShowReactions(!showReactions)} className="text-xs text-purple-600 hover:text-purple-800">{showReactions ? "Скрыть ответы" : "Показать ответы"}</button>
                </div>
                <div className="space-y-2">
                  {selectedChain.reactions.map((rxn: any, idx: number) => (
                    <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-700 mb-1">Реакция {idx + 1}: {selectedChain.chain[idx]} → {selectedChain.chain[idx + 1]}</p>
                      <ChemicalInput value={userReactions[idx] || ""} onChange={(v) => setUserReactions({ ...userReactions, [idx]: v })} placeholder="Уравнение реакции..." />
                      {showReactions && (
                        <div className="mt-2 text-xs">
                          <p className="text-emerald-700 font-mono">✅ {rxn.equation}</p>
                          {rxn.conditions && <p className="text-gray-600">Условия: {rxn.conditions}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!checked && (
              <button onClick={checkChain} className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300">✅ Проверить</button>
            )}
            {checked && score !== null && (
              <div className={`p-6 rounded-2xl mb-4 text-center ${score === 100 ? "bg-emerald-50 border-2 border-emerald-300" : score >= 70 ? "bg-purple-50 border-2 border-purple-300" : "bg-red-50 border-2 border-red-300"}`}>
                <p className="text-4xl mb-2">{score === 100 ? "⭐" : score >= 70 ? "🌟" : "✨"}</p>
                <p className="text-2xl font-black mb-1 text-gray-900">{score}%</p>
                <p className="text-sm text-gray-700">{score === 100 ? "Идеально!" : score >= 70 ? "Отлично!" : "Попробуйте ещё!"}</p>
              </div>
            )}
            {checked && (
              <div className="flex gap-2">
                <button onClick={() => { setChecked(false); setScore(null); setUserAnswers({}); setUserReactions({}); setShowHints({}); setShowReactions(false); }} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🔄 Попробовать ещё раз</button>
                <button onClick={() => setSelectedChain(null)} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">К списку</button>
              </div>
            )}
          </div>
        )}

        {!selectedChain && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chains.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-purple-200">
                <p className="text-6xl mb-4">🧬</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первую цепочку!" : "Пока нет цепочек"}</p>
              </div>
            ) : (
              chains.map((chain) => (
                <div key={chain.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-purple-200 hover:border-purple-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 flex-1">{chain.title}</h3>
                    <span className="text-xs ml-2">{"⭐".repeat(chain.difficulty || 1)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 my-3 text-xs font-mono">
                    {chain.chain.slice(0, 4).map((s: string, i: number) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={i === 0 || i === chain.chain.length - 1 ? "text-purple-700 font-bold" : "text-gray-400"}>{s}</span>
                        {i < Math.min(chain.chain.length - 1, 3) && <span className="text-purple-300">→</span>}
                      </span>
                    ))}
                    {chain.chain.length > 4 && <span className="text-gray-400">...</span>}
                  </div>
                  {chain.tags && chain.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {chain.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startChain(chain)} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2 rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startChain(chain)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">👁️</button>
                        <button onClick={() => editChain(chain)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteChain(chain.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
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

export default function ChainsTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <ChainsContent />
    </Suspense>
  );
}