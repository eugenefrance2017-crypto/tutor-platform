"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // ✅ Добавлен импорт Image
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

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

export default function LandingPage() {
  const [appName, setAppName] = useState("");
  const [appContact, setAppContact] = useState("");
  const [appSubject, setAppSubject] = useState("");
  const [appGoal, setAppGoal] = useState("");
  const [appComment, setAppComment] = useState("");
  const [appSending, setAppSending] = useState(false);
  const [appSent, setAppSent] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Состояния для динамического контента из Firestore
  const [platformName, setPlatformName] = useState("Jenyawisch");
  const [footerText, setFooterText] = useState("© 2026 Jenyawisch. Все права защищены.");
  const [heroTitle, setHeroTitle] = useState("Революция в подготовке к ЕГЭ");
  const [heroSubtitle, setHeroSubtitle] = useState("Интерактивные задания, тренажёры ОВР, ИИ-генератор вариантов, кабинет родителя и полная аналитика — всё в одной платформе.");
  const [aboutName, setAboutName] = useState("Женя");
  const [aboutDesc, setAboutDesc] = useState("Бакалавр и магистр с профильным химическим образованием. Опыт работы в школе. Авторские материалы и собственная платформа для занятий.");
  
  const [pricingStats, setPricingStats] = useState({ students: "50+", avgScore: "80+", recommend: "95%" });
  const [pricingTariffs, setPricingTariffs] = useState<any[]>([]);
  const [pricingSteps, setPricingSteps] = useState<any[]>([]);
  const [pricingGuarantees, setPricingGuarantees] = useState<any[]>([]);
  const [pricingFaq, setPricingFaq] = useState<any[]>([]);
  const [pricingTestimonials, setPricingTestimonials] = useState<any[]>([]);
  const [pricingContacts, setPricingContacts] = useState({ telegram: "@thetorturedchemist", telegramLink: "https://t.me/thetorturedchemist" });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [globalSnap, pricingSnap] = await Promise.all([
          getDoc(doc(db, "settings", "global")),
          getDoc(doc(db, "settings", "pricing")),
        ]);

        if (globalSnap.exists()) {
          const d = globalSnap.data();
          setPlatformName(d.platform_name || "Jenyawisch");
          setFooterText(d.footer_text || "© 2026 Jenyawisch. Все права защищены.");
          setHeroTitle(d.hero_title || "Революция в подготовке к ЕГЭ");
          setHeroSubtitle(d.hero_subtitle || "Интерактивные задания, тренажёры ОВР, ИИ-генератор вариантов...");
          setAboutName(d.about_name || "Женя");
          setAboutDesc(d.about_desc || "Бакалавр и магистр с профильным химическим образованием...");
        }

        if (pricingSnap.exists()) {
          const p = pricingSnap.data();
          if (p.stats) setPricingStats(p.stats);
          if (p.tariffs) setPricingTariffs(p.tariffs);
          if (p.steps) setPricingSteps(p.steps);
          if (p.guarantees) setPricingGuarantees(p.guarantees);
          if (p.faq) setPricingFaq(p.faq);
          if (p.testimonials) setPricingTestimonials(p.testimonials);
          if (p.contacts) setPricingContacts(p.contacts);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных лендинга:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function sendTelegramNotification(name: string, contact: string, subject: string, goal: string, comment: string) {
    const subjectName = subject === "chemistry" ? "🧪 Химия" : subject === "biology" ? "🧬 Биология" : "🧪🧬 Химия и биология";
    const goalName = goal === "ege" ? "🎯 ЕГЭ" : goal === "oge" ? "📙 ОГЭ" : goal === "improve" ? "📈 Подтянуть" : "💬 Другое";
    
    const message = `🔔 <b>Новая заявка с сайта!</b>\n\n👤 <b>Имя:</b> ${name}\n📞 <b>Контакт:</b> ${contact}\n📚 <b>Предмет:</b> ${subjectName}\n🎯 <b>Цель:</b> ${goalName}\n💬 <b>Комментарий:</b> ${comment || 'Не указан'}`;

    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) console.error('❌ Ошибка отправки в Telegram');
    } catch (error) {
      console.error("❌ Ошибка сети при отправке в Telegram:", error);
    }
  }

  async function handleApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!appName.trim() || !appContact.trim() || !appSubject || !appGoal) {
      toast.error("Заполните обязательные поля");
      return;
    }
    
    setAppSending(true);
    try {
      await sendTelegramNotification(appName, appContact, appSubject, appGoal, appComment);
      setAppSent(true);
      setAppName(""); setAppContact(""); setAppSubject(""); setAppGoal(""); setAppComment("");
      toast.success("Заявка отправлена!");
      setTimeout(() => setAppSent(false), 5000);
    } catch (error) {
      toast.error("Ошибка отправки. Попробуйте ещё раз.");
    } finally {
      setAppSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-2xl text-[#8CC63F] animate-pulse font-bold">Загрузка платформы...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white overflow-x-hidden">
      <Toaster position="top-right" />
      
      {/* ========== ХЕДЕР ========== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#1A1A1A]/90 backdrop-blur-xl border-b border-[#5BC0EB]/20" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          
          {/* ✅ ОБНОВЛЕННЫЙ ЛОГОТИП */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src="/logo/logo.png" // Убедись, что файл лежит в папке public/logo/
                alt={platformName}
                width={40}
                height={40}
                className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                priority
              />
              {/* Твоя зелёная пульсирующая точка, теперь с обводкой, чтобы не сливалась с логотипом */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#8CC63F] rounded-full animate-pulse border-2 border-[#1A1A1A]" />
            </div>
            <span className="font-black text-xl bg-gradient-to-r from-[#8CC63F] via-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">
              {platformName}
            </span>
          </Link>
          {/* КОНЕЦ ОБНОВЛЕННОГО ЛОГОТИПА */}

          <div className="flex items-center gap-3">
            <Link href="/pricing" className="px-4 py-2 rounded-xl border border-[#5BC0EB]/30 text-sm font-medium hover:bg-[#5BC0EB]/10 hover:border-[#5BC0EB]/50 transition-all duration-300">
              💰 Тарифы
            </Link>
            <Link href="/auth" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] text-[#1A1A1A] text-sm font-black hover:shadow-lg hover:shadow-[#8CC63F]/25 transition-all duration-300 hover:scale-105">
              Войти
            </Link>
            {/* Кнопка регистрации для мобилок, если нужна */}
            <Link href="/auth/register" className="hidden sm:block px-6 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#8CC63F]/50 text-[#8CC63F] text-sm font-black hover:bg-[#8CC63F]/10 transition-all duration-300 hover:scale-105">
              Регистрация
            </Link>
          </div>
        </div>
      </header>

      {/* ========== ГЕРОЙ-СЕКЦИЯ ========== */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#8CC63F]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9B30FF]/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6">
            <span className="bg-gradient-to-r from-[#8CC63F] via-[#5BC0EB] to-[#98FF98] bg-clip-text text-transparent">
              {heroTitle}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-[#D4D4D4] max-w-2xl mx-auto mb-10">
            {heroSubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] text-[#1A1A1A] text-lg font-black hover:shadow-2xl hover:shadow-[#8CC63F]/30 transition-all duration-300 hover:scale-105">
              Начать обучение 🚀
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <a href="#apply" className="px-8 py-4 rounded-2xl border border-[#5BC0EB]/30 text-lg font-medium hover:bg-[#5BC0EB]/10 hover:border-[#5BC0EB]/50 transition-all duration-300 cursor-pointer">
              Оставить заявку 📩
            </a>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto">
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#8CC63F]/20 hover:border-[#8CC63F]/50 transition-all duration-300 hover:scale-105">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] bg-clip-text text-transparent">{pricingStats.students}</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">учеников</p>
            </div>
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#5BC0EB]/20 hover:border-[#5BC0EB]/50 transition-all duration-300 hover:scale-105">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">{pricingStats.avgScore}</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">средний балл</p>
            </div>
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all duration-300 hover:scale-105 sm:col-span-1 col-span-2">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#FFD700] to-[#FF2A5E] bg-clip-text text-transparent">{pricingStats.recommend}</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">рекомендуют</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== ВОЗМОЖНОСТИ ========== */}
      <section className="py-20 px-4 bg-[#1C2951]/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Всё, что нужно для{" "}
            <span className="bg-gradient-to-r from-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">результата</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "📚", title: "Библиотека заданий", desc: "Кодификатор ЕГЭ, генератор вариантов, ИИ-сборщик домашних заданий", color: "#5BC0EB" },
              { icon: "⚡", title: "Тренажёр ОВР", desc: "Базовый и повышенный уровень, электронный баланс, автопроверка", color: "#E31B23" },
              { icon: "🤖", title: "ИИ-помощник", desc: "Генерация заданий, автопроверка, умные подсказки", color: "#7B2D8E" },
              { icon: "👨‍👩‍👧", title: "Кабинет родителя", desc: "Отчёты о занятиях, баланс, домашние задания ребёнка", color: "#8A9A8B" },
              { icon: "📊", title: "Аналитика", desc: "Воронка учеников, доход, рейтинг, успеваемость", color: "#C67B4B" },
              { icon: "💬", title: "Встроенный чат", desc: "Общение репетитор ↔ ученик ↔ родитель в реальном времени", color: "#FF2A5E" },
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[rgba(255,255,255,0.1)] hover:scale-[1.02] transition-all duration-300 hover:shadow-xl" style={{ borderColor: `${feature.color}30` }}>
                <span className="text-4xl animate-float inline-block">{feature.icon}</span>
                <h3 className="font-bold text-lg mt-4 mb-2 text-white">{feature.title}</h3>
                <p className="text-[#8A9A8B] text-sm group-hover:text-[#D4D4D4] transition">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== О СЕБЕ ========== */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-[#7B2D8E] to-[#FF2A5E] bg-clip-text text-transparent">Обо мне</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="text-center lg:text-left">
              <div className="relative w-40 h-40 mx-auto lg:mx-0">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#7B2D8E] via-[#FF2A5E] to-[#8CC63F] animate-spin-slow opacity-50" />
                <div className="relative w-full h-full rounded-3xl bg-[#1C2951] p-1 overflow-hidden flex items-center justify-center text-6xl">
                  🧪🧬
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-6 mb-2 bg-gradient-to-r from-[#FF2A5E] to-[#5BC0EB] bg-clip-text text-transparent">{aboutName}</h3>
              <p className="text-[#5BC0EB] font-medium">Репетитор по химии и биологии</p>
              <p className="text-[#8A9A8B] text-sm mt-4 leading-relaxed">{aboutDesc}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "🎓", title: "Образование", desc: "Профильное химическое образование", color: "#8CC63F" },
                { icon: "🏫", title: "Опыт", desc: "3+ года преподавания, работа в школе", color: "#5BC0EB" },
                { icon: "📈", title: "Результаты", desc: "Средний балл учеников — 80+", color: "#FFD700" },
                { icon: "💻", title: "Платформа", desc: "Собственная интерактивная среда", color: "#FF5E00" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[rgba(255,255,255,0.1)] hover:scale-[1.02] transition-all duration-300" style={{ borderColor: `${item.color}30` }}>
                  <span className="text-2xl flex-shrink-0 animate-float">{item.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                    <p className="text-[#8A9A8B] text-xs mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== ТАРИФЫ ========== */}
      {pricingTariffs.length > 0 && (
        <section className="py-20 px-4 bg-[#1C2951]/40">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-[#FFD700] to-[#FF2A5E] bg-clip-text text-transparent">Выберите формат</span>
            </h2>
            <p className="text-[#8A9A8B] text-center mb-12">Инвестиция в ваше будущее</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pricingTariffs.map((tariff, i) => (
                <div key={i} className={`relative p-8 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                  tariff.popular 
                    ? "bg-gradient-to-b from-[#8CC63F]/20 to-[#5BC0EB]/20 border-[#8CC63F] shadow-xl shadow-[#8CC63F]/20" 
                    : "bg-[#1C2951]/60 border-[#5BC0EB]/20"
                }`}>
                  {tariff.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] text-[#1A1A1A] text-xs font-bold animate-float">
                      ⭐ Популярный
                    </div>
                  )}
                  <h3 className="font-bold text-xl text-white mb-2">{tariff.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">{tariff.price} ₽</span>
                    <span className="text-[#8A9A8B] text-sm"> / {tariff.period || "курс"}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {(tariff.features || []).map((feature: string, fi: number) => (
                      <li key={fi} className="flex items-center gap-2 text-sm text-[#D4D4D4]">
                        <span className="text-[#8CC63F]">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/register" className={`block text-center py-3 rounded-xl font-bold transition-all duration-300 ${
                    tariff.popular 
                      ? "bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] text-[#1A1A1A] hover:shadow-lg" 
                      : "border border-[#5BC0EB]/30 text-white hover:bg-[#5BC0EB]/10"
                  }`}>
                    Выбрать
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== КАК ЭТО РАБОТАЕТ ========== */}
      {pricingSteps.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
              <span className="bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] bg-clip-text text-transparent">Как начать?</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingSteps.map((step, i) => (
                <div key={i} className="text-center p-6 rounded-2xl bg-[#1C2951]/60 border border-[#5BC0EB]/20 hover:border-[#5BC0EB]/50 transition-all duration-300">
                  <div className="text-4xl mb-4 animate-float">{step.icon}</div>
                  <h3 className="font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[#8A9A8B] text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== ОТЗЫВЫ ========== */}
      {pricingTestimonials.length > 0 && (
        <section className="py-20 px-4 bg-[#1C2951]/40">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
              <span className="bg-gradient-to-r from-[#FFD700] to-[#FFB347] bg-clip-text text-transparent">Отзывы учеников</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pricingTestimonials.map((review, i) => (
                <div key={i} className={`group p-6 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[rgba(255,255,255,0.1)] relative hover:scale-[1.02] transition-all duration-300 ${review.featured ? "ring-2 ring-[#FFD700]/50 shadow-xl" : ""}`}>
                  {review.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFB347] text-[#1A1A1A] text-xs font-bold animate-float">
                      ⭐ Лучший результат
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5BC0EB] to-[#FF2A5E] flex items-center justify-center text-white font-bold text-lg">
                      {review.avatar || review.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white">{review.name}</p>
                      {review.score && <p className="text-xs text-[#8CC63F]">{review.score} баллов</p>}
                    </div>
                  </div>
                  <p className="text-[#D4D4D4] text-sm leading-relaxed italic">«{review.text}»</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== ГАРАНТИИ ========== */}
      {pricingGuarantees.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-[#5BC0EB] to-[#8CC63F] bg-clip-text text-transparent">Мои гарантии</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pricingGuarantees.map((g, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#1C2951]/60 border border-[#8CC63F]/20 hover:border-[#8CC63F]/50 transition-all duration-300">
                  <span className="text-3xl flex-shrink-0">{g.icon}</span>
                  <div>
                    <h4 className="font-bold text-white mb-1">{g.title}</h4>
                    <p className="text-[#8A9A8B] text-sm">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== FAQ ========== */}
      {pricingFaq.length > 0 && (
        <section className="py-20 px-4 bg-[#1C2951]/40">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">Частые вопросы</span>
            </h2>
            <div className="space-y-4">
              {pricingFaq.map((faq, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#1A1A1A]/60 border border-[#5BC0EB]/20 hover:border-[#5BC0EB]/50 transition-all duration-300">
                  <h3 className="font-bold text-white mb-2 flex items-start gap-2">
                    <span className="text-[#8CC63F]">▸</span>
                    {faq.q}
                  </h3>
                  <p className="text-[#8A9A8B] text-sm ml-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== ФОРМА ЗАЯВКИ ========== */}
      <section id="apply" className="py-20 px-4">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="bg-gradient-to-r from-[#E31B23] to-[#FF2A5E] bg-clip-text text-transparent">Оставить заявку</span>
          </h2>
          <p className="text-[#8A9A8B] text-center mb-8">Напишите, и я свяжусь с вами для бесплатной консультации</p>
          
          <form onSubmit={handleApplication} className="space-y-4 p-8 rounded-2xl bg-[#1C2951]/80 backdrop-blur border border-[#E31B23]/20">
            <div>
              <label className="text-sm text-[#8A9A8B] mb-1 block">Имя *</label>
              <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Ваше имя" required className="w-full bg-[#1A1A1A]/50 border border-[#5BC0EB]/20 rounded-xl px-4 py-3 text-white placeholder-[#8A9A8B] focus:outline-none focus:ring-2 focus:ring-[#E31B23] transition-all duration-300" />
            </div>
            <div>
              <label className="text-sm text-[#8A9A8B] mb-1 block">Телефон или Email *</label>
              <input type="text" value={appContact} onChange={(e) => setAppContact(e.target.value)} placeholder="+7 (999) 123-45-67 или email" required className="w-full bg-[#1A1A1A]/50 border border-[#5BC0EB]/20 rounded-xl px-4 py-3 text-white placeholder-[#8A9A8B] focus:outline-none focus:ring-2 focus:ring-[#E31B23] transition-all duration-300" />
            </div>
            <div>
              <label className="text-sm text-[#8A9A8B] mb-1 block">Предмет *</label>
              <select value={appSubject} onChange={(e) => setAppSubject(e.target.value)} required className="w-full bg-[#1A1A1A]/50 border border-[#5BC0EB]/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#E31B23] transition-all duration-300">
                <option value="" className="bg-[#1A1A1A]">Выберите предмет</option>
                <option value="chemistry" className="bg-[#1A1A1A]">🧪 Химия</option>
                <option value="biology" className="bg-[#1A1A1A]">🧬 Биология</option>
                <option value="both" className="bg-[#1A1A1A]">🧪🧬 Химия и биология</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[#8A9A8B] mb-1 block">Цель *</label>
              <select value={appGoal} onChange={(e) => setAppGoal(e.target.value)} required className="w-full bg-[#1A1A1A]/50 border border-[#5BC0EB]/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#E31B23] transition-all duration-300">
                <option value="" className="bg-[#1A1A1A]">Выберите цель</option>
                <option value="ege" className="bg-[#1A1A1A]">🎯 Подготовка к ЕГЭ</option>
                <option value="oge" className="bg-[#1A1A1A]">📙 Подготовка к ОГЭ</option>
                <option value="improve" className="bg-[#1A1A1A]">📈 Подтянуть знания</option>
                <option value="other" className="bg-[#1A1A1A]">💬 Другое</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[#8A9A8B] mb-1 block">Комментарий (необязательно)</label>
              <textarea value={appComment} onChange={(e) => setAppComment(e.target.value)} placeholder="Расскажите о вашей ситуации..." rows={3} className="w-full bg-[#1A1A1A]/50 border border-[#5BC0EB]/20 rounded-xl px-4 py-3 text-white placeholder-[#8A9A8B] focus:outline-none focus:ring-2 focus:ring-[#E31B23] transition-all duration-300 resize-none" />
            </div>
            <button type="submit" disabled={appSending} className="group w-full py-4 rounded-xl bg-gradient-to-r from-[#8CC63F] to-[#5BC0EB] text-[#1A1A1A] font-black text-lg hover:shadow-xl hover:shadow-[#8CC63F]/25 transition-all duration-300 disabled:opacity-50">
              {appSending ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-[#1A1A1A]/30 border-t-[#1A1A1A] rounded-full animate-spin" /> Отправка...</span> : <span className="flex items-center justify-center gap-2">Отправить заявку 📩 <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span></span>}
            </button>
            {appSent && <div className="p-4 rounded-xl bg-[#8CC63F]/10 border border-[#8CC63F]/30 text-[#8CC63F] text-sm text-center animate-pulse">✅ Заявка отправлена! Я свяжусь с вами в ближайшее время.</div>}
          </form>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center p-10 rounded-3xl bg-gradient-to-r from-[#FF5E00] via-[#9B30FF] to-[#98FF98] animate-glitter shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white">Готовы начать?</h2>
          <p className="text-white/80 mb-8">Присоединяйтесь к ученикам, которые уже готовятся со мной</p>
          <Link href="/auth/register" className="group inline-block px-10 py-4 rounded-2xl bg-white text-[#9B30FF] text-lg font-bold hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-xl">
            Зарегистрироваться 🚀 <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
          <p className="text-white/70 text-sm mt-4">✨ Начни свою эру успеха ✨</p>
        </div>
      </section>

      {/* ========== ФУТЕР ========== */}
      <footer className="py-10 px-4 border-t border-[#5BC0EB]/20 text-center">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <span className="text-2xl animate-float">🧪</span>
          <span className="text-2xl animate-float delay-100">🧬</span>
          <span className="text-2xl animate-float delay-200">📚</span>
          <span className="text-2xl animate-float delay-300">⚡</span>
          <span className="text-2xl animate-float delay-400">🎯</span>
          <span className="text-2xl animate-float delay-500">💡</span>
        </div>
        <p className="text-[#8A9A8B] text-sm">{footerText}</p>
        <div className="mt-4 flex justify-center gap-4">
          {pricingContacts.telegramLink && (
            <a href={pricingContacts.telegramLink} target="_blank" rel="noopener noreferrer" className="text-[#5BC0EB] hover:text-[#8CC63F] transition text-sm">
              Telegram: {pricingContacts.telegram}
            </a>
          )}
        </div>
      </footer>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glitter { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; filter: brightness(1.2); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-glitter { animation: glitter 3s ease-in-out infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
      `}</style>
    </div>
  );
}