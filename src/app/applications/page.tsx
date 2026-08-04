"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";
  
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "done">("all");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "applications"), orderBy("created_at", "desc")),
      (snap) => {
        setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Вспомогательная функция для определения типа контакта
  const getContactLink = (contact: string) => {
    const cleanContact = contact.trim();
    if (cleanContact.includes('@')) {
      return { href: `mailto:${cleanContact}`, type: 'email', icon: '✉️' };
    }
    // Простая проверка на номер телефона (содержит цифры и +)
    if (/^[\d\+\-\(\)\s]+$/.test(cleanContact)) {
      return { href: `tel:${cleanContact.replace(/\s/g, '')}`, type: 'phone', icon: '📞' };
    }
    return { href: `https://t.me/${cleanContact.replace('@', '')}`, type: 'telegram', icon: '✈️' };
  };

  const getSubjectText = (subject: string) => {
    if (subject === "chemistry") return "Химии";
    if (subject === "biology") return "Биологии";
    return "Химии и Биологии";
  };

  async function updateStatus(id: string, status: string, app: any) {
    await updateDoc(doc(db, "applications", id), { status });
    
    // 🪄 Магия копирования приветствия при первом контакте
    if (status === "contacted") {
      const subjectText = getSubjectText(app.subject);
      const message = `Здравствуйте, ${app.name}! Это Женя, репетитор по ${subjectText}. Получил вашу заявку, давайте обсудим детали занятий и подберём удобное время. 🌙`;
      
      try {
        await navigator.clipboard.writeText(message);
        toast.success("Статус обновлён, текст сообщения скопирован! 📋");
      } catch (err) {
        toast.success("Статус обновлён!");
      }
    } else {
      toast.success(status === "done" ? "Отмечено как «Готово»" : "Статус обновлён");
    }
  }

  // 🗄️ Безопасное архивирование вместо удаления
  async function archiveApplication(id: string) {
    if (!window.confirm("Архивировать заявку? Она исчезнет из текущего списка.")) return;
    await updateDoc(doc(db, "applications", id), { status: "archived" });
    toast.success("Заявка отправлена в архив");
  }

  // Скрываем архивные заявки из всех обычных фильтров
  const filtered = applications.filter((app: any) => {
    if (app.status === "archived") return false;
    if (filter === "all") return true;
    return app.status === filter;
  });

  const newCount = applications.filter((a: any) => a.status === "new").length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-indigo-600 font-medium animate-pulse">Загрузка заявок...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Фоновые декоративные элементы Midnights */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium flex items-center gap-1">
            ← Назад
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            📩 Заявки 
            {newCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="text-sm bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full ml-3 shadow-lg shadow-red-500/30"
              >
                {newCount} новых
              </motion.span>
            )}
          </h1>
          <div></div>
        </div>

        {/* Фильтры */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mb-8 flex-wrap bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-indigo-100 shadow-sm w-fit"
        >
          {[
            { key: "all", label: "Все" },
            { key: "new", label: `🆕 Новые (${applications.filter(a => a.status === "new").length})` },
            { key: "contacted", label: "📞 Связались" },
            { key: "done", label: "✅ Готово" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === f.key 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105" 
                  : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-12 text-center border border-indigo-100"
          >
            <p className="text-6xl mb-4">🌙</p>
            <p className="text-gray-500 text-lg font-medium">
              {filter === "new" ? "Нет новых заявок" : "Заявок пока нет"}
            </p>
            <p className="text-gray-400 text-sm mt-2">Самое время отдохнуть или проверить расписание</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {filtered.map((app: any) => {
                const contactInfo = getContactLink(app.contact);
                
                return (
                  <motion.div 
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-5 border transition-all duration-300 hover:shadow-xl ${
                      app.status === "new" ? "border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200" :
                      app.status === "contacted" ? "border-amber-200 bg-amber-50/30" :
                      "border-emerald-200 bg-emerald-50/30 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {app.name ? app.name[0].toUpperCase() : "?"}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">{app.name || "Без имени"}</h3>
                            <a 
                              href={contactInfo.href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 transition"
                            >
                              <span>{contactInfo.icon}</span> {app.contact}
                            </a>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-200">
                            {app.subject === "chemistry" ? "🧪 Химия" : app.subject === "biology" ? "🧬 Биология" : "🧪🧬 Химия и биология"}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium border border-purple-200">
                            {app.goal === "ege" ? "🎯 ЕГЭ" : app.goal === "oge" ? "📙 ОГЭ" : app.goal === "improve" ? "📈 Подтянуть" : "💬 Другое"}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                            app.status === "new" ? "bg-red-50 text-red-700 border-red-200" :
                            app.status === "contacted" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {app.status === "new" ? "🆕 Новая" : app.status === "contacted" ? "📞 Связались" : "✅ Готово"}
                          </span>
                        </div>
                        
                        {app.comment && (
                          <div className="mt-4 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed">💬 {app.comment}</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                          🕒 {app.created_at?.seconds 
                            ? new Date(app.created_at.seconds * 1000).toLocaleDateString("ru-RU", { 
                                day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" 
                              }) 
                            : "Дата не указана"}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        {app.status === "new" && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateStatus(app.id, "contacted", app)} 
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/20 hover:shadow-lg transition"
                          >
                            📞 Связались
                          </motion.button>
                        )}
                        {app.status === "contacted" && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateStatus(app.id, "done", app)} 
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg transition"
                          >
                            ✅ Готово
                          </motion.button>
                        )}
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => archiveApplication(app.id)} 
                          className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center gap-1"
                          title="Архивировать"
                        >
                          🗄️ В архив
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">Загрузка...</p>
        </div>
      </div>
    }>
      <ApplicationsContent />
    </Suspense>
  );
}