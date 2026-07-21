"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4", authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37", storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384", appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

function ParentReportsContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || (typeof window !== "undefined" ? localStorage.getItem("uid") : "") || "";
  
  const [profile, setProfile] = useState<any>(null);
  const [childId, setChildId] = useState<string>("");
  const [childProfile, setChildProfile] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        if (data.child_id) {
          setChildId(data.child_id);
          loadChildData(data.child_id);
        }
      }
      setLoading(false);
    });
  }, [uid]);

  function loadChildData(cid: string) {
    getDoc(doc(db, "profiles", cid)).then((snap) => { if (snap.exists()) setChildProfile(snap.data()); });
    
    // Занятия — сортировка по дате (новые сверху)
    onSnapshot(
      query(collection(db, "lessons"), where("student_id", "==", cid)),
      (snap) => {
        const lessonsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lessonsData.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        setLessons(lessonsData);
      }
    );
    
    // Домашки
    onSnapshot(
      query(collection(db, "homeworks"), where("student_id", "==", cid)),
      (snap) => setHomeworks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }

  const getHwForLesson = (lessonDate: string) => {
    const lessonStart = new Date(lessonDate);
    const lessonEnd = new Date(lessonStart.getTime() + 2 * 60 * 60 * 1000); // +2 часа
    return homeworks.filter((hw: any) => {
      const hwCreated = new Date(hw.created_at);
      return hwCreated >= lessonStart && hwCreated <= lessonEnd;
    });
  };

  const getLessonStatus = (status: string) => {
    switch (status) {
      case "completed": return { icon: "✅", label: "Проведено", color: "bg-emerald-100 text-emerald-700" };
      case "scheduled": return { icon: "📅", label: "Запланировано", color: "bg-blue-100 text-blue-700" };
      case "cancelled": return { icon: "❌", label: "Отменено", color: "bg-red-100 text-red-700" };
      default: return { icon: "❓", label: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            📊 Отчёты о занятиях
          </h1>
          {childProfile?.full_name && (
            <p className="text-gray-500 mt-1">Ученик: {childProfile.full_name}</p>
          )}
        </div>

        {!childId ? (
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-8 text-center border border-white">
            <p className="text-4xl mb-4">🔗</p>
            <p className="text-gray-500 text-lg">Ученик ещё не привязан</p>
            <p className="text-gray-400 text-sm mt-2">Попросите репетитора привязать ваш аккаунт к ученику</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-8 text-center border border-white">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-gray-500 text-lg">Занятий пока нет</p>
            <p className="text-gray-400 text-sm mt-2">Отчёты появятся после проведения занятий</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Список занятий */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2 px-1">📅 История занятий</h3>
              {lessons.map((lesson: any) => {
                const status = getLessonStatus(lesson.status);
                const lessonHw = getHwForLesson(lesson.start_time);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson({ ...lesson, homeworks: lessonHw })}
                    className={`w-full text-left p-3 rounded-xl transition border-2 ${
                      selectedLesson?.id === lesson.id
                        ? "bg-white border-emerald-400 shadow-md"
                        : "bg-white/60 border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(lesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(lesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          {" • "}
                          {lesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.icon}
                      </span>
                    </div>
                    {lessonHw.length > 0 && (
                      <p className="text-xs text-amber-500 mt-1">📚 {lessonHw.length} заданий</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Детали занятия */}
            <div className="lg:col-span-2">
              {selectedLesson ? (
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 border border-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {new Date(selectedLesson.start_time).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                      </h2>
                      <p className="text-gray-500">
                        {new Date(selectedLesson.start_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        {" • "}
                        {selectedLesson.subject === "chemistry" ? "🧪 Химия" : "🧬 Биология"}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLessonStatus(selectedLesson.status).color}`}>
                      {getLessonStatus(selectedLesson.status).icon} {getLessonStatus(selectedLesson.status).label}
                    </span>
                  </div>

                  {/* Тема и заметки */}
                  {selectedLesson.topic && (
                    <div className="bg-violet-50 rounded-xl p-4">
                      <p className="text-xs text-violet-500 font-medium mb-1">📝 Тема занятия</p>
                      <p className="text-sm text-gray-800">{selectedLesson.topic}</p>
                    </div>
                  )}

                  {selectedLesson.notes && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">🗒️ Заметки репетитора</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedLesson.notes}</p>
                    </div>
                  )}

                  {/* Результаты */}
                  {selectedLesson.score !== undefined && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">⭐ Результат</p>
                      <p className="text-2xl font-black text-amber-600">{selectedLesson.score} баллов</p>
                      {selectedLesson.max_score && (
                        <p className="text-sm text-gray-500">из {selectedLesson.max_score} возможных</p>
                      )}
                    </div>
                  )}

                  {/* Домашние задания */}
                  {selectedLesson.homeworks && selectedLesson.homeworks.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-2">📚 Домашние задания</p>
                      <div className="space-y-2">
                        {selectedLesson.homeworks.map((hw: any) => (
                          <div key={hw.id} className="p-3 bg-white rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{hw.title || "Без названия"}</p>
                              <p className="text-xs text-gray-400">
                                {hw.status === "done" ? "✅ Сдано" : hw.status === "checked" ? "✔️ Проверено" : "⏳ Ожидает"}
                                {hw.score !== undefined && ` • ${hw.score} баллов`}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              hw.status === "done" ? "bg-blue-100 text-blue-700" :
                              hw.status === "checked" ? "bg-emerald-100 text-emerald-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {hw.status === "done" ? "Сдано" : hw.status === "checked" ? "Проверено" : "Не сдано"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ссылки */}
                  {(selectedLesson.zoom_link || selectedLesson.board_link) && (
                    <div className="flex gap-2">
                      {selectedLesson.zoom_link && (
                        <a href={selectedLesson.zoom_link} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition">
                          🎥 Запись Zoom
                        </a>
                      )}
                      {selectedLesson.board_link && (
                        <a href={selectedLesson.board_link} target="_blank" rel="noopener noreferrer" className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition">
                          🖊️ Доска
                        </a>
                      )}
                    </div>
                  )}

                  {!selectedLesson.topic && !selectedLesson.notes && selectedLesson.status === "scheduled" && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-lg mb-2">📅</p>
                      <p>Занятие ещё не проведено</p>
                      <p className="text-sm">Отчёт появится после занятия</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-16">
                    <p className="text-6xl mb-4">👈</p>
                    <p className="text-gray-400 text-lg">Выберите занятие слева</p>
                    <p className="text-gray-300 text-sm mt-1">чтобы увидеть отчёт</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParentReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div><p className="text-gray-500">Загрузка...</p></div></div>}>
      <ParentReportsContent />
    </Suspense>
  );
}