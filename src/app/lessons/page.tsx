"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Play, Clock, Calendar, Download, FileText, BookOpen } from "lucide-react";

interface LessonRecord {
  id: string;
  lessonId: string;
  studentName?: string;
  groupName?: string;
  topics?: string;
  postTopics?: string;
  postNotes?: string;
  start_time?: string;
  status?: string;
  recordings?: Array<{
    url: string;
    filename: string;
    createdAt: string;
    duration: number;
  }>;
  attached_file_url?: string;
  attached_file_name?: string;
  hw_template_id?: string;
  homeworks?: Array<{
    title: string;
    status: string;
  }>;
}

export default function LessonsHistoryPage() {
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<LessonRecord | null>(null);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const uid = localStorage.getItem("uid");
      const role = localStorage.getItem("role");

      if (!uid) {
        alert("Не авторизован");
        return;
      }

      // Загружаем все уроки
      const lessonsQuery = query(
        collection(db, "lessons"),
        where(role === "tutor" ? "tutor_id" : "student_id", "==", uid),
        orderBy("start_time", "desc")
      );

      const snapshot = await getDocs(lessonsQuery);
      const allLessons: LessonRecord[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        allLessons.push({
          id: doc.id,
          lessonId: doc.id,
          ...data,
        });
      });

      setLessons(allLessons);
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Нет даты";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "long", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">📚 История уроков</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка уроков...</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <p className="text-gray-500">Пока нет уроков</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden">
                {/* Шапка урока */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">
                        {lesson.topics || lesson.postTopics || "Без темы"}
                      </h2>
                      <p className="text-gray-600">
                        {lesson.is_group ? `👥 ${lesson.groupName || "Группа"}` : `👤 ${lesson.studentName || "Ученик"}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar size={14} />
                        {formatDate(lesson.start_time)}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                        lesson.status === "completed" ? "bg-green-100 text-green-700" :
                        lesson.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {lesson.status === "completed" ? "✅ Проведено" : 
                         lesson.status === "cancelled" ? "❌ Отменено" : "📅 Запланировано"}
                      </span>
                    </div>
                  </div>

                  {lesson.postNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{lesson.postNotes}</p>
                    </div>
                  )}
                </div>

                {/* Контент урока */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Записи */}
                  {lesson.recordings && lesson.recordings.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Play size={16} className="text-indigo-600" />
                        Записи ({lesson.recordings.length})
                      </h3>
                      {lesson.recordings.map((rec, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                          <button
                            onClick={() => setSelectedLesson(lesson)}
                            className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-700"
                          >
                            <Play size={20} className="text-white ml-1" />
                          </button>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Запись {new Date(rec.createdAt).toLocaleDateString("ru-RU")}
                            </p>
                            <p className="text-xs text-gray-500">{formatDuration(rec.duration)}</p>
                          </div>
                          <a
                            href={rec.url}
                            download
                            className="p-2 text-gray-600 hover:text-indigo-600"
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Материалы */}
                  {lesson.attached_file_url && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        Материалы
                      </h3>
                      <a
                        href={lesson.attached_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {lesson.attached_file_name || "Файл"}
                          </p>
                          <p className="text-xs text-gray-500">Нажмите для скачивания</p>
                        </div>
                      </a>
                    </div>
                  )}

                  {/* ДЗ */}
                  {lesson.hw_template_id && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen size={16} className="text-amber-600" />
                        Домашнее задание
                      </h3>
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-gray-700">ДЗ назначено после урока</p>
                        <p className="text-xs text-gray-500 mt-1">Проверьте раздел "Домашние задания"</p>
                      </div>
                    </div>
                  )}

                  {/* Если ничего нет */}
                  {!lesson.recordings?.length && !lesson.attached_file_url && !lesson.hw_template_id && (
                    <div className="md:col-span-3 text-center py-8 text-gray-400">
                      <p>Нет материалов, записей и ДЗ</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно с плеером */}
      {selectedLesson && selectedLesson.recordings?.[0] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSelectedLesson(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              <video 
                src={selectedLesson.recordings[0].url} 
                controls 
                autoPlay
                className="w-full h-full"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2">
                {selectedLesson.topics || "Урок"} • {formatDate(selectedLesson.start_time)}
              </h2>
              {selectedLesson.postNotes && <p className="text-gray-600">{selectedLesson.postNotes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}