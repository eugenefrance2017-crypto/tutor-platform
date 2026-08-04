"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Edit, RotateCcw, Check, X, Brain, Target, Sparkles } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tutor-platform-a5e37.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tutor-platform-a5e37",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115123071384",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface TrivialCard {
  id: string;
  tutor_id: string;
  trivial_name: string;
  systematic_name: string;
  formula?: string;
  category: "organic" | "inorganic";
  class_name: string;
  difficulty: 1 | 2 | 3;
}

function TrivialNamesContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [cards, setCards] = useState<TrivialCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState<string>("");
  
  // Режимы: 'flashcards' или 'quiz'
  const [mode, setMode] = useState<"flashcards" | "quiz">("flashcards");
  
  // Состояние для карточек
  const [deck, setDeck] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardsReviewed, setFlashcardsReviewed] = useState(0);

  // Состояние для теста
  const [quizQuestion, setQuizQuestion] = useState<TrivialCard | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  // Состояние для репетитора (добавление/редактирование)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTrivial, setFormTrivial] = useState("");
  const [formSystematic, setFormSystematic] = useState("");
  const [formFormula, setFormFormula] = useState("");
  const [formCategory, setFormCategory] = useState<"organic" | "inorganic">("organic");
  const [formClass, setFormClass] = useState("");
  const [formDifficulty, setFormDifficulty] = useState<1 | 2 | 3>(1);

  // Загрузка данных
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    
    const loadData = async () => {
      let tid = uid;
      if (role === "student") {
        const snap = await getDoc(doc(db, "profiles", uid));
        if (snap.exists() && snap.data().tutor_id) {
          tid = snap.data().tutor_id;
        }
      }
      setTutorId(tid);

      const q = query(collection(db, "trivial_names"), where("tutor_id", "==", tid));
      const unsubscribe = onSnapshot(q, (snap) => {
        const loadedCards = snap.docs.map(d => ({ id: d.id, ...d.data() } as TrivialCard));
        setCards(loadedCards);
        setLoading(false);
      }, () => setLoading(false));

      return () => unsubscribe();
    };
    loadData();
  }, [uid, role]);

  // Инициализация колоды для флеш-карточек
  useEffect(() => {
    if (cards.length > 0 && mode === "flashcards") {
      const shuffled = [...Array(cards.length).keys()].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [cards.length, mode]);

  // Инициализация вопроса для теста
  useEffect(() => {
    if (cards.length >= 4 && mode === "quiz" && !quizQuestion) {
      generateQuizQuestion();
    }
  }, [cards.length, mode]);

  // Загрузка статистики из localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`trivial_stats_${uid}`);
      if (saved) {
        const data = JSON.parse(saved);
        setFlashcardsReviewed(data.reviewed || 0);
        setQuizScore(data.quizScore || 0);
        setQuizTotal(data.quizTotal || 0);
      }
    }
  }, [uid]);

  const saveStats = (newReviewed: number, newQuizScore: number, newQuizTotal: number) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`trivial_stats_${uid}`, JSON.stringify({
        reviewed: newReviewed,
        quizScore: newQuizScore,
        quizTotal: newQuizTotal,
      }));
    }
  };

  const generateQuizQuestion = () => {
    if (cards.length < 4) return;
    const correctCard = cards[Math.floor(Math.random() * cards.length)];
    const distractors = cards
      .filter(c => c.id !== correctCard.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(c => c.systematic_name);
    
    const options = [...distractors, correctCard.systematic_name].sort(() => Math.random() - 0.5);
    
    setQuizQuestion(correctCard);
    setQuizOptions(options);
    setQuizAnswered(false);
    setQuizCorrect(false);
  };

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswered || !quizQuestion) return;
    const isCorrect = answer === quizQuestion.systematic_name;
    setQuizAnswered(true);
    setQuizCorrect(isCorrect);
    
    const newScore = isCorrect ? quizScore + 1 : quizScore;
    const newTotal = quizTotal + 1;
    setQuizScore(newScore);
    setQuizTotal(newTotal);
    saveStats(flashcardsReviewed, newScore, newTotal);

    setTimeout(() => {
      generateQuizQuestion();
    }, 1500);
  };

  const handleFlashcardAction = (knewIt: boolean) => {
    if (knewIt) {
      // Просто переходим к следующей
      const nextIdx = currentIndex + 1;
      if (nextIdx >= deck.length) {
        toast.success("🎉 Все карточки пройдены! Переходим к тесту.");
        setMode("quiz");
      } else {
        setCurrentIndex(nextIdx);
        setIsFlipped(false);
        const newReviewed = flashcardsReviewed + 1;
        setFlashcardsReviewed(newReviewed);
        saveStats(newReviewed, quizScore, quizTotal);
      }
    } else {
      // Возвращаем в конец колоды
      const currentCardIdx = deck[currentIndex];
      const newDeck = [...deck, currentCardIdx];
      setDeck(newDeck);
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      const newReviewed = flashcardsReviewed + 1;
      setFlashcardsReviewed(newReviewed);
      saveStats(newReviewed, quizScore, quizTotal);
    }
  };

  const resetForm = () => {
    setFormTrivial(""); setFormSystematic(""); setFormFormula("");
    setFormCategory("organic"); setFormClass(""); setFormDifficulty(1);
    setEditingId(null); setShowForm(false);
  };

  const editCard = (card: TrivialCard) => {
    setFormTrivial(card.trivial_name);
    setFormSystematic(card.systematic_name);
    setFormFormula(card.formula || "");
    setFormCategory(card.category);
    setFormClass(card.class_name);
    setFormDifficulty(card.difficulty);
    setEditingId(card.id);
    setShowForm(true);
  };

  const saveCard = async () => {
    if (!formTrivial.trim() || !formSystematic.trim()) {
      toast.error("Заполните тривиальное и систематическое названия!");
      return;
    }
    const data = {
      tutor_id: tutorId,
      trivial_name: formTrivial.trim(),
      systematic_name: formSystematic.trim(),
      formula: formFormula.trim(),
      category: formCategory,
      class_name: formClass.trim(),
      difficulty: formDifficulty,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "trivial_names", editingId), data);
        toast.success("✨ Карточка обновлена!");
      } else {
        await addDoc(collection(db, "trivial_names"), { ...data, created_at: new Date().toISOString() });
        toast.success("🪄 Карточка добавлена!");
      }
      resetForm();
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`);
    }
  };

  const deleteCard = async (id: string) => {
    if (!window.confirm("Удалить эту карточку?")) return;
    try {
      await deleteDoc(doc(db, "trivial_names", id));
      toast.success("🗑️ Удалена!");
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-fuchsia-500 border-t-transparent"></div>
      </div>
    );
  }

  const currentCard = cards[deck[currentIndex]];
  const accuracy = quizTotal > 0 ? Math.round((quizScore / quizTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-purple-50 to-pink-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-10 text-6xl">📛</div>
        <div className="absolute bottom-20 right-10 text-6xl">🧪</div>
        <div className="absolute top-1/2 left-1/4 text-5xl">✨</div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Шапка */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/trainers?uid=${uid}&role=${role}`} className="text-fuchsia-700 hover:text-fuchsia-900 transition font-medium flex items-center gap-1 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" /> Назад
          </Link>
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Тривиальные названия
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("flashcards")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${mode === "flashcards" ? "bg-fuchsia-600 text-white shadow-lg" : "bg-white/60 text-gray-700 hover:bg-white"}`}
            >
              <Brain className="w-4 h-4" /> Карточки
            </button>
            <button
              onClick={() => setMode("quiz")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${mode === "quiz" ? "bg-purple-600 text-white shadow-lg" : "bg-white/60 text-gray-700 hover:bg-white"}`}
            >
              <Target className="w-4 h-4" /> Закрепление
            </button>
            {role === "tutor" && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Добавить
              </button>
            )}
          </div>
        </div>

        {/* Статистика (только для ученика) */}
        {role === "student" && (
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4 mb-6 border border-fuchsia-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-fuchsia-700">{flashcardsReviewed}</p>
                <p className="text-xs text-gray-600 font-medium">Карточек изучено</p>
              </div>
              <div>
                <p className="text-2xl font-black text-purple-700">{accuracy}%</p>
                <p className="text-xs text-gray-600 font-medium">Точность в тесте</p>
              </div>
              <div>
                <p className="text-2xl font-black text-pink-700">{cards.length}</p>
                <p className="text-xs text-gray-600 font-medium">Всего карточек</p>
              </div>
            </div>
          </div>
        )}

        {/* Режим: Карточки */}
        {mode === "flashcards" && (
          <div className="flex flex-col items-center">
            {cards.length === 0 ? (
              <div className="text-center py-16 bg-white/80 rounded-2xl border-2 border-dashed border-fuchsia-200 w-full">
                <p className="text-5xl mb-3">📚</p>
                <p className="text-fuchsia-800 font-bold text-lg">Пока нет карточек</p>
                <p className="text-sm text-fuchsia-600 mt-1">Попросите репетитора добавить их в этот тренажёр</p>
              </div>
            ) : currentIndex >= deck.length ? (
              <div className="text-center py-16 bg-white/90 rounded-2xl shadow-lg border border-fuchsia-200 w-full">
                <p className="text-6xl mb-4">🎉</p>
                <p className="text-2xl font-black text-gray-900 mb-2">Отличная работа!</p>
                <p className="text-gray-600 mb-6">Вы прошли все карточки. Готовы к тесту?</p>
                <button onClick={() => setMode("quiz")} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold hover:shadow-lg transition">
                  Перейти к закреплению →
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md perspective-1000">
                <motion.div
                  className="relative w-full h-80 cursor-pointer"
                  onClick={() => setIsFlipped(!isFlipped)}
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Лицевая сторона */}
                  <div className="absolute inset-0 backface-hidden bg-white/90 backdrop-blur rounded-3xl shadow-xl border-2 border-fuchsia-200 p-8 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-500 mb-4">{currentCard.class_name}</span>
                    <h2 className="text-3xl font-black text-gray-900 mb-4">{currentCard.trivial_name}</h2>
                    {currentCard.formula && (
                      <p className="text-xl font-mono text-gray-600 bg-fuchsia-50 px-4 py-2 rounded-lg">{currentCard.formula}</p>
                    )}
                    <p className="absolute bottom-6 text-sm text-gray-400 flex items-center gap-1">
                      <RotateCcw className="w-4 h-4" /> Нажмите, чтобы перевернуть
                    </p>
                  </div>

                  {/* Оборотная сторона */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center text-center text-white"
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-200 mb-4">Систематическое название</span>
                    <h2 className="text-2xl font-bold mb-4">{currentCard.systematic_name}</h2>
                    {currentCard.formula && (
                      <p className="text-lg font-mono bg-white/20 px-4 py-2 rounded-lg">{currentCard.formula}</p>
                    )}
                  </div>
                </motion.div>

                {/* Кнопки управления */}
                <div className="flex gap-4 mt-8 w-full">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleFlashcardAction(false); }}
                    className="flex-1 py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <X className="w-5 h-5" /> Повторить
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleFlashcardAction(true); }}
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Знал
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Режим: Тест (Закрепление) */}
        {mode === "quiz" && (
          <div className="w-full max-w-2xl mx-auto">
            {cards.length < 4 ? (
              <div className="text-center py-16 bg-white/80 rounded-2xl border-2 border-dashed border-purple-200">
                <p className="text-5xl mb-3">⚠️</p>
                <p className="text-purple-800 font-bold text-lg">Нужно минимум 4 карточки</p>
                <p className="text-sm text-purple-600 mt-1">Попросите репетитора добавить больше заданий для режима теста</p>
              </div>
            ) : !quizQuestion ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-purple-700">Генерация вопроса...</p>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-purple-200 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-500">{quizQuestion.class_name}</span>
                  <span className="text-sm font-bold text-gray-500">Вопрос {quizTotal + 1}</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-2">{quizQuestion.trivial_name}</h2>
                {quizQuestion.formula && (
                  <p className="text-center text-lg font-mono text-gray-600 bg-purple-50 py-2 rounded-lg mb-8">{quizQuestion.formula}</p>
                )}
                <p className="text-center text-sm text-gray-500 mb-6">Выберите правильное систематическое название:</p>

                <div className="grid grid-cols-1 gap-3">
                  {quizOptions.map((option, idx) => {
                    let btnClass = "bg-white border-2 border-gray-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50";
                    if (quizAnswered) {
                      if (option === quizQuestion.systematic_name) {
                        btnClass = "bg-emerald-100 border-2 border-emerald-500 text-emerald-800";
                      } else if (option !== quizQuestion.systematic_name && quizCorrect === false && false /* если нужно подсвечивать ошибочный выбор, но тут мы просто показываем правильный */) {
                        // Можно добавить логику подсветки выбранного неправильного, но для простоты покажем только правильный
                      }
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(option)}
                        disabled={quizAnswered}
                        className={`w-full p-4 rounded-xl font-bold text-left transition flex items-center justify-between ${btnClass}`}
                      >
                        <span>{option}</span>
                        {quizAnswered && option === quizQuestion.systematic_name && <Check className="w-5 h-5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>

                {quizAnswered && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-4 rounded-xl text-center font-bold ${quizCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {quizCorrect ? "🌟 Отлично! Верно!" : "✨ Неверно, запомните правильный ответ выше"}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Панель управления для репетитора */}
        {role === "tutor" && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Список карточек */}
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 border border-fuchsia-200">
                <h3 className="font-bold text-fuchsia-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Карточки ({cards.length})
                </h3>
                {cards.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">Нет карточек. Добавьте первую!</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {cards.map((card) => (
                      <div key={card.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-fuchsia-300 transition group">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{card.trivial_name}</p>
                            <p className="text-xs text-gray-600">{card.systematic_name}</p>
                            <span className="text-[10px] bg-fuchsia-100 text-fuchsia-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                              {card.category === "organic" ? "Органика" : "Неорганика"}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => editCard(card)} className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => deleteCard(card.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Форма добавления/редактирования */}
            <div className="lg:col-span-2">
              {showForm ? (
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-fuchsia-200">
                  <h3 className="font-bold text-fuchsia-800 mb-4">{editingId ? "✏️ Редактировать" : "➕ Новая карточка"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-fuchsia-700 font-medium mb-1 block">Тривиальное название *</label>
                      <input value={formTrivial} onChange={(e) => setFormTrivial(e.target.value)} className="w-full border border-fuchsia-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none" placeholder="Например: Кумол" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-fuchsia-700 font-medium mb-1 block">Систематическое название *</label>
                      <input value={formSystematic} onChange={(e) => setFormSystematic(e.target.value)} className="w-full border border-fuchsia-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none" placeholder="Например: Изопропилбензол" />
                    </div>
                    <div>
                      <label className="text-xs text-fuchsia-700 font-medium mb-1 block">Формула (опционально)</label>
                      <input value={formFormula} onChange={(e) => setFormFormula(e.target.value)} className="w-full border border-fuchsia-200 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-fuchsia-400 outline-none" placeholder="C₆H₅CH(CH₃)₂" />
                    </div>
                    <div>
                      <label className="text-xs text-fuchsia-700 font-medium mb-1 block">Класс веществ</label>
                      <input value={formClass} onChange={(e) => setFormClass(e.target.value)} className="w-full border border-fuchsia-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none" placeholder="Ароматические углеводороды" />
                    </div>
                    <div>
                      <label className="text-xs text-fuchsia-700 font-medium mb-1 block">Тип</label>
                      <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as any)} className="w-full border border-fuchsia-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none">
                        <option value="organic">Органическая</option>
                        <option value="inorganic">Неорганическая</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-fuchsia-700 font-medium mb-1 block">Сложность</label>
                      <div className="flex gap-2">
                        {[1, 2, 3].map(lvl => (
                          <button key={lvl} onClick={() => setFormDifficulty(lvl as 1|2|3)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formDifficulty === lvl ? "bg-fuchsia-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                            {"⭐".repeat(lvl)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveCard} className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition">
                      {editingId ? "💾 Сохранить" : "➕ Добавить"}
                    </button>
                    <button onClick={resetForm} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/60 backdrop-blur rounded-2xl border-2 border-dashed border-fuchsia-200 p-12 text-center">
                  <p className="text-4xl mb-2">📝</p>
                  <p className="text-fuchsia-800 font-medium">Выберите карточку слева для редактирования или создайте новую</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}

export default function TrivialNamesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-purple-50 to-pink-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-fuchsia-500 border-t-transparent"></div>
        </div>
      }>
        <TrivialNamesContent />
      </Suspense>
    </AuthGuard>
  );
}