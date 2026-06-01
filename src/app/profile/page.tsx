"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import StudentAnalytics from "../students/StudentAnalytics";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

const LEVELS = ["🌱 Новичок", "📗 Практик", "📘 Знаток", "📙 Эксперт", "👑 Магистр"];
const ACHIEVEMENTS = [
  { key: "first_sub", icon: "🎯", title: "Первое задание" },
  { key: "five_subs", icon: "🔥", title: "5 заданий" },
  { key: "perfect", icon: "💯", title: "Идеальный результат" },
  { key: "ten_subs", icon: "🌟", title: "10 заданий" },
  { key: "speed", icon: "⚡", title: "Быстрее всех" },
];

function ProfileContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  const [profile, setProfile] = useState<any>(null); const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ lessons: 0, completed: 0, homeworks: 0, doneHw: 0, students: 0 });
  const [achievements, setAchievements] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "analytics">("profile");
  const isTutor = role === "tutor";

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then((snap) => { if (snap.exists()) { const data = snap.data(); setProfile(data); if (data.achievements) setAchievements(data.achievements); } });
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), where(isTutor ? "tutor_id" : "student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, lessons: data.length, completed: data.filter((l: any) => l.status === "completed").length })); });
    const unsubHw = onSnapshot(query(collection(db, "homeworks"), where(isTutor ? "tutor_id" : "student_id", "==", uid)), (snap) => { const data = snap.docs.map((d) => d.data()); setStats((prev) => ({ ...prev, homeworks: data.length, doneHw: data.filter((h: any) => h.status === "done").length })); });
    if (isTutor) { const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => setStats((prev) => ({ ...prev, students: snap.docs.length }))); return () => { unsubLessons(); unsubHw(); unsubStudents(); }; }
    return () => { unsubLessons(); unsubHw(); };
  }, [uid, isTutor]);

  async function saveProfile(e: React.FormEvent) { 
    e.preventDefault(); const form = e.target as HTMLFormElement; 
    const updateData: any = {
      full_name: (form.elements.namedItem("full_name") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      subjects: (form.elements.namedItem("subjects") as HTMLInputElement).value,
      about: (form.elements.namedItem("about") as HTMLTextAreaElement).value,
      price_per_lesson: parseInt((form.elements.namedItem("price") as HTMLInputElement).value) || 0,
    };
    const zoomLink = (form.elements.namedItem("zoom_link") as HTMLInputElement).value.trim();
    const boardLink = (form.elements.namedItem("board_link") as HTMLInputElement).value.trim();
    if (zoomLink) updateData.zoom_link = zoomLink; else updateData.zoom_link = null;
    if (boardLink) updateData.board_link = boardLink; else updateData.board_link = null;
    await updateDoc(doc(db, "profiles", uid), updateData); 
    setEditing(false); 
    const snap = await getDoc(doc(db, "profiles", uid)); 
    if (snap.exists()) setProfile(snap.data()); 
    toast.success("Профиль сохранён!");
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">Загрузка...</div>;

  const xp = profile.xp || 0;
  const level = profile.level || 1;
  const levelIndex = Math.min(level - 1, LEVELS.length - 1);
  const xpForNext = level * 100;
  const xpProgress = xp % 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium">← Назад</Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">👤 {isTutor ? "Личный кабинет" : "Мой кабинет"}</h1>
          <button onClick={() => setEditing(!editing)} className="text-sm bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-200 transition font-medium">{editing ? "Отмена" : "✏️ Редактировать"}</button>
        </div>

        {/* Табы только для ученика */}
        {!isTutor && (
          <div className="flex gap-2">
            <button onClick={() => setActiveTab("profile")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === "profile" ? "bg-indigo-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>👤 Профиль</button>
            <button onClick={() => setActiveTab("analytics")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === "analytics" ? "bg-indigo-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>📈 Аналитика</button>
          </div>
        )}

        {activeTab === "analytics" && !isTutor ? (
          <StudentAnalytics studentId={uid} />
        ) : (
          <>
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8 border border-white">
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-indigo-200">{(profile.full_name || "?")[0].toUpperCase()}</div>
                  {!isTutor && <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow"><span className="text-lg">{LEVELS[levelIndex].split(" ")[0]}</span></div>}
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-gray-800">{profile.full_name}</h2>
                  <p className="text-gray-500">{profile.email}</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${isTutor ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {isTutor ? "🧑‍🏫 Репетитор" : LEVELS[levelIndex]}
                  </span>
                  {isTutor && profile.price_per_lesson > 0 && (
                    <span className="inline-block mt-2 ml-2 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                      💰 {profile.price_per_lesson}₽ / занятие
                    </span>
                  )}
                </div>
              </div>

              {/* XP только для ученика */}
              {!isTutor && (
                <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4">
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium text-indigo-700">{LEVELS[levelIndex]}</span><span className="text-gray-500">{xp} / {xpForNext} XP</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} /></div>
                  <p className="text-xs text-gray-400 mt-1">До следующего уровня: {xpForNext - xp} XP</p>
                </div>
              )}

              {editing ? (
                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Имя</label><input type="text" name="full_name" defaultValue={profile.full_name || ""} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                    <div><label className="block text-sm font-medium mb-1">Телефон</label><input type="text" name="phone" defaultValue={profile.phone || ""} placeholder="+7 (999) 123-45-67" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">{isTutor ? "Предметы" : "Изучаю"}</label><input type="text" name="subjects" defaultValue={profile.subjects || (isTutor ? "Химия, Биология" : "")} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                    
                    {/* Цена занятия для репетитора */}
                    {isTutor && (
                      <div><label className="block text-sm font-medium mb-1">💰 Цена занятия (₽)</label><input type="number" name="price" defaultValue={profile.price_per_lesson || ""} placeholder="2000" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                    )}

                    <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">🎥 Ссылка на Zoom</label><input type="url" name="zoom_link" defaultValue={profile.zoom_link || ""} placeholder="https://zoom.us/j/..." className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">🖊️ Ссылка на доску</label><input type="url" name="board_link" defaultValue={profile.board_link || ""} placeholder="https://miro.com/app/..." className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-400 outline-none" /></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">О себе</label><textarea name="about" rows={4} defaultValue={profile.about || ""} placeholder="Расскажите о себе..." className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 transition">💾 Сохранить</button>
                </form>
              ) : (
                <div className="space-y-3 text-gray-600">
                  {profile.phone && <p>📱 {profile.phone}</p>}
                  {profile.subjects && <p>{isTutor ? "🧪" : "📖"} {profile.subjects}</p>}
                  {isTutor && profile.price_per_lesson > 0 && <p>💰 {profile.price_per_lesson}₽ за занятие</p>}
                  {profile.zoom_link && (
                    <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3"><span className="text-2xl">🎥</span><div><p className="text-sm font-medium text-blue-700">Zoom</p><a href={profile.zoom_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 break-all">{profile.zoom_link}</a></div></div>
                  )}
                  {profile.board_link && (
                    <div className="p-3 bg-purple-50 rounded-xl flex items-center gap-3"><span className="text-2xl">🖊️</span><div><p className="text-sm font-medium text-purple-700">Доска</p><a href={profile.board_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:text-purple-700 break-all">{profile.board_link}</a></div></div>
                  )}
                  {profile.about && <p className="text-sm mt-3 p-4 bg-gray-50 rounded-xl">{profile.about}</p>}
                </div>
              )}
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(isTutor ? [
                { label: "Занятий", value: stats.lessons, icon: "📅", color: "from-indigo-500 to-blue-500" },
                { label: "Проведено", value: stats.completed, icon: "✅", color: "from-emerald-500 to-green-500" },
                { label: "Учеников", value: stats.students, icon: "👥", color: "from-amber-500 to-orange-500" },
                { label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-rose-500 to-pink-500" },
              ] : [
                { label: "Уровень", value: level, icon: "⭐", color: "from-purple-500 to-pink-500" },
                { label: "Опыт", value: xp, icon: "⚡", color: "from-indigo-500 to-blue-500" },
                { label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-amber-500 to-orange-500" },
                { label: "Сдано", value: stats.doneHw, icon: "✅", color: "from-emerald-500 to-green-500" },
              ]).map((stat) => (
                <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white text-center hover:scale-[1.02] transition">
                  <span className="text-2xl">{stat.icon}</span>
                  <p className={`text-2xl font-bold mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Достижения только для ученика */}
            {!isTutor && (
              <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white">
                <h3 className="font-semibold text-gray-700 mb-3">🏆 Достижения</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {ACHIEVEMENTS.map((a) => {
                    const earned = achievements.includes(a.key);
                    return (
                      <div key={a.key} className={`text-center p-3 rounded-xl transition hover:scale-105 ${earned ? "bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200" : "bg-gray-50 opacity-40"}`}>
                        <span className="text-2xl block">{a.icon}</span>
                        <span className="text-xs font-medium">{earned ? a.title : "???"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}><ProfileContent /></Suspense>);
}