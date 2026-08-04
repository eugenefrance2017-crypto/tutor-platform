"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import toast from "react-hot-toast";
import { Loader2, Users, User } from "lucide-react";

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

const INDIVIDUAL_TARIFFS = [
  {
    id: "trial",
    name: "Пробное",
    lessons: 1,
    price: 0,
    pricePerLesson: 0,
    color: "from-emerald-400 to-teal-500",
    badge: "🎁 Бесплатно",
    popular: false,
    type: "individual",
    features: ["1 занятие 60 мин", "Определение уровня", "Составление плана", "Знакомство с платформой"],
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
    type: "individual",
    features: ["4 занятия по 60 мин", "ДЗ с подробной проверкой", "Чат с репетитором", "Доступ к тренажёрам"],
  },
  {
    id: "optima",
    name: "Оптима",
    lessons: 8,
    price: 15000,
    pricePerLesson: 1875,
    color: "from-rose-400 to-pink-500",
    badge: " Популярный",
    popular: true,
    type: "individual",
    features: ["8 занятий по 60 мин", "Всё из тарифа «Старт»", "1 пробник ЕГЭ", "Еженедельные отчёты", "Скидка 6%"],
  },
  {
    id: "maximum",
    name: "Максимум",
    lessons: 12,
    price: 21000,
    pricePerLesson: 1750,
    color: "from-amber-400 to-orange-500",
    badge: " Премиум",
    popular: false,
    type: "individual",
    features: ["12 занятий по 60 мин", "Всё из тарифа «Оптима»", "2 пробника ЕГЭ", "Кабинет родителя", "Скидка 12%"],
  },
];

const GROUP_TARIFFS = [
  {
    id: "group_trial",
    name: "Пробное в группе",
    lessons: 1,
    price: 0,
    pricePerLesson: 0,
    color: "from-emerald-400 to-teal-500",
    badge: "🎁 Бесплатно",
    popular: false,
    type: "group",
    features: ["1 групповое занятие", "Оценка уровня в команде", "Знакомство с форматом", "Материалы урока"],
  },
  {
    id: "group_start",
    name: "Группа Старт",
    lessons: 4,
    price: 6000,
    pricePerLesson: 1500,
    color: "from-blue-400 to-indigo-500",
    badge: "Выгодно",
    popular: false,
    type: "group",
    features: ["4 групповых занятия", "Мини-группы до 6 человек", "Общий чат группы", "Запись уроков"],
  },
  {
    id: "group_optima",
    name: "Группа Оптима",
    lessons: 8,
    price: 11000,
    pricePerLesson: 1375,
    color: "from-indigo-400 to-purple-500",
    badge: "🔥 Хит",
    popular: true,
    type: "group",
    features: ["8 групповых занятий", "Всё из «Группа Старт»", "1 групповой пробник", "Скидка 8%"],
  },
  {
    id: "group_maximum",
    name: "Группа Максимум",
    lessons: 12,
    price: 15600,
    pricePerLesson: 1300,
    color: "from-purple-400 to-fuchsia-500",
    badge: "👑 Максимум",
    popular: false,
    type: "group",
    features: ["12 групповых занятий", "Всё из «Группа Оптима»", "2 групповых пробника", "Скидка 13%"],
  },
];

