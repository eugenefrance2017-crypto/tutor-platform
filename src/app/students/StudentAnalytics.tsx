"use client";
import { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

export default function StudentAnalytics({ studentId }: { studentId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  useEffect(() => {
    if (!studentId) return;
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", studentId)), (snap) => setHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubSub = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", studentId)), (snap) => setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", studentId)), (snap) => setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTrials = onSnapshot(query(collection(db, "exam_trials"), where("student_id", "==", studentId)), (snap) => setTrials(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubHw(); unsubSub(); unsubLessons(); unsubTrials(); };
  }, [studentId]);

  const stats = useMemo(() => {
    const totalHw = homeworks.length;
    const doneHw = homeworks.filter(h => h.status === "done").length;
    const completionRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.status === "completed").length;
    const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((sum, s) => {
      const hw = homeworks.find(h => h.id === s.homework_id);
      return sum + (hw?.max_score ? (s.score / hw.max_score) * 10 : 0);
    }, 0) / submissions.length * 10) / 10 : 0;
    return { totalHw, doneHw, completionRate, totalLessons, completedLessons, attendance, avgScore };
  }, [homeworks, lessons, submissions]);

  const scoreData = useMemo(() => {
    return submissions.filter(s => s.score !== undefined && s.submitted_at)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .slice(-10).map(s => {
        const hw = homeworks.find(h => h.id === s.homework_id);
        const percent = hw?.max_score ? Math.round((s.score / hw.max_score) * 100) : 0;
        return {
          date: s.submitted_at?.seconds ? new Date(s.submitted_at.seconds * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "",
          балл: percent,
        };
      }).filter(d => d.date !== "");
  }, [submissions, homeworks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ЗАНЯТИЙ", value: stats.totalLessons, sub: stats.completedLessons + " проведено", icon: "📅", color: "from-sky-500 to-blue-600" },
          { label: "ЗАДАНИЙ", value: stats.totalHw, sub: stats.doneHw + " проверено", icon: "📚", color: "from-pink-500 to-rose-500" },
          { label: "ПОСЕЩ.", value: stats.attendance + "%", sub: "от всех", icon: "📊", color: "from-emerald-500 to-teal-500" },
          { label: "СДАНО ДЗ", value: stats.completionRate + "%", sub: "от всех", icon: "⭐", color: "from-amber-500 to-orange-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 border-2 border-sky-100 text-center hover:scale-[1.02] transition">
            <span className="text-2xl">{stat.icon}</span>
            <p className={"text-2xl font-black mt-2 bg-gradient-to-r " + stat.color + " bg-clip-text text-transparent"}>{stat.value}</p>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">{stat.sub}</p>
          </div>
        ))}
      </div>

      {scoreData.length > 0 && (
        <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-sky-100">
          <h3 className="font-serif font-bold text-stone-700 mb-4">📈 Динамика успеваемости</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14, 165, 233, 0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0369a1' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#0369a1' }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '2px solid #0ea5e9', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="балл" stroke="#0284c7" strokeWidth={2} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-sky-100 space-y-4">
        <h3 className="font-serif font-bold text-stone-700">📈 Прогресс</h3>
        {[
          { label: "Посещаемость", value: stats.attendance, color: "from-sky-400 to-blue-500" },
          { label: "Сдача ДЗ", value: stats.completionRate, color: "from-pink-400 to-rose-500" },
        ].map((bar) => (
          <div key={bar.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-stone-600 font-bold uppercase text-xs">{bar.label}</span>
              <span className="font-black text-stone-800">{bar.value}%</span>
            </div>
            <div className="w-full bg-sky-100 rounded-full h-3 overflow-hidden border border-sky-200">
              <div className={"h-3 rounded-full bg-gradient-to-r " + bar.color + " transition-all duration-700"} style={{ width: bar.value + "%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}