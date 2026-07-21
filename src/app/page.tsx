"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
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

export default function LandingPage() {
  const [appName, setAppName] = useState("");
  const [appContact, setAppContact] = useState("");
  const [appSubject, setAppSubject] = useState("");
  const [appGoal, setAppGoal] = useState("");
  const [appComment, setAppComment] = useState("");
  const [appSending, setAppSending] = useState(false);
  const [appSent, setAppSent] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function sendTelegramNotification(name: string, contact: string, subject: string, goal: string, comment: string) {
    const TELEGRAM_BOT_TOKEN = "8700232255:AAECQqAMQIBA8X2nplDMMh_UvWoJgQGC59s";
    
    const subjectName = subject === "chemistry" ? "🧪 Химия" : subject === "biology" ? "🧬 Биология" : "🧪🧬 Химия и биология";
    const goalName = goal === "ege" ? "🎯 ЕГЭ" : goal === "oge" ? "📙 ОГЭ" : goal === "improve" ? "📈 Подтянуть" : "💬 Другое";
    
    const message = `📩 *Новая заявка!*\n\n👤 *Имя:* ${name}\n📞 *Контакты:* ${contact}\n📚 *Предмет:* ${subjectName}\n🎯 *Цель:* ${goalName}${comment ? `\n💬 *Комментарий:* ${comment}` : ""}`;
    
    try {
      const updates = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
      const data = await updates.json();
      if (data.result && data.result.length > 0) {
        const chatId = data.result[data.result.length - 1].message.chat.id;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (error) {
      console.error("Ошибка отправки в Telegram:", error);
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
      await addDoc(collection(db, "applications"), {
        name: appName.trim(),
        contact: appContact.trim(),
        subject: appSubject,
        goal: appGoal,
        comment: appComment.trim(),
        status: "new",
        created_at: serverTimestamp(),
      });
      
      await sendTelegramNotification(appName, appContact, appSubject, appGoal, appComment);
      
      setAppSent(true);
      setAppName("");
      setAppContact("");
      setAppSubject("");
      setAppGoal("");
      setAppComment("");
      toast.success("Заявка отправлена!");
      
      setTimeout(() => setAppSent(false), 5000);
    } catch (error) {
      toast.error("Ошибка отправки. Попробуйте ещё раз.");
    } finally {
      setAppSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white overflow-x-hidden">
      
      {/* ========== ХЕДЕР ========== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#1A1A1A]/90 backdrop-blur-xl border-b border-[#5BC0EB]/20" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <span className="text-3xl animate-float inline-block">🧪🧬</span>
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-[#8CC63F] rounded-full animate-pulse" />
            </div>
            <span className="font-black text-xl bg-gradient-to-r from-[#8CC63F] via-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">
              Jenyawisch
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/pricing" 
              className="px-4 py-2 rounded-xl border border-[#5BC0EB]/30 text-sm font-medium hover:bg-[#5BC0EB]/10 hover:border-[#5BC0EB]/50 transition-all duration-300"
            >
              💰 Тарифы
            </Link>
            <Link 
              href="/auth/login" 
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8CC63F] to-[#C67B4B] text-white text-sm font-bold hover:shadow-lg hover:shadow-[#8CC63F]/25 transition-all duration-300 hover:scale-105"
            >
              Войти
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
              Революция
            </span>
            <br />
            в подготовке к ЕГЭ
          </h1>
          
          <p className="text-lg sm:text-xl text-[#D4D4D4] max-w-2xl mx-auto mb-10">
            Интерактивные задания, тренажёры ОВР, ИИ-генератор вариантов, 
            кабинет родителя и полная аналитика — всё в одной платформе.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/register" 
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-[#8CC63F] to-[#C67B4B] text-lg font-bold hover:shadow-2xl hover:shadow-[#8CC63F]/30 transition-all duration-300 hover:scale-105"
            >
              Начать обучение 🚀
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <a 
              href="#apply" 
              className="px-8 py-4 rounded-2xl border border-[#5BC0EB]/30 text-lg font-medium hover:bg-[#5BC0EB]/10 hover:border-[#5BC0EB]/50 transition-all duration-300 cursor-pointer"
            >
              Оставить заявку 📩
            </a>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#8CC63F]/20 hover:border-[#8CC63F]/50 transition-all duration-300 hover:scale-105">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#8CC63F] to-[#FF2A5E] bg-clip-text text-transparent">3+</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">года опыта</p>
            </div>
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#5BC0EB]/20 hover:border-[#5BC0EB]/50 transition-all duration-300 hover:scale-105">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#5BC0EB] to-[#FF2A5E] bg-clip-text text-transparent">80+</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">средний балл</p>
            </div>
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#FF5E00]/20 hover:border-[#FF5E00]/50 transition-all duration-300 hover:scale-105">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#FF5E00] to-[#98FF98] bg-clip-text text-transparent">75+</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">с нуля за 3-4 мес</p>
            </div>
            <div className="group p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all duration-300 hover:scale-105">
              <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#FFD700] to-[#FF2A5E] bg-clip-text text-transparent">88</p>
              <p className="text-xs text-[#8A9A8B] group-hover:text-[#D4D4D4] transition">макс. балл 2025</p>
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

      {/* ========== ДЛЯ КОГО ========== */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Для{" "}
            <span className="bg-gradient-to-r from-[#FF2A5E] to-[#7B2D8E] bg-clip-text text-transparent">каждого</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group p-8 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/50 text-center transition-all duration-300 hover:scale-105">
              <span className="text-6xl animate-float inline-block">🎓</span>
              <h3 className="font-bold text-xl mt-4 mb-2 text-white">Ученикам</h3>
              <p className="text-[#8A9A8B] text-sm group-hover:text-[#D4D4D4] transition">Тренируйтесь на реальных заданиях ЕГЭ, получайте XP и ачивки, общайтесь с репетитором в чате.</p>
            </div>
            <div className="group p-8 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[#FF2A5E]/20 hover:border-[#FF2A5E]/50 text-center transition-all duration-300 hover:scale-105">
              <span className="text-6xl animate-float inline-block">👨‍👩‍👧</span>
              <h3 className="font-bold text-xl mt-4 mb-2 text-white">Родителям</h3>
              <p className="text-[#8A9A8B] text-sm group-hover:text-[#D4D4D4] transition">Следите за прогрессом, контролируйте баланс занятий, получайте отчёты после каждого урока.</p>
            </div>
          </div>
          
          <p className="text-center text-[#8A9A8B] text-sm mt-8">✨ Это моя личная платформа. Всех учеников и родителей добавляю я.</p>
        </div>
      </section>

      {/* ========== О СЕБЕ ========== */}
      <section className="py-20 px-4 bg-[#1C2951]/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-[#7B2D8E] to-[#FF2A5E] bg-clip-text text-transparent">Обо мне</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="text-center lg:text-left">
              <div className="relative w-40 h-40 mx-auto lg:mx-0">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#7B2D8E] via-[#FF2A5E] to-[#8CC63F] animate-spin-slow opacity-50" />
                <div className="relative w-full h-full rounded-3xl bg-[#1C2951] p-1 overflow-hidden">
                  <div className="w-full h-full rounded-3xl bg-[#1C2951] flex items-center justify-center text-6xl">🧪🧬</div>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#8CC63F] rounded-full flex items-center justify-center text-white text-sm animate-pulse">✨</div>
              </div>
              <h3 className="text-2xl font-bold mt-6 mb-2 bg-gradient-to-r from-[#FF2A5E] to-[#5BC0EB] bg-clip-text text-transparent">Женя</h3>
              <p className="text-[#5BC0EB] font-medium">Репетитор по химии и биологии</p>
              <p className="text-[#8A9A8B] text-sm mt-4 leading-relaxed">Бакалавр и магистр с профильным химическим образованием. Опыт работы в школе. Авторские материалы и собственная платформа для занятий.</p>
            </div>
            
            <div className="space-y-4">
              {[
                { icon: "🎓", title: "Образование", desc: "Бакалавр и магистр с профильным химическим образованием", color: "#8CC63F" },
                { icon: "🏫", title: "Опыт", desc: "3+ года преподавания, работа в школе", color: "#5BC0EB" },
                { icon: "📈", title: "Результаты", desc: "Средний балл учеников — 80+. Максимальный балл 2025 — 88", color: "#FFD700" },
                { icon: "🚀", title: "С нуля до 75+", desc: "Подготовка с нуля до 75+ баллов за 3–4 месяца", color: "#E31B23" },
                { icon: "📝", title: "Методика", desc: "Теория + практика. Объяснение сложного простым языком", color: "#8A9A8B" },
                { icon: "💻", title: "Платформа", desc: "Авторские материалы и собственная платформа для занятий", color: "#FF5E00" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[rgba(255,255,255,0.1)] hover:scale-[1.02] transition-all duration-300" style={{ borderColor: `${item.color}30` }}>
                  <span className="text-2xl flex-shrink-0 animate-float">{item.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                    <p className="text-[#8A9A8B] text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[#FFD700]/10 to-[#E31B23]/10 border border-[#FFD700]/20">
            <h4 className="text-center font-bold text-lg mb-6 text-[#FFD700]">🏆 Результаты учеников 2025</h4>
            <div className="flex flex-wrap justify-center gap-3">
              {[75, 80, 83, 85, 87, 88].map((score, i) => (
                <div key={i} className={`group px-5 py-3 rounded-xl text-center transition-all duration-300 hover:scale-110 ${
                  i === 5 ? "bg-gradient-to-r from-[#FFD700] to-[#FFB347] text-[#1A1A1A] shadow-lg" : "bg-[#1C2951]/60 border border-[#5BC0EB]/20"
                }`}>
                  <p className={`text-xl font-black ${i === 5 ? "text-[#1A1A1A]" : "text-white"}`}>{score}</p>
                  <p className={`text-xs ${i === 5 ? "text-[#1A1A1A]/70" : "text-[#8A9A8B]"}`}>баллов</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== ОТЗЫВЫ ========== */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-[#FFD700] to-[#FFB347] bg-clip-text text-transparent">Отзывы</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: "Ира", score: "75 биология / 78 химия", text: "Очень удобный формат обучения и график, комфортные занятия, всё очень понятно по пройденным темам, в общем всё супер классно, химию смогла потянуть с самого нуля, а по биологии узнала много нового.", color: "#5BC0EB" },
              { name: "Люба", score: "88 баллов", text: "Химия — достаточно сложная вещь, особенно ОВР реакции. Никогда не могла с ними разобраться, но перед ЕГЭ решила, что уже пора. Занималась с Женей, оказалось, что много белых пятен в химии. Всё порешали, разобрали. Оказалось всё проще, чем представлялось в начале. Спасибо огромное.", color: "#FFD700", featured: true },
              { name: "Кира", score: "87 баллов", text: "Занятия нравились, комфортная обстановка и объяснение на понятных примерах. Очень удобно, что есть практика сразу после прохождения темы, чтобы закрепить знания. Прогресс был виден — если в начале пробники были на 1/4, то сейчас 3/4. Больше понимания в биологии появилось.", color: "#7B2D8E" },
              { name: "Аделия", score: "1 курс техникума", text: "Материал понятен предельно даже при отсутствующих базовых занятиях. Хотя урок длился 2 часа, время прошло незаметно. Если бы сдавала ЕГЭ, то пошла бы к Жене.", color: "#FF2A5E" },
            ].map((review, i) => (
              <div key={i} className={`group p-6 rounded-2xl bg-[#1C2951]/60 backdrop-blur border border-[rgba(255,255,255,0.1)] relative hover:scale-[1.02] transition-all duration-300 ${review.featured ? "ring-2 ring-[#FFD700]/50 shadow-xl" : ""}`} style={{ borderColor: `${review.color}30` }}>
                {review.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFB347] text-[#1A1A1A] text-xs font-bold animate-float">
                    ⭐ Лучший результат
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg`} style={{ background: `linear-gradient(135deg, ${review.color}, #FF2A5E)` }}>
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white">{review.name}</p>
                    <p className="text-xs text-[#8A9A8B]">{review.score}</p>
                  </div>
                </div>
                <p className="text-[#D4D4D4] text-sm leading-relaxed italic">«{review.text}»</p>
                <div className="flex gap-0.5 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (<span key={i} className="text-[#FFD700]">★</span>))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ФОРМА ЗАЯВКИ ========== */}
      <section id="apply" className="py-20 px-4 bg-[#1C2951]/40">
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
              <input type="text" value={appContact} onChange={(e) => setAppContact(e.target.value)} placeholder="+7 (999) 123-45-67 или email@example.com" required className="w-full bg-[#1A1A1A]/50 border border-[#5BC0EB]/20 rounded-xl px-4 py-3 text-white placeholder-[#8A9A8B] focus:outline-none focus:ring-2 focus:ring-[#E31B23] transition-all duration-300" />
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
            <button type="submit" disabled={appSending} className="group w-full py-4 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#FF2A5E] text-white font-bold text-lg hover:shadow-xl hover:shadow-[#E31B23]/25 transition-all duration-300 disabled:opacity-50">
              {appSending ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Отправка...</span> : <span className="flex items-center justify-center gap-2">Отправить заявку 📩 <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span></span>}
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
          <Link href="/auth/register" className="group inline-block px-10 py-4 rounded-2xl bg-white text-[#9B30FF] text-lg font-bold hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-xl">Зарегистрироваться 🚀 <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span></Link>
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
        <p className="text-[#8A9A8B] text-sm">© 2026 Jenyawisch. Платформа для подготовки к ЕГЭ по химии и биологии.</p>
      </footer>
    </div>
  );
}