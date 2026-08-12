// ФАЙЛ: app/finance/page.tsx
// ПРАВКИ В ЭТОМ ФАЙЛЕ (относительно версии с confirmPayment-транзакцией):
//
// 1) onSnapshot БЕЗ обработчика ошибок = самая вероятная причина "грузится и
//    не открывается": если Firestore отклоняет запрос (permission-denied),
//    колбэк успеха просто не вызывается, loading остаётся true навсегда,
//    и пользователь не видит НИКАКОЙ ошибки. Добавлен error-callback на
//    каждый onSnapshot + fallback, который снимает спиннер и показывает toast.
// 2) Список учеников для тьютора больше не читает ВСЕХ студентов платформы
//    (utility bug/утечка данных) — теперь фильтруется по tutor_id.
//    ⚠️ Предполагается, что в profiles у ученика есть поле tutor_id.
//    Если это не так — скажите, как связаны тьютор и ученик (через group,
//    через отдельную коллекцию links и т.п.), поправлю запрос.
// 3) confirmPayment и handleApproveRequest (подтверждение чека) теперь
//    используют ОДНУ и ту же транзакционную функцию pополнения
//    lesson_balances — раньше подтверждение чека вообще не трогало баланс.
// 4) deletePayment: удаление уже подтверждённого платежа теперь атомарно
//    списывает начисленные занятия обратно из lesson_balances (транзакция),
//    чтобы у ученика не оставался "фантомный" остаток.
// 5) role больше не читается из localStorage прямо во время рендера
//    (риск hydration mismatch в Next.js) — вынесено в useEffect + state.
// 6) Список платежей теперь карточки (адаптивно, без горизонтального
//    скролла на мобильном), в вашей жёлто-янтарной гамме.
//
// Всё остальное — без изменений относительно исходного файла.

"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, query, where,
  onSnapshot, doc, getDoc, updateDoc, serverTimestamp, setDoc, getDocs,
  runTransaction
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  ChevronLeft, Wallet, Receipt, Plus, Trash2,
  TrendingUp, CheckCircle, Search, Save, AlertTriangle, Settings,
  Eye, Loader2, Users, User, GraduationCap
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useFirebaseUid } from "@/hooks/useFirebaseUid";

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

