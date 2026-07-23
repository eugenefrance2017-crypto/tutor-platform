"use client";

import { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

interface StudentAnalyticsProps {
  studentId: string;
  lessons?: any[];
  homeworks?: any[];
  submissions?: any[];
  trials?: any[];
}

export default function StudentAnalytics({ 
  studentId, 
  lessons: propLessons, 
  homeworks: propHomeworks, 
  submissions: propSubmissions, 
  trials: propTrials 
}: StudentAnalyticsProps) {
  const [localSubmissions, setLocalSubmissions] = useState<any[]>([]);
  const [localHomeworks, setLocalHomeworks] = useState<any[]>([]);
  const [localLessons, setLocalLessons] = useState<any[]>([]);
  const [localTrials, setLocalTrials] = useState<any[]>([]);

  useEffect(() => {
    if (propLessons !== undefined) return;
    if (!studentId) return;
    
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", studentId)), (snap) => setLocalHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubSub = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", studentId)), (snap) => setLocalSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", studentId)), (snap) => setLocalLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTrials = onSnapshot(query(collection(db, "exam_trials"), where("student_id", "==", studentId)), (snap) => setLocalTrials(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubHw(); unsubSub(); unsubLessons(); unsubTrials(); };
  }, [studentId, propLessons]);

  const lessons = propLessons !== undefined ? propLessons : localLessons;
  const homeworks = propHomeworks !== undefined ? propHomeworks : localHomeworks;
  const submissions = propSubmissions !== undefined ? propSubmissions : localSubmissions;
  const trials = propTrials !== undefined ? propTrials : localTrials;

  const stats = useMemo(() => {
    const totalHw = homeworks.length;
    const doneHw = homeworks.filter((h: any) => h.status === "done").length;
    const completionRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
    
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l: any) => l.status === "completed").length;
    const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    
    const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((sum: number, s: any) => {
      const hw = homeworks.find((h: any) => h.id === s.homework_id);
      return sum + (hw?.max_score ? (s.score / hw.max_score) * 10 : 0);
    }, 0) / submissions.length * 10) / 10 : 0;
    
    return { totalHw, doneHw, completionRate, totalLessons, completedLessons, attendance, avgScore };
  }, [homeworks, lessons, submissions]);

  const scoreData = useMemo(() => {
    return submissions
      .filter((s: any) => s.score !== undefined && s.submitted_at)
      .sort((a: any, b: any) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .slice(-10)
      .map((s: any) => {
        const hw = homeworks.find((h: any) => h.id === s.homework_id);
        const percent = hw?.max_score ? Math.round((s.score / hw.max_score) * 100) : 0;
        return {
          date: s.submitted_at?.seconds 
            ? new Date(s.submitted_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) 
            : "",
          балл: percent,
        };
      })
      .filter((d: any) => d.date !== "");
  }, [submissions, homeworks]);

  const egePrediction = useMemo(() => {
    if (trials.length === 0) return null;
    const recent = [...trials].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
    const avg = Math.round(recent.reduce((s: number, t: any) => s + (t.test_score || 0), 0) / recent.length);
    const prediction = Math.min(100, Math.round(avg * 1.05));
    const level = prediction >= 85 ? "Отлично 🎉" : prediction >= 65 ? "Хорошо 👍" : prediction >= 40 ? "Подтянуть 📚" : "Усиленная подготовка 💪";
    return { score: prediction, level };
  }, [trials]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ЗАНЯТИЙ", value: stats.totalLessons, sub: `${stats.completedLessons} проведено`, icon: "📅", color: "from-sky-500 to-blue-600" },
          { label: "ЗАДАНИЙ", value: stats.totalHw, sub: `${stats.doneHw} из ${stats.totalHw} проверено`, icon: "", color: "from-pink-500 to-rose-500" },
          { label: "ПОСЕЩ.", value: `${stats.attendance}%`, sub: "от всех", icon: "📊", color: "from-emerald-500 to-teal-500" },
          { label: "СРЕД. БАЛЛ", value: stats.avgScore, sub: "из 10.0", icon: "", color: "from-amber-500 to-orange-500" },
        ].map((stat: any) => (
          <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 border-2 border-sky-100 text-center hover:scale-[1.02] transition-shadow shadow-sm hover:shadow-md">
            <span className="text-2xl block mb-1">{stat.icon}</span>
            <p className={`text-2xl font-black mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">{stat.sub}</p>
          </div>
        ))}
      </div>

      {egePrediction && (
        <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-3xl p-5 border-2 border-sky-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold text-stone-800 flex items-center gap-2">🎯 Прогноз ЕГЭ</h3>
            <div className="text-3xl font-black bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">{egePrediction.score}</div>
          </div>
          <p className="text-sm text-stone-600 mb-3 font-medium">{egePrediction.level}</p>
          <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden border border-sky-200/50">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${egePrediction.score}%` }} />
          </div>
        </div>
      )}

      {scoreData.length > 0 ? (
        <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-sky-100 shadow-sm">
          <h3 className="font-serif font-bold text-stone-700 mb-4 flex items-center gap-2">📈 Динамика успеваемости (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#0369a1', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#0369a1', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #0ea5e9', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#0284c7', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="балл" stroke="#0284c7" strokeWidth={3} fill="url(#colorScore)" activeDot={{ r: 6, fill: '#0284c7', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur rounded-3xl p-8 border-2 border-dashed border-sky-200 text-center">
          <p className="text-5xl mb-3 animate-pulse">📸</p>
          <p className="text-stone-600 font-bold text-lg">Пока нет данных для графика</p>
          <p className="text-stone-400 text-sm italic mt-1">"We are never ever getting back to zero" (скоро будут первые баллы!)</p>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-sky-100 space-y-5 shadow-sm">
        <h3 className="font-serif font-bold text-stone-700 flex items-center gap-2"> Ключевые показатели</h3>
        {[
          { label: "Посещаемость", value: stats.attendance, color: "from-sky-400 to-blue-500", icon: "📅" },
          { label: "Сдача ДЗ", value: stats.completionRate, color: "from-pink-400 to-rose-500", icon: "📚" },
        ].map((bar: any) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-stone-600 font-bold uppercase text-xs flex items-center gap-1.5"><span>{bar.icon}</span> {bar.label}</span>
              <span className="font-black text-stone-800">{bar.value}%</span>
            </div>
            <div className="w-full bg-sky-100 rounded-full h-3 overflow-hidden border border-sky-200/50">
              <div className={`h-3 rounded-full bg-gradient-to-r ${bar.color} transition-all duration-1000 ease-out`} style={{ width: `${bar.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}