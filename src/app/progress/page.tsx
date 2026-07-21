"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  ResponsiveContainer, Tooltip 
} from "recharts";

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

// 🧪 РАСШИРЕННЫЙ КОДИФИКАТОР ЕГЭ ПО ХИМИИ
const CHEMISTRY_TOPICS = [
  // Теоретические основы (ЕГЭ 1-8)
  { code: "1.1", name: "Строение атома", section: "Теоретические основы", ege: "1-3", group: "atom" },
  { code: "1.2", name: "Электронные конфигурации", section: "Теоретические основы", ege: "1-3", group: "atom" },
  { code: "2.1", name: "Периодический закон", section: "Теоретические основы", ege: "4-5", group: "periodic" },
  { code: "2.2", name: "Свойства элементов", section: "Теоретические основы", ege: "4-6", group: "periodic" },
  { code: "3.1", name: "Химическая связь", section: "Теоретические основы", ege: "7", group: "bond" },
  { code: "3.2", name: "Строение веществ", section: "Теоретические основы", ege: "8", group: "bond" },
  
  // Неорганическая химия (ЕГЭ 9-12, 24-26, 29-31)
  { code: "4.1", name: "Оксиды", section: "Неорганическая химия", ege: "9", group: "inorganic" },
  { code: "4.2", name: "Кислоты", section: "Неорганическая химия", ege: "9", group: "inorganic" },
  { code: "4.3", name: "Основания", section: "Неорганическая химия", ege: "10", group: "inorganic" },
  { code: "4.4", name: "Соли", section: "Неорганическая химия", ege: "10-11", group: "inorganic" },
  { code: "4.5", name: "Генетическая связь", section: "Неорганическая химия", ege: "12", group: "inorganic" },
  { code: "5.1", name: "Качественные реакции", section: "Неорганическая химия", ege: "24-26", group: "qualitative" },
  { code: "6.1", name: "ОВР", section: "Неорганическая химия", ege: "29", group: "redox" },
  { code: "6.2", name: "Электролиз", section: "Неорганическая химия", ege: "31", group: "electrolysis" },
  { code: "6.3", name: "Гидролиз", section: "Неорганическая химия", ege: "30", group: "hydrolysis" },
  
  // Органическая химия (ЕГЭ 13-19, 32)
  { code: "7.1", name: "Алканы и алкены", section: "Органическая химия", ege: "13", group: "organic" },
  { code: "7.2", name: "Алкины и диены", section: "Органическая химия", ege: "13", group: "organic" },
  { code: "7.3", name: "Ароматические углеводороды", section: "Органическая химия", ege: "13", group: "organic" },
  { code: "7.4", name: "Спирты и фенолы", section: "Органическая химия", ege: "14", group: "organic" },
  { code: "7.5", name: "Альдегиды и кетоны", section: "Органическая химия", ege: "14", group: "organic" },
  { code: "7.6", name: "Карбоновые кислоты", section: "Органическая химия", ege: "15", group: "organic" },
  { code: "7.7", name: "Эфиры и жиры", section: "Органическая химия", ege: "15", group: "organic" },
  { code: "7.8", name: "Амины и аминокислоты", section: "Органическая химия", ege: "16", group: "organic" },
  { code: "7.9", name: "Углеводы и полимеры", section: "Органическая химия", ege: "17-19", group: "organic" },
  { code: "8.1", name: "Цепочки превращений", section: "Органическая химия", ege: "32", group: "chains" },
  
  // Расчёты (ЕГЭ 27-28, 34-35)
  { code: "9.1", name: "Массовая доля", section: "Расчёты", ege: "27", group: "calc" },
  { code: "9.2", name: "Объёмные отношения", section: "Расчёты", ege: "27", group: "calc" },
  { code: "9.3", name: "Задачи на растворы", section: "Расчёты", ege: "28", group: "calc" },
  { code: "9.4", name: "Вывод формулы", section: "Расчёты", ege: "34-35", group: "calc" },
];

