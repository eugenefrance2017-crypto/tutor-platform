"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

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
const storage = getStorage(app);

// 🏆 Универсальные академические достижения
const ACHIEVEMENTS = [
  { id: "first_step", name: "Первые шаги", desc: "Завершено 1 занятие", icon: "🚀", requirement: (stats: any) => stats.completed >= 1 },
  { id: "homework_master", name: "Мастер ДЗ", desc: "Сдано 10 домашних заданий", icon: "📚", requirement: (stats: any) => stats.doneHw >= 10 },
  { id: "streak_7", name: "Марафонец", desc: "7 дней подряд без пропусков", icon: "🔥", requirement: (stats: any) => stats.streak >= 7 },
  { id: "perfect_score", name: "Снайпер", desc: "100% за домашнее задание", icon: "🎯", requirement: (stats: any) => stats.hasPerfectHw },
  { id: "level_3", name: "Продвинутый", desc: "Достигнут 3 уровень", icon: "⭐", requirement: (stats: any) => stats.level >= 3 },
  { id: "all_round", name: "Универсал", desc: "Изучено более 5 тем", icon: "🌍", requirement: (stats: any) => stats.topicsStudied >= 5 },
];

// 💡 Мотивационные цитаты
const QUOTES = [
  "Образование — это самое мощное оружие, которое вы можете использовать, чтобы изменить мир.",
  "Успех — это сумма небольших усилий, повторяющихся изо дня в день.",
  "Не бойся медлить, бойся остановиться.",
  "Корни учения горьки, но плоды его сладки.",
  "Инвестиции в знания платят лучшие дивиденды.",
];

