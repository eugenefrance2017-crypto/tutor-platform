"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
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

// Котики Тейлор
const CATS = [
  { id: "meredith", name: "Meredith Grey", emoji: "🐱", requirement: "Первое занятие", color: "from-pink-300 to-rose-400" },
  { id: "olivia", name: "Olivia Benson", emoji: "🐈", requirement: "5 занятий", color: "from-blue-300 to-indigo-400" },
  { id: "benjamin", name: "Benjamin Button", emoji: "🐈‍⬛", requirement: "10 заданий", color: "from-purple-300 to-violet-400" },
  { id: "sugar", name: "Sugar", emoji: "😺", requirement: "3 ученика", color: "from-amber-300 to-orange-400" },
  { id: "patience", name: "Patience", emoji: "🐈‍⬛", requirement: "20 занятий", color: "from-emerald-300 to-teal-400" },
  { id: "princess", name: "Принцесса", emoji: "😸", requirement: "100% посещаемость", color: "from-rose-300 to-pink-400" },
];

// Цитаты Тейлор из Debut
const QUOTES = [
  "Romeo take me somewhere we can be alone 🌹",
  "I don't know what I want, so don't ask me 💭",
  "This is me begging you for peace ☮️",
  "I'm not a princess, this ain't a fairy tale 👑",
  "You're on your own kid, you always have been 💫",
  "Long story short, it was a bad time 📖",
  "We're happy, free, confused, and lonely at the same time 🎭",
  "I think I've seen this film before, and I didn't like the ending 🎬",
];

