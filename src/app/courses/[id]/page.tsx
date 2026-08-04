"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  collection, addDoc, deleteDoc, updateDoc, doc,
  query, where, onSnapshot, getDoc, getDocs, serverTimestamp, setDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Play, CheckCircle, Lock, Clock,
  Users, Star, Download, Edit, Trash2, Plus, X, Save,
  Loader2, CreditCard, Eye, EyeOff, ChevronRight, Home,
  Upload, Check, Video, FileText, Award, Zap, TrendingUp, 
  Paperclip, MessageCircle, Lightbulb, Target, Trophy,
  Flame, Sparkles, Heart, Share2, Flag, AlertCircle,
  Calendar, BarChart3, GraduationCap, BookMarked, Timer,
  FolderOpen, Folder, Send, ClipboardList
} from "lucide-react";

const storage = getStorage();

// ============ ИНТЕРФЕЙСЫ ============
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
  sections: Section[];
  published: boolean;
  preview_lessons?: number;
  tags?: string[];
  students_count?: number;
  rating?: number;
  reviews_count?: number;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  content?: string;
  duration: number;
  published: boolean;
  file_url?: string;
  file_name?: string;
  lesson_type: 'video' | 'text' | 'mixed';
  homework_id?: string; // ✅ НОВОЕ: Привязка ДЗ
  created_at: string;
}

interface Profile {
  id: string;
  uid: string;
  name: string;
  full_name?: string;
  email?: string;
  role: 'tutor' | 'student';
  telegram_chat_id?: string;
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
  started_at?: string;
  completed_at?: string;
  last_lesson_at?: string;
}

// ============ КОНСТАНТЫ ============
const SUBJECTS: Record<string, { label: string; icon: string; color: string; emoji: string }> = {
  chemistry: { label: "Химия", icon: "🧪", color: "from-emerald-400 to-teal-600", emoji: "⚗️" },
  biology: { label: "Биология", icon: "🧬", color: "from-blue-400 to-indigo-600", emoji: "🦠" },
};

