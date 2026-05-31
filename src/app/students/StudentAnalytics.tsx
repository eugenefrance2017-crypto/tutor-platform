"use client";

import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

const CHEMISTRY_TOPICS: Record<string, string> = {
  "1": "Строение атома", "2": "Периодический закон", "3": "Хим. связь",
  "23": "ОВР", "24": "Электролиз", "26": "Расчёты по формулам",
  "27": "Расчёты по уравнениям", "28": "Массовая доля", "29": "Термохимия", "34": "Комбинированные задачи"
};
const BIOLOGY_TOPICS: Record<string, string> = {
  "3": "Хим. состав клетки", "4": "Обмен веществ", "6": "Биосинтез белка",
  "9": "Генетика", "25": "Нервная система", "27": "Кровь, иммунитет", "28": "Пищеварение"
};

export default function StudentAnalytics({ studentId }: { studentId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [trials, setTrials] = useState<any[]>([]);

  useEffect(() => {
    if (!studentId) return;
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where("student_id", "==", studentId)), (snap) => setHomeworks(snap.docs.map((d) => d.data())));
    const unsubSub = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", studentId)), (snap) => setSubmissions(snap.docs.map((d) => d.data())));
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", studentId)), (snap) => setLessons(snap.docs.map((d) => d.data())));
    const unsubTrials = onSnapshot(query(collection(db, "exam_trials"), where("student_id", "==", studentId)), (snap) => setTrials(snap.docs.map((d) => d.data())));
    return () => { unsubHw(); unsubSub(); unsubLessons(); unsubTrials(); };
  }, [studentId]);

  const totalHw = homeworks.length;
  const doneHw = homeworks.filter(h => h.status === "done").length;
  const completionRate = totalHw > 0 ? Math.round((doneHw / totalHw) * 100) : 0;
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => l.status === "completed").length;
  const attendance = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length * 10) / 10 : 0;

  const predictEGE = () => {
    if (submissions.length < 2 && trials.length === 0) return { score: 0, level: "Недостаточно данных" };
    let totalPercent = 0, count = 0;
    submissions.forEach(sub => { if (sub.score !== undefined && sub.max_score) { totalPercent += (sub.score / sub.max_score) * 100; count++; } });
    trials.forEach(trial => { if (trial.test_score) { totalPercent += trial.test_score; count++; } });
    if (count === 0) return { score: 0, level: "Нет данных" };
    const avg = Math.round(totalPercent / count);
    let level = avg >= 80 ? "Отлично! 🎉" : avg >= 60 ? "Хорошо 👍" : avg >= 40 ? "Нужно подтянуть 📚" : "Усиленная подготовка 💪";
    return { score: Math.min(100, avg), level };
  };
  const egePrediction = predictEGE();

  const scoreData = submissions.filter(s => s.score !== undefined).sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()).slice(-10).map(s => ({ name: new Date(s.submitted_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), балл: s.score }));
  const trialData = trials.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => ({ name: new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), балл: t.test_score }));
  const allScoreData = [...scoreData, ...trialData].sort((a, b) => a.name.localeCompare(b.name)).slice(-12);

  const chemTrials = trials.filter(t => t.subject === "chemistry");
  const bioTrials = trials.filter(t => t.subject === "biology");
  const latestChem = chemTrials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const latestBio = bioTrials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const barData = [{ name: '🧪 Химия', балл: latestChem?.test_score || 0 }, { name: '🧬 Биология', балл: latestBio?.test_score || 0 }];

  // Слабые темы
  const topicStats: Record<string, { correct: number; total: number }> = {};
  submissions.forEach(sub => {
    const hw = homeworks.find(h => h.id === sub.homework_id);
    hw?.sections?.forEach((sec: any) => {
      const score = sub.section_scores?.[sec.id];
      if (score !== undefined && sec.taskNumber) {
        const num = String(sec.taskNumber);
        if (!topicStats[num]) topicStats[num] = { correct: 0, total: 0 };
        topicStats[num].total++;
        if (score >= sec.max_score) topicStats[num].correct++;
      }
    });
  });

  const weakTopics = Object.entries(topicStats)
    .filter(([_, stats]) => stats.total >= 2)
    .map(([num, stats]) => ({
      number: num,
      name: CHEMISTRY_TOPICS[num] || BIOLOGY_TOPICS[num] || `Тема №${num}`,
      percent: Math.round((stats.correct / stats.total) * 100),
      total: stats.total,
    }))
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {trials.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-200">
          <h3 className="font-semibold text-gray-800 mb-3">📝 Результаты пробников</h3>
          <div className="space-y-2">
            {trials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((trial, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-white/60 rounded-lg p-2">
                <div className="flex items-center gap-2"><span>{trial.subject === "chemistry" ? "🧪" : "🧬"}</span><span>{new Date(trial.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span></div>
                <span className="font-bold text-rose-600">{trial.test_score} баллов</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{ label: "Сдано ДЗ", value: `${doneHw}/${totalHw}`, sub: `${completionRate}%`, icon: "📚", color: "from-indigo-500 to-blue-500" }, { label: "Средний балл", value: avgScore, sub: "за задание", icon: "⭐", color: "from-amber-500 to-orange-500" }, { label: "Посещаемость", value: `${attendance}%`, sub: `${completedLessons}/${totalLessons}`, icon: "📅", color: "from-emerald-500 to-green-500" }, { label: "Прогноз ЕГЭ", value: egePrediction.score, sub: "из 100 баллов", icon: "🎯", color: "from-rose-500 to-pink-500" }].map((stat) => (
          <div key={stat.label} className="bg-white/80 rounded-2xl p-4 shadow-sm border text-center"><span className="text-2xl">{stat.icon}</span><p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p><p className="text-xs text-gray-500">{stat.sub}</p></div>
        ))}
      </div>
      {egePrediction.score > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">🎯 Прогноз балла ЕГЭ</h3><span className="text-3xl font-bold text-indigo-600">{egePrediction.score}</span></div>
          <p className="text-sm text-gray-600 mb-3">{egePrediction.level}</p>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"><div className="bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 h-4 rounded-full" style={{ width: `${egePrediction.score}%` }} /></div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 rounded-2xl p-5 shadow-sm border"><h3 className="font-semibold mb-4">📈 Успеваемость + пробники</h3>{allScoreData.length > 0 ? <ResponsiveContainer width="100%" height={220}><LineChart data={allScoreData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="балл" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} /></LineChart></ResponsiveContainer> : <p className="text-gray-400 text-sm text-center py-8">Нет данных</p>}</div>
        <div className="bg-white/80 rounded-2xl p-5 shadow-sm border"><h3 className="font-semibold mb-4">🧪 Последние пробники</h3><ResponsiveContainer width="100%" height={220}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 11 }} domain={[0, 100]} /><Tooltip /><Bar dataKey="балл" fill="#f43f5e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
      {weakTopics.length > 0 && (
        <div className="bg-white/80 rounded-2xl p-5 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-4">⚠️ Слабые темы</h3>
          <div className="space-y-3">
            {weakTopics.map((topic) => (
              <div key={topic.number}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 truncate flex-1 mr-2">№{topic.number} {topic.name}</span>
                  <span className={`font-medium ${topic.percent >= 70 ? 'text-emerald-600' : topic.percent >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{topic.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${topic.percent >= 70 ? 'bg-emerald-500' : topic.percent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${topic.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}