// Уровни
function getLevel(xp: number): { level: number; title: string; nextXp: number } {
  if (xp < 100) return { level: 1, title: "Новичок", nextXp: 100 };
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
    lessons: 0, completed: 0, homeworks: 0, doneHw: 0, students: 0, xp: 0
  });
  const [unlockedCats, setUnlockedCats] = useState<string[]>([]);
  const [diary, setDiary] = useState<string>("");
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(true);
  
  const isTutor = role === "tutor";

  useEffect(() => {
    if (!uid) return;
    
    // Загрузка профиля
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
        setDiary(snap.data().diary || "");
      }
    });

    // Загрузка статистики (исправлено!)
    if (isTutor) {
      // Для репетитора
      const unsubLessons = onSnapshot(
        query(collection(db, "lessons"), where("tutor_id", "==", uid)),
        (snap) => {
          const data = snap.docs.map((d) => d.data());
          setStats((prev) => ({
            ...prev,
            lessons: data.length,
            completed: data.filter((l: any) => l.status === "completed").length,
          }));
        }
      );

      const unsubHw = onSnapshot(
        query(collection(db, "homeworks"), where("tutor_id", "==", uid)),
        (snap) => {
          const data = snap.docs.map((d) => d.data());
          setStats((prev) => ({
            ...prev,
            homeworks: data.length,
            doneHw: data.filter((h: any) => h.status === "done").length,
          }));
        }
      );

      const unsubStudents = onSnapshot(
        query(collection(db, "profiles"), where("role", "==", "student")),
        (snap) => {
          setStats((prev) => ({ ...prev, students: snap.docs.length }));
        }
      );

      return () => { unsubLessons(); unsubHw(); unsubStudents(); };
    } else {
      // Для ученика
      const unsubLessons = onSnapshot(
        query(collection(db, "lessons"), where("student_id", "==", uid)),
        (snap) => {
          const data = snap.docs.map((d) => d.data());
          setStats((prev) => ({
            ...prev,
            lessons: data.length,
            completed: data.filter((l: any) => l.status === "completed").length,
          }));
        }
      );

      const unsubHw = onSnapshot(
        query(collection(db, "homeworks"), where("student_id", "==", uid)),
        (snap) => {
          const data = snap.docs.map((d) => d.data());
          setStats((prev) => ({
            ...prev,
            homeworks: data.length,
            doneHw: data.filter((h: any) => h.status === "done").length,
          }));
        }
      );

      return () => { unsubLessons(); unsubHw(); };
    }
  }, [uid, isTutor]);

  // Расчёт XP и разблокировка котиков
  useEffect(() => {
    const xp = stats.completed * 20 + stats.doneHw * 10 + (isTutor ? stats.students * 30 : 0);
    setStats((prev) => ({ ...prev, xp }));

    const unlocked: string[] = [];
    if (stats.lessons >= 1) unlocked.push("meredith");
    if (stats.completed >= 5) unlocked.push("olivia");
    if (stats.homeworks >= 10) unlocked.push("benjamin");
    if (isTutor && stats.students >= 3) unlocked.push("sugar");
    if (stats.completed >= 20) unlocked.push("patience");
    if (stats.lessons > 0 && (stats.completed / stats.lessons) >= 1) unlocked.push("princess");
    
    setUnlockedCats(unlocked);
  }, [stats.completed, stats.doneHw, stats.students, stats.lessons, isTutor]);

  // Случайная цитата
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    try {
      await updateDoc(doc(db, "profiles", uid), {
        full_name: (form.elements.namedItem("full_name") as HTMLInputElement).value,
        phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
        subjects: (form.elements.namedItem("subjects") as HTMLInputElement).value,
        about: (form.elements.namedItem("about") as HTMLTextAreaElement).value,
        diary: diary,
      });
      
      const snap = await getDoc(doc(db, "profiles", uid));
      if (snap.exists()) setProfile(snap.data());
      setEditing(false);
      toast.success("✨ Профиль обновлён!");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐱</div>
          <p className="text-pink-600 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😿</div>
          <p className="text-pink-600 font-medium">Профиль не найден</p>
        </div>
      </div>
    );
  }

  const attendance = stats.lessons > 0 ? Math.round((stats.completed / stats.lessons) * 100) : 0;
  const hwRate = stats.homeworks > 0 ? Math.round((stats.doneHw / stats.homeworks) * 100) : 0;
  const { level, title, nextXp } = getLevel(stats.xp);
  const xpProgress = Math.min(100, (stats.xp / nextXp) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
      {/* Фоновые элементы */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-20 left-10 text-6xl">🎸</div>
        <div className="absolute bottom-20 right-10 text-6xl">🌹</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">💫</div>
        <div className="absolute bottom-1/3 right-1/4 text-7xl">🎤</div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        {/* Шапка */}
        <div className="flex items-center justify-between">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-pink-600 hover:text-pink-800 transition font-medium flex items-center gap-1">
            <span>←</span> Назад
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-blue-500 bg-clip-text text-transparent">
            {isTutor ? "🎸 Личный кабинет" : "🌹 Мой кабинет"}
          </h1>
          <button 
            onClick={() => setEditing(!editing)} 
            className="text-sm bg-pink-100 text-pink-700 px-4 py-2 rounded-xl hover:bg-pink-200 transition font-medium"
          >
            {editing ? "Отмена" : "✏️ Редактировать"}
          </button>
        </div>

        {/* Котик-аватар и уровень */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8 border-2 border-pink-100">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
            {/* Аватар с котиком */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-pink-300 via-rose-400 to-blue-300 rounded-full flex items-center justify-center text-6xl shadow-2xl shadow-pink-200 animate-float">
                {unlockedCats.length > 0 ? CATS.find(c => c.id === unlockedCats[unlockedCats.length - 1])?.emoji : "🐱"}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                {level}
              </div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{profile.full_name}</h2>
              <p className="text-gray-500 mb-2">{profile.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${isTutor ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                  {isTutor ? "🧑‍🏫 Репетитор" : "🎓 Ученик"}
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700">
                  ⭐ {title}
                </span>
              </div>
              
              {/* Прогресс до следующего уровня */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Уровень {level}</span>
                  <span>{stats.xp} / {nextXp} XP</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-pink-400 via-rose-500 to-blue-500 transition-all duration-700" 
                    style={{ width: `${xpProgress}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Профиль */}
          {editing ? (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Имя</label>
                  <input 
                    type="text" 
                    name="full_name" 
                    defaultValue={profile.full_name || ""} 
                    className="w-full border-2 border-pink-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Телефон</label>
                  <input 
                    type="text" 
                    name="phone" 
                    defaultValue={profile.phone || ""} 
                    placeholder="+7 (999) 123-45-67" 
                    className="w-full border-2 border-pink-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    {isTutor ? "Предметы" : "Изучаю"}
                  </label>
                  <input 
                    type="text" 
                    name="subjects" 
                    defaultValue={profile.subjects || (isTutor ? "Химия, Биология" : "")} 
                    className="w-full border-2 border-pink-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700">О себе</label>
                  <textarea 
                    name="about" 
                    rows={3} 
                    defaultValue={profile.about || ""} 
                    placeholder="Расскажите о себе..." 
                    className="w-full border-2 border-pink-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 transition shadow-lg shadow-pink-200"
              >
                💾 Сохранить
              </button>
            </form>
          ) : (
            <div className="space-y-3 text-gray-600">
              {profile.phone && <p>📱 {profile.phone}</p>}
              {profile.subjects && <p>{isTutor ? "🧪" : "📖"} {profile.subjects}</p>}
              {profile.about && <p className="text-sm mt-3 p-4 bg-pink-50 rounded-xl border border-pink-100">{profile.about}</p>}
            </div>
          )}
        </div>

        {/* Статистика с котиками */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(isTutor ? [
            { label: "Всего занятий", value: stats.lessons, icon: "📅", color: "from-pink-400 to-rose-500", cat: "🐱" },
            { label: "Проведено", value: stats.completed, icon: "✅", color: "from-emerald-400 to-green-500", cat: "🐈" },
            { label: "Учеников", value: stats.students, icon: "👥", color: "from-amber-400 to-orange-500", cat: "😺" },
            { label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-blue-400 to-indigo-500", cat: "🐈‍⬛" },
          ] : [
            { label: "Всего занятий", value: stats.lessons, icon: "📅", color: "from-pink-400 to-rose-500", cat: "🐱" },
            { label: "Посещено", value: stats.completed, icon: "✅", color: "from-emerald-400 to-green-500", cat: "🐈" },
            { label: "Заданий", value: stats.homeworks, icon: "📚", color: "from-amber-400 to-orange-500", cat: "😺" },
            { label: "Сдано", value: stats.doneHw, icon: "📝", color: "from-blue-400 to-indigo-500", cat: "🐈‍⬛" },
          ]).map((stat) => (
            <div 
              key={stat.label} 
              className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-sm border-2 border-pink-100 text-center hover:scale-105 transition-all duration-300 group"
            >
              <div className="text-3xl mb-2 group-hover:animate-bounce">{stat.cat}</div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Прогресс-бары */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-sm border-2 border-pink-100 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            📈 {isTutor ? "Моя статистика" : "Мой прогресс"}
          </h3>
          {[
            { label: isTutor ? "Проведено занятий" : "Посещаемость", value: attendance, color: "from-emerald-400 to-green-500", emoji: "🎓" },
            { label: isTutor ? "Выдано заданий" : "Сдано ДЗ", value: hwRate, color: "from-amber-400 to-orange-500", emoji: "📝" },
          ].map((bar) => (
            <div key={bar.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 flex items-center gap-1">
                  {bar.emoji} {bar.label}
                </span>
                <span className="font-medium">{bar.value}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-3 rounded-full bg-gradient-to-r ${bar.color} transition-all duration-700`} 
                  style={{ width: `${bar.value}%` }} 
                />
              </div>
            </div>
          ))}
        </div>

        {/* Коллекция котиков */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-sm border-2 border-pink-100">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🐱 Коллекция котиков
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATS.map((cat) => {
              const unlocked = unlockedCats.includes(cat.id);
              return (
                <div 
                  key={cat.id}
                  className={`text-center p-3 rounded-xl transition-all duration-300 ${
                    unlocked 
                      ? `bg-gradient-to-br ${cat.color} shadow-lg hover:scale-110 cursor-pointer` 
                      : "bg-gray-100 opacity-50"
                  }`}
                  title={unlocked ? cat.name : `🔒 ${cat.requirement}`}
                >
                  <div className={`text-4xl mb-1 ${unlocked ? "animate-float" : "grayscale"}`}>
                    {unlocked ? cat.emoji : "🔒"}
                  </div>
                  <p className={`text-xs font-medium ${unlocked ? "text-white" : "text-gray-400"}`}>
                    {unlocked ? cat.name : cat.requirement}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Дневник */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-sm border-2 border-pink-100">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            📖 Мой дневник
          </h3>
          <textarea
            value={diary}
            onChange={(e) => setDiary(e.target.value)}
            placeholder="Запишите свои мысли, планы, достижения..."
            rows={4}
            className="w-full border-2 border-pink-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition resize-none"
          />
          {editing && (
            <button
              onClick={async () => {
                await updateDoc(doc(db, "profiles", uid), { diary });
                toast.success("📖 Дневник сохранён!");
              }}
              className="mt-2 w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 transition"
            >
              💾 Сохранить дневник
            </button>
          )}
        </div>

        {/* Цитата дня */}
        <div className="bg-gradient-to-r from-pink-100 via-rose-100 to-blue-100 rounded-2xl p-5 shadow-sm border-2 border-pink-200">
          <div className="flex items-start gap-3">
            <div className="text-4xl">🎤</div>
            <div className="flex-1">
              <p className="text-gray-700 italic text-lg leading-relaxed">"{quote}"</p>
              <p className="text-pink-600 font-medium mt-2">— Taylor Swift</p>
            </div>
          </div>
        </div>

        {/* Плейлист */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-sm border-2 border-pink-100">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🎸 Мой плейлист
          </h3>
          <div className="space-y-2">
            {[
              { title: "Teardrops on My Guitar", artist: "Taylor Swift", duration: "3:23" },
              { title: "Tim McGraw", artist: "Taylor Swift", duration: "3:54" },
              { title: "Our Song", artist: "Taylor Swift", duration: "3:18" },
              { title: "Picture to Burn", artist: "Taylor Swift", duration: "2:55" },
            ].map((song, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl hover:bg-pink-100 transition">
                <div className="text-2xl">🎵</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{song.title}</p>
                  <p className="text-xs text-gray-500">{song.artist}</p>
                </div>
                <span className="text-xs text-gray-400">{song.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-blue-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐱</div>
          <p className="text-pink-600 font-medium">Загрузка...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}