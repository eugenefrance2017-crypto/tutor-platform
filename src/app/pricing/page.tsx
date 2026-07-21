"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

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
const auth = getAuth(app);

const DEFAULT_TARIFFS = [
  {
    id: "trial",
    name: "Пробный",
    lessons: 1,
    price: 0,
    pricePerLesson: 0,
    color: "from-emerald-400 to-teal-500",
    badge: " Бесплатно",
    popular: false,
    features: ["1 занятие", "Знакомство с репетитором", "Определение уровня", "Составление плана"],
  },
  {
    id: "start",
    name: "Старт",
    lessons: 4,
    price: 8000,
    pricePerLesson: 2000,
    color: "from-pink-400 to-rose-500",
    badge: null,
    popular: false,
    features: ["4 занятия по 60 минут", "Домашние задания с проверкой", "Чат с репетитором 24/7", "Доступ к платформе", "Банк заданий и тренажёры"],
  },
  {
    id: "optima",
    name: "Оптима",
    lessons: 8,
    price: 15000,
    pricePerLesson: 1875,
    color: "from-rose-400 to-pink-500",
    badge: "💝 Популярный",
    popular: true,
    features: ["8 занятий по 60 минут", "Всё из тарифа «Старт»", "1 пробник ЕГЭ", "Персональный план подготовки", "Еженедельные отчёты", "Скидка 6%"],
  },
  {
    id: "maximum",
    name: "Максимум",
    lessons: 12,
    price: 21000,
    pricePerLesson: 1750,
    color: "from-amber-400 to-orange-500",
    badge: "👑 Премиум",
    popular: false,
    features: ["12 занятий по 60 минут", "Всё из тарифа «Оптима»", "2 пробника ЕГЭ", "Кабинет родителя", "Приоритетная поддержка", "Скидка 12%"],
  },
];

const DEFAULT_CONTACTS = {
  telegram: "@thetorturedchemist",
  telegramLink: "https://t.me/thetorturedchemist",
  email: "eugenefrance2017@gmail.com",
  whatsapp: "+79991234567",
};

const DEFAULT_STATS = { students: "50+", avgScore: "85", recommend: "95%" };

const DEFAULT_FAQ = [
  { q: "Можно ли перенести занятие?", a: "Да, вы можете перенести занятие, предупредив минимум за 12 часов." },
  { q: "Что если я пропущу занятие?", a: "Если предупреждение менее 12 часов — занятие считается проведённым." },
  { q: "Как оплачивать занятия?", a: "Принимаем оплату картой, через СБП или загрузкой чека." },
  { q: "Можно ли вернуть деньги?", a: "Да, если после пробного занятия вы решите не продолжать — вернём 100%." },
  { q: "Сколько длится одно занятие?", a: "Стандартное занятие — 60 минут." },
  { q: "Что входит в «Кабинет родителя»?", a: "Родитель видит расписание, прогресс ученика и может связаться с репетитором." },
];

const DEFAULT_HOW_IT_WORKS = [
  { step: 1, title: "Запишитесь на пробное", desc: "Бесплатное занятие — познакомимся и определим уровень", icon: "💝" },
  { step: 2, title: "Составим план", desc: "Подберём программу под ваши цели и сроки", icon: "📝" },
  { step: 3, title: "Выберите тариф", desc: "Оплатите подходящий пакет занятий", icon: "💳" },
  { step: 4, title: "Начнём занятия", desc: "Регулярные уроки с домашними заданиями и поддержкой", icon: "🎓" },
];

const DEFAULT_GUARANTEES = [
  { icon: "💕", title: "Возврат средств", desc: "Если не понравится первое занятие — вернём 100%" },
  { icon: "🔄", title: "Перенос занятий", desc: "Бесплатный перенос при предупреждении за 12 часов" },
  { icon: "💬", title: "Поддержка 24/7", desc: "Всегда на связи в чате для ответов на вопросы" },
  { icon: "📊", title: "Прозрачный прогресс", desc: "Еженедельные отчёты и доступ к статистике" },
];

