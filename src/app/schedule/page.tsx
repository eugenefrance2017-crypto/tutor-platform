"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc, query, where, onSnapshot, getDocs, doc, getDoc
} from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../Sidebar";
import NotificationBell from "../NotificationBell";

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

// ============ 🍂 FALLING LEAVES ============
function FallingLeaves() {
  const leaves = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    size: 10 + Math.random() * 20,
    emoji: ['🍂', '🍁', '🧣', '❤️'][Math.floor(Math.random() * 4)]
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {leaves.map(leaf => (
        <motion.div
          key={leaf.id}
          className="absolute"
          style={{ left: `${leaf.left}%`, fontSize: leaf.size }}
          initial={{ y: -100, opacity: 0, rotate: 0 }}
          animate={{ 
            y: '100vh', 
            opacity: [0, 1, 1, 0],
            rotate: 360 
          }}
          transition={{ 
            duration: leaf.duration, 
            delay: leaf.delay,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {leaf.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ============ 🎞️ VINTAGE OVERLAY ============
function VintageOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-10 mix-blend-overlay opacity-10">
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-rose-900/20" />
    </div>
  );
}

// ============ ✨ ANIMATED TITLE ============
function AnimatedTitle({ theme, onThemeToggle }: any) {
  const title = "Расписание";
  const subtitle = "Loving him is like driving a new Maserati down a dead end street";
  const isDark = theme === 'dark';
  
  return (
    <div className="text-center mb-6">
      <motion.div 
        className="flex items-center justify-center gap-3 mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Link href={`/dashboard?uid=${typeof window !== 'undefined' ? localStorage.getItem('uid') : ''}&role=${typeof window !== 'undefined' ? localStorage.getItem('role') : 'student'}`} 
          className={`text-sm font-medium flex items-center gap-1 transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}>
          ← Назад
        </Link>
        
        <motion.button
          onClick={onThemeToggle}
          className={`p-2 rounded-full transition ${isDark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          title="Сменить тему"
        >
          {isDark ? '☀️' : '🌙'}
        </motion.button>
      </motion.div>
      
      <motion.h1 
        className={`text-4xl sm:text-5xl font-black mt-4 ${isDark ? 'text-red-400' : 'bg-gradient-to-r from-red-600 via-rose-500 to-red-700 bg-clip-text text-transparent'}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        {title.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            className="inline-block"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.h1>
      
      <motion.p 
        className={`text-sm italic mt-3 ${isDark ? 'text-red-400/70' : 'text-red-400'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        "{subtitle}"
      </motion.p>
      
      <motion.div
        className="flex justify-center gap-3 mt-4"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: "spring" }}
      >
        <motion.span 
          className="text-3xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🍂
        </motion.span>
        <motion.span 
          className="text-3xl"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          🍁
        </motion.span>
        <motion.span 
          className="text-3xl"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🧣
        </motion.span>
      </motion.div>
    </div>
  );
}

// ============ 🔴 RED BUTTON ============
function RedButton({ children, onClick, className = "", type = "button" }: any) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`relative overflow-hidden px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute inset-0 bg-white/20"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="absolute inset-0 border-2 border-red-300 rounded-xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

// ============ ️ RED TIMER ============
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
    ? 'bg-red-500 text-white' 
    : status === 'before' 
    ? 'bg-red-100 text-red-700' 
    : 'bg-gray-100 text-gray-500';
  
  return (
    <motion.div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono ${bgColor}`}
      animate={status === 'active' ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          "0 0 0 0 rgba(239, 68, 68, 0.5)",
          "0 0 0 8px rgba(239, 68, 68, 0)",
          "0 0 0 0 rgba(239, 68, 68, 0)"
        ]
      } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <motion.span
        animate={{ rotate: status === 'active' ? 360 : 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        ⏱️
      </motion.span>
      {timeLeft}
    </motion.div>
  );
}

// ============ ❤️ RED NOTIFICATION ============
function RedNotification({ message, id, onDismiss }: any) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      className="relative bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-4 shadow-2xl max-w-sm"
    >
      <motion.div
        className="absolute -top-2 -right-2 text-2xl"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        ❤️
      </motion.div>
      
      <motion.div
        className="absolute inset-0 border-2 border-white/30 rounded-2xl"
        animate={{ scale: [1, 1.1], opacity: [0.5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      <p className="text-sm font-medium pr-6">{message}</p>
      
      <button 
        onClick={onDismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white text-lg"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ============ 🗓️ WEEK NAVIGATOR ============
function WeekNavigator({ currentWeek, setCurrentWeek, weekStr, theme }: any) {
  const [direction, setDirection] = useState(0);
  const isDark = theme === 'dark';

  const navigate = (dir: number) => {
    setDirection(dir);
    setCurrentWeek(currentWeek + dir);
  };

  return (
    <motion.div 
      className={`flex items-center justify-between rounded-2xl p-3 shadow-sm border ${
        isDark ? 'bg-gray-900/80 border-red-500/30' : 'bg-white/90 backdrop-blur border-red-200 shadow-md'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.button
        onClick={() => navigate(-1)}
        whileHover={{ scale: 1.1, x: -5 }}
        whileTap={{ scale: 0.9 }}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
          isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'
        }`}
      >
        ← Назад
      </motion.button>
      
      <motion.div
        key={currentWeek}
        initial={{ opacity: 0, x: direction * 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="flex items-center gap-2"
      >
        <motion.button
          onClick={() => setCurrentWeek(0)}
          whileHover={{ scale: 1.05 }}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
            isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200 shadow-sm'
          }`}
        >
          Сегодня
        </motion.button>
        <span className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>{weekStr}</span>
      </motion.div>
      
      <motion.button
        onClick={() => navigate(1)}
        whileHover={{ scale: 1.1, x: 5 }}
        whileTap={{ scale: 0.9 }}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
          isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'
        }`}
      >
        Вперёд →
      </motion.button>
    </motion.div>
  );
}

// ============ 🔥 HEAT MAP ============
function HeatMap({ lessons, theme }: { lessons: any[]; theme: string }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isDark = theme === 'dark';
  
  const getHourData = (hour: number) => {
    const count = lessons.filter(l => {
      const d = new Date(l.start_time);
      return d.getHours() === hour;
    }).length;
    
    let color;
    if (isDark) {
      if (count === 0) color = "bg-gray-800 text-gray-500";
      else if (count === 1) color = "bg-red-900/40 text-red-300";
      else if (count === 2) color = "bg-red-800/60 text-red-200";
      else if (count === 3) color = "bg-red-700/80 text-red-100";
      else color = "bg-red-600 text-white";
    } else {
      if (count === 0) color = "bg-red-50 text-red-800";
      else if (count === 1) color = "bg-red-100 text-red-800";
      else if (count === 2) color = "bg-red-200 text-red-900";
      else if (count === 3) color = "bg-red-300 text-red-900";
      else color = "bg-red-500 text-white";
    }
    return { count, color };
  };

  return (
    <motion.div 
      className="mt-4 overflow-x-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className={`text-xs mb-2 font-medium ${isDark ? 'text-red-400' : 'text-red-500'}`}>
        🔥 Тепловая карта занятий по часам
      </p>
      <div className="flex gap-1 min-w-[500px]">
        {hours.map((hour, idx) => {
          const { count, color } = getHourData(hour);
          return (
            <motion.div 
              key={hour} 
              className={`flex-shrink-0 w-12 py-2 rounded-lg ${color} flex flex-col items-center justify-center transition-all shadow-sm`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              whileHover={{ scale: 1.1, y: -3 }}
              title={`${hour}:00 — ${count} занятий`}
            >
              <span className="text-[10px] font-bold">{hour}:00</span>
              <span className="text-[11px] font-black">{count}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============  DAILY LOAD ============
function DailyLoad({ weekDates, getLessonsForDate, theme }: any) {
  const isDark = theme === 'dark';
  
  return (
    <motion.div 
      className={`rounded-2xl p-3 shadow-md border ${isDark ? 'bg-gray-900/80 border-red-500/30' : 'bg-white/90 backdrop-blur border-red-200'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-medium ${isDark ? 'text-red-400' : 'text-red-500'}`}>
          📊 Загрузка по дням
        </span>
      </div>
      <div className="flex gap-1">
        {weekDates.map((date: Date, idx: number) => {
          const count = getLessonsForDate(date).length;
          const maxPerDay = Math.max(...weekDates.map((d: Date) => getLessonsForDate(d).length), 1);
          const height = count > 0 ? Math.max(20, (count / maxPerDay) * 40) : 4;
          return (
            <motion.div 
              key={idx} 
              className="flex-1 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <motion.div 
                className={`rounded-full h-12 relative overflow-hidden shadow-sm ${isDark ? 'bg-gray-800' : 'bg-red-100'}`}
                whileHover={{ scale: 1.1 }}
              >
                <motion.div 
                  className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-500 to-rose-400 rounded-full"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}px` }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                />
              </motion.div>
              <span className={`text-[10px] mt-1 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"][idx]}
              </span>
              <span className={`text-[10px] font-bold ${isDark ? 'text-red-400' : 'text-red-500'}`}>{count}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============ 📅 ANIMATED WEEK GRID ============
function AnimatedWeekGrid({ 
  weekDates, getLessonsForDate, handleDrop, handleDragOver, handleDragStart, 
  setEditLesson, setShowForm, setStatus, cancelLesson, setSelectedLessonForNotes, 
  setLessonNotes, setLessonTopics, setShowNotesModal, exportToCalendar, deleteLesson, 
  theme, viewMode, isTutor, lessonBalances 
}: any) {
  const isDark = theme === 'dark';
  const today = new Date();
  const dayNames = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
  
  const statusStyles = {
    scheduled: isDark ? "border-l-4 border-blue-400 bg-blue-900/30" : "border-l-4 border-blue-500 bg-blue-50",
    completed: isDark ? "border-l-4 border-green-400 bg-green-900/30 opacity-75" : "border-l-4 border-green-500 bg-green-50 opacity-75",
    cancelled: isDark ? "border-l-4 border-rose-800 bg-rose-950/30 line-through opacity-50" : "border-l-4 border-rose-200 bg-rose-50 line-through opacity-50",
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-[600px]">
        {dayNames.map((day, idx) => (
          <motion.div 
            key={day} 
            className={`text-center font-semibold text-xs sm:text-sm py-2 ${isDark ? 'text-red-400' : 'text-red-400'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            {day}
          </motion.div>
        ))}
        
        {weekDates.map((date: Date, idx: number) => {
          const dateLessons = getLessonsForDate(date);
          const isToday = date.toDateString() === today.toDateString();
          const isCurrentMonth = date.getMonth() === today.getMonth();
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ 
                delay: idx * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: isDark ? "0 10px 30px rgba(239, 68, 68, 0.2)" : "0 10px 30px rgba(220, 38, 38, 0.15)"
              }}
              style={{ minHeight: viewMode === 'month' ? '80px' : '140px' }}
              className={`rounded-2xl p-2 transition-all duration-300 ${
                isToday 
                  ? isDark 
                    ? "bg-gradient-to-br from-red-900/50 to-rose-900/50 ring-2 ring-red-400 shadow-lg"
                    : "bg-gradient-to-br from-red-100 to-rose-100 ring-2 ring-red-400 shadow-lg"
                  : viewMode === 'month' && !isCurrentMonth 
                  ? isDark ? "bg-gray-900/30 opacity-50" : "bg-gray-50/50 opacity-50"
                  : isDark ? "bg-gray-900/60 hover:bg-gray-900/80" : "bg-white/80 hover:bg-white"
              } ${isDark ? 'border border-red-500/20' : 'border border-red-200 shadow-sm'}`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(date)}
            >
              <motion.div 
                className={`text-center text-sm font-bold mb-2 ${isToday ? (isDark ? "text-red-300" : "text-red-600") : (isDark ? "text-gray-400" : "text-gray-500")}`}
                animate={isToday ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {date.getDate()}
                {isToday && <motion.span className="ml-1 text-xs" animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity }}>✨</motion.span>}
              </motion.div>
              
              <div className={`space-y-1 ${viewMode === 'month' ? 'max-h-[60px]' : 'max-h-[200px]'} overflow-y-auto`}>
                {dateLessons.slice(0, viewMode === 'month' ? 2 : 10).map((l: any, li: number) => {
                  const startTime = new Date(l.start_time);
                  const endTime = new Date(l.end_time);
                  const balance = lessonBalances[l.student_id] || 0;
                  return (
                    <motion.div
                      key={l.id}
                      draggable
                      onDragStart={() => handleDragStart(l)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + li * 0.05 }}
                      whileHover={{ scale: 1.05, x: 3 }}
                      className={`group relative p-1.5 rounded-lg text-xs cursor-grab active:cursor-grabbing transition shadow-sm ${statusStyles[l.status as keyof typeof statusStyles]}`}
                    >
                      {l.recurring_group && (
                        <span className="absolute top-0 right-0 text-[10px] bg-purple-500/50 text-white px-1 rounded"></span>
                      )}
                      
                      <div className="font-medium truncate flex items-center gap-1 justify-between">
                        <span className="truncate text-[11px] flex items-center gap-1">
                          <span>{l.subject === "chemistry" ? "🧪" : "🧬"}</span>
                          <span className="truncate">{l.student_name}</span>
                        </span>
                        <span className={`text-[9px] px-1 rounded font-bold flex-shrink-0 ${balance > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          📦 {balance}
                        </span>
                      </div>
                      
                      {viewMode === 'week' && (
                        <>
                          <div className={`text-[10px] opacity-70 ${isDark ? 'text-gray-300' : ''}`}>
                            {startTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <RedTimer startTime={startTime} endTime={endTime} />
                        </>
                      )}
                      
                      <div className={`absolute top-0 right-0 hidden group-hover:flex gap-0.5 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-0.5 shadow z-10`}>
                        {l.status === "scheduled" && (
                          <>
                            <motion.button 
                              onClick={(e) => { e.stopPropagation(); setStatus(l); }} 
                              className="p-0.5 text-xs hover:scale-110 transition" 
                              title="Проведено"
                              whileHover={{ scale: 1.2 }}
                            >
                              ✅
                            </motion.button>
                            <motion.button 
                              onClick={(e) => { e.stopPropagation(); cancelLesson(l.id); }} 
                              className="p-0.5 text-xs hover:scale-110 transition" 
                              title="Отменить"
                              whileHover={{ scale: 1.2 }}
                            >
                              ❌
                            </motion.button>
                          </>
                        )}
                        <motion.button 
                          onClick={(e) => { e.stopPropagation(); setSelectedLessonForNotes(l); setLessonNotes(l.post_notes || ''); setLessonTopics(l.topics || ''); setShowNotesModal(true); }} 
                          className="p-0.5 text-xs hover:scale-110 transition" 
                          title="Заметки"
                          whileHover={{ scale: 1.2 }}
                        >
                          
                        </motion.button>
                        <motion.button 
                          onClick={(e) => { e.stopPropagation(); exportToCalendar(l); }} 
                          className="p-0.5 text-xs hover:scale-110 transition" 
                          title="Экспорт"
                          whileHover={{ scale: 1.2 }}
                        >
                          📅
                        </motion.button>
                        {isTutor && (
                          <>
                            <motion.button 
                              onClick={(e) => { e.stopPropagation(); setEditLesson(l); setShowForm(true); }} 
                              className="p-0.5 text-xs hover:scale-110 transition"
                              whileHover={{ scale: 1.2 }}
                            >
                              ✏️
                            </motion.button>
                            <motion.button 
                              onClick={(e) => { e.stopPropagation(); deleteLesson(l.id); }} 
                              className="p-0.5 text-xs hover:scale-110 transition"
                              whileHover={{ scale: 1.2 }}
                            >
                              ️
                            </motion.button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {dateLessons.length > (viewMode === 'month' ? 2 : 10) && (
                  <div className={`text-[10px] text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                    +{dateLessons.length - (viewMode === 'month' ? 2 : 10)} ещё
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============  RED ERA MODAL ============
function RedEraModal({ isOpen, onClose, children, theme }: any) {
  if (!isOpen) return null;
  const isDark = theme === 'dark';
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className={`absolute inset-0 backdrop-blur-md ${isDark ? 'bg-red-900/60' : 'bg-red-900/40'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      
      <motion.div
        className={`relative rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`}
        initial={{ 
          opacity: 0, 
          scale: 0.8,
          rotateY: -90 
        }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          rotateY: 0 
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.8,
          rotateY: 90 
        }}
        transition={{ 
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />
        
        <motion.div 
          className="absolute top-4 left-4 text-3xl z-10"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🍂
        </motion.div>
        <motion.div 
          className="absolute top-4 right-4 text-3xl z-10"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🧣
        </motion.div>
        
        {children}
      </motion.div>
    </motion.div>
  );
}

// ============ ОСНОВНОЙ КОМПОНЕНТ ============
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
  const [lessonTopics, setLessonTopics] = useState("");
  
  const [lessonBalances, setLessonBalances] = useState<Record<string, number>>({});

  const isTutor = role === "tutor";
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  //  ФУНКЦИЯ ОТПРАВКИ УВЕДОМЛЕНИЯ (БЕЗ БЛОКИРОВКИ UI)
  const sendTelegramToStudent = useCallback(async (studentId: string, message: string) => {
    try {
      const studentSnap = await getDoc(doc(db, "profiles", studentId));
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        if (studentData.telegram_chat_id) {
          // Отправляем в фоне — не ждём ответа
          fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message, 
              targetChatId: studentData.telegram_chat_id 
            }),
          }).catch(err => console.error("Ошибка отправки уведомления:", err));
        }
      }
    } catch (error) {
      console.error("Ошибка получения профиля ученика:", error);
    }
  }, []);

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      if (filterStudent !== 'all' && l.student_id !== filterStudent) return false;
      if (filterSubject !== 'all' && l.subject !== filterSubject) return false;
      return true;
    });
  }, [lessons, filterStudent, filterSubject]);

  // ОПТИМИЗИРОВАННАЯ загрузка балансов (один запрос вместо цикла)
  useEffect(() => {
    if (!isTutor || students.length === 0) return;
    
    const fetchBalances = async () => {
      try {
        const balances: Record<string, number> = {};
        // Загружаем все балансы одним запросом
        const balancesSnap = await getDocs(collection(db, "lesson_balances"));
        balancesSnap.forEach(docSnap => {
          balances[docSnap.id] = docSnap.data().remaining || 0;
        });
        // Для учеников без баланса ставим 0
        students.forEach(s => {
          if (!(s.id in balances)) balances[s.id] = 0;
        });
        setLessonBalances(balances);
      } catch (e) {
        console.error("Ошибка загрузки балансов:", e);
      }
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
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [filteredLessons]);

  const today = new Date();
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "lessons"), where(isTutor ? "tutor_id" : "student_id", "==", uid));
    const unsub = onSnapshot(q, (snap) => setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [uid, isTutor]);

  useEffect(() => {
    if (isTutor) {
      getDocs(query(collection(db, "profiles"), where("role", "==", "student"))).then((snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
      getDocs(query(collection(db, "library_items"), where("tutor_id", "==", uid))).then((snap) => setLibraryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    }
  }, [isTutor, uid]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const upcomingLessons = filteredLessons.filter(l => {
        const start = new Date(l.start_time);
        const diff = start.getTime() - now.getTime();
        return diff > 0 && diff <= 3600000 && l.status === "scheduled";
      });
      if (upcomingLessons.length > 0) {
        const newNotifications = upcomingLessons.map(l => ({
          id: l.id,
          message: `🔔 Через час занятие с ${l.student_name} (${l.subject === "chemistry" ? " Химия" : "🧬 Биология"})`,
          time: new Date(l.start_time).toLocaleTimeString(),
        }));
        setNotifications(newNotifications);
        setShowNotifications(true);
        setTimeout(() => setShowNotifications(false), 5000);
      }
    };
    const interval = setInterval(checkReminders, 60000);
    checkReminders();
    return () => clearInterval(interval);
  }, [filteredLessons]);

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
    const studentId = (form.elements.namedItem("student_id") as HTMLSelectElement).value;
    if (!studentId) return toast.error("Выберите ученика!");

    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const startTime = (form.elements.namedItem("start_time") as HTMLInputElement).value;
    const endTime = (form.elements.namedItem("end_time") as HTMLInputElement).value;
    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTime}:00`;

    if (new Date(endISO) <= new Date(startISO)) {
      return toast.error("Время окончания должно быть позже начала!");
    }

    const hasConflict = checkConflicts(startISO, endISO, editLesson?.id);
    if (hasConflict) {
      if (!window.confirm("⚠️ Обнаружен конфликт с другим занятием! Продолжить?")) return;
    }

    const hwTemplateId = (form.elements.namedItem("hw_template") as HTMLSelectElement)?.value || null;
    const duration = (form.elements.namedItem("duration") as HTMLInputElement)?.value;
    const repeatWeeks = parseInt((form.elements.namedItem("repeat_weeks") as HTMLInputElement)?.value || "0");
    const zoomLink = (form.elements.namedItem("zoom_link") as HTMLInputElement)?.value || "";
    const subject = (form.elements.namedItem("subject") as HTMLSelectElement).value;
    const studentName = students.find((s) => s.id === studentId)?.full_name || "Ученик";
    const subjectName = subject === "chemistry" ? "🧪 Химии" : "🧬 Биологии";
    const dateStr = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const timeStr = `${startTime} – ${endTime}`;

    const baseData = {
      tutor_id: uid,
      student_id: studentId,
      student_name: studentName,
      subject: subject,
      start_time: startISO,
      end_time: endISO,
      duration: duration || 60,
      hw_template_id: hwTemplateId,
      zoom_link: zoomLink,
      board_link: (form.elements.namedItem("board_link") as HTMLInputElement)?.value || "",
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement)?.value || "",
      topics: (form.elements.namedItem("topics") as HTMLInputElement)?.value || "",
    };

    if (editLesson) {
      await updateDoc(doc(db, "lessons", editLesson.id), baseData);
      toast.success("Занятие обновлено!");
    } else {
      await addDoc(collection(db, "lessons"), { ...baseData, status: "scheduled", created_at: new Date().toISOString() });
      
      //  УВЕДОМЛЕНИЕ В ФОНЕ (не блокирует UI)
      const msg = `📅 Привет, ${studentName}!\n\nУ нас запланировано новое занятие по ${subjectName}.\n🗓 Дата: ${dateStr}\n⏰ Время: ${timeStr}${zoomLink ? `\n🔗 Ссылка: ${zoomLink}` : ''}\n\nДо встречи! 🧪🧬`;
      sendTelegramToStudent(studentId, msg);

      if (repeatWeeks > 0) {
        for (let i = 1; i <= repeatWeeks; i++) {
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + i * 7);
          const nextStart = `${nextDate.toISOString().slice(0, 10)}T${startTime}:00`;
          const nextEnd = `${nextDate.toISOString().slice(0, 10)}T${endTime}:00`;
          await addDoc(collection(db, "lessons"), {
            ...baseData,
            start_time: nextStart,
            end_time: nextEnd,
            status: "scheduled",
            created_at: new Date().toISOString(),
            recurring_group: `group_${Date.now()}`,
          });
        }
        toast.success(`Создано ${repeatWeeks + 1} занятий (еженедельно)!`);
      } else {
        toast.success("Занятие создано!");
      }
    }

    form.reset();
    setShowForm(false);
    setEditLesson(null);
  }

  async function deleteLesson(id: string) {
    if (window.confirm("Удалить занятие?")) {
      await deleteDoc(doc(db, "lessons", id));
      toast.success("Занятие удалено!");
    }
  }

  async function setStatus(lesson: any) {
    const currentBalance = lessonBalances[lesson.student_id] || 0;
    
    if (currentBalance <= 0) {
      const confirmZero = window.confirm(`⚠️ У ученика ${lesson.student_name} закончились уроки в пакете (остаток: 0). Всё равно отметить занятие как проведённое?`);
      if (!confirmZero) return;
    } else {
      try {
        const balanceRef = doc(db, "lesson_balances", lesson.student_id);
        await updateDoc(balanceRef, {
          remaining: currentBalance - 1,
          last_updated: new Date().toISOString()
        });
        setLessonBalances(prev => ({ ...prev, [lesson.student_id]: currentBalance - 1 }));
        toast.success(`Списан 1 урок. Осталось: ${currentBalance - 1}`);
      } catch (error) {
        console.error("Ошибка списания баланса:", error);
        toast.error("Не удалось списать урок с баланса!");
      }
    }

    if (lesson.hw_template_id) {
      const template = libraryItems.find(item => item.id === lesson.hw_template_id);
      if (template && template.sections?.length > 0) {
        const totalMaxScore = template.sections.reduce((sum: number, s: any) => sum + (s.max_score || 0), 0);
        await addDoc(collection(db, "homeworks"), {
          tutor_id: uid,
          student_id: lesson.student_id,
          student_name: lesson.student_name || "",
          lesson_id: lesson.id,
          title: `ДЗ после занятия: ${template.title || new Date(lesson.start_time).toLocaleDateString('ru-RU')}`,
          description: `Автоматически создано после занятия`,
          task_type: "multi",
          sections: template.sections,
          max_score: totalMaxScore,
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
    }
    await updateDoc(doc(db, "lessons", lesson.id), { status: "completed" });
    
    const report = `📋 Отчёт о занятии\n\n📅 ${new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}\n⏰ ${new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – ${new Date(lesson.end_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n🧑🎓 Ученик: ${lesson.student_name || 'Не указан'}\n📚 Предмет: ${lesson.subject === 'chemistry' ? 'Химия' : 'Биология'}\n✅ Статус: Проведено${lesson.hw_template_id ? '\n📝 ДЗ: Отправлено' : ''}${lesson.topics ? '\n🎯 Темы: ' + lesson.topics : ''}`;
    
    setReportText(report);
    setShowReport(true);
    toast.success("Занятие проведено!");

    // 🚀 УВЕДОМЛЕНИЕ В ФОНЕ
    const hwMsg = lesson.hw_template_id 
      ? `✅ Отличная работа на уроке, ${lesson.student_name}!\n\nЗанятие проведено. Тебе уже отправлено домашнее задание, проверь раздел "ДЗ" в личном кабинете. Не забудь его выполнить! `
      : `✅ Отличная работа на уроке, ${lesson.student_name}!\n\nЗанятие проведено. Не забудь повторить пройденный материал. Увидимся на следующем занятии! 🚀`;
    
    sendTelegramToStudent(lesson.student_id, hwMsg);
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

    // 🚀 УВЕДОМЛЕНИЕ В ФОНЕ
    const dateStr = new Date(lesson.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const timeStr = new Date(lesson.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const msg = `🥀 Привет, ${lesson.student_name}.\n\nК сожалению, наше занятие на ${dateStr} в ${timeStr} отменено.\nПричина: ${reason}.\n\nМы скоро свяжемся с тобой для переноса. Хорошего дня!`;
    sendTelegramToStudent(lesson.student_id, msg);

    toast.success("Занятие отменено!");
  }

  async function saveLessonNotes() {
    if (!selectedLessonForNotes) return;
    await updateDoc(doc(db, "lessons", selectedLessonForNotes.id), {
      post_notes: lessonNotes,
      post_topics: lessonTopics,
    });
    toast.success("Заметки сохранены!");
    setShowNotesModal(false);
    setSelectedLessonForNotes(null);
    setLessonNotes("");
    setLessonTopics("");
  }

  async function exportToCalendar(lesson: any) {
    const start = new Date(lesson.start_time);
    const end = new Date(lesson.end_time);
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    const safeId = lesson.id ? lesson.id.replace(/[^a-zA-Z0-9]/g, '_') : 'lesson';
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Tutor Platform//Schedule//RU\nBEGIN:VEVENT\nUID:${safeId}@tutor-platform\nDTSTAMP:${formatDate(new Date())}\nDTSTART:${formatDate(start)}\nDTEND:${formatDate(end)}\nSUMMARY:${lesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"} с ${lesson.student_name || "учеником"}\nDESCRIPTION:${lesson.notes || "Занятие на платформе"}\n${lesson.zoom_link ? `LOCATION:${lesson.zoom_link}` : ''}\nEND:VEVENT\nEND:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson_${start.toISOString().slice(0, 19)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Событие экспортировано в календарь!");
  }

  const studentStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; cancelled: number; hours: number }> = {};
    filteredLessons.forEach(l => {
      if (!stats[l.student_id]) stats[l.student_id] = { total: 0, completed: 0, cancelled: 0, hours: 0 };
      stats[l.student_id].total++;
      if (l.status === 'completed') {
        stats[l.student_id].completed++;
        const duration = (new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 3600000;
        stats[l.student_id].hours += duration;
      }
      if (l.status === 'cancelled') stats[l.student_id].cancelled++;
    });
    return stats;
  }, [filteredLessons]);

  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-black' : 'bg-gradient-to-br from-red-50 via-rose-50 to-amber-50'}`}>
      {!isDark && <FallingLeaves />}
      <VintageOverlay />
      
      <Sidebar theme={theme} />
      
      <div className="fixed top-4 right-20 z-50">
        <NotificationBell uid={uid} role={role} isDark={isDark} />
      </div>
      
      <AnimatePresence>
        {showNotifications && notifications.length > 0 && (
          <div className="fixed top-20 right-4 z-50 space-y-2">
            {notifications.map(n => (
              <RedNotification 
                key={n.id} 
                message={n.message} 
                id={n.id}
                onDismiss={() => setNotifications(notifications.filter(x => x.id !== n.id))}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-20 max-w-6xl mx-auto p-4 sm:p-6 pt-20">
        <AnimatedTitle theme={theme} onThemeToggle={toggleTheme} />

        <motion.div 
          className={`rounded-2xl p-3 mb-4 shadow-md border ${isDark ? 'bg-gray-900/80 border-red-500/30' : 'bg-white/90 backdrop-blur border-red-200'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-red-500/30' : 'border-red-200'}`}>
              <motion.button 
                onClick={() => { setViewMode('week'); setCurrentWeek(0); }} 
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === 'week' ? 'bg-red-500 text-white' : isDark ? 'bg-gray-800 text-red-300' : 'bg-white text-red-600'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                📅 Неделя
              </motion.button>
              <motion.button 
                onClick={() => { setViewMode('month'); setCurrentWeek(0); }} 
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === 'month' ? 'bg-red-500 text-white' : isDark ? 'bg-gray-800 text-red-300' : 'bg-white text-red-600'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ️ Месяц
              </motion.button>
            </div>

            {isTutor && (
              <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} className={`px-3 py-1.5 text-xs rounded-xl border ${isDark ? 'bg-gray-800 border-red-500/30 text-red-300' : 'bg-white border-red-200 text-red-700'}`}>
                <option value="all">👤 Все ученики</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            )}

            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={`px-3 py-1.5 text-xs rounded-xl border ${isDark ? 'bg-gray-800 border-red-500/30 text-red-300' : 'bg-white border-red-200 text-red-700'}`}>
              <option value="all">📚 Все предметы</option>
              <option value="chemistry">🧪 Химия</option>
              <option value="biology">🧬 Биология</option>
            </select>

            <div className="flex-1"></div>
            <span className={`text-xs ${isDark ? 'text-red-400' : 'text-red-400'}`}>
              {filteredLessons.filter(l => weekDates.some(d => new Date(l.start_time).toDateString() === d.toDateString())).length} занятий
            </span>
            
            <div className="flex gap-2">
              <motion.button 
                onClick={() => setShowStats(!showStats)} 
                className={`text-xl transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`} 
                title="Статистика"
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
              >
                📊
              </motion.button>
              {isTutor && (
                <RedButton onClick={() => { setShowForm(true); setEditLesson(null); }}>
                  + Занятие
                </RedButton>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showStats && isTutor && (
            <motion.div 
              className={`rounded-2xl p-4 mb-4 shadow-md border ${isDark ? 'bg-gray-900/80 border-red-500/30' : 'bg-white/90 backdrop-blur border-red-200'}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                <span></span> Статистика по ученикам
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {students.map((s, idx) => {
                  const stat = studentStats[s.id] || { total: 0, completed: 0, cancelled: 0, hours: 0 };
                  const balance = lessonBalances[s.id] || 0;
                  return (
                    <motion.div 
                      key={s.id} 
                      className={`rounded-xl p-3 border ${isDark ? 'bg-red-900/20 border-red-500/20' : 'bg-red-50 border-red-100 shadow-sm'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{s.full_name}</p>
                      <div className={`flex gap-2 mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span>✅ {stat.completed}</span>
                        <span>📋 {stat.total}</span>
                        <span>️ {stat.hours.toFixed(1)}ч</span>
                        <span className={`font-bold ${balance === 0 ? 'text-red-500' : 'text-green-600'}`}> {balance}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'week' && (
          <motion.div 
            className="mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <DailyLoad weekDates={weekDates} getLessonsForDate={getLessonsForDate} theme={theme} />
            <HeatMap lessons={filteredLessons.filter(l => weekDates.some(d => new Date(l.start_time).toDateString() === d.toDateString()))} theme={theme} />
          </motion.div>
        )}

        <div className="mb-4">
          <WeekNavigator currentWeek={currentWeek} setCurrentWeek={setCurrentWeek} weekStr={weekStr} theme={theme} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + currentWeek}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedWeekGrid 
              weekDates={weekDates}
              getLessonsForDate={getLessonsForDate}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              handleDragStart={handleDragStart}
              setEditLesson={setEditLesson}
              setShowForm={setShowForm}
              setStatus={setStatus}
              cancelLesson={cancelLesson}
              setSelectedLessonForNotes={setSelectedLessonForNotes}
              setLessonNotes={setLessonNotes}
              setLessonTopics={setLessonTopics}
              setShowNotesModal={setShowNotesModal}
              exportToCalendar={exportToCalendar}
              deleteLesson={deleteLesson}
              theme={theme}
              viewMode={viewMode}
              isTutor={isTutor}
              lessonBalances={lessonBalances}
            />
          </motion.div>
        </AnimatePresence>

        <motion.div 
          className={`mt-6 rounded-2xl p-4 shadow-md border ${isDark ? 'bg-gray-900/80 border-red-500/30' : 'bg-white/90 backdrop-blur border-red-200'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            <span></span> Сегодня ({today.getDate()} {monthNames[today.getMonth()]})
            <motion.span 
              className="text-xs"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🍂
            </motion.span>
          </h3>
          {(() => {
            const todayLessons = getLessonsForDate(new Date());
            if (todayLessons.length === 0) {
              return <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет занятий на сегодня 🎉</p>;
            }
            return (
              <div className="space-y-2">
                {todayLessons.map((l: any, idx: number) => {
                  const startTime = new Date(l.start_time);
                  const endTime = new Date(l.end_time);
                  const balance = lessonBalances[l.student_id] || 0;
                  return (
                    <motion.div 
                      key={l.id} 
                      className={`flex flex-wrap items-center justify-between p-3 rounded-xl hover:shadow-md transition ${
                        l.subject === "chemistry" 
                          ? isDark ? "bg-red-900/30 border-l-4 border-red-500" : "bg-red-50 border-l-4 border-red-500"
                          : isDark ? "bg-rose-900/30 border-l-4 border-rose-500" : "bg-rose-50 border-l-4 border-rose-500"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.span 
                          className="text-lg"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          {l.subject === "chemistry" ? "🧪" : "🧬"}
                        </motion.span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{l.student_name || "Ученик"}</p>
                            <span className={`text-[10px] px-1.5 rounded font-bold ${balance > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              📦 {balance} ост.
                            </span>
                          </div>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {startTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} – {endTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {l.topics && <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>🎯 {l.topics}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <RedTimer startTime={startTime} endTime={endTime} />
                        {l.zoom_link && (
                          <motion.a 
                            href={l.zoom_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            🎥 Zoom
                          </motion.a>
                        )}
                        <motion.button 
                          onClick={() => exportToCalendar(l)} 
                          className={`text-xs px-2 py-1 rounded-lg transition ${isDark ? 'bg-rose-900/30 text-rose-300 hover:bg-rose-900/50' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`} 
                          title="Экспорт"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </motion.div>
      </div>

      <AnimatePresence>
        {showForm && (
          <RedEraModal isOpen={showForm} onClose={() => { setShowForm(false); setEditLesson(null); }} theme={theme}>
            <div className={`p-5 rounded-t-2xl sticky top-0 z-10 bg-gradient-to-r from-red-500 to-rose-500`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-2xl text-white">{editLesson ? "✏️ Редактировать занятие" : "✨ Создать занятие"}</h2>
                  <p className="text-white/80 text-sm mt-1">Заполните все поля</p>
                </div>
                <motion.button 
                  onClick={() => { setShowForm(false); setEditLesson(null); }} 
                  className="text-white/80 hover:text-white text-4xl leading-none transition"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                >
                  ×
                </motion.button>
              </div>
            </div>

            <form onSubmit={saveLesson} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👤 Ученик *</label>
                    <select name="student_id" required defaultValue={editLesson?.student_id || ""} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400 focus:ring-2 focus:ring-red-200`}>
                      <option value="">— Выбрать ученика —</option>
                      {students.map((s: any) => (<option key={s.id} value={s.id}>{s.full_name}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📚 Предмет *</label>
                    <select name="subject" required defaultValue={editLesson?.subject || "chemistry"} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`}>
                      <option value="chemistry"> Химия</option>
                      <option value="biology">🧬 Биология</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📅 Дата *</label>
                    <input type="date" name="date" required defaultValue={editLesson?.start_time?.slice(0, 10) || ""} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🕐 Начало</label>
                      <input type="time" name="start_time" required defaultValue={editLesson?.start_time?.slice(11, 16) || ""} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🕒 Конец</label>
                      <input type="time" name="end_time" required defaultValue={editLesson?.end_time?.slice(11, 16) || ""} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                    </div>
                  </div>

                  {!editLesson && (
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}> Повторять (недель)</label>
                      <input type="number" name="repeat_weeks" min="0" max="52" defaultValue="0" placeholder="0 — не повторять" className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Создаст занятие на каждую неделю в это же время</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>⏱️ Длительность (мин)</label>
                    <input type="number" name="duration" defaultValue={editLesson?.duration || 60} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎯 Темы урока</label>
                    <input type="text" name="topics" defaultValue={editLesson?.topics || ""} placeholder="ОВР, Электролиз, Оксиды..." className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎥 Zoom ссылка</label>
                    <input type="url" name="zoom_link" defaultValue={editLesson?.zoom_link || ""} placeholder="https://zoom.us/j/..." className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🖌️ Доска (Miro/Holst)</label>
                    <input type="url" name="board_link" defaultValue={editLesson?.board_link || ""} placeholder="https://miro.com/..." className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
                  </div>

                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📋 Шаблон ДЗ</label>
                    <select name="hw_template" defaultValue={editLesson?.hw_template_id || ""} className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                      <option value="">— Не привязано —</option>
                      {libraryItems.map((item) => (<option key={item.id} value={item.id}>{item.title || "Без названия"} ({item.sections?.length || 0} зад.)</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📝 Заметки (план урока)</label>
                <textarea name="notes" rows={4} defaultValue={editLesson?.notes || ""} placeholder="Темы, материалы, домашнее задание..." className={`w-full border-2 rounded-xl p-3 font-medium ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
              </div>

              <div className="flex gap-4 mt-6">
                <RedButton type="submit" className="flex-1">
                  {editLesson ? "💾 Сохранить" : "✅ Создать занятие"}
                </RedButton>
                <motion.button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditLesson(null); }} 
                  className={`flex-1 py-3 rounded-xl font-bold text-lg transition ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Отмена
                </motion.button>
              </div>
            </form>
          </RedEraModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotesModal && selectedLessonForNotes && (
          <RedEraModal isOpen={showNotesModal} onClose={() => setShowNotesModal(false)} theme={theme}>
            <div className="p-5 rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-xl text-white"> Заметки о занятии</h2>
                  <p className="text-white/80 text-sm mt-1">{selectedLessonForNotes.student_name} • {new Date(selectedLessonForNotes.start_time).toLocaleDateString('ru-RU')}</p>
                </div>
                <motion.button 
                  onClick={() => setShowNotesModal(false)} 
                  className="text-white/80 hover:text-white text-3xl"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                >
                  ×
                </motion.button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎯 Что прошли (темы)</label>
                <input type="text" value={lessonTopics} onChange={(e) => setLessonTopics(e.target.value)} placeholder="ОВР, Электролиз..." className={`w-full border-2 rounded-xl p-3 ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
              </div>
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>📝 Заметки</label>
                <textarea value={lessonNotes} onChange={(e) => setLessonNotes(e.target.value)} rows={5} placeholder="Как прошёл урок, что повторить, на что обратить внимание..." className={`w-full border-2 rounded-xl p-3 ${isDark ? 'bg-gray-800 border-red-500/30 text-white' : 'bg-white border-gray-200 text-gray-800'} focus:border-red-400`} />
              </div>
              <div className="flex gap-3">
                <RedButton onClick={saveLessonNotes} className="flex-1">💾 Сохранить</RedButton>
                <motion.button 
                  onClick={() => setShowNotesModal(false)} 
                  className={`px-6 py-3 rounded-xl font-bold transition ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Отмена
                </motion.button>
              </div>
            </div>
          </RedEraModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && (
          <RedEraModal isOpen={showReport} onClose={() => setShowReport(false)} theme={theme}>
            <div className="p-4 rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.span 
                    className="text-3xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    🧣
                  </motion.span>
                  <h2 className="font-bold text-xl text-white">📋 Отчёт о занятии</h2>
                </div>
                <motion.button 
                  onClick={() => setShowReport(false)} 
                  className="text-white/80 hover:text-white text-3xl leading-none transition"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                >
                  ×
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              <pre className={`text-sm whitespace-pre-wrap rounded-xl p-4 mb-4 border max-h-[300px] overflow-auto ${isDark ? 'bg-red-900/20 border-red-500/30 text-gray-200' : 'bg-red-50 border-red-100 text-gray-700'}`}>
                {reportText}
              </pre>
              <div className="flex gap-3">
                <RedButton 
                  onClick={() => { navigator.clipboard.writeText(reportText); toast.success("Скопировано!"); }} 
                  className="flex-1"
                >
                  📋 Копировать
                </RedButton>
                <motion.button 
                  onClick={() => { window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(reportText)}`, '_blank'); }} 
                  className="flex-1 bg-rose-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-rose-600 transition shadow-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                   Telegram
                </motion.button>
              </div>
            </div>
          </RedEraModal>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50"><div className="text-red-500">Загрузка...</div></div>}>
      <ScheduleContent />
    </Suspense>
  );
}