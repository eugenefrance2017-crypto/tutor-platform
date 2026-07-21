"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  Users, UserPlus, GraduationCap, Calendar,
  BookOpen, Award, Star,
  ChevronLeft, Search, Lock, Unlock, Trash2,
  Activity, BarChart3
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

// Типы
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

// Форматирование даты
function formatDate(dateValue: any): string {
  if (!dateValue) return "—";
  let date: Date;
  if (typeof dateValue === "string" || typeof dateValue === "number") {
    date = new Date(dateValue);
  } else if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else {
    return "—";
  }
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

// Компонент трофея (фиксированного размера)
function Trophy({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
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

  // Статистика
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTutors: 0,
    activeToday: 0,
    avgProgress: 0,
    totalXP: 0,
    topStudents: [] as User[],
  });

  useEffect(() => {
    setUid(localStorage.getItem("uid") || "");
    setRole(localStorage.getItem("role") || "");
  }, []);

  // Загрузка пользователей
  useEffect(() => {
    if (!uid || role !== "tutor") return;

    const q = query(collection(db, "profiles"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);
      
      // Подсчёт статистики
      const students = usersData.filter(u => u.role === "student");
      const tutors = usersData.filter(u => u.role === "tutor");
      const activeToday = usersData.filter(u => {
        if (!u.last_login) return false;
        const lastLogin = new Date(u.last_login);
        const today = new Date();
        return lastLogin.toDateString() === today.toDateString();
      }).length;
      
      const totalXP = students.reduce((sum, s) => sum + (s.xp || 0), 0);
      const avgProgress = students.length > 0 
        ? Math.round(students.reduce((sum, s) => sum + (s.level || 0), 0) / students.length * 10)
        : 0;
      const topStudents = [...students].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
      
      setStats({
        totalStudents: students.length,
        totalTutors: tutors.length,
        activeToday,
        avgProgress,
        totalXP,
        topStudents,
      });
      
      setLoading(false);
    }, (error) => {
      console.error("Ошибка загрузки:", error);
      toast.error("Ошибка загрузки пользователей");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [uid, role]);

  // Загрузка курсов
  useEffect(() => {
    if (!uid || role !== "tutor") return;
    
    const fetchCourses = async () => {
      try {
        const q = query(collection(db, "courses"), where("tutor_id", "==", uid));
        const snap = await getDocs(q);
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      } catch (error) {
        console.error("Ошибка загрузки курсов:", error);
      }
    };
    fetchCourses();
  }, [uid, role]);

  // Добавление пользователя
  const addUser = async () => {
    if (!newUser.email) {
      toast.error("Введите email");
      return;
    }
    
    try {
      await addDoc(collection(db, "profiles"), {
        email: newUser.email,
        full_name: newUser.full_name || newUser.email.split("@")[0],
        role: newUser.role,
        created_at: new Date().toISOString(),
        is_active: true,
        enrolled_courses: [],
        completed_lessons: [],
        xp: 0,
        level: 1,
      });
      
      toast.success("Пользователь добавлен!");
      setShowAddModal(false);
      setNewUser({ email: "", full_name: "", role: "student" });
    } catch (error: any) {
      console.error("Ошибка добавления:", error);
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  // Блокировка/разблокировка пользователя
  const toggleUserStatus = async (user: User) => {
    try {
      await updateDoc(doc(db, "profiles", user.id), {
        is_active: !user.is_active,
      });
      toast.success(user.is_active ? "Пользователь заблокирован" : "Пользователь разблокирован");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  // Удаление пользователя
  const deleteUser = async (user: User) => {
    if (!confirm(`Удалить пользователя ${user.full_name || user.email}? Это действие нельзя отменить.`)) return;
    
    try {
      await deleteDoc(doc(db, "profiles", user.id));
      toast.success("Пользователь удалён");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  // Предоставление доступа к курсу
  const grantCourseAccess = async (userId: string, courseId: string) => {
    try {
      await updateDoc(doc(db, "profiles", userId), {
        enrolled_courses: arrayUnion(courseId),
      });
      await updateDoc(doc(db, "courses", courseId), {
        students: arrayUnion(userId),
      });
      toast.success("Доступ предоставлен");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  // Отзыв доступа к курсу
  const revokeCourseAccess = async (userId: string, courseId: string) => {
    try {
      await updateDoc(doc(db, "profiles", userId), {
        enrolled_courses: arrayRemove(courseId),
      });
      await updateDoc(doc(db, "courses", courseId), {
        students: arrayRemove(userId),
      });
      toast.success("Доступ отозван");
    } catch (error: any) {
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  // Фильтрация пользователей (с защитой от undefined)
  const filteredUsers = users.filter(user => {
    const email = user?.email || "";
    const fullName = user?.full_name || "";
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = email.toLowerCase().includes(searchLower) ||
                          fullName.toLowerCase().includes(searchLower);
    const matchesRole = roleFilter === "all" || user?.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isTutor = role === "tutor";

  if (!isTutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-400">Доступ только для преподавателей</p>
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="text-indigo-400 underline mt-4 inline-block">
            Вернуться в дашборд
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link href={`/dashboard?uid=${uid}&role=${role}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition group">
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition" />
            <span className="text-sm">Назад в дашборд</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            👥 Пользователи
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2.5 rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition"
          >
            <UserPlus size={18} />
            Добавить
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Студентов</p>
                <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Преподавателей</p>
                <p className="text-2xl font-bold text-white">{stats.totalTutors}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Activity size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Активны сегодня</p>
                <p className="text-2xl font-bold text-white">{stats.activeToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Award size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Ср. прогресс</p>
                <p className="text-2xl font-bold text-white">{stats.avgProgress}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Топ студентов - ИСПРАВЛЕННЫЙ (кубок маленький) */}
        {stats.topStudents.length > 0 && (
          <div className="bg-white/5 backdrop-blur rounded-2xl p-5 mb-8 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Trophy size={18} className="text-yellow-400" />
              </div>
              <h2 className="font-semibold text-white">Топ студентов</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {stats.topStudents.map((student, idx) => (
                <div key={student.id} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  {idx === 0 && <span className="text-yellow-400 text-lg">🥇</span>}
                  {idx === 1 && <span className="text-gray-400 text-lg">🥈</span>}
                  {idx === 2 && <span className="text-amber-600 text-lg">🥉</span>}
                  {idx > 2 && <span className="text-gray-500 text-sm font-bold">#{idx + 1}</span>}
                  <span className="text-white text-sm">{student.full_name || student.email?.split("@")[0] || "Без имени"}</span>
                  <span className="text-indigo-400 text-xs">{student.xp || 0} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Поиск и фильтры */}
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по email или имени..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm"
            >
              <option value="all">Все</option>
              <option value="student">Студенты</option>
              <option value="tutor">Преподаватели</option>
            </select>
          </div>
        </div>

        {/* Список пользователей */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
              <p className="text-gray-400">Пользователи не найдены</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 hover:border-indigo-500/50 transition">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.role === "student" ? "bg-indigo-500/20" : "bg-purple-500/20"
                    }`}>
                      {user.role === "student" ? (
                        <GraduationCap size={22} className="text-indigo-400" />
                      ) : (
                        <Users size={22} className="text-purple-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{user.full_name || user.email?.split("@")[0] || "Без имени"}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          user.role === "student" 
                            ? "bg-indigo-500/20 text-indigo-300" 
                            : "bg-purple-500/20 text-purple-300"
                        }`}>
                          {user.role === "student" ? "Студент" : "Преподаватель"}
                        </span>
                        {!user.is_active && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs">Заблокирован</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email || "Нет email"}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar size={10} /> Регистрация: {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user.role === "student" && (
                      <button
                        onClick={() => { setSelectedUser(user); setShowAccessModal(true); }}
                        className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 hover:bg-indigo-500/30 transition"
                        title="Управление доступом к курсам"
                      >
                        <BookOpen size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={`p-2 rounded-xl transition ${
                        user.is_active 
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                      title={user.is_active ? "Заблокировать" : "Разблокировать"}
                    >
                      {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      className="p-2 bg-red-500/20 rounded-xl text-red-400 hover:bg-red-500/30 transition"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Доп. информация для студентов */}
                {user.role === "student" && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Award size={12} /> Уровень: {user.level || 1}</span>
                    <span className="flex items-center gap-1"><Star size={12} /> {user.xp || 0} XP</span>
                    <span className="flex items-center gap-1"><BookOpen size={12} /> Курсов: {user.enrolled_courses?.length || 0}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Модальное окно управления доступом к курсам */}
        {showAccessModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a2e] rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Доступ к курсам: {selectedUser.full_name || selectedUser.email}
                </h2>
                <button onClick={() => setShowAccessModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>
              
              <div className="space-y-3">
                {courses.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">У вас пока нет созданных курсов</p>
                ) : (
                  courses.map((course) => {
                    const hasAccess = selectedUser.enrolled_courses?.includes(course.id);
                    return (
                      <div key={course.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <p className="font-medium text-white">{course.title}</p>
                          <p className="text-xs text-gray-400">{course.lessons?.length || 0} уроков • {course.price} ₽</p>
                        </div>
                        {hasAccess ? (
                          <button
                            onClick={() => revokeCourseAccess(selectedUser.id, course.id)}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition"
                          >
                            Отозвать доступ
                          </button>
                        ) : (
                          <button
                            onClick={() => grantCourseAccess(selectedUser.id, course.id)}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm hover:bg-indigo-600 transition"
                          >
                            Предоставить доступ
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно добавления пользователя */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a2e] rounded-3xl p-6 max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Добавить пользователя</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-white"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Имя (опционально)</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-white"
                    placeholder="Иван Иванов"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Роль</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "student" | "tutor" })}
                    className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-white"
                  >
                    <option value="student">Студент</option>
                    <option value="tutor">Преподаватель</option>
                  </select>
                </div>
                <button
                  onClick={addUser}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        </div>
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}