const DEFAULT_STATS = { students: "50+", avgScore: "85", recommend: "95%" };
const DEFAULT_FAQ = [
  { q: "Можно ли перенести занятие?", a: "Да, вы можете перенести занятие, предупредив минимум за 12 часов." },
  { q: "Что если я пропущу занятие в группе?", a: "Групповое занятие не переносится и не компенсируется, но вы получите запись урока и материалы." },
  { q: "Как оплачивать занятия?", a: "Принимаем оплату картой, через СБП или загрузкой чека в личном кабинете." },
  { q: "Сколько человек в группе?", a: "Мы формируем мини-группы до 6 человек для максимального внимания к каждому." },
];

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student";

  const [planType, setPlanType] = useState<"individual" | "group">("individual");
  const [tariffs, setTariffs] = useState(INDIVIDUAL_TARIFFS);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [faq, setFaq] = useState(DEFAULT_FAQ);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState<string>("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"enot" | "prodamus" | "manual" | null>(null);
  
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  useEffect(() => {
    setTariffs(planType === "individual" ? INDIVIDUAL_TARIFFS : GROUP_TARIFFS);
  }, [planType]);

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDoc(doc(db, "settings", "pricing"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.stats) setStats({ ...DEFAULT_STATS, ...data.stats });
          if (data.faq?.length > 0) setFaq(data.faq);
        }

        if (uid) {
          const globalSnap = await getDoc(doc(db, "settings", "global"));
          if (globalSnap.exists()) {
            setTutorId(globalSnap.data().tutor_id || "");
          }
          
          if (role === "parent") {
            const kidsSnap = await getDocs(query(collection(db, "profiles"), where("parent_id", "==", uid)));
            const kidsList = kidsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setChildren(kidsList);
            if (kidsList.length > 0) setSelectedChildId(kidsList[0].id);
          }
        }
      } catch (e) {
        console.error("Ошибка загрузки данных:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [uid, role]);

  const handlePayment = async (tariff: any, provider: "enot" | "prodamus" | "manual") => {
    if (tariff.price === 0) {
      toast.success("🎉 Открываем Telegram для записи...");
      const tgMessage = encodeURIComponent(`Здравствуйте! Хочу записаться на пробное ${planType === 'group' ? 'групповое' : 'индивидуальное'} занятие.`);
      window.open(`https://t.me/thetorturedchemist?text=${tgMessage}`, "_blank");
      setSelectedTariff(null);
      return;
    }

    if (!uid) {
      toast.error("Сначала войдите в аккаунт");
      router.push(`/login?redirect=/pricing&tariff=${tariff.id}`);
      return;
    }

    const actualStudentId = role === "parent" ? selectedChildId : uid;

    if (provider === "manual") {
      toast.success("Перенаправляем в раздел оплат для загрузки чека...");
      setSelectedTariff(null);
      router.push(`/dashboard?uid=${uid}&role=${role}&tab=payments&tariff=${tariff.id}&studentId=${actualStudentId}`);
      return;
    }

    setIsPaying(true);
    setPaymentProvider(provider);
    try {
      const orderId = `tariff_${tariff.id}_${actualStudentId}_${Date.now()}`;
      const endpoint = provider === "enot" ? "/api/payments/enot/create" : "/api/payments/prodamus/create";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: tariff.price,
          orderId,
          description: `Тариф: ${tariff.name} (${tariff.lessons} ${planType === 'group' ? 'групповых' : 'индивид.'} занятий)`,
          studentId: actualStudentId,
          tutorId: tutorId || null,
          payment_type: planType === "group" ? "group_subscription" : "individual_subscription",
          item_id: tariff.id,
          duration_days: 30,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось создать платеж");

        toast.success(`Перенаправляем на ${provider === "enot" ? "Enot.io" : "Prodamus"}...`);
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Не получен URL для оплаты");
        }
      } else {
        throw new Error("Ошибка сервера оплаты");
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
        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-8xl">🌸</div>
        <div className="absolute bottom-20 right-10 text-7xl">✨</div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="text-center mb-8 pt-8">
          {/* ✅ КНОПКА ВОЗВРАТА: либо в кабинет, либо на сайт */}
          {uid ? (
            <Link 
              href={`/dashboard?uid=${uid}&role=${role}`} 
              className="text-pink-600 hover:text-pink-800 text-sm mb-4 inline-block font-medium"
            >
              ← В личный кабинет
            </Link>
          ) : (
            <Link 
              href="/" 
              className="text-pink-600 hover:text-pink-800 text-sm mb-4 inline-block font-medium"
            >
              ← На сайт
            </Link>
          )}
          
          {/* ✅ ШРИФТ ЗАГОЛОВКА */}
          <h1 className="text-4xl sm:text-5xl font-serif font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 bg-clip-text text-transparent mb-4">
            Абонементы
          </h1>
          <p className="text-stone-600 text-lg">Индивидуальные и групповые занятия по химии и биологии</p>
        </div>

        {/* Переключатель типов */}
        <div className="flex justify-center mb-10">
          <div className="bg-white/80 backdrop-blur p-1.5 rounded-2xl border-2 border-pink-200 inline-flex shadow-sm">
            <button
              onClick={() => setPlanType("individual")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                planType === "individual" ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md" : "text-stone-600 hover:bg-pink-50"
              }`}
            >
              <User size={18} /> Индивидуальные
            </button>
            <button
              onClick={() => setPlanType("group")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                planType === "group" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md" : "text-stone-600 hover:bg-pink-50"
              }`}
            >
              <Users size={18} /> Групповые <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1">Выгоднее</span>
            </button>
          </div>
        </div>

        {/* Тарифы */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
          {tariffs.map((tariff) => (
            <div
              key={tariff.id}
              className={`relative p-6 rounded-3xl bg-white/80 backdrop-blur border-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl flex flex-col ${
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

              <ul className="space-y-2 mb-6 flex-1">
                {tariff.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="text-pink-500 mt-0.5">✓</span>
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

        {/* FAQ */}
        <div className="bg-white/60 backdrop-blur rounded-3xl p-6 sm:p-8 border-2 border-pink-200 mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center text-stone-800 mb-6">💭 Частые вопросы</h2>
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

        <div className="text-center space-y-3 pb-8">
          {uid ? (
            <Link href={`/dashboard?uid=${uid}&role=${role}`} className="inline-block px-6 py-3 rounded-xl bg-white/80 border-2 border-pink-200 text-pink-700 text-sm font-medium hover:bg-white transition shadow-sm">
              ← Вернуться в кабинет
            </Link>
          ) : (
            <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-white/80 border-2 border-pink-200 text-pink-700 text-sm font-medium hover:bg-white transition shadow-sm">
              ← На главную
            </Link>
          )}
        </div>
      </div>

      {/* МОДАЛКА ОПЛАТЫ */}
      {selectedTariff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTariff(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border-2 border-pink-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">{planType === 'group' ? '👥' : '💝'}</div>
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
                <button
                  onClick={() => handlePayment(selectedTariff, "manual")}
                  className="block w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg text-center"
                >
                  🎁 Записаться через Telegram
                </button>
              </div>
            ) : !uid ? (
              <div className="text-center">
                <p className="text-stone-600 text-sm mb-6 font-serif italic">
                  Чтобы оплатить тариф и получить доступ к платформе, необходимо войти в аккаунт
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
                {role === "parent" && children.length > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="text-xs font-bold text-amber-800 block mb-1">Оплата за ученика:</label>
                    <select 
                      value={selectedChildId} 
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-lg p-2 text-sm text-stone-800 focus:outline-none focus:border-amber-400"
                    >
                      {children.map(child => (
                        <option key={child.id} value={child.id}>{child.full_name || "Ученик"}</option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-stone-600 text-sm text-center mb-4 font-serif italic">
                  Выберите удобный способ оплаты
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
                    {isPaying && paymentProvider === "manual" ? <Loader2 className="w-5 h-5 animate-spin" /> : <span></span>}
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
        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}