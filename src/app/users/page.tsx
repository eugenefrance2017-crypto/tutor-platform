"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getFirestore, collection, query, where, getDocs, doc,
  updateDoc, arrayUnion, arrayRemove, onSnapshot, deleteDoc, addDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, GraduationCap, Calendar, BookOpen, Award,
  ChevronLeft, Search, Shield, ShieldOff, Trash2, Activity,
  Sun, Moon, X, Check, BookMarked
} from "lucide-react";

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA59ya6aCzYA0YfwQo8B91u8Pp94ZUDM-4",
  authDomain: "tutor-platform-a5e37.firebaseapp.com",
  projectId: "tutor-platform-a5e37",
  storageBucket: "tutor-platform-a5e37.firebasestorage.app",
  messagingSenderId: "115123071384",
  appId: "1:115123071384:web:9517a29ed1fc2c46e163ed",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

type User = {
  id: string;
  email: string;
  full_name?: string;
  role: "student" | "tutor";
  created_at: string;
  last_login?: string;
  is_active: boolean;
  enrolled_courses?: string[];
  xp?: number;
  level?: number;
};

type Course = {
  id: string;
  title: string;
  description: string;
  price: number;
  lessons: string[];
  students: string[];
};

function formatDate(dateValue: any): string {
  if (!dateValue) return "—";
  let date: Date;
  if (typeof dateValue === "string" || typeof dateValue === "number") date = new Date(dateValue);
  else if (dateValue?.toDate) date = dateValue.toDate();
  else return "—";
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function UsersContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "tutor">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", role: "student" as "student" | "tutor" });
  const [darkMode, setDarkMode] = useState(false);

  const [stats, setStats] = useState({ totalStudents: 0, totalTutors: 0, activeToday: 0, avgProgress: 0, totalXP: 0, topStudents: [] as User[] });

  useEffect(() => {
    setUid(localStorage.getItem("uid") || "");
    setRole(localStorage.getItem("role") || "");
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") setDarkMode(true);
  }, []);

  useEffect(() => { localStorage.setItem("darkMode", String(darkMode)); }, [darkMode]);

  useEffect(() => {
    if (!uid || role !== "tutor") return;
    const q = query(collection(db, "profiles"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as User[];
      setUsers(usersData);
      
      const students = usersData.filter(u => u.role === "student");
      const tutors = usersData.filter(u => u.role === "tutor");
      const activeToday = usersData.filter(u => {
        if (!u.last_login) return false;
        return new Date(u.last_login).toDateString() === new Date().toDateString();
      }).length;
      
      const totalXP = students.reduce((sum, s) => sum + (s.xp || 0), 0);
      const avgProgress = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + (s.level || 0), 0) / students.length * 10) : 0;
      const topStudents = [...students].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
      
      setStats({ totalStudents: students.length, totalTutors: tutors.length, activeToday, avgProgress, totalXP, topStudents });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid, role]);

  useEffect(() => {
    if (!uid || role !== "tutor") return;
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(query(collection(db, "courses"), where("tutor_id", "==", uid)));
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      } catch (error) { console.error("Ошибка загрузки курсов:", error); }
    };
    fetchCourses();
  }, [uid, role]);

  const addUser = async () => {
    if (!newUser.email) { toast.error("Введите email"); return; }
    try {
      await addDoc(collection(db, "profiles"), {
        email: newUser.email, full_name: newUser.full_name || newUser.email.split("@")[0],
        role: newUser.role, created_at: new Date().toISOString(), is_active: true,
        enrolled_courses: [], completed_lessons: [], xp: 0, level: 1,
      });
      toast.success("Пользователь добавлен!");
      setShowAddModal(false);
      setNewUser({ email: "", full_name: "", role: "student" });
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await updateDoc(doc(db, "profiles", user.id), { is_active: !user.is_active });
      toast.success(user.is_active ? "Пользователь заблокирован" : "Пользователь разблокирован");
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  };

  const deleteUser = async (user: User) => {
    if (!confirm(`Удалить пользователя ${user.full_name || user.email}?`)) return;
    try {
      await deleteDoc(doc(db, "profiles", user.id));
      toast.success("Пользователь удалён");
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  };

  const grantCourseAccess = async (userId: string, courseId: string) => {
    try {
      await updateDoc(doc(db, "profiles", userId), { enrolled_courses: arrayUnion(courseId) });
      await updateDoc(doc(db, "courses", courseId), { students: arrayUnion(userId) });
      toast.success("Доступ предоставлен");
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  };

  const revokeCourseAccess = async (userId: string, courseId: string) => {
    try {
      await updateDoc(doc(db, "profiles", userId), { enrolled_courses: arrayRemove(courseId) });
      await updateDoc(doc(db, "courses", courseId), { students: arrayRemove(userId) });
      toast.success("Доступ отозван");
    } catch (error: any) { toast.error(`Ошибка: ${error.message}`); }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (user.email || "").toLowerCase().includes(searchLower) || (user.full_name || "").toLowerCase().includes(searchLower);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isTutor = role === "tutor";

  // 🎨 Folklore Aesthetic Variables
  const bgMain = darkMode ? "bg-stone-950" : "bg-stone-50";
  const bgCard = darkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200";
  const bgInput = darkMode ? "bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500" : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400";
  const textPrimary = darkMode ? "text-stone-100" : "text-stone-900";
  const textSecondary = darkMode ? "text-stone-400" : "text-stone-500";
  const accentColor = "text-emerald-700 dark:text-emerald-400";
  const accentBg = "bg-emerald-50 dark:bg-emerald-900/20";

  if (!isTutor) {
    return (
      <div className={`min-h-screen ${bgMain} flex items-center justify-center`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔒</div>
          <p className={`${textSecondary} font-serif text-lg`}>Доступ только для преподавателей</p>
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className={`inline-block mt-4 font-medium underline underline-offset-4 ${accentColor}`}>
            Вернуться в дашборд
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bgMain} flex items-center justify-center`}>
        <div className="relative w-16 h-16">
          <div className={`absolute inset-0 rounded-full border-4 ${darkMode ? 'border-stone-800' : 'border-stone-200'}`}></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-emerald-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgMain} transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className={`flex items-center gap-2 ${textSecondary} hover:text-emerald-600 transition group`}>
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition" />
            <span className="text-sm font-medium">Назад</span>
          </Link>
          
          <div className="text-center flex-1">
            <h1 className={`text-3xl sm:text-4xl font-serif font-bold ${textPrimary}`}>
              Управление учениками
            </h1>
            <p className={`text-sm font-serif italic mt-1 ${textSecondary}`}>
              "Take the words for what they are" 🌲
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-full border transition ${darkMode ? 'bg-stone-800 border-stone-700 text-amber-400' : 'bg-white border-stone-200 text-stone-600'}`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-full font-medium transition shadow-sm"
            >
              <UserPlus size={18} /> Добавить
            </motion.button>
          </div>
        </div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Студентов", value: stats.totalStudents, icon: GraduationCap, color: "emerald" },
            { label: "Преподавателей", value: stats.totalTutors, icon: Users, color: "stone" },
            { label: "Активны сегодня", value: stats.activeToday, icon: Activity, color: "amber" },
            { label: "Ср. прогресс", value: `${stats.avgProgress}%`, icon: Award, color: "emerald" },
          ].map((stat, idx) => (
            <motion.div key={idx} whileHover={{ y: -4 }} className={`${bgCard} rounded-2xl p-5 border shadow-sm transition-all`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : stat.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className={`${textSecondary} text-xs font-medium uppercase tracking-wider`}>{stat.label}</p>
                  <p className={`text-2xl font-serif font-bold ${textPrimary}`}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Top Students */}
        {stats.topStudents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${bgCard} rounded-2xl p-6 mb-10 border shadow-sm`}>
            <div className="flex items-center gap-2 mb-5">
              <BookMarked className={`w-5 h-5 ${accentColor}`} />
              <h2 className={`font-serif font-bold text-lg ${textPrimary}`}>Лучшие ученики</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {stats.topStudents.map((student, idx) => (
                <div key={student.id} className={`flex items-center gap-3 ${bgInput} rounded-xl px-4 py-2.5 border`}>
                  <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}</span>
                  <div>
                    <span className={`text-sm font-medium ${textPrimary}`}>{student.full_name || student.email?.split("@")[0] || "Без имени"}</span>
                    <span className={`text-xs ml-2 ${accentColor}`}>{student.xp || 0} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className={`${bgCard} rounded-2xl p-4 mb-6 border shadow-sm`}>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[250px] relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
              <input
                type="text" placeholder="Поиск по имени или email..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${bgInput}`}
              />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className={`rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${bgInput}`}>
              <option value="all">Все роли</option>
              <option value="student">Студенты</option>
              <option value="tutor">Преподаватели</option>
            </select>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className={`text-center py-16 ${bgCard} rounded-2xl border`}>
              <p className={`${textSecondary} font-serif italic`}>Пользователи не найдены</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <motion.div 
                key={user.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className={`${bgCard} rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all group`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-serif font-bold text-lg ${user.role === "student" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"}`}>
                      {(user.full_name || user.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold ${textPrimary}`}>{user.full_name || user.email?.split("@")[0] || "Без имени"}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.role === "student" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"}`}>
                          {user.role === "student" ? "Студент" : "Преподаватель"}
                        </span>
                        {!user.is_active && <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-medium">Заблокирован</span>}
                      </div>
                      <p className={`text-sm ${textSecondary} mt-0.5`}>{user.email || "Нет email"}</p>
                      <p className={`text-xs ${textSecondary} flex items-center gap-1 mt-1`}>
                        <Calendar size={10} /> Регистрация: {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {user.role === "student" && (
                      <button onClick={() => { setSelectedUser(user); setShowAccessModal(true); }} className={`p-2.5 rounded-xl transition ${accentBg} ${accentColor} hover:brightness-95`} title="Курсы">
                        <BookOpen size={16} />
                      </button>
                    )}
                    <button onClick={() => toggleUserStatus(user)} className={`p-2.5 rounded-xl transition ${user.is_active ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'}`} title={user.is_active ? "Заблокировать" : "Разблокировать"}>
                      {user.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                    </button>
                    <button onClick={() => deleteUser(user)} className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition" title="Удалить">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {user.role === "student" && (
                  <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-stone-800' : 'border-stone-100'} flex flex-wrap gap-6 text-xs ${textSecondary}`}>
                    <span className="flex items-center gap-1.5"><Award size={12} className={accentColor} /> Уровень: <b className={textPrimary}>{user.level || 1}</b></span>
                    <span className="flex items-center gap-1.5"><Activity size={12} className={accentColor} /> <b className={textPrimary}>{user.xp || 0}</b> XP</span>
                    <span className="flex items-center gap-1.5"><BookOpen size={12} className={accentColor} /> Курсов: <b className={textPrimary}>{user.enrolled_courses?.length || 0}</b></span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Access Modal */}
        <AnimatePresence>
          {showAccessModal && selectedUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAccessModal(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className={`${bgCard} rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border shadow-2xl`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-serif font-bold ${textPrimary}`}>Доступ к курсам: <span className={accentColor}>{selectedUser.full_name || selectedUser.email}</span></h2>
                  <button onClick={() => setShowAccessModal(false)} className={`${textSecondary} hover:text-rose-500 transition`}><X size={24} /></button>
                </div>
                <div className="space-y-3">
                  {courses.length === 0 ? (
                    <p className={`text-center py-8 ${textSecondary} font-serif italic`}>У вас пока нет созданных курсов</p>
                  ) : (
                    courses.map((course) => {
                      const hasAccess = selectedUser.enrolled_courses?.includes(course.id);
                      return (
                        <div key={course.id} className={`flex items-center justify-between p-4 rounded-xl border transition ${hasAccess ? (darkMode ? 'bg-emerald-900/10 border-emerald-800' : 'bg-emerald-50 border-emerald-200') : (darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200')}`}>
                          <div>
                            <p className={`font-medium ${textPrimary}`}>{course.title}</p>
                            <p className={`text-xs ${textSecondary} mt-1`}>{course.lessons?.length || 0} уроков • {course.price} ₽</p>
                          </div>
                          {hasAccess ? (
                            <button onClick={() => revokeCourseAccess(selectedUser.id, course.id)} className="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition flex items-center gap-1">
                              <X size={14} /> Отозвать
                            </button>
                          ) : (
                            <button onClick={() => grantCourseAccess(selectedUser.id, course.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-1">
                              <Check size={14} /> Дать доступ
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add User Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className={`${bgCard} rounded-3xl p-6 max-w-md w-full border shadow-2xl`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-serif font-bold ${textPrimary}`}>Добавить пользователя</h2>
                  <button onClick={() => setShowAddModal(false)} className={`${textSecondary} hover:text-rose-500 transition`}><X size={24} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Email *</label>
                    <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={`w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${bgInput}`} placeholder="student@example.com" />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Имя (опционально)</label>
                    <input type="text" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} className={`w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${bgInput}`} placeholder="Иван Иванов" />
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${textSecondary} block mb-1.5`}>Роль</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "student" | "tutor" })} className={`w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${bgInput}`}>
                      <option value="student">Студент</option>
                      <option value="tutor">Преподаватель</option>
                    </select>
                  </div>
                  <button onClick={addUser} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-medium transition shadow-sm mt-2">
                    Добавить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-stone-200 dark:border-stone-800 border-t-emerald-600 rounded-full animate-spin"></div></div>}>
      <UsersContent />
    </Suspense>
  );
}