function getLevel(xp: number): { level: number; title: string; nextXp: number } {
  if (xp < 100) return { level: 1, title: "Начинающий", nextXp: 100 };
  if (xp < 300) return { level: 2, title: "Ученик", nextXp: 300 };
  if (xp < 600) return { level: 3, title: "Знаток", nextXp: 600 };
  if (xp < 1000) return { level: 4, title: "Мастер", nextXp: 1000 };
  if (xp < 1500) return { level: 5, title: "Эксперт", nextXp: 1500 };
  return { level: 6, title: "Легенда", nextXp: 9999 };
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    lessons: 0, completed: 0, homeworks: 0, doneHw: 0, students: 0, xp: 0, streak: 0, level: 1, topicsStudied: 0, hasPerfectHw: false
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [quote, setQuote] = useState("");
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  
  // ✅ НОВЫЕ СОСТОЯНИЯ ДЛЯ ГРУПП И ОПЛАТ
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [groupPayments, setGroupPayments] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isTutor = role === "tutor";
  const isParent = role === "parent";

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setAvatarUrl(data.avatar_url || "");
        setStats(prev => ({ ...prev, streak: data.streak || 0, xp: data.xp || 0 }));
      }
      setLoading(false);
    });

    if (isTutor) {
      const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("tutor_id", "==", uid)), (snap) => {
        const data = snap.docs.map((d) => d.data());
        const uniqueStudents = new Set(data.map((l: any) => l.student_id).filter(Boolean));
        setStats((prev) => ({ ...prev, lessons: data.length, completed: data.filter((l: any) => l.status === "completed").length, students: uniqueStudents.size }));
      });
      const unsubSubmissions = onSnapshot(query(collection(db, "submissions"), where("tutor_id", "==", uid)), (snap) => {
        const data = snap.docs.map((d) => d.data());
        const uniqueHw = new Set(data.map((s: any) => s.homework_id).filter(Boolean));
        const doneHw = data.filter((s: any) => s.status === "approved" || s.status === "done").length;
        const hasPerfect = data.some((s: any) => s.score !== undefined && s.max_score !== undefined && (s.score / s.max_score) === 1);
        setStats((prev) => ({ ...prev, homeworks: uniqueHw.size, doneHw, hasPerfectHw: hasPerfect }));
      });
      return () => { unsubLessons(); unsubSubmissions(); };
    } else {
      const unsubLessons = onSnapshot(query(collection(db, "lessons"), where("student_id", "==", uid)), (snap) => {
        const data = snap.docs.map((d) => d.data());
        setStats((prev) => ({ ...prev, lessons: data.length, completed: data.filter((l: any) => l.status === "completed").length }));
      });
      const unsubSubmissions = onSnapshot(query(collection(db, "submissions"), where("student_id", "==", uid)), (snap) => {
        const data = snap.docs.map((d) => d.data());
        const uniqueHw = new Set(data.map((s: any) => s.homework_id).filter(Boolean));
        const doneHw = data.filter((s: any) => s.status === "approved" || s.status === "done").length;
        const hasPerfect = data.some((s: any) => s.score !== undefined && s.max_score !== undefined && (s.score / s.max_score) === 1);
        setStats((prev) => ({ ...prev, homeworks: uniqueHw.size, doneHw, hasPerfectHw: hasPerfect }));
      });

      // ✅ Загрузка групп, в которых состоит ученик
      const unsubGroups = onSnapshot(query(collection(db, "groups"), where("student_ids", "array-contains", uid)), (snap) => {
        setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // ✅ Загрузка платежей для проверки статуса оплаты групп
      const unsubPayments = onSnapshot(query(collection(db, "payments"), where("student_id", "==", uid)), (snap) => {
        const paymentsMap: Record<string, any> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.group_id && data.confirmed) {
            // Сохраняем платёж с максимальным остатком занятий для этой группы
            if (!paymentsMap[data.group_id] || data.lessons_remaining > paymentsMap[data.group_id].lessons_remaining) {
              paymentsMap[data.group_id] = data;
            }
          }
        });
        setGroupPayments(paymentsMap);
      });

      const fetchDeadlines = async () => {
        try {
          const now = new Date().toISOString();
          const hwSnap = await getDocs(query(collection(db, "homeworks"), where("assigned_students", "array-contains", uid), where("due_date", ">", now)));
          const deadlines = hwSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 3);
          setUpcomingDeadlines(deadlines);
        } catch (e) { console.error("Ошибка загрузки дедлайнов:", e); }
      };
      fetchDeadlines();
      
      return () => { 
        unsubLessons(); 
        unsubSubmissions(); 
        unsubGroups(); 
        unsubPayments(); 
      };
    }
  }, [uid, isTutor]);

  useEffect(() => {
    const xp = stats.completed * 20 + stats.doneHw * 10 + (isTutor ? stats.students * 30 : 0);
    const { level } = getLevel(xp);
    setStats((prev) => ({ ...prev, xp, level, topicsStudied: Math.floor(stats.homeworks / 2) }));
    const unlocked = ACHIEVEMENTS.filter(a => a.requirement({ ...stats, xp, level })).map(a => a.id);
    setUnlockedAchievements(unlocked);
  }, [stats.completed, stats.doneHw, stats.students, stats.lessons, isTutor]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Выберите изображение'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Файл слишком большой (макс. 2MB)'); return; }
    
    setUploadingAvatar(true);
    try {
      const fileName = `avatars/${uid}_${Date.now()}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, "profiles", uid), { avatar_url: downloadURL });
      setAvatarUrl(downloadURL);
      setProfile((prev: any) => ({ ...prev, avatar_url: downloadURL }));
      toast.success("✅ Аватарка обновлена!");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    try {
      await updateDoc(doc(db, "profiles", uid), {
        full_name: (form.elements.namedItem("full_name") as HTMLInputElement).value,
        phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
        subjects: (form.elements.namedItem("subjects") as HTMLInputElement).value,
        about: (form.elements.namedItem("about") as HTMLTextAreaElement).value,
      });
      const snap = await getDoc(doc(db, "profiles", uid));
      if (snap.exists()) setProfile(snap.data());
      setEditing(false);
      toast.success("✨ Профиль обновлён!");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
        <div className="text-center"><div className="w-16 h-16 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-pink-600 font-medium">Загрузка профиля...</p></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-pink-600 font-medium">Профиль не найден</p>
          <Link href="/login" className="mt-4 inline-block text-pink-500 underline">Вернуться ко входу</Link>
        </div>
      </div>
    );
  }

  const attendance = stats.lessons > 0 ? Math.round((stats.completed / stats.lessons) * 100) : 0;
  const hwRate = stats.homeworks > 0 ? Math.round((stats.doneHw / stats.homeworks) * 100) : 0;
  const { level, title, nextXp } = getLevel(stats.xp);
  const xpProgress = Math.min(100, (stats.xp / nextXp) * 100);
  
  const initials = profile.full_name 
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) 
    : (profile.email ? profile.email[0].toUpperCase() : "U");

  const displayRole = isTutor ? "🧑‍🏫 Репетитор" : isParent ? "👨‍👩‍👧 Родитель" : "🎓 Ученик";
  const roleColor = isTutor ? "bg-pink-100 text-pink-700" : isParent ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-pink-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-gray-600 hover:text-pink-600 transition font-medium flex items-center gap-1">
            <span>←</span> Назад
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-blue-600 bg-clip-text text-transparent">
            Личный кабинет
          </h1>
          <button onClick={() => setEditing(!editing)} className="text-sm bg-white/80 backdrop-blur text-pink-700 border border-pink-200 px-4 py-2 rounded-xl hover:bg-pink-50 transition font-medium shadow-sm">
            {editing ? "Отмена" : "✏️ Редактировать"}
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-pink-100/50 p-6 sm:p-8 border border-white/50">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-28 h-28 bg-gradient-to-br from-pink-400 via-rose-400 to-blue-400 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-white">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm shadow-md border-2 border-white z-10">
                {level}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                <span className="text-white text-2xl">{uploadingAvatar ? "⏳" : "📷"}</span>
              </label>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{profile.full_name || "Пользователь"}</h2>
              <p className="text-gray-500 mb-3">{profile.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${roleColor}`}>
                  {displayRole}
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                  ⭐ {title}
                </span>
              </div>
              
              <div className="mt-5 max-w-md">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Прогресс до уровня {level + 1}</span>
                  <span>{stats.xp} / {nextXp} XP</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-blue-500 transition-all duration-700 ease-out" style={{ width: `${xpProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveProfile} className="space-y-4 border-t border-pink-100 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Имя и Фамилия</label>
                  <input type="text" name="full_name" defaultValue={profile.full_name || ""} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition bg-white/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Телефон</label>
                  <input type="text" name="phone" defaultValue={profile.phone || ""} placeholder="+7 (999) 123-45-67" className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition bg-white/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">{isTutor ? "Преподаваемые предметы" : "Изучаемые предметы"}</label>
                  <input type="text" name="subjects" defaultValue={profile.subjects || (isTutor ? "Химия, Биология" : "")} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition bg-white/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">О себе</label>
                  <textarea name="about" rows={3} defaultValue={profile.about || ""} placeholder="Краткая информация..." className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition bg-white/50 resize-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 transition shadow-lg shadow-pink-200">
                💾 Сохранить изменения
              </button>
            </form>
          ) : (
            <div className="space-y-3 text-gray-600 border-t border-pink-100 pt-6">
              {profile.phone && <p className="flex items-center gap-2"><span className="text-pink-500">📱</span> {profile.phone}</p>}
              {profile.subjects && <p className="flex items-center gap-2"><span className="text-pink-500">{isTutor ? "🧪" : "📖"}</span> {profile.subjects}</p>}
              {profile.about && <p className="text-sm mt-3 p-4 bg-pink-50/50 rounded-xl border border-pink-100 leading-relaxed">{profile.about}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(isTutor ? [
            { label: "Всего занятий", value: stats.lessons, icon: "📅", color: "from-pink-400 to-rose-500" },
            { label: "Проведено", value: stats.completed, icon: "✅", color: "from-emerald-400 to-green-500" },
            { label: "Учеников", value: stats.students, icon: "👥", color: "from-amber-400 to-orange-500" },
            { label: "Проверено ДЗ", value: stats.doneHw, icon: "📝", color: "from-blue-400 to-indigo-500" },
          ] : [
            { label: "Всего занятий", value: stats.lessons, icon: "📅", color: "from-pink-400 to-rose-500" },
            { label: "Посещено", value: stats.completed, icon: "✅", color: "from-emerald-400 to-green-500" },
            { label: "Получено ДЗ", value: stats.homeworks, icon: "📚", color: "from-amber-400 to-orange-500" },
            { label: "Сдано ДЗ", value: stats.doneHw, icon: "📝", color: "from-blue-400 to-indigo-500" },
          ]).map((stat) => (
            <div key={stat.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white/50 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white/50 space-y-5">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">📈 {isTutor ? "Моя статистика" : "Мой прогресс"}</h3>
              {[
                { label: isTutor ? "Проведено занятий" : "Посещаемость", value: attendance, color: "from-emerald-400 to-green-500", emoji: "🎯" },
                { label: isTutor ? "Проверено ДЗ" : "Успеваемость по ДЗ", value: hwRate, color: "from-amber-400 to-orange-500", emoji: "📝" },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 flex items-center gap-1.5">{bar.emoji} {bar.label}</span>
                    <span className="font-bold text-gray-800">{bar.value}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`} style={{ width: `${bar.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ НОВОЕ: Мои группы и статус оплаты (только для учеников и родителей) */}
            {!isTutor && myGroups.length > 0 && (
              <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white/50">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">👥 Мои группы и абонементы</h3>
                <div className="space-y-3">
                  {myGroups.map((group) => {
                    const payment = groupPayments[group.id];
                    const isPaid = payment && payment.lessons_remaining > 0;
                    const remainingLessons = payment ? payment.lessons_remaining : 0;
                    
                    return (
                      <div key={group.id} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-800">{group.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {group.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'} • {group.schedule || "Расписание уточняется"}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isPaid ? `🟢 ${remainingLessons} зан. ост.` : '🔴 Не оплачено'}
                          </span>
                        </div>
                        
                        {!isPaid && (
                          <Link 
                            href={`/finance?uid=${uid}&role=${role}&tab=stats&groupId=${group.id}&groupName=${encodeURIComponent(group.name)}&groupPrice=${group.price_per_lesson}&studentIds=${uid}`}
                            className="mt-3 block w-full text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl text-sm font-bold hover:shadow-md hover:scale-[1.02] transition-all"
                          >
                            💳 Оплатить абонемент
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isTutor && !isParent && upcomingDeadlines.length > 0 && (
              <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white/50">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">⏰ Ближайшие дедлайны</h3>
                <div className="space-y-3">
                  {upcomingDeadlines.map((hw) => {
                    const daysLeft = Math.ceil((new Date(hw.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={hw.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{hw.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{daysLeft > 0 ? `Осталось ${daysLeft} дн.` : "Просрочено!"}</p>
                        </div>
                        <Link href={`/homeworks/${hw.id}`} className="px-3 py-1.5 bg-white text-pink-600 text-xs font-bold rounded-lg border border-pink-200 hover:bg-pink-50 transition">Перейти</Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isTutor && !isParent && (
              <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white/50">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  🏆 Достижения <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div key={ach.id} className={`text-center p-4 rounded-xl transition-all duration-300 border ${unlocked ? "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-60"}`} title={unlocked ? ach.desc : `🔒 ${ach.desc}`}>
                        <div className={`text-3xl mb-2 ${unlocked ? "" : "grayscale"}`}>{ach.icon}</div>
                        <p className={`text-xs font-bold ${unlocked ? "text-gray-800" : "text-gray-400"}`}>{ach.name}</p>
                        <p className={`text-[10px] mt-1 ${unlocked ? "text-gray-500" : "text-gray-400"}`}>{ach.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {!isTutor && (
              <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-white/50">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">💌 Уведомления</h3>
                {profile.telegram_chat_id ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-2xl">✅</div>
                    <div className="flex-1">
                      <p className="font-medium text-emerald-800 text-sm">Активно</p>
                      <p className="text-xs text-emerald-600">Напоминания приходят в Telegram</p>
                    </div>
                    <button onClick={async () => {
                      if (window.confirm("Отвязать Telegram?")) {
                        await updateDoc(doc(db, "profiles", uid), { telegram_chat_id: null, telegram_bind_code: null });
                        const snap = await getDoc(doc(db, "profiles", uid));
                        if (snap.exists()) setProfile(snap.data());
                        toast.success("Отвязано");
                      }
                    }} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition">Отвязать</button>
                  </div>
                ) : profile.telegram_bind_code ? (
                  <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">Ваш код привязки:</p>
                    <div className="bg-white border border-blue-200 rounded-lg p-2 text-center font-mono text-lg font-bold text-blue-700 tracking-widest">
                      {profile.telegram_bind_code}
                    </div>
                    <a href={`https://t.me/jenyawisch_bot?start=${profile.telegram_bind_code}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition text-sm animate-pulse">
                      🚀 Открыть бота и нажать Start
                    </a>
                    <button onClick={async () => {
                      await updateDoc(doc(db, "profiles", uid), { telegram_bind_code: null });
                      const snap = await getDoc(doc(db, "profiles", uid));
                      if (snap.exists()) setProfile(snap.data());
                      toast("Код отменён");
                    }} className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 hover:underline">Отменить привязку</button>
                  </div>
                ) : (
                  <button onClick={async () => {
                    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
                    await updateDoc(doc(db, "profiles", uid), { telegram_bind_code: code });
                    const snap = await getDoc(doc(db, "profiles", uid));
                    if (snap.exists()) setProfile(snap.data());
                  }} className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition text-sm shadow-md hover:shadow-lg">
                    🔗 Привязать Telegram
                  </button>
                )}
              </div>
            )}

            <div className="bg-gradient-to-br from-pink-100 via-rose-100 to-blue-100 rounded-2xl p-5 shadow-sm border border-pink-200/50">
              <div className="flex items-start gap-3">
                <div className="text-3xl opacity-50">💡</div>
                <div className="flex-1">
                  <p className="text-gray-700 italic text-sm leading-relaxed">"{quote}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
        <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}