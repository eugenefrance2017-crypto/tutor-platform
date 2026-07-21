"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function DailyContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; score: number } | null>(null);
  const [streak, setStreak] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    loadDailyTask();
    loadProfile();
  }, [uid]);

  async function loadProfile() {
    const snap = await getDoc(doc(db, "profiles", uid));
    if (snap.exists()) {
      const data = snap.data();
      setProfile(data);
      setStreak(data.daily_streak || 0);
      
      // Проверяем, решал ли сегодня
      const today = new Date().toISOString().slice(0, 10);
      if (data.last_daily_date === today) {
        setTodayCompleted(true);
      }
    }
  }

  async function loadDailyTask() {
    // Ищем задание дня
    const today = new Date().toISOString().slice(0, 10);
    const dailySnap = await getDocs(query(
      collection(db, "daily_tasks"),
      where("date", "==", today)
    ));

    if (!dailySnap.empty) {
      const dailyTask = dailySnap.docs[0].data();
      const itemSnap = await getDoc(doc(db, "library_items", dailyTask.item_id));
      if (itemSnap.exists()) {
        setTask({ id: itemSnap.id, ...itemSnap.data() });
        setLoading(false);
        return;
      }
    }

    // Если задания дня нет — создаём новое
    await generateDailyTask();
  }

  async function generateDailyTask() {
    // Берём случайное задание из библиотеки репетитора
    const tutorId = profile?.tutor_id || uid;
    const itemsSnap = await getDocs(query(
      collection(db, "library_items"),
      where("tutor_id", "==", tutorId)
    ));

    if (itemsSnap.empty) {
      setLoading(false);
      return;
    }

    const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const randomItem = items[Math.floor(Math.random() * items.length)];

    // Сохраняем как задание дня
    const today = new Date().toISOString().slice(0, 10);
    await addDoc(collection(db, "daily_tasks"), {
      date: today,
      item_id: randomItem.id,
      tutor_id: tutorId,
      created_at: new Date().toISOString(),
    });

    setTask(randomItem);
    setLoading(false);
  }

  async function submitAnswer() {
    if (!task || !answer.trim()) return;
    
    const section = task.sections?.[0];
    if (!section) return;

    let correct = false;
    let score = 0;

    // Простая проверка для текстовых заданий
    if (section.type === "text" || section.type === "single_choice") {
      const correctAnswer = section.data?.correct_answer || "";
      correct = answer.trim().toLowerCase() === correctAnswer.toLowerCase();
      score = correct ? 10 : 0;
    }

    setResult({ correct, score });
    setSubmitted(true);

    if (correct) {
      // Обновляем серию
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      
      let newStreak = 1;
      if (profile?.last_daily_date === yesterday) {
        newStreak = streak + 1;
      }

      // Множитель XP
      let multiplier = 1;
      if (newStreak >= 30) multiplier = 5;
      else if (newStreak >= 7) multiplier = 3;
      else if (newStreak >= 3) multiplier = 2;

      const xpEarned = score * multiplier;
      const newXp = (profile?.xp || 0) + xpEarned;
      const newLevel = Math.floor(newXp / 100) + 1;

      await updateDoc(doc(db, "profiles", uid), {
        xp: newXp,
        level: newLevel,
        daily_streak: newStreak,
        last_daily_date: today,
      });

      setStreak(newStreak);
      setTodayCompleted(true);
      toast.success(`+${xpEarned} XP! Серия: ${newStreak} дней 🔥`);
    }

    // Сохраняем ответ
    await addDoc(collection(db, "daily_answers"), {
      user_id: uid,
      task_id: task.id,
      answer: answer.trim(),
      correct,
      score,
      date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    });
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-xl font-bold text-gray-800">🏆 Ежедневное задание</h1>
          <div></div>
        </div>

        {/* Серия */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 mb-6 text-white text-center">
          <p className="text-sm opacity-90">🔥 Серия дней</p>
          <p className="text-4xl font-black">{streak}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 3, 7, 30].map((milestone) => (
              <div key={milestone} className={`text-xs px-2 py-1 rounded-full ${
                streak >= milestone ? 'bg-white text-amber-600 font-bold' : 'bg-white/20'
              }`}>
                {milestone}🔥
              </div>
            ))}
          </div>
        </div>

        {todayCompleted ? (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 text-center border border-white">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-lg font-bold text-gray-800">Задание выполнено!</p>
            <p className="text-gray-400 text-sm mt-2">Возвращайтесь завтра за новым заданием</p>
            <p className="text-amber-500 text-sm mt-4">
              {streak >= 7 ? "🔥 Вы на огне!" : streak >= 3 ? "👍 Отличная серия!" : "💪 Продолжайте!"}
            </p>
          </div>
        ) : task ? (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-white">
            <h2 className="font-bold text-lg text-gray-800 mb-2">{task.title || "Задание дня"}</h2>
            {task.topic && <p className="text-xs text-indigo-500 mb-4">📝 {task.topic}</p>}
            
            {task.sections?.[0]?.task_text && (
              <div className="p-4 bg-gray-50 rounded-xl mb-4 text-sm whitespace-pre-wrap">
                {task.sections[0].task_text}
              </div>
            )}

            {!submitted ? (
              <div className="space-y-4">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Ваш ответ..."
                  rows={4}
                  className="w-full border rounded-xl p-3 text-sm"
                />
                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim()}
                  className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 transition"
                >
                  ✅ Отправить
                </button>
              </div>
            ) : (
              <div className={`p-4 rounded-xl text-center ${result?.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                <p className="text-lg font-bold">{result?.correct ? '🎉 Правильно!' : '😔 Неверно'}</p>
                {result?.correct && <p className="text-sm mt-1">+{result.score} XP</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-8 text-center border border-white">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-400">Заданий пока нет</p>
            <p className="text-gray-300 text-sm mt-2">Репетитор ещё не добавил задания в библиотеку</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DailyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <DailyContent />
    </Suspense>
  );
}