"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, collection, query, where, onSnapshot,
  setDoc, deleteDoc
} from "firebase/firestore";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Calendar, BookOpen, Check, X as XIcon } from "lucide-react";

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

const safeDate = (dateValue: any) => {
  if (!dateValue) return new Date();
  if (dateValue?.toDate) return dateValue.toDate();
  return new Date(dateValue);
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
};

const AVATAR_GRADIENTS = [
  "from-purple-400 to-fuchsia-400",
  "from-fuchsia-400 to-pink-400",
  "from-pink-400 to-orange-400",
  "from-indigo-400 to-purple-400",
  "from-purple-300 to-pink-500",
];

/*
  Схема Firestore для новых сущностей:

  attendance/{autoId}
    lesson_id: string
    group_id: string
    student_id: string
    status: "present" | "absent"
    marked_at: timestamp

  homeworks/{hwId}/submissions/{studentId}
    status: "submitted" | "pending" | "checking"
    grade: number | null
    submitted_at: timestamp | null
*/

// Карточка одного занятия с раскрывающимся чеклистом посещаемости
function LessonCard({ lesson, groupId, groupStudents, isDark }: any) {
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});
  const [open, setOpen] = useState(false);
  const isPast = safeDate(lesson.start_time).getTime() < Date.now();

  useEffect(() => {
    if (!isPast) return;
    const unsub = onSnapshot(
      query(collection(db, "attendance"), where("lesson_id", "==", lesson.id)),
      (snap) => {
        const map: Record<string, "present" | "absent"> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          map[data.student_id] = data.status;
        });
        setAttendance(map);
      }
    );
    return () => unsub();
  }, [lesson.id, isPast]);

  const toggleAttendance = async (studentId: string) => {
    const current = attendance[studentId];
    const next = current === "present" ? "absent" : "present";
    const docId = `${lesson.id}_${studentId}`;
    try {
      await setDoc(doc(db, "attendance", docId), {
        lesson_id: lesson.id,
        group_id: groupId,
        student_id: studentId,
        status: next,
        marked_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Ошибка отметки посещаемости:", e);
    }
  };

  const presentCount = Object.values(attendance).filter(s => s === "present").length;

  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-purple-950/40' : 'bg-purple-50/60'}`}>
      <button
        onClick={() => isPast && setOpen(o => !o)}
        className={`w-full flex items-center justify-between p-4 text-left ${isPast ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div>
          <p className={`font-medium ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>{lesson.title || "Занятие"}</p>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-purple-300/70' : 'text-purple-600'}`}>
            {safeDate(lesson.start_time).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            {isPast ? ` · посещаемость ${presentCount}/${groupStudents.length}` : ' · будущее'}
          </p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full ${isDark ? 'bg-purple-900/60 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
          {lesson.subject === 'chemistry' ? '🧪 Химия' : '🧬 Биология'}
        </span>
      </button>

      {isPast && open && (
        <div className={`px-4 pb-4 border-t ${isDark ? 'border-purple-800/50' : 'border-purple-100'}`}>
          <p className={`text-xs uppercase tracking-wide mt-3 mb-2 ${isDark ? 'text-purple-400' : 'text-purple-500'}`}>Посещаемость</p>
          <div className="space-y-1.5">
            {groupStudents.map((s: any) => {
              const status = attendance[s.id];
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAttendance(s.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                      status === "present" ? "bg-green-100 text-green-600" :
                      status === "absent" ? "bg-red-100 text-red-600" :
                      isDark ? "bg-purple-900 text-purple-500" : "bg-purple-100 text-purple-400"
                    }`}
                  >
                    {status === "present" ? <Check size={14} /> : status === "absent" ? <XIcon size={14} /> : null}
                  </button>
                  <span className={`text-sm flex-1 ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>{s.full_name}</span>
                  {status === "absent" && <span className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-500'}`}>пропуск</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeworkCard({ hw, groupStudents, isDark }: any) {
  const [submissions, setSubmissions] = useState<Record<string, { status: string; grade: number | null }>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "homeworks", hw.id, "submissions"), (snap) => {
      const map: Record<string, { status: string; grade: number | null }> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[d.id] = { status: data.status || "pending", grade: data.grade ?? null };
      });
      setSubmissions(map);
    });
    return () => unsub();
  }, [hw.id]);

  const submittedCount = Object.values(submissions).filter(s => s.status === "submitted").length;

  const statusBadge = (status?: string) => {
    if (status === "submitted") return <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold">✓ Сдано</span>;
    if (status === "checking") return <span className="text-xs px-2.5 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 font-semibold">На проверке</span>;
    return <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">Не сдано</span>;
  };

  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-purple-950/40' : 'bg-purple-50/60'}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
        <div>
          <p className={`font-medium ${isDark ? 'text-purple-100' : 'text-purple-900'}`}>{hw.title || "Домашнее задание"}</p>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-purple-300/70' : 'text-purple-600'}`}>
            {hw.topic && `${hw.topic} • `}
            {hw.deadline ? `Дедлайн: ${safeDate(hw.deadline).toLocaleDateString('ru-RU')}` : "Без срока"}
            {` · сдали ${submittedCount}/${groupStudents.length}`}
          </p>
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">⏳ {submittedCount}/{groupStudents.length}</span>
      </button>

      {open && (
        <div className={`px-4 pb-4 border-t ${isDark ? 'border-purple-800/50' : 'border-purple-100'}`}>
          <div className="space-y-1.5 mt-3">
            {groupStudents.map((s: any, i: number) => {
              const sub = submissions[s.id];
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                    {getInitials(s.full_name)}
                  </div>
                  <span className={`text-sm flex-1 ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>{s.full_name}</span>
                  {statusBadge(sub?.status)}
                  <span className={`text-sm font-bold w-6 text-right ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                    {sub?.grade ?? '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const initialTab = searchParams.get("tab") || "schedule";
  const [theme] = useState<'dark' | 'light'>(() => (typeof window !== "undefined" ? (localStorage.getItem('theme') as 'dark' | 'light') || 'light' : 'light'));
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [group, setGroup] = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

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
      } finally {
        // ИСПРАВЛЕНО: раньше setLoading(false) стоял сразу после вызова
        // fetchGroup() без await, поэтому срабатывал до реальной загрузки
        // и на секунду показывал "группа не найдена". Теперь ждём здесь.
        setGroupLoading(false);
      }
    };
    fetchGroup();

    const unsubStudents = onSnapshot(
      query(collection(db, "profiles"), where("role", "==", "student")),
      (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubLessons = onSnapshot(
      query(collection(db, "lessons"), where("group_id", "==", groupId)),
      (snap) => setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubHomeworks = onSnapshot(
      query(collection(db, "homeworks"), where("group_id", "==", groupId)),
      (snap) => setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), where("group_id", "==", groupId), where("confirmed", "==", false)),
      (snap) => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubStudents(); unsubLessons(); unsubHomeworks(); unsubPayments(); };
  }, [groupId]);

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-fuchsia-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">📚</p>
          <p className="text-purple-800 font-bold text-lg mb-4">Группа не найдена</p>
          <Link href="/groups" className="text-purple-600 hover:text-purple-800">← Вернуться к группам</Link>
        </div>
      </div>
    );
  }

  const groupStudents = students.filter(s => group.student_ids?.includes(s.id));
  const unpaidStudentIds = new Set(payments.map(p => p.student_id));

  const tabs = [
    { id: "schedule", label: "Расписание", icon: Calendar },
    { id: "students", label: "Участники", icon: Users },
    { id: "homeworks", label: "ДЗ", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/groups" className="text-purple-600 hover:text-purple-800 transition font-medium flex items-center gap-1 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" /> Назад
          </Link>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-serif font-bold text-purple-900">
              {group.subject === 'chemistry' ? '🧪' : '🧬'} {group.name}
            </h1>
            <p className="text-sm text-purple-500 mt-1">{groupStudents.length} учеников{group.schedule ? ` · ${group.schedule}` : ''}</p>
          </div>
          <div className="w-14"></div>
        </div>

        <div className="flex gap-2 justify-center flex-wrap border-b border-purple-100 pb-3 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "schedule" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {lessons.length === 0 ? (
              <p className="text-center text-purple-500 py-12">Пока нет запланированных занятий</p>
            ) : (
              lessons
                .sort((a, b) => safeDate(a.start_time).getTime() - safeDate(b.start_time).getTime())
                .map(lesson => (
                  <LessonCard key={lesson.id} lesson={lesson} groupId={groupId} groupStudents={groupStudents} isDark={isDark} />
                ))
            )}
          </motion.div>
        )}

        {activeTab === "students" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {groupStudents.length === 0 ? (
              <p className="text-center text-purple-500 py-12">В группе пока нет учеников</p>
            ) : (
              groupStudents.map((student, i) => (
                <div key={student.id} className="flex items-center gap-3 p-4 bg-purple-50/60 rounded-2xl">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {getInitials(student.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-purple-900">{student.full_name || student.email}</p>
                    <p className="text-sm text-purple-500">{student.email}</p>
                  </div>
                  <span className="text-sm px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 flex-shrink-0">
                    {student.completed_lessons || 0} занятий
                  </span>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 ${unpaidStudentIds.has(student.id) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {unpaidStudentIds.has(student.id) ? 'не оплачено' : 'оплачено'}
                  </span>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "homeworks" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {homeworks.length === 0 ? (
              <p className="text-center text-purple-500 py-12">Пока нет домашних заданий</p>
            ) : (
              homeworks.map(hw => (
                <HomeworkCard key={hw.id} hw={hw} groupStudents={groupStudents} isDark={isDark} />
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function GroupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-purple-600">Загрузка...</div>}>
      <GroupContent />
    </Suspense>
  );
}