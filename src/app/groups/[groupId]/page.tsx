"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Calendar, BookOpen } from "lucide-react";

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

const safeDate = (dateValue: any) => {
  if (!dateValue) return new Date();
  if (dateValue?.toDate) return dateValue.toDate();
  return new Date(dateValue);
};

function GroupContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const initialTab = searchParams.get("tab") || "schedule";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [group, setGroup] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      try {
        const groupSnap = await getDoc(doc(db, "groups", groupId));
        if (groupSnap.exists()) {
          setGroup({ id: groupSnap.id, ...groupSnap.data() });
        } else {
          console.error("Группа не найдена:", groupId);
        }
      } catch (e) {
        console.error("Ошибка загрузки группы:", e);
      }
    };
    fetchGroup();

    const unsubStudents = onSnapshot(
      query(collection(db, "profiles"), where("role", "==", "student")),
      (snap) => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubLessons = onSnapshot(
      query(collection(db, "lessons"), where("group_id", "==", groupId)),
      (snap) => {
        setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubHomeworks = onSnapshot(
      query(collection(db, "homeworks"), where("group_id", "==", groupId)),
      (snap) => {
        setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    setLoading(false);
    return () => { unsubStudents(); unsubLessons(); unsubHomeworks(); };
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-emerald-700 text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">📚</p>
          <p className="text-emerald-800 font-bold text-lg mb-4">Группа не найдена</p>
          <Link href="/dashboard" className="text-emerald-600 hover:text-emerald-800">← Вернуться на дашборд</Link>
        </div>
      </div>
    );
  }

  const groupStudents = students.filter(s => group.student_ids?.includes(s.id));

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="flex min-h-screen">
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Заголовок */}
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="text-emerald-700 hover:text-emerald-900 transition font-medium flex items-center gap-1 group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" /> Назад
              </Link>
              <div className="text-center flex-1">
                <h1 className="text-3xl font-bold text-emerald-800">
                  {group.emoji || ""} {group.name}
                </h1>
                <p className="text-sm text-emerald-600">{groupStudents.length} учеников</p>
              </div>
              <div className="w-24"></div>
            </div>

            {/* Вкладки */}
            <div className="flex gap-2 border-b border-emerald-200 pb-2">
              {[
                { id: "schedule", label: "📅 Расписание", icon: Calendar },
                { id: "students", label: "👥 Участники", icon: Users },
                { id: "homeworks", label: "📚 ДЗ", icon: BookOpen },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Контент вкладок */}
            {activeTab === "schedule" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200">
                  <h2 className="text-xl font-bold text-emerald-800 mb-4">Расписание группы</h2>
                  {lessons.length === 0 ? (
                    <p className="text-center text-emerald-600 py-8">Пока нет запланированных занятий</p>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                          <div>
                            <p className="font-medium text-emerald-900">{lesson.title || "Занятие"}</p>
                            <p className="text-sm text-emerald-600">
                              {safeDate(lesson.start_time).toLocaleString('ru-RU', { 
                                day: 'numeric', 
                                month: 'long', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <span className="text-sm px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                            {lesson.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "students" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200">
                  <h2 className="text-xl font-bold text-emerald-800 mb-4">Участники группы</h2>
                  {groupStudents.length === 0 ? (
                    <p className="text-center text-emerald-600 py-8">В группе пока нет учеников</p>
                  ) : (
                    <div className="space-y-3">
                      {groupStudents.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                              {student.full_name ? student.full_name[0].toUpperCase() : "?"}
                            </div>
                            <div>
                              <p className="font-medium text-emerald-900">{student.full_name || student.email}</p>
                              <p className="text-sm text-emerald-600">{student.email}</p>
                            </div>
                          </div>
                          <span className="text-sm px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
                            {student.completed_lessons || 0} занятий
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "homeworks" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200">
                  <h2 className="text-xl font-bold text-emerald-800 mb-4">Домашние задания</h2>
                  {homeworks.length === 0 ? (
                    <p className="text-center text-emerald-600 py-8">Пока нет домашних заданий</p>
                  ) : (
                    <div className="space-y-3">
                      {homeworks.map(hw => (
                        <Link 
                          key={hw.id}
                          href={`/homeworks/${hw.id}`}
                          className="block p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-emerald-900">{hw.title || "Домашнее задание"}</p>
                              <p className="text-sm text-emerald-600">
                                {hw.topic && `${hw.topic} • `}
                                {hw.deadline ? `Дедлайн: ${safeDate(hw.deadline).toLocaleDateString('ru-RU')}` : "Без срока"}
                              </p>
                            </div>
                            <span className="text-sm px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                              ⏳ Ожидает
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function GroupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-50 flex items-center justify-center text-emerald-700">Загрузка...</div>}>
      <GroupContent />
    </Suspense>
  );
}