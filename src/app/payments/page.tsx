"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, deleteDoc, query, where, 
  onSnapshot, doc, getDoc, updateDoc, setDoc, serverTimestamp 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import toast from "react-hot-toast";
import { 
  ChevronLeft, Wallet, Calendar, BookOpen, Receipt, Plus, Trash2, 
  Sparkles, Crown, TrendingUp, Shield, Download, Filter, AlertCircle, 
  CheckCircle, Clock, Edit2, Search, X, Save, Check, AlertTriangle,
  Settings, Upload, Eye, Loader2, ExternalLink, CreditCard
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
const storage = getStorage(app);
const auth = getAuth(app);

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatDate(timestamp: any): string {
  if (!timestamp) return "—";
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function formatFullDate(timestamp: any): string {
  if (!timestamp) return "—";
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function getAutoStatus(payment: any): "paid" | "pending" | "overdue" {
  if (payment.confirmed) return "paid";
  if (payment.deadline) {
    const deadlineDate = payment.deadline?.seconds ? new Date(payment.deadline.seconds * 1000) : new Date(payment.deadline);
    if (deadlineDate < new Date()) return "overdue";
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

function getStatusIcon(status: string) {
  switch (status) {
    case "paid": return <CheckCircle size={12} className="inline mr-1" />;
    case "pending": return <Clock size={12} className="inline mr-1" />;
    case "overdue": return <AlertTriangle size={12} className="inline mr-1" />;
    default: return null;
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

function escapeCSV(value: any): string {
  const str = String(value || "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// --- ОСНОВНОЙ КОМПОНЕНТ ---
function FinanceContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  const role = searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "tutor";
  
  const [activeTab, setActiveTab] = useState<"stats" | "requests" | "settings">("stats");

  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<"all" | "week" | "month" | "year">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedStudent, setSelectedStudent] = useState("");
  const [amount, setAmount] = useState(0);
  const [lessons, setLessons] = useState(4);
  const [tariff, setTariff] = useState("Старт");
  const [comment, setComment] = useState("");
  const [deadline, setDeadline] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [primaryProvider, setPrimaryProvider] = useState<"enot" | "prodamus" | "manual">("manual");
  
  // ЗАМЕНЕНО: Lava на Enot
  const [enotShopId, setEnotShopId] = useState("");
  const [enotSecretKey, setEnotSecretKey] = useState("");
  const [enotSuccessUrl, setEnotSuccessUrl] = useState("");
  const [enotFailUrl, setEnotFailUrl] = useState("");
  
  const [prodamusShopId, setProdamusShopId] = useState("");
  const [prodamusSecretKey, setProdamusSecretKey] = useState("");
  const [prodamusSuccessUrl, setProdamusSuccessUrl] = useState("");
  const [prodamusFailUrl, setProdamusFailUrl] = useState("");
  const [manualPaymentInstructions, setManualPaymentInstructions] = useState("Переведите сумму через Золотую Корону на номер +374 XX XXX XX. Прикрепите скриншот чека.");
  const [savingSettings, setSavingSettings] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubPayments = onSnapshot(query(collection(db, "payments"), where("tutor_id", "==", uid)), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => getPaymentDate(b).getTime() - getPaymentDate(a).getTime());
      setPayments(list);
      setLoadingLedger(false);
    });
    const unsubStudents = onSnapshot(query(collection(db, "profiles"), where("role", "==", "student")), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubPayments(); unsubStudents(); };
  }, [uid]);

  useEffect(() => {
    if (!uid || role !== "tutor") return;
    const unsubRequests = onSnapshot(query(collection(db, "payment_requests"), where("tutor_id", "==", uid), where("status", "==", "pending")), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPaymentRequests(list);
      setLoadingRequests(false);
    });
    return () => unsubRequests();
  }, [uid, role]);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "settings", "payments")).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPaymentEnabled(d.enabled || false);
        setPrimaryProvider(d.primary_provider || "manual");
        // ЗАМЕНЕНО: Lava на Enot
        setEnotShopId(d.enot_shop_id || "");
        setEnotSecretKey(d.enot_secret_key || "");
        setEnotSuccessUrl(d.enot_success_url || "");
        setEnotFailUrl(d.enot_fail_url || "");
        
        setProdamusShopId(d.prodamus_shop_id || "");
        setProdamusSecretKey(d.prodamus_secret_key || "");
        setProdamusSuccessUrl(d.prodamus_success_url || "");
        setProdamusFailUrl(d.prodamus_fail_url || "");
        setManualPaymentInstructions(d.manual_instructions || "Переведите сумму через Золотую Корону...");
      }
    });
  }, [uid]);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || amount <= 0 || lessons <= 0) {
      toast.error("Заполните все обязательные поля корректно");
      return;
    }
    setSavingPayment(true);
    try {
      const student = students.find(s => s.id === selectedStudent);
      const deadlineTimestamp = deadline ? new Date(deadline) : null;
      
      if (editingPayment) {
        await updateDoc(doc(db, "payments", editingPayment.id), {
          student_id: selectedStudent, student_name: student?.full_name || "Ученик",
          amount, lessons, tariff, comment: comment.trim(), deadline: deadlineTimestamp, updated_at: serverTimestamp(),
        });
        toast.success("✨ Платёж обновлён!");
        setEditingPayment(null);
      } else {
        await addDoc(collection(db, "payments"), {
          tutor_id: uid, student_id: selectedStudent, student_name: student?.full_name || "Ученик",
          amount, lessons, tariff, comment: comment.trim(), deadline: deadlineTimestamp,
          confirmed: false, created_at: serverTimestamp(),
        });
        toast.success(`✨ Платёж создан! Ожидает оплаты от ${student?.full_name}`);
      }
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
      await updateDoc(doc(db, "payments", payment.id), { confirmed: true, confirmed_at: serverTimestamp() });
      if (payment.student_id) {
        const studentSnap = await getDoc(doc(db, "profiles", payment.student_id));
        if (studentSnap.exists()) {
          const currentPaid = studentSnap.data().paid_lessons || 0;
          await updateDoc(doc(db, "profiles", payment.student_id), { paid_lessons: currentPaid + (payment.lessons || 0) });
        }
      }
      toast.success(`✅ Оплата подтверждена! +${payment.lessons} занятий`);
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  }

  async function deletePayment(payment: any) {
    if (!window.confirm(`Удалить платёж на ${payment.amount} ₽?`)) return;
    try {
      if (payment.student_id && payment.confirmed) {
        const studentSnap = await getDoc(doc(db, "profiles", payment.student_id));
        if (studentSnap.exists()) {
          const currentPaid = studentSnap.data().paid_lessons || 0;
          await updateDoc(doc(db, "profiles", payment.student_id), { paid_lessons: Math.max(0, currentPaid - (payment.lessons || 0)) });
        }
      }
      await deleteDoc(doc(db, "payments", payment.id));
      toast.success("🗑️ Платёж удалён");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  }

  function resetPaymentForm() {
    setEditingPayment(null); setSelectedStudent(""); setAmount(0); setLessons(4);
    setTariff("Старт"); setComment(""); setDeadline(""); setShowAddForm(false);
  }

  async function payWithProvider(payment: any) {
    setPaymentLoading(payment.id);
    try {
      const orderId = `payment_${payment.id}_${Date.now()}`;
      // ЗАМЕНЕНО: lava на enot
      const endpoint = primaryProvider === "enot" ? "/api/payments/enot/create" : "/api/payments/prodamus/create";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payment.amount,
          orderId,
          description: `Оплата занятий: ${payment.student_name}`,
          studentId: payment.student_id,
          tutorId: uid,
          payment_type: "lesson_pack",
          item_id: "manual_payment",
          duration_days: 30
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      // ЗАМЕНЕНО: lava на enot
      toast.success(`Перенаправляем на ${primaryProvider === "enot" ? "Enot.io" : "Prodamus"}...`);
      window.open(data.url, "_blank");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setPaymentLoading(null);
    }
  }

  async function handleApproveRequest(request: any) {
    setProcessingRequestId(request.id);
    try {
      await updateDoc(doc(db, "payment_requests", request.id), { status: "approved", approved_at: serverTimestamp() });

      await addDoc(collection(db, "payments"), {
        tutor_id: uid,
        student_id: request.student_id,
        student_name: request.item_name || "Ученик",
        amount: request.amount,
        lessons: 1,
        tariff: "Оплата по чеку",
        comment: "Оплачено через загрузку чека",
        confirmed: true,
        confirmed_at: serverTimestamp(),
        created_at: serverTimestamp(),
      });

      if (request.student_id) {
        const studentSnap = await getDoc(doc(db, "profiles", request.student_id));
        if (studentSnap.exists()) {
          const currentPaid = studentSnap.data().paid_lessons || 0;
          await updateDoc(doc(db, "profiles", request.student_id), { paid_lessons: currentPaid + 1 });
        }
      }

      toast.success("✅ Чек подтвержден, занятия начислены!");
      setSelectedReceiptImage(null);
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectRequest(requestId: string) {
    if (!confirm("Отклонить эту заявку?")) return;
    setProcessingRequestId(requestId);
    try {
      await updateDoc(doc(db, "payment_requests", requestId), { status: "rejected", rejected_at: serverTimestamp() });
      toast.success("Заявка отклонена");
      setSelectedReceiptImage(null);
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handlePaymentSubmit() {
    if (!paymentFile) { toast.error("Прикрепите скриншот чека"); return; }
    const user = auth.currentUser;
    if (!user) { toast.error("Войдите в аккаунт"); return; }

    setPaymentSubmitting(true); setPaymentUploading(true);
    try {
      const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${paymentFile.name}`);
      await uploadBytes(storageRef, paymentFile);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "payment_requests"), {
        student_id: user.uid, tutor_id: uid, item_id: "general", item_type: "course",
        item_name: "Оплата занятий", amount: 2000, receipt_url: downloadURL,
        status: "pending", created_at: serverTimestamp(),
      });
      toast.success("✅ Заявка отправлена!");
      setPaymentFile(null); setShowPaymentModal(false);
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setPaymentSubmitting(false); setPaymentUploading(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "payments"), {
        enabled: paymentEnabled, primary_provider: primaryProvider,
        // ЗАМЕНЕНО: Lava на Enot
        enot_shop_id: enotShopId, enot_secret_key: enotSecretKey,
        enot_success_url: enotSuccessUrl, enot_fail_url: enotFailUrl,
        
        prodamus_shop_id: prodamusShopId, prodamus_secret_key: prodamusSecretKey,
        prodamus_success_url: prodamusSuccessUrl, prodamus_fail_url: prodamusFailUrl,
        manual_instructions: manualPaymentInstructions, updated_at: serverTimestamp(),
      }, { merge: true });
      toast.success("⚙️ Настройки оплаты сохранены!");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  }

  const getFilteredPayments = () => {
    let filtered = payments.map(p => ({ ...p, autoStatus: getAutoStatus(p) }));
    if (filterStatus !== "all") filtered = filtered.filter(p => p.autoStatus === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => (p.student_name || "").toLowerCase().includes(q) || (p.tariff || "").toLowerCase().includes(q));
    }
    if (filterPeriod !== "all") {
      const now = new Date();
      const days = filterPeriod === "week" ? 7 : filterPeriod === "month" ? 30 : 365;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => getPaymentDate(p) >= startDate);
    }
    return filtered;
  };

  const filteredPayments = getFilteredPayments();
  const totalReceived = payments.filter(p => p.confirmed).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalLessons = payments.filter(p => p.confirmed).reduce((sum, p) => sum + (p.lessons || 0), 0);
  const pendingTotal = payments.filter(p => !p.confirmed && getAutoStatus(p) === "pending").reduce((sum, p) => sum + (p.amount || 0), 0);
  const overdueTotal = payments.filter(p => !p.confirmed && getAutoStatus(p) === "overdue").reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgLessonPrice = totalLessons > 0 ? Math.round(totalReceived / totalLessons) : 0;

  const chartData = (() => {
    const months: Record<string, number> = {};
    filteredPayments.forEach(p => {
      if (p.confirmed) {
        const date = getPaymentDate(p);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        months[key] = (months[key] || 0) + (p.amount || 0);
      }
    });
    return Object.entries(months).map(([month, total]) => ({
      month: month.split("-")[1] + "/" + month.split("-")[0].slice(-2), total,
    })).slice(-6);
  })();

  const statusChartData = (() => {
    const counts = { paid: 0, pending: 0, overdue: 0 };
    filteredPayments.forEach(p => { const s = getAutoStatus(p); if (counts.hasOwnProperty(s)) counts[s as keyof typeof counts]++; });
    return [
      { name: "Оплачено", value: counts.paid, color: "#10b981" },
      { name: "Ожидание", value: counts.pending, color: "#f59e0b" },
      { name: "Просрочено", value: counts.overdue, color: "#ef4444" },
    ].filter(d => d.value > 0);
  })();

  const exportToCSV = () => {
    const headers = ["Дата", "Ученик", "Тариф", "Сумма", "Занятий", "Дедлайн", "Статус", "Комментарий"];
    const rows = filteredPayments.map(p => [formatFullDate(p.created_at), p.student_name || "—", p.tariff || "—", p.amount || 0, p.lessons || 0, p.deadline ? formatFullDate(p.deadline) : "—", getStatusText(getAutoStatus(p)), p.comment || "—"].map(escapeCSV));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("📄 Экспортировано в CSV");
  };

  if (loadingLedger) return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 flex items-center justify-center">
      <div className="relative w-20 h-20"><div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div><div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-amber-600 hover:text-amber-700 transition font-medium flex items-center gap-1 group">
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition" /> Назад
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent text-center flex-1">
            💰 Финансы и Оплата
          </h1>
          <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition shadow-lg">
            <Plus size={16} /> Тест оплаты
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "stats", label: "📊 Статистика и Учет", icon: TrendingUp },
            { id: "requests", label: `📥 Заявки с чеками ${paymentRequests.length > 0 ? `(${paymentRequests.length})` : ""}`, icon: Receipt },
            { id: "settings", label: "⚙️ Настройки оплаты", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                  : "bg-white/80 text-amber-700 hover:bg-white"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
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
                <BookOpen size={18} className="text-amber-500 mb-1" />
                <p className="text-2xl font-bold text-amber-600">{totalLessons}</p>
                <p className="text-xs text-gray-500">Оплачено занятий</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-200/50">
                <Clock size={18} className="text-yellow-500 mb-1" />
                <p className="text-2xl font-bold text-yellow-600">{pendingTotal.toLocaleString()} ₽</p>
                <p className="text-xs text-gray-500">В ожидании</p>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-amber-200/50">
                <AlertTriangle size={18} className="text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-500">{overdueTotal.toLocaleString()} ₽</p>
                <p className="text-xs text-gray-500">Просрочено</p>
              </div>
            </div>

            {avgLessonPrice > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-2xl p-4 border border-amber-200/50 flex items-center justify-between">
                <div><p className="text-sm text-amber-700 font-medium">💎 Средняя стоимость занятия</p></div>
                <p className="text-3xl font-bold text-amber-600">{avgLessonPrice.toLocaleString()} ₽</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-lg border border-amber-200/50">
                <h3 className="font-semibold text-amber-700 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Динамика платежей</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} ₽`} />
                      <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-center py-12">Нет данных</p>}
              </div>
              <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-lg border border-amber-200/50">
                <h3 className="font-semibold text-amber-700 mb-4 flex items-center gap-2"><Shield size={18} /> Статусы платежей</h3>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {statusChartData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-center py-12">Нет данных</p>}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-5 border border-amber-200/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="font-semibold text-amber-700 flex items-center gap-2"><Receipt size={18} /> История платежей ({filteredPayments.length})</h2>
                <div className="flex gap-2">
                  <button onClick={() => { resetPaymentForm(); setShowAddForm(!showAddForm); }} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:from-amber-600 hover:to-yellow-700 transition shadow">
                    <Plus size={16} /> {editingPayment ? "Редактировать" : "Платёж"}
                  </button>
                  <button onClick={exportToCSV} className="flex items-center gap-2 bg-white border border-amber-200 text-amber-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-50 transition">
                    <Download size={16} /> CSV
                  </button>
                </div>
              </div>

              {showAddForm && (
                <form onSubmit={addPayment} className="bg-amber-50/50 rounded-xl p-4 mb-4 border border-amber-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Ученик</label>
                      <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white">
                        <option value="">Выберите ученика</option>
                        {students.map((s: any) => (<option key={s.id} value={s.id}>{s.full_name} | Оплачено: {s.paid_lessons || 0}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-amber-600 font-medium">📅 Дедлайн оплаты</label>
                      <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Сумма (₽)</label>
                      <input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} min={1} required className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Занятий</label>
                      <input type="number" value={lessons} onChange={(e) => setLessons(parseInt(e.target.value) || 1)} min={1} required className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs text-amber-600 font-medium">Тариф</label>
                      <select value={tariff} onChange={(e) => setTariff(e.target.value)} className="w-full border border-amber-200 rounded-xl p-2.5 text-sm mt-1 bg-white">
                        <option value="Пробный">🎁 Пробный</option>
                        <option value="Старт">⭐ Старт (4)</option>
                        <option value="Оптима">📦 Оптима (8)</option>
                        <option value="Максимум">🚀 Максимум (12)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={savingPayment} className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-bold hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <Save size={16} /> {savingPayment ? "Сохранение..." : editingPayment ? "🔄 Обновить" : "✨ Создать"}
                    </button>
                    <button type="button" onClick={resetPaymentForm} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition">Отмена</button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap gap-3 mb-4 p-3 bg-white rounded-xl border border-amber-100">
                <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as any)} className="border border-amber-200 rounded-lg p-1.5 text-sm bg-white">
                  <option value="all">Всё время</option>
                  <option value="week">7 дней</option>
                  <option value="month">Месяц</option>
                  <option value="year">Год</option>
                </select>
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

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-left py-3 px-2 text-xs text-amber-500">Дата</th>
                      <th className="text-left py-3 px-2 text-xs text-amber-500">Ученик</th>
                      <th className="text-right py-3 px-2 text-xs text-amber-500">Сумма</th>
                      <th className="text-center py-3 px-2 text-xs text-amber-500">Занятий</th>
                      <th className="text-center py-3 px-2 text-xs text-amber-500">Статус</th>
                      <th className="text-right py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400">Нет платежей</td></tr>
                    ) : filteredPayments.map((payment: any) => {
                      const autoStatus = getAutoStatus(payment);
                      return (
                        <tr key={payment.id} className="border-b border-amber-100 hover:bg-amber-50/50 transition">
                          <td className="py-3 px-2 text-xs text-gray-500">{formatDate(payment.created_at)}</td>
                          <td className="py-3 px-2 font-medium text-gray-800">{payment.student_name || "—"}</td>
                          <td className="py-3 px-2 text-right font-bold text-amber-600">{payment.amount?.toLocaleString()} ₽</td>
                          <td className="py-3 px-2 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">{payment.lessons || 0}</span></td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(autoStatus)}`}>
                              {getStatusIcon(autoStatus)} {getStatusText(autoStatus)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!payment.confirmed && paymentEnabled && (primaryProvider === "enot" || primaryProvider === "prodamus") && (
                                <button 
                                  onClick={() => payWithProvider(payment)} 
                                  disabled={paymentLoading === payment.id}
                                  className={`p-1.5 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 ${primaryProvider === "enot" ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gradient-to-r from-purple-500 to-pink-500"}`}
                                  title={`Оплатить через ${primaryProvider === "enot" ? "Enot.io" : "Prodamus"}`}
                                >
                                  {paymentLoading === payment.id ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                </button>
                              )}
                              {!payment.confirmed && (
                                <button onClick={() => confirmPayment(payment)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition" title="Подтвердить"><Check size={14} /></button>
                              )}
                              <button onClick={() => { setEditingPayment(payment); setSelectedStudent(payment.student_id); setAmount(payment.amount); setLessons(payment.lessons); setTariff(payment.tariff); setComment(payment.comment || ""); setShowAddForm(true); }} className="p-1 text-gray-400 hover:text-amber-500 transition" title="Редактировать"><Edit2 size={16} /></button>
                              <button onClick={() => deletePayment(payment)} className="p-1 text-gray-400 hover:text-red-500 transition" title="Удалить"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-amber-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl text-amber-700 flex items-center gap-2"><Receipt size={20} /> Входящие заявки на оплату</h2>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Ожидают: {paymentRequests.length}
                </div>
              </div>

              {loadingRequests ? (
                <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" /><p className="text-stone-500 text-sm mt-2">Загрузка заявок...</p></div>
              ) : paymentRequests.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-stone-600 font-medium">Новых заявок нет</p>
                  <p className="text-stone-400 text-xs mt-1">Как только ученик загрузит чек, он появится здесь</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentRequests.map((req) => (
                    <div key={req.id} className="bg-stone-50 rounded-xl p-5 border border-stone-200 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-stone-800 text-lg">{req.item_name}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">{req.item_type === "course" ? "Курс" : "ДЗ"}</span>
                        </div>
                        <p className="text-stone-600 text-sm mb-1">
                          Ученик ID: <span className="font-mono text-stone-800">{req.student_id.slice(0, 8)}...</span> • 
                          Сумма: <span className="font-bold text-emerald-600 text-base">{req.amount} ₽</span>
                        </p>
                        <p className="text-xs text-stone-400">{new Date(req.created_at).toLocaleString("ru-RU")}</p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={() => setSelectedReceiptImage(req.receipt_url)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 rounded-xl text-sm font-medium transition border border-stone-200">
                          <Eye className="w-4 h-4" /> Смотреть чек
                        </button>
                        <button onClick={() => handleApproveRequest(req)} disabled={processingRequestId === req.id} className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
                          {processingRequestId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Подтвердить
                        </button>
                        <button onClick={() => handleRejectRequest(req.id)} disabled={processingRequestId === req.id} className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition disabled:opacity-50">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-amber-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl text-amber-700 flex items-center gap-2"><Settings size={20} /> Настройки оплаты</h2>
                <button type="button" onClick={() => { setPaymentEnabled(!paymentEnabled); }} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${paymentEnabled ? 'bg-emerald-600' : 'bg-stone-300'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${paymentEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              {paymentEnabled && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-stone-700 mb-3 block">Способ оплаты</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* ЗАМЕНЕНО: Lava на Enot */}
                      <button onClick={() => setPrimaryProvider("enot")} className={`p-4 rounded-xl border-2 text-sm font-medium transition text-left ${primaryProvider === "enot" ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-stone-200 bg-white text-stone-600 hover:border-blue-300'}`}>
                        <div className="text-2xl mb-2">💎</div>
                        <div className="font-bold text-base">Enot.io</div>
                        <div className="text-xs mt-1 opacity-75">Карты РФ → Крипта/Счёт</div>
                      </button>
                      <button onClick={() => setPrimaryProvider("prodamus")} className={`p-4 rounded-xl border-2 text-sm font-medium transition text-left ${primaryProvider === "prodamus" ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-stone-200 bg-white text-stone-600 hover:border-purple-300'}`}>
                        <div className="text-2xl mb-2">🟣</div>
                        <div className="font-bold text-base">Prodamus</div>
                        <div className="text-xs mt-1 opacity-75">Карты РФ → Счёт РФ</div>
                      </button>
                      <button onClick={() => setPrimaryProvider("manual")} className={`p-4 rounded-xl border-2 text-sm font-medium transition text-left ${primaryProvider === "manual" ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300'}`}>
                        <div className="text-2xl mb-2">🤝</div>
                        <div className="font-bold text-base">Ручная</div>
                        <div className="text-xs mt-1 opacity-75">Ученик загружает чек</div>
                      </button>
                    </div>
                  </div>

                  <div className="min-h-[280px]">
                    {/* ЗАМЕНЕНО: Lava на Enot */}
                    {primaryProvider === "enot" && (
                      <div className="p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">💎 Настройки Enot.io</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-stone-600 font-medium">Merchant ID</label>
                            <input type="text" value={enotShopId} onChange={(e) => setEnotShopId(e.target.value)} className="w-full border border-blue-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-blue-400 focus:outline-none" placeholder="Ваш ID магазина" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 font-medium">Secret Key</label>
                            <input type="password" value={enotSecretKey} onChange={(e) => setEnotSecretKey(e.target.value)} className="w-full border border-blue-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-blue-400 focus:outline-none" placeholder="Секретный ключ" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 font-medium">URL успеха</label>
                            <input type="text" value={enotSuccessUrl} onChange={(e) => setEnotSuccessUrl(e.target.value)} className="w-full border border-blue-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-blue-400 focus:outline-none" placeholder="https://jenyawisch.com/payments/success" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 font-medium">URL ошибки</label>
                            <input type="text" value={enotFailUrl} onChange={(e) => setEnotFailUrl(e.target.value)} className="w-full border border-blue-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-blue-400 focus:outline-none" placeholder="https://jenyawisch.com/payments/failed" />
                          </div>
                        </div>
                      </div>
                    )}

                    {primaryProvider === "prodamus" && (
                      <div className="p-5 bg-purple-50 rounded-xl border-2 border-purple-200">
                        <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">🟣 Настройки Prodamus</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-stone-600 font-medium">Shop ID</label>
                            <input type="text" value={prodamusShopId} onChange={(e) => setProdamusShopId(e.target.value)} className="w-full border border-purple-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-purple-400 focus:outline-none" placeholder="Ваш ID магазина" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 font-medium">Secret Key</label>
                            <input type="password" value={prodamusSecretKey} onChange={(e) => setProdamusSecretKey(e.target.value)} className="w-full border border-purple-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-purple-400 focus:outline-none" placeholder="Секретный ключ" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 font-medium">URL успеха</label>
                            <input type="text" value={prodamusSuccessUrl} onChange={(e) => setProdamusSuccessUrl(e.target.value)} className="w-full border border-purple-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-purple-400 focus:outline-none" placeholder="https://jenyawisch.com/payments/success" />
                          </div>
                          <div>
                            <label className="text-xs text-stone-600 font-medium">URL ошибки</label>
                            <input type="text" value={prodamusFailUrl} onChange={(e) => setProdamusFailUrl(e.target.value)} className="w-full border border-purple-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-purple-400 focus:outline-none" placeholder="https://jenyawisch.com/payments/failed" />
                          </div>
                        </div>
                      </div>
                    )}

                    {primaryProvider === "manual" && (
                      <div className="p-5 bg-green-50 rounded-xl border-2 border-green-200">
                        <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">📝 Настройки ручной оплаты</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-xs text-stone-600 font-medium">Инструкция для ученика</label>
                            <textarea value={manualPaymentInstructions} onChange={(e) => setManualPaymentInstructions(e.target.value)} rows={4} className="w-full border border-green-200 rounded-lg p-2.5 mt-1 text-sm bg-white focus:border-green-400 focus:outline-none resize-none" placeholder="Например: Переведите сумму через Золотую Корону..." />
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex gap-2 items-start">
                            <span className="text-lg flex-shrink-0">💡</span>
                            <span>Ученик увидит эту инструкцию и сможет прикрепить скриншот чека. Вы подтвердите оплату вручную во вкладке "Заявки с чеками".</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {(primaryProvider === "enot" || primaryProvider === "prodamus") && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex gap-2 items-start">
                      <span className="text-lg flex-shrink-0">💡</span>
                      <div className="flex-1">
                        <p className="font-medium mb-1">Webhook URL для {primaryProvider === "enot" ? "Enot.io" : "Prodamus"}:</p>
                        <code className="bg-blue-100 px-2 py-1 rounded text-xs break-all">https://jenyawisch.com/api/payments/{primaryProvider}/webhook</code>
                        <p className="text-xs mt-2 text-blue-700">Настройте этот URL в кабинете провайдера → Магазин → Webhook</p>
                      </div>
                    </div>
                  )}

                  <button onClick={saveSettings} disabled={savingSettings} className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingSettings ? "Сохранение..." : "💾 Сохранить настройки"}
                  </button>
                </div>
              )}

              {!paymentEnabled && (
                <div className="text-center py-12 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
                  <div className="text-4xl mb-2">🔒</div>
                  <p className="text-stone-600 font-medium">Приём оплаты отключён</p>
                  <p className="text-stone-400 text-xs mt-1">Включите тумблер выше, чтобы настроить провайдера</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedReceiptImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReceiptImage(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedReceiptImage(null)} className="absolute -top-10 right-0 text-white hover:text-stone-300 transition"><X className="w-8 h-8" /></button>
            <img src={selectedReceiptImage} alt="Чек" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white" />
            <p className="text-center text-white/70 text-sm mt-3">Нажмите в любом месте, чтобы закрыть</p>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-600 to-emerald-700 px-6 py-5 flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-white flex items-center gap-2">💳 Тест оплаты</h2><p className="text-white/80 text-sm mt-1">Сумма: 2000 ₽</p></div>
              <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white transition"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-900 mb-2">📋 Инструкция</h3>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{manualPaymentInstructions}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">📎 Прикрепите скриншот чека</label>
                <div className="relative border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:border-amber-500 transition-colors bg-stone-50">
                  <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setPaymentFile(e.target.files[0]); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={paymentSubmitting} />
                  {paymentFile ? (
                    <div className="flex flex-col items-center gap-2"><CheckCircle className="w-8 h-8 text-emerald-600" /><p className="text-sm font-medium text-stone-800 truncate max-w-xs">{paymentFile.name}</p><button onClick={(e) => { e.preventDefault(); setPaymentFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline">Удалить</button></div>
                  ) : (
                    <div className="flex flex-col items-center gap-2"><Upload className="w-8 h-8 text-stone-400" /><p className="text-sm text-stone-600">Нажмите или перетащите файл</p></div>
                  )}
                </div>
              </div>
              <button onClick={handlePaymentSubmit} disabled={paymentSubmitting || !paymentFile} className={`w-full py-3.5 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 ${paymentSubmitting || !paymentFile ? "bg-stone-300 cursor-not-allowed" : "bg-gradient-to-r from-amber-600 to-emerald-700 hover:shadow-lg"}`}>
                {paymentSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Отправка...</> : "✅ Я оплатил, проверить чек"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 flex items-center justify-center"><div className="relative w-20 h-20"><div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div><div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div></div></div>}>
      <FinanceContent />
    </Suspense>
  );
}