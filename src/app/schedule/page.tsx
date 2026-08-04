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
import { Upload, File, X, Download, Clock, User, Users, BookOpen, Video, Palette, CheckCircle, Calendar, Archive, RotateCcw, Trash2, Sun, Moon, Hourglass } from "lucide-react";

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

  const bgColor = status === 'active' ? 'bg-red-500 text-white' : status === 'before' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono ${bgColor}`}>
      <span className={status === 'active' ? 'animate-spin inline-block' : ''}>⏱️</span>
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
      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}> Темы урока</label>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
        {topics.map((topic) => (
          <div key={topic} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-red-900/40 text-red-300' : 'bg-gradient-to-br from-red-100 to-rose-100 text-red-700'}`}>
            <span>{topic}</span>
            <button type="button" onClick={() => removeTopic(topic)} className="ml-1 hover:text-red-500 transition">✕</button>
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
          className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`}
        />
        {input && filteredPresets.length > 0 && (
          <div className={`absolute z-40 w-full mt-1 rounded-xl border shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border-red-500/30' : 'bg-white border-gray-200'}`} style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {filteredPresets.slice(0, 5).map(preset => (
              <button key={preset} type="button" onClick={() => addTopic(preset)} className={`w-full text-left px-3 py-2 text-sm transition ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-red-50 text-gray-700'}`}>
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [groups, setGroups] = useState<any[]>([]); // ✅ НОВОЕ: список групп
  const [selectedGroupId, setSelectedGroupId] = useState(""); // ✅ НОВОЕ: выбранная группа
  
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

  const isTutor = role === "tutor";
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

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

  const checkUpcomingLessons = useCallback(async () => {
    if (lessons.length === 0) return;
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
    if (lastCheck === nowKey) return;
    let sentCount = 0;
    for (const lesson of upcomingLessons) {
      const lessonTime = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const subject = lesson.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология';
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
            const studentMsg = `📅 Напоминание о групповом занятии через час!\n\n📚 ${subject}\n👥 Группа: ${groupName}\n🕐 ${lessonTime}${zoomLink}${topics}\n\nНе забудь подготовиться! 💪`;
            await sendTelegramToStudent(participantId, studentMsg);
            sentCount++;
          }
        }
      } else {
        const studentName = lesson.student_name || 'Ученик';
        const tutorMsg = `⏰ Напоминание: занятие через час!\n\n📚 ${subject}\n👤 ${studentName}\n🕐 ${lessonTime}${zoomLink}${topics}${boardLink}`;
        await sendTelegramToTutor(tutorMsg);
        sentCount++;
        const studentMsg = `📅 Напоминание о занятии через час!\n\n📚 ${subject}\n👤 ${studentName}\n🕐 ${lessonTime}${zoomLink}${topics}\n\nНе забудь подготовиться! 💪`;
        await sendTelegramToStudent(lesson.student_id, studentMsg);
        sentCount++;
      }
    }
    localStorage.setItem(lastCheckKey, nowKey);
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
    const q = query(
      collection(db, "lessons"), 
      where(isTutor ? "tutor_id" : "student_id", "==", uid),
      where("start_time", ">=", queryStart.toISOString()),
      where("start_time", "<=", queryEnd.toISOString())
    );
    const unsub = onSnapshot(q, (snap) => {
      setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
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

  useEffect(() => {
    if (lessons.length > 0) checkUpcomingLessons();
  }, [lessons, checkUpcomingLessons]);

  useEffect(() => {
    if (isTutor) {
      getDocs(query(collection(db, "profiles"), where("role", "==", "student"))).then((snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      getDocs(query(collection(db, "library_items"), where("tutor_id", "==", uid))).then((snap) => setLibraryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      
      // ✅ НОВОЕ: Загрузка групп репетитора
      const unsubGroups = onSnapshot(query(collection(db, "groups"), where("tutor_id", "==", uid)), (snap) => {
        setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
      return () => unsubGroups();
    }
  }, [isTutor, uid]);

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
    const isGroup = (form.elements.namedItem("is_group") as HTMLInputElement)?.checked || false;
    const studentId = !isGroup ? formStudentId : null;
    if (!isGroup && !studentId) return toast.error("Выберите ученика!");
    
    // ✅ НОВОЕ: Получаем данные выбранной группы
    const selectedGroupData = groups.find(g => g.id === selectedGroupId);
    const groupName = isGroup ? (selectedGroupData?.name || (form.elements.namedItem("group_name") as HTMLInputElement)?.value || "Группа") : null;
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
    const repeatWeeks = parseInt((form.elements.namedItem("repeat_weeks") as HTMLInputElement)?.value || "0");
    const zoomLink = (form.elements.namedItem("zoom_link") as HTMLInputElement)?.value || "";
    const subject = (form.elements.namedItem("subject") as HTMLSelectElement).value;
    const groupSize = isGroup ? participants.length : 0;
    const studentName = !isGroup ? (students.find((s) => s.id === studentId)?.full_name || "Ученик") : "Группа";
    const subjectName = subject === "chemistry" ? "🧪 Химии" : "🧬 Биологии";
    const dateStr = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const timeStr = `${startTime} – ${endTime}`;
    const topicsStr = formTopics.join(", ");
    
    const baseData: any = {
      tutor_id: uid,
      student_id: studentId,
      student_name: studentName,
      is_group: isGroup,
      group_id: selectedGroupId || null, // ✅ НОВОЕ: связь с группой
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
      toast.success("Занятие обновлено!");
    } else {
      const docRef = await addDoc(collection(db, "lessons"), { ...baseData, status: "scheduled", created_at: new Date().toISOString() });
      if (attachedFile) {
        const fileUrl = await uploadFile(docRef.id);
        if (fileUrl) {
          await updateDoc(docRef, { attached_file_url: fileUrl, attached_file_name: attachedFileName });
        }
      }
      if (!isGroup) {
        const msg = `📅 Привет, ${studentName}!\n\nУ нас запланировано новое занятие по ${subjectName}.\n🗓 Дата: ${dateStr}\n⏰ Время: ${timeStr}${zoomLink ? `\n🔗 Ссылка: ${zoomLink}` : ''}${topicsStr ? `\n🎯 Темы: ${topicsStr}` : ''}\n\nДо встречи! 🧪🧬`;
        sendTelegramToStudent(studentId!, msg);
      } else {
        for (const participantId of participants) {
          const participant = students.find(s => s.id === participantId);
          const participantName = participant?.full_name || 'Ученик';
          const msg = `📅 Привет, ${participantName}!\n\nУ нас запланировано групповое занятие по ${subjectName}.\n👥 Группа: ${groupName}\n🗓 Дата: ${dateStr}\n⏰ Время: ${timeStr}${zoomLink ? `\n🔗 Ссылка: ${zoomLink}` : ''}${topicsStr ? `\n🎯 Темы: ${topicsStr}` : ''}\n\nДо встречи! 🧪🧬`;
          sendTelegramToStudent(participantId, msg);
        }
      }
      if (repeatWeeks > 0) {
        for (let i = 1; i <= repeatWeeks; i++) {
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + i * 7);
          const nextStart = `${nextDate.toISOString().slice(0, 10)}T${startTime}:00`;
          const nextEnd = `${nextDate.toISOString().slice(0, 10)}T${endTime}:00`;
          await addDoc(collection(db, "lessons"), { ...baseData, start_time: nextStart, end_time: nextEnd, status: "scheduled", created_at: new Date().toISOString(), recurring_group: `group_${Date.now()}` });
        }
        toast.success(`Создано ${repeatWeeks + 1} занятий (еженедельно)!`);
      } else {
        toast.success("Занятие создано!");
      }
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

    if (selectedLessonForNotes.hw_template_id) {
      const template = libraryItems.find(item => item.id === selectedLessonForNotes.hw_template_id);
      if (template && template.sections?.length > 0) {
        const totalMaxScore = template.sections.reduce((sum: number, s: any) => sum + (s.max_score || 0), 0);
        await addDoc(collection(db, "homeworks"), {
          tutor_id: uid,
          student_id: selectedLessonForNotes.student_id,
          student_name: selectedLessonForNotes.student_name || "",
          lesson_id: selectedLessonForNotes.id,
          title: `ДЗ после занятия: ${template.title || new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU')}`,
          description: `Автоматически создано после занятия`,
          task_type: "multi",
          sections: template.sections,
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
      const msg = `✅ Занятие проведено!\n\n📅 ${new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}${topicsText}${notesText}\n\nОтличная работа! 🚀`;
      sendTelegramToStudent(selectedLessonForNotes.student_id, msg);
    }

    toast.success("Занятие проведено! Заметки сохранены, отчёт отправлен.");
    setShowNotesModal(false);
    setSelectedLessonForNotes(null);
    setLessonNotes("");
    setLessonTopics([]);
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
      sendTelegramToStudent(lesson.student_id, `🥀 Привет, ${lesson.student_name}.\n\nК сожалению, занятие на ${dateStr} в ${timeStr} отменено.\nПричина: ${reason}.\n\nМы скоро свяжемся для переноса.`);
    } else if (lesson.is_group && lesson.group_participants) {
      const dateStr = new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      const timeStr = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      for (const participantId of lesson.group_participants) {
        sendTelegramToStudent(participantId, `🥀 Групповое занятие "${lesson.group_name}" на ${dateStr} в ${timeStr} отменено.\nПричина: ${reason}.`);
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

  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' : 'bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50'}`}>
      <Sidebar theme={theme} />
      
      <motion.button
        onClick={toggleTheme}
        className={`fixed top-4 right-24 z-50 w-12 h-12 rounded-2xl shadow-lg transition-all flex items-center justify-center ${
          isDark 
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-orange-500/30 hover:shadow-orange-500/50' 
            : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      >
        {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </motion.button>

      <div className="fixed top-4 right-4 z-50"><NotificationBell uid={uid} role={role} isDark={isDark} /></div>
      
      {showNotifications && notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="relative bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-4 shadow-2xl max-w-sm">
              <p className="text-sm font-medium pr-6">{n.message}</p>
              <button onClick={() => setNotifications(notifications.filter(x => x.id !== n.id))} className="absolute top-2 right-2 text-white/60 hover:text-white text-lg">✕</button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative z-20 max-w-6xl mx-auto p-2 sm:p-4 md:p-6 pt-20">
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 ${isDark ? 'text-red-400' : 'bg-gradient-to-r from-red-600 via-rose-500 to-red-700 bg-clip-text text-transparent'}`}>
          Расписание
        </h1>
        <p className={`text-center text-sm mb-6 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
          ✨ Организованное обучение — залог успеха!
        </p>

        <div className={`rounded-2xl p-2 sm:p-3 mb-4 shadow-lg ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-red-500/30' : 'bg-gradient-to-br from-white to-rose-50/50 border border-red-200 shadow-rose-200/50'}`}>
          <div className="flex flex-wrap gap-2 items-center overflow-x-auto pb-2">
            <div className={`flex rounded-xl overflow-hidden border flex-shrink-0 ${isDark ? 'border-red-500/30' : 'border-red-200'}`}>
              <button onClick={() => { setViewMode('week'); setCurrentWeek(0); }} className={`px-2 sm:px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${viewMode === 'week' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md' : isDark ? 'bg-gray-800 text-red-300' : 'bg-white text-red-600'}`}>📅 Неделя</button>
              <button onClick={() => { setViewMode('month'); setCurrentWeek(0); }} className={`px-2 sm:px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${viewMode === 'month' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md' : isDark ? 'bg-gray-800 text-red-300' : 'bg-white text-red-600'}`}>🗓️ Месяц</button>
            </div>
            {isTutor && (
              <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} className={`px-2 sm:px-3 py-1.5 text-xs rounded-xl border flex-shrink-0 ${isDark ? 'bg-gray-800 border-red-500/30 text-red-300' : 'bg-white border-red-200 text-red-700'}`}>
                <option value="all">👤 Все ученики</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            )}
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={`px-2 sm:px-3 py-1.5 text-xs rounded-xl border flex-shrink-0 ${isDark ? 'bg-gray-800 border-red-500/30 text-red-300' : 'bg-white border-red-200 text-red-700'}`}>
              <option value="all">📚 Все предметы</option>
              <option value="chemistry">🧪 Химия</option>
              <option value="biology">🧬 Биология</option>
            </select>
            <button onClick={() => setShowArchive(true)} className={`px-2 sm:px-3 py-1.5 text-xs rounded-xl border transition flex items-center gap-1 flex-shrink-0 whitespace-nowrap ${isDark ? 'bg-gray-800 border-red-500/30 text-red-300 hover:bg-gray-700' : 'bg-gradient-to-br from-white to-rose-50 border-red-200 text-red-700 hover:shadow-md'}`}>
              <Archive className="w-3 h-3" />
              Архив ({cancelledLessons.length})
            </button>
            <div className="flex-1"></div>
            <span className={`text-xs flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500 font-medium'}`}>{getLessonsForDate(new Date()).length} сегодня</span>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setShowStats(!showStats)} className={`text-xl transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`} title="Статистика">📊</button>
              {isTutor && <button onClick={() => { setShowForm(true); setEditLesson(null); setSelectedGroupId(""); setFormStudentId(""); setFormHwTemplateId(""); setFormTopics([]); setFormGroupParticipants([]); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); }} className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm whitespace-nowrap">+ Занятие</button>}
            </div>
          </div>
        </div>

        {showStats && isTutor && (
          <motion.div className={`rounded-2xl p-3 sm:p-4 mb-4 shadow-lg ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-red-500/30' : 'bg-gradient-to-br from-white to-rose-50/50 border border-red-200 shadow-rose-200/50'}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>📊 Статистика по ученикам</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {students.map((s, idx) => {
                const stat = studentStats[s.id] || { total: 0, completed: 0, cancelled: 0, hours: 0 };
                const balance = lessonBalances[s.id] || 0;
                return (
                  <div key={s.id} className={`rounded-xl p-3 border ${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-red-500/20' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100 shadow-sm'}`}>
                    <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{s.full_name}</p>
                    <div className={`flex gap-2 mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span>✅ {stat.completed}</span>
                      <span>📋 {stat.total}</span>
                      <span>⏱️ {stat.hours.toFixed(1)}ч</span>
                      <span className={`font-bold ${balance === 0 ? 'text-red-500' : 'text-green-600'}`}>📦 {balance}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="mb-4">
          <div className={`flex items-center justify-between rounded-2xl p-2 sm:p-3 shadow-lg ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-red-500/30' : 'bg-gradient-to-br from-white to-rose-50/50 border border-red-200 shadow-rose-200/50'}`}>
            <button onClick={() => setCurrentWeek(currentWeek - 1)} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ${isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-gradient-to-br from-white to-rose-50 text-red-600 hover:shadow-md shadow-sm'}`}>←</button>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentWeek(0)} className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-medium transition ${isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-gradient-to-br from-red-100 to-rose-100 text-red-700 hover:shadow-md shadow-sm'}`}>Сегодня</button>
              <span className={`font-semibold text-xs sm:text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{weekStr}</span>
            </div>
            <button onClick={() => setCurrentWeek(currentWeek + 1)} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ${isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-gradient-to-br from-white to-rose-50 text-red-600 hover:shadow-md shadow-sm'}`}>→</button>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 min-w-[500px] sm:min-w-[600px]">
            {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((day, idx) => (
              <div key={day} className={`text-center font-semibold text-[10px] sm:text-xs md:text-sm py-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{day}</div>
            ))}
            {weekDates.map((date: Date, idx: number) => {
              const dateLessons = getLessonsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isCurrentMonth = date.getMonth() === new Date().getMonth();
              return (
                <div key={idx} style={{ minHeight: viewMode === 'month' ? '60px' : '120px' }} className={`rounded-xl sm:rounded-2xl p-1 sm:p-2 transition-all duration-300 ${isToday ? (isDark ? "bg-gradient-to-br from-red-900/50 to-rose-900/50 ring-2 ring-red-400 shadow-lg" : "bg-gradient-to-br from-red-100 to-rose-100 ring-2 ring-red-400 shadow-lg shadow-rose-300/50") : viewMode === 'month' && !isCurrentMonth ? (isDark ? "bg-gray-900/30 opacity-50" : "bg-gray-50/50 opacity-50") : isDark ? "bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800" : "bg-gradient-to-br from-white to-rose-50/30 hover:shadow-md"} ${isDark ? 'border border-red-500/20' : 'border border-red-200 shadow-sm'}`} onDragOver={handleDragOver} onDrop={() => handleDrop(date)}>
                  <div className={`text-center text-xs sm:text-sm font-bold mb-1 sm:mb-2 ${isToday ? (isDark ? "text-red-300" : "text-red-600") : (isDark ? "text-gray-400" : "text-gray-500")}`}>{date.getDate()}{isToday && <span className="ml-1 text-[10px]">✨</span>}</div>
                  <div className={`space-y-1 ${viewMode === 'month' ? 'max-h-[50px]' : 'max-h-[180px]'} overflow-y-auto`}>
                    {dateLessons.slice(0, viewMode === 'month' ? 2 : 10).map((l: any, li: number) => {
                      const startTime = new Date(l.start_time);
                      const endTime = new Date(l.end_time);
                      const balance = lessonBalances[l.student_id] || 0;
                      const isGroup = l.is_group;
                      const statusStyles = { scheduled: isDark ? "border-l-4 border-blue-400 bg-gradient-to-br from-blue-900/30 to-blue-800/20" : "border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50", completed: isDark ? "border-l-4 border-green-400 bg-gradient-to-br from-green-900/30 to-green-800/20 opacity-75" : "border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-green-100/50 opacity-75", cancelled: isDark ? "border-l-4 border-rose-800 bg-gradient-to-br from-rose-950/30 to-rose-900/20 line-through opacity-50" : "border-l-4 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 line-through opacity-50" };
                      return (
                        <motion.div key={l.id} draggable onDragStart={() => handleDragStart(l)} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 + li * 0.05 }} whileHover={{ scale: 1.03, x: 2 }} onClick={(e) => { if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('a')) setSelectedLesson(l); }} className={`group relative p-1 sm:p-1.5 rounded-lg text-[10px] sm:text-xs cursor-grab active:cursor-grabbing transition shadow-sm break-words ${statusStyles[l.status as keyof typeof statusStyles]} cursor-pointer hover:brightness-95`}>
                          {isGroup && <span className="absolute top-0 right-0 text-[8px] sm:text-[10px] bg-gradient-to-r from-purple-500 to-purple-600 text-white px-1 rounded-bl-lg">👥</span>}
                          <div className="font-medium flex items-center gap-1 justify-between">
                            <span className="text-[10px] sm:text-[11px] flex items-center gap-1 min-w-0 flex-1">
                              <span className="flex-shrink-0">{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                              <span className="truncate">{isGroup ? l.group_name : (l.student_name || "Ученик")}</span>
                            </span>
                            {!isGroup && <span className={`text-[8px] sm:text-[9px] px-1 rounded font-bold flex-shrink-0 ${balance > 0 ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' : 'bg-gradient-to-r from-red-100 to-red-200 text-red-700'}`}>📦{balance}</span>}
                          </div>
                          {viewMode === 'week' && <div className={`text-[9px] sm:text-[10px] opacity-70 ${isDark ? 'text-gray-300' : ''}`}>{startTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>}
                          {l.hw_template_id && <div className="mt-1 text-[8px] sm:text-[10px] bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 px-1 py-0.5 rounded inline-block font-bold">📎ДЗ</div>}
                          {l.attached_file_url && <div className="mt-1 text-[8px] sm:text-[10px] bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-1 py-0.5 rounded inline-block font-bold flex items-center gap-1"><File className="w-2 h-2 sm:w-3 sm:h-3" /><span className="truncate max-w-[60px] sm:max-w-[80px]">{l.attached_file_name || "Файл"}</span></div>}
                          <div className={`flex gap-0.5 mt-1 ${isDark ? 'bg-gray-800/90' : 'bg-white/90'} rounded-lg p-0.5 shadow z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
                            {l.status === "scheduled" && (<><button onClick={(e) => { e.stopPropagation(); setStatus(l); }} className="p-0.5 text-xs hover:scale-110 transition">✅</button><button onClick={(e) => { e.stopPropagation(); cancelLesson(l.id); }} className="p-0.5 text-xs hover:scale-110 transition">❌</button></>)}
                            <button onClick={(e) => { e.stopPropagation(); setSelectedLessonForNotes(l); setLessonNotes(l.post_notes || ''); setLessonTopics(l.topics ? l.topics.split(",").map((t: string) => t.trim()) : []); setShowNotesModal(true); setSelectedLesson(null); }} className="p-0.5 text-xs hover:scale-110 transition">📝</button>
                            <button onClick={(e) => { e.stopPropagation(); exportToCalendar(l); }} className="p-0.5 text-xs hover:scale-110 transition">📅</button>
                            {isTutor && (<><button onClick={(e) => { e.stopPropagation(); setEditLesson(l); setShowForm(true); setFormStudentId(l.student_id || ""); setFormHwTemplateId(l.hw_template_id || ""); setFormTopics(l.topics ? l.topics.split(",").map((t: string) => t.trim()) : []); setFormGroupParticipants(l.group_participants || []); setSelectedGroupId(l.group_id || ""); setAttachedFile(null); setAttachedFileName(l.attached_file_name || ""); setAttachedFileUrl(l.attached_file_url || ""); setSelectedLesson(null); }} className="p-0.5 text-xs hover:scale-110 transition">✏️</button><button onClick={(e) => { e.stopPropagation(); deleteLesson(l.id); }} className="p-0.5 text-xs hover:scale-110 transition">🗑️</button></>)}
                          </div>
                        </motion.div>
                      );
                    })}
                    {dateLessons.length > (viewMode === 'month' ? 2 : 10) && <div className={`text-[9px] sm:text-[10px] text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>+{dateLessons.length - (viewMode === 'month' ? 2 : 10)} ещё</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mt-4 sm:mt-6 rounded-2xl p-3 sm:p-4 shadow-lg ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-red-500/30' : 'bg-gradient-to-br from-white to-rose-50/50 border border-red-200 shadow-rose-200/50'}`}>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base ${isDark ? 'text-red-300' : 'text-red-700'}`}>🍂 Сегодня ({new Date().getDate()} {["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"][new Date().getMonth()]})</h3>
          {(() => {
            const todayLessons = getLessonsForDate(new Date());
            if (todayLessons.length === 0) return <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет занятий на сегодня 🎉</p>;
            return (
              <div className="space-y-2">
                {todayLessons.map((l: any, idx: number) => {
                  const startTime = new Date(l.start_time);
                  const endTime = new Date(l.end_time);
                  const balance = lessonBalances[l.student_id] || 0;
                  return (
                    <motion.div key={l.id} className={`flex flex-wrap items-center justify-between p-2 sm:p-3 rounded-xl hover:shadow-lg transition cursor-pointer gap-2 ${l.subject === "chemistry" ? (isDark ? "bg-gradient-to-br from-red-900/30 to-red-800/20 border-l-4 border-red-500" : "bg-gradient-to-br from-red-50 to-rose-50 border-l-4 border-red-500") : (isDark ? "bg-gradient-to-br from-rose-900/30 to-rose-800/20 border-l-4 border-rose-500" : "bg-gradient-to-br from-rose-50 to-pink-50 border-l-4 border-rose-500")}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} whileHover={{ scale: 1.01, x: 3 }} onClick={() => setSelectedLesson(l)}>
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="text-lg flex-shrink-0">{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{l.is_group ? `👥 ${l.group_name}` : (l.student_name || "Ученик")}</p>
                            {!l.is_group && <span className={`text-[9px] sm:text-[10px] px-1.5 rounded font-bold flex-shrink-0 ${balance > 0 ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' : 'bg-gradient-to-r from-red-100 to-red-200 text-red-700'}`}>📦 {balance} ост.</span>}
                            {l.hw_template_id && <span className="text-[9px] sm:text-[10px] px-1.5 rounded font-bold bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 flex-shrink-0">📎 ДЗ</span>}
                            {l.attached_file_url && <div className="text-[9px] sm:text-[10px] px-1.5 rounded font-bold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 flex items-center gap-1 flex-shrink-0"><File className="w-2 h-2 sm:w-3 sm:h-3" /><span className="truncate max-w-[80px] sm:max-w-[100px]">{l.attached_file_name || "Файл"}</span></div>}
                          </div>
                          <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{startTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} – {endTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                          {l.topics && <p className={`text-[10px] sm:text-xs mt-0.5 truncate ${isDark ? 'text-red-400' : 'text-red-500'}`}>🎯 {l.topics}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <RedTimer startTime={startTime} endTime={endTime} />
                        {l.zoom_link && <a href={l.zoom_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] sm:text-xs bg-gradient-to-r from-red-500 to-rose-600 text-white px-2 sm:px-3 py-1 rounded-lg hover:shadow-md transition flex items-center gap-1">🎥 Zoom</a>}
                        <button onClick={(e) => { e.stopPropagation(); exportToCalendar(l); }} className={`text-[10px] sm:text-xs px-2 py-1 rounded-lg transition ${isDark ? 'bg-rose-900/30 text-rose-300 hover:bg-rose-900/50' : 'bg-gradient-to-br from-rose-100 to-rose-200 text-rose-600 hover:shadow-md'}`} title="Экспорт">📅</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <AnimatePresence>
        {selectedLesson && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setSelectedLesson(null)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-white to-rose-50/30'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className={`p-4 sm:p-5 rounded-t-3xl sticky top-0 z-10 ${selectedLesson.subject === 'chemistry' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">{selectedLesson.subject === 'chemistry' ? '🧪' : '🧬'}</div>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-white">{selectedLesson.is_group ? selectedLesson.group_name : selectedLesson.student_name}</h2>
                      <p className="text-white/80 text-xs sm:text-sm">{selectedLesson.subject === 'chemistry' ? 'Химия' : 'Биология'} • {selectedLesson.is_group ? 'Групповое' : 'Индивидуальное'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLesson(null)} className="text-white/80 hover:text-white text-3xl leading-none transition">×</button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${selectedLesson.status === 'scheduled' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700' : selectedLesson.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' : 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700'}`}>
                  {selectedLesson.status === 'scheduled' && '📅 Запланировано'}
                  {selectedLesson.status === 'completed' && '✅ Проведено'}
                  {selectedLesson.status === 'cancelled' && '❌ Отменено'}
                </div>
                <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-gray-50 to-gray-100/50'}`}>
                  <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-rose-500" /><span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ДАТА И ВРЕМЯ</span></div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{new Date(selectedLesson.start_time).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(selectedLesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedLesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}{selectedLesson.duration && ` • ${selectedLesson.duration} мин`}</p>
                </div>
                {selectedLesson.topics && (
                  <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-gray-50 to-gray-100/50'}`}>
                    <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-rose-500" /><span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ТЕМЫ УРОКА</span></div>
                    <div className="flex flex-wrap gap-1.5">{selectedLesson.topics.split(',').map((topic: string, i: number) => (<span key={i} className={`px-2 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-gradient-to-br from-red-900/40 to-red-800/30 text-red-300' : 'bg-gradient-to-br from-red-100 to-rose-100 text-red-700'}`}>{topic.trim()}</span>))}</div>
                  </div>
                )}
                {selectedLesson.zoom_link && <a href={selectedLesson.zoom_link} target="_blank" rel="noopener noreferrer" className="block rounded-xl p-3 bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 transition shadow-md hover:shadow-lg"><div className="flex items-center gap-2 mb-1"><Video className="w-4 h-4" /><span className="text-xs font-bold">ПОДКЛЮЧИТЬСЯ К ZOOM</span></div><p className="text-xs text-white/80 truncate">{selectedLesson.zoom_link}</p></a>}
                {selectedLesson.board_link && <a href={selectedLesson.board_link} target="_blank" rel="noopener noreferrer" className={`block rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30' : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200'} hover:shadow-md transition`}><div className="flex items-center gap-2 mb-1"><Palette className="w-4 h-4 text-purple-500" /><span className={`text-xs font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>ОТКРЫТЬ ДОСКУ</span></div><p className={`text-xs truncate ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{selectedLesson.board_link}</p></a>}
                {selectedLesson.attached_file_url && <a href={selectedLesson.attached_file_url} target="_blank" rel="noopener noreferrer" className={`block rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'} hover:shadow-md transition`}><div className="flex items-center gap-2 mb-1"><File className="w-4 h-4 text-blue-500" /><span className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>СКАЧАТЬ ФАЙЛ</span></div><p className={`text-xs truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{selectedLesson.attached_file_name || 'Материалы к уроку'}</p></a>}
                {selectedLesson.hw_template_id && <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200'}`}><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-amber-500" /><span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>ДОМАШНЕЕ ЗАДАНИЕ</span></div><p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>ДЗ будет создано автоматически после проведения занятия</p></div>}
                {!selectedLesson.is_group && selectedLesson.student_id && lessonBalances[selectedLesson.student_id] !== undefined && (
                  <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-gray-50 to-gray-100/50'}`}>
                    <div className="flex items-center gap-2 mb-1"><User className="w-4 h-4 text-rose-500" /><span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>БАЛАНС УЧЕНИКА</span></div>
                    <p className={`text-lg font-bold ${lessonBalances[selectedLesson.student_id] > 0 ? 'text-green-600' : 'text-red-500'}`}>📦 {lessonBalances[selectedLesson.student_id]} занятий</p>
                  </div>
                )}
                {selectedLesson.is_group && selectedLesson.group_participants && selectedLesson.group_participants.length > 0 && (
                  <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-gray-50 to-gray-100/50'}`}>
                    <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-rose-500" /><span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>УЧАСТНИКИ ГРУППЫ ({selectedLesson.group_participants.length})</span></div>
                    <div className="space-y-1.5">{selectedLesson.group_participants.map((participantId: string) => { const participant = students.find(s => s.id === participantId); return (<div key={participantId} className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-600' : 'bg-gradient-to-br from-white to-purple-50/50'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/30 text-purple-300' : 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700'}`}>{(participant?.full_name || '?')[0]}</div><span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{participant?.full_name || 'Неизвестно'}</span></div>); })}</div>
                  </div>
                )}
                {selectedLesson.post_notes && <div className={`rounded-xl p-3 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700' : 'bg-gradient-to-br from-gray-50 to-gray-100/50'}`}><div className="flex items-center gap-2 mb-2"><span className="text-rose-500">📝</span><span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ЗАМЕТКИ ПОСЛЕ УРОКА</span></div><p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedLesson.post_notes}</p></div>}
                {isTutor && selectedLesson.status === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => setStatus(selectedLesson)} className="py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition shadow-md hover:shadow-lg">✅ Проведено</button>
                    <button onClick={() => cancelLesson(selectedLesson.id)} className="py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-rose-600 hover:to-red-700 transition shadow-md hover:shadow-lg">❌ Отменить</button>
                    <button onClick={() => { setEditLesson(selectedLesson); setShowForm(true); setFormStudentId(selectedLesson.student_id || ""); setFormHwTemplateId(selectedLesson.hw_template_id || ""); setFormTopics(selectedLesson.topics ? selectedLesson.topics.split(",").map((t: string) => t.trim()) : []); setFormGroupParticipants(selectedLesson.group_participants || []); setSelectedGroupId(selectedLesson.group_id || ""); setAttachedFile(null); setAttachedFileName(selectedLesson.attached_file_name || ""); setAttachedFileUrl(selectedLesson.attached_file_url || ""); setSelectedLesson(null); }} className="py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-600 hover:to-indigo-700 transition shadow-md hover:shadow-lg">✏️ Редактировать</button>
                    <button onClick={() => exportToCalendar(selectedLesson)} className={`py-2.5 rounded-xl font-bold text-sm transition shadow-md hover:shadow-lg ${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-600 text-white' : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-800'}`}>📅 В календарь</button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArchive && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setShowArchive(false)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-white to-gray-50/50'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-5 rounded-t-3xl sticky top-0 z-10 bg-gradient-to-r from-gray-700 to-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl"><Archive className="w-6 h-6 text-white" /></div>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-white">📦 Архив отменённых занятий</h2>
                      <p className="text-white/80 text-xs sm:text-sm">{cancelledLessons.length} занятий в архиве</p>
                    </div>
                  </div>
                  <button onClick={() => setShowArchive(false)} className="text-white/80 hover:text-white text-3xl leading-none transition">×</button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                {cancelledLessons.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Архив пуст</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Здесь будут отображаться отменённые занятия</p>
                  </div>
                ) : (
                  cancelledLessons.map((lesson: any) => (
                    <motion.div key={lesson.id} className={`rounded-xl p-4 border-2 border-dashed ${isDark ? 'bg-gradient-to-br from-gray-800/50 to-gray-700/30 border-gray-600' : 'bg-gradient-to-br from-gray-50 to-gray-100/30 border-gray-300'}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                          {lesson.cancel_reason && <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-gradient-to-br from-red-900/20 to-red-800/10' : 'bg-gradient-to-br from-red-50 to-red-100/50'}`}><p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}><span className="font-bold">Причина отмены:</span> {lesson.cancel_reason}</p></div>}
                          {lesson.topics && <div className="mt-2 flex flex-wrap gap-1">{lesson.topics.split(',').map((topic: string, i: number) => (<span key={i} className={`px-2 py-0.5 rounded text-[10px] ${isDark ? 'bg-gradient-to-br from-red-900/40 to-red-800/30 text-red-300' : 'bg-gradient-to-br from-red-100 to-rose-100 text-red-700'}`}>{topic.trim()}</span>))}</div>}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={() => restoreLesson(lesson.id)} className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-xs font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-md hover:shadow-lg flex items-center gap-1"><RotateCcw className="w-3 h-3" /><span className="hidden sm:inline">Восстановить</span></button>
                          <button onClick={() => deleteFromArchive(lesson.id)} className="px-3 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-lg text-xs font-bold hover:from-rose-600 hover:to-red-700 transition shadow-md hover:shadow-lg flex items-center gap-1"><Trash2 className="w-3 h-3" /><span className="hidden sm:inline">Удалить</span></button>
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

      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); }} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-white to-rose-50/30'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-5 rounded-t-3xl sticky top-0 z-10 bg-gradient-to-r from-red-500 to-rose-500">
                <div className="flex items-center justify-between">
                  <div><h2 className="font-bold text-lg sm:text-2xl text-white">{editLesson ? "✏️ Редактировать" : "✨ Создать занятие"}</h2><p className="text-white/80 text-xs sm:text-sm mt-1">Заполните все поля</p></div>
                  <button onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); }} className="text-white/80 hover:text-white text-3xl sm:text-4xl leading-none transition">×</button>
                </div>
              </div>
              <form onSubmit={saveLesson} className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Тип занятия</label>
                      <div className="flex gap-2">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition text-xs sm:text-sm ${isDark ? 'border-gray-700 hover:border-red-500' : 'border-gray-200 hover:border-red-400'}`}>
                          <input type="radio" name="is_group" value="false" defaultChecked className="accent-red-500" onChange={(e) => { const form = e.target.form; if(form) { (form.elements.namedItem("student_select") as HTMLElement).style.display = 'block'; (form.elements.namedItem("group_select_block") as HTMLElement).style.display = 'none'; (form.elements.namedItem("group_name_block") as HTMLElement).style.display = 'none'; (form.elements.namedItem("group_size_block") as HTMLElement).style.display = 'none'; (form.elements.namedItem("group_participants_block") as HTMLElement).style.display = 'none'; } }} />
                          👤 Индивид.
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition text-xs sm:text-sm ${isDark ? 'border-gray-700 hover:border-red-500' : 'border-gray-200 hover:border-red-400'}`}>
                          <input type="radio" name="is_group" value="true" className="accent-red-500" onChange={(e) => { const form = e.target.form; if(form) { (form.elements.namedItem("student_select") as HTMLElement).style.display = 'none'; (form.elements.namedItem("group_select_block") as HTMLElement).style.display = 'block'; (form.elements.namedItem("group_name_block") as HTMLElement).style.display = 'block'; (form.elements.namedItem("group_size_block") as HTMLElement).style.display = 'block'; (form.elements.namedItem("group_participants_block") as HTMLElement).style.display = 'block'; } }} />
                          👥 Группа
                        </label>
                      </div>
                    </div>
                    <div name="student_select">
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👤 Ученик</label>
                      <select value={formStudentId} onChange={(e) => setFormStudentId(e.target.value)} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`}>
                        <option value="">— Выбрать ученика —</option>
                        {students.map((s: any) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
                      </select>
                    </div>
                    
                    {/* ✅ НОВОЕ: Выпадающий список существующих групп */}
                    <div name="group_select_block" style={{ display: 'none' }}>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👥 Выбрать группу</label>
                      <select 
                        value={selectedGroupId} 
                        onChange={(e) => {
                          setSelectedGroupId(e.target.value);
                          const group = groups.find(g => g.id === e.target.value);
                          if (group) {
                            setFormGroupParticipants(group.student_ids || []);
                          } else {
                            setFormGroupParticipants([]);
                          }
                        }}
                        className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`}
                      >
                        <option value="">— Выберите группу из списка —</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.student_ids?.length || 0} уч.)</option>
                        ))}
                      </select>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Участники подставятся автоматически
                      </p>
                    </div>

                    <div name="group_name_block" style={{ display: 'none' }}>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👥 Или введите название новой группы</label>
                      <input type="text" name="group_name" placeholder="Например: ЕГЭ Химия 2027" className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                    </div>
                    <div name="group_participants_block" style={{ display: 'none' }}>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👥 Участники группы</label>
                      <div className={`border-2 rounded-xl p-2 sm:p-3 max-h-32 overflow-y-auto ${isDark ? 'bg-gray-800 border-red-500/30' : 'bg-white border-gray-200'}`}>
                        {students.map((s: any) => (
                          <label key={s.id} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition ${isDark ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}>
                            <input type="checkbox" checked={formGroupParticipants.includes(s.id)} onChange={(e) => { if (e.target.checked) setFormGroupParticipants([...formGroupParticipants, s.id]); else setFormGroupParticipants(formGroupParticipants.filter(id => id !== s.id)); }} className="accent-red-500" />
                            <span className={`text-xs sm:text-sm truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{s.full_name}</span>
                          </label>
                        ))}
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Выбрано: {formGroupParticipants.length} учеников</p>
                    </div>
                    <div name="group_size_block" style={{ display: 'none' }}>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👥 Кол-во учеников</label>
                      <input type="number" name="group_size" min="1" max="20" defaultValue={formGroupParticipants.length || 1} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} readOnly />
                    </div>
                    <div>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📚 Предмет *</label>
                      <select name="subject" required defaultValue={editLesson?.subject || "chemistry"} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`}>
                        <option value="chemistry">🧪 Химия</option>
                        <option value="biology">🧬 Биология</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📅 Дата *</label>
                      <input type="date" name="date" required defaultValue={editLesson?.start_time?.slice(0, 10) || ""} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>⏰ Начало</label><input type="time" name="start_time" required defaultValue={editLesson?.start_time?.slice(11, 16) || ""} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                      <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🕒 Конец</label><input type="time" name="end_time" required defaultValue={editLesson?.end_time?.slice(11, 16) || ""} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                    </div>
                    {!editLesson && <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🔁 Повторять (недель)</label><input type="number" name="repeat_weeks" min="0" max="52" defaultValue="0" placeholder="0 — не повторять" className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>}
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>⏱️ Длительность (мин)</label><input type="number" name="duration" defaultValue={editLesson?.duration || 60} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                    <TopicChips topics={formTopics} setTopics={setFormTopics} theme={theme} />
                    <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎥 Zoom ссылка</label><input type="url" name="zoom_link" defaultValue={editLesson?.zoom_link || ""} placeholder="https://zoom.us/j/..." className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                    <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🖌️ Доска (Miro/Holst)</label><input type="url" name="board_link" defaultValue={editLesson?.board_link || ""} placeholder="https://miro.com/..." className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                    <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📋 Шаблон ДЗ</label><select value={formHwTemplateId} onChange={(e) => setFormHwTemplateId(e.target.value)} className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'}`}><option value="">— Не привязано —</option>{libraryItems.map((item) => (<option key={item.id} value={item.id}>{item.title || "Без названия"} ({item.sections?.length || 0} зад.)</option>))}</select></div>
                    <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📎 Прикрепить файл</label><div className="space-y-2"><input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip" className="hidden" /><button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full border-2 border-dashed rounded-xl p-2 sm:p-3 text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 ${isDark ? 'border-red-500/30 text-red-300 hover:bg-red-500/10' : 'border-red-300 text-red-600 hover:bg-red-50'}`}><Upload className="w-3 h-3 sm:w-4 sm:h-4" />{attachedFile ? attachedFileName : (attachedFileName || "Выбрать файл")}</button>{attachedFileName && !attachedFile && <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>✓ Файл уже прикреплен: {attachedFileName}</p>}{attachedFile && <div className="flex items-center gap-2"><File className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" /><span className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{attachedFileName}</span><button type="button" onClick={() => { setAttachedFile(null); setAttachedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-red-500 hover:text-red-700 flex-shrink-0"><X className="w-3 h-3 sm:w-4 sm:h-4" /></button></div>}</div></div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-4"><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📝 Заметки (план урока)</label><textarea name="notes" rows={4} defaultValue={editLesson?.notes || ""} placeholder="Темы, материалы, домашнее задание..." className={`w-full border-2 rounded-xl p-2 sm:p-3 font-medium text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-6">
                  <button type="submit" disabled={fileUploading} className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base hover:from-red-600 hover:to-rose-700 disabled:opacity-50 transition shadow-lg shadow-rose-500/30 hover:shadow-xl">{fileUploading ? <span className="flex items-center justify-center gap-2"><div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Загрузка...</span> : (editLesson ? "💾 Сохранить" : "✅ Создать")}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); }} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-lg transition ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Отмена</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotesModal && selectedLessonForNotes && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setShowNotesModal(false)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-white to-rose-50/30'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-5 rounded-t-3xl bg-gradient-to-r from-red-500 to-rose-500"><div className="flex items-center justify-between"><div><h2 className="font-bold text-base sm:text-xl text-white">✅ Занятие проведено</h2><p className="text-white/80 text-xs sm:text-sm mt-1">{selectedLessonForNotes?.student_name} • {new Date(selectedLessonForNotes?.start_time || '').toLocaleDateString('ru-RU')}</p></div><button onClick={() => setShowNotesModal(false)} className="text-white/80 hover:text-white text-2xl sm:text-3xl">×</button></div></div>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <TopicChips topics={lessonTopics} setTopics={setLessonTopics} theme={theme} />
                <div><label className={`block text-xs sm:text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📝 Заметки</label><textarea value={lessonNotes} onChange={(e) => setLessonNotes(e.target.value)} rows={5} placeholder="Как прошёл урок, что повторить..." className={`w-full border-2 rounded-xl p-2 sm:p-3 text-sm ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} /></div>
                <div className="flex gap-2 sm:gap-3"><button onClick={saveLessonNotes} className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base hover:from-red-600 hover:to-rose-700 transition shadow-lg shadow-rose-500/30 hover:shadow-xl">💾 Сохранить</button><button onClick={() => setShowNotesModal(false)} className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Отмена</button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setShowReport(false)} />
            <motion.div className={`relative rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-white to-rose-50/30'}`} initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} onClick={(e) => e.stopPropagation()}>
              <div className="p-3 sm:p-4 rounded-t-3xl bg-gradient-to-r from-red-500 to-rose-500"><div className="flex items-center justify-between"><div className="flex items-center gap-2 sm:gap-3"><span className="text-2xl sm:text-3xl">🧣</span><h2 className="font-bold text-base sm:text-xl text-white">📋 Отчёт о занятии</h2></div><button onClick={() => setShowReport(false)} className="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none transition">×</button></div></div>
              <div className="p-3 sm:p-6"><pre className={`text-xs sm:text-sm whitespace-pre-wrap rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border max-h-[250px] sm:max-h-[300px] overflow-auto ${isDark ? 'bg-red-900/20 border-red-500/30 text-gray-200' : 'bg-red-50 border-red-100 text-gray-700'}`}>{reportText}</pre><div className="flex gap-2 sm:gap-3"><button onClick={() => { navigator.clipboard.writeText(reportText); toast.success("Скопировано!"); }} className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-2 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:from-red-600 hover:to-rose-700 transition shadow-lg shadow-rose-500/30 hover:shadow-xl">📋 Копировать</button><button onClick={() => { window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(reportText)}`, '_blank'); }} className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium hover:from-rose-600 hover:to-rose-700 transition shadow-md hover:shadow-lg">✈️ Telegram</button></div></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50"><div className="text-red-500 animate-pulse font-bold">Загрузка расписания...</div></div>}>
      <ScheduleContent />
    </Suspense>
  );
}