const LESSON_TYPES = [
  { value: 'video', label: '🎥 Видеоурок', icon: Video },
  { value: 'text', label: '📝 Текстовый', icon: FileText },
  { value: 'mixed', label: '🎭 Смешанный', icon: Sparkles },
];

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1`;
  
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`;
  
  return null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} ч ${mins > 0 ? `${mins} мин` : ''}`;
}

async function sendTelegramToStudent(studentId: string, message: string) {
  try {
    const studentSnap = await getDoc(doc(db, "profiles", studentId));
    if (studentSnap.exists()) {
      const studentData = studentSnap.data();
      if (studentData.telegram_chat_id) {
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, targetChatId: studentData.telegram_chat_id }),
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Ошибка отправки уведомления:", error);
    return false;
  }
}

// ============ МОДАЛКА ПРОСМОТРА УРОКА ============
function LessonViewerModal({ lesson, progress, darkMode, textPrimary, textSecondary, cardBg, onClose, onComplete, course }: any) {
  const [viewingTime, setViewingTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setViewingTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-5xl border max-h-[95vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-xl text-white truncate">{lesson.title}</h2>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Timer className="w-4 h-4" />
                <span>Время просмотра: {Math.floor(viewingTime / 60)}:{(viewingTime % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ✅ ИСПРАВЛЕНИЕ 3: Оптимизация видео (lazy loading, sandbox, title) */}
          {lesson.video_url && getVideoEmbedUrl(lesson.video_url) ? (
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg">
              <iframe 
                src={getVideoEmbedUrl(lesson.video_url)} 
                className="w-full h-full"
                loading="lazy"
                title="Video Lesson Player"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            </div>
          ) : lesson.video_url ? (
            <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="block w-full p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl text-center font-bold hover:scale-105 transition-transform shadow-lg" type="button">
              <Video className="w-8 h-8 mx-auto mb-2" />
              🎥 Открыть видео по внешней ссылке
            </a>
          ) : null}

          {lesson.content && (
            <div>
              <h3 className={`text-lg font-bold ${textPrimary} mb-3 flex items-center gap-2`}>
                <FileText className="w-5 h-5 text-violet-500" /> Теория и материалы
              </h3>
              <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'} whitespace-pre-wrap text-sm leading-relaxed`}>
                {lesson.content}
              </div>
            </div>
          )}

          {lesson.file_url && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-violet-50'} border ${darkMode ? 'border-gray-600' : 'border-violet-200'} flex items-center justify-between`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Paperclip className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>{lesson.file_name}</p>
                  <p className={`text-sm ${textSecondary}`}>Дополнительный материал к уроку</p>
                </div>
              </div>
              <a href={lesson.file_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-violet-500 text-white rounded-xl font-bold hover:bg-violet-600 transition flex items-center gap-2 hover:scale-105" type="button">
                <Download className="w-5 h-5" /> Скачать
              </a>
            </div>
          )}

          {/* ✅ ИСПРАВЛЕНИЕ 2: Кнопка перехода к ДЗ, если оно прикреплено */}
          {lesson.homework_id && (
            <div className={`p-6 rounded-2xl ${darkMode ? 'bg-amber-900/20' : 'bg-amber-50'} border ${darkMode ? 'border-amber-700' : 'border-amber-200'} flex items-center justify-between`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Домашнее задание</p>
                  <p className={`text-sm ${textSecondary}`}>К этому уроку прикреплено практическое задание</p>
                </div>
              </div>
              <Link href={`/homeworks/${lesson.homework_id}`} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:scale-105 transition flex items-center gap-2" onClick={onClose}>
                <Play className="w-5 h-5" /> Выполнить ДЗ
              </Link>
            </div>
          )}

          <div className={`pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <div className={`text-sm ${textSecondary}`}>
              {progress?.completed_lessons?.includes(lesson.id) ? (
                <span className="flex items-center gap-2 text-emerald-600 font-bold">
                  <CheckCircle className="w-5 h-5" /> Урок уже пройден
                </span>
              ) : (
                <span>После просмотра отметьте урок как пройденный</span>
              )}
            </div>
            {!progress?.completed_lessons?.includes(lesson.id) && (
              <button 
                onClick={() => { onComplete(lesson.id); onClose(); }} 
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:scale-105 transition-all flex items-center gap-2 shadow-lg"
                type="button"
              >
                <CheckCircle className="w-5 h-5" /> Отметить как пройденный
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ ОСНОВНОЙ КОМПОНЕНТ ============
function CourseDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  const [showViewLessonModal, setShowViewLessonModal] = useState<any>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState<any>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showEditSectionModal, setShowEditSectionModal] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDesc, setNewLessonDesc] = useState("");
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState("");
  const [newLessonContent, setNewLessonContent] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState(30);
  const [newLessonPublished, setNewLessonPublished] = useState(true);
  const [newLessonFile, setNewLessonFile] = useState<File | null>(null);
  const [newLessonFileUrl, setNewLessonFileUrl] = useState("");
  const [newLessonFileName, setNewLessonFileName] = useState("");
  const [newLessonType, setNewLessonType] = useState<'video' | 'text' | 'mixed'>('video');
  const [selectedSectionId, setSelectedSectionId] = useState("");
  
  // ✅ ИСПРАВЛЕНИЕ 2: Состояние для выбора ДЗ из списка
  const [availableHomeworks, setAvailableHomeworks] = useState<any[]>([]);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState("");
  
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  
  const [isPaying, setIsPaying] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'lava' | 'prodamus' | 'manual' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

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
        setCourse({ id: snap.id, ...snap.data() } as Course);
      } else {
        toast.error("Курс не найден");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [courseId]);

  useEffect(() => {
    if (!user || !courseId) return;
    const unsub = onSnapshot(
      query(collection(db, "course_progress"), where("course_id", "==", courseId), where("student_id", "==", user.uid)),
      (snap) => {
        if (!snap.empty) {
          setProgress({ id: snap.docs[0].id, ...snap.docs[0].data() } as Progress);
        } else {
          setProgress(null);
        }
      }
    );
    return () => unsub();
  }, [user, courseId]);

  // ✅ ИСПРАВЛЕНИЕ 2: Загрузка списка ДЗ для привязки к уроку
  useEffect(() => {
    if (user && profile?.role === 'tutor' && (showLessonModal || showEditLessonModal)) {
      getDocs(query(collection(db, "homeworks"), where("tutor_id", "==", user.uid)))
        .then(snap => setAvailableHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(err => console.error("Ошибка загрузки ДЗ:", err));
    }
  }, [user, profile, showLessonModal, showEditLessonModal]);

  const uid = user?.uid || searchParams.get("uid") || "";
  const role = profile?.role || "student";
  const isTutor = role === "tutor";
  const isStudent = role === "student";
  const isOwner = isTutor && course?.tutor_id === user?.uid;

  const allLessons = useMemo(() => {
    if (!course) return [];
    const lessons: Lesson[] = [];
    course.sections?.forEach(section => {
      section.lessons?.forEach(lesson => {
        if (lesson.published) lessons.push(lesson);
      });
    });
    return lessons;
  }, [course]);

  const completedCount = progress?.completed_lessons?.length || 0;
  const totalLessons = allLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const isCourseCompleted = progressPercent === 100 && totalLessons > 0;
  const totalDuration = allLessons.reduce((sum, l) => sum + (l.duration || 0), 0);

  const handleCoursePayment = async (provider: 'lava' | 'prodamus' | 'manual') => {
    if (!course || !user) return;
    if (provider === 'manual') {
      setPaymentProvider('manual');
      return;
    }
    setIsPaying(true);
    setPaymentProvider(provider);
    try {
      const orderId = `course_${course.id}_${user.uid}_${Date.now()}`;
      const endpoint = provider === 'lava' ? '/api/payments/lava/create' : '/api/payments/prodamus/create';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: course.price,
          orderId,
          description: `Курс: ${course.title}`,
          studentId: user.uid,
          tutorId: course.tutor_id,
          payment_type: 'course',
          course_id: course.id
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
    if (!receiptFile || !course || !user) return;
    setUploadingReceipt(true);
    try {
      const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`);
      await uploadBytes(storageRef, receiptFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      // 1. Создаем заявку на оплату
      await addDoc(collection(db, "payment_requests"), {
        student_id: user.uid,
        tutor_id: course.tutor_id,
        item_id: course.id,
        item_type: "course",
        item_name: course.title,
        amount: course.price,
        receipt_url: downloadURL,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // ✅ ИСПРАВЛЕНИЕ 6: Сразу создаем/обновляем прогресс со статусом 'pending', чтобы UI изменился
      await setDoc(doc(db, "course_progress", `${course.id}_${user.uid}`), {
        course_id: course.id,
        student_id: user.uid,
        completed_lessons: [],
        status: 'active',
        payment_status: 'pending', // Ждет подтверждения репетитора
        started_at: new Date().toISOString(),
      }, { merge: true });

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

  const addSection = async () => {
    if (!newSectionTitle.trim() || !course) return;
    setSavingSection(true);
    try {
      const newSection: Section = {
        id: `section_${Date.now()}`,
        title: newSectionTitle.trim(),
        description: newSectionDesc.trim(),
        lessons: [],
        created_at: new Date().toISOString(),
      };
      const updatedSections = [...(course.sections || []), newSection];
      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });
      toast.success("✨ Раздел создан!");
      setShowSectionModal(false);
      setNewSectionTitle("");
      setNewSectionDesc("");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setSavingSection(false);
    }
  };

  const updateSection = async (sectionId: string) => {
    if (!course) return;
    setSavingSection(true);
    try {
      const updatedSections = course.sections.map((s: any) => 
        s.id === sectionId ? { ...s, title: newSectionTitle, description: newSectionDesc } : s
      );
      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });
      toast.success("✅ Раздел обновлён!");
      setShowEditSectionModal(null);
      setNewSectionTitle("");
      setNewSectionDesc("");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setSavingSection(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!course) return;
    if (!confirm("Удалить раздел и все уроки в нём? Это действие нельзя отменить.")) return;
    try {
      const updatedSections = course.sections.filter((s: any) => s.id !== sectionId);
      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });
      toast.success("🗑️ Раздел удалён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    setUploadingFile(true);
    try {
      const storageRef = ref(storage, `lessons/${courseId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      toast.success("Файл загружен!");
      return url;
    } catch (error: any) {
      toast.error("Ошибка загрузки файла: " + error.message);
      return "";
    } finally {
      setUploadingFile(false);
    }
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim() || !course || !selectedSectionId) {
      toast.error("Выберите раздел и введите название урока");
      return;
    }
    setSavingLesson(true);
    try {
      let fileUrl = newLessonFileUrl;
      let fileName = newLessonFileName;
      
      if (newLessonFile) {
        const uploadedUrl = await handleFileUpload(newLessonFile);
        if (uploadedUrl) {
          fileUrl = uploadedUrl;
          fileName = newLessonFile.name;
        }
      }

      const newLesson: Lesson = {
        id: `lesson_${Date.now()}`,
        title: newLessonTitle.trim(),
        description: newLessonDesc.trim(),
        video_url: newLessonVideoUrl.trim(),
        content: newLessonContent.trim(),
        duration: newLessonDuration,
        published: newLessonPublished,
        file_url: fileUrl,
        file_name: fileName,
        lesson_type: newLessonType,
        homework_id: selectedHomeworkId || undefined, // ✅ Сохраняем привязку ДЗ
        created_at: new Date().toISOString(),
      };

      const updatedSections = course.sections.map((s: any) => 
        s.id === selectedSectionId 
          ? { ...s, lessons: [...(s.lessons || []), newLesson] }
          : s
      );

      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });

      if (newLessonPublished) {
        try {
          const progressSnap = await getDocs(
            query(collection(db, "course_progress"), where("course_id", "==", course.id), where("payment_status", "==", "paid"))
          );
          let sentCount = 0;
          for (const progressDoc of progressSnap.docs) {
            const studentId = progressDoc.data().student_id;
            const message = `📚 Новый урок в курсе "${course.title}"!\n\n🎯 ${newLessonTitle}\n\nЗаходи в личный кабинет и начинай обучение! 🚀`;
            const sent = await sendTelegramToStudent(studentId, message);
            if (sent) sentCount++;
          }
          if (sentCount > 0) toast.success(`✨ Урок добавлен! Уведомления отправлены ${sentCount} ученикам`);
          else toast.success("✨ Урок добавлен!");
        } catch (error) {
          toast.success("✨ Урок добавлен!");
        }
      } else {
        toast.success("✨ Урок добавлен как черновик!");
      }

      setShowLessonModal(false);
      resetLessonForm();
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setSavingLesson(false);
    }
  };

  const updateLesson = async (lessonId: string) => {
    if (!course) return;
    setSavingLesson(true);
    try {
      let fileUrl = newLessonFileUrl;
      let fileName = newLessonFileName;
      
      if (newLessonFile) {
        const uploadedUrl = await handleFileUpload(newLessonFile);
        if (uploadedUrl) {
          fileUrl = uploadedUrl;
          fileName = newLessonFile.name;
        }
      }

      const updatedSections = course.sections.map((s: any) => ({
        ...s,
        lessons: s.lessons.map((l: any) => 
          l.id === lessonId ? { 
            ...l, 
            title: newLessonTitle, 
            description: newLessonDesc, 
            video_url: newLessonVideoUrl, 
            content: newLessonContent, 
            duration: newLessonDuration, 
            published: newLessonPublished,
            file_url: fileUrl,
            file_name: fileName,
            lesson_type: newLessonType,
            homework_id: selectedHomeworkId || undefined, // ✅ Обновляем привязку ДЗ
          } : l
        )
      }));

      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });
      toast.success("✅ Урок обновлён!");
      setShowEditLessonModal(null);
      resetLessonForm();
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    } finally {
      setSavingLesson(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!course) return;
    if (!confirm("Удалить урок? Это действие нельзя отменить.")) return;
    try {
      const updatedSections = course.sections.map((s: any) => ({
        ...s,
        lessons: s.lessons.filter((l: any) => l.id !== lessonId)
      }));
      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });
      toast.success("🗑️ Урок удалён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const toggleLessonPublish = async (lessonId: string) => {
    if (!course) return;
    try {
      const updatedSections = course.sections.map((s: any) => ({
        ...s,
        lessons: s.lessons.map((l: any) => 
          l.id === lessonId ? { ...l, published: !l.published } : l
        )
      }));
      await updateDoc(doc(db, "courses", course.id), {
        sections: updatedSections,
        updated_at: new Date().toISOString(),
      });
      toast.success("Статус урока изменён");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!progress || !user) return;
    try {
      const completedLessons = [...(progress.completed_lessons || []), lessonId];
      await updateDoc(doc(db, "course_progress", progress.id), {
        completed_lessons: completedLessons,
        status: completedLessons.length === totalLessons ? 'completed' : 'active',
        last_lesson_at: new Date().toISOString(),
        ...(completedLessons.length === totalLessons ? { completed_at: new Date().toISOString() } : {}),
      });
      toast.success("✅ Урок отмечен как пройденный!");
    } catch (error: any) {
      toast.error("Ошибка: " + error.message);
    }
  };

  const deleteCourse = async () => {
    if (!course) return;
    if (deleteConfirmText !== course.title) {
      toast.error("Название курса не совпадает");
      return;
    }
    try {
      await deleteDoc(doc(db, "courses", course.id));
      toast.success("🗑️ Курс удалён");
      window.location.href = `/courses?uid=${uid}&role=${role}`;
    } catch (error: any) {
      toast.error("Ошибка удаления: " + error.message);
    }
  };

  const resetLessonForm = () => {
    setNewLessonTitle(""); setNewLessonDesc(""); setNewLessonVideoUrl("");
    setNewLessonContent(""); setNewLessonDuration(30); setNewLessonPublished(true);
    setNewLessonFile(null); setNewLessonFileUrl(""); setNewLessonFileName("");
    setNewLessonType('video'); setSelectedSectionId(""); setSelectedHomeworkId("");
  };

  const shareCourse = async () => {
    if (!course) return;
    const shareUrl = `${window.location.origin}/courses/${course.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("🔗 Ссылка скопирована!");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const bg = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50';
  const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-900';

  if (loadingAuth || loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-violet-600 font-medium animate-pulse">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className={`${cardBg} rounded-3xl p-8 border max-w-md text-center shadow-xl`}>
          <div className="text-6xl mb-4">📚</div>
          <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Курс не найден</h2>
          <p className={`${textSecondary} mb-6`}>Возможно, он был удалён или ссылка неверна</p>
          <Link href={`/courses?uid=${uid}&role=${role}`} className="inline-block px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-semibold hover:scale-105 transition-transform">← Вернуться к курсам</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300 relative overflow-hidden`}>
      <Toaster position="top-right" />

      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-8xl">📚</div>
        <div className="absolute bottom-20 right-10 text-7xl">🐉</div>
        <div className="absolute top-1/3 right-1/4 text-6xl">✨</div>
        <div className="absolute bottom-1/3 left-1/4 text-6xl">👑</div>
        <div className="absolute top-1/2 left-1/3 text-5xl">🎸</div>
      </div>

      <div className="max-w-6xl mx-auto p-6 relative z-10">
        <motion.nav initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center gap-2 text-sm ${textSecondary} mb-6 flex-wrap`}>
          <Link href={`/courses?uid=${uid}&role=${role}`} className="flex items-center gap-2 hover:text-violet-500 transition">
            <ArrowLeft className="w-4 h-4" /><span>Курсы</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          <BookOpen className="w-4 h-4" />
          <span className={textPrimary}>Детали курса</span>
        </motion.nav>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-3xl overflow-hidden shadow-xl border mb-8`}>
          <div className={`h-64 relative overflow-hidden ${course.cover && course.cover.startsWith('http') ? '' : `bg-gradient-to-br ${course.cover || 'from-violet-400 to-purple-600'}`}`}>
            {course.cover && course.cover.startsWith('http') && (
              <img src={course.cover} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-3 py-1.5 bg-white/95 backdrop-blur rounded-full text-xs font-bold text-gray-700 shadow-sm">
                  {SUBJECTS[course.subject]?.icon} {SUBJECTS[course.subject]?.label}
                </span>
                {course.access_type === 'free' && <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-sm">🆓 Бесплатно</span>}
                {course.access_type === 'paid' && <span className="px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-bold shadow-sm">💰 {course.price} ₽</span>}
                {course.access_type === 'assigned' && <span className="px-3 py-1.5 bg-violet-500 text-white rounded-full text-xs font-bold shadow-sm">🔒 По назначению</span>}
                {course.published ? (
                  <span className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold shadow-sm">✅ Опубликовано</span>
                ) : (
                  <span className="px-3 py-1.5 bg-gray-500 text-white rounded-full text-xs font-bold shadow-sm">📝 Черновик</span>
                )}
              </div>
              <h1 className="text-4xl font-black text-white mb-2 drop-shadow-lg">{course.title}</h1>
              <p className="text-white/90 text-lg drop-shadow line-clamp-2">{course.description}</p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-violet-50'} border ${darkMode ? 'border-gray-600' : 'border-violet-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-5 h-5 text-violet-500" />
                  <span className={`text-xs ${textSecondary} font-medium`}>Уроков</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{totalLessons}</p>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border ${darkMode ? 'border-gray-600' : 'border-blue-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className={`text-xs ${textSecondary} font-medium`}>Длительность</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{formatDuration(totalDuration)}</p>
              </div>
              <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-emerald-50'} border ${darkMode ? 'border-gray-600' : 'border-emerald-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="w-5 h-5 text-emerald-500" />
                  <span className={`text-xs ${textSecondary} font-medium`}>Разделов</span>
                </div>
                <p className={`text-2xl font-black ${textPrimary}`}>{course.sections?.length || 0}</p>
              </div>
              {course.students_count && course.students_count > 0 && (
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-amber-50'} border ${darkMode ? 'border-gray-600' : 'border-amber-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-amber-500" />
                    <span className={`text-xs ${textSecondary} font-medium`}>Учеников</span>
                  </div>
                  <p className={`text-2xl font-black ${textPrimary}`}>{course.students_count}</p>
                </div>
              )}
            </div>

            {course.tags && course.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {course.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">🏷️ {tag}</span>
                ))}
              </div>
            )}

            {/* ✅ ИСПРАВЛЕНИЕ 6: Статус "Ожидает проверки" для ученика */}
            {isStudent && progress && progress.payment_status === 'pending' && (
              <div className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-lg">⏳ Ожидает подтверждения репетитора</h3>
                  <p className="text-amber-700 text-sm">Вы загрузили чек. Как только репетитор его проверит, доступ к курсу откроется автоматически.</p>
                </div>
              </div>
            )}

            {isStudent && progress && progress.payment_status === 'paid' && (
              <div className="mb-6 p-6 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border-2 border-violet-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-violet-600" />
                    <span className="text-lg font-bold text-violet-900">Ваш прогресс</span>
                  </div>
                  <span className="text-2xl font-black text-violet-700">{progressPercent}%</span>
                </div>
                <div className="w-full h-4 bg-violet-200 rounded-full overflow-hidden mb-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-violet-600 font-medium">{completedCount} из {totalLessons} уроков пройдено</span>
                  {progress.started_at && (
                    <span className="text-violet-500 text-xs">
                      Начато: {new Date(progress.started_at).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
                {isCourseCompleted && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white flex items-center gap-3"
                  >
                    <Award className="w-8 h-8" />
                    <div>
                      <p className="font-bold text-lg">🎉 Курс завершён!</p>
                      <p className="text-sm text-emerald-100">Поздравляем с успешным прохождением!</p>
                    </div>
                    <button 
                      onClick={() => setShowCertificateModal(true)}
                      className="ml-auto px-4 py-2 bg-white text-emerald-700 rounded-lg font-bold hover:scale-105 transition-transform"
                      type="button"
                    >
                      📜 Получить сертификат
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {isStudent && course.access_type === 'paid' && progress?.payment_status !== 'paid' && progress?.payment_status !== 'pending' && (
                <button onClick={() => setShowPaymentModal(true)} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2" type="button">
                  <CreditCard className="w-5 h-5" /> Купить за {course.price} ₽
                </button>
              )}
              {isOwner && (
                <>
                  <button onClick={() => { resetLessonForm(); setShowLessonModal(true); }} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2" type="button">
                    <Plus className="w-5 h-5" /> Добавить урок
                  </button>
                  <button onClick={() => setShowSectionModal(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2" type="button">
                    <FolderOpen className="w-5 h-5" /> Добавить раздел
                  </button>
                  <button onClick={() => setShowShareModal(true)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textPrimary} rounded-2xl font-bold hover:scale-105 transition-all flex items-center gap-2`} type="button">
                    <Share2 className="w-5 h-5" /> Поделиться
                  </button>
                  <button onClick={() => setShowDeleteCourseModal(true)} className="px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2" type="button">
                    <Trash2 className="w-5 h-5" /> Удалить курс
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-3xl p-6 shadow-lg border`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-black ${textPrimary} flex items-center gap-2`}>
              <BookOpen className="w-6 h-6 text-violet-500" /> Программа курса
            </h2>
            <span className={`text-sm ${textSecondary} font-medium`}>
              {completedCount}/{totalLessons} пройдено
            </span>
          </div>

          {(!course.sections || course.sections.length === 0) ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <p className={`${textSecondary} text-lg mb-2`}>Курс пока пуст</p>
              <p className={`${textSecondary} text-sm mb-6`}>Добавьте первый раздел и уроки</p>
              {isOwner && (
                <button onClick={() => setShowSectionModal(true)} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-transform" type="button">+ Добавить первый раздел</button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {course.sections.map((section: any, secIdx: number) => {
                const sectionLessons = (section.lessons || []).filter((l: any) => l.published);
                const sectionCompleted = sectionLessons.filter((l: any) => progress?.completed_lessons?.includes(l.id)).length;

                return (
                  <div key={section.id} className={`${darkMode ? 'bg-gray-700/50' : 'bg-gradient-to-br from-violet-50 to-purple-50'} rounded-2xl border-2 ${darkMode ? 'border-gray-600' : 'border-violet-200'} overflow-hidden`}>
                    <div className={`p-5 flex items-center justify-between ${darkMode ? 'bg-gray-700' : 'bg-white/80'} border-b ${darkMode ? 'border-gray-600' : 'border-violet-200'}`}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                          {secIdx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg ${textPrimary}`}>{section.title}</h3>
                          {section.description && <p className={`text-sm ${textSecondary} mt-1`}>{section.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className={`${textSecondary} flex items-center gap-1`}>
                              <BookOpen className="w-3 h-3" /> {sectionLessons.length} уроков
                            </span>
                            {sectionCompleted > 0 && (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {sectionCompleted} пройдено
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setNewSectionTitle(section.title);
                              setNewSectionDesc(section.description || "");
                              setShowEditSectionModal(section.id);
                            }}
                            className="p-2 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition"
                            title="Редактировать раздел"
                            type="button"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteSection(section.id)}
                            className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition"
                            title="Удалить раздел"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {sectionLessons.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className={`${textSecondary} text-sm italic`}>В этом разделе пока нет уроков</p>
                          {isOwner && (
                            <button 
                              onClick={() => {
                                setSelectedSectionId(section.id); 
                                resetLessonForm(); 
                                setSelectedSectionId(section.id); 
                                setShowLessonModal(true); 
                              }}
                              className="mt-3 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                              type="button"
                            >
                              + Добавить урок
                            </button>
                          )}
                        </div>
                      ) : (
                        (() => {
                          // ✅ ИСПРАВЛЕНИЕ 4 и 5: Подсчет глобального индекса для предпросмотра
                          let globalLessonIndex = 0;
                          // Сначала посчитаем все уроки во всех разделах до текущего, чтобы индекс был точным
                          // (Для простоты в этом компоненте мы считаем "плоский" список всех опубликованных уроков курса)
                          
                          return sectionLessons.map((lesson: any, idx: number) => {
                            // Находим глобальный индекс этого урока во всем курсе
                            let currentGlobalIndex = 0;
                            let found = false;
                            for (const sec of course.sections) {
                              for (const l of (sec.lessons || [])) {
                                if (l.published) {
                                  if (l.id === lesson.id) {
                                    globalLessonIndex = currentGlobalIndex;
                                    found = true;
                                    break;
                                  }
                                  currentGlobalIndex++;
                                }
                              }
                              if (found) break;
                            }

                            const isPreview = globalLessonIndex < (course.preview_lessons || 0);
                            const isCompleted = progress?.completed_lessons?.includes(lesson.id);
                            
                            // Логика доступа: Владелец ИЛИ Бесплатный ИЛИ Оплаченный ИЛИ (Платный + это предпросмотр)
                            const canView = isOwner || 
                                           course.access_type === 'free' || 
                                           (progress && progress.payment_status === 'paid') || 
                                           (course.access_type === 'paid' && isPreview);

                            return (
                              <motion.div 
                                key={lesson.id} 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                transition={{ delay: idx * 0.05 }}
                                className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                                  isCompleted 
                                    ? 'bg-emerald-50 border-emerald-300' 
                                    : (canView 
                                        ? 'bg-violet-50 border-violet-300 shadow-md' 
                                        : `${darkMode ? 'bg-gray-800 border-gray-600 opacity-60' : 'bg-white border-gray-100 opacity-60'}`)
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                  isCompleted 
                                    ? 'bg-emerald-500 text-white' 
                                    : canView
                                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {isCompleted ? <Check className="w-5 h-5" /> : (canView ? <Play className="w-5 h-5" /> : <Lock className="w-5 h-5" />)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className={`font-bold ${textPrimary} truncate`}>{lesson.title}</h4>
                                    {isCompleted && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">✅ Пройдено</span>
                                    )}
                                    {canView && !isCompleted && isPreview && course.access_type === 'paid' && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">🎁 Бесплатный предпросмотр</span>
                                    )}
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                      {lesson.lesson_type === 'video' ? '🎥 Видео' : lesson.lesson_type === 'text' ? '📝 Текст' : '🎭 Смешанный'}
                                    </span>
                                  </div>
                                  {lesson.description && (
                                    <p className={`text-sm ${textSecondary} line-clamp-1`}>{lesson.description}</p>
                                  )}
                                  <div className={`flex items-center gap-3 mt-2 text-xs ${textSecondary}`}>
                                    {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.duration} мин</span>}
                                    {lesson.video_url && <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Видео</span>}
                                    {lesson.file_url && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> {lesson.file_name}</span>}
                                    {lesson.homework_id && <span className="flex items-center gap-1 text-amber-600 font-semibold"><ClipboardList className="w-3 h-3" /> Есть ДЗ</span>}
                                  </div>
                                </div>

                                {/* ✅ ИСПРАВЛЕНИЕ 1: Защита от случайного удаления (e.stopPropagation() на контейнере) */}
                                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {canView ? (
                                    <button 
                                      onClick={() => setShowViewLessonModal(lesson)}
                                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 flex items-center gap-1 ${
                                        isCompleted 
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                          : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                                      }`}
                                      type="button"
                                    >
                                      {isCompleted ? '👁️ Повторить' : '▶ Начать'}
                                    </button>
                                  ) : (
                                    <span className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-200 text-gray-500 flex items-center gap-1">
                                      <Lock className="w-4 h-4" /> Закрыто
                                    </span>
                                  )}
                                  
                                  {isOwner && (
                                    <div className="flex items-center gap-1 ml-2 border-l border-gray-300 pl-2">
                                      <button 
                                        onClick={() => {
                                          setNewLessonTitle(lesson.title);
                                          setNewLessonDesc(lesson.description || "");
                                          setNewLessonVideoUrl(lesson.video_url || "");
                                          setNewLessonContent(lesson.content || "");
                                          setNewLessonDuration(lesson.duration || 30);
                                          setNewLessonPublished(lesson.published);
                                          setNewLessonFileUrl(lesson.file_url || "");
                                          setNewLessonFileName(lesson.file_name || "");
                                          setNewLessonType(lesson.lesson_type || 'video');
                                          setSelectedSectionId(section.id);
                                          setSelectedHomeworkId(lesson.homework_id || "");
                                          setShowEditLessonModal(lesson.id);
                                        }}
                                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                        title="Редактировать"
                                        type="button"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => toggleLessonPublish(lesson.id)}
                                        className={`p-2 rounded-lg transition ${
                                          lesson.published 
                                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                        title={lesson.published ? "Скрыть" : "Опубликовать"}
                                        type="button"
                                      >
                                        {lesson.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                      </button>
                                      <button 
                                        onClick={() => deleteLesson(lesson.id)}
                                        className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition"
                                        title="Удалить"
                                        type="button"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isOwner && (
            <button 
              onClick={() => setShowSectionModal(true)}
              className="w-full mt-6 py-4 border-2 border-dashed border-violet-300 rounded-2xl text-violet-600 font-bold hover:bg-violet-50 transition flex items-center justify-center gap-2"
              type="button"
            >
              <Plus className="w-5 h-5" /> Добавить новый раздел
            </button>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${cardBg} rounded-3xl p-6 shadow-lg border mt-8`}>
          <h2 className={`text-2xl font-black ${textPrimary} mb-4 flex items-center gap-2`}>
            <Lightbulb className="w-6 h-6 text-amber-500" /> О курсе
          </h2>
          <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`}>
            <p className={`${textSecondary} leading-relaxed`}>{course.description || "Описание курса не добавлено"}</p>
          </div>
          {course.tutor_name && (
            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center gap-3`}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {course.tutor_name[0]}
              </div>
              <div>
                <p className={`font-bold ${textPrimary}`}>{course.tutor_name}</p>
                <p className={`text-sm ${textSecondary}`}>Автор курса</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* 1. МОДАЛКА ПРОСМОТРА УРОКА */}
      <AnimatePresence>
        {showViewLessonModal && (
          <LessonViewerModal 
            lesson={showViewLessonModal}
            progress={progress}
            darkMode={darkMode}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            course={course}
            onClose={() => setShowViewLessonModal(null)}
            onComplete={markLessonComplete}
          />
        )}
      </AnimatePresence>

      {/* 2. МОДАЛКА ДОБАВЛЕНИЯ РАЗДЕЛА */}
      <AnimatePresence>
        {showSectionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSectionModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border p-6`} onClick={(e) => e.stopPropagation()}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                <FolderOpen className="w-6 h-6 text-violet-500" /> Новый раздел
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название раздела *</label>
                  <input value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="Например: Модуль 1. Введение" className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание (необязательно)</label>
                  <textarea value={newSectionDesc} onChange={(e) => setNewSectionDesc(e.target.value)} rows={3} placeholder="Краткое описание раздела..." className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition resize-none`} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={addSection} disabled={savingSection || !newSectionTitle.trim()} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                    {savingSection ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingSection ? 'Создание...' : '✨ Создать раздел'}
                  </button>
                  <button onClick={() => setShowSectionModal(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. МОДАЛКА РЕДАКТИРОВАНИЯ РАЗДЕЛА */}
      <AnimatePresence>
        {showEditSectionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditSectionModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border p-6`} onClick={(e) => e.stopPropagation()}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                <Edit className="w-6 h-6 text-violet-500" /> Редактировать раздел
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название раздела *</label>
                  <input value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание</label>
                  <textarea value={newSectionDesc} onChange={(e) => setNewSectionDesc(e.target.value)} rows={3} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition resize-none`} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => updateSection(showEditSectionModal)} disabled={savingSection} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                    {savingSection ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {savingSection ? 'Сохранение...' : '💾 Сохранить'}
                  </button>
                  <button onClick={() => setShowEditSectionModal(null)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. МОДАЛКА ДОБАВЛЕНИЯ УРОКА */}
      <AnimatePresence>
        {showLessonModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLessonModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-3xl border max-h-[95vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 flex items-center justify-between sticky top-0 z-10">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Plus className="w-6 h-6" /> Новый урок</h2>
                <button onClick={() => setShowLessonModal(false)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition" type="button"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📂 В какой раздел добавить? *</label>
                  <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`}>
                    <option value="">— Выберите раздел —</option>
                    {course?.sections?.map((sec: any) => (
                      <option key={sec.id} value={sec.id}>{sec.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название урока *</label>
                  <input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} placeholder="Например: Введение в органическую химию" className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание</label>
                  <textarea value={newLessonDesc} onChange={(e) => setNewLessonDesc(e.target.value)} rows={2} placeholder="Краткое описание урока..." className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition resize-none`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Тип урока</label>
                  <div className="grid grid-cols-3 gap-3">
                    {LESSON_TYPES.map(type => (
                      <button key={type.value} onClick={() => setNewLessonType(type.value as any)} className={`p-3 rounded-xl border-2 transition-all ${newLessonType === type.value ? 'border-violet-500 bg-violet-50 text-violet-700' : `${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} ${textSecondary}`}`} type="button">
                        <type.icon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🎥 Ссылка на видео (YouTube, Vimeo)</label>
                  <input value={newLessonVideoUrl} onChange={(e) => setNewLessonVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📝 Текстовый материал (теория)</label>
                  <textarea value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)} rows={8} placeholder="Формулы, правила, примеры..." className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition resize-none font-mono`} />
                </div>
                
                {/* ✅ ИСПРАВЛЕНИЕ 2: Выбор ДЗ из списка */}
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📚 Прикрепить домашнее задание (из банка ДЗ)</label>
                  <select value={selectedHomeworkId} onChange={(e) => setSelectedHomeworkId(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`}>
                    <option value="">— Без домашнего задания —</option>
                    {availableHomeworks.map((hw: any) => (
                      <option key={hw.id} value={hw.id}>{hw.title} ({hw.sections?.length || 0} заданий)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📎 Прикрепить файл (PDF, презентация)</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-violet-200 bg-violet-50'}`}>
                    <input type="file" onChange={(e) => setNewLessonFile(e.target.files?.[0] || null)} className="hidden" id="lesson-file-upload" />
                    <label htmlFor="lesson-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      {newLessonFile ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                          <p className="text-sm font-medium truncate max-w-xs">{newLessonFile.name}</p>
                          <button onClick={(e) => { e.preventDefault(); setNewLessonFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline" type="button">Удалить файл</button>
                        </>
                      ) : newLessonFileName ? (
                        <>
                          <Paperclip className="w-8 h-8 text-violet-500" />
                          <p className="text-sm font-medium truncate max-w-xs">{newLessonFileName} (уже загружен)</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-violet-500" />
                          <p className="text-sm text-stone-600 font-medium">Нажмите, чтобы выбрать файл</p>
                          <p className="text-xs text-stone-400">PDF, DOCX, PPTX до 10 МБ</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>⏱️ Длительность (мин)</label>
                    <input type="number" value={newLessonDuration} onChange={(e) => setNewLessonDuration(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                  </div>
                  <div>
                    <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📊 Статус</label>
                    <select value={newLessonPublished ? 'published' : 'draft'} onChange={(e) => setNewLessonPublished(e.target.value === 'published')} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`}>
                      <option value="published">✅ Опубликован</option>
                      <option value="draft">📝 Черновик</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={addLesson} disabled={savingLesson || uploadingFile || !newLessonTitle.trim() || !selectedSectionId} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                    {(savingLesson || uploadingFile) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {uploadingFile ? 'Загрузка файла...' : savingLesson ? 'Сохранение...' : '💾 Добавить урок'}
                  </button>
                  <button onClick={() => setShowLessonModal(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. МОДАЛКА РЕДАКТИРОВАНИЯ УРОКА */}
      <AnimatePresence>
        {showEditLessonModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditLessonModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-3xl border max-h-[95vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 flex items-center justify-between sticky top-0 z-10">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><Edit className="w-6 h-6" /> Редактировать урок</h2>
                <button onClick={() => setShowEditLessonModal(null)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition" type="button"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Название урока *</label>
                  <input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Описание</label>
                  <textarea value={newLessonDesc} onChange={(e) => setNewLessonDesc(e.target.value)} rows={2} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition resize-none`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>Тип урока</label>
                  <div className="grid grid-cols-3 gap-3">
                    {LESSON_TYPES.map(type => (
                      <button key={type.value} onClick={() => setNewLessonType(type.value as any)} className={`p-3 rounded-xl border-2 transition-all ${newLessonType === type.value ? 'border-violet-500 bg-violet-50 text-violet-700' : `${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} ${textSecondary}`}`} type="button">
                        <type.icon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>🎥 Ссылка на видео</label>
                  <input value={newLessonVideoUrl} onChange={(e) => setNewLessonVideoUrl(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                </div>
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📝 Текстовый материал</label>
                  <textarea value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)} rows={8} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition resize-none font-mono`} />
                </div>
                
                {/* ✅ ИСПРАВЛЕНИЕ 2: Выбор ДЗ при редактировании */}
                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📚 Прикрепить домашнее задание</label>
                  <select value={selectedHomeworkId} onChange={(e) => setSelectedHomeworkId(e.target.value)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`}>
                    <option value="">— Без домашнего задания —</option>
                    {availableHomeworks.map((hw: any) => (
                      <option key={hw.id} value={hw.id}>{hw.title} ({hw.sections?.length || 0} заданий)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📎 Файл урока</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-violet-200 bg-violet-50'}`}>
                    <input type="file" onChange={(e) => setNewLessonFile(e.target.files?.[0] || null)} className="hidden" id="edit-lesson-file-upload" />
                    <label htmlFor="edit-lesson-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      {newLessonFile ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                          <p className="text-sm font-medium truncate max-w-xs">{newLessonFile.name} (новый)</p>
                          <button onClick={(e) => { e.preventDefault(); setNewLessonFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline" type="button">Отменить выбор</button>
                        </>
                      ) : newLessonFileName ? (
                        <>
                          <Paperclip className="w-8 h-8 text-violet-500" />
                          <p className="text-sm font-medium truncate max-w-xs">{newLessonFileName}</p>
                          <button onClick={(e) => { e.preventDefault(); setNewLessonFileUrl(""); setNewLessonFileName(""); }} className="text-xs text-red-500 hover:text-red-700 underline" type="button">Удалить текущий файл</button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-violet-500" />
                          <p className="text-sm text-stone-600 font-medium">Нажмите, чтобы загрузить новый файл</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>⏱️ Длительность (мин)</label>
                    <input type="number" value={newLessonDuration} onChange={(e) => setNewLessonDuration(parseInt(e.target.value) || 0)} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`} />
                  </div>
                  <div>
                    <label className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} font-bold block mb-2`}>📊 Статус</label>
                    <select value={newLessonPublished ? 'published' : 'draft'} onChange={(e) => setNewLessonPublished(e.target.value === 'published')} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-violet-500 focus:outline-none transition`}>
                      <option value="published">✅ Опубликован</option>
                      <option value="draft">📝 Черновик</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => updateLesson(showEditLessonModal)} disabled={savingLesson || uploadingFile} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                    {(savingLesson || uploadingFile) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {uploadingFile ? 'Загрузка файла...' : savingLesson ? 'Сохранение...' : '💾 Сохранить'}
                  </button>
                  <button onClick={() => setShowEditLessonModal(null)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. МОДАЛКА ОПЛАТЫ */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 flex items-center justify-between">
                <h2 className="font-black text-xl text-white flex items-center gap-2"><CreditCard className="w-6 h-6" /> Оплата курса</h2>
                <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition" type="button"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center mb-6">
                  <h3 className={`text-lg font-bold ${textPrimary}`}>{course.title}</h3>
                  <p className="text-4xl font-black text-amber-600 mt-3">{course.price} ₽</p>
                  {course.oldPrice && course.oldPrice > course.price && (
                    <p className="text-sm text-gray-400 line-through mt-1">{course.oldPrice} ₽</p>
                  )}
                </div>
                {paymentProvider === 'manual' ? (
                  <>
                    <p className={`text-sm ${textSecondary} text-center mb-4`}>Загрузите скриншот чека для ручной проверки</p>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-amber-200 bg-amber-50'}`}>
                      <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="hidden" id="receipt-upload" />
                      <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        {receiptFile ? (
                          <>
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                            <p className="text-sm font-medium text-stone-800 truncate max-w-xs">{receiptFile.name}</p>
                            <button onClick={(e) => { e.preventDefault(); setReceiptFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline" type="button">Удалить</button>
                          </>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-amber-500" />
                            <p className="text-sm text-stone-600 font-medium">Нажмите или перетащите файл</p>
                            <p className="text-xs text-stone-400">PNG, JPG до 5 МБ</p>
                          </>
                        )}
                      </label>
                    </div>
                    <button onClick={handleReceiptUpload} disabled={!receiptFile || uploadingReceipt} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                      {uploadingReceipt ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      {uploadingReceipt ? 'Загрузка...' : '✅ Отправить чек'}
                    </button>
                    <button onClick={() => setPaymentProvider(null)} className={`w-full py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${textPrimary} rounded-xl font-medium hover:scale-105 transition-transform`} type="button">← Назад</button>
                  </>
                ) : (
                  <>
                    <p className={`text-sm ${textSecondary} text-center mb-4`}>Выберите удобный способ оплаты:</p>
                    <div className="space-y-3">
                      <button onClick={() => handleCoursePayment('lava')} disabled={isPaying} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50 hover:scale-105" type="button">
                        {isPaying && paymentProvider === 'lava' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-2xl">🌋</span>}
                        Оплатить через Lava
                      </button>
                      <button onClick={() => handleCoursePayment('prodamus')} disabled={isPaying} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50 hover:scale-105" type="button">
                        {isPaying && paymentProvider === 'prodamus' ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-2xl">🟣</span>}
                        Оплатить через Prodamus
                      </button>
                      <button onClick={() => setPaymentProvider('manual')} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white border-2 border-amber-200 text-amber-700 font-bold hover:bg-amber-50 transition hover:scale-105" type="button">
                        <span className="text-2xl">🤝</span> Ручная оплата (Загрузить чек)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. МОДАЛКА ПОДЕЛИТЬСЯ */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border p-6`} onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Поделиться курсом</h2>
                <p className={`text-sm ${textSecondary} mt-2`}>Отправьте ссылку друзьям и ученикам</p>
              </div>
              <div className="flex gap-3">
                <button onClick={shareCourse} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                  <Check className="w-5 h-5" /> Скопировать ссылку
                </button>
                <button onClick={() => setShowShareModal(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Закрыть</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. МОДАЛКА СЕРТИФИКАТА */}
      <AnimatePresence>
        {showCertificateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCertificateModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-2xl border p-8`} onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>🎉 Поздравляем!</h2>
                <p className={`${textSecondary} mb-6`}>Вы успешно завершили курс "{course.title}"</p>
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-br from-violet-50 to-purple-50'} border-2 ${darkMode ? 'border-gray-600' : 'border-violet-200'} mb-6`}>
                  <p className="text-sm text-violet-600 font-bold mb-2">СЕРТИФИКАТ</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{profile?.full_name || "Ученик"}</p>
                  <p className={`text-sm ${textSecondary} mt-2`}>прошёл курс "{course.title}"</p>
                  <p className={`text-xs ${textSecondary} mt-4`}>Дата: {new Date().toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                    <Download className="w-5 h-5" /> Скачать PDF
                  </button>
                  <button onClick={() => setShowCertificateModal(false)} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Закрыть</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. МОДАЛКА УДАЛЕНИЯ КУРСА */}
      <AnimatePresence>
        {showDeleteCourseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteCourseModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`${cardBg} rounded-3xl shadow-2xl w-full max-w-md border-2 border-rose-300 p-6`} onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Удалить курс?</h2>
                <p className={`text-sm ${textSecondary} mt-2`}>Это действие нельзя отменить. Все уроки и прогресс учеников будут потеряны.</p>
              </div>
              <div className="mb-6">
                <label className={`text-xs ${textSecondary} font-bold block mb-2`}>Введите название курса для подтверждения:</label>
                <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={course.title} className={`w-full ${inputBg} border-2 rounded-xl p-3 text-sm focus:border-rose-500 focus:outline-none transition`} />
              </div>
              <div className="flex gap-3">
                <button onClick={deleteCourse} disabled={deleteConfirmText !== course.title} className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 transition-transform" type="button">
                  <Trash2 className="w-5 h-5" /> Удалить навсегда
                </button>
                <button onClick={() => { setShowDeleteCourseModal(false); setDeleteConfirmText(""); }} className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${textPrimary} rounded-xl font-bold hover:scale-105 transition-transform`} type="button">Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CourseDetailContent />
    </Suspense>
  );
}