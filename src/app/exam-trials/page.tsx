"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../Sidebar";
import NotificationBell from "../NotificationBell";

const firebaseConfig = { apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com", projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app", messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============ 🎯 ШКАЛА ЕГЭ ============
const EGE_SCALE: Record<string, Record<number, number>> = {
  chemistry: { 0:0,1:2,2:5,3:8,4:10,5:13,6:15,7:18,8:20,9:23,10:25,11:28,12:30,13:33,14:35,15:38,16:40,17:43,18:45,19:48,20:50,21:53,22:55,23:58,24:60,25:63,26:65,27:68,28:70,29:73,30:75,31:78,32:80,33:83,34:85,35:88,36:90,37:93,38:95,39:98,40:100 },
  biology: { 0:0,1:2,2:4,3:6,4:8,5:10,6:12,7:14,8:16,9:18,10:20,11:22,12:24,13:26,14:28,15:30,16:32,17:34,18:36,19:38,20:40,21:42,22:44,23:46,24:48,25:50,26:52,27:54,28:56,29:58,30:60,31:62,32:64,33:66,34:68,35:70,36:72,37:74,38:76,39:78,40:80,41:83,42:86,43:89,44:92,45:100 },
};

function convertToSecondary(primary: number, subject: string): number {
  const scale = EGE_SCALE[subject] || EGE_SCALE.chemistry;
  if (scale[primary] !== undefined) return scale[primary];
  const keys = Object.keys(scale).map(Number).sort((a, b) => a - b);
  if (primary >= keys[keys.length - 1]) return 100;
  if (primary <= 0) return 0;
  for (let i = 0; i < keys.length - 1; i++) {
    if (primary >= keys[i] && primary <= keys[i + 1]) {
      const ratio = (primary - keys[i]) / (keys[i + 1] - keys[i]);
      return Math.round(scale[keys[i]] + ratio * (scale[keys[i + 1]] - scale[keys[i]]));
    }
  }
  return 0;
}

function autoScore(answers: Record<string, any>, questions: any[]): { autoScore: number; autoMax: number; manualPending: number; manualMax: number } {
  let autoScore = 0, autoMax = 0, manualPending = 0, manualMax = 0;
  questions.forEach(q => {
    if (q.type === 'single_choice') {
      autoMax += q.points || 1;
      if (answers[q.id] === q.correct) autoScore += q.points || 1;
    } else {
      manualMax += q.points || 1;
      if (answers[q.id] !== undefined && answers[q.id] !== '') manualPending += q.points || 1;
    }
  });
  return { autoScore, autoMax, manualPending, manualMax };
}

// ============ 🔊 ЗВУК ============
let typeSound: HTMLAudioElement | null = null;
if (typeof window !== 'undefined') {
  typeSound = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvz3kpBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z24k2CBhku+zooVARC0yl4fG5ZRwFNo3V7895KQUofsz");
}
const playTypeSound = () => {
  if (typeof window !== 'undefined' && localStorage.getItem('ttpd_sound') === 'off') return;
  try { if (typeSound) { typeSound.currentTime = 0; typeSound.volume = 0.3; typeSound.play(); } } catch (e) {}
};

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [d, setD] = useState('');
  useEffect(() => { let i = 0; const t = setTimeout(() => { const iv = setInterval(() => { if (i < text.length) { setD(text.substring(0, i + 1)); i++; playTypeSound(); } else clearInterval(iv); }, 30); return () => clearInterval(iv); }, delay); return () => clearTimeout(t); }, [text, delay]);
  return <span>{d}</span>;
}
function PolaroidCard({ children, delay = 0 }: any) { return (<motion.div initial={{ opacity: 0, y: 50, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay, duration: 0.8, type: "spring", stiffness: 100 }} whileHover={{ scale: 1.02, rotate: 1, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }} className="relative">{children}</motion.div>); }
function TTPDButton({ children, onClick, className = "", type = "button", disabled = false }: any) { return (<motion.button type={type} onClick={() => { onClick?.(); playTypeSound(); }} disabled={disabled} className={`relative px-6 py-3 border-2 border-black dark:border-white font-serif font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`} whileHover={!disabled ? { scale: 1.05 } : {}} whileTap={!disabled ? { scale: 0.95 } : {}}><span className="relative z-10">{children}</span></motion.button>); }

