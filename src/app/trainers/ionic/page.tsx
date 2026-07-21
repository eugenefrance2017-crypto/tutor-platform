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

function normalizeIonic(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase().replace(/[⁺⁻⁰]+/g, "").replace(/[₂₃₄₅₆₇₈₉₀]/g, (c) => "₂₃₄₅₆₇₈₉₀".indexOf(c).toString()).replace(/→|->/g, "");
}

function IonicContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [equations, setEquations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEq, setSelectedEq] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [molecular, setMolecular] = useState("");
  const [fullIonic, setFullIonic] = useState("");
  const [netIonic, setNetIonic] = useState("");
  const [hint, setHint] = useState("");

  const [userFull, setUserFull] = useState("");
  const [userNet, setUserNet] = useState("");
  const [checked, setChecked] = useState(false);
  const [fullScore, setFullScore] = useState(0);
  const [netScore, setNetScore] = useState(0);

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
          setEquations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "ionic_equations"), where("tutor_id", "==", uid)), (snap) => {
        setEquations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
      }, () => setLoading(false));
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [uid, role]);

  function resetForm() {
    setTitle(""); setDifficulty(1); setTags([]);
    setMolecular(""); setFullIonic(""); setNetIonic(""); setHint(""); setEditingId(null);
  }

  function editEq(eq: any) {
    setTitle(eq.title || ""); setDifficulty(eq.difficulty || 1);
    setTags(eq.tags || []); setMolecular(eq.molecular || "");
    setFullIonic(eq.full_ionic || ""); setNetIonic(eq.net_ionic || "");
    setHint(eq.hint || ""); setEditingId(eq.id); setShowAddForm(true);
  }

  async function saveEq() {
    if (!title.trim() || !molecular.trim() || !fullIonic.trim() || !netIonic.trim()) {
      toast.error("Заполните все поля!"); return;
    }
    const data = {
      tutor_id: uid, title, difficulty, tags: tags.filter(t => t.trim()),
      molecular, full_ionic: fullIonic, net_ionic: netIonic, hint,
      updated_at: new Date().toISOString(),
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
    if (!window.confirm("Удалить?")) return;
    try { await deleteDoc(doc(db, "ionic_equations", id)); toast.success("🗑️ Удалено!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startEq(eq: any) {
    setSelectedEq(eq); setUserFull(""); setUserNet("");
    setChecked(false); setFullScore(0); setNetScore(0);
  }

  function checkAnswer() {
    if (!selectedEq) return;
    const userF = normalizeIonic(userFull);
    const correctF = normalizeIonic(selectedEq.full_ionic);
    const userN = normalizeIonic(userNet);
    const correctN = normalizeIonic(selectedEq.net_ionic);
    const fScore = userF && correctF && userF === correctF ? 50 : 0;
    const nScore = userN && correctN && userN === correctN ? 50 : 0;
    const total = fScore + nScore;
    setFullScore(fScore); setNetScore(nScore); setChecked(true);
    const newStats = {
      solved: stats.solved + 1,
      avgScore: Math.round((stats.avgScore * stats.solved + total) / (stats.solved + 1)),
    };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`ionic_stats_${uid}`, JSON.stringify(newStats));
    if (total === 100) toast.success("⭐ Идеально!");
    else if (total >= 50) toast.success("🌟 Половина верна!");
    else toast.error("✨ Попробуй ещё раз");
  }

  function nextRandom() {
    if (equations.length === 0) return;
    const others = equations.filter(e => e.id !== selectedEq?.id);
    const random = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : equations[0];
    startEq(random);
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">⚗️</div>
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
              <span className="text-3xl animate-float">⚗️</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Ионные уравнения</h1>
              <span className="text-3xl animate-float delay-100">✨</span>
            </div>
          </div>
          {role === "tutor" && (
            <button onClick={() => { setShowAddForm(true); resetForm(); }} className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-lg shadow-purple-300">+ Уравнение</button>
          )}
        </div>

        {role === "student" && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-purple-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.solved}</p><p className="text-xs text-gray-700 font-medium">Решено</p></div>
              <div className="text-center"><p className="text-3xl font-black text-purple-700">{stats.avgScore}%</p><p className="text-xs text-gray-700 font-medium">Средний балл</p></div>
            </div>
          </div>
        )}

        {role === "tutor" && showAddForm && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-purple-200">
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать" : "⚗️ Новое ионное уравнение"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-purple-700 font-medium">📝 Название</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Нейтрализация HCl + NaOH" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
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
                  <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="нейтрализация" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
              </div>
              <ChemicalInput value={molecular} onChange={setMolecular} label="🧪 Молекулярное уравнение" placeholder="HCl + NaOH → NaCl + H₂O" />
              <ChemicalInput value={fullIonic} onChange={setFullIonic} label="⚛️ Полное ионное уравнение" placeholder="H⁺ + Cl⁻ + Na⁺ + OH⁻ → Na⁺ + Cl⁻ + H₂O" />
              <ChemicalInput value={netIonic} onChange={setNetIonic} label="🎯 Сокращённое ионное уравнение" placeholder="H⁺ + OH⁻ → H₂O" />
              <div>
                <label className="text-xs text-purple-700 font-medium">💡 Подсказка</label>
                <textarea value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Сильные электролиты распадаются на ионы..." rows={2} className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEq} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">💾 {editingId ? "Обновить" : "Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && selectedEq && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-bold text-xl text-gray-900">⚗️ {selectedEq.title}</h2>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">{"⭐".repeat(selectedEq.difficulty || 1)}</span>
                <button onClick={() => setSelectedEq(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕</button>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 mb-6 border border-purple-200 text-center">
              <p className="text-xs text-purple-700 font-medium mb-2">🧪 Молекулярное уравнение:</p>
              <p className="text-2xl font-bold font-mono text-gray-900">{selectedEq.molecular}</p>
            </div>
            {selectedEq.hint && !checked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">💡 {selectedEq.hint}</div>
            )}
            {!checked && (
              <div className="space-y-4 mb-6">
                <ChemicalInput value={userFull} onChange={setUserFull} label="⚛️ Полное ионное уравнение:" placeholder="H⁺ + Cl⁻ + Na⁺ + OH⁻ → ..." />
                <ChemicalInput value={userNet} onChange={setUserNet} label="🎯 Сокращённое ионное уравнение:" placeholder="H⁺ + OH⁻ → ..." />
                <button onClick={checkAnswer} className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300">✅ Проверить</button>
              </div>
            )}
            {checked && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className={`p-4 rounded-xl text-center border-2 ${fullScore === 50 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                    <p className="text-xs text-gray-600 mb-1">Полное ионное</p>
                    <p className="text-2xl font-black text-gray-900">{fullScore}%</p>
                  </div>
                  <div className={`p-4 rounded-xl text-center border-2 ${netScore === 50 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                    <p className="text-xs text-gray-600 mb-1">Сокращённое</p>
                    <p className="text-2xl font-black text-gray-900">{netScore}%</p>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                  <p className="text-xs text-purple-700 font-medium mb-2">✅ Правильные ответы:</p>
                  <div className="space-y-2">
                    <div><p className="text-xs text-gray-600">Полное ионное:</p><p className="text-sm font-mono text-gray-900">{selectedEq.full_ionic}</p></div>
                    <div><p className="text-xs text-gray-600">Сокращённое:</p><p className="text-sm font-mono text-gray-900">{selectedEq.net_ionic}</p></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={nextRandom} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🎲 Следующее</button>
                  <button onClick={() => { setChecked(false); setUserFull(""); setUserNet(""); setFullScore(0); setNetScore(0); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">🔄 Ещё раз</button>
                </div>
              </>
            )}
          </div>
        )}

        {!selectedEq && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equations.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-purple-200">
                <p className="text-6xl mb-4">⚗️</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первое уравнение!" : "Пока нет уравнений"}</p>
              </div>
            ) : (
              equations.map((eq) => (
                <div key={eq.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-purple-200 hover:border-purple-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-sm flex-1">{eq.title}</h3>
                    <span className="text-xs ml-2">{"⭐".repeat(eq.difficulty || 1)}</span>
                  </div>
                  <p className="text-xs font-mono text-gray-700 mb-2 truncate">{eq.molecular}</p>
                  {eq.tags && eq.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {eq.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startEq(eq)} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2 rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startEq(eq)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">👁️</button>
                        <button onClick={() => editEq(eq)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteEq(eq.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
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

export default function IonicTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <IonicContent />
    </Suspense>
  );
}