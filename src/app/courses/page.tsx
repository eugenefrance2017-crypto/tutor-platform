"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  query, where, onSnapshot, getDoc, getDocs
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Search, Grid, List, Star,
  Users, Trash2, Edit, CheckCircle,
  Award, Moon, Sun, ChevronRight, Home, Folder,
  X, Send, Loader2, CreditCard, Settings, Upload, Save,
  Copy, Eye, EyeOff, Download, Check, FolderOpen, Play
} from "lucide-react";

const storage = getStorage();

interface Course {
  id: string;
  tutor_id: string;
  tutor_name?: string;
  title: string;
  description: string;
  subject: string;
  price: number;
  oldPrice?: number;
  cover: string;
  access_type: 'free' | 'paid' | 'assigned';
  lessons: any[];
  published: boolean;
  preview_lessons?: number;
  tags?: string[];
  students_count?: number;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  uid: string;
  name: string;
  full_name?: string;
  email?: string;
  role: 'tutor' | 'student';
  xp?: number;
  level?: number;
}

interface Progress {
  id: string;
  course_id: string;
  student_id: string;
  completed_lessons: string[];
  status: 'active' | 'completed';
  payment_status: 'pending' | 'paid';
}

const SUBJECTS: Record<string, { label: string; icon: string }> = {
  chemistry: { label: "Химия", icon: "🧪" },
  biology: { label: "Биология", icon: "🧬" },
};

const COVERS = [
  "from-rose-400 to-pink-600",
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600",
  "from-blue-400 to-indigo-600",
];

const POPULAR_TAGS = ["ЕГЭ", "ОГЭ", "Базовый", "Продвинутый", "Интенсив", "С нуля", "Повторение"];

function CoursesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [courses, setCourses] = useState<Course[]>([]);
  const [myProgress, setMyProgress] = useState<Record<string, Progress>>({});
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterAccess, setFilterAccess] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'rating' | 'popular'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [darkMode, setDarkMode] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCourseSettings, setShowCourseSettings] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCourseForPayment, setSelectedCourseForPayment] = useState<Course | null>(null);
  const [showSyllabusModal, setShowSyllabusModal] = useState<Course | null>(null);
  const [showExportModal, setShowExportModal] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSubject, setNewSubject] = useState("chemistry");
  const [newPrice, setNewPrice] = useState(0);
  const [newOldPrice, setNewOldPrice] = useState(0);
  const [newCover, setNewCover] = useState(COVERS[0]);
  const [newAccessType, setNewAccessType] = useState<'free' | 'paid' | 'assigned'>('free');
  const [newPreviewLessons, setNewPreviewLessons] = useState(0);
  const [newTags, setNewTags] = useState<string[]>([]);

  const [courseSettingsTitle, setCourseSettingsTitle] = useState("");
  const [courseSettingsDesc, setCourseSettingsDesc] = useState("");
  const [courseSettingsPrice, setCourseSettingsPrice] = useState(0);
  const [courseSettingsOldPrice, setCourseSettingsOldPrice] = useState(0);
  const [courseSettingsSubject, setCourseSettingsSubject] = useState("chemistry");
  const [courseSettingsAccessType, setCourseSettingsAccessType] = useState<'free' | 'paid' | 'assigned'>('free');
  const [courseSettingsPreviewLessons, setCourseSettingsPreviewLessons] = useState(0);
  const [courseSettingsTags, setCourseSettingsTags] = useState<string[]>([]);
  const [savingCourseSettings, setSavingCourseSettings] = useState(false);

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const [isPaying, setIsPaying] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'lava' | 'prodamus' | 'manual' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 12;

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setDarkMode(true);
  }, []);
  useEffect(() => { localStorage.setItem("darkMode", String(darkMode)); }, [darkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, "profiles", currentUser.uid));
        if (snap.exists()) setProfile({ id: snap.id, ...snap.data() } as Profile);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    let unsub: any;
    if (profile?.role === "tutor") {
      unsub = onSnapshot(
        query(collection(db, "courses"), where("tutor_id", "==", user.uid)),
        (snap) => {
          setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
          setLoading(false);
        }
      );
    } else {
      unsub = onSnapshot(
        query(collection(db, "courses"), where("published", "==", true)),
        (snap) => {
          setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
          setLoading(false);
        }
      );
    }
    return () => unsub && unsub();
  }, [user, profile]);

  useEffect(() => {
    if (!user || profile?.role !== "student") return;
    const unsub = onSnapshot(
      query(collection(db, "course_progress"), where("student_id", "==", user.uid)),
      (snap) => {
        const progressMap: Record<string, Progress> = {};
        snap.docs.forEach(d => {
          const data = d.data() as Progress;
          progressMap[data.course_id] = { id: d.id, ...data };
        });
        setMyProgress(progressMap);
      }
    );
    return () => unsub();
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, "profiles"), where("role", "==", "student")),
      (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Profile)))
    );
    return () => unsub();
  }, [user]);

  const handleCoursePayment = async (provider: 'lava' | 'prodamus' | 'manual') => {
    if (!selectedCourseForPayment || !user) return;
    if (provider === 'manual') {
      setPaymentProvider('manual');
      return;
    }
    setIsPaying(true);
    setPaymentProvider(provider);
    try {
      const orderId = `course_${selectedCourseForPayment.id}_${user.uid}_${Date.now()}`;
      const endpoint = provider === 'lava' ? '/api/payments/lava/create' : '/api/payments/prodamus/create';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedCourseForPayment.price,
          orderId,
          description: `Курс: ${selectedCourseForPayment.title}`,
          studentId: user.uid,
          tutorId: selectedCourseForPayment.tutor_id,
          payment_type: 'course',
          course_id: selectedCourseForPayment.id
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка создания платежа');
      toast.success(`Перенаправляем на ${provider === 'lava' ? 'Lava' : 'Prodamus'}...`);
      window.open(data.url, '_blank');
      setShowPaymentModal(false);
    } catch (error: any) {
      toast.error(`Ошибка оплаты: ${error.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile || !selectedCourseForPayment || !user) return;
    setUploadingReceipt(true);
    try {
      const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`);
      await uploadBytes(storageRef, receiptFile);
      const downloadURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, "payment_requests"), {
        student_id: user.uid,
        tutor_id: selectedCourseForPayment.tutor_id,
        item_id: selectedCourseForPayment.id,
        item_type: "course",
        item_name: selectedCourseForPayment.title,
        amount: selectedCourseForPayment.price,
        receipt_url: downloadURL,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      toast.success("✅ Чек загружен! Репетитор проверит и откроет доступ.");
      setShowPaymentModal(false);
      setReceiptFile(null);
      setPaymentProvider(null);
    } catch (error: any) {
      toast.error("Ошибка загрузки: " + error.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const openCourseSettings = (course: Course) => {
    setCourseSettingsTitle(course.title);
    setCourseSettingsDesc(course.description);
    setCourseSettingsPrice(course.price);
    setCourseSettingsOldPrice(course.oldPrice || 0);
    setCourseSettingsSubject(course.subject);
    setCourseSettingsAccessType(course.access_type);
    setCourseSettingsPreviewLessons(course.preview_lessons || 0);
    setCourseSettingsTags(course.tags || []);
    setShowCourseSettings(course.id);
  };

  const saveCourseSettings = async () => {
    if (!showCourseSettings || !courseSettingsTitle.trim()) {
      toast.error("Введите название курса");
      return;
    }
    setSavingCourseSettings(true);
    try {
      await updateDoc(doc(db, "courses", showCourseSettings), {
        title: courseSettingsTitle.trim(),
        description: courseSettingsDesc.trim(),
        price: courseSettingsPrice,
        oldPrice: courseSettingsOldPrice,
        subject: courseSettingsSubject,
        access_type: courseSettingsAccessType,
        preview_lessons: courseSettingsPreviewLessons,
        tags: courseSettingsTags,
        updated_at: new Date().toISOString(),
      });
      toast.success("✅ Настройки курса сохранены!");
      setShowCourseSettings(null);
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setSavingCourseSettings(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    if (deleteConfirmText !== course.title) {
      toast.error("Название курса не совпадает");
      return;
    }
    try {
      await deleteDoc(doc(db, "courses", courseId));
      toast.success("🗑️ Курс удалён");
      setShowDeleteModal(null);
      setDeleteConfirmText("");
    } catch (error: any) {
      toast.error("Ошибка удаления: " + error.message);
    }
  };

  const duplicateCourse = async (course: Course) => {
    try {
      const newCourse = {
        ...course,
        id: undefined,
        title: `${course.title} (копия)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published: false,
      };
      await addDoc(collection(db, "courses"), newCourse);
      toast.success("✅ Курс дублирован!");
    } catch (error: any) {
      toast.error("Ошибка дублирования: " + error.message);
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      await updateDoc(doc(db, "courses", course.id), {
        published: !course.published,
        updated_at: new Date().toISOString(),
      });
      toast.success(course.published ? "📴 Курс скрыт" : "✅ Курс опубликован!");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const exportCourse = (course: Course) => {
    const dataStr = JSON.stringify(course, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${course.title.replace(/\s+/g, '_')}_export.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(" Курс экспортирован!");
    setShowExportModal(null);
  };

  const assignCourse = async (courseId: string) => {
    if (selectedStudents.length === 0) {
      toast.error("Выберите хотя бы одного ученика");
      return;
    }
    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;
      const promises = selectedStudents.map(studentId => {
        return addDoc(collection(db, "course_progress"), {
          course_id: courseId,
          student_id: studentId,
          completed_lessons: [],
          status: "active",
          payment_status: course.access_type === "paid" ? "pending" : "paid",
          assigned_at: new Date().toISOString(),
        });
      });
      await Promise.all(promises);
      toast.success(`✅ Курс назначен ${selectedStudents.length} ученикам!`);
      setShowAssignModal(null);
      setSelectedStudents([]);
      setStudentSearchQuery("");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const uid = user?.uid || searchParams.get("uid") || "";
  const role = profile?.role || "student";
  const isTutor = role === "tutor";
  const isStudent = role === "student";

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];
    if (filterSubject !== "all") filtered = filtered.filter(c => c.subject === filterSubject);
    if (filterAccess !== "all") filtered = filtered.filter(c => c.access_type === filterAccess);
    if (filterStatus !== "all") {
      if (filterStatus === "published") filtered = filtered.filter(c => c.published);
      if (filterStatus === "draft") filtered = filtered.filter(c => !c.published);
    }
    if (filterTag !== "all") filtered = filtered.filter(c => c.tags?.includes(filterTag));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q) ||
        c.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'created') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.students_count || 0) - (a.students_count || 0));
    } else {
      filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return filtered;
  }, [courses, filterSubject, filterAccess, filterStatus, filterTag, searchQuery, sortBy]);

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * coursesPerPage;
    return filteredCourses.slice(startIndex, startIndex + coursesPerPage);
  }, [filteredCourses, currentPage]);

  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  const bg = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-rose-50 via-white to-pink-50';
  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-900';

  if (loadingAuth || loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className={`${cardBg} rounded-3xl p-8 border max-w-md text-center shadow-xl`}>
          <div className="text-6xl mb-4">🔒</div>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Войдите в аккаунт</h2>
          <p className={`${textSecondary} text-sm mb-6`}>Чтобы получить доступ к курсам</p>
          <Link href="/login" className="inline-block px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">Войти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto p-6">
        <motion.nav initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center gap-2 text-sm ${textSecondary} mb-6`}>
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="flex items-center gap-2 hover:text-rose-500 transition">
            <Home className="w-4 h-4" /><span>Главная</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Folder className="w-4 h-4" />
          <span className={textPrimary}>Курсы</span>
        </motion.nav>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600'} mb-2`}>
              {isTutor ? "Мои курсы" : "Каталог курсов"}
            </h1>
            <p className={textSecondary}>{isTutor ? "Управляйте своими курсами" : "Выберите курс и начните обучение"}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-2xl ${darkMode ? 'bg-gray-800 text-yellow-400 border-gray-700' : 'bg-white text-gray-600 border-gray-100'} border shadow-sm`}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isTutor && (
              <button onClick={() => setShowCreateModal(true)} className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl transition-all flex items-center gap-2">
                <Plus className="w-5 h-5" /><span>Новый курс</span>
              </button>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-3xl p-4 shadow-sm border mb-8`}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[250px] relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по названию, описанию, тегам..." className={`w-full ${inputBg} border-2 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-rose-300 focus:outline-none transition-all`} />
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            </div>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={`${inputBg} border-2 rounded-2xl px-4 py-3 text-sm focus:border-rose-300 focus:outline-none transition-all cursor-pointer`}>
              <option value="all">🎨 Все предметы</option>
              <option value="chemistry"> Химия</option>
              <option value="biology">🧬 Биология</option>
            </select>
            <select value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)} className={`${inputBg} border-2 rounded-2xl px-4 py-3 text-sm focus:border-rose-300 focus:outline-none transition-all cursor-pointer`}>
              <option value="all"> Все типы</option>
              <option value="free">🆓 Бесплатные</option>
              <option value="paid">💰 Платные</option>
              <option value="assigned">🔒 По назначению</option>
            </select>
            {isTutor && (
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputBg} border-2 rounded-2xl px-4 py-3 text-sm focus:border-rose-300 focus:outline-none transition-all cursor-pointer`}>
                <option value="all">📊 Все статусы</option>
                <option value="published">✅ Опубликованные</option>
                <option value="draft">📝 Черновики</option>
              </select>
            )}
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className={`${inputBg} border-2 rounded-2xl px-4 py-3 text-sm focus:border-rose-300 focus:outline-none transition-all cursor-pointer`}>
              <option value="all">🏷️ Все теги</option>
              {POPULAR_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className={`${inputBg} border-2 rounded-2xl px-4 py-3 text-sm focus:border-rose-300 focus:outline-none transition-all cursor-pointer`}>
              <option value="updated">🕐 По дате изменения</option>
              <option value="created">📅 По дате создания</option>
              <option value="title">🔤 По названию</option>
              <option value="popular"> По популярности</option>
            </select>
            <div className={`flex ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'} rounded-2xl p-1 border-2`}>
              <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${viewMode === 'grid' ? (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-rose-600 shadow-sm') : textSecondary}`}>
                <Grid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${viewMode === 'list' ? (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-rose-600 shadow-sm') : textSecondary}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {filteredCourses.length === 0 ? (
          <div className={`text-center py-20 ${cardBg} rounded-3xl border-2 border-dashed`}>
            <div className="text-7xl mb-4">📚</div>
            <p className={`${textPrimary} text-lg mb-2`}>{searchQuery || filterSubject !== "all" || filterTag !== "all" ? "Ничего не найдено" : isTutor ? "У вас ещё нет курсов" : "Нет доступных курсов"}</p>
            {isTutor && (
              <button onClick={() => setShowCreateModal(true)} className="mt-4 px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all">+ Создать первый курс</button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCourses.map((course) => {
                const progress = myProgress[course.id];
                const completedCount = progress?.completed_lessons?.length || 0;
                const totalLessons = course.lessons?.filter((l: any) => l.published).length || 0;
                const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                const isImageCover = course.cover && course.cover.startsWith('http');
                const isNew = new Date(course.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
                const hasDiscount = course.oldPrice && course.oldPrice > course.price;

                return (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} className={`${cardBg} rounded-3xl overflow-hidden shadow-sm border hover:shadow-xl transition-all group`}>
                    <div className={`h-48 relative overflow-hidden ${isImageCover ? '' : `bg-gradient-to-br ${course.cover || 'from-rose-400 to-pink-600'}`}`}>
                      {isImageCover && <img src={course.cover} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all" />
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className="px-3 py-1.5 bg-white/95 backdrop-blur rounded-full text-xs font-bold text-gray-700 shadow-sm">
                          {SUBJECTS[course.subject]?.icon} {SUBJECTS[course.subject]?.label}
                        </span>
                        {isNew && <span className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold shadow-sm">🆕 Новый</span>}
                        {course.tags && course.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {course.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-violet-500/90 text-white rounded-full text-[10px] font-bold shadow-sm">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-4 right-4">
                        {course.access_type === 'free' && <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-sm">Бесплатно</span>}
                        {course.access_type === 'paid' && (
                          <div className="flex flex-col items-end gap-1">
                            {hasDiscount && <span className="px-2 py-0.5 bg-gray-500 text-white rounded-full text-xs line-through">{course.oldPrice} ₽</span>}
                            <span className="px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">{course.price} ₽</span>
                          </div>
                        )}
                        {course.access_type === 'assigned' && <span className="px-3 py-1.5 bg-violet-500 text-white rounded-full text-xs font-bold shadow-sm">По назначению</span>}
                      </div>
                      {!course.published && isTutor && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <span className="px-4 py-2 bg-white/90 rounded-full text-sm font-bold text-gray-800">📝 Черновик</span>
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-bold text-xl leading-tight drop-shadow-lg line-clamp-2">{course.title}</h3>
                      </div>
                    </div>

                    <div className="p-5">
                      <p className={`${textSecondary} text-sm line-clamp-2 mb-4 min-h-[2.5rem]`}>{course.description || "Без описания"}</p>

                      <div className={`flex items-center gap-4 text-xs ${textSecondary} mb-4`}>
                        <span className="flex items-center gap-1">📚 {totalLessons} уроков</span>
                        {course.students_count && course.students_count > 0 && (
                          <span className="flex items-center gap-1"> {course.students_count} учеников</span>
                        )}
                        {course.preview_lessons && course.preview_lessons > 0 && (
                          <span className="flex items-center gap-1">👁️ {course.preview_lessons} бесплатных</span>
                        )}
                      </div>

                      {isStudent && progress && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${textPrimary}`}>Прогресс</span>
                            <span className="text-xs font-bold text-rose-600">{progressPercent}%</span>
                          </div>
                          <div className={`w-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                            <div className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {/*  ИСПРАВЛЕННАЯ ЛОГИКА КНОПОК */}
                        {isStudent && course.access_type === 'paid' && !progress ? (
                          course.preview_lessons && course.preview_lessons > 0 ? (
                            <Link 
                              href={`/courses/${course.id}?uid=${uid}&role=${role}`} 
                              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all text-center flex items-center justify-center gap-2"
                            >
                              <Play className="w-4 h-4" /> Смотреть бесплатно ({course.preview_lessons} {course.preview_lessons === 1 ? 'урок' : course.preview_lessons < 5 ? 'урока' : 'уроков'})
                            </Link>
                          ) : (
                            <button 
                              onClick={() => { setSelectedCourseForPayment(course); setShowPaymentModal(true); }} 
                              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                              <CreditCard className="w-4 h-4" /> Купить за {course.price} ₽
                            </button>
                          )
                        ) : (
                          <Link 
                            href={`/courses/${course.id}?uid=${uid}&role=${role}`} 
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all text-center"
                          >
                            {progress ? "▶ Продолжить" : "📖 Открыть"}
                          </Link>
                        )}

                        <button onClick={() => setShowSyllabusModal(course)} className={`px-3 py-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} rounded-xl text-sm font-semibold transition-all`} title="Программа курса">
                          <List className="w-4 h-4" />
                        </button>

                        {isTutor && (
                          <>
                            <button onClick={() => openCourseSettings(course)} className={`p-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-xl hover:bg-violet-100 hover:text-violet-600 transition`} title="Редактировать курс">
                              <Settings className="w-4 h-4" />
                            </button>
                            <button onClick={() => setShowAssignModal(course.id)} className={`p-2.5 ${darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'} rounded-xl hover:bg-violet-100 transition`} title="Назначить ученикам">
                              <Users className="w-4 h-4" />
                            </button>
                            <button onClick={() => togglePublish(course)} className={`p-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition`} title={course.published ? "Скрыть" : "Опубликовать"}>
                              {course.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => duplicateCourse(course)} className={`p-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-xl hover:bg-blue-100 hover:text-blue-600 transition`} title="Дублировать курс">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => setShowExportModal(course)} className={`p-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition`} title="Экспорт курса">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setShowDeleteModal(course.id); setDeleteConfirmText(""); }} className={`p-2.5 ${darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'} rounded-xl hover:bg-rose-100 transition`} title="Удалить курс">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-50 ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'} border`}>
                  ← Назад
                </button>
                <span className={`px-4 py-2 rounded-xl font-semibold bg-rose-500 text-white`}>
                  {currentPage} / {totalPages}
                </span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className={`px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-50 ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'} border`}>
                  Вперёд →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {paginatedCourses.map((course) => {
              const progress = myProgress[course.id];
              const completedCount = progress?.completed_lessons?.length || 0;
              const totalLessons = course.lessons?.filter((l: any) => l.published).length || 0;
              const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
              const isImageCover = course.cover && course.cover.startsWith('http');
              const isNew = new Date(course.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
              const hasDiscount = course.oldPrice && course.oldPrice > course.price;

              return (
                <motion.div key={course.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ x: 5 }} className={`${cardBg} rounded-2xl border shadow-sm hover:shadow-md transition-all p-5 flex items-center gap-5`}>
                  <div className={`w-24 h-24 rounded-2xl flex-shrink-0 flex items-center justify-center text-4xl shadow-md overflow-hidden ${isImageCover ? '' : `bg-gradient-to-br ${course.cover || 'from-rose-400 to-pink-600'}`}`}>
                    {isImageCover ? (
                      <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <span>{SUBJECTS[course.subject]?.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className={`font-bold ${textPrimary} text-lg`}>{course.title}</h3>
                      {isNew && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">🆕 Новый</span>}
                      {!course.published && isTutor && <span className={`px-2 py-0.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} rounded-full text-xs font-bold`}>📝 Черновик</span>}
                      {course.tags && course.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">{tag}</span>
                      ))}
                    </div>
                    <p className={`${textSecondary} text-sm line-clamp-1 mb-2`}>{course.description}</p>
                    <div className={`flex items-center gap-4 text-xs ${textSecondary}`}>
                      <span>{SUBJECTS[course.subject]?.label}</span>
                      <span>📚 {totalLessons} уроков</span>
                      {course.students_count && <span>👥 {course.students_count} учеников</span>}
                      {course.access_type === 'free' && <span className="text-emerald-600 font-semibold">🆓 Бесплатно</span>}
                      {course.access_type === 'paid' && (
                        <span className="text-amber-600 font-semibold">
                          {hasDiscount && <span className="line-through mr-1">{course.oldPrice}₽</span>}
                          💰 {course.price}₽
                        </span>
                      )}
                    </div>
                    {isStudent && progress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${textPrimary}`}>Прогресс: {progressPercent}%</span>
                          <span className={`text-xs ${textSecondary}`}>{completedCount}/{totalLessons}</span>
                        </div>
                        <div className={`w-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                          <div className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* 🎯 ИСПРАВЛЕННАЯ ЛОГИКА КНОПОК (list view) */}
                    {isStudent && course.access_type === 'paid' && !progress ? (
                      course.preview_lessons && course.preview_lessons > 0 ? (
                        <Link 
                          href={`/courses/${course.id}?uid=${uid}&role=${role}`} 
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:scale-105 transition-transform shadow-md flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" /> Бесплатно
                        </Link>
                      ) : (
                        <button 
                          onClick={() => { setSelectedCourseForPayment(course); setShowPaymentModal(true); }} 
                          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:scale-105 transition-transform shadow-md flex items-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" /> {course.price}₽
                        </button>
                      )
                    ) : (
                      <Link href={`/courses/${course.id}?uid=${uid}&role=${role}`} className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-semibold hover:scale-105 transition-transform shadow-md">
                        {progress ? "▶" : "📖"}
                      </Link>
                    )}
                    {isTutor && (
                      <>
                        <button onClick={() => openCourseSettings(course)} className={`p-2.5 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-xl hover:bg-violet-100 hover:text-violet-600 transition`} title="Редактировать">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowAssignModal(course.id)} className={`p-2.5 ${darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'} rounded-xl hover:bg-violet-100 transition`} title="Назначить">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteModal(course.id)} className={`p-2.5 ${darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'} rounded-xl hover:bg-rose-100 transition`} title="Удалить">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* МОДАЛКА СОЗДАНИЯ КУРСА */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Plus className="w-6 h-6" /> Новый курс</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название курса *</label>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Например: ЕГЭ Химия 2025" className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                </div>
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание</label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder="О чём этот курс..." className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Предмет</label>
                    <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`}>
                      <option value="chemistry">🧪 Химия</option>
                      <option value="biology"> Биология</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Тип доступа</label>
                    <select value={newAccessType} onChange={(e) => setNewAccessType(e.target.value as any)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`}>
                      <option value="free">🆓 Бесплатный</option>
                      <option value="paid">💰 Платный</option>
                      <option value="assigned">🔒 По назначению</option>
                    </select>
                  </div>
                </div>
                {newAccessType === 'paid' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Цена (₽)</label>
                      <input type="number" value={newPrice} onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                    </div>
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Старая цена (₽) <span className="text-gray-400">для скидки</span></label>
                      <input type="number" value={newOldPrice} onChange={(e) => setNewOldPrice(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                    </div>
                  </div>
                )}
                {(newAccessType === 'paid' || newAccessType === 'assigned') && (
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🎁 Бесплатных уроков для предпросмотра</label>
                    <input type="number" value={newPreviewLessons} onChange={(e) => setNewPreviewLessons(parseInt(e.target.value) || 0)} min={0} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                  </div>
                )}
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🏷️ Теги</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newTags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold flex items-center gap-1">
                        {tag}
                        <button onClick={() => setNewTags(newTags.filter(t => t !== tag))} className="text-violet-500 hover:text-violet-700">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.filter(tag => !newTags.includes(tag)).map(tag => (
                      <button key={tag} onClick={() => setNewTags([...newTags, tag])} className={`px-3 py-1 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-full text-xs font-bold hover:bg-violet-100 hover:text-violet-700 transition`}>
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🎨 Обложка</label>
                  <div className="flex gap-2 flex-wrap">
                    {COVERS.map((c, i) => (
                      <button key={i} onClick={() => setNewCover(c)} className={`w-12 h-12 rounded-lg bg-gradient-to-br ${c} transition-all ${newCover === c ? 'ring-2 ring-rose-500 ring-offset-2 scale-110 shadow-lg' : ''}`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={async () => {
                    if (!newTitle.trim()) { toast.error("Введите название курса"); return; }
                    const courseData = {
                      tutor_id: user!.uid,
                      tutor_name: profile?.name || profile?.full_name || "Преподаватель",
                      title: newTitle.trim(),
                      description: newDesc.trim(),
                      subject: newSubject,
                      price: newPrice,
                      oldPrice: newOldPrice,
                      cover: newCover,
                      access_type: newAccessType,
                      preview_lessons: newPreviewLessons,
                      tags: newTags,
                      lessons: [],
                      published: false,
                      students_count: 0,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    try {
                      const docRef = await addDoc(collection(db, "courses"), courseData);
                      toast.success("✨ Курс создан!");
                      setShowCreateModal(false);
                      setNewTitle(""); setNewDesc(""); setNewSubject("chemistry");
                      setNewPrice(0); setNewOldPrice(0); setNewCover(COVERS[0]); setNewAccessType("free");
                      setNewPreviewLessons(0); setNewTags([]);
                      router.push(`/courses/${docRef.id}?uid=${user!.uid}&role=${profile?.role}`);
                    } catch (error: any) {
                      toast.error("Ошибка: " + error.message);
                    }
                  }} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> Создать курс
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} rounded-xl font-bold`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА НАСТРОЕК КУРСА */}
      <AnimatePresence>
        {showCourseSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCourseSettings(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Settings className="w-6 h-6" /> Настройки курса</h2>
                <button onClick={() => setShowCourseSettings(null)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название курса *</label>
                  <input value={courseSettingsTitle} onChange={(e) => setCourseSettingsTitle(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                </div>
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание</label>
                  <textarea value={courseSettingsDesc} onChange={(e) => setCourseSettingsDesc(e.target.value)} rows={3} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Предмет</label>
                    <select value={courseSettingsSubject} onChange={(e) => setCourseSettingsSubject(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`}>
                      <option value="chemistry">🧪 Химия</option>
                      <option value="biology">🧬 Биология</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Тип доступа</label>
                    <select value={courseSettingsAccessType} onChange={(e) => setCourseSettingsAccessType(e.target.value as any)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`}>
                      <option value="free"> Бесплатный</option>
                      <option value="paid">💰 Платный</option>
                      <option value="assigned">🔒 По назначению</option>
                    </select>
                  </div>
                </div>
                {courseSettingsAccessType === 'paid' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Цена (₽)</label>
                      <input type="number" value={courseSettingsPrice} onChange={(e) => setCourseSettingsPrice(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                    </div>
                    <div>
                      <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Старая цена (₽)</label>
                      <input type="number" value={courseSettingsOldPrice} onChange={(e) => setCourseSettingsOldPrice(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                    </div>
                  </div>
                )}
                {(courseSettingsAccessType === 'paid' || courseSettingsAccessType === 'assigned') && (
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}> Бесплатных уроков</label>
                    <input type="number" value={courseSettingsPreviewLessons} onChange={(e) => setCourseSettingsPreviewLessons(parseInt(e.target.value) || 0)} min={0} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                  </div>
                )}
                <div>
                  <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🏷️ Теги</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {courseSettingsTags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold flex items-center gap-1">
                        {tag}
                        <button onClick={() => setCourseSettingsTags(courseSettingsTags.filter(t => t !== tag))} className="text-violet-500 hover:text-violet-700">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.filter(tag => !courseSettingsTags.includes(tag)).map(tag => (
                      <button key={tag} onClick={() => setCourseSettingsTags([...courseSettingsTags, tag])} className={`px-3 py-1 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-full text-xs font-bold hover:bg-violet-100 hover:text-violet-700 transition`}>
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={saveCourseSettings} disabled={savingCourseSettings} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingCourseSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingCourseSettings ? 'Сохранение...' : ' Сохранить'}
                  </button>
                  <button onClick={() => setShowCourseSettings(null)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ОПЛАТЫ */}
      <AnimatePresence>
        {showPaymentModal && selectedCourseForPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><CreditCard className="w-6 h-6" /> Оплата курса</h2>
                <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                  <h3 className={`text-lg font-bold ${textPrimary}`}>{selectedCourseForPayment.title}</h3>
                  <p className="text-3xl font-black text-amber-600 mt-2">{selectedCourseForPayment.price} ₽</p>
                </div>
                {paymentProvider === 'manual' ? (
                  <>
                    <p className={`text-sm ${textSecondary} text-center mb-4`}>Загрузите скриншот чека для ручной проверки</p>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-amber-200 bg-amber-50'}`}>
                      <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" id="receipt-upload" />
                      <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        {receiptFile ? (
                          <>
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                            <p className="text-sm font-medium text-stone-800 truncate max-w-xs">{receiptFile.name}</p>
                            <button onClick={(e) => { e.preventDefault(); setReceiptFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline">Удалить</button>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-amber-500" />
                            <p className="text-sm text-stone-600">Нажмите или перетащите файл</p>
                            <p className="text-xs text-stone-400">PNG, JPG до 5 МБ</p>
                          </>
                        )}
                      </label>
                    </div>
                    <button onClick={handleReceiptUpload} disabled={!receiptFile || uploadingReceipt} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                      {uploadingReceipt ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {uploadingReceipt ? 'Загрузка...' : '✅ Отправить чек'}
                    </button>
                    <button onClick={() => setPaymentProvider(null)} className={`w-full py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textPrimary} rounded-xl font-medium`}>← Назад</button>
                  </>
                ) : (
                  <>
                    <p className={`text-sm ${textSecondary} text-center mb-4`}>Выберите удобный способ оплаты:</p>
                    <div className="space-y-3">
                      <button onClick={() => handleCoursePayment('lava')} disabled={isPaying} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">
                        {isPaying && paymentProvider === 'lava' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>🌋</span>}
                        Оплатить через Lava
                      </button>
                      <button onClick={() => handleCoursePayment('prodamus')} disabled={isPaying} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">
                        {isPaying && paymentProvider === 'prodamus' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>🟣</span>}
                        Оплатить через Prodamus
                      </button>
                      <button onClick={() => setPaymentProvider('manual')} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white border-2 border-amber-200 text-amber-700 font-bold hover:bg-amber-50 transition">
                        <span>🤝</span> Ручная оплата (Загрузить чек)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА НАЗНАЧЕНИЯ */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-lg border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Users className="w-6 h-6" /> Назначить курс</h2>
                <button onClick={() => { setShowAssignModal(null); setSelectedStudents([]); setStudentSearchQuery(""); }} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="relative">
                  <input type="text" value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} placeholder="Найти ученика по имени..." className={`w-full ${inputBg} border-2 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-violet-300 focus:outline-none`} />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {students.filter(s => (s.name || s.full_name || s.email || s.id).toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 ? (
                    <p className={`${textSecondary} italic text-center py-4`}>Ученики не найдены</p>
                  ) : (
                    students.filter(s => (s.name || s.full_name || s.email || s.id).toLowerCase().includes(studentSearchQuery.toLowerCase())).map(student => (
                      <label key={student.id} className={`flex items-center gap-3 p-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-violet-50 hover:bg-violet-100'} rounded-xl border-2 cursor-pointer transition-all`}>
                        <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedStudents([...selectedStudents, student.id]);
                          else setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        }} className="w-5 h-5 accent-violet-500" />
                        <span className={`text-sm font-bold ${textPrimary} flex-1`}>{student.name || student.full_name || student.email || student.id}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => assignCourse(showAssignModal)} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Назначить ({selectedStudents.length})
                  </button>
                  <button onClick={() => { setShowAssignModal(null); setSelectedStudents([]); setStudentSearchQuery(""); }} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ПРОГРАММЫ КУРСА */}
      <AnimatePresence>
        {showSyllabusModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSyllabusModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className={`text-2xl font-black ${textPrimary}`}>{showSyllabusModal.title}</h2>
                    <p className={`${textSecondary} mt-2`}>{showSyllabusModal.description}</p>
                  </div>
                  <button onClick={() => setShowSyllabusModal(null)} className={`${textSecondary} hover:text-rose-500 transition`}><X className="w-6 h-6" /></button>
                </div>
                <div className="flex gap-4 mt-4 text-sm flex-wrap">
                  <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-semibold">📚 {showSyllabusModal.lessons?.filter((l: any) => l.published).length || 0} уроков</span>
                  {showSyllabusModal.access_type === 'paid' && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">💰 {showSyllabusModal.price} ₽</span>}
                  {(showSyllabusModal.preview_lessons || 0) > 0 && showSyllabusModal.access_type === 'paid' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">🎁 {showSyllabusModal.preview_lessons} бесплатных</span>
                  )}
                </div>
              </div>
              <div className="p-6">
                <h3 className={`font-bold ${textPrimary} mb-4 flex items-center gap-2`}><List className="w-5 h-5" /> Программа курса</h3>
                {(!showSyllabusModal.lessons || showSyllabusModal.lessons.length === 0) ? (
                  <p className={`${textSecondary} italic`}>Программа скоро будет добавлена...</p>
                ) : (
                  <div className="space-y-2">
                    {showSyllabusModal.lessons.filter((l: any) => l.published).map((lesson: any, idx: number) => {
                      const isPreview = idx < (showSyllabusModal.preview_lessons || 0);
                      return (
                        <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isPreview ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {isPreview ? '' : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium ${textPrimary} block truncate`}>{lesson.title}</span>
                            {isPreview && <span className="text-xs text-emerald-600 font-semibold"> Бесплатный урок</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isStudent && showSyllabusModal.access_type === 'paid' && !myProgress[showSyllabusModal.id] && (
                  <button onClick={() => { setShowSyllabusModal(null); setSelectedCourseForPayment(showSyllabusModal); setShowPaymentModal(true); }} className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" /> Купить курс за {showSyllabusModal.price} ₽
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ЭКСПОРТА */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border p-6`} onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">📦</div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Экспорт курса</h2>
                <p className={`text-sm ${textSecondary} mt-2`}>Курс будет экспортирован в JSON файл</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => exportCourse(showExportModal)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" /> Экспортировать
                </button>
                <button onClick={() => setShowExportModal(null)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА УДАЛЕНИЯ */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border-2 border-rose-300 p-6`} onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">⚠️</div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Удалить курс?</h2>
                <p className={`text-sm ${textSecondary} mt-2`}>Это действие нельзя отменить. Все уроки и прогресс учеников будут потеряны.</p>
              </div>
              <div className="mb-4">
                <label className={`text-xs ${textSecondary} font-bold block mb-2`}>Введите название курса для подтверждения:</label>
                <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Название курса" className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => deleteCourse(showDeleteModal)} disabled={deleteConfirmText !== courses.find(c => c.id === showDeleteModal)?.title} className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  <Trash2 className="w-5 h-5" /> Удалить навсегда
                </button>
                <button onClick={() => { setShowDeleteModal(null); setDeleteConfirmText(""); }} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CoursesListContent />
    </Suspense>
  );
}