// ============ 🧪 ХИМ. РЕДАКТОР ============
function ChemistryEditor({ value, onChange, placeholder = "", rows = 3, theme = 'dark' }: any) {
  const isDark = theme === 'dark'; const [show, setShow] = useState(false); const ref = useRef<HTMLTextAreaElement>(null); const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) setShow(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const ins = (s: string) => { const t = ref.current; if (!t) return; const st = t.selectionStart; const nv = value.substring(0, st) + s + value.substring(t.selectionEnd); onChange(nv); setTimeout(() => { t.focus(); t.setSelectionRange(st + s.length, st + s.length); }, 0); };
  const SUB = ['₁','₂','₃','₄','₅','₆','₇','₈','₉','₀']; const CH = ['⁺','²⁺','³⁺','⁴⁺','⁻','²⁻','³⁻','⁴⁻']; const OX = ['⁻⁷','⁻⁶','⁻⁵','⁻⁴','⁻³','⁻²','⁻¹','⁰','⁺¹','⁺²','⁺³','⁺⁴','⁺⁵','⁺⁶','⁺⁷']; const SG = ['→','←','⇄','⇌','↑','↓','+','=','≠','≈','t°','°C','Δ'];
  const btnCls = `px-2 py-1 border rounded text-xs ${isDark ? 'border-amber-500/30 hover:bg-amber-500/20' : 'border-amber-200 hover:bg-amber-50'}`;
  return (<div className="relative"><div className="flex gap-2"><textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`flex-1 border-2 font-mono text-sm resize-none p-3 ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'} focus:outline-none`} /><div className="relative" ref={popRef}><button type="button" onClick={() => setShow(!show)} className={`h-full px-3 border-2 font-bold ${isDark ? 'border-amber-500/50 bg-amber-500/20 text-amber-400' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>🧪</button>{show && (<div className={`absolute right-0 top-full mt-2 w-72 border-2 shadow-2xl z-50 max-h-80 overflow-y-auto ${isDark ? 'bg-gray-900 border-amber-500/30' : 'bg-white border-amber-300'}`}><div className="p-3 space-y-3"><div><p className={`text-xs font-bold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>🔢 Индексы</p><div className="flex flex-wrap gap-1">{SUB.map(s => (<button key={s} type="button" onClick={() => ins(s)} className={btnCls}>{s}</button>))}</div></div><div><p className={`text-xs font-bold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>⚡ Заряды</p><div className="flex flex-wrap gap-1">{CH.map(s => (<button key={s} type="button" onClick={() => ins(s)} className={btnCls}>{s}</button>))}</div></div><div><p className={`text-xs font-bold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>🎯 Степени окисления</p><div className="flex flex-wrap gap-1">{OX.map(s => (<button key={s} type="button" onClick={() => ins(s)} className={btnCls}>{s}</button>))}</div></div><div><p className={`text-xs font-bold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>🔣 Знаки</p><div className="flex flex-wrap gap-1">{SG.map(s => (<button key={s} type="button" onClick={() => ins(s)} className={btnCls}>{s}</button>))}</div></div></div></div>)}</div></div></div>);
}

// ============ HEADER ============
function TTPDHeader({ theme, onThemeToggle, onBack, activeTab, setActiveTab, isTutor, soundEnabled, onToggleSound }: any) {
  const isDark = theme === 'dark';
  const tabs = isTutor ? ['КАТАЛОГ', 'СОЗДАТЬ', 'ПРОВЕРКА', 'РЕЗУЛЬТАТЫ УЧЕНИКОВ'] : ['КАТАЛОГ', 'МОИ РЕЗУЛЬТАТЫ', 'ТЕТРАДЬ ОШИБОК', 'ДОСТИЖЕНИЯ'];
  return (<motion.div className="text-center mb-12 border-b-2 border-black dark:border-white pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.div className="flex items-center justify-center gap-4 mb-4" initial={{ y: -20 }} animate={{ y: 0 }}><button onClick={onBack} className={`text-sm font-mono transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}>← НАЗАД</button><motion.button onClick={onToggleSound} className={`p-2 border-2 ${isDark ? 'border-white/30 text-white' : 'border-black/30 text-black'}`} whileHover={{ scale: 1.1 }}>{soundEnabled ? '🔊' : '🔇'}</motion.button><motion.button onClick={onThemeToggle} className={`p-2 border-2 ${isDark ? 'border-white/30 text-white' : 'border-black/30 text-black'}`} whileHover={{ scale: 1.1, rotate: 180 }}>{isDark ? '☀️' : '🌙'}</motion.button></motion.div><motion.h1 className={`font-serif text-5xl sm:text-6xl font-black mb-4 ${isDark ? 'text-white' : 'text-black'}`}><TypewriterText text="THE TORTURED STUDENTS DEPARTMENT" delay={500} /></motion.h1><motion.p className={`font-mono text-sm italic mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>*Arhiv of Academic Suffering & Triumph*</motion.p><motion.div className="flex justify-center gap-3 mt-6 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>{tabs.map(tab => (<motion.button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 border-2 font-mono text-xs ${activeTab === tab ? isDark ? 'border-white bg-white text-black' : 'border-black bg-black text-white' : isDark ? 'border-white/30 text-gray-400' : 'border-black/30 text-gray-600'}`} whileHover={{ scale: 1.05 }}>{tab}</motion.button>))}</motion.div></motion.div>);
}