// 🧬 РАСШИРЕННЫЙ КОДИФИКАТОР ЕГЭ ПО БИОЛОГИИ
const BIOLOGY_TOPICS = [
  // Клетка (ЕГЭ 1-4)
  { code: "1.1", name: "Химический состав клетки", section: "Клетка", ege: "1", group: "cell" },
  { code: "1.2", name: "Строение клетки", section: "Клетка", ege: "2", group: "cell" },
  { code: "1.3", name: "Органоиды клетки", section: "Клетка", ege: "2", group: "cell" },
  { code: "1.4", name: "Деление клетки", section: "Клетка", ege: "3", group: "cell" },
  
  // Организм (ЕГЭ 5-10)
  { code: "2.1", name: "Биосинтез белка", section: "Организм", ege: "5", group: "organism" },
  { code: "2.2", name: "Фотосинтез", section: "Организм", ege: "5", group: "organism" },
  { code: "2.3", name: "Обмен веществ", section: "Организм", ege: "6", group: "organism" },
  { code: "2.4", name: "Генетика", section: "Организм", ege: "7-8", group: "genetics" },
  { code: "2.5", name: "Размножение", section: "Организм", ege: "9", group: "organism" },
  { code: "2.6", name: "Онтогенез", section: "Организм", ege: "10", group: "organism" },
  
  // Системы организма (ЕГЭ 11-18)
  { code: "3.1", name: "Нервная система", section: "Человек", ege: "11", group: "human" },
  { code: "3.2", name: "Кровеносная система", section: "Человек", ege: "12", group: "human" },
  { code: "3.3", name: "Дыхательная система", section: "Человек", ege: "13", group: "human" },
  { code: "3.4", name: "Пищеварительная система", section: "Человек", ege: "14", group: "human" },
  { code: "3.5", name: "Выделительная система", section: "Человек", ege: "15", group: "human" },
  { code: "3.6", name: "Иммунитет", section: "Человек", ege: "16", group: "human" },
  
  // Эволюция и экология (ЕГЭ 19-28)
  { code: "4.1", name: "Эволюция", section: "Эволюция", ege: "19-21", group: "evolution" },
  { code: "4.2", name: "Видообразование", section: "Эволюция", ege: "22", group: "evolution" },
  { code: "4.3", name: "Экосистемы", section: "Экология", ege: "23-25", group: "ecology" },
  { code: "4.4", name: "Биосфера", section: "Экология", ege: "26", group: "ecology" },
  { code: "4.5", name: "Селекция", section: "Экология", ege: "27", group: "selection" },
  { code: "4.6", name: "Биотехнология", section: "Экология", ege: "28", group: "selection" },
];

// Достижения
const ACHIEVEMENTS = [
  { id: "first_step", name: "Первый шаг", desc: "Реши первое задание", icon: "🎭", requirement: (stats: any) => stats.totalSolved >= 1 },
  { id: "ten_tasks", name: "Десятка", desc: "Реши 10 заданий", icon: "🔟", requirement: (stats: any) => stats.totalSolved >= 10 },
  { id: "fifty_tasks", name: "Полтинник", desc: "Реши 50 заданий", icon: "💯", requirement: (stats: any) => stats.totalSolved >= 50 },
  { id: "streak_7", name: "Неделя в огне", desc: "7 дней подряд", icon: "🔥", requirement: (stats: any) => stats.streak >= 7 },
  { id: "streak_30", name: "Месяц марафона", desc: "30 дней подряд", icon: "💎", requirement: (stats: any) => stats.streak >= 30 },
  { id: "perfect", name: "Перфекционист", desc: "100% в теме", icon: "👑", requirement: (stats: any) => stats.hasPerfectTopic },
  { id: "master_3", name: "Мастер 3 тем", desc: "80%+ в 3 темах", icon: "🌟", requirement: (stats: any) => stats.masteredCount >= 3 },
  { id: "master_10", name: "Мастер 10 тем", desc: "80%+ в 10 темах", icon: "💫", requirement: (stats: any) => stats.masteredCount >= 10 },
  { id: "all_round", name: "Универсал", desc: "Все темы изучены", icon: "🎪", requirement: (stats: any) => stats.allTopicsStarted },
];

function ProgressContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";
  
  const [subject, setSubject] = useState<"chemistry" | "biology">("chemistry");
  const [topicStats, setTopicStats] = useState<Record<string, { total: number; correct: number; percent: number; attempts: number }>>({});
  const [loading, setLoading] = useState(true);
  const [overallPercent, setOverallPercent] = useState(0);
  const [checkedTopics, setCheckedTopics] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [topicDetails, setTopicDetails] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const topics = subject === "chemistry" ? CHEMISTRY_TOPICS : BIOLOGY_TOPICS;
  const topicsKey = `${subject}_topics_${uid}`;

  // Загрузка сохранённых данных
  useEffect(() => {
    if (!uid) return;
    const saved = localStorage.getItem(topicsKey);
    if (saved) setCheckedTopics(new Set(JSON.parse(saved)));
    
    const streakData = localStorage.getItem(`streak_${uid}`);
    if (streakData) {
      const data = JSON.parse(streakData);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (data.lastDate === today || data.lastDate === yesterday) {
        setStreak(data.count);
      } else {
        setStreak(0);
      }
    }
    
    const xpSaved = localStorage.getItem(`xp_${uid}`);
    if (xpSaved) setXp(parseInt(xpSaved));
    
    const activitySaved = localStorage.getItem(`activity_${uid}`);
    if (activitySaved) setActivityData(JSON.parse(activitySaved));
  }, [uid, subject]);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    loadStats();
  }, [uid, subject]);

  async function loadStats() {
    try {
      const homeworksSnap = await getDocs(
        query(collection(db, "homeworks"), where("student_id", "==", uid))
      );
      const homeworks = homeworksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const submissionsSnap = await getDocs(
        query(collection(db, "submissions"), where("student_id", "==", uid))
      );
      const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const stats: Record<string, { total: number; correct: number; attempts: number }> = {};
      topics.forEach(t => {
        stats[t.name] = { total: 0, correct: 0, attempts: 0 };
      });
      
      for (const hw of homeworks) {
        const topicName = hw.topic;
        if (!topicName || !stats[topicName]) continue;
        
        const hwSubmissions = submissions.filter(s => s.homework_id === hw.id);
        
        if (hwSubmissions.length > 0) {
          const latestSub = hwSubmissions.sort((a, b) => {
            const dateA = a.submitted_at?.seconds || 0;
            const dateB = b.submitted_at?.seconds || 0;
            return dateB - dateA;
          })[0];
          
          if (latestSub.score !== undefined && hw.max_score) {
            stats[topicName].total += hw.max_score;
            stats[topicName].correct += latestSub.score;
            stats[topicName].attempts += hwSubmissions.length;
          }
        }
      }
      
      const percentStats: Record<string, { total: number; correct: number; percent: number; attempts: number }> = {};
      let totalCorrect = 0;
      let totalMax = 0;
      
      topics.forEach(t => {
        const data = stats[t.name];
        const percent = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        percentStats[t.name] = { ...data, percent };
        totalCorrect += data.correct;
        totalMax += data.total;
      });
      
      setTopicStats(percentStats);
      const newPercent = totalMax > 0 ? Math.round((totalCorrect / totalMax) * 100) : 0;
      
      if (newPercent === 100 && overallPercent < 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
      setOverallPercent(newPercent);
      
      const today = new Date().toISOString().slice(0, 10);
      const newActivity = { ...activityData };
      newActivity[today] = (newActivity[today] || 0) + 1;
      setActivityData(newActivity);
      localStorage.setItem(`activity_${uid}`, JSON.stringify(newActivity));
      
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
    }
    setLoading(false);
  }

  async function loadTopicDetails(topicName: string) {
    try {
      const homeworksSnap = await getDocs(
        query(collection(db, "homeworks"), where("student_id", "==", uid), where("topic", "==", topicName))
      );
      const homeworks = homeworksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const submissionsSnap = await getDocs(
        query(collection(db, "submissions"), where("student_id", "==", uid))
      );
      const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const details = homeworks.map(hw => {
        const hwSubs = submissions.filter(s => s.homework_id === hw.id);
        const latest = hwSubs.sort((a, b) => {
          const dateA = a.submitted_at?.seconds || 0;
          const dateB = b.submitted_at?.seconds || 0;
          return dateB - dateA;
        })[0];
        
        return {
          homework: hw,
          submissions: hwSubs.length,
          score: latest?.score,
          max_score: hw.max_score,
          last_date: latest?.submitted_at,
        };
      });
      
      setTopicDetails(details);
    } catch (error) {
      console.error(error);
    }
  }

  function toggleTopic(topicName: string) {
    const newSet = new Set(checkedTopics);
    if (newSet.has(topicName)) newSet.delete(topicName);
    else newSet.add(topicName);
    setCheckedTopics(newSet);
    localStorage.setItem(topicsKey, JSON.stringify([...newSet]));
    
    const today = new Date().toDateString();
    const streakData = JSON.parse(localStorage.getItem(`streak_${uid}`) || '{"count":0,"lastDate":""}');
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (streakData.lastDate !== today) {
      const newCount = streakData.lastDate === yesterday ? streakData.count + 1 : 1;
      localStorage.setItem(`streak_${uid}`, JSON.stringify({ count: newCount, lastDate: today }));
      setStreak(newCount);
      
      const newXp = xp + 10;
      setXp(newXp);
      localStorage.setItem(`xp_${uid}`, newXp.toString());
    }
  }

  function toggleSection(sectionName: string) {
    const newSet = new Set(expandedSections);
    if (newSet.has(sectionName)) newSet.delete(sectionName);
    else newSet.add(sectionName);
    setExpandedSections(newSet);
  }

  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  // Радар-диаграмма по группам
  const radarData = Object.entries(
    topics.reduce((acc: Record<string, { sum: number; count: number }>, t) => {
      if (!acc[t.group]) acc[t.group] = { sum: 0, count: 0 };
      const stat = topicStats[t.name];
      if (stat) { acc[t.group].sum += stat.percent; acc[t.group].count++; }
      return acc;
    }, {})
  ).map(([group, data]) => ({
    group: group.length > 12 ? group.slice(0, 12) + "..." : group,
    fullGroup: group,
    value: data.count > 0 ? Math.round(data.sum / data.count) : 0,
  }));

  // Группировка по разделам
  const sections = topics.reduce((acc: Record<string, any[]>, topic) => {
    if (!acc[topic.section]) acc[topic.section] = [];
    acc[topic.section].push(topic);
    return acc;
  }, {});

  const strongTopics = topics.filter(t => (topicStats[t.name]?.percent || 0) >= 80);
  const weakTopics = topics.filter(t => {
    const p = topicStats[t.name]?.percent || 0;
    return p > 0 && p < 60;
  });
  const untouchedTopics = topics.filter(t => !(topicStats[t.name]?.total > 0));

  useEffect(() => {
    const stats = {
      totalSolved: Object.values(topicStats).reduce((s, t) => s + t.attempts, 0),
      streak,
      hasPerfectTopic: Object.values(topicStats).some(t => t.percent === 100),
      masteredCount: Object.values(topicStats).filter(t => t.percent >= 80).length,
      allTopicsStarted: Object.values(topicStats).every(t => t.total > 0),
    };
    
    const unlocked = ACHIEVEMENTS
      .filter(a => a.requirement(stats))
      .map(a => a.id);
    setUnlockedAchievements(unlocked);
  }, [topicStats, streak]);

  const heatmapDays = Array.from({ length: 90 }, (_, i) => {
    const date = new Date(Date.now() - (89 - i) * 86400000);
    const key = date.toISOString().slice(0, 10);
    return {
      date,
      key,
      count: activityData[key] || 0,
      dayOfWeek: date.getDay(),
    };
  });

  const checkPercent = Math.round((checkedTopics.size / topics.length) * 100);

  const daysToExam = (() => {
    const examDate = new Date(`${new Date().getFullYear()}-06-01`);
    if (examDate < new Date()) examDate.setFullYear(examDate.getFullYear() + 1);
    return Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-orange-50 to-red-100">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🎪</div>
        <p className="text-pink-600 font-medium">Loading the show...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-orange-50 to-red-100 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-10 left-10 text-7xl animate-float">✨</div>
        <div className="absolute top-32 right-20 text-5xl animate-float delay-200">💖</div>
        <div className="absolute bottom-20 left-1/4 text-6xl animate-float delay-500">🎭</div>
        <div className="absolute top-1/2 right-10 text-7xl animate-float delay-700">🌟</div>
        <div className="absolute bottom-40 right-1/3 text-5xl animate-float delay-300">💎</div>
      </div>

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              {["✨", "💖", "🌟", "🎉", "🎭", "💎"][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-pink-600 hover:text-pink-800 transition font-medium flex items-center gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition">←</span> Назад
          </Link>
          <div className="text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-3xl animate-float">🎪</span>
              <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                THE SHOW
              </h1>
              <span className="text-3xl animate-float delay-100">💖</span>
            </div>
            <p className="text-xs text-pink-500 mt-1">Life of a Showgirl Edition</p>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 rounded-3xl shadow-2xl shadow-pink-300/50 p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 text-9xl opacity-10 rotate-12">🎭</div>
          <div className="relative z-10 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="text-center">
                <p className="text-sm uppercase tracking-wider opacity-80 mb-2">Готовность к ЕГЭ</p>
                <div className="text-7xl font-black mb-2 drop-shadow-lg">
                  {overallPercent}%
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur">
                  <div 
                    className="bg-white h-3 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
                <p className="text-xs opacity-80 mt-2">
                  {overallPercent >= 80 ? "🌟 Ты звезда!" :
                   overallPercent >= 60 ? "🎪 Продолжай шоу!" :
                   overallPercent >= 40 ? "💃 На сцену!" :
                   overallPercent > 0 ? "✨ Разогрев!" :
                   "🎭 Шоу начинается!"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-white/20 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
                  <div className="text-4xl">🔥</div>
                  <div>
                    <p className="text-2xl font-black">{streak}</p>
                    <p className="text-xs opacity-80">дней подряд</p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs opacity-80">Уровень {level}</span>
                    <span className="text-xs opacity-80">{xpInLevel}/100 XP</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-yellow-300 to-orange-400 h-2 rounded-full transition-all"
                      style={{ width: `${xpInLevel}%` }}
                    />
                  </div>
                  <p className="text-xs opacity-80 mt-1">⭐ {xp} XP всего</p>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-wider opacity-80 mb-1">До экзамена</p>
                  <p className="text-5xl font-black mb-1">{daysToExam}</p>
                  <p className="text-xs opacity-80">дней</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Переключатель предмета */}
        <div className="flex gap-2 mb-6 bg-white/40 backdrop-blur p-2 rounded-2xl">
          <button
            onClick={() => setSubject("chemistry")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
              subject === "chemistry" 
                ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white"
            }`}
          >
            🧪 Химия ({CHEMISTRY_TOPICS.length} тем)
          </button>
          <button
            onClick={() => setSubject("biology")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${
              subject === "biology" 
                ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg" 
                : "bg-white/60 text-gray-700 hover:bg-white"
            }`}
          >
            🧬 Биология ({BIOLOGY_TOPICS.length} тем)
          </button>
        </div>

        {/* Радар + Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-5 border-2 border-pink-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Карта навыков
            </h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f472b6" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="group" tick={{ fill: "#be185d", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <Radar 
                    name="Прогресс" 
                    dataKey="value" 
                    stroke="#ec4899" 
                    fill="#ec4899" 
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#fff", 
                      border: "2px solid #ec4899",
                      borderRadius: "12px"
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                <p>Начни решать задания 🎭</p>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-5 border-2 border-pink-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">📅</span> Активность (90 дней)
            </h3>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <div className="space-y-1 text-xs text-gray-500 pt-1">
                <div>Пн</div>
                <div></div>
                <div>Ср</div>
                <div></div>
                <div>Пт</div>
                <div></div>
                <div>Вс</div>
              </div>
              <div className="grid grid-flow-col grid-rows-7 gap-1 auto-cols-fr">
                {heatmapDays.map((day, i) => {
                  const intensity = Math.min(day.count / 5, 1);
                  const color = intensity === 0 
                    ? "bg-pink-100" 
                    : intensity < 0.3 
                      ? "bg-pink-300" 
                      : intensity < 0.6 
                        ? "bg-pink-400" 
                        : intensity < 0.9 
                          ? "bg-pink-500" 
                          : "bg-pink-600";
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-sm ${color} hover:ring-2 hover:ring-orange-400 transition cursor-pointer`}
                      title={`${day.key}: ${day.count} активностей`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-500">
              <span>Меньше</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-pink-100"></div>
                <div className="w-3 h-3 rounded-sm bg-pink-300"></div>
                <div className="w-3 h-3 rounded-sm bg-pink-400"></div>
                <div className="w-3 h-3 rounded-sm bg-pink-500"></div>
                <div className="w-3 h-3 rounded-sm bg-pink-600"></div>
              </div>
              <span>Больше</span>
            </div>
          </div>
        </div>

        {/* Чек-лист по разделам */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-5 border-2 border-pink-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📋</span> Чек-лист тем
            </h3>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">
                {checkedTopics.size}/{topics.length}
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${checkPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-pink-600">{checkPercent}%</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(sections).map(([sectionName, sectionTopics]) => {
              const isExpanded = expandedSections.has(sectionName);
              const sectionCompleted = sectionTopics.filter(t => checkedTopics.has(t.name)).length;
              const sectionPercent = Math.round((sectionCompleted / sectionTopics.length) * 100);
              
              return (
                <div key={sectionName} className="border-2 border-pink-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(sectionName)}
                    className="w-full p-3 bg-gradient-to-r from-pink-50 to-orange-50 flex items-center justify-between hover:from-pink-100 hover:to-orange-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-pink-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                      <span className="font-bold text-gray-700">📂 {sectionName}</span>
                      <span className="text-xs bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full">
                        {sectionCompleted}/{sectionTopics.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-pink-500 to-orange-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${sectionPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-pink-600 w-10 text-right">{sectionPercent}%</span>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-3 space-y-2 bg-white">
                      {sectionTopics.map((topic) => {
                        const stat = topicStats[topic.name] || { total: 0, correct: 0, percent: 0, attempts: 0 };
                        const isCompleted = checkedTopics.has(topic.name);
                        return (
                          <div 
                            key={topic.code} 
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                              isCompleted 
                                ? "bg-gradient-to-r from-pink-50 to-orange-50 border-pink-300" 
                                : "bg-white border-pink-100 hover:border-pink-300"
                            }`}
                          >
                            <button
                              onClick={() => toggleTopic(topic.name)}
                              className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 transition flex items-center justify-center ${
                                isCompleted 
                                  ? "bg-gradient-to-br from-pink-500 to-orange-500 border-pink-500 text-white" 
                                  : "bg-white border-pink-300 hover:border-pink-500"
                              }`}
                            >
                              {isCompleted && <span className="text-sm font-bold">✓</span>}
                            </button>
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                setSelectedTopic(topic);
                                loadTopicDetails(topic.name);
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-xs font-bold ${isCompleted ? "line-through text-gray-400" : "text-gray-700"}`}>
                                  №{topic.code} — {topic.name}
                                </span>
                                <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                                  ЕГЭ {topic.ege}
                                </span>
                                {stat.attempts > 0 && (
                                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    🎯 {stat.attempts} {stat.attempts === 1 ? "попытка" : "попыток"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      stat.percent >= 80 ? "bg-gradient-to-r from-emerald-400 to-green-500" :
                                      stat.percent >= 60 ? "bg-gradient-to-r from-lime-400 to-green-400" :
                                      stat.percent >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                                      stat.percent > 0 ? "bg-gradient-to-r from-red-400 to-pink-500" :
                                      "bg-gray-300"
                                    }`}
                                    style={{ width: `${stat.percent}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-gray-600 w-10 text-right">
                                  {stat.percent}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Модальное окно темы */}
        {selectedTopic && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTopic(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">📚 {selectedTopic.name}</h3>
                <button onClick={() => setSelectedTopic(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <div className="mb-4 p-3 bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl">
                <p className="text-sm text-gray-700">
                  <strong>Номера ЕГЭ:</strong> {selectedTopic.ege}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Раздел:</strong> {selectedTopic.section}
                </p>
              </div>
              
              {topicDetails.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-5xl mb-2">📭</div>
                  <p>Пока нет домашних заданий по этой теме</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topicDetails.map((detail, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl p-4 border border-pink-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800">{detail.homework.title}</h4>
                        {detail.score !== undefined && (
                          <span className={`text-sm font-bold ${
                            detail.score / detail.max_score >= 0.8 ? "text-emerald-600" :
                            detail.score / detail.max_score >= 0.6 ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {detail.score}/{detail.max_score}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>🎯 Попыток: {detail.submissions}</span>
                        {detail.last_date && (
                          <span>📅 {new Date(detail.last_date.seconds * 1000).toLocaleDateString("ru-RU")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Сильные и слабые темы */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {strongTopics.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-xl p-5 border-2 border-emerald-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">💪</span> Сильные темы
              </h3>
              <div className="space-y-2">
                {strongTopics.slice(0, 5).map(t => (
                  <div key={t.code} className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{t.name}</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {topicStats[t.name]?.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weakTopics.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-xl p-5 border-2 border-red-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Надо подтянуть
              </h3>
              <div className="space-y-2">
                {weakTopics.slice(0, 5).map(t => (
                  <div key={t.code} className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{t.name}</span>
                    <span className="text-xs font-bold text-red-600">
                      {topicStats[t.name]?.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {untouchedTopics.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl shadow-xl p-5 border-2 border-orange-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">🆕</span> Не начато
              </h3>
              <div className="space-y-2">
                {untouchedTopics.slice(0, 5).map(t => (
                  <div key={t.code} className="p-2 bg-white/60 rounded-lg text-sm font-medium text-gray-700">
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI рекомендации */}
        {(weakTopics.length > 0 || untouchedTopics.length > 0) && (
          <div className="bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 rounded-2xl shadow-xl p-5 mb-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 text-6xl opacity-20">💡</div>
            <h3 className="font-bold mb-3 flex items-center gap-2 relative z-10">
              <span className="text-2xl">🤖</span> AI-рекомендации
            </h3>
            <div className="space-y-2 relative z-10">
              {weakTopics.length > 0 && (
                <p className="text-sm bg-white/20 backdrop-blur p-3 rounded-xl">
                  💪 Подтяни <strong>{weakTopics[0].name}</strong> — сейчас {topicStats[weakTopics[0].name]?.percent}%, а на ЕГЭ это номера {weakTopics[0].ege}
                </p>
              )}
              {untouchedTopics.length > 0 && (
                <p className="text-sm bg-white/20 backdrop-blur p-3 rounded-xl">
                  🆕 Начни с <strong>{untouchedTopics[0].name}</strong> — эта тема ещё не изучена
                </p>
              )}
              {overallPercent >= 60 && overallPercent < 80 && (
                <p className="text-sm bg-white/20 backdrop-blur p-3 rounded-xl">
                  🎯 Чтобы набрать 80%+, повтори слабые темы и реши ещё 20 заданий
                </p>
              )}
              {streak < 3 && (
                <p className="text-sm bg-white/20 backdrop-blur p-3 rounded-xl">
                  🔥 Занимайся каждый день — стрик помогает усваивать материал на 40% лучше
                </p>
              )}
            </div>
          </div>
        )}

        {/* Достижения */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-5 border-2 border-pink-200 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span> Достижения 
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
              {unlockedAchievements.length}/{ACHIEVEMENTS.length}
            </span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = unlockedAchievements.includes(ach.id);
              return (
                <div 
                  key={ach.id}
                  className={`text-center p-3 rounded-xl transition ${
                    unlocked 
                      ? "bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-lg" 
                      : "bg-gray-100 opacity-50"
                  }`}
                  title={ach.desc}
                >
                  <div className={`text-4xl mb-1 ${unlocked ? "animate-float" : "grayscale"}`}>
                    {ach.icon}
                  </div>
                  <p className={`text-xs font-bold ${unlocked ? "text-white" : "text-gray-500"}`}>
                    {ach.name}
                  </p>
                  <p className={`text-[10px] mt-1 ${unlocked ? "text-white/80" : "text-gray-400"}`}>
                    {ach.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Легенда */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border-2 border-pink-200">
          <p className="text-xs text-gray-600 mb-2 font-bold">💡 Легенда прогресса:</p>
          <div className="flex flex-wrap gap-3">
            {[
              { color: "bg-gradient-to-r from-emerald-400 to-green-500", label: "80-100% — Отлично" },
              { color: "bg-gradient-to-r from-lime-400 to-green-400", label: "60-79% — Хорошо" },
              { color: "bg-gradient-to-r from-amber-400 to-orange-400", label: "40-59% — В процессе" },
              { color: "bg-gradient-to-r from-red-400 to-pink-500", label: "1-39% — Начало" },
              { color: "bg-gray-300", label: "0% — Не начато" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-4 h-4 rounded ${item.color}`} />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float { 
          0%, 100% { transform: translateY(0px) rotate(0deg); } 
          50% { transform: translateY(-15px) rotate(5deg); } 
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-700 { animation-delay: 0.7s; }
        
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti linear forwards; }
      `}</style>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-orange-50 to-red-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎪</div>
          <p className="text-pink-600 font-medium">Loading the show...</p>
        </div>
      </div>
    }>
      <ProgressContent />
    </Suspense>
  );
}