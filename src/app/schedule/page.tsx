// ФАЙЛ: app/schedule/page.tsx
// ПРАВКИ В ЭТОМ ФАЙЛЕ (3 места, помечены ✅ ИЗМЕНЕНО):
// 1. Импорт runTransaction.
// 2. Загрузка баланса: onSnapshot вместо разового getDocs — баланс
//    на экране обновляется сразу после подтверждения оплаты в /finance.
// 3. setStatus: предупреждение, если у ученика баланс <= 0.
// 4. saveLessonNotes: списание баланса через runTransaction вместо
//    нетранзакционного updateDoc — исключает гонку при параллельном
//    списании/пополнении.

"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, getDocs, doc, getDoc, setDoc,
  runTransaction // ✅ ИЗМЕНЕНО: нужен для атомарного списания lesson_balances
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../Sidebar";
import NotificationBell from "../NotificationBell";
import {
  Upload, File, X, Download, Clock, User, Users, BookOpen, Palette,
  CheckCircle, Calendar, Archive, RotateCcw, Trash2, Sun, Moon, Hourglass,
  Beaker, Dna, Pencil, FileText, Link2, Send, Edit3, ChevronRight, Sparkles,
  Grid3x3, List, ChevronLeft, Wallet
} from "lucide-react";
import { renderBoardSnapshot } from "@/lib/boardSnapshot";
import { useFirebaseUid } from "@/hooks/useFirebaseUid"; // ✅ НОВОЕ: ждём подтверждения Firebase Auth перед запросами

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
      ? 'bg-rose-50 text-rose-700'
      : 'bg-gray-100 text-gray-500';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${bgColor}`}>
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

function MonthCalendar({ lessons, onLessonClick, isDark, currentWeek }: {
  lessons: any[];
  onLessonClick: (lesson: any) => void;
  isDark: boolean;
  currentWeek: number;
}) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() + currentWeek, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + currentWeek + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const getLessonsForDate = (day: number) => {
    return lessons.filter(l => {
      const d = new Date(l.start_time);
      return d.getDate() === day && d.getMonth() === now.getMonth() + currentWeek;
    });
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`grid grid-cols-7 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
          <div key={day} className={`p-3 text-center text-xs font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayLessons = day ? getLessonsForDate(day) : [];
          const isToday = day === now.getDate() && currentWeek === 0;

          return (
            <div
              key={idx}
              className={`min-h-[80px] p-2 border-b border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} ${day ? (isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50') : ''} ${isToday ? (isDark ? 'bg-rose-950/30' : 'bg-rose-50') : ''}`}
            >
              {day && (
                <>
                  <div className={`text-sm font-bold mb-1 ${isToday ? 'text-rose-600' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayLessons.slice(0, 3).map(lesson => (
                      <button
                        key={lesson.id}
                        onClick={() => onLessonClick(lesson)}
                        className={`w-full text-left text-[10px] px-1.5 py-1 rounded truncate ${
                          lesson.is_group
                            ? 'bg-emerald-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {lesson.is_group ? lesson.group_name : lesson.student_name}
                      </button>
                    ))}
                    {dayLessons.length > 3 && (
                      <div className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        +{dayLessons.length - 3} ещё
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== СТАТИСТИКА / ПОЛОСА ДНЕЙ / СПИСОК / ДЕТАЛКА =====================

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

function LessonCardGrid({ lesson, onClick, style }: { lesson: any; onClick: () => void; style?: React.CSSProperties }) {
  const isChem = lesson.subject === "chemistry";
  const isGroup = lesson.is_group;
  const isCancelled = lesson.status === 'cancelled';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClick(); }}
      style={style}
      className={`absolute left-1 right-1 rounded-lg p-2 text-left transition-all overflow-hidden ${
        isCancelled
          ? 'bg-gray-200 opacity-50 line-through'
          : isGroup
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md'
            : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-md'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {isGroup ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">
            {lesson.is_group ? lesson.group_name : lesson.student_name}
          </div>
          <div className="text-xs opacity-90 truncate">
            {isChem ? 'Химия' : 'Биология'}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">
            {new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} -
            {new Date(lesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function TimeGridDesktop({ weekDates, lessons, onLessonClick, onSlotClick, isDark }: {
  weekDates: Date[];
  lessons: any[];
  onLessonClick: (lesson: any) => void;
  onSlotClick: (date: Date, hour: number) => void;
  isDark: boolean;
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const getLessonsForSlot = (date: Date, hour: number) => {
    return lessons.filter(l => {
      const lessonDate = new Date(l.start_time);
      const lessonHour = lessonDate.getHours();
      return lessonDate.getDate() === date.getDate() &&
             lessonDate.getMonth() === date.getMonth() &&
             lessonHour === hour &&
             l.status !== 'cancelled';
    });
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className={`grid grid-cols-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`p-3 text-center text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Время</div>
        {weekDates.map((date, idx) => (
          <div key={idx} className={`p-3 text-center border-l ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][idx]}
            </div>
            <div className="text-lg font-bold text-rose-600">{date.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: `${hours.length * 60}px` }}>
        {hours.map((hour, hourIdx) => (
          <div key={hour} className={`absolute left-0 right-0 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`} style={{ top: `${hourIdx * 60}px`, height: '60px' }}>
            <div className={`absolute left-0 top-0 text-xs px-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {hour}:00
            </div>
            {weekDates.map((date, dateIdx) => (
              <div
                key={dateIdx}
                className={`absolute top-0 bottom-0 border-l ${isDark ? 'border-gray-800 hover:bg-rose-950/20' : 'border-gray-100 hover:bg-rose-50/50'} cursor-pointer`}
                style={{ left: `${(dateIdx + 1) * 12.5}%`, width: '12.5%' }}
                onClick={() => onSlotClick(date, hour)}
              >
                {getLessonsForSlot(date, hour).map(lesson => (
                  <LessonCardGrid
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => onLessonClick(lesson)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsStrip({ lessons, isDark }: { lessons: any[]; isDark: boolean }) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayLessons = lessons.filter(l => {
      const d = new Date(l.start_time);
      return d.toDateString() === now.toDateString() && l.status !== 'cancelled';
    });
    const weekLessons = lessons.filter(l => l.status !== 'cancelled');
    const hours = weekLessons.reduce((sum, l) => sum + (new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 3600000, 0);
    const cancelled = lessons.filter(l => l.status === 'cancelled').length;
    const next = todayLessons
      .filter(l => new Date(l.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
    const minutesToNext = next ? Math.max(0, Math.round((new Date(next.start_time).getTime() - now.getTime()) / 60000)) : null;

    return {
      today: todayLessons.length,
      week: weekLessons.length,
      hours: Math.round(hours * 10) / 10,
      cancelled,
      minutesToNext,
    };
  }, [lessons]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div className="rounded-2xl p-4 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20">
        <div className="text-xs font-semibold text-white/85 mb-1">Сегодня</div>
        <div className="text-xl font-bold">{stats.today} {stats.today === 1 ? "занятие" : "занятия"}</div>
        {stats.minutesToNext !== null && (
          <div className="text-xs text-white/80 mt-1">Ближайшее через {stats.minutesToNext} мин</div>
        )}
      </div>
      <div className={`rounded-2xl p-4 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>За неделю</div>
        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.week}</div>
        <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>занятий</div>
      </div>
      <div className={`rounded-2xl p-4 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Часов</div>
        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.hours}</div>
        <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>за неделю</div>
      </div>
      <div className={`rounded-2xl p-4 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Отменено</div>
        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.cancelled}</div>
        <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>в архиве</div>
      </div>
    </div>
  );
}

function WeekDayStrip({
  weekDates, lessons, selectedDate, onSelectDate, isDark,
}: {
  weekDates: Date[];
  lessons: any[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  isDark: boolean;
}) {
  const dow = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
  const countFor = (date: Date) =>
    lessons.filter(l => {
      const d = new Date(l.start_time);
      return d.toDateString() === date.toDateString() && l.status !== 'cancelled';
    }).length;

  return (
    <div className={`grid grid-cols-7 gap-1.5 rounded-2xl p-3 mb-4 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      {weekDates.map((date, idx) => {
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const count = countFor(date);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectDate(date)}
            className={`text-center py-2 rounded-xl transition active:scale-95 ${
              isSelected
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white'
                : isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className={`text-[10px] font-semibold ${isSelected ? 'text-white/85' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>{dow[idx]}</div>
            <div className="text-sm font-bold my-0.5">{date.getDate()}</div>
            <div className={`text-[10px] ${isSelected ? 'text-white/85' : isDark ? 'text-gray-500' : 'text-gray-400'} ${count === 0 ? 'invisible' : ''}`}>{count}</div>
          </button>
        );
      })}
    </div>
  );
}

function LessonListItem({ lesson, isSelected, onClick, isDark }: { lesson: any; isSelected: boolean; onClick: () => void; isDark: boolean }) {
  const isChem = lesson.subject === 'chemistry';
  const topics: string[] = lesson.topics ? lesson.topics.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
  const name = lesson.is_group ? lesson.group_name : lesson.student_name;
  const isCancelled = lesson.status === 'cancelled';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-3 flex items-start gap-3 transition border ${isCancelled ? 'opacity-50' : ''} ${
        isSelected
          ? isDark ? 'bg-rose-950/20 border-rose-500/40' : 'bg-rose-50/60 border-rose-200'
          : isDark ? 'bg-gray-900 border-transparent hover:border-gray-700' : 'bg-white border-transparent hover:border-gray-100 shadow-sm'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${isChem ? 'bg-gradient-to-br from-blue-400 to-indigo-600' : 'bg-gradient-to-br from-emerald-400 to-teal-600'}`}>
        {lesson.is_group ? <Users className="w-4 h-4" /> : getInitials(name || '')}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'} ${isCancelled ? 'line-through' : ''}`}>
          {new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {new Date(lesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · {name}
        </div>
        <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {lesson.is_group ? `${lesson.group_participants?.length || lesson.group_size || 0} учеников` : 'Индивидуальное занятие'}
        </div>
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {topics.slice(0, 3).map((t, i) => (
              <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${isChem ? (isDark ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-50 text-blue-700') : (isDark ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}`}>{t}</span>
            ))}
          </div>
        )}
      </div>
      {!isCancelled && lesson.status === 'scheduled' && new Date(lesson.start_time) > new Date() && (
        <RedTimer startTime={new Date(lesson.start_time)} endTime={new Date(lesson.end_time)} />
      )}
    </button>
  );
}

function DetailPanelBody({
  lesson, isTutor, isDark, students, lessonBalances, onComplete, onCancel, onEdit, onExportCalendar, onClose,
}: {
  lesson: any;
  isTutor: boolean;
  isDark: boolean;
  students: any[];
  lessonBalances: Record<string, number>;
  onComplete: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onExportCalendar: () => void;
  onClose?: () => void;
}) {
  const isChem = lesson.subject === 'chemistry';
  const topics: string[] = lesson.topics ? lesson.topics.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
  const name = lesson.is_group ? lesson.group_name : lesson.student_name;

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className={`p-5 flex items-center gap-3 ${isChem ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`}>
        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
          {isChem ? <Beaker className="w-5 h-5 text-white" /> : <Dna className="w-5 h-5 text-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white truncate">{name}</div>
          <div className="text-white/85 text-xs">{isChem ? 'Химия' : 'Биология'} · {lesson.is_group ? 'Групповое' : 'Индивидуальное'}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${
          lesson.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {lesson.status === 'scheduled' && '📅 Запланировано'}
          {lesson.status === 'completed' && '✅ Проведено'}
          {lesson.status === 'cancelled' && '❌ Отменено'}
        </span>

        <div className={`rounded-xl p-3.5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата и время</div>
          <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {new Date(lesson.start_time).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {new Date(lesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            {lesson.duration && ` · ${lesson.duration} мин`}
          </div>
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {topics.map((t, i) => (
                <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${isDark ? 'bg-rose-950/40 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {lesson.board_link && (
          <a href={lesson.board_link} target="_blank" rel="noopener noreferrer" className="block rounded-xl p-3.5 bg-gradient-to-r from-rose-500 to-red-600 text-white active:scale-[0.98] transition">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="text-xs font-bold">Открыть доску и начать звонок</span>
            </div>
          </a>
        )}

        {lesson.attached_file_url && (
          <a href={lesson.attached_file_url} target="_blank" rel="noopener noreferrer" className={`block rounded-xl p-3.5 ${isDark ? 'bg-blue-950/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'} active:scale-[0.98] transition`}>
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-blue-500" />
              <span className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{lesson.attached_file_name || 'Материалы к уроку'}</span>
            </div>
          </a>
        )}

        {!isTutor && lesson.hw_template_id && (
          <div className={`rounded-xl p-3.5 flex items-center gap-2.5 ${isDark ? 'bg-amber-950/30 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
            <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <div className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Домашнее задание</div>
              <div className={`text-[11px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Будет создано после занятия</div>
            </div>
          </div>
        )}

        {isTutor && !lesson.is_group && lesson.student_id && lessonBalances[lesson.student_id] !== undefined && (
          <div className={`rounded-xl p-3.5 flex items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div>
              <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Баланс ученика</div>
              <div className={`text-base font-bold ${lessonBalances[lesson.student_id] > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{lessonBalances[lesson.student_id]} занятий</div>
            </div>
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
        )}

        {lesson.is_group && lesson.group_participants && lesson.group_participants.length > 0 && (
          <div className={`rounded-xl p-3.5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Участники ({lesson.group_participants.length})</div>
            <div className="space-y-1.5">
              {lesson.group_participants.map((pid: string) => {
                const p = students.find((s) => s.id === pid);
                return (
                  <div key={pid} className={`flex items-center gap-2 p-1.5 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-rose-950/40 text-rose-300' : 'bg-rose-100 text-rose-700'}`}>{(p?.full_name || '?')[0]}</div>
                    <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{p?.full_name || 'Неизвестно'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lesson.post_notes && (
          <div className={`rounded-xl p-3.5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Заметки после урока</div>
            <p className={`text-xs whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{lesson.post_notes}</p>
          </div>
        )}

        {isTutor && lesson.status === 'scheduled' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={onComplete} className="h-10 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition">
              <CheckCircle className="w-3.5 h-3.5" /> Проведено
            </button>
            <button onClick={onCancel} className="h-10 bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition">
              <X className="w-3.5 h-3.5" /> Отменить
            </button>
          </div>
        )}

        {isTutor && lesson.status === 'scheduled' && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onEdit} className={`h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
              <Edit3 className="w-3.5 h-3.5" /> Редактировать
            </button>
            <button onClick={onExportCalendar} className={`h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
              <Calendar className="w-3.5 h-3.5" /> В календарь
            </button>
          </div>
        )}

        {!isTutor && (
          <button onClick={onExportCalendar} className={`w-full h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
            <Calendar className="w-3.5 h-3.5" /> Добавить в календарь
          </button>
        )}
      </div>
    </div>
  );
}

function DetailPanelEmpty({ isDark }: { isDark: boolean }) {
  return (
    <div className={`rounded-2xl border h-full min-h-[280px] flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <Calendar className={`w-8 h-8 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Выберите занятие слева</p>
    </div>
  );
}

// ===================== ОСНОВНОЙ КОМПОНЕНТ =====================

function ScheduleContent() {
  const searchParams = useSearchParams();
  // ✅ ИЗМЕНЕНО: uid теперь берётся из реальной сессии Firebase Auth
  // (не из localStorage) — устраняет гонку, из-за которой Firestore-запросы
  // стартовали раньше, чем сервер успевал подтвердить, что пользователь
  // залогинен ("Missing or insufficient permissions").
  const { uid, authReady } = useFirebaseUid(app);
  const [role, setRole] = useState("student");
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    // role — только для UI (какие вкладки/кнопки показывать), Firestore Rules
    // его не используют напрямую, поэтому localStorage тут безопасен
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
  const [weekViewMode, setWeekViewMode] = useState<'list' | 'grid'>('list');
  const [selectedListDate, setSelectedListDate] = useState(new Date());
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLessonForNotes, setSelectedLessonForNotes] = useState<any>(null);
  const [lessonNotes, setLessonNotes] = useState("");
  const [lessonTopics, setLessonTopics] = useState<string[]>([]);
  const [lessonBalances, setLessonBalances] = useState<Record<string, number>>({});
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

  const checkUpcomingLessons = useCallback(async () => {
    if (lessons.length === 0) return;
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

    if (lastCheck === nowKey) {
      hasSentRemindersRef.current = true;
      return;
    }

    hasSentRemindersRef.current = true;
    localStorage.setItem(lastCheckKey, nowKey);

    let sentCount = 0;
    for (const lesson of upcomingLessons) {
      const lessonTime = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const subject = lesson.subject === 'chemistry' ? ' Химия' : '🧬 Биология';
      const topics = lesson.topics ? `\n🎯 Темы: ${lesson.topics}` : '';
      const boardLink = lesson.board_link ? `\n🖌️ Доска: ${lesson.board_link}` : '';

      if (lesson.is_group) {
        const groupName = lesson.group_name || 'Группа';
        const tutorMsg = `⏰ Напоминание: групповое занятие через час!\n\n📚 ${subject}\n👥 Группа: ${groupName}\n ${lessonTime}${topics}${boardLink}\n\nУчастников: ${lesson.group_participants?.length || lesson.group_size || 0}`;
        await sendTelegramToTutor(tutorMsg);
        sentCount++;

        if (lesson.group_participants && lesson.group_participants.length > 0) {
          for (const participantId of lesson.group_participants) {
            const studentMsg = ` Напоминание о групповом занятии через час!\n\n📚 ${subject}\n👥 Группа: ${groupName}\n🕐 ${lessonTime}${topics}\n\nНе забудь подготовиться! 💪`;
            await sendTelegramToStudent(participantId, studentMsg);
            sentCount++;
          }
        }
      } else {
        const studentName = lesson.student_name || 'Ученик';
        const tutorMsg = `⏰ Напоминание: занятие через час!\n\n📚 ${subject}\n👤 ${studentName}\n🕐 ${lessonTime}${topics}${boardLink}`;
        await sendTelegramToTutor(tutorMsg);
        sentCount++;

        const studentMsg = ` Напоминание о занятии через час!\n\n📚 ${subject}\n👤 ${studentName}\n🕐 ${lessonTime}${topics}\n\nНе забудь подготовиться! 💪`;
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

  // ✅ ИЗМЕНЕНО: было — разовый getDocs при монтировании (баланс не обновлялся
  // сам после подтверждения оплаты в /finance, пока страницу не перезагрузить).
  // Стало — живая подписка onSnapshot, баланс обновляется в реальном времени.
  useEffect(() => {
    if (!authReady) return; // ✅ ИЗМЕНЕНО: ждём подтверждения сессии
    if (!isTutor || students.length === 0) return;
    const unsub = onSnapshot(collection(db, "lesson_balances"), (snap) => {
      const balances: Record<string, number> = {};
      snap.forEach(docSnap => { balances[docSnap.id] = docSnap.data().remaining || 0; });
      students.forEach(s => { if (!(s.id in balances)) balances[s.id] = 0; });
      setLessonBalances(balances);
    }, (e) => console.error("Ошибка загрузки балансов:", e));
    return () => unsub();
  }, [students, isTutor, authReady]);

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
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [filteredLessons]);

  useEffect(() => {
    if (weekDates.length === 0) return;
    const inRange = weekDates.some(d => d.toDateString() === selectedListDate.toDateString());
    if (!inRange) setSelectedListDate(weekDates[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, viewMode]);

  useEffect(() => {
    if (!authReady) return; // ✅ ИЗМЕНЕНО: ждём подтверждения сессии
    if (!uid) return;
    const dates = viewMode === 'week' ? getWeekDates() : getMonthDates();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const queryStart = new Date(startDate);
    queryStart.setDate(queryStart.getDate() - 2);
    const queryEnd = new Date(endDate);
    queryEnd.setDate(queryEnd.getDate() + 2);

    if (isTutor) {
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

          const allMap = new Map();
          [...individual, ...group].forEach(l => allMap.set(l.id, l));
          setLessons(Array.from(allMap.values()));
        });

        return () => unsubGrp();
      });

      return () => unsubInd();
    }
  }, [uid, authReady, isTutor, viewMode, currentWeek]);

  useEffect(() => {
    if (!authReady) return; // ✅ ИЗМЕНЕНО: ждём подтверждения сессии
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
  }, [uid, authReady, isTutor]);

  useEffect(() => {
    if (lessons.length > 0 && !hasSentRemindersRef.current) {
      checkUpcomingLessons();
    }
  }, [lessons, checkUpcomingLessons]);

  useEffect(() => {
    hasSentRemindersRef.current = false;
  }, [currentWeek, viewMode]);

  useEffect(() => {
    if (!authReady) return; // ✅ ИЗМЕНЕНО: ждём подтверждения сессии
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
  }, [isTutor, uid, authReady]);

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
      group_id: selectedGroupId || null,
      group_name: groupName,
      group_size: groupSize,
      group_participants: isGroup ? participants : [],
      subject: subject,
      start_time: startISO,
      end_time: endISO,
      duration: duration || 60,
      hw_template_id: hwTemplateId,
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
        const msg = `Привет, ${studentName}!\n\nУ нас запланировано новое занятие по ${subjectName}.\n📅 Дата: ${dateStr}\n⏰ Время: ${timeStr}${topicsStr ? `\n🎯 Темы: ${topicsStr}` : ''}\n\nДо встречи! 🧪🧬`;
        sendTelegramToStudent(studentId!, msg);
      } else {
        for (const participantId of participants) {
          const participant = students.find(s => s.id === participantId);
          const participantName = participant?.full_name || 'Ученик';
          const msg = `Привет, ${participantName}!\n\nУ нас запланировано групповое занятие по ${subjectName}.\n👥 Группа: ${groupName}\n📅 Дата: ${dateStr}\n⏰ Время: ${timeStr}${topicsStr ? `\n Темы: ${topicsStr}` : ''}\n\nДо встречи! 🧪🧬`;
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

  // ✅ ИЗМЕНЕНО: добавлено предупреждение, если у ученика уже 0 (или меньше)
  // занятий в балансе — раньше урок молча помечался проведённым без каких-либо
  // сигналов о том, что оплата закончилась.
  async function setStatus(lesson: any) {
    if (!lesson.is_group && (lessonBalances[lesson.student_id] || 0) <= 0) {
      const proceed = window.confirm(
        "⚠️ У ученика закончились оплаченные занятия (баланс 0 или меньше). Всё равно отметить занятие проведённым?"
      );
      if (!proceed) return;
    }
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

    // ✅ ИЗМЕНЕНО: списание баланса теперь атомарно через транзакцию.
    // Раньше значение бралось из локального state lessonBalances (может быть
    // устаревшим) и писалось нетранзакционно — при двух почти одновременных
    // списаниях возможна гонка (оба читают одно и то же старое значение).
    // Локальный setLessonBalances больше не нужен — компонент обновится
    // сам через onSnapshot-подписку на lesson_balances.
    if (!selectedLessonForNotes.is_group && selectedLessonForNotes.student_id) {
      try {
        await runTransaction(db, async (tx) => {
          const balanceRef = doc(db, "lesson_balances", selectedLessonForNotes.student_id);
          const balanceSnap = await tx.get(balanceRef);
          const currentBalance = balanceSnap.exists() ? (balanceSnap.data().remaining || 0) : 0;

          if (currentBalance > 0) {
            tx.set(balanceRef, {
              remaining: currentBalance - 1,
              last_updated: new Date().toISOString(),
            }, { merge: true });
          }
          // Если currentBalance <= 0 — не уходим в минус молча; репетитор
          // уже получил предупреждение на шаге setStatus и явно подтвердил
          // провести урок в долг.
        });
      } catch (error) {
        console.error("Ошибка списания баланса:", error);
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
      const topicsText = topicsStr ? `\n Темы: ${topicsStr}` : '';
      const notesText = lessonNotes ? `\n Заметки: ${lessonNotes}` : '';
      const msg = `✅ Занятие проведено!\n\n📅 ${new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}${topicsText}${notesText}\n\nОтличная работа! 🚀`;
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
      sendTelegramToStudent(lesson.student_id, `🥺 Привет, ${lesson.student_name}.\n\nК сожалению, занятие на ${dateStr} в ${timeStr} отменено.\nПричина: ${reason}.\n\nМы скоро свяжемся для переноса.`);
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
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Tutor Platform//Schedule//RU\nBEGIN:VEVENT\nUID:${safeId}@tutor-platform\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(start)}\nDTEND:${formatDate(end)}\nSUMMARY:${lesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"} с ${lesson.student_name || "группой"}\nDESCRIPTION:${lesson.notes || "Занятие"}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson_${start.toISOString().slice(0, 19)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Экспортировано в календарь!");
  }

  const openEditForm = (lesson: any) => {
    setEditLesson(lesson);
    setShowForm(true);
    setFormStudentId(lesson.student_id || "");
    setFormHwTemplateId(lesson.hw_template_id || "");
    setFormTopics(lesson.topics ? lesson.topics.split(",").map((t: string) => t.trim()) : []);
    setFormGroupParticipants(lesson.group_participants || []);
    setSelectedGroupId(lesson.group_id || "");
    setAttachedFile(null);
    setAttachedFileName(lesson.attached_file_name || "");
    setAttachedFileUrl(lesson.attached_file_url || "");
    setIsGroupLesson(lesson.is_group || false);
    setStudentSearch(students.find(s => s.id === lesson.student_id)?.full_name || "");
    setSelectedLesson(null);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setShowForm(true);
    setEditLesson(null);
    const dateStr = date.toISOString().slice(0, 10);
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    setTimeout(() => {
      const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
      const startInput = document.querySelector('input[name="start_time"]') as HTMLInputElement;
      const endInput = document.querySelector('input[name="end_time"]') as HTMLInputElement;
      if (dateInput) dateInput.value = dateStr;
      if (startInput) startInput.value = startTime;
      if (endInput) endInput.value = endTime;
    }, 100);
  };

  const listDateLessons = getLessonsForDate(selectedListDate);

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

      <div className="relative z-20 max-w-7xl mx-auto p-4 md:p-6 pt-20 pb-24 md:pb-6">

        <div className="text-center mb-6">
          <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 ${isDark ? 'text-rose-400' : 'bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent'}`}>
            Расписание
          </h1>
          <p className={`text-sm md:text-base ${isDark ? 'text-rose-300/70' : 'text-rose-600/80'}`}>
            Организованное обучение — залог успеха
          </p>
        </div>

        <StatsStrip lessons={filteredLessons} isDark={isDark} />

        <div className={`rounded-2xl p-3 md:p-4 mb-4 shadow-sm border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <div className={`flex rounded-xl p-1 border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <button onClick={() => { setViewMode('week'); setCurrentWeek(0); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'week' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>Неделя</button>
                <button onClick={() => { setViewMode('month'); setCurrentWeek(0); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'month' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>Месяц</button>
              </div>

              {viewMode === 'week' && (
                <div className={`flex rounded-xl p-1 border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <button onClick={() => setWeekViewMode('list')} title="Список" className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${weekViewMode === 'list' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <List className="w-4 h-4" /> Список
                  </button>
                  <button onClick={() => setWeekViewMode('grid')} title="Сетка" className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${weekViewMode === 'grid' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Grid3x3 className="w-4 h-4" /> Сетка
                  </button>
                </div>
              )}

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

              {isTutor && (
                <button onClick={() => setShowArchive(true)} className={`h-10 px-4 rounded-xl border text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  <Archive className="w-4 h-4" /> Архив ({cancelledLessons.length})
                </button>
              )}
            </div>

            {isTutor && (
              <button
                onClick={() => { setShowForm(true); setEditLesson(null); setSelectedGroupId(""); setFormStudentId(""); setFormHwTemplateId(""); setFormTopics([]); setFormGroupParticipants([]); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }}
                className="h-11 px-5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
              >
                <span className="text-lg leading-none">+</span> Занятие
              </button>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-2xl p-3 mb-4 border shadow-sm ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <button onClick={() => setCurrentWeek(currentWeek - 1)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition active:scale-95 ${isDark ? 'hover:bg-rose-950/30 text-rose-400' : 'hover:bg-rose-50 text-rose-600'}`}>←</button>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentWeek(0)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition active:scale-95 ${isDark ? 'bg-rose-950/30 text-rose-300 hover:bg-rose-950/50' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}>Сегодня</button>
            <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{weekStr}</span>
          </div>
          <button onClick={() => setCurrentWeek(currentWeek + 1)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition active:scale-95 ${isDark ? 'hover:bg-rose-950/30 text-rose-400' : 'hover:bg-rose-50 text-rose-600'}`}>→</button>
        </div>

        {viewMode === 'month' && (
          <MonthCalendar
            lessons={filteredLessons}
            onLessonClick={setSelectedLesson}
            isDark={isDark}
            currentWeek={currentWeek}
          />
        )}

        {viewMode === 'week' && weekViewMode === 'grid' && (
          <div className="hidden lg:block">
            <TimeGridDesktop
              weekDates={weekDates}
              lessons={filteredLessons}
              onLessonClick={setSelectedLesson}
              onSlotClick={handleSlotClick}
              isDark={isDark}
            />
          </div>
        )}

        {viewMode === 'week' && (weekViewMode === 'list' || weekViewMode === 'grid') && (
          <div className={weekViewMode === 'grid' ? 'lg:hidden' : ''}>
            <WeekDayStrip
              weekDates={weekDates}
              lessons={filteredLessons}
              selectedDate={selectedListDate}
              onSelectDate={setSelectedListDate}
              isDark={isDark}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedListDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{listDateLessons.length} занятий</span>
                </div>

                {listDateLessons.length === 0 ? (
                  <div className={`rounded-2xl border border-dashed p-8 text-center ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                    Нет занятий — свободный день
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {listDateLessons.map((lesson: any) => (
                      <LessonListItem
                        key={lesson.id}
                        lesson={lesson}
                        isSelected={selectedLesson?.id === lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden lg:block sticky top-24">
                {selectedLesson ? (
                  <DetailPanelBody
                    lesson={selectedLesson}
                    isTutor={isTutor}
                    isDark={isDark}
                    students={students}
                    lessonBalances={lessonBalances}
                    onComplete={() => setStatus(selectedLesson)}
                    onCancel={() => cancelLesson(selectedLesson.id)}
                    onEdit={() => openEditForm(selectedLesson)}
                    onExportCalendar={() => exportToCalendar(selectedLesson)}
                    onClose={() => setSelectedLesson(null)}
                  />
                ) : (
                  <DetailPanelEmpty isDark={isDark} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedLesson && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 lg:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={() => setSelectedLesson(null)} />
            <motion.div
              className="relative w-full max-h-[88vh] overflow-y-auto"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`rounded-t-3xl ${isDark ? 'bg-gray-950' : 'bg-white'} p-3`}>
                <div className="flex justify-center pb-2">
                  <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                </div>
                <DetailPanelBody
                  lesson={selectedLesson}
                  isTutor={isTutor}
                  isDark={isDark}
                  students={students}
                  lessonBalances={lessonBalances}
                  onComplete={() => setStatus(selectedLesson)}
                  onCancel={() => cancelLesson(selectedLesson.id)}
                  onEdit={() => openEditForm(selectedLesson)}
                  onExportCalendar={() => exportToCalendar(selectedLesson)}
                  onClose={() => setSelectedLesson(null)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }} />
            <motion.div className={`relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className={`sticky top-0 z-10 p-6 border-b ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {editLesson ? "Редактировать занятие" : "Создать занятие"}
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Заполните основные поля</p>
                  </div>
                  <button onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }} className={`text-3xl leading-none transition ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
                </div>
              </div>

              <form onSubmit={saveLesson} className="p-6 space-y-5">
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Тип занятия</label>
                  <div className={`flex rounded-xl p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <button type="button" onClick={() => setIsGroupLesson(false)} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all ${!isGroupLesson ? (isDark ? 'bg-gray-700 text-white' : 'bg-white shadow-sm text-gray-900') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                      <span className="text-lg">👤</span><span className="font-medium">Индивидуальное</span>
                    </button>
                    <button type="button" onClick={() => setIsGroupLesson(true)} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all ${isGroupLesson ? (isDark ? 'bg-gray-700 text-white' : 'bg-white shadow-sm text-gray-900') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                      <span className="text-lg">👥</span><span className="font-medium">Групповое</span>
                    </button>
                  </div>
                  <input type="hidden" name="is_group" value={isGroupLesson ? "true" : "false"} />
                </div>

                {!isGroupLesson && (
                  <div ref={studentDropdownRef}>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Ученик</label>
                    <div className="relative">
                      <input type="text" value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setShowStudentDropdown(true); const student = students.find(s => s.full_name === e.target.value); if (!student) setFormStudentId(""); }} onFocus={() => setShowStudentDropdown(true)} placeholder={formStudentId ? students.find(s => s.id === formStudentId)?.full_name : "Выберите ученика..."} className={`w-full border-2 rounded-xl p-3.5 placeholder-gray-400 focus:outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`} />
                      {showStudentDropdown && (
                        <div className={`absolute z-50 w-full mt-1 rounded-xl border shadow-lg max-h-60 overflow-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).map(student => (
                            <button key={student.id} type="button" onClick={() => { setFormStudentId(student.id); setStudentSearch(student.full_name); setShowStudentDropdown(false); }} className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${formStudentId === student.id ? (isDark ? 'bg-rose-950/40 border-l-4 border-rose-500' : 'bg-rose-50 border-l-4 border-rose-500') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}`}>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">{student.full_name.charAt(0)}</div>
                              <span className={isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{student.full_name}</span>
                            </button>
                          ))}
                          {students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && <div className={`px-4 py-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ученик не найден</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isGroupLesson && (
                  <div ref={groupDropdownRef}>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Группа</label>
                    <div className="relative">
                      <input type="text" value={groupSearch} onChange={(e) => { setGroupSearch(e.target.value); setShowGroupDropdown(true); const group = groups.find(g => g.name === e.target.value); if (!group) { setSelectedGroupId(""); setFormGroupParticipants([]); } }} onFocus={() => setShowGroupDropdown(true)} placeholder={selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : "Выберите группу..."} className={`w-full border-2 rounded-xl p-3.5 placeholder-gray-400 focus:outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`} />
                      {showGroupDropdown && (
                        <div className={`absolute z-50 w-full mt-1 rounded-xl border shadow-lg max-h-60 overflow-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).map(group => (
                            <button key={group.id} type="button" onClick={() => { setSelectedGroupId(group.id); setGroupSearch(group.name); setFormGroupParticipants(group.student_ids || []); setShowGroupDropdown(false); }} className={`w-full text-left px-4 py-3 transition-colors ${selectedGroupId === group.id ? (isDark ? 'bg-rose-950/40 border-l-4 border-rose-500' : 'bg-rose-50 border-l-4 border-rose-500') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}`}>
                              <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-white font-medium' : 'text-gray-900 font-medium'}>{group.name}</span>
                                <span className={isDark ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>{group.student_ids?.length || 0} уч.</span>
                              </div>
                            </button>
                          ))}
                          {groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && <div className={`px-4 py-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Группа не найдена</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дата *</label>
                    <input type="date" name="date" required defaultValue={editLesson?.start_time?.slice(0, 10) || ""} className={`w-full border-2 rounded-xl p-3.5 focus:outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Начало *</label>
                    <input type="time" name="start_time" required defaultValue={editLesson?.start_time?.slice(11, 16) || ""} onChange={(e) => { const startTime = e.target.value; const endTimeInput = document.querySelector('input[name="end_time"]') as HTMLInputElement; if (endTimeInput && endTimeInput.value) { const start = new Date(`2000-01-01T${startTime}`); const end = new Date(`2000-01-01T${endTimeInput.value}`); const duration = Math.round((end.getTime() - start.getTime()) / 60000); const durationInput = document.querySelector('input[name="duration"]') as HTMLInputElement; if (durationInput && duration > 0) durationInput.value = duration.toString(); } }} className={`w-full border-2 rounded-xl p-3.5 focus:outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Конец *</label>
                    <input type="time" name="end_time" required defaultValue={editLesson?.end_time?.slice(11, 16) || ""} onChange={(e) => { const endTime = e.target.value; const startTimeInput = document.querySelector('input[name="start_time"]') as HTMLInputElement; if (startTimeInput && startTimeInput.value) { const start = new Date(`2000-01-01T${startTimeInput.value}`); const end = new Date(`2000-01-01T${endTime}`); const duration = Math.round((end.getTime() - start.getTime()) / 60000); const durationInput = document.querySelector('input[name="duration"]') as HTMLInputElement; if (durationInput && duration > 0) durationInput.value = duration.toString(); } }} className={`w-full border-2 rounded-xl p-3.5 focus:outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Предмет *</label>
                    <select name="subject" required defaultValue={editLesson?.subject || "chemistry"} className={`w-full border-2 rounded-xl p-3.5 focus:outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`}>
                      <option value="chemistry"> Химия</option>
                      <option value="biology">🧬 Биология</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Длительность (авто)</label>
                    <input type="number" name="duration" defaultValue={editLesson?.duration || 60} min={15} max={180} step={15} readOnly className={`w-full border-2 rounded-xl p-3.5 cursor-not-allowed ${isDark ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Темы урока</label>
                  <TopicChips topics={formTopics} setTopics={setFormTopics} theme={isDark ? 'dark' : 'light'} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Прикрепить файл</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDark ? 'border-gray-700 hover:border-rose-500' : 'border-gray-300 hover:border-rose-400'}`} onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip" className="hidden" />
                    {attachedFile || attachedFileName ? (
                      <div className={`flex items-center justify-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-2xl"></span>
                        <span className="font-medium">{attachedFile?.name || attachedFileName}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAttachedFile(null); setAttachedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 text-rose-500 hover:text-rose-700">×</button>
                      </div>
                    ) : (
                      <div className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                        <span className="text-2xl block mb-2"></span>
                        <span className="text-sm">Нажмите для загрузки файла</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex gap-3 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button type="submit" disabled={fileUploading} className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-base hover:from-rose-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2">
                    {fileUploading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Загрузка...</>) : (editLesson ? "💾 Сохранить" : "✅ Создать")}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditLesson(null); setSelectedGroupId(""); setAttachedFile(null); setAttachedFileName(""); setAttachedFileUrl(""); setIsGroupLesson(false); setStudentSearch(""); setGroupSearch(""); }} className={`px-6 h-12 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>Отмена</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <Archive className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
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

      <AnimatePresence>
        {showNotesModal && selectedLessonForNotes && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotesModal(false)} />
            <motion.div className={`relative rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className={`sticky top-0 z-10 p-6 border-b ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>✅ Занятие проведено</h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedLessonForNotes.student_name} • {new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <button onClick={() => setShowNotesModal(false)} className={`text-3xl leading-none transition ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Обратная связь по занятию</label>
                  <textarea value={lessonNotes} onChange={(e) => setLessonNotes(e.target.value)} rows={4} placeholder="Как прошло занятие? Что получилось хорошо, над чем нужно поработать..." className={`w-full border-2 rounded-xl p-3.5 placeholder-gray-400 focus:outline-none transition-all resize-none ${isDark ? 'bg-gray-800 border-gray-700 text-white focus:border-rose-500' : 'bg-white border-gray-200 text-gray-900 focus:border-rose-400'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Темы, которые прошли</label>
                  <TopicChips topics={lessonTopics} setTopics={setLessonTopics} theme={isDark ? 'dark' : 'light'} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Прикрепить домашнее задание</label>
                  <button type="button" onClick={() => setShowHomeworkModal(true)} className={`w-full h-12 border-2 rounded-xl px-4 text-left hover:border-rose-400 transition-all flex items-center justify-between active:scale-[0.98] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <span className={formHwTemplateId ? (isDark ? 'text-white font-medium' : 'text-gray-900 font-medium') : (isDark ? 'text-gray-400' : 'text-gray-400')}>{formHwTemplateId ? homeworks.find(h => h.id === formHwTemplateId)?.title || "ДЗ выбрано" : "Выбрать ДЗ из списка..."}</span>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-400'}>→</span>
                  </button>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Прикрепить файл</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDark ? 'border-gray-700 hover:border-rose-500' : 'border-gray-300 hover:border-rose-400'}`} onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip" className="hidden" />
                    {attachedFile || attachedFileName ? (
                      <div className={`flex items-center justify-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-2xl">📎</span>
                        <span className="font-medium">{attachedFile?.name || attachedFileName}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAttachedFile(null); setAttachedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 text-rose-500 hover:text-rose-700">×</button>
                      </div>
                    ) : (
                      <div className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                        <span className="text-2xl block mb-2">📁</span>
                        <span className="text-sm">Нажмите для загрузки файла</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex gap-3 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button onClick={saveLessonNotes} className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-base hover:from-rose-600 hover:to-red-700 transition-all active:scale-95">💾 Сохранить</button>
                  <button onClick={() => setShowNotesModal(false)} className={`px-6 h-12 rounded-xl font-semibold transition-all active:scale-95 ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>Отмена</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHomeworkModal && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHomeworkModal(false)} />
            <motion.div className={`relative rounded-2xl shadow-xl w-full max-w-md overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Выбрать ДЗ</h3>
                <button onClick={() => setShowHomeworkModal(false)} className={`text-2xl leading-none ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {homeworks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={`text-4xl mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}></p>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Нет назначенных ДЗ</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {homeworks.map(hw => (
                      <button key={hw.id} type="button" onClick={() => { setFormHwTemplateId(hw.id); setShowHomeworkModal(false); }} className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${formHwTemplateId === hw.id ? (isDark ? 'bg-rose-950/40 border-2 border-rose-500' : 'bg-rose-50 border-2 border-rose-500') : (isDark ? 'hover:bg-gray-800 border-2 border-transparent' : 'hover:bg-gray-50 border-2 border-transparent')}`}>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white text-lg flex-shrink-0">📚</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{hw.title || "Без названия"}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{hw.student_name || "Не назначено"} • {hw.sections?.length || 0} заданий</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button type="button" onClick={() => { setFormHwTemplateId(""); setShowHomeworkModal(false); }} className={`w-full h-11 rounded-xl font-medium transition-all active:scale-95 ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>Не назначать ДЗ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <button onClick={() => { navigator.clipboard.writeText(reportText); toast.success("Скопировано!"); }} className="flex-1 h-11 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:from-rose-600 hover:to-red-700 transition shadow-lg active:scale-95"> Копировать</button>
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