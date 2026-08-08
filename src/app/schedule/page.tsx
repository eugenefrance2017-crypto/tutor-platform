"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, getDocs, doc, getDoc, increment, setDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../Sidebar";
import NotificationBell from "../NotificationBell";
import {
  Upload, File, X, Download, Clock, User, Users, BookOpen, Video, Palette,
  CheckCircle, Calendar, Archive, RotateCcw, Trash2, Sun, Moon, Hourglass,
  Beaker, Dna, Pencil, FileText, Link2, Send, Edit3, ChevronRight, Sparkles
} from "lucide-react";
import { renderBoardSnapshot } from "@/lib/boardSnapshot";

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
const storage = getStorage(app);

// ===================== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ =====================

function RedTimer({ startTime, endTime }: { startTime: Date; endTime: Date }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState<'before' | 'active' | 'ended'>('before');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now >= endTime) {
        setStatus('ended');
        setTimeLeft("Завершено");
        clearInterval(interval);
      } else if (now >= startTime) {
        setStatus('active');
        const diff = endTime.getTime() - now.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        const diff = startTime.getTime() - now.getTime();
        const minutes = Math.floor(diff / 60000);
        setTimeLeft(`через ${minutes} мин`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const bgColor = status === 'active'
    ? 'bg-rose-500 text-white'
    : status === 'before'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${bgColor}`}>
      <Clock className={`w-3 h-3 ${status === 'active' ? 'animate-pulse' : ''}`} />
      {timeLeft}
    </div>
  );
}

function TopicChips({ topics, setTopics, theme }: { topics: string[]; setTopics: (t: string[]) => void; theme: string }) {
  const [input, setInput] = useState("");
  const isDark = theme === 'dark';

  const PRESET_TOPICS = [
    "ОВР", "Электролиз", "Оксиды", "Кислоты", "Основания", "Соли",
    "Алканы", "Алкены", "Спирты", "Альдегиды", "Карбоновые кислоты",
    "Клетка", "Митоз", "Мейоз", "Фотосинтез", "Дыхание", "Генетика",
    "Эволюция", "Экосистемы", "Анатомия", "Ботаника", "Зоология"
  ];

  const addTopic = (topic: string) => {
    const trimmed = topic.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
    }
    setInput("");
  };

  const removeTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic));
  };

  const filteredPresets = PRESET_TOPICS.filter(t =>
    t.toLowerCase().includes(input.toLowerCase()) && !topics.includes(t)
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
        {topics.map((topic) => (
          <div key={topic} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${isDark ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            <span>{topic}</span>
            <button type="button" onClick={() => removeTopic(topic)} className="ml-1 hover:text-rose-500 transition">✕</button>
          </div>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault();
              addTopic(input);
            }
          }}
          placeholder="Введите тему и нажмите Enter..."
          className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-rose-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-rose-400 focus:outline-none transition`}
        />
        {input && filteredPresets.length > 0 && (
          <div className={`absolute z-40 w-full mt-1 rounded-xl border shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border-rose-500/30' : 'bg-white border-gray-200'}`} style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {filteredPresets.slice(0, 5).map(preset => (
              <button key={preset} type="button" onClick={() => addTopic(preset)} className={`w-full text-left px-3 py-2 text-sm transition ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-rose-50 text-gray-700'}`}>
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== КАРТОЧКИ УРОКОВ (МИНИМАЛИЗМ) =====================

function LessonCardMobile({ lesson, isDark, onClick, isTodayCard = false }: any) {
  const startTime = new Date(lesson.start_time);
  const endTime = new Date(lesson.end_time);
  const isChem = lesson.subject === "chemistry";
  const isNow = new Date() >= startTime && new Date() <= endTime;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left relative p-4 rounded-2xl border transition-all active:scale-95 ${
        isNow
          ? 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/30'
          : isTodayCard
            ? (isDark ? 'bg-rose-950/30 border-rose-500/40' : 'bg-rose-50/50 border-rose-200')
            : (isDark ? 'bg-gray-900 border-gray-800 hover:border-rose-500/40' : 'bg-white border-gray-100 hover:border-rose-200 hover:shadow-md')
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isNow
            ? 'bg-white/20 text-white'
            : isChem
              ? (isDark ? 'bg-blue-950/40 text-blue-400' : 'bg-blue-50 text-blue-600')
              : (isDark ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
        }`}>
          {isChem ? <Beaker className="w-5 h-5" /> : <Dna className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base ${isNow ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>
            {startTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            <span className={`font-normal mx-1.5 ${isNow ? 'text-white/70' : 'text-gray-400'}`}>–</span>
            <span className={`font-normal ${isNow ? 'text-white/90' : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {endTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className={`text-sm mt-0.5 truncate ${isNow ? 'text-white/90' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {lesson.is_group && <span className="mr-1">👥</span>}
            {lesson.is_group ? lesson.group_name : (lesson.student_name || "Ученик")}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {lesson.hw_template_id && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isNow ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>ДЗ</span>
          )}
          {lesson.attached_file_url && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isNow ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}></span>
          )}
        </div>
      </div>

      {isNow && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white animate-pulse" />
      )}
    </motion.button>
  );
}

function LessonCardDesktop({ lesson, isDark, onClick }: any) {
  const startTime = new Date(lesson.start_time);
  const isChem = lesson.subject === "chemistry";
  const isNow = new Date() >= startTime && new Date() <= new Date(lesson.end_time);
  const statusColor = lesson.status === 'completed' ? 'bg-emerald-500' : lesson.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500';

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left relative p-2.5 rounded-lg transition-all ${
        isNow
          ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-md'
          : (isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:shadow-md border border-gray-100')
      }`}
    >
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${statusColor}`} />

      <div className={`text-[11px] font-bold mb-0.5 ${isNow ? 'text-white/90' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {startTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className={`text-xs font-semibold truncate ${isNow ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>
        {lesson.is_group && <span className="mr-1 text-[10px]">👥</span>}
        {lesson.is_group ? lesson.group_name : (lesson.student_name || "Ученик")}
      </div>
    </motion.button>
  );
}

// ===================== ОСНОВНОЙ КОМПОНЕНТ =====================

function ScheduleContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("student");
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    setUid(searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "");
    setRole(searchParams.get("role") || (typeof window !== "undefined" ? localStorage.getItem("role") : "") || "student");
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) setTheme(savedTheme);
  }, [searchParams]);

  const [lessons, setLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editLesson, setEditLesson] = useState<any>(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [draggedLesson, setDraggedLesson] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLessonForNotes, setSelectedLessonForNotes] = useState<any>(null);
  const [lessonNotes, setLessonNotes] = useState("");
  const [lessonTopics, setLessonTopics] = useState<string[]>([]);
  const [lessonBalances, setLessonBalances] = useState<Record<string, number>>({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [showArchive, setShowArchive] = useState(false);

  const [formStudentId, setFormStudentId] = useState("");
  const [formHwTemplateId, setFormHwTemplateId] = useState("");
  const [formTopics, setFormTopics] = useState<string[]>([]);
  const [formGroupParticipants, setFormGroupParticipants] = useState<string[]>([]);

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileUrl, setAttachedFileUrl] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGroupLesson, setIsGroupLesson] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);

  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  // 🔥 Флаг для предотвращения дублирования уведомлений
  const hasSentRemindersRef = useRef(false);

  const isTutor = role === "tutor";
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // ===================== БИЗНЕС-ЛОГИКА =====================

  const sendTelegramToStudent = useCallback(async (studentId: string, message: string) => {
    try {
      const studentSnap = await getDoc(doc(db, "profiles", studentId));
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        if (studentData.telegram_chat_id) {
          fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, targetChatId: studentData.telegram_chat_id }),
          }).catch(err => console.error("Ошибка отправки уведомления:", err));
        }
      }
    } catch (error) {
      console.error("Ошибка получения профиля ученика:", error);
    }
  }, []);

  const sendTelegramToTutor = useCallback(async (message: string) => {
    try {
      fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }).catch(err => console.error("Ошибка отправки репетитору:", err));
    } catch (error) {
      console.error("Ошибка отправки репетитору:", error);
    }
  }, []);

  const sendAIReportToTelegram = async (lesson: any, notes: string, topics: string) => {
    try {
      let targetChatId = null;
      let recipientName = "Ученик";

      if (lesson.student_id) {
        const profileSnap = await getDoc(doc(db, "profiles", lesson.student_id));
        if (profileSnap.exists()) {
          const pData = profileSnap.data();
          if (pData.parent_id) {
            const parentSnap = await getDoc(doc(db, "profiles", pData.parent_id));
            if (parentSnap.exists() && parentSnap.data().telegram_chat_id) {
              targetChatId = parentSnap.data().telegram_chat_id;
              recipientName = "Родитель";
            }
          }
          if (!targetChatId && pData.telegram_chat_id) {
            targetChatId = pData.telegram_chat_id;
          }
        }
      }

      if (!targetChatId) return;

      const subjectName = lesson.subject === 'chemistry' ? 'Химии' : 'Биологии';
      const dateStr = new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

      const response = await fetch('/api/telegram/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetChatId,
          recipientName,
          studentName: lesson.student_name || 'Ученик',
          subject: subjectName,
          date: dateStr,
          topics: topics || 'Обобщающее повторение',
          notes: notes || 'Ученик хорошо поработал, материал усвоен.',
        }),
      });

      if (!response.ok) {
        console.error("Ошибка отправки ИИ-отчёта");
      }
    } catch (error) {
      console.error("Ошибка в sendAIReportToTelegram:", error);
    }
  };

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ ПРОВЕРКИ НАПОМИНАНИЙ
  const checkUpcomingLessons = useCallback(async () => {
    if (lessons.length === 0) return;
    
    // 🔥 Проверка: уже отправляли в этой сессии?
    if (hasSentRemindersRef.current) return;
    
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const upcomingLessons = lessons.filter(l => {
      if (l.status !== 'scheduled') return false;
      const lessonTime = new Date(l.start_time);
      return lessonTime > now && lessonTime <= oneHourLater;
    });
    
    if (upcomingLessons.length === 0) return;
    
    const lastCheckKey = 'last_reminder_check';
    const lastCheck = localStorage.getItem(lastCheckKey);
    const nowKey = now.toISOString().slice(0, 13);
    
    // Дополнительная проверка через localStorage (между перезагрузками)
    if (lastCheck === nowKey) {
      hasSentRemindersRef.current = true;
      return;
    }
    
    // 🔥 Ставим флаг ДО отправки
    hasSentRemindersRef.current = true;
    localStorage.setItem(lastCheckKey, nowKey);
    
    let sentCount = 0;
    for (const lesson of upcomingLessons) {
      const lessonTime = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const subject = lesson.subject === 'chemistry' ? ' Химия' : '🧬 Биология';
      const zoomLink = lesson.zoom_link ? `\n🔗 Ссылка: ${lesson.zoom_link}` : '';
      const topics = lesson.topics ? `\n🎯 Темы: ${lesson.topics}` : '';
      const boardLink = lesson.board_link ? `\n🖌️ Доска: ${lesson.board_link}` : '';
      
      if (lesson.is_group) {
        const groupName = lesson.group_name || 'Группа';
        const tutorMsg = `⏰ Напоминание: групповое занятие через час!\n\n📚 ${subject}\n👥 Группа: ${groupName}\n🕐 ${lessonTime}${zoomLink}${topics}${boardLink}\n\nУчастников: ${lesson.group_participants?.length || lesson.group_size || 0}`;
        await sendTelegramToTutor(tutorMsg);
        sentCount++;
        
        if (lesson.group_participants && lesson.group_participants.length > 0) {
          for (const participantId of lesson.group_participants) {
            const studentMsg = ` Напоминание о групповом занятии через час!\n\n📚 ${subject}\n👥 Группа: ${groupName}\n ${lessonTime}${zoomLink}${topics}\n\nНе забудь подготовиться! 💪`;
            await sendTelegramToStudent(participantId, studentMsg);
            sentCount++;
          }
        }
      } else {
        const studentName = lesson.student_name || 'Ученик';
        const tutorMsg = `⏰ Напоминание: занятие через час!\n\n📚 ${subject}\n ${studentName}\n🕐 ${lessonTime}${zoomLink}${topics}${boardLink}`;
        await sendTelegramToTutor(tutorMsg);
        sentCount++;
        
        const studentMsg = ` Напоминание о занятии через час!\n\n📚 ${subject}\n ${studentName}\n🕐 ${lessonTime}${zoomLink}${topics}\n\nНе забудь подготовиться! 💪`;
        await sendTelegramToStudent(lesson.student_id, studentMsg);
        sentCount++;
      }
    }
    
    if (sentCount > 0) toast.success(`📤 Отправлено напоминаний: ${sentCount}`);
  }, [lessons, sendTelegramToStudent, sendTelegramToTutor]);

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      if (filterStudent !== 'all' && l.student_id !== filterStudent) return false;
      if (filterSubject !== 'all' && l.subject !== filterSubject) return false;
      return true;
    });
  }, [lessons, filterStudent, filterSubject]);

  const cancelledLessons = useMemo(() => {
    return lessons.filter(l => l.status === 'cancelled').sort((a, b) =>
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [lessons]);

  useEffect(() => {
    if (!isTutor || students.length === 0) return;
    const fetchBalances = async () => {
      try {
        const balances: Record<string, number> = {};
        const balancesSnap = await getDocs(collection(db, "lesson_balances"));
        balancesSnap.forEach(docSnap => { balances[docSnap.id] = docSnap.data().remaining || 0; });
        students.forEach(s => { if (!(s.id in balances)) balances[s.id] = 0; });
        setLessonBalances(balances);
      } catch (e) { console.error("Ошибка загрузки балансов:", e); }
    };
    fetchBalances();
  }, [students, isTutor]);

  const getWeekDates = useCallback(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1 + currentWeek * 7);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeek]);

  const getMonthDates = useCallback(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() + currentWeek, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + currentWeek + 1, 0);
    const dates: Date[] = [];
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() - i);
      dates.push(d);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(now.getFullYear(), now.getMonth() + currentWeek, i));
    }
    while (dates.length % 7 !== 0) {
      const last = dates[dates.length - 1];
      const d = new Date(last);
      d.setDate(last.getDate() + 1);
      dates.push(d);
    }
    return dates;
  }, [currentWeek]);

  const weekDates = viewMode === 'week' ? getWeekDates() : getMonthDates();
  const weekStr = viewMode === 'week'
    ? `${weekDates[0].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} – ${weekDates[6].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`
    : `${weekDates[7]?.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) || weekDates[0].toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}`;

  const getLessonsForDate = useCallback((date: Date) => {
    return filteredLessons.filter((l) => {
      const d = new Date(l.start_time);
      const isSameDate = d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      if (!isSameDate) return false;
      if (l.status === 'cancelled' && !showCancelled) return false;
      return true;
    }).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [filteredLessons, showCancelled]);

  useEffect(() => {
  if (!uid) return;
  const dates = viewMode === 'week' ? getWeekDates() : getMonthDates();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const queryStart = new Date(startDate);
  queryStart.setDate(queryStart.getDate() - 2);
  const queryEnd = new Date(endDate);
  queryEnd.setDate(queryEnd.getDate() + 2);

  if (isTutor) {
    // Репетитор: все свои уроки
    const q = query(
      collection(db, "lessons"),
      where("tutor_id", "==", uid),
      where("start_time", ">=", queryStart.toISOString()),
      where("start_time", "<=", queryEnd.toISOString())
    );
    const unsub = onSnapshot(q, (snap) => {
      setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  } else {
    // Ученик: индивидуальные + групповые, где он участвует
    const qIndividual = query(
      collection(db, "lessons"),
      where("student_id", "==", uid),
      where("start_time", ">=", queryStart.toISOString()),
      where("start_time", "<=", queryEnd.toISOString())
    );

    const qGroup = query(
      collection(db, "lessons"),
      where("is_group", "==", true),
      where("group_participants", "array-contains", uid),
      where("start_time", ">=", queryStart.toISOString()),
      where("start_time", "<=", queryEnd.toISOString())
    );

    const unsubInd = onSnapshot(qIndividual, (snapInd) => {
      const individual = snapInd.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      const unsubGrp = onSnapshot(qGroup, (snapGrp) => {
        const group = snapGrp.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        // Объединяем и убираем дубликаты
        const allMap = new Map();
        [...individual, ...group].forEach(l => allMap.set(l.id, l));
        setLessons(Array.from(allMap.values()));
      });

      return () => unsubGrp();
    });

    return () => unsubInd();
  }
}, [uid, isTutor, viewMode, currentWeek]);

  useEffect(() => {
    if (!uid || !isTutor) return;
    const q = query(
      collection(db, "lessons"),
      where("tutor_id", "==", uid),
      where("status", "==", "cancelled")
    );
    const unsub = onSnapshot(q, (snap) => {
      const cancelled = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cancelled.sort((a, b) => {
        const timeA = new Date(a.cancelled_at || a.start_time).getTime();
        const timeB = new Date(b.cancelled_at || b.start_time).getTime();
        return timeB - timeA;
      });
      setLessons(prev => {
        const activeLessons = prev.filter(l => l.status !== 'cancelled');
        return [...activeLessons, ...cancelled];
      });
    });
    return () => unsub();
  }, [uid, isTutor]);

  // 🔥 ИСПРАВЛЕННЫЙ useEffect для напоминаний
  useEffect(() => {
    if (lessons.length > 0 && !hasSentRemindersRef.current) {
      checkUpcomingLessons();
    }
  }, [lessons, checkUpcomingLessons]);

  // 🔥 Сброс флага при смене недели/режима просмотра
  useEffect(() => {
    hasSentRemindersRef.current = false;
  }, [currentWeek, viewMode]);

  useEffect(() => {
    if (isTutor) {
      getDocs(query(collection(db, "profiles"), where("role", "==", "student"))).then((snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      getDocs(query(collection(db, "library_items"), where("tutor_id", "==", uid))).then((snap) => setLibraryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      getDocs(query(collection(db, "homeworks"), where("tutor_id", "==", uid))).then((snap) =>
        setHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      );

      const unsubGroups = onSnapshot(query(collection(db, "groups"), where("tutor_id", "==", uid)), (snap) => {
        setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
      return () => unsubGroups();
    }
  }, [isTutor, uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setShowStudentDropdown(false);
      }
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setShowGroupDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Файл слишком большой (макс. 10MB)");
        return;
      }
      setAttachedFile(file);
      setAttachedFileName(file.name);
    }
  };

  const uploadFile = async (lessonId: string): Promise<string | null> => {
    if (!attachedFile) return null;
    setFileUploading(true);
    try {
      const fileRef = ref(storage, `lesson_files/${lessonId}/${attachedFile.name}`);
      await uploadBytes(fileRef, attachedFile);
      const url = await getDownloadURL(fileRef);
      setFileUploading(false);
      return url;
    } catch (error) {
      console.error("Ошибка загрузки файла:", error);
      setFileUploading(false);
      toast.error("Ошибка загрузки файла");
      return null;
    }
  };

  const deleteFileFromStorage = async (fileUrl: string) => {
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Ошибка удаления файла:", error);
    }
  };

  const handleDragStart = (lesson: any) => setDraggedLesson(lesson);
  const handleDrop = async (date: Date) => {
    if (!draggedLesson) return;
    const newStart = new Date(draggedLesson.start_time);
    newStart.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    const newEnd = new Date(draggedLesson.end_time);
    newEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    await updateDoc(doc(db, "lessons", draggedLesson.id), {
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    });
    toast.success(`Занятие перенесено на ${date.toLocaleDateString()}`);
    setDraggedLesson(null);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const checkConflicts = (startTime: string, endTime: string, excludeId?: string): boolean => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return filteredLessons.some(l => {
      if (excludeId && l.id === excludeId) return false;
      const lStart = new Date(l.start_time);
      const lEnd = new Date(l.end_time);
      return (start < lEnd && end > lStart) && l.status !== 'cancelled';
    });
  };

  async function saveLesson(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const isGroup = isGroupLesson;
    const studentId = !isGroup ? formStudentId : null;
    if (!isGroup && !studentId) return toast.error("Выберите ученика!");

    const selectedGroupData = groups.find(g => g.id === selectedGroupId);
    const groupName = isGroup ? (selectedGroupData?.name || groupSearch || "Группа") : null;
    const participants = isGroup ? (selectedGroupData?.student_ids || formGroupParticipants) : [];

    if (isGroup && participants.length === 0) return toast.error("Добавьте хотя бы одного участника группы!");

    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const startTime = (form.elements.namedItem("start_time") as HTMLInputElement).value;
    const endTime = (form.elements.namedItem("end_time") as HTMLInputElement).value;
    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTime}:00`;
    if (new Date(endISO) <= new Date(startISO)) return toast.error("Время окончания должно быть позже начала!");
    if (checkConflicts(startISO, endISO, editLesson?.id)) {
      if (!window.confirm("⚠️ Обнаружен конфликт с другим занятием! Продолжить?")) return;
    }
    const hwTemplateId = formHwTemplateId;
    const duration = (form.elements.namedItem("duration") as HTMLInputElement)?.value;
    const zoomLink = (form.elements.namedItem("zoom_link") as HTMLInputElement)?.value || "";
    const subject = (form.elements.namedItem("subject") as HTMLSelectElement).value;
    const groupSize = isGroup ? participants.length : 0;
    const studentName = !isGroup ? (students.find((s) => s.id === studentId)?.full_name || "Ученик") : "Группа";
    const subjectName = subject === "chemistry" ? " Химии" : "🧬 Биологии";
    const dateStr = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const timeStr = `${startTime} – ${endTime}`;
    const topicsStr = formTopics.join(", ");

    const baseData: any = {
      tutor_id: uid,
      student_id: studentId,
      student_name: studentName,
      is_group: isGroup,
      group_id: selectedGroupId || null,
      group_name: groupName,
      group_size: groupSize,
      group_participants: isGroup ? participants : [],
      subject: subject,
      start_time: startISO,
      end_time: endISO,
      duration: duration || 60,
      hw_template_id: hwTemplateId,
      zoom_link: zoomLink,
      board_link: (form.elements.namedItem("board_link") as HTMLInputElement)?.value || "",
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement)?.value || "",
      topics: topicsStr,
    };

    if (editLesson) {
      if (attachedFile) {
        if (editLesson.attached_file_url) await deleteFileFromStorage(editLesson.attached_file_url);
        const fileUrl = await uploadFile(editLesson.id);
        if (fileUrl) {
          baseData.attached_file_url = fileUrl;
          baseData.attached_file_name = attachedFileName;
        }
      }
      await updateDoc(doc(db, "lessons", editLesson.id), baseData);
      if (!editLesson.board_link) {
        await updateDoc(doc(db, "lessons", editLesson.id), { board_link: `${window.location.origin}/lesson/${editLesson.id}` });
      }
      toast.success("Занятие обновлено!");
    } else {
      const docRef = await addDoc(collection(db, "lessons"), { ...baseData, status: "scheduled", created_at: new Date().toISOString() });
      await updateDoc(docRef, { board_link: `${window.location.origin}/lesson/${docRef.id}` });
      if (attachedFile) {
        const fileUrl = await uploadFile(docRef.id);
        if (fileUrl) {
          await updateDoc(docRef, { attached_file_url: fileUrl, attached_file_name: attachedFileName });
        }
      }
      if (!isGroup) {
        const msg = `Привет, ${studentName}!\n\nУ нас запланировано новое занятие по ${subjectName}.\n📅 Дата: ${dateStr}\n⏰ Время: ${timeStr}${zoomLink ? `\n🔗 Ссылка: ${zoomLink}` : ''}${topicsStr ? `\n Темы: ${topicsStr}` : ''}\n\nДо встречи! 🧪🧬`;
        sendTelegramToStudent(studentId!, msg);
      } else {
        for (const participantId of participants) {
          const participant = students.find(s => s.id === participantId);
          const participantName = participant?.full_name || 'Ученик';
          const msg = `Привет, ${participantName}!\n\nУ нас запланировано групповое занятие по ${subjectName}.\n👥 Группа: ${groupName}\n📅 Дата: ${dateStr}\n⏰ Время: ${timeStr}${zoomLink ? `\n🔗 Ссылка: ${zoomLink}` : ''}${topicsStr ? `\n🎯 Темы: ${topicsStr}` : ''}\n\nДо встречи! 🧪🧬`;
          sendTelegramToStudent(participantId, msg);
        }
      }
      toast.success("Занятие создано!");
    }
    form.reset();
    setShowForm(false);
    setEditLesson(null);
    setSelectedGroupId("");
    setFormStudentId("");
    setFormHwTemplateId("");
    setFormTopics([]);
    setFormGroupParticipants([]);
    setAttachedFile(null);
    setAttachedFileUrl("");
    setAttachedFileName("");
    setIsGroupLesson(false);
    setStudentSearch("");
    setGroupSearch("");
  }

  async function deleteLesson(id: string) {
    const lesson = lessons.find(l => l.id === id);
    if (!lesson) return;
    if (window.confirm("Удалить занятие навсегда?")) {
      if (lesson.attached_file_url) await deleteFileFromStorage(lesson.attached_file_url);
      await deleteDoc(doc(db, "lessons", id));
      toast.success("Занятие удалено!");
      setSelectedLesson(null);
    }
  }

  async function restoreLesson(id: string) {
    if (!window.confirm("Восстановить занятие? Оно вернётся в расписание.")) return;
    try {
      await updateDoc(doc(db, "lessons", id), { status: "scheduled", restored_at: new Date().toISOString() });
      toast.success("✅ Занятие восстановлено!");
    } catch (error) {
      console.error("Ошибка восстановления:", error);
      toast.error("Ошибка восстановления");
    }
  }

  async function deleteFromArchive(id: string) {
    if (!window.confirm("Удалить занятие из архива навсегда?")) return;
    const lesson = lessons.find(l => l.id === id);
    if (lesson?.attached_file_url) await deleteFileFromStorage(lesson.attached_file_url);
    await deleteDoc(doc(db, "lessons", id));
    toast.success("🗑️ Занятие удалено из архива");
  }

  async function setStatus(lesson: any) {
    setSelectedLessonForNotes(lesson);
    setLessonNotes("");
    setLessonTopics(lesson.topics ? lesson.topics.split(",").map((t: string) => t.trim()) : []);
    setShowNotesModal(true);
    setSelectedLesson(null);
  }

  async function saveLessonNotes() {
    if (!selectedLessonForNotes) return;

    const topicsStr = lessonTopics.join(", ");
    const updateData: any = {
      post_notes: lessonNotes,
      post_topics: topicsStr,
      status: "completed",
    };

    try {
      const snapUrl = await renderBoardSnapshot(selectedLessonForNotes.id);
      if (snapUrl) updateData.board_snapshot_url = snapUrl;
    } catch (e) {
      console.error("Ошибка снимка доски:", e);
    }

    if (!selectedLessonForNotes.is_group) {
      const currentBalance = lessonBalances[selectedLessonForNotes.student_id] || 0;
      if (currentBalance > 0) {
        try {
          await updateDoc(doc(db, "lesson_balances", selectedLessonForNotes.student_id), {
            remaining: currentBalance - 1,
            last_updated: new Date().toISOString()
          });
          setLessonBalances(prev => ({ ...prev, [selectedLessonForNotes.student_id]: currentBalance - 1 }));
        } catch (error) { console.error("Ошибка списания баланса:", error); }
      }
    }

    if (formHwTemplateId) {
      const hw = homeworks.find(item => item.id === formHwTemplateId);
      if (hw && hw.sections?.length > 0) {
        const totalMaxScore = hw.sections.reduce((sum: number, s: any) => sum + (s.max_score || 0), 0);
        await addDoc(collection(db, "homeworks"), {
          tutor_id: uid,
          student_id: selectedLessonForNotes.student_id,
          student_name: selectedLessonForNotes.student_name || "",
          lesson_id: selectedLessonForNotes.id,
          title: `ДЗ после занятия: ${hw.title || new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU')}`,
          description: `Автоматически создано после занятия`,
          task_type: "multi",
          sections: hw.sections,
          max_score: totalMaxScore,
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
    }

    await updateDoc(doc(db, "lessons", selectedLessonForNotes.id), updateData);

    if (!selectedLessonForNotes.is_group && selectedLessonForNotes.student_id) {
      try {
        const resultId = `lesson_${selectedLessonForNotes.id}_${selectedLessonForNotes.student_id}`;
        await setDoc(doc(db, "student_results", resultId), {
          student_id: selectedLessonForNotes.student_id,
          homework_id: selectedLessonForNotes.id,
          homework_title: `Урок: ${selectedLessonForNotes.student_name || 'Ученик'}`,
          homework_type: "lesson",
          subject: selectedLessonForNotes.subject || null,
          score: 1,
          max_score: 1,
          percentage: 100,
          reviewed_at: new Date().toISOString(),
          tutor_id: uid,
          topics: topicsStr,
          notes: lessonNotes,
          created_at: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.error("Ошибка записи снимка урока:", e);
      }
    }

    await sendAIReportToTelegram(selectedLessonForNotes, lessonNotes, topicsStr);

    if (!selectedLessonForNotes.is_group && selectedLessonForNotes.student_id) {
      const topicsText = topicsStr ? `\n🎯 Темы: ${topicsStr}` : '';
      const notesText = lessonNotes ? `\n📝 Заметки: ${lessonNotes}` : '';
      const msg = `✅ Занятие проведено!\n\n ${new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}${topicsText}${notesText}\n\nОтличная работа! 🚀`;
      sendTelegramToStudent(selectedLessonForNotes.student_id, msg);
    }

    toast.success("Занятие проведено! Заметки и снимок доски сохранены, отчёт отправлен.");
    setShowNotesModal(false);
    setSelectedLessonForNotes(null);
    setLessonNotes("");
    setLessonTopics([]);
    setFormHwTemplateId("");
  }

  async function cancelLesson(id: string) {
    const lesson = lessons.find(l => l.id === id);
    if (!lesson) return;
    const reason = prompt("Причина отмены (необязательно):") || "По техническим причинам";
    await updateDoc(doc(db, "lessons", id), {
      status: "cancelled",
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
    });
    if (!lesson.is_group && lesson.student_id) {
      const dateStr = new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      const timeStr = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      sendTelegramToStudent(lesson.student_id, ` Привет, ${lesson.student_name}.\n\nК сожалению, занятие на ${dateStr} в ${timeStr} отменено.\nПричина: ${reason}.\n\nМы скоро свяжемся для переноса.`);
    } else if (lesson.is_group && lesson.group_participants) {
      const dateStr = new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      const timeStr = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      for (const participantId of lesson.group_participants) {
        sendTelegramToStudent(participantId, `🥺 Групповое занятие "${lesson.group_name}" на ${dateStr} в ${timeStr} отменено.\nПричина: ${reason}.`);
      }
    }
    toast.success("Занятие отменено и перемещено в архив!");
    setSelectedLesson(null);
  }

  async function exportToCalendar(lesson: any) {
    const start = new Date(lesson.start_time);
    const end = new Date(lesson.end_time);
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    const safeId = lesson.id ? lesson.id.replace(/[^a-zA-Z0-9]/g, '_') : 'lesson';
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Tutor Platform//Schedule//RU\nBEGIN:VEVENT\nUID:${safeId}@tutor-platform\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(start)}\nDTEND:${formatDate(end)}\nSUMMARY:${lesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"} с ${lesson.student_name || "группой"}\nDESCRIPTION:${lesson.notes || "Занятие"}\n${lesson.zoom_link ? `LOCATION:${lesson.zoom_link}` : ''}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson_${start.toISOString().slice(0, 19)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Экспортировано в календарь!");
  }

  const studentStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; cancelled: number; hours: number }> = {};
    filteredLessons.forEach(l => {
      if (!stats[l.student_id]) stats[l.student_id] = { total: 0, completed: 0, cancelled: 0, hours: 0 };
      stats[l.student_id].total++;
      if (l.status === 'completed') { stats[l.student_id].completed++; stats[l.student_id].hours += (new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 3600000; }
      if (l.status === 'cancelled') stats[l.student_id].cancelled++;
    });
    return stats;
  }, [filteredLessons]);

  // ===================== РЕНДЕР =====================

  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-gray-950' : 'bg-rose-50/30'}`}>
      <Sidebar theme={theme} />

      <motion.button
        onClick={toggleTheme}
        className={`fixed top-4 right-20 z-40 w-11 h-11 rounded-xl shadow-lg transition-all flex items-center justify-center ${isDark ? 'bg-yellow-500 text-gray-900' : 'bg-gray-900 text-white'}`}
        whileTap={{ scale: 0.9 }}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </motion.button>

      <div className="fixed top-4 right-4 z-40"><NotificationBell uid={uid} role={role} isDark={isDark} /></div>

      {showNotifications && notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="relative bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl p-4 shadow-2xl max-w-sm">
              <p className="text-sm font-medium pr-6">{n.message}</p>
              <button onClick={() => setNotifications(notifications.filter(x => x.id !== n.id))} className="absolute top-2 right-2 text-white/60 hover:text-white text-lg">×</button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative z-20 max-w-7xl mx-auto p-4 md:p-6 pt-20 pb-24 md:pb-6">
        <div className="text-center mb-6">
          <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 ${isDark ? 'text-rose-400' : 'bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent'}`}>
            Расписание
          </h1>
          <p className={`text-sm md:text-base ${isDark ? 'text-rose-300/70' : 'text-rose-600/80'}`}>
            Организованное обучение — залог успеха
          </p>
        </div>

        <div className={`rounded-2xl p-3 md:p-4 mb-6 shadow-sm border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <div className={`flex rounded-xl p-1 border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <button onClick={() => { setViewMode('week'); setCurrentWeek(0); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'week' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>Неделя</button>
                <button onClick={() => { setViewMode('month'); setCurrentWeek(0); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'month' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>Месяц</button>
              </div>

              {isTutor && (
                <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} className={`h-10 px-3 rounded-xl border text-sm font-medium outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                  <option value="all">Все ученики</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              )}

              <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={`h-10 px-3 rounded-xl border text-sm font-medium outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                <option value="all">Все предметы</option>
                <option value="chemistry">🧪 Химия</option>
                <option value="biology"> Биология</option>
              </select>

              <button onClick={() => setShowArchive(true)} className={`h-10 px-4 rounded-xl border text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <Archive className="w-4 h-4" /> Архив ({cancelledLessons.length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                {getLessonsForDate(new Date()).length} сегодня
              </span>
              {isTutor && (
                <button
                  onClick={() => { setShowForm(true); setEditLesson(null); setSelectedGroupId(""); setFormStudentId(""); setFormHwTemplateId(""); setFormTopics([]); setFormGroupParticipants([]); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }}
                  className="h-11 px-5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="text-lg leading-none">+</span> Занятие
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-2xl p-3 mb-6 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <button onClick={() => setCurrentWeek(currentWeek - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition active:scale-95">←</button>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentWeek(0)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 transition active:scale-95">Сегодня</button>
            <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{weekStr}</span>
          </div>
          <button onClick={() => setCurrentWeek(currentWeek + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition active:scale-95">→</button>
        </div>

        {/* МОБИЛЬНЫЙ ВИД */}
        <div className="md:hidden space-y-4">
          {weekDates.map((date: Date, idx: number) => {
            const dateLessons = getLessonsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            if (dateLessons.length === 0 && !isToday) return null;

            return (
              <div key={idx} className={`rounded-2xl p-4 border shadow-sm ${isToday ? 'bg-gradient-to-br from-rose-50 to-white border-rose-300 dark:from-rose-950/40 dark:to-gray-900 dark:border-rose-500/50' : isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <div className={`text-sm font-bold mb-3 flex items-center gap-2 ${isToday ? 'text-rose-600 dark:text-rose-400' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {date.toLocaleDateString("ru-RU", { weekday: 'long', day: 'numeric', month: 'long' })}
                  {isToday && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                </div>

                {dateLessons.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">Нет занятий</p>
                ) : (
                  <div className="space-y-2.5">
                    {dateLessons.map((l: any) => (
                      <LessonCardMobile key={l.id} lesson={l} isDark={isDark} onClick={() => setSelectedLesson(l)} isTodayCard={isToday} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ДЕСКТОПНЫЙ ВИД */}
        <div className="hidden md:block overflow-x-auto pb-4">
          <div className="grid grid-cols-7 gap-3 min-w-[900px]">
            {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day) => (
              <div key={day} className={`text-center font-bold text-sm py-2 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{day}</div>
            ))}
            {weekDates.map((date: Date, idx: number) => {
              const dateLessons = getLessonsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={idx} className={`rounded-2xl p-3 transition-all ${isToday ? (isDark ? "bg-rose-950/30 ring-2 ring-rose-500/50" : "bg-rose-50 ring-2 ring-rose-300") : isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-100 shadow-sm"}`} onDragOver={handleDragOver} onDrop={() => handleDrop(date)}>
                  <div className={`text-center text-sm font-bold mb-3 ${isToday ? (isDark ? "text-rose-400" : "text-rose-600") : (isDark ? "text-gray-400" : "text-gray-500")}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto lesson-scroll">
                    {dateLessons.map((l: any) => (
                      <LessonCardDesktop key={l.id} lesson={l} isDark={isDark} onClick={() => setSelectedLesson(l)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Блок "Сегодня" */}
        <div className={`mt-8 rounded-2xl p-4 md:p-6 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
            <Clock className="w-5 h-5" /> Сегодня
          </h3>
          {(() => {
            const todayLessons = getLessonsForDate(new Date());
            if (todayLessons.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Нет занятий на сегодня 🎉</p>;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todayLessons.map((l: any) => (
                  <LessonCardMobile key={l.id} lesson={l} isDark={isDark} onClick={() => setSelectedLesson(l)} isTodayCard />
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ===================== МОДАЛКА УРОКА ===================== */}
      <AnimatePresence>
        {selectedLesson && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={() => setSelectedLesson(null)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className={`p-5 sm:p-6 rounded-t-3xl sticky top-0 z-10 ${selectedLesson.subject === 'chemistry' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                      {selectedLesson.subject === 'chemistry' ? <Beaker className="w-6 h-6 text-white" /> : <Dna className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-white">
                        {selectedLesson.is_group ? selectedLesson.group_name : selectedLesson.student_name}
                      </h2>
                      <p className="text-white/80 text-xs sm:text-sm">
                        {selectedLesson.subject === 'chemistry' ? 'Химия' : 'Биология'} • {selectedLesson.is_group ? 'Групповое' : 'Индивидуальное'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLesson(null)} className="text-white/80 hover:text-white text-3xl leading-none transition">×</button>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                  selectedLesson.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : selectedLesson.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}>
                  {selectedLesson.status === 'scheduled' && '📅 Запланировано'}
                  {selectedLesson.status === 'completed' && '✅ Проведено'}
                  {selectedLesson.status === 'cancelled' && '❌ Отменено'}
                </div>

                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата и время</span>
                  </div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedLesson.start_time).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {new Date(selectedLesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedLesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {selectedLesson.duration && ` • ${selectedLesson.duration} мин`}
                  </p>
                </div>

                {selectedLesson.topics && (
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-rose-500" />
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Темы урока</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLesson.topics.split(',').map((topic: string, i: number) => (
                        <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isDark ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {topic.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLesson.zoom_link && (
                  <a href={selectedLesson.zoom_link} target="_blank" rel="noopener noreferrer" className="block rounded-2xl p-4 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 transition shadow-md hover:shadow-lg active:scale-[0.98]">
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-5 h-5" />
                      <span className="text-sm font-bold">ПОДКЛЮЧИТЬСЯ К ZOOM</span>
                    </div>
                    <p className="text-xs text-white/80 truncate">{selectedLesson.zoom_link}</p>
                  </a>
                )}

                {selectedLesson.board_link && (
                  <a href={selectedLesson.board_link} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl p-4 ${isDark ? 'bg-purple-950/30 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'} hover:shadow-md transition active:scale-[0.98]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Palette className="w-5 h-5 text-purple-500" />
                      <span className={`text-sm font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>ОТКРЫТЬ ДОСКУ</span>
                    </div>
                    <p className={`text-xs truncate ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{selectedLesson.board_link}</p>
                  </a>
                )}

                {selectedLesson.attached_file_url && (
                  <a href={selectedLesson.attached_file_url} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl p-4 ${isDark ? 'bg-blue-950/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'} hover:shadow-md transition active:scale-[0.98]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <File className="w-5 h-5 text-blue-500" />
                      <span className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>СКАЧАТЬ ФАЙЛ</span>
                    </div>
                    <p className={`text-xs truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{selectedLesson.attached_file_name || 'Материалы к уроку'}</p>
                  </a>
                )}

                {selectedLesson.board_snapshot_url && (
                  <a href={selectedLesson.board_snapshot_url} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl p-4 ${isDark ? 'bg-emerald-950/30 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'} hover:shadow-md transition active:scale-[0.98]`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>📸 СНИМОК ДОСКИ</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Как выглядела доска на занятии</p>
                  </a>
                )}

                {selectedLesson.hw_template_id && (
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-amber-950/30 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-5 h-5 text-amber-500" />
                      <span className={`text-sm font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>ДОМАШНЕЕ ЗАДАНИЕ</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>ДЗ будет создано автоматически после проведения занятия</p>
                  </div>
                )}

                {!selectedLesson.is_group && selectedLesson.student_id && lessonBalances[selectedLesson.student_id] !== undefined && (
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-rose-500" />
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Баланс ученика</span>
                    </div>
                    <p className={`text-lg font-bold ${lessonBalances[selectedLesson.student_id] > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      📦 {lessonBalances[selectedLesson.student_id]} занятий
                    </p>
                  </div>
                )}

                {selectedLesson.is_group && selectedLesson.group_participants && selectedLesson.group_participants.length > 0 && (
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-rose-500" />
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Участники группы ({selectedLesson.group_participants.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedLesson.group_participants.map((participantId: string) => {
                        const participant = students.find(s => s.id === participantId);
                        return (
                          <div key={participantId} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-rose-950/40 text-rose-300' : 'bg-rose-100 text-rose-700'}`}>
                              {(participant?.full_name || '?')[0]}
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{participant?.full_name || 'Неизвестно'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedLesson.post_notes && (
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Pencil className="w-4 h-4 text-rose-500" />
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Заметки после урока</span>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedLesson.post_notes}</p>
                  </div>
                )}

                {isTutor && selectedLesson.status === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => setStatus(selectedLesson)} className="h-11 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-teal-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Проведено
                    </button>
                    <button onClick={() => cancelLesson(selectedLesson.id)} className="h-11 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-rose-600 hover:to-red-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2">
                      <X className="w-4 h-4" /> Отменить
                    </button>
                    <button onClick={() => { setEditLesson(selectedLesson); setShowForm(true); setFormStudentId(selectedLesson.student_id || ""); setFormHwTemplateId(selectedLesson.hw_template_id || ""); setFormTopics(selectedLesson.topics ? selectedLesson.topics.split(",").map((t: string) => t.trim()) : []); setFormGroupParticipants(selectedLesson.group_participants || []); setSelectedGroupId(selectedLesson.group_id || ""); setAttachedFile(null); setAttachedFileName(selectedLesson.attached_file_name || ""); setAttachedFileUrl(selectedLesson.attached_file_url || ""); setIsGroupLesson(selectedLesson.is_group || false); setStudentSearch(students.find(s => s.id === selectedLesson.student_id)?.full_name || ""); setSelectedLesson(null); }} className="h-11 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-600 hover:to-indigo-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2">
                      <Edit3 className="w-4 h-4" /> Редактировать
                    </button>
                    <button onClick={() => exportToCalendar(selectedLesson)} className={`h-11 rounded-xl font-bold text-sm transition shadow-md active:scale-95 flex items-center justify-center gap-2 ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                      <Calendar className="w-4 h-4" /> В календарь
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== АРХИВ ===================== */}
      <AnimatePresence>
        {showArchive && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={() => setShowArchive(false)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-5 sm:p-6 rounded-t-3xl sticky top-0 z-10 bg-gradient-to-r from-gray-700 to-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <Archive className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-white">Архив отменённых занятий</h2>
                      <p className="text-white/80 text-xs sm:text-sm">{cancelledLessons.length} занятий в архиве</p>
                    </div>
                  </div>
                  <button onClick={() => setShowArchive(false)} className="text-white/80 hover:text-white text-3xl leading-none transition">×</button>
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                {cancelledLessons.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Архив пуст</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Здесь будут отображаться отменённые занятия</p>
                  </div>
                ) : (
                  cancelledLessons.map((lesson: any) => (
                    <motion.div key={lesson.id} className={`rounded-2xl p-4 border-2 border-dashed ${isDark ? 'bg-gray-800/50 border-gray-600' : 'bg-gray-50 border-gray-300'}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{lesson.subject === 'chemistry' ? '🧪' : '🧬'}</span>
                            <div>
                              <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>{lesson.is_group ? lesson.group_name : lesson.student_name}</h3>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lesson.subject === 'chemistry' ? 'Химия' : 'Биология'} • {lesson.is_group ? 'Групповое' : 'Индивидуальное'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><Calendar className="w-3.5 h-3.5 text-rose-500" /><span>{new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                            <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><Clock className="w-3.5 h-3.5 text-rose-500" /><span>{new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {new Date(lesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span></div>
                          </div>
                          {lesson.cancel_reason && <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-rose-950/20' : 'bg-rose-50'}`}><p className={`text-xs ${isDark ? 'text-rose-300' : 'text-rose-600'}`}><span className="font-bold">Причина отмены:</span> {lesson.cancel_reason}</p></div>}
                          {lesson.topics && <div className="mt-2 flex flex-wrap gap-1">{lesson.topics.split(',').map((topic: string, i: number) => (<span key={i} className={`px-2 py-0.5 rounded text-[10px] ${isDark ? 'bg-rose-950/40 text-rose-300' : 'bg-rose-100 text-rose-700'}`}>{topic.trim()}</span>))}</div>}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={() => restoreLesson(lesson.id)} className="h-10 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-xs font-bold hover:from-emerald-600 hover:to-teal-700 transition shadow-md active:scale-95 flex items-center gap-1"><RotateCcw className="w-3 h-3" /><span className="hidden sm:inline">Восстановить</span></button>
                          <button onClick={() => deleteFromArchive(lesson.id)} className="h-10 px-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-lg text-xs font-bold hover:from-rose-600 hover:to-red-700 transition shadow-md active:scale-95 flex items-center gap-1"><Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Удалить</span></button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ===================== */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }} />
            <motion.div className="relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 p-6 bg-white border-b border-gray-200 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-xl text-gray-900">{editLesson ? "Редактировать занятие" : "Создать занятие"}</h2>
                    <p className="text-gray-500 text-sm mt-1">Заполните основные поля</p>
                  </div>
                  <button onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }} className="text-gray-400 hover:text-gray-600 text-3xl leading-none transition">×</button>
                </div>
              </div>

              <form onSubmit={saveLesson} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Тип занятия</label>
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button type="button" onClick={() => setIsGroupLesson(false)} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all ${!isGroupLesson ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      <span className="text-lg">👤</span><span className="font-medium">Индивидуальное</span>
                    </button>
                    <button type="button" onClick={() => setIsGroupLesson(true)} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all ${isGroupLesson ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                      <span className="text-lg">👥</span><span className="font-medium">Групповое</span>
                    </button>
                  </div>
                  <input type="hidden" name="is_group" value={isGroupLesson ? "true" : "false"} />
                </div>

                {!isGroupLesson && (
                  <div ref={studentDropdownRef}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ученик</label>
                    <div className="relative">
                      <input type="text" value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setShowStudentDropdown(true); const student = students.find(s => s.full_name === e.target.value); if (!student) setFormStudentId(""); }} onFocus={() => setShowStudentDropdown(true)} placeholder={formStudentId ? students.find(s => s.id === formStudentId)?.full_name : "Выберите ученика..."} className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:outline-none transition-all" />
                      {showStudentDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                          {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).map(student => (
                            <button key={student.id} type="button" onClick={() => { setFormStudentId(student.id); setStudentSearch(student.full_name); setShowStudentDropdown(false); }} className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 ${formStudentId === student.id ? 'bg-rose-50 border-l-4 border-rose-500' : ''}`}>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">{student.full_name.charAt(0)}</div>
                              <span className="text-gray-900 font-medium">{student.full_name}</span>
                            </button>
                          ))}
                          {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && <div className="px-4 py-3 text-gray-500 text-center">Ученик не найден</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isGroupLesson && (
                  <div ref={groupDropdownRef}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Группа</label>
                    <div className="relative">
                      <input type="text" value={groupSearch} onChange={(e) => { setGroupSearch(e.target.value); setShowGroupDropdown(true); const group = groups.find(g => g.name === e.target.value); if (!group) { setSelectedGroupId(""); setFormGroupParticipants([]); } }} onFocus={() => setShowGroupDropdown(true)} placeholder={selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : "Выберите группу..."} className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:outline-none transition-all" />
                      {showGroupDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                          {groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).map(group => (
                            <button key={group.id} type="button" onClick={() => { setSelectedGroupId(group.id); setGroupSearch(group.name); setFormGroupParticipants(group.student_ids || []); setShowGroupDropdown(false); }} className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedGroupId === group.id ? 'bg-rose-50 border-l-4 border-rose-500' : ''}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-900 font-medium">{group.name}</span>
                                <span className="text-gray-500 text-sm">{group.student_ids?.length || 0} уч.</span>
                              </div>
                            </button>
                          ))}
                          {groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && <div className="px-4 py-3 text-gray-500 text-center">Группа не найдена</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Дата *</label>
                    <input type="date" name="date" required defaultValue={editLesson?.start_time?.slice(0, 10) || ""} className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-rose-400 focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Начало *</label>
                    <input type="time" name="start_time" required defaultValue={editLesson?.start_time?.slice(11, 16) || ""} onChange={(e) => { const startTime = e.target.value; const endTimeInput = document.querySelector('input[name="end_time"]') as HTMLInputElement; if (endTimeInput && endTimeInput.value) { const start = new Date(`2000-01-01T${startTime}`); const end = new Date(`2000-01-01T${endTimeInput.value}`); const duration = Math.round((end.getTime() - start.getTime()) / 60000); const durationInput = document.querySelector('input[name="duration"]') as HTMLInputElement; if (durationInput && duration > 0) durationInput.value = duration.toString(); } }} className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-rose-400 focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Конец *</label>
                    <input type="time" name="end_time" required defaultValue={editLesson?.end_time?.slice(11, 16) || ""} onChange={(e) => { const endTime = e.target.value; const startTimeInput = document.querySelector('input[name="start_time"]') as HTMLInputElement; if (startTimeInput && startTimeInput.value) { const start = new Date(`2000-01-01T${startTimeInput.value}`); const end = new Date(`2000-01-01T${endTime}`); const duration = Math.round((end.getTime() - start.getTime()) / 60000); const durationInput = document.querySelector('input[name="duration"]') as HTMLInputElement; if (durationInput && duration > 0) durationInput.value = duration.toString(); } }} className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-rose-400 focus:outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Предмет *</label>
                    <select name="subject" required defaultValue={editLesson?.subject || "chemistry"} className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-rose-400 focus:outline-none transition-all bg-white">
                      <option value="chemistry">🧪 Химия</option>
                      <option value="biology"> Биология</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Длительность (авто)</label>
                    <input type="number" name="duration" defaultValue={editLesson?.duration || 60} min={15} max={180} step={15} readOnly className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-500 bg-gray-50 cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Темы урока</label>
                  <TopicChips topics={formTopics} setTopics={setFormTopics} theme="light" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Прикрепить файл</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-rose-400 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip" className="hidden" />
                    {attachedFile || attachedFileName ? (
                      <div className="flex items-center justify-center gap-2 text-gray-700">
                        <span className="text-2xl">📎</span>
                        <span className="font-medium">{attachedFile?.name || attachedFileName}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAttachedFile(null); setAttachedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 text-rose-500 hover:text-rose-700">×</button>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <span className="text-2xl block mb-2">📁</span>
                        <span className="text-sm">Нажмите для загрузки файла</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button type="submit" disabled={fileUploading} className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-base hover:from-rose-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2">
                    {fileUploading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Загрузка...</>) : (editLesson ? "💾 Сохранить" : "✅ Создать")}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }} className="px-6 h-12 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-all active:scale-95">Отмена</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== МОДАЛКА ЗАМЕТОК ПОСЛЕ УРОКА ===================== */}
      <AnimatePresence>
        {showNotesModal && selectedLessonForNotes && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotesModal(false)} />
            <motion.div className="relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 p-6 bg-white border-b border-gray-200 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-xl text-gray-900">✅ Занятие проведено</h2>
                    <p className="text-gray-500 text-sm mt-1">{selectedLessonForNotes.student_name} • {new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <button onClick={() => setShowNotesModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none transition">×</button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Обратная связь по занятию</label>
                  <textarea value={lessonNotes} onChange={(e) => setLessonNotes(e.target.value)} rows={4} placeholder="Как прошло занятие? Что получилось хорошо, над чем нужно поработать..." className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:outline-none transition-all resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Темы, которые прошли</label>
                  <TopicChips topics={lessonTopics} setTopics={setLessonTopics} theme="light" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Прикрепить домашнее задание</label>
                  <button type="button" onClick={() => setShowHomeworkModal(true)} className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 text-left hover:border-rose-400 transition-all flex items-center justify-between active:scale-[0.98]">
                    <span className={formHwTemplateId ? "text-gray-900 font-medium" : "text-gray-400"}>{formHwTemplateId ? homeworks.find(h => h.id === formHwTemplateId)?.title || "ДЗ выбрано" : "Выбрать ДЗ из списка..."}</span>
                    <span className="text-gray-400">→</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Прикрепить файл</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-rose-400 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip" className="hidden" />
                    {attachedFile || attachedFileName ? (
                      <div className="flex items-center justify-center gap-2 text-gray-700">
                        <span className="text-2xl">📎</span>
                        <span className="font-medium">{attachedFile?.name || attachedFileName}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAttachedFile(null); setAttachedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 text-rose-500 hover:text-rose-700">×</button>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <span className="text-2xl block mb-2">📁</span>
                        <span className="text-sm">Нажмите для загрузки файла</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button onClick={saveLessonNotes} className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-base hover:from-rose-600 hover:to-red-700 transition-all active:scale-95">💾 Сохранить</button>
                  <button onClick={() => setShowNotesModal(false)} className="px-6 h-12 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-all active:scale-95">Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== МОДАЛКА ВЫБОРА ДЗ ===================== */}
      <AnimatePresence>
        {showHomeworkModal && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHomeworkModal(false)} />
            <motion.div className="relative rounded-2xl shadow-xl w-full max-w-md bg-white overflow-hidden" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900">Выбрать ДЗ</h3>
                <button onClick={() => setShowHomeworkModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {homeworks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-4xl mb-2"></p>
                    <p>Нет назначенных ДЗ</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {homeworks.map(hw => (
                      <button key={hw.id} type="button" onClick={() => { setFormHwTemplateId(hw.id); setShowHomeworkModal(false); }} className={`w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3 ${formHwTemplateId === hw.id ? 'bg-rose-50 border-2 border-rose-500' : 'border-2 border-transparent'}`}>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white text-lg flex-shrink-0">📚</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{hw.title || "Без названия"}</p>
                          <p className="text-xs text-gray-500">{hw.student_name || "Не назначено"} • {hw.sections?.length || 0} заданий</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200">
                <button type="button" onClick={() => { setFormHwTemplateId(""); setShowHomeworkModal(false); }} className="w-full h-11 rounded-xl text-gray-700 hover:bg-gray-100 transition-all font-medium active:scale-95">Не назначать ДЗ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== МОДАЛКА ОТЧЁТА ===================== */}
      <AnimatePresence>
        {showReport && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={() => setShowReport(false)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-5 rounded-t-3xl bg-gradient-to-r from-rose-500 to-red-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-2xl sm:text-3xl">📋</span>
                    <h2 className="font-bold text-base sm:text-xl text-white">Отчёт о занятии</h2>
                  </div>
                  <button onClick={() => setShowReport(false)} className="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none transition">×</button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <pre className={`text-xs sm:text-sm whitespace-pre-wrap rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border max-h-[250px] sm:max-h-[300px] overflow-auto ${isDark ? 'bg-rose-950/20 border-rose-500/30 text-gray-200' : 'bg-rose-50 border-rose-100 text-gray-700'}`}>{reportText}</pre>
                <div className="flex gap-2 sm:gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(reportText); toast.success("Скопировано!"); }} className="flex-1 h-11 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:from-rose-600 hover:to-red-700 transition shadow-lg active:scale-95">📋 Копировать</button>
                  <button onClick={() => { window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(reportText)}`, '_blank'); }} className="flex-1 h-11 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl text-xs sm:text-sm font-medium hover:from-rose-600 hover:to-red-700 transition shadow-md active:scale-95">✈️ Telegram</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-red-50"><div className="text-rose-500 animate-pulse font-bold">Загрузка расписания...</div></div>}>
      <ScheduleContent />
    </Suspense>
  );
}