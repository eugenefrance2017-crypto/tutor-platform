"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  collection, addDoc, updateDoc, deleteDoc, setDoc, doc,
  query, where, onSnapshot, getDoc, getDocs
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, CheckCircle, Lock, BookOpen, Video,
  FileText, Edit, Trash2, ChevronUp, ChevronDown,
  Star, MessageCircle, Bookmark, Award,
  Sun, Moon, Send, X, Plus, Copy, Eye, EyeOff,
  Users, Check, AlertTriangle, Sparkles, Clock,
  Home, ChevronRight, Folder, Loader2, CreditCard,
  Settings, Upload, Save, Download, Target, Trophy,
  TrendingUp, Calendar, GripVertical, FolderOpen, FolderPlus
} from "lucide-react";
import jsPDF from "jspdf";

const storage = getStorage();

interface Material { id: string; type: 'video' | 'file' | 'link'; title: string; url: string; }
interface QuizQuestion { id: string; question: string; options: string[]; correct: number; explanation?: string; }
interface Homework {
  id: string; tutor_id: string; title: string; description: string;
  type: 'text' | 'single_choice' | 'multi_choice' | 'matching' | 'ordering' | 'table_fill';
  questions?: QuizQuestion[]; answer?: string; max_score?: number; created_at: string;
}
interface Lesson {
  id: string; title: string; theory: string; section: string;
  materials: Material[]; task_ids: string[]; homework_ids: string[];
  published: boolean; order: number; is_preview?: boolean;
  estimated_time?: number; pinned?: boolean;
}
interface Course {
  id: string; tutor_id: string; tutor_name?: string; title: string;
  description: string; subject: string; price: number; cover: string;
  access_type: 'free' | 'paid' | 'assigned'; lessons: Lesson[];
  sections?: string[];
  published: boolean; preview_lessons?: number; created_at: string; updated_at: string;
}
interface Profile {
  id: string; uid: string; name: string; full_name?: string; email?: string; role: 'tutor' | 'student';
  xp?: number; level?: number; streak?: number; achievements?: string[];
}
interface Progress {
  id: string; course_id: string; student_id: string;
  completed_lessons: string[]; status: 'active' | 'completed';
  payment_status: 'pending' | 'paid'; notes?: Record<string, string>;
  bookmarks?: string[]; last_lesson_id?: string; time_spent?: number;
  subscription_expires_at?: string;
}
interface Review { id: string; course_id: string; student_id: string; student_name: string; rating: number; text: string; created_at: string; }
interface LessonComment { id: string; course_id: string; lesson_id: string; student_id: string; student_name: string; text: string; created_at: string; reply?: string; reply_at?: string; }
interface Notification { id: string; user_id: string; type: string; title: string; message: string; read: boolean; created_at: string; link?: string; }
interface CourseGoal {
  id: string; course_id: string; student_id: string;
  target_score: number; exam_date: string; current_level: string;
  created_at: string; updated_at: string;
}

const SUBJECTS: Record<string, { label: string; icon: string }> = {
  chemistry: { label: "Химия", icon: "🧪" },
  biology: { label: "Биология", icon: "🧬" },
};

const HOMEWORK_TYPES = [
  { value: 'text', label: '📝 Текстовый ответ' },
  { value: 'single_choice', label: ' Один вариант' },
  { value: 'multi_choice', label: '✅ Несколько вариантов' },
  { value: 'matching', label: ' Соответствие' },
  { value: 'ordering', label: '📋 Порядок' },
  { value: 'table_fill', label: ' Таблица' },
];

const LESSON_TEMPLATES = [
  { name: ' Теория', theory: 'Вставьте теоретический материал...', materials: [], task_ids: [], homework_ids: [] },
  { name: ' Видео-урок', theory: '', materials: [{ id: 'temp', type: 'video', title: 'Видео', url: '' }], task_ids: [], homework_ids: [] },
  { name: '✍️ Практика', theory: 'Краткое введение...', materials: [], task_ids: [], homework_ids: [] },
  { name: '📝 С ДЗ', theory: 'Теория...', materials: [], task_ids: [], homework_ids: [] },
];

const ACHIEVEMENTS = [
  { id: 'first_lesson', name: 'Первый шаг', icon: '🎯', description: 'Заверши первый урок', xp: 50 },
  { id: 'five_lessons', name: 'Ученик', icon: '📚', description: 'Заверши 5 уроков', xp: 100 },
  { id: 'ten_lessons', name: 'Знаток', icon: '🎓', description: 'Заверши 10 уроков', xp: 200 },
  { id: 'course_complete', name: 'Выпускник', icon: '🏆', description: 'Заверши курс', xp: 300 },
  { id: 'streak_7', name: 'Неделя', icon: '🔥', description: '7 дней подряд', xp: 100 },
];

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const rutubePatterns = [/rutube\.ru\/video\/([a-f0-9]+)/, /rutube\.ru\/play\/embed\/([a-f0-9]+)/, /rutube\.ru\/video\/play\/embed\/([a-f0-9]+)/, /rutube\.ru\/(?:video|play)\/(?:[^\/]+\/)?([a-f0-9]+)/];
  for (const pattern of rutubePatterns) {
    const match = url.match(pattern);
    if (match) return `https://rutube.ru/play/embed/${match[1]}`;
  }
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
  return null;
}

function isDirectVideo(url: string): boolean {
  return url.match(/\.(mp4|webm|ogg)$/i) !== null;
}

function CourseViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bankTasks, setBankTasks] = useState<any[]>([]);
  const [homeworkBank, setHomeworkBank] = useState<Homework[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [allProgress, setAllProgress] = useState<Progress[]>([]);
  const [lessonComments, setLessonComments] = useState<LessonComment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editMode, setEditMode] = useState<'view' | 'edit'>('view');
  const [editTitle, setEditTitle] = useState("");
  const [editTheory, setEditTheory] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editMaterials, setEditMaterials] = useState<Material[]>([]);
  const [editTaskIds, setEditTaskIds] = useState<string[]>([]);
  const [editHomeworkIds, setEditHomeworkIds] = useState<string[]>([]);
  const [editPublished, setEditPublished] = useState(true);
  const [editIsPreview, setEditIsPreview] = useState(false);
  const [editEstimatedTime, setEditEstimatedTime] = useState(0);
  const [editPinned, setEditPinned] = useState(false);
  const [newMaterialType, setNewMaterialType] = useState<'video' | 'file' | 'link'>('link');
  const [newMaterialTitle, setNewMaterialTitle] = useState("");
  const [newMaterialUrl, setNewMaterialUrl] = useState("");
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({});
  const [currentNote, setCurrentNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'lessons' | 'students' | 'reviews' | 'analytics' | 'homework' | 'goals'>('lessons');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHomeworkBankModal, setShowHomeworkBankModal] = useState(false);
  const [showTaskBankModal, setShowTaskBankModal] = useState(false);

  const [showCreateHomeworkModal, setShowCreateHomeworkModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [newHomeworkTitle, setNewHomeworkTitle] = useState("");
  const [newHomeworkDesc, setNewHomeworkDesc] = useState("");
  const [newHomeworkType, setNewHomeworkType] = useState<Homework['type']>('text');
  const [newHomeworkAnswer, setNewHomeworkAnswer] = useState("");
  const [newHomeworkQuestions, setNewHomeworkQuestions] = useState<QuizQuestion[]>([]);

  const [showCourseSettings, setShowCourseSettings] = useState(false);
  const [courseSettingsTitle, setCourseSettingsTitle] = useState("");
  const [courseSettingsDesc, setCourseSettingsDesc] = useState("");
  const [courseSettingsPrice, setCourseSettingsPrice] = useState(0);
  const [courseSettingsSubject, setCourseSettingsSubject] = useState("chemistry");
  const [courseSettingsAccessType, setCourseSettingsAccessType] = useState<'free' | 'paid' | 'assigned'>('free');
  const [courseSettingsPreviewLessons, setCourseSettingsPreviewLessons] = useState(0);
  const [savingCourseSettings, setSavingCourseSettings] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'lava' | 'prodamus' | 'manual' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  
  // Новые стейты для оплаты
  const [paymentType, setPaymentType] = useState<'subscription' | 'lesson_pack'>('subscription');
  const [subscriptionPeriod, setSubscriptionPeriod] = useState(30);
  const [subscriptionPrice, setSubscriptionPrice] = useState(1500);
  const [lessonPackId, setLessonPackId] = useState('pack_10');
  const [lessonPackPrice, setLessonPackPrice] = useState(5000);
  const [lessonPackCount, setLessonPackCount] = useState(10);

  const [savingLesson, setSavingLesson] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [courseGoal, setCourseGoal] = useState<CourseGoal | null>(null);
  const [goalTargetScore, setGoalTargetScore] = useState(80);
  const [goalExamDate, setGoalExamDate] = useState("");
  const [goalCurrentLevel, setGoalCurrentLevel] = useState("50");

  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");

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
    if (!courseId) return;
    const unsub = onSnapshot(doc(db, "courses", courseId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const lessons = (data.lessons || []).map((l: any) => ({
          ...l,
          homework_ids: l.homework_ids || l.homeworkIds || [],
          task_ids: l.task_ids || [],
        }));
        setCourse({ id: snap.id, ...data, lessons, sections: data.sections || [] } as Course);
        setLoading(false);
      } else {
        toast.error("Курс не найден");
        setLoading(false);
      }
    });
    return () => unsub();
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !user || !course) return;
    const unsub1 = onSnapshot(
      query(collection(db, "course_progress"), where("course_id", "==", courseId), where("student_id", "==", user.uid)),
      (snap) => {
        if (snap.docs.length > 0) {
          const prog = { id: snap.docs[0].id, ...snap.docs[0].data() } as Progress;
          setProgress(prog);
          setLessonNotes(prog.notes || {});
        } else setProgress(null);
      }
    );
    const unsub2 = onSnapshot(query(collection(db, "course_reviews"), where("course_id", "==", courseId)), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });
    const unsub3 = onSnapshot(query(collection(db, "notifications"), where("user_id", "==", user.uid)), (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    });

    (async () => {
      const tutorId = course.tutor_id;
      try {
        const [s1, s2] = await Promise.all([
          getDocs(query(collection(db, "homeworks"), where("tutor_id", "==", tutorId))),
          getDocs(query(collection(db, "homework_bank"), where("tutor_id", "==", tutorId))),
        ]);
        const all = [...s1.docs.map(d => ({ id: d.id, ...d.data() })), ...s2.docs.map(d => ({ id: d.id, ...d.data() }))];
        setHomeworkBank(all as Homework[]);
      } catch (e) { console.error('❌ Homework load error:', e); }
    })();

    const unsubBank = onSnapshot(
      query(collection(db, "tasks_bank"), where("tutor_id", "==", course.tutor_id)),
      (snap) => setBankTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    
    return () => { unsub1(); unsub2(); unsub3(); unsubBank(); };
  }, [courseId, user, course]);

  useEffect(() => {
    if (!course || !user) return;
    const goalId = `${course.id}_${user.uid}`;
    const unsub = onSnapshot(doc(db, "course_goals", goalId), (snap) => {
      if (snap.exists()) {
        setCourseGoal({ id: snap.id, ...snap.data() } as CourseGoal);
      } else {
        setCourseGoal(null);
      }
    });
    return () => unsub();
  }, [course, user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, "profiles"), where("role", "==", "student")),
      (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Profile)))
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!viewingLesson) return;
    const unsub = onSnapshot(
      query(collection(db, "lesson_comments"), where("course_id", "==", courseId), where("lesson_id", "==", viewingLesson.id)),
      (snap) => setLessonComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as LessonComment)))
    );
    return () => unsub();
  }, [viewingLesson, courseId]);

  useEffect(() => {
    if (!courseId) return;
    const u2 = onSnapshot(
      query(collection(db, "course_progress"), where("course_id", "==", courseId)),
      (s) => setAllProgress(s.docs.map(d => ({ id: d.id, ...d.data() } as Progress)))
    );
    return () => u2();
  }, [courseId]);

  useEffect(() => {
    if (!course || loading || !user || profile?.role !== "student") return;
    if (course.access_type === "free" && !progress) {
      addDoc(collection(db, "course_progress"), {
        course_id: courseId, student_id: user.uid, assigned_at: new Date().toISOString(),
        status: "active", payment_status: "paid", completed_lessons: [], notes: {}, bookmarks: [], time_spent: 0,
      }).catch(e => toast.error("Ошибка: " + e.message));
    }
  }, [course, loading, user, profile, progress, courseId]);

  useEffect(() => {
    if (!viewingLesson || !lessonStartTime) return;
    const i = setInterval(() => setElapsedTime(Math.floor((Date.now() - lessonStartTime) / 1000)), 1000);
    return () => clearInterval(i);
  }, [viewingLesson, lessonStartTime]);

  const addSection = async () => {
    if (!newSectionName.trim()) { toast.error("Введите название раздела"); return; }
    if (!course) return;
    const newSections = [...(course.sections || []), newSectionName.trim()];
    try {
      await updateDoc(doc(db, "courses", courseId), { sections: newSections });
      toast.success("📂 Раздел добавлен!");
      setNewSectionName("");
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
  };

  const deleteSection = async (index: number) => {
    if (!course) return;
    const sectionName = course.sections?.[index];
    if (!sectionName) return;
    const lessonsInSection = course.lessons.filter(l => l.section === sectionName);
    if (lessonsInSection.length > 0) {
      if (!confirm(`В разделе "${sectionName}" есть ${lessonsInSection.length} урок(ов). Удалить раздел? Уроки останутся без раздела.`)) return;
    }
    const newSections = course.sections?.filter((_, i) => i !== index) || [];
    try {
      await updateDoc(doc(db, "courses", courseId), { sections: newSections });
      toast.success("🗑️ Раздел удалён");
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
  };

  const startEditSection = (index: number) => {
    setEditingSectionIndex(index);
    setEditingSectionName(course?.sections?.[index] || "");
  };

  const saveEditSection = async () => {
    if (!course || editingSectionIndex === null) return;
    if (!editingSectionName.trim()) { toast.error("Введите название раздела"); return; }
    const oldName = course.sections?.[editingSectionIndex];
    const newSections = [...(course.sections || [])];
    newSections[editingSectionIndex] = editingSectionName.trim();
    const updatedLessons = course.lessons.map(l => 
      l.section === oldName ? { ...l, section: editingSectionName.trim() } : l
    );
    try {
      await updateDoc(doc(db, "courses", courseId), { sections: newSections, lessons: updatedLessons });
      toast.success("✏️ Раздел переименован");
      setEditingSectionIndex(null);
      setEditingSectionName("");
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
  };

  const generateCertificate = () => {
    if (!course || !progress || !profile) return;
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setDrawColor(220, 38, 38);
      pdf.setLineWidth(2);
      pdf.rect(10, 10, pageWidth - 20, 277);
      pdf.setLineWidth(0.5);
      pdf.rect(15, 15, pageWidth - 30, 267);
      pdf.setFontSize(36);
      pdf.setTextColor(220, 38, 38);
      pdf.text("СЕРТИФИКАТ", pageWidth / 2, 45, { align: "center" });
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text("о прохождении курса", pageWidth / 2, 60, { align: "center" });
      pdf.setDrawColor(220, 38, 38);
      pdf.setLineWidth(1);
      pdf.line(40, 70, pageWidth - 40, 70);
      pdf.setFontSize(28);
      pdf.setTextColor(0, 0, 0);
      pdf.text(profile.name || profile.full_name || "Ученик", pageWidth / 2, 95, { align: "center" });
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text("успешно завершил(а) курс", pageWidth / 2, 110, { align: "center" });
      pdf.setFontSize(18);
      pdf.setTextColor(220, 38, 38);
      const titleLines = pdf.splitTextToSize(course.title, pageWidth - 60);
      pdf.text(titleLines, pageWidth / 2, 125, { align: "center" });
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      const statsY = 160;
      pdf.text(`Количество уроков: ${totalLessons}`, pageWidth / 2, statsY, { align: "center" });
      pdf.text(`Дата завершения: ${new Date().toLocaleDateString('ru-RU')}`, pageWidth / 2, statsY + 10, { align: "center" });
      if (progress.time_spent) {
        const hours = Math.floor(progress.time_spent / 3600);
        const minutes = Math.floor((progress.time_spent % 3600) / 60);
        pdf.text(`Время обучения: ${hours}ч ${minutes}мин`, pageWidth / 2, statsY + 20, { align: "center" });
      }
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Преподаватель:", 40, 220);
      pdf.setFontSize(14);
      pdf.text(course.tutor_name || "Репетитор", 40, 230);
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.3);
      pdf.line(40, 235, 120, 235);
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`ID курса: ${course.id}`, pageWidth / 2, 270, { align: "center" });
      pdf.text(`Выдано: ${new Date().toLocaleString('ru-RU')}`, pageWidth / 2, 277, { align: "center" });
      pdf.save(`Сертификат_${course.title.replace(/\s+/g, '_')}_${(profile.name || 'Ученик').replace(/\s+/g, '_')}.pdf`);
      toast.success("🏆 Сертификат скачан!");
    } catch (error: any) { toast.error("Ошибка генерации: " + error.message); }
  };

  const calculatePredictedScore = (): number | null => {
    if (!courseGoal || !progress) return null;
    const completionRate = progressPercent / 100;
    const baseScore = parseInt(courseGoal.current_level) || 50;
    const targetScore = courseGoal.target_score;
    const predicted = Math.round(baseScore + (targetScore - baseScore) * completionRate);
    return Math.min(100, Math.max(0, predicted));
  };

  const saveGoal = async () => {
    if (!course || !user || !goalTargetScore) { toast.error("Укажите целевой балл"); return; }
    try {
      await setDoc(doc(db, "course_goals", `${course.id}_${user.uid}`), {
        course_id: course.id, student_id: user.uid,
        target_score: goalTargetScore, exam_date: goalExamDate,
        current_level: goalCurrentLevel,
        created_at: courseGoal?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.success("🎯 Цель сохранена!");
      setShowGoalModal(false);
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
  };

  const deleteGoal = async () => {
    if (!course || !user) return;
    if (!confirm("Удалить цель?")) return;
    try {
      await deleteDoc(doc(db, "course_goals", `${course.id}_${user.uid}`));
      toast.success("🗑️ Цель удалена");
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
  };

  const handlePayment = async (provider: 'lava' | 'prodamus' | 'manual') => {
    if (!course || !user) return;
    if (provider === 'manual') { setPaymentProvider('manual'); return; }
    setIsPaying(true);
    setPaymentProvider(provider);
    try {
      const orderId = `${paymentType}_${user.uid}_${Date.now()}`;
      const endpoint = provider === 'lava' ? '/api/payments/lava/create' : '/api/payments/prodamus/create';
      const paymentData = {
        amount: paymentType === 'subscription' ? subscriptionPrice : lessonPackPrice,
        orderId,
        description: paymentType === 'subscription' 
          ? `Подписка на курс "${course.title}" на ${subscriptionPeriod} дней`
          : `Пакет ${lessonPackCount} индивидуальных занятий`,
        studentId: user.uid,
        tutorId: course.tutor_id,
        payment_type: paymentType,
        item_id: paymentType === 'subscription' ? course.id : lessonPackId,
        duration_days: paymentType === 'subscription' ? subscriptionPeriod : undefined
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
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
    if (!receiptFile || !course || !user) return;
    setUploadingReceipt(true);
    try {
      const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`);
      await uploadBytes(storageRef, receiptFile);
      const downloadURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, "payment_requests"), {
        student_id: user.uid, tutor_id: course.tutor_id,
        item_id: course.id, item_type: "course", item_name: course.title,
        amount: paymentType === 'subscription' ? subscriptionPrice : lessonPackPrice,
        receipt_url: downloadURL,
        status: "pending", created_at: new Date().toISOString(),
      });
      toast.success("✅ Чек загружен! Репетитор проверит и откроет доступ.");
      setShowPaymentModal(false);
      setReceiptFile(null);
      setPaymentProvider(null);
    } catch (error: any) { toast.error("Ошибка загрузки: " + error.message); }
    finally { setUploadingReceipt(false); }
  };

  const openCourseSettings = () => {
    if (!course) return;
    setCourseSettingsTitle(course.title);
    setCourseSettingsDesc(course.description);
    setCourseSettingsPrice(course.price);
    setCourseSettingsSubject(course.subject);
    setCourseSettingsAccessType(course.access_type);
    setCourseSettingsPreviewLessons(course.preview_lessons || 0);
    setShowCourseSettings(true);
  };

  const saveCourseSettings = async () => {
    if (!course || !courseSettingsTitle.trim()) { toast.error("Введите название курса"); return; }
    setSavingCourseSettings(true);
    try {
      await updateDoc(doc(db, "courses", course.id), {
        title: courseSettingsTitle.trim(), description: courseSettingsDesc.trim(),
        price: courseSettingsPrice, subject: courseSettingsSubject,
        access_type: courseSettingsAccessType, preview_lessons: courseSettingsPreviewLessons,
        updated_at: new Date().toISOString(),
      });
      toast.success("✅ Настройки курса сохранены!");
      setShowCourseSettings(false);
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
    finally { setSavingCourseSettings(false); }
  };

  const uid = user?.uid || searchParams.get("uid") || "";
  const role = profile?.role || "student";
  const isTutor = role === "tutor";
  const isStudent = role === "student";

  const sortedLessons = useMemo(() => {
    if (!course) return [];
    const pinned = course.lessons.filter(l => l.pinned).sort((a, b) => a.order - b.order);
    const unpinned = course.lessons.filter(l => !l.pinned).sort((a, b) => a.order - b.order);
    return [...pinned, ...unpinned];
  }, [course]);

  const groupedLessons = useMemo(() => {
    const groups: Record<string, Lesson[]> = {};
    sortedLessons.forEach(l => {
      const s = l.section || "Без раздела";
      if (!groups[s]) groups[s] = [];
      groups[s].push(l);
    });
    return groups;
  }, [sortedLessons]);

  const completedLessons = progress?.completed_lessons || [];
  const totalLessons = sortedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
  const isCourseCompleted = completedLessons.length >= totalLessons && totalLessons > 0;
  const avgRating = reviews.length > 0 ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const hasCourseAccess = isTutor || course?.access_type === 'free' || (progress && progress.payment_status === 'paid');
  const predictedScore = calculatePredictedScore();

  const isLessonPreview = (lesson: Lesson, idx: number) => {
    if (course?.access_type === "free") return false;
    if (lesson.is_preview) return true;
    if (course?.preview_lessons && idx < course.preview_lessons) return true;
    return false;
  };

  const isLessonLocked = (lesson: Lesson, idx: number) => {
    if (isTutor) return false;
    if (isLessonPreview(lesson, idx)) return false;
    if (hasCourseAccess) return false;
    if (idx === 0) return false;
    const prev = sortedLessons[idx - 1];
    return !completedLessons.includes(prev.id);
  };

  async function addXP(amount: number, achievementId?: string) {
    if (!user || !profile) return;
    const ref = doc(db, "profiles", user.uid);
    const currentXP = profile.xp || 0;
    const newXP = currentXP + amount;
    const updates: any = { xp: newXP, level: Math.floor(newXP / 500) + 1, last_activity: new Date().toISOString() };
    if (achievementId) {
      const ach = profile.achievements || [];
      if (!ach.includes(achievementId)) updates.achievements = [...ach, achievementId];
    }
    await updateDoc(ref, updates);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    setXpGained(amount);
    setShowXpPopup(true);
    setTimeout(() => setShowXpPopup(false), 3000);
  }

  function openLesson(lesson: Lesson) {
    setViewingLesson(lesson);
    setCurrentNote(lessonNotes[lesson.id] || "");
    setVideoSpeed(1);
    setLessonStartTime(Date.now());
    setElapsedTime(0);
    setShowLessonModal(true);
    setEditMode('view');
    if (progress) updateDoc(doc(db, "course_progress", progress.id), { last_lesson_id: lesson.id }).catch(() => {});
  }

  async function addLesson() {
    if (!course) return;
    const maxOrder = course.lessons.length > 0 ? Math.max(...course.lessons.map(l => l.order || 0)) : 0;
    const newLesson: Lesson = {
      id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: "", theory: "", section: course.sections?.[0] || "Введение",
      materials: [], task_ids: [], homework_ids: [],
      published: false, is_preview: false, order: maxOrder + 1,
      estimated_time: 15, pinned: false,
    };
    const updated = [...course.lessons, newLesson];
    await setDoc(doc(db, "courses", courseId), { lessons: updated }, { merge: true });
    toast.success("✨ Урок создан! Заполните данные.");
    setCourse({ ...course, lessons: updated });
    openLessonEditor(newLesson);
  }

  function openLessonEditor(lesson: Lesson) {
    setViewingLesson(lesson);
    setEditTitle(lesson.title);
    setEditTheory(lesson.theory);
    setEditSection(lesson.section || "");
    setEditMaterials(lesson.materials || []);
    setEditTaskIds(lesson.task_ids || []);
    setEditHomeworkIds(lesson.homework_ids || []);
    setEditPublished(lesson.published !== false);
    setEditIsPreview(lesson.is_preview || false);
    setEditEstimatedTime(lesson.estimated_time || 15);
    setEditPinned(lesson.pinned || false);
    setEditMode('edit');
    setHasUnsavedChanges(false);
    setShowLessonModal(true);
  }

  async function saveLessonEdit() {
    if (!editTitle.trim()) { toast.error("Введите название урока"); return; }
    setSavingLesson(true);
    try {
      const updated = course!.lessons.map(l =>
        l.id === viewingLesson?.id ? { 
          ...l, title: editTitle.trim(), theory: editTheory.trim(), section: editSection.trim(), 
          materials: editMaterials, task_ids: editTaskIds, homework_ids: editHomeworkIds, 
          published: editPublished, is_preview: editIsPreview,
          estimated_time: editEstimatedTime, pinned: editPinned, order: l.order,
        } : l
      );
      await setDoc(doc(db, "courses", courseId), { lessons: updated }, { merge: true });
      toast.success("✨ Урок сохранен!");
      setEditMode('view');
      setHasUnsavedChanges(false);
      setCourse({ ...course!, lessons: updated });
    } catch (error: any) { toast.error("Ошибка сохранения: " + error.message); }
    finally { setSavingLesson(false); }
  }

  async function deleteLesson(id: string) {
    if (!confirm("Удалить урок? Это действие нельзя отменить.")) return;
    const updated = course!.lessons.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
    await setDoc(doc(db, "courses", courseId), { lessons: updated }, { merge: true });
    toast.success("🗑️ Урок удалён");
    setCourse({ ...course!, lessons: updated });
    setShowLessonModal(false);
  }

  async function moveLesson(id: string, dir: 1 | -1) {
    const idx = sortedLessons.findIndex(l => l.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sortedLessons.length) return;
    const newLessons = [...course!.lessons];
    const temp = newLessons.find(l => l.id === id)!.order;
    newLessons.find(l => l.id === id)!.order = newLessons.find(l => l.id === sortedLessons[newIdx].id)!.order;
    newLessons.find(l => l.id === sortedLessons[newIdx].id)!.order = temp;
    await setDoc(doc(db, "courses", courseId), { lessons: newLessons }, { merge: true });
    setCourse({ ...course!, lessons: newLessons });
    toast.success(`🔄 Урок перемещён`);
  }

  async function togglePin(id: string) {
    const newLessons = course!.lessons.map(l => l.id === id ? { ...l, pinned: !l.pinned } : l);
    await setDoc(doc(db, "courses", courseId), { lessons: newLessons }, { merge: true });
    setCourse({ ...course!, lessons: newLessons });
    const lesson = course!.lessons.find(l => l.id === id);
    toast.success(lesson?.pinned ? "📌 Урок откреплён" : "📌 Урок закреплён");
  }

  function addMaterial() {
    if (!newMaterialTitle.trim() || !newMaterialUrl.trim()) { toast.error("Заполните название и URL"); return; }
    setEditMaterials([...editMaterials, { id: `mat_${Date.now()}`, type: newMaterialType, title: newMaterialTitle.trim(), url: newMaterialUrl.trim() }]);
    setNewMaterialTitle(""); setNewMaterialUrl("");
    setHasUnsavedChanges(true);
  }

  async function completeLesson(id: string) {
    console.log('🎯 completeLesson вызвана с id:', id);
    const lesson = course?.lessons.find(l => l.id === id);
    if (!lesson) { toast.error("Урок не найден"); return; }
    const lessonIndex = sortedLessons.findIndex(l => l.id === id);
    const isPreviewLesson = isLessonPreview(lesson, lessonIndex);
    
    if (!isPreviewLesson && !hasCourseAccess) { toast.error("Сначала оплатите курс"); return; }
    if (course?.preview_lessons && course.preview_lessons > 0 && !isPreviewLesson) {
      const freeLessonsCount = course.preview_lessons;
      const completedFreeLessons = completedLessons.filter(lid => {
        const idx = sortedLessons.findIndex(l => l.id === lid);
        return idx < freeLessonsCount;
      }).length;
      if (completedFreeLessons < freeLessonsCount) { toast.error(`Сначала просмотрите все ${freeLessonsCount} бесплатных уроков`); return; }
    }
    
    let currentProgress = progress;
    if (!currentProgress && user && course) {
      try {
        const newProgressRef = await addDoc(collection(db, "course_progress"), {
          course_id: courseId, student_id: user.uid, completed_lessons: [],
          status: "active", payment_status: course.access_type === "free" ? "paid" : "pending",
          assigned_at: new Date().toISOString(), notes: {}, bookmarks: [], time_spent: 0,
        });
        currentProgress = {
          id: newProgressRef.id, course_id: courseId, student_id: user.uid,
          completed_lessons: [], status: "active",
          payment_status: course.access_type === "free" ? "paid" : "pending",
          assigned_at: new Date().toISOString(), notes: {}, bookmarks: [], time_spent: 0,
        };
        setProgress(currentProgress);
        toast.success("Создана запись о прогрессе");
      } catch (error: any) { toast.error("Ошибка создания прогресса: " + error.message); return; }
    }
    
    if (!currentProgress) { toast.error("Ошибка: нет данных о прогрессе"); return; }
    if (completedLessons.includes(id)) { toast.success("Урок уже завершён!"); return; }
    
    try {
      const newCompleted = [...completedLessons, id];
      await updateDoc(doc(db, "course_progress", currentProgress.id), {
        completed_lessons: newCompleted,
        last_activity: new Date().toISOString(),
        time_spent: (currentProgress.time_spent || 0) + elapsedTime,
      });
      toast.success("Урок завершён!");
      await addXP(50);
      if (newCompleted.length === 1) await addXP(50, 'first_lesson');
      if (newCompleted.length === 5) await addXP(100, 'five_lessons');
      if (newCompleted.length === 10) await addXP(200, 'ten_lessons');
      if (newCompleted.length >= totalLessons) { toast.success("🏆 Курс пройден!"); await addXP(300, 'course_complete'); }
      setShowLessonModal(false);
    } catch (error: any) { toast.error("Ошибка: " + error.message); }
  }

  async function saveNote() {
    if (!viewingLesson || !progress) return;
    const newNotes = { ...lessonNotes, [viewingLesson.id]: currentNote };
    await updateDoc(doc(db, "course_progress", progress.id), { notes: newNotes });
    setLessonNotes(newNotes);
    toast.success(" Заметка сохранена!");
  }

  async function toggleBookmark(id: string) {
    if (!progress) return;
    const bookmarks = progress.bookmarks || [];
    const newBookmarks = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
    await updateDoc(doc(db, "course_progress", progress.id), { bookmarks: newBookmarks });
    setProgress({ ...progress, bookmarks: newBookmarks });
    toast.success(bookmarks.includes(id) ? "🔖 Удалено из закладок" : "🔖 Добавлено в закладки");
  }

  async function addComment() {
    if (!viewingLesson || !newComment.trim()) return;
    await addDoc(collection(db, "lesson_comments"), {
      course_id: courseId, lesson_id: viewingLesson.id, student_id: uid,
      student_name: profile?.name || profile?.full_name || "Ученик", text: newComment.trim(), created_at: new Date().toISOString(),
    });
    setNewComment("");
    toast.success("💬 Вопрос отправлен!");
    if (isStudent && course) {
      await addDoc(collection(db, "notifications"), {
        user_id: course.tutor_id, type: 'comment', title: 'Новый вопрос',
        message: `${profile?.name || profile?.full_name} задал вопрос в "${viewingLesson.title}"`,
        read: false, created_at: new Date().toISOString(), link: `/courses/${courseId}`,
      });
    }
  }

  async function replyToComment(id: string, text: string) {
    await updateDoc(doc(db, "lesson_comments", id), { reply: text, reply_at: new Date().toISOString() });
    toast.success("💬 Ответ отправлен!");
  }

  async function createHomework() {
    if (!newHomeworkTitle.trim()) { toast.error("Введите название"); return; }
    const data: any = {
      tutor_id: course!.tutor_id, title: newHomeworkTitle.trim(), description: newHomeworkDesc.trim(),
      type: newHomeworkType, answer: newHomeworkAnswer.trim(), created_at: new Date().toISOString(),
    };
    if (newHomeworkQuestions.length > 0) data.questions = newHomeworkQuestions;
    if (editingHomework) {
      await updateDoc(doc(db, "homework_bank", editingHomework.id), { ...data, updated_at: new Date().toISOString() });
      toast.success("✨ ДЗ обновлено!");
    } else {
      await addDoc(collection(db, "homework_bank"), data);
      toast.success("✅ ДЗ создано!");
    }
    setShowCreateHomeworkModal(false);
    setEditingHomework(null);
    setNewHomeworkTitle(""); setNewHomeworkDesc(""); setNewHomeworkAnswer("");
    setNewHomeworkQuestions([]); setNewHomeworkType('text');
  }

  function addQuizQuestion() {
    setNewHomeworkQuestions([...newHomeworkQuestions, { id: `q_${Date.now()}`, question: "", options: ["", "", "", ""], correct: 0 }]);
  }

  function updateQuizQuestion(idx: number, field: keyof QuizQuestion, value: any) {
    const updated = [...newHomeworkQuestions];
    updated[idx] = { ...updated[idx], [field]: value };
    setNewHomeworkQuestions(updated);
  }

  async function deleteHomework(hwId: string) {
    if (!confirm("Удалить ДЗ?")) return;
    try { await deleteDoc(doc(db, "homework_bank", hwId)); } catch {}
    try { await deleteDoc(doc(db, "homeworks", hwId)); } catch {}
    toast.success("🗑️ Удалено");
  }

  async function bulkUpdateLessons(action: string) {
    if (selectedLessons.length === 0) { toast.error("Выберите уроки"); return; }
    const updated = course!.lessons.map(l => {
      if (selectedLessons.includes(l.id)) {
        if (action === 'publish') return { ...l, published: true };
        if (action === 'unpublish') return { ...l, published: false };
        if (action === 'preview') return { ...l, is_preview: true };
        if (action === 'unpreview') return { ...l, is_preview: false };
      }
      return l;
    });
    await setDoc(doc(db, "courses", courseId), { lessons: updated }, { merge: true });
    setCourse({ ...course!, lessons: updated });
    setSelectedLessons([]);
    setShowBulkModal(false);
    toast.success(`✨ Обновлено ${selectedLessons.length} уроков`);
  }

  const bg = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-rose-50 via-white to-pink-50';
  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-900';

  if (loadingAuth || loading) {
    return (<div className={`min-h-screen ${bg} flex items-center justify-center`}><div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>);
  }
  if (!course) return null;

  const continueLesson = progress?.last_lesson_id ? sortedLessons.find(l => l.id === progress.last_lesson_id) : sortedLessons[0];
  const subjectInfo = SUBJECTS[course.subject] || SUBJECTS.chemistry;

  return (
      <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <Toaster position="top-right" />
      {showXpPopup && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-20 right-4 z-[9999] bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold">
          +{xpGained} XP ⭐
        </motion.div>
      )}
      <div className="max-w-7xl mx-auto p-6">
        <motion.nav initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center gap-2 text-sm ${textSecondary} mb-6`}>
          <Link href={`/courses?uid=${uid}&role=${role}`} className="flex items-center gap-2 hover:text-rose-500 transition">
            <ArrowLeft className="w-4 h-4" /><span>Курсы</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className={textPrimary}>{course.title}</span>
        </motion.nav>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600'} mb-2`}>{course.title}</h1>
            <p className={textSecondary}>{course.description || "Без описания"}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-2xl ${darkMode ? 'bg-gray-800 text-yellow-400 border-gray-700' : 'bg-white text-gray-600 border-gray-100'} border shadow-sm`}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isTutor && (
              <button onClick={openCourseSettings} className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:scale-105 transition" title="Настройки курса">
                <Settings className="w-5 h-5" />
              </button>
            )}
            {isStudent && profile && (
              <div className={`flex items-center gap-3 ${cardBg} px-4 py-2 rounded-2xl border shadow-sm`}>
                <span className={`text-sm font-semibold ${textPrimary}`}>⭐ {profile.xp || 0} XP</span>
                <span className={`text-sm font-semibold ${textPrimary}`}>🎯 Ур. {profile.level || 1}</span>
                <button onClick={() => setShowAchievements(true)} className="text-rose-500"><Award className="w-5 h-5" /></button>
              </div>
            )}
            {isTutor && (
              <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2.5 rounded-2xl ${cardBg} border shadow-sm`}>
                <MessageCircle className="w-5 h-5" />
                {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadNotifications}</span>}
              </button>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-3xl p-6 border shadow-sm mb-6`}>
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-3 py-1.5 ${darkMode ? 'bg-gray-700' : 'bg-rose-100'} rounded-full text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-rose-700'}`}>
              {subjectInfo.icon} {subjectInfo.label}
            </span>
            {reviews.length > 0 && (
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-4 h-4 fill-amber-500" /> {avgRating} ({reviews.length})
              </span>
            )}
            <span className={`text-xs ${textSecondary}`}>📚 {totalLessons} уроков</span>
            {course.access_type === 'free' && <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-bold">Бесплатно</span>}
            {course.access_type === 'paid' && <span className="px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-bold">{course.price} ₽</span>}
          </div>

          {course.access_type === 'paid' && course.preview_lessons && course.preview_lessons > 0 && (
            <div className="mt-3 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <p className="text-sm text-emerald-700 font-semibold flex items-center gap-2">
                🎁 Первые {course.preview_lessons} {course.preview_lessons === 1 ? 'урок доступен' : 'урока доступны'} бесплатно!
              </p>
            </div>
          )}

          {isStudent && !hasCourseAccess && course.access_type === 'paid' && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
              {course.preview_lessons && course.preview_lessons > 0 ? (
                completedLessons.length < course.preview_lessons ? (
                  <div className="text-center">
                    <p className="text-sm text-amber-800 font-semibold mb-3">
                      🎁 Сначала посмотрите {course.preview_lessons} бесплатный {course.preview_lessons === 1 ? 'урок' : course.preview_lessons < 5 ? 'урока' : 'уроков'}
                    </p>
                    <p className="text-xs text-amber-600 mb-3">Пройдено: {completedLessons.length} из {course.preview_lessons}</p>
                    <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(completedLessons.length / course.preview_lessons) * 100}%` }} />
                    </div>
                    <button 
                      onClick={() => {
                        const freeLessons = sortedLessons.slice(0, course.preview_lessons);
                        const nextFreeLesson = freeLessons.find(l => !completedLessons.includes(l.id));
                        if (nextFreeLesson) openLesson(nextFreeLesson);
                      }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" /> Смотреть бесплатный урок
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-amber-800 font-semibold mb-3">✅ Вы просмотрели все бесплатные уроки!</p>
                    <p className="text-xs text-amber-600 mb-3">Для полного доступа необходимо оплатить курс</p>
                    <button onClick={() => setShowPaymentModal(true)} className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2">
                      <CreditCard className="w-5 h-5" /> Купить курс за {course.price} ₽
                    </button>
                  </>
                )
              ) : (
                <>
                  <p className="text-sm text-amber-800 font-semibold mb-3"> Для полного доступа к курсу необходимо оплатить</p>
                  <button onClick={() => setShowPaymentModal(true)} className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" /> Купить курс за {course.price} ₽
                  </button>
                </>
              )}
            </div>
          )}

          {isStudent && hasCourseAccess && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold ${textPrimary}`}>Ваш прогресс</span>
                <span className="text-sm font-bold text-rose-600">{progressPercent}%</span>
              </div>
              <div className={`w-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                <div className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className={`text-xs ${textSecondary} mt-1`}>{completedLessons.length} из {totalLessons} уроков {isCourseCompleted && "• 🏆 Завершён"}</p>
              {continueLesson && !isCourseCompleted && (
                <button onClick={() => openLesson(continueLesson)} className="mt-3 w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:scale-[1.02] transition flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" /> Продолжить с урока "{continueLesson.title}"
                </button>
              )}
            </div>
          )}
        </motion.div>

        <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
          {[
            { id: 'lessons', label: '📚 Уроки' },
            ...(isStudent ? [{ id: 'goals', label: '🎯 Цели' }] : []),
            ...(isTutor ? [
              { id: 'students', label: '👥 Ученики' },
              { id: 'analytics', label: '📊 Аналитика' },
              { id: 'homework', label: `📝 ДЗ (${homeworkBank.length})` },
            ] : []),
            { id: 'reviews', label: `⭐ Отзывы (${reviews.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap ${activeTab === tab.id ? 'text-rose-600 border-b-2 border-rose-600' : `${textSecondary} hover:text-rose-600`}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'lessons' && (
          <div className="space-y-6">
            {isTutor && editMode === 'view' && (
              <div className="flex gap-3 flex-wrap">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={addLesson} className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Добавить урок
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowSectionsModal(true)} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" /> Разделы ({course.sections?.length || 0})
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowBulkModal(true)} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Массовые операции
                </motion.button>
              </div>
            )}

            {Object.entries(groupedLessons).map(([section, lessons]) => (
              <div key={section}>
                <h3 className={`text-sm font-bold ${textPrimary} mb-3 pb-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-2`}>
                  <Folder className="w-4 h-4" /> {section}
                  <span className={`text-xs ${textSecondary} font-normal`}>({lessons.length} {lessons.length === 1 ? 'урок' : lessons.length < 5 ? 'урока' : 'уроков'})</span>
                </h3>
                <div className="space-y-3">
                  {lessons.map((lesson, idx) => {
                    const globalIdx = sortedLessons.findIndex(l => l.id === lesson.id);
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isLocked = isLessonLocked(lesson, globalIdx);
                    const isBookmarked = progress?.bookmarks?.includes(lesson.id);
                    const isPreview = isLessonPreview(lesson, globalIdx);
                    const isPinned = lesson.pinned;
                    return (
                      <motion.div key={lesson.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className={`${cardBg} rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-4 ${isPreview ? 'border-emerald-300 bg-emerald-50/50' : isLocked ? 'opacity-60' : ''} ${isPinned ? 'ring-2 ring-amber-300' : ''}`}>
                        {isTutor && editMode === 'view' && (
                          <input type="checkbox" checked={selectedLessons.includes(lesson.id)} onChange={(e) => setSelectedLessons(e.target.checked ? [...selectedLessons, lesson.id] : selectedLessons.filter(id => id !== lesson.id))} className="w-5 h-5 accent-rose-500" />
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${isCompleted ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white' : isPreview ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white' : isLocked ? `${darkMode ? 'bg-gray-700' : 'bg-gray-300'} text-white` : 'bg-gradient-to-br from-rose-400 to-pink-600 text-white'}`}>
                          {isCompleted ? <Check className="w-6 h-6" /> : isPreview ? <span className="text-xl">🎁</span> : isLocked ? <Lock className="w-5 h-5" /> : <span>{globalIdx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-bold ${textPrimary} flex items-center gap-2 flex-wrap`}>
                            <span className={`text-xs ${textSecondary} font-mono`}>#{globalIdx + 1}</span>
                            {isPinned && <span className="text-amber-500">📌</span>}
                            {lesson.title || "Без названия"}
                            {isPreview && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold"> Бесплатно</span>}
                            {!isPreview && !isCompleted && !isLocked && course.access_type === 'paid' && !hasCourseAccess && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold"> Платный</span>}
                            {isBookmarked && <Bookmark className="w-4 h-4 text-blue-500 fill-blue-500" />}
                          </h4>
                          <div className="flex gap-2 mt-1 text-[10px] flex-wrap">
                            {lesson.estimated_time && <span className="text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.estimated_time} мин</span>}
                            {lesson.task_ids?.length > 0 && <span className="text-blue-500">📋 {lesson.task_ids.length} заданий</span>}
                            {lesson.homework_ids?.length > 0 && <span className="text-purple-500">📝 {lesson.homework_ids.length} ДЗ</span>}
                            {lesson.materials?.length > 0 && <span className="text-rose-500">📎 {lesson.materials.length} материалов</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {isStudent && !isLocked && (
                            <button onClick={() => toggleBookmark(lesson.id)} className={`p-2 rounded-lg ${isBookmarked ? 'bg-blue-100 text-blue-600' : `${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary}`}`} title="В закладки">
                              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-500' : ''}`} />
                            </button>
                          )}
                          {isTutor && editMode === 'view' && (
                            <>
                              <button onClick={() => togglePin(lesson.id)} className={`p-2 ${isPinned ? 'bg-amber-100 text-amber-600' : `${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary}`} rounded-lg hover:bg-amber-100 hover:text-amber-600 transition`} title="Закрепить">📌</button>
                              <button onClick={() => openLessonEditor(lesson)} className={`p-2 ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-lg`} title="Редактировать"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => moveLesson(lesson.id, -1)} disabled={globalIdx === 0} className={`p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary} rounded-lg disabled:opacity-30 hover:bg-violet-100 hover:text-violet-600 transition`} title="Вверх"><ChevronUp className="w-4 h-4" /></button>
                              <button onClick={() => moveLesson(lesson.id, 1)} disabled={globalIdx === sortedLessons.length - 1} className={`p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary} rounded-lg disabled:opacity-30 hover:bg-violet-100 hover:text-violet-600 transition`} title="Вниз"><ChevronDown className="w-4 h-4" /></button>
                              <button onClick={() => deleteLesson(lesson.id)} className={`p-2 ${darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'} rounded-lg hover:bg-rose-100 transition`} title="Удалить"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                          {!isLocked && (
                            <button onClick={() => openLesson(lesson)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isPreview ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'} hover:scale-105 transition flex items-center gap-1`}>
                              {isCompleted ? <><Check className="w-4 h-4" /> Пройден</> : isPreview ? <><Play className="w-4 h-4" /> Смотреть бесплатно</> : <><Play className="w-4 h-4" /> Смотреть</>}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'goals' && isStudent && (
          <div className="space-y-6">
            {!courseGoal ? (
              <div className={`${cardBg} rounded-3xl p-8 border-2 border-dashed text-center`}>
                <div className="text-6xl mb-4">🎯</div>
                <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Поставьте цель</h3>
                <p className={`${textSecondary} mb-4`}>Укажите желаемый балл ЕГЭ и дату экзамена</p>
                <button onClick={() => setShowGoalModal(true)} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold hover:scale-105 transition">+ Установить цель</button>
              </div>
            ) : (
              <div className={`${cardBg} rounded-3xl p-6 border-2 border-violet-300`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}><Target className="w-6 h-6 text-violet-500" /> Ваша цель</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setGoalTargetScore(courseGoal.target_score); setGoalExamDate(courseGoal.exam_date); setGoalCurrentLevel(courseGoal.current_level); setShowGoalModal(true); }} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition">✏️ Изменить</button>
                    <button onClick={deleteGoal} className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100 transition">🗑️ Удалить</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-violet-50'} rounded-2xl p-4`}>
                    <p className={`text-xs ${textSecondary} mb-1`}>Текущий уровень</p>
                    <p className={`text-2xl font-black ${textPrimary}`}>{courseGoal.current_level} баллов</p>
                  </div>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-emerald-50'} rounded-2xl p-4`}>
                    <p className={`text-xs ${textSecondary} mb-1`}>Целевой балл</p>
                    <p className="text-2xl font-black text-emerald-600">{courseGoal.target_score} баллов</p>
                  </div>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-amber-50'} rounded-2xl p-4`}>
                    <p className={`text-xs ${textSecondary} mb-1`}>Дата экзамена</p>
                    <p className={`text-lg font-bold ${textPrimary}`}>{courseGoal.exam_date ? new Date(courseGoal.exam_date).toLocaleDateString('ru-RU') : 'Не указана'}</p>
                  </div>
                </div>
                {predictedScore !== null && (
                  <div className={`${darkMode ? 'bg-gradient-to-r from-blue-900/30 to-violet-900/30 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-violet-50 border-blue-200'} rounded-2xl p-6 border-2`}>
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                      <h4 className={`text-lg font-bold ${textPrimary}`}>Прогноз балла ЕГЭ</h4>
                    </div>
                    <div className="flex items-end gap-4 mb-4">
                      <div>
                        <p className={`text-xs ${textSecondary} mb-1`}>На основе вашего прогресса</p>
                        <p className="text-5xl font-black text-blue-600">{predictedScore}</p>
                        <p className={`text-sm ${textSecondary}`}>из 100 баллов</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={textSecondary}>Прогресс к цели</span>
                          <span className="font-bold text-blue-600">{progressPercent}%</span>
                        </div>
                        <div className={`w-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                          <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>
                    </div>
                    {predictedScore < courseGoal.target_score ? (
                      <div className={`${darkMode ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'} border rounded-xl p-3`}>
                        <p className="text-sm text-amber-700 font-semibold">💡 Совет: для достижения цели продолжайте проходить уроки. Ваш текущий прогресс: {progressPercent}%</p>
                      </div>
                    ) : (
                      <div className={`${darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} border rounded-xl p-3`}>
                        <p className="text-sm text-emerald-700 font-semibold">🎉 Отлично! Вы на верном пути к достижению цели!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && isTutor && (
          <div className={`${cardBg} rounded-3xl p-6 border shadow-sm`}>
            <h3 className={`font-bold ${textPrimary} text-lg mb-4`}>👥 Ученики</h3>
            {allProgress.filter(p => p.course_id === courseId).length === 0 ? (
              <p className={textSecondary}>Нет учеников</p>
            ) : (
              <div className="space-y-2">
                {allProgress.filter(p => p.course_id === courseId).map(p => {
                  const student = students.find(s => s.id === p.student_id);
                  const completed = p.completed_lessons?.length || 0;
                  const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
                  return (
                    <div key={p.id} className={`flex items-center gap-4 p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                      <div className="flex-1">
                        <p className={`font-semibold ${textPrimary}`}>{student?.name || student?.full_name || student?.email || 'Ученик'}</p>
                        <p className={`text-xs ${textSecondary}`}>{student?.email || p.student_id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`flex-1 h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                            <div className="h-full bg-gradient-to-r from-rose-500 to-pink-600" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-xs font-bold text-rose-600">{percent}%</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${p.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {p.payment_status === 'paid' ? '✅ Оплачено' : '⏳ Ожидает'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && isTutor && (
          <div className={`${cardBg} rounded-3xl p-6 border shadow-sm`}>
            <h3 className={`font-bold ${textPrimary} text-lg mb-4`}>📊 Аналитика</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Учеников', value: allProgress.filter(p => p.course_id === courseId).length },
                { label: 'Завершили', value: allProgress.filter(p => p.course_id === courseId && p.status === 'completed').length },
                { label: 'Средний прогресс', value: `${Math.round(allProgress.filter(p => p.course_id === courseId).reduce((s, p) => s + (p.completed_lessons?.length || 0), 0) / Math.max(1, allProgress.filter(p => p.course_id === courseId).length) / Math.max(1, totalLessons) * 100)}%` },
                { label: 'Отзывов', value: reviews.length },
              ].map((stat, i) => (
                <div key={i} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-2xl p-4`}>
                  <p className={`text-xs ${textSecondary}`}>{stat.label}</p>
                  <p className={`text-2xl font-black ${textPrimary}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'homework' && isTutor && (
          <div className={`${cardBg} rounded-3xl p-6 border shadow-sm`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-bold ${textPrimary} text-lg`}>📝 Банк ДЗ</h3>
              <button onClick={() => { setEditingHomework(null); setShowCreateHomeworkModal(true); }} className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-bold">+ Создать ДЗ</button>
            </div>
            {homeworkBank.length === 0 ? (
              <p className={textSecondary}>Нет ДЗ</p>
            ) : (
              <div className="space-y-2">
                {homeworkBank.map(hw => (
                  <div key={hw.id} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-gray-700' : 'bg-rose-50'} rounded-xl border ${darkMode ? 'border-gray-600' : 'border-rose-200'}`}>
                    <div className="flex-1">
                      <span className={`font-bold ${textPrimary}`}>{hw.title}</span>
                      <span className={`text-xs ${textSecondary} ml-2`}>{hw.description}</span>
                      {hw.type && <span className={`text-xs ${darkMode ? 'text-rose-400' : 'text-rose-600'} ml-2`}>• {HOMEWORK_TYPES.find(t => t.value === hw.type)?.label}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingHomework(hw); setNewHomeworkTitle(hw.title); setNewHomeworkDesc(hw.description); setNewHomeworkType(hw.type); setNewHomeworkAnswer(hw.answer || ""); setNewHomeworkQuestions(hw.questions || []); setShowCreateHomeworkModal(true); }} className={`px-3 py-2 ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-lg text-xs font-bold`}>✏️</button>
                      <button onClick={() => deleteHomework(hw.id)} className={`px-3 py-2 ${darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'} rounded-lg text-xs font-bold`}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className={`${cardBg} rounded-3xl p-12 border text-center`}>
                <div className="text-6xl mb-4">💬</div>
                <p className={textSecondary}>Пока нет отзывов</p>
              </div>
            ) : reviews.map(r => (
              <div key={r.id} className={`${cardBg} rounded-2xl p-4 border`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-bold ${textPrimary}`}>{r.student_name}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => <span key={s} className={s <= r.rating ? 'text-amber-400' : (darkMode ? 'text-gray-600' : 'text-stone-300')}>★</span>)}
                  </div>
                  <span className={`text-xs ${textSecondary} ml-auto`}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
            {/* МОДАЛКА УПРАВЛЕНИЯ РАЗДЕЛАМИ */}
      <AnimatePresence>
        {showSectionsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSectionsModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-lg border-2 border-blue-300 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><FolderOpen className="w-6 h-6" /> Управление разделами</h2>
                <button onClick={() => setShowSectionsModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="Название нового раздела..." className={`flex-1 ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-blue-300 focus:outline-none`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }} />
                  <button onClick={addSection} className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-bold hover:scale-105 transition flex items-center gap-2">
                    <FolderPlus className="w-5 h-5" /> Добавить
                  </button>
                </div>
                <div className="space-y-2">
                  {(course?.sections || []).length === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
                      <FolderOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className={`text-sm ${textSecondary}`}>Нет разделов. Создайте первый!</p>
                    </div>
                  ) : (
                    (course?.sections || []).map((section, index) => {
                      const lessonsCount = course?.lessons.filter(l => l.section === section).length || 0;
                      const isEditing = editingSectionIndex === index;
                      return (
                        <div key={index} className={`flex items-center gap-2 p-3 rounded-xl border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                          <Folder className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          {isEditing ? (
                            <>
                              <input value={editingSectionName} onChange={(e) => setEditingSectionName(e.target.value)} className={`flex-1 ${inputBg} border-2 rounded-lg p-2 text-sm focus:border-blue-300 focus:outline-none`} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEditSection(); if (e.key === 'Escape') { setEditingSectionIndex(null); setEditingSectionName(""); } }} />
                              <button onClick={saveEditSection} className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition"><Check className="w-4 h-4" /></button>
                              <button onClick={() => { setEditingSectionIndex(null); setEditingSectionName(""); }} className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm font-bold hover:bg-gray-600 transition"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className={`font-bold ${textPrimary}`}>{section}</p>
                                <p className={`text-xs ${textSecondary}`}>{lessonsCount} {lessonsCount === 1 ? 'урок' : lessonsCount < 5 ? 'урока' : 'уроков'}</p>
                              </div>
                              <button onClick={() => startEditSection(index)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition" title="Переименовать"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => deleteSection(index)} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className={`text-xs ${textSecondary} p-3 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-xl`}>
                   <strong>Совет:</strong> При создании урока вы сможете выбрать раздел из выпадающего списка.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА НАСТРОЕК КУРСА */}
      <AnimatePresence>
        {showCourseSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCourseSettings(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Settings className="w-6 h-6" /> Настройки курса</h2>
                <button onClick={() => setShowCourseSettings(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
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
                      <option value="biology"> Биология</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Тип доступа</label>
                    <select value={courseSettingsAccessType} onChange={(e) => setCourseSettingsAccessType(e.target.value as any)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`}>
                      <option value="free">🆓 Бесплатный</option>
                      <option value="paid">💰 Платный</option>
                      <option value="assigned">🔒 По назначению</option>
                    </select>
                  </div>
                </div>
                {courseSettingsAccessType === 'paid' && (
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Цена (₽)</label>
                    <input type="number" value={courseSettingsPrice} onChange={(e) => setCourseSettingsPrice(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                  </div>
                )}
                {(courseSettingsAccessType === 'paid' || courseSettingsAccessType === 'assigned') && (
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🎁 Бесплатных уроков</label>
                    <input type="number" value={courseSettingsPreviewLessons} onChange={(e) => setCourseSettingsPreviewLessons(parseInt(e.target.value) || 0)} min={0} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button onClick={saveCourseSettings} disabled={savingCourseSettings} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingCourseSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingCourseSettings ? 'Сохранение...' : '💾 Сохранить'}
                  </button>
                  <button onClick={() => setShowCourseSettings(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ЦЕЛИ */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGoalModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-lg border-2 border-violet-300 p-6`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}><Target className="w-6 h-6 text-violet-500" /> {courseGoal ? 'Изменить цель' : 'Установить цель'}</h2>
                <button onClick={() => setShowGoalModal(false)} className={`${textSecondary} hover:text-rose-500`}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-xs ${textSecondary} font-bold block mb-2`}>Текущий уровень (баллов)</label>
                  <input type="number" value={goalCurrentLevel} onChange={(e) => setGoalCurrentLevel(e.target.value)} min={0} max={100} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-300 focus:outline-none`} placeholder="50" />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} font-bold block mb-2`}>Целевой балл ЕГЭ *</label>
                  <input type="number" value={goalTargetScore} onChange={(e) => setGoalTargetScore(parseInt(e.target.value) || 0)} min={0} max={100} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-300 focus:outline-none`} placeholder="90" />
                </div>
                <div>
                  <label className={`text-xs ${textSecondary} font-bold block mb-2`}>Дата экзамена</label>
                  <input type="date" value={goalExamDate} onChange={(e) => setGoalExamDate(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-300 focus:outline-none`} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={saveGoal} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Сохранить</button>
                  <button onClick={() => setShowGoalModal(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ОПЛАТЫ */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><CreditCard className="w-6 h-6" /> Оплата</h2>
                <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className={`text-lg font-bold ${textPrimary}`}>{course?.title}</h3>
                  <p className={`text-sm ${textSecondary} mt-1`}>{course?.description || 'Курс по химии'}</p>
                </div>

                <div>
                  <label className={`text-sm font-bold ${textPrimary} block mb-3`}>Выберите тип доступа:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentType('subscription')} className={`p-4 rounded-2xl border-2 transition-all ${paymentType === 'subscription' ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 hover:border-violet-300'}`}>
                      <div className="text-2xl mb-2">📚</div>
                      <div className={`font-bold ${textPrimary}`}>Подписка на курс</div>
                      <div className={`text-xs ${textSecondary} mt-1`}>Доступ на период</div>
                    </button>
                    <button onClick={() => setPaymentType('lesson_pack')} className={`p-4 rounded-2xl border-2 transition-all ${paymentType === 'lesson_pack' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 hover:border-emerald-300'}`}>
                      <div className="text-2xl mb-2">📦</div>
                      <div className={`font-bold ${textPrimary}`}>Пакет уроков</div>
                      <div className={`text-xs ${textSecondary} mt-1`}>Без срока действия</div>
                    </button>
                  </div>
                </div>

                {paymentType === 'subscription' && (
                  <div className="space-y-3">
                    <label className={`text-sm font-bold ${textPrimary} block`}>Выберите период:</label>
                    <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => { setSubscriptionPeriod(30); setSubscriptionPrice(course?.price || 1500); }} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${subscriptionPeriod === 30 ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 hover:border-violet-300'}`}>
                        <div className="text-left">
                          <div className={`font-bold ${textPrimary}`}>1 месяц</div>
                          <div className={`text-xs ${textSecondary}`}>Базовый доступ</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-violet-600">{course?.price || 1500} ₽</div>
                          <div className={`text-xs ${textSecondary}`}>{course?.price || 1500} ₽/мес</div>
                        </div>
                      </button>
                      <button onClick={() => { setSubscriptionPeriod(90); setSubscriptionPrice(Math.round((course?.price || 1500) * 2.7)); }} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between relative ${subscriptionPeriod === 90 ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 hover:border-violet-300'}`}>
                        <span className="absolute -top-2 right-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full">-10%</span>
                        <div className="text-left">
                          <div className={`font-bold ${textPrimary}`}>3 месяца</div>
                          <div className={`text-xs ${textSecondary}`}>Выгоднее на 10%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-violet-600">{Math.round((course?.price || 1500) * 2.7)} ₽</div>
                          <div className={`text-xs ${textSecondary}`}>{Math.round((course?.price || 1500) * 0.9)} ₽/мес</div>
                        </div>
                      </button>
                      <button onClick={() => { setSubscriptionPeriod(180); setSubscriptionPrice(Math.round((course?.price || 1500) * 5)); }} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between relative ${subscriptionPeriod === 180 ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 hover:border-violet-300'}`}>
                        <span className="absolute -top-2 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">-17%</span>
                        <div className="text-left">
                          <div className={`font-bold ${textPrimary}`}>6 месяцев</div>
                          <div className={`text-xs ${textSecondary}`}>Максимальная выгода</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-violet-600">{Math.round((course?.price || 1500) * 5)} ₽</div>
                          <div className={`text-xs ${textSecondary}`}>{Math.round((course?.price || 1500) * 0.83)} ₽/мес</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {paymentType === 'lesson_pack' && (
                  <div className="space-y-3">
                    <label className={`text-sm font-bold ${textPrimary} block`}>Выберите пакет:</label>
                    <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => { setLessonPackId('pack_5'); setLessonPackPrice(2750); setLessonPackCount(5); }} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${lessonPackId === 'pack_5' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 hover:border-emerald-300'}`}>
                        <div className="text-left">
                          <div className={`font-bold ${textPrimary}`}>5 занятий</div>
                          <div className={`text-xs ${textSecondary}`}>Базовый пакет</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-emerald-600">2 750 ₽</div>
                          <div className={`text-xs ${textSecondary}`}>550 ₽/занятие</div>
                        </div>
                      </button>
                      <button onClick={() => { setLessonPackId('pack_10'); setLessonPackPrice(5000); setLessonPackCount(10); }} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between relative ${lessonPackId === 'pack_10' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 hover:border-emerald-300'}`}>
                        <span className="absolute -top-2 right-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full">-9%</span>
                        <div className="text-left">
                          <div className={`font-bold ${textPrimary}`}>10 занятий</div>
                          <div className={`text-xs ${textSecondary}`}>Популярный выбор</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-emerald-600">5 000 ₽</div>
                          <div className={`text-xs ${textSecondary}`}>500 ₽/занятие</div>
                        </div>
                      </button>
                      <button onClick={() => { setLessonPackId('pack_20'); setLessonPackPrice(9000); setLessonPackCount(20); }} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between relative ${lessonPackId === 'pack_20' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 hover:border-emerald-300'}`}>
                        <span className="absolute -top-2 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">-18%</span>
                        <div className="text-left">
                          <div className={`font-bold ${textPrimary}`}>20 занятий</div>
                          <div className={`text-xs ${textSecondary}`}>Максимальная выгода</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-emerald-600">9 000 ₽</div>
                          <div className={`text-xs ${textSecondary}`}>450 ₽/занятие</div>
                        </div>
                      </button>
                    </div>
                    <div className={`p-4 rounded-2xl ${darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} border-2`}>
                      <p className={`text-sm ${darkMode ? 'text-emerald-300' : 'text-emerald-700'} font-semibold flex items-center gap-2`}>
                        <CheckCircle className="w-5 h-5" />Без срока действия • Используйте когда удобно
                      </p>
                    </div>
                  </div>
                )}

                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm ${textSecondary}`}>
                      {paymentType === 'subscription' ? `Подписка на ${subscriptionPeriod} дней` : `Пакет ${lessonPackCount} занятий`}
                    </span>
                    <span className={`text-2xl font-black ${textPrimary}`}>
                      {paymentType === 'subscription' ? subscriptionPrice : lessonPackPrice} ₽
                    </span>
                  </div>
                  {paymentType === 'subscription' && (
                    <p className={`text-xs ${textSecondary}`}>Доступ до {new Date(Date.now() + subscriptionPeriod * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}</p>
                  )}
                </div>

                {paymentProvider === 'manual' ? (
                  <>
                    <p className={`text-sm ${textSecondary} text-center mb-4`}>Загрузите скриншот чека</p>
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
                    <p className={`text-sm ${textSecondary} text-center mb-4`}>Выберите способ оплаты:</p>
                    <div className="space-y-3">
                      <button onClick={() => handlePayment('lava')} disabled={isPaying} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">
                        {isPaying && paymentProvider === 'lava' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span></span>}
                        Оплатить через Lava
                      </button>
                      <button onClick={() => handlePayment('prodamus')} disabled={isPaying} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">
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
            {/* МОДАЛКА УРОКА */}
      <AnimatePresence>
        {showLessonModal && viewingLesson && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (editMode === 'view') { setShowLessonModal(false); setEditMode('view'); } }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-2 ${editMode === 'edit' ? 'border-violet-300' : 'border-rose-200'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-5 rounded-t-3xl flex items-center justify-between flex-shrink-0 ${editMode === 'edit' ? 'bg-gradient-to-r from-violet-500 to-purple-600' : `bg-gradient-to-br ${course.cover || 'from-rose-400 to-pink-600'}`}`}>
                <div className="flex-1">
                  {editMode === 'edit' ? (
                    <input type="text" value={editTitle} onChange={(e) => { setEditTitle(e.target.value); setHasUnsavedChanges(true); }} className="text-xl font-black text-white bg-white/20 rounded-lg px-3 py-2 w-full focus:outline-none focus:bg-white/30 transition placeholder-white/50" placeholder="Введите название урока..." autoFocus />
                  ) : (
                    <h2 className="text-2xl font-black text-white">{viewingLesson.title || "Без названия"}</h2>
                  )}
                  <p className="text-white/80 text-sm mt-1 flex items-center gap-2 flex-wrap">
                    <span>📂 {editMode === 'edit' ? editSection : viewingLesson.section || "Не указан"}</span>
                    {viewingLesson.estimated_time && editMode === 'view' && (
                      <span className="bg-black/20 px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" /> {viewingLesson.estimated_time} мин</span>
                    )}
                    {editMode === 'view' && elapsedTime > 0 && <span className="ml-2 bg-black/20 px-2 py-0.5 rounded">⏱️ {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}</span>}
                  </p>
                </div>
                <button onClick={() => { 
                  if (editMode === 'edit') { 
                    if (hasUnsavedChanges) {
                      if (confirm("Есть несохранённые изменения. Выйти без сохранения?")) { setEditMode('view'); setHasUnsavedChanges(false); }
                    } else { setEditMode('view'); }
                  } else { setShowLessonModal(false); }
                }} className="text-white/80 hover:text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {editMode === 'edit' ? (
                  <div className="space-y-6">
                    <div className="flex gap-3 mb-4 flex-wrap">
                      <button onClick={() => setShowTemplateModal(true)} className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-violet-200 transition">
                        <Copy className="w-4 h-4" /> Применить шаблон
                      </button>
                      <div className="flex items-center gap-4 ml-auto flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editPublished} onChange={(e) => { setEditPublished(e.target.checked); setHasUnsavedChanges(true); }} className="w-5 h-5 accent-violet-500 rounded" />
                          <span className={`text-sm font-bold ${textPrimary}`}>Опубликован</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editIsPreview} onChange={(e) => { setEditIsPreview(e.target.checked); setHasUnsavedChanges(true); }} className="w-5 h-5 accent-emerald-500 rounded" />
                          <span className={`text-sm font-bold ${textPrimary}`}>🎁 Бесплатный</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editPinned} onChange={(e) => { setEditPinned(e.target.checked); setHasUnsavedChanges(true); }} className="w-5 h-5 accent-amber-500 rounded" />
                          <span className={`text-sm font-bold ${textPrimary}`}>📌 Закрепить</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className={`text-xs font-bold block mb-2 ${textSecondary}`}>📂 Раздел</label>
                          <select value={editSection} onChange={(e) => { setEditSection(e.target.value); setHasUnsavedChanges(true); }} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-400 focus:outline-none transition`}>
                            {(course?.sections || []).length === 0 ? (
                              <option value="Введение">Введение (создайте разделы в управлении)</option>
                            ) : (
                              (course?.sections || []).map(section => <option key={section} value={section}>{section}</option>)
                            )}
                          </select>
                          <button onClick={() => setShowSectionsModal(true)} className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} mt-1 hover:underline flex items-center gap-1`}>
                            <FolderPlus className="w-3 h-3" /> Управление разделами
                          </button>
                        </div>
                        <div>
                          <label className={`text-xs font-bold block mb-2 ${textSecondary}`}>⏱️ Оценка времени (минут)</label>
                          <input type="number" value={editEstimatedTime} onChange={(e) => { setEditEstimatedTime(parseInt(e.target.value) || 0); setHasUnsavedChanges(true); }} min={1} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-400 focus:outline-none transition`} />
                        </div>
                        <div>
                          <label className={`text-xs font-bold block mb-2 ${textSecondary}`}>📖 Теория</label>
                          <textarea value={editTheory} onChange={(e) => { setEditTheory(e.target.value); setHasUnsavedChanges(true); }} rows={8} placeholder="Вставьте текст урока..." className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-400 focus:outline-none resize-none transition`} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className={`text-xs font-bold block mb-2 ${textSecondary}`}>📎 Материалы ({editMaterials.length})</label>
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                            {editMaterials.map(m => (
                              <div key={m.id} className={`flex items-center gap-2 p-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-violet-50 border-violet-200'}`}>
                                <span className="text-lg">{m.type === 'video' ? '🎬' : m.type === 'file' ? '📄' : '🔗'}</span>
                                <span className={`flex-1 text-sm truncate ${textPrimary}`}>{m.title}</span>
                                <button onClick={() => { setEditMaterials(editMaterials.filter(x => x.id !== m.id)); setHasUnsavedChanges(true); }} className="text-rose-500 hover:bg-rose-100 p-1 rounded"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                          </div>
                          <div className={`flex flex-wrap gap-2 p-3 rounded-xl border-2 border-dashed ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-violet-200 bg-violet-50/50'}`}>
                            <select value={newMaterialType} onChange={(e) => setNewMaterialType(e.target.value as any)} className={`${inputBg} border rounded-lg px-2 py-1.5 text-xs`}>
                              <option value="link">🔗 Ссылка</option>
                              <option value="video">🎬 Видео</option>
                              <option value="file"> Файл</option>
                            </select>
                            <input value={newMaterialTitle} onChange={(e) => setNewMaterialTitle(e.target.value)} placeholder="Название" className={`flex-1 min-w-[100px] ${inputBg} border rounded-lg px-2 py-1.5 text-xs`} />
                            <input value={newMaterialUrl} onChange={(e) => setNewMaterialUrl(e.target.value)} placeholder="URL" className={`flex-1 min-w-[100px] ${inputBg} border rounded-lg px-2 py-1.5 text-xs`} />
                            <button onClick={addMaterial} className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-bold hover:bg-violet-600 transition">+</button>
                          </div>
                        </div>

                        <div>
                          <label className={`text-xs font-bold block mb-2 ${textSecondary}`}>📋 Задания из банка ({editTaskIds.length})</label>
                          <button type="button" onClick={() => setShowTaskBankModal(true)} className={`w-full text-left p-3 rounded-xl border-2 border-dashed text-sm font-medium transition ${darkMode ? 'border-gray-600 hover:border-violet-500 text-gray-400' : 'border-violet-200 hover:border-violet-400 text-violet-600'}`}>
                            {editTaskIds.length === 0 ? '+ Выбрать задания из банка' : `🔄 Изменить (${editTaskIds.length} выбрано)`}
                          </button>
                        </div>

                        <div>
                          <label className={`text-xs font-bold block mb-2 ${textSecondary}`}>📝 Домашние задания ({editHomeworkIds.length})</label>
                          <button type="button" onClick={() => setShowHomeworkBankModal(true)} className={`w-full text-left p-3 rounded-xl border-2 border-dashed text-sm font-medium transition ${darkMode ? 'border-gray-600 hover:border-violet-500 text-gray-400' : 'border-violet-200 hover:border-violet-400 text-violet-600'}`}>
                            {editHomeworkIds.length === 0 ? '+ Выбрать ДЗ из банка' : `🔄 Изменить (${editHomeworkIds.length} выбрано)`}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={saveLessonEdit} disabled={savingLesson} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.01] transition flex items-center justify-center gap-2 disabled:opacity-50">
                        {savingLesson ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {savingLesson ? 'Сохранение...' : 'Сохранить урок'}
                      </button>
                      <button onClick={() => {
                        if (hasUnsavedChanges) {
                          if (confirm("Есть несохранённые изменения. Выйти без сохранения?")) { setEditMode('view'); setHasUnsavedChanges(false); }
                        } else { setEditMode('view'); }
                      }} className={`px-6 py-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${textPrimary} rounded-xl font-bold transition`}>
                        Отмена / К просмотру
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isTutor && (
                      <div className="flex justify-end">
                        <button onClick={() => openLessonEditor(viewingLesson)} className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-bold hover:bg-violet-200 transition">
                          <Edit className="w-4 h-4" /> Редактировать этот урок
                        </button>
                      </div>
                    )}

                    {viewingLesson.theory && (
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-violet-400' : 'text-violet-600'} mb-3 flex items-center gap-2`}><BookOpen className="w-5 h-5" /> Теория</h3>
                        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-100'} rounded-2xl p-5 border`}>
                          <p className={`${darkMode ? 'text-gray-200' : 'text-stone-800'} text-sm whitespace-pre-wrap leading-relaxed`}>{viewingLesson.theory}</p>
                        </div>
                      </div>
                    )}

                    {viewingLesson.materials && viewingLesson.materials.length > 0 && (
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-violet-400' : 'text-violet-600'} mb-3 flex items-center gap-2`}><Video className="w-5 h-5" /> Материалы ({viewingLesson.materials.length})</h3>
                        <div className="space-y-3">
                          {viewingLesson.materials.map((m) => {
                            const embedUrl = getVideoEmbedUrl(m.url);
                            const isDirect = isDirectVideo(m.url);
                            const isRutube = m.url.includes('rutube.ru');
                            const isGoogleDoc = m.url.includes('docs.google.com/document');
                            const isGoogleSheet = m.url.includes('docs.google.com/spreadsheets');
                            const isGoogleSlide = m.url.includes('docs.google.com/presentation');
                            const isPDF = m.url.includes('.pdf') || m.url.includes('drive.google.com/file');
                            
                            if (isRutube && embedUrl) {
                              return (
                                <div key={m.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-200'} rounded-2xl border overflow-hidden`}>
                                  <div className="aspect-video bg-black">
                                    <iframe src={embedUrl} title={m.title} className="w-full h-full" frameBorder="0" allow="clipboard-write" allowFullScreen />
                                  </div>
                                  <div className={`p-3 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}><p className={`text-sm font-bold ${textPrimary}`}> {m.title}</p></div>
                                </div>
                              );
                            }
                            
                            if (m.type === 'video' && embedUrl && isDirect) {
                              return (
                                <div key={m.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-200'} rounded-2xl border overflow-hidden`}>
                                  <video src={embedUrl} controls className="w-full aspect-video bg-black" style={{ playbackRate: videoSpeed }} />
                                  <div className={`p-3 ${darkMode ? 'bg-gray-900' : 'bg-white'} flex items-center justify-between`}>
                                    <p className={`text-sm font-bold ${textPrimary}`}>🎬 {m.title}</p>
                                    <select value={videoSpeed} onChange={(e) => { const s = parseFloat(e.target.value); setVideoSpeed(s); const video = document.querySelector(`video[src="${embedUrl}"]`) as HTMLVideoElement; if (video) video.playbackRate = s; }} className={`${inputBg} border rounded px-2 py-1 text-xs`}>
                                      <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                                    </select>
                                  </div>
                                </div>
                              );
                            }
                            
                            if (m.type === 'video' && embedUrl && !isRutube) {
                              return (
                                <div key={m.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-200'} rounded-2xl border overflow-hidden`}>
                                  <div className="aspect-video bg-black"><iframe src={embedUrl} title={m.title} className="w-full h-full" frameBorder="0" allowFullScreen /></div>
                                  <div className={`p-3 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}><p className={`text-sm font-bold ${textPrimary}`}>🎬 {m.title}</p></div>
                                </div>
                              );
                            }
                            
                            if (isGoogleDoc) {
                              return (<a key={m.id} href={m.url} target="_blank" rel="noopener" className={`block ${darkMode ? 'bg-blue-900/20 border-blue-700 hover:border-blue-500' : 'bg-blue-50 border-blue-200 hover:border-blue-400'} p-4 rounded-2xl border-2 transition-all hover:scale-[1.02]`}><div className="flex items-center gap-4"><div className="text-4xl">📄</div><div className="flex-1"><span className={`text-xs px-2 py-0.5 ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-200 text-blue-700'} rounded-full font-bold`}>Конспект</span><p className={`text-sm font-bold ${textPrimary} mt-1`}>{m.title}</p></div><div className="text-2xl text-blue-500">↗</div></div></a>);
                            }
                            if (isGoogleSheet) {
                              return (<a key={m.id} href={m.url} target="_blank" rel="noopener" className={`block ${darkMode ? 'bg-green-900/20 border-green-700 hover:border-green-500' : 'bg-green-50 border-green-200 hover:border-green-400'} p-4 rounded-2xl border-2 transition-all hover:scale-[1.02]`}><div className="flex items-center gap-4"><div className="text-4xl"></div><div className="flex-1"><span className={`text-xs px-2 py-0.5 ${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-200 text-green-700'} rounded-full font-bold`}>Таблица</span><p className={`text-sm font-bold ${textPrimary} mt-1`}>{m.title}</p></div><div className="text-2xl text-green-500">↗</div></div></a>);
                            }
                            if (isGoogleSlide) {
                              return (<a key={m.id} href={m.url} target="_blank" rel="noopener" className={`block ${darkMode ? 'bg-orange-900/20 border-orange-700 hover:border-orange-500' : 'bg-orange-50 border-orange-200 hover:border-orange-400'} p-4 rounded-2xl border-2 transition-all hover:scale-[1.02]`}><div className="flex items-center gap-4"><div className="text-4xl">📊</div><div className="flex-1"><span className={`text-xs px-2 py-0.5 ${darkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-200 text-orange-700'} rounded-full font-bold`}>Презентация</span><p className={`text-sm font-bold ${textPrimary} mt-1`}>{m.title}</p></div><div className="text-2xl text-orange-500">↗</div></div></a>);
                            }
                            if (isPDF) {
                              return (<a key={m.id} href={m.url} target="_blank" rel="noopener" className={`block ${darkMode ? 'bg-red-900/20 border-red-700 hover:border-red-500' : 'bg-red-50 border-red-200 hover:border-red-400'} p-4 rounded-2xl border-2 transition-all hover:scale-[1.02]`}><div className="flex items-center gap-4"><div className="text-4xl">📕</div><div className="flex-1"><span className={`text-xs px-2 py-0.5 ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-200 text-red-700'} rounded-full font-bold`}>PDF</span><p className={`text-sm font-bold ${textPrimary} mt-1`}>{m.title}</p></div><div className="text-2xl text-red-500">↗</div></div></a>);
                            }
                            
                            return (
                              <a key={m.id} href={m.url} target="_blank" rel="noopener" className={`block ${darkMode ? 'bg-gray-700 border-gray-600 hover:border-violet-500' : 'bg-violet-50 border-violet-200 hover:border-violet-400'} p-4 rounded-2xl border-2 transition-all hover:scale-[1.02]`}>
                                <div className="flex items-center gap-4">
                                  <span className="text-3xl">{m.type === 'video' ? '🎬' : m.type === 'file' ? '📄' : '🔗'}</span>
                                  <div className="flex-1"><p className={`text-sm font-bold ${textPrimary}`}>{m.title}</p><p className={`text-xs ${textSecondary}`}>{m.type === 'video' ? 'Видео' : m.type === 'file' ? 'Файл' : 'Ссылка'}</p></div>
                                  <span className="text-violet-500">→</span>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {viewingLesson.task_ids && viewingLesson.task_ids.length > 0 && (
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-violet-400' : 'text-violet-600'} mb-3 flex items-center gap-2`}><FileText className="w-5 h-5" /> Задания ({viewingLesson.task_ids.length})</h3>
                        <div className="space-y-2">
                          {viewingLesson.task_ids.map(taskId => {
                            const task = bankTasks.find(t => t.id === taskId);
                            if (!task) return null;
                            return (
                              <div key={task.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-200'} p-4 rounded-2xl border`}>
                                <p className={`font-bold text-sm ${textPrimary}`}>{task.title}</p>
                                <p className={`text-sm ${textSecondary} mt-1`}>{task.description}</p>
                                {task.answer && (
                                  <details className="mt-2">
                                    <summary className={`text-xs ${darkMode ? 'text-violet-400' : 'text-violet-600'} cursor-pointer font-medium`}> Показать ответ</summary>
                                    <p className={`text-sm mt-2 p-3 ${darkMode ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} rounded-lg border`}>{task.answer}</p>
                                  </details>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {viewingLesson.homework_ids && viewingLesson.homework_ids.length > 0 && (
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-violet-400' : 'text-violet-600'} mb-3 flex items-center gap-2`}><FileText className="w-5 h-5" /> Домашние задания</h3>
                        <div className="space-y-2">
                          {viewingLesson.homework_ids.map((hwId) => {
                            const hw = homeworkBank.find(h => h.id === hwId);
                            if (!hw) return null;
                            return (
                              <Link key={hw.id} href={`/homeworks/${hw.id}?uid=${uid}&role=${role}`} className="block p-4 rounded-xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 transition-all group">
                                <div className="flex items-center justify-between">
                                  <div><p className={`font-bold text-sm text-violet-900`}>{hw.title}</p><p className="text-xs text-violet-700 mt-1">{HOMEWORK_TYPES.find(t => t.value === hw.type)?.label || hw.type}</p></div>
                                  <Play className="w-5 h-5 text-violet-500 group-hover:scale-110 transition-transform" />
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isStudent && (
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-violet-400' : 'text-violet-600'} mb-3 flex items-center gap-2`}><BookOpen className="w-5 h-5" /> Мои заметки</h3>
                        <textarea value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} rows={3} placeholder="Ваши мысли по этому уроку..." className={`w-full ${darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border-2 rounded-xl p-3 text-sm focus:outline-none resize-none ${textPrimary}`} />
                        <button onClick={saveNote} className={`mt-2 px-4 py-2 ${darkMode ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-yellow-400 hover:bg-yellow-500'} text-yellow-900 rounded-lg text-sm font-bold transition`}>💾 Сохранить заметку</button>
                      </div>
                    )}

                    <div>
                      <h3 className={`font-bold ${darkMode ? 'text-violet-400' : 'text-violet-600'} mb-3 flex items-center gap-2`}><MessageCircle className="w-5 h-5" /> Вопросы ({lessonComments.length})</h3>
                      {lessonComments.length > 0 && (
                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                          {lessonComments.map(c => (
                            <div key={c.id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-200'} p-3 rounded-xl border`}>
                              <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-bold ${textPrimary}`}>{c.student_name}</span><span className={`text-xs ${textSecondary}`}>{new Date(c.created_at).toLocaleDateString()}</span></div>
                              <p className={`text-sm ${textPrimary}`}>{c.text}</p>
                              {c.reply && (<div className={`mt-2 ml-4 p-2 ${darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} rounded-lg border`}><p className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'} mb-1`}>👩‍🏫 Ответ:</p><p className={`text-sm ${textPrimary}`}>{c.reply}</p></div>)}
                              {isTutor && !c.reply && (<button onClick={() => { const r = prompt("Ваш ответ:"); if (r) replyToComment(c.id, r); }} className={`mt-2 text-xs ${darkMode ? 'text-violet-400' : 'text-violet-600'} font-bold`}>💬 Ответить</button>)}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={isTutor ? "Комментарий..." : "Вопрос преподавателю..."} className={`flex-1 ${inputBg} border-2 rounded-xl p-3 text-sm focus:outline-none`} />
                        <button onClick={addComment} disabled={!newComment.trim()} className="px-4 py-2 bg-violet-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-violet-600 transition"><Send className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {isStudent && isCourseCompleted && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-3xl p-6 text-center shadow-2xl border-4 border-yellow-300">
                        <div className="text-6xl mb-3">🏆</div>
                        <h3 className="text-2xl font-black text-white mb-2">Поздравляем!</h3>
                        <p className="text-white/90 mb-4">Вы успешно завершили курс "{course.title}"</p>
                        <button onClick={generateCertificate} className="px-6 py-3 bg-white text-amber-600 rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 mx-auto">
                          <Download className="w-5 h-5" /> Скачать сертификат
                        </button>
                      </motion.div>
                    )}

                    {isStudent && (
                      <div className={`border-t-2 pt-6 ${darkMode ? 'border-gray-700' : 'border-violet-100'}`}>
                        {completedLessons.includes(viewingLesson.id) ? (
                          <div className={`${darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-200'} border-2 rounded-2xl p-4 text-center`}>
                            <p className={`font-bold text-lg ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>✅ Урок успешно пройден!</p>
                          </div>
                        ) : (
                          <button onClick={() => completeLesson(viewingLesson.id)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                            <CheckCircle className="w-6 h-6" /> Завершить урок
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ВЫБОРА ДЗ ИЗ БАНКА */}
      <AnimatePresence>
        {showHomeworkBankModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowHomeworkBankModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border-2 border-violet-300 max-h-[80vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><BookOpen className="w-6 h-6" /> Выбрать ДЗ из банка</h2>
                <button onClick={() => setShowHomeworkBankModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6">
                {homeworkBank.length === 0 ? (<div className="text-center py-8"><div className="text-6xl mb-4">📝</div><p className={textSecondary}>Нет созданных ДЗ</p></div>) : (
                  <div className="space-y-2">
                    {homeworkBank.map(hw => {
                      const isSelected = editHomeworkIds.includes(hw.id);
                      return (
                        <motion.button key={hw.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { if (isSelected) { setEditHomeworkIds(editHomeworkIds.filter(id => id !== hw.id)); } else { setEditHomeworkIds([...editHomeworkIds, hw.id]); } setHasUnsavedChanges(true); }} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? (darkMode ? 'bg-violet-900/30 border-violet-600' : 'bg-violet-100 border-violet-400') : (darkMode ? 'bg-gray-700 border-gray-600 hover:border-violet-500' : 'bg-white border-gray-200 hover:border-violet-300')}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-violet-500' : (darkMode ? 'bg-gray-600' : 'bg-gray-200')}`}>{isSelected && <Check className="w-4 h-4 text-white" />}</div>
                            <div className="flex-1"><p className={`font-bold ${textPrimary}`}>{hw.title}</p><p className={`text-sm ${textSecondary} mt-1`}>{hw.description}</p><span className={`text-xs px-2 py-0.5 ${darkMode ? 'bg-violet-900/30 text-violet-300' : 'bg-violet-100 text-violet-700'} rounded-full mt-1 inline-block`}>{HOMEWORK_TYPES.find(t => t.value === hw.type)?.label || hw.type}</span></div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-3 mt-6"><button onClick={() => setShowHomeworkBankModal(false)} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold">Готово ({editHomeworkIds.length})</button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ВЫБОРА ЗАДАНИЙ ИЗ БАНКА */}
      <AnimatePresence>
        {showTaskBankModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowTaskBankModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border-2 border-blue-300 max-h-[80vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><FileText className="w-6 h-6" /> Выбрать задания из банка</h2>
                <button onClick={() => setShowTaskBankModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6">
                {bankTasks.length === 0 ? (<div className="text-center py-8"><div className="text-6xl mb-4">📋</div><p className={textSecondary}>Нет заданий в банке</p></div>) : (
                  <div className="space-y-2">
                    {bankTasks.map(task => {
                      const isSelected = editTaskIds.includes(task.id);
                      return (
                        <motion.button key={task.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { if (isSelected) { setEditTaskIds(editTaskIds.filter(id => id !== task.id)); } else { setEditTaskIds([...editTaskIds, task.id]); } setHasUnsavedChanges(true); }} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? (darkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-100 border-blue-400') : (darkMode ? 'bg-gray-700 border-gray-600 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300')}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-500' : (darkMode ? 'bg-gray-600' : 'bg-gray-200')}`}>{isSelected && <Check className="w-4 h-4 text-white" />}</div>
                            <div className="flex-1"><p className={`font-bold ${textPrimary}`}>{task.title}</p><p className={`text-sm ${textSecondary} mt-1`}>{task.description}</p></div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-3 mt-6"><button onClick={() => setShowTaskBankModal(false)} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 rounded-xl font-bold">Готово ({editTaskIds.length})</button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ШАБЛОНОВ */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowTemplateModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-lg border-2 border-violet-300`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Copy className="w-6 h-6" /> Шаблоны</h2>
                <button onClick={() => setShowTemplateModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-3">
                {LESSON_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => { setEditTheory(t.theory); setEditMaterials(t.materials); setEditTaskIds(t.task_ids); setEditHomeworkIds(t.homework_ids); setShowTemplateModal(false); setHasUnsavedChanges(true); toast.success("✨ Шаблон применён! Не забудьте сохранить."); }} className={`w-full text-left p-4 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-violet-50 hover:bg-violet-100'} rounded-xl border-2 ${darkMode ? 'border-gray-600' : 'border-violet-200'} transition`}>
                    <h3 className={`font-bold ${textPrimary}`}>{t.name}</h3>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА МАССОВЫХ ОПЕРАЦИЙ */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowBulkModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border-2 border-violet-300`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white">⚡ Массовые операции</h2>
                <button onClick={() => setShowBulkModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-3">
                <p className={`text-sm ${textSecondary}`}>Выбрано: {selectedLessons.length}</p>
                <button onClick={() => bulkUpdateLessons('publish')} className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold">✅ Опубликовать все</button>
                <button onClick={() => bulkUpdateLessons('unpublish')} className="w-full px-4 py-3 bg-gray-500 text-white rounded-xl font-bold">📴 Скрыть все</button>
                <button onClick={() => bulkUpdateLessons('preview')} className="w-full px-4 py-3 bg-yellow-500 text-white rounded-xl font-bold">👁️ Сделать бесплатными</button>
                <button onClick={() => bulkUpdateLessons('unpreview')} className="w-full px-4 py-3 bg-gray-500 text-white rounded-xl font-bold">🔒 Убрать бесплатный доступ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ДОСТИЖЕНИЙ */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAchievements(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border-2 border-yellow-300 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Award className="w-6 h-6" /> Достижения</h2>
                <button onClick={() => setShowAchievements(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.map((a, i) => {
                  const unlocked = profile?.achievements?.includes(a.id);
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`p-4 rounded-2xl border-2 ${unlocked ? (darkMode ? 'bg-yellow-900/30 border-yellow-600' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300') : (darkMode ? 'bg-gray-700 border-gray-600 opacity-50' : 'bg-gray-50 border-gray-200 opacity-50')}`}>
                      <div className="text-3xl mb-2">{a.icon}</div>
                      <h3 className={`font-bold ${textPrimary} text-sm`}>{a.name}</h3>
                      <p className={`text-xs ${textSecondary} mt-1`}>{a.description}</p>
                      <p className="text-xs font-bold text-yellow-600 mt-2">+{a.xp} XP</p>
                      {unlocked && <div className={`mt-2 px-2 py-1 ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'} rounded-lg text-xs font-bold text-center`}>✅ Получено</div>}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА УВЕДОМЛЕНИЙ */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNotifications(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-lg border-2 border-rose-300 max-h-[80vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><MessageCircle className="w-6 h-6" /> Уведомления</h2>
                <button onClick={() => setShowNotifications(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6">
                {notifications.length === 0 ? <p className={textSecondary}>Нет уведомлений</p> : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-3 rounded-xl border ${n.read ? (darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200') : (darkMode ? 'bg-rose-900/30 border-rose-700' : 'bg-rose-50 border-rose-200')}`}>
                        <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-bold ${textPrimary}`}>{n.title}</span><span className={`text-xs ${textSecondary} ml-auto`}>{new Date(n.created_at).toLocaleString()}</span></div>
                        <p className={`text-sm ${textPrimary}`}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ДЗ */}
      <AnimatePresence>
        {showCreateHomeworkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCreateHomeworkModal(false); setEditingHomework(null); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border-2 border-rose-300 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-5 rounded-t-3xl flex items-center justify-between">
                <h2 className="font-black text-xl text-white">{editingHomework ? '️ Редактировать ДЗ' : '➕ Новое ДЗ'}</h2>
                <button onClick={() => { setShowCreateHomeworkModal(false); setEditingHomework(null); }} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название *</label><input value={newHomeworkTitle} onChange={(e) => setNewHomeworkTitle(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`} /></div>
                <div><label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Тип</label><select value={newHomeworkType} onChange={(e) => setNewHomeworkType(e.target.value as any)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none`}>{HOMEWORK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание</label><textarea value={newHomeworkDesc} onChange={(e) => setNewHomeworkDesc(e.target.value)} rows={4} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none resize-none`} /></div>
                {newHomeworkType === 'text' && (<div><label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Ответ</label><textarea value={newHomeworkAnswer} onChange={(e) => setNewHomeworkAnswer(e.target.value)} rows={3} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-300 focus:outline-none resize-none`} /></div>)}
                {(newHomeworkType === 'single_choice' || newHomeworkType === 'multi_choice') && (
                  <div>
                    <div className="flex items-center justify-between mb-2"><label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold`}>Вопросы</label><button onClick={addQuizQuestion} className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold">+ Вопрос</button></div>
                    <div className="space-y-3">
                      {newHomeworkQuestions.map((q, idx) => (
                        <div key={q.id} className={`${darkMode ? 'bg-gray-700' : 'bg-rose-50'} p-3 rounded-xl border ${darkMode ? 'border-gray-600' : 'border-rose-200'}`}>
                          <div className="flex items-center justify-between mb-2"><span className={`text-xs font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>Вопрос #{idx + 1}</span><button onClick={() => setNewHomeworkQuestions(newHomeworkQuestions.filter((_, i) => i !== idx))} className="text-rose-500"><X className="w-4 h-4" /></button></div>
                          <input value={q.question} onChange={(e) => updateQuizQuestion(idx, 'question', e.target.value)} placeholder="Текст вопроса" className={`w-full ${inputBg} border-2 rounded-lg p-2 text-sm mb-2 focus:border-rose-300 focus:outline-none`} />
                          <div className="space-y-1">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input type="radio" checked={q.correct === oi} onChange={() => updateQuizQuestion(idx, 'correct', oi)} className="accent-rose-500" />
                                <input value={opt} onChange={(e) => { const opts = [...q.options]; opts[oi] = e.target.value; updateQuizQuestion(idx, 'options', opts); }} placeholder={`Вариант ${oi + 1}`} className={`flex-1 ${inputBg} border-2 rounded-lg p-1 text-xs focus:border-rose-300 focus:outline-none`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {homeworkBank.length > 0 && !editingHomework && (
                  <div>
                    <label className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📚 Или выберите из банка ДЗ</label>
                    <div className={`max-h-48 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl p-2`}>
                      {homeworkBank.map(hw => (
                        <button key={hw.id} type="button" onClick={() => { setNewHomeworkTitle(hw.title); setNewHomeworkDesc(hw.description); setNewHomeworkType(hw.type); setNewHomeworkAnswer(hw.answer || ""); if (hw.questions) setNewHomeworkQuestions(hw.questions); toast.success(`✅ Выбрано ДЗ: ${hw.title}`); }} className={`w-full text-left p-3 mb-2 rounded-lg border-2 transition-all ${darkMode ? 'bg-gray-600 border-gray-500 hover:border-rose-500' : 'bg-white border-gray-200 hover:border-rose-300'}`}>
                          <div className="flex items-center justify-between">
                            <div><p className={`font-bold text-sm ${textPrimary}`}>{hw.title}</p><p className={`text-xs ${textSecondary} mt-1`}>{hw.description}</p><span className={`text-xs px-2 py-0.5 ${darkMode ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-100 text-rose-700'} rounded-full mt-1 inline-block`}>{HOMEWORK_TYPES.find(t => t.value === hw.type)?.label || hw.type}</span></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={createHomework} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl font-bold">{editingHomework ? '💾 Сохранить' : '✅ Создать'}</button>
                  <button onClick={() => { setShowCreateHomeworkModal(false); setEditingHomework(null); }} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CourseViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CourseViewContent />
    </Suspense>
  );
}