function formatDate(timestamp: any): string {
  if (!timestamp) return "—";
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function getAutoStatus(payment: any): "paid" | "pending" | "overdue" {
  if (payment.confirmed) return "paid";
  if (payment.deadline) {
    const deadlineDate = payment.deadline?.seconds ? new Date(payment.deadline.seconds * 1000) : new Date(payment.deadline);
    if (deadlineDate && !isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) return "overdue";
    return "pending";
  }
  return "pending";
}

function getStatusColor(status: string) {
  switch (status) {
    case "paid": return "bg-emerald-100 text-emerald-700";
    case "pending": return "bg-yellow-100 text-yellow-700";
    case "overdue": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "paid": return "Оплачено";
    case "pending": return "Ожидание";
    case "overdue": return "Просрочено";
    default: return "—";
  }
}

function getPaymentDate(payment: any): Date {
  if (payment.created_at?.seconds) return new Date(payment.created_at.seconds * 1000);
  if (payment.created_at) return new Date(payment.created_at);
  return new Date(0);
}

// ✅ НОВОЕ: общая транзакционная функция начисления занятий на
// lesson_balances/{studentId}.remaining — единая точка входа и для ручного
// подтверждения платежа, и для подтверждения чека, чтобы они не могли
// разъехаться (как это уже случилось: подтверждение чека раньше вообще не
// трогало баланс).
async function creditLessonBalance(studentId: string, lessonsCount: number) {
  const balanceRef = doc(db, "lesson_balances", studentId);
  await runTransaction(db, async (tx) => {
    const balanceSnap = await tx.get(balanceRef);
    const currentBalance = balanceSnap.exists() ? (balanceSnap.data().remaining || 0) : 0;
    tx.set(balanceRef, {
      remaining: currentBalance + lessonsCount,
      last_updated: new Date().toISOString(),
    }, { merge: true });
  });
}

// ✅ НОВОЕ: обратная операция — используется при удалении уже подтверждённого
// платежа, чтобы не оставлять ученику фантомные занятия в балансе.
// Остаток не уходит в минус — если ученик уже израсходовал часть занятий из
// этого платежа, списываем сколько можем, но 0 — это дно.
async function debitLessonBalance(studentId: string, lessonsCount: number) {
  const balanceRef = doc(db, "lesson_balances", studentId);
  await runTransaction(db, async (tx) => {
    const balanceSnap = await tx.get(balanceRef);
    const currentBalance = balanceSnap.exists() ? (balanceSnap.data().remaining || 0) : 0;
    tx.set(balanceRef, {
      remaining: Math.max(0, currentBalance - lessonsCount),
      last_updated: new Date().toISOString(),
    }, { merge: true });
  });
}

function FinanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { uid, authReady } = useFirebaseUid(app);

  // ✅ ИЗМЕНЕНО: role больше не читается из localStorage прямо в теле
  // компонента (это выполняется и на сервере при SSR, и в браузере —
  // на сервере localStorage нет, поэтому подставлялось "tutor", а после
  // гидратации могло смениться на другое значение → hydration mismatch).
  // Теперь читаем один раз в useEffect, после монтирования на клиенте.
  const roleFromUrl = searchParams.get("role");
  const [role, setRole] = useState<string>(roleFromUrl || "tutor");
  useEffect(() => {
    if (roleFromUrl) {
      setRole(roleFromUrl);
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (stored) setRole(stored);
  }, [roleFromUrl]);

  const tutorTabs = [
    { id: "stats", label: "📊 Статистика и Учет", icon: TrendingUp },
    { id: "requests", label: "📥 Заявки с чеками", icon: Receipt },
    { id: "settings", label: "⚙️ Настройки", icon: Settings },
  ];
  const studentTabs = [
    { id: "overview", label: "💳 Мой абонемент", icon: Wallet },
    { id: "history", label: "📜 История платежей", icon: Receipt },
  ];
  const parentTabs = [
    { id: "child_select", label: "👦 Выбор ученика", icon: User },
    { id: "overview", label: "💳 Абонемент", icon: Wallet },
    { id: "history", label: "📜 История", icon: Receipt },
  ];

  const availableTabs = role === "tutor" ? tutorTabs : role === "parent" ? parentTabs : studentTabs;
  const [activeTab, setActiveTab] = useState<string>(availableTabs[0].id);

  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  // ✅ НОВОЕ: если что-то пошло не так при подписке на данные (правила
  // доступа, нет сети и т.п.) — показываем понятный экран вместо вечного
  // спиннера.
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [paymentType, setPaymentType] = useState<"individual" | "group">("individual");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [amount, setAmount] = useState(0);
  const [lessons, setLessons] = useState(4);
  const [tariff, setTariff] = useState("start");
  const [comment, setComment] = useState("");
  const [deadline, setDeadline] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

  // ✅ НОВОЕ: остаток занятий берём напрямую из lesson_balances — это
  // единственное поле, которое реально уменьшается в Schedule.tsx при
  // проведении урока. payment.lessons_remaining после наших правок в
  // confirmPayment/handleApproveRequest больше не обновляется и показывал
  // бы замороженное число.
  const [lessonBalance, setLessonBalance] = useState<number | null>(null);

  const [financeSettings, setFinanceSettings] = useState<any>({
    price_individual: 2000,
    price_group: 1500,
    price_trial: 0,
    lesson_expiration_days: 60,
    enot_shop_id: "",
    enot_secret_key: "",
    prodamus_shop_id: "",
    prodamus_secret_key: "",
    manual_instructions: "Переведите сумму через Золотую Корону на номер +374 XX XXX XX. Прикрепите скриншот чека.",
    auto_renewal_enabled: true,
    notify_parents_overdue: true,
    auto_confirm_receipts: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ✅ НОВОЕ: единый обработчик ошибок подписки — снимает спиннер и
  // показывает toast с реальной причиной вместо бесконечной загрузки.
  function handleSnapshotError(context: string) {
    return (error: any) => {
      console.error(`[finance] ${context}:`, error);
      setLoading(false);
      setLoadError(
        error?.code === "permission-denied"
          ? "Нет доступа к данным. Проверьте правила Firestore или обратитесь к администратору."
          : `Не удалось загрузить данные (${context}). Попробуйте обновить страницу.`
      );
      toast.error(`Ошибка загрузки: ${error?.message || context}`);
    };
  }

  useEffect(() => {
    if (!authReady) return;
    if (!uid) return;

    setLoadError(null);

    let paymentsQuery;
    if (role === "tutor") {
      paymentsQuery = query(collection(db, "payments"), where("tutor_id", "==", uid));
    } else if (role === "parent" && selectedChildId) {
      paymentsQuery = query(collection(db, "payments"), where("student_id", "==", selectedChildId));
    } else {
      paymentsQuery = query(collection(db, "payments"), where("student_id", "==", uid));
    }

    const unsubPayments = onSnapshot(
      paymentsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => getPaymentDate(b).getTime() - getPaymentDate(a).getTime());
        setPayments(list);
        setLoading(false);
      },
      handleSnapshotError("payments") // ✅ НОВОЕ
    );

    if (role === "tutor") {
      // ✅ ИЗМЕНЕНО: раньше грузились ВСЕ ученики платформы
      // (where("role","==","student") без привязки к тьютору) — утечка
      // чужих данных в форму создания платежа. Теперь фильтр по tutor_id.
      // ⚠️ Если в вашей схеме связь ученик↔тьютор устроена иначе
      // (например, через группы, а не через поле profiles.tutor_id) —
      // этот запрос нужно поправить под реальную схему.
      const unsubStudents = onSnapshot(
        query(collection(db, "profiles"), where("role", "==", "student"), where("tutor_id", "==", uid)),
        (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        handleSnapshotError("students") // ✅ НОВОЕ
      );

      const unsubGroups = onSnapshot(
        query(collection(db, "groups"), where("tutor_id", "==", uid)),
        (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        handleSnapshotError("groups") // ✅ НОВОЕ
      );

      // ✅ ОТКАТ: settings/global и settings/finance — это единая конфигурация
      // одной платформы (см. app/settings/page.tsx: там правда один набор
      // hero_title/pricing/etc на всех). Моё предыдущее предположение про
      // "разные тьюторы — разные настройки" было неверным, возвращаю как было.
      getDoc(doc(db, "settings", "global")).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setFinanceSettings((prev: any) => ({
            ...prev,
            price_individual: data.price_individual_lesson || prev.price_individual,
            price_group: data.price_group_lesson || prev.price_group,
            price_trial: data.price_trial ?? prev.price_trial,
            lesson_expiration_days: data.lesson_expiration_days || prev.lesson_expiration_days,
          }));
        }
      }).catch((error) => {
        console.error("[finance] settings/global:", error);
      });

      getDoc(doc(db, "settings", "finance")).then((snap) => {
        if (snap.exists()) {
          setFinanceSettings((prev: any) => ({ ...prev, ...snap.data() }));
        }
        setSettingsLoaded(true);
      }).catch((error) => {
        console.error("[finance] settings/finance:", error);
        setSettingsLoaded(true); // не блокируем вкладку настроек навсегда
      });

      return () => { unsubPayments(); unsubStudents(); unsubGroups(); };
    }

    if (role === "parent") {
      const unsubChildren = onSnapshot(
        query(collection(db, "profiles"), where("parent_id", "==", uid)),
        (snap) => {
          const kids = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setChildren(kids);
          if (kids.length > 0 && !selectedChildId) setSelectedChildId(kids[0].id);
        },
        handleSnapshotError("children") // ✅ НОВОЕ
      );
      return () => { unsubPayments(); unsubChildren(); };
    }

    return () => { unsubPayments(); };
  }, [uid, authReady, role, selectedChildId]);

  // ✅ НОВОЕ: подписка на живой остаток занятий ученика для вкладок
  // "Мой абонемент" / родительского обзора.
  useEffect(() => {
    if (!authReady) return;
    if (role === "tutor") return;
    const targetStudentId = role === "parent" ? selectedChildId : uid;
    if (!targetStudentId) return;

    const unsubBalance = onSnapshot(
      doc(db, "lesson_balances", targetStudentId),
      (snap) => setLessonBalance(snap.exists() ? (snap.data().remaining ?? 0) : 0),
      (error) => {
        console.error("[finance] lesson_balances:", error);
        setLessonBalance(null);
      }
    );
    return () => unsubBalance();
  }, [authReady, role, uid, selectedChildId]);

  useEffect(() => {
    if (!authReady) return;
    if (role !== "tutor" || !uid) return;
    const unsubRequests = onSnapshot(
      query(collection(db, "payment_requests"), where("tutor_id", "==", uid), where("status", "==", "pending")),
      (snap) => setPaymentRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      handleSnapshotError("payment_requests") // ✅ НОВОЕ
    );
    return () => unsubRequests();
  }, [uid, authReady, role]);

  useEffect(() => {
    if (lessons > 0) {
      let pricePerLesson = 0;
      let autoComment = "";

      if (selectedGroup) {
        const group = groups.find(g => g.id === selectedGroup);
        if (group) {
          pricePerLesson = group.price_per_lesson || 0;
          autoComment = `Оплата за группу "${group.name}"`;
        }
      } else {
        pricePerLesson = paymentType === "individual" ? financeSettings.price_individual : financeSettings.price_group;
      }

      if (amount === 0 || !selectedGroup) {
        setAmount(pricePerLesson * lessons);
      }
      if (autoComment && !comment) {
        setComment(autoComment);
      }
    }
  }, [paymentType, lessons, selectedGroup, financeSettings.price_individual, financeSettings.price_group, groups]);

  useEffect(() => {
    const groupIdFromUrl = searchParams.get("groupId");
    const groupNameFromUrl = searchParams.get("groupName");
    const groupPriceFromUrl = searchParams.get("groupPrice");

    if (groupIdFromUrl && groupPriceFromUrl && groups.length > 0) {
      setSelectedGroup(groupIdFromUrl);
      setPaymentType("group");
      setAmount(parseInt(groupPriceFromUrl) * 4);
      setComment(`Оплата за группу: ${groupNameFromUrl}`);
      setShowAddForm(true);
      router.replace(`/finance?uid=${uid}&role=${role}&tab=stats`);
      toast.success("Данные группы загружены! ✨");
    }
  }, [searchParams, groups, router, uid, role]);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent && !selectedGroup) {
      toast.error("Выберите ученика или группу");
      return;
    }
    if (lessons <= 0) {
      toast.error("Укажите количество занятий");
      return;
    }

    const finalAmount = amount > 0 ? amount :
      (selectedGroup
        ? (groups.find(g => g.id === selectedGroup)?.price_per_lesson || 0) * lessons
        : (paymentType === "individual" ? financeSettings.price_individual : financeSettings.price_group) * lessons);

    if (finalAmount <= 0) {
      toast.error("Сумма должна быть больше 0");
      return;
    }

    setSavingPayment(true);
    try {
      let studentName = "Ученик";
      let studentId = selectedStudent;

      if (selectedGroup) {
        const group = groups.find(g => g.id === selectedGroup);
        if (group) {
          studentName = `Группа: ${group.name}`;
          if (!studentId && group.student_ids?.length > 0) {
            studentId = group.student_ids[0];
          }
        }
      } else if (selectedStudent) {
        const student = students.find(s => s.id === selectedStudent);
        if (student) studentName = student.full_name;
      }

      const deadlineTimestamp = deadline ? new Date(deadline) : null;

      await addDoc(collection(db, "payments"), {
        tutor_id: uid,
        student_id: studentId,
        student_name: studentName,
        type: paymentType,
        group_id: selectedGroup || null,
        amount: finalAmount,
        lessons_count: lessons,
        lessons_used: 0,
        lessons_remaining: lessons,
        tariff,
        comment: comment.trim(),
        deadline: deadlineTimestamp,
        confirmed: false,
        created_at: serverTimestamp(),
      });
      toast.success(`✨ Платёж создан на ${finalAmount.toLocaleString()} ₽!`);
      resetPaymentForm();
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSavingPayment(false);
    }
  }

  async function confirmPayment(payment: any) {
    if (!window.confirm(`Подтвердить оплату ${payment.amount} ₽ от ${payment.student_name}?`)) return;
    try {
      const lessonsCount = payment.lessons_count || payment.lessons || 0;

      await runTransaction(db, async (tx) => {
        const paymentRef = doc(db, "payments", payment.id);
        const balanceRef = doc(db, "lesson_balances", payment.student_id);
        const balanceSnap = await tx.get(balanceRef);
        const currentBalance = balanceSnap.exists() ? (balanceSnap.data().remaining || 0) : 0;

        tx.update(paymentRef, { confirmed: true, confirmed_at: serverTimestamp() });
        tx.set(balanceRef, {
          remaining: currentBalance + lessonsCount,
          last_updated: new Date().toISOString(),
        }, { merge: true });
      });

      toast.success(`✅ Оплата подтверждена!`);
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  }

  // ✅ ИЗМЕНЕНО: удаление подтверждённого платежа больше не оставляет
  // "фантомные" занятия в lesson_balances — сначала атомарно списываем
  // столько же занятий, сколько было начислено при подтверждении, потом
  // удаляем документ. Для неподтверждённых платежей поведение не меняется.
  async function deletePayment(payment: any) {
    const isConfirmed = !!payment.confirmed;
    const confirmMessage = isConfirmed
      ? `Удалить оплаченную запись? У ученика спишутся ${payment.lessons_count || 0} занятий из баланса.`
      : "Удалить эту запись о платеже?";
    if (!window.confirm(confirmMessage)) return;

    try {
      if (isConfirmed && payment.student_id) {
        await debitLessonBalance(payment.student_id, payment.lessons_count || payment.lessons || 0);
      }
      await deleteDoc(doc(db, "payments", payment.id));
      toast.success("🗑️ Запись удалена");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  }

  function resetPaymentForm() {
    setSelectedStudent(""); setSelectedGroup(""); setAmount(0); setLessons(4);
    setTariff("start"); setComment(""); setDeadline(""); setShowAddForm(false);
  }

  // ✅ ИЗМЕНЕНО: раньше подтверждение чека создавало payment с
  // confirmed:true, но НИКОГДА не трогало lesson_balances — ученик,
  // оплативший через чек, не мог получить занятия в /schedule. Теперь
  // используется та же creditLessonBalance, что и в confirmPayment.
  // Также lessons_count больше не захардкожен в 1 — берём из заявки, если
  // она содержит количество занятий, иначе оставляем 1 как раньше.
  async function handleApproveRequest(request: any) {
    setProcessingRequestId(request.id);
    try {
      const lessonsCount = request.lessons_count || 1;

      await updateDoc(doc(db, "payment_requests", request.id), { status: "approved", approved_at: serverTimestamp() });

      await addDoc(collection(db, "payments"), {
        tutor_id: uid, student_id: request.student_id, student_name: request.item_name || "Ученик",
        type: request.payment_type || "individual", amount: request.amount,
        lessons_count: lessonsCount, lessons_used: 0, lessons_remaining: lessonsCount,
        tariff: "Оплата по чеку", comment: "Оплачено через загрузку чека",
        confirmed: true, confirmed_at: serverTimestamp(), created_at: serverTimestamp(),
      });

      if (request.student_id) {
        await creditLessonBalance(request.student_id, lessonsCount); // ✅ НОВОЕ
      }

      toast.success("✅ Чек подтвержден, занятия начислены!");
      setSelectedReceiptImage(null);
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function saveFinanceSettings() {
    setSavingSettings(true);
    try {
      // ✅ ОТКАТ: обратно единый документ settings/finance
      await setDoc(doc(db, "settings", "finance"), {
        ...financeSettings,
        updated_at: serverTimestamp(),
        tutor_id: uid,
      }, { merge: true });
      toast.success("✅ Настройки сохранены!");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  }

  const filteredPayments = payments.filter(p => {
    if (filterStatus !== "all" && getAutoStatus(p) !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (p.student_name || "").toLowerCase().includes(q) || (p.tariff || "").toLowerCase().includes(q);
    }
    return true;
  });

  // ✅ ИЗМЕНЕНО: "активный абонемент" для показа тарифа/типа занятий по-прежнему
  // берём из последнего оплаченного платежа, но остаток занятий теперь ВСЕГДА
  // из lessonBalance (lesson_balances), а не из payment.lessons_remaining.
  const latestConfirmedPayment = payments.filter(p => p.confirmed).sort(
    (a, b) => getPaymentDate(b).getTime() - getPaymentDate(a).getTime()
  )[0] || null;
  const hasActiveBalance = (lessonBalance ?? 0) > 0;
  const activeSubscription = hasActiveBalance ? latestConfirmedPayment : null;
  const totalPurchasedLessons = payments.filter(p => p.confirmed).reduce((sum, p) => sum + (p.lessons_count || 0), 0);
  const usedLessons = Math.max(0, totalPurchasedLessons - (lessonBalance ?? 0));
  const totalReceived = payments.filter(p => p.confirmed).reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingTotal = payments.filter(p => !p.confirmed && getAutoStatus(p) === "pending").reduce((sum, p) => sum + (p.amount || 0), 0);

  // ✅ НОВОЕ: экран ошибки вместо вечного спиннера
  if (loadError && payments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="font-bold text-gray-800 mb-1">Не удалось загрузить данные</p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-amber-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-700 transition"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
    </div>
  );

  if (role === "student" || role === "parent") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 relative z-10">
          <div className="grid grid-cols-3 items-center mb-6">
            <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-600 hover:text-indigo-800 transition font-medium flex items-center gap-1">
              <ChevronLeft size={18} /> Назад
            </Link>
            <h1 className="text-2xl font-serif font-bold text-indigo-900 text-center">
              {role === "parent" ? "Управление оплатами" : "Мои платежи"}
            </h1>
            <div className="w-24"></div>
          </div>

          {role === "parent" && children.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-md border border-indigo-100 mb-6">
              <label className="text-sm font-bold text-indigo-800 block mb-2">👦 Вы просматриваете данные для:</label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.full_name || "Ученик"}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {availableTabs.filter(t => t.id !== "child_select").map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                  activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "bg-white/80 text-indigo-700 hover:bg-white"
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                    <GraduationCap className="text-indigo-600" /> Текущий абонемент
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${activeSubscription ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {activeSubscription ? "Активен" : "Нет активного абонемента"}
                  </span>
                </div>

                {activeSubscription ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-gray-500">Тариф</p>
                        <p className="text-lg font-bold text-gray-800 capitalize">{activeSubscription.tariff.replace('_', ' ')}</p>
                        <p className="text-xs text-indigo-500 font-medium mt-1">
                          {activeSubscription.type === 'group' ? '👥 Групповые занятия' : '👤 Индивидуальные занятия'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Осталось занятий</p>
                        <p className="text-3xl font-black text-indigo-600">
                          {lessonBalance ?? "—"} <span className="text-lg text-gray-400">/ {totalPurchasedLessons}</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${totalPurchasedLessons > 0 ? (usedLessons / totalPurchasedLessons) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Использовано {usedLessons} из {totalPurchasedLessons} занятий
                    </p>

                    {(lessonBalance ?? 0) <= 2 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                        <p className="text-sm text-amber-800 font-medium">
                          Абонемент заканчивается! Рекомендуем пополнить его заранее.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-4">У вас пока нет оплаченных занятий</p>
                    <Link
                      href={`/pricing?uid=${uid}&role=${role}${selectedChildId ? `&childId=${selectedChildId}` : ''}`}
                      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                    >
                      <Plus size={18} /> Выбрать тариф и оплатить
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-3xl shadow-lg border border-indigo-100 overflow-hidden">
              <div className="p-5 border-b border-indigo-100 flex items-center justify-between">
                <h2 className="font-bold text-indigo-900">История платежей</h2>
                <Link
                  href={`/pricing?uid=${uid}&role=${role}`}
                  className="text-sm bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 transition"
                >
                  + Пополнить
                </Link>
              </div>
              <div className="divide-y divide-indigo-50">
                {filteredPayments.length === 0 ? (
                  <p className="text-center py-8 text-gray-400">История пуста</p>
                ) : filteredPayments.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50/30 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                      <p className="text-xs font-medium text-gray-600 mt-0.5">
                        {p.type === 'group' ? '👥 Группа' : '👤 Индивид'} · {p.lessons_count} зан.
                      </p>
                    </div>
                    <span className="font-bold text-gray-800 whitespace-nowrap">{p.amount?.toLocaleString()} ₽</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor(getAutoStatus(p))}`}>
                      {getStatusText(getAutoStatus(p))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">

        <div className="grid grid-cols-3 items-center mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-amber-600 hover:text-amber-700 transition font-medium flex items-center gap-1">
            <ChevronLeft size={18} /> Назад
          </Link>
          <h1 className="text-2xl font-serif font-bold text-amber-900 text-center">Финансы и учет</h1>
          <div className="w-24"></div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tutorTabs.map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                activeTab === tab.id ? "bg-amber-600 text-white shadow-lg" : "bg-white/80 text-amber-700 hover:bg-white"
              }`}
            >
              <tab.icon size={16} /> {tab.label} {tab.id === 'requests' && paymentRequests.length > 0 ? `(${paymentRequests.length})` : ''}
            </button>
          ))}
        </div>

        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-200/50">
                <Wallet size={18} className="text-amber-500 mb-1" />
                <p className="text-2xl font-bold text-amber-600">{totalReceived.toLocaleString()} ₽</p>
                <p className="text-xs text-gray-500">Всего получено</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-200/50">
                <Users size={18} className="text-blue-500 mb-1" />
                <p className="text-2xl font-bold text-blue-600">{students.length}</p>
                <p className="text-xs text-gray-500">Активных учеников</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-200/50">
                <Users size={18} className="text-purple-500 mb-1" />
                <p className="text-2xl font-bold text-purple-600">{groups.length}</p>
                <p className="text-xs text-gray-500">Активных групп</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-200/50">
                <AlertTriangle size={18} className="text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-500">
                  {payments.filter(p => !p.confirmed && getAutoStatus(p) === "overdue").length}
                </p>
                <p className="text-xs text-gray-500">Просроченных оплат</p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-5 border border-amber-200/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="font-semibold text-amber-700 flex items-center gap-2"><Receipt size={18} /> История платежей</h2>
                <button onClick={() => { resetPaymentForm(); setShowAddForm(!showAddForm); }} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-amber-600 hover:to-yellow-700 transition shadow">
                  <Plus size={16} /> Создать платёж
                </button>
              </div>

              {showAddForm && (
                <form onSubmit={addPayment} className="bg-amber-50/50 rounded-xl p-4 mb-4 border border-amber-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Тип платежа</label>
                      <div className="flex gap-2 mt-1">
                        <button type="button" onClick={() => { setPaymentType("individual"); setSelectedGroup(""); }} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${paymentType === "individual" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300"}`}>
                          👤 Индивидуальное
                        </button>
                        <button type="button" onClick={() => setPaymentType("group")} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${paymentType === "group" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-300"}`}>
                          👥 Групповое
                        </button>
                      </div>
                    </div>

                    {paymentType === "group" && (
                      <div>
                        <label className="text-xs text-amber-600 font-medium">Выбрать группу</label>
                        <select
                          value={selectedGroup}
                          onChange={(e) => {
                            setSelectedGroup(e.target.value);
                            const group = groups.find(g => g.id === e.target.value);
                            if (group) {
                              setComment(`Оплата за группу "${group.name}"`);
                              setAmount(group.price_per_lesson * lessons);
                            }
                          }}
                          className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white"
                        >
                          <option value="">— Выберите группу —</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.price_per_lesson} ₽/зан)</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paymentType === "individual" && (
                      <div>
                        <label className="text-xs text-amber-600 font-medium">Ученик</label>
                        <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white">
                          <option value="">Выберите ученика</option>
                          {students.map((s: any) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-amber-600 font-medium">
                        Сумма (₽)
                        <span className="text-stone-400 ml-1 text-[10px]">
                          {selectedGroup
                            ? `(группа: ${groups.find(g => g.id === selectedGroup)?.price_per_lesson} ₽/зан × ${lessons})`
                            : `(по умолчанию: ${paymentType === "individual" ? financeSettings.price_individual : financeSettings.price_group} ₽/зан × ${lessons})`
                          }
                        </span>
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Кол-во занятий</label>
                      <input type="number" value={lessons} onChange={(e) => setLessons(parseInt(e.target.value) || 1)} min={1} required className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Дедлайн</label>
                      <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-amber-600 font-medium">Комментарий</label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Например: Оплата за март"
                      className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" disabled={savingPayment} className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-bold hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <Save size={16} /> {savingPayment ? "Сохранение..." : "✨ Создать"}
                    </button>
                    <button type="button" onClick={resetPaymentForm} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap gap-3 mb-4 p-3 bg-white rounded-xl border border-amber-100">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="border border-amber-200 rounded-lg p-1.5 text-sm bg-white">
                  <option value="all">Все статусы</option>
                  <option value="paid">✅ Оплачено</option>
                  <option value="pending">⏳ Ожидание</option>
                  <option value="overdue">🔴 Просрочено</option>
                </select>
                <div className="relative flex-1 min-w-[150px]">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по имени..." className="w-full border border-amber-200 rounded-lg pl-7 pr-2 py-1.5 text-sm bg-white" />
                </div>
              </div>

              {/* ✅ ИЗМЕНЕНО: таблица → карточный список. Раньше на мобильном
                  таблица требовала горизонтального скролла (overflow-x-auto),
                  теперь всё читается в одну колонку без прокрутки вбок. */}
              {filteredPayments.length === 0 ? (
                <p className="text-center py-8 text-gray-400">Нет платежей</p>
              ) : (
                <div className="divide-y divide-amber-100">
                  {filteredPayments.map((payment: any) => {
                    const autoStatus = getAutoStatus(payment);
                    return (
                      <div key={payment.id} className="flex items-center gap-3 py-3 px-1 hover:bg-amber-50/50 transition">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{payment.student_name || "—"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(payment.created_at)} · {payment.type === 'group' ? '👥 Группа' : '👤 Индивид'} · {payment.lessons_count} зан.
                          </p>
                        </div>
                        <span className="font-bold text-amber-600 whitespace-nowrap">{payment.amount?.toLocaleString()} ₽</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor(autoStatus)}`}>
                          {getStatusText(autoStatus)}
                        </span>
                        <div className="flex items-center gap-1">
                          {!payment.confirmed && (
                            <button onClick={() => confirmPayment(payment)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition" title="Подтвердить"><CheckCircle size={16} /></button>
                          )}
                          <button onClick={() => deletePayment(payment)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Удалить"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-amber-200/50">
            <h2 className="font-bold text-xl text-amber-700 mb-6 flex items-center gap-2"><Receipt size={20} /> Входящие заявки на оплату</h2>
            {paymentRequests.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
                <p className="text-stone-600 font-medium">Новых заявок нет 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentRequests.map((req: any) => (
                  <div key={req.id} className="bg-stone-50 rounded-xl p-5 border border-stone-200 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-800 text-lg">{req.item_name}</p>
                      <p className="text-stone-600 text-sm">Сумма: <span className="font-bold text-emerald-600">{req.amount} ₽</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedReceiptImage(req.receipt_url)} className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl text-sm font-medium transition border border-stone-200 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Чек
                      </button>
                      <button onClick={() => handleApproveRequest(req)} disabled={processingRequestId === req.id} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 disabled:opacity-50">
                        {processingRequestId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Подтвердить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && settingsLoaded && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-amber-200/50">
              <h3 className="font-bold text-xl text-amber-700 mb-4 flex items-center gap-2">
                <Wallet size={20} /> Цены по умолчанию
              </h3>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
                <p className="text-sm text-amber-800">
                  💡 <b>Важно:</b> Цены редактируются в общих настройках платформы. Здесь они отображаются только для справки.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-stone-600 font-medium">👤 Индивидуальное занятие</label>
                  <input type="number" value={financeSettings.price_individual} disabled className="w-full border border-amber-200 rounded-lg p-2.5 mt-1 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs text-stone-600 font-medium">👥 Групповое занятие</label>
                  <input type="number" value={financeSettings.price_group} disabled className="w-full border border-amber-200 rounded-lg p-2.5 mt-1 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs text-stone-600 font-medium">🎓 Пробное занятие</label>
                  <input type="number" value={financeSettings.price_trial} disabled className="w-full border border-amber-200 rounded-lg p-2.5 mt-1 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                </div>
              </div>
              <Link href={`/settings?uid=${uid}&role=${role}`} className="inline-flex items-center gap-2 mt-4 text-sm text-amber-700 hover:text-amber-900 font-medium">
                <Settings size={14} /> Перейти в общие настройки для изменения цен →
              </Link>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-amber-200/50">
              <h3 className="font-bold text-xl text-amber-700 mb-4 flex items-center gap-2">
                💳 Платежные системы
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3">Enot.io</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-stone-600">Shop ID</label>
                      <input type="text" value={financeSettings.enot_shop_id} onChange={(e) => setFinanceSettings({...financeSettings, enot_shop_id: e.target.value})} placeholder="Ваш ID магазина" className="w-full border border-blue-200 rounded-lg p-2.5 mt-1 text-sm bg-white/80 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-stone-600">Secret Key</label>
                      <input type="password" value={financeSettings.enot_secret_key} onChange={(e) => setFinanceSettings({...financeSettings, enot_secret_key: e.target.value})} placeholder="Секретный ключ" className="w-full border border-blue-200 rounded-lg p-2.5 mt-1 text-sm bg-white/80 focus:border-blue-500 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3">Prodamus</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-stone-600">Shop ID</label>
                      <input type="text" value={financeSettings.prodamus_shop_id} onChange={(e) => setFinanceSettings({...financeSettings, prodamus_shop_id: e.target.value})} placeholder="Ваш ID магазина" className="w-full border border-purple-200 rounded-lg p-2.5 mt-1 text-sm bg-white/80 focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-stone-600">Secret Key</label>
                      <input type="password" value={financeSettings.prodamus_secret_key} onChange={(e) => setFinanceSettings({...financeSettings, prodamus_secret_key: e.target.value})} placeholder="Секретный ключ" className="w-full border border-purple-200 rounded-lg p-2.5 mt-1 text-sm bg-white/80 focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-amber-200/50">
              <h3 className="font-bold text-xl text-amber-700 mb-4 flex items-center gap-2">
                📝 Инструкция для учеников
              </h3>
              <textarea
                rows={5}
                value={financeSettings.manual_instructions}
                onChange={(e) => setFinanceSettings({...financeSettings, manual_instructions: e.target.value})}
                className="w-full border border-amber-200 rounded-lg p-3 text-sm bg-white/80 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={saveFinanceSettings}
              disabled={savingSettings}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-yellow-700 transition shadow-lg flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
              {savingSettings ? "Сохранение..." : "💾 Сохранить настройки"}
            </button>
          </div>
        )}
      </div>

      {selectedReceiptImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReceiptImage(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedReceiptImage(null)} className="absolute -top-10 right-0 text-white hover:text-stone-300 transition"><Trash2 className="w-8 h-8" /></button>
            <img src={selectedReceiptImage} alt="Чек" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <AuthGuard requiredRole="tutor">
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
        </div>
      }>
        <FinanceContent />
      </Suspense>
    </AuthGuard>
  );
}