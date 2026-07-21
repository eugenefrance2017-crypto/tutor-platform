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

const OBSERVATION_TYPES = {
  precipitate: { name: "Осадок", icon: "⬇️", color: "bg-blue-100 text-blue-800" },
  gas: { name: "Газ", icon: "💨", color: "bg-gray-100 text-gray-800" },
  color: { name: "Изменение цвета", icon: "🎨", color: "bg-purple-100 text-purple-800" },
  smell: { name: "Запах", icon: "👃", color: "bg-amber-100 text-amber-800" },
  heat: { name: "Выделение тепла", icon: "🔥", color: "bg-red-100 text-red-800" },
};

function QualitativeContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [reactions, setReactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<any>(null);

  const [substance, setSubstance] = useState("");
  const [reagent, setReagent] = useState("");
  const [observationType, setObservationType] = useState<keyof typeof OBSERVATION_TYPES>("precipitate");
  const [observation, setObservation] = useState("");
  const [equation, setEquation] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [tags, setTags] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);

  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showEquation, setShowEquation] = useState(false);

  const [stats, setStats] = useState({ solved: 0, correct: 0 });
  const [blitzMode, setBlitzMode] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzTime, setBlitzTime] = useState(60);
  const [blitzGameOver, setBlitzGameOver] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`qual_stats_${uid}`);
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
        unsubscribe = onSnapshot(query(collection(db, "qualitative_reactions"), where("tutor_id", "==", tid)), (snap) => {
          setReactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
        }, () => setLoading(false));
      });
    } else {
      setTutorId(uid);
      unsubscribe = onSnapshot(query(collection(db, "qualitative_reactions"), where("tutor_id", "==", uid)), (snap) => {
        setReactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false);
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
    setSubstance(""); setReagent(""); setObservationType("precipitate");
    setObservation(""); setEquation(""); setDifficulty(1); setTags([]);
    setOptions(["", "", "", ""]); setEditingId(null);
  }

  function editReaction(r: any) {
    setSubstance(r.substance || ""); setReagent(r.reagent || "");
    setObservationType(r.observation_type || "precipitate");
    setObservation(r.observation || ""); setEquation(r.equation || "");
    setDifficulty(r.difficulty || 1); setTags(r.tags || []);
    setOptions(r.options || ["", "", "", ""]);
    setEditingId(r.id); setShowAddForm(true);
  }

  async function saveReaction() {
    if (!substance.trim() || !reagent.trim() || !observation.trim()) {
      toast.error("Заполните все поля!"); return;
    }
    const data = {
      tutor_id: uid, substance, reagent, observation_type: observationType,
      observation, equation, difficulty, tags: tags.filter(t => t.trim()),
      options: options.filter(o => o.trim()), updated_at: new Date().toISOString(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "qualitative_reactions", editingId), data);
        toast.success("✨ Обновлена!");
      } else {
        await addDoc(collection(db, "qualitative_reactions"), { ...data, created_at: new Date().toISOString() });
        toast.success("🔬 Добавлена!");
      }
      setShowAddForm(false); resetForm();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteReaction(id: string) {
    if (!window.confirm("Удалить?")) return;
    try { await deleteDoc(doc(db, "qualitative_reactions", id)); toast.success("🗑️ Удалена!"); }
    catch (e: any) { toast.error(e.message); }
  }

  function startReaction(r: any) {
    setSelectedReaction(r); setUserAnswer(null); setChecked(false); setShowEquation(false);
  }

  function checkAnswer() {
    if (!selectedReaction || userAnswer === null) return;
    const correct = userAnswer === selectedReaction.substance;
    setChecked(true);
    const newStats = { solved: stats.solved + 1, correct: stats.correct + (correct ? 1 : 0) };
    setStats(newStats);
    if (typeof window !== "undefined") localStorage.setItem(`qual_stats_${uid}`, JSON.stringify(newStats));
    if (blitzMode) {
      if (correct) { setBlitzScore(s => s + 10); toast.success(`⭐ +10! Счёт: ${blitzScore + 10}`); setTimeout(() => nextRandom(), 800); }
      else { toast.error(`✨ Правильно: ${selectedReaction.substance}`); setTimeout(() => nextRandom(), 1200); }
    } else {
      if (correct) toast.success("⭐ Верно!");
      else toast.error(`✨ Правильно: ${selectedReaction.substance}`);
    }
  }

  function nextRandom() {
    if (reactions.length === 0) return;
    const others = reactions.filter(r => r.id !== selectedReaction?.id);
    const random = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : reactions[0];
    startReaction(random);
  }

  function startBlitz() {
    if (reactions.length < 3) { toast.error("Нужно минимум 3 реакции!"); return; }
    setBlitzScore(0); setBlitzTime(60); setBlitzGameOver(false); setBlitzMode(true);
    nextRandom();
  }

  function stopBlitz() { setBlitzMode(false); setBlitzGameOver(false); setSelectedReaction(null); }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">🔬</div>
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
              <span className="text-3xl animate-float">🔬</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Качественные реакции</h1>
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
            <h2 className="font-bold text-lg mb-4 text-purple-800">{editingId ? "✏️ Редактировать" : "🔬 Новая качественная реакция"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChemicalInput value={substance} onChange={setSubstance} label="🧪 Вещество (правильный ответ)" placeholder="NaCl" />
                <ChemicalInput value={reagent} onChange={setReagent} label="⚗️ Реактив (что добавляем)" placeholder="AgNO₃" />
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">👁️ Тип наблюдения</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">
                  {Object.entries(OBSERVATION_TYPES).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => setObservationType(key as any)} className={`py-2 rounded-lg text-xs font-medium transition ${observationType === key ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{val.icon} {val.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-purple-700 font-medium">📝 Описание наблюдения</label>
                <input value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="белый творожистый осадок" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
              </div>
              <ChemicalInput value={equation} onChange={setEquation} label="⚗️ Уравнение реакции" placeholder="NaCl + AgNO₃ → AgCl↓ + NaNO₃" />
              <div>
                <label className="text-xs text-purple-700 font-medium">🎯 Варианты ответов</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-6">{idx + 1}.</span>
                      <input value={opt} onChange={(e) => { const newOpts = [...options]; newOpts[idx] = e.target.value; setOptions(newOpts); }} placeholder={`Вариант ${idx + 1}`} className="flex-1 border border-purple-200 rounded-lg p-2 text-sm font-mono text-gray-900" />
                    </div>
                  ))}
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
                  <input value={tags.join(", ")} onChange={(e) => setTags(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="галогениды, серебро" className="w-full border border-purple-200 rounded-lg p-2.5 text-sm mt-1 text-gray-900" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveReaction} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">💾 {editingId ? "Обновить" : "Сохранить"}</button>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {role === "student" && selectedReaction && !blitzGameOver && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-purple-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-bold text-xl text-gray-900">🔬 Определите вещество</h2>
              {!blitzMode && <button onClick={() => setSelectedReaction(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300">✕</button>}
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 mb-6 border border-purple-200">
              <p className="text-sm text-gray-700 mb-3">При добавлении реактива <span className="font-mono font-bold text-purple-700">{selectedReaction.reagent}</span> наблюдается:</p>
              <div className={`inline-block px-4 py-3 rounded-xl ${OBSERVATION_TYPES[selectedReaction.observation_type as keyof typeof OBSERVATION_TYPES].color} font-medium`}>
                {OBSERVATION_TYPES[selectedReaction.observation_type as keyof typeof OBSERVATION_TYPES].icon} {selectedReaction.observation}
              </div>
            </div>
            {!checked && (
              <div className="mb-6">
                <p className="text-sm text-gray-700 font-medium mb-3">💭 Какое это вещество?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(selectedReaction.options?.length >= 2 ? selectedReaction.options : (() => {
                    const others = reactions.filter(r => r.id !== selectedReaction.id).map(r => r.substance);
                    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
                    return [selectedReaction.substance, ...shuffled].sort(() => Math.random() - 0.5);
                  })()).map((opt: string, idx: number) => (
                    <button key={idx} onClick={() => setUserAnswer(opt)} className={`px-4 py-3 rounded-xl text-sm font-mono font-medium transition border-2 ${userAnswer === opt ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-gray-800 border-purple-200 hover:border-purple-400 hover:bg-purple-50'}`}>{opt}</button>
                  ))}
                </div>
                <button onClick={checkAnswer} disabled={userAnswer === null} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition text-lg shadow-md shadow-purple-300 disabled:opacity-50 disabled:cursor-not-allowed">✅ Проверить</button>
              </div>
            )}
            {checked && (
              <>
                <div className={`p-6 rounded-2xl mb-4 text-center ${userAnswer === selectedReaction.substance ? "bg-emerald-50 border-2 border-emerald-300" : "bg-red-50 border-2 border-red-300"}`}>
                  <p className="text-4xl mb-2">{userAnswer === selectedReaction.substance ? "⭐" : "✨"}</p>
                  <p className="text-xl font-black mb-1 text-gray-900">{userAnswer === selectedReaction.substance ? "Верно!" : "Неверно"}</p>
                  {userAnswer !== selectedReaction.substance && <p className="text-sm text-gray-700">Правильный ответ: <span className="font-mono font-bold">{selectedReaction.substance}</span></p>}
                </div>
                <div className="mb-4">
                  <button onClick={() => setShowEquation(!showEquation)} className="w-full bg-amber-100 text-amber-800 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition">{showEquation ? "🙈 Скрыть уравнение" : "⚗️ Показать уравнение"}</button>
                  {showEquation && selectedReaction.equation && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-mono text-gray-800">{selectedReaction.equation}</p>
                    </div>
                  )}
                </div>
                {!blitzMode && (
                  <div className="flex gap-2">
                    <button onClick={nextRandom} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-violet-800 transition shadow-md shadow-purple-300">🎲 Следующая</button>
                    <button onClick={() => { setChecked(false); setUserAnswer(null); setShowEquation(false); }} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition">🔄 Ещё раз</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedReaction && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reactions.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/90 rounded-2xl border border-purple-200">
                <p className="text-6xl mb-4">🔬</p>
                <p className="text-gray-700 text-lg">{role === "tutor" ? "Создайте первую реакцию!" : "Пока нет реакций"}</p>
              </div>
            ) : (
              reactions.map((r) => (
                <div key={r.id} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-purple-200 hover:border-purple-400 transition">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${OBSERVATION_TYPES[r.observation_type as keyof typeof OBSERVATION_TYPES].color}`}>{OBSERVATION_TYPES[r.observation_type as keyof typeof OBSERVATION_TYPES].icon} {OBSERVATION_TYPES[r.observation_type as keyof typeof OBSERVATION_TYPES].name}</span>
                    <span className="text-xs">{"⭐".repeat(r.difficulty || 1)}</span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-600">Реактив: <span className="font-mono font-bold text-purple-700">{r.reagent}</span></p>
                    <p className="text-xs text-gray-600">Ответ: <span className="font-mono font-bold text-purple-700">{r.substance}</span></p>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2 mb-3">{r.observation}</p>
                  <div className="flex gap-2">
                    {role === "student" && <button onClick={() => startReaction(r)} className="flex-1 bg-gradient-to-r from-purple-600 to-violet-700 text-white py-2 rounded-lg text-sm font-bold hover:from-purple-700 hover:to-violet-800 transition">🧪 Решить</button>}
                    {role === "tutor" && (
                      <>
                        <button onClick={() => startReaction(r)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">👁️</button>
                        <button onClick={() => editReaction(r)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">✏️</button>
                        <button onClick={() => deleteReaction(r.id)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">🗑️</button>
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

export default function QualitativeTrainerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div></div>}>
      <QualitativeContent />
    </Suspense>
  );
}