"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where,
  onSnapshot, doc, getDoc, getDocs, serverTimestamp
} from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Trash2, Edit, CreditCard, X, Sparkles, Crown, Zap, ChevronRight } from "lucide-react";

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

const sendTelegramNotification = async (studentId: string, message: string) => {
  try {
    const studentSnap = await getDoc(doc(db, "profiles", studentId));
    if (studentSnap.exists()) {
      const chatId = studentSnap.data().telegram_chat_id;
      if (chatId) {
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, targetChatId: chatId }),
        });
      }
    }
  } catch (error) {
    console.error("Ошибка отправки уведомления:", error);
  }
};

// Градиенты для аватарок-инициалов - циклически назначаются по индексу ученика
const AVATAR_GRADIENTS = [
  "from-purple-400 to-fuchsia-400",
  "from-fuchsia-400 to-pink-400",
  "from-pink-400 to-orange-400",
  "from-indigo-400 to-purple-400",
  "from-purple-300 to-pink-500",
];

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
};

const formatNextLesson = (schedule?: string) => {
  // Плейсхолдер: реальная логика должна вычислять ближайшую дату
  // из group.schedule или коллекции lessons. Пока просто отражаем schedule.
  return schedule || "—";
};

function GroupsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (typeof window !== "undefined" ? (localStorage.getItem('theme') as 'dark' | 'light') || 'light' : 'light'));
  const isDark = theme === 'dark';

  const [groups, setGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState<"chemistry" | "biology">("chemistry");
  const [formPrice, setFormPrice] = useState(1500);
  const [formMaxStudents, setFormMaxStudents] = useState(6);
  const [formSchedule, setFormSchedule] = useState("Пн, Ср 18:00");
  const [formStudents, setFormStudents] = useState<string[]>([]);

  useEffect(() => {
    // ИСПРАВЛЕНО: раньше при role !== "tutor" loading никогда не снимался,
    // и пользователь видел спиннер вечно. Теперь снимаем в любом случае.
    if (!uid || role !== "tutor") {
      setLoading(false);
      return;
    }

    const unsubGroups = onSnapshot(query(collection(db, "groups"), where("tutor_id", "==", uid)), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Неоплаченные счета - нужны для бейджа "N не оплатили" на карточке
    const unsubPayments = onSnapshot(query(collection(db, "payments"), where("tutor_id", "==", uid), where("confirmed", "==", false)), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubGroups(); unsubStudents(); unsubPayments(); };
  }, [uid, role]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormName("");
    setFormSubject("chemistry");
    setFormPrice(1500);
    setFormMaxStudents(6);
    setFormSchedule("Пн, Ср 18:00");
    setFormStudents([]);
    setShowModal(true);
  };

  const openEditModal = (group: any) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormSubject(group.subject);
    setFormPrice(group.price_per_lesson);
    setFormMaxStudents(group.max_students);
    setFormSchedule(group.schedule || "");
    setFormStudents(group.student_ids || []);
    setShowModal(true);
  };

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return toast.error("Введите название группы");
    if (formStudents.length === 0) return toast.error("Добавьте хотя бы одного ученика");
    if (formStudents.length > formMaxStudents) return toast.error("Учеников больше, чем максимальный размер группы");

    const groupData = {
      tutor_id: uid,
      name: formName.trim(),
      subject: formSubject,
      price_per_lesson: formPrice,
      max_students: formMaxStudents,
      schedule: formSchedule.trim(),
      student_ids: formStudents,
      active: true,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (editingGroup) {
        await updateDoc(doc(db, "groups", editingGroup.id), groupData);
        toast.success("Группа обновлена! ✨");
      } else {
        await addDoc(collection(db, "groups"), { ...groupData, created_at: new Date().toISOString() });
        toast.success("Группа создана! 👑");
      }
      setShowModal(false);
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!window.confirm("Удалить группу? Это не удалит расписание, но уберёт группу из списка.")) return;
    try {
      await deleteDoc(doc(db, "groups", id));
      toast.success("Группа удалена");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  const goToFinanceForGroup = (group: any) => {
    router.push(`/finance?uid=${uid}&role=${role}&tab=stats&groupId=${group.id}&groupName=${encodeURIComponent(group.name)}&groupPrice=${group.price_per_lesson}&studentIds=${group.student_ids.join(',')}`);
  };

  const openGroup = (group: any) => {
    router.push(`/groups/${group.id}?uid=${uid}&role=${role}`);
  };

  const generateInvoices = async (group: any) => {
    if (!group.student_ids || group.student_ids.length === 0) {
      return toast.error("В группе нет учеников!");
    }
    if (!window.confirm(`Сформировать счета на 4 занятия для ${group.student_ids.length} учеников группы "${group.name}"?`)) return;

    const amount = group.price_per_lesson * 4;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 5);

    let successCount = 0;
    let failCount = 0;
    const notificationMsg = `💰 Новый счёт на оплату!\n\nГруппа: "${group.name}"\nСумма: ${amount} ₽ (4 занятия)\nОплатить до: ${deadline.toLocaleDateString('ru-RU')}\n\nРеквизиты и инструкцию смотри в личном кабинете.`;

    for (const studentId of group.student_ids) {
      try {
        await addDoc(collection(db, "payments"), {
          tutor_id: uid,
          student_id: studentId,
          group_id: group.id,
          group_name: group.name,
          type: "group",
          amount: amount,
          lessons_count: 4,
          lessons_used: 0,
          lessons_remaining: 4,
          tariff: "group_monthly",
          comment: `Абонемент за группу "${group.name}"`,
          deadline: deadline,
          confirmed: false,
          created_at: serverTimestamp(),
        });
        successCount++;
        await sendTelegramNotification(studentId, notificationMsg);
      } catch (e) {
        failCount++;
        console.error(`Ошибка создания счёта для ${studentId}:`, e);
      }
    }

    if (failCount > 0) {
      toast.error(`Создано счетов: ${successCount}, не удалось: ${failCount}`);
    } else {
      toast.success(`✅ Создано счетов: ${successCount}! Уведомления отправлены.`);
    }
  };

  // Сводная статистика по всем группам
  const totalStudents = new Set(groups.flatMap(g => g.student_ids || [])).size;
  const totalMonthlyIncome = groups.reduce((sum, g) => sum + (g.student_ids?.length || 0) * g.price_per_lesson * 4, 0);
  const totalFreeSlots = groups.reduce((sum, g) => sum + Math.max(g.max_students - (g.student_ids?.length || 0), 0), 0);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-purple-950' : 'bg-purple-50'}`}>
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-fuchsia-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative transition-colors duration-500 ${isDark ? 'bg-gradient-to-br from-purple-950 via-fuchsia-950 to-slate-950' : 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-indigo-50'}`}>
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-20 left-10 text-9xl text-fuchsia-400">✦</div>
        <div className="absolute bottom-20 right-10 text-8xl text-purple-400">✧</div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 pt-20 relative z-10">
        {/* Шапка по центру */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl sm:text-4xl font-serif font-bold flex items-center justify-center gap-2 ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>
            <span>👑</span>
            <span className={`bg-gradient-to-r ${isDark ? 'from-purple-300 via-fuchsia-300 to-amber-200' : 'from-purple-700 via-fuchsia-600 to-purple-800'} bg-clip-text text-transparent`}>
              Группы
            </span>
          </h1>
          <p className={`text-sm mt-2 font-serif italic ${isDark ? 'text-purple-300/70' : 'text-purple-600/80'}`}>
            Создавайте группы, добавляйте учеников и отслеживайте доход
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-fuchsia-500/40 transition"
          >
            <UserPlus size={18} /> Создать группу
          </motion.button>
        </div>

        {/* Сводная панель */}
        {groups.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className={`rounded-2xl p-4 bg-gradient-to-br from-purple-600 to-purple-800`}>
              <p className="text-[11px] uppercase tracking-wider text-purple-200 mb-1">Групп</p>
              <p className="text-2xl font-serif font-bold text-white">{groups.length}</p>
            </div>
            <div className={`rounded-2xl p-4 bg-gradient-to-br from-fuchsia-600 to-fuchsia-800`}>
              <p className="text-[11px] uppercase tracking-wider text-fuchsia-100 mb-1">Учеников</p>
              <p className="text-2xl font-serif font-bold text-white">{totalStudents}</p>
            </div>
            <div className={`rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-amber-700`}>
              <p className="text-[11px] uppercase tracking-wider text-amber-100 mb-1">Доход / мес</p>
              <p className="text-2xl font-serif font-bold text-white">{totalMonthlyIncome.toLocaleString()} ₽</p>
            </div>
            <div className={`rounded-2xl p-4 bg-gradient-to-br from-purple-500 to-fuchsia-700`}>
              <p className="text-[11px] uppercase tracking-wider text-purple-100 mb-1">Своб. мест</p>
              <p className="text-2xl font-serif font-bold text-white">{totalFreeSlots}</p>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDark ? 'border-purple-500/30 bg-purple-900/20' : 'border-purple-200 bg-white/60'}`}
          >
            <Users size={56} className={`mx-auto mb-4 ${isDark ? 'text-purple-400/50' : 'text-purple-300'}`} />
            <p className={`text-lg font-serif font-medium ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>У вас пока нет групп</p>
            <p className={`text-sm mt-1 mb-5 ${isDark ? 'text-purple-400/60' : 'text-purple-500'}`}>Нажмите "Создать группу", чтобы начать своё путешествие</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30"
            >
              <UserPlus size={18} /> Создать группу
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group, idx) => {
              const studentCount = group.student_ids?.length || 0;
              const fillPercent = Math.min((studentCount / group.max_students) * 100, 100);
              const monthlyIncome = studentCount * group.price_per_lesson * 4;
              const unpaidCount = payments.filter(p => p.group_id === group.id).length;
              const groupStudents = students.filter(s => group.student_ids?.includes(s.id));
              const visibleAvatars = groupStudents.slice(0, 3);
              const extraCount = Math.max(groupStudents.length - 3, 0);

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => openGroup(group)}
                  className={`group relative rounded-2xl p-5 border backdrop-blur-sm shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer ${isDark ? 'bg-purple-900/40 border-purple-500/30 hover:border-fuchsia-400/50' : 'bg-white/80 border-purple-100 hover:border-fuchsia-300'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${group.subject === 'chemistry' ? (isDark ? 'bg-fuchsia-500/20' : 'bg-fuchsia-50') : (isDark ? 'bg-purple-500/20' : 'bg-purple-50')}`}>
                        {group.subject === 'chemistry' ? '🧪' : '🧬'}
                      </div>
                      <div>
                        <h3 className={`font-serif font-bold text-lg leading-tight ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>{group.name}</h3>
                        <p className={`text-xs font-medium mt-1 ${isDark ? 'text-fuchsia-300/70' : 'text-fuchsia-600'}`}>{group.schedule || "Расписание не указано"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(group)} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-purple-800 text-purple-300' : 'hover:bg-purple-100 text-purple-600'}`} title="Редактировать"><Edit size={16} /></button>
                      <button onClick={() => deleteGroup(group.id)} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`} title="Удалить"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {/* Стек аватарок + заполненность */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex">
                        {visibleAvatars.map((s, i) => (
                          <div
                            key={s.id}
                            className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-[10px] font-bold text-white border-2 ${isDark ? 'border-purple-900' : 'border-white'}`}
                            style={{ marginLeft: i === 0 ? 0 : -8 }}
                            title={s.full_name}
                          >
                            {getInitials(s.full_name)}
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${isDark ? 'bg-purple-800 text-purple-200 border-purple-900' : 'bg-purple-100 text-purple-600 border-white'}`}
                            style={{ marginLeft: -8 }}
                          >
                            +{extraCount}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-bold ${fillPercent >= 100 ? 'text-amber-400' : isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                        {studentCount} / {group.max_students}
                      </span>
                      {unpaidCount > 0 && (
                        <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600 font-bold">
                          {unpaidCount} не оплатили
                        </span>
                      )}
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-purple-950' : 'bg-purple-100'}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${fillPercent >= 100 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-purple-950/50 border-purple-500/20' : 'bg-purple-50/50 border-purple-100'}`}>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400/80 mb-1">Цена / зан.</p>
                      <p className={`text-lg font-serif font-bold ${isDark ? 'text-fuchsia-200' : 'text-purple-800'}`}>{group.price_per_lesson} ₽</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-purple-950/50 border-amber-500/20' : 'bg-amber-50/50 border-amber-100'}`}>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500/80 mb-1 flex items-center gap-1"><span>👑</span> Следующее</p>
                      <p className="text-lg font-serif font-bold text-amber-400">{formatNextLesson(group.schedule)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => generateInvoices(group)}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold text-xs hover:shadow-lg transition"
                      >
                        <Zap size={14} /> Счета (×4)
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => goToFinanceForGroup(group)}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-xl font-bold text-xs hover:shadow-lg transition"
                      >
                        <CreditCard size={14} /> Вручную
                      </motion.button>
                    </div>
                    <ChevronRight size={18} className={`ml-2 ${isDark ? 'text-purple-400/50' : 'text-purple-300'}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-md ${isDark ? 'bg-purple-950/80' : 'bg-purple-900/40'}`} onClick={() => setShowModal(false)} />
            <motion.div
              className={`relative rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border ${isDark ? 'bg-purple-900/95 border-purple-500/30' : 'bg-white/95 border-purple-200'}`}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
            >
              <div className={`p-5 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-xl ${isDark ? 'bg-purple-900/90 border-purple-500/30' : 'bg-white/90 border-purple-100'}`}>
                <h2 className={`text-xl font-serif font-bold flex items-center gap-2 ${isDark ? 'text-fuchsia-200' : 'text-purple-800'}`}>
                  <Sparkles size={18} className="text-amber-400" />
                  {editingGroup ? 'Редактировать группу' : 'Новая группа'}
                </h2>
                <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-purple-800 text-purple-400' : 'hover:bg-purple-100 text-purple-500'}`}><X size={20} /></button>
              </div>

              <form onSubmit={saveGroup} className="p-6 space-y-5">
                <div>
                  <label className={`block text-sm font-bold mb-1.5 font-serif ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Название группы *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Например: ЕГЭ Химия 2024" required className={`w-full border rounded-xl p-3 text-sm font-medium transition focus:ring-2 focus:ring-fuchsia-500/50 outline-none ${isDark ? 'bg-purple-950/50 border-purple-500/30 text-white placeholder-purple-400/50 focus:border-fuchsia-400' : 'bg-purple-50/50 border-purple-200 text-purple-900 placeholder-purple-400 focus:border-fuchsia-500'}`} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-1.5 font-serif ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Предмет</label>
                    <select value={formSubject} onChange={(e) => setFormSubject(e.target.value as any)} className={`w-full border rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-fuchsia-500/50 ${isDark ? 'bg-purple-950/50 border-purple-500/30 text-white focus:border-fuchsia-400' : 'bg-purple-50/50 border-purple-200 text-purple-900 focus:border-fuchsia-500'}`}>
                      <option value="chemistry">🧪 Химия</option>
                      <option value="biology">🧬 Биология</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-1.5 font-serif ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Макс. учеников</label>
                    <input type="number" value={formMaxStudents} onChange={(e) => { const v = e.target.value; setFormMaxStudents(v === "" ? 1 : Math.max(1, parseInt(v) || 1)); }} min={1} max={20} className={`w-full border rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-fuchsia-500/50 ${isDark ? 'bg-purple-950/50 border-purple-500/30 text-white focus:border-fuchsia-400' : 'bg-purple-50/50 border-purple-200 text-purple-900 focus:border-fuchsia-500'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-1.5 font-serif ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Цена за занятие (₽)</label>
                    <input type="number" value={formPrice} onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)} min={0} className={`w-full border rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-fuchsia-500/50 ${isDark ? 'bg-purple-950/50 border-purple-500/30 text-white focus:border-fuchsia-400' : 'bg-purple-50/50 border-purple-200 text-purple-900 focus:border-fuchsia-500'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-1.5 font-serif ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Расписание</label>
                    <input type="text" value={formSchedule} onChange={(e) => setFormSchedule(e.target.value)} placeholder="Пн, Ср 18:00" className={`w-full border rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-fuchsia-500/50 ${isDark ? 'bg-purple-950/50 border-purple-500/30 text-white focus:border-fuchsia-400' : 'bg-purple-50/50 border-purple-200 text-purple-900 focus:border-fuchsia-500'}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-1.5 font-serif ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Участники ({formStudents.length})</label>
                  <div className={`border rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 ${isDark ? 'bg-purple-950/50 border-purple-500/30' : 'bg-purple-50/50 border-purple-200'}`}>
                    {students.map(student => (
                      <label key={student.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${isDark ? 'hover:bg-purple-800/50' : 'hover:bg-white'}`}>
                        <input
                          type="checkbox"
                          checked={formStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormStudents([...formStudents, student.id]);
                            else setFormStudents(formStudents.filter(id => id !== student.id));
                          }}
                          className="w-4 h-4 text-fuchsia-500 rounded border-purple-400 focus:ring-fuchsia-500/50 bg-transparent"
                        />
                        <span className={`text-sm font-medium ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>{student.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: saving ? 1 : 1.02 }}
                    whileTap={{ scale: saving ? 1 : 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-fuchsia-500/30 transition disabled:opacity-60"
                  >
                    {saving ? 'Сохранение...' : editingGroup ? '💾 Сохранить' : '✨ Создать'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-5 py-3 rounded-xl font-bold transition ${isDark ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                  >
                    Отмена
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-purple-950">
        <div className="text-fuchsia-400 font-serif italic animate-pulse text-lg">Загрузка групп...</div>
      </div>
    }>
      <GroupsContent />
    </Suspense>
  );
}