const DEFAULT_TESTIMONIALS = [
  { name: "Анна К.", role: "Ученица, 11 класс", text: "Сдала ЕГЭ по химии на 92 балла!", score: 92, avatar: "🌸" },
  { name: "Мария П.", role: "Мама ученика", text: "Очень довольна результатом!", score: null, avatar: "💐" },
  { name: "Дмитрий С.", role: "Ученик, 10 класс", text: "Тренажёры на платформе — это просто находка!", score: null, avatar: "" },
];

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [tariffs, setTariffs] = useState(DEFAULT_TARIFFS);
  const [contacts, setContacts] = useState(DEFAULT_CONTACTS);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [faq, setFaq] = useState(DEFAULT_FAQ);
  const [howItWorks, setHowItWorks] = useState(DEFAULT_HOW_IT_WORKS);
  const [guarantees, setGuarantees] = useState(DEFAULT_GUARANTEES);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);

  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [calculatorLessons, setCalculatorLessons] = useState(8);
  const [loading, setLoading] = useState(true);

  const [tutorId, setTutorId] = useState<string>("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"enot" | "prodamus" | "manual" | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDoc(doc(db, "settings", "pricing"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.tariffs?.length > 0) setTariffs(data.tariffs);
          if (data.contacts) setContacts({ ...DEFAULT_CONTACTS, ...data.contacts });
          if (data.stats) setStats({ ...DEFAULT_STATS, ...data.stats });
          if (data.faq?.length > 0) setFaq(data.faq);
          if (data.howItWorks?.length > 0) setHowItWorks(data.howItWorks);
          if (data.guarantees?.length > 0) setGuarantees(data.guarantees);
          if (data.testimonials?.length > 0) setTestimonials(data.testimonials);
        }

        if (uid) {
          const globalSnap = await getDoc(doc(db, "settings", "global"));
          if (globalSnap.exists()) {
            setTutorId(globalSnap.data().tutor_id || "ТВОЙ_UID_РЕПЕТИТОРА");
          }
        }
      } catch (e) {
        console.error("Ошибка загрузки тарифов:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [uid]);

  const calculatePrice = (lessons: number) => {
    let pricePerLesson = 2000;
    let discount = 0;
    if (lessons >= 12) { pricePerLesson = 1750; discount = 12; }
    else if (lessons >= 8) { pricePerLesson = 1875; discount = 6; }
    else if (lessons >= 4) { pricePerLesson = 2000; discount = 0; }
    return {
      total: pricePerLesson * lessons,
      pricePerLesson,
      discount,
      savings: 2000 * lessons - pricePerLesson * lessons,
    };
  };

  const calcResult = calculatePrice(calculatorLessons);

    const handlePayment = async (tariff: any, provider: "enot" | "prodamus" | "manual") => {
    // 1. Обработка бесплатного пробного урока
    if (tariff.price === 0) {
      toast.success("🎉 Отлично! Перенаправляем на запись...");
      setSelectedTariff(null);
      router.push(`/dashboard?uid=${uid}&role=${role}&action=book_trial`);
      return;
    }

    if (!uid) {
      toast.error("Сначала войдите в аккаунт");
      router.push(`/login?redirect=/pricing&tariff=${tariff.id}`);
      return;
    }

    // 2. Обработка ручной оплаты (показываем инструкцию, а не просто выбрасываем)
    if (provider === "manual") {
      toast.success("Чек отправлен! Репетитор проверит его в течение 24 часов.");
      setSelectedTariff(null);
      // Перенаправляем на страницу, где ученик может загрузить чек (или в дашборд)
      router.push(`/dashboard?uid=${uid}&role=student&tab=payments`);
      return;
    }

    // 3. Обработка автоматической оплаты (Enot / Prodamus)
    setIsPaying(true);
    setPaymentProvider(provider);
    try {
      const orderId = `tariff_${tariff.id}_${uid}_${Date.now()}`;
      const endpoint = provider === "enot" ? "/api/payments/enot/create" : "/api/payments/prodamus/create";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: tariff.price,
          orderId,
          description: `Тариф: ${tariff.name} (${tariff.lessons} занятий)`,
          studentId: uid,
          tutorId: tutorId || null,
          payment_type: "subscription",
          item_id: tariff.id,
          duration_days: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось создать платеж");
      }

      toast.success(`Перенаправляем на ${provider === "enot" ? "Enot.io" : "Prodamus"}...`);
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Не получен URL для оплаты");
      }
      
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(`Ошибка: ${error.message}`);
      setIsPaying(false);
      setPaymentProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">💕</div>
          <p className="text-pink-600 font-serif italic">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-8xl">💕</div>
        <div className="absolute bottom-20 right-10 text-7xl"></div>
        <div className="absolute top-1/3 right-1/4 text-6xl">💝</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">🌷</div>
        <div className="absolute top-1/2 left-1/2 text-5xl">✨</div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="text-center mb-12 pt-8">
          {uid && (
            <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-pink-600 hover:text-pink-800 text-sm mb-4 inline-block font-medium">
              ← В кабинет
            </Link>
          )}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">💕</span>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              Тарифы
            </h1>
            <span className="text-4xl">🌸</span>
          </div>
          <p className="text-rose-600/70 font-serif italic text-lg">
            "Can I go where you go?" 
          </p>
          <p className="text-stone-600 mt-2">Индивидуальные занятия по химии и биологии</p>
        </div>

        {/* Социальное доказательство */}
        <div className="bg-white/60 backdrop-blur rounded-3xl p-6 border-2 border-pink-200 mb-8 shadow-sm">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">{stats.students}</p>
              <p className="text-xs text-stone-600 font-medium uppercase tracking-wide">учеников</p>
            </div>
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">{stats.avgScore}</p>
              <p className="text-xs text-stone-600 font-medium uppercase tracking-wide">средний балл ЕГЭ</p>
            </div>
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">{stats.recommend}</p>
              <p className="text-xs text-stone-600 font-medium uppercase tracking-wide">рекомендуют</p>
            </div>
          </div>
        </div>

        {/* Тарифы */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
          {tariffs.map((tariff) => (
            <div
              key={tariff.id || tariff.name}
              className={`relative p-6 rounded-3xl bg-white/80 backdrop-blur border-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${
                tariff.popular
                  ? "border-pink-400 ring-2 ring-pink-300/50 shadow-lg shadow-pink-200/50"
                  : "border-pink-200 hover:border-pink-300"
              }`}
            >
              {tariff.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold shadow-md bg-gradient-to-r ${tariff.color}`}>
                  {tariff.badge}
                </div>
              )}

              <div className="text-center mb-4 pt-2">
                <h3 className="text-xl font-serif font-bold text-stone-800">{tariff.name}</h3>
                <div className="mt-3">
                  {tariff.price === 0 ? (
                    <span className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">0 ₽</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-stone-800">{tariff.price.toLocaleString()}</span>
                      <span className="text-stone-500 text-sm"> ₽</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {tariff.pricePerLesson === 0 ? "Бесплатно" : `${tariff.pricePerLesson} ₽ / занятие`}
                </p>
                <p className="text-xs text-rose-500 font-medium mt-0.5">
                  {tariff.lessons} {tariff.lessons === 1 ? "занятие" : tariff.lessons < 5 ? "занятия" : "занятий"}
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {tariff.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="text-pink-500 mt-0.5">💗</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedTariff(tariff)}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:scale-[1.02] shadow-md bg-gradient-to-r ${tariff.color}`}
              >
                {tariff.price === 0 ? "🎁 Записаться" : "💕 Выбрать"}
              </button>
            </div>
          ))}
        </div>

        {/* Калькулятор */}
        <div className="bg-gradient-to-br from-pink-100 via-rose-100 to-amber-100 rounded-3xl p-6 sm:p-8 border-2 border-pink-200 mb-12 max-w-3xl mx-auto shadow-lg">
          <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2 text-center flex items-center justify-center gap-2">
            <span>💝</span> Калькулятор стоимости
          </h2>
          <p className="text-center text-stone-600 text-sm mb-6 font-serif italic">Выберите количество занятий — мы покажем цену и скидку</p>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-stone-700 font-medium">Количество занятий:</span>
              <span className="font-bold text-pink-600 text-lg">{calculatorLessons}</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={calculatorLessons}
              onChange={(e) => setCalculatorLessons(parseInt(e.target.value))}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>1</span><span>8</span><span>16</span><span>24</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/80 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Цена за занятие</p>
              <p className="text-xl font-bold text-stone-800">{calcResult.pricePerLesson} ₽</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Всего</p>
              <p className="text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">{calcResult.total.toLocaleString()} ₽</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Скидка</p>
              <p className="text-xl font-bold text-emerald-600">{calcResult.discount}%</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Экономия</p>
              <p className="text-xl font-bold text-amber-600">{calcResult.savings.toLocaleString()} ₽</p>
            </div>
          </div>

          <button
            onClick={() => setSelectedTariff({
              id: "custom",
              name: `Индивидуальный (${calculatorLessons} занятий)`,
              price: calcResult.total,
              lessons: calculatorLessons,
              pricePerLesson: calcResult.pricePerLesson,
              features: ["Персональный график", "Все материалы платформы", "Чат с репетитором"]
            })}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 transition shadow-lg"
          >
            💕 Выбрать этот вариант
          </button>
        </div>

        {/* Как это работает */}
        <div className="mb-12">
          <h2 className="text-3xl font-serif font-bold text-center text-stone-800 mb-8 flex items-center justify-center gap-2">
            <span>✨</span> Как это работает
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {howItWorks.map((step) => (
              <div key={step.step} className="bg-white/80 backdrop-blur rounded-2xl p-5 border-2 border-pink-200 text-center hover:scale-[1.02] transition">
                <div className="text-4xl mb-3">{step.icon}</div>
                <div className="inline-block px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-2">
                  Шаг {step.step}
                </div>
                <h3 className="font-serif font-bold text-stone-800 mb-1">{step.title}</h3>
                <p className="text-sm text-stone-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Гарантии */}
        <div className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-3xl p-6 sm:p-8 border-2 border-pink-200 mb-12">
          <h2 className="text-3xl font-serif font-bold text-center text-stone-800 mb-6 flex items-center justify-center gap-2">
            <span>💝</span> Наши гарантии
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {guarantees.map((g, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-4 text-center">
                <div className="text-3xl mb-2">{g.icon}</div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">{g.title}</h3>
                <p className="text-xs text-stone-600">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Отзывы */}
        <div className="mb-12">
          <h2 className="text-3xl font-serif font-bold text-center text-stone-800 mb-8 flex items-center justify-center gap-2">
            <span>💌</span> Отзывы учеников
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/80 backdrop-blur rounded-2xl p-5 border-2 border-pink-200 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center text-2xl">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 text-sm">{t.name}</p>
                    <p className="text-xs text-stone-500">{t.role}</p>
                  </div>
                </div>
                <p className="text-sm text-stone-700 italic mb-2">"{t.text}"</p>
                {t.score && (
                  <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold">
                    ЕГЭ: {t.score} баллов 🎓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white/60 backdrop-blur rounded-3xl p-6 sm:p-8 border-2 border-pink-200 mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center text-stone-800 mb-6 flex items-center justify-center gap-2">
            <span>💭</span> Частые вопросы
          </h2>
          <div className="space-y-2">
            {faq.map((item, i) => (
              <div key={i} className="border-2 border-pink-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-pink-50/50 transition"
                >
                  <span className="font-medium text-stone-800">{item.q}</span>
                  <span className={`text-pink-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && (
                  <div className="p-4 pt-0 text-sm text-stone-600 border-t border-pink-100 bg-pink-50/30">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="text-center space-y-3">
          {uid && role === "student" && (
            <Link href={`/dashboard?uid=${uid}&role=student`} className="inline-block px-6 py-3 rounded-xl bg-white/80 border-2 border-pink-200 text-pink-700 text-sm font-medium hover:bg-white transition shadow-sm">
              ← Вернуться в кабинет
            </Link>
          )}
          {!uid && (
            <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-white/80 border-2 border-pink-200 text-pink-700 text-sm font-medium hover:bg-white transition shadow-sm">
              ← На главную
            </Link>
          )}
        </div>

        <div className="text-center py-8">
          <p className="text-rose-400/60 text-xs font-serif italic">
            "And they say all's well that ends well" 💕
          </p>
        </div>
      </div>

      {/* МОДАЛКА ОПЛАТЫ */}
      {selectedTariff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTariff(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border-2 border-pink-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">💝</div>
              <h3 className="text-xl font-serif font-bold text-stone-800">Тариф «{selectedTariff.name}»</h3>
              {selectedTariff.price > 0 && (
                <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mt-2">
                  {selectedTariff.price.toLocaleString()} ₽
                </p>
              )}
            </div>

            {selectedTariff.price === 0 ? (
              <div className="text-center">
                <p className="text-stone-600 text-sm mb-6 font-serif italic">
                  Бесплатное занятие — познакомимся, определим уровень и составим план подготовки 
                </p>
                <Link
                  href={`/dashboard?uid=${uid}&role=${role}&action=book_trial`}
                  className="block w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg text-center"
                >
                  🎁 Записаться на пробное
                </Link>
              </div>
            ) : !uid ? (
              <div className="text-center">
                <p className="text-stone-600 text-sm mb-6 font-serif italic">
                  Чтобы оплатить тариф и получить доступ к платформе, необходимо войти в аккаунт 💌
                </p>
                <Link
                  href={`/login?redirect=/pricing&tariff=${selectedTariff.id}`}
                  className="block w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 transition shadow-lg text-center"
                >
                  Войти, чтобы оплатить
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-stone-600 text-sm text-center mb-4 font-serif italic">
                  Выберите удобный способ оплаты для тарифа «{selectedTariff.name}»
                </p>
                <div className="space-y-3 mb-4">
                  <button
                    onClick={() => handlePayment(selectedTariff, "enot")}
                    disabled={isPaying}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isPaying && paymentProvider === "enot" ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>💎</span>}
                    Оплатить через Enot.io
                  </button>

                  <button
                    onClick={() => handlePayment(selectedTariff, "prodamus")}
                    disabled={isPaying}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isPaying && paymentProvider === "prodamus" ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>🟣</span>}
                    Оплатить через Prodamus
                  </button>

                  <button
                    onClick={() => handlePayment(selectedTariff, "manual")}
                    disabled={isPaying}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white border-2 border-amber-200 text-amber-700 font-bold hover:bg-amber-50 transition disabled:opacity-50"
                  >
                    {isPaying && paymentProvider === "manual" ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>🤝</span>}
                    Ручная оплата (Загрузить чек)
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => { setSelectedTariff(null); setIsPaying(false); setPaymentProvider(null); }}
              className="w-full mt-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">💕</div>
          <p className="text-pink-600 font-serif italic">Загрузка...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}