// ============ TRIAL CARD ============
function TrialCard({ trial, index, theme, role, results, onStart, onEdit }: any) {
  const isDark = theme === 'dark'; const isTutor = role === 'tutor';
  const ur = results?.filter((r: any) => r.trial_id === trial.id) || [];
  const best = ur.length > 0 ? Math.max(...ur.map((r: any) => r.secondary_score || r.score || 0)) : null;
  const qCount = trial.questions?.length || 0;
  const testQ = trial.questions?.filter((q: any) => q.type === 'single_choice').length || 0;
  const manualQ = qCount - testQ;
  return (<PolaroidCard delay={index * 0.1}><div className={`relative p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'} shadow-lg`}>
    <h3 className={`font-serif text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>{trial.title}</h3>
    <div className={`font-mono text-xs space-y-1 mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
      <p>ВРЕМЯ: [ {trial.duration} МИН ]</p>
      <p>ВОПРОСОВ: [ {qCount} ]</p>
      <p>АВТО: {testQ} | РУЧНАЯ: {manualQ}</p>
      <p>ПРЕДМЕТ: {trial.subject === 'chemistry' ? '🧪 ХИМИЯ' : '🧬 БИОЛОГИЯ'}</p>
    </div>
    {trial.topics?.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{trial.topics.map((t: string, i: number) => (<span key={i} className={`font-mono text-xs px-2 py-0.5 border ${isDark ? 'border-white/30' : 'border-black/20'}`}>#{t}</span>))}</div>}
    {ur.length > 0 && <div className={`mb-3 p-2 border-2 ${isDark ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50'}`}><p className={`font-mono text-xs ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>ПОПЫТОК: {ur.length} | ЛУЧШИЙ: {best} / 100</p></div>}
    <div className="flex gap-2">
      <TTPDButton onClick={() => onStart(trial)} className="flex-1 bg-black text-white dark:bg-white dark:text-black">[ НАЧАТЬ ]</TTPDButton>
      {isTutor && <><motion.button onClick={() => onEdit(trial)} className={`px-3 py-3 border-2 ${isDark ? 'border-blue-500/50 text-blue-400' : 'border-blue-300 text-blue-600'}`} whileHover={{ scale: 1.05 }}>📝</motion.button><motion.button onClick={async () => { if (!confirm('Удалить?')) return; await deleteDoc(doc(db, "exam_trials", trial.id)); toast.success("Удалено"); }} className={`px-3 py-3 border-2 ${isDark ? 'border-red-500/50 text-red-400' : 'border-red-300 text-red-600'}`} whileHover={{ scale: 1.05 }}>🗑️</motion.button></>}
    </div>
  </div></PolaroidCard>);
}

// ============ ПРОХОЖДЕНИЕ ============
function TrialTaking({ trial, uid, theme, onFinish }: any) {
  const isDark = theme === 'dark'; const questions = trial.questions || []; const [cq, setCq] = useState(0); const [answers, setAnswers] = useState<Record<string, any>>({}); const [timeLeft, setTimeLeft] = useState(trial.duration * 60); const [flagged, setFlagged] = useState<Set<string>>(new Set()); const [confirmFin, setConfirmFin] = useState(false);
  useEffect(() => { if (timeLeft <= 0) { fin(); return; } const t = setInterval(() => setTimeLeft(p => p - 1), 1000); return () => clearInterval(t); }, [timeLeft]);
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const fin = () => {
    const { autoScore: as, autoMax: am, manualPending: mp, manualMax: mm } = autoScore(answers, questions);
    onFinish({ answers, autoScore: as, autoMax: am, manualPending: mp, manualMax: mm, timeSpent: trial.duration * 60 - timeLeft });
  };
  const q = questions[cq]; const answered = Object.keys(answers).length; const progress = (answered / questions.length) * 100;
  return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen ${isDark ? 'bg-black' : 'bg-[#f5f5f0]'}`}>
    <div className={`sticky top-0 z-40 p-4 border-b-2 ${isDark ? 'bg-gray-900 border-white/20' : 'bg-white border-black/20'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div><h2 className={`font-serif text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>{trial.title}</h2><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Вопрос {cq + 1} из {questions.length} {q.type === 'text' ? '(РУЧНАЯ ПРОВЕРКА)' : '(АВТОПРОВЕРКА)'}</p></div>
          <div className={`font-mono text-2xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : isDark ? 'text-white' : 'text-black'}`}>[ {fmt(timeLeft)} ]</div>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><motion.div className={`h-full ${isDark ? 'bg-white' : 'bg-black'}`} animate={{ width: `${progress}%` }} /></div>
        <div className="flex justify-between mt-2"><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ОТВЕЧЕНО: {answered}/{questions.length}</p><TTPDButton onClick={() => setConfirmFin(true)} className="text-xs px-4 py-2">ЗАВЕРШИТЬ</TTPDButton></div>
      </div>
    </div>
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <AnimatePresence mode="wait"><motion.div key={cq} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className={`p-6 sm:p-8 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'} shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ВОПРОС №{cq + 1}</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs px-2 py-1 ${q.type === 'text' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>{q.type === 'text' ? '✍️ Ручная' : '⚡ Авто'}</span>
              <motion.button onClick={() => setFlagged(p => { const n = new Set(p); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })} className={`p-2 border-2 ${flagged.has(q.id) ? 'border-red-500 bg-red-500/10' : isDark ? 'border-white/30' : 'border-black/20'}`}>{flagged.has(q.id) ? '🚩' : '🏳️'}</motion.button>
            </div>
          </div>
          {q.image && <img src={q.image} className={`w-full max-h-96 object-contain rounded-lg mb-4 border-2 ${isDark ? 'border-white/30' : 'border-black/20'}`} />}
          <div className={`font-serif text-xl font-bold mb-6 whitespace-pre-wrap ${isDark ? 'text-white' : 'text-black'}`}>{q.question}</div>
          {q.type === 'single_choice' && q.options && (<div className="space-y-3">{q.options.map((opt: string, idx: number) => (<motion.button key={idx} onClick={() => { setAnswers(p => ({ ...p, [q.id]: idx })); playTypeSound(); }} className={`w-full text-left p-4 border-2 font-mono text-sm ${answers[q.id] === idx ? isDark ? 'border-white bg-white/10 text-white' : 'border-black bg-black/5 text-black' : isDark ? 'border-white/20 text-gray-300' : 'border-black/20 text-gray-700'}`} whileHover={{ x: 5 }}><span className="font-bold mr-3">[{String.fromCharCode(65 + idx)}]</span>{opt}</motion.button>))}</div>)}
          {q.type === 'text' && (<textarea value={answers[q.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} rows={8} placeholder="Напишите развёрнутый ответ..." className={`w-full p-4 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'} resize-none`} />)}
        </div>
      </motion.div></AnimatePresence>
      <div className="flex items-center justify-between mt-6">
        <TTPDButton onClick={() => setCq(Math.max(0, cq - 1))} disabled={cq === 0}>← НАЗАД</TTPDButton>
        <div className="hidden sm:flex gap-1 flex-wrap justify-center">{questions.map((qq: any, i: number) => (<motion.button key={qq.id} onClick={() => setCq(i)} className={`w-9 h-9 border-2 font-mono text-xs font-bold ${i === cq ? isDark ? 'border-white bg-white text-black' : 'border-black bg-black text-white' : answers[qq.id] !== undefined ? isDark ? 'border-green-500/50 text-green-400' : 'border-green-400 text-green-700' : isDark ? 'border-white/20 text-gray-400' : 'border-black/20 text-gray-600'}`} whileHover={{ scale: 1.1 }}>{i + 1}</motion.button>))}</div>
        <TTPDButton onClick={() => setCq(Math.min(questions.length - 1, cq + 1))} disabled={cq === questions.length - 1}>ДАЛЕЕ →</TTPDButton>
      </div>
    </div>
    <AnimatePresence>{confirmFin && (<motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.div className="absolute inset-0 bg-black/80" onClick={() => setConfirmFin(false)} /><motion.div className={`relative p-8 border-2 max-w-md w-full ${isDark ? 'border-white/30 bg-gray-900' : 'border-black/20 bg-white'}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }}><h3 className={`font-serif text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>ЗАВЕРШИТЬ?</h3><p className={`font-mono text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Отвечено: {answered}/{questions.length}<br/>Осталось: {fmt(timeLeft)}</p><div className="flex gap-3"><TTPDButton onClick={fin} className="flex-1 bg-black text-white dark:bg-white dark:text-black">ДА</TTPDButton><TTPDButton onClick={() => setConfirmFin(false)} className="flex-1">ОТМЕНА</TTPDButton></div></motion.div></motion.div>)}</AnimatePresence>
  </motion.div>);
}

// ============ РЕЗУЛЬТАТЫ ============
function TrialResults({ trial, result, theme, onBack }: any) {
  const isDark = theme === 'dark';
  const secondary = convertToSecondary(result.autoScore, trial.subject || 'chemistry');
  const totalMax = result.autoMax + result.manualMax;
  const pct = totalMax > 0 ? Math.round((result.autoScore / totalMax) * 100) : 0;
  return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen ${isDark ? 'bg-black' : 'bg-[#f5f5f0]'}`}>
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-20">
      <motion.div className={`text-center mb-8 p-8 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`} initial={{ y: 20 }} animate={{ y: 0 }}>
        <h2 className={`font-serif text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>РЕЗУЛЬТАТЫ</h2>
        <p className={`font-mono text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{trial.title}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ПЕРВИЧНЫЙ (авто)</p><p className={`font-serif text-4xl font-black ${isDark ? 'text-white' : 'text-black'}`}>{result.autoScore}/{result.autoMax}</p></div>
          <div><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ВТОРИЧНЫЙ (ЕГЭ)</p><p className="font-serif text-4xl font-black text-purple-500">{secondary}/100</p></div>
          <div><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>РУЧНАЯ ПРОВЕРКА</p><p className="font-serif text-4xl font-black text-yellow-500">{result.manualMax > 0 ? `${result.manualMax} ожидает` : '—'}</p></div>
        </div>
        {result.manualMax > 0 && <p className={`font-mono text-sm p-3 border-2 ${isDark ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-yellow-300 bg-yellow-50 text-yellow-700'}`}>⏳ {result.manualMax} баллов ожидают ручной проверки репетитора. Итоговый балл будет обновлён после проверки.</p>}
      </motion.div>
      <div className={`mb-8 p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}>
        <h3 className={`font-serif text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>📖 РАЗБОР</h3>
        <div className="space-y-3">{(trial.questions || []).map((q: any, i: number) => {
          const ua = result.answers[q.id]; const ok = q.type === 'single_choice' && ua === q.correct;
          return (<motion.div key={q.id} className={`p-4 border-2 ${ok ? isDark ? 'border-green-500/30 bg-green-500/5' : 'border-green-300 bg-green-50' : q.type === 'text' ? isDark ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-yellow-300 bg-yellow-50' : isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-300 bg-red-50'}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="flex items-start gap-3"><span className={`font-mono text-sm font-bold ${ok ? 'text-green-500' : q.type === 'text' ? 'text-yellow-500' : 'text-red-500'}`}>{ok ? '✓' : q.type === 'text' ? '✍️' : '✗'}</span><div className="flex-1">
              <p className={`font-serif text-sm font-bold mb-2 whitespace-pre-wrap ${isDark ? 'text-white' : 'text-black'}`}>{i + 1}. {q.question}</p>
              {q.type === 'single_choice' && <><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ваш: {ua !== undefined ? q.options[ua] : '—'}</p>{!ok && <p className={`font-mono text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>Правильный: {q.options[q.correct]}</p>}</>}
              {q.type === 'text' && <><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ваш ответ: {ua || '—'}</p><p className={`font-mono text-xs mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Ожидает проверки репетитора</p></>}
              {q.explanation && ok && <div className={`mt-2 p-2 border ${isDark ? 'border-white/20' : 'border-black/10'}`}><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>📖 {q.explanation}</p></div>}
            </div></div>
          </motion.div>);
        })}</div>
      </div>
      <div className="flex justify-center"><TTPDButton onClick={onBack} className="bg-black text-white dark:bg-white dark:text-black">← К АРХИВАМ</TTPDButton></div>
    </div>
  </motion.div>);
}

// ============ ПРОВЕРКА РУЧНОЙ ЧАСТИ (репетитор) ============
function ManualCheck({ uid, theme }: any) {
  const isDark = theme === 'dark'; const [results, setResults] = useState<any[]>([]); const [trials, setTrials] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [manualScores, setManualScores] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    Promise.all([getDocs(collection(db, "trial_results")), getDocs(collection(db, "exam_trials"))]).then(([rSnap, tSnap]) => {
      const res = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const tri = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResults(res.filter(r => r.manual_max > 0 || r.manualMax > 0));
      setTrials(tri);
      setLoading(false);
    });
  }, []);
  const getTrial = (id: string) => trials.find(t => t.id === id);
  const handleSaveScore = async (resultId: string, trial: any) => {
    const scores = manualScores[resultId] || {};
    const textQuestions = (trial.questions || []).filter((q: any) => q.type === 'text');
    let manualTotal = 0;
    textQuestions.forEach((q: any) => { manualTotal += scores[q.id] || 0; });
    const totalPrimary = (result.autoScore || 0) + manualTotal;
    const secondary = convertToSecondary(totalPrimary, trial.subject || 'chemistry');
    await updateDoc(doc(db, "trial_results", resultId), { manual_scores: scores, manual_total: manualTotal, total_primary: totalPrimary, secondary_score: secondary, checked_at: new Date().toISOString() });
    toast.success(`Проверено! Итого: ${totalPrimary} первичных → ${secondary} вторичных`);
  };
  if (loading) return <p className={`text-center py-16 ${isDark ? 'text-white' : 'text-black'}`}>Загрузка...</p>;
  return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className={`p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}><h3 className={`font-serif text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>✍️ РУЧНАЯ ПРОВЕРКА</h3><p className={`font-mono text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Задания с развёрнутым ответом ожидают проверки</p></div>
    {results.length === 0 ? (<div className={`text-center py-16 border-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}><p className={`font-serif text-xl ${isDark ? 'text-white' : 'text-black'}`}>Нет заданий для проверки ✨</p></div>) : results.map((r, idx) => {
      const trial = getTrial(r.trial_id); if (!trial) return null;
      const textQ = (trial.questions || []).filter((q: any) => q.type === 'text');
      return (<PolaroidCard key={r.id} delay={idx * 0.05}><div className={`p-6 border-2 ${isDark ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-yellow-300 bg-yellow-50'}`}>
        <h4 className={`font-serif text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-black'}`}>{trial.title}</h4>
        <p className={`font-mono text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Авто: {r.autoScore}/{r.autoMax} | Ручная: {r.manualMax || r.manual_max} баллов</p>
        <div className="space-y-4">{textQ.map((q: any) => (<div key={q.id} className={`p-3 border-2 ${isDark ? 'border-white/20 bg-white/5' : 'border-black/10 bg-white'}`}>
          <p className={`font-serif text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>{q.question}</p>
          <p className={`font-mono text-sm mb-2 p-2 ${isDark ? 'bg-black/50 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Ответ ученика: {r.answers?.[q.id] || '—'}</p>
          <div className="flex items-center gap-2"><label className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Балл (макс {q.points}):</label><input type="number" min={0} max={q.points || 1} value={manualScores[r.id]?.[q.id] ?? ''} onChange={(e) => setManualScores(p => ({ ...p, [r.id]: { ...(p[r.id] || {}), [q.id]: parseInt(e.target.value) || 0 } }))} className={`w-20 px-2 py-1 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'}`} /></div>
        </div>))}</div>
        <TTPDButton onClick={() => handleSaveScore(r.id, trial)} className="w-full mt-4 bg-black text-white dark:bg-white dark:text-black">💾 СОХРАНИТЬ ПРОВЕРКУ</TTPDButton>
      </div></PolaroidCard>);
    })}
  </motion.div>);
}

// ============ ТЕТРАДЬ ОШИБОК ============
function MistakeNotebook({ uid, theme }: any) {
  const isDark = theme === 'dark'; const [mistakes, setMistakes] = useState<any[]>([]); const [topicStats, setTopicStats] = useState<Record<string, { total: number; wrong: number }>>({}); const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    const fetch = async () => {
      const resultsSnap = await getDocs(query(collection(db, "trial_results"), where("student_id", "==", uid)));
      const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const all: any[] = []; const ts: Record<string, { total: number; wrong: number }> = {};
      for (const r of results) {
        const tSnap = await getDoc(doc(db, "exam_trials", r.trial_id));
        if (tSnap.exists()) {
          const t = { id: tSnap.id, ...tSnap.data() };
          (t.questions || []).forEach((q: any) => {
            if (q.type === 'single_choice') {
              const topics = q.topics || t.topics || ['Общее'];
              topics.forEach((topic: string) => { if (!ts[topic]) ts[topic] = { total: 0, wrong: 0 }; ts[topic].total++; });
              if (r.answers?.[q.id] !== q.correct) {
                all.push({ trial_id: t.id, trial_title: t.title, question: q, user_answer: r.answers?.[q.id] });
                topics.forEach((topic: string) => { ts[topic].wrong++; });
              }
            }
          });
        }
      }
      setMistakes(all); setTopicStats(ts); setLoading(false);
    };
    fetch();
  }, [uid]);
  if (loading) return <p className={`text-center py-16 ${isDark ? 'text-white' : 'text-black'}`}>Загрузка...</p>;
  const weakTopics = Object.entries(topicStats).filter(([_, s]) => s.total > 0).sort((a, b) => (b[1].wrong / b[1].total) - (a[1].wrong / a[1].total));
  return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className={`p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}>
      <h3 className={`font-serif text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>📓 ТЕТРАДЬ ОШИБОК</h3>
      <p className={`font-mono text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Всего ошибок: {mistakes.length}</p>
    </div>
    {weakTopics.length > 0 && (<div className={`p-6 border-2 ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-300 bg-red-50'}`}>
      <h4 className={`font-serif text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-black'}`}>🎯 СЛАБЫЕ ТЕМЫ</h4>
      <div className="space-y-2">{weakTopics.slice(0, 10).map(([topic, s]) => {
        const errRate = Math.round((s.wrong / s.total) * 100);
        return (<div key={topic}><div className="flex justify-between text-sm mb-1"><span className={isDark ? 'text-white' : 'text-black'}>{topic}</span><span className={`font-bold ${errRate > 50 ? 'text-red-500' : errRate > 30 ? 'text-yellow-500' : 'text-green-500'}`}>{errRate}% ошибок ({s.wrong}/{s.total})</span></div><div className={`h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><div className={`h-full rounded-full ${errRate > 50 ? 'bg-red-500' : errRate > 30 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${errRate}%` }} /></div></div>);
      })}</div>
    </div>)}
    <div className="space-y-3">{mistakes.slice(0, 20).map((m, i) => (<PolaroidCard key={i} delay={i * 0.03}><div className={`p-4 border-2 ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-300 bg-red-50'}`}><p className={`font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{m.trial_title}</p><p className={`font-serif text-sm font-bold mb-2 whitespace-pre-wrap ${isDark ? 'text-white' : 'text-black'}`}>{m.question.question}</p><p className={`font-mono text-xs ${isDark ? 'text-red-400' : 'text-red-700'}`}>Ваш: {m.question.options[m.user_answer]}</p><p className={`font-mono text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>Правильный: {m.question.options[m.question.correct]}</p>{m.question.explanation && <p className={`font-mono text-xs mt-2 p-2 ${isDark ? 'bg-white/5' : 'bg-white'}`}>📖 {m.question.explanation}</p>}</div></PolaroidCard>))}</div>
  </motion.div>);
}

// ============ ДОСТИЖЕНИЯ ============
function Achievements({ uid, theme }: any) {
  const isDark = theme === 'dark'; const [achs, setAchs] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const all = [{ id: 'first', name: 'Midnight Scholar', icon: '🌙', desc: 'Первый пробник', check: (s: any) => s.total >= 1 },{ id: 'five', name: 'Folklore Philosopher', icon: '📚', desc: '5 пробников', check: (s: any) => s.total >= 5 },{ id: 'perfect', name: 'Reputation Restored', icon: '🏆', desc: '100 баллов', check: (s: any) => s.best >= 100 },{ id: 'tortured', name: 'Tortured Student', icon: '🦢', desc: '10+ часов', check: (s: any) => s.hours > 10 },{ id: 'cardigan', name: 'Cardigan Comfort', icon: '🧣', desc: '3 пробника', check: (s: any) => s.total >= 3 },{ id: 'willow', name: 'Willow Wisdom', icon: '🌿', desc: 'Средний 70+', check: (s: any) => s.avg >= 70 }];
  useEffect(() => { if (!uid) return; getDocs(query(collection(db, "trial_results"), where("student_id", "==", uid))).then(snap => { const r = snap.docs.map(d => d.data()); const s = { total: r.length, avg: r.length ? Math.round(r.reduce((a, b) => a + (b.secondary_score || b.score || 0), 0) / r.length) : 0, best: r.length ? Math.max(...r.map(b => b.secondary_score || b.score || 0)) : 0, hours: Math.round(r.reduce((a, b) => a + (b.time_spent || 0), 0) / 3600) }; setAchs(all.map(a => ({ ...a, unlocked: a.check(s) }))); setLoading(false); }); }, [uid]);
  if (loading) return null;
  return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className={`p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}><h3 className={`font-serif text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>🏆 THE ANTHOLOGY OF BADGES</h3></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{achs.map((a, i) => (<PolaroidCard key={a.id} delay={i * 0.1}><div className={`p-6 border-2 ${a.unlocked ? isDark ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-yellow-400 bg-yellow-50' : isDark ? 'border-white/20 opacity-50' : 'border-black/20 opacity-50'}`}><div className="text-5xl mb-3">{a.icon}</div><h4 className={`font-serif text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>{a.name}</h4><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{a.desc}</p>{a.unlocked && <div className={`mt-3 px-3 py-1 inline-block ${isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-200 text-yellow-800'} font-mono text-xs`}>✓ ПОЛУЧЕНО</div>}</div></PolaroidCard>))}</div>
  </motion.div>);
}

// ============ РЕЗУЛЬТАТЫ УЧЕНИКОВ ============
function StudentResults({ uid, theme }: any) {
  const isDark = theme === 'dark'; const [data, setData] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([getDocs(collection(db, "trial_results")), getDocs(query(collection(db, "profiles"), where("role", "==", "student")))]).then(([rSnap, sSnap]) => { const r = rSnap.docs.map(d => d.data()); const s = sSnap.docs.map(d => ({ id: d.id, ...d.data() })); setData(s.map(st => { const sr = r.filter(x => x.student_id === st.id); return { student: st, count: sr.length, avg: sr.length ? Math.round(sr.reduce((a, b) => a + (b.secondary_score || 0), 0) / sr.length) : 0, best: sr.length ? Math.max(...sr.map(b => b.secondary_score || 0)) : 0 }; }).filter(x => x.count > 0)); setLoading(false); }); }, []);
  if (loading) return null;
  return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
    <div className={`p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}><h3 className={`font-serif text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>📊 РЕЗУЛЬТАТЫ УЧЕНИКОВ</h3></div>
    {data.length === 0 ? <p className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Нет результатов</p> : data.map((d, i) => (<PolaroidCard key={d.student.id} delay={i * 0.05}><div className={`p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold`}>{(d.student.full_name || '?')[0]}</div><div><h4 className={`font-serif font-bold ${isDark ? 'text-white' : 'text-black'}`}>{d.student.full_name}</h4><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Попыток: {d.count}</p></div></div><div className="text-right"><p className="font-serif text-3xl font-bold text-purple-500">{d.avg}</p><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Лучший: {d.best}</p></div></div><div className={`h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}><div className={`h-full rounded-full ${d.avg >= 70 ? 'bg-green-500' : d.avg >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${d.avg}%` }} /></div></div></PolaroidCard>))}
  </motion.div>);
}

// ============ СОЗДАНИЕ ПРОБНИКА ============
function CreateTrialModal({ isOpen, onClose, uid, theme }: any) {
  const isDark = theme === 'dark'; const [title, setTitle] = useState(''); const [subject, setSubject] = useState('chemistry'); const [duration, setDuration] = useState(60); const [topics, setTopics] = useState(''); const [saving, setSaving] = useState(false);
  if (!isOpen) return null;
  const save = async () => { if (!title) return toast.error("Введите название!"); setSaving(true); try { await addDoc(collection(db, "exam_trials"), { title, subject, duration: parseInt(duration), topics: topics.split(',').map(t => t.trim()).filter(Boolean), tutor_id: uid, questions: [], max_score: 0, created_at: new Date().toISOString(), status: 'published' }); toast.success("Создано! Теперь добавьте вопросы."); onClose(); setTitle(''); setTopics(''); } catch (e) { toast.error("Ошибка"); } setSaving(false); };
  return (<motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.div className="absolute inset-0 bg-black/80" onClick={onClose} /><motion.div className={`relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
    <div className={`p-5 border-b-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}><h2 className={`font-serif text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>📝 СОЗДАТЬ ПРОБНИК</h2></div>
    <div className="p-6 space-y-4">
      <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>НАЗВАНИЕ *</label><input value={title} onChange={e => setTitle(e.target.value)} className={`w-full px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'}`} /></div>
      <div className="grid grid-cols-2 gap-4"><div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ПРЕДМЕТ</label><select value={subject} onChange={e => setSubject(e.target.value)} className={`w-full px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'}`}><option value="chemistry">🧪 ХИМИЯ</option><option value="biology">🧬 БИОЛОГИЯ</option></select></div><div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ВРЕМЯ (МИН)</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} className={`w-full px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'}`} /></div></div>
      <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ТЕМЫ</label><input value={topics} onChange={e => setTopics(e.target.value)} placeholder="ОВР, Электролиз..." className={`w-full px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'}`} /></div>
      <div className="flex gap-3 pt-4"><TTPDButton onClick={save} className="flex-1 bg-black text-white dark:bg-white dark:text-black" disabled={saving}>{saving ? '...' : 'СОЗДАТЬ'}</TTPDButton><TTPDButton onClick={onClose} className="flex-1">ОТМЕНА</TTPDButton></div>
    </div>
  </motion.div></motion.div>);
}

// ============ РЕДАКТОР ВОПРОСОВ ============
function QuestionEditor({ trial, onClose, theme }: any) {
  const isDark = theme === 'dark'; const [questions, setQuestions] = useState<any[]>(trial.questions || []); const [eq, setEq] = useState<any>(null); const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await updateDoc(doc(db, "exam_trials", trial.id), { questions, max_score: questions.reduce((s, q) => s + (q.points || 1), 0), questions_count: questions.length }); toast.success("Сохранено!"); onClose(); } catch (e) { toast.error("Ошибка"); } setSaving(false); };
  const add = () => { const nq = { id: `q_${Date.now()}`, type: 'single_choice', question: '', options: ['','','',''], correct: 0, points: 1, explanation: '', topics: [] }; setQuestions([...questions, nq]); setEq(nq); };
  const upd = (i: number, u: any) => { const n = [...questions]; n[i] = u; setQuestions(n); setEq(u); };
  const idx = () => questions.findIndex(q => q.id === eq?.id);
  return (<motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.div className="absolute inset-0 bg-black/80" onClick={onClose} /><motion.div className={`relative max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
    <div className={`p-5 border-b-2 ${isDark ? 'border-white/20' : 'border-black/10'} flex justify-between`}><div><h2 className={`font-serif text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>📝 ВОПРОСЫ</h2><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{trial.title}</p></div><motion.button onClick={onClose} className="text-3xl" whileHover={{ rotate: 90 }}>×</motion.button></div>
    <div className="flex h-[calc(90vh-140px)]">
      <div className={`w-1/3 border-r-2 overflow-y-auto ${isDark ? 'border-white/20' : 'border-black/10'}`}>
        <div className={`p-4 border-b-2 ${isDark ? 'border-white/20' : 'border-black/10'}`}><TTPDButton onClick={add} className="w-full bg-black text-white dark:bg-white dark:text-black">+ ВОПРОС</TTPDButton></div>
        <div className="p-3 space-y-2">{questions.map((q, i) => (<div key={q.id} onClick={() => setEq(q)} className={`p-3 border-2 cursor-pointer ${eq?.id === q.id ? isDark ? 'border-white bg-white/10' : 'border-black bg-black/5' : isDark ? 'border-white/20' : 'border-black/20'}`}><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>#{i+1} {q.type === 'text' ? '✍️' : '⚡'} {q.points}б</p><p className={`font-serif text-sm truncate ${isDark ? 'text-white' : 'text-black'}`}>{q.question || '—'}</p></div>))}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{eq ? (<div className="space-y-4">
        <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ТИП</label><select value={eq.type} onChange={e => upd(idx(), { ...eq, type: e.target.value })} className={`w-full px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20'}`}><option value="single_choice">⚡ АВТО (тест)</option><option value="text">✍️ РУЧНАЯ (развёрнутый)</option></select></div>
        <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ВОПРОС 🧪</label><ChemistryEditor value={eq.question} onChange={v => upd(idx(), { ...eq, question: v })} rows={3} theme={theme} /></div>
        {eq.type === 'single_choice' && <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ВАРИАНТЫ</label><div className="space-y-2">{eq.options.map((o: string, i: number) => (<div key={i} className="flex gap-2"><input type="radio" checked={eq.correct === i} onChange={() => upd(idx(), { ...eq, correct: i })} /><input value={o} onChange={e => { const no = [...eq.options]; no[i] = e.target.value; upd(idx(), { ...eq, options: no }); }} className={`flex-1 px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20'}`} /></div>))}</div></div>}
        <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>📖 РАЗБОР 🧪</label><ChemistryEditor value={eq.explanation || ''} onChange={v => upd(idx(), { ...eq, explanation: v })} placeholder="Объяснение..." rows={3} theme={theme} /></div>
        <div><label className={`block font-mono text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>БАЛЛЫ</label><input type="number" value={eq.points} onChange={e => upd(idx(), { ...eq, points: parseInt(e.target.value) || 1 })} className={`w-full px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20'}`} /></div>
        <TTPDButton onClick={() => { if (!confirm('Удалить?')) return; setQuestions(questions.filter(q => q.id !== eq.id)); setEq(null); }} className="w-full border-red-500 text-red-500">🗑️ УДАЛИТЬ</TTPDButton>
      </div>) : <p className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Выберите вопрос</p>}</div>
    </div>
    <div className={`p-4 border-t-2 ${isDark ? 'border-white/20' : 'border-black/10'} flex justify-between`}><p className={`font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Вопросов: {questions.length} | Макс: {questions.reduce((s, q) => s + (q.points || 1), 0)}</p><div className="flex gap-3"><TTPDButton onClick={onClose}>ОТМЕНА</TTPDButton><TTPDButton onClick={save} className="bg-black text-white dark:bg-white dark:text-black" disabled={saving}>{saving ? '...' : '💾 СОХРАНИТЬ'}</TTPDButton></div></div>
  </motion.div></motion.div>);
}

// ============ MAIN ============
function ExamTrialsContent() {
  const sp = useSearchParams(); const [uid, setUid] = useState(""); const [role, setRole] = useState("student"); const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [trials, setTrials] = useState<any[]>([]); const [results, setResults] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('КАТАЛОГ'); const [view, setView] = useState<'catalog' | 'taking' | 'results'>('catalog');
  const [activeTrial, setActiveTrial] = useState<any>(null); const [lastResult, setLastResult] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false); const [editTrial, setEditTrial] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true); const [searchQ, setSearchQ] = useState('');
  const isTutor = role === 'tutor'; const isDark = theme === 'dark';

  useEffect(() => { setUid(sp.get("uid") || (typeof window !== 'undefined' ? localStorage.getItem("uid") : "") || ""); setRole(sp.get("role") || (typeof window !== 'undefined' ? localStorage.getItem("role") : "") || "student"); const st = localStorage.getItem('theme') as any; if (st) setTheme(st); if (localStorage.getItem('ttpd_sound') === 'off') setSoundEnabled(false); }, [sp]);

  useEffect(() => { if (!uid) return; const u = onSnapshot(query(collection(db, "exam_trials")), s => { setTrials(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }); return () => u(); }, [uid]);
  useEffect(() => { if (!uid) return; const u = onSnapshot(query(collection(db, "trial_results"), where("student_id", "==", uid)), s => setResults(s.docs.map(d => ({ id: d.id, ...d.data() })))); return () => u(); }, [uid]);

  const filtered = useMemo(() => trials.filter(t => { if (isTutor && t.tutor_id !== uid) return false; if (searchQ && !t.title.toLowerCase().includes(searchQ.toLowerCase())) return false; return true; }), [trials, searchQ, uid, isTutor]);

  const startTrial = (t: any) => { if (!t.questions?.length) return toast.error("Нет вопросов!"); setActiveTrial(t); setView('taking'); };
  const finishTrial = async (r: any) => { try { await addDoc(collection(db, "trial_results"), { trial_id: activeTrial.id, student_id: uid, autoScore: r.autoScore, autoMax: r.autoMax, manualMax: r.manualMax, answers: r.answers, time_spent: r.timeSpent, secondary_score: convertToSecondary(r.autoScore, activeTrial.subject || 'chemistry'), completed_at: new Date().toISOString() }); toast.success("Результат сохранён!"); } catch (e) { toast.error("Ошибка"); } setLastResult(r); setView('results'); };

  if (view === 'taking' && activeTrial) return <TrialTaking trial={activeTrial} uid={uid} theme={theme} onFinish={finishTrial} />;
  if (view === 'results' && activeTrial && lastResult) return <TrialResults trial={activeTrial} result={lastResult} theme={theme} onBack={() => { setView('catalog'); setActiveTrial(null); setLastResult(null); }} />;

  return (<div className={`min-h-screen relative ${isDark ? 'bg-black' : 'bg-[#f5f5f0]'}`}>
    <Sidebar theme={theme} /><div className="fixed top-4 right-20 z-50"><NotificationBell uid={uid} role={role} isDark={isDark} /></div>
    <div className="relative z-20 max-w-7xl mx-auto p-4 sm:p-6 pt-20">
      <TTPDHeader theme={theme} onThemeToggle={() => { const n = isDark ? 'light' : 'dark'; setTheme(n); localStorage.setItem('theme', n); }} onBack={() => window.history.back()} activeTab={tab} setActiveTab={setTab} isTutor={isTutor} soundEnabled={soundEnabled} onToggleSound={() => { const n = !soundEnabled; setSoundEnabled(n); localStorage.setItem('ttpd_sound', n ? 'on' : 'off'); }} />

      {tab === 'КАТАЛОГ' && (<>
        <div className="mb-4 flex gap-2">{isTutor && <TTPDButton onClick={() => setShowCreate(true)} className="bg-black text-white dark:bg-white dark:text-black">+ СОЗДАТЬ</TTPDButton>}<input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 Поиск..." className={`flex-1 px-3 py-2 border-2 font-mono text-sm ${isDark ? 'border-white/30 bg-black text-white' : 'border-black/20 bg-white text-black'}`} /></div>
        {loading ? <p className={`text-center py-16 ${isDark ? 'text-white' : 'text-black'}`}><TypewriterText text="Загрузка..." /></p> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map((t, i) => (<TrialCard key={t.id} trial={t} index={i} theme={theme} role={role} results={results} onStart={startTrial} onEdit={setEditTrial} />))}{filtered.length === 0 && <p className={`text-center py-16 col-span-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ничего не найдено</p>}</div>}
      </>)}
      {tab === 'МОИ РЕЗУЛЬТАТЫ' && !isTutor && (<div className="space-y-4">{results.length === 0 ? <p className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Нет результатов</p> : results.map((r, i) => { const t = trials.find(x => x.id === r.trial_id); return (<PolaroidCard key={r.id} delay={i * 0.05}><div className={`p-6 border-2 ${isDark ? 'border-white/30 bg-white/5' : 'border-black/20 bg-white'}`}><h4 className={`font-serif font-bold ${isDark ? 'text-white' : 'text-black'}`}>{t?.title || 'Пробник'}</h4><div className="grid grid-cols-3 gap-4 mt-3"><div><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Первичный</p><p className={`font-serif text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>{r.autoScore}/{r.autoMax}</p></div><div><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Вторичный</p><p className="font-serif text-xl font-bold text-purple-500">{r.secondary_score}/100</p></div><div><p className={`font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ручная</p><p className="font-serif text-xl font-bold text-yellow-500">{r.manualMax > 0 ? '⏳' : '✓'}</p></div></div></div></PolaroidCard>); })}</div>)}
      {tab === 'ТЕТРАДЬ ОШИБОК' && !isTutor && <MistakeNotebook uid={uid} theme={theme} />}
      {tab === 'ДОСТИЖЕНИЯ' && !isTutor && <Achievements uid={uid} theme={theme} />}
      {tab === 'ПРОВЕРКА' && isTutor && <ManualCheck uid={uid} theme={theme} />}
      {tab === 'РЕЗУЛЬТАТЫ УЧЕНИКОВ' && isTutor && <StudentResults uid={uid} theme={theme} />}
      {tab === 'СОЗДАТЬ' && isTutor && <div className={`text-center py-16 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Нажмите "+ СОЗДАТЬ" в каталоге</div>}
    </div>
    <AnimatePresence>{showCreate && <CreateTrialModal isOpen={showCreate} onClose={() => setShowCreate(false)} uid={uid} theme={theme} />}</AnimatePresence>
    <AnimatePresence>{editTrial && <QuestionEditor trial={editTrial} onClose={() => setEditTrial(null)} theme={theme} />}</AnimatePresence>
  </div>);
}

export default function ExamTrialsPage() { return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><div className="text-white font-serif text-2xl"><TypewriterText text="Загрузка..." /></div></div>}><ExamTrialsContent /></Suspense>); }