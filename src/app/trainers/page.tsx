"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

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

const TRAINERS = [
  {
    id: "redox",
    name: "ОВР",
    icon: "⚡",
    color: "from-red-500 to-orange-600",
    bgLight: "bg-red-50",
    description: "Окислительно-восстановительные реакции. Баланс, коэффициенты, среда.",
    collection: "redox_reactions",
    exam: "ЕГЭ №29",
    difficulty: "Сложно",
  },
  {
    id: "chains",
    name: "Цепочки превращений",
    icon: "🧬",
    color: "from-purple-500 to-fuchsia-600",
    bgLight: "bg-purple-50",
    description: "Генетические связи в органике. От углеводородов до кислот.",
    collection: "organic_chains",
    exam: "ЕГЭ №32",
    difficulty: "Очень сложно",
  },
  {
    id: "ionic",
    name: "Ионные уравнения",
    icon: "⚗️",
    color: "from-cyan-500 to-blue-600",
    bgLight: "bg-cyan-50",
    description: "Полные и сокращённые ионные уравнения реакций.",
    collection: "ionic_equations",
    exam: "ЕГЭ №20",
    difficulty: "Средне",
  },
  {
    id: "qualitative",
    name: "Качественные реакции",
    icon: "🔬",
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50",
    description: "Распознавание веществ по характерным признакам.",
    collection: "qualitative_reactions",
    exam: "ЕГЭ №24-26",
    difficulty: "Средне",
  },
  {
    id: "inorganic",
    name: "Неорганика",
    icon: "🧪",
    color: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-50",
    description: "Типы оксидов, степени окисления, свойства элементов, решётки.",
    collection: "inorganic_cards",
    exam: "ЕГЭ №7-12",
    difficulty: "Разное",
  },
  {
    id: "calc",
    name: "Расчётные задачи",
    icon: "🧮",
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50",
    description: "Массовая доля, моли, объёмы газов, выход продукта.",
    collection: "calc_problems",
    exam: "ЕГЭ №27-29",
    difficulty: "Сложно",
  },
  {
    id: "reaction_types",
    name: "Типы реакций",
    icon: "🎯",
    color: "from-pink-500 to-rose-600",
    bgLight: "bg-pink-50",
    description: "Соединение, разложение, замещение, обмен, ОВР.",
    collection: "reaction_types",
    exam: "ЕГЭ №13-15",
    difficulty: "Легко",
  },
  {
    id: "nomenclature",
    name: "Номенклатура органики",
    icon: "🧬",
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50",
    description: "Систематические названия органических соединений.",
    collection: "nomenclature_items",
    exam: "ЕГЭ №13-15",
    difficulty: "Средне",
  },
  {
    id: "trivial_names",
    name: "Тривиальные названия",
    icon: "📛",
    color: "from-fuchsia-500 to-pink-600",
    bgLight: "bg-fuchsia-50",
    description: "Исторические названия: уксусная, муравьиная, ацетон и др.",
    collection: "trivial_names",
    exam: "ЕГЭ №13-15",
    difficulty: "Легко",
  },
];

function TrainersContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalStats, setTotalStats] = useState({ solved: 0, correct: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    
    const loadCounts = async () => {
      try {
        let tid = uid;
        if (role === "student") {
          const snap = await getDoc(doc(db, "profiles", uid));
          if (snap.exists()) tid = snap.data().tutor_id || uid;
        }
        
        const newCounts: Record<string, number> = {};
        await Promise.all(
          TRAINERS.map(async (trainer) => {
            try {
              const q = query(collection(db, trainer.collection), where("tutor_id", "==", tid));
              const snap = await getDocs(q);
              newCounts[trainer.id] = snap.size;
            } catch { newCounts[trainer.id] = 0; }
          })
        );
        setCounts(newCounts);

        // Общая статистика из localStorage
        let totalSolved = 0, totalCorrect = 0;
        if (typeof window !== "undefined") {
          const keys = [
            `redox_stats_${uid}`, `chains_stats_${uid}`, `ionic_stats_${uid}`,
            `qual_stats_${uid}`, `inorganic_stats_${uid}`, `calc_stats_${uid}`,
            `rtypes_stats_${uid}`, `nomenclature_stats_${uid}`, `trivial_stats_${uid}`,
          ];
          keys.forEach(key => {
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                const data = JSON.parse(saved);
                totalSolved += data.solved || 0;
                totalCorrect += data.correct || 0;
              } catch {}
            }
          });
        }
        setTotalStats({ solved: totalSolved, correct: totalCorrect });
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadCounts();
  }, [uid, role]);

  const totalTasks = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const accuracy = totalStats.solved > 0 ? Math.round((totalStats.correct / totalStats.solved) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-700 font-medium">Загрузка тренажёров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">🧪</div>
        <div className="absolute bottom-20 right-10 text-6xl">⚗️</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
        <div className="absolute bottom-1/3 right-1/4 text-7xl">🔬</div>
        <div className="absolute top-1/3 right-1/3 text-6xl">⚡</div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Заголовок */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-purple-700 hover:text-purple-900 transition font-medium flex items-center gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition">←</span> Назад
          </Link>
          <div className="text-center flex-1">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-4xl animate-float">🧪</span>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Тренажёры
              </h1>
              <span className="text-4xl animate-float delay-100">✨</span>
            </div>
            <p className="text-sm text-purple-700 mt-2">Подготовка к ЕГЭ по химии</p>
          </div>
          <div className="w-24"></div>
        </div>

        {/* Общая статистика */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 mb-8 border border-purple-200">
          <h2 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
            📊 Ваша статистика
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
              <p className="text-3xl font-black text-purple-700">{totalStats.solved}</p>
              <p className="text-xs text-gray-700 font-medium mt-1">Решено всего</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
              <p className="text-3xl font-black text-emerald-700">{totalStats.correct}</p>
              <p className="text-xs text-gray-700 font-medium mt-1">Верных ответов</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
              <p className="text-3xl font-black text-amber-700">{accuracy}%</p>
              <p className="text-xs text-gray-700 font-medium mt-1">Точность</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl">
              <p className="text-3xl font-black text-pink-700">{totalTasks}</p>
              <p className="text-xs text-gray-700 font-medium mt-1">Доступно заданий</p>
            </div>
          </div>
        </div>

        {/* Сетка тренажёров */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TRAINERS.map((trainer, idx) => {
            const count = counts[trainer.id] || 0;
            return (
              <Link
                key={trainer.id}
                href={`/trainers/${trainer.id}?uid=${uid}&role=${role}`}
                className="group relative bg-white/90 backdrop-blur rounded-2xl shadow-lg overflow-hidden border border-purple-200 hover:border-purple-400 hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                {/* Градиентная полоска сверху */}
                <div className={`h-2 bg-gradient-to-r ${trainer.color}`}></div>
                
                <div className="p-5">
                  {/* Заголовок с иконкой */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${trainer.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                      {trainer.icon}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 font-medium">Заданий</div>
                      <div className="text-2xl font-black text-purple-700">{count}</div>
                    </div>
                  </div>

                  {/* Название и описание */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition">
                    {trainer.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {trainer.description}
                  </p>

                  {/* Теги */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      📝 {trainer.exam}
                    </span>
                    <span className={`text-xs ${trainer.bgLight} text-gray-700 px-2 py-1 rounded-full font-medium`}>
                      ⚡ {trainer.difficulty}
                    </span>
                  </div>

                  {/* Кнопка */}
                  <div className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r ${trainer.color} text-white font-bold text-sm`}>
                    <span>Начать тренировку</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                {/* Номер карточки */}
                <div className="absolute top-4 right-4 text-6xl font-black text-purple-100 group-hover:text-purple-200 transition pointer-events-none">
                  {idx + 1}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Подсказка */}
        {role === "student" && totalTasks === 0 && (
          <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-2">📚</p>
            <p className="text-amber-800 font-bold mb-1">Пока нет заданий</p>
            <p className="text-sm text-amber-700">Попросите репетитора создать задания в тренажёрах</p>
          </div>
        )}

        {role === "tutor" && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div>
                <p className="text-purple-800 font-bold mb-1">Совет репетитору</p>
                <p className="text-sm text-purple-700">
                  Создавайте задания в каждом тренажёре — ученики смогут тренироваться по отдельным темам и отслеживать свой прогресс.
                  Используйте <span className="font-bold">блиц-режим</span> ⚡ для быстрой проверки знаний.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .delay-100 { animation-delay: 0.1s; }
      `}</style>
    </div>
  );
}

export default function TrainersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-violet-50 to-fuchsia-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    }>
      <TrainersContent />
    </Suspense>
  );
}