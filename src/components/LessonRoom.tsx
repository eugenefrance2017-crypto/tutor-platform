"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useWhiteboard } from "@/hooks/useWhiteboard";
import WhiteboardCanvas from "@/components/WhiteboardCanvas";
import WhiteboardToolbar from "@/components/WhiteboardToolbar";
import VideoCall from "@/components/VideoCall";
import LessonChat from "@/components/LessonChat";

export default function LessonRoom({ lessonId }: { lessonId: string }) {
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [lessonInfo, setLessonInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole === "tutor" ? "teacher" : "student");
  }, []);

  useEffect(() => {
    if (!lessonId) {
      setError("Нет ID урока");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const unsub = onSnapshot(doc(db, "lessons", lessonId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Lesson loaded:", data);
          setLessonInfo({ id: snap.id, ...data });
        } else {
          console.warn("❌ Lesson not found:", lessonId);
          setError("Урок не найден");
        }
        setLoading(false);
      }, (err) => {
        console.error("❌ Error loading lesson:", err);
        setError("Ошибка загрузки: " + err.message);
        setLoading(false);
      });
      
      return () => unsub();
    } catch (err: any) {
      console.error("❌ Critical error:", err);
      setError("Критическая ошибка: " + err.message);
      setLoading(false);
    }
  }, [lessonId]);

  // Инициализируем whiteboard даже если lessonInfo null
  const wb = useWhiteboard(lessonId, role);
  const [stage, setStage] = useState<any>(null);

  // Формируем название
  const title = (() => {
    if (!lessonInfo) return "Загрузка...";
    
    let topic = "";
    if (lessonInfo.topics) {
      topic = Array.isArray(lessonInfo.topics) 
        ? lessonInfo.topics.join(", ") 
        : lessonInfo.topics;
    } else if (lessonInfo.post_topics) {
      topic = Array.isArray(lessonInfo.post_topics) 
        ? lessonInfo.post_topics.join(", ") 
        : lessonInfo.post_topics;
    }
    
    let name = "";
    if (lessonInfo.is_group) {
      name = lessonInfo.group_name || "Группа";
    } else if (lessonInfo.course_name) {
      name = lessonInfo.course_name;
    } else {
      name = lessonInfo.student_name || "Ученик";
    }
    
    const parts = [topic, name].filter(Boolean);
    const fullTitle = parts.length > 0 ? parts.join(" · ") : lessonId;
    
    return fullTitle.length > 80 ? fullTitle.substring(0, 80) + "..." : fullTitle;
  })();

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка урока...</p>
          <p className="text-xs text-gray-400 mt-2">ID: {lessonId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl border border-red-200 shadow-lg p-6 max-w-md">
          <h2 className="text-lg font-bold text-red-600 mb-2"> Ошибка</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Перезагрузить
            </button>
            <button 
              onClick={() => window.location.href = "/schedule"}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              В расписание
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => {
              if (confirm("Выйти из урока?")) {
                window.location.href = "/schedule";
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            title="Выйти из урока"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Выйти</span>
          </button>
          <h1 className="text-sm sm:text-base font-semibold text-gray-800 truncate" title={title}>
            {title}
          </h1>
          {lessonInfo?.status === "completed" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold shrink-0">проведено</span>
          )}
          {lessonInfo?.status === "cancelled" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">отменено</span>
          )}
        </div>
        <span className="text-xs text-gray-400 hidden sm:block shrink-0">
          {role === "teacher" ? "режим учителя" : "режим ученика"}
        </span>
      </header>

      {/* Тулбар - sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <WhiteboardToolbar wb={wb} stage={stage} />
      </div>

      {/* Доска - фиксированная высота, не скроллится */}
      <div className="flex-1 flex flex-col min-h-0 p-2">
        <WhiteboardCanvas wb={wb} onStageReady={setStage} />
      </div>

      {/* Окна звонка и чата - поверх всего */}
      <VideoCall lessonId={lessonId} />
      <LessonChat lessonId={lessonId} />
    </div>
  );
}